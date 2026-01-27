// Shared types for all storylines

export interface StorylineSection {
	type: 'intro' | 'context' | 'task' | 'phase' | 'complete' | 'alert' | 'decision' | 'image';
	title?: string;
	text: string;
	command?: string;
	explanation?: string;
	requiredDir?: string | null;
	parameters?: { name: string; desc: string }[];
	hint?: string | null;
	phase?: number;
	imageUrl?: string;
	imageAlt?: string;
	options?: { id: string; label: string; description: string }[];
}

export interface Storyline {
	id: string;
	category: 'tutorial' | 'wgs_bacteria' | 'amplicon_bacteria' | 'reports';  // Template folder category
	templateId?: string;  // Template folder storyline ID (if different from id, e.g., 'kpneumoniae_demo' vs 'kpneumoniae-demo')
	title: string;
	subtitle: string;
	organism: string;
	technology: 'illumina' | 'pacbio' | 'nanopore' | 'hybrid' | 'r-report' | 'linux-basics';
	technologyLabel: string;
	dataDir: string;
	sections: StorylineSection[];
	toolsUsed: string[];
}

export interface StorylineSummary {
	id: string;
	title: string;
	subtitle: string;
	technology: string;
	technologyLabel: string;
}

/**
 * AMR gene entry for abricate output
 */
export interface AmrGeneEntry {
	gene: string;           // Gene name (e.g., "blaKPC-2")
	coverage: number;       // Coverage percentage (e.g., 100.00)
	identity: number;       // Identity percentage (e.g., 99.77)
	accession: string;      // Database accession (e.g., "NG_049253.1")
	product: string;        // Gene product description
	resistance: string;     // Resistance class (e.g., "CARBAPENEM")
	contig: string;         // Contig name
	start: number;          // Start position
	end: number;            // End position
	strand: '+' | '-';      // Strand orientation
}

/**
 * MLST allele profile
 */
export interface MlstProfile {
	scheme: string;         // MLST scheme name
	st: string;             // Sequence type (e.g., "ST307")
	alleles: Record<string, number>;  // Allele numbers by locus (e.g., { gapA: 4, infB: 1 })
	significance?: string;  // Clinical significance note
}

/**
 * Plasmid finding result
 */
export interface PlasmidResult {
	plasmid: string;        // Plasmid name/type
	identity: number;       // Identity percentage
	accession: string;      // Database accession
	contig: string;         // Contig where found
	coverage: number;       // Coverage percentage
}

/**
 * CheckM2 quality metrics
 */
export interface CheckmResult {
	completeness: number;   // Genome completeness (%)
	contamination: number;  // Contamination level (%)
	strain_heterogeneity: number;  // Strain heterogeneity (%)
	quality: 'High' | 'Medium' | 'Low';  // Overall quality assessment
}

/**
 * Configurable statistics for storyline-specific terminal outputs.
 * These values are used to generate realistic tool outputs that match
 * each storyline's dataset characteristics.
 */
export interface StorylineStats {
	// ============================================
	// BASIC SAMPLE INFO
	// ============================================
	samplePrefix: string;        // Sample file prefix (e.g., "SRR36708862")
	organism: string;            // Full organism name (e.g., "Klebsiella pneumoniae")
	organismShort: string;       // Short name for outputs (e.g., "K. pneumoniae")

	// ============================================
	// SEQKIT / FASTQC - Raw read statistics
	// ============================================
	totalReads: number;          // Total read pairs (e.g., 990478)
	readLength: number;          // Average read length in bp (e.g., 271)
	minLen: number;              // Minimum read length (e.g., 35)
	maxLen: number;              // Maximum read length (e.g., 301)
	gcContent: number;           // GC content percentage (e.g., 55.2)
	q20Percent: number;          // Percentage of Q20+ bases (e.g., 97.2)
	q30Percent: number;          // Percentage of Q30+ bases (e.g., 93.8)

	// ============================================
	// TRIMMOMATIC - Read trimming results
	// ============================================
	trimBothSurvivingPercent: number;   // e.g., 99.23
	trimForwardOnlyPercent: number;     // e.g., 0.47
	trimReverseOnlyPercent: number;     // e.g., 0.03
	trimDroppedPercent: number;         // e.g., 0.27

	// ============================================
	// UNICYCLER / ASSEMBLY - Assembly statistics
	// ============================================
	assemblySize: number;        // Total assembly size in bp
	numContigs: number;          // Number of contigs
	numContigsAll: number;       // All contigs including small ones
	n50: number;                 // N50 value
	n75: number;                 // N75 value
	l50: number;                 // L50 value (number of contigs for N50)
	l75: number;                 // L75 value
	largestContig: number;       // Largest contig size
	assemblyGC: number;          // Assembly GC content
	numCircular: number;         // Number of circular contigs (complete)
	numComponents: number;       // Number of graph components

