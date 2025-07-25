import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

export interface IStorage {
  // User operations
  getUser(id: number): Promise<schema.User | undefined>;
  getUserByUsername(username: string): Promise<schema.User | undefined>;
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  createUser(user: schema.InsertUser): Promise<schema.User>;

  // Post operations
  createPost(post: schema.InsertPost): Promise<schema.Post>;
  getPosts(limit?: number): Promise<schema.Post[]>;
  getPostsByHashtag(hashtag: string, limit?: number): Promise<schema.Post[]>;
  getPostById(id: number): Promise<schema.Post | undefined>;
  getPostsByUserId(userId: number): Promise<schema.Post[]>;
  updatePost(id: number, content: string): Promise<schema.Post>;
  deletePost(id: number): Promise<void>;

  // Endorsement operations
  createEndorsement(endorsement: schema.InsertEndorsement): Promise<schema.Endorsement>;
  getEndorsementsByPostId(postId: number): Promise<schema.Endorsement[]>;
  getEndorsementsByUserId(userId: number): Promise<schema.Endorsement[]>;
  updateEndorsementType(endorsementId: number, type: string): Promise<void>;
  getEndorsementByUserAndPost(
    userId: number,
    postId: number,
    hashtag: string,
  ): Promise<schema.Endorsement | undefined>;
  getEndorsementCountsByUser(
    userId: number,
  ): Promise<{ hashtag: string; count: number }[]>;
  getTrendingHashtags(
    limit: number,
  ): Promise<{ hashtag: string; count: number }[]>;
  getTopEndorsedHashtags(
    limit: number,
  ): Promise<{ hashtag: string; count: number }[]>;
  getAllEndorsements(): Promise<schema.Endorsement[]>;

  // Comment operations
  createComment(comment: schema.InsertComment): Promise<schema.Comment>;
  getCommentsByPostId(postId: number): Promise<schema.Comment[]>;

  // Invite operations
  createInvite(invite: schema.InsertInvite): Promise<schema.Invite>;
  getInviteByCode(code: string): Promise<schema.Invite | undefined>;
  useInvite(code: string, usedByUserId: number): Promise<void>;

  // Seeding
  seedInitialData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, schema.User>;
  private posts: Map<number, schema.Post>;
  private endorsements: Map<number, schema.Endorsement>;
  private comments: Map<number, schema.Comment>;
  private invites: Map<string, schema.Invite>;
  private userIdCounter: number;
  private postIdCounter: number;
  private endorsementIdCounter: number;
  private commentIdCounter: number;
  private inviteIdCounter: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.endorsements = new Map();
    this.comments = new Map();
    this.invites = new Map();
    this.userIdCounter = 1;
    this.postIdCounter = 1;
    this.endorsementIdCounter = 1;
    this.commentIdCounter = 1;
    this.inviteIdCounter = 1;

