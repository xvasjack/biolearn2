/**
 * Tool outputs configuration for WGS Bacteria storylines
 *
 * Each storyline has unique stats matching its narrative and dataset.
 * Edit the numbers here to customize terminal outputs for each scenario.
 */

import type { StorylineStats } from '../types';

/**
 * Hospital Outbreak Investigation
 *
 * K. pneumoniae carbapenem-resistant outbreak in ICU
 * Technology: Illumina MiSeq, 250bp paired-end
 */
export const hospital: StorylineStats = {
	// Basic info
	samplePrefix: 'ICU_KP_001',
	organism: 'Klebsiella pneumoniae',
	organismShort: 'K. pneumoniae',

	// Sequencing stats
	totalReads: 1245678,
	readLength: 249,
	minLen: 35,
	maxLen: 251,
	gcContent: 57.1,
	q20Percent: 96.8,
	q30Percent: 92.4,

	// Trimmomatic
	trimBothSurvivingPercent: 98.76,
	trimForwardOnlyPercent: 0.62,
	trimReverseOnlyPercent: 0.05,
	trimDroppedPercent: 0.57,

	// Assembly
	assemblySize: 5678234,
	numContigs: 45,
	numContigsAll: 89,
	n50: 456789,
	n75: 234567,
	l50: 5,
	l75: 9,
	largestContig: 987654,
	assemblyGC: 57.32,
	numCircular: 2,
	numComponents: 3,

	// Annotation
	numCDS: 5234,
	numtRNA: 89,
	numrRNA: 25,
	numtmRNA: 1,
	numMiscRNA: 0,
	numCRISPR: 2,

	// CheckM2
	checkm: {
		completeness: 99.87,
		contamination: 0.42,
		strain_heterogeneity: 0.00,
		quality: 'High'
	},

	// MLST - carbapenem-resistant clone
	mlst: {
		scheme: 'klebsiella',
		st: 'ST258',
		alleles: {
			gapA: 3,
			infB: 3,
			mdh: 1,
			pgi: 1,
			phoE: 1,
			rpoB: 1,
			tonB: 79
		},
		significance: 'Global CRE outbreak clone'
	},

	// AMR - carbapenem resistance
	amrDatabase: 'ncbi',
	amrGenes: [
		{
			gene: 'blaKPC-3',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_049253.1',
			product: 'KPC-3 carbapenemase',
			resistance: 'CARBAPENEM',
			contig: 'contig_1',
			start: 1234567,
			end: 1235448,
			strand: '+'
		},
		{
			gene: 'blaSHV-12',
			coverage: 100.00,
			identity: 99.88,
			accession: 'NG_049956.1',
			product: 'SHV-12 ESBL',
			resistance: 'BETA-LACTAM',
			contig: 'contig_1',
			start: 2345678,
			end: 2346543,
			strand: '+'
		},
		{
			gene: 'blaTEM-1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050145.1',
			product: 'TEM-1 beta-lactamase',
			resistance: 'BETA-LACTAM',
			contig: 'contig_2',
			start: 12345,
			end: 13206,
			strand: '-'
		},
		{
			gene: 'aac(6\')-Ib',
			coverage: 100.00,
			identity: 99.65,
			accession: 'NG_047267.1',
			product: 'Aminoglycoside acetyltransferase',
			resistance: 'AMINOGLYCOSIDE',
			contig: 'contig_1',
			start: 3456789,
			end: 3457389,
			strand: '+'
		},
		{
			gene: 'oqxA',
			coverage: 100.00,
			identity: 99.91,
			accession: 'NG_048024.1',
			product: 'OqxA efflux pump',
			resistance: 'QUINOLONE',
			contig: 'contig_1',
			start: 4567890,
			end: 4569056,
			strand: '+'
		},
		{
			gene: 'fosA',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_047840.1',
			product: 'FosA fosfomycin resistance',
			resistance: 'FOSFOMYCIN',
			contig: 'contig_1',
			start: 5678901,
			end: 5679320,
			strand: '-'
		}
	],

	// Plasmids
	plasmids: [
		{
			plasmid: 'IncFII(K)',
			identity: 99.12,
			accession: 'JN233705',
			contig: 'contig_2',
			coverage: 100.00
		},
		{
			plasmid: 'IncN',
			identity: 97.85,
			accession: 'AY046276',
			contig: 'contig_3',
			coverage: 98.90
		}
	],

	// QUAST
	quast: {
		contigsGe500: 45,
		contigsGe1000: 42,
		contigsGe5000: 35,
		contigsGe10000: 28,
		contigsGe25000: 22,
		contigsGe50000: 16,
		totalLengthGe0: 5698456,
		totalLengthGe1000: 5687234,
		nsPer100kb: 0.00
	},

	// Plasmid contigs
	plasmidContigs: [
		{
			name: 'contig_2',
			size: 145678,
			type: 'IncFII(K)',
			mobility: 'conjugative'
		},
		{
			name: 'contig_3',
			size: 45234,
			type: 'IncN',
			mobility: 'conjugative'
		}
	],

	// Bandage
	bandage: {
		nodes: 156,
		edges: 198,
		components: 3,
		deadEnds: 4,
		circularContigs: 2,
		largestComponentSize: 5432100,
		largestComponentSegments: 152
	},

	// Snippy - outbreak variants
	snippy: {
		totalVariants: 23,
		snps: 18,
		insertions: 3,
		deletions: 2,
		complex: 0
	}
};

