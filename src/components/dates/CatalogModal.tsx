import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DateCategory, DateSpot } from '../../types/dates';
import { formatDateLong } from '../../utils/countdown';
import { SPOT_PIN_COLORS } from './SpotPin';
import ConfirmModal from '../ConfirmModal';

type Props = {
  visible: boolean;
  spots: DateSpot[];
  categories: DateCategory[];
  filterCategoryIds: string[];
  onToggleFilterCategory: (categoryId: string) => void;
  onClearFilter: () => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onDeleteCategory: (category: DateCategory) => void;
  onSelectSpot: (spot: DateSpot) => void;
  onClose: () => void;
};

export default function CatalogModal({
  visible,
  spots,
  categories,
  filterCategoryIds,
  onToggleFilterCategory,
  onClearFilter,
  onRenameCategory,
  onDeleteCategory,
  onSelectSpot,
  onClose,
}: Props) {
  const [renamingCategory, setRenamingCategory] =
    useState<DateCategory | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingCategory, setDeletingCategory] =
    useState<DateCategory | null>(null);

  useEffect(() => {
    if (!visible) {
      setRenamingCategory(null);
      setDeletingCategory(null);
    }
  }, [visible]);

  const sections = useMemo(() => {
    const pendientes = spots.filter((spot) => spot.status === 'pendiente');
    const realizadas = spots.filter((spot) => spot.status === 'realizada');

    return [
      { title: 'Pendientes', data: pendientes },
      { title: 'Realizadas', data: realizadas },
    ].filter((section) => section.data.length > 0);
  }, [spots]);

  const handleLongPressCategory = (category: DateCategory) => {
    Alert.alert(category.name, '¿Qué quieres hacer con esta categoría?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Renombrar',
        onPress: () => {
          setRenameValue(category.name);
          setRenamingCategory(category);
        },
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => setDeletingCategory(category),
      },
    ]);
  };

  const handleConfirmRename = () => {
    if (!renamingCategory || !renameValue.trim()) return;

    onRenameCategory(renamingCategory.id, renameValue.trim());
    setRenamingCategory(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Catálogo de citas</Text>

          {categories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <Pressable
                style={[
                  styles.filterChip,
                  filterCategoryIds.length === 0 && styles.filterChipSelected,
                ]}
                onPress={onClearFilter}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterCategoryIds.length === 0 &&
                      styles.filterChipTextSelected,
                  ]}
                >
                  Todas
                </Text>
              </Pressable>

              {categories.map((category) => {
                const selected = filterCategoryIds.includes(category.id);

                return (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipSelected,
                    ]}
                    onPress={() => onToggleFilterCategory(category.id)}
                    onLongPress={() => handleLongPressCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selected && styles.filterChipTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {categories.length > 0 && (
            <Text style={styles.filterHint}>
              Mantén presionada una categoría para renombrarla o eliminarla.
            </Text>
          )}

          {sections.length === 0 ? (
            <Text style={styles.emptyText}>
              {filterCategoryIds.length > 0
                ? 'No hay citas en las categorías seleccionadas.'
                : 'Aún no tienen citas. ¡Generen la primera!'}
            </Text>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>{section.title}</Text>
              )}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => onSelectSpot(item)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: SPOT_PIN_COLORS[item.status],
                      },
                    ]}
                  />

                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowSubtitle}>
                      {item.planned_date
                        ? formatDateLong(item.planned_date)
                        : 'Sin fecha'}
                    </Text>
                  </View>

                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {item.visit_count}
                    </Text>
                  </View>
                </Pressable>
              )}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
            />
          )}
        </View>
      </View>

      <ConfirmModal
        visible={!!deletingCategory}
        message={`Se eliminará la categoría "${deletingCategory?.name ?? ''}". Las citas no se borran, solo pierden la etiqueta.`}
        checkLabel="Entiendo que la categoría se quita de todas las citas"
        confirmLabel="Sí, eliminar"
        onConfirm={() => {
          if (deletingCategory) {
            onDeleteCategory(deletingCategory);
          }
          setDeletingCategory(null);
        }}
        onCancel={() => setDeletingCategory(null)}
      />

      <Modal
        visible={!!renamingCategory}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingCategory(null)}
      >
        <View style={styles.renameBackdrop}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Renombrar categoría</Text>

            <TextInput
              style={styles.renameInput}
              value={renameValue}
              onChangeText={setRenameValue}
              maxLength={40}
              autoFocus
            />

            <Pressable
              style={[
                styles.renameButton,
                !renameValue.trim() && styles.disabledButton,
              ]}
              onPress={handleConfirmRename}
              disabled={!renameValue.trim()}
            >
              <Text style={styles.renameButtonText}>Guardar</Text>
            </Pressable>

            <Pressable
              style={styles.renameCancelButton}
              onPress={() => setRenamingCategory(null)}
            >
              <Text style={styles.renameCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(63, 21, 32, 0.42)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: '#FFF0F4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#F3B9C7',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#7C3043',
    textAlign: 'center',
    marginBottom: 10,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    backgroundColor: '#FFE1E9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipSelected: {
    backgroundColor: '#C84B55',
  },
  filterChipText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  filterHint: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 6,
    marginBottom: 4,
  },
  emptyText: {
    color: '#9E4258',
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 24,
  },
  listContent: {
    paddingBottom: 8,
  },
  sectionHeader: {
    color: '#9E4258',
    fontWeight: '900',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 16,
  },
  rowSubtitle: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(63, 21, 32, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  renameCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 20,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7C3043',
    textAlign: 'center',
    marginBottom: 12,
  },
  renameInput: {
    height: 52,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#7C3043',
    marginBottom: 12,
  },
  renameButton: {
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  renameButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  renameCancelButton: {
    marginTop: 10,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  renameCancelText: {
    color: '#9E4258',
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
});
