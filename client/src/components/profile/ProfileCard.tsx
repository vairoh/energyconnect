import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HashtagStats } from "./HashtagStats";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileCardProps {
  userId: number;
  minimized?: boolean;
}

export function ProfileCard({ userId, minimized = false }: ProfileCardProps) {
  const { data: profileData, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/profile`],
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="ml-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!profileData?.user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">User not found</p>
        </CardContent>
      </Card>
    );
  }
  
  const { user, endorsementStats } = profileData;
  
  // Generate initials for the avatar
  const initials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.username.substring(0, 2).toUpperCase();
  
  return (
    <Card className="overflow-hidden">
      <CardContent className={minimized ? "p-4" : "p-5"}>
        <div className="flex items-center">
          <div className={`${minimized ? 'h-10 w-10' : 'h-12 w-12'} rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3`}>
            <span className={`font-medium ${minimized ? 'text-base' : 'text-lg'}`}>{initials}</span>
          </div>
          <div>
            <h2 className={`${minimized ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>{user.fullName}</h2>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
        </div>
        
        {endorsementStats && endorsementStats.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Hashtag Reputation</h3>
            <HashtagStats stats={endorsementStats} />
          </div>
        )}
      </CardContent>
      
      {!minimized && (
        <CardFooter className="bg-gray-50 px-5 py-3">
          <Link href={`/profile/${user.id}`} className="text-primary hover:text-primary/80 text-sm font-medium">
            View full profile
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
