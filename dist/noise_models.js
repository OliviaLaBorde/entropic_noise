/**
 * Entropic Noise - Noise Models
 * Centralized noise model implementations and parameterized sampling.
 */

class EntropyNoiseModels {
  static clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  static hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453123;
    return s - Math.floor(s);
  }

  static value(x, smoothness) {
    const i = Math.floor(x);
    const f = x - i;
    const t = EntropyNoiseModels.clamp01(smoothness);
    const smoothF = f * f * (3 - 2 * f);
    const u = f + (smoothF - f) * t;
    const a = EntropyNoiseModels.hash(i);
    const b = EntropyNoiseModels.hash(i + 1);
    return a + u * (b - a);
  }

  static controllerVal(controllers, key, fallback) {
    if (!controllers || !Object.prototype.hasOwnProperty.call(controllers, key)) return fallback;
    const v = controllers[key];
    if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'val')) return v.val;
    return v;
  }

  static baseByModel(x, baseModel, controllers) {
    const model = (typeof baseModel === 'string' && baseModel.length > 0) ? baseModel : 'perlin';
    const perlinScale = Math.max(0.0001, Number(EntropyNoiseModels.controllerVal(controllers, 'perlinScale', 1)) || 1);
    const valueScale = Math.max(0.0001, Number(EntropyNoiseModels.controllerVal(controllers, 'valueScale', 1)) || 1);
    const hashScale = Math.max(0.0001, Number(EntropyNoiseModels.controllerVal(controllers, 'hashScale', 1)) || 1);

    if (model === 'value') {
      return EntropyNoiseModels.value(
        x * valueScale,
        EntropyNoiseModels.clamp01(Number(EntropyNoiseModels.controllerVal(controllers, 'valueSmoothness', 1)) || 1)
      );
    }
    if (model === 'hash') {
      const raw = EntropyNoiseModels.hash(x * hashScale);
      const steps = Math.max(0, Math.floor(Number(EntropyNoiseModels.controllerVal(controllers, 'hashSteps', 0)) || 0));
      if (steps <= 1) return raw;
      return Math.floor(raw * steps) / steps;
    }
    const oct = Math.max(1, Math.floor(Number(EntropyNoiseModels.controllerVal(controllers, 'perlinOctaves', 4)) || 4));
    const falloff = EntropyNoiseModels.clamp01(Number(EntropyNoiseModels.controllerVal(controllers, 'perlinFalloff', 0.5)) || 0.5);
    noiseDetail(oct, falloff);
    return noise(x * perlinScale);
  }

  static fbm(x, baseModel, octaves, lacunarity, gain, controllers) {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += EntropyNoiseModels.baseByModel(x * freq, baseModel, controllers) * amp;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return norm > 0 ? EntropyNoiseModels.clamp01(sum / norm) : 0;
  }

  static ridged(x, octaves, lacunarity, gain, controllers) {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      const n = EntropyNoiseModels.baseByModel(x * freq, 'perlin', controllers);
      const ridge = 1 - Math.abs(2 * n - 1);
      sum += ridge * amp;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return norm > 0 ? EntropyNoiseModels.clamp01(sum / norm) : 0;
  }

  static worley1D(x, jitter) {
    const cell = Math.floor(x);
    const fracX = x - cell;
    let minDist = 999;
    for (let i = -1; i <= 1; i++) {
      const neighborCell = cell + i;
      const feature = EntropyNoiseModels.hash(neighborCell * 17.0);
      const featurePos = i + feature * EntropyNoiseModels.clamp01(jitter);
      const d = Math.abs(fracX - featurePos);
      if (d < minDist) minDist = d;
    }
    return EntropyNoiseModels.clamp01(1 - minDist);
  }

  static sample(x, model, controllers) {
    const selected = (typeof model === 'string' && model.length > 0) ? model : 'perlin';
    const baseModel = EntropyNoiseModels.controllerVal(controllers, 'fbmBaseModel', 'perlin');

    switch (selected) {
      case 'perlin':
      case 'value':
      case 'hash':
        return EntropyNoiseModels.baseByModel(x, selected, controllers);
      case 'fbm': {
        const oct = Math.max(1, Math.floor(Number(EntropyNoiseModels.controllerVal(controllers, 'fbmOctaves', 5)) || 5));
        const lac = Math.max(1.01, Number(EntropyNoiseModels.controllerVal(controllers, 'fbmLacunarity', 2.0)) || 2.0);
        const gain = EntropyNoiseModels.clamp01(Number(EntropyNoiseModels.controllerVal(controllers, 'fbmGain', 0.5)) || 0.5);
        const scale = Math.max(0.0001, Number(EntropyNoiseModels.controllerVal(controllers, 'fbmScale', 1.0)) || 1.0);
        return EntropyNoiseModels.fbm(x * scale, baseModel, oct, lac, gain, controllers);
      }
      case 'ridged': {
        const oct = Math.max(1, Math.floor(Number(EntropyNoiseModels.controllerVal(controllers, 'ridgedOctaves', 5)) || 5));
        const lac = Math.max(1.01, Number(EntropyNoiseModels.controllerVal(controllers, 'ridgedLacunarity', 2.0)) || 2.0);
        const gain = EntropyNoiseModels.clamp01(Number(EntropyNoiseModels.controllerVal(controllers, 'ridgedGain', 0.5)) || 0.5);
        const scale = Math.max(0.0001, Number(EntropyNoiseModels.controllerVal(controllers, 'ridgedScale', 1.0)) || 1.0);
        return EntropyNoiseModels.ridged(x * scale, oct, lac, gain, controllers);
      }
      case 'worley': {
        const scale = Math.max(0.0001, Number(EntropyNoiseModels.controllerVal(controllers, 'worleyScale', 4.0)) || 4.0);
        const jitter = EntropyNoiseModels.clamp01(Number(EntropyNoiseModels.controllerVal(controllers, 'worleyJitter', 1.0)) || 1.0);
        return EntropyNoiseModels.worley1D(x * scale, jitter);
      }
      case 'domainWarp': {
        const scale = Math.max(0.0001, Number(EntropyNoiseModels.controllerVal(controllers, 'domainWarpScale', 1.0)) || 1.0);
        const warpStrength = Number(EntropyNoiseModels.controllerVal(controllers, 'domainWarpStrength', 0.75)) || 0.75;
        const warpFreq = Math.max(0.0001, Number(EntropyNoiseModels.controllerVal(controllers, 'domainWarpFreq', 1.5)) || 1.5);
        const warpOct = Math.max(1, Math.floor(Number(EntropyNoiseModels.controllerVal(controllers, 'domainWarpOctaves', 3)) || 3));
        const warp = EntropyNoiseModels.fbm(x * warpFreq, 'perlin', warpOct, 2.0, 0.5, controllers);
        const warpedX = x * scale + (warp - 0.5) * 2.0 * warpStrength;
        return EntropyNoiseModels.fbm(
          warpedX,
          baseModel,
          Math.max(1, Math.floor(Number(EntropyNoiseModels.controllerVal(controllers, 'fbmOctaves', 5)) || 5)),
          Math.max(1.01, Number(EntropyNoiseModels.controllerVal(controllers, 'fbmLacunarity', 2.0)) || 2.0),
          EntropyNoiseModels.clamp01(Number(EntropyNoiseModels.controllerVal(controllers, 'fbmGain', 0.5)) || 0.5),
          controllers
        );
      }
      default:
        return EntropyNoiseModels.baseByModel(x, 'perlin', controllers);
    }
  }
}

// Expose globally for non-module script usage.
window.EntropyNoiseModels = EntropyNoiseModels;
