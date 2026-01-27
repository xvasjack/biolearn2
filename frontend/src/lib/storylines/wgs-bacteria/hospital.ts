import type { Storyline } from '../types';
import {
	createIlluminaPhase1Sections,
	createIlluminaPhase2Sections,
	createIlluminaPhase3Sections,
	createIlluminaPhase4Sections,
	createHospitalAdditionalTools
} from './sections';

export const hospital: Storyline = {
	id: 'hospital',
	category: 'wgs_bacteria',
	title: 'Hospital Outbreak Investigation',
	subtitle: 'Antimicrobial Resistance in ICU',
	organism: 'Klebsiella pneumoniae',
	technology: 'illumina',
	technologyLabel: 'Short Read (Illumina)',
	dataDir: '/data/outbreak_investigation',
	toolsUsed: [
		'seqkit',
		'fastqc',
		'multiqc',
		'trimmomatic',
		'unicycler',
		'bandage',
		'quast',
		'checkm',
		'abricate',
		'mlst',
		'prokka',
		'mob_recon',
		'plasmidfinder',
		'snippy',
		'roary',
		'iqtree',
		'resfinder',
		'integron_finder',
		'isescan'
	],
	sections: [
		{
			type: 'intro',
			text: `**URGENT - Infection Control Alert**\n\n3 patients in the ICU have been diagnosed with carbapenem-resistant *Klebsiella pneumoniae* infections. All developed severe bloodstream infections within the past 72 hours and are not responding to last-line antibiotics.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'context',
			text: `**Patient Information:**\n\n| Patient | Location | Onset | Sample |\n|---------|----------|-------|--------|\n| Patient 01 | ICU Bed 3 | Day 0 | Blood culture |\n| Patient 02 | ICU Bed 7 | Day 2 | Blood culture |\n| Patient 03 | ICU Bed 12 | Day 3 | Blood culture |\n\nSamples from all 3 patients have been sequenced using Illumina NovaSeq (150bp paired-end, ~100x coverage).\n\n**Your Investigation Goals:**\n1. Determine if this is a clonal outbreak (same strain) or coincidental infections\n2. Identify the antimicrobial resistance mechanisms\n3. Guide infection control response`,
			hint: null,
			requiredDir: null
		},
		...createIlluminaPhase1Sections(),
		...createIlluminaPhase2Sections(),
		...createIlluminaPhase3Sections(),
		...createIlluminaPhase4Sections(),
		...createHospitalAdditionalTools(),
		{
			type: 'complete',
			title: 'Investigation Complete',
			text: `**Hospital Outbreak Investigation - Final Report**\n\n---\n\n**OUTBREAK STATUS: CONFIRMED (Partial)**\n\n**Strain Analysis:**\n| Patient | Sequence Type | Outbreak Status |\n|---------|---------------|------------------|\n| Patient 01 | ST258 | ✓ Outbreak cluster |\n| Patient 02 | ST258 | ✓ Outbreak cluster |\n| Patient 03 | ST11 | ✗ Sporadic case |\n\n**Key Findings:**\n\n*Outbreak Cluster (Patients 01 & 02 - ST258):*\n• Only 3 SNP differences between isolates - confirms direct transmission\n• Complete genome: 5.3 Mb chromosome + 2 plasmids (pKPC-250kb, pNDM-85kb)\n• Carbapenemase genes: blaKPC-2 (IncFII plasmid), blaNDM-1 (IncX3 plasmid)\n• Transmission likely occurred via shared equipment or healthcare worker\n\n*Sporadic Case (Patient 03 - ST11):*\n• >800 SNP differences from outbreak cluster - unrelated strain\n• Different plasmid profile - carries blaCTX-M-15 (ESBL) but no carbapenemases\n• Likely community-acquired infection, NOT part of ICU outbreak\n\n**Infection Control Recommendations:**\n1. Focus containment efforts on Beds 3-7 area (outbreak cluster)\n2. Review shared equipment and procedures between Patients 01 & 02\n3. Patient 03 can be managed separately - not an outbreak risk\n4. Screen other ICU patients for ST258 carriage\n\n**Clinical Implications:**\n• Patients 01 & 02: Consider colistin + tigecycline combination\n• Patient 03: Standard ESBL treatment (carbapenems may still be effective)`
		}
	]
};
