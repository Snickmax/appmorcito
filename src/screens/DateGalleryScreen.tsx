import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
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
import { fetchGalleryCollections } from '../lib/dateSpotsService';
import { DateGalleryCollection } from '../types/dates';

type Props = NativeStackScreenProps<RootStackParamList, 'DateGallery'>;

export default function DateGalleryScreen({ navigation }: Props) {
  const { coupleState } = useAuth();

  const [collections, setCollections] = useState<DateGalleryCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCollections = useCallback(async () => {
    if (!coupleState?.couple_id) return;

    try {
      setIsLoading(true);
      const data = await fetchGalleryCollections(coupleState.couple_id);
      setCollections(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar la galería.');
    } finally {
      setIsLoading(false);
    }
  }, [coupleState?.couple_id]);

  useFocusEffect(
    useCallback(() => {
      void loadCollections();
    }, [loadCollections])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <Pressable
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Galería de citas</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C84B55" />
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Todavía no hay fotos de citas</Text>
          <Text style={styles.emptyText}>
            Registra una visita con foto desde el marcador en el mapa y aparecerá
            aquí como una colección.
          </Text>
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.spot.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate('DateSpotTimeline', {
                  spotId: item.spot.id,
                  title: item.spot.title,
                })
              }
            >
              {item.coverSignedUrl ? (
                <Image
                  source={{ uri: item.coverSignedUrl }}
                  style={styles.cover}
                />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={styles.coverPlaceholderText}>❤</Text>
                </View>
              )}

              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.spot.title}
              </Text>

              <Text style={styles.cardSubtitle}>
                {item.photoCount} {item.photoCount === 1 ? 'foto' : 'fotos'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8B6BE',
  },
  headerBar: {
    backgroundColor: '#D25F6B',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    marginBottom: 8,
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9E4258',
    fontWeight: '700',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  columnWrapper: {
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3B9C7',
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#FFE7EE',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    fontSize: 40,
    color: '#D96A7E',
  },
  cardTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 15,
    marginTop: 8,
  },
  cardSubtitle: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
});
