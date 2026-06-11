import { ImageRequireSource } from 'react-native';
import { DateSpotStatus } from '../../types/dates';

// Los markers usan el prop nativo `image` (BitmapDescriptor) en vez de vistas
// hijas: react-native-maps con la Nueva Arquitectura no renderiza markers con
// children en Android (react-native-maps#5877, sin fix en 1.20.1).

export const SPOT_PIN_COLORS: Record<DateSpotStatus, string> = {
  pendiente: '#D96A7E',
  realizada: '#8E4FA8',
};

export const SPOT_PIN_IMAGES: Record<DateSpotStatus, ImageRequireSource> = {
  pendiente: require('../../../assets/images/pin-rosado.png'),
  realizada: require('../../../assets/images/pin-morado.png'),
};

// Variante 1.3x con halo translúcido horneado en el PNG (con `image` no hay
// estilos de View posibles para marcar la selección).
export const SPOT_PIN_SELECTED_IMAGES: Record<
  DateSpotStatus,
  ImageRequireSource
> = {
  pendiente: require('../../../assets/images/pin-rosado-sel.png'),
  realizada: require('../../../assets/images/pin-morado-sel.png'),
};

export const PLACING_PIN_IMAGE: ImageRequireSource = require('../../../assets/images/pin-rosado.png');
