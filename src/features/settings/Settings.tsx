import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useApp } from '../../store/app';
import { useActor, useCan, useEngine, useMutate, useProfile, useQuery, errorMessage } from '../../hooks/useDb';
import { getPrefs, setPrefs, setProfile, listSessions, setMemberPin } from '../../db/repo/core';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../../db/repo/finance';
import { createBackup, exportBackupFile, exportJSON, pickBackupFile, restoreFromBytes } from '../../services/backup';
import { decrypt, isEncrypted } from '../../db/crypto';
import { Button, Card, CardHeader, ChoiceCard, Field, Input, Modal, PageHeader, Segmented, Select, Toggle, Badge, useConfirm } from '../../components/ui';
import { Icon, IconTile, ICON_NAMES } from '../../icons';
import { LogoMark } from '../../brand/Logo';
import { formatDate } from '../../lib/dates';
import type { ProfileMode } from '../../db/types';
import { APP_VERSION_LABEL, IS_PRERELEASE, versionLabel } from '../../lib/version';
import { checkForUpdate, downloadAndInstall, updatesSupported, type UpdateInfo } from '../../services/updates';
import { lang, locale, setLang, tr } from '../../lib/i18n';

type Tab = 'profile' | 'appearance' | 'security' | 'data' | 'categories' | 'updates' | 'about';
const TABS: Array<{ k: Tab; label: string; icon: string }> = [
  { k: 'profile', label: tr('Perfil'), icon: 'user' }, { k: 'appearance', label: tr('Apariencia'), icon: 'sun' }, { k: 'security', label: tr('Seguridad'), icon: 'lock' },
  { k: 'data', label: tr('Datos y copias'), icon: 'database' }, { k: 'categories', label: tr('Categorías'), icon: 'budget' }, { k: 'updates', label: tr('Actualizaciones'), icon: 'refresh' }, { k: 'about', label: tr('Acerca de'), icon: 'info' },
];

export default function Settings() {
  const [tab, setTab] = useState<Tab>(() => {
    try { const t = sessionStorage.getItem('monto:settings-tab') as Tab | null; sessionStorage.removeItem('monto:settings-tab'); return t ?? 'profile'; } catch { return 'profile'; }
  });
  return (
    <div>
      <PageHeader title={tr('Configuración')} subtitle={tr('Personaliza Monto y protege tu información')} />
      <div className="grid grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1">
          {TABS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={clsx('group w-full flex items-center gap-3 h-10 px-3 rounded-[12px] text-[13px] transition', tab === t.k ? 'bg-surface shadow-card text-ink font-semibold' : 'text-ink-2 hover:bg-surface-3/60')}><Icon name={t.icon} size={17} active={tab === t.k} />{t.label}</button>)}
        </nav>
        <div className="space-y-5 max-w-[760px]">
          {tab === 'profile' && <ProfileTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'data' && <DataTab />}
          {tab === 'categories' && <CategoriesTab />}
          {tab === 'updates' && <UpdatesTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const profile = useProfile();
  const canManage = useCan('member.manage');
  const mutate = useMutate();
  const [name, setName] = useState(profile.name);
  const [household, setHousehold] = useState(profile.householdName ?? '');
  return (
    <Card hover={false} className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label={tr('Nombre del perfil')}><Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} /></Field>
        <Field label={tr('Nombre del hogar')}><Input value={household} onChange={(e) => setHousehold(e.target.value)} disabled={!canManage} placeholder={tr('Ej. Familia Rodríguez')} /></Field>
      </div>
      <div>
        <p className="text-[12px] font-medium text-ink-2 mb-2">{tr('Tipo de perfil')}</p>
        <div className="grid grid-cols-3 gap-3">
          {([['individual', 'user', tr('Individual')], ['couple', 'handshake', tr('En pareja')], ['family', 'family', tr('Familia')]] as Array<[ProfileMode, string, string]>).map(([m, i, l]) => <ChoiceCard key={m} selected={profile.mode === m} onClick={() => canManage && mutate((e) => setProfile(e, { mode: m }), tr('Tipo de perfil actualizado'))} icon={i} title={l} />)}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-medium text-ink-2 mb-2">{tr('Moneda principal')}</p>
        <Segmented value={profile.primaryCurrency} onChange={(v) => canManage && mutate((e) => setProfile(e, { primaryCurrency: v }), tr('Moneda principal actualizada'))} options={[{ value: 'PAB', label: 'B/. Balboa (PAB)' }, { value: 'USD', label: tr('$ Dólar (USD)') }]} />
        <p className="text-[11.5px] text-muted mt-2">{tr('Paridad fija PAB:USD 1:1. Las cuentas conservan su propia moneda.')}</p>
      </div>
      {canManage && <div className="flex justify-end"><Button onClick={() => mutate((e) => setProfile(e, { name: name.trim() || profile.name, householdName: household.trim() || undefined }), tr('Perfil guardado'))}>{tr('Guardar')}</Button></div>}
    </Card>
  );
}

