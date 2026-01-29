import { writable, derived, get } from 'svelte/store';

// Types
export interface OutputData {
	type: string;
	title: string;
	tool: string;
	summary?: Record<string, string>;
	chartData?: any;
	files?: Array<{ name: string; type: string; size: string }>;
	// PDF report specific fields
	isPdfReport?: boolean;
	pdfTitle?: string | null;
	pdfPages?: number | null;
	pdfSize?: string | null;
	pdfSections?: Array<{ title: string; figures: number }> | null;
}

export interface TerminalState {
	isRunning: boolean;
	currentCommand: string;
	progress: number;
	estimatedTime: number;
}

export interface FileNote {
	name: string;
	description: string;
	format?: string;
}

// Output panel data - starts empty
export const outputData = writable<OutputData | null>(null);

// Terminal state
export const terminalState = writable<TerminalState>({
	isRunning: false,
	currentCommand: '',
	progress: 0,
	estimatedTime: 0
});

// Stop signal - increment to trigger stop
export const stopSignal = writable<number>(0);

// Track executed commands for dynamic filesystem
export const executedCommands = writable<string[]>([]);

// Track current directory for directory awareness
export const currentDirectory = writable<string>('/data/outbreak_investigation');

// Storyline's data directory (the "home" directory for the current storyline)
// This determines what ~ maps to in the terminal
export const storylineDataDir = writable<string>('/data/outbreak_investigation');

// Storyline context for template file fetching
// This tells the app which category/storyline to fetch template files from
export interface StorylineContext {
	category: string;  // e.g., 'tutorial', 'wgs_bacteria', 'amplicon_bacteria'
	storyline: string; // e.g., 'kpneumoniae_demo', 'hospital', 'gut'
}
export const storylineContext = writable<StorylineContext | null>(null);

// API base URL for template fetching
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api';

// Store for dynamically fetched template files
// Structure: { toolName: [filenames] }
export const templateFiles = writable<Record<string, string[]>>({});

// Root files from template (files directly in storyline folder, like o_bandage.png)
export const templateRootFiles = writable<string[]>([]);

// Track current step in story (for hiding next steps)
export const currentStoryStep = writable<number>(0);
export const executedSteps = writable<Set<number>>(new Set());

// Command history
export const commandHistory = writable<string[]>([]);

