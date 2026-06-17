import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_idx").on(t.token),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    password: text(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("accounts_provider_account_idx").on(t.providerId, t.accountId),
    index("accounts_user_idx").on(t.userId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid().defaultRandom().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

export const shareRole = pgEnum("share_role", ["viewer", "editor"]);

export const transcodeStatus = pgEnum("transcode_status", [
  "pending",
  "probing",
  "transcoding",
  "ready",
  "failed",
]);

export const libraries = pgTable(
  "libraries",
  {
    id: uuid().defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    sourcePath: text("source_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("libraries_owner_idx").on(t.ownerId)],
);

export const libraryShares = pgTable(
  "library_shares",
  {
    id: uuid().defaultRandom().primaryKey(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shareRole().notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("library_shares_unique_idx").on(t.libraryId, t.userId),
    index("library_shares_user_idx").on(t.userId),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid().defaultRandom().primaryKey(),
    libraryId: uuid("library_id")
      .notNull()
      .references(() => libraries.id, { onDelete: "cascade" }),
    title: text().notNull(),
    slug: text().notNull(),
    sourcePath: text("source_path").notNull(),
    coverImagePath: text("cover_image_path"),
    description: text(),
    episodeCount: integer("episode_count").notNull().default(0),
    totalDurationSec: integer("total_duration_sec").notNull().default(0),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("courses_library_slug_idx").on(t.libraryId, t.slug),
    index("courses_library_idx").on(t.libraryId),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid().defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text().notNull(),
    position: integer().notNull(),
  },
  (t) => [index("chapters_course_idx").on(t.courseId, t.position)],
);

export const episodes = pgTable(
  "episodes",
  {
    id: uuid().defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    title: text().notNull(),
    filePath: text("file_path").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    durationSec: integer("duration_sec").notNull().default(0),
    position: integer().notNull(),
    // Mirrored from BullMQ for cheap reads; queue remains source of truth.
    transcodeStatus: transcodeStatus("transcode_status").notNull().default("pending"),
    transcodeProgress: real("transcode_progress").notNull().default(0),
    transcodeError: text("transcode_error"),
    transcodedAt: timestamp("transcoded_at", { withTimezone: true }),
    hlsManifestPath: text("hls_manifest_path"),
  },
  (t) => [
    index("episodes_course_idx").on(t.courseId, t.position),
    uniqueIndex("episodes_path_idx").on(t.filePath),
    index("episodes_transcode_status_idx").on(t.transcodeStatus),
  ],
);

// Always stored as VTT; filePath stays as the original on-disk path so re-syncs can detect file changes.
export const subtitles = pgTable(
  "subtitles",
  {
    id: uuid().defaultRandom().primaryKey(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    // BCP-47 tag; "und" when unknown.
    language: text().notNull().default("und"),
    label: text().notNull(),
    format: text().notNull(),
    filePath: text("file_path").notNull(),
    isDefault: integer("is_default").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("subtitles_episode_lang_idx").on(t.episodeId, t.language),
    index("subtitles_episode_idx").on(t.episodeId),
  ],
);

export const transcodeRenditions = pgTable(
  "transcode_renditions",
  {
    id: uuid().defaultRandom().primaryKey(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    height: integer().notNull(),
    width: integer().notNull(),
    bitrateKbps: integer("bitrate_kbps").notNull(),
    codec: text().notNull().default("h264"),
    manifestPath: text("manifest_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("transcode_renditions_unique_idx").on(t.episodeId, t.height),
    index("transcode_renditions_episode_idx").on(t.episodeId),
  ],
);

// Mirrors BullMQ so the UI can read job status without hitting Redis.
export const transcodeJobs = pgTable(
  "transcode_jobs",
  {
    id: uuid().defaultRandom().primaryKey(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    queueJobId: text("queue_job_id"),
    status: transcodeStatus().notNull().default("pending"),
    progress: real().notNull().default(0),
    attempts: integer().notNull().default(0),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transcode_jobs_episode_idx").on(t.episodeId),
    index("transcode_jobs_status_idx").on(t.status),
  ],
);

export const episodeThumbnails = pgTable(
  "episode_thumbnails",
  {
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" })
      .primaryKey(),
    spriteImagePath: text("sprite_image_path").notNull(),
    intervalSec: integer("interval_sec").notNull(),
    cols: integer().notNull(),
    rows: integer().notNull(),
    thumbWidth: integer("thumb_width").notNull(),
    thumbHeight: integer("thumb_height").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    atSec: real("at_sec").notNull(),
    label: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookmarks_user_episode_idx").on(t.userId, t.episodeId, t.atSec)],
);

// Continue-watching is computed from `progress` rows; this table holds explicitly queued items only.
export const watchLater = pgTable(
  "watch_later",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("watch_later_user_episode_idx").on(t.userId, t.episodeId),
    index("watch_later_user_position_idx").on(t.userId, t.position),
  ],
);

// Body is markdown from Tiptap. Null atSec means the note is unanchored (applies to the whole episode).
export const notes = pgTable(
  "notes",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    atSec: real("at_sec"),
    body: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notes_user_episode_idx").on(t.userId, t.episodeId, t.atSec),
    index("notes_episode_idx").on(t.episodeId),
  ],
);

export const highlights = pgTable(
  "highlights",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    startSec: real("start_sec").notNull(),
    endSec: real("end_sec").notNull(),
    text: text(),
    color: text().notNull().default("amber"),
    note: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("highlights_user_episode_idx").on(t.userId, t.episodeId, t.startSec)],
);

export const cardState = pgEnum("card_state", [
  "new",
  "learning",
  "review",
  "relearning",
]);

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id").references(() => episodes.id, { onDelete: "set null" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    sourceNoteId: uuid("source_note_id").references(() => notes.id, { onDelete: "set null" }),
    front: text().notNull(),
    back: text().notNull(),
    state: cardState().notNull().default("new"),
    stability: real().notNull().default(0),
    difficulty: real().notNull().default(0),
    reps: integer().notNull().default(0),
    lapses: integer().notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("flashcards_user_due_idx").on(t.userId, t.dueAt),
    index("flashcards_episode_idx").on(t.episodeId),
  ],
);

export const flashcardReviews = pgTable(
  "flashcard_reviews",
  {
    id: uuid().defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer().notNull(),
    elapsedDays: real("elapsed_days").notNull(),
    scheduledDays: real("scheduled_days").notNull(),
    stability: real().notNull(),
    difficulty: real().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("flashcard_reviews_card_idx").on(t.cardId, t.reviewedAt)],
);

// Per-(user, episode) so users sharing a library keep independent watch state.
export const progress = pgTable(
  "progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    positionSec: real("position_sec").notNull().default(0),
    completed: integer().notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.episodeId] })],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  ownedLibraries: many(libraries),
  libraryShares: many(libraryShares),
  progress: many(progress),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const librariesRelations = relations(libraries, ({ one, many }) => ({
  owner: one(users, { fields: [libraries.ownerId], references: [users.id] }),
  courses: many(courses),
  shares: many(libraryShares),
}));

export const librarySharesRelations = relations(libraryShares, ({ one }) => ({
  library: one(libraries, { fields: [libraryShares.libraryId], references: [libraries.id] }),
  user: one(users, { fields: [libraryShares.userId], references: [users.id] }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  library: one(libraries, { fields: [courses.libraryId], references: [libraries.id] }),
  chapters: many(chapters),
  episodes: many(episodes),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  course: one(courses, { fields: [chapters.courseId], references: [courses.id] }),
  episodes: many(episodes),
}));

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  course: one(courses, { fields: [episodes.courseId], references: [courses.id] }),
  chapter: one(chapters, { fields: [episodes.chapterId], references: [chapters.id] }),
  progress: many(progress),
  renditions: many(transcodeRenditions),
  transcodeJobs: many(transcodeJobs),
  subtitles: many(subtitles),
  bookmarks: many(bookmarks),
  notes: many(notes),
  highlights: many(highlights),
  thumbnails: one(episodeThumbnails),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  episode: one(episodes, { fields: [bookmarks.episodeId], references: [episodes.id] }),
}));

