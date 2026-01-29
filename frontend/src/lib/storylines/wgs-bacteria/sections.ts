// Shared section creator functions for WGS Bacteria storylines

import type { StorylineSection } from '../types';

// ============================================
// ILLUMINA WORKFLOW SECTIONS
// ============================================

export function createIlluminaPhase1Sections(): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 1: Quality Control & Assembly',
			text: 'Assess raw sequencing data quality and assemble the genome for all 3 patient isolates.',
			phase: 1
		},
		{
			type: 'task',
			title: 'Step 1: Explore the Data',
			text: `Check the sequencing data statistics for all patient samples.`,
			command: 'seqkit stats *.fastq.gz',
			explanation: 'SeqKit provides quick statistics about sequencing files. Using wildcard (*) processes all FASTQ files at once.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'stats', desc: 'Generate sequence statistics' },
				{ name: '*.fastq.gz', desc: 'Wildcard matching all FASTQ files' }
			]
		},
		{
			type: 'task',
			title: 'Step 2: Quality Control',
			text: `Generate quality reports for all raw reads.`,
			command: 'fastqc *.fastq.gz -o qc_reports/',
			explanation: 'FastQC identifies quality issues before assembly. Running on all samples simultaneously.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '*.fastq.gz', desc: 'All FASTQ files' },
				{ name: '-o qc_reports/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 3: Aggregate QC Reports',
			text: `Combine all FastQC reports into a single summary.`,
			command: 'multiqc qc_reports/ -o multiqc_output/',
			explanation: 'MultiQC aggregates results from multiple samples for easy comparison.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'qc_reports/', desc: 'Input directory with FastQC reports' },
				{ name: '-o multiqc_output/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 4: Read Trimming (Patient 01)',
			text: `Remove adapters and low-quality bases from Patient 01 reads.`,
			command: 'trimmomatic PE -phred33 patient_01_R1.fastq.gz patient_01_R2.fastq.gz trimmed/patient_01_R1_paired.fq.gz trimmed/patient_01_R1_unpaired.fq.gz trimmed/patient_01_R2_paired.fq.gz trimmed/patient_01_R2_unpaired.fq.gz ILLUMINACLIP:TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36',
			explanation: 'Trimmomatic removes adapter contamination and low quality bases. Processing Patient 01.',
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
			title: 'Step 5: Read Trimming (Patient 02)',
			text: `Trim Patient 02 reads.`,
			command: 'trimmomatic PE -phred33 patient_02_R1.fastq.gz patient_02_R2.fastq.gz trimmed/patient_02_R1_paired.fq.gz trimmed/patient_02_R1_unpaired.fq.gz trimmed/patient_02_R2_paired.fq.gz trimmed/patient_02_R2_unpaired.fq.gz ILLUMINACLIP:TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36',
			explanation: 'Processing Patient 02 with the same trimming parameters.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'PE', desc: 'Paired-end mode' }
			]
		},
		{
			type: 'task',
			title: 'Step 6: Read Trimming (Patient 03)',
			text: `Trim Patient 03 reads.`,
			command: 'trimmomatic PE -phred33 patient_03_R1.fastq.gz patient_03_R2.fastq.gz trimmed/patient_03_R1_paired.fq.gz trimmed/patient_03_R1_unpaired.fq.gz trimmed/patient_03_R2_paired.fq.gz trimmed/patient_03_R2_unpaired.fq.gz ILLUMINACLIP:TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36',
			explanation: 'Processing Patient 03 with the same trimming parameters.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'PE', desc: 'Paired-end mode' }
			]
		},
		{
			type: 'task',
			title: 'Step 7: Genome Assembly (Patient 01)',
			text: `Assemble cleaned reads into contigs for Patient 01.`,
			command: 'unicycler -1 trimmed/patient_01_R1_paired.fq.gz -2 trimmed/patient_01_R2_paired.fq.gz -o assembly/patient_01/',
			explanation: 'Unicycler produces high-quality bacterial assemblies. Each patient gets a separate assembly.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-1/-2', desc: 'Forward/reverse reads' },
				{ name: '-o assembly/patient_01/', desc: 'Output directory for Patient 01' }
			]
		},
		{
			type: 'task',
			title: 'Step 8: Genome Assembly (Patient 02)',
			text: `Assemble Patient 02.`,
			command: 'unicycler -1 trimmed/patient_02_R1_paired.fq.gz -2 trimmed/patient_02_R2_paired.fq.gz -o assembly/patient_02/',
			explanation: 'Assembling Patient 02 isolate.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-o assembly/patient_02/', desc: 'Output directory for Patient 02' }
			]
		},
		{
			type: 'task',
			title: 'Step 9: Genome Assembly (Patient 03)',
			text: `Assemble Patient 03.`,
			command: 'unicycler -1 trimmed/patient_03_R1_paired.fq.gz -2 trimmed/patient_03_R2_paired.fq.gz -o assembly/patient_03/',
			explanation: 'Assembling Patient 03 isolate.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-o assembly/patient_03/', desc: 'Output directory for Patient 03' }
			]
		},
		{
			type: 'task',
			title: 'Step 10: Visualize Assemblies',
			text: `Create visual representations of all assembly graphs.`,
			command: 'Bandage image assembly/patient_01/assembly.gfa assembly/patient_01_graph.png',
			explanation: 'Bandage visualizes assembly graphs to identify structure. Repeat for each patient.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'image', desc: 'Generate image output' },
				{ name: 'assembly.gfa', desc: 'Input GFA file' }
			]
		}
	];
}

