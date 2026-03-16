import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { MemoryCard } from '../components/MemoryCard';
import { ZoomableBoardCanvas } from '../components/ZoomableBoardCanvas';
import { useMemoryGame } from '../hooks/useMemoryGame';
import {
  BestStatsMap,
  BoardSize,
  MemoryImageSlot,
  MemorySetSummary,
  UploadedImage,
} from '../types/memory';
import { formatSeconds, requiredImagesForSize } from '../utils/memory';
import { useAuth } from '../providers/AuthProvider';
import {
  createMemorySet,
  deleteMemorySet,
  deleteSlots,
  getOrCreateMemorySets,
  loadMemorySlots,
  MAX_MEMORY_IMAGES,
  MAX_MEMORY_SETS,
  pickImagesBatch,
  renameMemorySet,
} from '../lib/memorySetService';
import { createMemorySession } from '../lib/memorySessionService';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryGame'>;

const STORAGE_KEY = 'memory_best_stats_v1';

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

  const [memorySets, setMemorySets] = useState<MemorySetSummary[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [slots, setSlots] = useState<MemoryImageSlot[]>([]);
  const [selectedSlotIndexes, setSelectedSlotIndexes] = useState<number[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);

  const [pendingExternalRefresh, setPendingExternalRefresh] = useState(false);
  const [gameImageExpired, setGameImageExpired] = useState(false);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const winSavedRef = useRef(false);
  const refreshingRef = useRef(false);

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

  const refreshCurrentSet = useCallback(
    async (preferredSetId?: string | null) => {
      if (!coupleState?.couple_id || !session?.user?.id || refreshingRef.current) {
        return;
      }

      refreshingRef.current = true;
      setIsLoadingLibrary(true);

      try {
        const sets = await getOrCreateMemorySets();
        setMemorySets(sets);

        const validPreferred =
          preferredSetId && sets.some((setItem) => setItem.id === preferredSetId)
            ? preferredSetId
            : null;

        const currentValid =
          selectedSetId && sets.some((setItem) => setItem.id === selectedSetId)
            ? selectedSetId
            : null;

        const nextSetId = validPreferred || currentValid || sets[0]?.id || null;

        setSelectedSetId(nextSetId);

        if (!nextSetId) {
          setSlots([]);
          setSelectedSlotIndexes([]);
          return;
        }

        const slotData = await loadMemorySlots(nextSetId);
        setSlots(slotData.slots);
        setSelectedSlotIndexes((prev) =>
          prev.filter((slotIndex) => slotData.slots[slotIndex]?.imageId)
        );
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'No se pudo cargar Memorice.');
      } finally {
        setIsLoadingLibrary(false);
        setIsSyncingLibrary(false);
        refreshingRef.current = false;
      }
    },
    [coupleState?.couple_id, session?.user?.id, selectedSetId]
  );

  useEffect(() => {
    void refreshCurrentSet();
  }, [coupleState?.couple_id, session?.user?.id, refreshCurrentSet]);

  useFocusEffect(
    useCallback(() => {
      if (!isGameStarted) {
        void refreshCurrentSet(selectedSetId);
      }
    }, [isGameStarted, refreshCurrentSet, selectedSetId])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !isGameStarted) {
        void refreshCurrentSet(selectedSetId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isGameStarted, refreshCurrentSet, selectedSetId]);

  useEffect(() => {
    if (!coupleState?.couple_id) return;

    const channel = supabase
      .channel(`memory-live-${coupleState.couple_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_set_images',
          filter: `couple_id=eq.${coupleState.couple_id}`,
        },
        async () => {
          if (isGameStarted) {
            setPendingExternalRefresh(true);
            return;
          }

          await refreshCurrentSet(selectedSetId);
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
          if (isGameStarted) {
            setPendingExternalRefresh(true);
            return;
          }

          await refreshCurrentSet(selectedSetId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleState?.couple_id, isGameStarted, refreshCurrentSet, selectedSetId]);

  useEffect(() => {
    if (!isGameStarted && pendingExternalRefresh) {
      setPendingExternalRefresh(false);
      void refreshCurrentSet(selectedSetId);
    }
  }, [isGameStarted, pendingExternalRefresh, refreshCurrentSet, selectedSetId]);

  const filledSlots = useMemo(
    () => slots.filter((slot) => !!slot.imageId),
    [slots]
  );

  const freeSlots = useMemo(
    () => slots.filter((slot) => !slot.imageId).map((slot) => slot.slotIndex),
    [slots]
  );

  const selectedFilledSlots = useMemo(
    () =>
      selectedSlotIndexes.filter(
        (slotIndex) => !!slots.find((slot) => slot.slotIndex === slotIndex)?.imageId
      ),
    [selectedSlotIndexes, slots]
  );

  const playableImages: UploadedImage[] = useMemo(
    () =>
      filledSlots
        .filter((slot) => slot.imageId && slot.signedUrl)
        .map((slot) => ({
          id: slot.imageId as string,
          uri: slot.signedUrl as string,
        })),
    [filledSlots]
  );

  const currentBest = bestStats[selectedSize];

  const selectedSet = useMemo(
    () => memorySets.find((item) => item.id === selectedSetId) ?? null,
    [memorySets, selectedSetId]
  );

  const toggleSlotSelection = (slotIndex: number) => {
    const slot = slots.find((item) => item.slotIndex === slotIndex);
    if (!slot?.imageId) return;

    setSelectedSlotIndexes((prev) =>
      prev.includes(slotIndex)
        ? prev.filter((value) => value !== slotIndex)
        : [...prev, slotIndex].sort((a, b) => a - b)
    );
  };

  const handleSelectSet = async (setId: string) => {
    if (isGameStarted) return;
    setSelectedSetId(setId);
    await refreshCurrentSet(setId);
  };

  const handleCreateSet = async () => {
    if (memorySets.length >= MAX_MEMORY_SETS) {
      Alert.alert('Límite alcanzado', 'Máximo 8 sets por relación.');
      return;
    }

    try {
      setIsSyncingLibrary(true);
      const newSetId = await createMemorySet(null);
      await refreshCurrentSet(newSetId);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo crear el set.');
      setIsSyncingLibrary(false);
    }
  };

  const handleOpenRenameSet = () => {
    if (!selectedSet) return;
    setRenameValue(selectedSet.title);
    setRenameModalVisible(true);
  };

  const handleConfirmRenameSet = async () => {
    if (!selectedSetId) return;

    const title = renameValue.trim();

    if (!title) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para el set.');
      return;
    }

    try {
      setIsSyncingLibrary(true);
      await renameMemorySet(selectedSetId, title);
      setRenameModalVisible(false);
      await refreshCurrentSet(selectedSetId);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo renombrar el set.');
      setIsSyncingLibrary(false);
    }
  };

  const handleDeleteCurrentSet = async () => {
    if (!selectedSetId) return;

    Alert.alert(
      'Eliminar set',
      'Se eliminará este set de imágenes. Las sesiones quedarán guardadas, pero desvinculadas del set.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSyncingLibrary(true);
              await deleteMemorySet(selectedSetId);
              await refreshCurrentSet(null);
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudo eliminar el set.');
              setIsSyncingLibrary(false);
            }
          },
        },
      ]
    );
  };

  const handleAddPhotos = async () => {
    const coupleId = coupleState?.couple_id;
    const userId = session?.user?.id;
    const memorySetId = selectedSetId;

    if (!coupleId || !userId || !memorySetId) return;

    if (freeSlots.length === 0) {
      Alert.alert('Límite alcanzado', 'Ya tienes las 18 imágenes cargadas.');
      return;
    }

    try {
      setIsSyncingLibrary(true);

      const assets = await pickImagesBatch(freeSlots.length);

      if (!assets.length) {
        setIsSyncingLibrary(false);
        return;
      }

      const targetSlots = freeSlots.slice(0, assets.length);

      setIsSyncingLibrary(false);

      navigation.navigate('MemoryCropQueue', {
        title: 'Agregar fotos',
        memorySetId,
        coupleId,
        userId,
        slotIndexes: targetSlots,
        assets: assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          fileName: asset.fileName ?? null,
          mimeType: asset.mimeType ?? null,
        })),
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes.');
      setIsSyncingLibrary(false);
    }
  };

  const handleReplaceSelected = async () => {
    const coupleId = coupleState?.couple_id;
    const userId = session?.user?.id;
    const memorySetId = selectedSetId;

    if (!coupleId || !userId || !memorySetId) return;

    if (!selectedFilledSlots.length) {
      Alert.alert('Sin selección', 'Selecciona una o más imágenes para cambiar.');
      return;
    }

    try {
      setIsSyncingLibrary(true);

      const assets = await pickImagesBatch(selectedFilledSlots.length);

      if (!assets.length) {
        setIsSyncingLibrary(false);
        return;
      }

      if (assets.length !== selectedFilledSlots.length) {
        Alert.alert(
          'Selección incompleta',
          `Debes seleccionar ${selectedFilledSlots.length} imágenes para reemplazar la selección.`
        );
        setIsSyncingLibrary(false);
        return;
      }

      setIsSyncingLibrary(false);

      navigation.navigate('MemoryCropQueue', {
        title: 'Reemplazar fotos',
        memorySetId,
        coupleId,
        userId,
        slotIndexes: selectedFilledSlots,
        assets: assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          fileName: asset.fileName ?? null,
          mimeType: asset.mimeType ?? null,
        })),
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes.');
      setIsSyncingLibrary(false);
    }
  };

  const handleDeleteSelected = async () => {
    const memorySetId = selectedSetId;

    if (!memorySetId || !selectedFilledSlots.length) {
      Alert.alert('Sin selección', 'Selecciona una o más imágenes para eliminar.');
      return;
    }

    Alert.alert(
      'Eliminar imágenes',
      `Se eliminarán ${selectedFilledSlots.length} imágenes del set.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSyncingLibrary(true);
              await deleteSlots({
                memorySetId,
                slotIndexes: selectedFilledSlots,
              });
              setSelectedSlotIndexes([]);
              await refreshCurrentSet(memorySetId);
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudieron eliminar las imágenes.');
              setIsSyncingLibrary(false);
            }
          },
        },
      ]
    );
  };

  const handleStartGame = () => {
    if (!coupleState?.couple_id || !session?.user?.id) {
      Alert.alert('Sesión inválida', 'La pareja ya no está activa.');
      return;
    }

    if (playableImages.length < requiredImages) {
      Alert.alert(
        'Faltan imágenes',
        `Para un tablero ${selectedSize}x${selectedSize} necesitas al menos ${requiredImages} imágenes.`
      );
      return;
    }

    setGameImageExpired(false);
    winSavedRef.current = false;

    startGame({
      size: selectedSize,
      images: playableImages,
    });
  };

  const handlePlayAgain = () => {
    if (playableImages.length < requiredImages) {
      Alert.alert('Set insuficiente', 'Ya no hay imágenes suficientes para reiniciar.');
      return;
    }

    setGameImageExpired(false);
    winSavedRef.current = false;

    startGame({
      size: selectedSize,
      images: playableImages,
    });
  };

  const handleChangeMode = async () => {
    setGameImageExpired(false);
    winSavedRef.current = false;
    resetGame();

    if (pendingExternalRefresh) {
      setPendingExternalRefresh(false);
      await refreshCurrentSet(selectedSetId);
    }
  };

  const handleFrozenImageError = () => {
    if (gameImageExpired) return;

    setGameImageExpired(true);

    Alert.alert(
      'Imagen vencida o inválida',
      'El set cambió o una URL expiró. Volverás a la biblioteca para refrescar las imágenes.',
      [
        {
          text: 'Aceptar',
          onPress: async () => {
            await handleChangeMode();
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (
      !isWon ||
      !boardSize ||
      !coupleState?.couple_id ||
      !selectedSetId ||
      winSavedRef.current
    ) {
      return;
    }

    winSavedRef.current = true;

    const saveWin = async () => {
      try {
        await createMemorySession({
          coupleId: coupleState.couple_id,
          memorySetId: selectedSetId,
          boardSize,
          moves,
          durationSeconds: elapsedSeconds,
        });
      } catch (error) {
        console.error(error);
        Alert.alert(
          'Aviso',
          'Ganaste la partida, pero no se pudo guardar la sesión en Supabase.'
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
    selectedSetId,
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
      <Text style={styles.subtitle}>Juego, sets compartidos y biblioteca</Text>
    </View>
  );

  if (!coupleState?.couple_id || !session?.user?.id) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <ActivityIndicator color="#C84B55" />
          <Text style={styles.centeredText}>Validando estado de la relación...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              Para {selectedSize}x{selectedSize} necesitas {requiredImages} imágenes.
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

            <Pressable
              style={[
                styles.primaryButton,
                (playableImages.length < requiredImages || isSyncingLibrary) &&
                  styles.disabledButton,
              ]}
              onPress={handleStartGame}
              disabled={playableImages.length < requiredImages || isSyncingLibrary}
            >
              <Text style={styles.primaryButtonText}>Iniciar juego</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButtonWide}
              onPress={() => navigation.navigate('MemoryStats', { selectedSetId })}
            >
              <Text style={styles.secondaryButtonText}>Ver scoreboard</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Biblioteca compartida</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.setsRow}
            >
              {memorySets.map((setItem) => {
                const selected = setItem.id === selectedSetId;

                return (
                  <Pressable
                    key={setItem.id}
                    style={[
                      styles.setChip,
                      selected && styles.setChipSelected,
                    ]}
                    onPress={() => void handleSelectSet(setItem.id)}
                  >
                    <Text
                      style={[
                        styles.setChipTitle,
                        selected && styles.setChipTitleSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {setItem.title}
                    </Text>
                    <Text
                      style={[
                        styles.setChipMeta,
                        selected && styles.setChipMetaSelected,
                      ]}
                    >
                      {setItem.imageCount}/18
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                style={[
                  styles.addSetChip,
                  (memorySets.length >= MAX_MEMORY_SETS || isSyncingLibrary) &&
                    styles.disabledButton,
                ]}
                onPress={handleCreateSet}
                disabled={memorySets.length >= MAX_MEMORY_SETS || isSyncingLibrary}
              >
                <Text style={styles.addSetChipText}>+ Nuevo set</Text>
              </Pressable>
            </ScrollView>

            <Text style={styles.helperText}>
              Set actual: {selectedSet?.title ?? '--'}
            </Text>

            <Text style={styles.helperText}>
              Imágenes cargadas: {filledSlots.length}/{MAX_MEMORY_IMAGES} · Seleccionadas: {selectedFilledSlots.length}
            </Text>

            {pendingExternalRefresh && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  Se detectaron cambios desde otro dispositivo. Se aplicarán al salir del juego o al refrescar la biblioteca.
                </Text>
              </View>
            )}

            {isLoadingLibrary ? (
              <ActivityIndicator color="#B94E65" />
            ) : (
              <>
                <View style={styles.actionsBlock}>
                  <Pressable
                    style={[
                      styles.primaryButton,
                      (!freeSlots.length || isSyncingLibrary) && styles.disabledButton,
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

                  <View style={styles.inlineActions}>
                    <Pressable
                      style={[
                        styles.secondaryButton,
                        (!selectedSetId || isSyncingLibrary) && styles.disabledButton,
                      ]}
                      onPress={handleOpenRenameSet}
                      disabled={!selectedSetId || isSyncingLibrary}
                    >
                      <Text style={styles.secondaryButtonText}>Renombrar set</Text>
                    </Pressable>

                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => setSelectedSlotIndexes([])}
                    >
                      <Text style={styles.secondaryButtonText}>
                        Deseleccionar todo
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.inlineActions}>
                    <Pressable
                      style={[
                        styles.secondaryButton,
                        (memorySets.length <= 1 || isSyncingLibrary) &&
                          styles.disabledButton,
                      ]}
                      onPress={handleDeleteCurrentSet}
                      disabled={memorySets.length <= 1 || isSyncingLibrary}
                    >
                      <Text style={styles.secondaryButtonText}>Eliminar set</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.slotGrid}>
                  {slots.map((slot) => {
                    const isSelected = selectedSlotIndexes.includes(slot.slotIndex);
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
                              onError={() => void refreshCurrentSet(selectedSetId)}
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
                                  <Text style={styles.selectedBadgeText}>✓</Text>
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

            {pendingExternalRefresh && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  El set cambió en otro dispositivo. Esta partida sigue con el snapshot actual y los cambios se aplicarán al volver a la biblioteca.
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Movimientos</Text>
                <Text style={styles.statValue}>{moves}</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Tiempo</Text>
                <Text style={styles.statValue}>{formatSeconds(elapsedSeconds)}</Text>
              </View>
            </View>

            <View style={styles.inlineActions}>
              <Pressable style={styles.secondaryButton} onPress={handlePlayAgain}>
                <Text style={styles.secondaryButtonText}>Reiniciar</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => void handleChangeMode()}
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
                      onImageError={handleFrozenImageError}
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

      <Modal visible={renameModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Renombrar set</Text>

            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Ej. Viaje al sur"
              placeholderTextColor="#B16A7B"
              style={styles.input}
              autoFocus
              maxLength={60}
            />

            <Pressable
              style={[styles.primaryButton, isSyncingLibrary && styles.disabledButton]}
              onPress={handleConfirmRenameSet}
              disabled={isSyncingLibrary}
            >
              <Text style={styles.primaryButtonText}>Guardar nombre</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButtonWide}
              onPress={() => setRenameModalVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
              onPress={() => void handleChangeMode()}
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
    backgroundColor: '#FFD4E0',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  centeredText: {
    color: '#7C3043',
    fontWeight: '700',
    textAlign: 'center',
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
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFE7EE',
  },
  backButtonText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#7C3043',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: '#9E4258',
  },
  card: {
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3B9C7',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7C3043',
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9E4258',
    marginBottom: 10,
  },
  helperText: {
    color: '#9E4258',
    marginBottom: 10,
    fontWeight: '600',
  },
  noticeBox: {
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3B9C7',
  },
  noticeText: {
    color: '#9E4258',
    fontWeight: '700',
    lineHeight: 18,
  },
  setsRow: {
    gap: 10,
    paddingBottom: 10,
  },
  setChip: {
    minWidth: 120,
    maxWidth: 160,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFE1E9',
  },
  setChipSelected: {
    backgroundColor: '#C84B55',
  },
  setChipTitle: {
    color: '#9E4258',
    fontWeight: '800',
  },
  setChipTitleSelected: {
    color: '#FFFFFF',
  },
  setChipMeta: {
    color: '#9E4258',
    fontWeight: '600',
    marginTop: 2,
  },
  setChipMetaSelected: {
    color: '#FFFFFF',
  },
  addSetChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFE7EE',
    justifyContent: 'center',
  },
  addSetChipText: {
    color: '#9E4258',
    fontWeight: '800',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F3B9C7',
    backgroundColor: '#FFE7EE',
    position: 'relative',
  },
  slotCardSelected: {
    borderColor: '#C84B55',
    borderWidth: 3,
    transform: [{ scale: 0.96 }],
  },
  slotCardEmpty: {
    borderStyle: 'dashed',
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotIndexBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 48, 67, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotIndexText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200, 75, 85, 0.28)',
  },
  selectedBadge: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  emptySlotContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  emptySlotPlus: {
    fontSize: 26,
    lineHeight: 30,
    color: '#C84B55',
    fontWeight: '800',
  },
  emptySlotText: {
    marginTop: 4,
    fontSize: 12,
    color: '#9E4258',
    fontWeight: '700',
    textAlign: 'center',
  },
  actionsBlock: {
    marginBottom: 16,
    gap: 10,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: '#C84B55',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonWide: {
    marginTop: 10,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9E4258',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#FFE1E9',
  },
  sizeChipSelected: {
    backgroundColor: '#C84B55',
  },
  sizeChipText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  sizeChipTextSelected: {
    color: '#FFFFFF',
  },
  bestStatsCard: {
    marginTop: 8,
    backgroundColor: '#FFE7EE',
    borderRadius: 18,
    padding: 14,
  },
  bestStatsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7C3043',
    marginBottom: 4,
  },
  bestStatsText: {
    color: '#9E4258',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3B9C7',
  },
  statLabel: {
    color: '#9E4258',
    fontWeight: '700',
    marginBottom: 6,
  },
  statValue: {
    color: '#7C3043',
    fontSize: 22,
    fontWeight: '800',
  },
  boardArea: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  boardHint: {
    marginTop: 10,
    textAlign: 'center',
    color: '#9E4258',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(63, 21, 32, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#7C3043',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    color: '#9E4258',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#F3B9C7',
    backgroundColor: '#FFE7EE',
    color: '#7C3043',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
});