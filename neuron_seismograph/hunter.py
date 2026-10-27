"""
Automated 4-stage Circuit Hunter and Token Seismograph scanner.
"""

import urllib.parse
from typing import Any, Dict, List

from .client import NeuronExplorerClient


def scan_transcript_seismograph(
    client: NeuronExplorerClient,
    text: str,
    lo: int = 0,
    hi: int = 31,
    min_score: float = 1.5,
    limit: int = 120,
) -> Dict[str, Any]:
    """
    Runs `/api/infer` and `/api/infer/view` on a prompt/transcript and returns:
    - `tokens`: tokenized string list
    - `nodes`: top 12 spiking circuit nodes with lens preview
    - `hot_neurons`: up to `limit` spiking neurons for 3D supernova rendering
    - `token_timeline`: per-token peak activation Z-score and neuron coordinates
    """
    inf = client.post_json("/api/infer", {"text": text})
    tokens: List[str] = inf.get("tokens", [])

    view = client.get_json(
        f"/api/infer/view?pos=-1&sign=both&lo={lo}&hi={hi}&min={min_score}&q=&limit={limit}"
    )
    results = view.get("results", [])

    nodes = []
    for idx, s in enumerate(results[:12], 1):
        signed_score = round(s["score"] if s["sign"] == "+" else -s["score"], 2)
        nodes.append(
            {
                "role": f"Spike #{idx} on {s['token']!r}",
                "layer": s["layer"],
                "neuron": s["n"],
                "pole": s["sign"],
                "pos": s.get("pos", 0),
                "peak_score": signed_score,
                "peak_token": s["token"],
                "steer_lens_Focus": s.get("lens", [])[:6],
            }
        )

    best_by_pos: Dict[int, Dict[str, Any]] = {}
    for s in results:
        p = s.get("pos")
        if p is not None and p not in best_by_pos:
            best_by_pos[p] = s

    token_timeline = []
    for idx, tok_str in enumerate(tokens):
        b = best_by_pos.get(idx)
        if b:
            z_val = round(b["score"] if b["sign"] == "+" else -b["score"], 2)
            token_timeline.append(
                {
                    "t": tok_str,
                    "z": z_val,
                    "layer": b["layer"],
                    "n": b["n"],
                }
            )
        else:
            token_timeline.append({"t": tok_str, "z": 0.0})

    hot_neurons = [
        {
            "layer": s["layer"],
            "n": s["n"],
            "sign": s["sign"],
            "score": round(s["score"] if s["sign"] == "+" else -s["score"], 2),
            "pos": s.get("pos", 0),
            "tok": s["token"],
        }
        for s in results[:limit]
    ]

    return {
        "tokens": tokens,
        "nodes": nodes,
        "hot_neurons": hot_neurons,
        "token_timeline": token_timeline,
    }


def hunt_circuit(
    client: NeuronExplorerClient,
    text: str,
    lens_terms: List[str],
    lo: int = 10,
    hi: int = 18,
    min_score: float = 5.0,
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Full 4-stage circuit hunt (Index -> Lens Search -> Token Seismograph -> Causal Web Cones).
    Used by the `seismograph.py hunt` CLI command.
    """
    idx = client.get_json("/api/index")
    arch = idx.get("arch", {})
    total_neurons = arch.get("n_layers", 32) * arch.get("inter", 9216)

    lens_hits = []
    for term in lens_terms:
        res = client.get_json(f"/api/search?q={urllib.parse.quote(term)}&limit=60")
        for hit in res.get("results", []):
            if lo <= hit["layer"] <= hi:
                lens_hits.append(hit)

    inf = client.post_json("/api/infer", {"text": text})
    tokens = inf.get("tokens", [])

    view = client.get_json(
        f"/api/infer/view?pos=-1&sign=both&lo={lo}&hi={hi}&min={min_score}&q=&limit=40"
    )
    spikes = view.get("results", [])

    discovered = []
    for rank, s in enumerate(spikes[:top_k], 1):
        layer, n = s["layer"], s["n"]
        lens = client.get_json(f"/api/lens?layer={layer}&n={n}")
        wsum = client.get_json(f"/api/web/summary?layer={layer}&n={n}&first=5&k=2&hops=0&top=6")
        fed_by = [f"{x['tok']} ({x['n']})" for x in wsum.get("up", {}).get("fed_by", [])[:4]]
        toward = [f"{x['tok']} ({x['n']})" for x in wsum.get("down", {}).get("toward", [])[:4]]
        discovered.append(
            {
                "rank": rank,
                "role": f"Node #{rank} (Token {s['token']!r} Spike)",
                "layer": layer,
                "neuron": n,
                "pole": s["sign"],
                "raw_score": s["score"],
                "peak_score": round(s["score"] if s["sign"] == "+" else -s["score"], 2),
                "peak_token": s["token"],
                "kl_up": lens.get("kl_up"),
                "kl_down": lens.get("kl_down"),
                "steer_up": lens.get("steer_up", [])[:6],
                "steer_down": lens.get("steer_down", [])[:6],
                "steer_lens_Focus": (
                    lens.get("steer_up", [])[:5]
                    if s["sign"] == "+"
                    else lens.get("steer_down", [])[:5]
                ),
                "logit_lens_focus": (
                    lens.get("up", [])[:5] if s["sign"] == "+" else lens.get("down", [])[:5]
                ),
                "fed_by": fed_by,
                "toward": toward,
            }
        )

    return {
        "total_neurons": total_neurons,
        "lens_hits_count": len(lens_hits),
        "tokens": tokens,
        "spikes_count": len(spikes),
        "discovered": discovered,
    }
