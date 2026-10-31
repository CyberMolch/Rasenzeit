import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { back } from '../lib/router';
import { getAttachment } from '../lib/db';
import { useStore } from '../lib/store';
import { IMAGE_TYPES, DOC_TYPES, fmtBytes, MAX_DOC_BYTES, MAX_IMAGE_BYTES } from '../lib/files';
import type { AttachmentMeta, ContentMeta } from '../domain/types';
import { REVIEW_LABEL } from '../content/rules';
import { fmtDate } from '../lib/dates';

// ---------- Seitenkopf ----------

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  useEffect(() => { document.title = `${title} · Rasenzeit`; }, [title]);
  return (
    <header className="page-head">
      <div className="spread" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="grow">
          <h1 id="page-title" tabIndex={-1}>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

export function SubHead({ title, subtitle, backTo, backLabel = 'Zurück', children }: { title: string; subtitle?: ReactNode; backTo: string; backLabel?: string; children?: ReactNode }) {
  useEffect(() => { document.title = `${title} · Rasenzeit`; }, [title]);
  return (
    <header className="page-head sub-head">
      <button type="button" className="back-link" onClick={() => back(backTo)}>
        <Icon name="arrowLeft" /> {backLabel}
      </button>
      <div className="spread" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="grow">
          <h1 id="page-title" tabIndex={-1}>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <h2 className="section-title"><span>{children}</span>{action}</h2>;
}

// ---------- Dialog ----------

export function Dialog({ open, onClose, title, children, footer, describedBy }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; describedBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
      // Fokus auf erstes Eingabefeld oder Dialog
      const first = d.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]), select, textarea');
      (first ?? d.querySelector<HTMLElement>('.dialog-body'))?.focus?.();
    } else if (!open && d.open) {
      d.close();
      (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [open]);
  useEffect(() => () => { (opener.current as HTMLElement | null)?.focus?.(); }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className="dialog-inner">
          <div className="dialog-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Dialog schließen"><Icon name="x" /></button>
          </div>
          <div className="dialog-body" tabIndex={-1}>{children}</div>
          {footer && <div className="dialog-foot">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, children, confirmLabel, danger, onConfirm, onClose, busy }: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void; busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} data-autofocus>Abbrechen</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </>
      }
    >
      <div className="stack-sm">{children}</div>
    </Dialog>
  );
}

// ---------- Formularfelder ----------