function AppearanceTab() {
  const engine = useEngine();
  const prefs = useQuery((e) => getPrefs(e));
  const mutate = useMutate();
  return (
    <Card hover={false} className="p-6 space-y-6">
      <div>
        <p className="text-[13.5px] font-semibold mb-1">{tr('Tema')}</p>
        <p className="text-[12px] text-muted mb-3">{tr('“Sistema” sigue automáticamente el modo claro u oscuro de Windows.')}</p>
        <div className="grid grid-cols-3 gap-3">
          {([['system', 'monitor', tr('Sistema')], ['light', 'sun', tr('Claro')], ['dark', 'moon', tr('Oscuro')]] as const).map(([v, i, l]) => <ChoiceCard key={v} selected={prefs.theme === v} onClick={() => mutate((e) => setPrefs(e, { theme: v }))} icon={i} title={l} />)}
        </div>
      </div>
      <div>
        <p className="text-[13.5px] font-semibold mb-1">{tr('Animaciones')}</p>
        <p className="text-[12px] text-muted mb-3">{tr('Reduce el movimiento si prefieres una interfaz más estática.')}</p>
        <Segmented value={prefs.reducedMotion} onChange={(v) => mutate((e) => setPrefs(e, { reducedMotion: v }))} options={[{ value: 'system', label: tr('Según Windows') }, { value: 'off', label: tr('Completas') }, { value: 'on', label: tr('Reducidas') }]} />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold mb-1">{tr('Idioma')}</p>
        <p className="text-[12px] text-muted mb-3">{tr('Monto se reiniciará para aplicar el idioma.')}</p>
        <Segmented value={lang} onChange={(v) => { if (v !== lang) void engine.flush().then(() => setLang(v)); }} options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]} />
      </div>
    </Card>
  );
}

