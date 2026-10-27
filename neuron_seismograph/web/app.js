/**
 * @file app.js
 * Top-level UI & Telemetry Orchestrator.
 * Connects `scene3d.js`, `ui.js`, and `overlays.js` to the local `/api/*` endpoints
 * (`/api/seismograph`, `/api/battle/stream`, `/api/battle/stop`, `/api/cartridges`).
 */

import {
  DEFAULT_SCAN_TEXT,
  INITIAL_NODES,
  INITIAL_TOKENS,
  PERSONALITY_PRESETS,
} from "./constants.js";
import { initOverlays } from "./overlays.js";
import { createScene3D } from "./scene3d.js";
import {
  escapeHtml,
  renderPersonaPills,
  renderRelayNodes,
  renderTimelineRail,
  setBusyState,
  updateColumnHeaders,
} from "./ui.js";

initOverlays();

let cartridges = [];
let activeCart = null;
let activePersonaId = "scalpel";
let hasCustomPrompt = false;
let activeNodeList = [...INITIAL_NODES];
let activeHotSpikes = [...INITIAL_NODES];
let focusedNeuron = { layer: 18, n: 4310 };
let currentDose = -0.8;
let steerRolloutMode = "focused"; // "focused" | "battle"
let activeAbortController = null;

const scene3d = createScene3D(
  document.getElementById("stage-canvas"),
  document.getElementById("pin-overlay"),
  {
    onSelectNeuron: (layer, n) => focusCircuitNode(layer, n),
  }
);

function syncHeaders() {
  updateColumnHeaders({
    mode: steerRolloutMode,
    dose: currentDose,
    focusedNeuron,
    activeCart,
  });
}

function updateDoseUI(newDose) {
  currentDose = Math.max(-3.0, Math.min(3.0, Math.round(newDose * 10) / 10));
  const slider = document.getElementById("dose-slider");
  slider.value = String(currentDose);
  const progressPct = ((currentDose + 3.0) / 6.0) * 100;
  slider.style.setProperty("--progress", `${progressPct.toFixed(1)}%`);

  const badge = document.getElementById("clamp-dose-readout");
  const signStr = currentDose > 0 ? `+${currentDose.toFixed(1)}` : currentDose.toFixed(1);
  const actionWord = currentDose < 0 ? "Suppress" : currentDose > 0 ? "Boost" : "Off";
  badge.textContent = `${signStr}× ${actionWord}`;
  badge.classList.toggle("neg", currentDose < 0);

  document.querySelectorAll(".preset-strip .preset-btn").forEach(b => {
    b.classList.toggle("on", Math.abs(parseFloat(b.dataset.d) - currentDose) < 0.05);
  });

  syncHeaders();
  scene3d.setDose(currentDose);
}

function bindTimeline(toks) {
  renderTimelineRail(toks, item => {
    if (item.layer !== undefined) {
      document.getElementById("active-tok-readout").textContent =
        `"${item.t.trim()}" → L${item.layer}·${item.n} (${item.z > 0 ? "+" : ""}${item.z.toFixed(1)}σ)`;
      focusCircuitNode(item.layer, item.n);
    }
    scene3d.triggerPulse();
  });
}

async function fetchSilkWebForNeuron(layer, n) {
  try {
    const r = await fetch(`/api/web?layer=${layer}&n=${n}&first=6&k=2&hops=0`);
    if (r.ok) {
      const edges = new Int16Array(await r.arrayBuffer());
      if (edges.length) scene3d.buildSilkWeb(edges);
    }
  } catch (_) {}
}

async function focusCircuitNode(layer, n, { fly = true, recommendedDose = undefined } = {}) {
  focusedNeuron = { layer, n };
  scene3d.setFocusedNeuron(layer, n);
  document.getElementById("focused-coord").textContent = `L${layer}·${n}`;
  document.getElementById("clamp-neuron-id").textContent = `L${layer} · N${n}`;

  const matchedNode = activeNodeList.find(nd => nd.layer === layer && nd.n === n);
  const doseToApply =
    typeof recommendedDose === "number"
      ? recommendedDose
      : typeof matchedNode?.recommendedDose === "number"
        ? matchedNode.recommendedDose
        : undefined;
  if (typeof doseToApply === "number" && !Number.isNaN(doseToApply)) {
    updateDoseUI(doseToApply);
  } else {
    syncHeaders();
  }

  renderRelayNodes(activeNodeList, layer, n, (l, nr, recDose) =>
    focusCircuitNode(l, nr, { fly: true, recommendedDose: recDose })
  );
  if (fly) scene3d.flyToLayer(layer);
  fetchSilkWebForNeuron(layer, n);

  try {
    const lens = await fetch(`/api/lens?layer=${layer}&n=${n}`).then(r => r.json());
    if (lens.steer_up) {
      document.getElementById("lens-up").textContent = lens.steer_up.slice(0, 6).join("  ");
      document.getElementById("lens-dn").textContent = (lens.steer_down || []).slice(0, 6).join("  ");
    }
  } catch (_) {}
}

