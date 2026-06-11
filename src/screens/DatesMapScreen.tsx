import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MapView, { Marker } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import {
  addVisit,
  createCategory,
  createDateSpot,
  deleteCategory,
  deleteDateSpot,
  fetchCategories,
  fetchDateSpots,
  removeLatestVisit,
  renameCategory,
  updateDateSpot,
} from '../lib/dateSpotsService';
import {
  DateCategory,
  DateSpot,
  UploadableVisitAsset,
} from '../types/dates';
import SpotFormModal, {
  SpotFormValues,
} from '../components/dates/SpotFormModal';
import SpotDetailModal from '../components/dates/SpotDetailModal';
import AddVisitModal from '../components/dates/AddVisitModal';
import CatalogModal from '../components/dates/CatalogModal';
import ClusterBubble from '../components/dates/ClusterBubble';
import ConfirmModal from '../components/ConfirmModal';
import PlaceSearchBar from '../components/dates/PlaceSearchBar';
import { PlaceResult, SearchViewbox } from '../lib/geocodingService';
import {
  PLACING_PIN_IMAGE,
  SPOT_PIN_COLORS,
  SPOT_PIN_IMAGES,
  SPOT_PIN_SELECTED_IMAGES,
} from '../components/dates/SpotPin';

type Props = NativeStackScreenProps<RootStackParamList, 'DatesMap'>;

const PLACING_PIN_SIZE = 52;
// Aspecto de los assets pin-*.png (33x46).
const PIN_ASPECT = 33 / 46;

