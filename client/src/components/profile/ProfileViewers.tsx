import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { 
  Eye, 
  TrendingUp, 
  Users, 
  Calendar,
  BarChart3,
  Clock,
  User as UserIcon
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProfileViewersProps {
  userId: number;
  isOwnProfile: boolean;
}

interface ProfileViewer {
  viewer: {
    id: number;
    username: string;
    fullName: string;
  };
  viewedAt: string;
}

interface ProfileAnalytics {
  totalViews: number;
  recentViews: {
    date: string;
    count: number;
  }[];
  period: string;
}

export function ProfileViewers({ userId, isOwnProfile }: ProfileViewersProps) {
  const [viewLimit, setViewLimit] = useState(10);

  const { data: viewers, isLoading: viewersLoading } = useQuery({
    queryKey: [`/api/users/${userId}/profile-viewers`, viewLimit],
    queryFn: () => apiRequest("GET", `/api/users/${userId}/profile-viewers?limit=${viewLimit}`),
    enabled: isOwnProfile,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: [`/api/users/${userId}/profile-analytics`],
    queryFn: () => apiRequest("GET", `/api/users/${userId}/profile-analytics?days=7`),
    enabled: isOwnProfile,
  });

  if (!isOwnProfile) {
    return null;
  }

  if (viewersLoading || analyticsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Views
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalViews = analytics?.totalViews || 0;
  const recentViews = analytics?.recentViews || [];
  const recentViewers = viewers || [];

  const todayViews = recentViews.find(v => v.date === new Date().toISOString().split('T')[0])?.count || 0;
  const weeklyTotal = recentViews.reduce((sum, view) => sum + view.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-500" />
          Profile Views Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="viewers">Recent Viewers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">Total Views</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{totalViews}</div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Today</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{todayViews}</div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-purple-700">This Week</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{weeklyTotal}</div>
              </div>
            </div>

            {recentViewers.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Latest Viewers
                </h4>
                <div className="space-y-2">
                  {recentViewers.slice(0, 3).map((viewer: ProfileViewer) => (
                    <div key={`${viewer.viewer.id}-${viewer.viewedAt}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                          {viewer.viewer.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{viewer.viewer.fullName}</div>
                          <div className="text-sm text-gray-500">@{viewer.viewer.username}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(viewer.viewedAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="viewers" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Who Viewed Your Profile
              </h4>
              <Badge variant="secondary">{recentViewers.length} viewers</Badge>
            </div>

            {recentViewers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No profile views yet</p>
                <p className="text-sm">Share your profile to get more visibility!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentViewers.map((viewer: ProfileViewer) => (
                  <div key={`${viewer.viewer.id}-${viewer.viewedAt}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {viewer.viewer.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{viewer.viewer.fullName}</div>
                        <div className="text-sm text-gray-500">@{viewer.viewer.username}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatDistanceToNow(new Date(viewer.viewedAt), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(viewer.viewedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recentViewers.length >= viewLimit && (
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setViewLimit(prev => prev + 10)}
                  className="w-full"
                >
                  Load More Viewers
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4" />
              <h4 className="font-semibold">7-Day View Trends</h4>
            </div>

            {recentViews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No recent view data</p>
                <p className="text-sm">Views will appear here as people visit your profile</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentViews.map((dayData) => {
                  const date = new Date(dayData.date);
                  const isToday = dayData.date === new Date().toISOString().split('T')[0];
                  const maxCount = Math.max(...recentViews.map(v => v.count));
                  const percentage = maxCount > 0 ? (dayData.count / maxCount) * 100 : 0;

                  return (
                    <div key={dayData.date} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <Badge variant={isToday ? "default" : "secondary"}>
                          {dayData.count} views
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isToday ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Analytics Summary:</strong>
                <ul className="mt-2 space-y-1">
                  <li>• Views are tracked when authenticated users visit your profile</li>
                  <li>• Each user can only generate one view per hour to prevent spam</li>
                  <li>• Self-views are not counted in your analytics</li>
                  <li>• Data refreshes in real-time as new views are recorded</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 