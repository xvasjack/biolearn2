import type { Storyline } from '../types';

export const kpneumoniaeDemo: Storyline = {
	id: 'kpneumoniae-demo',
	category: 'tutorial',
	templateId: 'kpneumoniae_demo',  // Template folder uses underscore
	title: 'Exploring K. pneumoniae',
	subtitle: 'Introduction to WGS Analysis',
	organism: 'Klebsiella pneumoniae',
	technology: 'illumina',
	technologyLabel: 'Illumina NextSeq 2000',
	dataDir: '/data/kpneumoniae_demo',
	toolsUsed: ['seqkit', 'fastqc', 'trimmomatic', 'unicycler', 'Bandage', 'quast', 'checkm2', 'plasmidfinder', 'abricate', 'mlst', 'prokka'],
	sections: [
		{
			type: 'intro',
			text: `<strong>Welcome to BioLearn WGS Analysis</strong>

In this introductory module, you'll learn the fundamentals of whole-genome sequencing (WGS) analysis using a <em>Klebsiella pneumoniae</em> isolate. This hands-on tutorial will guide you through the complete workflow from raw reads to annotated genome.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'context',
			text: `<strong>About <em>Klebsiella pneumoniae</em></strong>

<em>Klebsiella pneumoniae</em> is a common opportunistic, Gram-negative, encapsulated bacterium that is a major cause of hospital-acquired infections including pneumonia, urinary tract infections, and bloodstream infections. It is a critical public health concern due to the emergence of multidrug-resistant (MDR) and hypervirulent strains that are difficult to treat and associated with high mortality rates.

This dataset (SRR36708862) comes from a study investigating antibiotic resistance of clinical <em>K. pneumoniae</em> strains, helping researchers understand mechanisms of resistance (e.g., blaCTX-M, carbapenemases) and virulence factors (capsule production, fimbriae, siderophores) to inform treatment strategies.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'context',
			text: `<strong>Sample Information:</strong>

<table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody><tr><td>NCBI Accession</td><td>SRR36708862</td></tr><tr><td>Organism</td><td><em>Klebsiella pneumoniae</em></td></tr><tr><td>Platform</td><td>Illumina NextSeq 2000</td></tr><tr><td>Read Length</td><td>2 × 150 bp (paired-end)</td></tr><tr><td>Expected Genome</td><td>~5.5 Mb</td></tr></tbody></table>

<strong>Learning Objectives:</strong>
<ol><li>Assess raw sequencing data quality</li><li>Trim adapters and low-quality bases</li><li>Assemble reads into contigs</li><li>Evaluate assembly quality</li><li>Screen for antimicrobial resistance genes</li><li>Annotate the genome</li></ol>`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'phase',
			title: 'Phase 1: Quality Control',
			text: 'First, we assess the quality of our raw sequencing data before processing.',
			phase: 1
		},
		{
			type: 'task',
			title: 'Step 1: Check Sequencing Statistics',
			text: `Let's start by examining basic statistics about our sequencing data and save the results to a file.`,
			command: 'seqkit stats input_data/SRR36708862_1.fastq.gz input_data/SRR36708862_2.fastq.gz > o_seqkit/o_seqkit_stats.txt',
			explanation: 'SeqKit provides quick statistics including read count, total bases, and average read length. Output is saved to a file for reference.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: 'stats', desc: 'Generate sequence statistics' },
				{ name: 'input_data/SRR36708862_*.fastq.gz', desc: 'Input paired-end FASTQ files' },
				{ name: '> o_seqkit/o_seqkit_stats.txt', desc: 'Redirect output to file' }
			]
		},
		{
			type: 'task',
			title: 'Step 2: View Statistics Results',
			text: `Now let's view the sequencing statistics we just generated.`,
			command: 'cat o_seqkit/o_seqkit_stats.txt',
			explanation: 'This sample was sequenced as 2×150 bp paired-end on Illumina NextSeq 2000. You may notice a max read length of ~300 bp—this is because overlapping R1 and R2 reads were merged during pre-processing before we downloaded the data. For this tutorial, we are using these pre-processed FASTQ files.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: 'cat', desc: 'Concatenate and display file contents' },
				{ name: 'o_seqkit/o_seqkit_stats.txt', desc: 'The statistics output file' }
			]
		},
		{
			type: 'task',
			title: 'Step 3: Quality Control Report',
			text: `Generate detailed quality reports to identify any issues with the sequencing data.`,
			command: 'fastqc input_data/SRR36708862_1.fastq.gz input_data/SRR36708862_2.fastq.gz -o o_fastqc/',
			explanation: 'FastQC analyzes per-base quality scores, GC content, adapter contamination, and other quality metrics.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: '-o o_fastqc/', desc: 'Output directory for reports' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 2: Read Preprocessing',
			text: 'Clean the raw reads by removing adapters and low-quality bases.',
			phase: 2
		},
		{
			type: 'task',
			title: 'Step 4: Adapter Trimming',
			text: `Remove Illumina adapters and trim low-quality bases from read ends.`,
			command: 'trimmomatic PE -threads 2 -phred33 input_data/SRR36708862_1.fastq.gz input_data/SRR36708862_2.fastq.gz o_trimmomatic/SRR36708862_R1_paired.fq.gz o_trimmomatic/SRR36708862_R1_unpaired.fq.gz o_trimmomatic/SRR36708862_R2_paired.fq.gz o_trimmomatic/SRR36708862_R2_unpaired.fq.gz ILLUMINACLIP:TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36',
			explanation: 'Trimmomatic removes adapter sequences and trims bases with quality below threshold.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: 'PE', desc: 'Paired-end mode' },
				{ name: '-threads 2', desc: 'Use 2 CPU threads' },
				{ name: '-phred33', desc: 'Use Phred+33 quality encoding (standard for Illumina 1.8+)' },
				{ name: 'ILLUMINACLIP', desc: 'Remove TruSeq adapters' },
				{ name: 'SLIDINGWINDOW:4:15', desc: 'Trim when 4-base average quality < 15' },
				{ name: 'MINLEN:36', desc: 'Discard reads shorter than 36 bp' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 3: Genome Assembly',
			text: 'Assemble the cleaned reads into contiguous sequences (contigs).',
			phase: 3
		},
		{
			type: 'task',
			title: 'Step 5: De Novo Assembly',
			text: `Assemble the trimmed reads into contigs using Unicycler.`,
			command: 'unicycler -1 o_trimmomatic/SRR36708862_R1_paired.fq.gz -2 o_trimmomatic/SRR36708862_R2_paired.fq.gz -o o_unicycler/',
			explanation: 'Unicycler uses SPAdes with multiple k-mer sizes and optimizes the assembly graph.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: '-1/-2', desc: 'Forward and reverse paired reads' },
				{ name: '-o o_unicycler/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 6: Visualize Assembly Graph',
			text: `Create a visual representation of the assembly graph to understand genome structure.`,
			command: 'Bandage image o_unicycler/assembly.gfa o_bandage.png',
			explanation: 'Bandage visualizes the assembly graph showing how contigs connect.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: 'Bandage image', desc: 'Generate PNG image' },
				{ name: 'o_unicycler/assembly.gfa', desc: 'Input graph file' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 4: Assembly Quality Assessment',
			text: 'Evaluate the quality and completeness of the assembled genome.',
			phase: 4
		},
		{
			type: 'task',
			title: 'Step 7: Assembly Metrics',
			text: `Calculate assembly statistics including N50, total length, and contig count.`,
			command: 'quast o_unicycler/assembly.fasta -o o_quast/',
			explanation: 'QUAST calculates key assembly metrics to assess quality.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: 'o_unicycler/assembly.fasta', desc: 'Input assembly file' },
				{ name: '-o o_quast/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 8: Genome Completeness',
			text: `Assess genome completeness and contamination using CheckM2.`,
			command: 'checkm2 predict --input o_unicycler/ --output-directory o_checkm2/ --threads 4 -x fasta',
			explanation: 'CheckM2 uses machine learning to estimate completeness and contamination.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: '--input o_unicycler/', desc: 'Directory with assembly' },
				{ name: '--output-directory o_checkm2/', desc: 'Output directory' },
				{ name: '-x fasta', desc: 'File extension' }
			]
		},
		{
			type: 'task',
			title: 'Step 9: Plasmid Identification',
			text: `Identify plasmid replicons in the assembly to confirm which circular components are plasmids.`,
			command: 'mkdir o_plasmidfinder && plasmidfinder.py -i o_unicycler/assembly.fasta -o o_plasmidfinder',
			explanation: 'PlasmidFinder searches for known plasmid replicon sequences in the assembly to identify plasmid types.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: 'mkdir o_plasmidfinder', desc: 'Create output directory' },
				{ name: '-i', desc: 'Input assembly file' },
				{ name: '-o', desc: 'Output directory' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 5: AMR Screening & Typing',
			text: 'Screen for antimicrobial resistance genes and determine sequence type.',
			phase: 5
		},
		{
			type: 'task',
			title: 'Step 10: AMR Gene Detection',
			text: `Screen the assembly for antimicrobial resistance genes using multiple databases.`,
			command: 'abricate --db ncbi o_unicycler/assembly.fasta > o_abricate/o_abricate_ncbi.tab',
			explanation: 'ABRicate rapidly screens for resistance genes against curated databases.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: '--db ncbi', desc: 'Use NCBI AMRFinder database' },
				{ name: '> o_abricate/o_abricate_ncbi.tab', desc: 'Redirect output to file' }
			]
		},
		{
			type: 'task',
			title: 'Step 11: MLST Typing',
			text: `Determine the sequence type (ST) for epidemiological classification.`,
			command: 'mlst o_unicycler/assembly.fasta > o_mlst/mlst_result.tab',
			explanation: 'MLST identifies the allelic profile of 7 housekeeping genes to assign a sequence type.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: 'o_unicycler/assembly.fasta', desc: 'Input assembly file' },
				{ name: '> o_mlst/mlst_result.tab', desc: 'Redirect output to file' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 6: Genome Annotation',
			text: 'Identify and annotate genes in the assembled genome.',
			phase: 6
		},
		{
			type: 'task',
			title: 'Step 12: Gene Annotation',
			text: `Annotate the genome to identify coding sequences, tRNAs, and rRNAs.`,
			command: 'prokka --outdir o_prokka --prefix PROKKA o_unicycler/assembly.fasta',
			explanation: 'Prokka performs rapid prokaryotic genome annotation.',
			requiredDir: '/data/kpneumoniae_demo',
			parameters: [
				{ name: '--outdir o_prokka', desc: 'Output directory' },
				{ name: '--prefix PROKKA', desc: 'Output file prefix' },
				{ name: 'o_unicycler/assembly.fasta', desc: 'Input assembly file' }
			]
		},
		{
			type: 'complete',
			title: 'Tutorial Complete!',
			text: `**Congratulations!** You've completed the WGS analysis tutorial.\n\n---\n\n**Your Results Summary:**\n\n| Metric | Value |\n|--------|-------|\n| Input Reads | 990,478 pairs |\n| After Trimming | 982,838 pairs (99.23%) |\n| Assembly Size | 5,564,255 bp |\n| Contigs | 117 |\n| N50 | 371,705 bp |\n| GC Content | 57.18% |\n| Completeness | 100.0% |\n| Contamination | 0.16% |\n\n**Sequence Type:** ST307 (Klebsiella pneumoniae)\n\n**AMR Genes Detected:**\n• blaKPC-2 (carbapenemase)\n• blaSHV-11 (β-lactamase)\n• oqxA/oqxB (fluoroquinolone efflux)\n• fosA (fosfomycin resistance)\n\n**Annotation Summary:**\n• 5,174 coding sequences (CDS)\n• 77 tRNAs\n• 6 rRNAs\n• 1 tmRNA\n\n---\n\n**What's Next?**\nTry the **Hospital Outbreak Investigation** scenario to apply these skills to a real-world epidemiological investigation with multiple samples!`
		}
	]
};
