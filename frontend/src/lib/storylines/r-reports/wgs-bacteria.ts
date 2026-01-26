import type { Storyline, StorylineSection } from '../types';

const wgsBacteriaReportSections: StorylineSection[] = [
	{
		type: 'intro',
		text: `Creating Publication-Ready WGS Report:\n\nYou have completed a bacterial whole genome sequencing analysis and need to generate a professional PDF report summarizing your findings for publication or clinical reporting.`,
		hint: null,
		requiredDir: null
	},
	{
		type: 'context',
		text: `This tutorial will guide you through creating an R Markdown report that includes:\n\n• Assembly quality statistics (QUAST)\n• AMR gene heatmaps\n• Phylogenetic tree visualization\n• MLST results table\n• Pan-genome composition\n\nWe'll build the report step by step, learning each visualization technique.`,
		hint: null,
		requiredDir: null
	},
	{
		type: 'phase',
		title: 'Phase 1: Environment Setup',
		text: 'Install and load the required R packages for report generation.',
		phase: 1
	},
	{
		type: 'task',
		title: 'Step 1: Install Required Packages',
		text: `Install the R packages needed for WGS report generation.`,
		command: `Rscript -e "install.packages(c('rmarkdown', 'knitr', 'kableExtra', 'ggplot2', 'dplyr', 'tidyr', 'pheatmap', 'RColorBrewer'), repos='https://cran.r-project.org')"`,
		explanation:
			'Installing core packages: rmarkdown for report generation, kableExtra for tables, ggplot2 for plots, pheatmap for heatmaps.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'rmarkdown', desc: 'R Markdown document generation' },
			{ name: 'kableExtra', desc: 'Enhanced table formatting' },
			{ name: 'pheatmap', desc: 'Pretty heatmaps' },
			{ name: 'ggplot2', desc: 'Grammar of graphics plotting' }
		]
	},
	{
		type: 'task',
		title: 'Step 2: Install Bioconductor Packages',
		text: `Install ggtree for phylogenetic tree visualization.`,
		command: `Rscript -e "if (!require('BiocManager', quietly=TRUE)) install.packages('BiocManager'); BiocManager::install(c('ggtree', 'ape', 'treeio'))"`,
		explanation:
			'ggtree is a Bioconductor package for phylogenetic tree visualization with ggplot2 grammar.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'ggtree', desc: 'Phylogenetic tree visualization' },
			{ name: 'ape', desc: 'Phylogenetic analysis' },
			{ name: 'treeio', desc: 'Tree file I/O' }
		]
	},
	{
		type: 'task',
		title: 'Step 3: Install TinyTeX for PDF',
		text: `Install TinyTeX for PDF compilation.`,
		command: `Rscript -e "install.packages('tinytex'); tinytex::install_tinytex()"`,
		explanation:
			'TinyTeX is a lightweight LaTeX distribution required to compile R Markdown to PDF.',
		requiredDir: '/data/wgs_report',
		parameters: [{ name: 'tinytex', desc: 'Lightweight LaTeX for PDF generation' }]
	},
	{
		type: 'phase',
		title: 'Phase 2: Load and Prepare Data',
		text: 'Load your analysis results into R for visualization.',
		phase: 2
	},
	{
		type: 'task',
		title: 'Step 4: Load QUAST Results',
		text: `Read the QUAST assembly statistics into R.`,
		command: `Rscript -e "quast <- read.delim('quast_results/report.tsv', header=TRUE); print(head(quast))"`,
		explanation: 'QUAST output is tab-delimited. We load it as a data frame for table generation.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'read.delim()', desc: 'Read tab-separated file' },
			{ name: 'header=TRUE', desc: 'First row contains column names' }
		]
	},
	{
		type: 'task',
		title: 'Step 5: Load AMR Results',
		text: `Read ABRicate AMR gene detection results.`,
		command: `Rscript -e "amr <- read.delim('o_abricate/summary.tsv', header=TRUE); print(table(amr\\$GENE))"`,
		explanation: 'ABRicate summary contains gene names, coverage, and identity for each sample.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'summary.tsv', desc: 'ABRicate combined results' },
			{ name: 'table()', desc: 'Count occurrences of each gene' }
		]
	},
	{
		type: 'task',
		title: 'Step 6: Load Phylogenetic Tree',
		text: `Read the Newick format phylogenetic tree.`,
		command: `Rscript -e "library(ape); tree <- read.tree('iqtree_results/core_snps.treefile'); print(tree)"`,
		explanation: 'The tree file from IQ-TREE is in Newick format, readable by the ape package.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'read.tree()', desc: 'Parse Newick tree format' },
			{ name: '.treefile', desc: 'IQ-TREE output tree' }
		]
	},
	{
		type: 'phase',
		title: 'Phase 3: Generate Tables',
		text: 'Create formatted tables for the report.',
		phase: 3
	},
	{
		type: 'task',
		title: 'Step 7: Assembly Statistics Table',
		text: `Create a formatted QUAST statistics table.`,
		command: `Rscript -e "library(kableExtra); quast <- read.delim('quast_results/report.tsv'); quast %>% select(Assembly, Total.length, N50, GC....) %>% kable(col.names=c('Sample', 'Length', 'N50', 'GC%'), caption='Assembly Statistics') %>% kable_styling(bootstrap_options=c('striped', 'hover'))"`,
		explanation: 'kableExtra creates publication-quality HTML/PDF tables with styling options.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'kable()', desc: 'Create table from data frame' },
			{ name: 'kable_styling()', desc: 'Apply visual styling' },
			{ name: 'bootstrap_options', desc: 'Striped rows, hover highlight' }
		]
	},
	{
		type: 'task',
		title: 'Step 8: MLST Results Table',
		text: `Create a table of MLST sequence types.`,
		command: `Rscript -e "library(kableExtra); mlst <- read.delim('mlst_results/mlst.tsv', header=FALSE, col.names=c('File','Scheme','ST',paste0('Allele',1:7))); mlst %>% select(File, Scheme, ST) %>% kable(caption='MLST Results') %>% kable_styling()"`,
		explanation: 'MLST output shows the sequence type (ST) and allele profile for each isolate.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'col.names', desc: 'Manually specify column names' },
			{ name: 'ST', desc: 'Sequence Type identifier' }
		]
	},
	{
		type: 'phase',
		title: 'Phase 4: Create Visualizations',
		text: 'Generate plots and figures for the report.',
		phase: 4
	},
	{
		type: 'task',
		title: 'Step 9: AMR Heatmap',
		text: `Create a presence/absence heatmap of AMR genes.`,
		command: `Rscript -e "library(pheatmap); library(tidyr); amr <- read.delim('o_abricate/summary.tsv'); amr_matrix <- amr %>% mutate(present=1) %>% select(FILE, GENE, present) %>% distinct() %>% pivot_wider(names_from=GENE, values_from=present, values_fill=0) %>% column_to_rownames('FILE') %>% as.matrix(); pheatmap(amr_matrix, color=c('white','#ef4444'), legend_breaks=c(0,1), legend_labels=c('Absent','Present'), main='AMR Gene Presence/Absence')"`,
		explanation:
			'pheatmap creates clustered heatmaps. We convert gene presence to a binary matrix.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'pivot_wider()', desc: 'Reshape data to wide format' },
			{ name: 'pheatmap()', desc: 'Generate clustered heatmap' },
			{ name: 'color', desc: 'White=absent, Red=present' }
		]
	},
	{
		type: 'task',
		title: 'Step 10: Phylogenetic Tree Plot',
		text: `Visualize the phylogenetic tree with ggtree.`,
		command: `Rscript -e "library(ggtree); library(ape); tree <- read.tree('iqtree_results/core_snps.treefile'); ggtree(tree, layout='rectangular') + geom_tiplab(size=3) + geom_treescale() + theme_tree2() + ggtitle('Core SNP Phylogeny')"`,
		explanation: 'ggtree uses ggplot2 grammar to create customizable phylogenetic trees.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'layout', desc: 'Tree layout style (rectangular, circular)' },
			{ name: 'geom_tiplab()', desc: 'Add sample labels to tips' },
			{ name: 'geom_treescale()', desc: 'Add scale bar' }
		]
	},
	{
		type: 'task',
		title: 'Step 11: Assembly Quality Bar Plot',
		text: `Create a bar plot of N50 values.`,
		command: `Rscript -e "library(ggplot2); quast <- read.delim('quast_results/report.tsv'); ggplot(quast, aes(x=Assembly, y=N50/1000)) + geom_bar(stat='identity', fill='#10b981') + labs(title='Assembly N50', x='Sample', y='N50 (kb)') + theme_minimal() + theme(axis.text.x=element_text(angle=45, hjust=1))"`,
		explanation: 'ggplot2 creates publication-quality plots with customizable themes.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'geom_bar()', desc: 'Bar plot geometry' },
			{ name: 'stat="identity"', desc: 'Use actual values, not counts' },
			{ name: 'theme_minimal()', desc: 'Clean minimal theme' }
		]
	},
	{
		type: 'task',
		title: 'Step 12: Pan-genome Pie Chart',
		text: `Create a pie chart of pan-genome composition.`,
		command: `Rscript -e "library(ggplot2); pangenome <- data.frame(Category=c('Core','Soft-core','Shell','Cloud'), Genes=c(3987,312,489,446)); ggplot(pangenome, aes(x='', y=Genes, fill=Category)) + geom_bar(stat='identity', width=1) + coord_polar('y') + scale_fill_manual(values=c('#10b981','#3b82f6','#f59e0b','#ef4444')) + labs(title='Pan-genome Composition') + theme_void()"`,
		explanation: 'Pie charts in ggplot2 are bar charts with polar coordinates.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'coord_polar()', desc: 'Convert to polar coordinates' },
			{ name: 'Core genes', desc: 'Present in all isolates' },
			{ name: 'Cloud genes', desc: 'Present in <15% of isolates' }
		]
	},
	{
		type: 'phase',
		title: 'Phase 5: Compile PDF Report',
		text: 'Combine all elements into a final PDF report.',
		phase: 5
	},
	{
		type: 'task',
		title: 'Step 13: Create R Markdown Document',
		text: `Write the R Markdown file with all sections.`,
		command: `cat > wgs_report.Rmd << 'EOF'
---
title: "Bacterial WGS Analysis Report"
author: "BioLearn"
date: "\\\`r Sys.Date()\\\`"
output: pdf_document
---

\\\`\\\`\\\`{r setup, include=FALSE}
knitr::opts_chunk$set(echo=FALSE, message=FALSE, warning=FALSE)
library(ggplot2); library(dplyr); library(kableExtra)
library(pheatmap); library(ggtree); library(ape)
\\\`\\\`\\\`

# Assembly Quality
\\\`\\\`\\\`{r}
quast <- read.delim("quast_results/report.tsv")
quast %>% select(Assembly, Total.length, N50, GC....) %>%
  kable(caption="Assembly Statistics") %>% kable_styling()
\\\`\\\`\\\`

# AMR Genes
\\\`\\\`\\\`{r, fig.height=6}
# AMR heatmap code here
\\\`\\\`\\\`

# Phylogenetic Tree
\\\`\\\`\\\`{r, fig.height=8}
tree <- read.tree("iqtree_results/core_snps.treefile")
ggtree(tree) + geom_tiplab() + theme_tree2()
\\\`\\\`\\\`
EOF`,
		explanation: 'R Markdown combines narrative text with executable R code chunks.',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'YAML header', desc: 'Document metadata and output format' },
			{ name: '```{r}', desc: 'R code chunk' },
			{ name: 'include=FALSE', desc: 'Run but hide output' }
		]
	},
	{
		type: 'task',
		title: 'Step 14: Render PDF Report',
		text: `Compile the R Markdown to PDF.`,
		command: `Rscript -e "rmarkdown::render('wgs_report.Rmd')"`,
		explanation:
			'rmarkdown::render() converts .Rmd to the specified output format (PDF, HTML, Word).',
		requiredDir: '/data/wgs_report',
		parameters: [
			{ name: 'render()', desc: 'Compile R Markdown document' },
			{ name: 'Output', desc: 'wgs_report.pdf' }
		]
	},
	{
		type: 'complete',
		title: 'Report Generation Complete',
		text: `Congratulations! You have created a WGS bacteria PDF report.\n\n**Report Contents:**\n• Assembly quality statistics table\n• AMR gene presence/absence heatmap\n• Phylogenetic tree visualization\n• MLST results table\n• Pan-genome composition chart\n\n**Key Packages Learned:**\n• rmarkdown - Document generation\n• kableExtra - Publication tables\n• ggplot2 - Grammar of graphics\n• pheatmap - Clustered heatmaps\n• ggtree - Phylogenetic trees\n\n**Output:** wgs_report.pdf\n\n**Next Steps:**\n• Customize the template for your data\n• Add additional analyses as needed\n• Use parameterized reports for batch processing`
	}
];

export const wgsBacteria: Storyline = {
	id: 'wgs-bacteria',
	category: 'reports',
	title: 'WGS Bacteria Report',
	subtitle: 'Assembly, AMR & Phylogenetics',
	organism: 'Bacterial genomes',
	technology: 'r-report',
	technologyLabel: 'R/RMarkdown',
	dataDir: '/data/wgs_report',
	toolsUsed: ['Rscript', 'rmarkdown', 'ggplot2', 'pheatmap', 'ggtree', 'kableExtra'],
	sections: wgsBacteriaReportSections
};
