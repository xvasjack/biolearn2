/**
 * Central index for storyline-specific tool outputs
 *
 * Import this to get the appropriate stats based on storyline context.
 */

import type { StorylineStats, AmrGeneEntry, MlstProfile, PlasmidResult, CheckmResult } from './types';
import { tutorialStats, getTutorialStats, kpneumoniaeDemo } from './tutorial/tool-outputs';
import { wgsBacteriaStats, getWgsBacteriaStats, hospital } from './wgs-bacteria/tool-outputs';

/**
 * Get stats for any storyline by category and storyline ID
 *
 * @param category - The storyline category (tutorial, wgs_bacteria, amplicon_bacteria)
 * @param storylineId - The storyline ID within that category
 * @returns The StorylineStats for generating terminal outputs
 */
export function getStorylineStats(category: string, storylineId: string): StorylineStats {
	// Normalize category name (handle both dash and underscore formats)
	const normalizedCategory = category.replace(/-/g, '_');

	switch (normalizedCategory) {
		case 'tutorial':
			return getTutorialStats(storylineId);

		case 'wgs_bacteria':
			return getWgsBacteriaStats(storylineId);

		case 'amplicon_bacteria':
			// TODO: Add amplicon bacteria stats when needed
			return kpneumoniaeDemo; // Fallback for now

		default:
			// Default to tutorial kpneumoniae demo
			return kpneumoniaeDemo;
	}
}

/**
 * Get stats by combined storyline path (e.g., "tutorial/kpneumoniae-demo")
 */
export function getStatsByPath(path: string): StorylineStats {
	const parts = path.split('/');
	if (parts.length >= 2) {
		return getStorylineStats(parts[0], parts[1]);
	}
	// Try to match just the storyline ID across all categories
	if (tutorialStats[path]) return tutorialStats[path];
	if (wgsBacteriaStats[path]) return wgsBacteriaStats[path];
	return kpneumoniaeDemo;
}

// Re-export individual stats for direct access
export { tutorialStats, wgsBacteriaStats };
export { kpneumoniaeDemo, hospital };
export type { StorylineStats, AmrGeneEntry, MlstProfile, PlasmidResult, CheckmResult };
