import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import {
  buildMockStats,
  CoupleStats,
  fetchCoupleStats,
  StatsPeriod,
} from '../lib/statsService';
import { formatCLP } from '../lib/expensesService';
import { fetchCategories } from '../lib/dateSpotsService';
import { DateCategory } from '../types/dates';
import StatBar from '../components/stats/StatBar';
import DonutChart from '../components/stats/DonutChart';
import LineChart from '../components/stats/LineChart';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

const MEMBER_COLORS = ['#D96A7E', '#8E4FA8'];
const EVENT_COLORS = ['#C84B55', '#8E4FA8', '#D96A7E', '#B07BC4', '#E89AAB', '#7C3043'];

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'year', label: 'Año' },
  { value: '3m', label: '3 meses' },
  { value: 'month', label: 'Mes' },
];

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function SectionHeader({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

export default function StatsScreen({ navigation }: Props) {
  const { coupleState, coupleMembers } = useAuth();

  const [realStats, setRealStats] = useState<CoupleStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const [dateCategoryId, setDateCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<DateCategory[]>([]);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    coupleMembers.forEach((member) => {
      map.set(
        member.user_id,
        member.nickname?.trim() || member.display_name?.trim() || 'miembro'
      );
    });
    return map;
  }, [coupleMembers]);

  const loadStats = useCallback(async () => {
    if (!coupleState?.couple_id) return;

    try {
      setIsLoading(true);
      const [data, categoryRows] = await Promise.all([
        fetchCoupleStats(coupleState.couple_id, { period, dateCategoryId }),
        fetchCategories(coupleState.couple_id),
      ]);
      setRealStats(data);
      setCategories(categoryRows);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas.');
    } finally {
      setIsLoading(false);
    }
  }, [coupleState?.couple_id, period, dateCategoryId]);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );

  const stats = useMemo<CoupleStats | null>(() => {
    if (demoMode && coupleMembers.length >= 2) {
      return buildMockStats([
        coupleMembers[0].user_id,
        coupleMembers[1].user_id,
      ]);
    }
    return realStats;
  }, [demoMode, coupleMembers, realStats]);

  const memberSegments = (values: Map<string, number>) =>
    coupleMembers.map((member, index) => ({
      label: nameByUserId.get(member.user_id) ?? 'miembro',
      value: values.get(member.user_id) ?? 0,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    }));

  const memberBars = (
    values: Map<string, number>,
    display?: (value: number) => string
  ) => {
    const max = Math.max(
      ...coupleMembers.map((member) => values.get(member.user_id) ?? 0),
      1
    );

    return coupleMembers.map((member, index) => {
      const value = values.get(member.user_id) ?? 0;
      return (
        <StatBar
          key={member.user_id}
          label={nameByUserId.get(member.user_id) ?? 'miembro'}
          value={value}
          maxValue={max}
          display={display ? display(value) : undefined}
          color={MEMBER_COLORS[index % MEMBER_COLORS.length]}
        />
      );
    });
  };

  const debtLine = useMemo(() => {
    if (!stats || coupleMembers.length < 2) return null;

    const [a, b] = coupleMembers;
    const balanceA = stats.expenses.balanceByUser.get(a.user_id) ?? 0;

    if (Math.abs(balanceA) < 1) return null;

    const debtor = balanceA < 0 ? a : b;
    const creditor = balanceA < 0 ? b : a;

    return `${nameByUserId.get(debtor.user_id)} le debe ${formatCLP(
      Math.abs(balanceA)
    )} a ${nameByUserId.get(creditor.user_id)}`;
  }, [stats, coupleMembers, nameByUserId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBar}>
          <Pressable
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.headerTitle}>Estadísticas</Text>
        </View>

        <Pressable
          style={[styles.demoToggle, demoMode && styles.demoToggleOn]}
          onPress={() => setDemoMode((prev) => !prev)}
        >
          <Ionicons
            name={demoMode ? 'eye' : 'eye-outline'}
            size={16}
            color={demoMode ? '#FFFFFF' : '#9E4258'}
          />
          <Text
            style={[styles.demoToggleText, demoMode && styles.demoToggleTextOn]}
          >
            {demoMode
              ? 'Viendo datos de ejemplo'
              : 'Ver con datos de ejemplo'}
          </Text>
        </Pressable>

        {isLoading && !demoMode ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#C84B55" />
          </View>
        ) : !stats ? null : (
          <>
            <View style={styles.card}>
              <SectionHeader icon="cash" title="Gastos" />

              {stats.expenses.hasData ? (
                <>
                  {debtLine ? (
                    <Text style={styles.highlight}>{debtLine}</Text>
                  ) : (
                    <View style={styles.settledRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#2E7D32"
                      />
                      <Text style={styles.settledText}>Cuentas saldadas</Text>
                    </View>
                  )}

                  <Text style={styles.sectionLabel}>
                    Gasto real de cada uno
                  </Text>
                  <DonutChart
                    segments={memberSegments(stats.expenses.consumedByUser)}
                    centerLabel={formatCLP(stats.expenses.total)}
                    centerSub="histórico"
                    formatValue={formatCLP}
                  />

                  <Text style={styles.sectionLabel}>
                    Evolución mensual (últimos 6 meses)
                  </Text>
                  <LineChart
                    data={stats.expenses.monthlySeries}
                    formatValue={formatCLP}
                  />

                  <View style={styles.miniRow}>
                    <View style={styles.miniBox}>
                      <Text style={styles.miniLabel}>Este mes</Text>
                      <Text style={styles.miniValue}>
                        {formatCLP(stats.expenses.monthTotal)}
                      </Text>
                    </View>
                    <View style={styles.miniBox}>
                      <Text style={styles.miniLabel}>Mes anterior</Text>
                      <Text style={styles.miniValue}>
                        {formatCLP(stats.expenses.prevMonthTotal)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>
                  Aún no registran gastos compartidos.
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <SectionHeader icon="location" title="Citas" />

              {stats.dates.hasData ? (
                <>
                  <Text style={styles.sectionLabel}>Estado de las citas</Text>
                  <DonutChart
                    segments={[
                      {
                        label: 'Realizadas',
                        value: stats.dates.done,
                        color: '#8E4FA8',
                      },
                      {
                        label: 'Pendientes',
                        value: stats.dates.pending,
                        color: '#D96A7E',
                      },
                    ]}
                    centerLabel={String(stats.dates.done + stats.dates.pending)}
                    centerSub="citas"
                  />

                  <Text style={styles.sectionLabel}>Citas propuestas</Text>
                  {memberBars(stats.dates.spotsCreatedByUser)}

                  <Text style={styles.sectionLabel}>Visitas registradas</Text>
                  {memberBars(stats.dates.visitsByUser)}

                  <Text style={styles.sectionLabel}>Fotos de recuerdos</Text>
                  {memberBars(stats.dates.photosByUser)}
                </>
              ) : (
                <Text style={styles.emptyText}>
                  Aún no tienen citas en el mapa.
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <SectionHeader icon="grid" title="Memorice" />

              {stats.memory.hasData ? (
                <>
                  <Text style={styles.sectionLabel}>Partidas jugadas</Text>
                  <DonutChart
                    segments={memberSegments(stats.memory.sessionsByUser)}
                    centerLabel={String(
                      coupleMembers.reduce(
                        (sum, member) =>
                          sum +
                          (stats.memory.sessionsByUser.get(member.user_id) ??
                            0),
                        0
                      )
                    )}
                    centerSub="partidas"
                  />

                  <Text style={styles.sectionLabel}>Mejor partida</Text>
                  {coupleMembers.map((member, index) => {
                    const best = stats.memory.bestByUser.get(member.user_id);
                    return (
                      <View key={member.user_id} style={styles.bestRow}>
                        <View
                          style={[
                            styles.bestDot,
                            {
                              backgroundColor:
                                MEMBER_COLORS[index % MEMBER_COLORS.length],
                            },
                          ]}
                        />
                        <Text style={styles.bestLine}>
                          {nameByUserId.get(member.user_id)}:{' '}
                          {best
                            ? `${best.moves} movimientos · ${formatDuration(best.seconds)}`
                            : 'sin partidas'}
                        </Text>
                      </View>
                    );
                  })}

                  <Pressable
                    style={styles.linkButton}
                    onPress={() => navigation.navigate('MemoryStats')}
                  >
                    <Ionicons name="podium" size={16} color="#9E4258" />
                    <Text style={styles.linkButtonText}>
                      Ver scoreboard completo
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.emptyText}>
                  Aún no juegan Memorice. ¡La primera partida espera!
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <SectionHeader icon="gift" title="Wishlist" />

              {stats.wishlist.hasData ? (
                <>
                  <Text style={styles.sectionLabel}>
                    Regalos comprados (quién regala más)
                  </Text>
                  <DonutChart
                    segments={memberSegments(stats.wishlist.purchasedByBuyer)}
                    centerLabel={String(
                      coupleMembers.reduce(
                        (sum, member) =>
                          sum +
                          (stats.wishlist.purchasedByBuyer.get(
                            member.user_id
                          ) ?? 0),
                        0
                      )
                    )}
                    centerSub="regalos"
                  />

                  <Text style={styles.sectionLabel}>Deseos activos</Text>
                  {memberBars(stats.wishlist.activeByOwner)}
                </>
              ) : (
                <Text style={styles.emptyText}>
                  La wishlist está vacía por ahora.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8B6BE',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  headerBar: {
    backgroundColor: '#D25F6B',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBackButton: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F4',
    borderRadius: 16,
    paddingVertical: 12,
  },
  demoToggleOn: {
    backgroundColor: '#8E4FA8',
  },
  demoToggleText: {
    color: '#9E4258',
    fontWeight: '900',
    fontSize: 13,
  },
  demoToggleTextOn: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 20,
  },
  highlight: {
    color: '#C84B55',
    fontWeight: '900',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 10,
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  settledText: {
    color: '#2E7D32',
    fontWeight: '900',
    fontSize: 14,
  },
  sectionLabel: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
    marginTop: 12,
    marginBottom: 10,
  },
  miniRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  miniBox: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  miniLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 4,
  },
  miniValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bestDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  bestLine: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 13,
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#9E4258',
    fontWeight: '900',
  },
  emptyText: {
    color: '#9E4258',
    fontWeight: '700',
  },
});
