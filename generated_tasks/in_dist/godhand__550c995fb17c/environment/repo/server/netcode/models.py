from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Direction = Literal["up", "right", "down", "left"]
PlayerRole = Literal["player", "spectator", "admin"]


class BuildingState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    build_id: str
    x: int
    y: int
    direction: Direction = "right"
    owner_player_id: str
    recipe_id: str | None = None
    active_recipe_id: str | None = None
    progress_sec: float = 0.0
    created_tick: int = 0


class PlayerState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    player_id: str
    display_name: str
    role: PlayerRole = "player"
    connected: bool = False
    last_seen_ms: int = 0
    joined_tick: int = 0


class ManualQueueEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipe_id: str
    count: int = Field(ge=1, le=100_000)


class ManualCraftActiveState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipe_id: str
    elapsed_sec: float = 0.0
    duration_sec: float = Field(gt=0)


class RoomState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = 1
    room_id: str
    seed: int
    tick: int = 0

    width: int
    height: int

    resources: dict[str, int] = Field(default_factory=dict)
    storage_buildings: int = 0
    unlocked_builds: list[str] = Field(default_factory=list)

    buildings: dict[str, BuildingState] = Field(default_factory=dict)
    players: dict[str, PlayerState] = Field(default_factory=dict)
    manual_queues: dict[str, list[ManualQueueEntry]] = Field(default_factory=dict)
    manual_active: dict[str, ManualCraftActiveState | None] = Field(default_factory=dict)

    next_entity_id: int = 1


class PlaceBuildingCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: Literal["place_building"] = "place_building"
    build_id: str
    x: int
    y: int
    direction: Direction = "right"


class RemoveBuildingCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: Literal["remove_building"] = "remove_building"
    x: int
    y: int


class SetRecipeCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: Literal["set_recipe"] = "set_recipe"
    building_id: str
    recipe_id: str


class QueueManualCraftCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: Literal["queue_manual_craft"] = "queue_manual_craft"
    recipe_id: str
    count: int = Field(default=1, ge=1, le=10_000)


class ClearManualCraftCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: Literal["clear_manual_craft"] = "clear_manual_craft"
    recipe_id: str | None = None


ClientCommand = Annotated[
    PlaceBuildingCommand
    | RemoveBuildingCommand
    | SetRecipeCommand
    | QueueManualCraftCommand
    | ClearManualCraftCommand,
    Field(discriminator="command"),
]


class CommandEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["command"] = "command"
    seq: int = Field(ge=0, le=2_147_483_647)
    data: ClientCommand


class PingEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["ping"] = "ping"
    seq: int = Field(ge=0, le=2_147_483_647)
    client_time_ms: int | None = Field(default=None, ge=0)


ClientEnvelope = Annotated[CommandEnvelope | PingEnvelope, Field(discriminator="kind")]


class CommandResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    accepted: bool
    reason: str | None = None
    state_changed: bool = False
    suspicious: bool = False


class TokenIssueRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    room_id: str = Field(min_length=1, max_length=64)
    player_id: str = Field(min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=80)
    role: PlayerRole = "player"


class TokenIssueResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str
    room_id: str
    player_id: str
    expires_at_unix: int


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: bool = True
    service: str = "netcode"
    active_rooms: int
    active_players: int


class AdminRoomSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    room_id: str
    tick: int
    players_connected: int
    players_total: int
    buildings: int
    updated_at_unix: int
    active_in_memory: bool


class SaveLoadResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: bool
    room_id: str
    message: str
    state: dict[str, Any] | None = None
