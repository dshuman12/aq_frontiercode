import { uniformInt } from 'pure-rand/distribution/uniformInt'
import { xoroshiro128plus } from 'pure-rand/generator/xoroshiro128plus'

type IntInRangeFn = (min: number, max: number) => number
export type RandomSource = (() => number) & { intInRange?: IntInRangeFn }

const UINT32_RANGE = 4294967296

// pure-rand RNG constructors:
// https://www.npmjs.com/package/pure-rand
export function createRandomSource(seed: number): RandomSource {
  const generator = xoroshiro128plus(seed | 0)
  const random = (() => {
    const next = generator.next() >>> 0
    return next / UINT32_RANGE
  }) as RandomSource
  random.intInRange = (min, max) => uniformInt(generator, min, max)
  return random
}

export function randomIntInRange(rng: RandomSource, min: number, max: number): number {
  if (max <= min) return min
  const from = Math.ceil(min)
  const to = Math.floor(max)
  if (to <= from) return from
  if (rng.intInRange) return rng.intInRange(from, to)
  return from + Math.floor(rng() * (to - from + 1))
}

export function randomFloatInRange(rng: RandomSource, min: number, max: number): number {
  if (max <= min) return min
  return min + rng() * (max - min)
}
