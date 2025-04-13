import { Star } from "lucide-react";

interface HashtagStat {
  hashtag: string;
  count: number;
}

interface HashtagStatsProps {
  stats: HashtagStat[];
}

export function HashtagStats({ stats }: HashtagStatsProps) {
  // Sort by count descending and take top 5
  const sortedStats = [...stats]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  if (sortedStats.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No endorsements yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {sortedStats.map((stat) => (
        <div className="flex items-center justify-between" key={stat.hashtag}>
          <span className="text-sm font-medium text-gray-600">{stat.hashtag}</span>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="ml-1 text-sm font-medium text-gray-700">{stat.count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
