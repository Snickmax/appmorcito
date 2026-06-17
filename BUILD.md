# Manual de build (APK + AAB)

Cómo generar los instalables de **producción** de appmorcito. Todo el proceso es **100% local**:
no se sube nada a la nube, no hace falta cuenta de Expo, y los builds se firman con tu **propio
keystore** guardado en tu máquina.

El script [`build-release.sh`](build-release.sh) hace todo: usa `expo prebuild` para generar la
carpeta nativa `android/` y luego `./gradlew` para compilar.

Produce dos archivos:

- **APK** — para instalar a mano (`adb install`) o repartir fuera de la tienda.
- **AAB** — el formato que se sube a **Google Play Console**.

---

## Requisitos (una sola vez)

- **JDK 17**:

  ```bash
  sudo pacman -S jdk17-openjdk
  ```

  > El sistema trae JDK 25, que el Gradle de React Native 0.81 **no** soporta. El script detecta
  > automáticamente el JDK 17 en `/usr/lib/jvm/` y lo usa; no hace falta cambiar el JDK por defecto.

- **Android SDK** en `~/Android/Sdk` (ya configurado en este equipo).

> La **primera** compilación descarga las `build-tools` del SDK y las dependencias de Gradle, así
> que tarda varios minutos. Las siguientes son mucho más rápidas.

---

## Primer build

```bash
./build-release.sh
```

En la primera corrida el script:

1. Verifica el JDK 17 y las dependencias (`pnpm install` si hace falta).
2. **Genera tu keystore** de firma en `~/.config/appmorcito/` (con una contraseña aleatoria) y te
   muestra un aviso de backup.
3. Genera la carpeta `android/` con `expo prebuild`.
4. Te **pregunta en qué carpeta guardar** los archivos (por defecto `~/Descargas`).
5. Compila y copia los instalables a esa carpeta.

### Salida

```
appmorcito-v<version>-<fecha>.apk
appmorcito-v<version>-<fecha>.aab
```

---

## ⚠️ Qué respaldar (CRÍTICO)

Respaldá la carpeta completa:

```
~/.config/appmorcito/
├── appmorcito-release.jks   # tu keystore de firma
└── passwords.env            # las contraseñas del keystore
```

- Es **irreemplazable**. Google Play identifica tu app por la firma de ese keystore. Si lo perdés,
  **no vas a poder volver a publicar actualizaciones** de la app (Play rechaza un AAB firmado con
  otra clave).
- Guardalo en un lugar **seguro y privado** (gestor de contraseñas, backup cifrado, etc.).
- **Nunca** lo subas al repo. Ya está protegido: `/android` y `*.jks` están en `.gitignore`, y el
  keystore vive fuera del repo.

---

## Build de actualización

Cuando ya tenés todo configurado y querés sacar una versión nueva:

1. **Subí la versión** en `app.json`:

   ```jsonc
   {
     "expo": {
       "version": "1.0.1",          // versión visible para usuarios
       "android": {
         "versionCode": 2            // entero, +1 en CADA subida a Play
       }
     }
   }
   ```

   > `versionCode` es **obligatorio** incrementarlo en cada subida a Google Play; si lo repetís,
   > Play rechaza el AAB. (Si `android.versionCode` no existe aún en `app.json`, agregalo.)

2. **Compilá**:

   ```bash
   ./build-release.sh            # build incremental
   ./build-release.sh --clean    # regenera android/ desde cero (ver abajo)
   ```

El script reutiliza el keystore existente, así que la firma es siempre la misma.

Usá `--clean` cuando cambiaste **iconos, splash, plugins o config nativa** en `app.json` y querés
que `expo prebuild` regenere la carpeta `android/` desde cero.

---

## Repo desde cero u otra máquina

Si clonás el repo en limpio o pasás a otra computadora, **restaurá el keystore antes de buildear**:

```bash
git clone <repo> && cd appmorcito
pnpm install

# Restaurar el backup del keystore ANTES del primer build:
mkdir -p ~/.config/appmorcito
cp /ruta/backup/appmorcito-release.jks ~/.config/appmorcito/
cp /ruta/backup/passwords.env          ~/.config/appmorcito/

./build-release.sh
```

El script detecta el keystore existente y lo reutiliza (misma firma → Play acepta la actualización).

> Si **no** restaurás el backup, el script generará un keystore **nuevo** con una firma distinta. Eso
> sirve para una app nueva, pero **no** para actualizar una app ya publicada en Play.

---

## Usar los artefactos

- **APK** (instalar a mano / probar en el emulador o teléfono):

  ```bash
  adb install ~/Descargas/appmorcito-v1.0.1-<fecha>.apk
  ```

- **AAB** → subir a **Google Play Console** en el track correspondiente (interno, cerrado, producción).

---

## Troubleshooting

| Síntoma | Solución |
|---|---|
| `No encontré JDK 17` | `sudo pacman -S jdk17-openjdk` |
| Gradle se queja de licencias del SDK | `~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager --licenses` y aceptar |
| Errores raros tras cambiar config nativa | `./build-release.sh --clean` |
| Build muy lento la primera vez | Normal: descarga `build-tools` y dependencias; las próximas son rápidas |
