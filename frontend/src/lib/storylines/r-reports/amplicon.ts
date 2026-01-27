import type { Storyline, StorylineSection } from '../types';

// ============================================
// AMPLICON/16S REPORT STORYLINE
// ============================================

const ampliconReportSections: StorylineSection[] = [
	{
		type: 'intro',
		text: `Creating 16S Microbiome Report:\n\nYou have completed a 16S rRNA amplicon sequencing analysis and need to generate a comprehensive PDF report summarizing the microbiome findings.`,
		hint: null,
		requiredDir: null
	},
	{
		type: 'context',
		text: `This tutorial will guide you through creating an R Markdown report that includes:\n\n• Alpha diversity (Shannon/Observed ASVs)\n• Beta diversity (PCoA/NMDS + PERMANOVA)\n• Taxonomic composition bar plots\n• Functional inference (PICRUSt2)\n• Function heatmaps (KO/EC)\n• Differential functional abundance\n\nWe'll use phyloseq, ALDEx2, and related packages for comprehensive microbiome analysis.`,
		hint: null,
		requiredDir: null
	},
	// Phase 1: Setup
	{
		type: 'phase',
		title: 'Phase 1: Environment Setup',
		text: 'Install and load packages for microbiome and functional analysis.',
		phase: 1
	},
	{
		type: 'task',
		title: 'Step 1: Install CRAN Packages',
		text: `Install core R packages for report generation.`,
		command: `Rscript -e "install.packages(c('rmarkdown', 'knitr', 'kableExtra', 'ggplot2', 'dplyr', 'tidyr', 'vegan', 'RColorBrewer', 'viridis'), repos='https://cran.r-project.org')"`,
		explanation: 'vegan is essential for ecological diversity analyses (Shannon, Simpson, PERMANOVA).',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'vegan', desc: 'Community ecology analyses' },
			{ name: 'ggplot2', desc: 'Plotting framework' },
			{ name: 'viridis', desc: 'Color-blind friendly palettes' }
		]
	},
	{
		type: 'task',
		title: 'Step 2: Install Bioconductor Packages',
		text: `Install phyloseq, ALDEx2, and ComplexHeatmap for microbiome and functional analysis.`,
		command: `Rscript -e "if (!require('BiocManager', quietly=TRUE)) install.packages('BiocManager'); BiocManager::install(c('phyloseq', 'DESeq2', 'ALDEx2', 'ComplexHeatmap', 'microbiome'))"`,
		explanation: 'ALDEx2 is recommended for compositional data; ComplexHeatmap for publication-quality heatmaps.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'phyloseq', desc: 'Microbiome data handling' },
			{ name: 'ALDEx2', desc: 'Compositional differential abundance' },
			{ name: 'ComplexHeatmap', desc: 'Advanced heatmap visualization' },
			{ name: 'DESeq2', desc: 'Alternative differential testing' }
		]
	},
	{
		type: 'task',
		title: 'Step 3: Install TinyTeX',
		text: `Install TinyTeX for PDF generation.`,
		command: `Rscript -e "install.packages('tinytex'); tinytex::install_tinytex()"`,
		explanation: 'TinyTeX provides the LaTeX backend needed for PDF compilation.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'tinytex', desc: 'Lightweight LaTeX distribution' }
		]
	},
	// Phase 2: Data Loading
	{
		type: 'phase',
		title: 'Phase 2: Load Microbiome Data',
		text: 'Import phyloseq object and PICRUSt2 functional predictions.',
		phase: 2
	},
	{
		type: 'task',
		title: 'Step 4: Load Phyloseq Object',
		text: `Load the phyloseq object containing OTU/ASV data.`,
		command: `Rscript -e "library(phyloseq); ps <- readRDS('phyloseq_object.rds'); print(ps)"`,
		explanation: 'phyloseq objects contain OTU table, taxonomy, sample data, and optionally a tree.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'readRDS()', desc: 'Load R serialized object' },
			{ name: 'phyloseq object', desc: 'Contains all microbiome data components' }
		]
	},
	{
		type: 'task',
		title: 'Step 5: Load PICRUSt2 Functional Data',
		text: `Import PICRUSt2 predicted KO and pathway abundance tables.`,
		command: `Rscript -e "ko_table <- read.delim('picrust2_output/KO_metagenome_out/pred_metagenome_unstrat.tsv', row.names=1); pathway_table <- read.delim('picrust2_output/pathways_out/path_abun_unstrat.tsv', row.names=1); cat('KO features:', nrow(ko_table), '\\nPathways:', nrow(pathway_table))"`,
		explanation: 'PICRUSt2 predicts functional potential from 16S data. Note: these are inferred, not measured.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'pred_metagenome_unstrat.tsv', desc: 'KEGG Ortholog abundances' },
			{ name: 'path_abun_unstrat.tsv', desc: 'MetaCyc pathway abundances' },
			{ name: 'Inferred', desc: 'State clearly these are predictions' }
		]
	},
	// Phase 3: Alpha & Beta Diversity (Taxa)
	{
		type: 'phase',
		title: 'Phase 3: Taxonomic Diversity',
		text: 'Calculate alpha and beta diversity metrics for baseline microbiome quality.',
		phase: 3
	},
	{
		type: 'task',
		title: 'Step 6: Alpha Diversity Box Plots',
		text: `Create Shannon and Observed ASV box plots by group.`,
		command: `Rscript -e "library(phyloseq); library(ggplot2); ps <- readRDS('phyloseq_object.rds'); alpha <- estimate_richness(ps, measures=c('Observed','Shannon')); alpha\\$Group <- sample_data(ps)\\$Group; p1 <- ggplot(alpha, aes(x=Group, y=Shannon, fill=Group)) + geom_boxplot() + geom_jitter(width=0.2) + labs(title='Shannon Diversity') + theme_minimal(); p2 <- ggplot(alpha, aes(x=Group, y=Observed, fill=Group)) + geom_boxplot() + geom_jitter(width=0.2) + labs(title='Observed ASVs') + theme_minimal(); print(p1); print(p2)"`,
		explanation: 'Alpha diversity summarizes within-sample diversity. Shannon accounts for evenness; Observed counts richness.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'Shannon', desc: 'Diversity index (richness + evenness)' },
			{ name: 'Observed', desc: 'Number of unique ASVs' },
			{ name: 'Baseline', desc: 'Microbiome quality summary' }
		]
	},
	{
		type: 'task',
		title: 'Step 7: Beta Diversity PCoA + PERMANOVA',
		text: `Create PCoA/NMDS ordination and test with PERMANOVA.`,
		command: `Rscript -e "library(phyloseq); library(ggplot2); library(vegan); ps <- readRDS('phyloseq_object.rds'); bray <- phyloseq::distance(ps, 'bray'); ord <- ordinate(ps, 'PCoA', distance=bray); p <- plot_ordination(ps, ord, color='Group') + geom_point(size=4) + stat_ellipse(level=0.95) + labs(title='PCoA Bray-Curtis') + theme_minimal(); print(p); perm <- adonis2(bray ~ Group, data=as(sample_data(ps),'data.frame')); print(perm)"`,
		explanation: 'Beta diversity measures between-sample differences. PERMANOVA tests significance of groupings.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'PCoA/NMDS', desc: 'Ordination methods for visualization' },
			{ name: 'PERMANOVA', desc: 'Multivariate significance test' },
			{ name: 'Core ecology', desc: 'Keep as summary metric' }
		]
	},
	// Phase 4: Functional Analysis
	{
		type: 'phase',
		title: 'Phase 4: Functional Profiling',
		text: 'Analyze predicted metabolic functions from PICRUSt2.',
		phase: 4
	},
	{
		type: 'task',
		title: 'Step 8: Functional Bar Charts',
		text: `Create stacked bar charts of pathway categories (collapsed to higher levels).`,
		command: `Rscript -e "library(ggplot2); library(dplyr); library(tidyr); pathway <- read.delim('picrust2_output/pathways_out/path_abun_unstrat.tsv', row.names=1); pathway_map <- read.delim('picrust2_output/metacyc_hierarchy.tsv'); pathway_rel <- sweep(pathway, 2, colSums(pathway), '/') * 100; pathway_long <- pathway_rel %>% rownames_to_column('pathway') %>% pivot_longer(-pathway, names_to='Sample', values_to='Abundance') %>% left_join(pathway_map, by='pathway') %>% group_by(Sample, Superclass) %>% summarise(Abundance=sum(Abundance)); ggplot(pathway_long, aes(x=Sample, y=Abundance, fill=Superclass)) + geom_bar(stat='identity') + labs(title='Pathway Categories', y='Relative Abundance (%)') + theme_minimal() + theme(axis.text.x=element_text(angle=45, hjust=1))"`,
		explanation: 'Collapse pathways to MetaCyc superclasses (e.g., Biosynthesis, Degradation) for overview.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'Superclass', desc: 'High-level pathway category' },
			{ name: 'KEGG level 2/3', desc: 'Alternative hierarchy' },
			{ name: 'Relative abundance', desc: 'Normalized to 100%' }
		]
	},
	{
		type: 'task',
		title: 'Step 9: Function Heatmap (KO/EC)',
		text: `Create a heatmap of top variable KO features using ComplexHeatmap.`,
		command: `Rscript -e "library(ComplexHeatmap); library(viridis); ko <- read.delim('picrust2_output/KO_metagenome_out/pred_metagenome_unstrat.tsv', row.names=1); ko_var <- apply(ko, 1, var); top_ko <- ko[order(ko_var, decreasing=TRUE)[1:50],]; ko_clr <- t(apply(log2(top_ko+1), 1, function(x) x - mean(x))); Heatmap(as.matrix(ko_clr), name='CLR', col=viridis(100), row_names_gp=gpar(fontsize=6), column_names_gp=gpar(fontsize=8), column_title='Top 50 Variable KOs')"`,
		explanation: 'Filter to top N by variance or prevalence. Use CLR or log transform for compositional data.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'ComplexHeatmap', desc: 'Publication-quality heatmaps' },
			{ name: 'CLR transform', desc: 'Centered log-ratio for composition' },
			{ name: 'Top N variance', desc: 'Filter informative features' }
		]
	},
	{
		type: 'task',
		title: 'Step 10: Differential Functional Abundance',
		text: `Identify significantly different KOs between groups using ALDEx2.`,
		command: `Rscript -e "library(ALDEx2); ko <- read.delim('picrust2_output/KO_metagenome_out/pred_metagenome_unstrat.tsv', row.names=1); metadata <- read.csv('metadata.csv', row.names=1); ko <- ko[, rownames(metadata)]; aldex_out <- aldex(round(ko), metadata\\$Group, mc.samples=128, test='t', effect=TRUE); sig <- aldex_out[aldex_out\\$we.eBH < 0.05,]; cat('Significant KOs:', nrow(sig)); aldex.plot(aldex_out, type='MA', test='effect')"`,
		explanation: 'ALDEx2 handles compositional data properly. Report effect size + adjusted p-values.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'ALDEx2', desc: 'Compositional-aware testing' },
			{ name: 'effect size', desc: 'Biological significance' },
			{ name: 'we.eBH', desc: 'Welch t-test adjusted p-value' }
		]
	},
	{
		type: 'task',
		title: 'Step 11: Volcano Plot (Functional)',
		text: `Create a volcano plot of differential KO abundance.`,
		command: `Rscript -e "library(ggplot2); library(ALDEx2); ko <- read.delim('picrust2_output/KO_metagenome_out/pred_metagenome_unstrat.tsv', row.names=1); metadata <- read.csv('metadata.csv', row.names=1); ko <- ko[, rownames(metadata)]; aldex_out <- aldex(round(ko), metadata\\$Group, mc.samples=128, test='t', effect=TRUE); aldex_out\\$KO <- rownames(aldex_out); ggplot(aldex_out, aes(x=effect, y=-log10(we.eBH))) + geom_point(aes(color=we.eBH < 0.05), alpha=0.6) + geom_hline(yintercept=-log10(0.05), linetype='dashed', color='red') + labs(title='Differential KO Abundance', x='Effect Size', y='-log10(adj. p-value)') + scale_color_manual(values=c('grey','red'), name='Significant') + theme_minimal()"`,
		explanation: 'Volcano plots show both statistical significance and effect size for each feature.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'Effect size', desc: 'X-axis: biological magnitude' },
			{ name: '-log10(p)', desc: 'Y-axis: statistical significance' },
			{ name: 'Color', desc: 'Highlight significant features' }
		]
	},
	// Phase 5: Taxonomic Composition
	{
		type: 'phase',
		title: 'Phase 5: Taxonomic Composition',
		text: 'Create taxonomic visualizations.',
		phase: 5
	},
	{
		type: 'task',
		title: 'Step 12: Taxonomic Bar Plot',
		text: `Create a stacked bar plot of phylum-level composition.`,
		command: `Rscript -e "library(phyloseq); library(ggplot2); ps <- readRDS('phyloseq_object.rds'); ps_phylum <- tax_glom(ps, taxrank='Phylum'); ps_rel <- transform_sample_counts(ps_phylum, function(x) x/sum(x)*100); plot_bar(ps_rel, fill='Phylum') + labs(title='Phylum-level Composition', y='Relative Abundance (%)') + theme_minimal()"`,
		explanation: 'tax_glom() aggregates to a taxonomic level; transform converts to relative abundance.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'tax_glom()', desc: 'Aggregate to taxonomic level' },
			{ name: 'transform_sample_counts()', desc: 'Convert to relative abundance' },
			{ name: 'plot_bar()', desc: 'Stacked bar plot' }
		]
	},
	{
		type: 'task',
		title: 'Step 13: Genus Heatmap',
		text: `Create a heatmap of top genera.`,
		command: `Rscript -e "library(phyloseq); library(ComplexHeatmap); ps <- readRDS('phyloseq_object.rds'); ps_genus <- tax_glom(ps, 'Genus'); top20 <- names(sort(taxa_sums(ps_genus), decreasing=TRUE)[1:20]); ps_top <- prune_taxa(top20, ps_genus); mat <- log10(as.matrix(otu_table(ps_top))+1); Heatmap(mat, name='log10', column_title='Top 20 Genera')"`,
		explanation: 'Heatmaps show abundance patterns across samples for the most abundant taxa.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'prune_taxa()', desc: 'Subset to specific taxa' },
			{ name: 'log10(mat+1)', desc: 'Log transform for visualization' },
			{ name: 'ComplexHeatmap', desc: 'Clustered heatmap' }
		]
	},
	// Phase 6: Generate Report
	{
		type: 'phase',
		title: 'Phase 6: Compile PDF Report',
		text: 'Combine all elements into a final PDF report.',
		phase: 6
	},
	{
		type: 'task',
		title: 'Step 14: Create R Markdown Document',
		text: `Write the R Markdown file with all microbiome analyses.`,
		command: `cat > microbiome_report.Rmd << 'EOF'
---
title: "16S Microbiome Analysis Report"
author: "BioLearn"
date: "\`r Sys.Date()\`"
output: pdf_document
---

\`\`\`{r setup, include=FALSE}
knitr::opts_chunk$set(echo=FALSE, message=FALSE, warning=FALSE)
library(phyloseq); library(ggplot2); library(vegan)
library(kableExtra); library(ComplexHeatmap); library(ALDEx2)
ps <- readRDS("phyloseq_object.rds")
ko <- read.delim("picrust2_output/KO_metagenome_out/pred_metagenome_unstrat.tsv", row.names=1)
\`\`\`

# Alpha Diversity (Taxa)
\`\`\`{r, fig.height=4}
alpha <- estimate_richness(ps, measures=c("Shannon","Observed"))
alpha$Group <- sample_data(ps)$Group
ggplot(alpha, aes(x=Group, y=Shannon, fill=Group)) + geom_boxplot() + theme_minimal()
\`\`\`

# Beta Diversity (Taxa)
\`\`\`{r, fig.height=5}
ord <- ordinate(ps, "PCoA", "bray")
plot_ordination(ps, ord, color="Group") + stat_ellipse() + theme_minimal()
\`\`\`

# Functional Pathway Categories
\`\`\`{r, fig.height=5}
# Pathway bar chart code here
\`\`\`

# Function Heatmap (Top KOs)
\`\`\`{r, fig.height=6}
ko_var <- apply(ko, 1, var)
top_ko <- ko[order(ko_var, decreasing=TRUE)[1:30],]
Heatmap(log2(as.matrix(top_ko)+1), name="log2")
\`\`\`

# Differential Functional Abundance
\`\`\`{r, fig.height=5}
# ALDEx2 volcano plot code here
\`\`\`

# Taxonomic Composition
\`\`\`{r, fig.height=5}
ps_phylum <- tax_glom(ps, "Phylum")
plot_bar(ps_phylum, fill="Phylum") + theme_minimal()
\`\`\`
EOF`,
		explanation: 'The R Markdown document loads data once in setup chunk and reuses throughout.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'setup chunk', desc: 'Load libraries and data once' },
			{ name: 'fig.height', desc: 'Control figure dimensions' }
		]
	},
	{
		type: 'task',
		title: 'Step 15: Render PDF Report',
		text: `Compile the microbiome report to PDF.`,
		command: `Rscript -e "rmarkdown::render('microbiome_report.Rmd')"`,
		explanation: 'The render function executes all code chunks and compiles to PDF.',
		requiredDir: '/data/amplicon_report',
		parameters: [
			{ name: 'render()', desc: 'Compile R Markdown' },
			{ name: 'Output', desc: 'microbiome_report.pdf' }
		]
	},
	{
		type: 'complete',
		title: 'Report Generation Complete',
		text: `Congratulations! You have created a comprehensive 16S microbiome PDF report.\n\n**Report Contents:**\n• Alpha diversity (Shannon/Observed ASVs) - Baseline quality\n• Beta diversity (PCoA + PERMANOVA) - Core ecology summary\n• Functional bar charts - Pathway categories collapsed\n• Function heatmap - Top N KO/EC by variance\n• Differential abundance - Effect size + adj. p-values\n• Taxonomic composition - Phylum bar plots\n\n**Key Packages Learned:**\n• phyloseq - Microbiome data handling\n• vegan - PERMANOVA, ordination\n• ALDEx2 - Compositional differential testing\n• ComplexHeatmap - Publication heatmaps\n• PICRUSt2 - Functional inference (note: predictions)\n\n**Output:** microbiome_report.pdf`
	}
];

export const amplicon: Storyline = {
	id: 'amplicon',
	category: 'reports',
	title: '16S/Amplicon Report',
	subtitle: 'Diversity, Functional & Composition',
	organism: 'Microbiome',
	technology: 'r-report',
	technologyLabel: 'R/RMarkdown',
	dataDir: '/data/amplicon_report',
	toolsUsed: ['Rscript', 'rmarkdown', 'phyloseq', 'vegan', 'ALDEx2', 'ComplexHeatmap', 'PICRUSt2'],
	sections: ampliconReportSections
};
