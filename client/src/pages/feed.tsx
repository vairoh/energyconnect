import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PostCard } from "@/components/post/PostCard";

import { getHashtagStyles } from "@/lib/hashtagColors";
import { HashtagFilter } from "@/components/post/HashtagFilter";
import { PostForm } from "@/components/post/PostForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Hash } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Define proper types to match PostCard expectations
interface Post {
  id: number;
  content: string;
  hashtag: string;
  createdAt: string;
  isAnonymous: boolean;
  userId: number;
  user?: {
    id: number;
    fullName: string;
    username: string;
  } | null;
  endorsementCount: number;
  positiveCount: number;
  negativeCount: number;
  currentUserEndorsed: boolean;
  currentUserDisliked: boolean;
}

interface TrendingHashtag {
  hashtag: string;
  count: number;
}

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalHashtags: number;
}

export default function Feed() {
  const { toast } = useToast();
  const [selectedHashtag, setSelectedHashtag] = useState<string>("");
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const {
    data: posts = [],
    isLoading: postsLoading,
    error: postsError,
  } = useQuery<Post[]>({
    queryKey: ["posts", selectedHashtag],
    queryFn: () =>
      fetch(
        selectedHashtag
          ? `/api/posts?hashtag=${encodeURIComponent(selectedHashtag)}`
          : "/api/posts"
      ).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch posts");
        return res.json();
      }),
  });

  const { data: trendingHashtags = [] } = useQuery<TrendingHashtag[]>({
    queryKey: ["trendingHashtags"],
    queryFn: () =>
      fetch("/api/hashtags/trending").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch trending hashtags");
        return res.json();
      }),
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () =>
      fetch("/api/stats").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stats");
        return res.json();
      }),
  });

  const handleHashtagSelect = (hashtag: string | null) => {
    setSelectedHashtag(hashtag || "");
  };

  useEffect(() => {
    if (postsError) {
      toast({
        title: "Error",
        description: "Failed to load posts. Please try again later.",
        variant: "destructive",
      });
    }
  }, [postsError]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Main Feed Column */}
            <div className="lg:col-span-2">
              <HashtagFilter
                selectedHashtag={selectedHashtag}
                onSelectHashtag={handleHashtagSelect}
              />

              {/* Posts */}
              <div className="space-y-4">
                {postsLoading ? (
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading posts...</p>
                  </div>
                ) : posts.length > 0 ? (
                  posts.map((post: Post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No posts found
                    </h3>
                    <p className="text-gray-500">
                      {selectedHashtag
                        ? `No posts with the hashtag ${selectedHashtag} yet.`
                        : "Be the first to create a post!"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="mt-10 lg:mt-0 space-y-6">


              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trending Hashtags</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendingHashtags ? (
                    <div className="space-y-3">
                      {trendingHashtags.map((tag: TrendingHashtag) => (
                        <div
                          key={tag.hashtag}
                          className="flex items-center justify-between"
                        >
                          <button
                            className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium hover:opacity-80 transition-opacity"
                            style={getHashtagStyles(tag.hashtag)}
                            onClick={() => handleHashtagSelect(tag.hashtag)}
                          >
                            {tag.hashtag}
                          </button>
                          <span className="text-xs text-gray-500">
                            {tag.count} posts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upcoming Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      "Grid Code Workshop",
                      "Renewable Integration Summit",
                      "Energy Storage Webinar",
                    ].map((title, i) => (
                      <div
                        key={title}
                        className={`pb-3 ${i < 2 ? "border-b border-gray-100" : ""}`}
                      >
                        <h4 className="font-medium text-gray-800">{title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {i === 0
                            ? "Jun 15, 2023 • Berlin"
                            : i === 1
                              ? "Jul 22, 2023 • Hamburg"
                              : "Aug 5, 2023 • Online"}
                        </p>
                        <div className="mt-2 flex">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={getHashtagStyles("event")}
                          >
                            #event
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Site Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {stats?.totalUsers || 0}
                      </div>
                      <div className="text-sm text-gray-600">Users</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {stats?.totalPosts || 0}
                      </div>
                      <div className="text-sm text-gray-600">Posts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {stats?.totalHashtags || 0}
                      </div>
                      <div className="text-sm text-gray-600">Hashtags</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
