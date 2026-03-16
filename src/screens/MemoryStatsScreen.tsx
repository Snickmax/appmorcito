import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  BoardSize,
  MemoryGlobalLeaderboardRow,
  MemorySessionHistoryRow,
  MemorySetSummary,
} from '../types/memory';
import { fetchMyMemorySessionHistory } from '../lib/memorySessionService';
import { getOrCreateMemorySets } from '../lib/memorySetService';
import { formatSeconds } from '../utils/memory';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryStats'>;

const BOARD_OPTIONS: Array<BoardSize | null> = [null, 2, 4, 6];
const HISTORY_LIMIT = 1000;
const BEST_RUNS_LIMIT = 30;

function sortRuns(a: MemorySessionHistoryRow, b: MemorySessionHistoryRow) {
  if (a.board_size !== b.board_size) {
    return a.board_size - b.board_size;
  }

  if (a.duration_seconds !== b.duration_seconds) {
    return a.duration_seconds - b.duration_seconds;
  }

  if (a.moves !== b.moves) {
    return a.moves - b.moves;
  }

  return (
    new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );
}

function buildLeaderboard(
  sessions: MemorySessionHistoryRow[]
): MemoryGlobalLeaderboardRow[] {
  const groups = new Map<
    string,
    {
      user_id: string;
      display_name: string | null;
      email: string | null;
      nickname: string | null;
      board_size: number;
      best_time_seconds: number;
      best_moves: number;
      total_time: number;
      total_moves: number;
      total_sessions: number;
      sets_played: Set<string>;
      last_played_at: string | null;
    }
  >();

  for (const row of sessions) {
    const key = `${row.user_id}-${row.board_size}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        user_id: row.user_id,
        display_name: row.display_name,
        email: row.email,
        nickname: row.nickname,
        board_size: row.board_size,
        best_time_seconds: row.duration_seconds,
        best_moves: row.moves,
        total_time: row.duration_seconds,
        total_moves: row.moves,
        total_sessions: 1,
        sets_played: new Set(row.memory_set_id ? [row.memory_set_id] : []),
        last_played_at: row.completed_at,
      });
      continue;
    }

    existing.best_time_seconds = Math.min(
      existing.best_time_seconds,
      row.duration_seconds
    );
    existing.best_moves = Math.min(existing.best_moves, row.moves);
    existing.total_time += row.duration_seconds;
    existing.total_moves += row.moves;
    existing.total_sessions += 1;

    if (row.memory_set_id) {
      existing.sets_played.add(row.memory_set_id);
    }

    if (
      !existing.last_played_at ||
      new Date(row.completed_at).getTime() >
        new Date(existing.last_played_at).getTime()
    ) {
      existing.last_played_at = row.completed_at;
    }
  }

  return Array.from(groups.values())
    .map((item) => ({
      user_id: item.user_id,
      display_name: item.display_name,
      email: item.email,
      nickname: item.nickname,
      board_size: item.board_size,
      best_time_seconds: item.best_time_seconds,
      best_moves: item.best_moves,
      avg_time_seconds:
        Math.round((item.total_time / item.total_sessions) * 100) / 100,
      avg_moves:
        Math.round((item.total_moves / item.total_sessions) * 100) / 100,
      total_sessions: item.total_sessions,
      sets_played: item.sets_played.size,
      last_played_at: item.last_played_at,
    }))
    .sort((a, b) => {
      if (a.board_size !== b.board_size) {
        return a.board_size - b.board_size;
      }
      if (a.best_time_seconds !== b.best_time_seconds) {
        return a.best_time_seconds - b.best_time_seconds;
      }
      if (a.best_moves !== b.best_moves) {
        return a.best_moves - b.best_moves;
      }
      if (a.total_sessions !== b.total_sessions) {
        return b.total_sessions - a.total_sessions;
      }

      const aLast = a.last_played_at ? new Date(a.last_played_at).getTime() : 0;
      const bLast = b.last_played_at ? new Date(b.last_played_at).getTime() : 0;

      if (aLast !== bLast) {
        return bLast - aLast;
      }

      const aName =
        a.nickname?.trim() ||
        a.display_name?.trim() ||
        a.email?.trim() ||
        '';
      const bName =
        b.nickname?.trim() ||
        b.display_name?.trim() ||
        b.email?.trim() ||
        '';

      return aName.localeCompare(bName, 'es');
    });
}

export default function MemoryStatsScreen({ navigation, route }: Props) {
  const { coupleState } = useAuth();

  const initialSetId = route.params?.selectedSetId ?? null;

  const [selectedBoardSize, setSelectedBoardSize] = useState<BoardSize | null>(
    null
  );
  const [memorySets, setMemorySets] = useState<MemorySetSummary[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(
    initialSetId
  );
  const [history, setHistory] = useState<MemorySessionHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const sets = await getOrCreateMemorySets();
      setMemorySets(sets);

      const validSelectedSetId =
        selectedSetId && sets.some((setItem) => setItem.id === selectedSetId)
          ? selectedSetId
          : null;

      if (selectedSetId !== validSelectedSetId) {
        setSelectedSetId(validSelectedSetId);
      }

      const historyData = await fetchMyMemorySessionHistory({
        memorySetId: validSelectedSetId,
        boardSize: selectedBoardSize,
        limit: HISTORY_LIMIT,
      });

      setHistory(historyData);
    } catch (error) {
      console.error(error);
      setMemorySets([]);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBoardSize, selectedSetId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!coupleState?.couple_id) return;

    const channel = supabase
      .channel(`memory-stats-${coupleState.couple_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_sessions',
          filter: `couple_id=eq.${coupleState.couple_id}`,
        },
        async () => {
          await refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_sets',
          filter: `couple_id=eq.${coupleState.couple_id}`,
        },
        async () => {
          await refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleState?.couple_id, refresh]);

  const selectedSetTitle = useMemo(() => {
    if (!selectedSetId) return 'Todos los sets';
    return memorySets.find((item) => item.id === selectedSetId)?.title ?? 'Set';
  }, [memorySets, selectedSetId]);

  const globalLeaderboard = useMemo(
    () => buildLeaderboard(history),
    [history]
  );

  const bestRuns = useMemo(
    () => [...history].sort(sortRuns).slice(0, BEST_RUNS_LIMIT),
    [history]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>

        <Text style={styles.title}>Scoreboard</Text>
        <Text style={styles.subtitle}>Ranking global, mejores runs e historial</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Filtro por tablero</Text>
          <View style={styles.filterRow}>
            {BOARD_OPTIONS.map((size) => {
              const selected = selectedBoardSize === size;
              const label = size == null ? 'Todos' : `${size}x${size}`;

              return (
                <Pressable
                  key={String(size)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSelectedBoardSize(size)}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Filtro por set</Text>
          <Text style={styles.helperText}>Actual: {selectedSetTitle}</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.setRow}
          >
            <Pressable
              style={[styles.setChip, !selectedSetId && styles.setChipSelected]}
              onPress={() => setSelectedSetId(null)}
            >
              <Text
                style={[
                  styles.setChipText,
                  !selectedSetId && styles.setChipTextSelected,
                ]}
              >
                Todos
              </Text>
            </Pressable>

            {memorySets.map((setItem) => {
              const selected = setItem.id === selectedSetId;

              return (
                <Pressable
                  key={setItem.id}
                  style={[styles.setChip, selected && styles.setChipSelected]}
                  onPress={() => setSelectedSetId(setItem.id)}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.setChipText,
                      selected && styles.setChipTextSelected,
                    ]}
                  >
                    {setItem.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ranking global por persona</Text>

          {isLoading ? (
            <ActivityIndicator color="#B94E65" />
          ) : globalLeaderboard.length ? (
            <View style={styles.list}>
              {globalLeaderboard.map((row, index) => {
                const label =
                  row.nickname?.trim() ||
                  row.display_name?.trim() ||
                  row.email?.trim() ||
                  'Sin nombre';

                return (
                  <View key={`${row.user_id}-${row.board_size}`} style={styles.item}>
                    <Text style={styles.itemTitle}>
                      {index + 1}. {label} · {row.board_size}x{row.board_size}
                    </Text>
                    <Text style={styles.itemMeta}>
                      Mejor tiempo: {formatSeconds(row.best_time_seconds)} · Mejor movimientos: {row.best_moves}
                    </Text>
                    <Text style={styles.itemMeta}>
                      Promedio tiempo: {formatSeconds(Math.round(row.avg_time_seconds || 0))} · Promedio movimientos: {Math.round(row.avg_moves || 0)}
                    </Text>
                    <Text style={styles.itemMeta}>
                      Partidas: {row.total_sessions} · Sets jugados: {row.sets_played}
                    </Text>
                    <Text style={styles.itemDate}>
                      Última partida:{' '}
                      {row.last_played_at
                        ? new Date(row.last_played_at).toLocaleString('es-CL')
                        : '--'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No hay datos aún.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top mejores runs</Text>

          {isLoading ? (
            <ActivityIndicator color="#B94E65" />
          ) : bestRuns.length ? (
            <View style={styles.list}>
              {bestRuns.map((row, index) => {
                const label =
                  row.nickname?.trim() ||
                  row.display_name?.trim() ||
                  row.email?.trim() ||
                  'Sin nombre';

                return (
                  <View key={row.session_id} style={styles.item}>
                    <Text style={styles.itemTitle}>
                      #{index + 1} · {label} · {row.board_size}x{row.board_size}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {formatSeconds(row.duration_seconds)} · {row.moves} movimientos
                    </Text>
                    <Text style={styles.itemMeta}>
                      Set: {row.set_title || 'Sin set'}
                    </Text>
                    <Text style={styles.itemDate}>
                      {new Date(row.completed_at).toLocaleString('es-CL')}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No hay mejores runs aún.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Historial</Text>

          {isLoading ? (
            <ActivityIndicator color="#B94E65" />
          ) : history.length ? (
            <View style={styles.list}>
              {history.map((row) => {
                const label =
                  row.nickname?.trim() ||
                  row.display_name?.trim() ||
                  row.email?.trim() ||
                  'Sin nombre';

                return (
                  <View key={row.session_id} style={styles.item}>
                    <Text style={styles.itemTitle}>
                      {label} · {row.board_size}x{row.board_size}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {formatSeconds(row.duration_seconds)} · {row.moves} movimientos
                    </Text>
                    <Text style={styles.itemMeta}>
                      Set: {row.set_title || 'Sin set'}
                    </Text>
                    <Text style={styles.itemDate}>
                      {new Date(row.completed_at).toLocaleString('es-CL')}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No hay historial aún.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFD4E0' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFE7EE',
  },
  backButtonText: { color: '#9E4258', fontWeight: '700' },
  title: { fontSize: 30, fontWeight: '800', color: '#7C3043' },
  subtitle: { marginTop: 6, fontSize: 15, color: '#9E4258' },
  card: {
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3B9C7',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7C3043',
    marginBottom: 12,
  },
  helperText: {
    color: '#9E4258',
    fontWeight: '600',
    marginBottom: 10,
  },
  filterRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFE1E9',
  },
  chipSelected: { backgroundColor: '#C84B55' },
  chipText: { color: '#9E4258', fontWeight: '700' },
  chipTextSelected: { color: '#FFFFFF' },
  setRow: {
    gap: 10,
    paddingBottom: 6,
  },
  setChip: {
    maxWidth: 160,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#FFE1E9',
  },
  setChipSelected: {
    backgroundColor: '#C84B55',
  },
  setChipText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  setChipTextSelected: {
    color: '#FFFFFF',
  },
  list: { gap: 10 },
  item: {
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 12,
  },
  itemTitle: { color: '#7C3043', fontWeight: '800', marginBottom: 4 },
  itemMeta: { color: '#9E4258', fontWeight: '600' },
  itemDate: { color: '#9E4258', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#9E4258', fontWeight: '600' },
});