/**
 * Clinical Diagnostics
 *
 * E. coli urinary tract infection isolate
 * Technology: Illumina NextSeq 550, 150bp paired-end
 */
export const clinical: StorylineStats = {
	// Basic info
	samplePrefix: 'UTI_EC_042',
	organism: 'Escherichia coli',
	organismShort: 'E. coli',

	// Sequencing stats
	totalReads: 876543,
	readLength: 148,
	minLen: 35,
	maxLen: 151,
	gcContent: 50.8,
	q20Percent: 97.5,
	q30Percent: 94.2,

	// Trimmomatic
	trimBothSurvivingPercent: 99.12,
	trimForwardOnlyPercent: 0.43,
	trimReverseOnlyPercent: 0.02,
	trimDroppedPercent: 0.43,

	// Assembly
	assemblySize: 5123456,
	numContigs: 78,
	numContigsAll: 145,
	n50: 234567,
	n75: 123456,
	l50: 8,
	l75: 15,
	largestContig: 567890,
	assemblyGC: 50.65,
	numCircular: 1,
	numComponents: 2,

	// Annotation
	numCDS: 4765,
	numtRNA: 84,
	numrRNA: 22,
	numtmRNA: 1,
	numMiscRNA: 0,
	numCRISPR: 1,

	// CheckM2
	checkm: {
		completeness: 99.65,
		contamination: 0.28,
		strain_heterogeneity: 0.00,
		quality: 'High'
	},

	// MLST - ST131 high-risk clone
	mlst: {
		scheme: 'ecoli',
		st: 'ST131',
		alleles: {
			adk: 53,
			fumC: 40,
			gyrB: 47,
			icd: 13,
			mdh: 36,
			purA: 28,
			recA: 29
		},
		significance: 'High-risk ESBL clone - pandemic lineage'
	},

	// AMR
	amrDatabase: 'ncbi',
	amrGenes: [
		{
			gene: 'blaCTX-M-27',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_048935.1',
			product: 'CTX-M-27 ESBL',
			resistance: 'BETA-LACTAM',
			contig: 'contig_1',
			start: 1567890,
			end: 1568766,
			strand: '+'
		},
		{
			gene: 'blaOXA-1',
			coverage: 100.00,
			identity: 99.62,
			accession: 'NG_049571.1',
			product: 'OXA-1 beta-lactamase',
			resistance: 'BETA-LACTAM',
			contig: 'contig_1',
			start: 2345678,
			end: 2346459,
			strand: '-'
		},
		{
			gene: 'aac(3)-IIa',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_047284.1',
			product: 'Aminoglycoside acetyltransferase',
			resistance: 'AMINOGLYCOSIDE',
			contig: 'contig_1',
			start: 3456789,
			end: 3457650,
			strand: '+'
		},
		{
			gene: 'sul1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050126.1',
			product: 'Sulfonamide resistance',
			resistance: 'SULFONAMIDE',
			contig: 'contig_2',
			start: 23456,
			end: 24290,
			strand: '+'
		},
		{
			gene: 'dfrA17',
			coverage: 100.00,
			identity: 99.48,
			accession: 'NG_047543.1',
			product: 'Trimethoprim resistance',
			resistance: 'TRIMETHOPRIM',
			contig: 'contig_2',
			start: 25678,
			end: 26152,
			strand: '+'
		},
		{
			gene: 'tet(A)',
			coverage: 100.00,
			identity: 99.75,
			accession: 'NG_048252.1',
			product: 'Tetracycline efflux pump',
			resistance: 'TETRACYCLINE',
			contig: 'contig_2',
			start: 34567,
			end: 35768,
			strand: '-'
		}
	],

	// Plasmids
	plasmids: [
		{
			plasmid: 'IncFIA',
			identity: 98.76,
			accession: 'AP001918',
			contig: 'contig_2',
			coverage: 100.00
		},
		{
			plasmid: 'IncFII',
			identity: 97.54,
			accession: 'AY458016',
			contig: 'contig_2',
			coverage: 99.12
		}
	],

	// QUAST
	quast: {
		contigsGe500: 78,
		contigsGe1000: 65,
		contigsGe5000: 45,
		contigsGe10000: 32,
		contigsGe25000: 18,
		contigsGe50000: 12,
		totalLengthGe0: 5156789,
		totalLengthGe1000: 5123456,
		nsPer100kb: 0.00
	},

	// Plasmid contigs
	plasmidContigs: [
		{
			name: 'contig_2',
			size: 98765,
			type: 'IncFIA/IncFII',
			mobility: 'conjugative'
		}
	],

	// Bandage
	bandage: {
		nodes: 178,
		edges: 234,
		components: 2,
		deadEnds: 8,
		circularContigs: 1,
		largestComponentSize: 5023456,
		largestComponentSegments: 175
	}
};

