/**
 * Formatting utilities for terminal output
 *
 * Centralizes formatting logic to eliminate code duplication across Terminal.svelte
 * and other components that need to format bioinformatics tool outputs.
 */

import type { AmrGeneEntry, MlstProfile } from '$lib/storylines/types';

/**
 * Format a single AMR gene entry as a TSV row for abricate output
 */
export function formatAmrGeneRow(gene: AmrGeneEntry, database: string): string {
	const coverage = `1-${gene.end - gene.start}/${gene.end - gene.start}`;
	return `assembly.fasta\t${gene.contig}\t${gene.start}\t${gene.end}\t${gene.strand}\t${gene.gene}\t${coverage}\t0/0\t${gene.coverage.toFixed(2)}\t${gene.identity.toFixed(2)}\t${database}\t${gene.accession}\t${gene.product}\t${gene.resistance}`;
}

/**
 * Format AMR genes array as TSV rows
 */
export function formatAmrGeneRows(genes: AmrGeneEntry[], database: string): string {
	return genes.map(g => formatAmrGeneRow(g, database)).join('\n');
}

/**
 * Format MLST profile as a TSV row
 */
export function formatMlstRow(mlst: MlstProfile, filename: string = 'o_unicycler/assembly.fasta'): string {
	const alleleList = Object.entries(mlst.alleles)
		.map(([locus, num]) => `${locus}(${num})`)
		.join('\t');
	return `${filename}\t${mlst.scheme}\t${mlst.st.replace('ST', '')}\t${alleleList}`;
}

/**
 * ANSI color codes for terminal file display
 */
const ANSI_COLORS = {
	BLUE: '\x1b[34m',
	GREEN: '\x1b[32m',
	YELLOW: '\x1b[33m',
	MAGENTA: '\x1b[35m',
	RESET: '\x1b[0m'
} as const;

/**
 * File extensions for color coding
 */
const FILE_COLORS: { extensions: string[]; color: string }[] = [
	{ extensions: ['.gz', '.fastq', '.fasta', '.fq', '.fa'], color: ANSI_COLORS.GREEN },
	{ extensions: ['.html', '.log'], color: ANSI_COLORS.YELLOW },
	{ extensions: ['.png', '.svg', '.jpg', '.jpeg'], color: ANSI_COLORS.MAGENTA }
];

/**
 * Apply ANSI color coding to a filename based on its extension
 * - Blue for directories (ending with /)
 * - Green for sequence/compressed files (.gz, .fastq, .fasta)
 * - Yellow for reports/logs (.html, .log)
 * - Magenta for images (.png, .svg)
 * - No color for other files
 */
export function formatFileColor(filename: string): string {
	// Directories are blue
	if (filename.endsWith('/')) {
		return `${ANSI_COLORS.BLUE}${filename}${ANSI_COLORS.RESET}`;
	}

	// Check against known file type colors
	for (const { extensions, color } of FILE_COLORS) {
		if (extensions.some(ext => filename.endsWith(ext))) {
			return `${color}${filename}${ANSI_COLORS.RESET}`;
		}
	}

	// No color for other files
	return filename;
}

/**
 * Apply color coding to an array of filenames
 */
export function formatFileColors(filenames: string[]): string[] {
	return filenames.map(formatFileColor);
}
