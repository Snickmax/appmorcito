import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { MemoryCard } from "../components/MemoryCard";
import { ZoomableBoardCanvas } from "../components/ZoomableBoardCanvas";
import { useMemoryGame } from "../hooks/useMemoryGame";
import {
  BestStatsMap,
  BoardSize,
  MemoryImageSlot,
  UploadedImage,
} from "../types/memory";
import { formatSeconds, requiredImagesForSize } from "../utils/memory";
import { useAuth } from "../providers/AuthProvider";
import {
  deleteSlots,
  loadMemorySlots,
  MAX_MEMORY_IMAGES,
  uploadAssetsIntoSlots,
} from "../lib/memorySetService";
import {
  createMemorySession,
  fetchMyCoupleMemoryLeaderboard,
  MemoryLeaderboardRow,
} from "../lib/memorySessionService";

type Props = NativeStackScreenProps<RootStackParamList, "MemoryGame">;

const STORAGE_KEY = "memory_best_stats_v1";

const INITIAL_STATS: BestStatsMap = {
  2: null,
  4: null,
  6: null,
};

const BOARD_OPTIONS: BoardSize[] = [2, 4, 6];

export default function MemoryGameScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const { coupleState, session } = useAuth();

  const {
    boardSize,
    cards,
    moves,
    elapsedSeconds,
    isWon,
    isGameStarted,
    startGame,
    resetGame,
    flipCard,
  } = useMemoryGame();

  const [selectedSize, setSelectedSize] = useState<BoardSize>(2);
  const [bestStats, setBestStats] = useState<BestStatsMap>(INITIAL_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [memorySetId, setMemorySetId] = useState<string | null>(null);
  const [slots, setSlots] = useState<MemoryImageSlot[]>([]);
  const [selectedSlotIndexes, setSelectedSlotIndexes] = useState<number[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);

  const [leaderboardRows, setLeaderboardRows] = useState<
    MemoryLeaderboardRow[]
  >([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  const winSavedRef = useRef(false);

  const requiredImages = requiredImagesForSize(selectedSize);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as BestStatsMap;
        setBestStats({
          2: parsed[2] ?? null,
          4: parsed[4] ?? null,
          6: parsed[6] ?? null,
        });
      } catch {
      } finally {
        setIsLoadingStats(false);
      }
    };

    void loadStats();
  }, []);

  useEffect(() => {
    if (!isWon || !boardSize) return;

    setBestStats((prev) => {
      const current = prev[boardSize];
      const nextValue =
        !current ||
        moves < current.moves ||
        (moves === current.moves && elapsedSeconds < current.time)
          ? { moves, time: elapsedSeconds }
          : current;

      const next = {
        ...prev,
        [boardSize]: nextValue,
      };

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [isWon, boardSize, moves, elapsedSeconds]);

  const loadLeaderboard = async (size: BoardSize) => {
    try {
      setIsLoadingLeaderboard(true);
      const data = await fetchMyCoupleMemoryLeaderboard(size);
      setLeaderboardRows(data);
    } catch (error) {
      console.error(error);
      setLeaderboardRows([]);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    void loadLeaderboard(selectedSize);
  }, [selectedSize, coupleState?.couple_id]);

  const reloadLibrary = async () => {
    const coupleId = coupleState?.couple_id;
    const userId = session?.user?.id;

    if (!coupleId || !userId) {
      setMemorySetId(null);
      setSlots([]);
      setSelectedSlotIndexes([]);
      setIsLoadingLibrary(false);
      return;
    }

    try {
      const data = await loadMemorySlots(coupleId, userId);
      setMemorySetId(data.memorySetId);
      setSlots(data.slots);
      setSelectedSlotIndexes((prev) =>
        prev.filter((slotIndex) => data.slots[slotIndex]?.imageId),
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo cargar el set compartido.");
    } finally {
      setIsLoadingLibrary(false);
      setIsSyncingLibrary(false);
    }
  };

  useEffect(() => {
    setIsLoadingLibrary(true);
    void reloadLibrary();
  }, [coupleState?.couple_id, session?.user?.id]);

  const filledSlots = useMemo(
    () => slots.filter((slot) => !!slot.imageId),
    [slots],
  );

  const freeSlots = useMemo(
    () => slots.filter((slot) => !slot.imageId).map((slot) => slot.slotIndex),
    [slots],
  );

  const selectedFilledSlots = useMemo(
    () =>
      selectedSlotIndexes.filter(
        (slotIndex) =>
          !!slots.find((slot) => slot.slotIndex === slotIndex)?.imageId,
      ),
    [selectedSlotIndexes, slots],
  );

  const playableImages: UploadedImage[] = useMemo(
    () =>
      filledSlots
        .filter((slot) => slot.imageId && slot.signedUrl)
        .map((slot) => ({
          id: slot.imageId as string,
          uri: slot.signedUrl as string,
        })),
    [filledSlots],
  );

  const currentBest = bestStats[selectedSize];

  const toggleSlotSelection = (slotIndex: number) => {
    const slot = slots.find((item) => item.slotIndex === slotIndex);
    if (!slot?.imageId) return;

    setSelectedSlotIndexes((prev) =>
      prev.includes(slotIndex)
        ? prev.filter((value) => value !== slotIndex)
        : [...prev, slotIndex].sort((a, b) => a - b),
    );
  };

  const handleAddPhotos = async () => {
    const coupleId = coupleState?.couple_id;
    const userId = session?.user?.id;

    if (!coupleId || !userId || !memorySetId) return;

    if (freeSlots.length === 0) {
      Alert.alert("Límite alcanzado", "Ya tienes las 18 imágenes cargadas.");
      return;
    }

    try {
      setIsSyncingLibrary(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: freeSlots.length,
        quality: 1,
        mediaTypes: ["images"],
      });

      if (result.canceled || !result.assets?.length) {
        setIsSyncingLibrary(false);
        return;
      }

      const assets = result.assets.slice(0, freeSlots.length);
      const targetSlots = freeSlots.slice(0, assets.length);

      await uploadAssetsIntoSlots({
        coupleId,
        userId,
        memorySetId,
        slotIndexes: targetSlots,
        assets,
      });

      await reloadLibrary();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron agregar las imágenes.");
      setIsSyncingLibrary(false);
    }
  };

  const handleReplaceSelected = async () => {
    const coupleId = coupleState?.couple_id;
    const userId = session?.user?.id;

    if (!coupleId || !userId || !memorySetId) return;

    if (!selectedFilledSlots.length) {
      Alert.alert(
        "Sin selección",
        "Selecciona una o más imágenes para cambiar.",
      );
      return;
    }

    try {
      setIsSyncingLibrary(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: selectedFilledSlots.length,
        quality: 1,
        mediaTypes: ["images"],
      });

      if (result.canceled || !result.assets?.length) {
        setIsSyncingLibrary(false);
        return;
      }

      if (result.assets.length !== selectedFilledSlots.length) {
        Alert.alert(
          "Cantidad inválida",
          `Debes elegir exactamente ${selectedFilledSlots.length} imágenes para reemplazar la selección.`,
        );
        setIsSyncingLibrary(false);
        return;
      }

      await uploadAssetsIntoSlots({
        coupleId,
        userId,
        memorySetId,
        slotIndexes: selectedFilledSlots,
        assets: result.assets,
      });

      await reloadLibrary();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron reemplazar las imágenes.");
      setIsSyncingLibrary(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!memorySetId || !selectedFilledSlots.length) {
      Alert.alert(
        "Sin selección",
        "Selecciona una o más imágenes para eliminar.",
      );
      return;
    }

    Alert.alert(
      "Eliminar imágenes",
      `Se eliminarán ${selectedFilledSlots.length} imágenes del set.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSyncingLibrary(true);
              await deleteSlots({
                memorySetId,
                slotIndexes: selectedFilledSlots,
              });
              setSelectedSlotIndexes([]);
              await reloadLibrary();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "No se pudieron eliminar las imágenes.");
              setIsSyncingLibrary(false);
            }
          },
        },
      ],
    );
  };

  const handleStartGame = () => {
    if (playableImages.length < requiredImages) {
      Alert.alert(
        "Faltan imágenes",
        `Para un tablero ${selectedSize}x${selectedSize} necesitas al menos ${requiredImages} imágenes.`,
      );
      return;
    }

    winSavedRef.current = false;

    startGame({
      size: selectedSize,
      images: playableImages,
    });
  };

  const handlePlayAgain = () => {
    winSavedRef.current = false;

    startGame({
      size: selectedSize,
      images: playableImages,
    });
  };

  const handleChangeMode = () => {
    winSavedRef.current = false;
    resetGame();
  };

  useEffect(() => {
    if (
      !isWon ||
      !boardSize ||
      !coupleState?.couple_id ||
      !memorySetId ||
      winSavedRef.current
    ) {
      return;
    }

    winSavedRef.current = true;

    const saveWin = async () => {
      try {
        await createMemorySession({
          coupleId: coupleState.couple_id,
          memorySetId,
          boardSize,
          moves,
          durationSeconds: elapsedSeconds,
        });

        await loadLeaderboard(boardSize as BoardSize);
      } catch (error) {
        console.error(error);
        Alert.alert(
          "Aviso",
          "Ganaste la partida, pero no se pudo guardar la sesión en Supabase.",
        );
      }
    };

    void saveWin();
  }, [
    isWon,
    boardSize,
    moves,
    elapsedSeconds,
    coupleState?.couple_id,
    memorySetId,
  ]);

  const activeBoardSize = boardSize ?? selectedSize;
  const gap = 10;

  const cardSize =
    activeBoardSize === 2
      ? Math.min(width * 0.38, 170)
      : activeBoardSize === 4
        ? Math.min(width * 0.5, 150)
        : Math.min(width * 0.5, 120);

  const boardPixelWidth =
    activeBoardSize * cardSize + (activeBoardSize - 1) * gap;
  const boardPixelHeight =
    activeBoardSize * cardSize + (activeBoardSize - 1) * gap;

  const boardViewportWidth = width - 24;
  const boardViewportHeight = Math.max(260, height - 330);

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </Pressable>

      <Text style={styles.title}>Memorice</Text>
      <Text style={styles.subtitle}>Set compartido de hasta 18 imágenes</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {!isGameStarted ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderHeader()}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Juego</Text>

            <Text style={styles.label}>Tamaño del tablero</Text>

            <View style={styles.sizeRow}>
              {BOARD_OPTIONS.map((size) => {
                const selected = size === selectedSize;

                return (
                  <Pressable
                    key={size}
                    style={[
                      styles.sizeChip,
                      selected && styles.sizeChipSelected,
                    ]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        selected && styles.sizeChipTextSelected,
                      ]}
                    >
                      {size}x{size}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.helperText}>
              Para {selectedSize}x{selectedSize} necesitas {requiredImages}{" "}
              imágenes.
            </Text>

            <View style={styles.bestStatsCard}>
              <Text style={styles.bestStatsTitle}>Mejor marca local</Text>
              {isLoadingStats ? (
                <ActivityIndicator color="#B94E65" />
              ) : (
                <Text style={styles.bestStatsText}>
                  {currentBest
                    ? `${selectedSize}x${selectedSize}: ${currentBest.moves} movimientos · ${formatSeconds(currentBest.time)}`
                    : `${selectedSize}x${selectedSize}: sin registro`}
                </Text>
              )}
            </View>

            <View style={styles.leaderboardCard}>
              <Text style={styles.bestStatsTitle}>
                Ranking de la pareja {selectedSize}x{selectedSize}
              </Text>

              {isLoadingLeaderboard ? (
                <ActivityIndicator color="#B94E65" />
              ) : leaderboardRows.length ? (
                <View style={styles.leaderboardList}>
                  {leaderboardRows.map((row, index) => {
                    const label =
                      row.nickname?.trim() ||
                      row.display_name?.trim() ||
                      row.email?.trim() ||
                      "Sin nombre";

                    return (
                      <View
                        key={`${row.user_id}-${row.board_size}`}
                        style={styles.leaderboardItem}
                      >
                        <Text style={styles.leaderboardName}>
                          {index + 1}. {label}
                        </Text>
                        <Text style={styles.leaderboardMeta}>
                          {formatSeconds(row.best_time_seconds)} ·{" "}
                          {row.best_moves} movimientos · {row.total_sessions}{" "}
                          partidas
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.bestStatsText}>
                  Aún no hay partidas guardadas para este tablero.
                </Text>
              )}
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                (playableImages.length < requiredImages || isSyncingLibrary) &&
                  styles.disabledButton,
              ]}
              onPress={handleStartGame}
              disabled={
                playableImages.length < requiredImages || isSyncingLibrary
              }
            >
              <Text style={styles.primaryButtonText}>Iniciar juego</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Biblioteca compartida</Text>

            <Text style={styles.helperText}>
              Imágenes cargadas: {filledSlots.length}/{MAX_MEMORY_IMAGES} ·
              Seleccionadas: {selectedFilledSlots.length}
            </Text>

            {isLoadingLibrary ? (
              <ActivityIndicator color="#B94E65" />
            ) : (
              <>
                <View style={styles.actionsBlock}>
                  <Pressable
                    style={[
                      styles.primaryButton,
                      (!freeSlots.length || isSyncingLibrary) &&
                        styles.disabledButton,
                    ]}
                    onPress={handleAddPhotos}
                    disabled={!freeSlots.length || isSyncingLibrary}
                  >
                    {isSyncingLibrary ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Agregar fotos ({freeSlots.length} libres)
                      </Text>
                    )}
                  </Pressable>

                  <View style={styles.inlineActions}>
                    <Pressable
                      style={[
                        styles.secondaryButton,
                        (!selectedFilledSlots.length || isSyncingLibrary) &&
                          styles.disabledButton,
                      ]}
                      onPress={handleReplaceSelected}
                      disabled={!selectedFilledSlots.length || isSyncingLibrary}
                    >
                      <Text style={styles.secondaryButtonText}>
                        Cambiar ({selectedFilledSlots.length})
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.secondaryButton,
                        (!selectedFilledSlots.length || isSyncingLibrary) &&
                          styles.disabledButton,
                      ]}
                      onPress={handleDeleteSelected}
                      disabled={!selectedFilledSlots.length || isSyncingLibrary}
                    >
                      <Text style={styles.secondaryButtonText}>
                        Eliminar ({selectedFilledSlots.length})
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.slotGrid}>
                  {slots.map((slot) => {
                    const isSelected = selectedSlotIndexes.includes(
                      slot.slotIndex,
                    );
                    const hasImage = !!slot.imageId;

                    return (
                      <Pressable
                        key={slot.slotIndex}
                        style={[
                          styles.slotCard,
                          isSelected && styles.slotCardSelected,
                          !hasImage && styles.slotCardEmpty,
                        ]}
                        onPress={() => toggleSlotSelection(slot.slotIndex)}
                      >
                        {slot.signedUrl ? (
                          <>
                            <Image
                              source={{ uri: slot.signedUrl }}
                              style={styles.slotImage}
                            />

                            <View style={styles.slotIndexBadge}>
                              <Text style={styles.slotIndexText}>
                                {slot.slotIndex + 1}
                              </Text>
                            </View>

                            {isSelected && (
                              <>
                                <View style={styles.selectedOverlay} />

                                <View style={styles.selectedBadge}>
                                  <Text style={styles.selectedBadgeText}>
                                    ✓
                                  </Text>
                                </View>
                              </>
                            )}
                          </>
                        ) : (
                          <View style={styles.emptySlotContent}>
                            <Text style={styles.emptySlotPlus}>+</Text>
                            <Text style={styles.emptySlotText}>
                              Slot {slot.slotIndex + 1}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.gameScreen}>
          <View style={styles.gameContent}>
            {renderHeader()}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Movimientos</Text>
                <Text style={styles.statValue}>{moves}</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Tiempo</Text>
                <Text style={styles.statValue}>
                  {formatSeconds(elapsedSeconds)}
                </Text>
              </View>
            </View>

            <View style={styles.inlineActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={handlePlayAgain}
              >
                <Text style={styles.secondaryButtonText}>Reiniciar</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={handleChangeMode}
              >
                <Text style={styles.secondaryButtonText}>Cambiar modo</Text>
              </Pressable>
            </View>

            <View style={styles.boardArea}>
              <ZoomableBoardCanvas
                viewportWidth={boardViewportWidth}
                viewportHeight={boardViewportHeight}
                boardWidth={boardPixelWidth}
                boardHeight={boardPixelHeight}
              >
                <View
                  style={[
                    styles.boardGrid,
                    {
                      width: boardPixelWidth,
                      height: boardPixelHeight,
                      gap,
                    },
                  ]}
                >
                  {cards.map((card) => (
                    <MemoryCard
                      key={card.id}
                      card={card}
                      size={cardSize}
                      onPress={() => flipCard(card.id)}
                    />
                  ))}
                </View>
              </ZoomableBoardCanvas>

              <Text style={styles.boardHint}>
                Pellizca para zoom, arrastra para explorar o usa los botones.
              </Text>
            </View>
          </View>
        </View>
      )}

      <Modal visible={isWon} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ganaste</Text>
            <Text style={styles.modalText}>
              Movimientos: {moves} · Tiempo: {formatSeconds(elapsedSeconds)}
            </Text>

            <Pressable style={styles.primaryButton} onPress={handlePlayAgain}>
              <Text style={styles.primaryButtonText}>Jugar de nuevo</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButtonWide}
              onPress={handleChangeMode}
            >
              <Text style={styles.secondaryButtonText}>Cambiar modo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFD4E0",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  gameScreen: {
    flex: 1,
    padding: 20,
  },
  gameContent: {
    flex: 1,
  },
  header: {
    marginBottom: 10,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFE7EE",
  },
  backButtonText: {
    color: "#9E4258",
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#7C3043",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#9E4258",
  },
  card: {
    backgroundColor: "#FFF0F4",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F3B9C7",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#7C3043",
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9E4258",
    marginBottom: 10,
  },
  helperText: {
    color: "#9E4258",
    marginBottom: 14,
    fontWeight: "600",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#F3B9C7",
    backgroundColor: "#FFE7EE",
    position: "relative",
  },
  slotCardSelected: {
    borderColor: "#C84B55",
    borderWidth: 3,
    transform: [{ scale: 0.96 }],
  },
  slotCardEmpty: {
    borderStyle: "dashed",
  },
  slotImage: {
    width: "100%",
    height: "100%",
  },
  slotIndexBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "rgba(124, 48, 67, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  slotIndexText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(200, 75, 85, 0.28)",
  },
  selectedBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#C84B55",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  selectedBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  emptySlotContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  emptySlotPlus: {
    fontSize: 26,
    lineHeight: 30,
    color: "#C84B55",
    fontWeight: "800",
  },
  emptySlotText: {
    marginTop: 4,
    fontSize: 12,
    color: "#9E4258",
    fontWeight: "700",
    textAlign: "center",
  },
  actionsBlock: {
    marginBottom: 16,
    gap: 10,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: "#C84B55",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFE7EE",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonWide: {
    marginTop: 10,
    backgroundColor: "#FFE7EE",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#9E4258",
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.45,
  },
  sizeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFE1E9",
  },
  sizeChipSelected: {
    backgroundColor: "#C84B55",
  },
  sizeChipText: {
    color: "#9E4258",
    fontWeight: "700",
  },
  sizeChipTextSelected: {
    color: "#FFFFFF",
  },
  bestStatsCard: {
    marginTop: 8,
    backgroundColor: "#FFE7EE",
    borderRadius: 18,
    padding: 14,
  },
  leaderboardCard: {
    marginTop: 12,
    backgroundColor: "#FFE7EE",
    borderRadius: 18,
    padding: 14,
  },
  bestStatsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#7C3043",
    marginBottom: 4,
  },
  bestStatsText: {
    color: "#9E4258",
    fontWeight: "600",
  },
  leaderboardList: {
    gap: 10,
    marginTop: 8,
  },
  leaderboardItem: {
    backgroundColor: "#FFF0F4",
    borderRadius: 14,
    padding: 10,
  },
  leaderboardName: {
    color: "#7C3043",
    fontWeight: "800",
    marginBottom: 4,
  },
  leaderboardMeta: {
    color: "#9E4258",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF0F4",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3B9C7",
  },
  statLabel: {
    color: "#9E4258",
    fontWeight: "700",
    marginBottom: 6,
  },
  statValue: {
    color: "#7C3043",
    fontSize: 22,
    fontWeight: "800",
  },
  boardArea: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  boardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
  },
  boardHint: {
    marginTop: 10,
    textAlign: "center",
    color: "#9E4258",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(63, 21, 32, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFF0F4",
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#7C3043",
    marginBottom: 8,
    textAlign: "center",
  },
  modalText: {
    color: "#9E4258",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
});