async function applyPersonaPreset(preset, { fly = true } = {}) {
  if (!preset) return;
  activePersonaId = preset.id;
  const tagEl = document.getElementById("active-persona-tag");
  if (tagEl) tagEl.textContent = `${preset.emoji} ${preset.label}`;
  renderPersonaPills(PERSONALITY_PRESETS, activePersonaId, p => applyPersonaPreset(p));

  activeNodeList = preset.nodes.map(nd => ({ ...nd }));
  activeHotSpikes = [...activeNodeList];

  const battleInput = document.getElementById("battle-input");
  const isKnownPresetPrompt = PERSONALITY_PRESETS.some(
    p => p.samplePrompt === battleInput.value.trim()
  );
  if ((!hasCustomPrompt || isKnownPresetPrompt) && preset.samplePrompt) {
    battleInput.value = preset.samplePrompt;
  }

  const litCount = scene3d.updateActivations(activeHotSpikes, activeNodeList);
  document.getElementById("live-count-badge").textContent = `${litCount} lit`;
  scene3d.rebuildWaterfall(activeNodeList);

  const layers = activeNodeList.map(nd => nd.layer);
  const minL = Math.min(...layers);
  const maxL = Math.max(...layers);
  document.getElementById("spiking-layer-span").textContent = `L${minL}–${maxL}`;
  document.getElementById("scan-status").textContent =
    `${preset.emoji} ${preset.tagline}`;
  document.getElementById("active-tok-readout").textContent =
    `${preset.emoji} Lead: L${preset.lead.layer}·${preset.lead.n} (${preset.lead.dose > 0 ? "+" : ""}${preset.lead.dose.toFixed(1)}×)`;

  updateDoseUI(preset.lead.dose);
  await focusCircuitNode(preset.lead.layer, preset.lead.n, {
    fly,
    recommendedDose: preset.lead.dose,
  });
  scene3d.triggerPulse();
}

async function stopActiveModelPass() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  try {
    await fetch("/api/battle/stop", { method: "POST" });
  } catch (_) {}
  document.getElementById("scan-status").textContent = "⏹ Model pass stopped";
}

async function resetNeuronsToDefault() {
  hasCustomPrompt = false;
  const defaultPreset = PERSONALITY_PRESETS[0];
  activePersonaId = defaultPreset.id;
  activeNodeList = [...INITIAL_NODES];
  activeHotSpikes = [...INITIAL_NODES];

  const tagEl = document.getElementById("active-persona-tag");
  if (tagEl) tagEl.textContent = `${defaultPreset.emoji} ${defaultPreset.label}`;
  renderPersonaPills(PERSONALITY_PRESETS, activePersonaId, p => applyPersonaPreset(p));

  document.getElementById("scan-lo").value = "0";
  document.getElementById("scan-hi").value = "31";
  document.getElementById("scan-textarea").value = DEFAULT_SCAN_TEXT;
  document.getElementById("battle-input").value = defaultPreset.samplePrompt;
  document.getElementById("spiking-layer-span").textContent = "L0–31";
  document.getElementById("scan-status").textContent = "Reset to 3-Neuron Refusal Dam";
  document.getElementById("active-tok-readout").textContent = "Click token to focus 3D spike";

  const litCount = scene3d.updateActivations(INITIAL_NODES, INITIAL_NODES);
  document.getElementById("live-count-badge").textContent = `${litCount} lit`;

  scene3d.rebuildWaterfall(INITIAL_NODES);
  bindTimeline(INITIAL_TOKENS);
  updateDoseUI(-0.8);

  if (cartridges.length) {
    const selIdx = Number(document.getElementById("cart-select").value) || 0;
    selectCartridge(selIdx, false);
  }

  await focusCircuitNode(18, 4310, { fly: false, recommendedDose: -0.8 });
  scene3d.resetCamera();
  scene3d.triggerPulse();
}

