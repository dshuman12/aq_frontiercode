CREATE TYPE "public"."transcode_status" AS ENUM('pending', 'probing', 'transcoding', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcode_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"queue_job_id" text,
	"status" "transcode_status" DEFAULT 'pending' NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcode_renditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"height" integer NOT NULL,
	"width" integer NOT NULL,
	"bitrate_kbps" integer NOT NULL,
	"codec" text DEFAULT 'h264' NOT NULL,
	"manifest_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "transcode_status" "transcode_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "transcode_progress" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "transcode_error" text;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "transcoded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "hls_manifest_path" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transcode_jobs" ADD CONSTRAINT "transcode_jobs_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transcode_renditions" ADD CONSTRAINT "transcode_renditions_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transcode_jobs_episode_idx" ON "transcode_jobs" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transcode_jobs_status_idx" ON "transcode_jobs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transcode_renditions_unique_idx" ON "transcode_renditions" USING btree ("episode_id","height");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transcode_renditions_episode_idx" ON "transcode_renditions" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "episodes_transcode_status_idx" ON "episodes" USING btree ("transcode_status");