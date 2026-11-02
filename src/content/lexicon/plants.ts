// Redaktionelle Steckbriefe des Pflanzenlexikons.
// Getrennt von: Stammdaten/Taxonomie (taxa.json), Bildern und Lizenzen (images.json),
// Filtermerkmalen (filters.ts) und persönlichen Daten (IndexedDB).
//
// Prüfstatus: Alle Texte sind redaktionelle Entwürfe auf Grundlage botanischer
// Standardmerkmale. Eine fachliche Prüfung durch eine Botanikerin oder einen
// Botaniker steht aus. Die wissenschaftlichen Namen werden automatisch mit GBIF
// abgeglichen (siehe images.json → taxonomy).

import type { ContentMeta } from '../../domain/types';
import taxaFile from './taxa.json';

export const LEXICON_VERSION = 1;

export type Category = 'kraut' | 'gras';
export type BloomColor = 'weiss' | 'gelb' | 'blau-violett' | 'rosa-rot' | 'unscheinbar';
export type LeafShape =
  | 'rundlich' | 'dreizaehlig' | 'gefingert' | 'gefiedert' | 'handfoermig-geteilt'
  | 'eifoermig' | 'lanzettlich' | 'spatelfoermig' | 'laenglich' | 'spiessfoermig' | 'grasartig';
export type LeafMargin = 'ganzrandig' | 'gekerbt' | 'gezaehnt' | 'tief-eingeschnitten';
export type Growth = 'kriechend' | 'rosette' | 'aufrecht' | 'niederliegend' | 'horstig';
export type ImageSlot = 'gesamt' | 'blatt' | 'bluete' | 'wuchs';

export interface Taxon {
  id: string; nameDe: string; scientific: string; authority: string; rank: 'Art' | 'Artengruppe';
  family: string; commons: string[]; wiki: string; gbif?: string;
}

export interface LexiconPlant extends ContentMeta {
  id: string;
  synonyms: string[]; // wissenschaftliche Synonyme und gebräuchliche deutsche Namen
  groupNote?: string; // Hinweis bei Artengruppen
  category: Category;
  short: string;
  features: { leaves: string; flowers: string; growth: string; other: string[] };
  mowingNote: string;
  bloom: [number, number] | null; // Monate, ungefähre Hauptblütezeit
  filters: { bluete: BloomColor[]; blattform: LeafShape[]; blattrand: LeafMargin[]; wuchs: Growth[] };
  lookalikes: { id?: string; name: string; difference: string; photoLimit?: boolean }[];
  care: { assessment: string; keep: string; mechanical: string[]; prevention: string[]; limits: string[] };
  safety?: string;
  site: string;
}

export const GLOSSARY: Record<string, string> = {
  Ausläufer: 'Oberirdisch kriechender Trieb, der an den Knoten neue Wurzeln bildet.',
  Rosette: 'Blätter, die dicht gedrängt kreisförmig direkt über dem Boden stehen.',
  gegenständig: 'Je zwei Blätter stehen sich an einem Stängelknoten gegenüber.',
  wechselständig: 'Blätter stehen einzeln und abwechselnd am Stängel.',
  Blatthäutchen: 'Kleines häutiges Gebilde bei Gräsern am Übergang von Blattscheide zu Blattspreite.',
  Rispe: 'Verzweigter Blütenstand, typisch für viele Gräser.',
  gefingert: 'Mehrere Teilblättchen entspringen an einem Punkt, wie Finger einer Hand.',
  gefiedert: 'Teilblättchen stehen paarweise entlang einer Mittelachse.',
  ganzrandig: 'Blattrand ohne Zähne oder Einschnitte.',
};

const DRAFT: ContentMeta = {
  reviewStatus: 'entwurf',
  lastReviewed: null,
  sources: ['Botanische Standardmerkmale, redaktionell zusammengestellt – fachliche Prüfung ausstehend'],
};

const SITE_CAVEAT = 'Das Vorkommen allein erlaubt keinen sicheren Schluss auf Bodenart, pH-Wert oder Nährstoffversorgung.';