/**
 * Plant Pathogen
 *
 * Xanthomonas citri causing citrus canker
 * Technology: Illumina HiSeq X, 150bp paired-end
 */
export const plant: StorylineStats = {
	// Basic info
	samplePrefix: 'XCC_Citrus_01',
	organism: 'Xanthomonas citri',
	organismShort: 'X. citri',

	// Sequencing stats
	totalReads: 1567890,
	readLength: 149,
	minLen: 35,
	maxLen: 151,
	gcContent: 64.7,
	q20Percent: 98.1,
	q30Percent: 95.3,

	// Trimmomatic
	trimBothSurvivingPercent: 99.45,
	trimForwardOnlyPercent: 0.28,
	trimReverseOnlyPercent: 0.01,
	trimDroppedPercent: 0.26,

	// Assembly - near complete
	assemblySize: 5234789,
	numContigs: 12,
	numContigsAll: 25,
	n50: 1234567,
	n75: 876543,
	l50: 2,
	l75: 4,
	largestContig: 2345678,
	assemblyGC: 64.82,
	numCircular: 1,
	numComponents: 2,

	// Annotation
	numCDS: 4321,
	numtRNA: 54,
	numrRNA: 6,
	numtmRNA: 1,
	numMiscRNA: 0,
	numCRISPR: 0,

	// CheckM2
	checkm: {
		completeness: 99.95,
		contamination: 0.15,
		strain_heterogeneity: 0.00,
		quality: 'High'
	},

	// MLST
	mlst: {
		scheme: 'xanthomonas',
		st: 'ST1',
		alleles: {
			atpD: 1,
			dnaK: 1,
			efp: 1,
			gyrB: 1,
			lepA: 1,
			recA: 1
		},
		significance: 'Citrus canker pathotype A'
	},

	// AMR - limited resistance
	amrDatabase: 'ncbi',
	amrGenes: [
		{
			gene: 'strA',
			coverage: 100.00,
			identity: 99.87,
			accession: 'NG_047514.1',
			product: 'Streptomycin phosphotransferase',
			resistance: 'AMINOGLYCOSIDE',
			contig: 'contig_1',
			start: 1234567,
			end: 1235370,
			strand: '+'
		},
		{
			gene: 'strB',
			coverage: 100.00,
			identity: 99.64,
			accession: 'NG_047515.1',
			product: 'Streptomycin phosphotransferase',
			resistance: 'AMINOGLYCOSIDE',
			contig: 'contig_1',
			start: 1235890,
			end: 1236726,
			strand: '+'
		},
		{
			gene: 'sul1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050126.1',
			product: 'Sulfonamide resistance',
			resistance: 'SULFONAMIDE',
			contig: 'contig_2',
			start: 12345,
			end: 13179,
			strand: '+'
		}
	],

	// Plasmids
	plasmids: [
		{
			plasmid: 'pXCV',
			identity: 98.45,
			accession: 'AM039952',
			contig: 'contig_2',
			coverage: 99.78
		}
	],

	// QUAST
	quast: {
		contigsGe500: 12,
		contigsGe1000: 12,
		contigsGe5000: 10,
		contigsGe10000: 8,
		contigsGe25000: 6,
		contigsGe50000: 5,
		totalLengthGe0: 5245678,
		totalLengthGe1000: 5234789,
		nsPer100kb: 0.00
	},

	// Plasmid contigs
	plasmidContigs: [
		{
			name: 'contig_2',
			size: 34567,
			type: 'pXCV',
			mobility: 'non-mobilizable'
		}
	],

	// Bandage
	bandage: {
		nodes: 45,
		edges: 56,
		components: 2,
		deadEnds: 2,
		circularContigs: 1,
		largestComponentSize: 5200222,
		largestComponentSegments: 43
	}
};

