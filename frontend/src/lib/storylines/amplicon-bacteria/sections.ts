import type { StorylineSection } from '../types';

// ============================================
// ILLUMINA 16S AMPLICON WORKFLOW SECTIONS
// ============================================

export function createAmpliconPhase1Sections(dataDir: string): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 1: Quality Control & Pre-processing',
			text: 'Assess raw sequencing data quality and prepare reads for analysis.',
			phase: 1
		},
		{
			type: 'task',
			title: 'Step 1: Explore the Data',
			text: `Check the sequencing data statistics for your amplicon samples.`,
			command: 'seqkit stats *.fastq.gz',
			explanation: 'SeqKit provides quick statistics about all sequencing files in the directory.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'stats', desc: 'Generate sequence statistics' },
				{ name: '*.fastq.gz', desc: 'All compressed FASTQ files' }
			]
		},
		{
			type: 'task',
			title: 'Step 2: Quality Control',
			text: `Generate quality reports to assess read quality across all samples.`,
			command: 'fastqc *.fastq.gz -o qc_reports/ -t 4',
			explanation: 'FastQC identifies quality issues, adapter contamination, and per-base quality scores.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-o qc_reports/', desc: 'Output directory' },
				{ name: '-t 4', desc: 'Number of threads' }
			]
		},
		{
			type: 'task',
			title: 'Step 3: Aggregate QC Reports',
			text: `Combine all FastQC reports into a single summary.`,
			command: 'multiqc qc_reports/ -o multiqc_output/',
			explanation: 'MultiQC aggregates results from multiple samples for easy comparison.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'qc_reports/', desc: 'Input directory with FastQC reports' },
				{ name: '-o multiqc_output/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 4: Remove Primers',
			text: `Trim primer sequences from reads using Cutadapt.`,
			command:
				'cutadapt -g GTGCCAGCMGCCGCGGTAA -G GGACTACHVGGGTWTCTAAT -o trimmed/{}_R1.fastq.gz -p trimmed/{}_R2.fastq.gz *_R1.fastq.gz *_R2.fastq.gz --pair-filter=any -m 50',
			explanation: 'Cutadapt removes the 515F/806R primer sequences from V4 region amplicons.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-g/-G', desc: 'Forward/reverse primer sequences' },
				{ name: '-o/-p', desc: 'Output files for R1/R2' },
				{ name: '--pair-filter=any', desc: 'Discard pair if either read fails' },
				{ name: '-m 50', desc: 'Minimum length after trimming' }
			]
		},
		{
			type: 'task',
			title: 'Step 5: Import to QIIME2',
			text: `Import trimmed reads into QIIME2 format for downstream analysis.`,
			command:
				'qiime tools import --type "SampleData[PairedEndSequencesWithQuality]" --input-path manifest.tsv --output-path demux.qza --input-format PairedEndFastqManifestPhred33V2',
			explanation: 'QIIME2 uses artifact files (.qza) that track data provenance.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--type', desc: 'Data type being imported' },
				{ name: '--input-path', desc: 'Manifest file listing samples' },
				{ name: '--output-path', desc: 'Output artifact file' }
			]
		},
		{
			type: 'task',
			title: 'Step 6: Visualize Quality',
			text: `Generate interactive quality plots to determine trimming parameters.`,
			command: 'qiime demux summarize --i-data demux.qza --o-visualization demux.qzv',
			explanation: 'The quality plot helps decide where to truncate reads for DADA2.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-data', desc: 'Input demultiplexed data' },
				{ name: '--o-visualization', desc: 'Output visualization file' }
			]
		}
	];
}