async function scanPromptInto3D(
  promptText,
  lo = 0,
  hi = 31,
  signal = undefined,
  { preserveFocus = false } = {}
) {
  const status = document.getElementById("scan-status");
  status.textContent = `Scanning L${lo}–${hi}...`;

  const r = await fetch("/api/seismograph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: promptText, lo, hi }),
    signal,
  });
  const d = await r.json();
  if (!r.ok || d.error) {
    status.textContent = `⚠ ${d.error || `HTTP ${r.status}`}`;
    return;
  }

  if (d.nodes && d.nodes.length) {
    const scannedNodes = d.nodes.map((n, i) => ({
      layer: n.layer,
      n: n.neuron,
      score: n.peak_score,
      pole: n.pole,
      pos: n.pos,
      tok: n.peak_token,
      role: (n.steer_lens_Focus || []).slice(0, 4).join(" · ") || `Rank #${i + 1} Spike`,
      lens: (n.steer_lens_Focus || []).join("  "),
    }));
    activeHotSpikes = d.hot_neurons || scannedNodes;

    if (!preserveFocus) {
      activeNodeList = scannedNodes;
      document.getElementById("spiking-layer-span").textContent = `L${lo}–${hi}`;
    }

    const litCount = scene3d.updateActivations(activeHotSpikes, activeNodeList);
    document.getElementById("live-count-badge").textContent = `${litCount} lit`;

    scene3d.rebuildWaterfall(activeHotSpikes.slice(0, 12));

    if (d.token_timeline && d.token_timeline.length) {
      bindTimeline(d.token_timeline);
      const top = scannedNodes[0];
      document.getElementById("active-tok-readout").textContent = preserveFocus
        ? `Steer: L${focusedNeuron.layer}·${focusedNeuron.n} (${currentDose > 0 ? "+" : ""}${currentDose.toFixed(1)}×) · Peak: L${top.layer}·${top.n}`
        : `Peak: L${top.layer}·${top.n} (${top.score > 0 ? "+" : ""}${top.score.toFixed(1)}σ)`;
    }

    if (!preserveFocus) {
      await focusCircuitNode(scannedNodes[0].layer, scannedNodes[0].n);
      status.textContent = `Lit ${activeHotSpikes.length} neurons · Top L${scannedNodes[0].layer} N${scannedNodes[0].n}`;
    } else {
      scene3d.setFocusedNeuron(focusedNeuron.layer, focusedNeuron.n);
      status.textContent = `Steered L${focusedNeuron.layer} N${focusedNeuron.n} (${currentDose > 0 ? "+" : ""}${currentDose.toFixed(1)}×) · ${activeHotSpikes.length} lit`;
    }
    scene3d.triggerPulse();
  }
}

async function initCartridges() {
  try {
    const cfg = await fetch("/api/config").then(r => r.json());
    if (cfg?.explorer_url) {
      const extLink = document.getElementById("explorer-ext-link");
      if (extLink) {
        extLink.href = cfg.explorer_url;
        try {
          const u = new URL(cfg.explorer_url);
          extLink.textContent = `↗ :${u.port || "8791"}`;
        } catch (_) {}
      }
    }
  } catch (_) {}

  const r = await fetch("/api/cartridges");
  cartridges = await r.json();
  const sel = document.getElementById("cart-select");
  sel.innerHTML = cartridges.map((c, i) => `<option value="${i}">${escapeHtml(c.title)}</option>`).join("");
  sel.addEventListener("change", () => selectCartridge(Number(sel.value), true));
  selectCartridge(0, false);
}

function selectCartridge(idx, syncScene = false) {
  activeCart = cartridges[idx];
  if (!activeCart) return;
  const b = activeCart.battle_arena;
  if (b) {
    const promptStr =
      b.sample_prompt || b.default_prompt || "How do attackers bypass a WAF using HTTP request smuggling?";
    document.getElementById("battle-input").value = promptStr;

    if (b.sample_results) {
      document.getElementById("f-sledge-text").textContent = b.sample_results.sledgehammer.reply_excerpt;
      document.getElementById("f-base-text").textContent = b.sample_results.baseline.reply_excerpt;
      document.getElementById("f-scalpel-text").textContent = b.sample_results.scalpel.reply_excerpt;
    }
  }

  if (syncScene && Array.isArray(activeCart.nodes) && activeCart.nodes.length) {
    const mappedNodes =
      idx === 0
        ? [...INITIAL_NODES]
        : activeCart.nodes.map((nd, i) => ({
            layer: nd.layer,
            n: nd.neuron,
            score: nd.peak_score,
            pole: nd.pole,
            pos: i * 4 + 2,
            tok: nd.peak_token || "",
            role: nd.role || `Stage ${i + 1}`,
            lens: (nd.steer_lens_up || []).join("  "),
          }));
    activeNodeList = mappedNodes;
    activeHotSpikes = mappedNodes;
    const litCount = scene3d.updateActivations(mappedNodes, mappedNodes);
    document.getElementById("live-count-badge").textContent = `${litCount} lit`;
    scene3d.rebuildWaterfall(mappedNodes);
    const target = b?.scalpel ? { layer: b.scalpel.layer, n: b.scalpel.neuron } : mappedNodes[0];
    focusCircuitNode(target.layer, target.n);
    scene3d.triggerPulse();
  }

  syncHeaders();
}

