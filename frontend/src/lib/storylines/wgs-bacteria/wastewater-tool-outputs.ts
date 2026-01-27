/**
 * Tool outputs configuration for Wastewater Surveillance
 *
 * E. coli from wastewater treatment plant
 * Technology: Illumina NextSeq 2000, 150bp paired-end
 */

import type { StorylineStats } from '../types';

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
	},

	// FASTQC
	fastqc: { r1Quality: 'PASS', r2Quality: 'WARN', adapterContent: 'Low (<5%)' },

	// MULTIQC
	multiqc: {
		numSamples: 12,
		meanQualityScore: 33.9,
		meanGcContent: 50.5,
		samplesPassing: 11,
		adapterContent: 'Low (<5%)',
		sampleNames: ['WW_EC_089', 'WW_EC_090', 'WW_EC_091', 'WW_EC_092', 'WW_EC_093', 'WW_EC_094', 'WW_EC_095', 'WW_EC_096', 'WW_EC_097', 'WW_EC_098', 'WW_EC_099', 'WW_EC_100'],
		sampleQualityScores: [34.1, 33.7, 34.0, 33.5, 34.2, 33.8, 33.6, 34.3, 33.9, 34.0, 33.4, 34.1]
	},

	// CHECKM (v1)
	checkmLineage: 'f__Enterobacteriaceae',
	checkmMarkerGenes: '143/143 found',

	// CHECKM2 coding density
	checkmCodingDensity: 85.4,

	// CONFINDR
	confindr: {
		status: 'CONTAMINATED',
		genusDetected: 'Escherichia',
		rmlstGenesFound: 53,
		rmlstGenesTotal: 53,
		multiAllelicGenes: 4
	},

	// BAKTA
	bakta: {
		totalFeatures: 5235,
		cds: 5012,
		trna: 86,
		rrna: 22,
		tmrna: 1,
		ncrna: 112,
		crispr: 2,
		functionalPercent: 85.4,
		hypotheticalPercent: 14.6
	},

	// BUSCO
	busco: {
		complete: 121,
		singleCopy: 120,
		duplicated: 1,
		fragmented: 1,
		missing: 2,
		total: 124,
		dataset: 'bacteria_odb10',
		quality: 'GOOD'
	}
};
