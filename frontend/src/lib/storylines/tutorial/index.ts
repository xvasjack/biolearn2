import type { Storyline, StorylineSummary } from '../types';
import { linuxBasics } from './linux-basics';
import { kpneumoniaeDemo } from './kpneumoniae-demo';

// All tutorial storylines
const storylines: Record<string, Storyline> = {
	'linux-basics': linuxBasics,
	'kpneumoniae-demo': kpneumoniaeDemo
};

export function getStoryline(id: string): Storyline | undefined {
	return storylines[id];
}

export function getStorylinesList(): StorylineSummary[] {
	return Object.values(storylines).map(s => ({
		id: s.id,
		title: s.title,
		subtitle: s.subtitle,
		technology: s.technology,
		technologyLabel: s.technologyLabel
	}));
}

// Re-export individual storylines for direct imports if needed
export { linuxBasics, kpneumoniaeDemo };

// Re-export terminal outputs
export * from './terminal-outputs';
