import { supabase } from './supabase';

export type MemoryLeaderboardRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  nickname: string | null;
  board_size: number;
  best_time_seconds: number;
  best_moves: number;
  total_sessions: number;
};

export async function createMemorySession(params: {
  coupleId: string;
  memorySetId: string | null;
  boardSize: number;
  moves: number;
  durationSeconds: number;
}) {
  const { coupleId, memorySetId, boardSize, moves, durationSeconds } = params;

  const { data, error } = await supabase.rpc('create_memory_session', {
    p_couple_id: coupleId,
    p_memory_set_id: memorySetId,
    p_board_size: boardSize,
    p_moves: moves,
    p_duration_seconds: durationSeconds,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function fetchMyCoupleMemoryLeaderboard(boardSize: number) {
  const { data, error } = await supabase.rpc(
    'get_my_couple_memory_leaderboard',
    {
      p_board_size: boardSize,
    }
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as MemoryLeaderboardRow[];
}