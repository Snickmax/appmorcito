export type BoardSize = 2 | 4 | 6;

export type UploadedImage = {
  id: string;
  uri: string;
};

export type MemoryCardModel = {
  id: string;
  pairId: string;
  uri: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export type BestStat = {
  moves: number;
  time: number;
} | null;

export type BestStatsMap = Record<BoardSize, BestStat>;

export type MemoryImageSlot = {
  slotIndex: number;
  imageId: string | null;
  signedUrl: string | null;
  storagePath: string | null;
};

export type MemorySetSummary = {
  id: string;
  title: string;
  imageCount: number;
  sessionCount: number;
  createdAt: string;
};

export type MemoryMetricsSummary = {
  total_sessions: number;
  my_total_sessions: number;
  couple_best_time_seconds: number | null;
  my_best_time_seconds: number | null;
  couple_best_moves: number | null;
  my_best_moves: number | null;
  improvement_percentage: number;
};

export type RecentMemorySession = {
  session_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  nickname: string | null;
  board_size: number;
  moves: number;
  duration_seconds: number;
  completed_at: string;
};

export type MemoryGlobalLeaderboardRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  nickname: string | null;
  board_size: number;
  best_time_seconds: number;
  best_moves: number;
  avg_time_seconds: number;
  avg_moves: number;
  total_sessions: number;
  sets_played: number;
  last_played_at: string | null;
};

export type MemorySessionHistoryRow = {
  session_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  nickname: string | null;
  memory_set_id: string | null;
  set_title: string | null;
  board_size: number;
  moves: number;
  duration_seconds: number;
  completed_at: string;
};