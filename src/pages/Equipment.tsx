import { useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { ConfirmDialog, Dialog, Empty, Field, IconBubble, Notice, SubHead, fmtNum, parseNum } from '../ui/components';
import type { Device, DeviceType, DosageUnit, Product, ProductCategory } from '../domain/types';
import { DEVICE_TYPE_LABEL, PRODUCT_CATEGORY_LABEL, options } from '../domain/labels';
import { uid } from '../lib/ids';
import { nowStamp, today } from '../lib/dates';
import { AmountCalculator } from '../ui/Calculator';
import { affiliateOffers } from '../lib/services';

const UNITS: DosageUnit[] = ['g/m²', 'kg/100 m²', 'ml/m²', 'l/100 m²'];

function ProductForm({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Product }) {
  const store = useStore();
  const [f, setF] = useState({
    name: existing?.name ?? '', manufacturer: existing?.manufacturer ?? '', category: existing?.category ?? 'duenger' as ProductCategory,
    amount: existing?.dosage ? String(existing.dosage.amount).replace('.', ',') : '', unit: existing?.dosage?.unit ?? 'g/m²' as DosageUnit,
    sourceNote: existing?.dosage?.sourceNote ?? '', packageSize: existing?.packageSize ?? '', note: existing?.note ?? '', journal: !existing,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Bitte gib einen Namen ein.';
    const n = parseNum(f.amount);
    if (f.amount && (n === null || Number.isNaN(n) || n <= 0)) e.amount = 'Die Dosierung muss eine Zahl größer als 0 sein.';
    if (n != null && n > 5000) e.amount = 'Bitte prüfe den Wert und die Einheit.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const p: Product = {
      id: existing?.id ?? uid('prod'), name: f.name.trim(), manufacturer: f.manufacturer.trim(), category: f.category,
      dosage: f.amount ? { amount: n as number, unit: f.unit, source: existing?.dosage?.source ?? 'nutzer', sourceNote: f.sourceNote.trim() } : null,
      packageSize: f.packageSize.trim(), note: f.note.trim(), createdAt: existing?.createdAt ?? nowStamp(),
    };
    const ok = await store.run(async () => {
      await store.save('products', p);
      if (f.journal && store.activeArea) {
        const stamp = nowStamp();
        await store.save('journal', {
          id: uid('jrn'), areaId: store.activeArea.id, date: today(), type: 'produkt', title: 'Produkt hinzugefügt', note: `${p.name} in der Produktliste gespeichert.`,
          productId: p.id, amount: null, amountUnit: '', photoIds: [], spot: '', linkedTaskId: null, linkedObservationId: null, linkedMeasurementId: null, createdAt: stamp, updatedAt: stamp,
        });
      }
    }, existing ? 'Produkt gespeichert.' : 'Produkt hinzugefügt.');
    if (ok !== undefined) onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title={existing ? 'Produkt bearbeiten' : 'Produkt hinzufügen'}
      footer={<><button className="btn btn-outline" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={() => void submit()}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Produktname" error={errors.name}>{(id, db) => <input id={id} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={db} />}</Field>
        <div className="grid-2">
          <Field label="Hersteller (optional)">{(id) => <input id={id} className="input" value={f.manufacturer} onChange={(e) => setF({ ...f, manufacturer: e.target.value })} />}</Field>
          <Field label="Art">{(id) => <select id={id} className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ProductCategory })}>{options(PRODUCT_CATEGORY_LABEL).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}</Field>
        </div>
        <fieldset>
          <legend>Dosierung laut Verpackung (optional)</legend>
          <p className="small muted" style={{ marginBottom: 8 }}>Übernimm den Wert genau von der Verpackung. Ohne Angabe rechnet Rasenzeit keine Menge aus.</p>
          <div className="grid-2">
            <Field label="Menge je Fläche" error={errors.amount}>{(id, db) => <input id={id} className="input" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} aria-invalid={!!errors.amount} aria-describedby={db} />}</Field>
            <Field label="Einheit">{(id) => <select id={id} className="select" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as DosageUnit })}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select>}</Field>
          </div>
          <Field label="Quelle der Angabe (optional)" hint="z. B. „Packungsrückseite, gekauft 03/2026“">{(id, db) => <input id={id} className="input" value={f.sourceNote} onChange={(e) => setF({ ...f, sourceNote: e.target.value })} aria-describedby={db} />}</Field>
        </fieldset>
        <Field label="Packungsgröße (optional)">{(id) => <input id={id} className="input" value={f.packageSize} onChange={(e) => setF({ ...f, packageSize: e.target.value })} placeholder="z. B. 5 kg" />}</Field>
        <Field label="Notiz (optional)">{(id) => <textarea id={id} className="textarea" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />}</Field>
        {!existing && <label className="checkbox-row"><input type="checkbox" checked={f.journal} onChange={(e) => setF({ ...f, journal: e.target.checked })} /> Im Tagebuch vermerken</label>}
      </form>
    </Dialog>
  );
}

