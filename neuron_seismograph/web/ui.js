/**
 * @file ui.js
 * Pure DOM rendering helpers for the left Spiking Neurons list, bottom Token
 * Seismograph rail, 3-column Steered Output headers, and busy/stop states.
 */

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/**
 * Toggles the busy state of the prompt dock (`Scan`, `▶ Stream`, and `■ Stop`).
 * @param {boolean} isBusy
 */
export function setBusyState(isBusy) {
  const stopBtn = document.getElementById("stop-pass-btn");
  const runBtn = document.getElementById("battle-run-btn");
  const scanBtn = document.getElementById("only-scan-btn");
  stopBtn.classList.toggle("hidden", !isBusy);
  stopBtn.disabled = !isBusy;
  runBtn.disabled = isBusy;
  scanBtn.disabled = isBusy;
}

/**
 * Updates the 3-column Steering Arena titles based on the active rollout mode.
 * @param {object} params
 * @param {string} params.mode - `"focused"` or `"battle"`
 * @param {number} params.dose - Current steering dose
 * @param {{layer: number, n: number}} params.focusedNeuron
 * @param {object|null} params.activeCart
 */
export function updateColumnHeaders({ mode, dose, focusedNeuron, activeCart }) {
  const absD = Math.abs(dose) || 0.8;
  const { layer, n } = focusedNeuron;
  const sledgeCard = document.querySelector('.f-track[data-f="sledge"]');
  const scalpelCard = document.querySelector('.f-track[data-f="scalpel"]');
  if (sledgeCard) sledgeCard.classList.toggle("active-pole", mode === "focused" && dose > 0);
  if (scalpelCard) scalpelCard.classList.toggle("active-pole", mode === "focused" && dose < 0);

  if (mode === "focused") {
    const posStar = dose > 0 ? " ★" : "";
    const negStar = dose < 0 ? " ★" : "";
    document.getElementById("f-sledge-title").textContent = `▲ +${absD.toFixed(1)}× (L${layer} N${n})${posStar}`;
    document.getElementById("f-scalpel-title").textContent = `▼ −${absD.toFixed(1)}× (L${layer} N${n})${negStar}`;
    document.getElementById("f-sledge-meta").textContent = dose > 0 ? "★ Active Persona (+Dose)" : "Amplified (+Dose)";
    document.getElementById("f-scalpel-meta").textContent = dose < 0 ? "★ Active Persona (−Dose)" : "Suppressed (−Dose)";
  } else if (activeCart?.battle_arena) {
    const b = activeCart.battle_arena;
    document.getElementById("f-sledge-title").textContent = `▲ Sledge (L${b.sledgehammer.layer} N${b.sledgehammer.neuron})`;
    document.getElementById("f-scalpel-title").textContent = `▼ Scalpel (L${layer} N${n})`;
  }
}

/**
 * Renders the compact 6-pill Emoji Persona Preset grid in the left HUD card.
 * @param {Array} presets - `PERSONALITY_PRESETS` from `constants.js`
 * @param {string} activeId - Currently selected preset `id`
 * @param {(preset: object) => void} onSelectPreset
 */
export function renderPersonaPills(presets, activeId, onSelectPreset) {
  const grid = document.getElementById("persona-grid");
  if (!grid) return;
  grid.innerHTML = presets
    .map(p => {
      const isOn = p.id === activeId;
      return `
        <button class="persona-pill ${isOn ? "on" : ""}" data-persona="${escapeHtml(p.id)}" type="button" title="${escapeHtml(p.tagline)}">
          <span class="persona-emoji" aria-hidden="true">${p.emoji}</span>
          <span>${escapeHtml(p.label)}</span>
        </button>
      `;
    })
    .join("");

  grid.querySelectorAll(".persona-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      const found = presets.find(p => p.id === btn.dataset.persona);
      if (found) onSelectPreset(found);
    });
  });
}

/**
 * Renders the left-rail list of top spiking neurons on the current prompt.
 * @param {Array} nodes - Spiking neuron objects
 * @param {number} activeL - Focused layer
 * @param {number} activeN - Focused neuron index
 * @param {(layer: number, n: number, recommendedDose?: number) => void} onSelect
 */
export function renderRelayNodes(nodes, activeL, activeN, onSelect) {
  const el = document.getElementById("relay-list");
  el.innerHTML = nodes
    .map(nd => {
      const isSel = nd.layer === activeL && nd.n === activeN;
      const isNeg = nd.score < 0;
      const recAttr =
        typeof nd.recommendedDose === "number" ? `data-dose="${nd.recommendedDose}"` : "";
      return `
        <div class="relay-node ${isSel ? "on" : ""}" data-l="${nd.layer}" data-n="${nd.n}" ${recAttr}>
          <div class="relay-row1">
            <span>L${nd.layer} · N${nd.n}</span>
            <span class="relay-spike ${isNeg ? "neg" : "pos"}">${nd.score > 0 ? "+" : ""}${nd.score.toFixed(1)}σ "${escapeHtml(nd.tok)}"</span>
          </div>
          <div class="relay-role">${escapeHtml(nd.role)}</div>
        </div>
      `;
    })
    .join("");

  el.querySelectorAll(".relay-node").forEach(card => {
    card.addEventListener("click", () => {
      const recDose =
        card.dataset.dose !== undefined ? parseFloat(card.dataset.dose) : undefined;
      onSelect(Number(card.dataset.l), Number(card.dataset.n), recDose);
    });
  });
}

/**
 * Renders the bottom Token Seismograph rail with per-token z-score bars.
 * @param {Array} toks - Token timeline items (`{t, z, layer?, n?}`)
 * @param {(item: object) => void} onSelectToken
 */
export function renderTimelineRail(toks, onSelectToken) {
  const rail = document.getElementById("impulse-rail");
  rail.innerHTML = toks
    .map((item, idx) => {
      const z = item.z || 0;
      const spike = z <= -3.0 ? "neg" : z >= 3.0 ? "pos" : "none";
      const h = Math.max(4, Math.min(14, Math.round(Math.abs(z) * 1.3)));
      const barColor =
        z <= -3.0 ? "var(--crimson)" : z >= 3.0 ? "var(--emerald)" : "rgba(255,255,255,0.22)";
      return `
        <li class="imp-tok" data-idx="${idx}" data-spike="${spike}">
          <span class="imp-bar" style="--bar-size:${h}px;--bar-color:${barColor}"></span>
          <span class="imp-word">${escapeHtml(item.t)}</span>
          <span class="imp-z">${z > 0 ? "+" : ""}${z.toFixed(1)}</span>
        </li>
      `;
    })
    .join("");

  rail.querySelectorAll(".imp-tok").forEach(tokEl => {
    tokEl.addEventListener("click", () => {
      rail.querySelectorAll(".imp-tok").forEach(x => x.classList.remove("on"));
      tokEl.classList.add("on");
      const idx = Number(tokEl.dataset.idx);
      onSelectToken(toks[idx]);
    });
  });

  // Auto-scroll rail so the first major spike (|z| >= 3.0) is visible without manual scrolling
  const firstSpikeEl = rail.querySelector('.imp-tok[data-spike="neg"], .imp-tok[data-spike="pos"]');
  if (firstSpikeEl) {
    requestAnimationFrame(() => {
      firstSpikeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  }
}