export function createAmpliconPhase2Sections(dataDir: string): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 2: Denoising & ASV Generation',
			text: 'Generate Amplicon Sequence Variants (ASVs) using DADA2 denoising.',
			phase: 2
		},
		{
			type: 'task',
			title: 'Step 7: DADA2 Denoising',
			text: `Denoise reads and generate ASVs with DADA2.`,
			command:
				'qiime dada2 denoise-paired --i-demultiplexed-seqs demux.qza --p-trunc-len-f 240 --p-trunc-len-r 200 --p-trim-left-f 0 --p-trim-left-r 0 --o-table table.qza --o-representative-sequences rep-seqs.qza --o-denoising-stats denoising-stats.qza --p-n-threads 4',
			explanation: 'DADA2 learns error rates and identifies true biological sequences (ASVs).',
			requiredDir: dataDir,
			parameters: [
				{ name: '--p-trunc-len-f/r', desc: 'Truncation length for forward/reverse' },
				{ name: '--o-table', desc: 'Feature (ASV) count table' },
				{ name: '--o-representative-sequences', desc: 'ASV sequences' },
				{ name: '--o-denoising-stats', desc: 'Denoising statistics' }
			]
		},
		{
			type: 'task',
			title: 'Step 8: View Denoising Stats',
			text: `Examine how many reads passed each denoising step.`,
			command:
				'qiime metadata tabulate --m-input-file denoising-stats.qza --o-visualization denoising-stats.qzv',
			explanation: 'Check the percentage of reads that passed filtering, denoising, and merging.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--m-input-file', desc: 'Input denoising stats' },
				{ name: '--o-visualization', desc: 'Output visualization' }
			]
		},
		{
			type: 'task',
			title: 'Step 9: Feature Table Summary',
			text: `Summarize the ASV table to check sample depths.`,
			command:
				'qiime feature-table summarize --i-table table.qza --o-visualization table.qzv --m-sample-metadata-file metadata.tsv',
			explanation: 'Shows the number of ASVs and sequences per sample for rarefaction decisions.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-table', desc: 'Feature table' },
				{ name: '--m-sample-metadata-file', desc: 'Sample metadata' }
			]
		},
		{
			type: 'task',
			title: 'Step 10: Visualize ASV Sequences',
			text: `View representative ASV sequences.`,
			command:
				'qiime feature-table tabulate-seqs --i-data rep-seqs.qza --o-visualization rep-seqs.qzv',
			explanation: 'Shows ASV sequences for manual inspection or BLAST searching.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-data', desc: 'Representative sequences' },
				{ name: '--o-visualization', desc: 'Output visualization' }
			]
		}
	];
}

