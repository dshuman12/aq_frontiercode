from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .models import (
    BuildingState,
    ClearManualCraftCommand,
    CommandResult,
    ManualCraftActiveState,
    ManualQueueEntry,
    PlaceBuildingCommand,
    QueueManualCraftCommand,
    RemoveBuildingCommand,
    RoomState,
    SetRecipeCommand,
)

DEFAULT_ORE_TYPES = [
    "iron",
    "copper",
    "coal",
    "silica",
    "aluminum",
    "titanium",
    "lithium",
    "tungsten",
    "thorium",
]

DEFAULT_UNLOCKED_BUILDS = [
    "conveyor",
    "miner",
    "storage",
    "depot_in",
    "depot_out",
    "bridge_t2",
    "bridge_t3",
    "bridge_t4",
]

ALLOWED_BUILD_IDS = {
    "conveyor",
    "splitter",
    "storage",
    "depot_in",
    "depot_out",
    "miner",
    "drill",
    "smelter",
    "assembler",
    "refinery",
    "lab",
    "generator",
    "battery",
    "power_plant",
    "logistics_hub",
    "bridge_t1",
    "bridge_t2",
    "bridge_t3",
    "bridge_t4",
}

BUILD_COSTS: dict[str, dict[str, int]] = {
    "conveyor": {"iron": 1},
    "splitter": {"plate": 2, "wire": 2},
    "storage": {"plate": 8, "wire": 4, "iron": 6},
    "depot_in": {"plate": 4, "wire": 2, "iron": 3},
    "depot_out": {"plate": 4, "wire": 2, "iron": 3},
    "miner": {"iron": 4, "plate": 1},
    "drill": {"steel": 2, "gear": 2},
    "smelter": {"plate": 5, "coal": 6},
    "assembler": {"wire": 6, "steel": 3},
    "refinery": {"titanium": 8, "polymer": 6},
    "lab": {"circuit": 8, "alloy": 4},
    "generator": {"gear": 6, "coal": 10},
    "battery": {"plate": 6, "wire": 8, "lithium": 4},
    "power_plant": {"steel": 8, "circuit": 6, "alloy": 3},
    "logistics_hub": {"alloy": 10, "core": 2},
    "bridge_t1": {"plate": 18, "wire": 14, "gear": 8, "steel": 6},
    "bridge_t2": {"plate": 18, "wire": 14, "gear": 8, "steel": 6},
    "bridge_t3": {"polymer": 18, "circuit": 14, "steel": 12, "gear": 8},
    "bridge_t4": {"alloy": 20, "circuit": 16, "polymer": 12, "steel": 10},
}

BUILD_FOOTPRINTS: dict[str, tuple[int, int]] = {
    "smelter": (2, 3),
    "assembler": (3, 3),
    "refinery": (4, 3),
    "lab": (4, 4),
    "depot_out": (2, 1),
    "depot_in": (2, 2),
}

PROCESSOR_BUILD_IDS = {"smelter", "assembler", "refinery", "lab"}
STORAGE_BUILD_IDS = {"storage", "depot_in"}
ORE_STORAGE_BASE = 120
MATERIAL_STORAGE_BASE = 90
ORE_STORAGE_BONUS = 60
MATERIAL_STORAGE_BONUS = 45
PROCESSING_CYCLE_SEC = {
    "smelter": 2.2,
    "assembler": 2.8,
    "refinery": 3.2,
    "lab": 3.6,
}
MANUAL_QUEUE_MAX_UNIQUE = 8
REMOVE_REFUND_RATIO = 0.8


@dataclass(frozen=True)
class RecipeSpec:
    id: str
    station: str
    output_material: str
    output_amount: int
    cost: dict[str, int]
    manual_time_sec: float | None


