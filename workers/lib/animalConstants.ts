// Shared between the public animals.ts (query-param validation) and M6's
// adminAnimals.ts (create/update body validation) so the CHECK constraint's
// allowed values live in exactly one place.
export const VALID_STATUSES = ['for-sale', 'pending', 'coming-soon', 'not-for-sale'] as const;
export type AnimalStatus = (typeof VALID_STATUSES)[number];
