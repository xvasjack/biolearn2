import type { TerminalContext } from './types';

// matches o_tool or o_toolname.ext or o_toolname/
export function getToolFromOutputName(name: string, ctx: TerminalContext): string | null {
	if (!name.startsWith('o_')) return null;
	const suffix = name.slice(2); // Remove 'o_' prefix
	// Check against known bio tools (longest match first to avoid partial matches)
	const tools = Array.from(ctx.getBioTools());
	for (const tool of tools) {
		if (suffix === tool || suffix.startsWith(tool + '/') || suffix.startsWith(tool + '.') || suffix.startsWith(tool + '_')) {
			return tool;
		}
	}
	return null;
}


// Generate dynamic tool output based on input file
export function getToolOutput(tool: string, args: string[], fullCmd: string, ctx: TerminalContext): any {
	// Get storyline-specific stats from the current context
	const context = ctx.getStorylineContext();
	const stats = ctx.getStorylineStats(context?.category || 'tutorial', context?.storyline || 'kpneumoniae-demo');

	// Extract input file from command
	const inputFile = args.find(a => a.endsWith('.fastq.gz') || a.endsWith('.fq.gz')) || 'sample_01_R1.fastq.gz';
	const isR2 = inputFile.includes('R2');
	const sampleMatch = inputFile.match(/sample_(\d+)/);
	const sampleNum = sampleMatch ? sampleMatch[1] : '01';
	const sampleName = `sample_${sampleNum}`;

	// Detect sequencing technology from file name
	const isHiFi = inputFile.includes('_hifi');
	const isNanopore = inputFile.includes('_nanopore');
	const isLongRead = isHiFi || isNanopore;

	// Use storyline-specific stats (with fallbacks for long-read technologies)
	// Long-read technologies override some stats when detected from filename
	const totalReads = isHiFi ? 32456 : (isNanopore ? 78234 : stats.totalReads);
	const gcContent = isR2 ? (stats.gcContent - 0.4) : stats.gcContent;
	const adapterPercent = isR2 ? 2.8 : 3.2;

	// Read length varies by technology (use stats for Illumina, hardcoded for long-read)
	const readLength = isHiFi ? 14523 : (isNanopore ? 8234 : stats.readLength);
	const minLen = isHiFi ? 1234 : (isNanopore ? 456 : stats.minLen);
	const maxLen = isHiFi ? 45678 : (isNanopore ? 32456 : stats.maxLen);
	const totalBases = totalReads * readLength;

	// Generate file names for paired-end reads
	const file1 = inputFile.replace('_R2', '_R1').replace('_2.fastq', '_1.fastq');
	const file2 = inputFile.replace('_R1', '_R2').replace('_1.fastq', '_2.fastq');
	const totalBasesAll = totalBases * 2;

	// Trimmomatic results using storyline-specific percentages
	const trimBothSurviving = Math.round(totalReads * (stats.trimBothSurvivingPercent / 100));
	const trimForwardOnly = Math.round(totalReads * (stats.trimForwardOnlyPercent / 100));
	const trimReverseOnly = Math.round(totalReads * (stats.trimReverseOnlyPercent / 100));
	const trimDropped = totalReads - trimBothSurviving - trimForwardOnly - trimReverseOnly;

	const outputs: Record<string, any> = {
		'seqkit': {
			output: `\x1b[32m[INFO]\x1b[0m Processing files...
file                           format  type   num_seqs      sum_len  min_len  avg_len  max_len
${file1.padEnd(30)} FASTQ   DNA    ${totalReads.toLocaleString()}  ${totalBases.toLocaleString()}      ${minLen}      ${readLength}      ${maxLen}
${file2.padEnd(30)} FASTQ   DNA    ${totalReads.toLocaleString()}  ${totalBases.toLocaleString()}      ${minLen}      ${readLength}      ${maxLen}

\x1b[32m[INFO]\x1b[0m Summary Statistics:
  Total reads:     ${(totalReads * 2).toLocaleString()} (${totalReads.toLocaleString()} pairs)
  Total bases:     ${totalBasesAll.toLocaleString()}
  GC content:      ${gcContent}%
  Q20 bases:       ${isLongRead ? '99.8' : stats.q20Percent}%
  Q30 bases:       ${isLongRead ? '98.2' : stats.q30Percent}%
`,
			summary: undefined
		},
		'fastqc': {
			output: `Picked up _JAVA_OPTIONS: -Xmx1g
FastQC v0.12.1

Started analysis of ${file1}
Approx 5% complete for ${file1}
Approx 10% complete for ${file1}
Approx 15% complete for ${file1}
Approx 20% complete for ${file1}
Approx 25% complete for ${file1}
Approx 30% complete for ${file1}
Approx 35% complete for ${file1}
Approx 40% complete for ${file1}
Approx 45% complete for ${file1}
Approx 50% complete for ${file1}
Approx 55% complete for ${file1}
Approx 60% complete for ${file1}
Approx 65% complete for ${file1}
Approx 70% complete for ${file1}
Approx 75% complete for ${file1}
Approx 80% complete for ${file1}
Approx 85% complete for ${file1}
Approx 90% complete for ${file1}
Approx 95% complete for ${file1}
Analysis complete for ${file1}
Started analysis of ${file2}
Approx 5% complete for ${file2}
Approx 10% complete for ${file2}
Approx 15% complete for ${file2}
Approx 20% complete for ${file2}
Approx 25% complete for ${file2}
Approx 30% complete for ${file2}
Approx 35% complete for ${file2}
Approx 40% complete for ${file2}
Approx 45% complete for ${file2}
Approx 50% complete for ${file2}
Approx 55% complete for ${file2}
Approx 60% complete for ${file2}
Approx 65% complete for ${file2}
Approx 70% complete for ${file2}
Approx 75% complete for ${file2}
Approx 80% complete for ${file2}
Approx 85% complete for ${file2}
Approx 90% complete for ${file2}
Approx 95% complete for ${file2}
Analysis complete for ${file2}
`,
			summary: {
				'Forward Reads (R1)': file1,
				'Reverse Reads (R2)': file2,
				'R1 Total Sequences': totalReads.toLocaleString(),
				'R2 Total Sequences': totalReads.toLocaleString(),
				'R1 Quality': stats.fastqc?.r1Quality ?? 'PASS',
				'R2 Quality': stats.fastqc?.r2Quality ?? 'PASS',
				'Avg Read Length': `${readLength} bp`,
				'GC Content': `${gcContent}%`,
				'Adapter Content': stats.fastqc?.adapterContent ?? 'Negligible'
			},
			chartData: undefined
		},
		'multiqc': {
			output: `\x1b[34m/// \x1b[0m\x1b[1mMultiQC\x1b[0m 🔍 | v1.14
\x1b[34m/// \x1b[0m

\x1b[32m[INFO]\x1b[0m     multiqc : This is MultiQC v1.14
\x1b[32m[INFO]\x1b[0m     search_modules : Searching o_fastqc/ for analysis results
\x1b[32m[INFO]\x1b[0m     fastqc : Found ${stats.multiqc?.numSamples ?? 8} reports
\x1b[32m[INFO]\x1b[0m     write_results : Compiling report
\x1b[32m[INFO]\x1b[0m     write_results : Report written to multiqc_report.html
\x1b[32m[INFO]\x1b[0m     write_results : Data exported to multiqc_data/
\x1b[32m[INFO]\x1b[0m     multiqc : MultiQC complete
`,
			summary: {
				'FastQC Reports': `${stats.multiqc?.numSamples ?? 8} samples`,
				'Mean Quality Score': `${stats.multiqc?.meanQualityScore ?? 34.2}`,
				'Mean GC Content': `${stats.multiqc?.meanGcContent ?? 55.2}%`,
				'Samples Passing': `${stats.multiqc?.samplesPassing ?? 8}/${stats.multiqc?.numSamples ?? 8} (${Math.round(((stats.multiqc?.samplesPassing ?? 8) / (stats.multiqc?.numSamples ?? 8)) * 100)}%)`,
				'Adapter Content': stats.multiqc?.adapterContent ?? 'Low (<5%)',
				'Report Generated': 'multiqc_report.html'
			},
			chartData: {
				title: 'Mean Quality Scores Across Samples',
				x: stats.multiqc?.sampleNames ?? ['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5', 'Sample 6', 'Sample 7', 'Sample 8'],
				y: stats.multiqc?.sampleQualityScores ?? [34.5, 33.8, 34.2, 34.1, 33.9, 34.3, 34.0, 34.4],
				type: 'bar',
				xLabel: 'Sample',
				yLabel: 'Mean Quality Score'
			}
		},
		'trimmomatic': {
			output: `Picked up _JAVA_OPTIONS: -Xmx8g
TrimmomaticPE: Started with arguments:
 -threads 2 -phred33 ${file1} ${file2} o_trimmomatic/${sampleName}_R1_paired.fq.gz o_trimmomatic/${sampleName}_R1_unpaired.fq.gz o_trimmomatic/${sampleName}_R2_paired.fq.gz o_trimmomatic/${sampleName}_R2_unpaired.fq.gz ILLUMINACLIP:/home/pop/miniconda3/envs/env_seqkit/share/trimmomatic/adapters/TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36
ILLUMINACLIP: Using adapter file from user-specified absolute path: .../miniconda3/envs/env_seqkit/share/trimmomatic/adapters/TruSeq3-PE.fa
Using PrefixPair: 'TACACTCTTTCCCTACACGACGCTCTTCCGATCT' and 'GTGACTGGAGTTCAGACGTGTGCTCTTCCGATCT'
ILLUMINACLIP: Using 1 prefix pairs, 0 forward/reverse sequences, 0 forward only sequences, 0 reverse only sequences
Input Read Pairs: ${totalReads.toLocaleString()} Both Surviving: ${trimBothSurviving.toLocaleString()} (${(trimBothSurviving / totalReads * 100).toFixed(2)}%) Forward Only Surviving: ${trimForwardOnly.toLocaleString()} (${(trimForwardOnly / totalReads * 100).toFixed(2)}%) Reverse Only Surviving: ${trimReverseOnly.toLocaleString()} (${(trimReverseOnly / totalReads * 100).toFixed(2)}%) Dropped: ${trimDropped.toLocaleString()} (${(trimDropped / totalReads * 100).toFixed(2)}%)
TrimmomaticPE: Completed successfully
`,
			summary: {
				'Input Reads': `${totalReads.toLocaleString()} pairs`,
				'Both Surviving': `${trimBothSurviving.toLocaleString()} (${(trimBothSurviving / totalReads * 100).toFixed(2)}%)`,
				'Forward Only': `${trimForwardOnly.toLocaleString()} (${(trimForwardOnly / totalReads * 100).toFixed(2)}%)`,
				'Reverse Only': `${trimReverseOnly.toLocaleString()} (${(trimReverseOnly / totalReads * 100).toFixed(2)}%)`,
				'Dropped': `${trimDropped.toLocaleString()} (${(trimDropped / totalReads * 100).toFixed(2)}%)`
			},
			chartData: {
				title: 'Trimmomatic Read Retention',
				x: ['Both Surviving', 'Forward Only', 'Reverse Only', 'Dropped'],
				y: [trimBothSurviving, trimForwardOnly, trimReverseOnly, trimDropped],
				type: 'bar',
				xLabel: 'Read Category',
				yLabel: 'Number of Reads'
			}
		},
		'unicycler': {
			output: `
Starting Unicycler v0.5.0
    Welcome to Unicycler, an assembly pipeline for bacterial genomes. Since you provided only short reads,
Unicycler will essentially function as a SPAdes-optimiser. It will try many k-mer sizes, choose the best
based on contig length and graph connectivity, and scaffold the graph using SPAdes repeat resolution.
    For more information, please see https://github.com/rrwick/Unicycler

Unicycler version: v0.5.1
Using 4 threads

Dependencies:
  Program       Version   Status  
  spades.py     4.2.0     good    
  racon                   not used
  makeblastdb   2.5.0+    good    
  tblastn       2.5.0+    good    

\x1b[36mLoading reads...\x1b[0m
  Forward reads: ${trimBothSurviving.toLocaleString()}
  Reverse reads: ${trimBothSurviving.toLocaleString()}

SPAdes maximum k-mer: 127
Median read length: 300
K-mer range: 27, 53, 71, 87, 99, 111, 119, 127

K-mer   Contigs   Dead ends   Score      
   27                         too complex
   53       937           1      3.56e-04
   71       698           0      7.16e-04
   87       501           1      6.65e-04
   99       412           1      8.09e-04
  111       379           1      8.80e-04
  119       337           1      9.89e-04
  127       306           0      1.63e-03 <-best

Cleaning graph (2026-01-12 04:20:21)
    Unicycler now performs various cleaning procedures on the
graph to remove overlaps and simplify the graph structure. The
end result is a graph ready for bridging.

Graph overlaps removed

Removed zero-length segments:
    186, 187, 188, 190, 191, 192, 200, 201, 202, 203, 207, 208,
220, 224, 230, 246, 247, 248, 265, 267, 290

Removed zero-length segments:
    189, 239, 285, 296, 298

Merged small segments:
    282, 283, 284, 287, 288, 289, 291, 292, 293, 294, 297, 300,
301, 304

Creating SPAdes contig bridges (2026-01-12 04:20:21)
    SPAdes uses paired-end information to perform repeat
resolution (RR) and produce contigs from the assembly graph.
SPAdes saves the graph paths corresponding to these contigs in
the contigs.paths file. When one of these paths contains two or
more anchor contigs, Unicycler can create a bridge from the
path.


\x1b[1mCreating loop unrolling bridges\x1b[0m
-----------------------------------------------------
    When a SPAdes contig path connects an anchor contig with the middle contig
    of a simple loop, Unicycler concludes that the sequences are contiguous.

                                  Loop count   Loop count    Loop    Bridge
Start   Repeat   Middle     End    by repeat    by middle   count   quality
    2      137       99      20         0.37         0.79       1      34.9


\x1b[1mApplying bridges\x1b[0m
--------------------------------------
    Unicycler now applies to the graph in decreasing order of quality.

Bridge type   Start -> end   Path                                       Quality
SPAdes          25 -> 14                                                 63.243
SPAdes          13 -> -24    114                                         63.240
SPAdes          18 -> 39     -152                                        63.226
SPAdes           3 -> -14    114                                         63.157
SPAdes          37 -> 45     -109, 180, 139                              41.806
SPAdes          16 -> 54     172                                         33.902
SPAdes         -40 -> 42     -95, -205, -92, -258, 144                   27.855
SPAdes          19 -> 38     -120, 224, 116, -197, -168, -244, -165,     20.865
                             -132, -151, -259, -158, -183, -142
SPAdes          -5 -> 10     142, 182, 158, 242, 151, -131, 165,         20.721
                             -236, 168, 196, -116, 223, 120
SPAdes          40 -> 44     111, 80, -139, 179, 109                     19.855
SPAdes          -7 -> 25     153, -240, -121, -62, -155, 108, 154        14.885
SPAdes         -11 -> 12     -154, 107, 155, 63, 121, -235, -153         14.862
SPAdes          39 -> 31     -150, 96, 169, -91, -113, -77, -148,        14.257
                             -104, -146
SPAdes           9 -> 15     -150, -97, 169, -90, -113, 76, -148,        14.237
                             -105, -146
loop             2 -> 20     137, 99, 137                                34.907

Saving o_unicycler/004_bridges_applied.gfa


\x1b[1mBridged assembly graph\x1b[0m
--------------------------------------------
    The assembly is now mostly finished and no more structural changes will be made.
    Ideally the assembly graph should now have one contig per replicon and no
    erroneous contigs (i.e. a complete assembly).

Saving o_unicycler/005_final_clean.gfa

Component   Segments   Links   Length        N50       Longest segment   Status
    total        ${stats.bandage.nodes}     ${stats.bandage.edges}   ${stats.quast.totalLengthGe0.toLocaleString()}   ${stats.n50.toLocaleString()}           ${stats.largestContig.toLocaleString()}
        1        ${stats.bandage.largestComponentSegments}     ${stats.bandage.edges - stats.bandage.circularContigs}   ${stats.bandage.largestComponentSize.toLocaleString()}   ${stats.n50.toLocaleString()}           ${stats.largestContig.toLocaleString()}   incomplete
${stats.plasmidContigs.map((p, i) => `        ${i + 2}          1       1       ${p.size.toLocaleString()}     ${p.size.toLocaleString()}             ${p.size.toLocaleString()}     complete`).join('\n')}


\x1b[1mRotating completed replicons\x1b[0m
--------------------------------------------------
    Any completed circular contigs can have their start position changed without
    altering the sequence. Unicycler searches for a starting gene (dnaA or repA).

Segment   Length   Depth    Starting gene   Position   Strand   Identity   Coverage
${stats.plasmidContigs.map((p, i) => `     ${30 + i * 2}    ${p.size.toLocaleString()}    ${(Math.random() * 15 + 3).toFixed(2)}x   none found`).join('\n')}

\x1b[1;32mAssembly complete!\x1b[0m

\x1b[33mTip: Use 'bandage image o_unicycler/assembly.gfa o_bandage.png' to visualize the assembly graph\x1b[0m
`,
			summary: {
				'Total Segments': stats.bandage.nodes.toString(),
				'Total Length': `${stats.quast.totalLengthGe0.toLocaleString()} bp`,
				'N50': `${stats.n50.toLocaleString()} bp`,
				'Longest Segment': `${stats.largestContig.toLocaleString()} bp`,
				'Complete (circular)': `${stats.numCircular} components`,
				'Incomplete': `${stats.bandage.components - stats.bandage.circularContigs} component${stats.bandage.components - stats.bandage.circularContigs !== 1 ? 's' : ''} (${stats.bandage.largestComponentSegments} segments)`,
				'Status': stats.bandage.deadEnds > 0 ? 'incomplete' : 'complete'
			},
			chartData: {
				title: 'Component Length Distribution',
				x: ['Component 1 (incomplete)', ...stats.plasmidContigs.map((_, i) => `Component ${i + 2}`)],
				y: [stats.bandage.largestComponentSize, ...stats.plasmidContigs.map(p => p.size)],
				type: 'bar',
				xLabel: 'Component',
				yLabel: 'Length (bp)'
			}
		},
		'bandage': {
			output: `\x1b[36mBandage v0.8.1\x1b[0m
Loading assembly graph: assembly.gfa
  Nodes loaded: ${stats.bandage.nodes}
  Edges loaded: ${stats.bandage.edges}

\x1b[36mGenerating visualization...\x1b[0m
  Layout algorithm: Force-directed
  Node coloring: By depth

\x1b[32m✓ Graph visualization saved\x1b[0m
  Output: o_bandage.png (800x600 px)

\x1b[33mGraph Statistics:\x1b[0m
  Connected components: ${stats.bandage.components}
  Largest component: ${(stats.bandage.largestComponentSize / 1000000).toFixed(2)} Mb (${stats.bandage.largestComponentSegments} segments)
  Circular contigs: ${stats.bandage.circularContigs}
  Dead ends: ${stats.bandage.deadEnds}

\x1b[33mComponent Details:\x1b[0m
  1. Component 1: ${stats.bandage.largestComponentSize.toLocaleString()} bp (${stats.bandage.largestComponentSegments} segments, ${stats.bandage.deadEnds} dead ends) - incomplete
${stats.plasmidContigs.map((p, i) => `  ${i + 2}. Component ${i + 2}: ${p.size.toLocaleString().padStart(9)} bp (1 segment, circular) - complete`).join('\n')}

\x1b[33mNote:\x1b[0m Large incomplete component is likely the chromosome.
      Small circular components may be plasmids - use PlasmidFinder to confirm.

\x1b[32m✓ Analysis complete\x1b[0m
`,
			summary: {
				'Nodes (Contigs)': `${stats.bandage.nodes} segments in assembly graph`,
				'Edges (Links)': `${stats.bandage.edges} connections between contigs`,
				'Components': `${stats.bandage.components} total (1 large incomplete + ${stats.bandage.circularContigs} small circular)`,
				'Circular Contigs': `${stats.bandage.circularContigs} (complete assemblies)`,
				'Dead Ends': `${stats.bandage.deadEnds} (from incomplete component)`,
				'Interpretation': `The ${stats.bandage.nodes} nodes match the contigs from the assembly. The ${stats.bandage.deadEnds} dead ends indicate the large component is fragmented (likely chromosome). The ${stats.bandage.circularContigs} small circular components may be plasmids - use PlasmidFinder to identify replicon types.`
			},
			chartData: {
				title: 'Assembly Graph Visualization',
				type: 'image',
				imagePath: '/images/o_bandage.png'
			}
		},
		'quast': {
			output: `WARNING: Python locale settings can't be changed
.../miniconda3/envs/env_quast/bin/quast o_unicycler/assembly.fasta -o o_quast

Version: 5.0.2

System information:
  OS: Linux-6.1.0-42-cloud-amd64-x86_64-with-debian-12.13 (linux_64)
  Python version: 3.6.13
  CPUs number: 4

Logging to ${ctx.getCurrentDir()}/o_quast/quast.log
NOTICE: Maximum number of threads is set to 1 (use --threads option to set it manually)

CWD: ${ctx.getCurrentDir()}
Main parameters:
  MODE: default, threads: 1, minimum contig length: 500, minimum alignment length: 65, \\
  ambiguity: one, threshold for extensive misassembly size: 1000

Contigs:
  Pre-processing...
  o_unicycler/assembly.fasta ==> assembly

2026-01-12 05:48:08
Running Basic statistics processor...
  Contig files:
    assembly
  Calculating N50 and L50...
    assembly, N50 = ${stats.n50.toLocaleString()}, L50 = ${stats.l50}, Total length = ${stats.quast.totalLengthGe0.toLocaleString()}, GC % = ${stats.assemblyGC.toFixed(2)}, # N's per 100 kbp =  ${stats.quast.nsPer100kb.toFixed(2)}
  Drawing Nx plot...
    saved to ${ctx.getCurrentDir()}/o_quast/basic_stats/Nx_plot.pdf
  Drawing cumulative plot...
    saved to ${ctx.getCurrentDir()}/o_quast/basic_stats/cumulative_plot.pdf
  Drawing GC content plot...
    saved to ${ctx.getCurrentDir()}/o_quast/basic_stats/GC_content_plot.pdf
  Drawing assembly GC content plot...
    saved to ${ctx.getCurrentDir()}/o_quast/basic_stats/assembly_GC_content_plot.pdf
Done.

NOTICE: Genes are not predicted by default. Use --gene-finding or --glimmer option to enable it.

Creating large visual summaries...
This may take a while: press Ctrl-C to skip this step..
  1 of 2: Creating Icarus viewers...
  2 of 2: Creating PDF with all tables and plots...
Done

RESULTS:
  All statistics are based on contigs of size >= 500 bp, unless otherwise noted (e.g., "# contigs (>= 0 bp)" and "Total length (>= 0 bp)" include all contigs).

Assembly                   assembly
# contigs (>= 0 bp)        ${stats.numContigsAll}
# contigs (>= 1000 bp)     ${stats.quast.contigsGe1000}
# contigs (>= 5000 bp)     ${stats.quast.contigsGe5000}
# contigs (>= 10000 bp)    ${stats.quast.contigsGe10000}
# contigs (>= 25000 bp)    ${stats.quast.contigsGe25000}
# contigs (>= 50000 bp)    ${stats.quast.contigsGe50000}
Total length (>= 0 bp)     ${stats.quast.totalLengthGe0}
Total length (>= 1000 bp)  ${stats.quast.totalLengthGe1000}
# contigs                  ${stats.numContigs}
Largest contig             ${stats.largestContig}
Total length               ${stats.assemblySize}
GC (%)                     ${stats.assemblyGC.toFixed(2)}
N50                        ${stats.n50}
N75                        ${stats.n75}
L50                        ${stats.l50}
L75                        ${stats.l75}
# N's per 100 kbp          ${stats.quast.nsPer100kb.toFixed(2)}

  Text versions of total report are saved to ${ctx.getCurrentDir()}/o_quast/report.txt, report.tsv, and report.tex
  Text versions of transposed total report are saved to ${ctx.getCurrentDir()}/o_quast/transposed_report.txt, transposed_report.tsv, and transposed_report.tex
  HTML version (interactive tables and plots) is saved to ${ctx.getCurrentDir()}/o_quast/report.html
  PDF version (tables and plots) is saved to ${ctx.getCurrentDir()}/o_quast/report.pdf
  Icarus (contig browser) is saved to ${ctx.getCurrentDir()}/o_quast/icarus.html
  Log is saved to ${ctx.getCurrentDir()}/o_quast/quast.log

NOTICEs: 2; WARNINGs: 1; non-fatal ERRORs: 0

Thank you for using QUAST!
`,
			summary: {
				'Contigs (≥500 bp)': stats.numContigs.toLocaleString(),
				'Contigs (all)': stats.numContigsAll.toLocaleString(),
				'Total Length': `${stats.assemblySize.toLocaleString()} bp`,
				'Largest Contig': `${stats.largestContig.toLocaleString()} bp`,
				'N50': `${stats.n50.toLocaleString()} bp`,
				'L50': stats.l50.toString(),
				'GC Content': `${stats.assemblyGC.toFixed(2)}%`,
				'Quality': stats.checkm.quality === 'High' ? 'EXCELLENT' : (stats.checkm.quality === 'Medium' ? 'GOOD' : 'FAIR')
			},
			chartData: {
				title: 'Assembly Quality Metrics',
				x: ['Total Length', 'N50', 'Largest Contig'],
				y: [stats.assemblySize, stats.n50, stats.largestContig],
				type: 'bar',
				xLabel: 'Metric',
				yLabel: 'Length (bp)'
			}
		},
		'prokka': {
			output: `[07:38:44] This is prokka 1.14.6
[07:38:44] Written by Torsten Seemann <torsten.seemann@gmail.com>
[07:38:44] Homepage is https://github.com/tseemann/prokka
[07:38:44] You are you
[07:38:44] Operating system is linux
[07:38:44] You have BioPerl 1.7.8
[07:38:44] System has 4 cores.
[07:38:44] Option --cpu asked for 8 cores, but system only has 4
[07:38:44] Will use maximum of 4 cores.
[07:38:44] Annotating as >>> Bacteria <<<
[07:38:44] Genus species strain: ${stats.organism}
[07:38:44] Generating locus_tag from 'o_unicycler/assembly.fasta' contents.
[07:38:44] Setting --locustag MPDNNGLK from MD5 69d77054a115e56ce609fd2185af8559
[07:38:44] Creating new output folder: o_prokka
[07:38:44] Running: mkdir -p o_prokka
[07:38:44] Using filename prefix: PROKKA.XXX
[07:38:44] Setting HMMER_NCPU=1
[07:38:44] Writing log to: o_prokka/PROKKA.log
[07:38:44] Command: .../miniconda3/envs/env_abricate/bin/prokka --outdir o_prokka --prefix PROKKA o_unicycler/assembly.fasta
[07:46:19] Output files:
[07:46:19] o_prokka/PROKKA.tsv
[07:46:19] o_prokka/PROKKA.fna
[07:46:19] o_prokka/PROKKA.gff
[07:46:19] o_prokka/PROKKA.log
[07:46:19] o_prokka/PROKKA.faa
[07:46:19] o_prokka/PROKKA.gbk
[07:46:19] o_prokka/PROKKA.fsa
[07:46:19] o_prokka/PROKKA.tbl
[07:46:19] o_prokka/PROKKA.ffn
[07:46:19] o_prokka/PROKKA.sqn
[07:46:19] o_prokka/PROKKA.err
[07:46:19] o_prokka/PROKKA.txt
[07:46:19] Annotation finished successfully.
[07:46:19] If you use this result please cite the Prokka paper:
[07:46:19] Seemann T (2014) Prokka: rapid prokaryotic genome annotation. Bioinformatics. 30(14):2068-9.
[07:46:19] Type 'prokka --citation' for more details.
[07:46:19] Share and enjoy!
`,
			summary: {
				'Organism': stats.organism,
				'Contigs': stats.numContigsAll.toLocaleString(),
				'Bases': stats.quast.totalLengthGe0.toLocaleString(),
				'CDS': stats.numCDS.toLocaleString(),
				'rRNA': stats.numrRNA.toString(),
				'tRNA': stats.numtRNA.toString(),
				'tmRNA': stats.numtmRNA.toString()
			},
			chartData: {
				title: 'Genome Annotation Summary',
				x: ['CDS', 'tRNA', 'rRNA', 'tmRNA'],
				y: [stats.numCDS, stats.numtRNA, stats.numrRNA, stats.numtmRNA],
				type: 'bar',
				xLabel: 'Feature Type',
				yLabel: 'Count'
			}
		},
		'abricate': {
			output: `Using database ${stats.amrDatabase}:	5386 sequences -  2024-Jan-10
Processing: o_unicycler/assembly.fasta
Found ${stats.amrGenes.length} genes in o_unicycler/assembly.fasta

#FILE	SEQUENCE	START	END	STRAND	GENE	COVERAGE	GAPS	%COVERAGE	%IDENTITY	DATABASE	ACCESSION	PRODUCT	RESISTANCE
${ctx.formatAmrGeneRows(stats.amrGenes, stats.amrDatabase)}
`,
			summary: (() => {
				const resistanceGroups: Record<string, string[]> = {};
				stats.amrGenes.forEach(g => {
					const res = g.resistance.split(';')[0];
					if (!resistanceGroups[res]) resistanceGroups[res] = [];
					resistanceGroups[res].push(`${g.gene} (${g.identity.toFixed(0)}%)`);
				});
				const summaryObj: Record<string, string> = {
					'AMR Genes Found': stats.amrGenes.length.toString(),
					'Database': stats.amrDatabase.toUpperCase()
				};
				Object.entries(resistanceGroups).forEach(([res, genes]) => {
					summaryObj[res.charAt(0) + res.slice(1).toLowerCase()] = genes.join(', ');
				});
				return summaryObj;
			})(),
			chartData: {
				title: 'AMR Gene Identity',
				x: stats.amrGenes.map(g => g.gene),
				y: stats.amrGenes.map(g => g.identity),
				type: 'bar',
				xLabel: 'Gene',
				yLabel: 'Identity (%)'
			}
		},
		'checkm2': {
			output: ` INFO: Running CheckM2 version 1.1.0
[01/12/2026 06:24:04 AM] INFO: Running quality prediction workflow with 4 threads.
[01/12/2026 06:24:05 AM] INFO: Calling genes in 1 bins with 4 threads:
    Finished processing 1 of 1 (100.00%) bins.
[01/12/2026 06:24:58 AM] INFO: Calculating metadata for 1 bins with 4 threads:
    Finished processing 1 of 1 (100.00%) bin metadata.
[01/12/2026 06:24:58 AM] INFO: Annotating input genomes with DIAMOND using 4 threads
[01/12/2026 06:27:47 AM] INFO: Processing DIAMOND output
[01/12/2026 06:27:47 AM] INFO: Predicting completeness and contamination using ML models.
[01/12/2026 06:27:54 AM] INFO: Parsing all results and constructing final output table.
[01/12/2026 06:27:54 AM] INFO: CheckM2 finished successfully.
`,
			summary: {
				'Completeness': `${stats.checkm.completeness.toFixed(1)}%`,
				'Contamination': `${stats.checkm.contamination.toFixed(2)}%`,
				'Genome Size': `${stats.quast.totalLengthGe0.toLocaleString()} bp`,
				'GC Content': `${Math.round(stats.assemblyGC)}%`,
				'Coding Density': `${stats.checkmCodingDensity?.toFixed(1) ?? '85.0'}%`,
				'Quality': stats.checkm.quality.toUpperCase()
			},
			chartData: {
				title: 'CheckM2 Quality Assessment',
				x: ['Completeness', 'Contamination'],
				y: [stats.checkm.completeness, stats.checkm.contamination],
				type: 'bar',
				xLabel: 'Metric',
				yLabel: 'Percentage (%)'
			}
		},
		'confindr': {
			output: `\x1b[36mConFindr v0.8.0\x1b[0m
[2024-01-15 11:35:00] INFO: Starting contamination detection

\x1b[36mAnalyzing sample\x1b[0m
...`,
			summary: {
				'Sample': sampleName,
				'Status': `${stats.confindr?.status ?? 'CLEAN'} (${(stats.confindr?.status ?? 'CLEAN') === 'CLEAN' ? 'No contamination' : 'Contamination detected'})`,
				'Genus Detected': stats.confindr?.genusDetected ?? stats.organismShort.split('.')[0].replace(/^\w/, c => c),
				'rMLST Genes': `${stats.confindr?.rmlstGenesFound ?? 53}/${stats.confindr?.rmlstGenesTotal ?? 53} found`,
				'Multi-allelic Genes': `${stats.confindr?.multiAllelicGenes ?? 0}`,
				'Intra-species Contam.': (stats.confindr?.multiAllelicGenes ?? 0) === 0 ? 'Not detected' : 'Detected',
				'Inter-species Contam.': (stats.confindr?.status ?? 'CLEAN') === 'CLEAN' ? 'Not detected' : 'Detected'
			},
			chartData: {
				title: 'Contamination Analysis',
				x: ['rMLST Genes Found', 'Single-allele Genes', 'Multi-allele Genes'],
				y: [stats.confindr?.rmlstGenesFound ?? 53, (stats.confindr?.rmlstGenesFound ?? 53) - (stats.confindr?.multiAllelicGenes ?? 0), stats.confindr?.multiAllelicGenes ?? 0],
				type: 'bar',
				xLabel: 'Category',
				yLabel: 'Gene Count'
			}
		},
		'bakta': {
			output: `\x1b[36mBakta v1.8.2\x1b[0m
[2024-01-15 11:40:00] INFO: Starting annotation

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta

\x1b[36mRunning annotation pipeline...\x1b[0m
  tRNA detection (tRNAscan-SE): ${stats.bakta?.trna ?? 86} tRNAs found
  tmRNA detection: ${stats.bakta?.tmrna ?? 1} tmRNA found
  rRNA detection (Infernal): ${stats.bakta?.rrna ?? 25} rRNAs found
  ncRNA detection: ${stats.bakta?.ncrna ?? 95} ncRNAs found
  CRISPR detection: ${stats.bakta?.crispr ?? 2} CRISPR arrays found
  CDS prediction (Prodigal): ${(stats.bakta?.cds ?? 5312).toLocaleString()} CDSs predicted

\x1b[36mFunctional annotation...\x1b[0m
  UniProt matches: ${Math.round((stats.bakta?.cds ?? 5312) * (stats.bakta?.functionalPercent ?? 88.2) / 100).toLocaleString()} (${stats.bakta?.functionalPercent ?? 88.2}%)
  COG assignments: ${Math.round((stats.bakta?.cds ?? 5312) * 0.831).toLocaleString()} (83.1%)
  KEGG orthologs: ${Math.round((stats.bakta?.cds ?? 5312) * 0.632).toLocaleString()} (63.2%)
  Pfam domains: ${Math.round((stats.bakta?.cds ?? 5312) * 0.792).toLocaleString()} (79.2%)

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  ANNOTATION SUMMARY\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Features annotated: ${(stats.bakta?.totalFeatures ?? 5521).toLocaleString()}
    - CDS: ${(stats.bakta?.cds ?? 5312).toLocaleString()}
    - tRNA: ${stats.bakta?.trna ?? 86}
    - rRNA: ${stats.bakta?.rrna ?? 25}
    - tmRNA: ${stats.bakta?.tmrna ?? 1}
    - ncRNA: ${stats.bakta?.ncrna ?? 95}
    - CRISPR: ${stats.bakta?.crispr ?? 2}

  Hypothetical proteins: ${Math.round((stats.bakta?.cds ?? 5312) * (stats.bakta?.hypotheticalPercent ?? 11.8) / 100).toLocaleString()} (${stats.bakta?.hypotheticalPercent ?? 11.8}%)
  Proteins with function: ${Math.round((stats.bakta?.cds ?? 5312) * (stats.bakta?.functionalPercent ?? 88.2) / 100).toLocaleString()} (${stats.bakta?.functionalPercent ?? 88.2}%)

\x1b[33mOutput files written to: bakta_results/\x1b[0m
`,
			summary: {
				'Total Features': (stats.bakta?.totalFeatures ?? 5521).toLocaleString(),
				'CDS': (stats.bakta?.cds ?? 5312).toLocaleString(),
				'tRNA': `${stats.bakta?.trna ?? 86}`,
				'rRNA': `${stats.bakta?.rrna ?? 25}`,
				'ncRNA': `${stats.bakta?.ncrna ?? 95}`,
				'CRISPR Arrays': `${stats.bakta?.crispr ?? 2}`,
				'Functional Annotation': `${stats.bakta?.functionalPercent ?? 88.2}%`,
				'Hypothetical': `${stats.bakta?.hypotheticalPercent ?? 11.8}%`
			},
			chartData: {
				title: 'Genome Annotation Summary',
				x: ['CDS', 'tRNA', 'rRNA', 'ncRNA', 'Other'],
				y: [stats.bakta?.cds ?? 5312, stats.bakta?.trna ?? 86, stats.bakta?.rrna ?? 25, stats.bakta?.ncrna ?? 95, (stats.bakta?.tmrna ?? 1) + (stats.bakta?.crispr ?? 2)],
				type: 'bar',
				xLabel: 'Feature Type',
				yLabel: 'Count'
			}
		},
		'mlst': {
			output: `[07:16:00] This is mlst 2.23.0 running on linux with Perl 5.026002
[07:16:00] Checking mlst dependencies:
[07:16:00] Found 'blastn' => .../miniconda3/envs/env_abricate/bin/blastn
[07:16:00] Found 'any2fasta' => .../miniconda3/envs/env_abricate/bin/any2fasta
[07:16:01] Found blastn: 2.12.0+ (002012)
${Object.entries(stats.mlst.alleles).map(([locus, num]) => `[07:16:05] Found exact allele match (${stats.mlst.scheme}.${locus}-${num})`).join('\n')}
[07:16:05] Done.
`,
			summary: (() => {
				const summaryObj: Record<string, string> = {
					'Scheme': stats.mlst.scheme,
					'Sequence Type': stats.mlst.st
				};
				Object.entries(stats.mlst.alleles).forEach(([locus, num]) => {
					summaryObj[locus] = num.toString();
				});
				if (stats.mlst.significance) {
					summaryObj['Clinical Significance'] = stats.mlst.significance;
				}
				return summaryObj;
			})(),
			chartData: {
				title: 'MLST Allelic Profile',
				x: Object.keys(stats.mlst.alleles),
				y: Object.values(stats.mlst.alleles),
				type: 'bar',
				xLabel: 'Locus',
				yLabel: 'Allele Number'
			},
			files: [
				{ name: 'mlst_result.tab', type: 'tab', size: '128 B' }
			]
		},
		// Phase 3: Plasmid Analysis
		'mob_recon': (() => {
			const plasmidsWithAMR = stats.plasmidContigs.filter(p => p.mobility === 'conjugative' || p.mobility === 'mobilizable');
			const chromSize = stats.bandage.largestComponentSize;
			const plasmidTypesList = stats.plasmids.map(p => p.plasmid).join(', ') || 'Unknown';
			return {
				output: `\x1b[36mMOB-suite v3.1.4\x1b[0m
[2024-01-15 12:00:00] INFO: Starting plasmid reconstruction

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta
  Contigs: ${stats.numContigs}

\x1b[36mRunning MOB-recon...\x1b[0m
  Identifying plasmid-associated sequences...
  Clustering contigs by mobility markers...
  Reconstructing plasmid replicons...

\x1b[36mRunning MOB-typer...\x1b[0m
  Typing plasmid replicons...
  Identifying mobility genes...
  Detecting relaxases and mate-pair formation genes...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  PLASMID RECONSTRUCTION RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Chromosome: 1 (${chromSize.toLocaleString()} bp)
  Plasmids detected: ${stats.plasmidContigs.length}

${stats.plasmidContigs.map((p, i) => `  \x1b[33mPlasmid AA00${i + 1}:\x1b[0m
    Size: ${p.size.toLocaleString()} bp
    Replicon type: ${p.type}
    Mobility: ${p.mobility.charAt(0).toUpperCase() + p.mobility.slice(1)}
    Relaxase type: ${p.mobility === 'conjugative' ? 'MOBF' : p.mobility === 'mobilizable' ? 'MOBP' : 'None'}
    Mate-pair formation: ${p.mobility === 'conjugative' ? 'MPF_F' : 'None'}
    Predicted host: ${stats.organism.split(' ')[0]}`).join('\n\n')}

${stats.amrGenes.length > 0 ? `\x1b[31m⚠ This plasmid carries AMR genes:\x1b[0m
${stats.amrGenes.slice(0, 2).map(g => `    - ${g.gene} (${g.resistance})`).join('\n')}` : ''}

\x1b[33mNote: ${plasmidTypesList.includes('IncF') ? 'IncF plasmids are highly transmissible in clinical settings' : 'Plasmid types detected from assembly'}\x1b[0m
`,
				summary: {
					'Chromosome': `1 (${(chromSize / 1000000).toFixed(2)} Mb)`,
					'Plasmids Found': stats.plasmidContigs.length.toString(),
					'Plasmid Size': stats.plasmidContigs.length > 0 ? `${stats.plasmidContigs[0].size.toLocaleString()} bp` : 'N/A',
					'Replicon Type': plasmidTypesList || 'Unknown',
					'Mobility': stats.plasmidContigs.length > 0 ? stats.plasmidContigs[0].mobility.charAt(0).toUpperCase() + stats.plasmidContigs[0].mobility.slice(1) : 'N/A',
					'Relaxase': stats.plasmidContigs.some(p => p.mobility === 'conjugative') ? 'MOBF' : 'MOBP',
					'AMR Genes on Plasmid': plasmidsWithAMR.length > 0 ? stats.amrGenes.length.toString() : '0'
				},
				chartData: {
					title: 'Genome Composition',
					x: ['Chromosome', ...stats.plasmidContigs.map((_, i) => `Plasmid AA00${i + 1}`)],
					y: [chromSize, ...stats.plasmidContigs.map(p => p.size)],
					type: 'bar',
					xLabel: 'Replicon',
					yLabel: 'Size (bp)'
				},
				files: [
					{ name: 'plasmid_report.tsv', type: 'tsv', size: '2.1 KB' },
					{ name: 'chromosome.fasta', type: 'fasta', size: `${(chromSize / 1000000).toFixed(1)} MB` },
					...stats.plasmidContigs.map((p, i) => ({ name: `plasmid_AA00${i + 1}.fasta`, type: 'fasta', size: `${Math.round(p.size / 1000)} KB` })),
					{ name: 'mobtyper_results.txt', type: 'txt', size: '1.5 KB' }
				]
			};
		})(),
		'platon': (() => {
			const chromSize = stats.bandage.largestComponentSize;
			const plasmidTotalSize = stats.plasmidContigs.reduce((sum, p) => sum + p.size, 0);
			const conjugative = stats.plasmidContigs.filter(p => p.mobility === 'conjugative');
			const mobilizable = stats.plasmidContigs.filter(p => p.mobility === 'mobilizable');
			return {
				output: `\x1b[36mPlaton v1.6.0\x1b[0m
[2024-01-15 12:10:00] INFO: Starting plasmid detection

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta
  Contigs: ${stats.numContigs}

\x1b[36mClassifying contigs...\x1b[0m
  Using machine learning model: gradient boosting
  Analyzing sequence features:
    - Replication proteins
    - Mobilization proteins
    - Conjugation genes
    - Plasmid-specific markers

\x1b[36mFeature detection:\x1b[0m
  contig_1: Chromosome markers detected
${stats.plasmidContigs.map((p, i) => `  contig_${i + 2}: Plasmid markers detected (score: ${(0.95 + Math.random() * 0.04).toFixed(3)})`).join('\n')}

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  PLASMID DETECTION RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Classification Summary:
    Chromosomal contigs: 1 (${chromSize.toLocaleString()} bp)
    Plasmid contigs: ${stats.plasmidContigs.length} (${plasmidTotalSize.toLocaleString()} bp)

${stats.plasmidContigs.map((p, i) => `  \x1b[33mPlasmid contig_${i + 2} (${p.type}):\x1b[0m
    Confidence: ${(95 + Math.random() * 4).toFixed(1)}%
    Replication genes: ${p.type.includes('Inc') ? 'repA, repB' : 'repA'}
    Mobilization genes: ${p.mobility !== 'non-mobilizable' ? 'mobA, mobC' : 'None'}
    Conjugation: ${p.mobility === 'conjugative' ? 'traI, traD, traM' : 'None'}`).join('\n\n')}

\x1b[32m✓ ${stats.plasmidContigs.length > 0 ? 'High confidence plasmid prediction' : 'No plasmids detected'}\x1b[0m
`,
				summary: {
					'Chromosomal Contigs': '1',
					'Plasmid Contigs': stats.plasmidContigs.length.toString(),
					'Confidence': stats.plasmidContigs.length > 0 ? `${(95 + Math.random() * 4).toFixed(1)}%` : 'N/A',
					'Replication Genes': stats.plasmidContigs.length > 0 ? 'repA, repB' : 'N/A',
					'Mobilization': mobilizable.length > 0 || conjugative.length > 0 ? 'mobA, mobC' : 'None',
					'Conjugation': conjugative.length > 0 ? 'traI, traD, traM' : 'None'
				},
				chartData: {
					title: 'Plasmid Prediction Confidence',
					x: ['contig_1 (Chromosome)', ...stats.plasmidContigs.map((p, i) => `contig_${i + 2} (${p.type})`)],
					y: [2.3, ...stats.plasmidContigs.map(() => 95 + Math.random() * 4)],
					type: 'bar',
					xLabel: 'Contig',
					yLabel: 'Plasmid Score (%)'
				}
			};
		})(),
		// Phase 4: Phylogenetics
		'snippy': (() => {
			const snippyStats = stats.snippy || { totalVariants: 1247, snps: 1189, insertions: 32, deletions: 26, complex: 0 };
			const snpPercent = ((snippyStats.snps / snippyStats.totalVariants) * 100).toFixed(1);
			const insPercent = ((snippyStats.insertions / snippyStats.totalVariants) * 100).toFixed(1);
			const delPercent = ((snippyStats.deletions / snippyStats.totalVariants) * 100).toFixed(1);
			return {
				output: `\x1b[36mSnippy v4.6.0\x1b[0m
[2024-01-15 12:20:00] INFO: Starting variant calling

\x1b[36mReference:\x1b[0m
  Genome: reference.fasta (${stats.organism})
  Size: ${stats.assemblySize.toLocaleString()} bp

\x1b[36mReads:\x1b[0m
  R1: ${sampleName}_R1_paired.fq.gz
  R2: ${sampleName}_R2_paired.fq.gz

\x1b[36mAlignment (BWA-MEM)...\x1b[0m
  Reads mapped: ${Math.floor(stats.totalReads * 0.998).toLocaleString()} (99.8%)
  Mean coverage: ${(stats.totalReads * stats.readLength / stats.assemblySize).toFixed(1)}x
  Median coverage: ${Math.floor(stats.totalReads * stats.readLength / stats.assemblySize)}x

\x1b[36mVariant calling (Freebayes)...\x1b[0m
  Processing regions...
  Calling variants...
  Filtering low-quality variants...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  VARIANT CALLING RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Total variants: ${snippyStats.totalVariants.toLocaleString()}
    SNPs: ${snippyStats.snps.toLocaleString()} (${snpPercent}%)
    Insertions: ${snippyStats.insertions} (${insPercent}%)
    Deletions: ${snippyStats.deletions} (${delPercent}%)

  Variant density: ${(snippyStats.totalVariants / (stats.assemblySize / 1000)).toFixed(2)} per kb
  Transition/Transversion: 2.34

  \x1b[33mCore genome SNPs: ${Math.floor(snippyStats.snps * 0.97).toLocaleString()}\x1b[0m
  (used for phylogenetic analysis)

\x1b[32m✓ Consensus sequence generated\x1b[0m
`,
				summary: {
					'Reference': stats.organism,
					'Coverage': `${(stats.totalReads * stats.readLength / stats.assemblySize).toFixed(1)}x`,
					'Total Variants': snippyStats.totalVariants.toLocaleString(),
					'SNPs': snippyStats.snps.toLocaleString(),
					'Insertions': snippyStats.insertions.toString(),
					'Deletions': snippyStats.deletions.toString(),
					'Core SNPs': Math.floor(snippyStats.snps * 0.97).toLocaleString(),
					'Ti/Tv Ratio': (snippyStats.snps / Math.max(snippyStats.insertions + snippyStats.deletions, 1)).toFixed(2)
				},
				chartData: {
					title: 'Variant Types Distribution',
					x: ['SNPs', 'Insertions', 'Deletions'],
					y: [snippyStats.snps, snippyStats.insertions, snippyStats.deletions],
					type: 'bar',
					xLabel: 'Variant Type',
					yLabel: 'Count'
				},
				files: [
					{ name: 'snps.vcf', type: 'vcf', size: '156 KB' },
					{ name: 'snps.tab', type: 'tsv', size: '89 KB' },
					{ name: 'snps.aligned.fa', type: 'fasta', size: '4.5 MB' },
					{ name: 'snps.consensus.fa', type: 'fasta', size: '4.5 MB' }
				]
			};
		})(),
		'roary': (() => {
			const roaryStats = stats.roary || { totalGenes: 5234, coreGenes: 3987, softCoreGenes: 312, shellGenes: 489, cloudGenes: 446, numIsolates: 4 };
			const corePercent = ((roaryStats.coreGenes / roaryStats.totalGenes) * 100).toFixed(1);
			const softCorePercent = ((roaryStats.softCoreGenes / roaryStats.totalGenes) * 100).toFixed(1);
			const shellPercent = ((roaryStats.shellGenes / roaryStats.totalGenes) * 100).toFixed(1);
			const cloudPercent = ((roaryStats.cloudGenes / roaryStats.totalGenes) * 100).toFixed(1);
			return {
				output: `\x1b[36mRoary v3.13.0\x1b[0m
[2024-01-15 12:30:00] INFO: Starting pan-genome analysis

\x1b[36mClustering genes...\x1b[0m
  Identity threshold: 95%
  Using CD-HIT for clustering...
  Paralog splitting enabled...

\x1b[36mBuilding pan-genome...\x1b[0m
  Identifying core genes (99-100% presence)...
  Identifying soft-core genes (95-99%)...
  Identifying shell genes (15-95%)...
  Identifying cloud genes (0-15%)...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  PAN-GENOME ANALYSIS RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Total genes in pan-genome: ${roaryStats.totalGenes.toLocaleString()}

  \x1b[32mCore genes:      ${roaryStats.coreGenes.toLocaleString()} (${corePercent}%)\x1b[0m
  Soft-core genes:   ${roaryStats.softCoreGenes} (${softCorePercent}%)
  Shell genes:       ${roaryStats.shellGenes} (${shellPercent}%)
  \x1b[31mCloud genes:       ${roaryStats.cloudGenes} (${cloudPercent}%)\x1b[0m

  Core genome alignment: ${(stats.assemblySize * 0.62 / 1000000).toFixed(2)} Mb
  Informative sites: ${Math.floor(roaryStats.coreGenes * 3.1).toLocaleString()}

\x1b[33mTip: Core gene alignment can be used for phylogenetic analysis\x1b[0m
`,
				summary: {
					'Isolates Analyzed': roaryStats.numIsolates.toString(),
					'Total Pan-genome': `${roaryStats.totalGenes.toLocaleString()} genes`,
					'Core Genes': `${roaryStats.coreGenes.toLocaleString()} (${corePercent}%)`,
					'Soft-core': `${roaryStats.softCoreGenes} (${softCorePercent}%)`,
					'Shell': `${roaryStats.shellGenes} (${shellPercent}%)`,
					'Cloud': `${roaryStats.cloudGenes} (${cloudPercent}%)`,
					'Core Alignment': `${(stats.assemblySize * 0.62 / 1000000).toFixed(2)} Mb`
				},
				chartData: {
					title: 'Pan-genome Composition',
					x: ['Core', 'Soft-core', 'Shell', 'Cloud'],
					y: [roaryStats.coreGenes, roaryStats.softCoreGenes, roaryStats.shellGenes, roaryStats.cloudGenes],
					type: 'bar',
					xLabel: 'Gene Category',
					yLabel: 'Number of Genes'
				},
				files: [
					{ name: 'gene_presence_absence.csv', type: 'csv', size: '2.3 MB' },
					{ name: 'core_gene_alignment.aln', type: 'aln', size: '3.5 MB' },
					{ name: 'pan_genome_reference.fa', type: 'fasta', size: '5.2 MB' },
					{ name: 'summary_statistics.txt', type: 'txt', size: '1.8 KB' }
				]
			};
		})(),
		'iqtree': {
			output: `\x1b[36mIQ-TREE v2.2.0\x1b[0m
[2024-01-15 12:45:00] INFO: Starting phylogenetic analysis

\x1b[36mInput alignment:\x1b[0m
  File: core_gene_alignment.aln
  Sequences: 4
  Sites: 3,456,789
  Informative sites: 12,345

\x1b[36mModel selection (ModelFinder)...\x1b[0m
  Testing 88 DNA models...
  Best model: GTR+F+I+G4 (BIC: 45678.234)

\x1b[36mTree inference...\x1b[0m
  Initial tree: NJ
  Optimization: Maximum likelihood
  Log-likelihood: -22345.678

\x1b[36mBranch support (UFBoot)...\x1b[0m
  Replicates: 1000
  Calculating bootstrap values...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  PHYLOGENETIC ANALYSIS RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Best-fit model: GTR+F+I+G4
  Log-likelihood: -22345.678
  Tree length: 0.0234

  \x1b[33mTree topology:\x1b[0m
  ((sample_01:0.0012,sample_02:0.0008)100:0.0045,
   (sample_03:0.0023,reference:0.0089)98:0.0034);

  Bootstrap support:
    All nodes: ≥98%

\x1b[32m✓ Phylogenetic tree saved to: core_alignment.treefile\x1b[0m
\x1b[33mTip: Visualize tree with FigTree or iTOL\x1b[0m
`,
			summary: {
				'Sequences': (stats.roary?.numIsolates ?? 4).toString(),
				'Alignment Length': `${stats.assemblySize.toLocaleString()} bp`,
				'Best Model': 'GTR+F+I+G4',
				'Log-likelihood': '-22345.678',
				'Bootstrap Replicates': '1000',
				'Min Bootstrap': '98%',
				'Tree Format': 'Newick'
			},
			chartData: {
				title: 'Branch Lengths (substitutions/site)',
				x: ['sample_01', 'sample_02', 'sample_03', 'reference'],
				y: [0.0012, 0.0008, 0.0023, 0.0089],
				type: 'bar',
				xLabel: 'Sample',
				yLabel: 'Branch Length'
			},
			files: [
				{ name: 'core_alignment.treefile', type: 'nwk', size: '256 B' },
				{ name: 'core_alignment.iqtree', type: 'txt', size: '12 KB' },
				{ name: 'core_alignment.log', type: 'log', size: '45 KB' }
			]
		},
		'gubbins': {
			output: `\x1b[36mGubbins v3.3.0\x1b[0m
[2024-01-15 13:00:00] INFO: Starting recombination detection

\x1b[36mInput:\x1b[0m
  Alignment: core_gene_alignment.aln
  Sequences: 4
  Length: 3,456,789 bp

\x1b[36mIterative recombination detection...\x1b[0m

  Iteration 1:
    Building tree (RAxML)...
    Detecting recombination (Gubbins)...
    Recombinant regions: 23
    Masked sites: 45,678

  Iteration 2:
    Rebuilding tree...
    Re-detecting recombination...
    Recombinant regions: 21
    Masked sites: 43,234

  Iteration 3:
    Converged! No new recombination detected.

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  RECOMBINATION ANALYSIS RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Total recombinant regions: 21
  Total bases affected: 43,234 (1.25%)

  \x1b[33mRecombination hotspots:\x1b[0m
    - Region 1: 234,567-245,678 (11 kb) - \x1b[31mHigh density\x1b[0m
    - Region 2: 567,890-578,901 (11 kb)
    - Region 3: 1,234,567-1,239,012 (4.4 kb)
    ... (18 more regions)

  Clean alignment: 3,413,555 bp (98.75%)
  SNPs after removing recombination: 10,234

\x1b[32m✓ Recombination-free tree generated\x1b[0m
\x1b[33mNote: Use clean.final_tree.tre for outbreak analysis\x1b[0m
`,
			summary: {
				'Input Sequences': (stats.roary?.numIsolates ?? 4).toString(),
				'Recombinant Regions': '21',
				'Bases Affected': `${Math.round(stats.assemblySize * 0.0125).toLocaleString()} (1.25%)`,
				'Clean Alignment': `${((stats.assemblySize * 0.9875) / 1e6).toFixed(2)} Mb`,
				'SNPs (clean)': Math.round(stats.assemblySize * 0.003).toLocaleString(),
				'Iterations': '3',
				'Status': 'Converged'
			},
			chartData: {
				title: 'Recombination Impact',
				x: ['Original Sites', 'Recombinant Sites', 'Clean Sites'],
				y: [stats.assemblySize, Math.round(stats.assemblySize * 0.0125), Math.round(stats.assemblySize * 0.9875)],
				type: 'bar',
				xLabel: 'Category',
				yLabel: 'Base Pairs'
			}
		},
		// New tools
		'busco': {
			output: `\x1b[36mBUSCO v5.5.0\x1b[0m
[2024-01-15 13:15:00] INFO: Starting BUSCO assessment

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta
  Mode: genome
  Lineage: ${stats.busco?.dataset ?? 'bacteria_odb10'} (${stats.busco?.total ?? 124} BUSCOs)

\x1b[36mRunning BUSCO pipeline...\x1b[0m
  Searching for single-copy orthologs...
  Running Augustus gene predictor...
  Classifying BUSCOs...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  BUSCO ASSESSMENT RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  C:${((stats.busco?.complete ?? 123) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%[S:${((stats.busco?.singleCopy ?? 123) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%,D:${((stats.busco?.duplicated ?? 0) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%],F:${((stats.busco?.fragmented ?? 0) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%,M:${((stats.busco?.missing ?? 1) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%,n:${stats.busco?.total ?? 124}

  \x1b[32m${stats.busco?.complete ?? 123} Complete BUSCOs (${((stats.busco?.complete ?? 123) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%)\x1b[0m
     ${stats.busco?.singleCopy ?? 123} Complete and single-copy
     ${stats.busco?.duplicated ?? 0} Complete and duplicated
  \x1b[33m${stats.busco?.fragmented ?? 0} Fragmented BUSCOs (${((stats.busco?.fragmented ?? 0) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%)\x1b[0m
  \x1b[31m${stats.busco?.missing ?? 1} Missing BUSCOs (${((stats.busco?.missing ?? 1) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%)\x1b[0m
  ${stats.busco?.total ?? 124} Total BUSCO groups searched

\x1b[32m✓ Assembly completeness: ${stats.busco?.quality ?? 'EXCELLENT'}\x1b[0m
`,
			summary: {
				'Complete BUSCOs': `${stats.busco?.complete ?? 123} (${((stats.busco?.complete ?? 123) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%)`,
				'Single-copy': `${stats.busco?.singleCopy ?? 123}`,
				'Duplicated': `${stats.busco?.duplicated ?? 0}`,
				'Fragmented': `${stats.busco?.fragmented ?? 0} (${((stats.busco?.fragmented ?? 0) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%)`,
				'Missing': `${stats.busco?.missing ?? 1} (${((stats.busco?.missing ?? 1) / (stats.busco?.total ?? 124) * 100).toFixed(1)}%)`,
				'Total': `${stats.busco?.total ?? 124}`,
				'Quality': stats.busco?.quality ?? 'EXCELLENT'
			},
			chartData: {
				title: 'BUSCO Assessment',
				x: ['Complete', 'Fragmented', 'Missing'],
				y: [stats.busco?.complete ?? 123, stats.busco?.fragmented ?? 0, stats.busco?.missing ?? 1],
				type: 'bar',
				xLabel: 'Category',
				yLabel: 'BUSCOs'
			},
			files: [
				{ name: `short_summary.specific.${stats.busco?.dataset ?? 'bacteria_odb10'}.txt`, type: 'txt', size: '1.2 KB' },
				{ name: 'full_table.tsv', type: 'tsv', size: '12 KB' },
				{ name: 'missing_busco_list.tsv', type: 'tsv', size: '128 B' }
			]
		},
		'plasmidfinder': {
			output: `.../miniconda3/envs/env_plasmidfinder/bin/plasmidfinder.py:351: DeprecationWarning: Use shutil.which instead of find_executable
...
`,
			summary: (() => {
				const summaryObj: Record<string, string> = {
					'Replicons Found': stats.plasmids.length.toString(),
					'Plasmids Detected': `${stats.plasmidContigs.length} (from Unicycler assembly)`
				};
				stats.plasmids.forEach((p, i) => {
					summaryObj[`Replicon ${i + 1}`] = `${p.plasmid} (${p.identity.toFixed(2)}%) - ${p.contig}`;
				});
				summaryObj['Type'] = stats.plasmids.length > 0 ? 'Inc-type plasmids' : 'No replicons detected';
				return summaryObj;
			})(),
			chartData: {
				title: 'Replicon Identity',
				x: stats.plasmids.map(p => p.plasmid),
				y: stats.plasmids.map(p => p.identity),
				type: 'bar',
				xLabel: 'Replicon',
				yLabel: 'Identity (%)'
			}
		},
		'resfinder': {
			output: `\x1b[36mResFinder v4.3.2\x1b[0m
[2024-01-15 13:25:00] INFO: Starting resistance gene detection

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta
  Database: ResFinder (Acquired resistance genes)

\x1b[36mSearching databases...\x1b[0m
  Aminoglycoside resistance...
  Beta-lactam resistance...
  Quinolone resistance...
  Tetracycline resistance...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  RESFINDER RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  \x1b[31mResistance genes detected: 6\x1b[0m

  \x1b[33mBeta-lactams:\x1b[0m
    blaCTX-M-15 (ESBL) - 100% identity
    blaOXA-1 - 99.8% identity
    blaTEM-1B - 100% identity

  \x1b[33mAminoglycosides:\x1b[0m
    aac(6')-Ib-cr - 99.5% identity
    aadA1 - 100% identity

  \x1b[33mTetracyclines:\x1b[0m
    tet(A) - 99.9% identity

  \x1b[31m⚠ CRITICAL: ESBL producer (blaCTX-M-15)\x1b[0m
  \x1b[33mNote: tet(A) and blaTEM-1B on plasmid contig\x1b[0m
`,
			summary: {
				'Total Genes': stats.amrGenes.length.toString(),
				'Beta-lactams': `${stats.amrGenes.filter(g => g.resistance.toLowerCase().includes('beta-lactam')).length} genes`,
				'Aminoglycosides': `${stats.amrGenes.filter(g => g.resistance.toLowerCase().includes('aminoglycoside')).length} genes`,
				'Tetracyclines': `${stats.amrGenes.filter(g => g.resistance.toLowerCase().includes('tetracycline')).length} genes`,
				'ESBL Status': stats.amrGenes.some(g => g.gene.includes('CTX-M')) ? `POSITIVE (${stats.amrGenes.find(g => g.gene.includes('CTX-M'))?.gene})` : 'NEGATIVE',
				'Risk': stats.amrGenes.some(g => g.gene.includes('CTX-M')) ? 'CRITICAL' : 'MODERATE'
			},
			chartData: {
				title: 'Resistance Gene Distribution',
				x: ['Beta-lactams', 'Aminoglycosides', 'Tetracyclines'],
				y: [
					stats.amrGenes.filter(g => g.resistance.toLowerCase().includes('beta-lactam')).length,
					stats.amrGenes.filter(g => g.resistance.toLowerCase().includes('aminoglycoside')).length,
					stats.amrGenes.filter(g => g.resistance.toLowerCase().includes('tetracycline')).length
				],
				type: 'bar',
				xLabel: 'Drug Class',
				yLabel: 'Genes Found'
			}
		},
		'virulencefinder': {
			output: `\x1b[36mVirulenceFinder v2.0.4\x1b[0m
[2024-01-15 13:30:00] INFO: Starting virulence gene detection

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta
  Database: Virulence factors database

\x1b[36mSearching virulence databases...\x1b[0m
  Adhesins...
  Toxins...
  Secretion systems...
  Iron acquisition...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  VIRULENCEFINDER RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  \x1b[33mVirulence genes detected: 8\x1b[0m

  \x1b[33mAdhesins:\x1b[0m
    fimH - Type 1 fimbriae (100%)
    papA - P fimbriae (98.7%)

  \x1b[33mToxins:\x1b[0m
    hlyA - Alpha-hemolysin (99.2%)
    cnf1 - Cytotoxic necrotizing factor (98.9%)

  \x1b[33mIron acquisition:\x1b[0m
    iutA - Aerobactin receptor (100%)
    fyuA - Yersiniabactin receptor (99.5%)

  \x1b[33mCapsule:\x1b[0m
    kpsM - Capsule synthesis (99.8%)
    kpsT - Capsule transport (100%)

\x1b[31m⚠ Hypervirulent strain profile detected\x1b[0m
`,
			summary: {
				'Virulence Genes': '8',
				'Adhesins': '2 (fimH, papA)',
				'Toxins': '2 (hlyA, cnf1)',
				'Iron Acquisition': '2 (iutA, fyuA)',
				'Capsule': '2 (kpsM, kpsT)',
				'Profile': 'Hypervirulent'
			},
			chartData: {
				title: 'Virulence Factor Categories',
				x: ['Adhesins', 'Toxins', 'Iron acquisition', 'Capsule'],
				y: [2, 2, 2, 2],
				type: 'bar',
				xLabel: 'Category',
				yLabel: 'Genes Found'
			}
		},
		'integron_finder': {
			output: `\x1b[36mIntegronFinder v2.0.2\x1b[0m
[2024-01-15 13:35:00] INFO: Starting integron detection

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta

\x1b[36mSearching for integrons...\x1b[0m
  Detecting integrases (intI)...
  Finding attC sites...
  Identifying gene cassettes...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  INTEGRONFINDER RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  \x1b[33mIntegrons detected: 1\x1b[0m

  \x1b[33mClass 1 integron (contig_2: 12,345-18,567)\x1b[0m
    Size: 6,222 bp
    Integrase: intI1 (100% identity)
    Gene cassettes: 3
      1. aadA1 - Aminoglycoside resistance
      2. dfrA17 - Trimethoprim resistance
      3. aadA5 - Aminoglycoside resistance
    attC sites: 3 (conserved)

\x1b[31m⚠ Class 1 integrons are mobile - high transfer risk\x1b[0m
\x1b[33mNote: Located on plasmid contig - potential for HGT\x1b[0m
`,
			summary: {
				'Integrons Found': '1',
				'Type': 'Class 1 (clinical)',
				'Location': 'Plasmid',
				'Gene Cassettes': '3',
				'AMR Genes': 'aadA1, dfrA17, aadA5',
				'Transfer Risk': 'HIGH'
			},
			chartData: {
				title: 'Integron Structure',
				x: ['intI1', 'aadA1', 'dfrA17', 'aadA5'],
				y: [1, 1, 1, 1],
				type: 'bar',
				xLabel: 'Gene',
				yLabel: 'Present'
			},
			files: [
				{ name: 'assembly.integrons', type: 'txt', size: '3.5 KB' },
				{ name: 'assembly.summary', type: 'txt', size: '1.2 KB' }
			]
		},
		'isescan': {
			output: `\x1b[36mISEScan v1.7.2.3\x1b[0m
[2024-01-15 13:40:00] INFO: Starting IS element detection

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta

\x1b[36mSearching for IS elements...\x1b[0m
  HMM search for transposases...
  TIR detection...
  IS family classification...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  ISESCAN RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  \x1b[33mIS elements detected: 23\x1b[0m

  \x1b[33mBy family:\x1b[0m
    IS3: 8 copies
    IS1: 5 copies
    IS26: 4 copies
    IS6: 3 copies
    ISAs1: 2 copies
    IS110: 1 copy

  \x1b[33mDistribution:\x1b[0m
    Chromosome: 15 IS elements
    Plasmid: 8 IS elements

\x1b[31m⚠ IS26 is associated with AMR gene mobilization\x1b[0m
\x1b[33mNote: High IS density on plasmid suggests active recombination\x1b[0m
`,
			summary: {
				'Total IS Elements': '23',
				'IS Families': '6',
				'Chromosomal': '15',
				'Plasmid': '8',
				'Most Common': 'IS3 (8 copies)',
				'AMR-associated': 'IS26 (4 copies)'
			},
			chartData: {
				title: 'IS Element Distribution',
				x: ['IS3', 'IS1', 'IS26', 'IS6', 'ISAs1', 'IS110'],
				y: [8, 5, 4, 3, 2, 1],
				type: 'bar',
				xLabel: 'IS Family',
				yLabel: 'Copy Number'
			},
			files: [
				{ name: 'assembly.fasta.is.tsv', type: 'tsv', size: '5.6 KB' },
				{ name: 'assembly.fasta.sum', type: 'txt', size: '1.8 KB' }
			]
		},
		// PacBio hybrid tools
		'NanoPlot': {
			output: `\x1b[36mNanoPlot v1.42.0\x1b[0m
[2024-01-15 14:00:00] INFO: Processing long reads

\x1b[36mInput:\x1b[0m
  File: {inputFile}
  Platform: Long Read

\x1b[36mGenerating statistics...\x1b[0m
  Calculating read lengths...
  Assessing quality scores...
  Creating visualizations...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  NANOPLOT STATISTICS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  General summary:
    Total reads: 245,678
    Total bases: 3,567,890,123 (3.57 Gb)
    Mean read length: 14,523 bp
    Median read length: 13,456 bp
    Read length N50: 15,234 bp

  Quality summary:
    Mean read quality: Q32.4
    Median read quality: Q33.1
    >Q20: 99.8%
    >Q30: 98.2%

\x1b[32m✓ HiFi quality confirmed (>Q20 for 99.8% reads)\x1b[0m
\x1b[33mTip: Use filtlong to remove low-quality outliers\x1b[0m
`,
			summary: {
				'Total Reads': totalReads.toLocaleString(),
				'Total Bases': `${(totalReads * readLength / 1e9).toFixed(2)} Gb`,
				'Mean Length': `${readLength.toLocaleString()} bp`,
				'N50': `${Math.round(readLength * 1.05).toLocaleString()} bp`,
				'Mean Quality': `Q${isHiFi ? '32.4' : '14.2'}`,
				'>Q20 Reads': `${stats.q20Percent}%`
			},
			chartData: {
				title: 'Read Length Distribution',
				x: ['<5kb', '5-10kb', '10-15kb', '15-20kb', '>20kb'],
				y: [Math.round(totalReads * 0.05), Math.round(totalReads * 0.19), Math.round(totalReads * 0.36), Math.round(totalReads * 0.28), Math.round(totalReads * 0.12)],
				type: 'bar',
				xLabel: 'Read Length Range',
				yLabel: 'Number of Reads'
			},
			files: [
				{ name: 'NanoPlot-report.html', type: 'html', size: '2.3 MB' },
				{ name: 'NanoStats.txt', type: 'txt', size: '1.5 KB' },
				{ name: 'LengthvsQualityScatterPlot_dot.png', type: 'png', size: '890 KB' }
			]
		},
		'filtlong': {
			output: `\x1b[36mFiltlong v0.2.1\x1b[0m
[2024-01-15 14:05:00] INFO: Filtering long reads

\x1b[36mInput:\x1b[0m
  File: {inputFile}
  Reads: 245,678

\x1b[36mFilter settings:\x1b[0m
  --min_length 5000
  --min_mean_q 20

\x1b[36mFiltering reads...\x1b[0m
  Calculating quality scores...
  Applying length filter...
  Applying quality filter...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  FILTLONG RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Input reads:    245,678
  Output reads:   234,567 (95.5% retained)

  Filtered out:
    Too short (<5kb): 8,234 reads
    Low quality (<Q20): 2,877 reads

  Output statistics:
    Total bases: 3,412,345,678 (3.41 Gb)
    Mean length: 14,548 bp
    Mean quality: Q33.2

\x1b[32m✓ Filtering complete - high-quality reads retained\x1b[0m
`,
			summary: {
				'Input Reads': totalReads.toLocaleString(),
				'Output Reads': `${Math.round(totalReads * 0.955).toLocaleString()} (95.5%)`,
				'Short Filtered': Math.round(totalReads * 0.034).toLocaleString(),
				'Quality Filtered': Math.round(totalReads * 0.012).toLocaleString(),
				'Output Bases': `${(Math.round(totalReads * 0.955) * readLength / 1e9).toFixed(2)} Gb`,
				'Mean Quality': `Q${(stats.q30Percent > 95 ? 33 + (stats.q30Percent - 95) * 0.5 : 28 + stats.q30Percent * 0.05).toFixed(1)}`
			},
			chartData: {
				title: 'Filtering Results',
				x: ['Retained', 'Too Short', 'Low Quality'],
				y: [Math.round(totalReads * 0.955), Math.round(totalReads * 0.034), Math.round(totalReads * 0.012)],
				type: 'bar',
				xLabel: 'Category',
				yLabel: 'Reads'
			},
			files: [
				{ name: `${sampleName}_filtered.fastq.gz`, type: 'fastq', size: '3.2 GB' }
			]
		},
		'flye': {
			output: `\x1b[36mFlye v2.9.2\x1b[0m
[2024-01-15 14:10:00] INFO: Starting long-read assembly

\x1b[36mInput:\x1b[0m
  Reads: filtered/${sampleName}_filtered.fastq.gz
  Mode: {assemblyMode}
  Threads: 8

\x1b[36mAssembly pipeline:\x1b[0m
  [1/7] Constructing repeat graph...
  [2/7] Simplifying graph...
  [3/7] Collapsing bubbles...
  [4/7] Resolving repeats...
  [5/7] Generating consensus...
  [6/7] Polishing with reads...
  [7/7] Writing output...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  FLYE ASSEMBLY RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Assembly statistics:
    Total length: 5,234,567 bp
    Contigs: 3
    N50: 4,234,123 bp
    Largest contig: 4,823,456 bp
    GC content: 51.2%

  Contig summary:
    contig_1: 4,823,456 bp (chromosome)
    contig_2: 345,678 bp (plasmid)
    contig_3: 65,433 bp (plasmid)

\x1b[32m✓ Assembly complete - circular contigs detected\x1b[0m
\x1b[33mTip: Use medaka to polish the assembly\x1b[0m
`,
			summary: {
				'Total Length': `${(stats.assemblySize / 1e6).toFixed(2)} Mb`,
				'Contigs': stats.numContigs.toString(),
				'N50': `${(stats.n50 / 1e6).toFixed(2)} Mb`,
				'Largest': `${(stats.largestContig / 1e6).toFixed(2)} Mb`,
				'GC Content': `${stats.assemblyGC}%`,
				'Circular': `${stats.numCircular}/${stats.numContigs}`
			},
			chartData: {
				title: 'Contig Size Distribution',
				x: ['Chromosome', ...stats.plasmidContigs.map((_, i) => `Plasmid ${i + 1}`)],
				y: [stats.largestContig, ...stats.plasmidContigs.map(p => p.size)],
				type: 'bar',
				xLabel: 'Contig',
				yLabel: 'Length (bp)'
			},
			files: [
				{ name: 'assembly.fasta', type: 'fasta', size: '5.2 MB' },
				{ name: 'assembly.gfa', type: 'gfa', size: '6.1 MB' },
				{ name: 'assembly_info.txt', type: 'txt', size: '2.3 KB' },
				{ name: 'flye.log', type: 'log', size: '156 KB' }
			]
		},
		'medaka_consensus': {
			output: `\x1b[36mMedaka v1.11.3\x1b[0m
[2024-01-15 14:30:00] INFO: Starting assembly polishing

\x1b[36mInput:\x1b[0m
  Reads: filtered/${sampleName}_filtered.fastq.gz
  Draft: assembly/assembly.fasta
  Model: {medakaModel}

\x1b[36mPolishing pipeline:\x1b[0m
  [1/4] Aligning reads to draft...
  [2/4] Running neural network inference...
  [3/4] Calling consensus...
  [4/4] Writing polished assembly...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  MEDAKA POLISHING RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Input assembly: 5,234,567 bp
  Output assembly: 5,234,892 bp

  Corrections made:
    SNPs corrected: 1,234
    Insertions: 567
    Deletions: 432
    Total edits: 2,233

  Quality improvement:
    Estimated accuracy: 99.987%
    Q-score improvement: +8.4

\x1b[32m✓ Polishing complete - assembly accuracy improved\x1b[0m
\x1b[33mTip: Run BUSCO to verify assembly completeness\x1b[0m
`,
			summary: {
				'Input Size': `${(stats.assemblySize / 1e6).toFixed(2)} Mb`,
				'Output Size': `${(stats.assemblySize / 1e6).toFixed(2)} Mb`,
				'SNPs Fixed': '1,234',
				'Indels Fixed': '999',
				'Est. Accuracy': '99.987%',
				'Q Improvement': '+8.4'
			},
			chartData: {
				title: 'Corrections by Type',
				x: ['SNPs', 'Insertions', 'Deletions'],
				y: [1234, 567, 432],
				type: 'bar',
				xLabel: 'Correction Type',
				yLabel: 'Count'
			},
			files: [
				{ name: 'consensus.fasta', type: 'fasta', size: '5.2 MB' },
				{ name: 'calls_to_draft.bam', type: 'bam', size: '1.8 GB' },
				{ name: 'calls_to_draft.bam.bai', type: 'bai', size: '2.1 MB' }
			]
		},
		'porechop': {
			output: `\x1b[36mPorechop v0.2.4\x1b[0m
[2024-01-15 14:00:00] INFO: Trimming adapters from Nanopore reads

\x1b[36mInput:\x1b[0m
  File: ${sampleName}_nanopore.fastq.gz
  Reads: 156,789

\x1b[36mAdapter detection:\x1b[0m
  Scanning for known adapter sequences...
  Checking for chimeric reads...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  PORECHOP RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Adapter trimming:
    Reads with adapters: 145,234 (92.6%)
    Start adapters removed: 134,567
    End adapters removed: 128,901
    Middle adapters (split): 3,456

  Chimera handling:
    Chimeric reads split: 3,456
    Additional reads created: 3,456

  Output statistics:
    Total output reads: 160,245
    Mean read length: 8,234 bp

\x1b[32m✓ Adapter trimming complete\x1b[0m
\x1b[33mTip: Use filtlong to filter by quality and length\x1b[0m
`,
			summary: {
				'Input Reads': totalReads.toLocaleString(),
				'Reads w/Adapters': '92.6%',
				'Start Trimmed': Math.round(totalReads * 0.858).toLocaleString(),
				'End Trimmed': Math.round(totalReads * 0.822).toLocaleString(),
				'Chimeras Split': Math.round(totalReads * 0.022).toLocaleString(),
				'Output Reads': Math.round(totalReads * 1.022).toLocaleString()
			},
			chartData: {
				title: 'Adapter Locations',
				x: ['Start Only', 'End Only', 'Both Ends', 'Middle (Chimera)'],
				y: [Math.round(totalReads * 0.291), Math.round(totalReads * 0.207), Math.round(totalReads * 0.406), Math.round(totalReads * 0.022)],
				type: 'bar',
				xLabel: 'Adapter Location',
				yLabel: 'Read Count'
			},
			files: [
				{ name: `${sampleName}_trimmed.fastq.gz`, type: 'fastq', size: '1.2 GB' }
			]
		},
		'kraken2': {
			output: `\x1b[36mKraken2 v2.1.3\x1b[0m
[2024-01-15 14:15:00] INFO: Taxonomic classification

\x1b[36mInput:\x1b[0m
  File: filtered/${sampleName}_filtered.fastq.gz
  Database: standard
  Threads: 8

\x1b[36mClassifying reads...\x1b[0m
  Loading database index...
  Processing reads...
  Generating report...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  KRAKEN2 CLASSIFICATION RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Classification summary:
    Total sequences: 234,567
    Classified: 231,234 (98.6%)
    Unclassified: 3,333 (1.4%)

  Top classifications:
    Escherichia coli: 228,456 (97.4%)
    Shigella flexneri: 2,123 (0.9%)
    Klebsiella pneumoniae: 456 (0.2%)
    Other: 199 (0.1%)

  Species identification:
    Primary: Escherichia coli
    Confidence: 98.6%

\x1b[32m✓ Species confirmed: E. coli\x1b[0m
\x1b[33mNote: Minor contamination detected (< 2%)\x1b[0m
`,
			summary: {
				'Total Reads': totalReads.toLocaleString(),
				'Classified': '98.6%',
				'Primary Species': stats.organismShort,
				'Confidence': '97.4%',
				'Contamination': '< 2%',
				'Unclassified': '1.4%'
			},
			chartData: {
				title: 'Species Distribution',
				x: [stats.organismShort, 'Related species', 'Other species', 'Other', 'Unclassified'],
				y: [Math.round(totalReads * 0.974), Math.round(totalReads * 0.009), Math.round(totalReads * 0.002), Math.round(totalReads * 0.001), Math.round(totalReads * 0.014)],
				type: 'bar',
				xLabel: 'Species',
				yLabel: 'Read Count'
			},
			files: [
				{ name: 'kraken_report.txt', type: 'txt', size: '45 KB' },
				{ name: 'kraken_output.txt', type: 'txt', size: '12 MB' }
			]
		},
		// Amplicon/16S tools
		'cutadapt': {
			output: `\x1b[36mCutadapt v4.4\x1b[0m
Processing paired-end reads...

Forward primer: GTGCCAGCMGCCGCGGTAA (515F)
Reverse primer: GGACTACHVGGGTWTCTAAT (806R)

\x1b[36mTrimming statistics:\x1b[0m
  Total read pairs processed: 245,678
  Read 1 with adapter: 243,234 (99.0%)
  Read 2 with adapter: 242,987 (98.9%)
  Pairs written: 241,234 (98.2%)
  Pairs too short: 4,444 (1.8%)

\x1b[36mBase pairs:\x1b[0m
  Input: 73,703,400 bp
  Output: 60,308,500 bp (81.8%)
  Quality-trimmed: 1,234,567 bp

\x1b[32m✓ Primer trimming complete\x1b[0m
`,
			summary: {
				'Read Pairs': totalReads.toLocaleString(),
				'Pairs Written': `${Math.round(totalReads * 0.982).toLocaleString()} (98.2%)`,
				'Pairs Too Short': `${Math.round(totalReads * 0.018).toLocaleString()} (1.8%)`,
				'Forward Primer': '515F (99.0% matched)',
				'Reverse Primer': '806R (98.9% matched)',
				'Quality': stats.q30Percent > 80 ? 'PASS' : 'WARN'
			},
			chartData: {
				title: 'Primer Trimming Results',
				x: ['Pairs Written', 'Too Short', 'No Adapter'],
				y: [Math.round(totalReads * 0.982), Math.round(totalReads * 0.018), Math.round(totalReads * 0.004)],
				type: 'bar',
				xLabel: 'Category',
				yLabel: 'Read Pairs'
			},
			files: [
				{ name: 'trimmed/sample_R1.fastq.gz', type: 'fastq', size: '89 MB' },
				{ name: 'trimmed/sample_R2.fastq.gz', type: 'fastq', size: '87 MB' }
			]
		},
		'qiime': {
			output: `\x1b[36mQIIME 2 version 2024.2\x1b[0m
Running QIIME 2 pipeline...

\x1b[36mImporting data...\x1b[0m
  Samples: 40
  Sequences per sample: 24,567 (avg)

\x1b[36mDADA2 denoising...\x1b[0m
  Input sequences: 982,680
  Filtered sequences: 956,234 (97.3%)
  Denoised sequences: 945,678 (98.9%)
  Merged sequences: 923,456 (97.6%)
  Non-chimeric: 912,345 (98.8%)
  ASVs generated: 2,847

\x1b[36mTaxonomy assignment...\x1b[0m
  Classifier: SILVA 138.1
  Confidence threshold: 0.7
  Assigned taxonomy: 2,734 ASVs (96.0%)

\x1b[36mDiversity analysis...\x1b[0m
  Alpha diversity: Shannon, Simpson, Chao1, Faith PD
  Beta diversity: Bray-Curtis, Jaccard, UniFrac

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  QIIME 2 ANALYSIS COMPLETE\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

\x1b[32m✓ Feature table: table.qza (2,847 features x 40 samples)\x1b[0m
\x1b[32m✓ Representative sequences: rep-seqs.qza\x1b[0m
\x1b[32m✓ Taxonomy: taxonomy.qza\x1b[0m
\x1b[32m✓ Phylogenetic tree: rooted-tree.qza\x1b[0m

\x1b[33mTip: View results with 'qiime tools view <artifact>.qzv'\x1b[0m
`,
			summary: {
				'Total ASVs': '2,847',
				'Total Samples': '40',
				'Non-chimeric Reads': '912,345 (98.8%)',
				'Taxonomy Assigned': '96.0%',
				'Database': 'SILVA 138.1',
				'Status': 'COMPLETE'
			},
			chartData: {
				title: 'DADA2 Read Processing',
				x: ['Input', 'Filtered', 'Denoised', 'Merged', 'Non-chimeric'],
				y: [982680, 956234, 945678, 923456, 912345],
				type: 'bar',
				xLabel: 'Processing Step',
				yLabel: 'Read Count'
			},
			files: [
				{ name: 'table.qza', type: 'qza', size: '2.3 MB' },
				{ name: 'rep-seqs.qza', type: 'qza', size: '456 KB' },
				{ name: 'taxonomy.qza', type: 'qza', size: '789 KB' },
				{ name: 'rooted-tree.qza', type: 'qza', size: '1.2 MB' }
			]
		},
		'biom': {
			output: `\x1b[36mBIOM-format v2.1.15\x1b[0m
Converting BIOM to TSV format...

\x1b[36mInput:\x1b[0m feature-table.biom
\x1b[36mOutput:\x1b[0m feature-table.tsv

\x1b[36mTable summary:\x1b[0m
  Number of samples: 40
  Number of features: 2,847
  Total observations: 912,345
  Sparsity: 67.3%

\x1b[32m✓ Conversion complete\x1b[0m
  Output: exported/feature-table.tsv
`,
			summary: {
				'Samples': '40',
				'Features (ASVs)': '2,847',
				'Total Observations': '912,345',
				'Sparsity': '67.3%',
				'Format': 'TSV'
			},
			files: [
				{ name: 'feature-table.tsv', type: 'tsv', size: '1.8 MB' }
			]
		},
		'sourcetracker2': {
			output: `\x1b[36mSourceTracker2 v2.0.1\x1b[0m
Gibbs sampling for source tracking...

\x1b[36mSources defined:\x1b[0m
  - Human fecal
  - Cattle fecal
  - Environmental

\x1b[36mSinks analyzed:\x1b[0m
  - Municipal water
  - Well water
  - Agricultural runoff
  - Reference stream

\x1b[36mRunning Gibbs sampler...\x1b[0m
  Burn-in: 100 iterations
  Draws: 10 per sink
  Restarts: 5

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  SOURCE TRACKING RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Well water:
    Cattle: 78.2% ± 3.4%
    Human: 15.3% ± 2.1%
    Environmental: 4.2% ± 1.8%
    Unknown: 2.3% ± 0.9%

  Agricultural runoff:
    Cattle: 92.1% ± 2.8%
    Human: 3.4% ± 1.2%
    Environmental: 3.1% ± 1.5%
    Unknown: 1.4% ± 0.6%

  Municipal (treated):
    Environmental: 87.3% ± 4.2%
    Unknown: 12.7% ± 4.2%

\x1b[32m✓ Source tracking complete\x1b[0m
\x1b[33mNote: High cattle contribution detected in well water\x1b[0m
`,
			summary: {
				'Well - Cattle': '78.2%',
				'Well - Human': '15.3%',
				'Runoff - Cattle': '92.1%',
				'Municipal - Environmental': '87.3%',
				'Primary Contamination': 'Cattle fecal'
			},
			chartData: {
				title: 'Source Contributions to Well Water',
				x: ['Cattle', 'Human', 'Environmental', 'Unknown'],
				y: [78.2, 15.3, 4.2, 2.3],
				type: 'bar',
				xLabel: 'Source',
				yLabel: 'Contribution (%)'
			},
			files: [
				{ name: 'mixing_proportions.txt', type: 'txt', size: '12 KB' },
				{ name: 'full_results.txt', type: 'txt', size: '156 KB' }
			]
		},
		// PacBio HiFi tools
		'pbmarkdup': {
			output: `\x1b[36mpbmarkdup v1.0.2\x1b[0m
[INFO] Processing HiFi reads for duplicate marking...

\x1b[36mInput:\x1b[0m
  File: ${sampleName}_hifi.fastq.gz
  Reads: 456,789

\x1b[36mIdentifying PCR duplicates...\x1b[0m
  Analyzing read alignment coordinates...
  Clustering by position and sequence...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  DUPLICATE MARKING RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Total reads: 456,789
  Unique reads: 451,234 (98.8%)
  Duplicates: 5,555 (1.2%)

\x1b[32m✓ Duplicates marked successfully\x1b[0m
\x1b[33mNote: Low duplication rate indicates high library complexity\x1b[0m
`,
			summary: {
				'Total Reads': totalReads.toLocaleString(),
				'Unique Reads': `${Math.round(totalReads * 0.988).toLocaleString()} (98.8%)`,
				'Duplicates': `${Math.round(totalReads * 0.012).toLocaleString()} (1.2%)`,
				'Library Complexity': totalReads > 100000 ? 'HIGH' : 'MODERATE',
				'Status': totalReads > 0 ? 'PASS' : 'FAIL'
			},
			chartData: {
				title: 'Read Duplication',
				x: ['Unique Reads', 'Duplicates'],
				y: [Math.round(totalReads * 0.988), Math.round(totalReads * 0.012)],
				type: 'bar',
				xLabel: 'Category',
				yLabel: 'Read Count'
			},
			files: [
				{ name: `${sampleName}_dedup.fastq.gz`, type: 'fastq', size: '2.8 GB' }
			]
		},
		'ccs': {
			output: `\x1b[36mccs v6.4.0\x1b[0m
[INFO] Generating CCS (Circular Consensus Sequences)...

\x1b[36mInput:\x1b[0m
  Subreads BAM: ${sampleName}.subreads.bam
  Min passes: 3
  Min accuracy: 0.99

\x1b[36mProcessing ZMWs...\x1b[0m
  Total ZMWs: 523,456
  With >= 3 passes: 478,234 (91.4%)

\x1b[36mGenerating consensus...\x1b[0m
  Aligning subreads...
  Calling consensus bases...
  Computing quality scores...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  CCS GENERATION RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  HiFi reads generated: 456,789
  Mean read length: 12,456 bp
  Mean read quality: Q42
  Mean passes: 8.3
  Yield: 5.7 Gb

\x1b[32m✓ CCS generation complete\x1b[0m
\x1b[33mNote: Q42 indicates 99.994% accuracy per base\x1b[0m
`,
			summary: {
				'HiFi Reads': totalReads.toLocaleString(),
				'Mean Length': `${readLength.toLocaleString()} bp`,
				'Mean Quality': 'Q42 (99.994%)',
				'Mean Passes': '8.3',
				'Total Yield': `${(totalReads * readLength / 1e9).toFixed(1)} Gb`,
				'Status': stats.q30Percent > 90 ? 'EXCELLENT' : (stats.q30Percent > 80 ? 'GOOD' : 'FAIR')
			},
			chartData: {
				title: 'HiFi Read Quality Distribution',
				x: ['Q30-Q35', 'Q35-Q40', 'Q40-Q45', 'Q45+'],
				y: [45678, 156789, 198765, 55557],
				type: 'bar',
				xLabel: 'Quality Score Range',
				yLabel: 'Read Count'
			},
			files: [
				{ name: `${sampleName}_hifi.fastq.gz`, type: 'fastq', size: '5.7 GB' }
			]
		},
		'hifiasm': {
			output: `\x1b[36mhifiasm v0.19.5-r593\x1b[0m
[M::main] Options: -o assembly -t 8

\x1b[36mLoading HiFi reads...\x1b[0m
  Reads loaded: 456,789
  Total bases: 5.7 Gb

\x1b[36mBuilding string graph...\x1b[0m
  [M::hamt_assemble::ha_hist_line] peak coverage: 45
  [M::hamt_assemble] homozygous read coverage max: 60
  [M::hamt_assemble] heterozygous read coverage max: 30

\x1b[36mAssembling primary contigs...\x1b[0m
  [M::hamt_assemble] # primary contigs: 4
  [M::hamt_assemble] Total primary assembly size: 5,523,456

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  HIFIASM ASSEMBLY RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Primary assembly:
    Contigs: 4
    Total length: 5,523,456 bp
    N50: 4,892,156 bp
    Largest contig: 4,892,156 bp

  GFA files generated:
    - assembly.bp.p_ctg.gfa (primary contigs)
    - assembly.bp.a_ctg.gfa (alternate contigs)

\x1b[32m✓ Assembly complete\x1b[0m
\x1b[33mNote: 4 contigs likely represent 1 chromosome + 3 plasmids\x1b[0m
`,
			summary: {
				'Primary Contigs': stats.numContigs.toString(),
				'Total Length': `${stats.assemblySize.toLocaleString()} bp`,
				'N50': `${stats.n50.toLocaleString()} bp`,
				'Largest Contig': `${stats.largestContig.toLocaleString()} bp`,
				'Coverage': `${Math.round(totalReads * readLength / stats.assemblySize)}x`,
				'Quality': stats.checkm.quality === 'High' ? 'EXCELLENT' : (stats.checkm.quality === 'Medium' ? 'GOOD' : 'FAIR')
			},
			chartData: {
				title: 'Contig Size Distribution',
				x: ['Chromosome', ...stats.plasmidContigs.map((_, i) => `Plasmid ${i + 1}`)],
				y: [stats.largestContig, ...stats.plasmidContigs.map(p => p.size)],
				type: 'bar',
				xLabel: 'Contig',
				yLabel: 'Length (bp)'
			},
			files: [
				{ name: 'assembly.bp.p_ctg.gfa', type: 'gfa', size: '5.8 MB' },
				{ name: 'assembly.bp.p_ctg.fasta', type: 'fasta', size: '5.3 MB' },
				{ name: 'assembly.bp.a_ctg.gfa', type: 'gfa', size: '2.1 MB' }
			]
		},
		'modkit': {
			output: `\x1b[36mmodkit v0.2.4\x1b[0m
[INFO] Analyzing methylation from Nanopore data...

\x1b[36mInput:\x1b[0m
  BAM file: ${sampleName}_nanopore.bam
  Reference: polished/consensus.fasta
  Mode: pileup

\x1b[36mProcessing base modifications...\x1b[0m
  Detecting 5mC (5-methylcytosine)...
  Detecting 6mA (N6-methyladenine)...
  Computing methylation frequencies...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  METHYLATION ANALYSIS RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  5mC methylation:
    Sites analyzed: 234,567
    Methylated sites: 12,345 (5.3%)
    Mean modification probability: 0.89

  6mA methylation:
    Sites analyzed: 456,789
    Methylated sites: 189,234 (41.4%)
    Mean modification probability: 0.94

  Genome-wide methylation: 23.3%

\x1b[32m✓ Methylation analysis complete\x1b[0m
\x1b[33mNote: High 6mA suggests Dam methylase activity (typical for bacteria)\x1b[0m
`,
			summary: {
				'5mC Sites': '12,345 (5.3%)',
				'6mA Sites': '189,234 (41.4%)',
				'Total Sites': '691,356',
				'Genome Methylation': '23.3%',
				'Dominant Type': '6mA (Dam)',
				'Status': 'Complete'
			},
			chartData: {
				title: 'Methylation Distribution',
				x: ['5mC', '6mA', 'Unmethylated'],
				y: [12345, 189234, 489777],
				type: 'bar',
				xLabel: 'Modification Type',
				yLabel: 'Site Count'
			},
			files: [
				{ name: 'methylation_5mC.bed', type: 'bed', size: '2.3 MB' },
				{ name: 'methylation_6mA.bed', type: 'bed', size: '8.7 MB' },
				{ name: 'summary.txt', type: 'txt', size: '12 KB' }
			]
		},
		// R/RMarkdown tools
		'Rscript': {
			output: `\x1b[36mR version 4.3.2 (2023-10-31) -- "Eye Holes"\x1b[0m

\x1b[36mExecuting R script...\x1b[0m

${fullCmd.includes('install.packages') ? `Installing packages from CRAN...
  - Checking dependencies
  - Downloading packages
  - Installing packages to /usr/local/lib/R/site-library

\x1b[32m✓ Packages installed successfully\x1b[0m` : ''}${fullCmd.includes('BiocManager::install') ? `Installing Bioconductor packages...
  - Checking BiocManager version
  - Resolving dependencies
  - Downloading from Bioconductor

\x1b[32m✓ Bioconductor packages installed successfully\x1b[0m` : ''}${fullCmd.includes('tinytex') ? `Installing TinyTeX...
  - Downloading TinyTeX bundle
  - Extracting to ~/Library/TinyTeX
  - Setting up PATH

\x1b[32m✓ TinyTeX installed successfully\x1b[0m` : ''}${fullCmd.includes('read.delim') || fullCmd.includes('read.csv') ? `Loading data file...
  - Reading file into data frame
  - Parsing columns

Data preview:
  Sample1  Sample2  Sample3
1   1234     5678     9012
2   3456     7890     1234
3   5678     9012     3456

\x1b[32m✓ Data loaded successfully\x1b[0m` : ''}${fullCmd.includes('readRDS') ? `Loading R object from file...
  - Reading phyloseq/DESeq2 object

Object summary:
  - Class: phyloseq/DESeqDataSet
  - Samples: 24
  - Features: 4,523

\x1b[32m✓ R object loaded successfully\x1b[0m` : ''}${fullCmd.includes('pheatmap') || fullCmd.includes('ggplot') || fullCmd.includes('ggtree') || fullCmd.includes('EnhancedVolcano') ? `Generating visualization...
  - Setting up graphics device
  - Rendering plot
  - Applying theme and styling

\x1b[32m✓ Plot generated successfully\x1b[0m
\x1b[33mNote: Plot displayed in output panel\x1b[0m` : ''}${fullCmd.includes('kable') ? `Generating formatted table...
  - Applying styling options
  - Formatting for PDF output

\x1b[32m✓ Table generated successfully\x1b[0m` : ''}${fullCmd.includes('rmarkdown::render') ? `Rendering R Markdown document...
  - Parsing YAML header
  - Knitting code chunks
  - Running LaTeX compilation
  - Generating PDF output

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  PDF REPORT GENERATED SUCCESSFULLY\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

Output: ${fullCmd.includes('wgs_report') ? 'wgs_report.pdf' : (fullCmd.includes('microbiome_report') ? 'microbiome_report.pdf' : 'rnaseq_report.pdf')}
Pages: ${Math.floor(Math.random() * 5) + 8}
Size: ${(Math.random() * 2 + 1).toFixed(1)} MB

\x1b[32m✓ Report compilation complete\x1b[0m` : ''}
`,
			summary: fullCmd.includes('rmarkdown::render') ? {
				'Status': 'Complete',
				'Output': fullCmd.includes('wgs_report') ? 'wgs_report.pdf' : (fullCmd.includes('microbiome_report') ? 'microbiome_report.pdf' : 'rnaseq_report.pdf'),
				'Pages': `${Math.floor(Math.random() * 5) + 8}`,
				'Size': `${(Math.random() * 2 + 1).toFixed(1)} MB`
			} : {
				'Status': 'Complete',
				'R Version': '4.3.2',
				'Output': 'Success'
			},
			files: fullCmd.includes('rmarkdown::render') ? [
				{ name: fullCmd.includes('wgs_report') ? 'wgs_report.pdf' : (fullCmd.includes('microbiome_report') ? 'microbiome_report.pdf' : 'rnaseq_report.pdf'), type: 'pdf', size: `${(Math.random() * 2 + 1).toFixed(1)} MB` }
			] : []
		}
	};

	// Handle plasmidfinder.py as alias for plasmidfinder
	const toolKey = tool === 'plasmidfinder.py' ? 'plasmidfinder' : tool;
	return outputs[toolKey] || null;
}
