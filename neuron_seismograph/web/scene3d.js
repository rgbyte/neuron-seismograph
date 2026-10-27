/**
 * @file scene3d.js
 * Three.js WebGL Engine for the 3D Celestial Loom & Seismic Horizon Waterfall.
 * Coordinates:
 *  - 32 Fibonacci Phyllotaxis Layer Irises (`38,400` starlight points)
 *  - Live Activated Supernovas (up to `160` prompt-activated neurons)
 *  - Rotating Dual-Ring 3D Gyroscope Orbs & Screen-Space HUD Pins
 *  - Direct 1-Hop Quadratic Bezier Synaptic Arcs + Circuit Spine (`buildSilkWeb`)
 *  - 32-Layer Seismic Horizon Waterfall (`rebuildWaterfall`)
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  DISC_RADIUS,
  MAX_HOT_NEURONS,
  NEURONS_PER_LAYER,
  NUM_LAYERS,
  STREAM_PARTICLES,
} from "./constants.js";
import {
  createStarShaderMaterial,
  layerCenter,
  layerTangent,
  neuronPos3D,
} from "./geometry3d.js";
import { escapeHtml } from "./ui.js";

/**
 * Initializes the Three.js scene, camera, controls, and animation loop.
 * @param {HTMLCanvasElement} canvas - Target WebGL canvas
 * @param {HTMLElement} pinOverlay - DOM overlay container for 3D floating pins
 * @param {{onSelectNeuron: (layer: number, n: number) => void}} callbacks
 */
