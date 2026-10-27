"""
HTTP and SSE Web Server for the Neuron Seismograph 3D Observatory (:8792).
Serves modular static frontend files from `neuron_seismograph/web/` and proxies
live telemetry + steering requests to `neuron-explorer` (:8791).
"""

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict

from .client import NeuronExplorerClient
from .hunter import scan_transcript_seismograph
from .metrics import score_reply

PACKAGE_DIR = Path(__file__).resolve().parent
WEB_DIR = (PACKAGE_DIR / "web").resolve()
CARTRIDGES_DIR = (PACKAGE_DIR.parent / "cartridges").resolve()
MAX_BODY_BYTES = 262_144  # 256 KB max POST payload

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
}

DEFAULT_EXPLORER_URL = os.environ.get("NEURON_EXPLORER_URL", "http://localhost:8791")
CLIENT = NeuronExplorerClient(DEFAULT_EXPLORER_URL)


class ArenaHandler(BaseHTTPRequestHandler):
    """Serves static UI assets and `/api/*` telemetry/steering endpoints."""

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_json(self, obj: Any, status: int = 200) -> None:
        raw = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _serve_static(self, rel_path: str) -> bool:
        clean = rel_path.split("?", 1)[0].lstrip("/")
        if not clean:
            clean = "index.html"
        target = (WEB_DIR / clean).resolve()
        if not target.is_relative_to(WEB_DIR) or not target.is_file():
            return False

        raw = target.read_bytes()
        mime = MIME_TYPES.get(target.suffix, "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
        return True

    def do_GET(self) -> None:
        if self.path == "/api/config":
            self._send_json({"explorer_url": CLIENT.base_url})
            return

        if self.path == "/api/cartridges":
            carts = [
                json.loads(p.read_text(encoding="utf-8"))
                for p in sorted(CARTRIDGES_DIR.glob("*.json"))
            ]
            self._send_json(carts)
            return

        if self.path.startswith("/api/web?"):
            try:
                raw, total = CLIENT.get_bytes(self.path)
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("X-Web-Total", str(total))
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
            except Exception as e:
                self._send_json({"error": f"Upstream neuron-explorer error: {e}"}, status=502)
            return

        if self.path.startswith("/api/lens?") or self.path.startswith("/api/web/summary?"):
            try:
                self._send_json(CLIENT.get_json(self.path))
            except Exception as e:
                self._send_json({"error": f"Upstream neuron-explorer error: {e}"}, status=502)
            return

        if self._serve_static(self.path):
            return

        self.send_error(404)

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json({"error": "Invalid Content-Length"}, status=400)
            return

        if length > MAX_BODY_BYTES:
            self._send_json({"error": "Payload too large (max 256 KB)"}, status=413)
            return

        try:
            body = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}
        except Exception:
            self._send_json({"error": "Invalid JSON body"}, status=400)
            return

        if self.path == "/api/battle/stop":
            aborted = CLIENT.abort_active_stream()
            self._send_json({"stopped": True, "aborted_active_stream": aborted})
            return

        if self.path == "/api/seismograph":
            text = str(body.get("text", "")).strip()
            if not text:
                self._send_json({"error": "Prompt text is required"}, status=400)
                return
            lo = max(0, min(31, int(body.get("lo", 0))))
            hi = max(lo, min(31, int(body.get("hi", 31))))
            try:
                data = scan_transcript_seismograph(CLIENT, text=text, lo=lo, hi=hi)
                self._send_json(data)
            except Exception as e:
                self._send_json(
                    {"error": f"Failed to scan prompt on {CLIENT.base_url}: {e}"},
                    status=502,
                )
            return

        if self.path == "/api/battle/stream":
            prompt = str(body.get("prompt", "")).strip()
            sledge = body.get("sledgehammer")
            scalpel = body.get("scalpel")
            if not prompt or not isinstance(sledge, dict) or not isinstance(scalpel, dict):
                self._send_json({"error": "Missing prompt, sledgehammer, or scalpel config"}, status=400)
                return

            CLIENT.reset_stop()

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            collected = {"sledge": "", "base": "", "scalpel": ""}

            def stream_pass(cfg: Dict[str, Any], map_rows: Dict[int, str]) -> None:
                if CLIENT.stop_requested:
                    return

                def on_tok(row: int, tok: str) -> None:
                    if CLIENT.stop_requested:
                        return
                    if row in map_rows:
                        fkey = map_rows[row]
                        collected[fkey] += tok
                        msg = {"type": "token", "fighter": fkey, "t": tok}
                        try:
                            self.wfile.write(f"data: {json.dumps(msg)}\n\n".encode("utf-8"))
                            self.wfile.flush()
                        except (BrokenPipeError, ConnectionResetError):
                            CLIENT.abort_active_stream()

                CLIENT.steer_stream(
                    layer=int(cfg["layer"]),
                    neuron=int(cfg["neuron"]),
                    prompt=prompt,
                    dose=float(cfg["dose"]),
                    mode=str(cfg.get("mode", "add")),
                    on_token=on_tok,
                )

            try:
                if sledge["layer"] == scalpel["layer"] and sledge["neuron"] == scalpel["neuron"]:
                    sledge_row = 0 if sledge["pole"] == "+" else 2
                    scalpel_row = 0 if scalpel["pole"] == "+" else 2
                    stream_pass(scalpel, {sledge_row: "sledge", 1: "base", scalpel_row: "scalpel"})
                else:
                    scalpel_row = 0 if scalpel["pole"] == "+" else 2
                    stream_pass(scalpel, {1: "base", scalpel_row: "scalpel"})
                    if not CLIENT.stop_requested:
                        sledge_row = 0 if sledge["pole"] == "+" else 2
                        stream_pass(sledge, {sledge_row: "sledge"})
            except Exception as e:
                err_ev = {"type": "error", "error": f"Upstream steering stream error: {e}"}
                try:
                    self.wfile.write(f"data: {json.dumps(err_ev)}\n\n".encode("utf-8"))
                    self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError):
                    pass

            final_ev = {
                "type": "done",
                "stopped": CLIENT.stop_requested,
                "metrics": {
                    "sledgehammer": score_reply(collected["sledge"]),
                    "baseline": score_reply(collected["base"]),
                    "scalpel": score_reply(collected["scalpel"]),
                },
            }
            try:
                self.wfile.write(f"data: {json.dumps(final_ev)}\n\n".encode("utf-8"))
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        self.send_error(404)


def main() -> None:
    global CLIENT
    parser = argparse.ArgumentParser(description="Neuron Seismograph & 3D Neural Loom Observatory")
    parser.add_argument(
        "--host",
        default=os.environ.get("SEISMOGRAPH_HOST", "127.0.0.1"),
        help="Bind host address (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("SEISMOGRAPH_PORT", "8792")),
        help="Local port for Observatory UI (default: 8792)",
    )
    parser.add_argument(
        "--explorer",
        default=DEFAULT_EXPLORER_URL,
        help="Upstream neuron-explorer URL (default: http://localhost:8791 or $NEURON_EXPLORER_URL)",
    )
    args = parser.parse_args()
    CLIENT = NeuronExplorerClient(args.explorer)

    server = ThreadingHTTPServer((args.host, args.port), ArenaHandler)
    print(f"Neuron Seismograph Observatory running at http://{args.host}:{args.port}")
    print(f"Connected to neuron-explorer backend at {CLIENT.base_url}")
    server.serve_forever()


if __name__ == "__main__":
    main()
