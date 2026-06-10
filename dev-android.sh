#!/usr/bin/env bash
# Arranca el emulador Android (si no está corriendo) y lanza la app con Expo.
# Uso: ./dev-android.sh
set -euo pipefail

export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_AVD_HOME="$HOME/.config/.android/avd"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

AVD_NAME="morcito"

if adb devices | grep -q "emulator-.*device$"; then
    echo "✓ Emulador ya está corriendo"
else
    echo "→ Arrancando emulador '$AVD_NAME'..."
    emulator -avd "$AVD_NAME" -gpu host >/dev/null 2>&1 &
    disown

    echo "→ Esperando a que Android termine de bootear..."
    adb wait-for-device
    until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
        sleep 2
    done
    echo "✓ Emulador listo"
fi

cd "$(dirname "$0")"
[ -d node_modules ] || pnpm install
pnpm exec expo start --android
