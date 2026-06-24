# Deployment guide

## Host requirements

| Resource           | Minimum   | Recommended  |
| ------------------ | --------- | ------------ |
| OS                 | Linux     | Debian 12 / RHEL 9 |
| CPU                | 1 vCPU    | 2 vCPU       |
| RAM                | 256 MiB   | 512 MiB      |
| Disk for cache     | 100 MiB   | 1 GiB        |

## Single host with systemd

```bash
sudo useradd --system --no-create-home --home-dir /var/lib/kindling --shell /usr/sbin/nologin kindling
sudo install -d -o kindling -g kindling -m 0750 /var/lib/kindling /var/lib/kindling/data /var/lib/kindling/cache

curl -fL -o /usr/local/bin/kindling \
    https://github.com/kindling-tools/kindling/releases/download/v0.6.0/kindling-linux-amd64
sudo chmod 0755 /usr/local/bin/kindling

sudo install -m 0644 deploy/systemd/kindling.service /etc/systemd/system/kindling.service
sudo systemctl daemon-reload
sudo systemctl enable --now kindling
```

## docker-compose

```bash
git clone https://github.com/kindling-tools/kindling
cd kindling/deploy/compose
docker compose up -d
docker compose logs -f kindling
```