export const LEXICON: LexiconPlant[] = [
  {
    ...DRAFT, id: 'gundermann', synonyms: ['Gundelrebe', 'Erdefeu'], category: 'kraut',
    short: 'Niedrige, kriechende Pflanze mit rundlichen, gekerbten Blättern und blauvioletten Lippenblüten. Riecht beim Zerreiben würzig.',
    features: {
      leaves: 'Gegenständig, rundlich bis nierenförmig, lang gestielt, Rand grob gekerbt. Oft rötlich überlaufen.',
      flowers: 'Blauviolette Lippenblüten zu wenigen in den Blattachseln, meist März bis Juni.',
      growth: 'Lange oberirdische Ausläufer, die an den Knoten wurzeln; blühende Triebe kurz aufsteigend.',
      other: ['Stängel vierkantig – zwischen den Fingern rollen.', 'Deutlich würziger Geruch beim Zerreiben.'],
    },
    mowingNote: 'Auch nach dem Mähen gut an den rundlichen, gekerbten Blättern und dem Geruch erkennbar.',
    bloom: [3, 6],
    filters: { bluete: ['blau-violett'], blattform: ['rundlich'], blattrand: ['gekerbt'], wuchs: ['kriechend'] },
    lookalikes: [
      { id: 'faden-ehrenpreis', name: 'Faden-Ehrenpreis', difference: 'Blätter kleiner, Stängel rund und fadenförmig, Blüten einzeln an langen Stielen, kein würziger Geruch.' },
      { name: 'Kriechender Günsel', difference: 'Blätter länglich, Blüten in aufrechten Ähren, kaum Geruch.' },
      { name: 'Efeublättriger Ehrenpreis', difference: 'Blätter mit drei bis fünf Lappen, einjährig, kein Geruch.', photoLimit: true },
    ],
    care: {
      assessment: 'Breitet sich über Ausläufer flächig aus und verdrängt an schattigen Stellen Rasengräser. Blüht früh im Jahr und wird von Insekten besucht.',
      keep: 'An schattigen Stellen, an denen Rasen ohnehin schwach wächst, kann Gundermann als niedriger Bodendecker toleriert werden.',
      mechanical: ['Ausläufer bei feuchtem Boden mit den Händen oder einem Rechen herausziehen; wurzelnde Knoten mitnehmen.', 'Mehrfach nacharbeiten, da kleine Reste wieder austreiben.'],
      prevention: ['Dichte Grasnarbe fördern, Lücken nachsäen.', 'Im Schatten eine Saatmischung für schattige Lagen wählen.'],
      limits: ['Mechanisches Entfernen braucht Ausdauer und gelingt selten vollständig.'],
    },
    safety: 'Für einige Tiere, zum Beispiel Pferde und Nagetiere, als giftig beschrieben.',
    site: `Häufig an halbschattigen, frischen bis feuchten Stellen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'weissklee', synonyms: ['Kriech-Klee', 'Weiß-Klee'], category: 'kraut',
    short: 'Kriechender Klee mit dreizähligen Blättern und weißen, kugeligen Blütenköpfchen auf langen Stielen.',
    features: {
      leaves: 'Dreizählig, Teilblättchen rundlich bis verkehrt-eiförmig, fein gezähnt, oft mit heller, winkelförmiger Zeichnung.',
      flowers: 'Weiße bis zartrosa, kugelige Köpfchen aus vielen Einzelblüten; verblühte Blüten hängen bräunlich herab.',
      growth: 'Kriechende, an den Knoten wurzelnde Stängel; Blätter und Blütenstiele stehen einzeln auf.',
      other: ['Bildet oft dichte, hellgrüne Nester im Rasen.'],
    },
    mowingNote: 'Nach dem Mähen fehlen die Blüten; die dreizähligen Blätter mit heller Zeichnung bleiben erkennbar.',
    bloom: [5, 9],
    filters: { bluete: ['weiss'], blattform: ['dreizaehlig'], blattrand: ['gezaehnt'], wuchs: ['kriechend'] },
    lookalikes: [
      { id: 'rotklee', name: 'Rotklee', difference: 'Rosarote Köpfchen direkt über zwei Blättern, Teilblättchen länglicher, Wuchs nicht kriechend.' },
      { id: 'horn-sauerklee', name: 'Horn-Sauerklee', difference: 'Teilblättchen herzförmig mit Einkerbung, oft rötlich, gelbe fünfzählige Einzelblüten.' },
      { name: 'Hopfenklee und Kleiner Klee', difference: 'Kleine gelbe Köpfchen; ohne Blüten schwer zu unterscheiden.', photoLimit: true },
    ],
    care: {
      assessment: 'Weißklee ist trittfest, bleibt bei Trockenheit lange grün und ist eine wichtige Nahrungsquelle für Bienen. Über Knöllchenbakterien bindet er Stickstoff.',
      keep: 'Viele Gärten lassen Weißklee bewusst stehen oder säen ihn sogar in Rasenmischungen ein.',
      mechanical: ['Kriechende Triebe mit einem Rechen anheben und herausziehen.', 'Einzelne Nester von Hand entfernen.'],
      prevention: ['Lücken nachsäen.', 'Nicht zu tief mähen, damit die Gräser konkurrenzfähig bleiben.'],
      limits: ['Lässt sich mechanisch meist nur zurückdrängen.', 'Blühender Klee kann Bienen anziehen – barfuß laufende Kinder beachten.'],
    },
    site: `Häufig auf Flächen mit lückiger Grasnarbe. Klee wird oft mit stickstoffarmen Bedingungen in Verbindung gebracht. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'rotklee', synonyms: ['Wiesen-Klee', 'Trifolium pratense'], category: 'kraut',
    short: 'Klee mit rosaroten Blütenköpfchen und länglichen Teilblättchen, wächst eher aufrecht als kriechend.',
    features: {
      leaves: 'Dreizählig, Teilblättchen elliptisch bis eiförmig, meist ganzrandig, oft mit hellem Fleck. Nebenblätter mit borstiger Spitze.',
      flowers: 'Rosarote bis purpurne Köpfchen, die meist direkt über einem Paar Blätter sitzen.',
      growth: 'Aufrecht bis aufsteigend, keine wurzelnden Ausläufer; im häufig gemähten Rasen niedrig.',
      other: ['Pflanze oft leicht behaart.'],
    },
    mowingNote: 'Im kurz gemähten Rasen kommt Rotklee selten zur Blüte; dann helfen Blattform und fehlende Ausläufer.',
    bloom: [5, 9],
    filters: { bluete: ['rosa-rot'], blattform: ['dreizaehlig'], blattrand: ['ganzrandig'], wuchs: ['aufrecht'] },
    lookalikes: [
      { id: 'weissklee', name: 'Weißklee', difference: 'Weiße Köpfchen auf langen, einzelnen Stielen, kriechende wurzelnde Stängel.' },
      { name: 'Mittlerer Klee', difference: 'Ähnliche Blütenfarbe, Nebenblätter ohne borstige Spitze; Unterscheidung braucht genaue Ansicht.', photoLimit: true },
    ],
    care: {
      assessment: 'Rotklee ist eine verbreitete Wiesenpflanze und wird stark von Hummeln besucht. Im häufig gemähten Rasen hält er sich meist nur vereinzelt.',
      keep: 'In wenig gemähten Bereichen oder Blühstreifen eine wertvolle Pflanze.',
      mechanical: ['Einzelne Pflanzen mit Wurzel ausstechen.'],
      prevention: ['Regelmäßiges Mähen und eine dichte Grasnarbe lassen ihm wenig Raum.'],
      limits: ['Die Pfahlwurzel kann bei unvollständigem Entfernen wieder austreiben.'],
    },
    site: `Typische Wiesenpflanze, im Rasen oft an weniger häufig gemähten Stellen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'gaensebluemchen', synonyms: ['Maßliebchen', 'Tausendschön'], category: 'kraut',
    short: 'Kleine Rosettenpflanze mit spatelförmigen Blättern und weißen Blütenköpfchen mit gelber Mitte.',
    features: {
      leaves: 'In einer flachen Rosette, spatelförmig (vorn breit, zum Grund verschmälert), vorn schwach gekerbt.',
      flowers: 'Einzelne Köpfchen auf blattlosen Stielen: weiße, oft rötlich überlaufene Zungenblüten um eine gelbe Mitte.',
      growth: 'Flache Rosetten, die durch kurze Seitentriebe kleine Gruppen bilden.',
      other: ['Blüht fast das ganze Jahr, mit Schwerpunkt im Frühjahr.', 'Köpfchen schließen sich nachts und bei Regen.'],
    },
    mowingNote: 'Die Rosetten liegen unter der Schnitthöhe und bleiben nach dem Mähen erhalten; Blüten erscheinen schnell wieder.',
    bloom: [3, 11],
    filters: { bluete: ['weiss'], blattform: ['spatelfoermig'], blattrand: ['gekerbt'], wuchs: ['rosette'] },
    lookalikes: [
      { name: 'Kamillen-Arten', difference: 'Fein zerteilte, fiederartige Blätter und beblätterte, verzweigte Stängel.' },
      { id: 'breitwegerich', name: 'Breitwegerich (ohne Blüte)', difference: 'Blätter breit-eiförmig mit deutlichen, parallelen Längsnerven, deutlich größer.' },
    ],
    care: {
      assessment: 'Das Gänseblümchen ist eine niedrige, mähverträgliche Pflanze, die früh im Jahr Insekten Nahrung bietet. Es stört die Nutzung des Rasens kaum.',
      keep: 'In Freizeit- und Familienrasen wird es häufig bewusst belassen.',
      mechanical: ['Einzelne Rosetten mit einem Unkrautstecher samt Wurzeln ausstechen.', 'Bei größeren Beständen vertikutieren und nachsäen.'],
      prevention: ['Lücken schließen, nicht zu tief mähen.'],
      limits: ['Bei größeren Beständen ist vollständiges Entfernen sehr aufwendig.'],
    },
    site: `Häufig in kurz gemähten, regelmäßig betretenen Rasen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'loewenzahn', synonyms: ['Taraxacum officinale agg.', 'Taraxacum officinale', 'Kuhblume', 'Pusteblume'],
    groupNote: 'Der „Gewöhnliche Löwenzahn“ ist eine Artengruppe (Taraxacum sect. Ruderalia) mit vielen, nur von Spezialisten unterscheidbaren Kleinarten. Häufig wird dafür der Name Taraxacum officinale verwendet.',
    category: 'kraut',
    short: 'Rosettenpflanze mit tief gezähnten Blättern, einer großen gelben Blüte auf hohlem Stängel und weißem Milchsaft.',
    features: {
      leaves: 'In einer Rosette, länglich, unregelmäßig tief eingeschnitten mit rückwärts gerichteten Zähnen; meist kahl.',
      flowers: 'Je Stängel genau ein gelbes Köpfchen aus Zungenblüten; danach kugeliger Samenstand („Pusteblume“).',
      growth: 'Flache bis aufrechte Rosette mit kräftiger, tief reichender Pfahlwurzel.',
      other: ['Blütenstängel hohl, blattlos und unverzweigt.', 'Weißer Milchsaft in Blättern und Stängeln.'],
    },
    mowingNote: 'Nach dem Mähen bleibt die Rosette; neue Blütenstängel wachsen oft innerhalb weniger Tage nach.',
    bloom: [4, 10],
    filters: { bluete: ['gelb'], blattform: ['laenglich'], blattrand: ['tief-eingeschnitten', 'gezaehnt'], wuchs: ['rosette'] },
    lookalikes: [
      { name: 'Gewöhnliches Ferkelkraut', difference: 'Blätter deutlich behaart, Stängel verzweigt, nicht hohl, mit kleinen Schuppenblättchen.' },
      { name: 'Herbst-Löwenzahn', difference: 'Stängel oft verzweigt und nicht hohl, Hauptblüte im Spätsommer und Herbst.', photoLimit: true },
      { name: 'Pippau-Arten', difference: 'Verzweigte, beblätterte Stängel mit mehreren Köpfchen.' },
    ],
    care: {
      assessment: 'Löwenzahn ist eine wichtige frühe Bienenweide. Im Rasen fällt er vor allem durch Blüte und Samenstände auf.',
      keep: 'Einzelne Pflanzen am Rand oder in Wildblumenbereichen können bleiben.',
      mechanical: ['Mit einem Unkrautstecher senkrecht neben der Pflanze einstechen und die Pfahlwurzel möglichst vollständig heraushebeln – bei feuchtem Boden leichter.', 'Blüten vor der Samenreife entfernen.'],
      prevention: ['Entstandene Löcher mit Erde füllen und nachsäen.'],
      limits: ['Verbleibende Wurzelstücke treiben wieder aus.', 'Samen fliegen aus der Umgebung zu.'],
    },
    site: `Wächst auf sehr unterschiedlichen Böden. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'breitwegerich', synonyms: ['Großer Wegerich', 'Plantago major subsp. major'], category: 'kraut',
    short: 'Flache Rosette aus breit-eiförmigen Blättern mit deutlichen Längsnerven; unscheinbare Blütenähren.',
    features: {
      leaves: 'Breit-eiförmig, plötzlich in einen Stiel verschmälert, mit drei bis neun bogigen Längsnerven, die beim Abreißen als Fäden herausstehen.',
      flowers: 'Lange, schmale, walzenförmige Ähren mit unscheinbaren grünlich-bräunlichen Blüten.',
      growth: 'Dicht am Boden anliegende Rosette, sehr trittfest.',
      other: ['Typisch an Wegen und stark betretenen Stellen.'],
    },
    mowingNote: 'Die Rosette liegt flach und bleibt nach dem Mähen vollständig erhalten.',
    bloom: [6, 10],
    filters: { bluete: ['unscheinbar'], blattform: ['eifoermig'], blattrand: ['ganzrandig'], wuchs: ['rosette'] },
    lookalikes: [
      { id: 'spitzwegerich', name: 'Spitzwegerich', difference: 'Schmale, lanzettliche Blätter, kurze Blütenähre auf langem, gefurchtem Stiel.' },
      { name: 'Mittlerer Wegerich', difference: 'Blätter behaart, allmählich in den Stiel verschmälert, Blüten duftend mit lila Staubfäden.', photoLimit: true },
    ],
    care: {
      assessment: 'Breitwegerich verträgt Tritt besser als die meisten Gräser und füllt Lücken an stark belasteten Stellen.',
      keep: 'An Wegen und Spielflächen oft die robusteste Begrünung.',
      mechanical: ['Mit dem Unkrautstecher samt Wurzel ausstechen.'],
      prevention: ['Belastung verteilen, Trittplatten oder Wege anlegen.', 'Bei bestätigter Verdichtung aerifizieren und nachsäen.'],
      limits: ['An dauerhaft stark betretenen Stellen kehrt er häufig zurück.'],
    },
    site: `Häufig an stark betretenen, oft verdichteten Stellen. Ob eine Verdichtung vorliegt, zeigt erst eine Untersuchung (z. B. Spatenprobe). ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'spitzwegerich', synonyms: ['Lanzett-Wegerich'], category: 'kraut',
    short: 'Rosette aus schmalen, lanzettlichen Blättern mit Längsnerven und kurzen, dunklen Blütenähren auf langen Stielen.',
    features: {
      leaves: 'Schmal-lanzettlich, mit drei bis sieben parallelen Längsnerven, ganzrandig oder entfernt gezähnt.',
      flowers: 'Kurze, eiförmige, braune Ähren mit auffälligen weißlichen Staubbeuteln auf langem, gefurchtem Stängel.',
      growth: 'Aufrechte bis flache Rosette.',
      other: ['Blätter im Rasen oft flacher und kürzer als in Wiesen.'],
    },
    mowingNote: 'Nach dem Mähen fehlen die Ähren; die Längsnerven der schmalen Blätter bleiben ein gutes Merkmal.',
    bloom: [5, 9],
    filters: { bluete: ['unscheinbar'], blattform: ['lanzettlich'], blattrand: ['ganzrandig'], wuchs: ['rosette'] },
    lookalikes: [
      { id: 'breitwegerich', name: 'Breitwegerich', difference: 'Blätter breit-eiförmig, lange schmale Ähre.' },
      { name: 'Junge Gräser', difference: 'Gräser haben keine Rosette mit parallel genervten, flachen Blattspreiten aus einem Punkt; ohne Blüte genau hinsehen.', photoLimit: true },
    ],
    care: {
      assessment: 'Verbreitete Wiesenpflanze, im Rasen meist vereinzelt.',
      keep: 'Kann in naturnahen Rasen belassen werden.',
      mechanical: ['Mit dem Unkrautstecher samt Wurzel ausstechen.'],
      prevention: ['Dichte Grasnarbe, Lücken nachsäen.'],
      limits: ['Samen bleiben einige Jahre keimfähig.'],
    },
    site: `Häufig in Wiesen und extensiv gepflegten Rasen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'kriechender-hahnenfuss', synonyms: [], category: 'kraut',
    short: 'Hahnenfuß mit dreiteiligen Blättern, gelben, glänzenden Blüten und langen, wurzelnden Ausläufern.',
    features: {
      leaves: 'Dreiteilig, der mittlere Abschnitt deutlich gestielt; Abschnitte gelappt und gezähnt, oft hell gefleckt.',
      flowers: 'Gelbe, glänzende Schalenblüten mit fünf Kronblättern; Kelchblätter anliegend; Blütenstiele gefurcht.',
      growth: 'Lange oberirdische Ausläufer, die an den Knoten wurzeln und neue Rosetten bilden.',
      other: ['Bildet schnell zusammenhängende Teppiche.'],
    },
    mowingNote: 'Nach dem Mähen zeigen die Ausläufer und der gestielte Mittelabschnitt des Blattes die Art.',
    bloom: [5, 8],
    filters: { bluete: ['gelb'], blattform: ['handfoermig-geteilt'], blattrand: ['tief-eingeschnitten', 'gezaehnt'], wuchs: ['kriechend'] },
    lookalikes: [
      { id: 'scharfer-hahnenfuss', name: 'Scharfer Hahnenfuß', difference: 'Keine Ausläufer, aufrechter Wuchs, mittlerer Blattabschnitt nicht gestielt, Blütenstiele rund.' },
      { id: 'kriechendes-fingerkraut', name: 'Kriechendes Fingerkraut', difference: 'Blätter fünfzählig gefingert, Blüten matt gelb, nicht glänzend.' },
    ],
    care: {
      assessment: 'Breitet sich über Ausläufer rasch aus und kann Rasengräser lokal verdrängen.',
      keep: 'In feuchten, wenig genutzten Ecken kann er als Bodendecker bleiben.',
      mechanical: ['Ausläufer mit einem Rechen anheben und samt Wurzeln herausziehen.', 'Rosetten mit dem Unkrautstecher ausstechen.'],
      prevention: ['Lücken nachsäen, Grasnarbe stärken.'],
      limits: ['Bleibende Ausläuferstücke wachsen wieder an.'],
    },
    safety: 'Enthält wie andere Hahnenfuß-Arten im frischen Zustand Reizstoffe; nicht verzehren und von Weidetieren fernhalten.',
    site: `Häufig an frischen bis feuchten Stellen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'scharfer-hahnenfuss', synonyms: ['Butterblume'], category: 'kraut',
    short: 'Aufrecht wachsender Hahnenfuß mit tief handförmig geteilten Blättern und glänzend gelben Blüten.',
    features: {
      leaves: 'Grundblätter handförmig drei- bis siebenteilig, Abschnitte tief eingeschnitten; mittlerer Abschnitt nicht gestielt.',
      flowers: 'Gelbe, glänzende Blüten mit fünf Kronblättern, Kelchblätter anliegend, Blütenstiele rund (nicht gefurcht).',
      growth: 'Grundständige Blätter, daraus verzweigte, aufrechte Stängel; keine Ausläufer.',
      other: [],
    },
    mowingNote: 'Im häufig gemähten Rasen bleiben oft nur die Grundblätter; ohne Blüte ist die Abgrenzung zu anderen Hahnenfuß-Arten schwierig.',
    bloom: [5, 9],
    filters: { bluete: ['gelb'], blattform: ['handfoermig-geteilt'], blattrand: ['tief-eingeschnitten', 'gezaehnt'], wuchs: ['aufrecht', 'rosette'] },
    lookalikes: [
      { id: 'kriechender-hahnenfuss', name: 'Kriechender Hahnenfuß', difference: 'Mit wurzelnden Ausläufern, mittlerer Blattabschnitt gestielt, Blütenstiele gefurcht.', photoLimit: true },
      { name: 'Knolliger Hahnenfuß', difference: 'Kelchblätter zur Blüte zurückgeschlagen, Stängelgrund knollig verdickt.' },
    ],
    care: {
      assessment: 'Wiesenpflanze, die sich im regelmäßig gemähten Rasen meist nur vereinzelt hält.',
      keep: 'In Blumenwiesen und selten gemähten Bereichen eine typische Art.',
      mechanical: ['Einzelpflanzen samt Wurzelstock ausstechen.'],
      prevention: ['Regelmäßiges Mähen, dichte Grasnarbe.'],
      limits: [],
    },
    safety: 'Frisch giftig (Protoanemonin, reizt Haut und Schleimhäute). Nicht verzehren; Kinder und Haustiere beachten.',
    site: `Typische Art frischer Wiesen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'vogelmiere', synonyms: ['Stellaria media agg.', 'Hühnerdarm', 'Vogel-Sternmiere'],
    groupNote: 'Unter „Vogelmiere“ werden mehrere nah verwandte, schwer unterscheidbare Sippen zusammengefasst (Artengruppe).',
    category: 'kraut',
    short: 'Zarte, niederliegende Pflanze mit kleinen, eiförmigen, gegenständigen Blättern und kleinen weißen Sternblüten.',
    features: {
      leaves: 'Gegenständig, klein, eiförmig zugespitzt, ganzrandig; untere gestielt, obere sitzend.',
      flowers: 'Klein, weiß, fünf tief zweigeteilte Kronblätter – wirken wie zehn.',
      growth: 'Niederliegend bis aufsteigend, stark verzweigt, oft lockere Polster.',
      other: ['Stängel mit einer einzelnen Haarlinie, die von Knoten zu Knoten die Seite wechselt.', 'Kann fast ganzjährig keimen und blühen.'],
    },
    mowingNote: 'Wächst oft unter der Schnitthöhe weiter und blüht auch im kurzen Rasen.',
    bloom: [1, 12],
    filters: { bluete: ['weiss'], blattform: ['eifoermig'], blattrand: ['ganzrandig'], wuchs: ['niederliegend'] },
    lookalikes: [
      { id: 'quendel-ehrenpreis', name: 'Quendel-Ehrenpreis', difference: 'Blüten mit vier ungeteilten Kronblättern, weiß bis hellblau gestreift.' },
      { name: 'Gewöhnliches Hornkraut', difference: 'Ganze Pflanze dicht behaart, Blätter matter, Kronblätter nur an der Spitze eingekerbt.', photoLimit: true },
    ],
    care: {
      assessment: 'Kurzlebige Pflanze, die vor allem in Lücken und frisch gesäten Flächen auftritt. In einer dichten Grasnarbe hat sie wenig Chancen.',
      keep: 'Verschwindet in dichtem Rasen oft von selbst.',
      mechanical: ['Lässt sich leicht von Hand ausreißen oder ausrechen.', 'Vor der Samenbildung entfernen.'],
      prevention: ['Lücken schließen; frische Ansaaten regelmäßig mähen, sobald der Rasen schnittreif ist.'],
      limits: ['Sehr viele Samen im Boden; neue Keimlinge sind zu erwarten.'],
    },
    site: `Häufig auf offenem, lockerem Boden und in Neuansaaten. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'braunelle', synonyms: ['Kleine Braunelle', 'Prunelle'], category: 'kraut',
    short: 'Niedriger Lippenblütler mit eiförmigen, gegenständigen Blättern und blauvioletten Blüten in dichten Köpfchen.',
    features: {
      leaves: 'Gegenständig, eiförmig bis länglich, gestielt, ganzrandig oder undeutlich gezähnt.',
      flowers: 'Blauviolette Lippenblüten in dichten, walzenförmigen Köpfchen, direkt darunter ein Blattpaar; Kelche oft purpurn.',
      growth: 'Niederliegend bis aufsteigend mit oberirdischen Ausläufern; im Rasen oft flach.',
      other: ['Stängel vierkantig.', 'Kein auffälliger Geruch beim Zerreiben.'],
    },
    mowingNote: 'Blüht auch im kurzen Rasen dicht über dem Boden; ohne Blüte an den gegenständigen Blättern und dem vierkantigen Stängel erkennbar.',
    bloom: [6, 9],
    filters: { bluete: ['blau-violett'], blattform: ['eifoermig'], blattrand: ['ganzrandig', 'gezaehnt'], wuchs: ['kriechend', 'niederliegend'] },
    lookalikes: [
      { id: 'gundermann', name: 'Gundermann', difference: 'Blätter rundlich und grob gekerbt, Blüten einzeln in Blattachseln, würziger Geruch.' },
      { name: 'Kriechender Günsel', difference: 'Blüten in lockeren Ähren mit Blättern dazwischen, glänzende Grundblätter.', photoLimit: true },
    ],
    care: {
      assessment: 'Mähverträglich und bei Insekten beliebt. Bildet kleine Teppiche, stört die Nutzung meist wenig.',
      keep: 'In naturnahen Rasen häufig toleriert.',
      mechanical: ['Ausläufer herausziehen, Pflanzen mit Wurzeln ausstechen.'],
      prevention: ['Grasnarbe dicht halten, Lücken nachsäen.'],
      limits: [],
    },
    site: `Häufig in Rasen und Wiesen unterschiedlichster Standorte. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'kriechendes-fingerkraut', synonyms: [], category: 'kraut',
    short: 'Kriechende Pflanze mit fünfzählig gefingerten, gezähnten Blättern und einzelnen gelben Blüten.',
    features: {
      leaves: 'Gefingert mit meist fünf (selten sieben) länglichen, gezähnten Teilblättchen an einem langen Stiel.',
      flowers: 'Einzelne gelbe Blüten mit fünf Kronblättern auf langen Stielen aus den Blattachseln.',
      growth: 'Lange, an den Knoten wurzelnde Ausläufer.',
      other: [],
    },
    mowingNote: 'Ohne Blüte an den fünfzähligen Blättern und den Ausläufern erkennbar.',
    bloom: [6, 9],
    filters: { bluete: ['gelb'], blattform: ['gefingert'], blattrand: ['gezaehnt'], wuchs: ['kriechend'] },
    lookalikes: [
      { id: 'kriechender-hahnenfuss', name: 'Kriechender Hahnenfuß', difference: 'Blätter dreiteilig mit gelappten Abschnitten, Blüten glänzend.' },
      { id: 'gaensefingerkraut', name: 'Gänsefingerkraut', difference: 'Blätter gefiedert mit vielen Teilblättchen, unterseits silbrig.' },
      { name: 'Erdbeere (Ausläufer)', difference: 'Blätter dreizählig, Blüten weiß.' },
    ],
    care: {
      assessment: 'Breitet sich über Ausläufer aus, bleibt im Rasen aber meist niedrig.',
      keep: 'An Rändern und in naturnahen Flächen tolerierbar.',
      mechanical: ['Ausläufer herausziehen, Wurzelstock ausstechen.'],
      prevention: ['Lücken schließen.'],
      limits: ['Reste der Ausläufer wachsen wieder an.'],
    },
    site: `Häufig an Rändern, Wegen und lückigen Stellen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'gaensefingerkraut', synonyms: ['Potentilla anserina', 'Silberkraut'],
    groupNote: 'In deutschsprachigen Floren oft als Potentilla anserina geführt; neuere Systematiken stellen die Art in die Gattung Argentina.',
    category: 'kraut',
    short: 'Rosettenpflanze mit gefiederten, unterseits silbrig behaarten Blättern, gelben Blüten und langen Ausläufern.',
    features: {
      leaves: 'Unterbrochen gefiedert mit vielen scharf gesägten Teilblättchen, unterseits (oft beidseitig) silbrig-seidig behaart.',
      flowers: 'Einzelne gelbe Blüten mit fünf Kronblättern auf langen Stielen.',
      growth: 'Grundblattrosetten mit langen, rötlichen, wurzelnden Ausläufern.',
      other: ['Der silbrige Schimmer der Blätter fällt schon von Weitem auf.'],
    },
    mowingNote: 'Die silbrigen, gefiederten Blätter sind auch nach dem Mähen gut erkennbar.',
    bloom: [5, 8],
    filters: { bluete: ['gelb'], blattform: ['gefiedert'], blattrand: ['gezaehnt'], wuchs: ['kriechend', 'rosette'] },
    lookalikes: [
      { id: 'kriechendes-fingerkraut', name: 'Kriechendes Fingerkraut', difference: 'Blätter gefingert mit fünf Teilblättchen, nicht silbrig.' },
      { name: 'Kleiner Wiesenknopf', difference: 'Ebenfalls gefiedert, aber Blättchen rundlich und nicht silbrig, Blüten in Köpfchen.' },
    ],
    care: {
      assessment: 'Trittverträglich und kriechend; tritt häufig an Wegen und stark beanspruchten Stellen auf.',
      keep: 'Als niedriger, trittfester Bewuchs an Wegrändern tolerierbar.',
      mechanical: ['Ausläufer herausziehen, Rosetten ausstechen.'],
      prevention: ['Belastung verteilen; bei bestätigter Verdichtung lockern und nachsäen.'],
      limits: [],
    },
    site: `Häufig an betretenen, zeitweise feuchten Stellen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'horn-sauerklee', synonyms: ['Gehörnter Sauerklee', 'Hornfrüchtiger Sauerklee'], category: 'kraut',
    short: 'Niedriger, kriechender Sauerklee mit herzförmigen, oft rötlichen Teilblättchen und kleinen gelben Blüten.',
    features: {
      leaves: 'Dreizählig, Teilblättchen verkehrt herzförmig mit Einkerbung an der Spitze, häufig rot- bis braunviolett.',
      flowers: 'Kleine gelbe Blüten mit fünf Kronblättern; danach aufrecht stehende, hornförmige Kapseln, die Samen wegschleudern.',
      growth: 'Niederliegende, an den Knoten wurzelnde Stängel.',
      other: ['Blättchen klappen bei Dunkelheit und starker Sonne zusammen.', 'Säuerlicher Geschmack (Oxalsäure).'],
    },
    mowingNote: 'Wächst meist unter der Schnitthöhe; die herzförmigen Blättchen bleiben erkennbar.',
    bloom: [5, 10],
    filters: { bluete: ['gelb'], blattform: ['dreizaehlig'], blattrand: ['ganzrandig'], wuchs: ['kriechend', 'niederliegend'] },
    lookalikes: [
      { id: 'weissklee', name: 'Weißklee', difference: 'Teilblättchen rundlich ohne Einkerbung, weiße Köpfchen.' },
      { name: 'Aufrechter Sauerklee', difference: 'Wuchs aufrecht, keine wurzelnden Stängel, Blätter meist grün.', photoLimit: true },
    ],
    care: {
      assessment: 'Kommt häufig in Fugen, Beeten und lückigem Rasen vor und verbreitet sich über weggeschleuderte Samen.',
      keep: 'Einzelpflanzen stören im Rasen meist wenig.',
      mechanical: ['Vorsichtig samt Wurzel herausziehen, bevor sich Kapseln bilden.'],
      prevention: ['Lücken nachsäen; mit Gartenerde und Topfpflanzen wird er oft eingeschleppt.'],
      limits: ['Abgerissene Stängelteile und Samen sorgen für Nachwuchs.'],
    },
    safety: 'Enthält Oxalsäure; nicht in größeren Mengen verzehren.',
    site: `Häufig an warmen, lückigen Stellen und in Pflasterfugen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'kleiner-sauerampfer', synonyms: ['Rumex acetosella agg.', 'Feld-Sauerampfer'],
    groupNote: 'Umfasst mehrere eng verwandte Sippen, die im Gelände meist zusammengefasst werden.',
    category: 'kraut',
    short: 'Schlanke Pflanze mit spießförmigen Blättern, säuerlichem Geschmack und unscheinbaren rötlichen Blütenständen.',
    features: {
      leaves: 'Schmal, mit zwei seitlich abstehenden Spießecken am Grund, ganzrandig.',
      flowers: 'Kleine, rötliche bis grünliche Blüten in lockeren, rispigen Ständen; Pflanzen getrenntgeschlechtig.',
      growth: 'Grundblattrosette mit aufrechten Stängeln; breitet sich über unterirdische Ausläufer aus.',
      other: ['Säuerlicher Geschmack durch Oxalsäure.', 'Färbt sich oft rötlich.'],
    },
    mowingNote: 'Nach dem Mähen bleiben die spießförmigen Grundblätter das wichtigste Merkmal.',
    bloom: [5, 8],
    filters: { bluete: ['unscheinbar', 'rosa-rot'], blattform: ['spiessfoermig'], blattrand: ['ganzrandig'], wuchs: ['rosette', 'aufrecht'] },
    lookalikes: [
      { name: 'Wiesen-Sauerampfer', difference: 'Größer, Blattgrund pfeilförmig mit nach hinten gerichteten Zipfeln.' },
    ],
    care: {
      assessment: 'Breitet sich über Wurzelausläufer aus; tritt vor allem in lückigem, schwachwüchsigem Rasen auf.',
      keep: 'Einzelne Pflanzen sind unauffällig.',
      mechanical: ['Ausstechen und möglichst viele Wurzelausläufer mitnehmen.'],
      prevention: ['Grasnarbe stärken, Lücken nachsäen.'],
      limits: ['Wurzelreste treiben wieder aus.'],
    },
    site: `Wird oft mit sandigen, sauren Böden in Verbindung gebracht. Ob das auf deine Fläche zutrifft, zeigt nur eine Messung. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'quendel-ehrenpreis', synonyms: ['Thymianblättriger Ehrenpreis'], category: 'kraut',
    short: 'Sehr niedriger Ehrenpreis mit kleinen, glänzenden, eiförmigen Blättern und weißlichen, blau geäderten Blüten in Trauben.',
    features: {
      leaves: 'Gegenständig, klein, eiförmig bis elliptisch, kahl und etwas glänzend, ganzrandig oder schwach gekerbt.',
      flowers: 'Weiß bis hellblau mit dunkleren Streifen, vier Kronblätter, in aufrechten, lockeren Trauben an den Triebspitzen.',
      growth: 'Niederliegend bis kriechend, an den Knoten wurzelnd; Blütentriebe aufsteigend.',
      other: [],
    },
    mowingNote: 'Unauffällig und ohne Blüte leicht zu übersehen.',
    bloom: [4, 9],
    filters: { bluete: ['weiss', 'blau-violett'], blattform: ['eifoermig'], blattrand: ['ganzrandig', 'gekerbt'], wuchs: ['kriechend', 'niederliegend'] },
    lookalikes: [
      { id: 'faden-ehrenpreis', name: 'Faden-Ehrenpreis', difference: 'Blüten einzeln an langen, fadenförmigen Stielen, hellblau; Blätter rundlich-nierenförmig, gekerbt.' },
      { id: 'vogelmiere', name: 'Vogelmiere', difference: 'Blüten mit fünf tief geteilten weißen Kronblättern, Stängel mit Haarlinie.' },
    ],
    care: {
      assessment: 'Kleine, unauffällige Pflanze feuchterer Rasenbereiche.',
      keep: 'Stört die Nutzung kaum.',
      mechanical: ['Ausrechen oder vertikutieren und nachsäen.'],
      prevention: ['Dichte Grasnarbe.'],
      limits: [],
    },
    site: `Häufig in feuchten, kurz gemähten Rasen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'faden-ehrenpreis', synonyms: [], category: 'kraut',
    short: 'Kriechender Ehrenpreis mit kleinen, rundlichen, gekerbten Blättern und hellblauen Blüten auf langen, fadendünnen Stielen.',
    features: {
      leaves: 'Klein, rundlich bis nierenförmig, gekerbt, kurz gestielt, meist gegenständig.',
      flowers: 'Hellblau mit dunkleren Adern, vier Kronblätter, einzeln auf langen, fadenförmigen Stielen.',
      growth: 'Dichte, kriechende Matten aus dünnen, wurzelnden Stängeln.',
      other: ['Ursprünglich aus Kleinasien und dem Kaukasus, in Mitteleuropa eingebürgert.', 'Bildet in Mitteleuropa kaum Samen; verbreitet sich über Stängelstücke, etwa beim Mähen.'],
    },
    mowingNote: 'Mähen zerkleinert die Triebe und kann zur Ausbreitung beitragen. Schnittgut aus befallenen Bereichen besser aufnehmen.',
    bloom: [4, 6],
    filters: { bluete: ['blau-violett'], blattform: ['rundlich'], blattrand: ['gekerbt'], wuchs: ['kriechend'] },
    lookalikes: [
      { id: 'gundermann', name: 'Gundermann', difference: 'Größere Blätter, vierkantige Stängel, Lippenblüten in Blattachseln, würziger Geruch.' },
      { id: 'quendel-ehrenpreis', name: 'Quendel-Ehrenpreis', difference: 'Blüten in Trauben, weißlich; Blätter eiförmig, glänzend.' },
      { name: 'Persischer Ehrenpreis', difference: 'Einjährig, Blüten größer mit weißem unteren Kronblatt, Blätter länger gestielt.', photoLimit: true },
    ],
    care: {
      assessment: 'Kann in feuchten Rasen dichte Matten bilden und ist mechanisch schwer zu entfernen.',
      keep: 'Die hellblaue Frühjahrsblüte wird von manchen Gärtnern geschätzt.',
      mechanical: ['Matten ausrechen oder vertikutieren, Reste vollständig aufsammeln.', 'Schnittgut aus befallenen Bereichen nicht im Rasen liegen lassen.'],
      prevention: ['Rasenmäher nach dem Mähen befallener Stellen reinigen.'],
      limits: ['Selbst kleine Stängelstücke wachsen wieder an; vollständige Entfernung ist selten.'],
    },
    site: `Häufig in feuchten, schattigen Rasen. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'fingerhirse', synonyms: ['Blut-Fingerhirse', 'Bluthirse'], category: 'gras',
    short: 'Einjähriges, hellgrünes, eher breitblättriges Gras mit fingerartig angeordneten Blütenähren; keimt erst bei warmem Boden.',
    features: {
      leaves: 'Hellgrün, breiter als die meisten Rasengräser, weich, oft behaart; Blatthäutchen vorhanden.',
      flowers: 'Drei bis zehn schmale Ähren, die fingerartig von der Stängelspitze abgehen.',
      growth: 'Niederliegend bis aufsteigend, oft rötliche Stängel, die an den Knoten wurzeln; bildet flache Horste.',
      other: ['Keimt etwa ab Mai/Juni in Lücken.', 'Stirbt mit dem ersten Frost ab und hinterlässt braune Stellen.'],
    },
    mowingNote: 'Ohne Blütenstand schwer von anderen Gräsern zu unterscheiden; Farbe und Blattbreite helfen.',
    bloom: [7, 10],
    filters: { bluete: ['unscheinbar'], blattform: ['grasartig'], blattrand: ['ganzrandig'], wuchs: ['niederliegend', 'horstig'] },
    lookalikes: [
      { id: 'huehnerhirse', name: 'Hühnerhirse', difference: 'Kein Blatthäutchen, Blütenstand eine dichte Rispe statt fingerförmiger Ähren.' },
      { name: 'Glatte Fingerhirse', difference: 'Sehr ähnlich, weitgehend kahl und meist kleiner.', photoLimit: true },
    ],
    care: {
      assessment: 'Wärmeliebendes Ungras, das in Sommern mit lückigem Rasen auffällt.',
      keep: 'Verschwindet mit dem Frost; im Folgejahr entscheidet die Dichte der Grasnarbe.',
      mechanical: ['Einzelpflanzen vor der Samenbildung samt Wurzel herausziehen.'],
      prevention: ['Lücken im Spätsommer nachsäen.', 'Nicht zu tief mähen.'],
      limits: ['Samen bleiben mehrere Jahre im Boden keimfähig.'],
    },
    site: `Profitiert vor allem von Lücken und Wärme. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'huehnerhirse', synonyms: ['Gewöhnliche Hühnerhirse', 'Hahnenkamm-Hirse'], category: 'gras',
    short: 'Kräftiges einjähriges Gras ohne Blatthäutchen mit dichter, oft rötlicher Rispe.',
    features: {
      leaves: 'Breit, flach, kahl, mit deutlich heller Mittelrippe; am Übergang zur Blattscheide kein Blatthäutchen.',
      flowers: 'Dichte, aufrechte bis überhängende Rispe aus kurzen Ästen, oft grannig und rötlich-violett.',
      growth: 'Horstig, aufrecht bis ausgebreitet; im Rasen niedriger.',
      other: ['Das fehlende Blatthäutchen ist das wichtigste Merkmal ohne Blüte.', 'Keimt bei warmem Boden ab Spätfrühling.'],
    },
    mowingNote: 'Regelmäßiges Mähen verhindert meist die Blüte; dann hilft das fehlende Blatthäutchen.',
    bloom: [7, 10],
    filters: { bluete: ['unscheinbar'], blattform: ['grasartig'], blattrand: ['ganzrandig'], wuchs: ['horstig', 'aufrecht'] },
    lookalikes: [
      { id: 'fingerhirse', name: 'Blutrote Fingerhirse', difference: 'Mit Blatthäutchen, fingerförmige Ähren, oft behaarte Blätter.' },
      { id: 'einjaehriges-rispengras', name: 'Einjähriges Rispengras', difference: 'Viel feiner, hellgrün, mit Blatthäutchen, kleine lockere Rispen.' },
    ],
    care: {
      assessment: 'Typisch in neu angelegten Rasen und auf offenem Boden; in regelmäßig gemähtem, dichtem Rasen hält sie sich selten.',
      keep: 'Stirbt im Herbst ab.',
      mechanical: ['Herausziehen, solange die Pflanzen jung sind.', 'Bei Neuansaat regelmäßig mähen.'],
      prevention: ['Rasen dicht etablieren, Lücken vermeiden.'],
      limits: ['Samen aus dem Boden keimen in den Folgejahren nach.'],
    },
    site: `Häufig auf offenem, nährstoffreichem Boden und in Neuansaaten. ${SITE_CAVEAT}`,
  },
  {
    ...DRAFT, id: 'einjaehriges-rispengras', synonyms: ['Jährige Rispe', 'Poa annua'], category: 'gras',
    short: 'Niedriges, hellgrünes Gras mit weichen Blättern und kleinen, lockeren Rispen, das fast ganzjährig blüht.',
    features: {
      leaves: 'Weich, hellgrün, an der Spitze kahnförmig zusammengezogen; oft quer gewellt; Blatthäutchen deutlich, weißlich.',
      flowers: 'Kleine, lockere, dreieckige Rispen, auch dicht über dem Boden.',
      growth: 'Lockere Horste, im Rasen oft fleckenartig hellere Stellen.',
      other: ['Blüht auch im kurz gemähten Rasen.', 'Trotz des Namens auch kurzlebig ausdauernd.'],
    },
    mowingNote: 'Bildet selbst unter der Schnitthöhe Blütenstände; die hellen Flecken fallen im Rasen auf.',
    bloom: [1, 12],
    filters: { bluete: ['unscheinbar'], blattform: ['grasartig'], blattrand: ['ganzrandig'], wuchs: ['horstig'] },
    lookalikes: [
      { name: 'Wiesen-Rispengras (Rasengras)', difference: 'Dunkleres Grün, unterirdische Ausläufer, Blüte nur im Frühsommer; ohne Blüte schwer zu unterscheiden.', photoLimit: true },
      { id: 'huehnerhirse', name: 'Hühnerhirse', difference: 'Viel kräftiger, ohne Blatthäutchen.' },
    ],
    care: {
      assessment: 'Ein sehr verbreitetes Gras, das in vielen Rasen Bestandteil der Narbe ist. Es fällt durch hellere Farbe und Blütenstände auf und ist empfindlich gegen Trockenheit.',
      keep: 'Für die meisten Hausgärten unproblematisch.',
      mechanical: ['Gezieltes Entfernen ist kaum möglich; einzelne Horste lassen sich ausstechen.'],
      prevention: ['Dichte Narbe aus ausdauernden Rasengräsern, Lücken rasch schließen.'],
      limits: ['Bildet sehr viele Samen; vollständig zurückdrängen lässt es sich meist nicht.'],
    },
    site: `Häufig an betretenen Stellen und in Lücken. ${SITE_CAVEAT}`,
  },
];

// ---------- Verknüpfung mit Stammdaten ----------

export const TAXA: Taxon[] = (taxaFile as { taxa: Taxon[] }).taxa;

export interface LexiconEntry extends LexiconPlant { taxon: Taxon }

export const ENTRIES: LexiconEntry[] = LEXICON.map((p) => {
  const taxon = TAXA.find((t) => t.id === p.id);
  if (!taxon) throw new Error(`Stammdaten fehlen für ${p.id}`);
  return { ...p, taxon };
});

export function getEntry(id: string | null | undefined): LexiconEntry | undefined {
  return ENTRIES.find((e) => e.id === id);
}
