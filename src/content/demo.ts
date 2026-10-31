// Beispieldaten für den eindeutig gekennzeichneten Demomodus.
// Alle Produkte, Messwerte und Bilder sind fiktiv und als Beispiel markiert.

import type { StoreApi } from '../lib/store';
import type { JournalEntry, LawnArea, PlantObservation, Product, Device, SoilMeasurement, Task } from '../domain/types';
import { emptySoilProfile } from '../domain/types';
import { addDays, nowStamp, today } from '../lib/dates';
import { uid } from '../lib/ids';

function placeholderSvg(variant: 'vorher' | 'nachher', label: string): Blob {
  const grass = variant === 'vorher' ? '#9b8f5a' : '#5f9a4c';
  const patches = variant === 'vorher'
    ? '<ellipse cx="150" cy="210" rx="90" ry="26" fill="#8a6f4a"/><ellipse cx="300" cy="230" rx="70" ry="20" fill="#7d6644"/>'
    : '<ellipse cx="150" cy="210" rx="90" ry="26" fill="#6aa653" opacity=".6"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<rect width="400" height="300" fill="#dfe8d4"/>
<rect y="40" width="400" height="90" fill="#b98a5a"/>
${Array.from({ length: 14 }, (_, i) => `<rect x="${i * 29}" y="40" width="22" height="90" fill="#c99a68"/>`).join('')}
<rect y="125" width="400" height="20" fill="#c9c6bb"/>
<rect y="145" width="400" height="155" fill="${grass}"/>
${patches}
<rect x="12" y="12" width="210" height="30" rx="8" fill="#ffffff" opacity=".92"/>
<text x="24" y="33" font-family="sans-serif" font-size="16" fill="#12382b">Demo-Platzhalter · ${label}</text>
</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

export async function createDemo(store: StoreApi): Promise<void> {
  const t = today();
  const stamp = nowStamp();
  await store.createUser('Alex Müller', true);

  const gardenId = uid('area');
  const shadeId = uid('area');

  const garden: LawnArea = {
    id: gardenId, name: 'Mein Garten', sizeM2: 180, light: 'sonnig', usage: 'freizeit',
    condition: ['lueckig', 'moos'], conditionNote: 'Lückig vor allem am Gartenzaun.', conditionAssessedAt: addDays(t, -20),
    lastCare: { mowing: addDays(t, -3), fertilizing: addDays(t, -70) },
    soil: {
      ...emptySoilProfile(),
      type: { value: 'sandig', source: 'eigene', note: '', updatedAt: stamp },
      water: { value: 'trocknet_schnell', period: 'Sommer (Beispiel)', subArea: 'Südseite', note: '', photoId: null, updatedAt: stamp },
    },
    photoId: null, createdAt: stamp, updatedAt: stamp,
  };
  const shade: LawnArea = {
    id: shadeId, name: 'Schattenecke', sizeM2: 35, light: 'halbschattig', usage: 'zier',
    condition: ['moos', 'kahle_stellen'], conditionNote: '', conditionAssessedAt: addDays(t, -15),
    lastCare: {},
    soil: {
      ...emptySoilProfile(),
      water: { value: 'lange_feucht', period: 'Herbst (Beispiel)', subArea: 'unter der Hecke', note: '', photoId: null, updatedAt: stamp },
      compaction: { value: 'vermutet', method: '', date: null, note: 'Fläche wird oft als Weg genutzt.', updatedAt: stamp },
    },
    photoId: null, createdAt: stamp, updatedAt: stamp,
  };
  await store.saveArea(garden);
  await store.saveArea(shade);
  await store.saveUser({ activeAreaId: gardenId });

  const fert: Product = {
    id: uid('prod'), name: 'Rasendünger (Beispiel)', manufacturer: 'Beispielhersteller', category: 'duenger',
    dosage: { amount: 25, unit: 'g/m²', source: 'nutzer', sourceNote: 'Fiktiver Beispielwert für den Demomodus – kein reales Produkt.' },
    packageSize: '5 kg', note: '', createdAt: stamp,
  };
  const seed: Product = {
    id: uid('prod'), name: 'Nachsaatmischung (Beispiel)', manufacturer: '', category: 'saatgut',
    dosage: { amount: 20, unit: 'g/m²', source: 'nutzer', sourceNote: 'Fiktiver Beispielwert.' }, packageSize: '1 kg', note: '', createdAt: stamp,
  };
  await store.save('products', fert);
  await store.save('products', seed);
  const devices: Device[] = [
    { id: uid('dev'), name: 'Akku-Rasenmäher (Beispiel)', type: 'rasenmaeher', note: '', createdAt: stamp },
    { id: uid('dev'), name: 'Streuwagen (Beispiel)', type: 'streuwagen', note: '', createdAt: stamp },
  ];
  for (const d of devices) await store.save('devices', d);

  const m: SoilMeasurement = {
    id: uid('meas'), areaId: gardenId, date: addDays(t, -45), method: 'teststreifen', methodNote: 'Beispiel-Schnelltest',
    ph: 6.2, values: [], attachmentIds: [], note: 'Fiktiver Beispielwert.', createdAt: stamp,
  };
  await store.save('measurements', m);

  const before = await store.addAttachmentBlob(placeholderSvg('vorher', 'früher'), 'demo-zaun-vorher.svg', 'foto', { isDemoPlaceholder: true });
  const after = await store.addAttachmentBlob(placeholderSvg('nachher', 'später'), 'demo-zaun-aktuell.svg', 'foto', { isDemoPlaceholder: true });

  const base = { productId: null, amount: null, amountUnit: '', linkedTaskId: null, linkedObservationId: null, linkedMeasurementId: null, createdAt: stamp, updatedAt: stamp };
  const entries: JournalEntry[] = [
    { ...base, id: uid('jrn'), areaId: gardenId, date: addDays(t, -40), type: 'beobachtung', title: 'Stelle am Gartenzaun', note: 'Lückige, trockene Stelle festgehalten.', photoIds: [before.id], spot: 'Stelle am Gartenzaun' },
    { ...base, id: uid('jrn'), areaId: gardenId, date: addDays(t, -38), type: 'pflege', title: 'Nachsaat am Gartenzaun', note: 'Stelle aufgeraut und nachgesät.', productId: seed.id, amount: 100, amountUnit: 'g', photoIds: [], spot: 'Stelle am Gartenzaun' },
    { ...base, id: uid('jrn'), areaId: gardenId, date: addDays(t, -7), type: 'produkt', title: 'Produkt hinzugefügt', note: 'Rasendünger (Beispiel) in der Produktliste gespeichert.', productId: fert.id, photoIds: [], spot: '' },
    { ...base, id: uid('jrn'), areaId: gardenId, date: addDays(t, -5), type: 'beobachtung', title: 'Stelle am Gartenzaun', note: 'Gleiche Stelle erneut fotografiert.', photoIds: [after.id], spot: 'Stelle am Gartenzaun' },
    { ...base, id: uid('jrn'), areaId: gardenId, date: addDays(t, -3), type: 'pflege', title: 'Rasen gemäht', note: 'Gesamte Fläche.', photoIds: [], spot: '' },
    { ...base, id: uid('jrn'), areaId: gardenId, date: addDays(t, -45), type: 'messung', title: 'pH-Wert gemessen', note: 'pH 6,2 (Teststreifen, Beispiel).', photoIds: [], spot: '', linkedMeasurementId: m.id },
  ];
  for (const e of entries) await store.save('journal', e);

  const obs: PlantObservation = {
    id: uid('obs'), areaId: shadeId, plantId: 'gundermann', identification: 'vermutet', location: 'Unter der Hecke, linke Seite',
    updates: [{ id: uid('upd'), date: addDays(t, -12), kind: 'befund', extent: 'kleine_stelle', note: 'Kriechende Triebe mit rundlichen Blättern.', photoIds: [] }],
    createdAt: stamp, updatedAt: stamp,
  };
  await store.save('observations', obs);
  await store.save('journal', { ...base, id: uid('jrn'), areaId: shadeId, date: addDays(t, -12), type: 'beobachtung', title: 'Gundermann vermutet', note: 'Unter der Hecke, linke Seite.', photoIds: [], spot: '', linkedObservationId: obs.id });

  const own: Task = {
    id: uid('task'), areaId: gardenId, title: 'Rasenkanten schneiden', description: 'Eigene Aufgabe (Beispiel).', category: 'sonstiges',
    schedule: { kind: 'datum', date: addDays(t, 4) }, status: 'geplant', origin: { type: 'nutzer' }, dependsOn: [], reminderAt: null,
    productId: null, postponedFrom: null, completedAt: null, contextSnapshot: null, note: '', createdAt: stamp, updatedAt: stamp,
  };
  await store.save('tasks', own);
}

export async function exitDemo(store: StoreApi): Promise<void> {
  await store.resetAll();
}
