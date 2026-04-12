import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  archiveWishlistItem,
  createWishlistItem,
  fetchMyActiveCoupleCountdownMembers,
  fetchWishlistItems,
  updateWishlistItemStatus,
} from '../lib/countdownService';
import {
  CountdownCoupleMember,
  CountdownSelection,
  WishlistItem,
  WishlistPriority,
} from '../types/countdown';
import {
  formatDateLong,
  getDisplayName,
  getNextAnniversaryDate,
  getNextBirthdayDate,
  isBirthdayToday,
} from '../utils/countdown';
import { useCountdownTimer } from '../hooks/useCountdownTimer';
import CountdownHeroPanel from '../components/countdown/CountdownHeroPanel';
import CountdownPersonCard from '../components/countdown/CountdownPersonCard';
import CountdownAnniversaryButton from '../components/countdown/CountdownAnniversaryButton';
import WishlistItemCard from '../components/countdown/WishlistItemCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Countdown'>;

const maleIcon = require('../../assets/images/men.png');
const femaleIcon = require('../../assets/images/mujer.png');
const heartIcon = require('../../assets/images/corazon.png');
const calendarIcon = require('../../assets/images/calendario.png');

const PRIORITY_OPTIONS: WishlistPriority[] = ['low', 'medium', 'high'];

