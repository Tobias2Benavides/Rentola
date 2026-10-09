// Basic keyword screen against a new/edited listing's title + description,
// matched against the Prohibited Items list (content/legal/en/prohibited.md).
// This is a blunt instrument with false positives by design -- a match
// flags the listing for admin review (needs_review, see
// 016_listing_review_flag.sql) rather than silently rejecting it.
export const PROHIBITED_KEYWORDS = [
  // Motorised vehicles
  'scooter', 'moped', 'brommer', 'snorfiets', 'speed pedelec',
  'motorcycle', 'motorbike', 'minibike', 'quad bike',
  // Weapons
  'weapon', 'wapon', 'wapen', 'firearm', 'gun', 'pistol', 'rifle', 'ammunition',
  'airsoft', 'replica gun', 'knife', 'mes', 'taser', 'pepper spray',
  // Drugs / alcohol / tobacco
  'drugs', 'cocaine', 'cannabis', 'weed', 'marijuana', 'alcohol', 'cigarette', 'tobacco', 'vape',
  // Medicines
  'prescription', 'medicine', 'medication',
  // Other prohibited categories
  'stolen', 'counterfeit', 'replica designer', 'hazardous', 'explosive', 'flammable', 'radioactive',
] as const

export function matchProhibitedKeyword(text: string): string | null {
  const lower = text.toLowerCase()
  return PROHIBITED_KEYWORDS.find((keyword) => lower.includes(keyword)) ?? null
}
