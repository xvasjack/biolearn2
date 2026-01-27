/**
 * Tool outputs configuration for Clinical Diagnostics
 *
 * E. coli urinary tract infection isolate
 * Technology: Illumina NextSeq 550, 150bp paired-end
 */

import type { StorylineStats } from '../types';

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
	},

	// FASTQC
	fastqc: { r1Quality: 'PASS', r2Quality: 'PASS', adapterContent: 'Negligible' },

	// MULTIQC
	multiqc: {
		numSamples: 4,
		meanQualityScore: 34.5,
		meanGcContent: 50.8,
		samplesPassing: 4,
		adapterContent: 'Low (<5%)',
		sampleNames: ['UTI_EC_042_R1', 'UTI_EC_042_R2', 'UTI_EC_043_R1', 'UTI_EC_043_R2'],
		sampleQualityScores: [34.6, 34.3, 34.7, 34.4]
	},

	// CHECKM (v1)
	checkmLineage: 'f__Enterobacteriaceae',
	checkmMarkerGenes: '143/143 found',

	// CHECKM2 coding density
	checkmCodingDensity: 87.8,

	// CONFINDR
	confindr: {
		status: 'CLEAN',
		genusDetected: 'Escherichia',
		rmlstGenesFound: 53,
		rmlstGenesTotal: 53,
		multiAllelicGenes: 0
	},

	// BAKTA
	bakta: {
		totalFeatures: 4978,
		cds: 4765,
		trna: 84,
		rrna: 22,
		tmrna: 1,
		ncrna: 105,
		crispr: 1,
		functionalPercent: 87.8,
		hypotheticalPercent: 12.2
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