/**
 * Fish Pathogen
 *
 * Aeromonas salmonicida from salmon farm outbreak
 * Technology: Illumina MiSeq, 300bp paired-end
 */
export const fish: StorylineStats = {
	// Basic info
	samplePrefix: 'AS_Salmon_07',
	organism: 'Aeromonas salmonicida',
	organismShort: 'A. salmonicida',

	// Sequencing stats
	totalReads: 923456,
	readLength: 295,
	minLen: 35,
	maxLen: 301,
	gcContent: 58.3,
	q20Percent: 95.6,
	q30Percent: 89.8,

	// Trimmomatic
	trimBothSurvivingPercent: 97.89,
	trimForwardOnlyPercent: 0.98,
	trimReverseOnlyPercent: 0.08,
	trimDroppedPercent: 1.05,

	// Assembly
	assemblySize: 4702345,
	numContigs: 56,
	numContigsAll: 98,
	n50: 345678,
	n75: 187654,
	l50: 5,
	l75: 9,
	largestContig: 678901,
	assemblyGC: 58.45,
	numCircular: 1,
	numComponents: 3,

	// Annotation
	numCDS: 4123,
	numtRNA: 72,
	numrRNA: 19,
	numtmRNA: 1,
	numMiscRNA: 0,
	numCRISPR: 1,

	// CheckM2
	checkm: {
		completeness: 99.45,
		contamination: 0.56,
		strain_heterogeneity: 0.00,
		quality: 'High'
	},

	// MLST
	mlst: {
		scheme: 'aeromonas',
		st: 'ST3',
		alleles: {
			gyrB: 3,
			groL: 2,
			gltA: 1,
			metG: 4,
			ppsA: 2,
			recA: 3
		},
		significance: 'Furunculosis outbreak strain'
	},

	// AMR
	amrDatabase: 'ncbi',
	amrGenes: [
		{
			gene: 'tetA',
			coverage: 100.00,
			identity: 99.58,
			accession: 'NG_048252.1',
			product: 'Tetracycline efflux pump',
			resistance: 'TETRACYCLINE',
			contig: 'contig_1',
			start: 1234567,
			end: 1235768,
			strand: '+'
		},
		{
			gene: 'tetR',
			coverage: 100.00,
			identity: 99.82,
			accession: 'NG_048253.1',
			product: 'Tetracycline repressor',
			resistance: 'TETRACYCLINE',
			contig: 'contig_1',
			start: 1235890,
			end: 1236540,
			strand: '-'
		},
		{
			gene: 'floR',
			coverage: 100.00,
			identity: 99.34,
			accession: 'NG_047954.1',
			product: 'Chloramphenicol/florfenicol efflux',
			resistance: 'PHENICOL',
			contig: 'contig_1',
			start: 2345678,
			end: 2346891,
			strand: '+'
		},
		{
			gene: 'sul2',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050127.1',
			product: 'Sulfonamide resistance',
			resistance: 'SULFONAMIDE',
			contig: 'contig_2',
			start: 23456,
			end: 24268,
			strand: '+'
		},
		{
			gene: 'aadA1',
			coverage: 100.00,
			identity: 99.75,
			accession: 'NG_047229.1',
			product: 'Streptomycin adenylyltransferase',
			resistance: 'AMINOGLYCOSIDE',
			contig: 'contig_2',
			start: 25678,
			end: 26469,
			strand: '+'
		}
	],

	// Plasmids
	plasmids: [
		{
			plasmid: 'pAsa5',
			identity: 97.89,
			accession: 'CP000646',
			contig: 'contig_2',
			coverage: 98.76
		}
	],

	// QUAST
	quast: {
		contigsGe500: 56,
		contigsGe1000: 48,
		contigsGe5000: 35,
		contigsGe10000: 25,
		contigsGe25000: 18,
		contigsGe50000: 12,
		totalLengthGe0: 4723456,
		totalLengthGe1000: 4702345,
		nsPer100kb: 0.00
	},

	// Plasmid contigs
	plasmidContigs: [
		{
			name: 'contig_2',
			size: 67890,
			type: 'pAsa5',
			mobility: 'mobilizable'
		}
	],

	// Bandage
	bandage: {
		nodes: 134,
		edges: 167,
		components: 3,
		deadEnds: 6,
		circularContigs: 1,
		largestComponentSize: 4601234,
		largestComponentSegments: 128
	}
};

