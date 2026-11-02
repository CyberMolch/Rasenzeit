// Referenzbilder und Taxonomie für das Pflanzenlexikon (läuft in GitHub Actions).
//
//   node scripts/lexikon-bilder.mjs kandidaten   → kandidaten/<id>/… (Vorschaubilder + Metadaten zur Sichtung)
//   node scripts/lexikon-bilder.mjs uebernehmen  → public/lexikon/*.jpg + src/content/lexicon/images.json
//
// Alle Lizenz- und Urheberangaben werden direkt aus der Wikimedia-Commons-API übernommen,
// nicht von Hand eingetragen. Bilder mit NC-/ND-Einschränkung oder ohne freie Lizenz
// werden automatisch abgelehnt. Wissenschaftliche Namen werden mit GBIF abgeglichen.

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const UA = 'RasenzeitLexikon/0.2 (https://github.com/CyberMolch/Rasenzeit; Bildnachweise fuer Pflanzenlexikon)';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const mode = process.argv[2];
const taxa = JSON.parse(await readFile('src/content/lexicon/taxa.json', 'utf8')).taxa;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      console.warn(`HTTP ${res.status} für ${url}`);
    } catch (e) { console.warn(`Fehler ${e.message} für ${url}`); }
    await sleep(1500 * (i + 1));
  }
  return null;
}

async function download(url, path, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(path, buf);
        return buf.length;
      }
      console.warn(`HTTP ${res.status} beim Laden von ${url}`);
    } catch (e) { console.warn(`Fehler ${e.message} beim Laden von ${url}`); }
    await sleep(2000 * (i + 1));
  }
  return 0;
}

const commonsUrl = (params) => `${COMMONS}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
const stripHtml = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();

/** Erlaubt: CC0, Public Domain, CC BY, CC BY-SA. Abgelehnt: NC, ND, GFDL-only, alles Unbekannte. */
export function licenseOk(shortName = '') {
  const s = shortName.trim();
  if (/\b(NC|ND)\b/i.test(s) || /noncommercial|no ?deriv/i.test(s)) return false;
  if (/^CC0/i.test(s)) return true;
  if (/^(public domain|PD)\b/i.test(s)) return true;
  if (/^CC BY(-SA)? ?\d(\.\d)?/i.test(s)) return true;
  return false;
}

async function imageInfos(titles, width) {
  const out = [];
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const d = await getJson(commonsUrl({
      action: 'query', titles: batch.join('|'), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: String(width),
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|Restrictions|AttributionRequired|UsageTerms|DateTimeOriginal',
    }));
    for (const p of d?.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      out.push({
        title: p.title,
        mime: ii.mime, width: ii.width, height: ii.height,
        thumbUrl: ii.thumburl, thumbWidth: ii.thumbwidth, thumbHeight: ii.thumbheight, originalUrl: ii.url,
        sourcePage: ii.descriptionurl,
        license: m.LicenseShortName?.value ?? '',
        licenseUrl: m.LicenseUrl?.value ?? '',
        author: stripHtml(m.Artist?.value ?? ''),
        credit: stripHtml(m.Credit?.value ?? ''),
        description: stripHtml(m.ImageDescription?.value ?? '').slice(0, 300),
        restrictions: m.Restrictions?.value ?? '',
        attributionRequired: m.AttributionRequired?.value ?? '',
        date: stripHtml(m.DateTimeOriginal?.value ?? ''),
      });
    }
    await sleep(300);
  }
  return out;
}

async function taxonomyCheck(t) {
  const name = t.gbif ?? t.scientific;
  let gbif = await getJson(`https://api.gbif.org/v1/species/match?${new URLSearchParams({ name, kingdom: 'Plantae', strict: 'false' })}`);
  let accepted = null;
  if (gbif?.usageKey && gbif.acceptedUsageKey) accepted = await getJson(`https://api.gbif.org/v1/species/${gbif.acceptedUsageKey}`);
  const wikiQ = await getJson(`https://de.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', titles: t.wiki, redirects: '1', format: 'json', formatversion: '2' })}`);
  const page = wikiQ?.query?.pages?.[0];
  return {
    id: t.id,
    queried: name,
    gbif: gbif ? {
      usageKey: gbif.usageKey ?? null, scientificName: gbif.scientificName ?? null, canonicalName: gbif.canonicalName ?? null,
      rank: gbif.rank ?? null, status: gbif.status ?? null, matchType: gbif.matchType ?? null, family: gbif.family ?? null,
      acceptedUsageKey: gbif.acceptedUsageKey ?? null, acceptedName: accepted?.scientificName ?? null,
      url: gbif.usageKey ? `https://www.gbif.org/species/${gbif.usageKey}` : null,
    } : null,
    wikipedia: page && !page.missing ? { title: page.title, url: `https://de.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` } : null,
    checkedAt: new Date().toISOString().slice(0, 10),
  };
}