function SecurityTab() {
  const e = useEngine();
  const actor = useActor();
  const canSec = useCan('security.manage');
  const mutate = useMutate();
  const toast = useApp((s) => s.toast);
  const prefs = useQuery((en) => getPrefs(en));
  const sessions = useQuery((en) => listSessions(en, 12));
  const [open, setOpen] = useState<'set' | 'remove' | null>(null);
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const verifyCurrent = async () => {
    const bytes = await e.adapter.load();
    if (!bytes || !isEncrypted(bytes)) return true;
    try { await decrypt(bytes, cur); return true; } catch { return false; }
  };
  const submit = async () => {
    setErr('');
    if (e.encrypted && !(await verifyCurrent())) return setErr(tr('La contraseña actual no es correcta.'));
    if (open === 'set') {
      if (pw.length < 8) return setErr(tr('Mínimo 8 caracteres.'));
      if (pw !== pw2) return setErr(tr('Las contraseñas no coinciden.'));
    }
    setBusy(true);
    try {
      await e.setPassword(open === 'set' ? pw : null);
      if (open === 'set' && !prefs.autoLockMinutes) setPrefs(e, { autoLockMinutes: 5 });
      toast({ kind: 'success', title: open === 'set' ? tr('Contraseña establecida') : tr('Contraseña eliminada'), body: open === 'set' ? tr('Tus datos se guardan cifrados con AES-256.') : tr('Tus datos ya no están cifrados.') });
      setOpen(null); setCur(''); setPw(''); setPw2('');
    } catch (x) { setErr(errorMessage(x)); }
    setBusy(false);
  };

  return (
    <>
      <Card hover={false} className="p-6 space-y-5">
        <div className="flex items-start gap-4">
          <IconTile name="lock" color={e.encrypted ? 'var(--emerald)' : 'var(--amber)'} size={44} />
          <div className="flex-1">
            <p className="text-[14px] font-semibold flex items-center gap-2">{tr('Contraseña de la aplicación')}{' '}{e.encrypted ? <Badge tone="green">{tr('Cifrado activo')}</Badge> : <Badge tone="amber">{tr('Sin cifrar')}</Badge>}</p>
            <p className="text-[12.5px] text-muted mt-1">{tr('Cifra la base de datos local con AES-256-GCM (clave derivada con PBKDF2). Sin la contraseña nadie puede leer tus datos, ni siquiera copiando el archivo.')}</p>
          </div>
        </div>
        {canSec ? <div className="flex gap-2"><Button icon="lock" onClick={() => setOpen('set')}>{e.encrypted ? tr('Cambiar contraseña') : tr('Establecer contraseña')}</Button>{e.encrypted && <Button variant="ghost" onClick={() => setOpen('remove')}>{tr('Quitar contraseña')}</Button>}</div> : <p className="text-[12px] text-muted">{tr('Solo un administrador puede cambiar la seguridad.')}</p>}
        <div className="border-t border-line/70 pt-5">
          <Field label={tr('Bloqueo automático por inactividad')} hint={e.encrypted ? tr('Al bloquearse, los datos se cifran y se cierran en memoria. Atajo: Ctrl + L.') : tr('Requiere establecer una contraseña.')}>
            <Select value={prefs.autoLockMinutes} disabled={!e.encrypted || !canSec} onChange={(ev) => mutate((en) => setPrefs(en, { autoLockMinutes: Number(ev.target.value) }), tr('Bloqueo automático actualizado'))}>
              {[0, 1, 2, 5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m === 0 ? tr('Nunca') : `${m} minuto${m > 1 ? 's' : ''}`}</option>)}
            </Select>
          </Field>
        </div>
        <div className="border-t border-line/70 pt-5">
          <p className="text-[13.5px] font-semibold">{tr('Tu PIN de integrante')}</p>
          <p className="text-[12px] text-muted mb-3">{tr('Se pide al cambiar de integrante en este equipo.')}</p>
          <div className="flex gap-2"><Input type="password" inputMode="numeric" maxLength={6} placeholder={tr('4 a 6 dígitos')} value={pin} onChange={(ev) => setPin(ev.target.value.replace(/\D/g, ''))} className="w-48" />
            <Button variant="secondary" onClick={async () => { try { await setMemberPin(e, actor, actor.id, pin || null); toast({ kind: 'success', title: pin ? 'PIN guardado' : 'PIN eliminado' }); setPin(''); } catch (x) { toast({ kind: 'error', title: tr('PIN no válido'), body: errorMessage(x) }); } }}>{pin ? tr('Guardar PIN') : tr('Quitar PIN')}</Button></div>
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader title={tr('Sesiones recientes')} subtitle={tr('Inicios de sesión en este equipo')} />
        <table className="w-full text-[12.5px] m-3 mt-2" style={{ width: 'calc(100% - 24px)' }}>
          <thead className="text-muted text-left"><tr><th className="font-medium py-1">{tr('Integrante')}</th><th className="font-medium">{tr('Inicio')}</th><th className="font-medium">{tr('Fin')}</th><th className="font-medium">{tr('Motivo')}</th></tr></thead>
          <tbody>{sessions.map((s) => <tr key={s.id} className="border-t border-line/50"><td className="py-2">{s.memberName}</td><td>{new Date(s.startedAt).toLocaleString(locale)}</td><td>{s.endedAt ? new Date(s.endedAt).toLocaleString(locale) : <Badge tone="green" className="!h-5">{tr('Activa')}</Badge>}</td><td className="text-muted">{s.reason ?? ''}</td></tr>)}</tbody>
        </table>
      </Card>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open === 'remove' ? tr('Quitar contraseña') : e.encrypted ? tr('Cambiar contraseña') : tr('Establecer contraseña')} icon="lock" width={440}
        footer={<><Button variant="ghost" onClick={() => setOpen(null)}>{tr('Cancelar')}</Button><Button loading={busy} variant={open === 'remove' ? 'danger' : 'primary'} onClick={() => void submit()}>{open === 'remove' ? tr('Quitar') : tr('Guardar')}</Button></>}>
        <div className="space-y-3">
          {e.encrypted && <Field label={tr('Contraseña actual')}><Input type="password" autoFocus value={cur} onChange={(ev) => setCur(ev.target.value)} /></Field>}
          {open === 'set' && <><Field label={tr('Nueva contraseña')}><Input type="password" value={pw} onChange={(ev) => setPw(ev.target.value)} placeholder={tr('Mínimo 8 caracteres')} /></Field><Field label={tr('Confirmar')}><Input type="password" value={pw2} onChange={(ev) => setPw2(ev.target.value)} /></Field></>}
          {err && <p className="text-[12px] text-coral">{err}</p>}
          <p className="text-[11.5px] text-amber flex gap-2"><Icon name="alert" size={15} />{tr('Si olvidas la contraseña, tus datos no podrán recuperarse. Guarda una copia de seguridad.')}</p>
        </div>
      </Modal>
    </>
  );
}

