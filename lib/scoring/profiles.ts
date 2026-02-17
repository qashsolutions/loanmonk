// ============================================================
// Money Attitudinal Profile Matching Engine
// Assigns the best-fitting profile and PD modifier
// ============================================================

import type { OceanScores, MoneyProfile, OceanTrait } from '../types/index.js';
import { MONEY_PROFILES } from '../constants/index.js';

/**
 * Match an OCEAN score set to the best-fitting money attitudinal profile.
 *
 * Uses Euclidean distance between the applicant's scores and each
 * profile's trait signature. Only compares on traits the profile defines
 * (not all profiles specify all 5 traits).
 *
 * Returns the best match along with a distance score (lower = better fit).
 */
export function matchMoneyProfile(scores: OceanScores): {
  profile: MoneyProfile;
  distance: number;
  confidence: number;
} {
  let bestProfile = MONEY_PROFILES[0];
  let bestDistance = Infinity;

  for (const profile of MONEY_PROFILES) {
    const distance = computeProfileDistance(scores, profile);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestProfile = profile;
    }
  }

  // Confidence: inverse of distance, normalized
  // Distance range is roughly 0-4 per trait. Max possible ~8 for 5 traits.
  const confidence = Math.max(0, Math.min(1, 1 - bestDistance / 6));

  return {
    profile: bestProfile,
    distance: bestDistance,
    confidence,
  };
}

/**
 * Compute Euclidean distance between applicant scores and profile signature.
 * Only considers traits that the profile defines in trait_signature.
 */
function computeProfileDistance(scores: OceanScores, profile: MoneyProfile): number {
  const traits = Object.keys(profile.trait_signature) as OceanTrait[];
  if (traits.length === 0) return Infinity;

  let sumSquaredDiff = 0;
  for (const trait of traits) {
    const profileValue = profile.trait_signature[trait]!;
    const applicantValue = scores[trait];
    sumSquaredDiff += (applicantValue - profileValue) ** 2;
  }

  return Math.sqrt(sumSquaredDiff);
}

/**
 * Generate a blended profile name for edge cases where the applicant
 * doesn't closely match any base profile.
 *
 * Combines the two closest profile names.
 */
export function generateBlendedProfileName(scores: OceanScores): string {
  const distances: { profile: MoneyProfile; distance: number }[] = [];

  for (const profile of MONEY_PROFILES) {
    distances.push({
      profile,
      distance: computeProfileDistance(scores, profile),
    });
  }

  distances.sort((a, b) => a.distance - b.distance);

  if (distances.length < 2) return distances[0].profile.name;

  const first = distances[0];
  const second = distances[1];

  // If the top two are very close, create a blended name
  if (second.distance - first.distance < 1.0) {
    const firstName = first.profile.name.split(' ')[0];
    const secondName = second.profile.name.split(' ')[1] || second.profile.name.split(' ')[0];
    return `${firstName} ${secondName}`;
  }

  return first.profile.name;
}
