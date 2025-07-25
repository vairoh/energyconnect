# Product Requirements Document: Hashtag-Based Social Platform

## 1. Overview

This document outlines the product requirements for a web-based social platform centered around hashtags. The application allows users to join via an invite-only system, post content with specific hashtags, and interact with posts through reactions to increase their visibility. It aims to foster a community where content is discovered and valued based on its relevance to specific topics (hashtags), with specialized support for different content types including general posts, job opportunities, and events.

## 2. Key Features

### 2.1. User Authentication and Profiles
- **Invite-Only Registration**: New users must have a valid invite code to register.
- **User Registration**: Users can sign up with a username, full name, email, and password.
- **User Login/Logout**: Registered users can log in and out of the application.
- **Enhanced User Profiles**: Each user has a comprehensive profile page featuring:
  - Hero section with avatar, user info, and action buttons
  - Statistics dashboard (total posts, reactions, comments, membership duration)
  
  - Tabbed activity timeline (Posts, Reactions, Comments) with grid/list view toggle
  - Insights sidebar with engagement analytics and quick stats
  - Professional design with skeleton loaders and empty states

### 2.2. Content Creation and Interaction

#### 2.2.1. Innovative Post Creation System
- **Hover-Based Post Creation**: Revolutionary dropdown system with three specialized post types:
  - 💙 **General Posts**: Traditional social media posts with enhanced hashtag selection
  - 💚 **Job Posts**: Structured job opportunities with dedicated fields (title, company, location, type, experience, salary)
  - 🧡 **Event Posts**: Comprehensive event announcements with date, time, location, capacity, and pricing
- **Smart Post Formatting**: Auto-formatted content with emojis and professional structure based on post type
- **Context-Aware Hashtags**: Each post type displays relevant hashtag suggestions (job-related, event-related, or general trending)

