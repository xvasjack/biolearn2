import type { Storyline, StorylineSummary } from '../types';
import { hospital } from './hospital';
import { plant } from './plant';
import { fish } from './fish';
import { foodborne } from './foodborne';
import { wastewater } from './wastewater';
import { clinical } from './clinical';

// All wgs-bacteria storylines
const storylines: Record<string, Storyline> = {
	hospital,
	plant,
	fish,
	foodborne,
	wastewater,
	clinical
};

export function getStoryline(id: string): Storyline | undefined {
	return storylines[id];
}

export function getStorylinesList(): StorylineSummary[] {
	return Object.values(storylines).map((s) => ({
		id: s.id,
		title: s.title,
		subtitle: s.subtitle,
		technology: s.technology,
		technologyLabel: s.technologyLabel
	}));
}

// Re-export individual storylines for direct imports if needed
export { hospital, plant, fish, foodborne, wastewater, clinical };

// Re-export terminal outputs
export * from './terminal-outputs';