export const watchLaterRelations = relations(watchLater, ({ one }) => ({
  user: one(users, { fields: [watchLater.userId], references: [users.id] }),
  episode: one(episodes, { fields: [watchLater.episodeId], references: [episodes.id] }),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
  episode: one(episodes, { fields: [notes.episodeId], references: [episodes.id] }),
  flashcards: many(flashcards),
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
  user: one(users, { fields: [highlights.userId], references: [users.id] }),
  episode: one(episodes, { fields: [highlights.episodeId], references: [episodes.id] }),
}));

export const flashcardsRelations = relations(flashcards, ({ one, many }) => ({
  user: one(users, { fields: [flashcards.userId], references: [users.id] }),
  episode: one(episodes, { fields: [flashcards.episodeId], references: [episodes.id] }),
  course: one(courses, { fields: [flashcards.courseId], references: [courses.id] }),
  sourceNote: one(notes, {
    fields: [flashcards.sourceNoteId],
    references: [notes.id],
  }),
  reviews: many(flashcardReviews),
}));

export const flashcardReviewsRelations = relations(flashcardReviews, ({ one }) => ({
  card: one(flashcards, {
    fields: [flashcardReviews.cardId],
    references: [flashcards.id],
  }),
  user: one(users, { fields: [flashcardReviews.userId], references: [users.id] }),
}));

export const episodeThumbnailsRelations = relations(episodeThumbnails, ({ one }) => ({
  episode: one(episodes, {
    fields: [episodeThumbnails.episodeId],
    references: [episodes.id],
  }),
}));

export const subtitlesRelations = relations(subtitles, ({ one }) => ({
  episode: one(episodes, { fields: [subtitles.episodeId], references: [episodes.id] }),
}));

export const transcodeRenditionsRelations = relations(transcodeRenditions, ({ one }) => ({
  episode: one(episodes, {
    fields: [transcodeRenditions.episodeId],
    references: [episodes.id],
  }),
}));

export const transcodeJobsRelations = relations(transcodeJobs, ({ one }) => ({
  episode: one(episodes, {
    fields: [transcodeJobs.episodeId],
    references: [episodes.id],
  }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, { fields: [progress.userId], references: [users.id] }),
  episode: one(episodes, { fields: [progress.episodeId], references: [episodes.id] }),
}));

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
export type Library = typeof libraries.$inferSelect;
export type LibraryShare = typeof libraryShares.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Progress = typeof progress.$inferSelect;
export type TranscodeRendition = typeof transcodeRenditions.$inferSelect;
export type TranscodeJob = typeof transcodeJobs.$inferSelect;
export type Subtitle = typeof subtitles.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type WatchLaterRow = typeof watchLater.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Highlight = typeof highlights.$inferSelect;
export type Flashcard = typeof flashcards.$inferSelect;
export type FlashcardReview = typeof flashcardReviews.$inferSelect;
export type EpisodeThumbnails = typeof episodeThumbnails.$inferSelect;
export type CardState = "new" | "learning" | "review" | "relearning";
export type TranscodeStatus =
  | "pending"
  | "probing"
  | "transcoding"
  | "ready"
  | "failed";