export function createAmpliconPhase3Sections(dataDir: string): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 3: Taxonomy Assignment',
			text: 'Assign taxonomic classifications to ASVs using reference databases.',
			phase: 3
		},
		{
			type: 'task',
			title: 'Step 11: Train Classifier (if needed)',
			text: `Use a pre-trained classifier or train one for your region.`,
			command:
				'qiime feature-classifier classify-sklearn --i-classifier silva-138-99-515-806-nb-classifier.qza --i-reads rep-seqs.qza --o-classification taxonomy.qza --p-n-jobs 4',
			explanation: 'The Naive Bayes classifier assigns taxonomy using the SILVA database.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-classifier', desc: 'Pre-trained classifier' },
				{ name: '--i-reads', desc: 'ASV sequences to classify' },
				{ name: '--o-classification', desc: 'Taxonomy assignments' },
				{ name: '--p-n-jobs', desc: 'Parallel jobs' }
			]
		},
		{
			type: 'task',
			title: 'Step 12: View Taxonomy',
			text: `Visualize the taxonomy assignments.`,
			command:
				'qiime metadata tabulate --m-input-file taxonomy.qza --o-visualization taxonomy.qzv',
			explanation: 'Review taxonomic assignments and confidence scores.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--m-input-file', desc: 'Taxonomy artifact' },
				{ name: '--o-visualization', desc: 'Output visualization' }
			]
		},
		{
			type: 'task',
			title: 'Step 13: Create Taxonomy Bar Plot',
			text: `Generate interactive bar plots of taxonomic composition.`,
			command:
				'qiime taxa barplot --i-table table.qza --i-taxonomy taxonomy.qza --m-metadata-file metadata.tsv --o-visualization taxa-bar-plots.qzv',
			explanation: 'Interactive bar plots show community composition at different taxonomic levels.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-table', desc: 'Feature table' },
				{ name: '--i-taxonomy', desc: 'Taxonomy assignments' },
				{ name: '--m-metadata-file', desc: 'Sample metadata' }
			]
		},
		{
			type: 'task',
			title: 'Step 14: Filter Mitochondria/Chloroplast',
			text: `Remove non-bacterial sequences from the dataset.`,
			command:
				'qiime taxa filter-table --i-table table.qza --i-taxonomy taxonomy.qza --p-exclude mitochondria,chloroplast --o-filtered-table table-filtered.qza',
			explanation: 'Removes host-derived sequences that are not part of the microbiome.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--p-exclude', desc: 'Taxa to remove' },
				{ name: '--o-filtered-table', desc: 'Filtered feature table' }
			]
		},
		{
			type: 'task',
			title: 'Step 15: Build Phylogenetic Tree',
			text: `Generate a phylogenetic tree for diversity analyses.`,
			command:
				'qiime phylogeny align-to-tree-mafft-fasttree --i-sequences rep-seqs.qza --o-alignment aligned-rep-seqs.qza --o-masked-alignment masked-aligned-rep-seqs.qza --o-tree unrooted-tree.qza --o-rooted-tree rooted-tree.qza',
			explanation: 'The phylogenetic tree is required for UniFrac distance calculations.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-sequences', desc: 'ASV sequences' },
				{ name: '--o-rooted-tree', desc: 'Rooted phylogenetic tree' }
			]
		}
	];
}

export function createAmpliconPhase4Sections(dataDir: string): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 4: Diversity Analysis',
			text: 'Calculate alpha and beta diversity metrics to compare communities.',
			phase: 4
		},
		{
			type: 'task',
			title: 'Step 16: Core Diversity Metrics',
			text: `Calculate alpha and beta diversity metrics at appropriate sampling depth.`,
			command:
				'qiime diversity core-metrics-phylogenetic --i-phylogeny rooted-tree.qza --i-table table-filtered.qza --p-sampling-depth 10000 --m-metadata-file metadata.tsv --output-dir core-metrics-results/',
			explanation: 'Calculates Shannon, Faith PD, Bray-Curtis, UniFrac, and generates PCoA plots.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-phylogeny', desc: 'Rooted tree for phylogenetic metrics' },
				{ name: '--p-sampling-depth', desc: 'Rarefaction depth' },
				{ name: '--output-dir', desc: 'Output directory for all metrics' }
			]
		},
		{
			type: 'task',
			title: 'Step 17: Alpha Diversity Statistics',
			text: `Test for significant differences in alpha diversity between groups.`,
			command:
				'qiime diversity alpha-group-significance --i-alpha-diversity core-metrics-results/shannon_vector.qza --m-metadata-file metadata.tsv --o-visualization shannon-group-significance.qzv',
			explanation: 'Kruskal-Wallis test for differences in Shannon diversity between groups.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-alpha-diversity', desc: 'Alpha diversity vector' },
				{ name: '--m-metadata-file', desc: 'Sample metadata with grouping' }
			]
		},
		{
			type: 'task',
			title: 'Step 18: Beta Diversity Statistics (PERMANOVA)',
			text: `Test if community composition differs between groups.`,
			command:
				'qiime diversity beta-group-significance --i-distance-matrix core-metrics-results/bray_curtis_distance_matrix.qza --m-metadata-file metadata.tsv --m-metadata-column group --o-visualization bray-curtis-group-significance.qzv --p-pairwise',
			explanation: 'PERMANOVA tests whether groups have different community compositions.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-distance-matrix', desc: 'Beta diversity distance matrix' },
				{ name: '--m-metadata-column', desc: 'Column to test' },
				{ name: '--p-pairwise', desc: 'Perform pairwise comparisons' }
			]
		},
		{
			type: 'task',
			title: 'Step 19: Generate PCoA Emperor Plot',
			text: `Create interactive 3D ordination plot.`,
			command:
				'qiime emperor plot --i-pcoa core-metrics-results/bray_curtis_pcoa_results.qza --m-metadata-file metadata.tsv --o-visualization bray-curtis-emperor.qzv',
			explanation: 'Emperor provides interactive 3D visualization of community differences.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--i-pcoa', desc: 'PCoA results' },
				{ name: '--m-metadata-file', desc: 'Sample metadata for coloring' }
			]
		},
		{
			type: 'task',
			title: 'Step 20: Alpha Rarefaction Plot',
			text: `Check if sequencing depth was sufficient to capture diversity.`,
			command:
				'qiime diversity alpha-rarefaction --i-table table-filtered.qza --i-phylogeny rooted-tree.qza --p-max-depth 20000 --m-metadata-file metadata.tsv --o-visualization alpha-rarefaction.qzv',
			explanation: 'Rarefaction curves should plateau if sequencing captured full diversity.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--p-max-depth', desc: 'Maximum rarefaction depth' },
				{ name: '--i-phylogeny', desc: 'Tree for Faith PD' }
			]
		}
	];
}

