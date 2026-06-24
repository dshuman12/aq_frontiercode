import { MATERIAL_LABELS } from '../../../game/engine'
import { ORE_VISUALS } from '../oreCatalog'

export function resourceLabel(resource: string): string {
  if (resource in ORE_VISUALS) return ORE_VISUALS[resource as keyof typeof ORE_VISUALS].label
  if (resource in MATERIAL_LABELS) return MATERIAL_LABELS[resource as keyof typeof MATERIAL_LABELS]
  return resource
}