export function createIlluminaPhase2Sections(): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 2: Quality Assessment & Screening',
			text: 'Evaluate assembly quality and screen for key markers across all patient isolates.',
			phase: 2
		},
		{
			type: 'task',
			title: 'Step 11: Assembly Quality',
			text: `Assess assembly quality metrics for all patients.`,
			command: 'quast assembly/patient_01/assembly.fasta assembly/patient_02/assembly.fasta assembly/patient_03/assembly.fasta -o quast_results/',
			explanation: 'QUAST calculates N50, total length, and other metrics. Comparing all 3 patient assemblies.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-o quast_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 12: Genome Completeness',
			text: `Check genome completeness using marker genes.`,
			command: 'checkm lineage_wf assembly/ checkm_results/ -x fasta',
			explanation: 'CheckM estimates completeness and contamination for all assemblies.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'lineage_wf', desc: 'Full CheckM workflow' },
				{ name: '-x fasta', desc: 'File extension' }
			]
		},
		{
			type: 'task',
			title: 'Step 13: AMR Screening (All Patients)',
			text: `Screen all patient assemblies for antimicrobial resistance genes.`,
			command: 'abricate --db ncbi assembly/patient_01/assembly.fasta assembly/patient_02/assembly.fasta assembly/patient_03/assembly.fasta > o_abricate/all_patients_amr.tsv',
			explanation: 'ABRicate identifies resistance genes. Screening all patients at once for comparison.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--db ncbi', desc: 'Use NCBI database' },
				{ name: '>', desc: 'Redirect output to combined file' }
			]
		},
		{
			type: 'task',
			title: 'Step 14: MLST Typing (All Patients)',
			text: `Determine the sequence type for each isolate. This is critical for outbreak investigation.`,
			command: 'mlst assembly/patient_01/assembly.fasta assembly/patient_02/assembly.fasta assembly/patient_03/assembly.fasta > mlst_results/all_patients_mlst.tsv',
			explanation: 'MLST assigns sequence types for epidemiological tracking. Same ST suggests clonal outbreak.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '>', desc: 'Combined output for all patients' }
			]
		},
		{
			type: 'alert',
			title: 'MLST Results - Key Finding',
			text: `**MLST Typing Results:**\n\n| Patient | Species | Sequence Type |\n|---------|---------|---------------|\n| Patient 01 | K. pneumoniae | ST258 |\n| Patient 02 | K. pneumoniae | ST258 |\n| Patient 03 | K. pneumoniae | ST11 |\n\n**Interpretation:**\n- **Patients 01 & 02 (ST258):** Share the same sequence type - strong evidence of clonal transmission (outbreak cluster)\n- **Patient 03 (ST11):** Different sequence type - likely a sporadic case, NOT part of the outbreak\n\n**ST258 Background:** This is a globally-disseminated high-risk clone associated with hospital outbreaks and carbapenem resistance. ST11 is also clinically significant but represents a separate lineage.\n\nContinue analysis to confirm transmission and identify resistance mechanisms...`
		}
	];
}