// File notes/descriptions for Notes tab
export const fileNotes: Record<string, FileNote[]> = {
	'seqkit': [
		{
			name: 'num_seqs',
			description: 'Number of sequences/reads',
		},
		{
			name: 'sum_len',
			description: 'Total length of all sequences (bp)',
		},
		{
			name: 'min_len',
			description: 'Shortest read length (bp)',
		},
		{
			name: 'avg_len',
			description: 'Average read length (bp)',
		},
		{
			name: 'max_len',
			description: 'Longest read length (bp)',
		}
	],
	'fastqc': [
		{
			name: 'FASTQ Format',
			description: 'FASTQ files contain 4 lines per read: @header, sequence, +, quality scores (Phred+33 encoded)',
			format: '.fastq.gz'
		},
		{
			name: 'Quality Scores',
			description: 'Phred scores (Q) indicate base call accuracy: Q30 = 99.9% accuracy, Q20 = 99% accuracy. Scores above Q30 are excellent; Q20-Q30 is acceptable.',
		},
		{
			name: 'GC Content',
			description: 'Expected GC% varies by organism. Many bacteria cluster ~40-60%. Unexpected GC% may indicate contamination.',
		},
		{
			name: 'Adapter Content',
			description: 'Adapter sequences appear when read length exceeds insert size. <5% adapter content is acceptable; higher values require trimming before assembly. Note: In this tutorial, adapter content is negligible as reads were pre-processed prior to NCBI submission.',
		},
		{
			name: 'FastQC Report',
			description: 'HTML report showing sequence quality, sequence length distribution, GC content, adapter contamination, and sequence duplication levels',
			format: '.html'
		}
	],
	'trimmomatic': [
		{
			name: 'Input Reads',
			description: 'Total paired-end read pairs from sequencing. Each pair consists of forward (R1) and reverse (R2) reads from opposite ends of a DNA fragment.',
		},
		{
			name: 'Both Surviving',
			description: 'Read pairs where BOTH R1 and R2 passed quality filters. These are your best quality reads for assembly. >90% retention is good; >95% is excellent.',
		},
		{
			name: 'Forward Only Surviving',
			description: 'R1 (forward read) passed quality thresholds but its R2 partner was discarded due to low quality scores, adapter contamination, or being too short after trimming.',
		},
		{
			name: 'Reverse Only Surviving',
			description: 'R2 (reverse read) passed quality thresholds but its R1 partner was discarded due to low quality scores, adapter contamination, or being too short after trimming.',
		},
		{
			name: 'Dropped',
			description: 'Read pairs where BOTH R1 and R2 failed quality thresholds. Low drop rates (<2%) indicate good sequencing quality.',
		},
		{
			name: 'Quality Trimming',
			description: 'e.g. SLIDINGWINDOW:4:15 scans with 4bp window, cuts when average quality drops below Q15 (Q15 = 96.8% base call accuracy, or 1 error per ~32 bases). LEADING/TRAILING removes low quality bases from ends.',
		}
	],
	'unicycler': [
		{
			name: 'Contigs vs Scaffolds',
			description: 'Contigs are contiguous sequences assembled from overlapping reads. Scaffolds are ordered contigs connected by gaps (Ns) using paired-end or mate-pair information. Unicycler can circularize bacterial chromosomes and plasmids, which is ideal for complete genome assembly.',
			format: '.fasta'
		},
		{
			name: 'N50 Metric',
			description: 'N50 is the length such that 50% of the assembly is in contigs of this length or longer. Higher N50 = better assembly continuity.',
		}
	],
	'Bandage': [
		{
			name: 'Assembly Graph Visualization',
			description: 'Visual representation of the assembly graph showing how contigs connect. Circular paths indicate complete chromosomes/plasmids.',
		},
		{
			name: 'Dead Ends',
			description: 'Nodes with only one connection. Zero dead ends = complete assembly. Dead ends may indicate incomplete data or repetitive regions.',
		},
		{
			name: 'Graph Quality Assessment',
			description: 'Excellent: 0 dead ends, circular components, clean paths. Good: <5 dead ends. Poor: many dead ends, fragmented graph, tangled regions.',
		},
		{
			name: 'Component Count',
			description: 'Number of separate connected components. For bacteria: expect 1 chromosome + 0-5 plasmids. Many components may indicate fragmentation.',
		}
	],
	'quast': [
		{
			name: 'N50 Metric',
			description: 'N50 is the contig length where 50% of the assembly is in contigs of this size or larger. For bacterial genomes: >300kb is EXCELLENT, >100kb is GOOD, <50kb may indicate fragmentation.',
		},
		{
			name: 'N75 Metric',
			description: 'N75 is the contig length where 75% of the assembly is in contigs of this size or larger. Always ≤N50. Comparing N50 and N75 reveals assembly uniformity—similar values indicate consistent contig sizes.',
		},
		{
			name: 'L50 Metric',
			description: 'L50 is the minimum number of contigs needed to cover 50% of the assembly. Lower is better. L50 ≤10 is EXCELLENT for bacteria, indicating good contiguity.',
		},
		{
			name: 'L75 Metric',
			description: 'L75 is the minimum number of contigs needed to cover 75% of the assembly. Always ≥L50. A large gap between L50 and L75 indicates many small contigs in the assembly tail.',
		},
		{
			name: 'Minimum Contig Length',
			description: 'QUAST default minimum contig length is 500bp. Contigs shorter than this threshold are excluded from analysis. Use --min-contig flag to adjust (e.g., --min-contig 1000 for stricter filtering).',
		},
		{
			name: 'Minimum Alignment Length',
			description: 'When using a reference genome (-r), QUAST requires alignments ≥65bp by default to count as valid. Shorter alignments are ignored to reduce noise from spurious matches. Adjust with --min-alignment.',
		},
		{
			name: 'Total Length',
			description: 'Should match expected genome size for your organism. e.g. K. pneumoniae: ~5.5 Mb, E. coli: ~5.0 Mb. Large deviations may indicate contamination or incomplete assembly.',
		},
		{
			name: 'GC Content',
			description: 'GC% should match your organism. e.g. K. pneumoniae: 55-58%, E. coli: 50-51%. Unexpected GC suggests contamination or misidentification.',
		},
		{
			name: 'Quality Assessment',
			description: 'EXCELLENT: N50 >300kb, L50 ≤10, total length matches expected, correct GC%. GOOD: N50 >100kb, L50 ≤20. FAIR: N50 >50kb. POOR: highly fragmented assembly.',
		},
		{
			name: 'Extra',
			description: 'ASSEMBLY QUALITY: Compare total length to expected genome size for your organism. N50 >100kb with L50 ≤10 indicates good contiguity suitable for most downstream analyses. COMPLETENESS CHECK: Use CheckM2 or BUSCO alongside QUAST to assess gene content. CONTAMINATION: Unexpected GC%, total length significantly larger than expected, or duplicate contigs may indicate contamination—consider running CheckM2 or ConFindr. ACTIONABLE: If N50 <50kb, consider re-sequencing with higher sequencing depth or using long-read data for hybrid assembly.',
		}
	],
	'prokka': [
		{
			name: 'GFF3 Annotation',
			description: 'Standard format for genomic features including genes, CDS, rRNA, and tRNA. Can be viewed in genome browsers like IGV.',
			format: '.gff'
		},
		{
			name: 'GenBank Format',
			description: 'Contains sequence + annotations, viewable in tools like Artemis or SnapGene. Standard format for GenBank submissions.',
			format: '.gbk'
		},
		{
			name: 'Annotation Quality',
			description: 'Prokka identifies ~4000-5000 genes in typical bacterial genomes. Check for expected housekeeping genes (dnaA, gyrB, rpoB) as quality control.',
		}
	],
	'abricate': [
		{
			name: 'AMR Genes',
			description: 'Identifies antimicrobial resistance genes by searching against databases e.g. NCBI, CARD and others. In this tutorial, we only use NCBI database.',
		},
		{
			name: 'Coverage & Identity',
			description: 'Coverage >90% and Identity >90% = high confidence match. Lower values may indicate partial genes or novel variants.',
		}
	],
	'checkm2': [
		{
			name: 'Completeness',
			description: 'Percentage of expected single-copy marker genes present. >95% is high-quality, >90% is medium-quality, >50% is low-quality. 100% indicates all expected genes were found.',
		},
		{
			name: 'Contamination',
			description: 'Percentage of duplicated single-copy marker genes indicating possible contamination. <5% is high-quality, <10% is medium-quality. Values near 0% indicate a clean assembly.',
		},
		{
			name: 'Completeness Model Used',
			description: 'CheckM2 uses machine learning models (Neural Network) to predict completeness. "Specific Model" means a lineage-specific model was applied for higher accuracy.',
		},
		{
			name: 'Coding Density',
			description: 'Fraction of genome coding for proteins. Typical bacterial genomes have 85-95% coding density. Values outside this range may indicate assembly issues or contamination.',
		},
		{
			name: 'Quality Categories',
			description: 'HIGH-QUALITY: >95% complete, <5% contamination. MEDIUM-QUALITY: >50% complete, <10% contamination. LOW-QUALITY: below these thresholds.',
		},
		{
			name: 'Contig N50',
			description: 'Assembly contiguity metric. Higher N50 values indicate better assembly with longer contiguous sequences. N50 >100kb is generally good for bacterial genomes.',
		}
	],
	'plasmidfinder': [
		{
			name: 'Replicon Type',
			description: 'Plasmid replicons are classified by incompatibility (Inc) groups. Plasmids in the same Inc group cannot coexist stably in the same cell. Common types in Enterobacteriaceae: IncF, IncX, IncI, IncN, Col.',
		},
		{
			name: 'Identity Percentage',
			description: 'Sequence similarity to the reference replicon. >95% identity indicates a confident match. Lower identity may suggest novel variants or distant relatives of known replicons.',
		},
		{
			name: 'Coverage',
			description: 'Percentage of the reference replicon sequence covered by the query. 100% coverage means the entire replicon sequence was found in the assembly.',
		},
		{
			name: 'Replicons vs Plasmids',
			description: 'The number of replicons detected may differ from the number of plasmids in the assembly. This occurs because: (1) Large conjugative plasmids (especially IncF types) are modular and can carry multiple replicon sequences on a single plasmid—e.g., IncFII(K) and IncFIB(K) often co-occur on the same ~50-200 kb IncF plasmid; (2) Some plasmids may lack known replicons in the database; (3) Fragmented assemblies may split a single plasmid across multiple contigs.',
		}
	]
};