export function Field({ label, hint, error, children, id }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: (id: string, describedBy?: string) => ReactNode; id?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  const hintId = hint ? `${fid}-hint` : undefined;
  const errId = error ? `${fid}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={fid}>{label}</label>
      {children(fid, describedBy)}
      {hint && <span id={hintId} className="hint">{hint}</span>}
      {error && <span id={errId} className="error" role="alert">{error}</span>}
    </div>
  );
}

export function RadioGroup<T extends string>({ legend, name, value, options, onChange, hint, columns }: {
  legend: ReactNode; name: string; value: T | null; options: { value: T; label: string; hint?: string; figure?: ReactNode }[];
  onChange: (v: T) => void; hint?: ReactNode; columns?: boolean;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {hint && <p className="hint muted small" style={{ marginBottom: 8 }}>{hint}</p>}
      <div className={`options${columns ? ' two' : ''}`}>
        {options.map((o) => (
          <label key={o.value} className="option">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.figure && <span className="option-figure">{o.figure}</span>}
            <span className="grow">
              <span className="o-label">{o.label}</span>
              {o.hint && <span className="o-hint" style={{ display: 'block' }}>{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckGroup<T extends string>({ legend, values, options, onChange, hint }: {
  legend: ReactNode; values: T[]; options: { value: T; label: string }[]; onChange: (v: T[]) => void; hint?: ReactNode;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {hint && <p className="hint muted small" style={{ marginBottom: 8 }}>{hint}</p>}
      <div className="options two">
        {options.map((o) => (
          <label key={o.value} className="option">
            <input
              type="checkbox"
              checked={values.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...values, o.value] : values.filter((v) => v !== o.value))}
            />
            <span className="o-label">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

/** Zahl mit deutschem Komma parsen. */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
export function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits });
}

// ---------- Hinweise ----------

export function Notice({ kind = 'info', title, children, icon }: { kind?: 'info' | 'warn' | 'error'; title?: ReactNode; children?: ReactNode; icon?: IconName }) {
  return (
    <div className={`notice ${kind === 'info' ? '' : kind}`} role={kind === 'error' ? 'alert' : undefined}>
      <Icon name={icon ?? (kind === 'info' ? 'info' : 'alert')} />
      <div>{title && <strong>{title}</strong>}{children}</div>
    </div>
  );
}

export function ReviewTag({ meta }: { meta: ContentMeta }) {
  const ok = meta.reviewStatus === 'geprueft';
  return (
    <span className={`review-tag${ok ? ' ok' : ''}`} title={meta.sources.join('; ')}>
      <Icon name={ok ? 'checkCircle' : 'info'} size={14} />
      {REVIEW_LABEL[meta.reviewStatus]}{ok && meta.lastReviewed ? ` am ${fmtDate(meta.lastReviewed)}` : ''}
    </span>
  );
}

export function Empty({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card empty">
      <span className="icon-bubble lg"><Icon name={icon} size={28} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// ---------- Anhänge ----------

export function useAttachmentUrl(id: string | null | undefined): { url: string | null; missing: boolean } {
  const [state, setState] = useState<{ url: string | null; missing: boolean }>({ url: null, missing: false });
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    if (!id) { setState({ url: null, missing: false }); return; }
    getAttachment(id).then((rec) => {
      if (!alive) return;
      if (!rec) { setState({ url: null, missing: true }); return; }
      url = URL.createObjectURL(rec.blob);
      setState({ url, missing: false });
    }).catch(() => alive && setState({ url: null, missing: true }));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [id]);
  return state;
}

export function AttachmentImage({ id, alt, caption, className }: { id: string; alt: string; caption?: string; className?: string }) {
  const { url, missing } = useAttachmentUrl(id);
  const meta = useStore().data.attachments.find((a) => a.id === id);
  return (
    <div className={`photo ${className ?? ''}`}>
      {url ? <img src={url} alt={alt} loading="lazy" /> : (
        <div className="placeholder-photo" style={{ height: '100%' }}>
          <Icon name="image" size={22} />
          <span>{missing ? 'Foto nicht verfügbar' : 'Lädt …'}</span>
        </div>
      )}
      {caption && <span className="cap">{caption}</span>}
      {meta?.isDemoPlaceholder && <span className="cap" style={{ left: 'auto', right: 8, top: 8, bottom: 'auto' }}>Demo-Platzhalter</span>}
    </div>
  );
}

export function openAttachment(id: string, toastError: (s: string) => void) {
  getAttachment(id).then((rec) => {
    if (!rec) { toastError('Der Anhang ist nicht mehr vorhanden.'); return; }
    const url = URL.createObjectURL(rec.blob);
    const w = window.open(url, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = url; a.download = rec.name; a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }).catch(() => toastError('Der Anhang konnte nicht geöffnet werden.'));
}

/** Upload-Schaltfläche mit Prüfung von Typ und Größe. Speichert sofort als Anhang. */
export function UploadButton({ kind, onAdded, label, multiple = true, capture, className }: {
  kind: 'foto' | 'dokument'; onAdded: (metas: AttachmentMeta[]) => void; label?: string; multiple?: boolean; capture?: boolean; className?: string;
}) {
  const { addAttachment, toast } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const accept = (kind === 'foto' ? IMAGE_TYPES : DOC_TYPES).join(',');
  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added: AttachmentMeta[] = [];
    for (const f of Array.from(files)) {
      try { added.push(await addAttachment(f, kind)); }
      catch (e) { toast(e instanceof Error ? e.message : 'Upload fehlgeschlagen.', 'error'); }
    }
    setBusy(false);
    if (input.current) input.current.value = '';
    if (added.length) {
      onAdded(added);
      toast(added.length === 1 ? `„${added[0].name}“ hinzugefügt.` : `${added.length} Dateien hinzugefügt.`);
    }
  };
  return (
    <>
      <input ref={input} type="file" accept={accept} multiple={multiple} className="sr-only" tabIndex={-1} aria-hidden="true"
        capture={capture ? 'environment' : undefined} onChange={(e) => void handle(e.target.files)} />
      <button type="button" className={className ?? 'btn btn-outline btn-sm'} onClick={() => input.current?.click()} disabled={busy}>
        <Icon name={kind === 'foto' ? 'camera' : 'upload'} size={18} />
        {busy ? 'Wird gespeichert …' : label ?? (kind === 'foto' ? 'Foto hinzufügen' : 'Dokument hinzufügen')}
      </button>
      <span className="sr-only">{kind === 'foto' ? `JPEG, PNG oder WebP bis ${fmtBytes(MAX_IMAGE_BYTES)}` : `PDF oder Bild bis ${fmtBytes(MAX_DOC_BYTES)}`}</span>
    </>
  );
}

export function PhotoEditor({ ids, onChange, label = 'Fotos' }: { ids: string[]; onChange: (ids: string[]) => void; label?: string }) {
  return (
    <div className="field">
      <span className="label" style={{ fontWeight: 600 }}>{label}</span>
      {ids.length > 0 && (
        <div className="photo-grid">
          {ids.map((id, i) => (
            <div className="thumb-wrap" key={id}>
              <AttachmentImage id={id} alt={`Foto ${i + 1}`} />
              <button type="button" className="remove" aria-label={`Foto ${i + 1} entfernen`} onClick={() => onChange(ids.filter((x) => x !== id))}><Icon name="x" size={16} /></button>
            </div>
          ))}
        </div>
      )}
      <div><UploadButton kind="foto" onAdded={(m) => onChange([...ids, ...m.map((x) => x.id)])} /></div>
      <span className="hint">JPEG, PNG oder WebP, bis {fmtBytes(MAX_IMAGE_BYTES)} je Foto. Große Fotos werden platzsparend verkleinert.</span>
    </div>
  );
}

// ---------- Illustrationen ----------

/** Neutrales, gezeichnetes Gartenmotiv, solange kein eigenes Foto hinterlegt ist. */
export function GardenArt({ seed = 0, className }: { seed?: number; className?: string }) {
  const hue = [0, 8, -6, 4][seed % 4];
  return (
    <svg className={className ?? 'hero-art'} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4efd8" />
          <stop offset="1" stopColor="#dbe8cf" />
        </linearGradient>
        <linearGradient id={`lawn${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${100 + hue} 38% 46%)`} />
          <stop offset="1" stopColor={`hsl(${118 + hue} 42% 28%)`} />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#sky${seed})`} />
      <circle cx="320" cy="48" r="26" fill="#fff6d6" opacity="0.9" />
      <path d="M0 110 C60 70 110 92 160 78 C220 60 260 92 310 74 C350 60 380 78 400 70 V140 H0Z" fill={`hsl(${128 + hue} 28% 38%)`} opacity="0.85" />
      <path d="M0 122 C70 100 130 116 190 104 C260 90 320 110 400 98 V160 H0Z" fill={`hsl(${120 + hue} 30% 32%)`} />
      <path d="M0 130 C120 116 250 120 400 112 V200 H0Z" fill={`url(#lawn${seed})`} />
      <path d="M0 160 C120 150 260 152 400 146" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="14" fill="none" />
    </svg>
  );
}

export function PlantPlaceholder({ name }: { name: string }) {
  return (
    <div className="placeholder-photo ph" role="img" aria-label={`Platzhalter: noch kein geprüftes Referenzfoto für ${name}`}>
      <Icon name="leaf" size={26} />
      <span><strong>Platzhalter</strong><br />Geprüftes Referenzfoto folgt</span>
    </div>
  );
}

export function IconBubble({ name, size = 'md' }: { name: IconName; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`icon-bubble ${size === 'md' ? '' : size}`}><Icon name={name} size={size === 'lg' ? 30 : size === 'sm' ? 18 : 22} /></span>;
}
