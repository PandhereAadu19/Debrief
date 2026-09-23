import { pgTable, text, timestamp, uuid, boolean, customType } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(3072)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(",").map(Number);
  },
});

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  creatorId: text("creator_id").notNull(),
  title: text("title").notNull().default("Untitled Meeting"),
  transcript: text("transcript"),
  audioUrl: text("audio_url"),
  summary: text("summary"),
  keyDecisions: text("key_decisions"),
  risks: text("risks"),
  openQuestions: text("open_questions"),
  status: text("status").notNull().default("uploading"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const meetingParticipants = pgTable("meeting_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id").notNull().references(() => meetings.id),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  canEdit: boolean("can_edit").notNull().default(false),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
});

export const actionItems = pgTable("action_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id").notNull().references(() => meetings.id),
  task: text("task").notNull(),
  ownerUserId: text("owner_user_id"),
  ownerName: text("owner_name"),
  priority: text("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transcriptChunks = pgTable("transcript_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id").notNull().references(() => meetings.id),
  chunkText: text("chunk_text").notNull(),
  embedding: vector("embedding").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});