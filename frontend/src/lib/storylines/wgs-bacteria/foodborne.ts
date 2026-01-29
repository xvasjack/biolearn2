import type { Storyline } from '../types';
import {
	createIlluminaPhase1Sections,
	createIlluminaPhase2Sections,
	createIlluminaPhase3Sections,
	createIlluminaPhase4Sections,
	createFoodborneAdditionalTools
} from './sections';

export const foodborne: Storyline = {
	id: 'foodborne',
	category: 'wgs_bacteria',
	title: 'Food Poisoning Outbreak',
	subtitle: 'Restaurant-Associated Illness',
	organism: 'Salmonella enterica',
	technology: 'illumina',
	technologyLabel: 'Short Read (Illumina)',
	dataDir: '/data/outbreak_investigation',
	toolsUsed: ['seqkit', 'fastqc', 'trimmomatic', 'unicycler', 'Bandage', 'quast', 'checkm', 'busco', 'abricate', 'mlst', 'prokka', 'bakta', 'mob_recon', 'plasmidfinder', 'platon', 'snippy', 'roary', 'iqtree', 'gubbins', 'resfinder', 'virulencefinder', 'integron_finder'],
	sections: [
		{
			type: 'intro',
			text: `URGENT - Public Health Alert:\n\n23 people have reported gastroenteritis symptoms after eating at the same restaurant. 4 patients have been hospitalized. Health inspectors have collected samples from patients and the restaurant kitchen.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'context',
			text: `Stool samples from 8 patients and environmental swabs from the restaurant have been cultured and sequenced. Preliminary culture identified Salmonella. Your task: Confirm the outbreak, link patient isolates to a food source, and assess antibiotic resistance.`,
			hint: null,
			requiredDir: null
		},
		...createIlluminaPhase1Sections(),
		...createIlluminaPhase2Sections(),
		...createIlluminaPhase3Sections(),
		...createIlluminaPhase4Sections(),
		...createFoodborneAdditionalTools(),
		{
			type: 'complete',
			title: 'Analysis Complete',
			text: `Congratulations! You have completed the Food Poisoning Investigation.\n\n**Assembly Result:** Complete genome - 1 circular chromosome (4.8 Mb), no plasmids detected\n\n**Key findings:**\n• Confirmed Salmonella enterica serovar Enteritidis (ST11)\n• All 8 patient isolates clonal (<3 SNP differences) - confirmed linked outbreak\n• Source traced to contaminated eggs from the restaurant kitchen\n• Detected Salmonella Genomic Island 1 (SGI-1) with multidrug resistance\n• ASSuT resistance pattern: Ampicillin, Streptomycin, Sulfonamides, Tetracycline\n• No plasmid-mediated resistance - all AMR genes chromosomally encoded\n\n**Public Health Actions:**\n• Restaurant temporarily closed for sanitation\n• Egg supplier traced and notified\n• Patient antibiotic therapy adjusted based on resistance profile`
		}
	]
};