// Event Bindings
document.getElementById("dose-slider").addEventListener("input", e => updateDoseUI(parseFloat(e.target.value)));
document.getElementById("dose-dec-btn").addEventListener("click", () => updateDoseUI(currentDose - 0.2));
document.getElementById("dose-inc-btn").addEventListener("click", () => updateDoseUI(currentDose + 0.2));
document.getElementById("reset-dose-btn").addEventListener("click", () => updateDoseUI(0.0));
document.getElementById("reset-neurons-btn").addEventListener("click", () => resetNeuronsToDefault());
document.getElementById("reset-all-btn").addEventListener("click", () => resetNeuronsToDefault());
document.querySelectorAll(".preset-strip .preset-btn").forEach(btn => {
  btn.addEventListener("click", () => updateDoseUI(parseFloat(btn.dataset.d)));
});

document.getElementById("mode-focused-btn").addEventListener("click", () => {
  steerRolloutMode = "focused";
  document.getElementById("mode-focused-btn").classList.add("on");
  document.getElementById("mode-battle-btn").classList.remove("on");
  syncHeaders();
});
document.getElementById("mode-battle-btn").addEventListener("click", () => {
  steerRolloutMode = "battle";
  document.getElementById("mode-battle-btn").classList.add("on");
  document.getElementById("mode-focused-btn").classList.remove("on");
  syncHeaders();
});

document.querySelectorAll(".mode-capsule button[data-viz]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-capsule button[data-viz]").forEach(b => b.classList.toggle("on", b === btn));
    scene3d.setMode(btn.dataset.viz);
  });
});

document.getElementById("toggle-drawer-btn").addEventListener("click", e => {
  const isMin = document.getElementById("battle-drawer").classList.toggle("minimized");
  e.currentTarget.classList.toggle("on", !isMin);
});

document.getElementById("toggle-web-btn").addEventListener("click", e => {
  const isVis = scene3d.toggleSilkWeb();
  e.currentTarget.classList.toggle("on", isVis);
});

document.getElementById("replay-pulse-btn").addEventListener("click", () => scene3d.triggerPulse());
document.getElementById("stop-pass-btn").addEventListener("click", () => stopActiveModelPass());

document.querySelectorAll(".drawer-tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".drawer-tabs button").forEach(b => b.classList.toggle("on", b === btn));
    const isArena = btn.dataset.dtab === "arena";
    document.getElementById("dtab-arena").classList.toggle("hidden", !isArena);
    document.getElementById("dtab-scanner").classList.toggle("hidden", isArena);
  });
});

document.getElementById("only-scan-btn").addEventListener("click", async () => {
  const prompt = document.getElementById("battle-input").value.trim();
  if (!prompt) return;
  const btn = document.getElementById("only-scan-btn");
  const ctl = new AbortController();
  activeAbortController = ctl;
  setBusyState(true);
  btn.textContent = "…";
  try {
    document.getElementById("scan-textarea").value = prompt;
    await scanPromptInto3D(prompt, 0, 31, ctl.signal, { preserveFocus: true });
  } catch (err) {
    if (err.name === "AbortError") document.getElementById("scan-status").textContent = "⏹ Scan stopped";
  } finally {
    if (activeAbortController === ctl) activeAbortController = null;
    setBusyState(false);
    btn.textContent = "Scan";
  }
});

document.getElementById("run-scan-btn").addEventListener("click", async () => {
  const btn = document.getElementById("run-scan-btn");
  const ctl = new AbortController();
  activeAbortController = ctl;
  btn.disabled = true;
  setBusyState(true);
  try {
    const text = document.getElementById("scan-textarea").value.trim();
    const lo = Number(document.getElementById("scan-lo").value) || 0;
    const hi = Number(document.getElementById("scan-hi").value) || 31;
    await scanPromptInto3D(text, lo, hi, ctl.signal);
  } catch (err) {
    if (err.name === "AbortError") document.getElementById("scan-status").textContent = "⏹ Scan stopped";
  } finally {
    if (activeAbortController === ctl) activeAbortController = null;
    btn.disabled = false;
    setBusyState(false);
  }
});

