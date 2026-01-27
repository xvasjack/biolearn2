/**
 * Tool outputs configuration for Fish Pathogen
 *
 * Aeromonas salmonicida from salmon farm outbreak
 * Technology: Illumina MiSeq, 300bp paired-end
 */

import type { StorylineStats } from '../types';

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
	},

	// FASTQC
	fastqc: { r1Quality: 'PASS', r2Quality: 'WARN', adapterContent: 'Low (<5%)' },

	// MULTIQC
	multiqc: {
		numSamples: 4,
		meanQualityScore: 32.6,
		meanGcContent: 58.3,
		samplesPassing: 3,
		adapterContent: 'Low (<5%)',
		sampleNames: ['AS_Salmon_07_R1', 'AS_Salmon_07_R2', 'AS_Salmon_08_R1', 'AS_Salmon_08_R2'],
		sampleQualityScores: [33.1, 31.8, 33.4, 32.1]
	},

	// CHECKM (v1)
	checkmLineage: 'f__Aeromonadaceae',
	checkmMarkerGenes: '402/402 found',

	// CHECKM2 coding density
	checkmCodingDensity: 86.2,

	// CONFINDR
	confindr: {
		status: 'CLEAN',
		genusDetected: 'Aeromonas',
		rmlstGenesFound: 53,
		rmlstGenesTotal: 53,
		multiAllelicGenes: 0
	},

	// BAKTA
	bakta: {
		totalFeatures: 4272,
		cds: 4123,
		trna: 72,
		rrna: 19,
		tmrna: 1,
		ncrna: 56,
		crispr: 1,
		functionalPercent: 86.2,
		hypotheticalPercent: 13.8
	},

	// BUSCO
	busco: {
		complete: 122,
		singleCopy: 122,
		duplicated: 0,
		fragmented: 1,
		missing: 1,
		total: 124,
		dataset: 'bacteria_odb10',
		quality: 'EXCELLENT'
	}
};
