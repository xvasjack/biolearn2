import type { Storyline } from '../types';
import {
	createPacBioPhase1Sections,
	createLongReadPhase2Sections,
	createLongReadPhase3Sections,
	createLongReadPhase4Sections
} from './sections';

export const wastewater: Storyline = {
	id: 'wastewater',
	category: 'wgs_bacteria',
	title: 'Wastewater AMR Surveillance',
	subtitle: 'Environmental Resistance Monitoring',
	organism: 'Escherichia coli (mcr-positive)',
	technology: 'pacbio',
	technologyLabel: 'Long Read (PacBio HiFi)',
	dataDir: '/data/wastewater_surveillance',
	toolsUsed: [
		'seqkit',
		'pbmarkdup',
		'ccs',
		'hifiasm',
		'flye',
		'bandage',
		'quast',
		'checkm',
		'busco',
		'abricate',
		'mlst',
		'prokka',
		'bakta',
		'mob_recon',
		'plasmidfinder',
		'isescan',
		'snippy',
		'roary',
		'iqtree',
		'gubbins',
		'resfinder'
	],
	sections: [
		{
			type: 'intro',
			text: `ALERT - Environmental Health Agency:\n\nRoutine wastewater surveillance has detected high levels of colistin resistance genes (mcr) in samples from a municipal treatment plant. Colistin is a last-resort antibiotic, and environmental spread of resistance is a critical public health concern.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'image',
			title: 'Wastewater Treatment Facility',
			text: 'Aerial view of the municipal wastewater treatment plant where AMR surveillance sampling is conducted. Understanding resistance gene flow through wastewater systems helps predict and prevent clinical outbreaks.',
			imageUrl: '/images/wastewater_plant.svg',
			imageAlt:
				'Aerial view of wastewater treatment facility with settling ponds and processing buildings'
		},
		{
			type: 'context',
			text: `Cultured isolates from influent (incoming) and effluent (treated) water have been sequenced using PacBio HiFi technology. Long-read sequencing is essential here because:\n\n• **Complete plasmid resolution:** mcr genes are typically plasmid-borne\n• **IS element context:** Understanding the genetic environment aids transmission tracking\n• **Chromosomal integration detection:** Some mcr variants integrate into chromosomes\n\nYour task: Characterize the mcr-positive isolates, determine the plasmid context, and assess if treatment is removing resistant bacteria.`,
			hint: null,
			requiredDir: null
		},
		...createPacBioPhase1Sections('/data/wastewater_surveillance'),
		{
			type: 'alert',
			title: 'Assembly Result',
			text: `**PacBio HiFi Assembly Successful**\n\nYour long-read assembly produced a complete, closed genome:\n• 1 circular chromosome (4.9 Mb)\n• 2 complete circular plasmids (IncI2: 65 kb, IncX4: 35 kb)\n• N50: 4.9 Mb (chromosome-level)\n\n**Advantage of long reads:** Unlike short-read assembly, we have resolved the complete plasmid sequences, allowing us to determine exactly which plasmid carries the mcr gene and analyze its transfer potential.`
		},
		...createLongReadPhase2Sections('/data/wastewater_surveillance'),
		{
			type: 'alert',
			title: 'Critical Finding: mcr-1 Detected',
			text: `**AMR Screening Result:**\n\nmcr-1 gene detected on the IncI2 plasmid (pMCR-65kb)\n\n**Why this matters:**\n• mcr-1 confers resistance to colistin, a last-resort antibiotic\n• IncI2 plasmids are highly conjugative (easily transferred between bacteria)\n• This plasmid type has been associated with global mcr-1 spread\n\nContinue analysis to understand the transmission context...`
		},
		...createLongReadPhase3Sections('/data/wastewater_surveillance'),
		{
			type: 'task',
			title: 'Step 17: Detailed mcr Analysis',
			text: `Analyze the genetic context of the mcr gene.`,
			command: 'resfinder -i polished/consensus.fasta -o resfinder_results/ -db_res -l 0.9 -t 0.8',
			explanation: 'ResFinder provides detailed resistance gene context and variants.',
			requiredDir: '/data/wastewater_surveillance',
			parameters: [
				{ name: '-db_res', desc: 'Use resistance database' },
				{ name: '-l 0.9', desc: 'Minimum coverage 90%' },
				{ name: '-t 0.8', desc: 'Minimum identity 80%' }
			]
		},
		{
			type: 'task',
			title: 'Step 18: Plasmid Transferability',
			text: `Assess conjugation potential of the mcr-carrying plasmid.`,
			command: 'mob_typer -i mob_recon_results/plasmid_pMCR.fasta -o mob_typer_results/',
			explanation: 'MOB-typer predicts plasmid mobility and host range.',
			requiredDir: '/data/wastewater_surveillance',
			parameters: [
				{ name: '-i', desc: 'Input plasmid sequence' },
				{ name: '-o mob_typer_results/', desc: 'Output directory' }
			]
		},
		...createLongReadPhase4Sections('/data/wastewater_surveillance'),
		{
			type: 'complete',
			title: 'Analysis Complete',
			text: `Congratulations! You have completed the Wastewater AMR Surveillance Investigation.\n\n**Assembly Result:** Complete genome with 2 fully resolved plasmids\n\n**Key findings:**\n• Identified E. coli ST131 (high-risk pandemic clone)\n• mcr-1 located on conjugative IncI2 plasmid (pMCR-65kb)\n• Plasmid carries complete conjugation machinery (tra genes intact)\n• Same plasmid backbone found in clinical isolates from 3 continents\n• IS element (ISApl1) flanking mcr-1 suggests recent mobilization\n\n**Environmental Insights:**\n• mcr-positive isolates found in both influent AND effluent\n• Current treatment not eliminating resistant bacteria\n• Downstream agricultural irrigation may be at risk\n\n**Recommendations:**\n• Implement enhanced disinfection protocols\n• Expand surveillance to receiving waters\n• Alert clinical laboratories to monitor for mcr-positive infections\n\n**Why long reads were essential:**\nComplete plasmid assembly revealed the IncI2 backbone, conjugation genes, and IS element context—information impossible to obtain from fragmented short-read assemblies.`
		}
	]
};
