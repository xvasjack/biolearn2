import type { Storyline, StorylineSummary } from '../types';
import { wgsBacteria } from './wgs-bacteria';
import { amplicon } from './amplicon';
import { rnaseq } from './rnaseq';

// All r-reports storylines
const storylines: Record<string, Storyline> = {
	'wgs-bacteria': wgsBacteria,
	amplicon,
	rnaseq
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
export { wgsBacteria, amplicon, rnaseq };
