/**
 * Tool outputs configuration for Tutorial storylines
 *
 * Each storyline has its own stats that generate unique terminal outputs.
 * Edit the numbers here to customize what users see when running commands.
 */

import type { StorylineStats } from '../types';

/**
 * K. pneumoniae Demo Tutorial
 *
 * Dataset: SRR36708862 - Clinical isolate from hospital outbreak investigation
 * Technology: Illumina NovaSeq 6000, 150bp paired-end
 */
export const kpneumoniaeDemo: StorylineStats = {
	// ============================================
	// BASIC SAMPLE INFO
	// ============================================
	samplePrefix: 'SRR36708862',
	organism: 'Klebsiella pneumoniae',
	organismShort: 'K. pneumoniae',

	// ============================================
	// SEQKIT / FASTQC - Raw read statistics
	// ============================================
	totalReads: 990478,
	readLength: 271,
	minLen: 35,
	maxLen: 301,
	gcContent: 55.2,
	q20Percent: 97.2,
	q30Percent: 93.8,

	// ============================================
	// TRIMMOMATIC - Read trimming results
	// ============================================
	trimBothSurvivingPercent: 99.23,
	trimForwardOnlyPercent: 0.47,
	trimReverseOnlyPercent: 0.03,
	trimDroppedPercent: 0.27,

	// ============================================
	// UNICYCLER / ASSEMBLY - Assembly statistics
	// ============================================
	assemblySize: 5553065,
	numContigs: 65,
	numContigsAll: 117,
	n50: 371705,
	n75: 224673,
	l50: 6,
	l75: 10,
	largestContig: 837178,
	assemblyGC: 57.18,
	numCircular: 3,
	numComponents: 4,

	// ============================================
	// PROKKA - Annotation statistics
	// ============================================
	numCDS: 5174,
	numtRNA: 77,
	numrRNA: 6,
	numtmRNA: 1,
	numMiscRNA: 0,
	numCRISPR: 0,

	// ============================================
	// CHECKM2 - Quality assessment
	// ============================================
	checkm: {
		completeness: 100.0,
		contamination: 0.16,
		strain_heterogeneity: 0.00,
		quality: 'High'
	},

	// ============================================
	// MLST - Multilocus sequence typing
	// ============================================
	mlst: {
		scheme: 'klebsiella',
		st: 'ST307',
		alleles: {
			gapA: 4,
			infB: 1,
			mdh: 2,
			pgi: 52,
			phoE: 1,
			rpoB: 1,
			tonB: 7
		},
		significance: 'High-risk international clone'
	},

	// ============================================
	// ABRICATE - AMR gene detection
	// ============================================
	amrDatabase: 'ncbi',
	amrGenes: [
		{
			gene: 'blaNDM-7',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_049339.1',
			product: 'subclass B1 metallo-beta-lactamase NDM-7',
			resistance: 'CARBAPENEM',
			contig: 'contig_1',
			start: 2466,
			end: 3278,
			strand: '+'
		},
		{
			gene: 'blaTEM-1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050145.1',
			product: 'broad-spectrum class A beta-lactamase TEM-1',
			resistance: 'BETA-LACTAM',
			contig: 'contig_1',
			start: 3659,
			end: 4519,
			strand: '-'
		},
		{
			gene: 'fosA6',
			coverage: 100.00,
			identity: 99.76,
			accession: 'NG_051497.1',
			product: 'fosfomycin resistance glutathione transferase FosA6',
			resistance: 'FOSFOMYCIN',
			contig: 'contig_1',
			start: 354542,
			end: 354961,
			strand: '-'
		},
		{
			gene: 'qnrB1',
			coverage: 100.00,
			identity: 100.00,
			accession: 'NG_050469.1',
			product: 'quinolone resistance pentapeptide repeat protein QnrB1',
			resistance: 'QUINOLONE',
			contig: 'contig_1',
			start: 492,
			end: 1136,
			strand: '+'
		},
		{
			gene: "aph(3'')-Ib",
			coverage: 99.88,
			identity: 99.88,
			accession: 'NG_048025.1',
			product: "aminoglycoside O-phosphotransferase APH(3'')-Ib",
			resistance: 'QUINOLONE',
			contig: 'contig_1',
			start: 1300,
			end: 2102,
			strand: '+'
		}
	],

	// ============================================
	// PLASMIDFINDER - Plasmid detection
	// ============================================
	plasmids: [
		{
			plasmid: 'Col440I',
			identity: 97.37,
			accession: 'CP023920.1',
			contig: 'contig_2',
			coverage: 100.00
		},
                {
                        plasmid: 'IncFIB(K)',
                        identity: 98.93,
                        accession: 'JN233704',
                        contig: 'contig_2',
                        coverage: 100.00
                },
                {
                        plasmid: 'IncFII(K)',
                        identity: 95.95,
                        accession: 'CP000648',
                        contig: 'contig_2',
                        coverage: 100.00
                },
		{
			plasmid: 'IncX3',
			identity: 100.00,
			accession: 'JN247852',
			contig: 'contig_3',
			coverage: 98.45
		}
	],

	// ============================================
	// QUAST - Assembly quality assessment
	// ============================================
	quast: {
		contigsGe500: 65,
		contigsGe1000: 57,
		contigsGe5000: 33,
		contigsGe10000: 29,
		contigsGe25000: 24,
		contigsGe50000: 18,
		totalLengthGe0: 5564255,
		totalLengthGe1000: 5547651,
		nsPer100kb: 0.00
	},

	// ============================================
	// MOB_RECON / PLATON - Plasmid analysis
	// ============================================
	plasmidContigs: [
		{
			name: 'contig_2',
			size: 5409,
			type: 'IncFIB(K)',
			mobility: 'conjugative'
		},
		{
			name: 'contig_3',
			size: 4315,
			type: 'ColRNAI',
			mobility: 'mobilizable'
		},
		{
			name: 'contig_4',
			size: 2532,
			type: 'Unknown',
			mobility: 'non-mobilizable'
		}
	],

	// ============================================
	// BANDAGE - Assembly graph statistics
	// ============================================
	bandage: {
		nodes: 189,
		edges: 243,
		components: 4,
		deadEnds: 6,
		circularContigs: 3,
		largestComponentSize: 5553813,
		largestComponentSegments: 186
	}
};

/**
 * Get stats for a tutorial storyline by ID
 */
export function getTutorialStats(storylineId: string): StorylineStats {
	switch (storylineId) {
		case 'kpneumoniae-demo':
		case 'kpneumoniae_demo':
			return kpneumoniaeDemo;
		default:
			return kpneumoniaeDemo;
	}
}

// Export all stats for direct access
export const tutorialStats: Record<string, StorylineStats> = {
	'kpneumoniae-demo': kpneumoniaeDemo,
	'kpneumoniae_demo': kpneumoniaeDemo
};
