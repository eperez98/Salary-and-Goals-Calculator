import { useState } from 'react';
import { useApp } from '../../store/app';
import { useCan } from '../../hooks/useDb';
import { errorMessage } from '../../hooks/useDb';
import { downloadAndInstall, type UpdateInfo } from '../../services/updates';
import { Badge, Button, Modal } from '../ui';
import { versionLabel, APP_VERSION_LABEL } from '../../lib/version';
import { tr } from '../../lib/i18n';

/** Asks whether to download a new version. Nothing is downloaded or installed unless the user accepts. */
export function UpdatePrompt({ info, onClose }: { info: UpdateInfo; onClose: () => void }) {
  const engine = useApp((s) => s.engine);
  const canBackup = useCan('backup.manage');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ d: 0, t: 0 });
  const [err, setErr] = useState('');
  const pct = progress.t ? Math.round((progress.d / progress.t) * 100) : 0;
  const install = async () => {
    if (!engine) return;
    setBusy(true); setErr('');
    try { await downloadAndInstall(engine, canBackup, info, (d, t) => setProgress({ d, t })); }
    catch (x) { setErr(errorMessage(x)); setBusy(false); }
  };
  return (
    <Modal open onClose={busy ? () => undefined : onClose} icon="download" width={520}
      title={<span className="flex items-center gap-2">{tr('Nueva versión disponible')} {info.prerelease && <Badge tone="amber">{tr('Beta')}</Badge>}</span>}
      subtitle={tr('Tienes {current}. Ya está disponible {next}.', { current: APP_VERSION_LABEL, next: versionLabel(info.version) })}
      footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>{tr('Ahora no')}</Button><Button variant="emerald" icon="download" loading={busy} onClick={() => void install()}>{tr('Descargar e instalar')}</Button></>}>
      <p className="text-[13px] text-ink-2">{tr('¿Quieres descargarla ahora? Tus datos se conservan y antes se crea una copia de seguridad. Si eliges «Ahora no», seguirás usando tu versión actual.')}</p>
      {info.notes && <pre className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap font-sans text-[12px] text-ink-2 leading-relaxed rounded-[14px] bg-surface-2 p-3">{info.notes.slice(0, 3000)}</pre>}
      {busy && (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-surface-3 overflow-hidden"><div className="h-full bg-emerald transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="text-[11.5px] text-muted mt-1">{tr('Descargando y verificando…')}{' '}{pct}{tr('% · Monto se cerrará para completar la instalación.')}</p>
        </div>
      )}
      {err && <p className="text-[12.5px] text-coral mt-3">{err}</p>}
    </Modal>
  );
}
