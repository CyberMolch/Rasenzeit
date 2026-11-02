// Referenzbilder, Bildbetrachter mit Zoom und vorläufige (noch nicht gespeicherte) Fotos.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icons';
import { useStore } from '../lib/store';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, fmtBytes, validateUpload } from '../lib/files';
import { SLOT_LABEL, creditLine, type LexiconImage } from '../content/lexicon/media';
import type { ImageSlot } from '../content/lexicon/plants';

export function RefPlaceholder({ slot, compact }: { slot?: ImageSlot; compact?: boolean }) {
  return (
    <div className="ref-ph" role="img" aria-label={`Referenzbild noch nicht verfügbar${slot ? `: ${SLOT_LABEL[slot]}` : ''}`}>
      <Icon name="image" size={compact ? 20 : 26} />
      <span>Referenzbild noch nicht verfügbar{slot && !compact ? <><br /><small>{SLOT_LABEL[slot]}</small></> : null}</span>
    </div>
  );
}

/** Referenzfoto mit sauberem Ersatz, falls die Datei fehlt. */
export function RefImage({ img, className, loading = 'lazy' }: { img: LexiconImage | null; className?: string; loading?: 'lazy' | 'eager' }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [img?.src]);
  if (!img || broken) return <RefPlaceholder slot={img?.slot} compact />;
  return <img className={className} src={img.src} alt={img.alt} width={img.width} height={img.height} loading={loading} onError={() => setBroken(true)} />;
}

export function Credit({ img, short }: { img: LexiconImage; short?: boolean }) {
  return (
    <span className="credit">
      {short ? creditLine(img) : <>Foto: {img.author} · <a href={img.licenseUrl || img.sourcePage} target="_blank" rel="noopener noreferrer">{img.license}</a> · <a href={img.sourcePage} target="_blank" rel="noopener noreferrer">Quelle</a></>}
    </span>
  );
}

// ---------- Zoomfläche ----------

const ZOOMS = [1, 1.5, 2, 3, 4];

export function ZoomPane({ src, alt, label, children }: { src: string; alt: string; label: string; children?: ReactNode }) {
  const [z, setZ] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setZ(0), [src]);
  const setZoom = (n: number) => {
    const el = box.current;
    const next = Math.max(0, Math.min(ZOOMS.length - 1, n));
    if (el) {
      // Bildmitte beibehalten
      const cx = (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth;
      const cy = (el.scrollTop + el.clientHeight / 2) / el.scrollHeight;
      setZ(next);
      requestAnimationFrame(() => {
        el.scrollLeft = cx * el.scrollWidth - el.clientWidth / 2;
        el.scrollTop = cy * el.scrollHeight - el.clientHeight / 2;
      });
    } else setZ(next);
  };
  return (
    <div className="zoom">
      <div className="zoom-box" ref={box} tabIndex={0} aria-label={`${label}, Zoom ${ZOOMS[z]}-fach. Mit Pfeiltasten verschieben.`}
        onDoubleClick={() => setZoom(z === 0 ? 2 : 0)}>
        <img src={src} alt={alt} style={{ width: `${ZOOMS[z] * 100}%` }} draggable={false} />
      </div>
      <div className="zoom-bar">
        <span className="small muted">{label}</span>
        <div className="row" style={{ gap: 4 }}>
          {children}
          <button type="button" className="icon-btn" onClick={() => setZoom(z - 1)} disabled={z === 0} aria-label={`${label} verkleinern`}><Icon name="zoomOut" /></button>
          <span className="mono small" aria-hidden="true" style={{ minWidth: 34, textAlign: 'center' }}>{ZOOMS[z].toLocaleString('de-DE')}×</span>
          <button type="button" className="icon-btn" onClick={() => setZoom(z + 1)} disabled={z === ZOOMS.length - 1} aria-label={`${label} vergrößern`}><Icon name="zoomIn" /></button>
        </div>
      </div>
    </div>
  );
}

// ---------- Bildbetrachter ----------

