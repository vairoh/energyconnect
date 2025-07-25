import { useState, useEffect } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/lib/auth";
import { MessageSquare, MoreHorizontal, Heart, Repeat2, Send } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getHashtagStyles } from "@/lib/hashtagColors";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Reaction types with emojis
const REACTIONS = {
  like: { emoji: "👍", label: "Like", color: "text-blue-500" },
  love: { emoji: "❤️", label: "Love", color: "text-red-500" },
  haha: { emoji: "😂", label: "Haha", color: "text-yellow-500" },
  wow: { emoji: "😮", label: "Wow", color: "text-orange-500" },
  sad: { emoji: "😢", label: "Sad", color: "text-blue-400" },
  angry: { emoji: "😠", label: "Angry", color: "text-red-600" },
} as const;

type ReactionType = keyof typeof REACTIONS;

export interface PostCardProps {
  post: {
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
    reactions?: { [key in ReactionType]?: number };
    currentUserReaction?: ReactionType | null;
  };
}

export function PostCard({ post }: PostCardProps) {
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(post.currentUserReaction || null);
  const [reactionCounts, setReactionCounts] = useState(post.reactions || {});
  const [showReactions, setShowReactions] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showRepostDialog, setShowRepostDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [repostMessage, setRepostMessage] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendToUser, setSendToUser] = useState("");

  useEffect(() => {
    setCurrentReaction(post.currentUserReaction || null);
    setReactionCounts(post.reactions || {});
    setEditedContent(post.content);
  }, [post]);

  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  const reactionMutation = useMutation({
    mutationFn: ({ postId, reaction }: { postId: number; reaction: ReactionType }) =>
      apiRequest("POST", "/api/reactions", { postId, reaction }).then((res) =>
        res.json(),
      ),
    onSuccess: (data, variables) => {
      const oldReaction = currentReaction;
      const newReaction = variables.reaction;
      
      // Update local state
      setCurrentReaction(newReaction);
      setReactionCounts(prev => {
        const updated = { ...prev };
        
        // Remove old reaction count
        if (oldReaction && updated[oldReaction]) {
          updated[oldReaction] = Math.max(0, updated[oldReaction] - 1);
        }
        
        // Add new reaction count
        updated[newReaction] = (updated[newReaction] || 0) + 1;
        
        return updated;
      });
      
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not add reaction",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: (editData: { content: string }) =>
      apiRequest("PUT", `/api/posts/${post.id}`, editData).then((res) =>
        res.json(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Post updated",
        description: "Your post has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not update post",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/posts/${post.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not delete post",
        variant: "destructive",
      });
    },
  });

  // Comments query - always fetch comments but only display when showComments is true
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => apiRequest("GET", `/api/posts/${post.id}/comments`).then(res => res.json()),
  });

  // Comment creation mutation
  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/posts/${post.id}/comments`, { content }).then(res => res.json()),
    onSuccess: () => {
      refetchComments();
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not add comment",
        variant: "destructive",
      });
    },
  });

  const handleReaction = (reaction: ReactionType) => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please login to react to posts",
        variant: "destructive",
      });
      return;
    }

    reactionMutation.mutate({ postId: post.id, reaction });
    setShowReactions(false);
  };

  // Calculate total reactions
  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + (count || 0), 0);
  
  // Get top reactions to display
  const topReactions = Object.entries(reactionCounts)
    .filter(([_, count]) => count && count > 0)
    .sort(([, a], [, b]) => (b || 0) - (a || 0))
    .slice(0, 3);

  const handleUpdate = () => {
    if (editedContent.trim() === "") {
      toast({
        title: "Error",
        description: "Post content cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    editMutation.mutate({ content: editedContent });
  };

  const handleDelete = () => {
    deleteMutation.mutate();
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

  const isAuthor = currentUser && currentUser.id === post.userId;

  return (
    <>
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
        <div className="flex items-center">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
            style={getHashtagStyles(post.hashtag)}
          >
            #{post.hashtag.replace("#", "").toLowerCase()}
          </span>
          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 ml-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="mb-4">
        <p className="text-gray-800">{post.content}</p>
      </div>
      <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            {/* Like Button */}
            <div 
              className="relative flex-1"
              onMouseEnter={() => {
                if (hoverTimeout) clearTimeout(hoverTimeout);
                setShowReactions(true);
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => setShowReactions(false), 200);
                setHoverTimeout(timeout);
              }}
            >
              <button
                className={`w-full text-sm flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-50 ${
                  currentReaction 
                    ? `${REACTIONS[currentReaction].color}` 
                    : "text-gray-600 hover:text-blue-500"
                }`}
                disabled={reactionMutation.isPending}
              >
                {currentReaction ? (
                  <>
                    <span className="text-lg">{REACTIONS[currentReaction].emoji}</span>
                    <span className="text-sm font-medium">{REACTIONS[currentReaction].label}</span>
                    {totalReactions > 0 && (
                      <span className="text-sm ml-1">{totalReactions}</span>
                    )}
                  </>
                ) : (
                  <>
                    <Heart className="h-5 w-5" />
                    <span className="text-sm">Like</span>
                    {totalReactions > 0 && (
                      <span className="text-sm ml-1">{totalReactions}</span>
                    )}
                  </>
                )}
              </button>

              {/* Reaction Picker Popup */}
              {showReactions && (
                <div 
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-full shadow-lg border border-gray-200 px-3 py-2 flex space-x-2 z-10"
                  onMouseEnter={() => {
                    if (hoverTimeout) clearTimeout(hoverTimeout);
                    setShowReactions(true);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setShowReactions(false), 200);
                    setHoverTimeout(timeout);
                  }}
                >
                  {Object.entries(REACTIONS).map(([key, reaction]) => (
                    <button
                      key={key}
                      onClick={() => handleReaction(key as ReactionType)}
                      className="text-2xl hover:scale-125 transition-transform duration-150 p-1 rounded-full hover:bg-gray-100"
                      title={reaction.label}
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Button */}
            <button 
              className="flex-1 text-sm text-gray-600 hover:text-blue-500 hover:bg-gray-50 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="h-5 w-5" />
              <span>Comment</span>
              {comments.length > 0 && (
                <span className="text-sm ml-1">{comments.length}</span>
              )}
            </button>

            {/* Repost Button */}
            <button 
              className="flex-1 text-sm text-gray-600 hover:text-green-500 hover:bg-gray-50 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors"
              onClick={() => setShowRepostDialog(true)}
            >
              <Repeat2 className="h-5 w-5" />
              <span>Repost</span>
            </button>

            {/* Send Button */}
        <button
              className="flex-1 text-sm text-gray-600 hover:text-purple-500 hover:bg-gray-50 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors"
              onClick={() => setShowSendDialog(true)}
            >
              <Send className="h-5 w-5" />
              <span>Send</span>
            </button>
          </div>


        </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 border-t pt-4 space-y-3">
          {/* Comment Input */}
          {currentUser ? (
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {currentUser.fullName?.charAt(0) || "U"}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newComment.trim()) {
                        createCommentMutation.mutate(newComment);
                      }
                    }}
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                  >
                    {createCommentMutation.isPending ? "Posting..." : "Comment"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Please login to comment on this post
            </p>
          )}

          {/* Comments List */}
          {comments.length > 0 && (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {comment.user?.fullName?.charAt(0) || "U"}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.user?.fullName || "Anonymous"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Make changes to your post. The hashtag cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Repost Dialog */}
      <Dialog open={showRepostDialog} onOpenChange={setShowRepostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repost to your feed</DialogTitle>
            <DialogDescription>
              Share this post with your network. Add your thoughts (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Original Post Preview */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {post.user?.fullName?.charAt(0) || post.isAnonymous ? "A" : "U"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {post.isAnonymous ? "Anonymous" : post.user?.fullName || "Unknown User"}
                  </p>
                  <p className="text-xs text-gray-500">{post.hashtag}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700">{post.content}</p>
            </div>
            
            {/* Repost Message */}
            <Textarea
              placeholder="Add your thoughts about this post..."
              value={repostMessage}
              onChange={(e) => setRepostMessage(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepostDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Create repost
                toast({
                  title: "Post shared!",
                  description: "This post has been shared to your feed",
                });
                setShowRepostDialog(false);
                setRepostMessage("");
              }}
            >
              Repost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send post</DialogTitle>
            <DialogDescription>
              Share this post with someone in your network.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Original Post Preview */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {post.user?.fullName?.charAt(0) || post.isAnonymous ? "A" : "U"}
          </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {post.isAnonymous ? "Anonymous" : post.user?.fullName || "Unknown User"}
                  </p>
                  <p className="text-xs text-gray-500">{post.hashtag}</p>
      </div>
    </div>
              <p className="text-sm text-gray-700">{post.content}</p>
            </div>
            
            {/* Send To */}
            <div>
              <label className="text-sm font-medium">Send to:</label>
              <input
                type="text"
                placeholder="Enter username or email..."
                value={sendToUser}
                onChange={(e) => setSendToUser(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* Send Message */}
            <Textarea
              placeholder="Add a personal message (optional)..."
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (sendToUser.trim()) {
                  toast({
                    title: "Post sent!",
                    description: `Post has been sent to ${sendToUser}`,
                  });
                  setShowSendDialog(false);
                  setSendMessage("");
                  setSendToUser("");
                } else {
                  toast({
                    title: "Please enter a recipient",
                    description: "You need to specify who to send this post to",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!sendToUser.trim()}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