// Tool execution times (in seconds) - realistic estimates
export const toolExecutionTimes: Record<string, { min: number; max: number }> = {
	'seqkit': { min: 1, max: 3 },
	'fastqc': { min: 8, max: 15 },
	'multiqc': { min: 5, max: 10 },
	'trimmomatic': { min: 20, max: 40 },
	'fastp': { min: 15, max: 30 },
	'unicycler': { min: 120, max: 180 },  // 2-3 mins
	'Bandage': { min: 2, max: 5 },  // Graph visualization
	'quast': { min: 15, max: 30 },
	'checkm2': { min: 120, max: 180 },
	'confindr': { min: 30, max: 60 },
	'prokka': { min: 30, max: 100 },
	'bakta': { min: 40, max: 100 },  // Similar to prokka
	'abricate': { min: 2, max: 5 },
	'mlst': { min: 3, max: 8 },
	'mob_recon': { min: 30, max: 60 },
	'platon': { min: 20, max: 45 },
	'plasmidfinder': { min: 5, max: 15 },
	'resfinder': { min: 10, max: 25 },
	'virulencefinder': { min: 10, max: 20 },
	'integron_finder': { min: 30, max: 60 },
	'isescan': { min: 30, max: 60 },
	'snippy': { min: 60, max: 120 },
	'snippy-core': { min: 10, max: 20 },
	'roary': { min: 120, max: 240 },
	'iqtree': { min: 60, max: 180 },
	'gubbins': { min: 120, max: 300 },
	// Long-read tools
	'NanoPlot': { min: 20, max: 45 },
	'filtlong': { min: 15, max: 30 },
	'flye': { min: 180, max: 360 },  // 3-6 minutes
	'medaka_consensus': { min: 120, max: 240 },  // 2-4 minutes
	'porechop': { min: 20, max: 45 },
	'kraken2': { min: 30, max: 60 },
	// Amplicon/16S tools
	'cutadapt': { min: 15, max: 30 },
	'qiime': { min: 30, max: 120 },  // Varies by subcommand
	'biom': { min: 3, max: 8 },
	'sourcetracker2': { min: 60, max: 180 },
	// R/RMarkdown tools
	'Rscript': { min: 5, max: 30 }  // Varies by script complexity
};

