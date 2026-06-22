# Crafting Data Workflow

Crafting items and recipes are defined in:

- `src/game/data/craftingData.json`

## JSON shape

```json
{
  "materials": [{ "id": "plate", "label": "Plates" }],
  "stations": [{ "id": "manual", "label": "Manual" }],
  "recipes": [
    {
      "id": "plate",
      "label": "Smelt Plates",
      "output": { "material": "plate", "amount": 1 },
      "cost": { "iron": 2 },
      "valley": 1,
      "station": "manual"
    }
  ]
}
```

## Rules

- `station` must be `manual` or an existing building id (example: `smelter`, `assembler`).
- Ingredient keys in `cost` must be known ores or known materials.
- `output.material` must exist in `materials`.
- IDs must be unique.

`src/game/engine/craftingCatalog.ts` validates these rules at load time and throws a clear error if data is invalid.

## Spreadsheet workflow (Excel/Sheets)

Use three tabs and export/update JSON:

1. `materials`: columns `id`, `label`
2. `stations`: columns `id`, `label`
3. `recipes`: columns `id`, `label`, `output.material`, `output.amount`, `valley`, `station`, plus ingredient columns (for `cost`)

Then copy/export into `craftingData.json`.
