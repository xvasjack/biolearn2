import type { Storyline, StorylineSection } from '../types';

const rnaseqReportSections: StorylineSection[] = [
	{
		type: 'intro',
		text: `Creating RNA-Seq Differential Expression Report:\n\nYou have completed an RNA-seq analysis and need to generate a publication-ready PDF report summarizing the differential expression findings.`,
		hint: null,
		requiredDir: null
	},
	{
		type: 'context',
		text: `This tutorial will guide you through creating an R Markdown report that includes:\n\n• Sample QC and PCA plots\n• Differential expression statistics\n• Volcano plots\n• Expression heatmaps\n• Pathway enrichment analysis\n\nWe'll use DESeq2 and related Bioconductor packages.`,
		hint: null,
		requiredDir: null
	},
	// Phase 1: Setup
	{
		type: 'phase',
		title: 'Phase 1: Environment Setup',
		text: 'Install and load packages for RNA-seq analysis and reporting.',
		phase: 1
	},
	{
		type: 'task',
		title: 'Step 1: Install CRAN Packages',
		text: `Install core R packages for visualization and reporting.`,
		command: `Rscript -e "install.packages(c('rmarkdown', 'knitr', 'kableExtra', 'ggplot2', 'dplyr', 'tidyr', 'pheatmap', 'RColorBrewer', 'ggrepel'), repos='https://cran.r-project.org')"`,
		explanation: 'ggrepel helps avoid overlapping labels in plots like volcano plots.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'ggrepel', desc: 'Non-overlapping labels' },
			{ name: 'pheatmap', desc: 'Expression heatmaps' },
			{ name: 'RColorBrewer', desc: 'Color palettes' }
		]
	},
	{
		type: 'task',
		title: 'Step 2: Install Bioconductor Packages',
		text: `Install DESeq2 and pathway analysis packages.`,
		command: `Rscript -e "if (!require('BiocManager', quietly=TRUE)) install.packages('BiocManager'); BiocManager::install(c('DESeq2', 'EnhancedVolcano', 'clusterProfiler', 'org.Hs.eg.db', 'enrichplot'))"`,
		explanation: 'DESeq2 is the gold standard for RNA-seq differential expression; clusterProfiler for pathway analysis.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'DESeq2', desc: 'Differential expression analysis' },
			{ name: 'EnhancedVolcano', desc: 'Publication volcano plots' },
			{ name: 'clusterProfiler', desc: 'GO/KEGG enrichment' },
			{ name: 'org.Hs.eg.db', desc: 'Human gene annotations' }
		]
	},
	{
		type: 'task',
		title: 'Step 3: Install TinyTeX',
		text: `Install TinyTeX for PDF compilation.`,
		command: `Rscript -e "install.packages('tinytex'); tinytex::install_tinytex()"`,
		explanation: 'Required for R Markdown to PDF conversion.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'tinytex', desc: 'LaTeX for PDF generation' }
		]
	},
	// Phase 2: Data Loading
	{
		type: 'phase',
		title: 'Phase 2: Load Expression Data',
		text: 'Import count matrix and sample information.',
		phase: 2
	},
	{
		type: 'task',
		title: 'Step 4: Load Count Matrix',
		text: `Read the gene expression count matrix.`,
		command: `Rscript -e "counts <- read.csv('counts_matrix.csv', row.names=1); print(dim(counts)); print(head(counts[,1:4]))"`,
		explanation: 'Count matrix has genes as rows and samples as columns.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'row.names=1', desc: 'First column as gene IDs' },
			{ name: 'dim()', desc: 'Check matrix dimensions' }
		]
	},
	{
		type: 'task',
		title: 'Step 5: Load Sample Metadata',
		text: `Read the sample information file.`,
		command: `Rscript -e "coldata <- read.csv('sample_info.csv', row.names=1); print(coldata); print(table(coldata\\$condition))"`,
		explanation: 'Sample info must have a condition column for differential expression.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'condition', desc: 'Treatment vs Control groups' },
			{ name: 'table()', desc: 'Count samples per group' }
		]
	},
	{
		type: 'task',
		title: 'Step 6: Create DESeq2 Object',
		text: `Create the DESeqDataSet object for analysis.`,
		command: `Rscript -e "library(DESeq2); counts <- read.csv('counts_matrix.csv', row.names=1); coldata <- read.csv('sample_info.csv', row.names=1); dds <- DESeqDataSetFromMatrix(countData=counts, colData=coldata, design=~condition); print(dds)"`,
		explanation: 'DESeqDataSet combines counts, metadata, and experimental design.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'DESeqDataSetFromMatrix()', desc: 'Create DESeq2 object' },
			{ name: 'design=~condition', desc: 'Model formula' }
		]
	},
	// Phase 3: QC and Statistics
	{
		type: 'phase',
		title: 'Phase 3: QC and Differential Expression',
		text: 'Perform quality control and run DESeq2.',
		phase: 3
	},
	{
		type: 'task',
		title: 'Step 7: Run DESeq2 Analysis',
		text: `Perform differential expression analysis.`,
		command: `Rscript -e "library(DESeq2); counts <- read.csv('counts_matrix.csv', row.names=1); coldata <- read.csv('sample_info.csv', row.names=1); dds <- DESeqDataSetFromMatrix(countData=counts, colData=coldata, design=~condition); dds <- DESeq(dds); res <- results(dds); summary(res)"`,
		explanation: 'DESeq() performs normalization, dispersion estimation, and statistical testing.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'DESeq()', desc: 'Run full analysis pipeline' },
			{ name: 'results()', desc: 'Extract results table' },
			{ name: 'summary()', desc: 'Show up/down regulated counts' }
		]
	},
	{
		type: 'task',
		title: 'Step 8: Results Summary Table',
		text: `Create a summary table of significant genes.`,
		command: `Rscript -e "library(DESeq2); library(kableExtra); # ... load data and run DESeq2 ...; res_df <- as.data.frame(res) %>% filter(!is.na(padj)) %>% arrange(padj) %>% head(20); res_df %>% select(baseMean, log2FoldChange, padj) %>% kable(caption='Top 20 DE Genes', digits=c(1,2,4)) %>% kable_styling()"`,
		explanation: 'Filter for significant genes and display top results.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'padj', desc: 'Adjusted p-value (BH correction)' },
			{ name: 'log2FoldChange', desc: 'Effect size' },
			{ name: 'baseMean', desc: 'Average expression level' }
		]
	},
	// Phase 4: Visualizations
	{
		type: 'phase',
		title: 'Phase 4: Create Visualizations',
		text: 'Generate RNA-seq specific plots.',
		phase: 4
	},
	{
		type: 'task',
		title: 'Step 9: PCA Plot',
		text: `Create a PCA plot of sample relationships.`,
		command: `Rscript -e "library(DESeq2); library(ggplot2); # ... create dds ...; vsd <- vst(dds, blind=FALSE); pcaData <- plotPCA(vsd, intgroup='condition', returnData=TRUE); percentVar <- round(100*attr(pcaData,'percentVar')); ggplot(pcaData, aes(PC1, PC2, color=condition)) + geom_point(size=4) + xlab(paste0('PC1: ',percentVar[1],'%')) + ylab(paste0('PC2: ',percentVar[2],'%')) + theme_minimal()"`,
		explanation: 'PCA shows sample clustering and potential batch effects.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'vst()', desc: 'Variance stabilizing transformation' },
			{ name: 'plotPCA()', desc: 'DESeq2 PCA function' },
			{ name: 'percentVar', desc: 'Variance explained by each PC' }
		]
	},
	{
		type: 'task',
		title: 'Step 10: Volcano Plot',
		text: `Create a volcano plot of differential expression.`,
		command: `Rscript -e "library(EnhancedVolcano); # ... get res ...; EnhancedVolcano(res, lab=rownames(res), x='log2FoldChange', y='padj', title='Treatment vs Control', pCutoff=0.05, FCcutoff=1, pointSize=2.0, labSize=3.0)"`,
		explanation: 'Volcano plots show significance vs fold change for all genes.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'EnhancedVolcano()', desc: 'Publication-ready volcano plot' },
			{ name: 'pCutoff', desc: 'Significance threshold' },
			{ name: 'FCcutoff', desc: 'Fold change threshold' }
		]
	},
	{
		type: 'task',
		title: 'Step 11: Expression Heatmap',
		text: `Create a heatmap of top variable genes.`,
		command: `Rscript -e "library(DESeq2); library(pheatmap); # ... create vsd ...; topVarGenes <- head(order(rowVars(assay(vsd)), decreasing=TRUE), 50); mat <- assay(vsd)[topVarGenes,]; mat <- mat - rowMeans(mat); pheatmap(mat, annotation_col=coldata['condition'], color=colorRampPalette(c('blue','white','red'))(100), main='Top 50 Variable Genes')"`,
		explanation: 'Heatmaps show expression patterns across samples for variable genes.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'rowVars()', desc: 'Calculate row variance' },
			{ name: 'annotation_col', desc: 'Add sample annotations' },
			{ name: 'mat - rowMeans(mat)', desc: 'Center rows' }
		]
	},
	{
		type: 'task',
		title: 'Step 12: GO Enrichment Plot',
		text: `Perform and visualize GO enrichment analysis.`,
		command: `Rscript -e "library(clusterProfiler); library(org.Hs.eg.db); # Get significant genes ...; ego <- enrichGO(gene=sig_genes, OrgDb=org.Hs.eg.db, ont='BP', pAdjustMethod='BH', pvalueCutoff=0.05, readable=TRUE); dotplot(ego, showCategory=15, title='GO Biological Process')"`,
		explanation: 'GO enrichment identifies overrepresented biological processes.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'enrichGO()', desc: 'GO enrichment analysis' },
			{ name: 'ont="BP"', desc: 'Biological Process ontology' },
			{ name: 'dotplot()', desc: 'Visualization of enrichment' }
		]
	},
	// Phase 5: Generate Report
	{
		type: 'phase',
		title: 'Phase 5: Compile PDF Report',
		text: 'Combine all elements into a final PDF report.',
		phase: 5
	},
	{
		type: 'task',
		title: 'Step 13: Create R Markdown Document',
		text: `Write the R Markdown file for RNA-seq report.`,
		command: `cat > rnaseq_report.Rmd << 'EOF'
---
title: "RNA-Seq Differential Expression Report"
author: "BioLearn"
date: "\`r Sys.Date()\`"
output: pdf_document
---

\`\`\`{r setup, include=FALSE}
knitr::opts_chunk$set(echo=FALSE, message=FALSE, warning=FALSE)
library(DESeq2); library(ggplot2); library(pheatmap)
library(EnhancedVolcano); library(kableExtra)
counts <- read.csv("counts_matrix.csv", row.names=1)
coldata <- read.csv("sample_info.csv", row.names=1)
dds <- DESeqDataSetFromMatrix(counts, coldata, ~condition)
dds <- DESeq(dds); res <- results(dds)
\`\`\`

# Sample QC
\`\`\`{r, fig.height=5}
vsd <- vst(dds, blind=FALSE)
plotPCA(vsd, intgroup="condition")
\`\`\`

# Differential Expression
\`\`\`{r}
summary(res)
\`\`\`

# Volcano Plot
\`\`\`{r, fig.height=6}
EnhancedVolcano(res, lab=rownames(res), x='log2FoldChange', y='padj')
\`\`\`

# Expression Heatmap
\`\`\`{r, fig.height=8}
topGenes <- head(order(rowVars(assay(vsd)), decreasing=TRUE), 30)
pheatmap(assay(vsd)[topGenes,])
\`\`\`
EOF`,
		explanation: 'The setup chunk runs DESeq2 once; results are reused in subsequent chunks.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'setup chunk', desc: 'Run analysis once' },
			{ name: 'Subsequent chunks', desc: 'Use pre-computed results' }
		]
	},
	{
		type: 'task',
		title: 'Step 14: Render PDF Report',
		text: `Compile the RNA-seq report to PDF.`,
		command: `Rscript -e "rmarkdown::render('rnaseq_report.Rmd')"`,
		explanation: 'Rendering executes all chunks and compiles to the specified output format.',
		requiredDir: '/data/rnaseq_report',
		parameters: [
			{ name: 'render()', desc: 'Compile R Markdown' },
			{ name: 'Output', desc: 'rnaseq_report.pdf' }
		]
	},
	{
		type: 'complete',
		title: 'Report Generation Complete',
		text: `Congratulations! You have created an RNA-seq PDF report.\n\n**Report Contents:**\n• Sample PCA plot\n• Differential expression summary\n• Volcano plot\n• Expression heatmap\n• GO enrichment analysis\n\n**Key Packages Learned:**\n• DESeq2 - Differential expression\n• EnhancedVolcano - Volcano plots\n• clusterProfiler - Pathway enrichment\n• pheatmap - Expression heatmaps\n\n**Output:** rnaseq_report.pdf\n\n**Next Steps:**\n• Add KEGG pathway analysis\n• Include MA plot\n• Add gene-level expression profiles`
	}
];

export const rnaseq: Storyline = {
	id: 'rnaseq',
	category: 'reports',
	title: 'RNA-Seq Report',
	subtitle: 'Differential Expression',
	organism: 'Transcriptome',
	technology: 'r-report',
	technologyLabel: 'R/RMarkdown',
	dataDir: '/data/rnaseq_report',
	toolsUsed: ['Rscript', 'rmarkdown', 'DESeq2', 'EnhancedVolcano', 'clusterProfiler', 'pheatmap'],
	sections: rnaseqReportSections
};