function DataTab() {
  const e = useEngine();
  const canBackup = useCan('backup.manage');
  const toast = useApp((s) => s.toast);
  const confirm = useConfirm();
  const [backups, setBackups] = useState<Array<{ name: string; size?: number; date?: string }>>([]);
  const [location, setLocation] = useState('');
  const [integrity, setIntegrity] = useState<{ ok: boolean; messages: string[] } | null>(null);
  const [restorePw, setRestorePw] = useState<{ bytes: Uint8Array } | null>(null);
  const [pw, setPw] = useState('');
  const refresh = async () => { setBackups(await e.adapter.listBackups()); setLocation(await e.adapter.location()); };
  useEffect(() => { void refresh(); }, []);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { const r = await fn(); if (r !== null) toast({ kind: 'success', title: ok, body: typeof r === 'string' ? r : undefined }); await refresh(); } catch (x) { toast({ kind: 'error', title: tr('Operación fallida'), body: errorMessage(x) }); } };
  const restore = (bytes: Uint8Array, password?: string) => confirm.ask({ title: tr('¿Restaurar esta copia?'), body: tr('Los datos actuales se reemplazarán. Antes se creará automáticamente una copia de seguridad de lo que tienes ahora.'), confirmLabel: tr('Restaurar'), onConfirm: () => void run(async () => { await restoreFromBytes(e, bytes, password); setRestorePw(null); }, tr('Copia restaurada')) });
  const tryRestore = (bytes: Uint8Array) => (isEncrypted(bytes) ? (setPw(''), setRestorePw({ bytes })) : restore(bytes));

  return (
    <>
      <Card hover={false} className="p-6">
        <div className="flex items-start gap-4">
          <IconTile name="shield" color="var(--emerald)" size={44} />
          <div><p className="text-[14px] font-semibold">{tr('Tus datos permanecen en este equipo')}</p><p className="text-[12.5px] text-muted mt-1">{tr('Monto no envía información a ningún servidor. Base de datos SQLite local en:')}</p><code className="block text-[11.5px] mt-2 bg-surface-2 rounded-[10px] px-3 py-2 break-all">{location}</code></div>
        </div>
      </Card>
      <Card hover={false}>
        <CardHeader title={tr('Copias de seguridad')} subtitle={tr('Se crea una copia automática cada día al abrir Monto')} action={canBackup && <Button size="sm" icon="database" onClick={() => void run(() => createBackup(e), tr('Copia creada'))}>{tr('Crear copia ahora')}</Button>} />
        <ul className="p-3 max-h-[260px] overflow-y-auto">
          {backups.map((b) => (
            <li key={b.name} className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-surface-2 text-[12.5px]">
              <Icon name="database" size={16} className="text-muted" />
              <span className="flex-1 truncate">{b.name}</span>
              {b.size && <span className="text-muted">{(b.size / 1024).toFixed(0)}{' '}{tr('KB')}</span>}
              {canBackup && <Button size="sm" variant="secondary" onClick={async () => tryRestore(await e.adapter.readBackup(b.name))}>{tr('Restaurar')}</Button>}
            </li>
          ))}
          {!backups.length && <p className="text-[12.5px] text-muted px-3 py-3">{tr('Aún no hay copias.')}</p>}
        </ul>
      </Card>
      {canBackup && (
        <Card hover={false} className="p-6">
          <p className="text-[14px] font-semibold mb-1">{tr('Exportar e importar')}</p>
          <p className="text-[12.5px] text-muted mb-4">{tr('Mueve tus datos a otro equipo o guarda una copia externa (USB, disco).')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon="download" onClick={() => void run(() => exportBackupFile(e), tr('Respaldo exportado'))}>{tr('Exportar respaldo (.monto)')}</Button>
            <Button variant="secondary" icon="upload" onClick={async () => { const f = await pickBackupFile(); if (f) tryRestore(f.data); }}>{tr('Importar respaldo')}</Button>
            <Button variant="secondary" icon="download" onClick={() => void run(() => exportJSON(e), tr('Datos exportados en JSON'))}>{tr('Exportar JSON')}</Button>
            <Button icon="reports" onClick={() => { sessionStorage.setItem('monto:report-kind', 'all'); useApp.getState().go('reports'); }}>{tr('Exportar tablas (Excel, PDF, Notion)')}</Button>
          </div>
          <p className="text-[11.5px] text-muted mt-3">{tr('Si tienes contraseña, el respaldo .monto se exporta cifrado.')}</p>
        </Card>
      )}
      <Card hover={false} className="p-6 flex items-center gap-4">
        <IconTile name="check" color={integrity ? (integrity.ok ? 'var(--emerald)' : 'var(--coral)') : 'var(--blue)'} size={44} />
        <div className="flex-1"><p className="text-[14px] font-semibold">{tr('Integridad de la base de datos')}</p><p className="text-[12.5px] text-muted">{integrity ? (integrity.ok ? 'PRAGMA integrity_check: ok · sin referencias rotas.' : integrity.messages.join(' · ')) : tr('Comprueba que el archivo SQLite no esté dañado.')}</p></div>
        <Button variant="secondary" onClick={() => setIntegrity(e.integrityCheck())}>{tr('Verificar')}</Button>
      </Card>
      <Modal open={!!restorePw} onClose={() => setRestorePw(null)} title={tr('Copia cifrada')} icon="lock" width={420} footer={<><Button variant="ghost" onClick={() => setRestorePw(null)}>{tr('Cancelar')}</Button><Button onClick={() => restore(restorePw!.bytes, pw)}>{tr('Continuar')}</Button></>}>
        <Field label={tr('Contraseña de la copia')}><Input type="password" autoFocus value={pw} onChange={(ev) => setPw(ev.target.value)} /></Field>
      </Modal>
      {confirm.node}
    </>
  );
}

