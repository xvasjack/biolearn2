// Valid files for each tool - must match exactly
export const validToolFiles: Record<string, string[]> = {
	'fastqc': [
		// Trial/Demo scenario
		'input_data/SRR36708862_1.fastq.gz', 'input_data/SRR36708862_2.fastq.gz',
		// Hospital outbreak - patient files
		'patient_01_R1.fastq.gz', 'patient_01_R2.fastq.gz',
		'patient_02_R1.fastq.gz', 'patient_02_R2.fastq.gz',
		'patient_03_R1.fastq.gz', 'patient_03_R2.fastq.gz',
		// Amplicon files
		'IBD_01_R1.fastq.gz', 'IBD_01_R2.fastq.gz', 'IBD_02_R1.fastq.gz', 'IBD_02_R2.fastq.gz',
		'Control_01_R1.fastq.gz', 'Control_01_R2.fastq.gz', 'Control_02_R1.fastq.gz', 'Control_02_R2.fastq.gz',
		'Thermo_01_R1.fastq.gz', 'Thermo_01_R2.fastq.gz', 'Vermi_01_R1.fastq.gz', 'Vermi_01_R2.fastq.gz',
		'Bokashi_01_R1.fastq.gz', 'Bokashi_01_R2.fastq.gz',
		'Municipal_R1.fastq.gz', 'Municipal_R2.fastq.gz', 'Well_R1.fastq.gz', 'Well_R2.fastq.gz',
		'Runoff_R1.fastq.gz', 'Runoff_R2.fastq.gz', 'Reference_R1.fastq.gz', 'Reference_R2.fastq.gz'
	],
	'seqkit': [
		// Trial/Demo scenario
		'input_data/SRR36708862_1.fastq.gz', 'input_data/SRR36708862_2.fastq.gz',
		// Hospital outbreak - patient files
		'patient_01_R1.fastq.gz', 'patient_01_R2.fastq.gz',
		'patient_02_R1.fastq.gz', 'patient_02_R2.fastq.gz',
		'patient_03_R1.fastq.gz', 'patient_03_R2.fastq.gz',
		// Long-read files
		'sample_01_hifi.fastq.gz', 'sample_02_hifi.fastq.gz',
		'sample_01_nanopore.fastq.gz',
		// Amplicon files
		'IBD_01_R1.fastq.gz', 'IBD_01_R2.fastq.gz', 'IBD_02_R1.fastq.gz', 'IBD_02_R2.fastq.gz',
		'Control_01_R1.fastq.gz', 'Control_01_R2.fastq.gz', 'Control_02_R1.fastq.gz', 'Control_02_R2.fastq.gz',
		'Thermo_01_R1.fastq.gz', 'Thermo_01_R2.fastq.gz', 'Vermi_01_R1.fastq.gz', 'Vermi_01_R2.fastq.gz',
		'Bokashi_01_R1.fastq.gz', 'Bokashi_01_R2.fastq.gz',
		'Municipal_R1.fastq.gz', 'Municipal_R2.fastq.gz', 'Well_R1.fastq.gz', 'Well_R2.fastq.gz',
		'Runoff_R1.fastq.gz', 'Runoff_R2.fastq.gz', 'Reference_R1.fastq.gz', 'Reference_R2.fastq.gz'
	],
	'trimmomatic': [
		// Trial/Demo scenario
		'input_data/SRR36708862_1.fastq.gz', 'input_data/SRR36708862_2.fastq.gz',
		// Hospital outbreak
		'patient_01_R1.fastq.gz', 'patient_01_R2.fastq.gz',
		'patient_02_R1.fastq.gz', 'patient_02_R2.fastq.gz',
		'patient_03_R1.fastq.gz', 'patient_03_R2.fastq.gz'
	],
	'unicycler': [
		// Trial/Demo scenario
		'o_trimmomatic/SRR36708862_R1_paired.fq.gz', 'o_trimmomatic/SRR36708862_R2_paired.fq.gz',
		// Hospital outbreak
		'trimmed/patient_01_R1_paired.fq.gz', 'trimmed/patient_01_R2_paired.fq.gz',
		'trimmed/patient_02_R1_paired.fq.gz', 'trimmed/patient_02_R2_paired.fq.gz',
		'trimmed/patient_03_R1_paired.fq.gz', 'trimmed/patient_03_R2_paired.fq.gz'
	],
	'bandage': [
		'o_unicycler/assembly.gfa', 'assembly/assembly.gfa',
		'assembly/patient_01/assembly.gfa', 'assembly/patient_02/assembly.gfa', 'assembly/patient_03/assembly.gfa'
	],
	'prokka': [
		'o_unicycler/assembly.fasta', 'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'abricate': [
		'o_unicycler/assembly.fasta', 'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'quast': [
		'o_unicycler/assembly.fasta', 'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'checkm': ['assembly/', 'polished/', 'o_unicycler/'],
	'checkm2': ['assembly/', 'polished/', 'o_unicycler/'],
	'confindr': ['assembly/assembly.fasta'],
	'bakta': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'mlst': [
		'o_unicycler/assembly.fasta', 'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	// Phase 3: Plasmid Analysis
	'mob_recon': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'platon': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'plasmidfinder': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta',
		'o_unicycler/assembly.fasta'
	],
	'plasmidfinder.py': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta',
		'o_unicycler/assembly.fasta'
	],
	// Phase 4: Phylogenetics
	'snippy': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'snippy-core': [
		'snippy_results/patient_01', 'snippy_results/patient_02', 'snippy_results/patient_03'
	],
	'roary': ['prokka_results/', 'prokka_results/patient_01/', 'prokka_results/patient_02/', 'prokka_results/patient_03/'],
	'iqtree': ['roary_results/core_gene_alignment.aln', 'core.aln'],
	'gubbins': ['roary_results/core_gene_alignment.aln', 'core.aln'],
	// Additional resistance/mobile element tools
	'resfinder': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'integron_finder': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	'isescan': [
		'assembly/assembly.fasta', 'polished/consensus.fasta',
		'assembly/patient_01/assembly.fasta', 'assembly/patient_02/assembly.fasta', 'assembly/patient_03/assembly.fasta'
	],
	// Long-read tools
	'NanoPlot': ['sample_01_hifi.fastq.gz', 'sample_02_hifi.fastq.gz', 'sample_01_nanopore.fastq.gz'],
	'filtlong': ['sample_01_hifi.fastq.gz', 'sample_01_nanopore.fastq.gz', 'trimmed/sample_01_trimmed.fastq.gz'],
	'flye': ['filtered/sample_01_filtered.fastq.gz'],
	'medaka_consensus': ['filtered/sample_01_filtered.fastq.gz', 'assembly/assembly.fasta'],
	'porechop': ['sample_01_nanopore.fastq.gz'],
	'kraken2': ['filtered/sample_01_filtered.fastq.gz'],
	// PacBio HiFi tools
	'pbmarkdup': ['sample_01_hifi.fastq.gz', 'sample_01.subreads.bam'],
	'ccs': ['sample_01.subreads.bam'],
	'hifiasm': ['sample_01_hifi.fastq.gz', 'filtered/sample_01_filtered.fastq.gz'],
	'modkit': ['sample_01_nanopore.bam', 'polished/consensus.fasta'],
	// Amplicon/16S tools
	'cutadapt': [
		'IBD_01_R1.fastq.gz', 'IBD_01_R2.fastq.gz', 'Control_01_R1.fastq.gz', 'Control_01_R2.fastq.gz',
		'Thermo_01_R1.fastq.gz', 'Thermo_01_R2.fastq.gz', 'Vermi_01_R1.fastq.gz', 'Vermi_01_R2.fastq.gz',
		'Municipal_R1.fastq.gz', 'Municipal_R2.fastq.gz', 'Well_R1.fastq.gz', 'Well_R2.fastq.gz'
	],
	'qiime': [
		'manifest.tsv', 'metadata.tsv', 'demux.qza', 'table.qza', 'rep-seqs.qza', 'taxonomy.qza',
		'table-filtered.qza', 'rooted-tree.qza', 'core-metrics-results/'
	],
	'biom': ['exported/feature-table.biom'],
	'sourcetracker2': ['exported/feature-table.biom', 'source-metadata.tsv'],
	// R/RMarkdown tools
	'Rscript': [
		'quast_results/report.tsv', 'o_abricate/summary.tsv', 'mlst_results/mlst.tsv',
		'iqtree_results/core_snps.treefile', 'phyloseq_object.rds', 'metadata.csv',
		'counts_matrix.csv', 'sample_info.csv', 'deseq2_results.rds'
	]
};