export function createScene3D(canvas, pinOverlay, { onSelectNeuron }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(-1.0, 0.0, 1.2);
  camera.position.set(-2.0, 8.8, 33.5);
  controls.update();

  // Group A: 3D Celestial Loom (32 Fibonacci Layer Irises)
  const loomGroup = new THREE.Group();
  scene.add(loomGroup);

  const STARS_PER_LAYER = 1200;
  const totalStars = NUM_LAYERS * STARS_PER_LAYER;
  const starPos = new Float32Array(totalStars * 3);
  const starCol = new Float32Array(totalStars * 3);
  const starSize = new Float32Array(totalStars);
  const starLayer = new Float32Array(totalStars);

  const cEarly = new THREE.Color(0x286da8);
  const cMid = new THREE.Color(0x3a5ba0);
  const cLate = new THREE.Color(0x248f80);

  for (let l = 0; l < NUM_LAYERS; l++) {
    const baseC = l < 11 ? cEarly : l <= 20 ? cMid : cLate;
    for (let i = 0; i < STARS_PER_LAYER; i++) {
      const n = Math.floor((i / STARS_PER_LAYER) * NEURONS_PER_LAYER);
      const p = neuronPos3D(l, n);
      const idx = l * STARS_PER_LAYER + i;
      starPos[idx * 3] = p.x;
      starPos[idx * 3 + 1] = p.y;
      starPos[idx * 3 + 2] = p.z;
      const bright = l % 4 === 3 ? 0.52 : 0.34;
      starCol[idx * 3] = baseC.r * bright;
      starCol[idx * 3 + 1] = baseC.g * bright;
      starCol[idx * 3 + 2] = baseC.b * bright;
      starSize[idx] = 0.85;
      starLayer[idx] = l;
    }
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("aColor", new THREE.BufferAttribute(starCol, 3));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute("aLayer", new THREE.BufferAttribute(starLayer, 1));
  const starMat = createStarShaderMaterial(2.6);
  loomGroup.add(new THREE.Points(starGeo, starMat));

  // Live Prompt-Activated Supernovas Layer
  const hotGeo = new THREE.BufferGeometry();
  const hotPos = new Float32Array(MAX_HOT_NEURONS * 3);
  const hotCol = new Float32Array(MAX_HOT_NEURONS * 3);
  const hotSize = new Float32Array(MAX_HOT_NEURONS);
  const hotLayer = new Float32Array(MAX_HOT_NEURONS);
  hotGeo.setAttribute("position", new THREE.BufferAttribute(hotPos, 3));
  hotGeo.setAttribute("aColor", new THREE.BufferAttribute(hotCol, 3));
  hotGeo.setAttribute("aSize", new THREE.BufferAttribute(hotSize, 1));
  hotGeo.setAttribute("aLayer", new THREE.BufferAttribute(hotLayer, 1));
  const hotMat = createStarShaderMaterial(5.8);
  const hotPoints = new THREE.Points(hotGeo, hotMat);
  hotPoints.frustumCulled = false;
  loomGroup.add(hotPoints);

  const dynamicOrbsGroup = new THREE.Group();
  loomGroup.add(dynamicOrbsGroup);

  const silkWebGroup = new THREE.Group();
  loomGroup.add(silkWebGroup);

  // Flowing Laminar Residual Stream Particles
  const streamGeo = new THREE.BufferGeometry();
  const streamPos = new Float32Array(STREAM_PARTICLES * 3);
  const streamCol = new Float32Array(STREAM_PARTICLES * 3);
  const streamSize = new Float32Array(STREAM_PARTICLES);
  const streamLayer = new Float32Array(STREAM_PARTICLES);
  const streamMeta = [];

  for (let i = 0; i < STREAM_PARTICLES; i++) {
    streamMeta.push({
      l: Math.random() * 31,
      angle: Math.random() * Math.PI * 2,
      radius: 0.15 + Math.random() * (DISC_RADIUS * 0.55),
      speed: 0.055 + Math.random() * 0.045,
      twist: (Math.random() - 0.5) * 0.18,
    });
    streamSize[i] = 1.7 + (i % 5) * 0.35;
  }
  streamGeo.setAttribute("position", new THREE.BufferAttribute(streamPos, 3));
  streamGeo.setAttribute("aColor", new THREE.BufferAttribute(streamCol, 3));
  streamGeo.setAttribute("aSize", new THREE.BufferAttribute(streamSize, 1));
  streamGeo.setAttribute("aLayer", new THREE.BufferAttribute(streamLayer, 1));
  loomGroup.add(new THREE.Points(streamGeo, createStarShaderMaterial(3.2)));

  // Group B: 32-Layer Seismic Horizon Waterfall
  const horizonGroup = new THREE.Group();
  horizonGroup.visible = false;
  scene.add(horizonGroup);

  let activePins = [];
  let cachedEdges = null;
  let currentDose = -0.8;
  let focusedNeuron = { layer: 18, n: 4310 };
  let pulseLayer = -10.0;
  let pulseActive = false;
  let camAnim = null;

  /**
   * Updates the 3D supernova point cloud, rotating 3D gyroscope orbs, and floating pins.
   */
  function updateActivations(hotList, topNodes) {
    const count = Math.min(MAX_HOT_NEURONS, hotList.length);
    const cPos = new THREE.Color(0x10f5a0);
    const cGold = new THREE.Color(0xf7b955);
    const cNeg = new THREE.Color(0xff3d68);

    for (let i = 0; i < MAX_HOT_NEURONS; i++) {
      if (i < count) {
        const item = hotList[i];
        const p = neuronPos3D(item.layer, item.n);
        hotPos[i * 3] = p.x;
        hotPos[i * 3 + 1] = p.y;
        hotPos[i * 3 + 2] = p.z;

        const isNeg = item.sign === "-" || item.score < 0;
        const col = isNeg ? cNeg : i < 6 ? cPos : cGold;
        hotCol[i * 3] = col.r * 1.4;
        hotCol[i * 3 + 1] = col.g * 1.4;
        hotCol[i * 3 + 2] = col.b * 1.4;
        hotSize[i] = Math.min(4.2, 1.4 + Math.abs(item.score) * 0.22);
        hotLayer[i] = item.layer;
      } else {
        hotPos[i * 3] = 0;
        hotPos[i * 3 + 1] = -9999;
        hotPos[i * 3 + 2] = 0;
        hotSize[i] = 0;
      }
    }
    hotGeo.attributes.position.needsUpdate = true;
    hotGeo.attributes.aColor.needsUpdate = true;
    hotGeo.attributes.aSize.needsUpdate = true;
    hotGeo.attributes.aLayer.needsUpdate = true;

    while (dynamicOrbsGroup.children.length) {
      const ch = dynamicOrbsGroup.children.pop();
      ch.geometry?.dispose();
    }

    const kinds = ["lock", "sensor", "gate", "sledge"];
    const orbColors = [0x10f5a0, 0xff3d68, 0xf7b955, 0xb77bff];

    activePins = topNodes.slice(0, 4).map((nd, idx) => {
      const isNeg = nd.score < 0 || nd.pole === "-";
      const colHex = isNeg ? 0xff3d68 : orbColors[idx % orbColors.length];
      const pos = neuronPos3D(nd.layer, nd.n);

      const g = new THREE.Group();
      g.position.copy(pos);
      g.userData = { layer: nd.layer, n: nd.n };

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: colHex })
      );
      const ring1 = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.38, 32),
        new THREE.MeshBasicMaterial({
          color: colHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        })
      );
      const ring2 = ring1.clone();
      ring2.rotation.x = Math.PI / 2;
      g.add(core, ring1, ring2);
      dynamicOrbsGroup.add(g);

      const signStr = nd.score > 0 ? `+${nd.score.toFixed(1)}` : `${nd.score.toFixed(1)}`;
      return {
        layer: nd.layer,
        n: nd.n,
        kind: isNeg ? "sensor" : kinds[idx % kinds.length],
        label: `L${nd.layer}·${nd.n} ${signStr}σ`,
      };
    });

    pinOverlay.innerHTML = activePins
      .map(
        (p, i) =>
          `<div class="pin3d" data-idx="${i}" data-kind="${p.kind}"><span class="pin-dot"></span><span>${escapeHtml(p.label)}</span></div>`
      )
      .join("");

    pinOverlay.querySelectorAll(".pin3d").forEach(el => {
      el.addEventListener("click", () => {
        const p = activePins[Number(el.dataset.idx)];
        if (onSelectNeuron) onSelectNeuron(p.layer, p.n);
      });
    });

    return count;
  }

  /**
   * Builds curved Quadratic Bezier synaptic arcs for direct 1-hop connections (`|hop| === 1`)
   * radiating from `focusedNeuron`, plus the relay spine connecting the top 4 circuit orbs.
   */
  function buildSilkWeb(edges) {
    if (edges) cachedEdges = edges;
    const src = cachedEdges;
    while (silkWebGroup.children.length) {
      const ch = silkWebGroup.children.pop();
      ch.geometry?.dispose();
    }

    const connectedEdges = [];
    if (src && src.length) {
      const totalEdges = Math.floor(src.length / 6);
      for (let i = 0; i < totalEdges; i++) {
        const l1 = src[i * 6];
        const n1 = src[i * 6 + 1];
        const l2 = src[i * 6 + 2];
        const n2 = src[i * 6 + 3];
        const z = src[i * 6 + 4];
        const hop = src[i * 6 + 5];
        const touchesFocused =
          (l1 === focusedNeuron.layer && n1 === focusedNeuron.n) ||
          (l2 === focusedNeuron.layer && n2 === focusedNeuron.n);
        if (Math.abs(hop) === 1 && touchesFocused) {
          connectedEdges.push({ l1, n1, l2, n2, z, hop: 1 });
        }
      }
    }

    if (activePins.length > 1) {
      const sortedPins = [...activePins].sort((a, b) => a.layer - b.layer);
      for (let i = 0; i < sortedPins.length - 1; i++) {
        connectedEdges.push({
          l1: sortedPins[i].layer,
          n1: sortedPins[i].n,
          l2: sortedPins[i + 1].layer,
          n2: sortedPins[i + 1].n,
          z: 320,
          hop: 1,
        });
      }
    }

    if (!connectedEdges.length) return;

    const zMax = Math.max(1, ...connectedEdges.map(e => Math.abs(e.z)));
    const doseFactor = 0.55 + Math.abs(currentDose) * 0.45;
    const cUp = currentDose >= 0 ? new THREE.Color(0x10f5a0) : new THREE.Color(0xf7b955);
    const cDown = new THREE.Color(0xff3d68);
    const cMid = new THREE.Color(0x56ccf2);

    const curveSegments = 24;
    const positions = new Float32Array(connectedEdges.length * curveSegments * 2 * 3);
    const colors = new Float32Array(connectedEdges.length * curveSegments * 2 * 3);
    const endpointPos = [];
    const endpointCol = [];
    const endpointSize = [];
    const endpointLayer = [];
    let ptr = 0;

    connectedEdges.forEach(e => {
      const a = neuronPos3D(e.l1, e.n1);
      const b = neuronPos3D(e.l2, e.n2);
      const mid = a.clone().lerp(b, 0.5);
      const span = a.distanceTo(b);
      const archDir = mid.clone().sub(layerCenter((e.l1 + e.l2) * 0.5)).normalize();
      mid.addScaledVector(archDir, span * 0.16 + 0.25);

      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const pts = curve.getPoints(curveSegments);
      const baseCol = e.z * (currentDose >= 0 ? 1 : -1) > 0 ? cUp : cDown;
      const strength = Math.min(1.0, (0.3 + 0.5 * (Math.abs(e.z) / zMax)) * doseFactor);

      const partnerL = e.l1 === focusedNeuron.layer && e.n1 === focusedNeuron.n ? e.l2 : e.l1;
      const partnerP = e.l1 === focusedNeuron.layer && e.n1 === focusedNeuron.n ? b : a;
      endpointPos.push(partnerP.x, partnerP.y, partnerP.z);
      endpointCol.push(baseCol.r * 1.2, baseCol.g * 1.2, baseCol.b * 1.2);
      endpointSize.push(2.1);
      endpointLayer.push(partnerL);

      for (let s = 0; s < curveSegments; s++) {
        const p0 = pts[s];
        const p1 = pts[s + 1];
        const u0 = s / curveSegments;
        const u1 = (s + 1) / curveSegments;
        const col0 = baseCol.clone().lerp(cMid, Math.sin(u0 * Math.PI) * 0.35).multiplyScalar(strength);
        const col1 = baseCol.clone().lerp(cMid, Math.sin(u1 * Math.PI) * 0.35).multiplyScalar(strength);

        positions.set([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z], ptr);
        colors.set([col0.r, col0.g, col0.b, col1.r, col1.g, col1.b], ptr);
        ptr += 6;
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    silkWebGroup.add(
      new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.78,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );

    if (endpointPos.length) {
      const epGeo = new THREE.BufferGeometry();
      epGeo.setAttribute("position", new THREE.Float32BufferAttribute(endpointPos, 3));
      epGeo.setAttribute("aColor", new THREE.Float32BufferAttribute(endpointCol, 3));
      epGeo.setAttribute("aSize", new THREE.Float32BufferAttribute(endpointSize, 1));
      epGeo.setAttribute("aLayer", new THREE.Float32BufferAttribute(endpointLayer, 1));
      silkWebGroup.add(new THREE.Points(epGeo, createStarShaderMaterial(4.2)));
    }
  }

  /**
   * Rebuilds the 32-layer 3D Seismic Horizon Waterfall from prompt spike peaks.
   */
  function rebuildWaterfall(peaks) {
    while (horizonGroup.children.length) {
      const ch = horizonGroup.children.pop();
      ch.geometry?.dispose();
    }
    const cBaseline = new THREE.Color(0x235789);
    const cCrimson = new THREE.Color(0xff3d68);
    const cEmerald = new THREE.Color(0x10f5a0);
    const cGold = new THREE.Color(0xf7b955);

    for (let l = 0; l < NUM_LAYERS; l++) {
      const zOffset = (l - 15.5) * 0.85;
      const pts = [];
      const cols = [];
      for (let t = 0; t <= 120; t++) {
        const u = (t / 120) * 20;
        const x = (u - 10) * 1.65;
        let y = Math.sin(u * 1.3 + l * 0.45) * 0.14;
        for (const pk of peaks) {
          const tCenter = pk.pos !== undefined ? pk.pos : 10;
          const sign = pk.sign === "-" || pk.score < 0 ? -1 : 1;
          const amp = Math.min(7.5, Math.abs(pk.score) * 0.55) * sign;
          y += Math.exp(-Math.pow((u - tCenter) / 0.9, 2)) * Math.exp(-Math.pow((l - pk.layer) / 2.0, 2)) * amp;
        }
        pts.push(new THREE.Vector3(x, y, zOffset));
        const c = cBaseline.clone();
        if (y < -0.8) c.lerp(cCrimson, Math.min(1, Math.abs(y) / 4.5));
        else if (y > 0.8) c.lerp(l >= 16 ? cEmerald : cGold, Math.min(1, y / 4.5));
        cols.push(c.r, c.g, c.b);
      }
      const rg = new THREE.BufferGeometry().setFromPoints(pts);
      rg.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      horizonGroup.add(
        new THREE.Line(
          rg,
          new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
          })
        )
      );
    }
  }

  const colCyan = new THREE.Color(0x56ccf2);
  const colCrimson = new THREE.Color(0xff3d68);
  const colGold = new THREE.Color(0xf7b955);
  const colEmerald = new THREE.Color(0x10f5a0);

  function updateStreamSimulation(now) {
    const up = new THREE.Vector3(0, 1, 0);
    const fLayer = focusedNeuron.layer;

    for (let i = 0; i < STREAM_PARTICLES; i++) {
      const m = streamMeta[i];
      m.l += m.speed * (0.8 + Math.abs(currentDose) * 0.25);
      if (m.l > 31) m.l = 0;
      m.angle += m.twist * 0.08;

      const center = layerCenter(m.l);
      const tangent = layerTangent(m.l);
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      let rad = m.radius;
      let c = colCyan;

      if (m.l >= fLayer) {
        const distPast = Math.min(1, (m.l - fLayer) / 5.0);
        if (currentDose < -0.1) {
          rad = m.radius * (1.0 - Math.min(0.65, Math.abs(currentDose) * 0.25) * distPast);
          c = colEmerald;
        } else if (currentDose > 0.1) {
          rad = m.radius * (1.0 + Math.min(1.4, currentDose * 0.45) * distPast);
          c = colGold.clone().lerp(colCrimson, 0.4);
        }
      }

      const pos = center
        .addScaledVector(up, Math.sin(m.angle) * rad)
        .addScaledVector(binormal, Math.cos(m.angle) * rad);

      streamPos[i * 3] = pos.x;
      streamPos[i * 3 + 1] = pos.y;
      streamPos[i * 3 + 2] = pos.z;
      streamCol[i * 3] = c.r;
      streamCol[i * 3 + 1] = c.g;
      streamCol[i * 3 + 2] = c.b;
      streamLayer[i] = m.l;
    }

    streamGeo.attributes.position.needsUpdate = true;
    streamGeo.attributes.aColor.needsUpdate = true;
    streamGeo.attributes.aLayer.needsUpdate = true;

    const orbScale = 0.75 + Math.abs(currentDose) * 0.45;
    dynamicOrbsGroup.children.forEach((g, idx) => {
      if (g.isGroup) {
        g.rotation.y = now * 0.0014 * (idx % 2 === 0 ? 1 : -1);
        g.rotation.z = now * 0.001;
        const isFocused =
          g.userData.layer === focusedNeuron.layer && g.userData.n === focusedNeuron.n;
        g.scale.setScalar(isFocused ? orbScale * (1.0 + 0.12 * Math.sin(now * 0.006)) : 0.9);
      }
    });

    if (pulseActive) {
      pulseLayer += 0.32;
      if (pulseLayer > 34) {
        pulseActive = false;
        pulseLayer = -10.0;
      }
    }
    starMat.uniforms.uPulseLayer.value = pulseLayer;
    hotMat.uniforms.uPulseLayer.value = pulseLayer;
  }

  function updatePinScreenCoords() {
    if (!loomGroup.visible) {
      pinOverlay.style.display = "none";
      return;
    }
    pinOverlay.style.display = "block";
    const els = pinOverlay.children;
    for (let i = 0; i < activePins.length; i++) {
      const p = activePins[i];
      const el = els[i];
      if (!el) continue;
      const v = neuronPos3D(p.layer, p.n).project(camera);
      if (v.z > 1 || v.z < -1) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "inline-flex";
      el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
      el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    }
  }

  function flyToLayer(l) {
    const sT = controls.target.clone();
    const eT = layerCenter(l);
    const offset = camera.position.clone().sub(controls.target);
    const t0 = performance.now();
    camAnim = now => {
      const u = Math.min(1, (now - t0) / 520);
      const ease = 1 - Math.pow(1 - u, 3);
      controls.target.lerpVectors(sT, eT, ease);
      camera.position.copy(controls.target).add(offset);
      if (u >= 1) camAnim = null;
    };
  }

  function resetCamera() {
    const sT = controls.target.clone();
    const eT = new THREE.Vector3(-1.0, 0.0, 1.2);
    const sP = camera.position.clone();
    const eP = new THREE.Vector3(-2.0, 8.8, 33.5);
    const t0 = performance.now();
    camAnim = now => {
      const u = Math.min(1, (now - t0) / 560);
      const ease = 1 - Math.pow(1 - u, 3);
      controls.target.lerpVectors(sT, eT, ease);
      camera.position.lerpVectors(sP, eP, ease);
      if (u >= 1) camAnim = null;
    };
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (camAnim) camAnim(now);
    updateStreamSimulation(now);
    controls.update();
    updatePinScreenCoords();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  window.addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  return {
    updateActivations,
    buildSilkWeb,
    rebuildWaterfall,
    flyToLayer,
    resetCamera,
    setDose(d) {
      currentDose = d;
      buildSilkWeb(null);
    },
    setFocusedNeuron(layer, n) {
      focusedNeuron = { layer, n };
    },
    setMode(mode) {
      const isLoom = mode === "loom";
      loomGroup.visible = isLoom;
      horizonGroup.visible = !isLoom;
    },
    toggleSilkWeb() {
      silkWebGroup.visible = !silkWebGroup.visible;
      return silkWebGroup.visible;
    },
    triggerPulse() {
      pulseLayer = 0.0;
      pulseActive = true;
    },
  };
}