/**
 * Foodborne Outbreak
 *
 * Salmonella enterica from contaminated lettuce
 * Technology: Illumina NovaSeq 6000, 150bp paired-end
 */
export const foodborne: StorylineStats = {
	// Basic info
	samplePrefix: 'SE_Lettuce_12',
	organism: 'Salmonella enterica',
	organismShort: 'S. enterica',

	// Sequencing stats
	totalReads: 2345678,
	readLength: 150,
	minLen: 35,
	maxLen: 151,
	gcContent: 52.2,
	q20Percent: 98.3,
	q30Percent: 95.7,

	// Trimmomatic
	trimBothSurvivingPercent: 99.34,
	trimForwardOnlyPercent: 0.35,
	trimReverseOnlyPercent: 0.01,
	trimDroppedPercent: 0.30,

	// Assembly - complete
	assemblySize: 4857234,
	numContigs: 8,
	numContigsAll: 15,
	n50: 2456789,
	n75: 1234567,
	l50: 1,
	l75: 2,
	largestContig: 2987654,
	assemblyGC: 52.15,
	numCircular: 1,
	numComponents: 2,

	// Annotation
	numCDS: 4567,
	numtRNA: 84,
	numrRNA: 22,
	numtmRNA: 1,
	numMiscRNA: 0,
	numCRISPR: 0,

	// CheckM2
	checkm: {
		completeness: 99.98,
		contamination: 0.12,
		strain_heterogeneity: 0.00,
		quality: 'High'
	},

	// MLST - Typhimurium
	mlst: {
		scheme: 'senterica',
		st: 'ST19',
		alleles: {
			aroC: 10,
			dnaN: 7,
			hemD: 12,
			hisD: 9,
			purE: 5,
			sucA: 9,
			thrA: 2
		},
		significance: 'Salmonella Typhimurium - common foodborne strain'
	},

	// AMR
	amrDatabase: 'ncbi',
	amrGenes: [
		{
			gene: 'blaTEM-1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050145.1',
			product: 'TEM-1 beta-lactamase',
			resistance: 'BETA-LACTAM',
			contig: 'contig_1',
			start: 1234567,
			end: 1235428,
			strand: '+'
		},
		{
			gene: 'strA',
			coverage: 100.00,
			identity: 99.75,
			accession: 'NG_047514.1',
			product: 'Streptomycin phosphotransferase',
			resistance: 'AMINOGLYCOSIDE',
			contig: 'contig_1',
			start: 2345678,
			end: 2346481,
			strand: '+'
		},
		{
			gene: 'strB',
			coverage: 100.00,
			identity: 99.88,
			accession: 'NG_047515.1',
			product: 'Streptomycin phosphotransferase',
			resistance: 'AMINOGLYCOSIDE',
			contig: 'contig_1',
			start: 2346890,
			end: 2347726,
			strand: '+'
		},
		{
			gene: 'sul2',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050127.1',
			product: 'Sulfonamide resistance',
			resistance: 'SULFONAMIDE',
			contig: 'contig_1',
			start: 3456789,
			end: 3457601,
			strand: '+'
		},
		{
			gene: 'tet(B)',
			coverage: 100.00,
			identity: 99.67,
			accession: 'NG_048254.1',
			product: 'Tetracycline efflux pump',
			resistance: 'TETRACYCLINE',
			contig: 'contig_2',
			start: 12345,
			end: 13551,
			strand: '+'
		},
		{
			gene: 'floR',
			coverage: 100.00,
			identity: 99.51,
			accession: 'NG_047954.1',
			product: 'Chloramphenicol/florfenicol efflux',
			resistance: 'PHENICOL',
			contig: 'contig_2',
			start: 23456,
			end: 24669,
			strand: '-'
		}
	],

	// Plasmids
	plasmids: [
		{
			plasmid: 'IncFIB(S)',
			identity: 98.45,
			accession: 'FN432031',
			contig: 'contig_2',
			coverage: 100.00
		},
		{
			plasmid: 'IncFII(S)',
			identity: 99.12,
			accession: 'CP000858',
			contig: 'contig_2',
			coverage: 99.56
		}
	],

	// QUAST
	quast: {
		contigsGe500: 8,
		contigsGe1000: 8,
		contigsGe5000: 7,
		contigsGe10000: 6,
		contigsGe25000: 5,
		contigsGe50000: 4,
		totalLengthGe0: 4867890,
		totalLengthGe1000: 4857234,
		nsPer100kb: 0.00
	},

	// Plasmid contigs
	plasmidContigs: [
		{
			name: 'contig_2',
			size: 123456,
			type: 'IncFIB(S)/IncFII(S)',
			mobility: 'conjugative'
		}
	],

	// Bandage
	bandage: {
		nodes: 28,
		edges: 34,
		components: 2,
		deadEnds: 2,
		circularContigs: 1,
		largestComponentSize: 4733778,
		largestComponentSegments: 26
	},

	// Snippy - outbreak variants
	snippy: {
		totalVariants: 45,
		snps: 38,
		insertions: 4,
		deletions: 3,
		complex: 0
	}
};

