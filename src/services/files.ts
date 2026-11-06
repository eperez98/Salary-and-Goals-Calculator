/** Save/open files via native dialogs on desktop, or download/upload in the browser. */
import { isTauri } from '../db/adapters';

export async function saveFile(defaultName: string, data: Uint8Array | string, filters: Array<{ name: string; extensions: string[] }>, mime = 'application/octet-stream'): Promise<string | null> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: defaultName, filters });
    if (!path) return null;
    await writeFile(path, bytes);
    return path;
  }
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return defaultName;
}

export async function openFile(filters: Array<{ name: string; extensions: string[] }>): Promise<{ name: string; data: Uint8Array } | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({ multiple: false, filters });
    if (!path || Array.isArray(path)) return null;
    return { name: String(path).split(/[\\/]/).pop() ?? 'archivo', data: await readFile(String(path)) };
  }
  return new Promise((res) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return res(null);
      res({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) });
    };
    input.click();
  });
}

export function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
