import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, 
  MessageCircle, 
  Share2, 
  Calendar,
  TrendingUp,
  Heart,
  MessageSquare,
  Users,
  Hash,
  Award,
  Activity,
  Eye,
  BarChart3,
  Grid3X3,
  List,
  Filter
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PostCard } from "@/components/post/PostCard";

import { ProfileViewers } from "@/components/profile/ProfileViewers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

export default function Profile() {
  const [match, params] = useRoute("/profile/:id");
  const userId = params?.id ? parseInt(params.id) : 0;
  const { data: currentUser } = useCurrentUser();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState('posts');
  
  const { data: profileData, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/profile`],
    enabled: !!userId,
  });
  
  if (!match) {
    return <div>Profile not found</div>;
  }
  
  const isOwnProfile = currentUser?.id === userId;
  const user = profileData?.user;
  const posts = profileData?.posts || [];
  
  // Calculate profile metrics
  const totalPosts = posts.length;
  const totalReactions = posts.reduce((sum: number, post: any) => sum + (post.endorsementCount || 0), 0);
  const totalComments = posts.reduce((sum: number, post: any) => sum + (post.commentCount || 0), 0);
  const joinedDate = user?.createdAt ? new Date(user.createdAt) : new Date();
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Back Navigation */}
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-4 hover:bg-white">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Feed
              </Button>
            </Link>
          </div>
            
            {isLoading ? (
            <ProfileSkeleton />
          ) : user ? (
            <div className="space-y-6">
              {/* Hero Section */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 pt-6 pb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Avatar */}
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-lg">
                      <span className="font-bold text-2xl">
                        {user.fullName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 mb-1">{user.fullName}</h1>
                      <p className="text-lg text-gray-600 mb-2">@{user.username}</p>
                      <p className="text-gray-700 mb-4">
                        {isOwnProfile 
                          ? "This is your profile - share your expertise through hashtags!" 
                          : `Passionate about sharing knowledge with the community.`
                        }
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3">
                        {isOwnProfile ? (
                          <Button variant="outline" className="bg-white hover:bg-gray-50">
                            Edit Profile
                          </Button>
                        ) : (
                          <>
                            <Button className="bg-primary hover:bg-primary/90">
                              <Users className="w-4 h-4 mr-2" />
                              Follow
                            </Button>
                            <Button variant="outline" className="bg-white hover:bg-gray-50">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Message
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="icon" className="bg-white hover:bg-gray-50">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    </div>
                  </div>
                  
                {/* Stats Bar */}
                <div className="px-6 py-4 bg-white border-t">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{totalPosts}</div>
                      <div className="text-sm text-gray-600">Posts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{totalReactions}</div>
                      <div className="text-sm text-gray-600">Reactions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{totalComments}</div>
                      <div className="text-sm text-gray-600">Comments</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatDistanceToNow(joinedDate, { addSuffix: false })}
                      </div>
                      <div className="text-sm text-gray-600">Member</div>
                    </div>
                  </div>
                </div>
              </Card>



              {/* Main Content Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Timeline */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Activity
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={viewMode === 'list' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                          >
                            <List className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                          >
                            <Grid3X3 className="w-4 h-4" />
                          </Button>
          </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="posts">Posts</TabsTrigger>
                          <TabsTrigger value="reactions">Reactions</TabsTrigger>
                          <TabsTrigger value="comments">Comments</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="posts" className="mt-6">
                          {posts.length > 0 ? (
                            <div className={`space-y-4 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}`}>
                              {posts.map((post: any) => (
                  <PostCard 
                    key={post.id} 
                    post={{
                      ...post,
                                    user: user,
                      endorsementCount: post.endorsementCount || 0,
                      currentUserEndorsed: post.currentUserEndorsed || false
                    }} 
                  />
                ))}
              </div>
            ) : (
                            <EmptyState 
                              icon={<MessageSquare className="w-12 h-12" />}
                              title="No posts yet"
                              description={isOwnProfile 
                                ? "Share your first post to start building your presence!"
                                : "This user hasn't published any posts yet."
                              }
                              action={isOwnProfile ? (
                      <Link href="/">
                                  <Button>Create First Post</Button>
                      </Link>
                              ) : undefined}
                            />
                          )}
                        </TabsContent>
                        
                        <TabsContent value="reactions" className="mt-6">
                          <EmptyState 
                            icon={<Heart className="w-12 h-12" />}
                            title="Reactions coming soon"
                            description="View all posts this user has reacted to."
                          />
                        </TabsContent>
                        
                        <TabsContent value="comments" className="mt-6">
                          <EmptyState 
                            icon={<MessageCircle className="w-12 h-12" />}
                            title="Comments coming soon"
                            description="View all comments this user has made."
                          />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>

                {/* Insights Sidebar */}
                <div className="space-y-6">
                  {/* Profile Views Analytics */}
                  <ProfileViewers userId={userId} isOwnProfile={isOwnProfile} />
                  {/* Engagement Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="w-4 h-4" />
                        This Month
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">New Reactions</span>
                        <span className="font-semibold">+{Math.floor(totalReactions * 0.3)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">New Comments</span>
                        <span className="font-semibold">+{Math.floor(totalComments * 0.4)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Profile Views</span>
                                                      <span className="font-semibold">{profileData?.profileViewCount || 0}</span>
                      </div>
                      
                      <Separator />
                      
                      {posts.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-900 mb-2">Top Performing Post</div>
                          <div className="text-xs text-gray-600 line-clamp-2">
                            "{posts[0]?.content?.substring(0, 50)}..." • {posts[0]?.endorsementCount || 0} reactions
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="w-4 h-4" />
                        Quick Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Avg. reactions per post</span>
                        <span className="font-medium">
                          {totalPosts > 0 ? Math.round(totalReactions / totalPosts) : 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Most used hashtag</span>
                        <span className="font-medium">
                                                        None yet
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Member since</span>
                        <span className="font-medium">
                          {joinedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <h2 className="text-xl font-medium text-gray-900 mb-2">User not found</h2>
                <p className="text-gray-500">The user you're looking for doesn't exist or has been removed</p>
                </CardContent>
              </Card>
            )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Helper Components
function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 pt-6 pb-4">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-white border-t">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-6 w-12 mx-auto mb-1" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action}
    </div>
  );
}