// Get random execution time for a tool
export function getExecutionTime(tool: string): number {
	const times = toolExecutionTimes[tool] || { min: 5, max: 15 };
	return Math.floor(Math.random() * (times.max - times.min + 1)) + times.min;
}

// Allowed read-only commands (less/more are NOT available)
export const allowedCommands = new Set([
	'ls', 'cat', 'head', 'tail',
	'pwd', 'cd', 'clear', 'help',
	'wc', 'mkdir', 'cp', 'grep'
]);

// Blocked/dangerous commands
export const blockedCommands = new Set([
	'rm', 'mv', 'rmdir', 'touch',
	'chmod', 'chown', 'nano', 'vim', 'vi', 'emacs',
	'wget', 'curl', 'ssh', 'scp', 'rsync',
	'apt', 'yum', 'pip', 'npm', 'sudo', 'su'
]);

// Bioinformatics tools
export const bioTools = new Set([
	'seqkit', 'fastqc', 'multiqc', 'trimmomatic', 'fastp',
	'unicycler', 'Bandage', 'quast', 'checkm2', 'busco', 'confindr',
	'prokka', 'bakta', 'abricate', 'resfinder', 'virulencefinder', 'mlst',
	'mob_recon', 'platon', 'plasmidfinder', 'plasmidfinder.py', 'integron_finder', 'isescan',
	'snippy', 'snippy-core', 'roary', 'iqtree', 'gubbins',
	// Long-read tools (ONT)
	'NanoPlot', 'filtlong', 'flye', 'medaka_consensus', 'porechop', 'kraken2', 'modkit',
	// Long-read tools (PacBio HiFi)
	'pbmarkdup', 'ccs', 'hifiasm',
	// Amplicon/16S tools
	'cutadapt', 'qiime', 'biom', 'sourcetracker2',
	// R/RMarkdown tools
	'Rscript'
]);