// Tool requirements: allowed directories
export const toolRequirements: Record<string, { dirs: string[] }> = {
	'fastqc': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/gut_microbiome', '/data/soil_microbiome', '/data/water_samples'] },
	'seqkit': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples', '/data/gut_microbiome', '/data/soil_microbiome', '/data/water_samples'] },
	'multiqc': { dirs: ['/data/outbreak_investigation', '/data/gut_microbiome', '/data/soil_microbiome', '/data/water_samples'] },
	'trimmomatic': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation'] },
	'unicycler': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation'] },
	'bandage': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'prokka': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'abricate': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'quast': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'checkm': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'checkm2': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'confindr': { dirs: ['/data/outbreak_investigation'] },
	'bakta': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'mlst': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	// Phase 3
	'mob_recon': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'platon': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'plasmidfinder': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'plasmidfinder.py': { dirs: ['/data/kpneumoniae_demo', '/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	// Phase 4
	'snippy': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'roary': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'iqtree': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'gubbins': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'snippy-core': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'resfinder': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'integron_finder': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'isescan': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	// Long-read tools
	'NanoPlot': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'filtlong': { dirs: ['/data/outbreak_investigation', '/data/wastewater_surveillance', '/data/clinical_samples'] },
	'flye': { dirs: ['/data/wastewater_surveillance', '/data/clinical_samples'] },
	'medaka_consensus': { dirs: ['/data/wastewater_surveillance', '/data/clinical_samples'] },
	'porechop': { dirs: ['/data/clinical_samples'] },
	'kraken2': { dirs: ['/data/clinical_samples'] },
	// PacBio HiFi tools
	'pbmarkdup': { dirs: ['/data/wastewater_surveillance'] },
	'ccs': { dirs: ['/data/wastewater_surveillance'] },
	'hifiasm': { dirs: ['/data/wastewater_surveillance'] },
	'modkit': { dirs: ['/data/clinical_samples'] },
	// Amplicon/16S tools
	'cutadapt': { dirs: ['/data/gut_microbiome', '/data/soil_microbiome', '/data/water_samples'] },
	'qiime': { dirs: ['/data/gut_microbiome', '/data/soil_microbiome', '/data/water_samples'] },
	'biom': { dirs: ['/data/gut_microbiome', '/data/soil_microbiome', '/data/water_samples'] },
	'sourcetracker2': { dirs: ['/data/water_samples'] },
	// R/RMarkdown tools
	'Rscript': { dirs: ['/data/wgs_report', '/data/amplicon_report', '/data/rnaseq_report'] }
};

// Check if file is valid for a tool
export function isValidFileForTool(tool: string, filename: string): boolean {
	const validFiles = validToolFiles[tool];
	if (!validFiles) return true;
	return validFiles.some(f => f === filename || f.endsWith(filename) || filename.endsWith(f.split('/').pop() || ''));
}