export function createIlluminaPhase3Sections(): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 3: Annotation & Plasmid Analysis',
			text: 'Annotate genes and identify mobile genetic elements for the outbreak cluster (ST258 isolates).',
			phase: 3
		},
		{
			type: 'context',
			text: `**Focus on Outbreak Cluster**\n\nBased on MLST results, Patients 01 and 02 are part of a clonal outbreak (ST258). We'll perform detailed annotation on these isolates to understand the outbreak strain. Patient 03 (ST11) represents a separate, sporadic case.`
		},
		{
			type: 'task',
			title: 'Step 15: Genome Annotation (Patient 01)',
			text: `Annotate genes in the Patient 01 assembly.`,
			command: 'prokka --outdir prokka_results/patient_01/ --prefix patient_01 assembly/patient_01/assembly.fasta',
			explanation: 'Prokka identifies CDS, tRNA, and rRNA features.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--outdir', desc: 'Output directory' },
				{ name: '--prefix patient_01', desc: 'Output file prefix' }
			]
		},
		{
			type: 'task',
			title: 'Step 16: Genome Annotation (Patient 02)',
			text: `Annotate Patient 02 (second ST258 isolate).`,
			command: 'prokka --outdir prokka_results/patient_02/ --prefix patient_02 assembly/patient_02/assembly.fasta',
			explanation: 'Annotating the second outbreak isolate for comparison.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--outdir', desc: 'Output directory' },
				{ name: '--prefix patient_02', desc: 'Output file prefix' }
			]
		},
		{
			type: 'task',
			title: 'Step 17: Genome Annotation (Patient 03)',
			text: `Annotate Patient 03 (ST11 sporadic case) for comparison.`,
			command: 'prokka --outdir prokka_results/patient_03/ --prefix patient_03 assembly/patient_03/assembly.fasta',
			explanation: 'Annotating the sporadic ST11 isolate to compare AMR profiles.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--outdir', desc: 'Output directory' },
				{ name: '--prefix patient_03', desc: 'Output file prefix' }
			]
		},
		{
			type: 'task',
			title: 'Step 18: Plasmid Detection (ST258 Outbreak)',
			text: `Identify plasmids in the outbreak strain.`,
			command: 'mob_recon -i assembly/patient_01/assembly.fasta -o mob_recon_results/patient_01/',
			explanation: 'MOB-suite reconstructs plasmids carrying AMR genes.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 19: Plasmid Typing',
			text: `Identify plasmid replicon types across all patients.`,
			command: 'plasmidfinder -i assembly/patient_01/assembly.fasta -o plasmidfinder_results/',
			explanation: 'PlasmidFinder detects plasmid replicons for epidemiological typing.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o plasmidfinder_results/', desc: 'Output directory' }
			]
		}
	];
}

export function createIlluminaPhase4Sections(): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 4: Phylogenetics & Transmission Analysis',
			text: 'Build evolutionary trees to confirm outbreak transmission between patients.',
			phase: 4
		},
		{
			type: 'context',
			text: `**Phylogenetic Analysis Goal**\n\nWe need to determine:\n1. Are Patients 01 & 02 truly part of a clonal outbreak? (expect <10 SNP differences)\n2. Is Patient 03 definitely unrelated? (expect >100 SNP differences from outbreak cluster)\n3. What is the likely transmission direction?`
		},
		{
			type: 'task',
			title: 'Step 20: Variant Calling (Patient 01)',
			text: `Call SNPs for Patient 01 against the reference genome.`,
			command: 'snippy --ref reference.gbk --ctgs assembly/patient_01/assembly.fasta --outdir snippy_results/patient_01/',
			explanation: 'Snippy identifies SNPs, insertions, and deletions.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--ref reference.gbk', desc: 'Reference genome' },
				{ name: '--ctgs', desc: 'Query contigs' },
				{ name: '--outdir', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 21: Variant Calling (Patient 02)',
			text: `Call SNPs for Patient 02.`,
			command: 'snippy --ref reference.gbk --ctgs assembly/patient_02/assembly.fasta --outdir snippy_results/patient_02/',
			explanation: 'Calling variants for the second ST258 outbreak isolate.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--outdir', desc: 'Output directory for Patient 02' }
			]
		},
		{
			type: 'task',
			title: 'Step 22: Variant Calling (Patient 03)',
			text: `Call SNPs for Patient 03 (ST11 control).`,
			command: 'snippy --ref reference.gbk --ctgs assembly/patient_03/assembly.fasta --outdir snippy_results/patient_03/',
			explanation: 'Calling variants for the sporadic ST11 isolate as a comparison.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--outdir', desc: 'Output directory for Patient 03' }
			]
		},
		{
			type: 'task',
			title: 'Step 23: Core Genome Alignment',
			text: `Create a core genome alignment from all samples.`,
			command: 'snippy-core --ref reference.gbk snippy_results/patient_01 snippy_results/patient_02 snippy_results/patient_03',
			explanation: 'Snippy-core generates a multiple sequence alignment for phylogenetic analysis.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--ref', desc: 'Reference genome' },
				{ name: 'snippy_results/*', desc: 'All individual snippy outputs' }
			]
		},
		{
			type: 'task',
			title: 'Step 24: Pan-genome Analysis',
			text: `Analyze the pan-genome across all isolates.`,
			command: 'roary -f roary_results/ -e -n -v prokka_results/patient_01/*.gff prokka_results/patient_02/*.gff prokka_results/patient_03/*.gff',
			explanation: 'Roary identifies core genes shared by all isolates and accessory genes.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-f roary_results/', desc: 'Output directory' },
				{ name: '-e', desc: 'Create core gene alignment' },
				{ name: '-n', desc: 'Fast alignment with MAFFT' }
			]
		},
		{
			type: 'task',
			title: 'Step 25: Phylogenetic Tree',
			text: `Build a maximum-likelihood phylogenetic tree.`,
			command: 'iqtree -s core.aln -m GTR+G -bb 1000 -nt AUTO',
			explanation: 'IQ-TREE builds phylogenetic trees with bootstrap support.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-s core.aln', desc: 'Core genome alignment' },
				{ name: '-m GTR+G', desc: 'Substitution model' },
				{ name: '-bb 1000', desc: 'Bootstrap replicates' }
			]
		},
		{
			type: 'alert',
			title: 'Phylogenetic Results - Outbreak Confirmed',
			text: `**SNP Distance Matrix:**\n\n|           | Patient 01 | Patient 02 | Patient 03 |\n|-----------|------------|------------|------------|\n| Patient 01 | 0          | 3          | 847        |\n| Patient 02 | 3          | 0          | 851        |\n| Patient 03 | 847        | 851        | 0          |\n\n**Interpretation:**\n- **Patients 01 & 02:** Only 3 SNP differences - confirms direct transmission or very recent common source\n- **Patient 03:** >800 SNPs difference - completely unrelated, sporadic infection\n\n**Timeline Estimate:**\nAt ~1-2 SNPs/genome/year for K. pneumoniae, 3 SNPs suggests transmission occurred within the past 1-3 weeks - consistent with the ICU timeline.\n\n**Conclusion:** This is a confirmed clonal outbreak involving 2 of 3 patients.`
		}
	];
}

