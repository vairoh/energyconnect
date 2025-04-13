import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { XIcon } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  content: z
    .string()
    .min(5, { message: "Post content must be at least 5 characters" })
    .max(500, { message: "Post content cannot exceed 500 characters" }),
  hashtag: z.string().min(1, { message: "Hashtag is required" }),
  isAnonymous: z.boolean().default(false),
  customHashtag: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PostFormProps {
  onSuccess?: () => void;
}

export function PostForm({ onSuccess }: PostFormProps) {
  const { toast } = useToast();
  const [useCustomHashtag, setUseCustomHashtag] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      hashtag: "",
      isAnonymous: false,
      customHashtag: "",
    },
  });

  const { data: commonHashtags } = useQuery({
    queryKey: ["/api/hashtags/common"],
  });

  const createPost = useMutation({
    mutationFn: (values: FormValues) => {
      let finalHashtag = values.hashtag;
      if (useCustomHashtag && values.customHashtag) {
        finalHashtag = values.customHashtag;
        if (!finalHashtag.startsWith("#")) {
          finalHashtag = `#${finalHashtag}`;
        }
      }

      return apiRequest("POST", "/api/posts", {
        content: values.content,
        hashtag: finalHashtag,
        isAnonymous: values.isAnonymous,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Post created",
        description: "Your post has been published successfully",
      });
      form.reset();
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

  const handleCustomHashtagChange = (value: string) => {
    form.setValue("customHashtag", value);
    if (value.length > 0 && commonHashtags) {
      const filtered = commonHashtags.filter((tag: string) =>
        tag.toLowerCase().startsWith(value.toLowerCase()),
      );
      setSuggestedTags(filtered);
    } else {
      setSuggestedTags([]);
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-4 py-2 pb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Create a New Post
          </h2>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Post Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Share something with the energy community..."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Your post will be visible to all community members
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {!useCustomHashtag ? (
            <FormField
              control={form.control}
              name="hashtag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hashtag</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setUseCustomHashtag(true);
                        field.onChange("");
                      } else {
                        field.onChange(value);
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a hashtag" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {commonHashtags?.map((tag: string) => (
                        <SelectItem key={tag} value={`#${tag}`}>
                          #{tag}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom hashtag</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="customHashtag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Hashtag</FormLabel>
                  <div className="flex flex-col gap-2">
                    <div className="flex">
                      <FormControl>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                            #
                          </span>
                          <Input
                            placeholder="Enter custom hashtag"
                            className="pl-7"
                            {...field}
                            onChange={(e) =>
                              handleCustomHashtagChange(e.target.value)
                            }
                          />
                        </div>
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setUseCustomHashtag(false)}
                        className="ml-2"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    {suggestedTags.length > 0 && (
                      <div className="border bg-gray-50 rounded-md shadow-sm px-3 py-2 text-sm">
                        <p className="text-xs text-gray-500 mb-1">
                          Suggestions:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {suggestedTags.map((tag) => (
                            <Button
                              key={tag}
                              variant="ghost"
                              size="sm"
                              className="text-xs bg-gray-100"
                              onClick={() => {
                                form.setValue("customHashtag", tag);
                                setSuggestedTags([]);
                              }}
                            >
                              #{tag}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isAnonymous"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Post anonymously</FormLabel>
                  <FormDescription>
                    Your name will not be displayed with this post
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPost.isPending}>
              {createPost.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
}