/**
 * Wastewater Surveillance
 *
 * E. coli from wastewater treatment plant
 * Technology: Illumina NextSeq 2000, 150bp paired-end
 */
export const wastewater: StorylineStats = {
	// Basic info
	samplePrefix: 'WW_EC_089',
	organism: 'Escherichia coli',
	organismShort: 'E. coli',

	// Sequencing stats
	totalReads: 1876543,
	readLength: 149,
	minLen: 35,
	maxLen: 151,
	gcContent: 50.5,
	q20Percent: 97.8,
	q30Percent: 94.5,

	// Trimmomatic
	trimBothSurvivingPercent: 99.21,
	trimForwardOnlyPercent: 0.41,
	trimReverseOnlyPercent: 0.02,
	trimDroppedPercent: 0.36,

	// Assembly - draft
	assemblySize: 5345678,
	numContigs: 125,
	numContigsAll: 234,
	n50: 156789,
	n75: 87654,
	l50: 12,
	l75: 25,
	largestContig: 456789,
	assemblyGC: 50.72,
	numCircular: 0,
	numComponents: 4,

	// Annotation
	numCDS: 5012,
	numtRNA: 86,
	numrRNA: 22,
	numtmRNA: 1,
	numMiscRNA: 0,
	numCRISPR: 2,

	// CheckM2
	checkm: {
		completeness: 98.76,
		contamination: 1.24,
		strain_heterogeneity: 12.50,
		quality: 'Medium'
	},

	// MLST
	mlst: {
		scheme: 'ecoli',
		st: 'ST38',
		alleles: {
			adk: 4,
			fumC: 26,
			gyrB: 2,
			icd: 25,
			mdh: 5,
			purA: 5,
			recA: 19
		},
		significance: 'Environmental MDR clone - AMR surveillance priority'
	},

	// AMR - extensive resistance
	amrDatabase: 'ncbi',
	amrGenes: [
		{
			gene: 'blaCTX-M-15',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_048931.1',
			product: 'CTX-M-15 ESBL',
			resistance: 'BETA-LACTAM',
			contig: 'contig_1',
			start: 1234567,
			end: 1235443,
			strand: '+'
		},
		{
			gene: 'blaTEM-1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050145.1',
			product: 'TEM-1 beta-lactamase',
			resistance: 'BETA-LACTAM',
			contig: 'contig_2',
			start: 12345,
			end: 13206,
			strand: '+'
		},
		{
			gene: 'blaOXA-1',
			coverage: 100.00,
			identity: 99.62,
			accession: 'NG_049571.1',
			product: 'OXA-1 beta-lactamase',
			resistance: 'BETA-LACTAM',
			contig: 'contig_2',
			start: 23456,
			end: 24237,
			strand: '-'
		},
		{
			gene: 'aac(6\')-Ib-cr',
			coverage: 100.00,
			identity: 99.83,
			accession: 'NG_047268.1',
			product: 'Aminoglycoside/fluoroquinolone acetyltransferase',
			resistance: 'AMINOGLYCOSIDE;FLUOROQUINOLONE',
			contig: 'contig_2',
			start: 34567,
			end: 35167,
			strand: '+'
		},
		{
			gene: 'qnrS1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_047536.1',
			product: 'Quinolone resistance protein',
			resistance: 'QUINOLONE',
			contig: 'contig_3',
			start: 12345,
			end: 12995,
			strand: '+'
		},
		{
			gene: 'sul1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050126.1',
			product: 'Sulfonamide resistance',
			resistance: 'SULFONAMIDE',
			contig: 'contig_3',
			start: 23456,
			end: 24290,
			strand: '+'
		},
		{
			gene: 'sul2',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050127.1',
			product: 'Sulfonamide resistance',
			resistance: 'SULFONAMIDE',
			contig: 'contig_4',
			start: 12345,
			end: 13157,
			strand: '+'
		},
		{
			gene: 'dfrA14',
			coverage: 100.00,
			identity: 99.52,
			accession: 'NG_047541.1',
			product: 'Trimethoprim resistance',
			resistance: 'TRIMETHOPRIM',
			contig: 'contig_4',
			start: 23456,
			end: 23941,
			strand: '+'
		},
		{
			gene: 'tet(A)',
			coverage: 100.00,
			identity: 99.67,
			accession: 'NG_048252.1',
			product: 'Tetracycline efflux pump',
			resistance: 'TETRACYCLINE',
			contig: 'contig_4',
			start: 34567,
			end: 35768,
			strand: '-'
		},
		{
			gene: 'catB3',
			coverage: 100.00,
			identity: 99.54,
			accession: 'NG_047826.1',
			product: 'Chloramphenicol acetyltransferase',
			resistance: 'PHENICOL',
			contig: 'contig_4',
			start: 45678,
			end: 46304,
			strand: '+'
		}
	],

	// Plasmids
	plasmids: [
		{
			plasmid: 'IncFIA',
			identity: 97.65,
			accession: 'AP001918',
			contig: 'contig_2',
			coverage: 98.45
		},
		{
			plasmid: 'IncFIB',
			identity: 98.23,
			accession: 'AP001918',
			contig: 'contig_2',
			coverage: 99.12
		},
		{
			plasmid: 'IncI1',
			identity: 96.87,
			accession: 'AP005147',
			contig: 'contig_3',
			coverage: 97.65
		},
		{
			plasmid: 'Col156',
			identity: 99.45,
			accession: 'NC_009781',
			contig: 'contig_4',
			coverage: 100.00
		}
	],

	// QUAST
	quast: {
		contigsGe500: 125,
		contigsGe1000: 98,
		contigsGe5000: 56,
		contigsGe10000: 34,
		contigsGe25000: 18,
		contigsGe50000: 8,
		totalLengthGe0: 5398765,
		totalLengthGe1000: 5345678,
		nsPer100kb: 0.00
	},

	// Plasmid contigs
	plasmidContigs: [
		{
			name: 'contig_2',
			size: 145678,
			type: 'IncFIA/IncFIB',
			mobility: 'conjugative'
		},
		{
			name: 'contig_3',
			size: 87654,
			type: 'IncI1',
			mobility: 'conjugative'
		},
		{
			name: 'contig_4',
			size: 8765,
			type: 'Col156',
			mobility: 'mobilizable'
		}
	],

	// Bandage
	bandage: {
		nodes: 289,
		edges: 367,
		components: 4,
		deadEnds: 18,
		circularContigs: 0,
		largestComponentSize: 5012345,
		largestComponentSegments: 245
	}
};

/**
 * Get stats for a WGS bacteria storyline by ID
 */
export function getWgsBacteriaStats(storylineId: string): StorylineStats {
	switch (storylineId) {
		case 'hospital':
			return hospital;
		case 'clinical':
			return clinical;
		case 'plant':
			return plant;
		case 'fish':
			return fish;
		case 'foodborne':
			return foodborne;
		case 'wastewater':
			return wastewater;
		default:
			return hospital;
	}
}

// Export all stats for direct access
export const wgsBacteriaStats: Record<string, StorylineStats> = {
	hospital,
	clinical,
	plant,
	fish,
	foodborne,
	wastewater
};
