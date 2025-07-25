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
  insertJobPostSchema,
  insertEventPostSchema,
  insertGeneralPostSchema,
  insertProfileViewSchema,
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
      const postType = req.body.type || "general";
      let postData;

      // Parse based on post type
      switch (postType) {
        case "job":
          postData = insertJobPostSchema.parse({
            ...req.body,
            userId: req.session.userId,
          });
          break;
        case "event":
          postData = insertEventPostSchema.parse({
            ...req.body,
            userId: req.session.userId,
          });
          break;
        case "general":
        default:
          postData = insertGeneralPostSchema.parse({
            ...req.body,
            userId: req.session.userId,
            type: "general",
          });
          break;
      }

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
      const type = req.query.type as string | undefined;
      
      let posts;
      if (hashtag) {
        posts = await storage.getPostsByHashtag(hashtag);
      } else if (type) {
        posts = await storage.getPostsByType(type);
      } else {
        posts = await storage.getPosts();
      }

      const enhancedPosts = await Promise.all(
        posts.map(async (post) => {
          // Get reactions using new reactions table
          const reactions = await storage.getReactionsByPostId(post.id);
        
          // Group reactions by type
          const reactionCounts = reactions.reduce((acc, reaction) => {
            acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          // Get current user's reaction
          const currentUserReaction = req.session.userId
            ? await storage.getReactionByUserAndPost(req.session.userId, post.id)
            : null;

          // Calculate totals for backward compatibility
          const totalReactions = reactions.length;
          const likeCount = reactionCounts.like || 0;

          return {
            ...post,
            reactionCount: totalReactions, // New field using reactions terminology
            endorsementCount: likeCount, // Keep for backward compatibility
            positiveCount: likeCount, // Keep for backward compatibility
            negativeCount: reactionCounts.angry || 0, // Keep for backward compatibility
            reactions: reactionCounts,
            currentUserReaction: currentUserReaction?.reaction || null,
            currentUserEndorsed: currentUserReaction?.reaction === "like", // Keep for backward compatibility
            currentUserDisliked: currentUserReaction?.reaction === "angry", // Keep for backward compatibility
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

      // Get reactions using new reactions table
      const reactions = await storage.getReactionsByPostId(post.id);
      
      // Group reactions by type
      const reactionCounts = reactions.reduce((acc, reaction) => {
        acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      let user = null;
      if (post.userId && !post.isAnonymous) {
        const userRecord = await storage.getUser(post.userId);
        if (userRecord) {
          const { password, ...userWithoutPassword } = userRecord;
          user = userWithoutPassword;
        }
      }

      // Get current user's reaction
      const currentUserReaction = req.session.userId
        ? await storage.getReactionByUserAndPost(req.session.userId as number, post.id)
        : null;

      // Calculate totals for backward compatibility
      const totalReactions = reactions.length;
      const likeCount = reactionCounts.like || 0;
      const angryCount = reactionCounts.angry || 0;

      return res.json({
        ...post,
        user,
        reactionCount: totalReactions, // New field using reactions terminology
        endorsementCount: likeCount, // Keep for backward compatibility
        positiveCount: likeCount, // Keep for backward compatibility
        negativeCount: angryCount, // Keep for backward compatibility
        reactions: reactionCounts,
        currentUserReaction: currentUserReaction?.reaction || null,
        currentUserEndorsed: currentUserReaction?.reaction === "like", // Keep for backward compatibility
        currentUserDisliked: currentUserReaction?.reaction === "angry", // Keep for backward compatibility
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

  // Reactions routes (using new reactions table)
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
      const existingReaction = await storage.getReactionByUserAndPost(
        req.session.userId as number,
        postId,
      );

      if (existingReaction) {
        // Update existing reaction
        await storage.updateReactionType(existingReaction.id, reaction);
        return res.status(200).json({ message: "Reaction updated", reaction });
      } else {
        // Create new reaction
        const reactionData = insertReactionSchema.parse({
          postId,
          userId: req.session.userId,
          reaction,
        });

        const newReaction = await storage.createReaction(reactionData);
        return res.status(201).json(newReaction);
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

      // Record profile view if user is authenticated and viewing someone else's profile
      if (req.session.userId && req.session.userId !== userId) {
        await storage.recordProfileView(req.session.userId, userId);
      }

      // Get user's posts that aren't anonymous
      const posts = (await storage.getPostsByUserId(userId)).filter(
        (post) => !post.isAnonymous,
      );

      // Get reaction stats using new reactions system
      const reactionStats = await storage.getReactionCountsByUser(userId);

      // Get profile view count
      const profileViewCount = await storage.getProfileViewCount(userId);

      // Don't include password
      const { password, ...userWithoutPassword } = user;

      return res.json({
        user: userWithoutPassword,
        posts,
        reactionStats, // New field using reactions terminology
        endorsementStats: reactionStats, // Keep for backward compatibility
        profileViewCount,
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching user profile" });
    }
  });

  // Profile view routes
  app.get("/api/users/:id/profile-viewers", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Only allow users to see their own profile viewers
      if (req.session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const limit = parseInt((req.query.limit as string) || "10");
      const viewers = await storage.getProfileViewers(userId, limit);

      return res.json(viewers);
    } catch (error) {
      return res.status(500).json({ message: "Error fetching profile viewers" });
    }
  });

  app.get("/api/users/:id/profile-analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Only allow users to see their own analytics
      if (req.session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const days = parseInt((req.query.days as string) || "7");
      const [viewCount, recentViews] = await Promise.all([
        storage.getProfileViewCount(userId),
        storage.getRecentProfileViews(userId, days),
      ]);

      return res.json({
        totalViews: viewCount,
        recentViews,
        period: `${days} days`,
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching profile analytics" });
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

      // Get trending hashtags based on post count (not reaction count)
      const trendingHashtags = await storage.getTopHashtagsByPostCount(limit);
      
      return res.json(trendingHashtags);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      return res
        .status(500)
        .json({ message: "Error fetching trending hashtags" });
    }
  });

  // Debug endpoint to compare post counts vs reaction counts
  app.get("/api/hashtags/analytics", async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || "10");

      const [postCounts, reactionCounts] = await Promise.all([
        storage.getTopHashtagsByPostCount(limit),
        storage.getTopReactedHashtags(limit),
      ]);

      return res.json({
        byPostCount: postCounts,
        byReactionCount: reactionCounts,
        explanation: {
          postCount: "Number of posts per hashtag",
          reactionCount: "Number of reactions per hashtag"
        }
      });
    } catch (error) {
      console.error('Error fetching hashtag analytics:', error);
      return res
        .status(500)
        .json({ message: "Error fetching hashtag analytics" });
    }
  });

  // Legacy trending hashtags route (fallback to manual calculation if needed)
  app.get("/api/hashtags/trending-legacy", async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || "5");

      // Step 1: Get all reactions from storage and join with posts for hashtags
      const allReactions = await storage.getAllReactions();
      const allPosts = await storage.getPosts(); // Get all posts to map reaction -> hashtag

      // Step 2: Count reactions per hashtag
      const hashtagCounts = new Map<string, number>();
      for (const reaction of allReactions) {
        const post = allPosts.find(p => p.id === reaction.postId);
        if (post) {
          const tag = post.hashtag;
          const currentCount = hashtagCounts.get(tag) || 0;
          hashtagCounts.set(tag, currentCount + 1);
        }
      }

      // Step 3: Sort by most reactions
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