const DEFAULT_REGION = {
  latitude: -33.45,
  longitude: -70.66,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function DatesMapScreen({ navigation }: Props) {
  const { session, coupleState, coupleMembers } = useAuth();

  const coupleId = coupleState?.couple_id ?? null;
  const userId = session?.user?.id ?? null;

  const mapRef = useRef<MapView | null>(null);
  const didFitRef = useRef(false);

  const [spots, setSpots] = useState<DateSpot[]>([]);
  const [categories, setCategories] = useState<DateCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSpot, setEditingSpot] = useState<DateSpot | null>(null);
  const [detailSpotId, setDetailSpotId] = useState<string | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [addVisitVisible, setAddVisitVisible] = useState(false);
  const [isSavingSpot, setIsSavingSpot] = useState(false);
  const [isMutatingVisit, setIsMutatingVisit] = useState(false);
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([]);
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    'deleteSpot' | 'removeVisit' | null
  >(null);

  const detailSpot = useMemo(
    () => spots.find((spot) => spot.id === detailSpotId) ?? null,
    [spots, detailSpotId]
  );

  // El filtro por categorías aplica al mapa y al catálogo a la vez.
  const visibleSpots = useMemo(() => {
    if (!filterCategoryIds.length) return spots;

    return spots.filter((spot) =>
      spot.categoryIds.some((id) => filterCategoryIds.includes(id))
    );
  }, [spots, filterCategoryIds]);

  const detailCreatorName = useMemo(() => {
    if (!detailSpot) return 'mi amorcito';

    const creator = coupleMembers.find(
      (member) => member.user_id === detailSpot.created_by
    );

    return (
      creator?.nickname?.trim() ||
      creator?.display_name?.trim() ||
      'mi amorcito'
    );
  }, [detailSpot, coupleMembers]);

  const fitToSpots = useCallback((nextSpots: DateSpot[]) => {
    if (didFitRef.current || !nextSpots.length) return;

    didFitRef.current = true;
    mapRef.current?.fitToCoordinates(
      nextSpots.map((spot) => ({
        latitude: spot.latitude,
        longitude: spot.longitude,
      })),
      {
        edgePadding: { top: 120, right: 80, bottom: 160, left: 80 },
        animated: true,
      }
    );
  }, []);

  const loadSpots = useCallback(async () => {
    if (!coupleId) return;

    try {
      const [spotsData, categoriesData] = await Promise.all([
        fetchDateSpots(coupleId),
        fetchCategories(coupleId),
      ]);
      setSpots(spotsData);
      setCategories(categoriesData);
      fitToSpots(spotsData);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las citas.');
    } finally {
      setIsLoading(false);
    }
  }, [coupleId, fitToSpots]);

  // Refetch al volver de Galería/Timeline. Si algún día ambos editan el mapa
  // a la vez, el upgrade es un canal postgres_changes sobre date_spots
  // filtrado por couple_id (mismo patrón que AuthProvider).
  useFocusEffect(
    useCallback(() => {
      void loadSpots();
    }, [loadSpots])
  );

  const upsertSpotInState = useCallback((next: DateSpot) => {
    setSpots((prev) => {
      const exists = prev.some((spot) => spot.id === next.id);
      return exists
        ? prev.map((spot) => (spot.id === next.id ? next : spot))
        : [...prev, next];
    });
  }, []);

  const handleConfirmPlacement = async () => {
    const camera = await mapRef.current?.getCamera();

    if (!camera?.center) {
      Alert.alert('Error', 'No se pudo leer la posición del mapa.');
      return;
    }

    setPendingCoords({
      latitude: camera.center.latitude,
      longitude: camera.center.longitude,
    });
    setIsPlacing(false);
    setEditingSpot(null);
    setFormVisible(true);
  };

  const handleSubmitForm = async (values: SpotFormValues) => {
    if (!coupleId || !userId) return;

    try {
      setIsSavingSpot(true);

      if (editingSpot) {
        const updated = await updateDateSpot({
          spotId: editingSpot.id,
          coupleId,
          userId,
          title: values.title,
          description: values.description,
          plannedDate: values.plannedDate,
          categoryIds: values.categoryIds,
        });
        upsertSpotInState(updated);
        setDetailSpotId(updated.id);
      } else {
        if (!pendingCoords) return;

        const created = await createDateSpot({
          coupleId,
          userId,
          title: values.title,
          description: values.description,
          plannedDate: values.plannedDate,
          latitude: pendingCoords.latitude,
          longitude: pendingCoords.longitude,
          categoryIds: values.categoryIds,
        });
        upsertSpotInState(created);
      }

      setFormVisible(false);
      setEditingSpot(null);
      setPendingCoords(null);
      setSuggestedTitle(null);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar la cita.');
    } finally {
      setIsSavingSpot(false);
    }
  };

  const handleCreateCategory = async (
    name: string
  ): Promise<DateCategory | null> => {
    if (!coupleId || !userId) return null;

    try {
      const created = await createCategory({ coupleId, userId, name });
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      return created;
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'No se pudo crear la categoría. ¿Quizás ya existe una con ese nombre?'
      );
      return null;
    }
  };

  const handleRenameCategory = async (categoryId: string, name: string) => {
    try {
      const updated = await renameCategory(categoryId, name);
      setCategories((prev) =>
        prev
          .map((category) =>
            category.id === categoryId ? updated : category
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'No se pudo renombrar. ¿Quizás ya existe una categoría con ese nombre?'
      );
    }
  };

  const handleDeleteCategory = async (category: DateCategory) => {
    try {
      await deleteCategory(category.id);
      setCategories((prev) => prev.filter((item) => item.id !== category.id));
      setFilterCategoryIds((prev) => prev.filter((id) => id !== category.id));
      setSpots((prev) =>
        prev.map((spot) => ({
          ...spot,
          categoryIds: spot.categoryIds.filter((id) => id !== category.id),
        }))
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo eliminar la categoría.');
    }
  };

  const handleAddVisit = async (params: {
    visitedAt: string;
    asset: UploadableVisitAsset | null;
  }) => {
    if (!detailSpot || !coupleId || !userId) return;

    try {
      setIsMutatingVisit(true);

      const updated = await addVisit({
        spotId: detailSpot.id,
        coupleId,
        userId,
        visitedAt: params.visitedAt,
        asset: params.asset,
      });

      upsertSpotInState(updated);
      setAddVisitVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo registrar la visita.');
    } finally {
      setIsMutatingVisit(false);
    }
  };

  const executeRemoveVisit = async () => {
    if (!detailSpot) return;

    setConfirmAction(null);

    try {
      setIsMutatingVisit(true);
      const updated = await removeLatestVisit(detailSpot.id);
      upsertSpotInState(updated);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo quitar la visita.');
    } finally {
      setIsMutatingVisit(false);
    }
  };

  const executeDeleteSpot = async () => {
    if (!detailSpot) return;

    setConfirmAction(null);

    try {
      setIsMutatingVisit(true);
      await deleteDateSpot(detailSpot.id);
      setSpots((prev) => prev.filter((spot) => spot.id !== detailSpot.id));
      setDetailSpotId(null);
      setSelectedSpotId(null);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo eliminar la cita.');
    } finally {
      setIsMutatingVisit(false);
    }
  };

  const getSearchViewbox = async (): Promise<SearchViewbox | undefined> => {
    try {
      const bounds = await mapRef.current?.getMapBoundaries();
      if (!bounds) return undefined;

      return {
        lonMin: bounds.southWest.longitude,
        latMax: bounds.northEast.latitude,
        lonMax: bounds.northEast.longitude,
        latMin: bounds.southWest.latitude,
      };
    } catch {
      return undefined;
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    // Redirige al lugar y entra en modo colocación con el nombre como
    // título sugerido; el usuario ajusta el pin y confirma.
    setSuggestedTitle(place.title);
    setIsPlacing(true);

    mapRef.current?.animateToRegion(
      {
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.0035,
        longitudeDelta: 0.0035,
      },
      800
    );
  };

  const handleSelectFromCatalog = (spot: DateSpot) => {
    setCatalogVisible(false);
    setSelectedSpotId(spot.id);

    // Delta chico = zoom a nivel de calle, suficiente para des-clusterizar y
    // distinguir el pin seleccionado de sus vecinos.
    mapRef.current?.animateToRegion(
      {
        latitude: spot.latitude,
        longitude: spot.longitude,
        latitudeDelta: 0.0025,
        longitudeDelta: 0.0025,
      },
      700
    );

    setTimeout(() => {
      setDetailSpotId(spot.id);
    }, 750);
  };

  const handleCloseDetail = () => {
    setDetailSpotId(null);
    setSelectedSpotId(null);
  };

  const renderCluster = (cluster: {
    id: string | number;
    geometry: { coordinates: [number, number] };
    properties: { point_count: number };
    onPress: () => void;
  }) => {
    const count = cluster.properties.point_count;

    return (
      <ClusterBubble
        key={`cluster-${cluster.id}-${count}`}
        latitude={cluster.geometry.coordinates[1]}
        longitude={cluster.geometry.coordinates[0]}
        count={count}
        onPress={cluster.onPress}
      />
    );
  };

  if (!coupleState) {
    return (
      <SafeAreaView style={styles.centeredSafeArea}>
        <Text style={styles.centeredText}>No hay una pareja activa.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef as unknown as React.Ref<MapView>}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        radius={40}
        minPoints={2}
        renderCluster={renderCluster}
      >
        {visibleSpots.map((spot) => {
          const isSelected = spot.id === selectedSpotId;

          return (
            <Marker
              // Bitmap nativo (prop image) en vez de vista hija: los markers
              // con children no renderizan en Android con la Nueva
              // Arquitectura (react-native-maps#5877). La key fuerza un
              // icono fresco al cambiar estado/selección.
              key={`${spot.id}-${spot.status}-${isSelected}`}
              coordinate={{
                latitude: spot.latitude,
                longitude: spot.longitude,
              }}
              image={
                isSelected
                  ? SPOT_PIN_SELECTED_IMAGES[spot.status]
                  : SPOT_PIN_IMAGES[spot.status]
              }
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isSelected ? 10 : 1}
              onPress={() => {
                if (!isPlacing) {
                  setSelectedSpotId(spot.id);
                  setDetailSpotId(spot.id);
                }
              }}
            />
          );
        })}
      </ClusteredMapView>

      {isPlacing && (
        <View pointerEvents="none" style={styles.placingPinWrap}>
          <Image
            source={PLACING_PIN_IMAGE}
            fadeDuration={0}
            resizeMode="contain"
            style={styles.placingPin}
          />
        </View>
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>

          {!isPlacing && (
            <View style={styles.searchMiddle}>
              <PlaceSearchBar
                getViewbox={getSearchViewbox}
                onSelectPlace={handleSelectPlace}
              />
            </View>
          )}

          <View style={styles.topRightColumn}>
            <View style={styles.legend}>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: SPOT_PIN_COLORS.pendiente },
                  ]}
                />
                <Text style={styles.legendText}>Pendiente</Text>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: SPOT_PIN_COLORS.realizada },
                  ]}
                />
                <Text style={styles.legendText}>Realizada</Text>
              </View>
            </View>

            {filterCategoryIds.length > 0 && (
              <Pressable
                style={styles.filterPill}
                onPress={() => setFilterCategoryIds([])}
              >
                <Text style={styles.filterPillText}>
                  Filtro: {filterCategoryIds.length}{' '}
                  {filterCategoryIds.length === 1
                    ? 'categoría'
                    : 'categorías'}{' '}
                  ✕
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {isLoading && (
          <View style={styles.loadingPill}>
            <ActivityIndicator color="#C84B55" />
          </View>
        )}

        <View style={styles.bottomArea} pointerEvents="box-none">
          {isPlacing ? (
            <>
              <Text style={styles.placingHint}>
                Mueve el mapa hasta dejar el pin sobre el lugar de la cita
              </Text>

              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setIsPlacing(false);
                    setSuggestedTitle(null);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void handleConfirmPlacement()}
                >
                  <Text style={styles.primaryButtonText}>Confirmar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => setIsPlacing(true)}
              >
                <Text style={styles.primaryButtonText}>Generar Cita</Text>
              </Pressable>

              <Pressable
                style={styles.primaryButton}
                onPress={() => setCatalogVisible(true)}
              >
                <Text style={styles.primaryButtonText}>Catálogo</Text>
              </Pressable>

              <Pressable
                style={styles.primaryButton}
                onPress={() => navigation.navigate('DateGallery')}
              >
                <Text style={styles.primaryButtonText}>Galería</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>

      <SpotFormModal
        visible={formVisible}
        initialSpot={editingSpot}
        initialTitle={editingSpot ? null : suggestedTitle}
        categories={categories}
        submitting={isSavingSpot}
        onSubmit={handleSubmitForm}
        onCreateCategory={handleCreateCategory}
        onClose={() => {
          setFormVisible(false);
          setEditingSpot(null);
          setPendingCoords(null);
          setSuggestedTitle(null);
        }}
      />

      <SpotDetailModal
        spot={detailSpot}
        visible={
          !!detailSpot && !formVisible && !addVisitVisible && !confirmAction
        }
        categories={categories}
        creatorName={detailCreatorName}
        busy={isMutatingVisit}
        onAddVisit={() => setAddVisitVisible(true)}
        onRemoveVisit={() => setConfirmAction('removeVisit')}
        onEdit={() => {
          setEditingSpot(detailSpot);
          setFormVisible(true);
        }}
        onDelete={() => setConfirmAction('deleteSpot')}
        onOpenTimeline={() => {
          if (!detailSpot) return;
          handleCloseDetail();
          navigation.navigate('DateSpotTimeline', {
            spotId: detailSpot.id,
            title: detailSpot.title,
          });
        }}
        onClose={handleCloseDetail}
      />

      <ConfirmModal
        visible={confirmAction === 'deleteSpot'}
        message={`Se eliminará "${detailSpot?.title ?? ''}" junto con todas sus visitas y fotos.`}
        checkLabel="Entiendo que se borrará todo y no se puede deshacer"
        confirmLabel="Sí, eliminar"
        onConfirm={() => void executeDeleteSpot()}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmModal
        visible={confirmAction === 'removeVisit'}
        title="Quitar visita"
        message="¿Eliminar la última visita registrada? Si tiene foto, también se borrará."
        checkLabel="Entiendo que la visita y su foto se borran"
        confirmLabel="Sí, quitar"
        onConfirm={() => void executeRemoveVisit()}
        onCancel={() => setConfirmAction(null)}
      />

      <AddVisitModal
        visible={addVisitVisible}
        submitting={isMutatingVisit}
        onSubmit={(params) => void handleAddVisit(params)}
        onClose={() => setAddVisitVisible(false)}
      />

      <CatalogModal
        visible={catalogVisible}
        spots={visibleSpots}
        categories={categories}
        filterCategoryIds={filterCategoryIds}
        onToggleFilterCategory={(categoryId) =>
          setFilterCategoryIds((prev) =>
            prev.includes(categoryId)
              ? prev.filter((id) => id !== categoryId)
              : [...prev, categoryId]
          )
        }
        onClearFilter={() => setFilterCategoryIds([])}
        onRenameCategory={(categoryId, name) =>
          void handleRenameCategory(categoryId, name)
        }
        onDeleteCategory={(category) => void handleDeleteCategory(category)}
        onSelectSpot={handleSelectFromCatalog}
        onClose={() => setCatalogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredSafeArea: {
    flex: 1,
    backgroundColor: '#FFD9E0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centeredText: {
    color: '#7C3043',
    fontWeight: '700',
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  searchMiddle: {
    flex: 1,
  },
  topRightColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    backgroundColor: '#FFF0F4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    color: '#7C3043',
    fontWeight: '700',
    fontSize: 12,
  },
  filterPill: {
    backgroundColor: '#C84B55',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterPillText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  loadingPill: {
    alignSelf: 'center',
    backgroundColor: '#FFF0F4',
    borderRadius: 999,
    padding: 10,
  },
  // El pin de colocación se ancla con la punta en el centro exacto de la
  // pantalla: el ícono se desplaza media altura hacia arriba.
  placingPinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placingPin: {
    height: PLACING_PIN_SIZE,
    width: PLACING_PIN_SIZE * PIN_ASPECT,
    marginTop: -PLACING_PIN_SIZE,
  },
  bottomArea: {
    paddingHorizontal: 14,
    paddingBottom: 18,
    gap: 10,
  },
  placingHint: {
    alignSelf: 'center',
    backgroundColor: '#FFF0F4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#7C3043',
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFF0F4',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9E4258',
    fontWeight: '900',
  },
});
