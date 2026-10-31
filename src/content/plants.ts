// Pflanzensteckbriefe. Prüfstatus: Entwurf. Keine Referenzfotos hinterlegt
// (die generierten Bilder der Designvorlage sind keine Bestimmungsgrundlage).

import type { ContentMeta } from '../domain/types';

export type FeatureKey = 'wuchsform' | 'blatt' | 'bluete' | 'wuchs' | 'geruch' | 'milchsaft' | 'aehren';

export interface Plant extends ContentMeta {
  id: string;
  name: string;
  botanical: string;
  aliases: string[];
  type: string;
  short: string;
  features: string[];
  compare: string[]; // Vergleichsmöglichkeiten
  lookalikes: { name: string; difference: string }[];
  measures: { title: string; text: string }[];
  care: string[]; // passende Pflege
  limits: string[];
  siteNote: string; // vorsichtige Aussage zum Standort
  traits: Partial<Record<FeatureKey, string[]>>; // passende Antworten der Bestimmungshilfe
  season: string;
}

const DRAFT: ContentMeta = {
  reviewStatus: 'entwurf',
  lastReviewed: null,
  sources: ['Botanische Standardmerkmale, zusammengestellt für Rasenzeit – fachliche Prüfung ausstehend'],
};

export const CHEMICAL_NOTE =
  'Für chemische Pflanzenschutzmittel liegen in Rasenzeit keine geprüften Angaben zu Eignung, aktueller Zulassung im jeweiligen Land und Herstellerdosierung vor. Deshalb gibt die App keine Produktempfehlung. In Deutschland informiert das Bundesamt für Verbraucherschutz und Lebensmittelsicherheit (BVL) über zugelassene Mittel; im Haus- und Kleingarten gelten besondere Zulassungsbeschränkungen.';

