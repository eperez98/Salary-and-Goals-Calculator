/** In-app updates (desktop only). Network requests happen in Rust: at startup (unless turned off) and when the user asks. */
import { isTauri } from '../db/adapters';
import { tr } from '../lib/i18n';
import { createBackup } from './backup';
import type { Engine } from '../db/engine';

export interface UpdateInfo {
  version: string; current: string; name: string; notes: string; date: string | null; prerelease: boolean;
  htmlUrl: string; installerName: string; installerUrl: string; installerSize: number; sha256: string | null;
}

export const updatesSupported = () => isTauri();

export async function checkForUpdate(includePrerelease: boolean): Promise<UpdateInfo | null> {
  if (!isTauri()) throw new Error(tr('Las actualizaciones solo están disponibles en la aplicación de escritorio.'));
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<UpdateInfo | null>('check_update', { includePrerelease });
}

/** Save, back up (when allowed), then download, verify and launch the installer. Monto closes when it starts. */
export async function downloadAndInstall(e: Engine, backup: boolean, info: UpdateInfo, onProgress: (downloaded: number, total: number) => void): Promise<void> {
  await e.flush();
  if (backup) await createBackup(e, 'antes-de-actualizar');
  await installUpdate(info, onProgress);
}

export async function installUpdate(info: UpdateInfo, onProgress: (downloaded: number, total: number) => void): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');
  const un = await listen<{ downloaded: number; total: number }>('update://progress', (e) => onProgress(e.payload.downloaded, e.payload.total));
  try {
    await invoke('install_update', { info });
  } finally {
    un();
  }
}