// Hospital-specific additional tools
export function createHospitalAdditionalTools(): StorylineSection[] {
	return [
		{
			type: 'task',
			title: 'Step 26: Detailed Resistance Analysis',
			text: `Get detailed resistance gene information for the outbreak strain.`,
			command: 'resfinder -i assembly/patient_01/assembly.fasta -o resfinder_results/patient_01/ -db_res',
			explanation: 'ResFinder provides detailed resistance gene annotations.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-db_res', desc: 'Use resistance database' }
			]
		},
		{
			type: 'task',
			title: 'Step 27: Integron Detection',
			text: `Find integrons carrying resistance cassettes in the ST258 outbreak strain.`,
			command: 'integron_finder assembly/patient_01/assembly.fasta --outdir integron_results/',
			explanation: 'IntegronFinder detects integrons that often carry AMR genes.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--outdir integron_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 28: IS Element Detection',
			text: `Identify insertion sequences for understanding AMR gene mobility.`,
			command: 'isescan --seqfile assembly/patient_01/assembly.fasta --output isescan_results/',
			explanation: 'ISEScan finds IS elements that facilitate gene mobility.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--seqfile', desc: 'Input assembly' },
				{ name: '--output isescan_results/', desc: 'Output directory' }
			]
		}
	];
}

// Foodborne-specific additional tools
export function createFoodborneAdditionalTools(): StorylineSection[] {
	return [
		{
			type: 'task',
			title: 'Step 20: Detailed Resistance Analysis',
			text: `Get detailed resistance gene information.`,
			command: 'resfinder -i assembly/assembly.fasta -o resfinder_results/ -db_res',
			explanation: 'ResFinder provides detailed resistance gene annotations.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-db_res', desc: 'Use resistance database' }
			]
		},
		{
			type: 'task',
			title: 'Step 21: Virulence Factor Screening',
			text: `Screen for virulence factors.`,
			command: 'virulencefinder -i assembly/assembly.fasta -o virulencefinder_results/',
			explanation: 'VirulenceFinder identifies pathogenicity factors.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o virulencefinder_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 22: Integron Detection',
			text: `Find integrons carrying resistance cassettes.`,
			command: 'integron_finder assembly/assembly.fasta --outdir integron_results/',
			explanation: 'IntegronFinder detects integrons that often carry AMR genes.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--outdir integron_results/', desc: 'Output directory' }
			]
		}
	];
}

// Plant-specific additional tools
export function createPlantAdditionalTools(): StorylineSection[] {
	return [
		{
			type: 'task',
			title: 'Step 20: Virulence Factor Screening',
			text: `Screen for Type III effectors and other virulence factors.`,
			command: 'virulencefinder -i assembly/assembly.fasta -o virulencefinder_results/',
			explanation: 'VirulenceFinder identifies pathogenicity factors.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o virulencefinder_results/', desc: 'Output directory' }
			]
		}
	];
}

// Fish-specific additional tools
export function createFishAdditionalTools(): StorylineSection[] {
	return [
		{
			type: 'task',
			title: 'Step 20: Virulence Factor Screening',
			text: `Screen for Vibrio virulence factors.`,
			command: 'virulencefinder -i assembly/assembly.fasta -o virulencefinder_results/',
			explanation: 'VirulenceFinder identifies toxins and virulence genes.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o virulencefinder_results/', desc: 'Output directory' }
			]
		}
	];
}

// ============================================
// PACBIO HYBRID ASSEMBLY SECTIONS (for Fish)
// ============================================