export const PLANTS: Plant[] = [
  {
    ...DRAFT,
    id: 'gundermann',
    name: 'Gundermann',
    botanical: 'Glechoma hederacea',
    aliases: ['Gundelrebe', 'Erdefeu'],
    type: 'Ausdauernde, kriechende Pflanze (Lippenblütler)',
    short: 'Kriechende Ausläufer mit rundlichen, gekerbten Blättern und blauvioletten Blüten.',
    features: [
      'Lange, oberirdisch kriechende Ausläufer, die an den Knoten wurzeln.',
      'Blätter gegenständig, rundlich bis nierenförmig, mit gekerbtem Rand und langem Stiel.',
      'Stängel vierkantig.',
      'Kleine blauviolette Lippenblüten, meist im Frühjahr.',
      'Beim Zerreiben deutlich würziger Geruch.',
    ],
    compare: ['Stängel zwischen den Fingern rollen: vierkantig?', 'Ein Blatt zerreiben und daran riechen.', 'Wurzeln die Ausläufer an den Blattknoten?'],
    lookalikes: [
      { name: 'Kriechender Günsel', difference: 'Blätter länglicher, Blüten in aufrechten Ähren, kaum würziger Geruch.' },
      { name: 'Purpurrote Taubnessel', difference: 'Wächst aufrecht statt kriechend, obere Blätter rötlich, Blüten purpurrosa.' },
      { name: 'Efeublättriger Ehrenpreis', difference: 'Einjährig, Blätter gelappt, Blüten einzeln und hellblau, kein würziger Geruch.' },
    ],
    measures: [
      { title: 'Ausläufer entfernen', text: 'Ausläufer bei feuchtem Boden vorsichtig herausziehen oder mit einem Rechen herauskämmen. Wurzelnde Knoten möglichst mitnehmen.' },
      { title: 'Regelmäßig nacharbeiten', text: 'Einmaliges Entfernen reicht oft nicht, weil kleine Reste wieder austreiben. Kontrolle nach einigen Wochen einplanen.' },
      { title: 'Lücken schließen', text: 'Entstandene Lücken nachsäen, damit sich die Pflanze nicht erneut ausbreitet.' },
    ],
    care: ['Dichte Grasnarbe fördern', 'Für schattige Bereiche geeignete Saatmischung wählen', 'Nachkontrolle einplanen'],
    limits: ['Rein mechanische Maßnahmen brauchen Ausdauer.', 'In sehr schattigen Bereichen bleibt Rasen oft lückig – dort kann eine andere Bepflanzung sinnvoller sein.'],
    siteNote: 'Gundermann kommt häufig an schattigen, feuchten Stellen vor. Das Vorkommen allein lässt aber keinen sicheren Schluss auf Boden, pH-Wert oder Nährstoffe zu.',
    traits: { wuchsform: ['krautig'], blatt: ['rund_gekerbt'], bluete: ['blau_violett'], wuchs: ['kriechend'], geruch: ['aromatisch'], milchsaft: ['nein'], aehren: ['nein'] },
    season: 'Blüte meist März bis Juni, Blätter ganzjährig sichtbar.',
  },
  {
    ...DRAFT,
    id: 'weissklee',
    name: 'Weißklee',
    botanical: 'Trifolium repens',
    aliases: ['Kriechklee', 'Klee'],
    type: 'Ausdauernde, kriechende Pflanze (Hülsenfrüchtler)',
    short: 'Dreizählige Blätter, oft mit heller Zeichnung, und weiße kugelige Blütenköpfchen.',
    features: [
      'Blätter dreizählig, Teilblättchen rundlich bis oval, oft mit hellem, winkelförmigem Muster.',
      'Kriechende Stängel, die an den Knoten wurzeln.',
      'Weiße bis leicht rosa, kugelige Blütenköpfchen auf langen Stielen.',
      'Blüht meist von Mai bis in den Herbst.',
    ],
    compare: ['Anzahl der Teilblättchen zählen.', 'Form der Teilblättchen: rundlich oder herzförmig?', 'Blütenfarbe ansehen.'],
    lookalikes: [
      { name: 'Sauerklee (z. B. Hornfrüchtiger Sauerklee)', difference: 'Teilblättchen herzförmig, oft rötlich; Blüten gelb und fünfzählig.' },
      { name: 'Hornklee', difference: 'Gelbe Blüten, mehrere längliche Teilblättchen.' },
      { name: 'Kleiner Klee / Fadenklee', difference: 'Kleine gelbe Blütenköpfchen.' },
    ],
    measures: [
      { title: 'Erst entscheiden', text: 'Weißklee ist trittfest und bleibt auch bei Trockenheit grün. Manche Gärtner tolerieren ihn bewusst.' },
      { title: 'Ausrechen und herausziehen', text: 'Kriechende Triebe mit einem Rechen anheben und herausziehen, einzelne Nester von Hand entfernen.' },
      { title: 'Grasnarbe stärken', text: 'Lücken nachsäen und den Rasen nicht zu tief mähen, damit die Gräser konkurrenzfähig bleiben.' },
    ],
    care: ['Dichte Grasnarbe fördern', 'Nicht zu tief mähen', 'Lücken nachsäen'],
    limits: ['Klee lässt sich mechanisch meist nur zurückdrängen, nicht vollständig entfernen.'],
    siteNote: 'Klee bindet mit Hilfe von Bakterien Stickstoff aus der Luft und wird häufig mit nährstoffarmen Bedingungen in Verbindung gebracht. Ein Nährstoffmangel lässt sich aus seinem Vorkommen allein nicht ableiten – dafür wäre eine Bodenanalyse nötig.',
    traits: { wuchsform: ['krautig'], blatt: ['dreizaehlig'], bluete: ['weiss_kugelig'], wuchs: ['kriechend'], geruch: ['unauffaellig'], milchsaft: ['nein'], aehren: ['nein'] },
    season: 'Blüte meist Mai bis September.',
  },
  {
    ...DRAFT,
    id: 'loewenzahn',
    name: 'Löwenzahn',
    botanical: 'Taraxacum sect. Ruderalia',
    aliases: ['Pusteblume', 'Butterblume'],
    type: 'Ausdauernde Rosettenpflanze (Korbblütler) mit Pfahlwurzel',
    short: 'Rosette mit tief gezähnten Blättern, gelbe Einzelblüte auf hohlem Stängel, Milchsaft.',
    features: [
      'Blätter in einer bodennahen Rosette, länglich und unregelmäßig tief gezähnt.',
      'Blütenstängel hohl, unverzweigt und ohne Blätter, mit genau einem gelben Blütenkorb.',
      'Weißer Milchsaft beim Abbrechen von Blatt oder Stängel.',
      'Kräftige, tief reichende Pfahlwurzel.',
      'Kugelige Samenstände („Pusteblume“).',
    ],
    compare: ['Ist der Blütenstängel hohl und unverzweigt?', 'Tritt beim Abbrechen weißer Milchsaft aus?', 'Sind die Blätter behaart?'],
    lookalikes: [
      { name: 'Gewöhnliches Ferkelkraut', difference: 'Blätter deutlich behaart, Stängel verzweigt und nicht hohl, mit kleinen Schuppenblättchen.' },
      { name: 'Herbst-Löwenzahn', difference: 'Stängel oft verzweigt und nicht hohl, Blüte vor allem im Spätsommer und Herbst.' },
      { name: 'Wiesen-Pippau', difference: 'Verzweigter, beblätterter Stängel mit mehreren Blüten.' },
    ],
    measures: [
      { title: 'Ausstechen', text: 'Mit einem Unkrautstecher senkrecht neben der Pflanze einstechen und die Pfahlwurzel möglichst vollständig herausheben. Bei feuchtem Boden gelingt das leichter.' },
      { title: 'Vor der Samenreife handeln', text: 'Blüten entfernen, bevor sich Samenstände bilden, um die Ausbreitung zu begrenzen.' },
      { title: 'Lücke schließen', text: 'Das entstandene Loch mit Erde füllen und nachsäen.' },
    ],
    care: ['Lücken schließen', 'Samenbildung verhindern', 'Nachkontrolle einplanen'],
    limits: ['Verbleibende Wurzelstücke können wieder austreiben.'],
    siteNote: 'Löwenzahn wächst auf sehr unterschiedlichen Böden. Aus seinem Vorkommen lässt sich keine sichere Aussage über Bodenart oder pH-Wert ableiten.',
    traits: { wuchsform: ['krautig'], blatt: ['gezaehnt_rosette'], bluete: ['gelb_einzeln'], wuchs: ['rosette'], geruch: ['unauffaellig'], milchsaft: ['ja'], aehren: ['nein'] },
    season: 'Hauptblüte April bis Mai, vereinzelt bis in den Herbst.',
  },
  {
    ...DRAFT,
    id: 'fingerhirse',
    name: 'Blutrote Fingerhirse',
    botanical: 'Digitaria sanguinalis',
    aliases: ['Fingerhirse', 'Bluthirse', 'Hirse'],
    type: 'Einjähriges Gras, keimt bei warmem Boden',
    short: 'Hellgrünes, breitblättriges Gras mit fingerartig angeordneten Blütenähren.',
    features: [
      'Einjähriges Gras, keimt erst bei warmem Boden ab dem späten Frühjahr.',
      'Breitere, hellgrüne, oft behaarte Blätter als die meisten Rasengräser.',
      'Blütenstand aus mehreren schmalen Ähren, die fingerartig von einem Punkt ausgehen.',
      'Stängel liegen oft am Boden, sind häufig rötlich und können an den Knoten wurzeln.',
      'Stirbt mit dem ersten Frost ab und hinterlässt Lücken.',
    ],
    compare: ['Blütenstand ansehen: mehrere Ähren von einem Punkt?', 'Blattfarbe und Blattbreite mit den Rasengräsern vergleichen.', 'Am Blattgrund nach einem häutigen Blatthäutchen suchen.'],
    lookalikes: [
      { name: 'Hühnerhirse', difference: 'Kein Blatthäutchen am Blattgrund, Blütenstand rispig statt fingerförmig.' },
      { name: 'Glatte Fingerhirse', difference: 'Sehr ähnlich, aber weitgehend unbehaart und meist kleiner.' },
      { name: 'Weiche Trespe und andere Gräser', difference: 'Andere Blütenstände; eine sichere Unterscheidung von Gräsern braucht oft den Blütenstand.' },
    ],
    measures: [
      { title: 'Vor der Samenbildung entfernen', text: 'Einzelne Pflanzen samt Wurzel herausziehen, solange sie noch keine Samen gebildet haben.' },
      { title: 'Lücken vermeiden', text: 'Da die Hirse vor allem in Lücken keimt, ist eine dichte Grasnarbe die wichtigste Vorbeugung.' },
      { title: 'Nicht zu tief mähen', text: 'Zu tiefer Schnitt lässt mehr Licht auf den Boden und begünstigt das Keimen.' },
    ],
    care: ['Lücken im Herbst nachsäen', 'Nicht zu tief mähen', 'Nachkontrolle im Sommer einplanen'],
    limits: ['Samen können mehrere Jahre im Boden keimfähig bleiben; mit erneutem Auftreten ist zu rechnen.'],
    siteNote: 'Fingerhirse profitiert vor allem von Lücken und Wärme. Rückschlüsse auf Bodenart oder Nährstoffe lassen sich daraus nicht ziehen.',
    traits: { wuchsform: ['grasartig'], blatt: [], bluete: ['keine'], wuchs: ['bueschel', 'kriechend'], geruch: ['unauffaellig'], milchsaft: ['nein'], aehren: ['ja'] },
    season: 'Sichtbar etwa ab Juni bis zum ersten Frost.',
  },
];

export function getPlant(id: string | null | undefined): Plant | undefined {
  return PLANTS.find((p) => p.id === id);
}
