import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateField from '../DateField';
import { DateCategory, DateSpot } from '../../types/dates';

export type SpotFormValues = {
  title: string;
  description: string | null;
  plannedDate: string | null;
  categoryIds: string[];
};

type Props = {
  visible: boolean;
  initialSpot?: DateSpot | null;
  // Título sugerido por la búsqueda de lugares; solo aplica en modo crear.
  initialTitle?: string | null;
  categories: DateCategory[];
  submitting: boolean;
  onSubmit: (values: SpotFormValues) => void;
  onCreateCategory: (name: string) => Promise<DateCategory | null>;
  onClose: () => void;
};

export default function SpotFormModal({
  visible,
  initialSpot,
  initialTitle,
  categories,
  submitting,
  onSubmit,
  onCreateCategory,
  onClose,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [newCategoryVisible, setNewCategoryVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const isEdit = !!initialSpot;

  useEffect(() => {
    if (!visible) return;

    setTitle(initialSpot?.title ?? initialTitle ?? '');
    setDescription(initialSpot?.description ?? '');
    setPlannedDate(initialSpot?.planned_date ?? '');
    setCategoryIds(initialSpot?.categoryIds ?? []);
    setNewCategoryVisible(false);
    setNewCategoryName('');
  }, [visible, initialSpot, initialTitle]);

  const canSubmit = !!title.trim() && !submitting;

  const toggleCategory = (categoryId: string) => {
    setCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || creatingCategory) return;

    setCreatingCategory(true);

    const created = await onCreateCategory(name);

    setCreatingCategory(false);

    if (created) {
      setCategoryIds((prev) => [...prev, created.id]);
      setNewCategoryName('');
      setNewCategoryVisible(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      plannedDate: plannedDate || null,
      categoryIds,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {isEdit ? 'Editar Cita' : 'Nueva Cita'}
              </Text>

              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Título (ej: Café del centro)"
              placeholderTextColor="#A66B79"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            <DateField
              label="Fecha"
              value={plannedDate}
              onChange={setPlannedDate}
              maximumDate={null}
            />

            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#A66B79"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={600}
            />

            <Text style={styles.sectionTitle}>Categorías</Text>

            <View style={styles.chipsRow}>
              {categories.map((category) => {
                const selected = categoryIds.includes(category.id);

                return (
                  <Pressable
                    key={category.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                style={[styles.chip, styles.chipNew]}
                onPress={() => setNewCategoryVisible((prev) => !prev)}
              >
                <Text style={styles.chipText}>+ Nueva</Text>
              </Pressable>
            </View>

            {newCategoryVisible && (
              <View style={styles.newCategoryRow}>
                <TextInput
                  style={[styles.input, styles.newCategoryInput]}
                  placeholder="Nombre (ej: Japón)"
                  placeholderTextColor="#A66B79"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  maxLength={40}
                  autoFocus
                />

                <Pressable
                  style={[
                    styles.newCategoryButton,
                    (!newCategoryName.trim() || creatingCategory) &&
                      styles.disabledButton,
                  ]}
                  onPress={() => void handleCreateCategory()}
                  disabled={!newCategoryName.trim() || creatingCategory}
                >
                  {creatingCategory ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.newCategoryButtonText}>Crear</Text>
                  )}
                </Pressable>
              </View>
            )}

            {!isEdit && (
              <Text style={styles.hint}>
                Se creará como pendiente. Cuando vayan, registra la visita con
                el botón + del marcador.
              </Text>
            )}

            <Pressable
              style={[
                styles.primaryButton,
                !canSubmit && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar</Text>
              )}
            </Pressable>
          </ScrollView>
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
    maxHeight: '85%',
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
  sectionTitle: {
    color: '#7C3043',
    fontWeight: '900',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#FFE1E9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#C84B55',
  },
  chipNew: {
    borderWidth: 1,
    borderColor: '#D96A7E',
    backgroundColor: 'transparent',
  },
  chipText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  newCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  newCategoryInput: {
    flex: 1,
  },
  newCategoryButton: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  hint: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
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
  disabledButton: {
    opacity: 0.45,
  },
});
