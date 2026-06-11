import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DateCategory, DateSpot } from '../../types/dates';
import { formatDateLong } from '../../utils/countdown';

type Props = {
  spot: DateSpot | null;
  visible: boolean;
  categories: DateCategory[];
  creatorName: string;
  busy: boolean;
  onAddVisit: () => void;
  onRemoveVisit: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenTimeline: () => void;
  onClose: () => void;
};

export default function SpotDetailModal({
  spot,
  visible,
  categories,
  creatorName,
  busy,
  onAddVisit,
  onRemoveVisit,
  onEdit,
  onDelete,
  onOpenTimeline,
  onClose,
}: Props) {
  if (!spot) return null;

  const isRealizada = spot.status === 'realizada';

  const spotCategories = categories.filter((category) =>
    spot.categoryIds.includes(category.id)
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {spot.title}
            </Text>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.statusChip,
              isRealizada ? styles.statusChipDone : styles.statusChipPending,
            ]}
          >
            <Text style={styles.statusChipText}>
              {isRealizada ? '❤ Realizada' : '♡ Pendiente'}
            </Text>
          </View>

          {spotCategories.length > 0 && (
            <View style={styles.categoriesRow}>
              {spotCategories.map((category) => (
                <View key={category.id} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{category.name}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>Fecha</Text>
          <Text style={styles.fieldValue}>
            {spot.planned_date ? formatDateLong(spot.planned_date) : 'Sin fecha'}
          </Text>

          {!!spot.description && (
            <>
              <Text style={styles.fieldLabel}>Descripción</Text>
              <Text style={styles.fieldValue}>{spot.description}</Text>
            </>
          )}

          <View style={styles.counterRow}>
            <Pressable
              style={[
                styles.counterButton,
                (spot.visit_count === 0 || busy) && styles.disabledButton,
              ]}
              onPress={onRemoveVisit}
              disabled={spot.visit_count === 0 || busy}
            >
              <Text style={styles.counterButtonText}>−</Text>
            </Pressable>

            <View style={styles.counterCenter}>
              <Text style={styles.counterLabel}>Cantidad de veces</Text>
              {busy ? (
                <ActivityIndicator color="#7C3043" />
              ) : (
                <Text style={styles.counterValue}>{spot.visit_count}</Text>
              )}
            </View>

            <Pressable
              style={[styles.counterButton, busy && styles.disabledButton]}
              onPress={onAddVisit}
              disabled={busy}
            >
              <Text style={styles.counterButtonText}>+</Text>
            </Pressable>
          </View>

          {spot.visit_count > 0 && (
            <Pressable style={styles.timelineLink} onPress={onOpenTimeline}>
              <Text style={styles.timelineLinkText}>
                Ver recuerdos ({spot.visit_count})
              </Text>
            </Pressable>
          )}

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionButton, busy && styles.disabledButton]}
              onPress={onDelete}
              disabled={busy}
            >
              <Text style={styles.actionButtonText}>Eliminar</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, busy && styles.disabledButton]}
              onPress={onEdit}
              disabled={busy}
            >
              <Text style={styles.actionButtonText}>Editar</Text>
            </Pressable>
          </View>

          <Text style={styles.auditText}>Creada por {creatorName}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(63, 21, 32, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: '#7C3043',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  statusChip: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  statusChipPending: {
    backgroundColor: '#F3B9C7',
  },
  statusChipDone: {
    backgroundColor: '#C84B55',
  },
  statusChipText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: '#FFE1E9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryChipText: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
  },
  fieldLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  fieldValue: {
    color: '#7C3043',
    fontWeight: '700',
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFE7EE',
    borderRadius: 18,
    padding: 12,
    marginTop: 4,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    lineHeight: 24,
  },
  counterCenter: {
    flex: 1,
    alignItems: 'center',
  },
  counterLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 13,
  },
  counterValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 22,
  },
  timelineLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  timelineLinkText: {
    color: '#C84B55',
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  auditText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
