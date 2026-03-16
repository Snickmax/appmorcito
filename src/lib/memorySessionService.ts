import { supabase } from './supabase';
import {
  MemoryMetricsSummary,
  RecentMemorySession,
  MemoryGlobalLeaderboardRow,
  MemorySessionHistoryRow,
} from '../types/memory';

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

export async function fetchMyCoupleMemoryLeaderboard(params: {
  memorySetId: string | null;
  boardSize: number;
}) {
  const { memorySetId, boardSize } = params;

  const { data, error } = await supabase.rpc(
    'get_my_couple_memory_leaderboard',
    {
      p_memory_set_id: memorySetId,
      p_board_size: boardSize,
    }
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as MemoryLeaderboardRow[];
}

export async function fetchMyMemoryMetrics(params: {
  memorySetId: string | null;
  boardSize: number;
}) {
  const { memorySetId, boardSize } = params;

  const { data, error } = await supabase.rpc('get_my_memory_metrics', {
    p_memory_set_id: memorySetId,
    p_board_size: boardSize,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return (row ?? {
    total_sessions: 0,
    my_total_sessions: 0,
    couple_best_time_seconds: null,
    my_best_time_seconds: null,
    couple_best_moves: null,
    my_best_moves: null,
    improvement_percentage: 0,
  }) as MemoryMetricsSummary;
}

export async function fetchRecentMemorySessions(params: {
  memorySetId: string | null;
  limit?: number;
}) {
  const { memorySetId, limit = 10 } = params;

  const { data, error } = await supabase.rpc('get_my_memory_recent_sessions', {
    p_memory_set_id: memorySetId,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as RecentMemorySession[];
}

export async function fetchMyCoupleMemoryGlobalLeaderboard(params?: {
  boardSize?: number | null;
}) {
  const { boardSize = null } = params ?? {};

  const { data, error } = await supabase.rpc(
    'get_my_couple_memory_global_leaderboard',
    {
      p_board_size: boardSize,
    }
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as MemoryGlobalLeaderboardRow[];
}

export async function fetchMyMemorySessionHistory(params?: {
  memorySetId?: string | null;
  boardSize?: number | null;
  limit?: number;
}) {
  const {
    memorySetId = null,
    boardSize = null,
    limit = 50,
  } = params ?? {};

  const { data, error } = await supabase.rpc('get_my_memory_session_history', {
    p_memory_set_id: memorySetId,
    p_board_size: boardSize,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as MemorySessionHistoryRow[];
}

export async function fetchMyMemoryBestRuns(params?: {
  boardSize?: number | null;
  limit?: number;
}) {
  const {
    boardSize = null,
    limit = 50,
  } = params ?? {};

  const { data, error } = await supabase.rpc('get_my_memory_best_runs', {
    p_board_size: boardSize,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as MemorySessionHistoryRow[];
}