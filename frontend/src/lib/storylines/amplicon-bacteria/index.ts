import type { Storyline, StorylineSummary } from '../types';
import { gut } from './gut';
import { soil } from './soil';
import { water } from './water';

// All amplicon-bacteria storylines
const storylines: Record<string, Storyline> = {
	gut,
	soil,
	water
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
export { gut, soil, water };
