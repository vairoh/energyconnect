import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getHashtagStyles } from "@/lib/hashtagColors";
import { useState } from "react";

interface HashtagFilterProps {
  selectedHashtag: string | null;
  onSelectHashtag: (hashtag: string | null) => void;
}

export function HashtagFilter({
  selectedHashtag,
  onSelectHashtag,
}: HashtagFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: trendingHashtags } = useQuery({
    queryKey: ["/api/hashtags/trending"],
  });

  // Get top 5 trending hashtags for filter
  const recentHashtags = (trendingHashtags || [])
    .map((t: any) => t.hashtag)
    .slice(0, 5); // Limit to exactly 5 hashtags

  const allHashtags = recentHashtags;

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-3">Filter Posts</h2>
      <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
        <Button
          variant={selectedHashtag === null ? "default" : "outline"}
          size="sm"
          className={`rounded-full px-3 py-1 ${
            selectedHashtag === null
              ? "bg-black text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-800"
          }`}
          onClick={() => onSelectHashtag(null)}
        >
          All
        </Button>

        {allHashtags.map((hashtag) => (
          <Button
            key={hashtag}
            variant="outline"
            size="sm"
            className={`rounded-full px-3 py-1 text-sm font-semibold border-2 transition-all ${
              selectedHashtag === hashtag
                ? "ring-2 ring-offset-2 ring-gray-400 scale-105"
                : "hover:scale-105"
            }`}
            style={getHashtagStyles(hashtag)}
            onClick={() => onSelectHashtag(hashtag)}
          >
            {hashtag}
          </Button>
        ))}

        <input
          type="text"
          placeholder="Search hashtags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm px-3 py-1 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0 w-32 md:w-40"
          style={{ height: "32px" }} // match Button height
        />
      </div>
    </div>
  );
}