export function createPacBioHybridSections(): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 1B: PacBio Hybrid Assembly',
			text: 'Use PacBio long reads to resolve the fragmented assembly.',
			phase: 1
		},
		{
			type: 'context',
			text: `You have received PacBio HiFi reads for hybrid assembly. Long reads can span repetitive regions that caused the Illumina assembly to fragment.`
		},
		{
			type: 'task',
			title: 'Step H1: Long-read Quality Check',
			text: `Assess PacBio read quality and length distribution.`,
			command: 'NanoPlot --fastq sample_01_pacbio.fastq.gz -o nanoplot_results/',
			explanation: 'NanoPlot works with both Nanopore and PacBio reads.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--fastq', desc: 'Input FASTQ file' },
				{ name: '-o nanoplot_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step H2: Filter Long Reads',
			text: `Filter reads by quality and length.`,
			command: 'filtlong --min_length 5000 --min_mean_q 20 sample_01_pacbio.fastq.gz > filtered/sample_01_filtered.fastq.gz',
			explanation: 'Filtlong removes low-quality and short reads.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '--min_length 5000', desc: 'Minimum read length' },
				{ name: '--min_mean_q 20', desc: 'Minimum quality score' }
			]
		},
		{
			type: 'task',
			title: 'Step H3: Hybrid Assembly',
			text: `Create hybrid assembly combining short and long reads.`,
			command: 'unicycler -1 trimmed/sample_01_R1_paired.fq.gz -2 trimmed/sample_01_R2_paired.fq.gz -l filtered/sample_01_filtered.fastq.gz -o hybrid_assembly/',
			explanation: 'Unicycler uses long reads to bridge gaps in short-read assembly.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-1/-2', desc: 'Illumina paired reads' },
				{ name: '-l', desc: 'Long reads (PacBio)' },
				{ name: '-o hybrid_assembly/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step H4: Visualize Hybrid Assembly',
			text: `Visualize the improved assembly graph.`,
			command: 'Bandage image hybrid_assembly/assembly.gfa hybrid_assembly/o_bandage.png',
			explanation: 'Check if hybrid assembly resolved circular chromosomes.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: 'image', desc: 'Generate image output' }
			]
		},
		{
			type: 'task',
			title: 'Step H5: Verify Assembly Quality',
			text: `Check if hybrid assembly is complete.`,
			command: 'quast hybrid_assembly/assembly.fasta -o hybrid_quast_results/',
			explanation: 'Verify N50 improvement and contig count reduction.',
			requiredDir: '/data/outbreak_investigation',
			parameters: [
				{ name: '-o hybrid_quast_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'context',
			text: `Hybrid assembly successful!\n\nResults:\n- 2 circular contigs (Chromosome I: 3.2 Mb, Chromosome II: 1.9 Mb)\n- N50 improved from 180 kb to 3.2 Mb\n- Assembly is now complete\n\nContinuing analysis with the improved assembly...`
		}
	];
}

// ============================================
// PACBIO HIFI LONG-READ WORKFLOW SECTIONS
// ============================================

export function createPacBioPhase1Sections(dataDir: string = '/data/outbreak_investigation'): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 1: Long-Read Quality Control & Assembly',
			text: 'Assess PacBio HiFi read quality and perform de novo assembly.',
			phase: 1
		},
		{
			type: 'task',
			title: 'Step 1: Explore the Data',
			text: `Check the PacBio HiFi sequencing data statistics.`,
			command: 'seqkit stats sample_01_hifi.fastq.gz',
			explanation: 'SeqKit provides quick statistics including read count and N50 length.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'stats', desc: 'Generate sequence statistics' }
			]
		},
		{
			type: 'task',
			title: 'Step 2: Long-Read Quality Assessment',
			text: `Generate comprehensive quality plots for HiFi reads.`,
			command: 'NanoPlot --fastq sample_01_hifi.fastq.gz -o nanoplot_results/ --plots hex dot',
			explanation: 'NanoPlot creates visualizations of read length and quality distributions.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--fastq', desc: 'Input FASTQ file' },
				{ name: '-o nanoplot_results/', desc: 'Output directory' },
				{ name: '--plots hex dot', desc: 'Plot types to generate' }
			]
		},
		{
			type: 'task',
			title: 'Step 3: Filter Low-Quality Reads',
			text: `Remove low-quality and short reads.`,
			command: 'filtlong --min_length 5000 --min_mean_q 20 sample_01_hifi.fastq.gz | gzip > filtered/sample_01_filtered.fastq.gz',
			explanation: 'Filtlong filters reads by length and quality for optimal assembly.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--min_length 5000', desc: 'Minimum read length (bp)' },
				{ name: '--min_mean_q 20', desc: 'Minimum mean quality score' }
			]
		},
		{
			type: 'task',
			title: 'Step 4: Long-Read Assembly',
			text: `Assemble filtered reads using Flye optimized for HiFi data.`,
			command: 'flye --pacbio-hifi filtered/sample_01_filtered.fastq.gz -o assembly/ --threads 8',
			explanation: 'Flye produces high-quality assemblies optimized for long reads.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--pacbio-hifi', desc: 'PacBio HiFi read mode' },
				{ name: '-o assembly/', desc: 'Output directory' },
				{ name: '--threads 8', desc: 'Number of CPU threads' }
			]
		},
		{
			type: 'task',
			title: 'Step 5: Visualize Assembly Graph',
			text: `Examine the assembly graph for circular chromosomes.`,
			command: 'Bandage image assembly/assembly.gfa assembly/o_bandage.png --lengths',
			explanation: 'Bandage visualizes assembly graphs; circular contigs indicate complete chromosomes.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'image', desc: 'Generate image output' },
				{ name: '--lengths', desc: 'Show contig lengths' }
			]
		},
		{
			type: 'task',
			title: 'Step 6: Polish Assembly',
			text: `Polish the assembly to correct remaining errors.`,
			command: 'medaka_consensus -i filtered/sample_01_filtered.fastq.gz -d assembly/assembly.fasta -o polished/ -m r941_min_hac_g507',
			explanation: 'Medaka uses neural networks to polish long-read assemblies.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-i', desc: 'Input reads' },
				{ name: '-d', desc: 'Draft assembly' },
				{ name: '-o polished/', desc: 'Output directory' },
				{ name: '-m', desc: 'Model for polishing' }
			]
		}
	];
}

