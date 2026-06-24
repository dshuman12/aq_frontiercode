# changelog

A rough log of what landed when. Mostly for me.

## 2025-08
- scaffold: package.json + tsconfig + lockfile
- cli: tiny stdlib-based dispatcher + flag parser

## 2025-09
- units: parse / format quantities
- paths: XDG-aware data/config/cache resolution
- item: Item + Lot types

## 2025-10
- store: per-item JSON files with atomic writes
- format/table: ASCII column rendering
- format/color: minimal ANSI helpers
- date: ISO date math
- cli/list, cli/show

## 2025-11
- cli/add, cli/rm, cli/use
- main wires every subcommand by side-effect import

## 2025-12
- recipe + recipe-store
- shopping-list builder
- menu (meal plan) persistence

## 2026-01
- expiring report subcommand

## 2026-02
- importers/csv-parser
- importers/receipt
- importers/jsonl

## 2026-03
- exporters/markdown / csv / html
- core/search query language

## 2026-04
- reports/waste + frequent + weekly
- core/config
- core/event log
- core/archive (backup + restore)
- web HTTP server
- reports/dashboard
- core/fuzzy + substitute
- reports/healthcheck

## 2026-05
- bulk CLI wirings + main
- alerts / prep / pricing / convert
- index / diff / snapshot / meal-history
- streaks / forecast / categories / tags
- 30+ sample recipes
- pure-Node Dockerfile
