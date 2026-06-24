# Operations runbook

This runbook covers the operational scenarios that come up most often
on a single-host kindling deployment.

## Healthcheck

`kindling healthcheck` is the canonical liveness probe. Exits 0 when
the data dir is readable; exits 1 otherwise.

Use it in:

- systemd: `WatchdogSec=60`.
- Kubernetes: `livenessProbe.exec.command: [/usr/local/bin/kindling, healthcheck]`.
- docker-compose: see `deploy/compose/docker-compose.yml`.

## Configuration validation

Run `kindling config check` before starting in a new environment.

## Schema migration

The on-disk manifest format is versioned. `kindling migrate` walks
records and rewrites them to the latest version. Idempotent.

## Disaster recovery

The data dir is the only operational state. Snapshot it as a tarball:

```bash
sudo systemctl stop kindling
sudo -u kindling tar -czf /backups/kindling-$(date +%F).tar.gz \
    -C /var/lib/kindling .
sudo systemctl start kindling
```

## Stale lockfile

Symptom: `kindling healthcheck --verbose` reports `stale lockfile`.

Procedure:

```bash
sudo systemctl stop kindling
sudo -u kindling rm /var/lib/kindling/data/.lock
sudo systemctl start kindling
```

## Upgrades

Patch releases (0.6.x -> 0.6.y) are drop-in. Minor releases may
include a manifest migration; the release notes will say so.

## On-call cheat sheet

| Symptom                                  | First action                           |
| ---------------------------------------- | -------------------------------------- |
| Service fails to start                   | `journalctl -u kindling -n 200`        |
| Healthcheck failing                      | `kindling healthcheck --verbose`       |
| Disk filling up                          | `du -sh /var/lib/kindling`             |
