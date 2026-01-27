import type { Storyline, StorylineSection } from '../types';
import {
	createAmpliconPhase1Sections,
	createAmpliconPhase2Sections,
	createAmpliconPhase3Sections,
	createAmpliconPhase4Sections,
	createAmpliconPhase5Sections
} from './sections';

function createSoilMicrobiomeIntro(): StorylineSection[] {
	return [
		{
			type: 'intro',
			text: `Agricultural Research Project:\n\nA sustainable agriculture research team is studying compost to identify beneficial bacteria that promote plant growth. They want to find natural alternatives to chemical fertilizers by understanding which microbes make compost effective.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'image',
			title: 'Compost Microbiome',
			text: 'Compost contains diverse bacterial communities that break down organic matter and produce plant-beneficial compounds. Understanding these communities can help optimize composting and identify beneficial inoculants.',
			imageUrl: '/images/compost_microbiome.svg',
			imageAlt:
				'Cross-section of compost pile showing different decomposition zones and associated bacterial communities'
		},
		{
			type: 'context',
			text: `Samples have been collected from three compost types:\n• **Thermophilic compost** (high-temperature, rapid decomposition)\n• **Vermicompost** (worm-processed, nutrient-rich)\n• **Bokashi** (fermented, anaerobic process)\n\nEach compost type was sampled at 3 stages: fresh, mature (3 months), and aged (6 months).\n\n**Research Questions:**\n1. Which beneficial bacteria are enriched in each compost type?\n2. How does microbial community change during maturation?\n3. Which compost type has the highest diversity of plant growth-promoting bacteria?`,
			hint: null,
			requiredDir: null
		}
	];
}

function createSoilMicrobiomeAdditional(dataDir: string): StorylineSection[] {
	return [
		{
			type: 'task',
			title: 'Step 25: Identify Plant Growth Promoters',
			text: `Search for known plant growth-promoting bacteria (PGPB).`,
			command:
				'qiime taxa filter-table --i-table table-filtered.qza --i-taxonomy taxonomy.qza --p-include "Bacillus,Pseudomonas,Azospirillum,Rhizobium,Azotobacter,Streptomyces" --o-filtered-table pgpb-table.qza',
			explanation:
				'Filter for genera known to promote plant growth through nitrogen fixation, phosphate solubilization, or hormone production.',
			requiredDir: dataDir,
			parameters: [{ name: '--p-include', desc: 'Taxa to include in filtered table' }]
		},
		{
			type: 'task',
			title: 'Step 26: PGPB Abundance Comparison',
			text: `Compare plant growth-promoting bacteria across compost types.`,
			command:
				'qiime feature-table summarize --i-table pgpb-table.qza --o-visualization pgpb-summary.qzv --m-sample-metadata-file metadata.tsv',
			explanation: 'Summarize the abundance of beneficial bacteria in each compost type.',
			requiredDir: dataDir,
			parameters: [{ name: '--i-table', desc: 'Filtered PGPB table' }]
		}
	];
}

function createSoilMicrobiomeConclusion(): StorylineSection {
	return {
		type: 'complete',
		title: 'Analysis Complete',
		text: `Congratulations! You have completed the Soil/Compost Microbiome Analysis.\n\n**Key Findings:**\n\n**Compost Type Comparison:**\n• **Thermophilic:** Highest diversity, dominated by Bacillus and Thermus\n• **Vermicompost:** Rich in Actinobacteria, especially Streptomyces\n• **Bokashi:** Unique lactic acid bacteria profile (Lactobacillus)\n\n**Maturation Effects:**\n• Fresh compost: High Proteobacteria, low diversity\n• Mature (3 mo): Peak diversity, balanced community\n• Aged (6 mo): Stable community, increased Actinobacteria\n\n**Plant Growth-Promoting Bacteria Identified:**\n• Bacillus subtilis (phosphate solubilization)\n• Pseudomonas fluorescens (biocontrol)\n• Streptomyces spp. (antifungal compounds)\n• Azospirillum brasilense (nitrogen fixation)\n\n**Recommendations:**\n• Use mature thermophilic compost for maximum PGPB diversity\n• Vermicompost best for disease suppression (high Streptomyces)\n• Bokashi ideal for quick nutrient release (fermented organics)\n\n**Potential Applications:**\n• Develop targeted microbial inoculants\n• Optimize composting conditions for specific crops\n• Create compost "quality scores" based on beneficial bacteria`
	};
}

export const soil: Storyline = {
	id: 'soil',
	category: 'amplicon_bacteria',
	title: 'Beneficial Soil Bacteria',
	subtitle: 'Compost Microbiome Analysis',
	organism: 'Soil/compost microbiota',
	technology: 'illumina',
	technologyLabel: 'Short Read (Illumina)',
	dataDir: '/data/soil_microbiome',
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
		'biom'
	],
	sections: [
		...createSoilMicrobiomeIntro(),
		...createAmpliconPhase1Sections('/data/soil_microbiome'),
		...createAmpliconPhase2Sections('/data/soil_microbiome'),
		...createAmpliconPhase3Sections('/data/soil_microbiome'),
		...createAmpliconPhase4Sections('/data/soil_microbiome'),
		...createAmpliconPhase5Sections('/data/soil_microbiome'),
		...createSoilMicrobiomeAdditional('/data/soil_microbiome'),
		createSoilMicrobiomeConclusion()
	]
};
