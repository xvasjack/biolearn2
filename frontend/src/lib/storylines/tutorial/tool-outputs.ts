/**
 * Tool outputs index for Tutorial storylines
 *
 * Aggregates per-storyline tool output configs.
 * Each sub-topic that uses bioinformatics tools has its own file.
 * Storylines like linux-basics that don't use these tools don't need one.
 */

import type { StorylineStats } from '../types';
import { kpneumoniaeDemo } from './kpneumoniae-demo-tool-outputs';

/**
 * Get stats for a tutorial storyline by ID
 */
export function getTutorialStats(storylineId: string): StorylineStats {
	switch (storylineId) {
		case 'kpneumoniae-demo':
		case 'kpneumoniae_demo':
			return kpneumoniaeDemo;
		default:
			return kpneumoniaeDemo;
	}
}

// Export all stats for direct access
export const tutorialStats: Record<string, StorylineStats> = {
	'kpneumoniae-demo': kpneumoniaeDemo,
	'kpneumoniae_demo': kpneumoniaeDemo
};

// Re-export individual storyline stats
export { kpneumoniaeDemo };
