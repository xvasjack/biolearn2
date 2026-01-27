import type { Storyline, StorylineSection } from '../types';
import {
	createAmpliconPhase1Sections,
	createAmpliconPhase2Sections,
	createAmpliconPhase3Sections,
	createAmpliconPhase4Sections,
	createAmpliconPhase5Sections
} from './sections';

function createWaterContaminationIntro(): StorylineSection[] {
	return [
		{
			type: 'intro',
			text: `URGENT - Environmental Health Investigation:\n\nA community has reported gastrointestinal illness following heavy rainfall. Water samples from the municipal water supply, nearby agricultural runoff, and a suspected contaminated well have been collected for analysis.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'image',
			title: 'Water Sampling Sites',
			text: 'Water samples collected from multiple locations help trace contamination sources. 16S rRNA sequencing can detect fecal indicator bacteria and identify potential pathogens.',
			imageUrl: '/images/water_contamination.svg',
			imageAlt:
				'Map showing water sampling locations including well, treatment plant, and agricultural runoff sites'
		},
		{
			type: 'context',
			text: `Samples were collected from 5 locations:\n• **Municipal treated water** (post-treatment)\n• **Raw water intake** (pre-treatment)\n• **Agricultural runoff** (near cattle farm)\n• **Residential well** (suspected source)\n• **Reference stream** (upstream, unimpacted)\n\n**Research Questions:**\n1. Is there fecal contamination in the water supply?\n2. What is the likely source (human vs. animal)?\n3. Are there pathogenic bacteria present?\n4. How does the treatment plant affect microbial communities?`,
			hint: null,
			requiredDir: null
		}
	];
}

function createWaterContaminationAdditional(dataDir: string): StorylineSection[] {
	return [
		{
			type: 'task',
			title: 'Step 25: Detect Fecal Indicators',
			text: `Search for fecal indicator bacteria in the samples.`,
			command:
				'qiime taxa filter-table --i-table table-filtered.qza --i-taxonomy taxonomy.qza --p-include "Escherichia,Enterococcus,Bacteroides,Clostridium" --o-filtered-table fecal-indicators.qza',
			explanation: 'Filter for bacteria commonly used as fecal contamination indicators.',
			requiredDir: dataDir,
			parameters: [{ name: '--p-include', desc: 'Fecal indicator genera' }]
		},
		{
			type: 'task',
			title: 'Step 26: Source Tracking Analysis',
			text: `Use SourceTracker2 to identify contamination sources.`,
			command:
				'sourcetracker2 gibbs --table-path exported/feature-table.biom --metadata-path source-metadata.tsv --output-dir sourcetracker_results/ --source-category-column SourceSink',
			explanation: 'SourceTracker uses Bayesian methods to estimate source contributions.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--table-path', desc: 'Feature table in BIOM format' },
				{ name: '--source-category-column', desc: 'Column indicating source vs sink' }
			]
		},
		{
			type: 'task',
			title: 'Step 27: Pathogen Detection',
			text: `Screen for potentially pathogenic bacteria.`,
			command:
				'qiime taxa filter-table --i-table table-filtered.qza --i-taxonomy taxonomy.qza --p-include "Salmonella,Campylobacter,Vibrio,Legionella,Listeria,Yersinia" --o-filtered-table pathogens.qza',
			explanation: 'Identify sequences matching known waterborne pathogens.',
			requiredDir: dataDir,
			parameters: [{ name: '--p-include', desc: 'Potential pathogen genera' }]
		}
	];
}

function createWaterContaminationConclusion(): StorylineSection {
	return {
		type: 'complete',
		title: 'Analysis Complete',
		text: `Congratulations! You have completed the Water Contamination Investigation.\n\n**Key Findings:**\n\n**Fecal Contamination Detected:**\n• Residential well: HIGH contamination (Bacteroides, E. coli detected)\n• Agricultural runoff: MODERATE (cattle-associated Prevotella)\n• Raw water intake: LOW (trace fecal indicators)\n• Treated water: NEGATIVE (no fecal indicators)\n\n**Source Tracking Results:**\n• Residential well: 78% cattle source, 15% human source\n• Agricultural runoff: 92% cattle source\n• Raw water: Mixed sources (infiltration from multiple points)\n\n**Pathogen Alert:**\n• Campylobacter sequences detected in residential well\n• No Salmonella or Vibrio detected\n• Legionella detected in raw water (low abundance)\n\n**Root Cause:**\nAgricultural runoff from nearby cattle farm infiltrated the residential well through a fractured aquifer zone, likely exacerbated by heavy rainfall.\n\n**Recommendations:**\n• Issue boil-water advisory for affected well\n• Test well for Campylobacter by culture\n• Assess well casing integrity\n• Install setback buffer from agricultural operations\n• Continue monitoring treated water (currently safe)\n\n**Public Health Actions:**\n• Affected residents notified\n• Alternative water supply provided\n• Well rehabilitation or replacement recommended`
	};
}

export const water: Storyline = {
	id: 'water',
	category: 'amplicon_bacteria',
	title: 'Water Contamination',
	subtitle: 'Source Tracking Investigation',
	organism: 'Water microbiota',
	technology: 'illumina',
	technologyLabel: 'Short Read (Illumina)',
	dataDir: '/data/water_samples',
	toolsUsed: [
		'seqkit',
		'fastqc',
		'multiqc',
		'cutadapt',
		'qiime2',
		'dada2',
		'silva',
		'emperor',
		'ancom',
		'sourcetracker2',
		'biom'
	],
	sections: [
		...createWaterContaminationIntro(),
		...createAmpliconPhase1Sections('/data/water_samples'),
		...createAmpliconPhase2Sections('/data/water_samples'),
		...createAmpliconPhase3Sections('/data/water_samples'),
		...createAmpliconPhase4Sections('/data/water_samples'),
		...createAmpliconPhase5Sections('/data/water_samples'),
		...createWaterContaminationAdditional('/data/water_samples'),
		createWaterContaminationConclusion()
	]
};
