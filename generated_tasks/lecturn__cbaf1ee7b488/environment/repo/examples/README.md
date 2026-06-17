# Sample library

A tiny pre-baked library you can point Lecturn at to see the platform working
without having to import your own course collection.

```
examples/sample-library/
└── Welcome to Lecturn/
    ├── 01_Welcome.mp4         (6s, 720p, 2 MB)
    ├── 01_Welcome.en.vtt      English subtitles for ep. 1
    └── 02_Sync.mp4            (6s, 720p, 2 MB)
```

## Use it

1. **Set the library root** in `.env`:

   ```
   LIBRARY_ROOT=/absolute/path/to/lecturn/examples/sample-library
   ```

2. **Restart the API** so the new env is loaded.

3. **Sign in** to the web UI and click **Sync library** — the scanner picks up
   one course (`Welcome to Lecturn`) with two episodes; the transcoder kicks
   off two HLS jobs that finish in ~3 seconds each on a modern Mac.

4. The episode list shows an **English** subtitle track for episode 1
   (rendered from the `.vtt` sidecar file) and none for episode 2.

## Regenerating the videos

The mp4s here are checked into git so the smoke test "just works" on a fresh
clone. If you want to swap them or rebuild them at a different resolution,
the `regenerate.sh` script in this folder uses ffmpeg's built-in `testsrc2`
source — no external assets required.

```bash
brew install ffmpeg     # only if you don't have it
cd examples
./regenerate.sh
```

The result is deterministic — re-running produces byte-identical files.

## Why this works as a smoke test

- The **scanner** sees a top-level course folder with two numbered .mp4 files
  and one sibling .vtt file → 1 course, 2 episodes, 1 subtitle track.
- The **transcoder** receives two enqueued jobs after sync inserts the
  episode rows. Each job probes the file (720p), picks renditions
  (480p + 720p), runs ffmpeg, and writes a master playlist.
- The **player** loads the master `.m3u8` once each episode flips to
  `transcodeStatus = "ready"` and ABR picks the best variant for your
  bandwidth.

## Replacing with your own content

Real course folders work the same way — drop them as siblings under
`sample-library/` (or point `LIBRARY_ROOT` at your existing collection):

```
my-courses/
├── Advanced TypeScript/
│   ├── 01 Intro/
│   │   ├── 01 Welcome.mp4
│   │   ├── 01 Welcome.en.vtt
│   │   └── 02 Setup.mp4
│   └── 02 Generics/
│       └── 01 Lesson.mp4
└── WebGPU Crash Course/        # flat layout (no chapter folders)
    ├── 01_Why_WebGPU.mp4
    └── 02_Pipelines.mp4
```

Numeric prefixes drive the order. Subtitle files use `<basename>.<lang>.vtt`
or `<basename>.<lang>.srt` (e.g. `01_Welcome.en.vtt`, `01_Welcome.fr.srt`)
— the scanner picks them up automatically and the API converts SRT to VTT
on the fly.