export function createAmpliconPhase5Sections(dataDir: string): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 5: Differential Abundance & Reporting',
			text: 'Identify differentially abundant taxa and export results.',
			phase: 5
		},
		{
			type: 'task',
			title: 'Step 21: ANCOM Differential Abundance',
			text: `Identify taxa that differ significantly between groups.`,
			command:
				'qiime composition add-pseudocount --i-table table-filtered.qza --o-composition-table comp-table.qza && qiime composition ancom --i-table comp-table.qza --m-metadata-file metadata.tsv --m-metadata-column group --o-visualization ancom-results.qzv',
			explanation: 'ANCOM identifies compositionally different taxa while handling sparsity.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'add-pseudocount', desc: 'Add pseudocounts for log-ratio' },
				{ name: 'ancom', desc: 'Analysis of composition of microbiomes' }
			]
		},
		{
			type: 'task',
			title: 'Step 22: Collapse to Genus Level',
			text: `Aggregate ASVs to genus level for cleaner visualization.`,
			command:
				'qiime taxa collapse --i-table table-filtered.qza --i-taxonomy taxonomy.qza --p-level 6 --o-collapsed-table table-genus.qza',
			explanation: 'Collapsing to genus level reduces noise and aids interpretation.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--p-level 6', desc: 'Taxonomic level (6=genus)' },
				{ name: '--o-collapsed-table', desc: 'Genus-level table' }
			]
		},
		{
			type: 'task',
			title: 'Step 23: Export for External Analysis',
			text: `Export data for analysis in R or other tools.`,
			command:
				'qiime tools export --input-path table-filtered.qza --output-path exported/ && qiime tools export --input-path taxonomy.qza --output-path exported/ && qiime tools export --input-path rooted-tree.qza --output-path exported/',
			explanation: 'Export to BIOM, TSV, and Newick formats for use in R/phyloseq.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--input-path', desc: 'QIIME2 artifact to export' },
				{ name: '--output-path', desc: 'Export directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 24: Convert BIOM to TSV',
			text: `Convert BIOM table to human-readable format.`,
			command:
				'biom convert -i exported/feature-table.biom -o exported/feature-table.tsv --to-tsv',
			explanation: 'TSV format can be opened in Excel or imported into R.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-i', desc: 'Input BIOM file' },
				{ name: '-o', desc: 'Output TSV file' },
				{ name: '--to-tsv', desc: 'Convert to tab-separated format' }
			]
		}
	];
}
