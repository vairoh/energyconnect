import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Hash,
  Send,
  Star,
  Globe,
  Ticket
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
  eventName: z.string().min(3, { message: "Event name must be at least 3 characters" }),
  eventType: z.string().min(1, { message: "Event type is required" }),
  date: z.string().min(1, { message: "Event date is required" }),
  time: z.string().min(1, { message: "Event time is required" }),
  location: z.string().min(2, { message: "Location is required" }),
  capacity: z.string().optional(),
  ticketPrice: z.string().optional(),
  description: z
    .string()
    .min(20, { message: "Event description must be at least 20 characters" })
    .max(1000, { message: "Event description cannot exceed 1000 characters" }),
  hashtag: z.string().min(1, { message: "A hashtag is required" }),
});

type FormValues = z.infer<typeof formSchema>;

interface EventPostFormProps {
  onSuccess?: () => void;
}

export function EventPostForm({ onSuccess }: EventPostFormProps) {
  const { toast } = useToast();
  const [customHashtag, setCustomHashtag] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: "",
      eventType: "",
      date: "",
      time: "",
      location: "",
      capacity: "",
      ticketPrice: "",
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

      // Format event post content
      const content = `🎉 ${values.eventName}

📅 Date: ${values.date}
🕐 Time: ${values.time}
📍 Location: ${values.location}
🎯 Type: ${values.eventType}${values.capacity ? `\n👥 Capacity: ${values.capacity}` : ''}${values.ticketPrice ? `\n🎫 Price: ${values.ticketPrice}` : ''}

${values.description}

#event #community #networking`;

      // Prepare structured data
      const structuredData = {
        eventName: values.eventName,
        eventType: values.eventType,
        date: values.date,
        time: values.time,
        location: values.location,
        capacity: values.capacity,
        ticketPrice: values.ticketPrice,
        description: values.description,
      };

      return apiRequest("POST", "/api/posts", {
        content,
        hashtag: finalHashtag,
        type: "event",
        structuredData,
        isAnonymous: false, // Event posts are never anonymous
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hashtags/trending"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      
      toast({
        title: "Event posted! 🎉",
        description: "Your event has been published successfully",
      });
      form.reset();
      setCustomHashtag("");
      setSelectedHashtag("");
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post event",
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

  // Event-specific hashtags
  const eventHashtags = [
    "#event", "#meetup", "#conference", "#workshop", "#webinar", "#networking", 
    "#community", "#tech", "#startup", "#learning", "#seminar", "#launch",
    "#celebration", "#hackathon", "#training", "#expo"
  ];

  const trendingEventHashtags = (trendingHashtags || [])
    .map((t: any) => t.hashtag)
    .filter((tag: string) => 
      eventHashtags.some(eventTag => 
        tag.toLowerCase().includes(eventTag.slice(1)) || 
        eventTag.toLowerCase().includes(tag.slice(1))
      )
    );

  const allEventHashtags = [...new Set([...trendingEventHashtags, ...eventHashtags])];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Event Name & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="eventName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Star className="h-4 w-4 text-orange-500" />
                  Event Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Tech Meetup 2024"
                    className="border-2 focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Globe className="h-4 w-4 text-orange-500" />
                  Event Type
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-2 focus:border-orange-500">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="meetup">Meetup</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                    <SelectItem value="hackathon">Hackathon</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="launch">Product Launch</SelectItem>
                    <SelectItem value="celebration">Celebration</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Event Date
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="border-2 focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Event Time
                </FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    className="border-2 focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="h-4 w-4 text-orange-500" />
                Location
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. San Francisco Convention Center or Online via Zoom"
                  className="border-2 focus:border-orange-500 transition-colors"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Capacity & Ticket Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4 text-orange-500" />
                  Capacity (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 100 people"
                    className="border-2 focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ticketPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                  <Ticket className="h-4 w-4 text-orange-500" />
                  Ticket Price (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Free, $25, $50-100"
                    className="border-2 focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Event Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-base font-semibold">
                <Star className="h-4 w-4 text-orange-500" />
                Event Description
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what the event is about, who should attend, what they'll learn or gain, and any special highlights..."
                  className="min-h-[120px] resize-none border-2 focus:border-orange-500 transition-colors"
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Make it engaging and informative</span>
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
                Event Category Hashtag
              </FormLabel>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-2">🎉 Event-related hashtags</p>
                  <div className="flex flex-wrap gap-2">
                    {allEventHashtags.slice(0, 12).map((hashtag) => (
                      <button
                        key={hashtag}
                        type="button"
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 transition-all hover:scale-105 ${
                          selectedHashtag === hashtag
                            ? "ring-2 ring-offset-2 ring-orange-400 scale-105"
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
                      placeholder="e.g. ai, blockchain, design"
                      value={customHashtag}
                      onChange={(e) => handleCustomHashtagChange(e.target.value)}
                      className="pl-10 border-2 focus:border-orange-500"
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
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {createPost.isPending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Publishing Event...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Publish Event
              </div>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 