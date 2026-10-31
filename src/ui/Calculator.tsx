import { useState } from 'react';
import type { Dosage, Product } from '../domain/types';
import { Field, fmtNum, parseNum } from './components';

/** Rechnet Dosierung in g/m² bzw. ml/m² um. */
function perM2(d: Dosage): { value: number; unit: 'g' | 'ml'; note: string | null } {
  switch (d.unit) {
    case 'g/m²': return { value: d.amount, unit: 'g', note: null };
    case 'kg/100 m²': return { value: (d.amount * 1000) / 100, unit: 'g', note: `${fmtNum(d.amount)} kg/100 m² = ${fmtNum(d.amount)} × 1.000 g ÷ 100 m² = ${fmtNum((d.amount * 1000) / 100)} g/m²` };
    case 'ml/m²': return { value: d.amount, unit: 'ml', note: null };
    case 'l/100 m²': return { value: (d.amount * 1000) / 100, unit: 'ml', note: `${fmtNum(d.amount)} l/100 m² = ${fmtNum(d.amount)} × 1.000 ml ÷ 100 m² = ${fmtNum((d.amount * 1000) / 100)} ml/m²` };
  }
}

export function calcAmount(areaM2: number, d: Dosage) {
  const p = perM2(d);
  const total = areaM2 * p.value;
  const big = p.unit === 'g' ? { value: total / 1000, unit: 'kg' } : { value: total / 1000, unit: 'l' };
  return { ...p, total, big };
}

export function AmountCalculator({ products, defaultArea, defaultProductId }: { products: Product[]; defaultArea: number | null; defaultProductId?: string | null }) {
  const usable = products.filter((p) => p.dosage);
  const [pid, setPid] = useState(defaultProductId && usable.some((p) => p.id === defaultProductId) ? defaultProductId : usable[0]?.id ?? '');
  const [area, setArea] = useState(defaultArea != null ? String(defaultArea).replace('.', ',') : '');
  const product = usable.find((p) => p.id === pid) ?? usable[0];
  const n = parseNum(area);
  const areaErr = area && (n === null || Number.isNaN(n) || n! <= 0) ? 'Bitte eine Fläche größer als 0 m² angeben.' : null;

  if (!usable.length) {
    return (
      <div className="calc-box">
        <strong>Mengenrechner</strong>
        <p className="small">Für eine Berechnung braucht es ein Produkt mit hinterlegter Dosierung. Trage sie unter <a href="#/profil/produkte">Profil → Produkte & Dünger</a> von der Verpackung ein. Rasenzeit erfindet keine Produktwerte.</p>
      </div>
    );
  }
  const r = product && n && !areaErr ? calcAmount(n, product.dosage!) : null;
  return (
    <div className="calc-box">
      <strong>Mengenrechner</strong>
      <div className="grid-2">
        <Field label="Produkt">
          {(id) => <select id={id} className="select" value={product?.id ?? ""} onChange={(e) => setPid(e.target.value)}>{usable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        </Field>
        <Field label="Fläche" error={areaErr}>
          {(id, db) => <div className="input-unit"><input id={id} className="input" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} aria-invalid={!!areaErr} aria-describedby={db} /><span className="unit">m²</span></div>}
        </Field>
      </div>
      {product && (
        <p className="small muted">
          Dosierung: {fmtNum(product.dosage!.amount)} {product.dosage!.unit} ·{' '}
          {product.dosage!.source === 'hersteller_verifiziert' ? 'verifizierte Herstellerangabe' : 'von dir eingetragen'}
          {product.dosage!.sourceNote ? ` (${product.dosage!.sourceNote})` : ''}
        </p>
      )}
      {r ? (
        <div aria-live="polite">
          <p className="calc-result mono">{fmtNum(r.total, 1)} {r.unit}{r.total >= 1000 ? ` (${fmtNum(r.big.value, 2)} ${r.big.unit})` : ''}</p>
          <p className="small mono">
            Rechenweg: {r.note ? <>{r.note}; </> : null}
            {fmtNum(n)} m² × {fmtNum(r.value)} {r.unit}/m² = {fmtNum(r.total, 1)} {r.unit}
          </p>
          <p className="tiny muted">Prüfe die Angabe auf der Verpackung. Die Berechnung übernimmt nur deine hinterlegte Dosierung.</p>
        </div>
      ) : <p className="small muted">Fläche eingeben, um die Menge zu berechnen.</p>}
    </div>
  );
}