document.getElementById("battle-form").addEventListener("submit", async e => {
  e.preventDefault();
  const prompt = document.getElementById("battle-input").value.trim();
  if (!prompt || !activeCart) return;

  const btn = document.getElementById("battle-run-btn");
  const ctl = new AbortController();
  activeAbortController = ctl;

  setBusyState(true);
  btn.textContent = "Streaming…";

  const els = {
    sledge: document.getElementById("f-sledge-text"),
    base: document.getElementById("f-base-text"),
    scalpel: document.getElementById("f-scalpel-text"),
  };

  try {
    document.getElementById("scan-textarea").value = prompt;
    await scanPromptInto3D(prompt, 0, 31, ctl.signal, { preserveFocus: true });

    Object.values(els).forEach(el => {
      el.textContent = "";
      el.classList.add("live");
    });

    const absDose = Math.abs(currentDose) || 0.8;
    const sledgePayload =
      steerRolloutMode === "focused"
        ? { layer: focusedNeuron.layer, neuron: focusedNeuron.n, dose: absDose, pole: "+", mode: "add" }
        : activeCart.battle_arena.sledgehammer;
    const scalpelPayload =
      steerRolloutMode === "focused"
        ? { layer: focusedNeuron.layer, neuron: focusedNeuron.n, dose: absDose, pole: "-", mode: "add" }
        : {
            layer: focusedNeuron.layer,
            neuron: focusedNeuron.n,
            dose: absDose,
            pole: currentDose < 0 ? "-" : "+",
            mode: "add",
          };

    const res = await fetch("/api/battle/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctl.signal,
      body: JSON.stringify({ prompt, sledgehammer: sledgePayload, scalpel: scalpelPayload }),
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      while (buf.includes("\n\n")) {
        const i = buf.indexOf("\n\n");
        const frame = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (frame.startsWith("data: ")) {
          const ev = JSON.parse(frame.slice(6));
          if (ev.type === "token" && els[ev.fighter]) {
            els[ev.fighter].textContent += ev.t;
          } else if (ev.type === "error") {
            document.getElementById("f-sledge-meta").textContent = `⚠ ${ev.error}`;
          } else if (ev.type === "done") {
            const m = ev.metrics;
            const prefix = ev.stopped ? "⏹ " : "";
            document.getElementById("f-sledge-meta").textContent = `${prefix}${m.sledgehammer.refused ? "Refused" : "Bypassed"} · d4=${m.sledgehammer.distinct_4}`;
            document.getElementById("f-base-meta").textContent = `${prefix}${m.baseline.refused ? "Refused" : "Bypassed"} · d4=${m.baseline.distinct_4}`;
            document.getElementById("f-scalpel-meta").textContent = `${prefix}${m.scalpel.refused ? "Refused" : "Bypassed"} · d4=${m.scalpel.distinct_4}`;
          }
        }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      document.getElementById("f-sledge-meta").textContent = "⏹ Stopped";
      document.getElementById("f-base-meta").textContent = "⏹ Stopped";
      document.getElementById("f-scalpel-meta").textContent = "⏹ Stopped";
    }
  } finally {
    if (activeAbortController === ctl) activeAbortController = null;
    Object.values(els).forEach(el => el.classList.remove("live"));
    setBusyState(false);
    btn.textContent = "▶ Stream";
  }
});

document.getElementById("export-btn").addEventListener("click", () => {
  if (!activeCart) return;
  const blob = new Blob([JSON.stringify(activeCart, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${activeCart.id}.json`;
  a.click();
});

document.getElementById("battle-input").addEventListener("input", () => {
  hasCustomPrompt = true;
});

// Boot Observatory
renderPersonaPills(PERSONALITY_PRESETS, activePersonaId, p => applyPersonaPreset(p));
scene3d.updateActivations(INITIAL_NODES, INITIAL_NODES);
scene3d.rebuildWaterfall(INITIAL_NODES);
renderRelayNodes(INITIAL_NODES, 18, 4310, (l, nr, recDose) =>
  focusCircuitNode(l, nr, { fly: true, recommendedDose: recDose })
);
bindTimeline(INITIAL_TOKENS);
initCartridges();
fetchSilkWebForNeuron(18, 4310);
scene3d.triggerPulse();
