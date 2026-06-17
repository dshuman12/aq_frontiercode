"use client";

import {
  MediaPlayer,
  type MediaPlayerInstance,
  MediaProvider,
  Poster,
  Track,
  type MediaTimeUpdateEventDetail,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { hlsUrl, subtitleUrl } from "~/lib/api-client";
import type { SubtitleTrack, TranscodeStatus } from "~/features/courses/types";
import { playerApi } from "../api";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

export interface PlayerHandle {
  seek: (atSec: number) => void;
}

interface PlayerProps {
  episodeId: string;
  title: string;
  startAtSec: number;
  transcodeStatus: TranscodeStatus;
  transcodeProgress: number;
  subtitles: SubtitleTrack[];
  // Fires every Vidstack tick (untrottled); backend heartbeats are throttled separately.
  onCurrentTime?: (sec: number) => void;
}

const HEARTBEAT_MS = 5_000;

export const Player = forwardRef<PlayerHandle, PlayerProps>(function Player(
  {
    episodeId,
    title,
    startAtSec,
    transcodeStatus,
    transcodeProgress,
    subtitles,
    onCurrentTime,
  }: PlayerProps,
  ref,
) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const lastSent = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      seek(atSec) {
        const p = playerRef.current;
        if (p) p.currentTime = Math.max(0, atSec);
      },
    }),
    [],
  );

  const onTimeUpdate = useCallback(
    (detail: MediaTimeUpdateEventDetail) => {
      onCurrentTime?.(detail.currentTime);
      const now = performance.now();
      if (now - lastSent.current < HEARTBEAT_MS) return;
      lastSent.current = now;
      void playerApi.saveProgress(episodeId, detail.currentTime);
    },
    [episodeId, onCurrentTime],
  );

  const onEnded = useCallback(() => {
    void playerApi.saveProgress(episodeId, 0, true);
  }, [episodeId]);

  if (transcodeStatus !== "ready" && transcodeStatus !== "failed") {
    return <TranscodeOverlay status={transcodeStatus} progress={transcodeProgress} />;
  }

  if (transcodeStatus === "failed") {
    return <TranscodeFailed />;
  }

  return (
    <MediaPlayer
      ref={playerRef}
      title={title}
      src={hlsUrl(episodeId)}
      currentTime={startAtSec}
      onTimeUpdate={onTimeUpdate}
      onEnded={onEnded}
      crossOrigin
      playsInline
      className="w-full aspect-video rounded-card overflow-hidden bg-black"
    >
      <MediaProvider>
        <Poster className="vds-poster" />
        {subtitles.map((sub) => (
          <Track
            key={sub.language}
            kind="subtitles"
            src={subtitleUrl(episodeId, sub.language)}
            language={sub.language === "und" ? undefined : sub.language}
            label={sub.label}
            default={sub.isDefault}
          />
        ))}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
});

function TranscodeOverlay({
  status,
  progress,
}: {
  status: TranscodeStatus;
  progress: number;
}) {
  const pct = Math.round(progress * 100);
  const label =
    status === "pending"
      ? "Queued for transcoding"
      : status === "probing"
        ? "Inspecting source video"
        : `Transcoding · ${pct}%`;

  return (
    <div className="w-full aspect-video rounded-card overflow-hidden bg-black/95 grid place-items-center text-white">
      <div className="space-y-4 text-center max-w-md px-6">
        <Loader2 className="mx-auto size-7 animate-spin text-amber-accent" />
        <h3 className="font-display text-xl font-semibold">{label}</h3>
        <p className="text-sm text-white/70">
          We're producing adaptive 480p / 720p / 1080p streams so playback works
          well over slow connections. This runs once per episode — keep the tab
          open and we'll auto-resume when ready.
        </p>
        {status === "transcoding" && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full bg-amber-accent transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TranscodeFailed() {
  return (
    <div className="w-full aspect-video rounded-card overflow-hidden bg-black/95 grid place-items-center text-white">
      <div className="space-y-3 text-center max-w-md px-6">
        <AlertTriangle className="mx-auto size-7 text-red-400" />
        <h3 className="font-display text-xl font-semibold">Transcoding failed</h3>
        <p className="text-sm text-white/70">
          The episode couldn't be transcoded — the source file may be corrupt or
          use an unsupported codec. Try removing it from the folder and
          re-syncing.
        </p>
      </div>
    </div>
  );
}
