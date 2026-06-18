const appJson = require('./app.json');

// Inyecta la Google Maps API key (desde .env: GOOGLE_MAPS_API_KEY) en la config
// nativa de Android. Expo prebuild la traduce a la meta-data
// `com.google.android.geo.API_KEY` del AndroidManifest, necesaria para que
// react-native-maps (proveedor Google por defecto) no crashee al abrir el mapa.
module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    config: {
      ...(appJson.expo.android.config ?? {}),
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
});
