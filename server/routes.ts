import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertPostSchema,
  insertEndorsementSchema,
  insertReactionSchema,
  insertCommentSchema,
  COMMON_HASHTAGS,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcryptjs";
import expressSession from "express-session";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(expressSession);

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS setup for development
  app.use(
    cors({
      origin: true, // Allow all origins in development
      credentials: true, // Allow cookies to be sent
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Session setup
  app.use(
    expressSession({
      name: 'connect.sid', // Explicit session name
      cookie: { 
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        secure: false, // Set to false for development (HTTP)
        sameSite: 'lax', // Allow cross-site requests
        domain: undefined, // Don't set domain for localhost
        path: '/' // Explicit path
      },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "energy-pros-secret-key-for-development",
      rolling: true, // Reset expiration on each request
    }),
  );

  // Debug middleware to log session info
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`Session ID: ${req.sessionID}, User ID: ${req.session.userId}, Path: ${req.path}`);
    }
    next();
  });

  // Check auth middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session.userId) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }

      const existingUsername = await storage.getUserByUsername(
        userData.username,
      );
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Get inviter user ID from invite code
      let inviterId: number | null = null;
      if (req.body.inviteCode) {
        const invite = await storage.getInviteByCode(req.body.inviteCode);
        if (invite && !invite.usedAt) {
          inviterId = invite.invitedByUserId;
        } else {
          return res.status(400).json({ message: "Invalid or used invite code." });
        }
      }

      // Save user with hashed password
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        invitedByUserId: inviterId,
      });

      // Mark invite code as used
      if (req.body.inviteCode) {
        await storage.useInvite(req.body.inviteCode, newUser.id);
      }

      // Don't return password in response
      const { password, ...userWithoutPassword } = newUser;

      req.session.userId = newUser.id;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res
        .status(500)
        .json({ message: "Server error during registration" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;

      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;

      return res.json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Server error during login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't return password
      const { password, ...userWithoutPassword } = user;

      return res.json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Post routes
  app.post("/api/posts", isAuthenticated, async (req, res) => {
    try {
      const postData = insertPostSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });

      // Ensure hashtag is properly formatted
      if (!postData.hashtag.startsWith("#")) {
        postData.hashtag = `#${postData.hashtag}`;
      }

      const newPost = await storage.createPost(postData);
      return res.status(201).json(newPost);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Error creating post" });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      const hashtag = req.query.hashtag as string | undefined;
      const posts = hashtag
        ? await storage.getPostsByHashtag(hashtag)
        : await storage.getPosts();

      const enhancedPosts = await Promise.all(
        posts.map(async (post) => {
                  const endorsements = await storage.getEndorsementsByPostId(post.id);
        
        // Group reactions by type - map old endorsement types to new reaction types
        const reactionCounts = endorsements.reduce((acc, endorsement) => {
          // Map old endorsement types to new reaction types
          let reactionType = endorsement.type || "like";
          if (reactionType === "positive") reactionType = "like";
          if (reactionType === "negative") reactionType = "angry";
          
          acc[reactionType] = (acc[reactionType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const currentUserEndorsement = req.session.userId
          ? await storage.getEndorsementByUserAndPost(
              req.session.userId,
              post.id,
              post.hashtag
            )
          : null;

        return {
          ...post,
          endorsementCount: reactionCounts.like || 0, // Keep for backward compatibility
          positiveCount: reactionCounts.like || 0,
          negativeCount: reactionCounts.angry || 0,
          reactions: reactionCounts,
          currentUserReaction: currentUserEndorsement?.type === "positive" ? "like" : 
                               currentUserEndorsement?.type === "negative" ? "angry" :
                               currentUserEndorsement?.type || null,
          currentUserEndorsed: currentUserEndorsement?.type === "positive" || currentUserEndorsement?.type === "like",
          currentUserDisliked: currentUserEndorsement?.type === "negative" || currentUserEndorsement?.type === "angry",
        };
        })
      );

      return res.json(enhancedPosts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      return res.status(500).json({ message: "Error fetching posts" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const endorsements = await storage.getEndorsementsByPostId(post.id);
      const positiveEndorsements = endorsements.filter(e => e.type === "positive");
      const negativeEndorsements = endorsements.filter(e => e.type === "negative");

      let user = null;
      if (post.userId && !post.isAnonymous) {
        const userRecord = await storage.getUser(post.userId);
        if (userRecord) {
          const { password, ...userWithoutPassword } = userRecord;
          user = userWithoutPassword;
        }
      }

      const currentUserEndorsement = req.session.userId
        ? await storage.getEndorsementByUserAndPost(
            req.session.userId as number,
            post.id,
            post.hashtag,
          )
        : null;

      return res.json({
        ...post,
        user,
        endorsementCount: positiveEndorsements.length, // Keep for backward compatibility
        positiveCount: positiveEndorsements.length,
        negativeCount: negativeEndorsements.length,
        currentUserEndorsed: currentUserEndorsement?.type === "positive" || false,
        currentUserDisliked: currentUserEndorsement?.type === "negative" || false,
      });
    } catch (error) {
      console.error(`Failed to fetch post with id ${req.params.id}:`, error);
      return res.status(500).json({ message: "Error fetching post" });
    }
  });

  app.put("/api/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.userId !== req.session.userId) {
        return res.status(403).json({ message: "You are not authorized to edit this post" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const updatedPost = await storage.updatePost(postId, content);
      return res.json(updatedPost);
    } catch (error) {
      console.error(`Failed to update post with id ${req.params.id}:`, error);
      return res.status(500).json({ message: "Error updating post" });
    }
  });

  app.delete("/api/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.userId !== req.session.userId) {
        return res.status(403).json({ message: "You are not authorized to delete this post" });
      }

      await storage.deletePost(postId);
      return res.status(204).send();
    } catch (error) {
      console.error(`Failed to delete post with id ${req.params.id}:`, error);
      return res.status(500).json({ message: "Error deleting post" });
    }
  });

  // Endorsement routes
  app.post("/api/endorsements", isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.body.postId);
      const endorsementType = req.body.type || "positive"; // "positive" or "negative"
      
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      if (!["positive", "negative"].includes(endorsementType)) {
        return res.status(400).json({ message: "Invalid endorsement type. Must be 'positive' or 'negative'" });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user has already endorsed this post with this hashtag
      const existingEndorsement = await storage.getEndorsementByUserAndPost(
        req.session.userId as number,
        postId,
        post.hashtag,
      );

      if (existingEndorsement) {
        // If they already have an endorsement, update the type if it's different
        if (existingEndorsement.type === endorsementType) {
          return res
            .status(400)
            .json({ message: `You've already given this post a ${endorsementType === 'positive' ? 'thumbs up' : 'thumbs down'}` });
        } else {
          // Update the existing endorsement to the new type
          await storage.updateEndorsementType(existingEndorsement.id, endorsementType);
          return res.status(200).json({ message: "Endorsement updated", type: endorsementType });
        }
      }

      const endorsementData = insertEndorsementSchema.parse({
        postId,
        userId: req.session.userId,
        hashtag: post.hashtag,
        type: endorsementType,
      });

      const newEndorsement = await storage.createEndorsement(endorsementData);
      return res.status(201).json(newEndorsement);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Error creating endorsement" });
    }
  });

  // Reactions routes (using existing endorsements table with type field)
  app.post("/api/reactions", isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.body.postId);
      const reaction = req.body.reaction;
      
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const validReactions = ["like", "love", "haha", "wow", "sad", "angry"];
      if (!validReactions.includes(reaction)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user has already reacted to this post
      const existingEndorsement = await storage.getEndorsementByUserAndPost(
        req.session.userId as number,
        postId,
        post.hashtag,
      );

      if (existingEndorsement) {
        // Update existing reaction using endorsement system
        await storage.updateEndorsementType(existingEndorsement.id, reaction);
        return res.status(200).json({ message: "Reaction updated", reaction });
      } else {
        // Create new reaction using endorsement system
        const endorsementData = insertEndorsementSchema.parse({
          postId,
          userId: req.session.userId,
          hashtag: post.hashtag,
          type: reaction,
        });

        const newEndorsement = await storage.createEndorsement(endorsementData);
        return res.status(201).json(newEndorsement);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Error creating reaction" });
    }
  });

  // Comments routes
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const comments = await storage.getCommentsByPostId(postId);
      
      // Get user details for each comment
      const commentsWithUsers = await Promise.all(
        comments.map(async (comment) => {
          const user = await storage.getUser(comment.userId);
          if (!user) return { ...comment, user: null };
          
          const { password, ...userWithoutPassword } = user;
          return { ...comment, user: userWithoutPassword };
        })
      );

      return res.json(commentsWithUsers);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      return res.status(500).json({ message: "Error fetching comments" });
    }
  });

  app.post("/api/posts/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const commentData = insertCommentSchema.parse({
        postId,
        userId: req.session.userId,
        content: req.body.content,
      });

      const newComment = await storage.createComment(commentData);
      
      // Get user details for the response
      const user = await storage.getUser(req.session.userId as number);
      const { password, ...userWithoutPassword } = user || {};

      return res.status(201).json({
        ...newComment,
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Failed to create comment:", error);
      return res.status(500).json({ message: "Error creating comment" });
    }
  });

  // User profile routes
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's posts that aren't anonymous
      const posts = (await storage.getPostsByUserId(userId)).filter(
        (post) => !post.isAnonymous,
      );

      // Get endorsement stats
      const endorsementStats = await storage.getEndorsementCountsByUser(userId);

      // Don't include password
      const { password, ...userWithoutPassword } = user;

      return res.json({
        user: userWithoutPassword,
        posts,
        endorsementStats,
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching user profile" });
    }
  });

  // Get common hashtags
  app.get("/api/hashtags/common", (req, res) => {
    return res.json(COMMON_HASHTAGS);
  });

  // Get trending hashtags
  app.get("/api/hashtags/trending", async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || "5");

      // Step 1: Get all endorsements from storage
      const allEndorsements = await storage.getAllEndorsements();

      // Step 2: Count endorsements per hashtag
      const hashtagCounts = new Map<string, number>();
      for (const endorsement of allEndorsements) {
        const tag = endorsement.hashtag;
        const currentCount = hashtagCounts.get(tag) || 0;
        hashtagCounts.set(tag, currentCount + 1);
      }

      // Step 3: Sort by most endorsements
      const sorted = Array.from(hashtagCounts.entries())
        .map(([hashtag, count]) => ({ hashtag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return res.json(sorted);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error fetching trending hashtags" });
    }
  });

  // ---------------- Invite-only Access Routes ----------------

  // Validate invite code
  app.post("/api/invite/validate", async (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Invite code is required" });
    }
    
    const invite = await storage.getInviteByCode(code);

    if (!invite || invite.usedAt) {
      return res
        .status(400)
        .json({ message: "Invalid or already used invite code" });
    }

    return res
      .status(200)
      .json({ message: "Valid code", invitedByUserId: invite.invitedByUserId });
  });

  const httpServer = createServer(app);
  return httpServer;
}
