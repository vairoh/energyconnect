import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Hash, Sparkles, Eye, EyeOff, Send } from "lucide-react";
import { getHashtagStyles } from "@/lib/hashtagColors";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  content: z
    .string()
    .min(5, { message: "Post content must be at least 5 characters" })
    .max(500, { message: "Post content cannot exceed 500 characters" }),
  hashtag: z.string().min(1, { message: "A hashtag is required" }),
  isAnonymous: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface GeneralPostFormProps {
  onSuccess?: () => void;
}

export function GeneralPostForm({ onSuccess }: GeneralPostFormProps) {
  const { toast } = useToast();
  const [customHashtag, setCustomHashtag] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      hashtag: "",
      isAnonymous: false,
    },
  });

  const { data: trendingHashtags } = useQuery({
    queryKey: ["/api/hashtags/trending"],
  });

  const { data: commonHashtags } = useQuery({
    queryKey: ["/api/hashtags/common"],
  });

  const createPost = useMutation({
    mutationFn: (values: FormValues) => {
      let finalHashtag = values.hashtag;
      if (!finalHashtag.startsWith("#")) {
        finalHashtag = `#${finalHashtag}`;
      }

      return apiRequest("POST", "/api/posts", {
        content: values.content,
        hashtag: finalHashtag,
        type: "general",
        structuredData: null,
        isAnonymous: values.isAnonymous,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hashtags/trending"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      
      toast({
        title: "Post created! 🎉",
        description: "Your post has been published successfully",
      });
      form.reset();
      setCustomHashtag("");
      setSelectedHashtag("");
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: FormValues) {
    createPost.mutate(values);
  }

  const handleHashtagSelect = (hashtag: string) => {
    const cleanHashtag = hashtag.replace("#", "");
    setSelectedHashtag(hashtag);
    setCustomHashtag("");
    form.setValue("hashtag", cleanHashtag);
  };

  const handleCustomHashtagChange = (value: string) => {
    const cleanValue = value.replace("#", "");
    setCustomHashtag(cleanValue);
    setSelectedHashtag("");
    form.setValue("hashtag", cleanValue);
  };

  const allHashtags = [
    ...(trendingHashtags || []).map((t: any) => t.hashtag),
    ...(commonHashtags || []).map((tag: string) => `#${tag}`),
  ].filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Content Field */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="h-4 w-4 text-blue-500" />
                What's on your mind?
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your thoughts, ideas, or updates with the community..."
                  className="min-h-[120px] resize-none border-2 focus:border-blue-500 transition-colors"
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Express yourself freely</span>
                <span>{field.value.length}/500</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hashtag Selection */}
        <FormField
          control={form.control}
          name="hashtag"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-base font-semibold">
                <Hash className="h-4 w-4 text-purple-500" />
                Choose a hashtag
              </FormLabel>
              
              {/* Trending Hashtags */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-2">✨ Trending hashtags</p>
                  <div className="flex flex-wrap gap-2">
                    {allHashtags.slice(0, 8).map((hashtag) => (
                      <button
                        key={hashtag}
                        type="button"
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 transition-all hover:scale-105 ${
                          selectedHashtag === hashtag
                            ? "ring-2 ring-offset-2 ring-purple-400 scale-105"
                            : ""
                        }`}
                        style={getHashtagStyles(hashtag)}
                        onClick={() => handleHashtagSelect(hashtag)}
                      >
                        {hashtag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Hashtag Input */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">🎯 Or create your own</p>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Enter custom hashtag"
                      value={customHashtag}
                      onChange={(e) => handleCustomHashtagChange(e.target.value)}
                      className="pl-10 border-2 focus:border-purple-500"
                    />
                  </div>
                  {customHashtag && (
                    <div className="mt-2">
                      <Badge
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                        style={getHashtagStyles(`#${customHashtag}`)}
                      >
                        #{customHashtag}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Anonymous Toggle */}
        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2">
                <div className="flex items-center gap-3">
                  {field.value ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <FormLabel className="text-base font-medium">
                      {field.value ? "Anonymous post" : "Public post"}
                    </FormLabel>
                    <p className="text-sm text-gray-600">
                      {field.value 
                        ? "Your name will not be displayed" 
                        : "Your name will be visible to everyone"
                      }
                    </p>
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </div>
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createPost.isPending}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {createPost.isPending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Publishing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Publish Post
              </div>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 