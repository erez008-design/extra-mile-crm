// Fields that should be checked for "missing data" badge
export const ENRICHMENT_FIELDS = [
  'floor',
  'total_floors',
  'air_directions',
  'renovation_status',
  'build_year',
  'parking_spots',
  'has_elevator',
  'has_balcony',
  'has_safe_room',
] as const;

export type EnrichmentField = typeof ENRICHMENT_FIELDS[number];

export interface PropertyEnrichmentStatus {
  isComplete: boolean;
  missingFields: EnrichmentField[];
  completedCount: number;
  totalCount: number;
}

export function checkPropertyEnrichment(property: any): PropertyEnrichmentStatus {
  const missingFields: EnrichmentField[] = [];
  
  ENRICHMENT_FIELDS.forEach((field) => {
    const value = property[field];
    // Consider null, undefined, empty string, or false for booleans as missing
    // Note: for boolean fields like has_elevator, false is a valid value
    if (value === null || value === undefined || value === '') {
      missingFields.push(field);
    }
  });
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completedCount: ENRICHMENT_FIELDS.length - missingFields.length,
    totalCount: ENRICHMENT_FIELDS.length,
  };
}

export function isPropertyIncomplete(property: any): boolean {
  return !checkPropertyEnrichment(property).isComplete;
}
