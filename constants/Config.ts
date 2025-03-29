// Ensure these environment variables are set in your .env file
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
}

export const ACTIVITIES = {
  GAMES: 'games',
  MUSIC: 'music',
  DRAWING: 'drawing',
  JOURNAL: 'journal',
  COMMUNITY: 'community',
  BOOKS: 'books',
} as const;

export type Activity = typeof ACTIVITIES[keyof typeof ACTIVITIES];

export const ACTIVITY_LABELS: Record<Activity, string> = {
  [ACTIVITIES.GAMES]: 'Games',
  [ACTIVITIES.MUSIC]: 'Music',
  [ACTIVITIES.DRAWING]: 'Drawing',
  [ACTIVITIES.JOURNAL]: 'Journal',
  [ACTIVITIES.COMMUNITY]: 'Community',
  [ACTIVITIES.BOOKS]: 'Books',
};