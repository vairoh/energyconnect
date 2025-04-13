import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertPostSchema,
  insertEndorsementSchema,
  COMMON_HASHTAGS,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcryptjs";
import expressSession from "express-session";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(expressSession);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  app.use(
    expressSession({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "energy-pros-secret",
    }),
  );

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

      // Save user with hashed password
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

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
      let posts;
      const hashtag = req.query.hashtag as string | undefined;

      if (hashtag) {
        // Format hashtag to ensure it starts with #
        const formattedHashtag = hashtag.startsWith("#")
          ? hashtag
          : `#${hashtag}`;
        posts = await storage.getPostsByHashtag(formattedHashtag);
      } else {
        posts = await storage.getPosts();
      }

      // Enhance posts with user info and endorsement counts
      const enhancedPosts = await Promise.all(
        posts.map(async (post) => {
          const endorsements = await storage.getEndorsementsByPostId(post.id);
          let user = null;

          if (post.userId && !post.isAnonymous) {
            const userRecord = await storage.getUser(post.userId);
            if (userRecord) {
              const { password, ...userWithoutPassword } = userRecord;
              user = userWithoutPassword;
            }
          }

          return {
            ...post,
            user,
            endorsementCount: endorsements.length,
            // Include if current user has endorsed already
            currentUserEndorsed: req.session.userId
              ? (await storage.getEndorsementByUserAndPost(
                  req.session.userId as number,
                  post.id,
                  post.hashtag,
                )) !== undefined
              : false,
          };
        }),
      );

      return res.json(enhancedPosts);
    } catch (error) {
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

      let user = null;
      if (post.userId && !post.isAnonymous) {
        const userRecord = await storage.getUser(post.userId);
        if (userRecord) {
          const { password, ...userWithoutPassword } = userRecord;
          user = userWithoutPassword;
        }
      }

      return res.json({
        ...post,
        user,
        endorsementCount: endorsements.length,
        currentUserEndorsed: req.session.userId
          ? (await storage.getEndorsementByUserAndPost(
              req.session.userId as number,
              post.id,
              post.hashtag,
            )) !== undefined
          : false,
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching post" });
    }
  });

  // Endorsement routes
  app.post("/api/endorsements", isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.body.postId);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
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
        return res
          .status(400)
          .json({ message: "You've already endorsed this post" });
      }

      const endorsementData = insertEndorsementSchema.parse({
        postId,
        userId: req.session.userId,
        hashtag: post.hashtag,
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

  type InviteEntry = {
    code: string;
    invitedByUserId: number;
    used: boolean;
  };

  const inviteCodes: InviteEntry[] = [
    { code: "ENERGY123", invitedByUserId: 1, used: false },
    { code: "GRID456", invitedByUserId: 1, used: false },
  ];

  // Validate invite code
  app.post("/api/invite/validate", (req, res) => {
    const { code } = req.body;
    const invite = inviteCodes.find(
      (entry) => entry.code === code && !entry.used,
    );

    if (!invite) {
      return res
        .status(400)
        .json({ message: "Invalid or already used invite code" });
    }

    return res
      .status(200)
      .json({ message: "Valid code", invitedByUserId: invite.invitedByUserId });
  });

  // Mark code as used after registration
  app.post("/api/invite/mark-used", (req, res) => {
    const { code } = req.body;
    const invite = inviteCodes.find((entry) => entry.code === code);

    if (!invite) {
      return res.status(404).json({ message: "Invite code not found" });
    }

    invite.used = true;
    return res.status(200).json({ message: "Invite code marked as used" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
