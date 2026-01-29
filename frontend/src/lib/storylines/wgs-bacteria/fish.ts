import type { Storyline } from '../types';

export const fish: Storyline = {
	id: 'fish',
	category: 'wgs_bacteria',
	title: 'Fish Mortality Event',
	subtitle: 'Suspected Vibrio Outbreak',
	organism: 'Vibrio vulnificus',
	technology: 'hybrid',
	technologyLabel: 'Hybrid (Illumina + ONT)',
	dataDir: '/data/outbreak_investigation',
	toolsUsed: ['seqkit', 'fastqc', 'trimmomatic', 'NanoPlot', 'filtlong', 'unicycler', 'Bandage', 'quast', 'checkm', 'busco', 'abricate', 'mlst', 'prokka', 'bakta', 'mob_recon', 'plasmidfinder', 'platon', 'snippy', 'roary', 'iqtree', 'gubbins', 'virulencefinder'],
	sections: [
		{
			type: 'intro',
			text: `EMERGENCY - Fisheries Department Report:\n\nMass fish mortality event in coastal aquaculture facilities. Over 50,000 fish have died in the past week. Preliminary tests suggest bacterial infection. Water temperatures have been unusually high.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'image',
			title: 'Affected Fish',
			text: 'Fish showing clinical signs of Vibrio infection including skin ulcerations, hemorrhaging around fins, and necrotic lesions. These symptoms are characteristic of vibriosis in aquaculture settings.',
			imageUrl: '/images/vibrio_fish.svg',
			imageAlt: 'Affected fish showing skin ulcerations, hemorrhaging, and necrotic lesions typical of Vibrio infection'
		},
		{
			type: 'context',
			text: `Samples from dead fish and water have been collected from 4 affected facilities. Initial Gram staining shows curved Gram-negative rods, suggesting Vibrio species. Your task: Identify the causative agent, assess virulence potential, and determine if environmental conditions contributed to the outbreak.`,
			hint: null,
			requiredDir: null
		},
		// Phase 1: QC & Assembly (Illumina)
		{
			type: 'phase',
			title: 'Phase 1: Quality Control & Assembly',
			text: 'Assess raw sequencing data quality and assemble the genome.',
			phase: 1
		},
		{
			type: 'task',
			title: 'Step 1: Explore the Data',
			text: `Check the sequencing data statistics.`,
			command: 'seqkit stats sample_01_R1.fastq.gz sample_01_R2.fastq.gz',
			explanation: 'SeqKit provides quick statistics about sequencing files.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'stats', desc: 'Generate sequence statistics' }
			]
		},
		{
			type: 'task',
			title: 'Step 2: Quality Control',
			text: `Generate quality reports for raw reads.`,
			command: 'fastqc sample_01_R1.fastq.gz sample_01_R2.fastq.gz -o o_fastqc/',
			explanation: 'FastQC identifies quality issues before assembly.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-o o_fastqc/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 3: Read Trimming',
			text: `Remove adapters and low-quality bases.`,
			command: 'trimmomatic PE -phred33 sample_01_R1.fastq.gz sample_01_R2.fastq.gz trimmed/sample_01_R1_paired.fq.gz trimmed/sample_01_R1_unpaired.fq.gz trimmed/sample_01_R2_paired.fq.gz trimmed/sample_01_R2_unpaired.fq.gz ILLUMINACLIP:TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36',
			explanation: 'Trimmomatic removes adapter contamination and low quality bases.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'PE', desc: 'Paired-end mode' },
				{ name: '-phred33', desc: 'Quality encoding' },
				{ name: 'ILLUMINACLIP:...', desc: 'Adapter trimming' },
				{ name: 'SLIDINGWINDOW:4:15', desc: 'Quality trimming' },
				{ name: 'MINLEN:36', desc: 'Minimum length' }
			]
		},
		{
			type: 'task',
			title: 'Step 4: Genome Assembly',
			text: `Assemble cleaned reads into contigs.`,
			command: 'unicycler -1 trimmed/sample_01_R1_paired.fq.gz -2 trimmed/sample_01_R2_paired.fq.gz -o assembly/',
			explanation: 'Unicycler produces high-quality bacterial assemblies.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-1/-2', desc: 'Forward/reverse reads' },
				{ name: '-o assembly/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 5: Visualize Assembly',
			text: `Create a visual representation of the assembly graph.`,
			command: 'Bandage image assembly/assembly.gfa assembly/o_bandage.png',
			explanation: 'Bandage visualizes assembly graphs to identify structure.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'image', desc: 'Generate image output' },
				{ name: 'assembly.gfa', desc: 'Input GFA file' }
			]
		},
		// ALERT: Fragmented assembly
		{
			type: 'alert',
			title: '⚠️ Assembly Quality Warning',
			text: `**Problem Detected:** Your Illumina assembly produced 15 contigs instead of the expected 2 circular chromosomes.\n\n**Why this happened:** Vibrio vulnificus has two chromosomes with repetitive regions that short Illumina reads (150 bp) cannot span. This causes the assembler to break at these repeat boundaries.\n\n**Assembly Statistics:**\n• Contigs: 15 (expected: 2)\n• N50: 180 kb (expected: ~3 Mb)\n• Total size: 5.0 Mb (correct)\n• Largest contig: 450 kb\n\nThis fragmented assembly can still identify the pathogen, but plasmid detection and complete genome analysis will be unreliable.`
		},
		// Decision point
		{
			type: 'decision',
			title: 'Choose How to Proceed',
			text: `Your Illumina assembly is fragmented. How would you like to proceed?`,
			options: [
				{
					id: 'continue',
					label: 'Continue with Fragmented Assembly',
					description: 'Proceed with current assembly. Results will have caveats but pathogen ID is still possible.'
				},
				{
					id: 'hybrid',
					label: 'Perform Hybrid Assembly (PacBio)',
					description: 'Use additional PacBio HiFi long reads to resolve the assembly into complete chromosomes.'
				},
				{
					id: 'stop',
					label: 'Stop Analysis',
					description: 'End the analysis here and report preliminary findings only.'
				}
			]
		},
		// Continue path context
		{
			type: 'context',
			text: `**Continuing with fragmented assembly...**\n\nNote: Some analyses may be incomplete due to the fragmented assembly. Plasmid detection and IS element analysis may give unreliable results. However, we can still:\n• Identify the pathogen species\n• Detect major virulence genes\n• Perform MLST typing\n• Build a preliminary phylogeny`
		},
		// Phase 2
		{
			type: 'phase',
			title: 'Phase 2: Quality Assessment & Screening',
			text: 'Evaluate assembly quality and screen for key markers.',
			phase: 2
		},
		{
			type: 'task',
			title: 'Step 6: Assembly Quality',
			text: `Assess assembly quality metrics.`,
			command: 'quast assembly/assembly.fasta -o quast_results/',
			explanation: 'QUAST calculates N50, total length, and other metrics.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-o quast_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 7: Genome Completeness',
			text: `Check genome completeness using marker genes.`,
			command: 'checkm lineage_wf assembly/ checkm_results/ -x fasta',
			explanation: 'CheckM estimates completeness and contamination.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'lineage_wf', desc: 'Full CheckM workflow' },
				{ name: '-x fasta', desc: 'File extension' }
			]
		},
		{
			type: 'task',
			title: 'Step 8: BUSCO Assessment',
			text: `Validate completeness with universal single-copy orthologs.`,
			command: 'busco -i assembly/assembly.fasta -o busco_results/ -m genome -l bacteria_odb10',
			explanation: 'BUSCO checks for conserved genes expected in all bacteria.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-m genome', desc: 'Genome mode' },
				{ name: '-l bacteria_odb10', desc: 'Bacteria database' }
			]
		},
		{
			type: 'task',
			title: 'Step 9: AMR Screening',
			text: `Screen for antimicrobial resistance genes.`,
			command: 'abricate --db ncbi assembly/assembly.fasta -o o_abricate/',
			explanation: 'ABRicate identifies resistance genes from databases.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--db ncbi', desc: 'Use NCBI database' },
				{ name: '-o o_abricate/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 10: MLST Typing',
			text: `Determine the sequence type.`,
			command: 'mlst assembly/assembly.fasta > o_mlst/mlst_result.tab',
			explanation: 'MLST assigns sequence types for epidemiological tracking.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '>', desc: 'Redirect output to file' }
			]
		},
		// Phase 3: Annotation
		{
			type: 'phase',
			title: 'Phase 3: Annotation & Plasmid Analysis',
			text: 'Annotate genes and identify mobile genetic elements.',
			phase: 3
		},
		{
			type: 'task',
			title: 'Step 11: Genome Annotation',
			text: `Annotate genes in the assembly.`,
			command: 'prokka --outdir prokka_results/ --prefix sample_01 assembly/assembly.fasta',
			explanation: 'Prokka identifies CDS, tRNA, and rRNA features.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--outdir prokka_results/', desc: 'Output directory' },
				{ name: '--prefix sample_01', desc: 'Output file prefix' }
			]
		},
		{
			type: 'task',
			title: 'Step 12: Detailed Annotation',
			text: `Get comprehensive annotations with Bakta.`,
			command: 'bakta assembly/assembly.fasta --output bakta_results/',
			explanation: 'Bakta provides rich functional annotations.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--output bakta_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 13: Virulence Factor Screening',
			text: `Screen for Vibrio virulence factors.`,
			command: 'virulencefinder -i assembly/assembly.fasta -o virulencefinder_results/',
			explanation: 'VirulenceFinder identifies toxins and virulence genes.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o virulencefinder_results/', desc: 'Output directory' }
			]
		},
		// Phase 4
		{
			type: 'phase',
			title: 'Phase 4: Phylogenetics',
			text: 'Build evolutionary trees and analyze population structure.',
			phase: 4
		},
		{
			type: 'task',
			title: 'Step 14: Variant Calling',
			text: `Call SNPs against the reference genome.`,
			command: 'snippy --ref reference.gbk --ctgs assembly/assembly.fasta --outdir snippy_results/',
			explanation: 'Snippy identifies SNPs, insertions, and deletions.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--ref reference.gbk', desc: 'Reference genome' },
				{ name: '--ctgs assembly/assembly.fasta', desc: 'Query contigs' },
				{ name: '--outdir snippy_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 15: Pan-genome Analysis',
			text: `Analyze the pan-genome across isolates.`,
			command: 'roary -f roary_results/ -e -n -v prokka_results/*.gff',
			explanation: 'Roary identifies core and accessory genes.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-f roary_results/', desc: 'Output directory' },
				{ name: '-e', desc: 'Create core gene alignment' },
				{ name: '-n', desc: 'Fast alignment with MAFFT' },
				{ name: '-v', desc: 'Verbose output' }
			]
		},
		{
			type: 'task',
			title: 'Step 16: Phylogenetic Tree',
			text: `Build a maximum-likelihood phylogenetic tree.`,
			command: 'iqtree -s roary_results/core_gene_alignment.aln -m GTR+G -bb 1000 -nt AUTO',
			explanation: 'IQ-TREE builds phylogenetic trees with bootstrap support.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-s roary_results/core_gene_alignment.aln', desc: 'Input alignment' },
				{ name: '-m GTR+G', desc: 'Substitution model' },
				{ name: '-bb 1000', desc: 'Bootstrap replicates' },
				{ name: '-nt AUTO', desc: 'Auto-detect threads' }
			]
		},
		{
			type: 'complete',
			title: 'Analysis Complete (Preliminary)',
			text: `You have completed the Fish Mortality Investigation with a fragmented assembly.\n\n**Assembly Result:** Incomplete - 15 contigs (fragmented due to repetitive regions)\n\n**Key findings:**\n• Identified Vibrio vulnificus (biotype 2)\n• Detected virulence genes: rtxA (cytotoxin), vvhA (hemolysin), vcgC (virulence correlated gene)\n• MLST: ST117 (associated with clinical infections)\n• Temperature-sensitive virulence regulation likely triggered by elevated water temps\n\n**Recommendations:**\n• For complete genome: Perform hybrid assembly with PacBio long reads\n• Implement water temperature monitoring (<25°C)\n• Consider prophylactic measures during warm months\n\n⚠️ Note: Plasmid analysis was limited due to fragmented assembly. Complete genome would provide more definitive results.`
		}
	]
};