@dataclass(frozen=True)
class ResourceCatalog:
    ore_types: tuple[str, ...]
    material_types: tuple[str, ...]
    resource_ids: tuple[str, ...]
    recipe_by_id: dict[str, RecipeSpec]
    recipe_ids_by_station: dict[str, tuple[str, ...]]


def _load_crafting_data() -> dict | None:
    data_path = Path(__file__).resolve().parents[2] / "frontend" / "src" / "game" / "data" / "craftingData.json"
    if not data_path.exists():
        return None
    try:
        with data_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None


def load_resource_catalog() -> ResourceCatalog:
    raw = _load_crafting_data() or {}

    materials: list[str] = []
    for entry in raw.get("materials", []):
        candidate = str(entry.get("id", "")).strip()
        if candidate and candidate not in materials:
            materials.append(candidate)

    recipe_by_id: dict[str, RecipeSpec] = {}
    recipe_ids_by_station: dict[str, list[str]] = {}
    resources = set(DEFAULT_ORE_TYPES)
    resources.update(materials)

    for entry in raw.get("recipes", []):
        recipe_id = str(entry.get("id", "")).strip()
        if not recipe_id:
            continue
        station = str(entry.get("station", "")).strip() or "manual"
        output = entry.get("output", {})
        output_material = str(output.get("material", "")).strip()
        output_amount = int(output.get("amount", 1) or 1)
        if not output_material or output_amount <= 0:
            continue
        resources.add(output_material)

        cost: dict[str, int] = {}
        for resource, amount in dict(entry.get("cost", {})).items():
            resource_id = str(resource).strip()
            amount_value = int(amount or 0)
            if not resource_id or amount_value <= 0:
                continue
            resources.add(resource_id)
            cost[resource_id] = amount_value

        manual_time_sec_raw = entry.get("manualTimeSec")
        manual_time_sec = float(manual_time_sec_raw) if isinstance(manual_time_sec_raw, (int, float)) else None

        recipe_by_id[recipe_id] = RecipeSpec(
            id=recipe_id,
            station=station,
            output_material=output_material,
            output_amount=output_amount,
            cost=cost,
            manual_time_sec=manual_time_sec,
        )
        recipe_ids_by_station.setdefault(station, []).append(recipe_id)

    return ResourceCatalog(
        ore_types=tuple(DEFAULT_ORE_TYPES),
        material_types=tuple(materials),
        resource_ids=tuple(sorted(resources)),
        recipe_by_id=recipe_by_id,
        recipe_ids_by_station={k: tuple(v) for k, v in recipe_ids_by_station.items()},
    )


