import type { Storyline } from '../types';
import {
	createIlluminaPhase1Sections,
	createIlluminaPhase2Sections,
	createIlluminaPhase3Sections,
	createIlluminaPhase4Sections,
	createPlantAdditionalTools
} from './sections';

export const plant: Storyline = {
	id: 'plant',
	category: 'wgs_bacteria',
	title: 'Plant Pathogen Investigation',
	subtitle: 'Citrus Canker Outbreak',
	organism: 'Xanthomonas citri',
	technology: 'illumina',
	technologyLabel: 'Short Read (Illumina)',
	dataDir: '/data/outbreak_investigation',
	toolsUsed: ['seqkit', 'fastqc', 'trimmomatic', 'unicycler', 'Bandage', 'quast', 'checkm', 'busco', 'abricate', 'mlst', 'prokka', 'bakta', 'mob_recon', 'plasmidfinder', 'platon', 'snippy', 'roary', 'iqtree', 'gubbins', 'virulencefinder'],
	sections: [
		{
			type: 'intro',
			text: `ALERT - Department of Agriculture:\n\nMultiple citrus orchards in the region are showing symptoms of citrus canker. Lesions on leaves, stems, and fruit are spreading rapidly. Quarantine measures have been implemented.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'image',
			title: 'Disease Symptoms',
			text: 'Citrus canker lesions on infected orange fruit and leaves. Note the raised, corky lesions with characteristic yellow halos - a hallmark of Xanthomonas citri infection.',
			imageUrl: '/images/citrus_canker.svg',
			imageAlt: 'Citrus canker lesions showing raised brown/tan lesions with yellow halos on orange fruit and leaves'
		},
		{
			type: 'context',
			text: `Isolates from 6 affected orchards have been collected and sequenced. The suspected pathogen is Xanthomonas citri pv. citri. Your task: Confirm the pathogen identity, determine if it's a single introduction or multiple events, and identify potential virulence factors.`,
			hint: null,
			requiredDir: null
		},
		...createIlluminaPhase1Sections(),
		...createIlluminaPhase2Sections(),
		...createIlluminaPhase3Sections(),
		...createIlluminaPhase4Sections(),
		...createPlantAdditionalTools(),
		{
			type: 'complete',
			title: 'Analysis Complete',
			text: `Congratulations! You have completed the Plant Pathogen Investigation.\n\n**Assembly Result:** Complete genome - 1 circular chromosome (5.1 Mb) + 1 plasmid (pXAC64-64kb)\n\n**Key findings:**\n• Confirmed Xanthomonas citri pv. citri\n• Single introduction event (clonal population across all orchards)\n• Identified Type III secretion system effectors (xopAD, xopE, avrBs2)\n• Copper resistance genes detected on plasmid pXAC64\n• Source traced to imported plant material from Southeast Asia`
		}
	]
};
