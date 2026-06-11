import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import { fetchVisits } from '../lib/dateSpotsService';
import { DateVisitWithUrl } from '../types/dates';
import VisitTimelineItem from '../components/dates/VisitTimelineItem';

type Props = NativeStackScreenProps<RootStackParamList, 'DateSpotTimeline'>;

export default function DateSpotTimelineScreen({ navigation, route }: Props) {
  const { spotId, title } = route.params;
  const { session, coupleMembers } = useAuth();

  const [visits, setVisits] = useState<DateVisitWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const myUserId = session?.user?.id ?? null;

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();

    coupleMembers.forEach((member) => {
      map.set(
        member.user_id,
        member.nickname?.trim() || member.display_name?.trim() || 'mi amorcito'
      );
    });

    return map;
  }, [coupleMembers]);

  const loadVisits = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchVisits(spotId);
      setVisits(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los recuerdos.');
    } finally {
      setIsLoading(false);
    }
  }, [spotId]);

  useFocusEffect(
    useCallback(() => {
      void loadVisits();
    }, [loadVisits])
  );

  // La signed URL es remota: para compartir/guardar hay que bajarla primero
  // a un archivo local temporal.
  const downloadToCache = async (url: string) => {
    const destination = new File(Paths.cache, `cita-${Date.now()}.jpg`);
    return File.downloadFileAsync(url, destination);
  };

  const handleShare = async () => {
    if (!viewerUrl || isSharing) return;

    try {
      setIsSharing(true);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.');
        return;
      }

      const file = await downloadToCache(viewerUrl);
      await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg' });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo compartir la foto.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!viewerUrl || isSaving) return;

    try {
      setIsSaving(true);

      const permission = await MediaLibrary.requestPermissionsAsync(true);

      if (!permission.granted) {
        Alert.alert(
          'Permiso necesario',
          'Activa el permiso de fotos en los ajustes del teléfono para guardar la imagen.'
        );
        return;
      }

      const file = await downloadToCache(viewerUrl);
      await MediaLibrary.saveToLibraryAsync(file.uri);

      Alert.alert('Listo', 'La foto se guardó en la galería del teléfono.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar la foto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <Pressable
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C84B55" />
        </View>
      ) : visits.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Sin visitas todavía</Text>
          <Text style={styles.emptyText}>
            Cuando registren una visita en este lugar, sus recuerdos aparecerán
            aquí en orden, desde la primera vez hasta la última.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <VisitTimelineItem
              visit={item}
              isMine={item.created_by === myUserId}
              authorName={nameByUserId.get(item.created_by) ?? 'mi amorcito'}
              onPressPhoto={setViewerUrl}
            />
          )}
        />
      )}

      <Modal
        visible={!!viewerUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUrl(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerUrl(null)}>
          {viewerUrl && (
            <Image
              source={{ uri: viewerUrl }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}

          <View style={styles.viewerActions}>
            <Pressable
              style={[styles.viewerActionButton, isSharing && styles.viewerActionDisabled]}
              onPress={(event) => {
                event.stopPropagation();
                void handleShare();
              }}
              disabled={isSharing || isSaving}
            >
              {isSharing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="share-social" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.viewerActionText}>Compartir</Text>
            </Pressable>

            <Pressable
              style={[styles.viewerActionButton, isSaving && styles.viewerActionDisabled]}
              onPress={(event) => {
                event.stopPropagation();
                void handleSaveToGallery();
              }}
              disabled={isSharing || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="download" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.viewerActionText}>Descargar</Text>
            </Pressable>
          </View>

          <Text style={styles.viewerHint}>Toca para cerrar</Text>
        </Pressable>
      </Modal>
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
    flex: 1,
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
    paddingBottom: 32,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 5, 10, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  viewerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  viewerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C84B55',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  viewerActionDisabled: {
    opacity: 0.6,
  },
  viewerActionText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  viewerHint: {
    color: '#F3B9C7',
    fontWeight: '700',
    marginTop: 12,
  },
});
