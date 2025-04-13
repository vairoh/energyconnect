import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PostCard } from "@/components/post/PostCard";
import { hashtagColors } from "@/lib/hashtagColors";
import { HashtagFilter } from "@/components/post/HashtagFilter";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Feed() {
  const { toast } = useToast();
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const { data: currentUser } = useCurrentUser();

  const {
    data: posts,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: [
      "/api/posts",
      selectedHashtag
        ? { hashtag: selectedHashtag.replace("#", "") }
        : undefined,
    ],
  });

  const { data: trendingHashtags } = useQuery({
    queryKey: ["/api/hashtags/trending", { limit: 5 }],
  });

  const handleHashtagSelect = (hashtag: string | null) => {
    setSelectedHashtag(hashtag);
  };

  if (postsError) {
    toast({
      title: "Error",
      description: "Failed to load posts. Please try again later.",
      variant: "destructive",
    });
  }

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
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-5">
                      <div className="flex justify-between mb-4">
                        <div className="flex">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="ml-3">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16 mt-1" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <div className="border-t border-gray-100 pt-3 flex justify-between">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  ))
                ) : posts && posts.length > 0 ? (
                  posts.map((post: any) => <PostCard key={post.id} post={post} />)
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
              {currentUser && <ProfileCard userId={currentUser.id} />}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trending Hashtags</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendingHashtags ? (
                    <div className="space-y-3">
                      {trendingHashtags.map((tag: any) => (
                        <div
                          key={tag.hashtag}
                          className="flex items-center justify-between"
                        >
                          <button
                            className="text-sm font-medium text-gray-700 hover:text-primary"
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
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              hashtagColors["event"] ||
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            #event
                          </span>
                        </div>
                      </div>
                    ))}
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
