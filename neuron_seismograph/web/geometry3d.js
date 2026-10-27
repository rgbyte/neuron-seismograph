/**
 * @file geometry3d.js
 * Deterministic 3D coordinate mapping (Fibonacci Phyllotaxis irises along a curved
 * 32-layer spine) and custom GLSL Gaussian starlight shader material.
 */

import * as THREE from "three";
import { DISC_RADIUS, GOLDEN_ANGLE, NEURONS_PER_LAYER } from "./constants.js";

/**
 * Returns the 3D world-space center of MLP layer `l` (0..31) along the curved spine.
 * @param {number} l - Layer index (0..31)
 * @returns {THREE.Vector3}
 */
export function layerCenter(l) {
  const u = (l - 15.5) / 15.5;
  const x = u * 23.5;
  const z = -Math.pow(u, 2) * 7.2 + 3.0;
  const y = Math.sin(u * Math.PI * 0.5) * 0.5;
  return new THREE.Vector3(x, y, z);
}

/**
 * Returns the unit tangent vector along thespine at layer `l`.
 * @param {number} l - Layer index (0..31)
 * @returns {THREE.Vector3}
 */
export function layerTangent(l) {
  const p0 = layerCenter(Math.max(0, l - 0.5));
  const p1 = layerCenter(Math.min(31, l + 0.5));
  return p1.sub(p0).normalize();
}

/**
 * Maps `(layer, neuron)` onto its deterministic 3D coordinate on that layer's
 * Golden-Angle Fibonacci iris disc (`r ∝ √(n / 9216)`, `θ = n × 137.5°`).
 * @param {number} layer - Layer index (0..31)
 * @param {number} n - Neuron index (0..9215)
 * @returns {THREE.Vector3}
 */
export function neuronPos3D(layer, n) {
  const center = layerCenter(layer);
  const tangent = layerTangent(layer);
  const up = new THREE.Vector3(0, 1, 0);
  const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
  const r = DISC_RADIUS * (0.12 + 0.88 * Math.sqrt((n + 0.5) / NEURONS_PER_LAYER));
  const theta = n * GOLDEN_ANGLE;
  return center
    .clone()
    .addScaledVector(up, Math.sin(theta) * r)
    .addScaledVector(binormal, Math.cos(theta) * r);
}

/**
 * Creates an additive-blended GLSL `ShaderMaterial` for rendering soft Gaussian
 * starlight points that respond to the forward-pass `uPulseLayer` wave.
 * @param {number} baseSize - Base point size multiplier
 * @returns {THREE.ShaderMaterial}
 */
export function createStarShaderMaterial(baseSize = 3.2) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uScale: { value: baseSize * Math.min(devicePixelRatio, 2) },
      uTime: { value: 0 },
      uPulseLayer: { value: -10.0 },
    },
    vertexShader: `
      uniform float uScale;
      uniform float uTime;
      uniform float uPulseLayer;
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aLayer;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float dist = max(1.0, -mvPosition.z);
        float wave = exp(-pow((aLayer - uPulseLayer) * 0.5, 2.0));
        vColor = aColor + vec3(0.25, 0.55, 0.45) * wave;
        vAlpha = clamp(0.80 + 0.20 * wave, 0.0, 1.0);
        gl_PointSize = clamp(uScale * aSize * (1.0 + 0.75 * wave) * (20.0 / dist), 1.5, 34.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv) * 2.0;
        if (d > 1.0) discard;
        float core = exp(-d * d * 4.0);
        float halo = pow(1.0 - d, 2.0) * 0.55;
        float intensity = core + halo;
        gl_FragColor = vec4(vColor * intensity, intensity * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