export function createLongReadPhase2Sections(dataDir: string = '/data/outbreak_investigation'): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 2: Quality Assessment & Screening',
			text: 'Evaluate assembly quality and screen for key markers.',
			phase: 2
		},
		{
			type: 'task',
			title: 'Step 7: Assembly Quality Metrics',
			text: `Assess assembly quality and completeness.`,
			command: 'quast polished/consensus.fasta -o quast_results/',
			explanation: 'QUAST provides N50, total length, and contig statistics.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-o quast_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 8: Genome Completeness',
			text: `Check genome completeness using marker genes.`,
			command: 'checkm lineage_wf polished/ checkm_results/ -x fasta',
			explanation: 'CheckM estimates completeness and contamination.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'lineage_wf', desc: 'Full CheckM workflow' },
				{ name: '-x fasta', desc: 'File extension' }
			]
		},
		{
			type: 'task',
			title: 'Step 9: BUSCO Assessment',
			text: `Validate completeness with universal single-copy orthologs.`,
			command: 'busco -i polished/consensus.fasta -o busco_results/ -m genome -l bacteria_odb10',
			explanation: 'BUSCO checks for conserved genes expected in all bacteria.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-m genome', desc: 'Genome mode' },
				{ name: '-l bacteria_odb10', desc: 'Bacteria database' }
			]
		},
		{
			type: 'task',
			title: 'Step 10: AMR Screening',
			text: `Screen for antimicrobial resistance genes.`,
			command: 'abricate --db ncbi polished/consensus.fasta -o o_abricate/',
			explanation: 'ABRicate identifies resistance genes from databases.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--db ncbi', desc: 'Use NCBI database' },
				{ name: '-o o_abricate/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 11: MLST Typing',
			text: `Determine the sequence type.`,
			command: 'mlst polished/consensus.fasta > o_mlst/mlst_result.tab',
			explanation: 'MLST assigns sequence types for epidemiological tracking.',
			requiredDir: dataDir,
			parameters: [
				{ name: '>', desc: 'Redirect output to file' }
			]
		}
	];
}

export function createLongReadPhase3Sections(dataDir: string = '/data/outbreak_investigation'): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 3: Annotation & Mobile Element Analysis',
			text: 'Annotate genes and comprehensively analyze mobile genetic elements.',
			phase: 3
		},
		{
			type: 'task',
			title: 'Step 12: Genome Annotation',
			text: `Annotate genes in the polished assembly.`,
			command: 'prokka --outdir prokka_results/ --prefix sample_01 polished/consensus.fasta',
			explanation: 'Prokka identifies CDS, tRNA, and rRNA features.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--outdir prokka_results/', desc: 'Output directory' },
				{ name: '--prefix sample_01', desc: 'Output file prefix' }
			]
		},
		{
			type: 'task',
			title: 'Step 13: Detailed Annotation',
			text: `Get comprehensive annotations with Bakta.`,
			command: 'bakta polished/consensus.fasta --output bakta_results/',
			explanation: 'Bakta provides rich functional annotations.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--output bakta_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 14: Complete Plasmid Analysis',
			text: `Identify and characterize plasmids from the complete assembly.`,
			command: 'mob_recon -i polished/consensus.fasta -o mob_recon_results/',
			explanation: 'MOB-suite reconstructs plasmids with high accuracy on complete genomes.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o mob_recon_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 15: Plasmid Typing',
			text: `Identify plasmid replicon types.`,
			command: 'plasmidfinder -i polished/consensus.fasta -o plasmidfinder_results/',
			explanation: 'PlasmidFinder detects plasmid replicons for typing.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o plasmidfinder_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 16: IS Element Detection',
			text: `Identify insertion sequences in the complete genome.`,
			command: 'isescan --seqfile polished/consensus.fasta --output isescan_results/',
			explanation: 'ISEScan finds IS elements that facilitate gene mobility.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--seqfile', desc: 'Input assembly' },
				{ name: '--output isescan_results/', desc: 'Output directory' }
			]
		}
	];
}

