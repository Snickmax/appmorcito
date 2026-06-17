#!/usr/bin/env bash
# Genera el APK y el AAB de appmorcito 100% LOCAL (sin nube, sin cuenta),
# firmados con tu propio keystore, y los guarda en la carpeta que elijas.
#
# Compila con: expo prebuild (genera android/) + ./gradlew
# Requisitos: JDK 17, Android SDK (ya configurado en este equipo).
#
# Uso: ./build-release.sh            (build incremental)
#      ./build-release.sh --clean    (regenera android/ desde cero)
set -euo pipefail

cd "$(dirname "$0")"

# ── Config ─────────────────────────────────────────────────────────────────
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

KEYSTORE_DIR="$HOME/.config/appmorcito"
KEYSTORE_PATH="$KEYSTORE_DIR/appmorcito-release.jks"
KEY_ALIAS="appmorcito"

CLEAN=false
[ "${1:-}" = "--clean" ] && CLEAN=true

info() { echo -e "→ $*"; }
ok()   { echo -e "✓ $*"; }
warn() { echo -e "⚠ $*"; }
die()  { echo -e "✗ $*" >&2; exit 1; }

# ── 1. JDK 17 ────────────────────────────────────────────────────────────────
JAVA17=""
for d in /usr/lib/jvm/java-17-openjdk /usr/lib/jvm/java-17-openjdk-* \
         /usr/lib/jvm/jdk-17* /usr/lib/jvm/temurin-17* ; do
    if [ -x "$d/bin/java" ]; then JAVA17="$d"; break; fi
done
[ -n "$JAVA17" ] || die "No encontré JDK 17. Instalalo con:  sudo pacman -S jdk17-openjdk"
export JAVA_HOME="$JAVA17"
export PATH="$JAVA_HOME/bin:$PATH"
ok "JDK 17: $JAVA_HOME"

# ── 2. Dependencias JS ───────────────────────────────────────────────────────
[ -d node_modules ] || pnpm install

# ── 3. Keystore propio ───────────────────────────────────────────────────────
if [ ! -f "$KEYSTORE_PATH" ]; then
    info "Generando keystore release en $KEYSTORE_PATH ..."
    mkdir -p "$KEYSTORE_DIR"
    STORE_PASS="$(openssl rand -base64 24)"
    keytool -genkeypair -v \
        -keystore "$KEYSTORE_PATH" \
        -alias "$KEY_ALIAS" \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass "$STORE_PASS" -keypass "$STORE_PASS" \
        -dname "CN=appmorcito, OU=Mobile, O=appmorcito, L=., ST=., C=AR"
    # Guarda las passwords junto al keystore (fuera del repo).
    printf 'STORE_PASS=%s\nKEY_PASS=%s\n' "$STORE_PASS" "$STORE_PASS" > "$KEYSTORE_DIR/passwords.env"
    chmod 600 "$KEYSTORE_DIR/passwords.env"
    ok "Keystore creado."
    warn "IMPORTANTE: respaldá '$KEYSTORE_DIR' completo (keystore + passwords)."
    warn "Si lo perdés NO vas a poder volver a actualizar la app en Google Play."
else
    ok "Keystore existente: $KEYSTORE_PATH"
fi
# shellcheck disable=SC1090
source "$KEYSTORE_DIR/passwords.env"

# ── 4. Generar carpeta android/ (Expo prebuild) ──────────────────────────────
if [ "$CLEAN" = true ] || [ ! -d android ]; then
    info "Generando proyecto nativo android/ (expo prebuild)..."
    pnpm exec expo prebuild --platform android $([ "$CLEAN" = true ] && echo --clean)
fi

# ── 5. Inyectar firma release en gradle (idempotente) ────────────────────────
GRADLE_PROPS="android/gradle.properties"
if ! grep -q "MORCITO_STORE_FILE" "$GRADLE_PROPS" 2>/dev/null; then
    info "Configurando credenciales de firma en $GRADLE_PROPS ..."
    {
        echo ""
        echo "# Firma release appmorcito (autogenerado por build-release.sh)"
        echo "MORCITO_STORE_FILE=$KEYSTORE_PATH"
        echo "MORCITO_STORE_PASSWORD=$STORE_PASS"
        echo "MORCITO_KEY_ALIAS=$KEY_ALIAS"
        echo "MORCITO_KEY_PASSWORD=$KEY_PASS"
    } >> "$GRADLE_PROPS"
fi

# Parchea android/app/build.gradle para usar el keystore propio en release.
node - "$KEYSTORE_PATH" <<'NODE'
const fs = require('fs');
const f = 'android/app/build.gradle';
let s = fs.readFileSync(f, 'utf8');

// a) Añadir signingConfig "release" dentro del bloque signingConfigs {}
if (!s.includes('// MORCITO release signing')) {
    s = s.replace(/signingConfigs\s*\{/, m => `${m}
        release {
            // MORCITO release signing
            storeFile file(MORCITO_STORE_FILE)
            storePassword MORCITO_STORE_PASSWORD
            keyAlias MORCITO_KEY_ALIAS
            keyPassword MORCITO_KEY_PASSWORD
        }`);
}

// b) Hacer que el buildType release use signingConfigs.release
//    (es la 2da aparición; la 1ra es el buildType debug)
let n = 0;
s = s.replace(/signingConfig signingConfigs\.debug/g,
    m => (++n === 2 ? 'signingConfig signingConfigs.release' : m));

fs.writeFileSync(f, s);
console.log('✓ build.gradle parcheado');
NODE

# ── 6. Carpeta de salida ─────────────────────────────────────────────────────
DEFAULT_OUT="$HOME/Descargas"
[ -d "$DEFAULT_OUT" ] || DEFAULT_OUT="$HOME/Downloads"
read -e -r -p "¿Dónde guardo los archivos? [$DEFAULT_OUT]: " OUT_DIR
OUT_DIR="${OUT_DIR:-$DEFAULT_OUT}"
OUT_DIR="${OUT_DIR/#\~/$HOME}"
mkdir -p "$OUT_DIR"
ok "Salida: $OUT_DIR"

VERSION="$(node -e "console.log(require('./app.json').expo.version)")"
STAMP="$(date +%Y%m%d-%H%M%S)"

# ── 7. Compilar ──────────────────────────────────────────────────────────────
info "Compilando APK y AAB (la primera vez descarga build-tools, puede tardar)..."
( cd android && ./gradlew assembleRelease bundleRelease )

APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
AAB_SRC="android/app/build/outputs/bundle/release/app-release.aab"
APK_DST="$OUT_DIR/appmorcito-v${VERSION}-${STAMP}.apk"
AAB_DST="$OUT_DIR/appmorcito-v${VERSION}-${STAMP}.aab"

cp "$APK_SRC" "$APK_DST"
cp "$AAB_SRC" "$AAB_DST"

# ── 8. Resumen ───────────────────────────────────────────────────────────────
echo
ok "Listo. Archivos generados:"
ls -1sh "$APK_DST" "$AAB_DST"