function CategoriesTab() {
  const canManage = useCan('category.manage');
  const mutate = useMutate();
  const confirm = useConfirm();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const cats = useQuery((e) => listCategories(e, kind, true), [kind]);
  const [form, setForm] = useState<{ open: boolean; parentId: string | null; id?: string }>({ open: false, parentId: null });
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('other');
  const [color, setColor] = useState('#1F6B4F');
  const top = cats.filter((c) => !c.parentId);
  const save = () => {
    const r = mutate((e, a) => (form.id ? updateCategory(e, a, form.id, { name, icon, color }) : createCategory(e, a, { name, kind, parentId: form.parentId, icon, color })), form.id ? tr('Categoría actualizada') : tr('Categoría creada'));
    if (r !== undefined) setForm({ open: false, parentId: null });
  };
  return (
    <Card hover={false}>
      <CardHeader title={tr('Categorías y subcategorías')} action={<div className="flex gap-2"><Segmented size="sm" value={kind} onChange={setKind} options={[{ value: 'expense', label: tr('Gastos') }, { value: 'income', label: tr('Ingresos') }]} />{canManage && <Button size="sm" icon="plus" onClick={() => { setName(''); setIcon('other'); setColor('#1F6B4F'); setForm({ open: true, parentId: null }); }}>{tr('Nueva')}</Button>}</div>} />
      <ul className="p-3 space-y-1">
        {top.map((c) => (
          <li key={c.id}>
            <div className={clsx('group flex items-center gap-3 px-2 py-2 rounded-[12px] hover:bg-surface-2', c.archived && 'opacity-50')}>
              <IconTile name={c.icon} color={c.color} size={34} />
              <span className="flex-1 text-[13px] font-medium">{c.name} {c.isSystem && <Badge className="!h-5 ml-1">{tr('Predeterminada')}</Badge>}</span>
              {canManage && <span className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button size="sm" variant="ghost" icon="plus" onClick={() => { setName(''); setIcon(c.icon); setColor(c.color); setForm({ open: true, parentId: c.id }); }}>{tr('Sub')}</Button>
                <Button size="sm" variant="ghost" icon="edit" onClick={() => { setName(c.name); setIcon(c.icon); setColor(c.color); setForm({ open: true, parentId: null, id: c.id }); }} aria-label={tr('Editar')} />
                <Button size="sm" variant="ghost" onClick={() => mutate((e, a) => updateCategory(e, a, c.id, { archived: !c.archived }), c.archived ? tr('Categoría reactivada') : tr('Categoría archivada'))}>{c.archived ? tr('Reactivar') : tr('Archivar')}</Button>
                {!c.isSystem && <Button size="sm" variant="ghost" icon="trash" onClick={() => confirm.ask({ title: tr('¿Eliminar {name}?', { name: c.name }), body: tr('Los movimientos quedarán sin categoría.'), onConfirm: () => mutate((e, a) => deleteCategory(e, a, c.id), tr('Categoría eliminada')) })} aria-label={tr('Eliminar')} />}
              </span>}
            </div>
            {cats.filter((s) => s.parentId === c.id).map((s) => (
              <div key={s.id} className="group flex items-center gap-2 pl-14 pr-2 py-1.5 text-[12.5px] text-ink-2 rounded-[10px] hover:bg-surface-2">
                <span className="size-1.5 rounded-full" style={{ background: c.color }} /><span className={clsx('flex-1', s.archived && 'line-through opacity-60')}>{s.name}</span>
                {canManage && !s.isSystem && <button className="opacity-0 group-hover:opacity-100 text-muted hover:text-coral" onClick={() => mutate((e, a) => deleteCategory(e, a, s.id), tr('Subcategoría eliminada'))} aria-label={tr('Eliminar')}><Icon name="trash" size={14} /></button>}
              </div>
            ))}
          </li>
        ))}
      </ul>
      <Modal open={form.open} onClose={() => setForm({ open: false, parentId: null })} title={form.id ? tr('Editar categoría') : form.parentId ? tr('Nueva subcategoría') : tr('Nueva categoría')} icon="budget" width={520}
        footer={<><Button variant="ghost" onClick={() => setForm({ open: false, parentId: null })}>{tr('Cancelar')}</Button><Button onClick={save}>{tr('Guardar')}</Button></>}>
        <Field label={tr('Nombre')}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {!form.parentId && (
          <>
            <p className="text-[12px] font-medium text-ink-2 mt-4 mb-2">{tr('Icono')}</p>
            <div className="grid grid-cols-10 gap-1.5">{ICON_NAMES.slice(0, 40).map((n) => <button key={n} type="button" onClick={() => setIcon(n)} className={clsx('group grid place-items-center size-9 rounded-[10px] border', icon === n ? 'border-emerald bg-emerald-soft text-emerald' : 'border-line text-ink-2 hover:bg-surface-2')}><Icon name={n} size={17} active={icon === n} /></button>)}</div>
            <p className="text-[12px] font-medium text-ink-2 mt-4 mb-2">{tr('Color')}</p>
            <div className="flex gap-2">{['#1F6B4F', '#C2643E', '#3C6E9E', '#B88A2B', '#2F8A84', '#D0574B', '#5A6FB0', '#8A5CA8', '#A8743F', '#A84B6B', '#6B7A72'].map((c) => <button key={c} type="button" onClick={() => setColor(c)} className={clsx('size-8 rounded-full', color === c && 'ring-4 ring-emerald/30 scale-110')} style={{ background: c }} aria-label={c} />)}</div>
          </>
        )}
      </Modal>
      {confirm.node}
    </Card>
  );
}