    this.createTestUser();
  }

  private async createTestUser() {
    const existingUser = await this.getUserByEmail("test@example.com");
    if (!existingUser) {
      const testUser: schema.User = {
        id: this.userIdCounter++,
        username: "testuser",
        password: "password", // This will be hashed in a real scenario
        fullName: "Test User",
        email: "test@example.com",
        invitedByUserId: null,
      };
      this.users.set(testUser.id, testUser);
      console.log("Created test user for development access");

      const now = new Date();
      const samplePost: schema.Post = {
        id: this.postIdCounter++,
        content:
          "This is a sample post for the energy community. Looking forward to connecting with fellow professionals!",
        hashtag: "#gridcode",
        userId: testUser.id,
        isAnonymous: false,
        createdAt: now,
        updatedAt: now,
      };
      this.posts.set(samplePost.id, samplePost);
      console.log("Created sample post");
    }
  }

  async getTopEndorsedHashtags(
    limit: number,
  ): Promise<{ hashtag: string; count: number }[]> {
    const hashtagCounts = new Map<string, number>();
    for (const endorsement of this.endorsements.values()) {
      const count = hashtagCounts.get(endorsement.hashtag) || 0;
      hashtagCounts.set(endorsement.hashtag, count + 1);
    }
    return Array.from(hashtagCounts.entries())
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getAllEndorsements(): Promise<schema.Endorsement[]> {
    return Array.from(this.endorsements.values());
  }

  // User operations
  async getUser(id: number): Promise<schema.User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: schema.InsertUser): Promise<schema.User> {
    const id = this.userIdCounter++;
    const user: schema.User = { ...insertUser, id, invitedByUserId: null };
    this.users.set(id, user);
    return user;
  }

  // Post operations
  async createPost(insertPost: schema.InsertPost): Promise<schema.Post> {
    const id = this.postIdCounter++;
    const now = new Date();
    const post: schema.Post = {
      ...insertPost,
      id,
      createdAt: now,
      updatedAt: now,
      userId: insertPost.userId ?? null,
      isAnonymous: insertPost.isAnonymous ?? false,
    };
    this.posts.set(id, post);
    return post;
  }

  async getPosts(limit?: number): Promise<schema.Post[]> {
    const allPosts = Array.from(this.posts.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return limit ? allPosts.slice(0, limit) : allPosts;
  }

  async getPostsByHashtag(hashtag: string, limit?: number): Promise<schema.Post[]> {
    const filteredPosts = Array.from(this.posts.values())
      .filter((post) => post.hashtag === hashtag)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return limit ? filteredPosts.slice(0, limit) : filteredPosts;
  }

  async getPostById(id: number): Promise<schema.Post | undefined> {
    return this.posts.get(id);
  }

  async getPostsByUserId(userId: number): Promise<schema.Post[]> {
    return Array.from(this.posts.values())
      .filter((post) => post.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePost(id: number, content: string): Promise<schema.Post> {
    const post = this.posts.get(id);
    if (!post) {
      throw new Error(`Post with id ${id} not found`);
    }
    const updatedPost = { ...post, content, updatedAt: new Date() };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<void> {
    this.posts.delete(id);
  }

  // Endorsement operations
  async createEndorsement(
    insertEndorsement: schema.InsertEndorsement,
  ): Promise<schema.Endorsement> {
    const id = this.endorsementIdCounter++;
    const endorsement: schema.Endorsement = { 
      ...insertEndorsement, 
      id,
      type: insertEndorsement.type || "positive"
    };
    this.endorsements.set(id, endorsement);
    return endorsement;
  }

  async getEndorsementsByPostId(postId: number): Promise<schema.Endorsement[]> {
    return Array.from(this.endorsements.values()).filter(
      (endorsement) => endorsement.postId === postId,
    );
  }

  async getEndorsementsByUserId(userId: number): Promise<schema.Endorsement[]> {
    return Array.from(this.endorsements.values()).filter(
      (endorsement) => endorsement.userId === userId,
    );
  }

  async updateEndorsementType(endorsementId: number, type: string): Promise<void> {
    const endorsement = this.endorsements.get(endorsementId);
    if (endorsement) {
      this.endorsements.set(endorsementId, { ...endorsement, type });
    }
  }

  async getEndorsementByUserAndPost(
    userId: number,
    postId: number,
    hashtag: string,
  ): Promise<schema.Endorsement | undefined> {
    return Array.from(this.endorsements.values()).find(
      (e) =>
        e.userId === userId && e.postId === postId && e.hashtag === hashtag,
    );
  }

  async getEndorsementCountsByUser(
    userId: number,
  ): Promise<{ hashtag: string; count: number }[]> {
    const userPosts = await this.getPostsByUserId(userId);
    const hashtagCounts = new Map<string, number>();
    for (const post of userPosts) {
      const postEndorsements = await this.getEndorsementsByPostId(post.id);
      for (const endorsement of postEndorsements) {
        const count = hashtagCounts.get(endorsement.hashtag) || 0;
        hashtagCounts.set(endorsement.hashtag, count + 1);
      }
    }
    return Array.from(hashtagCounts.entries())
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getTrendingHashtags(
    limit: number,
  ): Promise<{ hashtag: string; count: number }[]> {
    const hashtagCounts = new Map<string, number>();
    for (const post of this.posts.values()) {
      const count = hashtagCounts.get(post.hashtag) || 0;
      hashtagCounts.set(post.hashtag, count + 1);
    }
    return Array.from(hashtagCounts.entries())
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getAllEndorsements(): Promise<schema.Endorsement[]> {
    return Array.from(this.endorsements.values());
  }

  // Comment operations
  async createComment(insertComment: schema.InsertComment): Promise<schema.Comment> {
    const id = this.commentIdCounter++;
    const now = new Date();
    const comment: schema.Comment = {
      id,
      postId: insertComment.postId,
      userId: insertComment.userId,
      content: insertComment.content,
      createdAt: now,
    };
    this.comments.set(id, comment);
    return comment;
  }

  async getCommentsByPostId(postId: number): Promise<schema.Comment[]> {
    return Array.from(this.comments.values())
      .filter((comment) => comment.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Invite operations
  async createInvite(invite: schema.InsertInvite): Promise<schema.Invite> {
    const newInvite: schema.Invite = {
      ...invite,
      id: this.inviteIdCounter++,
      usedByUserId: null,
      usedAt: null
    };
    this.invites.set(invite.code, newInvite);
    return newInvite;
  }

  async getInviteByCode(code: string): Promise<schema.Invite | undefined> {
    return this.invites.get(code);
  }

  async useInvite(code: string, usedByUserId: number): Promise<void> {
    const invite = this.invites.get(code);
    if (invite) {
      invite.usedByUserId = usedByUserId;
      invite.usedAt = new Date();
    }
  }

  async seedInitialData(): Promise<void> {
    // Seed test user first, so we can associate invites with them
    const existingUser = await this.getUserByEmail("test@example.com");
    let testUser = existingUser;

    if (!existingUser) {
      console.log("Creating test user...");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("password", salt);

      [testUser] = await db.insert(schema.users).values({
        username: "testuser",
        password: hashedPassword,
        fullName: "Test User",
        email: "test@example.com",
      }).returning();
      
      console.log("Created test user for development access");
      
      // Seed a sample post for the test user
      await db.insert(schema.posts).values({
        content: "This is a sample post from the test user. Welcome to the platform!",
        hashtag: "#gridcode",
        userId: testUser.id,
        isAnonymous: false,
      });
      console.log("Created sample post");
    }

    // Seed initial invite codes, ensuring they are linked to the test user
    const existingInvites = await db.query.invites.findMany({ limit: 1 });
    if (existingInvites.length === 0 && testUser) {
      console.log("Seeding initial invite codes...");
      await db.insert(schema.invites).values([
        { code: "ENERGY123", invitedByUserId: testUser.id },
        { code: "GRID456", invitedByUserId: testUser.id },
      ]);
    }
  }
}

class DbStorage implements IStorage {
  async getAllEndorsements(): Promise<schema.Endorsement[]> {
    return await db.query.endorsements.findMany();
  }
  async getTopEndorsedHashtags(limit: number): Promise<{ hashtag: string; count: number; }[]> {
    const result = await db
      .select({
        hashtag: schema.endorsements.hashtag,
        count: sql<number>`count(${schema.endorsements.id})`,
      })
      .from(schema.endorsements)
      .groupBy(schema.endorsements.hashtag)
      .orderBy(desc(sql<number>`count`))
      .limit(limit);
    return result;
  }
  async getTrendingHashtags(limit: number): Promise<{ hashtag: string; count: number; }[]> {
    // For now, trending is the same as top endorsed
    return this.getTopEndorsedHashtags(limit);
  }
  async getEndorsementCountsByUser(userId: number): Promise<{ hashtag: string; count: number; }[]> {
    const result = await db
      .select({
        hashtag: schema.endorsements.hashtag,
        count: sql<number>`count(${schema.endorsements.id})`,
      })
      .from(schema.endorsements)
      .where(eq(schema.endorsements.userId, userId))
      .groupBy(schema.endorsements.hashtag)
      .orderBy(desc(sql<number>`count`));
    return result;
  }
  async getEndorsementByUserAndPost(userId: number, postId: number, hashtag: string): Promise<schema.Endorsement | undefined> {
    return await db.query.endorsements.findFirst({
      where: (endorsements, { and, eq }) => and(
        eq(endorsements.userId, userId),
        eq(endorsements.postId, postId),
        eq(endorsements.hashtag, hashtag)
      ),
    });
  }
  async getEndorsementsByUserId(userId: number): Promise<schema.Endorsement[]> {
    return await db.query.endorsements.findMany({
      where: (endorsements, { eq }) => eq(endorsements.userId, userId),
    });
  }
  async getEndorsementsByPostId(postId: number): Promise<schema.Endorsement[]> {
    return await db.query.endorsements.findMany({
      where: (endorsements, { eq }) => eq(endorsements.postId, postId),
    });
  }
  async createEndorsement(endorsement: schema.InsertEndorsement): Promise<schema.Endorsement> {
    const newEndorsement = await db.insert(schema.endorsements).values(endorsement).returning();
    return newEndorsement[0];
  }

  async updateEndorsementType(endorsementId: number, type: string): Promise<void> {
    await db.update(schema.endorsements)
      .set({ type })
      .where(eq(schema.endorsements.id, endorsementId));
  }
  async getPostsByUserId(userId: number): Promise<schema.Post[]> {
    return await db.query.posts.findMany({
      where: (posts, { eq }) => eq(posts.userId, userId),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });
  }
  async getPostById(id: number): Promise<schema.Post | undefined> {
    return await db.query.posts.findFirst({
      where: (posts, { eq }) => eq(posts.id, id),
    });
  }
  async getPostsByHashtag(hashtag: string, limit?: number | undefined): Promise<schema.Post[]> {
    return await db.query.posts.findMany({
      where: (posts, { eq }) => eq(posts.hashtag, hashtag),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      limit: limit,
    });
  }
  async getPosts(limit?: number | undefined): Promise<schema.Post[]> {
    return await db.query.posts.findMany({
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      limit: limit,
    });
  }
  async createPost(post: schema.InsertPost): Promise<schema.Post> {
    const newPosts = await db.insert(schema.posts).values(post).returning();
    return newPosts[0];
  }
  async updatePost(id: number, content: string): Promise<schema.Post> {
    const updatedPost = await db
      .update(schema.posts)
      .set({ content, updatedAt: new Date() })
      .where(eq(schema.posts.id, id))
      .returning();
    return updatedPost[0];
  }
  async deletePost(id: number): Promise<void> {
    await db.delete(schema.posts).where(eq(schema.posts.id, id));
  }
  async createUser(user: schema.InsertUser): Promise<schema.User> {
    const newUser = await db.insert(schema.users).values(user).returning();
    return newUser[0];
  }
  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    return await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });
  }
  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    return await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username),
    });
  }
  async getUser(id: number): Promise<schema.User | undefined> {
    return await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }
  async createInvite(invite: schema.InsertInvite): Promise<schema.Invite> {
    const newInvite = await db.insert(schema.invites).values(invite).returning();
    return newInvite[0];
  }

  async getInviteByCode(code: string): Promise<schema.Invite | undefined> {
    const invite = await db.query.invites.findFirst({
      where: (invites, { eq }) => eq(invites.code, code),
    });
    return invite;
  }

  async useInvite(code: string, usedByUserId: number): Promise<void> {
    await db
      .update(schema.invites)
      .set({ usedByUserId, usedAt: new Date() })
      .where(eq(schema.invites.code, code));
  }

  // Comment operations
  async createComment(insertComment: schema.InsertComment): Promise<schema.Comment> {
    const result = await db.insert(schema.comments).values(insertComment).returning();
    return result[0];
  }

  async getCommentsByPostId(postId: number): Promise<schema.Comment[]> {
    return await db.query.comments.findMany({
      where: (comments, { eq }) => eq(comments.postId, postId),
      orderBy: (comments, { asc }) => [asc(comments.createdAt)],
    });
  }

  async seedInitialData(): Promise<void> {
    await db.transaction(async (tx) => {
      // Seed test user first
      let testUser = await tx.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, "test@example.com"),
      });

      if (!testUser) {
        console.log("Creating test user...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("password", salt);

        const insertedUsers = await tx.insert(schema.users).values({
          username: "testuser",
          password: hashedPassword,
          fullName: "Test User",
          email: "test@example.com",
        }).returning();
        testUser = insertedUsers[0];
        console.log("Created test user for development access");
        
        await tx.insert(schema.posts).values({
          content: "This is a sample post from the test user. Welcome to the platform!",
          hashtag: "#gridcode",
          userId: testUser.id,
          isAnonymous: false,
        });
        console.log("Created sample post");
      }

      // Seed initial invite codes
      const existingInvites = await tx.query.invites.findMany({ limit: 1 });
      if (existingInvites.length === 0 && testUser) {
        console.log("Seeding initial invite codes...");
        await tx.insert(schema.invites).values([
          { code: "ENERGY123", invitedByUserId: testUser.id },
          { code: "GRID456", invitedByUserId: testUser.id },
        ]);
      }
    });
  }
}

// Use the database-backed storage for development and production,
// and the in-memory storage only for tests.
export const storage: IStorage =
  process.env.NODE_ENV === "test"
    ? new MemStorage()
    : new DbStorage();
