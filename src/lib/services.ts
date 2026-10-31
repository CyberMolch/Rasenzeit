// Austauschbare Schnittstellen für spätere Erweiterungen.

import type { Plan, Region } from '../domain/types';

// ---------- Wetter ----------

export interface WeatherSnapshot {
  source: string;
  fetchedAt: string;
  precipitationLast7DaysMm: number | null;
  forecast: { date: string; minC: number; maxC: number; precipitationMm: number }[];
}

export interface WeatherProvider {
  id: string;
  name: string;
  available: boolean;
  getWeather(region: Region): Promise<WeatherSnapshot | null>;
}

/** Standard: keine Wetterquelle. Liefert bewusst keine Daten. */
export const noWeather: WeatherProvider = {
  id: 'none',
  name: 'Keine Wetterquelle angebunden',
  available: false,
  async getWeather() { return null; },
};

export const weatherProvider: WeatherProvider = noWeather;

// ---------- Funktionsumfang (vorbereitet für spätere Unterscheidung) ----------

export type Feature = 'mehrere_flaechen' | 'bestimmungshilfe' | 'export' | 'ics' | 'fotovergleich' | 'bodenprofil';

/** In Version 0.1 sind alle Funktionen in jedem Tarif frei verfügbar. */
const FEATURE_PLANS: Record<Feature, Plan[]> = {
  mehrere_flaechen: ['basis', 'plus'],
  bestimmungshilfe: ['basis', 'plus'],
  export: ['basis', 'plus'],
  ics: ['basis', 'plus'],
  fotovergleich: ['basis', 'plus'],
  bodenprofil: ['basis', 'plus'],
};

export function hasFeature(plan: Plan, f: Feature): boolean {
  return FEATURE_PLANS[f].includes(plan);
}

// ---------- Werbung / Partnerangebote (noch nicht aktiv) ----------

export interface AffiliateOffer {
  id: string;
  productName: string;
  partner: string;
  url: string;
  isAdvertisement: true; // muss als Werbung gekennzeichnet werden
}

/** Keine Partnerangebote hinterlegt. Fachliche Inhalte sind davon unabhängig. */
export const affiliateOffers: AffiliateOffer[] = [];
