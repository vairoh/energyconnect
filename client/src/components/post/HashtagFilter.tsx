import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { hashtagColors } from "@/lib/hashtagColors";
import { useWindowWidth } from "@/hooks/useWindowWidth";
import { useState } from "react";

const CORE_HASHTAGS = ["#job", "#event", "#news", "#question"];

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

  const windowWidth = useWindowWidth();
  const estimatedButtonWidth = 90;
  const maxFitHashtags =
    Math.floor(windowWidth / estimatedButtonWidth) - CORE_HASHTAGS.length - 1;

  const extraHashtags = (trendingHashtags || [])
    .map((t: any) => t.hashtag)
    .filter((tag: string) => !CORE_HASHTAGS.includes(tag))
    .slice(0, maxFitHashtags > 0 ? maxFitHashtags : 0);

  const allHashtags = [...CORE_HASHTAGS, ...extraHashtags];

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-3">Filter Posts</h2>
      <div className="flex flex-wrap items-center gap-2">
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
            variant={selectedHashtag === hashtag ? "default" : "outline"}
            size="sm"
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              selectedHashtag === hashtag
                ? "ring-2 ring-black bg-white text-black"
                : hashtagColors[hashtag.toLowerCase().replace("#", "")] ||
                  "bg-gray-100 text-gray-800"
            }`}
            onClick={() => onSelectHashtag(hashtag)}
          >
            {hashtag}
          </Button>
        ))}

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm px-3 py-1 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ height: "32px" }} // match Button height
        />
      </div>
    </div>
  );
}
