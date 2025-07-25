# Product Requirements Document: Hashtag-Based Social Platform

## 1. Overview

This document outlines the product requirements for a web-based social platform centered around hashtags. The application allows users to join via an invite-only system, post content with specific hashtags, and endorse posts to increase their visibility. It aims to foster a community where content is discovered and valued based on its relevance to specific topics (hashtags).

## 2. Key Features

### 2.1. User Authentication and Profiles
- **Invite-Only Registration**: New users must have a valid invite code to register.
- **User Registration**: Users can sign up with a username, full name, email, and password.
- **User Login/Logout**: Registered users can log in and out of the application.
- **User Profiles**: Each user has a profile page that displays their posts (non-anonymous only) and statistics about the endorsements they've received.

### 2.2. Content Creation and Interaction
- **Create Posts**: Authenticated users can create posts with content and a single, mandatory hashtag.
- **Anonymous Posting**: Users have the option to make their posts anonymous.
- **Post Feed**: The main feed displays all posts, which can be filtered by a specific hashtag.
- **Endorsements**: Authenticated users can "endorse" a post, which is similar to a "like". A user can only endorse a post once.
- **Comments System**: Authenticated users can comment on posts. Comments are displayed in a collapsible section under each post.
- **Post Management**: Post authors can delete their own posts (with confirmation dialog).
- **Real-time Interactions**: Post interactions (endorsements, comments) update immediately without page refresh.

### 2.3. Hashtag-Based Discovery
- **Hashtag Filtering**: The main feed can be filtered to show only posts with a specific hashtag.
- **Trending Hashtags**: The platform identifies and displays a list of trending hashtags based on the number of endorsements.
- **Common Hashtags**: A predefined list of common hashtags is available to guide users.
- **Hashtag Statistics**: User profiles display statistics about hashtag usage and endorsements received per hashtag.

### 2.4. User Experience Enhancements
- **Responsive Design**: The application is fully responsive and works seamlessly on desktop and mobile devices.
- **Interactive UI**: Rich interactions including hover effects, loading states, and smooth transitions.
- **Visual Feedback**: Comment counts are displayed on post buttons, endorsement counts are visible, and user actions provide immediate feedback.
- **Accessibility**: Proper ARIA labels, keyboard navigation, and semantic HTML structure.
- **Error Handling**: Comprehensive error handling with user-friendly error messages and toast notifications.

## 3. Technical Implementation

### 3.1. Frontend
- **Framework**: React with Vite
- **UI Components**: A rich set of reusable UI components built with `shadcn/ui`.
- **State Management**: React Query for managing server state.
- **Routing**: `wouter` for client-side routing.
- **Key Pages**:
    - **Feed (`/` or `/feed`)**: Displays posts and allows for filtering.
    - **Profile (`/profile/:id`)**: Displays a user's profile.
    - **Authentication**: Includes forms for login, registration, and invite code validation.
    - **Not Found**: A standard 404 page.

### 3.2. Backend
- **Framework**: Express.js
- **Database**: PostgreSQL (inferred from `drizzle-orm/pg-core`)
- **ORM**: Drizzle ORM
- **Authentication**: Session-based authentication using `express-session`.
- **API Endpoints**:
    - `POST /api/auth/register`
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
    - `GET /api/auth/user`
    - `POST /api/posts`
    - `GET /api/posts`
    - `GET /api/posts/:id`
    - `DELETE /api/posts/:id`
    - `POST /api/endorsements`
    - `POST /api/posts/:id/comments`
    - `GET /api/posts/:id/comments`
    - `GET /api/users/:id/profile`
    - `GET /api/hashtags/common`
    - `GET /api/hashtags/trending`
    - `GET /api/stats`
    - `POST /api/invite/validate`
    - `POST /api/invite/mark-used`

### 3.3. Database Schema
- **`users`**: Stores user information, including credentials and a reference to the user who invited them.
- **`posts`**: Stores post content, the associated hashtag, the user who created it, and whether it's anonymous.
- **`endorsements`**: Links users to the posts they've endorsed, storing the user, post, and hashtag.
- **`comments`**: Stores comments on posts, linking users to posts with comment content and timestamps.
- **`invites`**: Manages the invite codes, including who issued them and whether they have been used.

## 4. Current Implementation Status

### 4.1. Completed Features
- ✅ **Full Authentication System**: Invite-only registration, login/logout, session management
- ✅ **Post Creation & Management**: Create posts with hashtags, anonymous posting, post deletion
- ✅ **Comments System**: Full commenting functionality with persistence across page refreshes
- ✅ **Endorsements System**: Like functionality with proper user restrictions
- ✅ **Hashtag Discovery**: Filtering, trending hashtags, common hashtags
- ✅ **User Profiles**: Profile pages with posts and hashtag statistics
- ✅ **Responsive UI**: Mobile-friendly design with modern UI components
- ✅ **Real-time Interactions**: Immediate updates for all user actions
- ✅ **Error Handling**: Comprehensive error handling and user feedback

### 4.2. Potential Future Enhancements
- **WebSocket Integration**: Real-time updates across multiple users/sessions
- **Notifications**: Notify users when their posts are endorsed or commented on
- **Search**: Add a global search functionality to find users and posts
- **Direct Messaging**: Allow users to send direct messages to each other
- **More Sophisticated Trending Algorithm**: Improve the trending algorithm to consider time-decay and other factors
- **Image/Media Support**: Allow users to attach images or other media to posts
- **Comment Threading**: Add reply functionality to comments for deeper discussions 