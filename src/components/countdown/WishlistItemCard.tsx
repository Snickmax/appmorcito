import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WishlistItem } from '../../types/countdown';
import {
  formatMoney,
  formatPriorityLabel,
} from '../../utils/countdown';

type Props = {
  item: WishlistItem;
  disabled?: boolean;
  onMarkPurchased: () => void;
  onReopen: () => void;
  onArchive: () => void;
};

export default function WishlistItemCard({
  item,
  disabled = false,
  onMarkPurchased,
  onReopen,
  onArchive,
}: Props) {
  const handleOpenUrl = async () => {
    if (!item.url) return;

    const supported = await Linking.canOpenURL(item.url);

    if (!supported) {
      Alert.alert('Link inválido', 'No se pudo abrir este enlace.');
      return;
    }

    await Linking.openURL(item.url);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.title}</Text>

        <View style={styles.priorityChip}>
          <Text style={styles.priorityChipText}>
            {formatPriorityLabel(item.priority)}
          </Text>
        </View>
      </View>

      {!!item.description?.trim() && (
        <Text style={styles.description}>{item.description}</Text>
      )}

      {item.estimated_price != null && (
        <Text style={styles.meta}>
          {formatMoney(item.estimated_price, item.currency)}
        </Text>
      )}

      {!!item.url?.trim() && (
        <Pressable onPress={handleOpenUrl}>
          <Text style={styles.linkText}>Abrir link</Text>
        </Pressable>
      )}

      <View style={styles.actionsRow}>
        {item.status === 'active' ? (
          <>
            <Pressable
              style={[styles.actionButton, disabled && styles.disabledButton]}
              onPress={onMarkPurchased}
              disabled={disabled}
            >
              <Text style={styles.actionButtonText}>Comprado</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, disabled && styles.disabledButton]}
              onPress={onArchive}
              disabled={disabled}
            >
              <Text style={styles.actionButtonText}>Archivar</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[styles.actionButton, disabled && styles.disabledButton]}
              onPress={onReopen}
              disabled={disabled}
            >
              <Text style={styles.actionButtonText}>Reactivar</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, disabled && styles.disabledButton]}
              onPress={onArchive}
              disabled={disabled}
            >
              <Text style={styles.actionButtonText}>Archivar</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFE7EE',
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    color: '#7C3043',
    fontWeight: '800',
    fontSize: 16,
  },
  priorityChip: {
    backgroundColor: '#FFF0F4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityChipText: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
  },
  description: {
    color: '#9E4258',
    fontWeight: '600',
  },
  meta: {
    color: '#9E4258',
    fontWeight: '700',
  },
  linkText: {
    color: '#C84B55',
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFF0F4',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#9E4258',
    fontWeight: '800',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.45,
  },
});