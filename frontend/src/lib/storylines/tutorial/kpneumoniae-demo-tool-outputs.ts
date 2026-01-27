/**
 * Tool outputs configuration for K. pneumoniae Demo Tutorial
 *
 * Dataset: SRR36708862 - Clinical isolate from hospital outbreak investigation
 * Technology: Illumina NovaSeq 6000, 150bp paired-end
 */

import type { StorylineStats } from '../types';

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
			contig: '35',
		},
		{
			plasmid: 'IncFIB(K)',
			identity: 98.93,
			accession: 'JN233704',
			contig: '23',
		},
		{
			plasmid: 'IncFII(K)',
			identity: 95.95,
			accession: 'CP000648',
			contig: '19',
		},
		{
			plasmid: 'IncX3',
			identity: 100.00,
			accession: 'JN247852',
			contig: '22',
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
	},

	// ============================================
	// FASTQC - Quality summary
	// ============================================
	fastqc: { r1Quality: 'PASS', r2Quality: 'PASS', adapterContent: 'Negligible' },

	// ============================================
	// MULTIQC - Aggregate stats
	// ============================================
	multiqc: {
		numSamples: 8,
		meanQualityScore: 34.2,
		meanGcContent: 55.2,
		samplesPassing: 8,
		adapterContent: 'Low (<5%)',
		sampleNames: ['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5', 'Sample 6', 'Sample 7', 'Sample 8'],
		sampleQualityScores: [34.5, 33.8, 34.2, 34.1, 33.9, 34.3, 34.0, 34.4]
	},

	// ============================================
	// CHECKM (v1) - Lineage info
	// ============================================
	checkmLineage: 'f__Enterobacteriaceae',
	checkmMarkerGenes: '104/104 found',

	// ============================================
	// CHECKM2 - Coding density
	// ============================================
	checkmCodingDensity: 88.2,

	// ============================================
	// CONFINDR - Contamination detection
	// ============================================
	confindr: {
		status: 'CLEAN',
		genusDetected: 'Klebsiella',
		rmlstGenesFound: 53,
		rmlstGenesTotal: 53,
		multiAllelicGenes: 0
	},

	// ============================================
	// BAKTA - Annotation stats
	// ============================================
	bakta: {
		totalFeatures: 5521,
		cds: 5312,
		trna: 86,
		rrna: 25,
		tmrna: 1,
		ncrna: 95,
		crispr: 2,
		functionalPercent: 88.2,
		hypotheticalPercent: 11.8
	},

	// ============================================
	// BUSCO - Completeness
	// ============================================
	busco: {
		complete: 123,
		singleCopy: 123,
		duplicated: 0,
		fragmented: 0,
		missing: 1,
		total: 124,
		dataset: 'bacteria_odb10',
		quality: 'EXCELLENT'
	}
};