export function Lightbox({ images, index, onClose, onIndex, title }: { images: LexiconImage[]; index: number | null; onClose: () => void; onIndex: (i: number) => void; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const open = index !== null;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { opener.current = document.activeElement; d.showModal(); d.querySelector<HTMLElement>('.zoom-box')?.focus(); }
    if (!open && d.open) { d.close(); (opener.current as HTMLElement | null)?.focus?.(); }
  }, [open]);
  const img = open ? images[index!] : null;
  const go = (n: number) => onIndex((n + images.length) % images.length);
  return (
    <dialog ref={ref} className="lightbox" aria-label={`${title}: Bildbetrachter`} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={(e) => { if (!img || images.length < 2) return; if (e.key === 'ArrowRight' && !(e.target as HTMLElement).classList.contains('zoom-box')) go(index! + 1); if (e.key === 'ArrowLeft' && !(e.target as HTMLElement).classList.contains('zoom-box')) go(index! - 1); }}>
      {img && (
        <div className="lb-inner">
          <div className="lb-head">
            <div className="grow" style={{ minWidth: 0 }}>
              <strong>{img.caption}</strong>
              <span className="small" style={{ display: 'block', opacity: 0.85 }}>{SLOT_LABEL[img.slot]} · Bild {index! + 1} von {images.length}</span>
            </div>
            <button type="button" className="icon-btn lb-btn" onClick={onClose} aria-label="Bildbetrachter schließen"><Icon name="x" /></button>
          </div>
          <ZoomPane src={img.src} alt={img.alt} label="Bild">
            {images.length > 1 && <>
              <button type="button" className="icon-btn" onClick={() => go(index! - 1)} aria-label="Vorheriges Bild"><Icon name="chevronLeft" /></button>
              <button type="button" className="icon-btn" onClick={() => go(index! + 1)} aria-label="Nächstes Bild"><Icon name="chevronRight" /></button>
            </>}
          </ZoomPane>
          <p className="lb-credit small"><Credit img={img} /></p>
        </div>
      )}
    </dialog>
  );
}

// ---------- Vorläufige Fotos (erst beim Speichern dauerhaft) ----------

export function usePreviewUrls(files: File[]): string[] {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

export function PendingPhotos({ files, onChange, label = 'Fotos', existing }: { files: File[]; onChange: (f: File[]) => void; label?: string; existing?: ReactNode }) {
  const { toast } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const urls = usePreviewUrls(files);
  const add = (list: FileList | null) => {
    if (!list) return;
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      const err = validateUpload(f, 'foto');
      if (err) toast(err, 'error'); else ok.push(f);
    }
    if (ok.length) onChange([...files, ...ok]);
    if (input.current) input.current.value = '';
  };
  return (
    <div className="field">
      <span className="label" style={{ fontWeight: 600 }}>{label}</span>
      {(files.length > 0 || existing) && (
        <div className="photo-grid">
          {existing}
          {files.map((f, i) => (
            <div className="thumb-wrap" key={urls[i]}>
              <div className="photo"><img src={urls[i]} alt={`Neues Foto ${i + 1}`} /></div>
              <button type="button" className="remove" aria-label={`Neues Foto ${i + 1} entfernen`} onClick={() => onChange(files.filter((_, k) => k !== i))}><Icon name="x" size={16} /></button>
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" accept={IMAGE_TYPES.join(',')} multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => add(e.target.files)} />
      <div><button type="button" className="btn btn-outline btn-sm" onClick={() => input.current?.click()}><Icon name="camera" size={18} /> Foto aufnehmen oder auswählen</button></div>
      <span className="hint">JPEG, PNG oder WebP bis {fmtBytes(MAX_IMAGE_BYTES)}. Fotos werden erst beim Speichern übernommen.</span>
    </div>
  );
}

/** Speichert vorläufige Fotos als Anhänge und gibt deren IDs zurück. */
export async function persistFiles(addAttachment: (f: File, k: 'foto') => Promise<{ id: string }>, files: File[]): Promise<string[]> {
  const ids: string[] = [];
  for (const f of files) ids.push((await addAttachment(f, 'foto')).id);
  return ids;
}