	// ============================================
	// PROKKA - Annotation statistics
	// ============================================
	numCDS: number;              // Coding sequences
	numtRNA: number;             // tRNA genes
	numrRNA: number;             // rRNA genes
	numtmRNA: number;            // tmRNA genes
	numMiscRNA: number;          // Other RNA features
	numCRISPR: number;           // CRISPR arrays

	// ============================================
	// CHECKM2 - Quality assessment
	// ============================================
	checkm: CheckmResult;

	// ============================================
	// MLST - Multilocus sequence typing
	// ============================================
	mlst: MlstProfile;

	// ============================================
	// ABRICATE - AMR gene detection
	// ============================================
	amrGenes: AmrGeneEntry[];
	amrDatabase: string;         // Database used (e.g., "ncbi", "card", "resfinder")

	// ============================================
	// PLASMIDFINDER - Plasmid detection
	// ============================================
	plasmids: PlasmidResult[];

	// ============================================
	// QUAST - Assembly quality assessment
	// ============================================
	quast: {
		contigsGe500: number;      // Contigs >= 500bp
		contigsGe1000: number;     // Contigs >= 1000bp
		contigsGe5000: number;     // Contigs >= 5000bp
		contigsGe10000: number;    // Contigs >= 10000bp
		contigsGe25000: number;    // Contigs >= 25000bp
		contigsGe50000: number;    // Contigs >= 50000bp
		totalLengthGe0: number;    // Total length all contigs
		totalLengthGe1000: number; // Total length >= 1000bp
		nsPer100kb: number;        // N's per 100kb
	};

	// ============================================
	// MOB_RECON / PLATON - Plasmid analysis
	// ============================================
	plasmidContigs: {
		name: string;
		size: number;
		type: string;             // e.g., "IncFIB", "ColRNAI"
		mobility: string;         // e.g., "conjugative", "mobilizable", "non-mobilizable"
	}[];

	// ============================================
	// BANDAGE - Assembly graph statistics
	// ============================================
	bandage: {
		nodes: number;
		edges: number;
		components: number;
		deadEnds: number;
		circularContigs: number;
		largestComponentSize: number;
		largestComponentSegments: number;
	};

	// ============================================
	// FASTQC - Quality summary
	// ============================================
	fastqc?: {
		r1Quality: string;         // 'PASS' | 'WARN' | 'FAIL'
		r2Quality: string;
		adapterContent: string;    // 'Negligible', 'Low (<5%)', etc.
	};

	// ============================================
	// MULTIQC - Aggregate stats
	// ============================================
	multiqc?: {
		numSamples: number;
		meanQualityScore: number;
		meanGcContent: number;
		samplesPassing: number;
		adapterContent: string;
		sampleNames: string[];
		sampleQualityScores: number[];
	};

	// ============================================
	// CHECKM (v1) - Lineage info
	// ============================================
	checkmLineage?: string;          // e.g., 'f__Enterobacteriaceae'
	checkmMarkerGenes?: string;      // e.g., '104/104 found'

	// ============================================
	// CHECKM2 - Coding density
	// ============================================
	checkmCodingDensity?: number;    // e.g., 88.2

	// ============================================
	// CONFINDR - Contamination detection
	// ============================================
	confindr?: {
		status: string;              // 'CLEAN' | 'CONTAMINATED'
		genusDetected: string;       // e.g., 'Klebsiella'
		rmlstGenesFound: number;     // e.g., 53
		rmlstGenesTotal: number;     // e.g., 53
		multiAllelicGenes: number;   // e.g., 0
	};

	// ============================================
	// BAKTA - Annotation stats
	// ============================================
	bakta?: {
		totalFeatures: number;
		cds: number;
		trna: number;
		rrna: number;
		tmrna: number;
		ncrna: number;
		crispr: number;
		functionalPercent: number;   // e.g., 88.2
		hypotheticalPercent: number; // e.g., 11.8
	};

	// ============================================
	// BUSCO - Completeness
	// ============================================
	busco?: {
		complete: number;            // e.g., 123
		singleCopy: number;
		duplicated: number;
		fragmented: number;
		missing: number;
		total: number;               // e.g., 124
		dataset: string;             // e.g., 'bacteria_odb10'
		quality: string;             // 'EXCELLENT' | 'GOOD' | 'POOR'
	};

	// ============================================
	// SNIPPY - Variant calling (for outbreak)
	// ============================================
	snippy?: {
		totalVariants: number;
		snps: number;
		insertions: number;
		deletions: number;
		complex: number;
	};

	// ============================================
	// ROARY - Pan-genome analysis
	// ============================================
	roary?: {
		totalGenes: number;
		coreGenes: number;          // Present in all isolates
		softCoreGenes: number;      // Present in 95-99%
		shellGenes: number;         // Present in 15-95%
		cloudGenes: number;         // Present in <15%
		numIsolates: number;
	};
}