export function ProductsPage() {
  const store = useStore();
  const [form, setForm] = useState<{ open: boolean; p?: Product }>({ open: false });
  const [del, setDel] = useState<Product | null>(null);
  const products = [...store.data.products].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const usedIn = (id: string) => store.data.journal.filter((j) => j.productId === id).length + store.data.tasks.filter((t) => t.productId === id).length;
  return (
    <>
      <SubHead title="Produkte & Dünger" subtitle="Was du bereits besitzt." backTo="/profil" backLabel="Profil">
        <button className="btn btn-primary" onClick={() => setForm({ open: true })}><Icon name="plus" size={18} /> Produkt hinzufügen</button>
      </SubHead>
      <div className="cols">
        <div className="stack">
          {products.length === 0 ? <Empty icon="package" title="Noch keine Produkte">Hinterlege Dünger, Saatgut oder andere Mittel mit der Dosierung von der Verpackung.</Empty> : (
            <div className="card list-card">
              {products.map((p) => (
                <div key={p.id} className="list-row" style={{ cursor: 'default' }}>
                  <IconBubble name={p.category === 'saatgut' ? 'seed' : 'package'} />
                  <span className="grow">
                    <span className="title" style={{ display: 'block' }}>{p.name}</span>
                    <span className="sub">{PRODUCT_CATEGORY_LABEL[p.category]}{p.manufacturer ? ` · ${p.manufacturer}` : ''} · {p.dosage ? `${fmtNum(p.dosage.amount)} ${p.dosage.unit} (${p.dosage.source === 'nutzer' ? 'eigene Eingabe' : 'verifiziert'})` : 'keine Dosierung hinterlegt'}</span>
                  </span>
                  <button className="icon-btn" aria-label={`${p.name} bearbeiten`} onClick={() => setForm({ open: true, p })}><Icon name="pencil" size={18} /></button>
                  <button className="icon-btn" aria-label={`${p.name} löschen`} onClick={() => setDel(p)}><Icon name="trash" size={18} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="stack col-side">
          <AmountCalculator products={store.data.products} defaultArea={store.activeArea?.sizeM2 ?? null} />
          <Notice>Rasenzeit enthält keine Herstellerdatenbank. Alle Dosierungen stammen aus deiner Eingabe.{affiliateOffers.length === 0 ? ' Es gibt keine Werbe- oder Partnerangebote.' : ''}</Notice>
        </div>
      </div>
      {form.open && <ProductForm open onClose={() => setForm({ open: false })} existing={form.p} />}
      <ConfirmDialog open={!!del} title="Produkt löschen?" confirmLabel="Löschen" danger onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          await store.run(async () => {
            await store.del('products', del.id);
            for (const j of store.data.journal.filter((x) => x.productId === del.id)) await store.save('journal', { ...j, productId: null, note: j.note || `Produkt: ${del.name}` });
            for (const t of store.data.tasks.filter((x) => x.productId === del.id)) await store.save('tasks', { ...t, productId: null });
          }, 'Produkt gelöscht.');
          setDel(null);
        }}>
        <p>„{del?.name}“ wird aus deiner Liste entfernt.</p>
        {del && usedIn(del.id) > 0 && <p className="small muted">Es ist in {usedIn(del.id)} Eintrag/Aufgabe verknüpft. Diese bleiben erhalten, verlieren aber die Verknüpfung.</p>}
      </ConfirmDialog>
    </>
  );
}

function DeviceForm({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Device }) {
  const store = useStore();
  const [f, setF] = useState({ name: existing?.name ?? '', type: existing?.type ?? 'rasenmaeher' as DeviceType, note: existing?.note ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!f.name.trim()) { setErr('Bitte gib einen Namen ein.'); return; }
    const d: Device = { id: existing?.id ?? uid('dev'), name: f.name.trim(), type: f.type, note: f.note.trim(), createdAt: existing?.createdAt ?? nowStamp() };
    const ok = await store.run(() => store.save('devices', d), existing ? 'Gerät gespeichert.' : 'Gerät hinzugefügt.');
    if (ok !== undefined) onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title={existing ? 'Gerät bearbeiten' : 'Gerät hinzufügen'}
      footer={<><button className="btn btn-outline" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={() => void submit()}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Bezeichnung" error={err}>{(id, db) => <input id={id} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-describedby={db} aria-invalid={!!err} />}</Field>
        <Field label="Art">{(id) => <select id={id} className="select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as DeviceType })}>{options(DEVICE_TYPE_LABEL).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}</Field>
        <Field label="Notiz (optional)" hint="z. B. Schnitthöhen-Stufen, Wartung">{(id, db) => <textarea id={id} className="textarea" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} aria-describedby={db} />}</Field>
      </form>
    </Dialog>
  );
}

export function DevicesPage() {
  const store = useStore();
  const [form, setForm] = useState<{ open: boolean; d?: Device }>({ open: false });
  const [del, setDel] = useState<Device | null>(null);
  return (
    <>
      <SubHead title="Geräte" subtitle="Mäher und Werkzeuge hinterlegen." backTo="/profil" backLabel="Profil">
        <button className="btn btn-primary" onClick={() => setForm({ open: true })}><Icon name="plus" size={18} /> Gerät hinzufügen</button>
      </SubHead>
      {store.data.devices.length === 0 ? <Empty icon="mower" title="Noch keine Geräte">Hinterlegte Geräte erscheinen in passenden Aufgaben.</Empty> : (
        <div className="card list-card" style={{ maxWidth: 760 }}>
          {store.data.devices.map((d) => (
            <div key={d.id} className="list-row" style={{ cursor: 'default' }}>
              <IconBubble name={d.type === 'rasenmaeher' || d.type === 'maehroboter' ? 'mower' : 'wrench'} />
              <span className="grow"><span className="title" style={{ display: 'block' }}>{d.name}</span><span className="sub">{DEVICE_TYPE_LABEL[d.type]}{d.note ? ` · ${d.note}` : ''}</span></span>
              <button className="icon-btn" aria-label={`${d.name} bearbeiten`} onClick={() => setForm({ open: true, d })}><Icon name="pencil" size={18} /></button>
              <button className="icon-btn" aria-label={`${d.name} löschen`} onClick={() => setDel(d)}><Icon name="trash" size={18} /></button>
            </div>
          ))}
        </div>
      )}
      {form.open && <DeviceForm open onClose={() => setForm({ open: false })} existing={form.d} />}
      <ConfirmDialog open={!!del} title="Gerät löschen?" confirmLabel="Löschen" danger onClose={() => setDel(null)}
        onConfirm={async () => { if (del) await store.run(() => store.del('devices', del.id), 'Gerät gelöscht.'); setDel(null); }}>
        <p>„{del?.name}“ wird entfernt.</p>
      </ConfirmDialog>
    </>
  );
}
