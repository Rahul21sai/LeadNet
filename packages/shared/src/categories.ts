import type { Category, DepartmentId, Hazard } from './enums.ts';

export interface CategoryMeta {
  id: Category;
  en: string;
  kn: string;
  department: DepartmentId;
  /** Hours from acknowledgement-clock start to the resolution deadline. */
  slaResolveHours: number;
  /** Base risk weight used by the priority formula (0..1). */
  baseRisk: number;
  /** Lucide icon name rendered by the web app. */
  icon: string;
}

/**
 * Category → department / SLA / risk. These SLAs are LeadNet *demo targets*,
 * modelled loosely on published municipal norms; the methodology page says so.
 */
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  pothole: { id: 'pothole', en: 'Pothole / road damage', kn: 'ರಸ್ತೆ ಗುಂಡಿ', department: 'roads', slaResolveHours: 72, baseRisk: 0.8, icon: 'construction' },
  garbage: { id: 'garbage', en: 'Garbage / black spot', kn: 'ಕಸದ ರಾಶಿ', department: 'swm', slaResolveHours: 24, baseRisk: 0.5, icon: 'trash-2' },
  drainage: { id: 'drainage', en: 'Drain / sewage overflow', kn: 'ಚರಂಡಿ ಉಕ್ಕುವಿಕೆ', department: 'storm_water', slaResolveHours: 48, baseRisk: 0.7, icon: 'waves' },
  streetlight: { id: 'streetlight', en: 'Streetlight out', kn: 'ಬೀದಿದೀಪ ಕೆಟ್ಟಿದೆ', department: 'electrical', slaResolveHours: 48, baseRisk: 0.55, icon: 'lamp' },
  water: { id: 'water', en: 'Water supply / leak', kn: 'ನೀರು ಸೋರಿಕೆ', department: 'water_supply', slaResolveHours: 48, baseRisk: 0.6, icon: 'droplet' },
  footpath: { id: 'footpath', en: 'Footpath / accessibility', kn: 'ಪಾದಚಾರಿ ಮಾರ್ಗ', department: 'roads', slaResolveHours: 120, baseRisk: 0.5, icon: 'footprints' },
  traffic: { id: 'traffic', en: 'Traffic signal / signage', kn: 'ಸಂಚಾರ ಸಂಕೇತ', department: 'traffic', slaResolveHours: 48, baseRisk: 0.65, icon: 'traffic-cone' },
  trees: { id: 'trees', en: 'Fallen tree / branch', kn: 'ಮರ ಬಿದ್ದಿದೆ', department: 'forest', slaResolveHours: 24, baseRisk: 0.7, icon: 'tree-deciduous' },
  other: { id: 'other', en: 'Other civic issue', kn: 'ಇತರೆ ನಾಗರಿಕ ಸಮಸ್ಯೆ', department: 'ward_office', slaResolveHours: 168, baseRisk: 0.3, icon: 'circle-help' },
};

/** Hours allowed between "reported" and "acknowledged" for every category. */
export const ACK_SLA_HOURS = 24;

export const HAZARD_META: Record<Hazard, { en: string; kn: string; weight: number }> = {
  traffic_risk: { en: 'Traffic risk', kn: 'ಸಂಚಾರ ಅಪಾಯ', weight: 0.15 },
  pedestrian_risk: { en: 'Pedestrian risk', kn: 'ಪಾದಚಾರಿ ಅಪಾಯ', weight: 0.15 },
  electrical: { en: 'Electrical hazard', kn: 'ವಿದ್ಯುತ್ ಅಪಾಯ', weight: 0.25 },
  flooding: { en: 'Flooding', kn: 'ಪ್ರವಾಹ', weight: 0.2 },
  health: { en: 'Health hazard', kn: 'ಆರೋಗ್ಯ ಅಪಾಯ', weight: 0.15 },
  night_visibility: { en: 'Unsafe at night', kn: 'ರಾತ್ರಿ ಅಸುರಕ್ಷಿತ', weight: 0.1 },
  accessibility: { en: 'Blocks accessibility', kn: 'ಅಂಗವಿಕಲರಿಗೆ ಅಡ್ಡಿ', weight: 0.1 },
  fire: { en: 'Fire risk', kn: 'ಬೆಂಕಿ ಅಪಾಯ', weight: 0.25 },
};

/** Radius (metres) within which open issues of the same category are dedupe candidates. */
export const DEDUPE_RADIUS_M = 150;
/** Max candidates handed to the AI adjudicator. */
export const DEDUPE_MAX_CANDIDATES = 5;
