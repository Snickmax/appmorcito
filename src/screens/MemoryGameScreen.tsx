import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { MemoryCard } from '../components/MemoryCard';
import { ZoomableBoardCanvas } from '../components/ZoomableBoardCanvas';
import { useMemoryGame } from '../hooks/useMemoryGame';
import { BestStatsMap, BoardSize, UploadedImage } from '../types/memory';
import { formatSeconds, requiredImagesForSize } from '../utils/memory';

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
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [bestStats, setBestStats] = useState<BestStatsMap>(INITIAL_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isPickingImages, setIsPickingImages] = useState(false);

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

    loadStats();
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

  const currentBest = bestStats[selectedSize];
  const previewImages = useMemo(() => uploadedImages.slice(0, 8), [uploadedImages]);

  const handlePickImages = async () => {
    try {
      setIsPickingImages(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        selectionLimit: 18,
        orderedSelection: true,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      const nextImages: UploadedImage[] = result.assets.map((asset, index) => ({
        id: asset.assetId ?? `${asset.uri}-${index}`,
        uri: asset.uri,
      }));

      const deduped = Array.from(
        new Map(nextImages.map((item) => [item.uri, item])).values()
      );

      setUploadedImages(deduped);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las imágenes.');
    } finally {
      setIsPickingImages(false);
    }
  };

  const handleStartGame = () => {
    if (uploadedImages.length < requiredImages) {
      Alert.alert(
        'Faltan imágenes',
        `Para un tablero ${selectedSize}x${selectedSize} necesitas al menos ${requiredImages} imágenes distintas.`
      );
      return;
    }

    startGame({
      size: selectedSize,
      images: uploadedImages,
    });
  };

  const handlePlayAgain = () => {
    startGame({
      size: selectedSize,
      images: uploadedImages,
    });
  };

  const handleChangeMode = () => {
    resetGame();
  };

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
      </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {!isGameStarted ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderHeader()}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Configuración</Text>

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
              Necesitas {requiredImages} imágenes distintas para este modo.
            </Text>

            <Pressable style={styles.primaryButton} onPress={handlePickImages}>
              {isPickingImages ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {uploadedImages.length ? 'Cambiar imágenes' : 'Elegir imágenes'}
                </Text>
              )}
            </Pressable>

            <Text style={styles.counterText}>
              Imágenes cargadas: {uploadedImages.length}
            </Text>

            {previewImages.length > 0 && (
              <View style={styles.previewGrid}>
                {previewImages.map((image) => (
                  <Image
                    key={image.id}
                    source={{ uri: image.uri }}
                    style={styles.previewImage}
                  />
                ))}
              </View>
            )}

            <View style={styles.bestStatsCard}>
              <Text style={styles.bestStatsTitle}>Mejor marca</Text>
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
                uploadedImages.length < requiredImages && styles.disabledButton,
              ]}
              onPress={handleStartGame}
              disabled={uploadedImages.length < requiredImages}
            >
              <Text style={styles.primaryButtonText}>Iniciar juego</Text>
            </Pressable>
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
                <Text style={styles.statValue}>{formatSeconds(elapsedSeconds)}</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryButton} onPress={handlePlayAgain}>
                <Text style={styles.secondaryButtonText}>Reiniciar</Text>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={handleChangeMode}>
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

            <Pressable style={styles.secondaryButtonWide} onPress={handleChangeMode}>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  gameScreen: {
    flex: 1,
    padding: 20,
  },
  gameContent: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
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
  helperText: {
    color: '#9E4258',
    marginBottom: 16,
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#C84B55',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  counterText: {
    marginTop: 14,
    color: '#9E4258',
    fontWeight: '700',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  bestStatsCard: {
    marginTop: 18,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    color: '#9E4258',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
});