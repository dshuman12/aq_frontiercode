# Godhand Production Runbook (Lightweight)

This runbook is scoped to the current project goal:
- 1 director/control-plane server
- up to 3 official game servers
- up to 12 players per game server

## Core assumptions
- Multiplayer state is held in process memory per game server instance.
- Each lobby must stay pinned to one game server process.
- Restarting a game server disconnects players in lobbies hosted there.

## Normal deploy flow
1. Announce a short maintenance window.
2. Run production preflight:
   - `./server/scripts/local/preflight-prod.py server/.env`
3. Backup Mongo:
   - `./server/scripts/local/backup-mongo.sh`
4. Restart control-plane:
   - `docker-compose -f server/docker-compose.yml -f server/docker-compose.override.yml up -d --build api`
5. Restart game servers:
   - `docker-compose -f server/docker-compose.all.yml -f server/docker-compose.all.override.yml up -d --build game_na_west_1 game_na_west_2 game_na_west_3`
6. Verify:
   - `GET /health` returns `status=ok`
   - `GET /ready` returns `status=ready`
   - log in and join one lobby

## Restart/reconnect behavior
- If director restarts:
  - auth and lobby browsing can be briefly unavailable.
  - active game sockets on separate game-server processes may continue until control-plane calls are needed.
- If a game server restarts:
  - clients in those lobbies disconnect and must reconnect/rejoin.
  - unsaved very-recent in-memory runtime state may be lost.

## Operator response: game server restart
1. Confirm the server process is healthy (`/health`, `/ready`).
2. Ask players to rejoin lobby/server.
3. If lobby state looks wrong, restore latest backup:
   - `./server/scripts/local/restore-mongo.sh <backup.archive.gz> --drop`

## Rolling expectations (what this setup does not guarantee)
- No zero-downtime failover for an active lobby.
- No cross-instance realtime state replication.
- No automatic player migration between game servers.

## Quick rollback
1. Restore Mongo from pre-deploy backup.
2. Reboot director and game servers to last known-good image/tag.
3. Validate `/ready`, then run smoke test (login, lobby join, place object).
