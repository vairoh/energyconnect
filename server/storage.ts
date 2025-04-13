import {
  users,
  posts,
  endorsements,
  User,
  InsertUser,
  Post,
  InsertPost,
  Endorsement,
  InsertEndorsement,
  Invite,
  InsertInvite,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPosts(limit?: number): Promise<Post[]>;
  getPostsByHashtag(hashtag: string, limit?: number): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostsByUserId(userId: number): Promise<Post[]>;

  // Endorsement operations
  createEndorsement(endorsement: InsertEndorsement): Promise<Endorsement>;
  getEndorsementsByPostId(postId: number): Promise<Endorsement[]>;
  getEndorsementsByUserId(userId: number): Promise<Endorsement[]>;
  getEndorsementByUserAndPost(
    userId: number,
    postId: number,
    hashtag: string,
  ): Promise<Endorsement | undefined>;
  getEndorsementCountsByUser(
    userId: number,
  ): Promise<{ hashtag: string; count: number }[]>;
  getTrendingHashtags(
    limit: number,
  ): Promise<{ hashtag: string; count: number }[]>;
  getTopEndorsedHashtags(
    limit: number,
  ): Promise<{ hashtag: string; count: number }[]>;

  // Invite operations
  createInvite(invite: InsertInvite): Promise<Invite>;
  getInviteByCode(code: string): Promise<Invite | undefined>;
  useInvite(code: string, usedByUserId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private endorsements: Map<number, Endorsement>;
  private invites: Map<string, Invite>;
  private userIdCounter: number;
  private postIdCounter: number;
  private endorsementIdCounter: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.endorsements = new Map();
    this.invites = new Map();
    this.userIdCounter = 1;
    this.postIdCounter = 1;
    this.endorsementIdCounter = 1;

    this.createTestUser();
  }

  private async createTestUser() {
    const existingUser = await this.getUserByEmail("test@example.com");
    if (!existingUser) {
      const testUser: User = {
        id: this.userIdCounter++,
        username: "testuser",
        fullName: "Test User",
        email: "test@example.com",
        password:
          "$2a$10$xPPT9HzDR.hJYo1rZJ5Nku9Q6q9FGCNEbAUGKfDGy5ZMg0bJ6gXEu",
      };
      this.users.set(testUser.id, testUser);
      console.log("Created test user for development access");

      const now = new Date();
      const samplePost: Post = {
        id: this.postIdCounter++,
        content:
          "This is a sample post for the energy community. Looking forward to connecting with fellow professionals!",
        hashtag: "#gridcode",
        userId: testUser.id,
        isAnonymous: false,
        createdAt: now,
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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Post operations
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postIdCounter++;
    const now = new Date();
    const post: Post = {
      ...insertPost,
      id,
      createdAt: now,
      userId: insertPost.userId ?? null,
      isAnonymous: insertPost.isAnonymous ?? false,
    };
    this.posts.set(id, post);
    return post;
  }

  async getPosts(limit?: number): Promise<Post[]> {
    const allPosts = Array.from(this.posts.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return limit ? allPosts.slice(0, limit) : allPosts;
  }

  async getPostsByHashtag(hashtag: string, limit?: number): Promise<Post[]> {
    const filteredPosts = Array.from(this.posts.values())
      .filter((post) => post.hashtag === hashtag)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return limit ? filteredPosts.slice(0, limit) : filteredPosts;
  }

  async getPostById(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getPostsByUserId(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter((post) => post.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Endorsement operations
  async createEndorsement(
    insertEndorsement: InsertEndorsement,
  ): Promise<Endorsement> {
    const id = this.endorsementIdCounter++;
    const endorsement: Endorsement = { ...insertEndorsement, id };
    this.endorsements.set(id, endorsement);
    return endorsement;
  }

  async getEndorsementsByPostId(postId: number): Promise<Endorsement[]> {
    return Array.from(this.endorsements.values()).filter(
      (endorsement) => endorsement.postId === postId,
    );
  }

  async getEndorsementsByUserId(userId: number): Promise<Endorsement[]> {
    return Array.from(this.endorsements.values()).filter(
      (endorsement) => endorsement.userId === userId,
    );
  }

  async getEndorsementByUserAndPost(
    userId: number,
    postId: number,
    hashtag: string,
  ): Promise<Endorsement | undefined> {
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

  // Invite operations
  async createInvite(invite: InsertInvite): Promise<Invite> {
    const newInvite: Invite = { ...invite };
    this.invites.set(invite.code, newInvite);
    return newInvite;
  }

  async getInviteByCode(code: string): Promise<Invite | undefined> {
    return this.invites.get(code);
  }

  async useInvite(code: string, usedByUserId: number): Promise<void> {
    const invite = this.invites.get(code);
    if (invite) {
      invite.usedByUserId = usedByUserId;
      invite.usedAt = new Date();
    }
  }
}

export const storage = new MemStorage();