export function createLongReadPhase4Sections(dataDir: string = '/data/outbreak_investigation'): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 4: Phylogenetics & Comparative Analysis',
			text: 'Build evolutionary trees and perform detailed comparative genomics.',
			phase: 4
		},
		{
			type: 'task',
			title: 'Step 17: Variant Calling',
			text: `Call SNPs against the reference genome.`,
			command: 'snippy --ref reference.gbk --ctgs polished/consensus.fasta --outdir snippy_results/',
			explanation: 'Snippy identifies SNPs, insertions, and deletions.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--ref reference.gbk', desc: 'Reference genome' },
				{ name: '--ctgs', desc: 'Query contigs' },
				{ name: '--outdir snippy_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 18: Pan-genome Analysis',
			text: `Analyze the pan-genome across isolates.`,
			command: 'roary -f roary_results/ -e -n -v prokka_results/*.gff',
			explanation: 'Roary identifies core and accessory genes.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-f roary_results/', desc: 'Output directory' },
				{ name: '-e', desc: 'Create core gene alignment' },
				{ name: '-n', desc: 'Fast alignment with MAFFT' }
			]
		},
		{
			type: 'task',
			title: 'Step 19: Phylogenetic Tree',
			text: `Build a maximum-likelihood phylogenetic tree.`,
			command: 'iqtree -s roary_results/core_gene_alignment.aln -m GTR+G -bb 1000 -nt AUTO',
			explanation: 'IQ-TREE builds phylogenetic trees with bootstrap support.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-s', desc: 'Input alignment' },
				{ name: '-m GTR+G', desc: 'Substitution model' },
				{ name: '-bb 1000', desc: 'Bootstrap replicates' }
			]
		},
		{
			type: 'task',
			title: 'Step 20: Recombination Analysis',
			text: `Remove recombination for cleaner phylogeny.`,
			command: 'run_gubbins.py -p gubbins_results/clean roary_results/core_gene_alignment.aln',
			explanation: 'Gubbins identifies recombination regions for removal.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-p gubbins_results/clean', desc: 'Output prefix' }
			]
		}
	];
}

// ============================================
// NANOPORE LONG-READ WORKFLOW SECTIONS
// ============================================

export function createNanoporePhase1Sections(dataDir: string = '/data/outbreak_investigation'): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 1: Rapid Long-Read Analysis',
			text: 'Process Oxford Nanopore data for rapid pathogen identification.',
			phase: 1
		},
		{
			type: 'task',
			title: 'Step 1: Explore the Data',
			text: `Check the Nanopore sequencing data statistics.`,
			command: 'seqkit stats sample_01_nanopore.fastq.gz',
			explanation: 'SeqKit provides quick statistics about sequencing files.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'stats', desc: 'Generate sequence statistics' }
			]
		},
		{
			type: 'task',
			title: 'Step 2: Basecalling Quality Check',
			text: `Assess read quality and length distribution.`,
			command: 'NanoPlot --fastq sample_01_nanopore.fastq.gz -o nanoplot_results/ --plots kde hex',
			explanation: 'NanoPlot creates visualizations showing quality vs. read length.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--fastq', desc: 'Input FASTQ file' },
				{ name: '-o nanoplot_results/', desc: 'Output directory' },
				{ name: '--plots kde hex', desc: 'Plot types to generate' }
			]
		},
		{
			type: 'task',
			title: 'Step 3: Adapter Trimming',
			text: `Remove adapters and chimeric reads.`,
			command: 'porechop -i sample_01_nanopore.fastq.gz -o trimmed/sample_01_trimmed.fastq.gz',
			explanation: 'Porechop removes sequencing adapters from Nanopore reads.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-i', desc: 'Input FASTQ file' },
				{ name: '-o', desc: 'Output trimmed file' }
			]
		},
		{
			type: 'task',
			title: 'Step 4: Quality Filtering',
			text: `Filter reads by quality and length.`,
			command: 'filtlong --min_length 1000 --keep_percent 90 trimmed/sample_01_trimmed.fastq.gz | gzip > filtered/sample_01_filtered.fastq.gz',
			explanation: 'Filtlong removes the lowest quality reads.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--min_length 1000', desc: 'Minimum read length' },
				{ name: '--keep_percent 90', desc: 'Keep top 90% by quality' }
			]
		},
		{
			type: 'task',
			title: 'Step 5: Real-Time Species Identification',
			text: `Rapidly identify species using k-mer classification.`,
			command: 'kraken2 --db standard --threads 8 --report kraken_report.txt filtered/sample_01_filtered.fastq.gz > kraken_output.txt',
			explanation: 'Kraken2 provides rapid taxonomic classification for species ID.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--db standard', desc: 'Standard Kraken2 database' },
				{ name: '--threads 8', desc: 'Number of threads' },
				{ name: '--report', desc: 'Summary report output' }
			]
		},
		{
			type: 'task',
			title: 'Step 6: De Novo Assembly',
			text: `Assemble filtered reads with Flye.`,
			command: 'flye --nano-hq filtered/sample_01_filtered.fastq.gz -o assembly/ --threads 8',
			explanation: 'Flye produces high-quality assemblies from Nanopore data.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--nano-hq', desc: 'High-quality Nanopore mode (Q20+)' },
				{ name: '-o assembly/', desc: 'Output directory' },
				{ name: '--threads 8', desc: 'Number of CPU threads' }
			]
		},
		{
			type: 'task',
			title: 'Step 7: Assembly Polishing',
			text: `Polish assembly with Medaka for improved accuracy.`,
			command: 'medaka_consensus -i filtered/sample_01_filtered.fastq.gz -d assembly/assembly.fasta -o polished/ -m r941_min_sup_g507',
			explanation: 'Medaka uses neural networks to improve assembly accuracy.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-i', desc: 'Input reads' },
				{ name: '-d', desc: 'Draft assembly' },
				{ name: '-o polished/', desc: 'Output directory' },
				{ name: '-m', desc: 'Nanopore model' }
			]
		},
		{
			type: 'task',
			title: 'Step 8: Visualize Assembly',
			text: `Examine the assembly graph structure.`,
			command: 'Bandage image assembly/assembly.gfa assembly/o_bandage.png --lengths',
			explanation: 'Bandage visualizes assembly completeness and structure.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'image', desc: 'Generate image output' },
				{ name: '--lengths', desc: 'Show contig lengths' }
			]
		}
	];
}