def create_new_room_state(room_id: str, *, seed: int | None, width: int, height: int, catalog: ResourceCatalog) -> RoomState:
    world_seed = random.randint(0, 1_000_000_000) if seed is None else int(seed)
    resources = {resource: 0 for resource in catalog.resource_ids}
    for starter in ("iron", "copper", "coal"):
        if starter in resources:
            resources[starter] = 120

    state = RoomState(
        room_id=room_id,
        seed=world_seed,
        tick=0,
        width=width,
        height=height,
        resources=resources,
        storage_buildings=0,
        unlocked_builds=list(DEFAULT_UNLOCKED_BUILDS),
        buildings={},
        players={},
        manual_queues={},
        manual_active={},
        next_entity_id=1,
    )

    hub_id = _next_entity_id(state)
    state.buildings[hub_id] = BuildingState(
        id=hub_id,
        build_id="logistics_hub",
        x=max(0, width // 2),
        y=max(0, height // 2),
        direction="up",
        owner_player_id="server",
        created_tick=0,
    )
    return state


def _next_entity_id(state: RoomState) -> str:
    entity_id = f"ent_{state.next_entity_id}"
    state.next_entity_id += 1
    return entity_id


def _get_oriented_size(build_id: str, direction: str) -> tuple[int, int]:
    width, height = BUILD_FOOTPRINTS.get(build_id, (1, 1))
    if direction in {"left", "right"} and width != height:
        return height, width
    return width, height


def _iter_cells(x: int, y: int, width: int, height: int) -> Iterable[tuple[int, int]]:
    for y_offset in range(height):
        for x_offset in range(width):
            yield x + x_offset, y + y_offset


def _building_cells(building: BuildingState) -> list[tuple[int, int]]:
    width, height = _get_oriented_size(building.build_id, building.direction)
    return list(_iter_cells(building.x, building.y, width, height))


def _find_building_at(state: RoomState, x: int, y: int) -> BuildingState | None:
    for building in state.buildings.values():
        if any(cell_x == x and cell_y == y for cell_x, cell_y in _building_cells(building)):
            return building
    return None


def _recompute_storage_building_count(state: RoomState) -> None:
    state.storage_buildings = sum(1 for building in state.buildings.values() if building.build_id in STORAGE_BUILD_IDS)


def _storage_limits(state: RoomState) -> tuple[int, int]:
    ore_cap = ORE_STORAGE_BASE + ORE_STORAGE_BONUS * max(0, state.storage_buildings)
    material_cap = MATERIAL_STORAGE_BASE + MATERIAL_STORAGE_BONUS * max(0, state.storage_buildings)
    return ore_cap, material_cap


def _is_ore(resource: str, catalog: ResourceCatalog) -> bool:
    return resource in catalog.ore_types


def _capacity_for_resource(state: RoomState, catalog: ResourceCatalog, resource: str) -> int:
    ore_cap, material_cap = _storage_limits(state)
    return ore_cap if _is_ore(resource, catalog) else material_cap


def _clamp_all_resources_to_capacity(state: RoomState, catalog: ResourceCatalog) -> None:
    for resource in list(state.resources.keys()):
        cap = _capacity_for_resource(state, catalog, resource)
        state.resources[resource] = min(max(0, state.resources.get(resource, 0)), cap)


def add_resource(state: RoomState, catalog: ResourceCatalog, resource: str, amount: int) -> int:
    if amount <= 0:
        return 0
    current = max(0, int(state.resources.get(resource, 0)))
    cap = _capacity_for_resource(state, catalog, resource)
    next_value = min(cap, current + amount)
    added = max(0, next_value - current)
    state.resources[resource] = next_value
    return added


def _can_receive_resource(state: RoomState, catalog: ResourceCatalog, resource: str, amount: int) -> bool:
    if amount <= 0:
        return True
    current = max(0, int(state.resources.get(resource, 0)))
    cap = _capacity_for_resource(state, catalog, resource)
    return current + amount <= cap


def _can_afford_cost(state: RoomState, cost: dict[str, int]) -> bool:
    for resource, amount in cost.items():
        if state.resources.get(resource, 0) < amount:
            return False
    return True


def _spend_cost(state: RoomState, cost: dict[str, int]) -> bool:
    if not _can_afford_cost(state, cost):
        return False
    for resource, amount in cost.items():
        state.resources[resource] = max(0, state.resources.get(resource, 0) - amount)
    return True


def _refund_cost(state: RoomState, catalog: ResourceCatalog, cost: dict[str, int], ratio: float) -> int:
    refunded = 0
    for resource, amount in cost.items():
        to_add = int(max(0, amount * ratio))
        refunded += add_resource(state, catalog, resource, to_add)
    return refunded


def _manual_duration_for_recipe(recipe: RecipeSpec) -> float:
    if recipe.manual_time_sec and recipe.manual_time_sec > 0:
        return recipe.manual_time_sec
    complexity = max(1, sum(recipe.cost.values()))
    return 1.2 + min(4.8, complexity * 0.45)


def _find_auto_recipe_for_station(state: RoomState, catalog: ResourceCatalog, station: str) -> RecipeSpec | None:
    for recipe_id in catalog.recipe_ids_by_station.get(station, ()):
        recipe = catalog.recipe_by_id.get(recipe_id)
        if not recipe:
            continue
        if _can_afford_cost(state, recipe.cost) and _can_receive_resource(
            state,
            catalog,
            recipe.output_material,
            recipe.output_amount,
        ):
            return recipe
    return None


def apply_command(
    state: RoomState,
    catalog: ResourceCatalog,
    *,
    player_id: str,
    player_role: str,
    command: object,
) -> CommandResult:
    if isinstance(command, PlaceBuildingCommand):
        return _apply_place_building(state, catalog, player_id=player_id, player_role=player_role, command=command)
    if isinstance(command, RemoveBuildingCommand):
        return _apply_remove_building(state, catalog, player_id=player_id, player_role=player_role, command=command)
    if isinstance(command, SetRecipeCommand):
        return _apply_set_recipe(state, catalog, player_id=player_id, player_role=player_role, command=command)
    if isinstance(command, QueueManualCraftCommand):
        return _apply_queue_manual(state, catalog, player_id=player_id, player_role=player_role, command=command)
    if isinstance(command, ClearManualCraftCommand):
        return _apply_clear_manual(state, player_id=player_id, command=command)
    return CommandResult(accepted=False, reason="unknown_command", suspicious=True)


def _apply_place_building(
    state: RoomState,
    catalog: ResourceCatalog,
    *,
    player_id: str,
    player_role: str,
    command: PlaceBuildingCommand,
) -> CommandResult:
    if player_role == "spectator":
        return CommandResult(accepted=False, reason="spectators_cannot_build")
    if command.build_id not in ALLOWED_BUILD_IDS:
        return CommandResult(accepted=False, reason="unknown_build_id", suspicious=True)
    if command.build_id not in state.unlocked_builds:
        return CommandResult(accepted=False, reason="build_locked")

    width, height = _get_oriented_size(command.build_id, command.direction)
    for cell_x, cell_y in _iter_cells(command.x, command.y, width, height):
        if cell_x < 0 or cell_y < 0 or cell_x >= state.width or cell_y >= state.height:
            return CommandResult(accepted=False, reason="out_of_bounds")
        if _find_building_at(state, cell_x, cell_y) is not None:
            return CommandResult(accepted=False, reason="cell_occupied")

    cost = BUILD_COSTS.get(command.build_id, {})
    if not _spend_cost(state, cost):
        return CommandResult(accepted=False, reason="insufficient_resources")

    build_id = _next_entity_id(state)
    state.buildings[build_id] = BuildingState(
        id=build_id,
        build_id=command.build_id,
        x=command.x,
        y=command.y,
        direction=command.direction,
        owner_player_id=player_id,
        created_tick=state.tick,
    )
    _recompute_storage_building_count(state)
    return CommandResult(accepted=True, state_changed=True)


def _apply_remove_building(
    state: RoomState,
    catalog: ResourceCatalog,
    *,
    player_id: str,
    player_role: str,
    command: RemoveBuildingCommand,
) -> CommandResult:
    building = _find_building_at(state, command.x, command.y)
    if building is None:
        return CommandResult(accepted=False, reason="no_building")
    if building.build_id == "logistics_hub":
        return CommandResult(accepted=False, reason="cannot_remove_hub")
    if player_role != "admin" and building.owner_player_id != player_id:
        return CommandResult(accepted=False, reason="forbidden")

    state.buildings.pop(building.id, None)
    _recompute_storage_building_count(state)
    _clamp_all_resources_to_capacity(state, catalog)

    cost = BUILD_COSTS.get(building.build_id, {})
    _refund_cost(state, catalog, cost, REMOVE_REFUND_RATIO)
    return CommandResult(accepted=True, state_changed=True)


def _apply_set_recipe(
    state: RoomState,
    catalog: ResourceCatalog,
    *,
    player_id: str,
    player_role: str,
    command: SetRecipeCommand,
) -> CommandResult:
    building = state.buildings.get(command.building_id)
    if not building:
        return CommandResult(accepted=False, reason="building_not_found")
    if player_role != "admin" and building.owner_player_id != player_id:
        return CommandResult(accepted=False, reason="forbidden")
    if building.build_id not in PROCESSOR_BUILD_IDS:
        return CommandResult(accepted=False, reason="building_not_processor")

    recipe = catalog.recipe_by_id.get(command.recipe_id)
    if not recipe:
        return CommandResult(accepted=False, reason="recipe_not_found")
    if recipe.station != building.build_id:
        return CommandResult(accepted=False, reason="recipe_station_mismatch")

    building.recipe_id = command.recipe_id
    building.active_recipe_id = None
    building.progress_sec = 0.0
    return CommandResult(accepted=True, state_changed=True)


def _apply_queue_manual(
    state: RoomState,
    catalog: ResourceCatalog,
    *,
    player_id: str,
    player_role: str,
    command: QueueManualCraftCommand,
) -> CommandResult:
    if player_role == "spectator":
        return CommandResult(accepted=False, reason="spectators_cannot_craft")
    recipe = catalog.recipe_by_id.get(command.recipe_id)
    if not recipe:
        return CommandResult(accepted=False, reason="recipe_not_found")
    if recipe.station != "manual":
        return CommandResult(accepted=False, reason="recipe_not_manual")

    queue = state.manual_queues.setdefault(player_id, [])
    for entry in queue:
        if entry.recipe_id == command.recipe_id:
            entry.count += command.count
            return CommandResult(accepted=True, state_changed=True)

    if len(queue) >= MANUAL_QUEUE_MAX_UNIQUE:
        return CommandResult(accepted=False, reason="manual_queue_unique_limit")

    queue.append(ManualQueueEntry(recipe_id=command.recipe_id, count=command.count))
    return CommandResult(accepted=True, state_changed=True)


def _apply_clear_manual(
    state: RoomState,
    *,
    player_id: str,
    command: ClearManualCraftCommand,
) -> CommandResult:
    queue = state.manual_queues.setdefault(player_id, [])
    active = state.manual_active.get(player_id)

    changed = False
    if command.recipe_id is None:
        if queue:
            queue.clear()
            changed = True
        if active is not None:
            state.manual_active[player_id] = None
            changed = True
    else:
        next_queue = [entry for entry in queue if entry.recipe_id != command.recipe_id]
        if len(next_queue) != len(queue):
            state.manual_queues[player_id] = next_queue
            changed = True
        if active and active.recipe_id == command.recipe_id:
            state.manual_active[player_id] = None
            changed = True

    if not changed:
        return CommandResult(accepted=False, reason="manual_queue_no_change")
    return CommandResult(accepted=True, state_changed=True)


def advance_room_tick(state: RoomState, catalog: ResourceCatalog, tick_rate_hz: int) -> bool:
    """
    Server-authoritative simulation step.

    Returns:
      True when state changed during this step.
    """

    changed = False
    state.tick += 1
    dt = 1.0 / max(1, tick_rate_hz)

    changed |= _advance_manual_crafting(state, catalog, dt)
    changed |= _advance_processing_buildings(state, catalog, dt)

    return changed


def _advance_manual_crafting(state: RoomState, catalog: ResourceCatalog, dt: float) -> bool:
    changed = False
    for player_id in list(state.players.keys()):
        queue = state.manual_queues.setdefault(player_id, [])
        active = state.manual_active.get(player_id)

        if active is None and queue:
            recipe = catalog.recipe_by_id.get(queue[0].recipe_id)
            if recipe:
                state.manual_active[player_id] = ManualCraftActiveState(
                    recipe_id=recipe.id,
                    elapsed_sec=0.0,
                    duration_sec=_manual_duration_for_recipe(recipe),
                )
                active = state.manual_active[player_id]
                changed = True

        if active is None:
            continue

        recipe = catalog.recipe_by_id.get(active.recipe_id)
        if recipe is None:
            state.manual_active[player_id] = None
            changed = True
            continue

        active.elapsed_sec += dt
        if active.elapsed_sec < active.duration_sec:
            continue

        craft_succeeded = _can_receive_resource(
            state,
            catalog,
            recipe.output_material,
            recipe.output_amount,
        ) and _spend_cost(state, recipe.cost)
        if craft_succeeded:
            add_resource(state, catalog, recipe.output_material, recipe.output_amount)
            queue = state.manual_queues.setdefault(player_id, [])
            if queue and queue[0].recipe_id == recipe.id:
                if queue[0].count <= 1:
                    queue.pop(0)
                else:
                    queue[0].count -= 1
            else:
                for index, entry in enumerate(queue):
                    if entry.recipe_id == recipe.id:
                        if entry.count <= 1:
                            queue.pop(index)
                        else:
                            entry.count -= 1
                        break

        state.manual_active[player_id] = None
        changed = True

    return changed


def _advance_processing_buildings(state: RoomState, catalog: ResourceCatalog, dt: float) -> bool:
    changed = False
    for building in state.buildings.values():
        if building.build_id not in PROCESSOR_BUILD_IDS:
            continue

        recipe: RecipeSpec | None = None
        if building.recipe_id:
            selected = catalog.recipe_by_id.get(building.recipe_id)
            if selected and selected.station == building.build_id:
                recipe = selected
        if recipe is None:
            recipe = _find_auto_recipe_for_station(state, catalog, building.build_id)

        if recipe is None:
            if building.active_recipe_id is not None or building.progress_sec != 0:
                building.active_recipe_id = None
                building.progress_sec = 0.0
                changed = True
            continue

        building.active_recipe_id = recipe.id
        cycle_sec = PROCESSING_CYCLE_SEC.get(building.build_id, 2.5)

        if not _can_afford_cost(state, recipe.cost) or not _can_receive_resource(
            state,
            catalog,
            recipe.output_material,
            recipe.output_amount,
        ):
            if building.progress_sec != 0:
                building.progress_sec = 0.0
                changed = True
            continue

        building.progress_sec += dt
        while building.progress_sec >= cycle_sec:
            if not _spend_cost(state, recipe.cost):
                building.progress_sec = 0.0
                break
            if add_resource(state, catalog, recipe.output_material, recipe.output_amount) <= 0:
                building.progress_sec = 0.0
                break
            building.progress_sec -= cycle_sec
            changed = True

    return changed


def room_snapshot(state: RoomState, catalog: ResourceCatalog) -> dict:
    ore_cap, material_cap = _storage_limits(state)
    resources = {
        resource: int(state.resources.get(resource, 0))
        for resource in catalog.resource_ids
        if resource in state.resources
    }

    buildings = [building.model_dump(mode="json") for building in state.buildings.values()]
    buildings.sort(key=lambda entry: entry["id"])

    players = [player.model_dump(mode="json") for player in state.players.values()]
    players.sort(key=lambda entry: entry["player_id"])

    manual_queues = {
        player_id: [entry.model_dump(mode="json") for entry in queue]
        for player_id, queue in state.manual_queues.items()
    }
    manual_active = {
        player_id: (active.model_dump(mode="json") if active else None)
        for player_id, active in state.manual_active.items()
    }

    return {
        "version": state.version,
        "room_id": state.room_id,
        "tick": state.tick,
        "seed": state.seed,
        "world": {"width": state.width, "height": state.height},
        "storage": {
            "storage_buildings": state.storage_buildings,
            "ore_per_resource": ore_cap,
            "material_per_resource": material_cap,
        },
        "resources": resources,
        "unlocked_builds": list(state.unlocked_builds),
        "buildings": buildings,
        "players": players,
        "manual_queues": manual_queues,
        "manual_active": manual_active,
    }
