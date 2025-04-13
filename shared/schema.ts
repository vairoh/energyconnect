import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Step 1: Define users table first before referencing it
const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  invitedByUserId: integer("invited_by_user_id").references(
    () => usersTable.id,
  ), // ✅ FIXED circular reference
});

// Step 2: Export it
export const users = usersTable;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
});

// Posts schema
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  hashtag: text("hashtag").notNull(),
  userId: integer("user_id").references(() => users.id),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
});

// Endorsements schema
export const endorsements = pgTable("endorsements", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  hashtag: text("hashtag").notNull(),
});

export const insertEndorsementSchema = createInsertSchema(endorsements).omit({
  id: true,
});

// Invites schema
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  invitedByUserId: integer("invited_by_user_id")
    .references(() => users.id)
    .notNull(),
  usedByUserId: integer("used_by_user_id").references(() => users.id),
  usedAt: timestamp("used_at"),
});

export const insertInviteSchema = createInsertSchema(invites).pick({
  code: true,
  invitedByUserId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Endorsement = typeof endorsements.$inferSelect;
export type InsertEndorsement = z.infer<typeof insertEndorsementSchema>;

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;

// Common hashtags
export const COMMON_HASHTAGS = ["job", "event", "gridcode", "question", "news"];
