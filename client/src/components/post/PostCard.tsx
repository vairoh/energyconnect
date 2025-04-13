import { useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/lib/auth";
import { ThumbsUp, MessageSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { hashtagColors } from "@/lib/hashtagColors";

export interface PostCardProps {
  post: {
    id: number;
    content: string;
    hashtag: string;
    createdAt: string;
    isAnonymous: boolean;
    user?: {
      id: number;
      fullName: string;
      username: string;
    } | null;
    endorsementCount: number;
    currentUserEndorsed: boolean;
  };
}

export function PostCard({ post }: PostCardProps) {
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const [localEndorsed, setLocalEndorsed] = useState(post.currentUserEndorsed);
  const [localEndorsementCount, setLocalEndorsementCount] = useState(
    post.endorsementCount,
  );

  const endorseMutation = useMutation({
    mutationFn: (postId: number) =>
      apiRequest("POST", "/api/endorsements", { postId }).then((res) =>
        res.json(),
      ),
    onSuccess: () => {
      setLocalEndorsed(true);
      setLocalEndorsementCount((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not endorse post",
        variant: "destructive",
      });
    },
  });

  const handleEndorse = () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please login to endorse posts",
        variant: "destructive",
      });
      return;
    }

    if (localEndorsed) {
      toast({
        title: "Already endorsed",
        description: "You've already endorsed this post",
      });
      return;
    }

    endorseMutation.mutate(post.id);
  };

  const createdAt = new Date(post.createdAt);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  // Generate initials for avatar
  const initials = post.user?.fullName
    ? post.user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center">
            {post.isAnonymous ? (
              <div className="text-gray-500 mr-3 italic">Anonymous</div>
            ) : post.user ? (
              <>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                  <span className="font-medium">{initials}</span>
                </div>
                <div>
                  <Link href={`/profile/${post.user.id}`}>
                    <h3 className="font-medium text-gray-900 hover:text-primary cursor-pointer">
                      {post.user.fullName}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-500">{timeAgo}</p>
                </div>
              </>
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
            )}
          </div>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
              hashtagColors[post.hashtag.toLowerCase().replace("#", "")] ||
              "bg-gray-100 text-gray-800"
            }`}
          >
            #{post.hashtag.replace("#", "").toLowerCase()}
          </span>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-gray-800">{post.content}</p>
      </div>
      <div className="border-t border-gray-100 pt-3 flex justify-between">
        <button
          className={`text-sm ${localEndorsed ? "text-primary" : "text-gray-500 hover:text-primary"} flex items-center space-x-1 group`}
          onClick={handleEndorse}
          disabled={endorseMutation.isPending || localEndorsed}
        >
          <ThumbsUp
            className={`h-5 w-5 ${localEndorsed ? "text-primary" : "text-gray-400 group-hover:text-primary"}`}
          />
          <span>
            {endorseMutation.isPending
              ? "Endorsing..."
              : `Endorse (${localEndorsementCount})`}
          </span>
        </button>
        <button className="text-sm text-gray-500 hover:text-primary flex items-center space-x-1">
          <MessageSquare className="h-5 w-5 text-gray-400" />
          <span>Reply</span>
        </button>
      </div>
    </div>
  );
}
