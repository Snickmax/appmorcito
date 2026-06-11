import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateField from '../DateField';
import {
  CameraPermissionError,
  pickVisitPhotoFromLibrary,
  takeVisitPhoto,
} from '../../lib/dateSpotsService';
import { UploadableVisitAsset } from '../../types/dates';

function todayYmd() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

type Props = {
  visible: boolean;
  submitting: boolean;
  onSubmit: (params: {
    visitedAt: string;
    asset: UploadableVisitAsset | null;
  }) => void;
  onClose: () => void;
};

export default function AddVisitModal({
  visible,
  submitting,
  onSubmit,
  onClose,
}: Props) {
  const [visitedAt, setVisitedAt] = useState(todayYmd());
  const [asset, setAsset] = useState<UploadableVisitAsset | null>(null);

  useEffect(() => {
    if (!visible) return;

    setVisitedAt(todayYmd());
    setAsset(null);
  }, [visible]);

  const handleTakePhoto = async () => {
    try {
      const result = await takeVisitPhoto();
      if (result) setAsset(result);
    } catch (error) {
      if (error instanceof CameraPermissionError) {
        Alert.alert(
          'Permiso de cámara',
          'Activa el permiso de cámara en los ajustes del teléfono para tomar la foto.'
        );
        return;
      }

      console.error(error);
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const result = await pickVisitPhotoFromLibrary();
      if (result) setAsset(result);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Registrar visita</Text>

          <DateField label="Fecha de la visita" value={visitedAt} onChange={setVisitedAt} />

          <Text style={styles.sectionTitle}>Foto del recuerdo (opcional)</Text>

          {asset ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: asset.uri }} style={styles.preview} />

              <Pressable
                style={styles.removePhotoButton}
                onPress={() => setAsset(null)}
                disabled={submitting}
              >
                <Text style={styles.removePhotoText}>Quitar foto</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoRow}>
              <Pressable
                style={styles.photoOption}
                onPress={() => void handleTakePhoto()}
                disabled={submitting}
              >
                <Text style={styles.photoOptionText}>📷 Tomar foto</Text>
              </Pressable>

              <Pressable
                style={styles.photoOption}
                onPress={() => void handlePickPhoto()}
                disabled={submitting}
              >
                <Text style={styles.photoOptionText}>🖼 Galería</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, submitting && styles.disabledButton]}
            onPress={() => onSubmit({ visitedAt, asset })}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {asset ? 'Guardar visita con foto' : 'Guardar visita sin foto'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={onClose}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
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
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#7C3043',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#7C3043',
    fontWeight: '900',
    marginBottom: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoOption: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoOptionText: {
    color: '#9E4258',
    fontWeight: '900',
  },
  previewWrap: {
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#FFE7EE',
  },
  removePhotoButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFE1E9',
  },
  removePhotoText: {
    color: '#9E4258',
    fontWeight: '900',
  },
  primaryButton: {
    marginTop: 16,
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
});
