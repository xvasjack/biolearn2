/**
 * Tool outputs configuration for Plant Pathogen
 *
 * Xanthomonas citri causing citrus canker
 * Technology: Illumina HiSeq X, 150bp paired-end
 */

import type { StorylineStats } from '../types';

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
	},

	// FASTQC
	fastqc: { r1Quality: 'PASS', r2Quality: 'PASS', adapterContent: 'Negligible' },

	// MULTIQC
	multiqc: {
		numSamples: 4,
		meanQualityScore: 35.1,
		meanGcContent: 64.7,
		samplesPassing: 4,
		adapterContent: 'Negligible',
		sampleNames: ['XCC_Citrus_01_R1', 'XCC_Citrus_01_R2', 'XCC_Citrus_02_R1', 'XCC_Citrus_02_R2'],
		sampleQualityScores: [35.2, 34.9, 35.3, 35.0]
	},

	// CHECKM (v1)
	checkmLineage: 'f__Xanthomonadaceae',
	checkmMarkerGenes: '326/326 found',

	// CHECKM2 coding density
	checkmCodingDensity: 86.9,

	// CONFINDR
	confindr: {
		status: 'CLEAN',
		genusDetected: 'Xanthomonas',
		rmlstGenesFound: 53,
		rmlstGenesTotal: 53,
		multiAllelicGenes: 0
	},

	// BAKTA
	bakta: {
		totalFeatures: 4438,
		cds: 4321,
		trna: 54,
		rrna: 6,
		tmrna: 1,
		ncrna: 56,
		crispr: 0,
		functionalPercent: 86.9,
		hypotheticalPercent: 13.1
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
