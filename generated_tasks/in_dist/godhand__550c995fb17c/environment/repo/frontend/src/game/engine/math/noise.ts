import { createNoise2D, type NoiseFunction2D } from 'simplex-noise'
import { createRandomSource } from './random'

export type NoiseSampler2D = NoiseFunction2D

// creates seeded noise2d sampler
export function createSeededNoise2D(seed: number): NoiseSampler2D {
  const rng = createRandomSource(seed ^ 0x9e3779b9)
  return createNoise2D(rng)
}

// simplex-noise 2D (returns in [-1, 1])
export function sampleNoise2D(noise: NoiseSampler2D, x: number, y: number): number {
  return noise(x, y)
}

// https://thebookofshaders.com/13/
// https://iquilezles.org/articles/fbm/
export function fbmNoise2D(
  noise: NoiseSampler2D,
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
): number {
  let amplitude = 1
  let frequency = 1
  let sum = 0
  let amplitudeSum = 0

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += sampleNoise2D(noise, x * frequency, y * frequency) * amplitude
    amplitudeSum += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }

  if (amplitudeSum <= 0) return 0
  return sum / amplitudeSum
}
