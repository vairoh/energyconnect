import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Users, 
  Hash,
  Send,
  Building,
  GraduationCap
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  jobTitle: z.string().min(3, { message: "Job title must be at least 3 characters" }),
  company: z.string().min(2, { message: "Company name is required" }),
  location: z.string().min(2, { message: "Location is required" }),
  jobType: z.string().min(1, { message: "Job type is required" }),
  experience: z.string().min(1, { message: "Experience level is required" }),
  salary: z.string().optional(),
  description: z
    .string()
    .min(20, { message: "Job description must be at least 20 characters" })
    .max(1000, { message: "Job description cannot exceed 1000 characters" }),
  hashtag: z.string().min(1, { message: "A hashtag is required" }),
});

type FormValues = z.infer<typeof formSchema>;

interface JobPostFormProps {
  onSuccess?: () => void;
}

export function JobPostForm({ onSuccess }: JobPostFormProps) {
  const { toast } = useToast();
  const [customHashtag, setCustomHashtag] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: "",
      company: "",
      location: "",
      jobType: "",
      experience: "",
      salary: "",
      description: "",
      hashtag: "",
    },
  });

  const { data: trendingHashtags } = useQuery({
    queryKey: ["/api/hashtags/trending"],
  });

  const createPost = useMutation({
    mutationFn: (values: FormValues) => {
      let finalHashtag = values.hashtag;
      if (!finalHashtag.startsWith("#")) {
        finalHashtag = `#${finalHashtag}`;
      }

      // Format job post content
      const content = `🚀 ${values.jobTitle} at ${values.company}

📍 Location: ${values.location}
💼 Type: ${values.jobType}
⭐ Experience: ${values.experience}${values.salary ? `\n💰 Salary: ${values.salary}` : ''}

${values.description}

#hiring #jobs #career`;

      // Prepare structured data
      const structuredData = {
        jobTitle: values.jobTitle,
        company: values.company,
        location: values.location,
        jobType: values.jobType,
        experience: values.experience,
        salary: values.salary,
        description: values.description,
      };

      return apiRequest("POST", "/api/posts", {
        content,
        hashtag: finalHashtag,
        type: "job",
        structuredData,
        isAnonymous: false, // Job posts are never anonymous
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hashtags/trending"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      
      toast({
        title: "Job posted! 💼",
        description: "Your job opportunity has been published successfully",
      });
      form.reset();
      setCustomHashtag("");
      setSelectedHashtag("");
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post job",
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

  // Job-specific hashtags
  const jobHashtags = [
    "#job", "#hiring", "#career", "#remote", "#fulltime", "#parttime", 
    "#internship", "#freelance", "#tech", "#engineering", "#marketing", 
    "#sales", "#design", "#finance", "#startup", "#developer"
  ];

  const trendingJobHashtags = (trendingHashtags || [])
    .map((t: any) => t.hashtag)
    .filter((tag: string) => 
      jobHashtags.some(jobTag => 
        tag.toLowerCase().includes(jobTag.slice(1)) || 
        jobTag.toLowerCase().includes(tag.slice(1))
      )
    );

  const allJobHashtags = [...new Set([...trendingJobHashtags, ...jobHashtags])];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Job Title & Company */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Briefcase className="h-4 w-4 text-green-500" />
                  Job Title
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Senior Software Engineer"
                    className="border-2 focus:border-green-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Building className="h-4 w-4 text-green-500" />
                  Company
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. TechCorp Inc."
                    className="border-2 focus:border-green-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location & Job Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <MapPin className="h-4 w-4 text-green-500" />
                  Location
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. San Francisco, CA or Remote"
                    className="border-2 focus:border-green-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="jobType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-green-500" />
                  Job Type
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-2 focus:border-green-500">
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Experience & Salary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <GraduationCap className="h-4 w-4 text-green-500" />
                  Experience Level
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-2 focus:border-green-500">
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                    <SelectItem value="senior">Senior Level (5-8 years)</SelectItem>
                    <SelectItem value="lead">Lead/Principal (8+ years)</SelectItem>
                    <SelectItem value="executive">Executive Level</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Salary Range (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. $80,000 - $120,000"
                    className="border-2 focus:border-green-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Job Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4 text-green-500" />
                Job Description
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the role, responsibilities, requirements, and what makes this opportunity exciting..."
                  className="min-h-[120px] resize-none border-2 focus:border-green-500 transition-colors"
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Include key responsibilities and requirements</span>
                <span>{field.value.length}/1000</span>
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
                Job Category Hashtag
              </FormLabel>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-2">💼 Job-related hashtags</p>
                  <div className="flex flex-wrap gap-2">
                    {allJobHashtags.slice(0, 12).map((hashtag) => (
                      <button
                        key={hashtag}
                        type="button"
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 transition-all hover:scale-105 ${
                          selectedHashtag === hashtag
                            ? "ring-2 ring-offset-2 ring-green-400 scale-105"
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

                <div>
                  <p className="text-sm text-gray-600 mb-2">🎯 Or create a specific category</p>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="e.g. frontend, backend, devops"
                      value={customHashtag}
                      onChange={(e) => handleCustomHashtagChange(e.target.value)}
                      className="pl-10 border-2 focus:border-green-500"
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

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createPost.isPending}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {createPost.isPending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Posting Job...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Post Job
              </div>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 