// ---------------------------------------------------------------- Kandidaten
async function kandidaten() {
  await rm('kandidaten', { recursive: true, force: true });
  await mkdir('kandidaten', { recursive: true });
  const tax = [];
  for (const t of taxa) {
    console.log(`\n== ${t.nameDe} (${t.scientific})`);
    tax.push(await taxonomyCheck(t));
    const titles = [];
    const add = (arr) => { for (const x of arr) if (!titles.includes(x)) titles.push(x); };
    for (const cat of t.commons) {
      const q = await getJson(commonsUrl({ action: 'query', list: 'search', srnamespace: '6', srlimit: '12', srsearch: `incategory:"Quality_images" incategory:"${cat}"` }));
      add((q?.query?.search ?? []).map((s) => s.title));
      const cm = await getJson(commonsUrl({ action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmtype: 'file', cmlimit: '40' }));
      add((cm?.query?.categorymembers ?? []).map((s) => s.title));
      const deep = await getJson(commonsUrl({ action: 'query', list: 'search', srnamespace: '6', srlimit: '30', srsearch: `deepcat:"${cat}" filetype:bitmap` }));
      add((deep?.query?.search ?? []).map((s) => s.title));
      await sleep(300);
    }
    const infos = (await imageInfos(titles, 360))
      .filter((i) => /jpeg|png/.test(i.mime) && i.width >= 800 && licenseOk(i.license));
    const pick = infos.slice(0, 18);
    const dir = `kandidaten/${t.id}`;
    await mkdir(dir, { recursive: true });
    const index = [];
    for (let n = 0; n < pick.length; n++) {
      const f = pick[n];
      const file = `${String(n + 1).padStart(2, '0')}.jpg`;
      const size = await download(f.thumbUrl, `${dir}/${file}`);
      if (size) index.push({ nr: n + 1, file, title: f.title, license: f.license, author: f.author, width: f.width, height: f.height, description: f.description });
      await sleep(250);
    }
    console.log(`${titles.length} gefunden, ${infos.length} frei lizenziert, ${index.length} geladen`);
    await writeFile(`${dir}/index.json`, JSON.stringify(index, null, 2));
  }
  await writeFile('kandidaten/taxonomie.json', JSON.stringify(tax, null, 2));
}

// ---------------------------------------------------------------- Übernehmen
async function uebernehmen() {
  const sel = JSON.parse(await readFile('lexikon/bildauswahl.json', 'utf8'));
  await mkdir('public/lexikon', { recursive: true });
  const prev = existsSync('src/content/lexicon/images.json') ? JSON.parse(await readFile('src/content/lexicon/images.json', 'utf8')) : null;
  const result = { version: 1, generatedAt: new Date().toISOString(), source: 'Wikimedia Commons API (extmetadata)', images: {}, rejected: [], taxonomy: {} };
  for (const t of taxa) {
    result.taxonomy[t.id] = await taxonomyCheck(t);
    const wanted = sel.images?.[t.id] ?? [];
    if (!wanted.length) continue;
    const infos = await imageInfos(wanted.map((w) => w.file), 800);
    const list = [];
    for (const w of wanted) {
      const info = infos.find((i) => i.title.replace(/_/g, ' ') === w.file.replace(/_/g, ' '));
      if (!info) { result.rejected.push({ plant: t.id, file: w.file, reason: 'Datei auf Commons nicht gefunden' }); continue; }
      if (!licenseOk(info.license)) { result.rejected.push({ plant: t.id, file: w.file, reason: `Lizenz nicht zulässig: ${info.license || 'unbekannt'}` }); continue; }
      const name = `${t.id}-${w.slot}.jpg`;
      const url = info.thumbUrl && info.width > 800 ? info.thumbUrl : info.originalUrl;
      const bytes = await download(url, `public/lexikon/${name}`);
      if (!bytes) { result.rejected.push({ plant: t.id, file: w.file, reason: 'Download fehlgeschlagen' }); continue; }
      const scaled = info.width > 800;
      list.push({
        src: `lexikon/${name}`, slot: w.slot, caption: w.caption, alt: w.alt,
        width: scaled ? info.thumbWidth : info.width, height: scaled ? info.thumbHeight : info.height, bytes,
        commonsTitle: info.title, sourcePage: info.sourcePage,
        author: info.author || info.credit || 'unbekannt', license: info.license, licenseUrl: info.licenseUrl,
        restrictions: info.restrictions || null,
        changes: [scaled ? `auf ${info.thumbWidth} × ${info.thumbHeight} px verkleinert (Original ${info.width} × ${info.height} px)` : null, w.mime === 'image/png' || info.mime === 'image/png' ? 'als JPEG gespeichert' : null].filter(Boolean).join('; ') || 'unverändert',
        selectedBy: sel.reviewer ?? 'redaktionelle Sichtung', selectedAt: sel.date ?? null,
      });
      await sleep(250);
    }
    result.images[t.id] = list;
    console.log(`${t.nameDe}: ${list.length} Bilder übernommen`);
  }
  if (prev) {
    // nicht mehr ausgewählte Bilddateien entfernen
    const keep = new Set(Object.values(result.images).flat().map((i) => i.src));
    for (const old of Object.values(prev.images ?? {}).flat()) if (!keep.has(old.src)) await rm(`public/${old.src}`, { force: true });
  }
  await writeFile('src/content/lexicon/images.json', JSON.stringify(result, null, 2) + '\n');
  if (result.rejected.length) console.log('Abgelehnt:', JSON.stringify(result.rejected, null, 2));
}

if (mode === 'kandidaten') await kandidaten();
else if (mode === 'uebernehmen') await uebernehmen();
else { console.error('Aufruf: node scripts/lexikon-bilder.mjs kandidaten|uebernehmen'); process.exit(1); }
