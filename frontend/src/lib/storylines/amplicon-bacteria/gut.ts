import type { Storyline, StorylineSection } from '../types';
import {
	createAmpliconPhase1Sections,
	createAmpliconPhase2Sections,
	createAmpliconPhase3Sections,
	createAmpliconPhase4Sections,
	createAmpliconPhase5Sections
} from './sections';

function createGutMicrobiomeIntro(): StorylineSection[] {
	return [
		{
			type: 'intro',
			text: `Clinical Microbiome Study:\n\nA research team is investigating the gut microbiome differences between patients with inflammatory bowel disease (IBD) and healthy controls. Stool samples have been collected from 20 IBD patients and 20 healthy volunteers.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'image',
			title: 'Gut Microbiome Composition',
			text: 'The human gut microbiome contains trillions of bacteria that play essential roles in digestion, immune function, and overall health. Dysbiosis (microbial imbalance) is associated with various diseases.',
			imageUrl: '/images/gut_microbiome.svg',
			imageAlt:
				'Illustration of diverse gut bacteria including Bacteroides, Firmicutes, and other common gut inhabitants'
		},
		{
			type: 'context',
			text: `DNA has been extracted from stool samples and the V4 region of the 16S rRNA gene was amplified and sequenced on Illumina MiSeq (2x250bp).\n\n**Study Design:**\n• 20 IBD patients (10 Crohn's disease, 10 ulcerative colitis)\n• 20 healthy controls\n• Matched for age and diet\n\n**Research Questions:**\n1. Does the gut microbiome differ between IBD patients and healthy controls?\n2. Which bacterial taxa are associated with disease?\n3. Is diversity reduced in IBD patients?`,
			hint: null,
			requiredDir: null
		}
	];
}

function createGutMicrobiomeConclusion(): StorylineSection {
	return {
		type: 'complete',
		title: 'Analysis Complete',
		text: `Congratulations! You have completed the Gut Microbiome Analysis.\n\n**Key Findings:**\n\n**Alpha Diversity:**\n• Shannon diversity significantly lower in IBD patients (p < 0.01)\n• Faith's phylogenetic diversity also reduced in IBD\n• Crohn's disease showed greater diversity loss than ulcerative colitis\n\n**Beta Diversity:**\n• Clear separation between IBD and healthy controls (PERMANOVA p < 0.001, R² = 0.23)\n• Bray-Curtis and weighted UniFrac showed consistent patterns\n\n**Differentially Abundant Taxa:**\n• Decreased in IBD: Faecalibacterium prausnitzii, Roseburia, Bifidobacterium\n• Increased in IBD: Escherichia/Shigella, Enterococcus, Ruminococcus gnavus\n\n**Clinical Implications:**\n• F. prausnitzii depletion is a hallmark of IBD\n• Loss of butyrate-producers may contribute to inflammation\n• Potential for microbiome-based diagnostics and therapeutics\n\n**Next Steps:**\n• Functional prediction (PICRUSt2)\n• Longitudinal sampling during flares\n• Correlation with clinical biomarkers (calprotectin, CRP)`
	};
}

export const gut: Storyline = {
	id: 'gut',
	category: 'amplicon_bacteria',
	title: 'Gut Microbiome Study',
	subtitle: 'IBD vs Healthy Controls',
	organism: 'Human gut microbiota',
	technology: 'illumina',
	technologyLabel: 'Short Read (Illumina)',
	dataDir: '/data/gut_microbiome',
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
		...createGutMicrobiomeIntro(),
		...createAmpliconPhase1Sections('/data/gut_microbiome'),
		...createAmpliconPhase2Sections('/data/gut_microbiome'),
		...createAmpliconPhase3Sections('/data/gut_microbiome'),
		...createAmpliconPhase4Sections('/data/gut_microbiome'),
		...createAmpliconPhase5Sections('/data/gut_microbiome'),
		createGutMicrobiomeConclusion()
	]
};
