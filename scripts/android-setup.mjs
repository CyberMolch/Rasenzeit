// Passt das von Capacitor erzeugte Android-Projekt an Rasenzeit an (idempotent).
// - deutsche Sprache als Standard der App
// - Kamera-Funktion optional (Fotos per Dateiauswahl oder Kamera)
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const manifest = 'android/app/src/main/AndroidManifest.xml';
if (!existsSync(manifest)) { console.log('Kein Android-Projekt gefunden – übersprungen.'); process.exit(0); }
let xml = await readFile(manifest, 'utf8');
if (!xml.includes('android.hardware.camera')) {
  xml = xml.replace('<application', '<uses-feature android:name="android.hardware.camera" android:required="false" />\n\n    <application');
}
await writeFile(manifest, xml);

const strings = 'android/app/src/main/res/values/strings.xml';
if (existsSync(strings)) {
  let s = await readFile(strings, 'utf8');
  s = s.replace(/<string name="app_name">[^<]*<\/string>/, '<string name="app_name">Rasenzeit</string>')
       .replace(/<string name="title_activity_main">[^<]*<\/string>/, '<string name="title_activity_main">Rasenzeit</string>');
  await writeFile(strings, s);
}
// Versionsnummer aus package.json übernehmen. versionCode muss bei jedem Update steigen,
// sonst verweigert Android die Installation über die alte Version.
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const [maj, min, pat] = pkg.version.split('.').map((x) => parseInt(x, 10) || 0);
const versionCode = maj * 10000 + min * 100 + pat;
const gradle = 'android/app/build.gradle';
if (existsSync(gradle)) {
  let g = await readFile(gradle, 'utf8');
  g = g.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`).replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
  await writeFile(gradle, g);
}
console.log(`Android-Projekt angepasst: Version ${pkg.version} (versionCode ${versionCode}).`);
