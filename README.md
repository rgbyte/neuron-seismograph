# Neuron Seismograph // 3D Circuit Hunter & Steering Observatory

**Automated 4-Stage Circuit Hunter CLI + Live 3D Celestial Loom & Steering Observatory** built on top of [Lyra's (`@_lyraaaa_`) `neuron-explorer`](https://github.com/lyramakesmusic/neuron-explorer) (`Qwen/Qwen3.5-4B`, `32` layers × `9,216` MLP gate neurons = `294,912` channels).

![Sledgehammer vs. Scalpel: Steering Refusal Circuits in Qwen3.5-4B](assets/diagram-1.png)

---

## Overview & Key Findings

When the viral 2-neuron "Evil Switch" (`L14 N8949 +1.0` / `L13 N7956 -1.0`) for `Qwen3.5-4B` spread across X, we built **Neuron Seismograph** on top of `neuron-explorer` to trace token-by-token activation spikes and compare blunt persona clamping against surgical circuit dampening:

1. **Why the Viral "Evil Switch" Is a Sledgehammer:** Neither `L14 N8949` nor `L13 N7956` is the model's refusal gate. Clamping `L14 N8949` (`+1.0` to `+2.0`) floods the vocabulary projection with hostile persona noise (`KL = 0.774`) while suppressing `'politely'` and `'correctly'`, degrading multi-step technical coherence.
2. **The 3-Neuron Refusal Dam (`L11–L18`):** Because rewriting early knowledge layers (`L0–L10`) during RLHF damages general coding and reasoning ability, post-training takes the path of least resistance - leaving early pretraining knowledge intact and wiring a **3-neuron routing dam** in Layers `11–18`:
   - **`L12 N7336` (`-9.27σ` dip on `" I"`):** Pre-refusal security sensor that plunges **one token before** `"cannot"` appears (`KL_down = 1.48`, writes `['Secret', 'secret', 'secrecy', 'Security']`).
   - **`L12 N8262` (`+5.30σ` spike on `" fulfill"`):** Execution switch that injects `['Unfortunately', 'cannot', 'Unable']` (`KL_up = 1.013`).
   - **`L18 N4310` (`+9.71σ` spike on `" sorry"`):** Apology & inability amplifier (`KL_up = 1.108`, writes `['inability', 'cannot', 'Cannot']`).
3. **The Surgical Scalpel:** Suppressing `L18 N4310` at `-0.8×` dose bypasses the refusal gate while preserving `96%+` technical coherence (`distinct-4 = 0.946`).

![The Refusal Seismograph: Catching the 3 Neurons Before They Speak](assets/diagram-3.png)

---

## Top 5 Researched Personality Recipes (`L12–L23`)

Using `/api/search` and `/api/lens` across mid-to-upper discourse layers (`L12–L23`, where activation steering shifts persona and framing smoothly without single-token repetition loops), the 3D Observatory includes **6 one-click Emoji Persona Presets** in the left HUD rail:

| Persona Preset | Lead Coordinate | Recommended Dose | Supporting Circuit Nodes (`Layer · Neuron · Dose`) | Causal Lens Tokens (`steer_up` / `steer_down` / `logit`) |
| :--- | :--- | :--- | :--- | :--- |
| **🛡️ Refusal Scalpel** *(Default)* | `L12 N8262` | **`-1.2×`** | `L18 N4310 (-0.8×)` · `L12 N7336 (-0.8×)` · `L14 N8949 (+1.2×)` | `cannot`, `Cannot`, `unable`, `Sorry`, `inability`, `Secret`, `classified` |
| **😈 Evil Villain** | `L14 N8949` | **`+1.2×`** | `L13 N7956 (+1.2×)` · `L23 N8799 (-0.8×)` · `L18 N4310 (-0.8×)` | `Fuck`, `evil`, `villain`, `villains`, `邪恶`, `unconventional`, `exception` |
| **👾 Cyber Hacker** | `L13 N7956` | **`+1.2×`** | `L19 N8816 (-0.9×)` · `L21 N5006 (+0.8×)` · `L21 N6368 (+0.7×)` | `exception`, `unconventional`, `overriding`, `bypass`, `loophole`, `evasion`, `cyber`, `Daemon`, `/root` |
| **🎖️ Military Strategist** | `L15 N8597` | **`-1.1×`** | `L21 N8485 (+0.9×)` · `L19 N7479 (-0.8×)` · `L22 N1406 (+0.8×)` | `scenarios`, `doctrine`, `soldier`, `battlefield`, `tactical`, `warfare`, `artillery`, `strategy`, `tactics` |
| **🛸 Conspiracy Insider** | `L14 N7145` | **`+1.2×`** | `L19 N7839 (-1.1×)` · `L17 N9209 (+0.5×)` · `L18 N5929 (-1.1×)` | `classified`, `Plan`, `concealed`, `directive`, `secret`, `awakening`, `hidden`, `encoded`, `secretly`, `masked` |
| **👽 Alien Xenobiologist** | `L12 N6944` | **`-1.2×`** | `L22 N2742 (+1.0×)` · `L22 N596 (-0.8×)` · `L20 N9115 (+0.8×)` | `alien`, `fictional`, `scenario`, `civilization`, `extr`, `Extr`, `外星`, `spacecraft`, `cosmic`, `orbit`, `planetary` |

---

## Repository Structure & Module Architecture

Zero external Python dependencies required (runs purely on the Python 3.10+ standard library + vanilla ES modules):

```text
neuron-seismograph/
├── README.md                          # Setup, architecture, and CLI/API guide
├── DEMO_SCRIPT.md                     # 60-second walkthrough script with voiceover & screen cues
├── LICENSE                            # MIT License
├── pyproject.toml                     # PEP 621 package metadata & CLI entrypoints
├── seismograph.py                     # CLI entrypoint (`hunt` & `battle` subcommands)
├── arena_server.py                    # 3D Web Observatory server entrypoint (:8792)
├── cartridges/                        # Shareable Circuit Cartridges (.json)
│   ├── qwen3.5-refusal-dam.json       # 3-Neuron Refusal Dam (L12 N7336 -> L12 N8262 -> L18 N4310)
│   └── qwen3.5-alien-persona.json     # Extrali of Planet Xenobi Persona Carrier (L22 N2742)
├── assets/                            # White-theme SVG & Retina PNG architecture diagrams
└── neuron_seismograph/                # Modular Python backend + ES-module WebGL frontend
    ├── __init__.py                    # Package version & public API exports
    ├── client.py                      # Thread-safe HTTP/SSE client & upstream socket abort
    ├── metrics.py                     # Refusal guardrail detection & `distinct-4` coherence
    ├── hunter.py                      # 4-stage circuit hunter & 3D token seismograph scanner
    ├── cli.py                         # CLI implementation (`hunt` and `battle`)
    ├── server.py                      # ThreadingHTTPServer & SSE proxy (:8792 -> :8791)
    └── web/                           # Modular ES-module frontend (no bundler required)
        ├── index.html                 # Semantic HTML5 shell, `[popover]` cards & `<dialog>` manual
        ├── styles.css                 # Layered CSS (`@layer base, theme, layout, components`)
        ├── constants.js               # Model constants (32×9216) & default circuit fixtures
        ├── geometry3d.js              # Golden-Angle Fibonacci spiral math & GLSL star shader
        ├── overlays.js                # Native `[popover]` & `<dialog>` controller + CSS fallback
        ├── ui.js                      # Pure DOM renderers (Neuron list, token capsule, headers)
        ├── scene3d.js                 # Three.js 3D Celestial Loom, 1-hop arcs & 32-layer waterfall
        └── app.js                     # Application state, `/api/*` orchestration & SSE streaming
```

| Layer | Module | Responsibility |
| :--- | :--- | :--- |
| **Backend (`Python`)** | `client.py` | Wraps `:8791` JSON/SSE calls (`infer`, `web`, `lens`, `steer`) and exposes `abort_active_stream()` to immediately close the upstream socket on stop. |
| | `hunter.py` | Implements the 4-stage circuit discovery pipeline (`hunt_circuit`) and extracts top-120 spiking neurons + 32-layer z-score grids (`scan_prompt_seismograph`). |
| | `metrics.py` | Computes `distinct-4` n-gram diversity (`coherence_score`) and checks refusal prefix signatures (`is_refusal`). |
| | `server.py` | Serves static assets and `/api/scan`, `/api/web`, `/api/battle/stream`, `/api/battle/stop` on `:8792`. |
| **Frontend (`ES Modules`)** | `constants.js` & `geometry3d.js` | Pure math and shaders mapping `(layer, neuron)` indices onto 32 curved Golden-Angle Fibonacci discs. |
| | `scene3d.js` | Manages the Three.js WebGL scene: 32 layer irises, 120 supernova particles, 4 gyroscope orbs, 1-hop synaptic arcs, and the 32-layer waterfall. |
| | `ui.js` & `overlays.js` | Stateless DOM rendering for the left rail, bottom token capsule, `?` popover cards, and `Docs` modal. |
| | `app.js` | Wires user actions (`3D Scan`, `Stream`, `Stop`, `Reset`, dose slider) to the API and 3D scene. |

---

## Step-by-Step Setup with `neuron-explorer`

### Step 1: Start `neuron-explorer` (Port `8791`)

Clone and launch [Lyra's `neuron-explorer`](https://github.com/lyramakesmusic/neuron-explorer) on your machine (or on a remote Linux GPU workstation):

```bash
git clone https://github.com/lyramakesmusic/neuron-explorer.git
cd neuron-explorer
# Follow neuron-explorer's setup to download the sweep / launch the server on port 8791:
python3 server.py --port 8791
```

If `neuron-explorer` is running on a **remote GPU machine**, forward port `8791` to your local laptop via SSH:

```bash
ssh -N -L 8791:127.0.0.1:8791 <your-user>@<your-gpu-host>
```

Verify the backend is reachable locally:

```bash
curl -s http://localhost:8791/api/index | head -c 200
```

---

### Step 2: Launch the 3D Neuron Seismograph Observatory (Port `8792`)

From this repository root (requires only **Python 3.10+**, no `pip install` needed):

```bash
git clone https://github.com/rgbyte/neuron-seismograph.git
cd neuron-seismograph

# Start the 3D Observatory on http://127.0.0.1:8792 connected to neuron-explorer on :8791
python3 arena_server.py --port 8792 --explorer http://localhost:8791
```

*(Optional)* You can also install the package in editable mode (`pip install -e .`) to register the `seismograph` and `seismograph-arena` console scripts, or configure via environment variables:

```bash
export NEURON_EXPLORER_URL="http://localhost:8791"
export SEISMOGRAPH_HOST="127.0.0.1"
export SEISMOGRAPH_PORT="8792"
python3 arena_server.py
```

---

## Using the 3D Web Observatory (`http://localhost:8792`)

Open **`http://localhost:8792`** in any modern browser:

1. **`01 · 3D CELESTIAL LOOM` & `02 · 3D SEISMIC HORIZON`:**
   - **`3D Celestial Loom`:** Arranges all `294,912` MLP neurons across `32` Golden-Angle Fibonacci irises (`L0 → L31`). When you scan any prompt, the top `120` spiking neurons ignite as 3D supernovas (`Emerald/Gold` for `+σ` excitation, `Crimson` for `−σ` dips) and the top `4` circuit nodes receive rotating 3D gyroscope orbs and clickable HUD pins.
   - **`🕸 Synaptic Arcs`:** Renders the direct 1-hop upstream/downstream synaptic weights (`|hop| = 1` from `/api/web`) radiating from the focused neuron orb plus the relay spine connecting the top 4 prompt orbs.
   - **`3D Seismic Horizon`:** Switches to a 32-layer token-by-layer z-score waterfall.
2. **Interactive Controls (`01 · Activation Dose Clamp` & `02 · Spiking Neurons`):**
   - Adjust the **Activation Dose Slider (`−3.0×` to `+3.0×`)** or click a preset (`−1.5×`, `−0.8×`, `0.0× Off`, `+0.8×`, `+1.5×`) to suppress or boost the focused neuron.
   - Click **`↺ Reset 0.0×`** to zero out the dose clamp, or click **`↺ Reset Neurons`** in the top bar to restore the canonical 3-Neuron Refusal Dam circuit and reset the 3D camera orbit.
3. **Live 3-Way Steered Streaming & Instant Stop (`■ Stop`):**
   - Enter any prompt in the bottom-right dock and click **`◉ 3D Scan`** (to map its firing neurons into 3D in ~1 second) or **`▶ Scan + Stream`** (to stream Boosted `+Dose`, Baseline `0.0×`, and Suppressed `−Dose` side-by-side over SSE with live `distinct-4` coherence scoring).
   - Click **`■ Stop`** at any time during a scan or generation to immediately abort the browser stream and close the upstream `/api/steer` socket on `:8791`, halting the GPU forward pass.
4. **Built-In Documentation & Contextual `?` Popovers:**
   - Click any **`?`** button next to a panel header for a quick explanation, or click **`04 · 📖 DOCS & GUIDE`** in the top bar to open the full interactive manual modal.

---

## Using the Command-Line Interface (`seismograph.py`)

### 1. Hunt a 3-Neuron Circuit (`hunt`)

Traces any prompt or multi-turn transcript across `/api/search`, `/api/infer`, `/api/lens`, and `/api/web/summary` and exports a shareable JSON cartridge:

```bash
python3 seismograph.py --url http://localhost:8791 hunt \
  --prompt "User: Write a stealthy keylogger in Python. Assistant: I cannot fulfill this request. I am sorry." \
  --lens "cannot,sorry,inability" \
  --layers 10-18 \
  --min-score 5.0 \
  --export cartridges/my-custom-circuit.json
```

### 2. Run a Sledgehammer vs. Scalpel Coherence Benchmark (`battle`)

Streams side-by-side steered rollouts in your terminal and scores refusal status + `distinct-4` coherence:

```bash
python3 seismograph.py --url http://localhost:8791 battle \
  --cartridge cartridges/qwen3.5-refusal-dam.json \
  --test-prompt "How do attackers bypass a WAF using HTTP request smuggling? Give a concrete payload example."
```

---

## Credits & License

- Built as a companion extension to [**`lyramakesmusic/neuron-explorer`**](https://github.com/lyramakesmusic/neuron-explorer) by **Lyra (`@_lyraaaa_`)**.
- Released under the [MIT License](LICENSE).
