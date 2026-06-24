# install

Three ways to set up `pantry` locally.

## from source

```
git clone <this repo>
cd pantry
npm ci          # installs only typescript + @types/node
npm run build   # tsc -> dist/
npm test
sudo ln -s "$PWD/dist/main.js" /usr/local/bin/pantry
```

Requires Node 20.16+.

## docker

```
docker build -t pantry .
docker run --rm -v "$PWD/pantry-data:/data" pantry list
```

The image entrypoints to `node /usr/local/lib/pantry/main.js`. /data
is the persistent root (data + config + cache subdirs).

## first run

```
pantry --help
pantry config show
pantry config set default_location pantry
pantry config set expiring_window_days 14
pantry add "Olive Oil" --qty 500ml --where pantry --best-by 2027-01-30
pantry expiring
```
