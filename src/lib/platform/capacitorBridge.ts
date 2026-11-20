import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function syncNativeStatusBar(isDark: boolean): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    if (isNativeAndroid()) {
      await StatusBar.setBackgroundColor({ color: isDark ? '#07090E' : '#F8FAFC' });
    }
  } catch {
    // Safe no-op when running on web or before native plugin attaches
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await CapacitorSplashScreen.hide();
  } catch {
    // Safe no-op on web
  }
}

export function registerAndroidBackHandler(onBack: () => boolean): () => void {
  if (!isNativeAndroid()) {
    return () => {};
  }

  let removed = false;
  const listenerPromise = CapacitorApp.addListener('backButton', () => {
    const handled = onBack();
    if (!handled) {
      void CapacitorApp.exitApp();
    }
  });

  return () => {
    if (removed) return;
    removed = true;
    void listenerPromise.then((handle) => handle.remove()).catch(() => {});
  };
}
