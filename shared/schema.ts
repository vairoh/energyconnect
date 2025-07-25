import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  json,
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
  invitedByUserId: true,
});

// Enhanced Posts schema with structured data support
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  hashtag: text("hashtag").notNull(),
  userId: integer("user_id").references(() => users.id),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  type: text("type").notNull().default("general"), // "general", "job", "event"
  structuredData: json("structured_data"), // JSON field for job/event specific data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
});

// Job Post Schema
export const jobPostSchema = z.object({
  jobTitle: z.string().min(3),
  company: z.string().min(2),
  location: z.string().min(2),
  jobType: z.string(),
  experience: z.string(),
  salary: z.string().optional(),
  description: z.string().min(20).max(1000),
  hashtag: z.string().min(1),
});

export const insertJobPostSchema = z.object({
  content: z.string().min(5).max(2000),
  hashtag: z.string().min(1),
  type: z.literal("job"),
  structuredData: jobPostSchema.omit({ hashtag: true }),
  isAnonymous: z.boolean().default(false),
});

// Event Post Schema
export const eventPostSchema = z.object({
  eventName: z.string().min(3),
  eventType: z.string(),
  date: z.string(),
  time: z.string(),
  location: z.string().min(2),
  capacity: z.string().optional(),
  ticketPrice: z.string().optional(),
  description: z.string().min(20).max(1000),
  hashtag: z.string().min(1),
});

export const insertEventPostSchema = z.object({
  content: z.string().min(5).max(2000),
  hashtag: z.string().min(1),
  type: z.literal("event"),
  structuredData: eventPostSchema.omit({ hashtag: true }),
  isAnonymous: z.boolean().default(false),
});

// General Post Schema
export const insertGeneralPostSchema = z.object({
  content: z.string().min(5).max(500),
  hashtag: z.string().min(1),
  type: z.literal("general").default("general"),
  structuredData: z.null().default(null),
  isAnonymous: z.boolean().default(false),
});

// Reactions schema (replacing endorsements)
export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  reaction: text("reaction").notNull(), // "like", "love", "haha", "wow", "sad", "angry"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
  createdAt: true,
});

// Comments schema
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

// Profile Views schema
export const profileViews = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  viewerId: integer("viewer_id")
    .references(() => users.id)
    .notNull(),
  profileUserId: integer("profile_user_id")
    .references(() => users.id)
    .notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});

export const insertProfileViewSchema = createInsertSchema(profileViews).omit({
  id: true,
  viewedAt: true,
});

// Types
export type ProfileView = typeof profileViews.$inferSelect;
export type InsertProfileView = typeof profileViews.$inferInsert;

// Keep endorsements for backward compatibility but mark as deprecated
// Endorsements schema
export const endorsements = pgTable("endorsements", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  hashtag: text("hashtag").notNull(),
  type: text("type").notNull().default("positive"), // "positive" or "negative"
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

export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Endorsement = typeof endorsements.$inferSelect;
export type InsertEndorsement = z.infer<typeof insertEndorsementSchema>;

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;

// Common hashtags
export const COMMON_HASHTAGS = ["job", "event", "gridcode", "question", "news"];