function parseEstimatedPrice(value: string) {
  const normalized = value
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function getMemberIcon(member: CountdownCoupleMember | null) {
  if (!member) return heartIcon;
  if (member.visual_gender === 'female') return femaleIcon;
  if (member.visual_gender === 'male') return maleIcon;
  return heartIcon;
}

export default function CountdownScreen({ navigation }: Props) {
  const { coupleState, coupleMembers } = useAuth();

  const [members, setMembers] = useState<CountdownCoupleMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const [selectedView, setSelectedView] =
    useState<CountdownSelection>('anniversary');

  const [wishlistOwnerUserId, setWishlistOwnerUserId] = useState<string | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const [pendingWishlistItemId, setPendingWishlistItemId] = useState<string | null>(
    null
  );

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isSavingWishlist, setIsSavingWishlist] = useState(false);
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [wishlistDescription, setWishlistDescription] = useState('');
  const [wishlistUrl, setWishlistUrl] = useState('');
  const [wishlistEstimatedPrice, setWishlistEstimatedPrice] = useState('');
  const [wishlistPriority, setWishlistPriority] =
    useState<WishlistPriority>('medium');

  const memberRefreshKey = useMemo(
    () =>
      coupleMembers
        .map((member) => `${member.user_id}-${member.joined_at}`)
        .join('|'),
    [coupleMembers]
  );

  const loadMembers = useCallback(async () => {
    try {
      setIsLoadingMembers(true);
      const data = await fetchMyActiveCoupleCountdownMembers();
      setMembers(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar la información de la pareja.');
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  const loadWishlist = useCallback(
    async (ownerUserId: string | null | undefined) => {
      if (!coupleState?.couple_id || !ownerUserId) {
        setWishlistItems([]);
        setIsLoadingWishlist(false);
        return;
      }

      try {
        setIsLoadingWishlist(true);
        const data = await fetchWishlistItems({
          coupleId: coupleState.couple_id,
          ownerUserId,
        });
        setWishlistItems(data);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'No se pudo cargar la wishlist.');
      } finally {
        setIsLoadingWishlist(false);
      }
    },
    [coupleState?.couple_id]
  );

  useEffect(() => {
    if (!coupleState?.couple_id) {
      setMembers([]);
      setIsLoadingMembers(false);
      return;
    }

    void loadMembers();
  }, [coupleState?.couple_id, memberRefreshKey, loadMembers]);

  useEffect(() => {
    if (!members.length) {
      setWishlistOwnerUserId(null);
      return;
    }

    if (selectedView !== 'anniversary') {
      const exists = members.some((member) => member.user_id === selectedView);

      if (!exists) {
        setSelectedView('anniversary');
      }
    }

    if (
      selectedView !== 'anniversary' &&
      members.some((member) => member.user_id === selectedView)
    ) {
      setWishlistOwnerUserId(selectedView);
      return;
    }

    if (wishlistOwnerUserId && members.some((member) => member.user_id === wishlistOwnerUserId)) {
      return;
    }

    const me = members.find((member) => member.is_me) ?? members[0];
    setWishlistOwnerUserId(me.user_id);
  }, [members, selectedView, wishlistOwnerUserId]);

  const selectedBirthdayMember = useMemo(() => {
    if (selectedView === 'anniversary') return null;
    return members.find((member) => member.user_id === selectedView) ?? null;
  }, [members, selectedView]);

  const selectedWishlistOwner = useMemo(
    () => members.find((member) => member.user_id === wishlistOwnerUserId) ?? null,
    [members, wishlistOwnerUserId]
  );

  useEffect(() => {
    if (!wishlistOwnerUserId) {
      setWishlistItems([]);
      return;
    }

    void loadWishlist(wishlistOwnerUserId);
  }, [wishlistOwnerUserId, loadWishlist]);

  useFocusEffect(
    useCallback(() => {
      void loadMembers();

      if (wishlistOwnerUserId) {
        void loadWishlist(wishlistOwnerUserId);
      }
    }, [loadMembers, loadWishlist, wishlistOwnerUserId])
  );

  useEffect(() => {
    if (!coupleState?.couple_id) return;

    const memberIds = new Set(members.map((member) => member.user_id));

    const channel = supabase
      .channel(`countdown-live-${coupleState.couple_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist_items',
          filter: `couple_id=eq.${coupleState.couple_id}`,
        },
        async (payload) => {
          const ownerUserId = String(
            (payload.new as { owner_user_id?: string } | null)?.owner_user_id ??
              (payload.old as { owner_user_id?: string } | null)?.owner_user_id ??
              ''
          );

          if (ownerUserId && ownerUserId === wishlistOwnerUserId) {
            await loadWishlist(ownerUserId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        async (payload) => {
          const changedProfileId = String(
            (payload.new as { id?: string } | null)?.id ??
              (payload.old as { id?: string } | null)?.id ??
              ''
          );

          if (changedProfileId && memberIds.has(changedProfileId)) {
            await loadMembers();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    coupleState?.couple_id,
    members,
    wishlistOwnerUserId,
    loadMembers,
    loadWishlist,
  ]);

  const anniversaryTarget = useMemo(
    () => getNextAnniversaryDate(coupleState?.relationship_start_date),
    [coupleState?.relationship_start_date]
  );

  const birthdayTarget = useMemo(
    () => getNextBirthdayDate(selectedBirthdayMember?.birth_date),
    [selectedBirthdayMember?.birth_date]
  );

  const anniversaryTime = useCountdownTimer(anniversaryTarget);
  const birthdayTime = useCountdownTimer(birthdayTarget);

  const activeWishlistItems = useMemo(
    () => wishlistItems.filter((item) => item.status === 'active'),
    [wishlistItems]
  );

  const purchasedWishlistItems = useMemo(
    () => wishlistItems.filter((item) => item.status === 'purchased'),
    [wishlistItems]
  );

  const resetWishlistForm = () => {
    setWishlistTitle('');
    setWishlistDescription('');
    setWishlistUrl('');
    setWishlistEstimatedPrice('');
    setWishlistPriority('medium');
  };

  const handleCreateWishlistItem = async () => {
    if (!coupleState?.couple_id || !selectedWishlistOwner?.user_id) {
      return;
    }

    if (!wishlistTitle.trim()) {
      Alert.alert('Falta título', 'Ingresa el nombre del regalo.');
      return;
    }

    const estimatedPrice = parseEstimatedPrice(wishlistEstimatedPrice);

    if (wishlistEstimatedPrice.trim() && estimatedPrice == null) {
      Alert.alert('Precio inválido', 'Ingresa un precio válido.');
      return;
    }

    try {
      setIsSavingWishlist(true);

      await createWishlistItem({
        coupleId: coupleState.couple_id,
        ownerUserId: selectedWishlistOwner.user_id,
        title: wishlistTitle.trim(),
        description: wishlistDescription.trim() || null,
        url: wishlistUrl.trim() || null,
        estimatedPrice,
        currency: 'CLP',
        priority: wishlistPriority,
      });

      setAddModalVisible(false);
      resetWishlistForm();
      await loadWishlist(selectedWishlistOwner.user_id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el regalo.');
    } finally {
      setIsSavingWishlist(false);
    }
  };

  const handleChangeWishlistStatus = async (
    itemId: string,
    nextStatus: 'active' | 'purchased' | 'archived'
  ) => {
    if (!selectedWishlistOwner?.user_id) return;

    try {
      setPendingWishlistItemId(itemId);

      if (nextStatus === 'archived') {
        await archiveWishlistItem(itemId);
      } else {
        await updateWishlistItemStatus(itemId, nextStatus);
      }

      await loadWishlist(selectedWishlistOwner.user_id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo actualizar el regalo.');
    } finally {
      setPendingWishlistItemId(null);
    }
  };

  const handleSelectAnniversary = () => {
    setSelectedView('anniversary');
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedView(memberId);
    setWishlistOwnerUserId(memberId);
  };

  const anniversaryRelationshipName =
    coupleState?.couple_name?.trim() || 'Nuestra relación';

  const isTodaySelectedBirthday = isBirthdayToday(selectedBirthdayMember?.birth_date);

  if (!coupleState) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <Text style={styles.centeredText}>No hay una pareja activa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBar}>
          <Pressable style={styles.headerBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.headerBackText}>←</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Cuenta Regresiva</Text>
        </View>

        
        <View style={styles.selectorBlock}>
          <View style={styles.peopleRow}>
            {members.map((member) => (
              <CountdownPersonCard
                key={member.user_id}
                title={getDisplayName(member)}
                icon={getMemberIcon(member)}
                selected={selectedView === member.user_id}
                onPress={() => handleSelectMember(member.user_id)}
              />
            ))}
          </View>

          <CountdownAnniversaryButton
            icon={calendarIcon}
            selected={selectedView === 'anniversary'}
            onPress={handleSelectAnniversary}
          />
        </View>
{isLoadingMembers ? (
          <View style={styles.mainCard}>
            <ActivityIndicator color="#B94E65" />
          </View>
        ) : selectedView === 'anniversary' ? (
          <CountdownHeroPanel
            icon={heartIcon}
            title="Próximo aniversario"
            subtitle={anniversaryRelationshipName}
            dateLabel={formatDateLong(anniversaryTarget)}
            timeParts={anniversaryTime}
          />
        ) : selectedBirthdayMember?.birth_date ? (
          isTodaySelectedBirthday ? (
            <CountdownHeroPanel
              icon={getMemberIcon(selectedBirthdayMember)}
              title={`¡Feliz cumpleaños, ${getDisplayName(selectedBirthdayMember)}!`}
              subtitle="Hoy es un día especial"
              dateLabel={formatDateLong(selectedBirthdayMember.birth_date)}
              celebrationText="Hoy"
            />
          ) : (
            <CountdownHeroPanel
              icon={getMemberIcon(selectedBirthdayMember)}
              title={`Cumpleaños de ${getDisplayName(selectedBirthdayMember)}`}
              subtitle={selectedBirthdayMember.is_me ? 'Tu próximo cumpleaños' : 'El próximo cumpleaños de tu pareja'}
              dateLabel={formatDateLong(birthdayTarget)}
              timeParts={birthdayTime}
            />
          )
        ) : (
          <View style={styles.mainCard}>
            <Text style={styles.mainEmptyTitle}>Cumpleaños no configurado</Text>
            <Text style={styles.mainEmptyText}>
              {selectedBirthdayMember?.is_me
                ? 'Guarda tu cumpleaños en Configuración para ver la cuenta regresiva.'
                : 'Esta persona todavía no tiene cumpleaños guardado.'}
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate('CoupleSettings')}
            >
              <Text style={styles.primaryButtonText}>Ir a Configuración</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.wishlistCard}>
          <View style={styles.wishlistHeaderRow}>
            <View style={styles.wishlistHeaderTextWrap}>
              <Text style={styles.wishlistTitle}>Wishlist</Text>
              <Text style={styles.wishlistSubtitle}>
                {selectedWishlistOwner
                  ? `Deseos de ${getDisplayName(selectedWishlistOwner)}`
                  : 'Selecciona una persona'}
              </Text>
            </View>

            <Pressable
              style={styles.addButton}
              onPress={() => setAddModalVisible(true)}
              disabled={!selectedWishlistOwner}
            >
              <Text style={styles.addButtonText}>+ Agregar</Text>
            </Pressable>
          </View>
          
          {selectedView === 'anniversary' && members.length > 1 && (
            <View style={styles.wishlistOwnerRow}>
              {members.map((member) => {
                const selected = wishlistOwnerUserId === member.user_id;

                return (
                  <Pressable
                    key={member.user_id}
                    style={[
                      styles.wishlistOwnerChip,
                      selected && styles.wishlistOwnerChipSelected,
                    ]}
                    onPress={() => setWishlistOwnerUserId(member.user_id)}
                  >
                    <Text
                      style={[
                        styles.wishlistOwnerChipText,
                        selected && styles.wishlistOwnerChipTextSelected,
                      ]}
                    >
                      {getDisplayName(member)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Activos</Text>
              <Text style={styles.summaryValue}>{activeWishlistItems.length}</Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Comprados</Text>
              <Text style={styles.summaryValue}>{purchasedWishlistItems.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.wishlistCard}>
          <Text style={styles.sectionTitle}>Deseos activos</Text>

          {isLoadingWishlist ? (
            <ActivityIndicator color="#B94E65" />
          ) : activeWishlistItems.length ? (
            <View style={styles.list}>
              {activeWishlistItems.map((item) => (
                <WishlistItemCard
                  key={item.id}
                  item={item}
                  disabled={pendingWishlistItemId === item.id}
                  onMarkPurchased={() =>
                    void handleChangeWishlistStatus(item.id, 'purchased')
                  }
                  onReopen={() =>
                    void handleChangeWishlistStatus(item.id, 'active')
                  }
                  onArchive={() =>
                    void handleChangeWishlistStatus(item.id, 'archived')
                  }
                />
              ))}
            </View>
          ) : (
            <>
              <Text style={styles.emptyText}>No hay regalos activos todavía.</Text>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => setAddModalVisible(true)}
                disabled={!selectedWishlistOwner}
              >
                <Text style={styles.secondaryButtonText}>Agregar regalo</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.wishlistCard}>
          <Text style={styles.sectionTitle}>Comprados</Text>

          {isLoadingWishlist ? (
            <ActivityIndicator color="#B94E65" />
          ) : purchasedWishlistItems.length ? (
            <View style={styles.list}>
              {purchasedWishlistItems.map((item) => (
                <WishlistItemCard
                  key={item.id}
                  item={item}
                  disabled={pendingWishlistItemId === item.id}
                  onMarkPurchased={() =>
                    void handleChangeWishlistStatus(item.id, 'purchased')
                  }
                  onReopen={() =>
                    void handleChangeWishlistStatus(item.id, 'active')
                  }
                  onArchive={() =>
                    void handleChangeWishlistStatus(item.id, 'archived')
                  }
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Todavía no hay regalos marcados como comprados.
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Nuevo regalo para {getDisplayName(selectedWishlistOwner)}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del regalo"
              placeholderTextColor="#A66B79"
              value={wishlistTitle}
              onChangeText={setWishlistTitle}
            />

            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#A66B79"
              value={wishlistDescription}
              onChangeText={setWishlistDescription}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Link (opcional)"
              placeholderTextColor="#A66B79"
              value={wishlistUrl}
              onChangeText={setWishlistUrl}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Precio estimado (opcional)"
              placeholderTextColor="#A66B79"
              value={wishlistEstimatedPrice}
              onChangeText={setWishlistEstimatedPrice}
              keyboardType="numeric"
            />

            <Text style={styles.modalSectionTitle}>Prioridad</Text>

            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((priority) => {
                const selected = wishlistPriority === priority;

                return (
                  <Pressable
                    key={priority}
                    style={[
                      styles.priorityChip,
                      selected && styles.priorityChipSelected,
                    ]}
                    onPress={() => setWishlistPriority(priority)}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        selected && styles.priorityChipTextSelected,
                      ]}
                    >
                      {priority === 'low'
                        ? 'Baja'
                        : priority === 'medium'
                        ? 'Media'
                        : 'Alta'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                isSavingWishlist && styles.disabledButton,
              ]}
              onPress={handleCreateWishlistItem}
              disabled={isSavingWishlist}
            >
              {isSavingWishlist ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar regalo</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setAddModalVisible(false);
                resetWishlistForm();
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
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
    backgroundColor: '#E8B6BE',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centeredText: {
    color: '#7C3043',
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
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
  headerBackText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 18,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },
  mainCard: {
    backgroundColor: '#F1E4E4',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  mainEmptyTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  mainEmptyText: {
    color: '#9E4258',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectorBlock: {
    gap: 10,
  },
  peopleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  wishlistCard: {
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 16,
  },
  wishlistHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  wishlistHeaderTextWrap: {
    flex: 1,
  },
  wishlistTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 22,
    marginBottom: 4,
  },
  wishlistSubtitle: {
    color: '#9E4258',
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#9E4258',
    fontWeight: '900',
  },
  wishlistOwnerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  wishlistOwnerChip: {
    backgroundColor: '#FFE1E9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  wishlistOwnerChipSelected: {
    backgroundColor: '#C84B55',
  },
  wishlistOwnerChipText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  wishlistOwnerChipTextSelected: {
    color: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#9E4258',
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 24,
  },
  sectionTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 20,
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  emptyText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9E4258',
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
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
    fontWeight: '900',
    color: '#7C3043',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSectionTitle: {
    color: '#7C3043',
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    height: 52,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#7C3043',
    marginBottom: 12,
  },
  multilineInput: {
    minHeight: 90,
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  priorityChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFE1E9',
  },
  priorityChipSelected: {
    backgroundColor: '#C84B55',
  },
  priorityChipText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  priorityChipTextSelected: {
    color: '#FFFFFF',
  },
});