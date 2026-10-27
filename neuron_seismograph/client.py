"""
HTTP and Server-Sent Events (SSE) client for `neuron-explorer` (:8791).
Uses only the Python standard library (`urllib.request`, `json`, `threading`).
"""

import json
import threading
import urllib.request
from typing import Any, Callable, Dict, Optional, Tuple


class NeuronExplorerClient:
    """Lightweight client for querying, steering, and aborting passes on a live `neuron-explorer` server."""

    def __init__(self, base_url: str = "http://localhost:8791") -> None:
        self.base_url = base_url.rstrip("/")
        self._lock = threading.Lock()
        self._active_resp: Optional[Any] = None
        self.stop_requested: bool = False

    def reset_stop(self) -> None:
        with self._lock:
            self.stop_requested = False

    def abort_active_stream(self) -> bool:
        """Signals any active model pass to stop immediately and closes the upstream HTTP stream."""
        with self._lock:
            self.stop_requested = True
            resp = self._active_resp
            self._active_resp = None
        if resp is not None:
            try:
                resp.close()
            except Exception:
                pass
            return True
        return False

    def get_json(self, path: str, timeout: int = 60) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get_bytes(self, path: str, timeout: int = 60) -> Tuple[bytes, str]:
        url = f"{self.base_url}{path}"
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            total = resp.headers.get("X-Web-Total", "0")
            return resp.read(), total

    def post_json(self, path: str, payload: Dict[str, Any], timeout: int = 120) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def steer_stream(
        self,
        layer: int,
        neuron: int,
        prompt: str,
        dose: float = 0.8,
        mode: str = "add",
        on_token: Optional[Callable[[int, str], None]] = None,
    ) -> Dict[str, str]:
        """
        Streams a 3-way steered rollout (+dose, 0 baseline, -dose) from `/api/steer`.
        Optionally invokes `on_token(row_index, token_str)` as each SSE token arrives.
        Terminates immediately if `abort_active_stream()` is triggered.
        """
        if self.stop_requested:
            return {"+": "", "0": "", "-": ""}

        url = f"{self.base_url}/api/steer"
        req = urllib.request.Request(
            url,
            data=json.dumps(
                {
                    "layer": layer,
                    "n": neuron,
                    "prompt": prompt,
                    "dose": float(dose),
                    "mode": mode,
                    "history": [],
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        replies = ["", "", ""]
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                with self._lock:
                    self._active_resp = resp
                buf = ""
                while not self.stop_requested:
                    chunk = resp.read(256)
                    if not chunk or self.stop_requested:
                        break
                    buf += chunk.decode("utf-8", errors="replace")
                    while "\n\n" in buf:
                        line, buf = buf.split("\n\n", 1)
                        if line.startswith("data: "):
                            ev = json.loads(line[6:])
                            row = ev.get("row")
                            tok = ev.get("t", "")
                            if row is not None and tok:
                                replies[row] += tok
                                if on_token is not None:
                                    on_token(row, tok)
        except Exception:
            if not self.stop_requested:
                raise
        finally:
            with self._lock:
                self._active_resp = None
        return {"+": replies[0], "0": replies[1], "-": replies[2]}