export function createNanoporePhase2Sections(dataDir: string = '/data/outbreak_investigation'): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 2: Rapid Screening & Resistance Detection',
			text: 'Quickly screen for resistance genes and virulence factors.',
			phase: 2
		},
		{
			type: 'task',
			title: 'Step 9: Assembly Quality',
			text: `Assess assembly quality metrics.`,
			command: 'quast polished/consensus.fasta -o quast_results/',
			explanation: 'QUAST provides key assembly statistics.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-o quast_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 10: Real-Time AMR Detection',
			text: `Screen for resistance genes directly from reads.`,
			command: 'abricate --db resfinder polished/consensus.fasta -o o_abricate/',
			explanation: 'ABRicate rapidly identifies resistance genes.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--db resfinder', desc: 'Use ResFinder database' },
				{ name: '-o o_abricate/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 11: MLST Typing',
			text: `Determine sequence type for epidemiology.`,
			command: 'mlst polished/consensus.fasta > o_mlst/mlst_result.tab',
			explanation: 'MLST provides immediate epidemiological context.',
			requiredDir: dataDir,
			parameters: [
				{ name: '>', desc: 'Redirect output to file' }
			]
		},
		{
			type: 'task',
			title: 'Step 12: Virulence Screening',
			text: `Screen for virulence factors.`,
			command: 'abricate --db vfdb polished/consensus.fasta -o virulence_results/',
			explanation: 'VFDB database contains curated virulence factors.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--db vfdb', desc: 'Use VFDB database' },
				{ name: '-o virulence_results/', desc: 'Output directory' }
			]
		}
	];
}

export function createNanoporePhase3Sections(dataDir: string = '/data/outbreak_investigation'): StorylineSection[] {
	return [
		{
			type: 'phase',
			title: 'Phase 3: Annotation & Detailed Analysis',
			text: 'Comprehensive annotation and structural variant detection.',
			phase: 3
		},
		{
			type: 'task',
			title: 'Step 13: Genome Annotation',
			text: `Annotate the polished assembly.`,
			command: 'prokka --outdir prokka_results/ --prefix sample_01 polished/consensus.fasta',
			explanation: 'Prokka provides comprehensive gene annotations.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--outdir prokka_results/', desc: 'Output directory' },
				{ name: '--prefix sample_01', desc: 'Output prefix' }
			]
		},
		{
			type: 'task',
			title: 'Step 14: Detailed Annotation with Bakta',
			text: `Get comprehensive functional annotations.`,
			command: 'bakta polished/consensus.fasta --output bakta_results/',
			explanation: 'Bakta provides rich functional and taxonomic annotations.',
			requiredDir: dataDir,
			parameters: [
				{ name: '--output bakta_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 15: Plasmid Detection',
			text: `Identify plasmids in the assembly.`,
			command: 'mob_recon -i polished/consensus.fasta -o mob_recon_results/',
			explanation: 'MOB-suite reconstructs and types plasmids.',
			requiredDir: dataDir,
			parameters: [
				{ name: '-i', desc: 'Input assembly' },
				{ name: '-o mob_recon_results/', desc: 'Output directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 16: Methylation Analysis',
			text: `Detect DNA methylation patterns (if available).`,
			command: 'modkit pileup sample_01_nanopore.bam methylation_results/ --ref polished/consensus.fasta',
			explanation: 'Modkit detects base modifications from Nanopore signal data.',
			requiredDir: dataDir,
			parameters: [
				{ name: 'pileup', desc: 'Generate methylation pileup' },
				{ name: '--ref', desc: 'Reference genome' }
			]
		}
	];
}