#### 2.2.2. Post Types and Structured Data
- **General Posts**: Traditional content with enhanced hashtag selection and anonymous posting option
- **Job Posts**: Professional job listings with structured data including:
  - Job title, company, location, job type, experience level, salary range
  - Comprehensive job descriptions with requirements and responsibilities
  - Job-specific hashtag categories (#job, #hiring, #career, #remote, etc.)
- **Event Posts**: Detailed event announcements with structured data including:
  - Event name, type, date, time, location, capacity, ticket pricing
  - Rich event descriptions with highlights and attendance information
  - Event-specific hashtag categories (#event, #meetup, #conference, #networking, etc.)

#### 2.2.3. Advanced Interaction System
- **Reaction System**: Enhanced interaction beyond simple likes with multiple reaction types:
  - Support for various emotions (like, love, haha, wow, sad, angry)
  - Hover-based reaction picker with smooth animations
  - Real-time reaction counts and user feedback
- **Comments System**: Authenticated users can comment on posts with persistent storage across page refreshes
- **Post Management**: Post authors can delete their own posts with confirmation dialogs
- **Real-time Interactions**: All interactions update immediately without page refresh

### 2.3. Hashtag-Based Discovery and Visual System

#### 2.3.1. Unique Hashtag Color System
- **Consistent Color Mapping**: Each unique hashtag receives a consistent, algorithmically-generated color
- **Hash-Based Color Generation**: Uses hashtag content to generate unique HSL colors with proper contrast
- **Cross-Platform Consistency**: Same hashtag displays the same color across all components and pages
- **Visual Hierarchy**: Colors help users quickly identify and categorize content

#### 2.3.2. Smart Discovery Features
- **Hashtag Filtering**: Main feed can be filtered to show only posts with specific hashtags
- **Trending Hashtags**: Platform identifies trending hashtags based on reaction counts with automatic fallback to post frequency
- **Limited Trending Display**: Top 5 trending hashtags in filter bar for optimal UI alignment
- **Common Hashtags**: Predefined list of common hashtags available for quick selection
- **Hashtag Statistics**: User profiles display comprehensive hashtag usage and reaction statistics

### 2.4. User Experience Enhancements
- **Responsive Design**: Fully responsive application working seamlessly across all device sizes
- **Interactive UI**: Rich interactions including hover effects, loading states, smooth transitions, and micro-animations
- **Visual Feedback**: Comprehensive feedback system with comment counts, reaction counts, and immediate user action responses
- **Accessibility**: Proper ARIA labels, keyboard navigation, and semantic HTML structure
- **Error Handling**: Comprehensive error handling with user-friendly messages and toast notifications
- **Professional Gradients**: Beautiful gradient designs throughout the interface
- **Skeleton Loading**: Professional loading states for all data-heavy components

## 3. Technical Implementation

### 3.1. Frontend
- **Framework**: React with Vite
- **UI Components**: Rich set of reusable UI components built with `shadcn/ui`
- **State Management**: React Query for managing server state
- **Routing**: `wouter` for client-side routing
- **Color System**: Custom hash-based color generation utility (`hashtagColors.ts`)
- **Key Pages**:
    - **Feed (`/` or `/feed`)**: Enhanced feed with hashtag filtering and post type support
    - **Profile (`/profile/:id`)**: Comprehensive user profiles with advanced analytics
    - **Authentication**: Complete forms for login, registration, and invite code validation
    - **Not Found**: Standard 404 page with proper error handling

### 3.2. Backend
- **Framework**: Express.js
- **Database**: PostgreSQL with Supabase integration
- **ORM**: Drizzle ORM with advanced schema support
- **Authentication**: Session-based authentication using `express-session`
- **Structured Data Support**: JSON fields for storing job and event specific data
- **API Endpoints**:
    - `POST /api/auth/register`
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
    - `GET /api/auth/user`
    - `POST /api/posts` (enhanced with post type support)
    - `GET /api/posts` (with type and hashtag filtering)
    - `GET /api/posts/:id`
    - `DELETE /api/posts/:id`
    - `POST /api/reactions` (enhanced reaction system)
    - `POST /api/posts/:id/comments`
    - `GET /api/posts/:id/comments`
    - `GET /api/users/:id/profile`
    - `GET /api/hashtags/common`
    - `GET /api/hashtags/trending` (with configurable limits)
    - `GET /api/stats`
    - `POST /api/invite/validate`
    - `POST /api/invite/mark-used`

### 3.3. Enhanced Database Schema
- **`users`**: User information with credentials and invitation tracking
- **`posts`**: Enhanced with post type classification and structured data storage:
  - `type`: "general", "job", or "event"
  - `structuredData`: JSON field storing type-specific information
- **`reactions`**: Advanced reaction system replacing simple endorsements:
  - Support for multiple reaction types (like, love, haha, wow, sad, angry)
  - Proper user-post relationship tracking
- **`comments`**: Comment system with user-post relationships and timestamps
- **`invites`**: Invite code management system
- **`endorsements`**: Legacy table maintained for backward compatibility

## 4. Current Implementation Status

### 4.1. Completed Features
- ✅ **Full Authentication System**: Invite-only registration, login/logout, session management
- ✅ **Enhanced Post Creation**: Innovative hover-based system with three specialized post types
- ✅ **Structured Data Management**: Complete job and event data capture with queryable JSON storage
- ✅ **Advanced Reaction System**: Multi-type reactions with hover interactions and real-time updates
- ✅ **Comments System**: Full commenting functionality with persistence across page refreshes
- ✅ **Unique Hashtag Colors**: Consistent color mapping across the entire application
- ✅ **Professional User Profiles**: World-class profile design with comprehensive analytics
- ✅ **Smart Hashtag Discovery**: Trending system with automatic limits and intelligent filtering
- ✅ **Responsive UI**: Mobile-friendly design with modern UI components and micro-animations
- ✅ **Real-time Interactions**: Immediate updates for all user actions
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Database Integration**: Full Supabase integration with structured data support

### 4.2. Advanced Technical Features
- ✅ **Type-Safe API**: Complete TypeScript integration with Zod validation
- ✅ **Structured Post Types**: Separate schemas and validation for general, job, and event posts
- ✅ **Advanced Filtering**: API support for filtering by post type and hashtag
- ✅ **Color Algorithm**: Hash-based color generation for consistent hashtag visualization
- ✅ **Professional UI/UX**: Enterprise-level design patterns and user experience
- ✅ **Performance Optimization**: Efficient data loading with React Query and skeleton states

### 4.3. Potential Future Enhancements
- **Advanced Job Board**: Dedicated job listing page with salary filtering and location search
- **Event Calendar**: Calendar view for event posts with date-based filtering
- **WebSocket Integration**: Real-time updates across multiple users/sessions
- **Notifications**: Notify users when their posts receive reactions or comments
- **Search Enhancement**: Global search functionality across all post types and structured data
- **Direct Messaging**: Allow users to send direct messages to each other
- **Analytics Dashboard**: Advanced analytics for hashtag performance and user engagement
- **Image/Media Support**: Allow users to attach images or other media to posts
- **Comment Threading**: Add reply functionality to comments for deeper discussions
- **Mobile App**: Native mobile application with push notifications
- **API Integrations**: Integration with job boards and event platforms

## 5. Innovation Highlights

### 5.1. Unique Features
- **Hover-Based Post Creation**: Industry-first hover dropdown system for content type selection
- **Consistent Hashtag Colors**: Algorithmic color generation ensuring visual consistency
- **Structured Social Posts**: Combining social media with structured data for jobs and events
- **Professional Profile Design**: Enterprise-level user profile implementation
- **Context-Aware Hashtags**: Intelligent hashtag suggestions based on post type

### 5.2. Technical Excellence
- **Type-Safe Full Stack**: Complete TypeScript implementation from frontend to database
- **Scalable Architecture**: Modular design supporting easy feature additions
- **Performance First**: Optimized loading states and efficient data management
- **Modern UI/UX**: State-of-the-art design patterns and user interactions
- **Enterprise Ready**: Professional error handling, validation, and data integrity 