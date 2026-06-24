import type { OreType } from '../../game/engine'

export type OreVisual = {
  label: string
  fill: string
  stroke: string
  glow: string
  valley: number
}

export const ORE_VISUALS: Record<OreType, OreVisual> = {
  iron: {
    label: 'Iron',
    fill: '#9ca6b5',
    stroke: '#5f6875',
    glow: 'rgba(178, 189, 205, 0.35)',
    valley: 1,
  },
  copper: {
    label: 'Copper',
    fill: '#d88a55',
    stroke: '#95542c',
    glow: 'rgba(245, 173, 124, 0.35)',
    valley: 1,
  },
  coal: {
    label: 'Coal',
    fill: '#3c3c45',
    stroke: '#1f1f27',
    glow: 'rgba(128, 128, 148, 0.3)',
    valley: 1,
  },
  silica: {
    label: 'Silica',
    fill: '#d7d0c0',
    stroke: '#948a75',
    glow: 'rgba(230, 218, 190, 0.34)',
    valley: 2,
  },
  aluminum: {
    label: 'Aluminum',
    fill: '#bdcbd8',
    stroke: '#6f8091',
    glow: 'rgba(192, 219, 238, 0.3)',
    valley: 2,
  },
  titanium: {
    label: 'Titanium',
    fill: '#7d8baa',
    stroke: '#49536f',
    glow: 'rgba(146, 166, 216, 0.34)',
    valley: 3,
  },
  lithium: {
    label: 'Lithium',
    fill: '#b8f0ff',
    stroke: '#5ba4bc',
    glow: 'rgba(164, 241, 255, 0.4)',
    valley: 3,
  },
  tungsten: {
    label: 'Tungsten',
    fill: '#989c85',
    stroke: '#5d6149',
    glow: 'rgba(186, 192, 149, 0.36)',
    valley: 4,
  },
  thorium: {
    label: 'Thorium',
    fill: '#8a65d4',
    stroke: '#4d3789',
    glow: 'rgba(164, 126, 240, 0.4)',
    valley: 4,
  },
}

export const VALLEY_ORES: Record<number, OreType[]> = {
  1: ['iron', 'copper', 'coal'],
  2: ['silica', 'aluminum'],
  3: ['titanium', 'lithium'],
  4: ['tungsten', 'thorium'],
}

export const COLLECTION_GOAL: Record<OreType, number> = {
  iron: 80,
  copper: 80,
  coal: 80,
  silica: 60,
  aluminum: 60,
  titanium: 45,
  lithium: 45,
  tungsten: 30,
  thorium: 20,
}
