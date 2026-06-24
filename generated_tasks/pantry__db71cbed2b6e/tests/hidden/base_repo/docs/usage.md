# usage cookbook

Tips I've picked up over the months of building this. Most of it is in
`pantry --help` too, but having one page is nice when I'm copy-pasting
from a phone.

## adding things

```
pantry add olive-oil --qty 500ml --where pantry --best-by 2027-01-30
pantry add "All Purpose Flour" --qty 2kg --where pantry --notes "King Arthur"
pantry add eggs --qty 12 --where fridge --best-by 2026-05-22
```

When the slug is missing, the name is sluggified (`"Olive Oil"` -> `olive-oil`).

## using things

```
pantry use olive-oil --qty 30ml
pantry use 17 --qty 100g
```

Quantities are subtracted from the oldest lot first; lots that hit zero
disappear automatically.

## importing a receipt

Format: `item,slug,qty,where,best_by,category,notes` (any subset).

```
pantry import-receipt fixtures/receipts/saturday-shop.csv
```

## what's expiring soon?

```
pantry expiring                    # default 7 day window
pantry expiring --within 14
```

## from recipes to a shopping list

```
pantry shop minestrone bolognese
pantry shop --from 2026-04-15 --to 2026-04-21
```

The first form takes recipe slugs directly; the second uses the meal
plan that's been added with `pantry plan add`.

## reports

```
pantry dash                  # one-screen overview
pantry report waste --month 2026-04
pantry report frequent --from 2026-01-01 --to 2026-04-30
pantry report weekly --from 2026-04-01 --to 2026-04-30
```

## search

```
pantry search "category:dairy where:fridge"
pantry search "expiring:7"
pantry search "notes:'whole grain'"
```

## backup / restore

```
pantry backup --out ~/backups/pantry-2026-04-15.json
pantry restore ~/backups/pantry-2026-04-15.json --into ./recovered
```

## serve over LAN

```
pantry serve --addr 0.0.0.0:8088
```

Then open `http://<your-ip>:8088/` from your phone. There's no auth -
this is for the home network only.
