/**
 * Tool outputs configuration for Hospital Outbreak Investigation
 *
 * K. pneumoniae carbapenem-resistant outbreak in ICU
 * Technology: Illumina MiSeq, 250bp paired-end
 */

import type { StorylineStats } from '../types';

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
	},

	// FASTQC
	fastqc: { r1Quality: 'PASS', r2Quality: 'PASS', adapterContent: 'Low (<5%)' },

	// MULTIQC
	multiqc: {
		numSamples: 6,
		meanQualityScore: 33.8,
		meanGcContent: 57.1,
		samplesPassing: 6,
		adapterContent: 'Low (<5%)',
		sampleNames: ['ICU_KP_001', 'ICU_KP_002', 'ICU_KP_003', 'ICU_KP_004', 'ICU_KP_005', 'ICU_KP_006'],
		sampleQualityScores: [33.9, 33.5, 34.0, 33.7, 33.8, 34.1]
	},

	// CHECKM (v1)
	checkmLineage: 'f__Enterobacteriaceae',
	checkmMarkerGenes: '104/104 found',

	// CHECKM2 coding density
	checkmCodingDensity: 87.5,

	// CONFINDR
	confindr: {
		status: 'CLEAN',
		genusDetected: 'Klebsiella',
		rmlstGenesFound: 53,
		rmlstGenesTotal: 53,
		multiAllelicGenes: 0
	},

	// BAKTA
	bakta: {
		totalFeatures: 5462,
		cds: 5234,
		trna: 89,
		rrna: 25,
		tmrna: 1,
		ncrna: 111,
		crispr: 2,
		functionalPercent: 87.5,
		hypotheticalPercent: 12.5
	},

	// BUSCO
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
