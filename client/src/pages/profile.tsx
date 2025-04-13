import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PostCard } from "@/components/post/PostCard";
import { HashtagStats } from "@/components/profile/HashtagStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/auth";

export default function Profile() {
  const [match, params] = useRoute("/profile/:id");
  const userId = params?.id ? parseInt(params.id) : 0;
  const { data: currentUser } = useCurrentUser();
  
  const { data: profileData, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/profile`],
    enabled: !!userId,
  });
  
  if (!match) {
    return <div>Profile not found</div>;
  }
  
  const isOwnProfile = currentUser?.id === userId;
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Feed
              </Button>
            </Link>
            
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="ml-4">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-6" />
                  
                  <div className="mt-6">
                    <Skeleton className="h-5 w-32 mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : profileData?.user ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-6">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <span className="font-medium text-xl">
                        {profileData.user.fullName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h1 className="text-2xl font-bold text-gray-900">{profileData.user.fullName}</h1>
                      <p className="text-gray-500">@{profileData.user.username}</p>
                    </div>
                  </div>
                  
                  {isOwnProfile && (
                    <div className="mb-6">
                      <Button variant="outline" size="sm">Edit Profile</Button>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-100 pt-6">
                    <h2 className="text-lg font-semibold mb-4">Hashtag Reputation</h2>
                    {profileData.endorsementStats && profileData.endorsementStats.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <HashtagStats stats={profileData.endorsementStats} />
                      </div>
                    ) : (
                      <p className="text-gray-500">No endorsements received yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <h2 className="text-xl font-medium text-gray-900 mb-2">User not found</h2>
                  <p className="text-gray-500">The user you're looking for doesn't exist or has been removed</p>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Posts</h2>
            
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <div className="flex justify-between mb-4">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3 mb-4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : profileData?.posts && profileData.posts.length > 0 ? (
              <div className="space-y-4">
                {profileData.posts.map((post: any) => (
                  <PostCard 
                    key={post.id} 
                    post={{
                      ...post,
                      user: profileData.user,
                      // Add these properties if they're not included
                      endorsementCount: post.endorsementCount || 0,
                      currentUserEndorsed: post.currentUserEndorsed || false
                    }} 
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No posts yet</h3>
                  {isOwnProfile ? (
                    <p className="text-gray-500">
                      You haven't created any posts yet. 
                      <Link href="/">
                        <Button variant="link" className="px-1">Share your first post now!</Button>
                      </Link>
                    </p>
                  ) : (
                    <p className="text-gray-500">This user hasn't published any posts yet</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