function AboutTab() {
  const e = useEngine();
  return (
    <Card hover={false} className="p-8 text-center">
      <div className="mx-auto grid place-items-center size-20 rounded-[24px] hero-surface"><LogoMark size={44} tone="light" /></div>
      <h2 className="text-[26px] font-bold tracking-[-0.05em] mt-4">monto</h2>
      <p className="serif text-[17px] text-ink-2">{tr('tus finanzas, en orden')}</p>
      <p className="text-[13px] text-muted mt-3">{tr('Versión')}{' '}{APP_VERSION_LABEL}{' '}{tr('· Base de datos v')}{Number(e.scalar('PRAGMA user_version'))} · {e.adapter.kind === 'tauri' ? tr('Aplicación de escritorio') : tr('Modo navegador')}</p>
      <p className="text-[12.5px] text-ink-2 mt-6 max-w-md mx-auto leading-relaxed">{tr('Finanzas personales y familiares para Panamá, con soporte de Balboa (PAB) y Dólar (USD). Funciona sin conexión y guarda tus datos solo en este equipo.')}</p>
      <p className="text-[11.5px] text-muted mt-6">{tr('Último guardado:')}{' '}{e.lastSavedAt ? e.lastSavedAt.toLocaleTimeString(locale) : '—'} · {formatDate(new Date().toISOString().slice(0, 10), 'long')}</p>
    </Card>
  );
}

