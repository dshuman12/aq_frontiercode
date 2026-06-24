// JSON schemas for Item and Recipe. Hand-rolled so editors can offer
// IntelliSense without requiring users to install a tool to generate them.

export function itemSchema(): unknown {
  return {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "pantry.Item",
    "type": "object",
    "required": ["id", "slug", "name", "lots"],
    "properties": {
      "id": { "type": "integer", "minimum": 1 },
      "slug": { "type": "string", "pattern": "^[a-z0-9]+(?:[-_][a-z0-9]+)*$" },
      "name": { "type": "string" },
      "category": { "type": "string" },
      "barcode": { "type": "string" },
      "aliases": { "type": "array", "items": { "type": "string" } },
      "notes": { "type": "string" },
      "createdAt": { "type": "string", "format": "date" },
      "updatedAt": { "type": "string", "format": "date" },
      "lots": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["id", "qty", "addedAt", "where"],
          "properties": {
            "id": { "type": "integer", "minimum": 1 },
            "qty": {
              "type": "object",
              "required": ["value", "kind"],
              "properties": {
                "value": { "type": "number", "minimum": 0 },
                "kind": { "enum": ["mass", "volume", "count"] },
              },
            },
            "addedAt": { "type": "string" },
            "bestBy": { "type": "string" },
            "where": { "type": "string" },
            "notes": { "type": "string" },
            "source": { "type": "string" },
          },
        },
      },
    },
  };
}

export function recipeSchema(): unknown {
  return {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "pantry.Recipe",
    "type": "object",
    "required": ["id", "slug", "name", "servings", "ingredients"],
    "properties": {
      "id": { "type": "integer", "minimum": 1 },
      "slug": { "type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      "name": { "type": "string" },
      "category": { "type": "string" },
      "servings": { "type": "integer", "minimum": 1 },
      "totalMinutes": { "type": "integer", "minimum": 0 },
      "ingredients": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["slug", "qty"],
          "properties": {
            "slug": { "type": "string" },
            "qty": {
              "type": "object",
              "required": ["value", "kind"],
              "properties": {
                "value": { "type": "number", "minimum": 0 },
                "kind": { "enum": ["mass", "volume", "count"] },
              },
            },
            "substitutions": { "type": "array", "items": { "type": "string" } },
            "notes": { "type": "string" },
          },
        },
      },
      "steps": { "type": "string" },
      "tags": { "type": "array", "items": { "type": "string" } },
    },
  };
}

export function emit(): { item: string; recipe: string } {
  return {
    item: JSON.stringify(itemSchema(), null, 2),
    recipe: JSON.stringify(recipeSchema(), null, 2),
  };
}
