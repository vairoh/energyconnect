// Hash-based color generation for consistent hashtag colors
// Each unique hashtag will always get the same color across the entire app

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Convert HSL to RGB values
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };

  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Generate a consistent color for a hashtag using hash-based generation
 * Same hashtag will always produce the same color
 */
export function getHashtagColor(hashtag: string): { bg: string; text: string; border: string } {
  // Remove # if present and convert to lowercase for consistency
  const cleanHashtag = hashtag.replace('#', '').toLowerCase();
  
  // Generate hash from hashtag
  const hash = hashString(cleanHashtag);
  
  // Generate hue (0-360) from hash
  const hue = hash % 360;
  
  // Fixed saturation and lightness for consistency and readability
  const saturation = 65; // Good vibrancy without being too bright
  const lightness = 85;  // Light enough for dark text to be readable
  
  // Convert to RGB
  const [r, g, b] = hslToRgb(hue, saturation, lightness);
  
  // Create RGB color string
  const bgColor = `rgb(${r}, ${g}, ${b})`;
  
  // Generate a slightly darker border color
  const borderLightness = 75;
  const [br, bg_val, bb] = hslToRgb(hue, saturation, borderLightness);
  const borderColor = `rgb(${br}, ${bg_val}, ${bb})`;
  
  return {
    bg: bgColor,
    text: '#1f2937', // Dark gray text for good contrast
    border: borderColor
  };
}

/**
 * Get hashtag color as Tailwind-style inline styles
 */
export function getHashtagStyles(hashtag: string): React.CSSProperties {
  const colors = getHashtagColor(hashtag);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: '1px',
    borderStyle: 'solid'
  };
}

/**
 * Legacy support - keeping the old static colors for backward compatibility
 * These will be overridden by the hash-based system
 */
export const hashtagColors: Record<string, string> = {
  job: "bg-green-100 text-gray-900",
  event: "bg-yellow-100 text-gray-900",
  question: "bg-purple-100 text-gray-900",
  news: "bg-pink-100 text-gray-900",
};
