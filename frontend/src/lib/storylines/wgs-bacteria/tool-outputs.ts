/**
 * Tool outputs index for WGS Bacteria storylines
 *
 * Aggregates per-storyline tool output configs.
 * Each sub-topic has its own file with organism-specific stats.
 */

import type { StorylineStats } from '../types';
import { hospital } from './hospital-tool-outputs';
import { clinical } from './clinical-tool-outputs';
import { plant } from './plant-tool-outputs';
import { fish } from './fish-tool-outputs';
import { foodborne } from './foodborne-tool-outputs';
import { wastewater } from './wastewater-tool-outputs';

/**
 * Get stats for a WGS bacteria storyline by ID
 */
export function getWgsBacteriaStats(storylineId: string): StorylineStats {
	switch (storylineId) {
		case 'hospital':
			return hospital;
		case 'clinical':
			return clinical;
		case 'plant':
			return plant;
		case 'fish':
			return fish;
		case 'foodborne':
			return foodborne;
		case 'wastewater':
			return wastewater;
		default:
			return hospital;
	}
}

// Export all stats for direct access
export const wgsBacteriaStats: Record<string, StorylineStats> = {
	hospital,
	clinical,
	plant,
	fish,
	foodborne,
	wastewater
};

// Re-export individual storyline stats
export { hospital, clinical, plant, fish, foodborne, wastewater };