function UpdatesTab() {
  const e = useEngine();
  const prefs = useQuery((en) => getPrefs(en));
  const mutate = useMutate();
  const toast = useApp((s) => s.toast);
  const canBackup = useCan('backup.manage');
  const beta = prefs.betaUpdates ?? IS_PRERELEASE;
  const [state, setState] = useState<'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'error'>('idle');
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [err, setErr] = useState('');
  const [progress, setProgress] = useState({ d: 0, t: 0 });
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const supported = updatesSupported();

  const check = async () => {
    setState('checking'); setErr('');
    try {
      const u = await checkForUpdate(beta);
      setInfo(u); setCheckedAt(new Date()); setState(u ? 'available' : 'none');
    } catch (x) { setErr(errorMessage(x)); setState('error'); }
  };
  const install = async () => {
    if (!info) return;
    setState('downloading');
    try {
      await downloadAndInstall(e, canBackup, info, (d, t) => setProgress({ d, t }));
    } catch (x) {
      setErr(errorMessage(x)); setState('error');
      toast({ kind: 'error', title: tr('No se pudo instalar la actualización'), body: errorMessage(x) });
    }
  };
  const pct = progress.t ? Math.round((progress.d / progress.t) * 100) : 0;

  return (
    <>
      <Card hover={false} className="p-6">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center size-14 rounded-[18px] hero-surface"><LogoMark size={30} tone="light" /></div>
          <div className="flex-1">
            <p className="text-[12px] text-muted">{tr('Versión instalada')}</p>
            <p className="text-[20px] font-semibold tracking-[-0.03em] flex items-center gap-2">Monto{' '}{APP_VERSION_LABEL} {IS_PRERELEASE && <Badge tone="amber">{tr('Beta')}</Badge>}</p>
            {checkedAt && <p className="text-[11.5px] text-muted">{tr('Última comprobación:')}{' '}{checkedAt.toLocaleTimeString(locale)}</p>}
          </div>
          <Button icon="refresh" loading={state === 'checking'} disabled={!supported || state === 'downloading'} onClick={() => void check()}>{tr('Buscar actualizaciones')}</Button>
        </div>
        {!supported && <p className="text-[12.5px] text-muted mt-4">{tr('Las actualizaciones están disponibles en la aplicación de escritorio para Windows.')}</p>}
        {state === 'none' && <p className="mt-5 flex items-center gap-2 text-[13px] text-emerald"><Icon name="check" size={16} strokeWidth={2.4} />{tr('Tienes la versión más reciente')}{beta ? tr(' (incluyendo versiones Beta)') : ''}.</p>}
        {state === 'error' && <p className="mt-5 flex items-center gap-2 text-[13px] text-coral"><Icon name="alert" size={16} />{err}</p>}
        {(state === 'available' || state === 'downloading') && info && (
          <div className="mt-5 rounded-[18px] border border-emerald/40 bg-emerald-soft/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold flex items-center gap-2">{tr('Nueva versión:')}{' '}{versionLabel(info.version)} {info.prerelease && <Badge tone="amber">{tr('Beta')}</Badge>}</p>
                <p className="text-[12px] text-muted">{info.date ? new Date(info.date).toLocaleDateString(locale) : ''}{info.installerSize ? ` · ${(info.installerSize / 1048576).toFixed(1)} MB` : ''}</p>
              </div>
              <Button variant="emerald" icon="download" loading={state === 'downloading'} onClick={() => void install()}>{tr('Descargar e instalar')}</Button>
            </div>
            {info.notes && <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-[12px] text-ink-2 leading-relaxed">{info.notes.slice(0, 3000)}</pre>}
            {state === 'downloading' && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden"><div className="h-full bg-emerald transition-all" style={{ width: `${pct}%` }} /></div>
                <p className="text-[11.5px] text-muted mt-1">{tr('Descargando y verificando…')}{' '}{pct}{tr('% · Monto se cerrará para completar la instalación.')}</p>
              </div>
            )}
          </div>
        )}
      </Card>
      <Card hover={false} className="p-6 space-y-5">
        <Toggle checked={prefs.autoCheckUpdates !== false} disabled={!supported} onChange={(v) => mutate((en) => setPrefs(en, { autoCheckUpdates: v }), v ? tr('Búsqueda automática activada') : tr('Búsqueda automática desactivada'))}
          label={tr('Avisarme al iniciar si hay una versión nueva')} description={tr('Consulta la página de versiones de Monto en GitHub y te pregunta si quieres descargarla. Nunca se instala sin tu permiso ni se envía ningún dato financiero o personal.')} />
        <Toggle checked={beta} disabled={!supported} onChange={(v) => mutate((en) => setPrefs(en, { betaUpdates: v }), v ? tr('Canal Beta activado') : tr('Canal estable activado'))}
          label={tr('Recibir versiones Beta')} description={tr('Acceso anticipado a novedades. Pueden contener errores; tus datos se respaldan antes de actualizar.')} />
        <div className="rounded-[14px] bg-surface-2 p-4 text-[12px] text-ink-2 leading-relaxed flex gap-3">
          <Icon name="shield" size={18} className="text-emerald shrink-0 mt-0.5" />
          <span>{tr('Cada instalador se descarga desde las versiones oficiales en GitHub y se verifica con su suma')}{' '}<b>SHA-256</b>{' '}{tr('antes de ejecutarse. Antes de instalar se crea una copia de seguridad automática. Tus datos en')}{' '}<code>{tr('%APPDATA%\\com.monto.finanzas')}</code>{' '}{tr('no se modifican.')}</span>
        </div>
      </Card>
    </>
  );
}
