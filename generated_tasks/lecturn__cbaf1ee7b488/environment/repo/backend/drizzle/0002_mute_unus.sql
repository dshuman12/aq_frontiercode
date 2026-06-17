CREATE TABLE IF NOT EXISTS "subtitles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"language" text DEFAULT 'und' NOT NULL,
	"label" text NOT NULL,
	"format" text NOT NULL,
	"file_path" text NOT NULL,
	"is_default" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subtitles" ADD CONSTRAINT "subtitles_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subtitles_episode_lang_idx" ON "subtitles" USING btree ("episode_id","language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subtitles_episode_idx" ON "subtitles" USING btree ("episode_id");