import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateField from '../DateField';
import FormModal from '../FormModal';
import { DateCategory, DateSpot } from '../../types/dates';

export type SpotFormValues = {
  title: string;
  description: string | null;
  plannedDate: string | null;
  budgetAmount: number | null;
  referenceUrl: string | null;
  categoryIds: string[];
};

function parseAmount(value: string): number | null {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

// canOpenURL rechaza URLs sin esquema, así que se normaliza al guardar.
function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

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
  const [budgetText, setBudgetText] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
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
    setBudgetText(
      initialSpot?.budget_amount != null
        ? String(Math.round(initialSpot.budget_amount))
        : ''
    );
    setReferenceUrl(initialSpot?.reference_url ?? '');
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
      budgetAmount: parseAmount(budgetText),
      referenceUrl: normalizeUrl(referenceUrl),
      categoryIds,
    });
  };

  return (
    <FormModal visible={visible} onRequestClose={onClose}>
      <View style={styles.headerRow}>
              <Text style={styles.title}>
                {isEdit ? 'Editar Cita' : 'Nueva Cita'}
              </Text>

              <Pressable style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
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

            <TextInput
              style={styles.input}
              placeholder="Presupuesto aprox. en CLP (opcional)"
              placeholderTextColor="#A66B79"
              value={budgetText}
              onChangeText={setBudgetText}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Link de referencia (opcional)"
              placeholderTextColor="#A66B79"
              value={referenceUrl}
              onChangeText={setReferenceUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
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
    </FormModal>
  );
}

const styles = StyleSheet.create({
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
