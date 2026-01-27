/**
 * Tool outputs configuration for Foodborne Outbreak
 *
 * Salmonella enterica from contaminated lettuce
 * Technology: Illumina NovaSeq 6000, 150bp paired-end
 */

import type { StorylineStats } from '../types';

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
	},

	// FASTQC
	fastqc: { r1Quality: 'PASS', r2Quality: 'PASS', adapterContent: 'Negligible' },

	// MULTIQC
	multiqc: {
		numSamples: 10,
		meanQualityScore: 35.4,
		meanGcContent: 52.2,
		samplesPassing: 10,
		adapterContent: 'Negligible',
		sampleNames: ['SE_Lettuce_01', 'SE_Lettuce_02', 'SE_Lettuce_03', 'SE_Lettuce_04', 'SE_Lettuce_05', 'SE_Lettuce_06', 'SE_Lettuce_07', 'SE_Lettuce_08', 'SE_Lettuce_09', 'SE_Lettuce_10'],
		sampleQualityScores: [35.5, 35.2, 35.6, 35.3, 35.4, 35.1, 35.7, 35.3, 35.5, 35.4]
	},

	// CHECKM (v1)
	checkmLineage: 'f__Enterobacteriaceae',
	checkmMarkerGenes: '104/104 found',

	// CHECKM2 coding density
	checkmCodingDensity: 88.6,

	// CONFINDR
	confindr: {
		status: 'CLEAN',
		genusDetected: 'Salmonella',
		rmlstGenesFound: 53,
		rmlstGenesTotal: 53,
		multiAllelicGenes: 0
	},

	// BAKTA
	bakta: {
		totalFeatures: 4780,
		cds: 4567,
		trna: 84,
		rrna: 22,
		tmrna: 1,
		ncrna: 106,
		crispr: 0,
		functionalPercent: 88.6,
		hypotheticalPercent: 11.4
	},

	// BUSCO
	busco: {
		complete: 124,
		singleCopy: 124,
		duplicated: 0,
		fragmented: 0,
		missing: 0,
		total: 124,
		dataset: 'bacteria_odb10',
		quality: 'EXCELLENT'
	}
};
