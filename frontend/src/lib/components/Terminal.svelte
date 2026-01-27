<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { outputData, terminalState, toolExecutionTimes, allowedCommands, blockedCommands, bioTools, executedCommands, executedSteps, currentDirectory, stopSignal, storylineDataDir, templateFiles, storylineContext, API_BASE_URL } from '$lib/stores/terminal';
	import { get } from 'svelte/store';
	import { getToolFiles, getToolFileUrl, getRootFileUrl, getFileType, formatFileSize, fetchFileContent, fetchRootFileContent, fetchFilesystemStructure } from '$lib/services/templateService';
	import { formatAmrGeneRows, formatMlstRow, formatFileColor } from '$lib/utils/format-utils';

	// Import terminal outputs from storylines
	import { helpTexts as tutorialHelpTexts } from '$lib/storylines/tutorial/terminal-outputs';
	import { helpTexts as wgsBacteriaHelpTexts } from '$lib/storylines/wgs-bacteria/terminal-outputs';
	import { getStorylineStats } from '$lib/storylines/tool-outputs-index';

	// Props
	let { initialDir = '/data/outbreak_investigation' }: { initialDir?: string } = $props();

	let terminalContainer: HTMLDivElement;
	let terminal: any;
	let fitAddon: any;
	let resizeObserver: ResizeObserver;
	let commandBuffer = '';
	let stopUnsubscribe: () => void;
	let cursorPosition = 0;  // Track cursor position for left/right arrow
	let isExecuting = false;
	// Initialize currentDir from the store (set by ThreePanelLayout based on storyline)
	let currentDir = get(currentDirectory);

	// Command history for arrow up/down
	let commandHistoryList: string[] = [];
	let historyIndex = -1;
	let savedCurrentBuffer = '';

	// Allowed commands for dropdown display
	const allowedCommandsList = [
		'ls', 'cd', 'pwd', 'cat', 'head', 'tail', 'clear', 'help'
	];

	// Track which tools have been run for dynamic filesystem
	let executedToolsList: string[] = [];
	executedCommands.subscribe(cmds => executedToolsList = cmds);

	// Template filesystem loaded from API (overrides baseFilesystem for matching paths)
	let templateFilesystem: Record<string, string[]> = {};

	// Load filesystem from template API when storyline context changes
	async function loadTemplateFilesystem() {
		const dataDir = get(storylineDataDir);
		if (!dataDir) return;

		const result = await fetchFilesystemStructure(dataDir);
		if (result && result.filesystem) {
			templateFilesystem = result.filesystem;
		}
	}

	// Subscribe to storyline context changes to reload filesystem
	storylineContext.subscribe(ctx => {
		if (ctx) {
			loadTemplateFilesystem();
		}
	});

	// Base filesystem - limited to the Linux tutorial fallback when templates are unavailable
	const baseFilesystem: Record<string, string[]> = {
		// Linux Tutorial directory (results/ is NOT present initially - created by mkdir step)
		'/data/linux_tutorial': [
			'sample_info.txt', 'sequences/', 'references/'
		],
		'/data/linux_tutorial/sequences': [
			'sample_R1.fastq', 'sample_R2.fastq'
		],
		'/data/linux_tutorial/references': [
			'genome.fasta', 'annotations.gff'
		]
	};

	// Files created by each tool
	// Hardcoded tool outputs are disabled; non-tutorial storylines should rely on template files.
	const toolCreatedFiles: Record<string, Record<string, string[]>> = {};

	// Normalize a path by resolving . and .. components
	function normalizePath(path: string): string {
		// Handle relative paths starting with ./
		if (path.startsWith('./')) {
			path = `${currentDir}/${path.slice(2)}`;
		} else if (!path.startsWith('/')) {
			path = `${currentDir}/${path}`;
		}

		// Split into parts and resolve . and ..
		const parts = path.split('/').filter(p => p && p !== '.');
		const resolved: string[] = [];

		for (const part of parts) {
			if (part === '..') {
				if (resolved.length > 0) {
					resolved.pop();
				}
			} else {
				resolved.push(part);
			}
		}

		return '/' + resolved.join('/');
	}

	// Get dynamic filesystem based on executed commands
	function getFilesystem(): Record<string, string[]> {
		const fs: Record<string, string[]> = {};

		// Start with base filesystem (fallback for paths not in template)
		for (const [path, files] of Object.entries(baseFilesystem)) {fs[path] = [...files];}

		// Override with template filesystem (loaded from API)
		for (const [path, files] of Object.entries(templateFilesystem)) {fs[path] = [...files];}

		// Add files from executed tools
		for (const tool of executedToolsList) {
			const created = toolCreatedFiles[tool];
			if (created) {
				for (const [path, files] of Object.entries(created)) {
					// If template filesystem defines this path, trust template data over hardcoded tool outputs
					if (templateFilesystem[path]) {
						continue;
					}
					if (!fs[path]) fs[path] = [];
					for (const file of files) {
						if (!fs[path].includes(file)) {
							fs[path].push(file);
						}
					}
				}
			}
		}

		// Add directories created by mkdir/cp -r to their parent directory
		for (const dirPath of createdDirs) {
			const parentPath = dirPath.substring(0, dirPath.lastIndexOf('/')) || '/';
			const dirName = dirPath.substring(dirPath.lastIndexOf('/') + 1) + '/';
			if (!fs[parentPath]) fs[parentPath] = [];
			if (!fs[parentPath].includes(dirName)) {
				fs[parentPath].push(dirName);
			}
			// Also create empty entry for the new directory itself
			if (!fs[dirPath]) fs[dirPath] = [];
		}

		// Add files created by redirection (>, >>)
		for (const filePath of Object.keys(createdFiles)) {
			const parentPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
			const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
			if (!fs[parentPath]) fs[parentPath] = [];
			if (!fs[parentPath].includes(fileName)) {
				fs[parentPath].push(fileName);
			}
		}

		const executed = new Set(get(executedCommands));
		// Only show the list of files after tool commands are executed
		for (const [path, entries] of Object.entries(fs)) {
			fs[path] = entries.filter(entry => {
				const match = entry.match(/^o_([^/.]+)(?:[/.]|$)/);
				const tool = match ? match[1] : null;
				if (!tool) return true;
				return executed.has(tool);
			});
		}
		return fs;
	}


	// matches o_tool or o_toolname.ext or o_toolname/
	function getToolFromOutputName(name: string): string | null {
		const match = name.match(/^o_([^/.]+)(?:[/.]|$)/);
		return match ? match[1] : null;
	}


	// Generate dynamic tool output based on input file
	function getToolOutput(tool: string, args: string[], fullCmd: string): any {
		// Get storyline-specific stats from the current context
		const context = get(storylineContext);
		const stats = getStorylineStats(context?.category || 'tutorial', context?.storyline || 'kpneumoniae-demo');

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
				summary: undefined,
				files: []
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
					'R1 Quality': 'PASS',
					'R2 Quality': 'PASS',
					'Avg Read Length': `${readLength} bp`,
					'GC Content': `${gcContent}%`,
					'Adapter Content': 'Negligible'
				},
				chartData: undefined,
				files: []
			},
			'multiqc': {
				output: `\x1b[34m/// \x1b[0m\x1b[1mMultiQC\x1b[0m 🔍 | v1.14
\x1b[34m/// \x1b[0m

\x1b[32m[INFO]\x1b[0m     multiqc : This is MultiQC v1.14
\x1b[32m[INFO]\x1b[0m     search_modules : Searching o_fastqc/ for analysis results
\x1b[32m[INFO]\x1b[0m     fastqc : Found 8 reports
\x1b[32m[INFO]\x1b[0m     write_results : Compiling report
\x1b[32m[INFO]\x1b[0m     write_results : Report written to multiqc_report.html
\x1b[32m[INFO]\x1b[0m     write_results : Data exported to multiqc_data/
\x1b[32m[INFO]\x1b[0m     multiqc : MultiQC complete
`,
				summary: {
					'FastQC Reports': '8 samples',
					'Mean Quality Score': '34.2',
					'Mean GC Content': '55.2%',
					'Samples Passing': '8/8 (100%)',
					'Adapter Content': 'Low (<5%)',
					'Report Generated': 'multiqc_report.html'
				},
				chartData: {
					title: 'Mean Quality Scores Across Samples',
					x: ['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5', 'Sample 6', 'Sample 7', 'Sample 8'],
					y: [34.5, 33.8, 34.2, 34.1, 33.9, 34.3, 34.0, 34.4],
					type: 'bar',
					xLabel: 'Sample',
					yLabel: 'Mean Quality Score'
				},
				files: [
					{ name: 'multiqc_report.html', type: 'html', size: '1.4 MB' },
					{ name: 'multiqc_data/', type: 'dir', size: '156 KB' }
				]
			},
			'trimmomatic': {
				output: `Picked up _JAVA_OPTIONS: -Xmx8g
TrimmomaticPE: Started with arguments:
 -threads 2 -phred33 ${file1} ${file2} o_trimmomatic/${sampleName}_R1_paired.fq.gz o_trimmomatic/${sampleName}_R1_unpaired.fq.gz o_trimmomatic/${sampleName}_R2_paired.fq.gz o_trimmomatic/${sampleName}_R2_unpaired.fq.gz ILLUMINACLIP:/home/pop/miniconda3/envs/env_seqkit/share/trimmomatic/adapters/TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36
ILLUMINACLIP: Using adapter file from user-specified absolute path: /home/pop/miniconda3/envs/env_seqkit/share/trimmomatic/adapters/TruSeq3-PE.fa
Using PrefixPair: 'TACACTCTTTCCCTACACGACGCTCTTCCGATCT' and 'GTGACTGGAGTTCAGACGTGTGCTCTTCCGATCT'
ILLUMINACLIP: Using 1 prefix pairs, 0 forward/reverse sequences, 0 forward only sequences, 0 reverse only sequences
Input Read Pairs: ${totalReads.toLocaleString()} Both Surviving: ${trimBothSurviving.toLocaleString()} (99.23%) Forward Only Surviving: ${trimForwardOnly.toLocaleString()} (0.47%) Reverse Only Surviving: ${trimReverseOnly.toLocaleString()} (0.03%) Dropped: ${trimDropped.toLocaleString()} (0.27%)
TrimmomaticPE: Completed successfully
`,
				summary: {
					'Input Reads': `${totalReads.toLocaleString()} pairs`,
					'Both Surviving': `${trimBothSurviving.toLocaleString()} (99.23%)`,
					'Forward Only': `${trimForwardOnly.toLocaleString()} (0.47%)`,
					'Reverse Only': `${trimReverseOnly.toLocaleString()} (0.03%)`,
					'Dropped': `${trimDropped.toLocaleString()} (0.27%)`
				},
				chartData: {
					title: 'Trimmomatic Read Retention',
					x: ['Both Surviving', 'Forward Only', 'Reverse Only', 'Dropped'],
					y: [trimBothSurviving, trimForwardOnly, trimReverseOnly, trimDropped],
					type: 'bar',
					xLabel: 'Read Category',
					yLabel: 'Number of Reads'
				},
				files: [
					{ name: `${sampleName}_R1_paired.fq.gz`, type: 'fastq', size: '342 MB' },
					{ name: `${sampleName}_R2_paired.fq.gz`, type: 'fastq', size: '341 MB' },
					{ name: `${sampleName}_R1_unpaired.fq.gz`, type: 'fastq', size: '4.8 MB' },
					{ name: `${sampleName}_R2_unpaired.fq.gz`, type: 'fastq', size: '2.7 MB' }
				]
			},
			'unicycler': {
				output: `
\x1b[1;32m _    _       _                  _
| |  | |     (_)                | |
| |  | |_ __  _  ___ _   _  ____| | ___ _ __
| |  | | '_ \\| |/ __| | | |/ __| |/ _ \\ '__|
| |__| | | | | | (__| |_| | (__| |  __/ |
 \\____/|_| |_|_|\\___|\\__, |\\___|_|\\___|_|
                      __/ |
                     |___/\x1b[0m

Starting Unicycler v0.5.0

\x1b[36mLoading reads...\x1b[0m
  Forward reads: ${trimBothSurviving.toLocaleString()}
  Reverse reads: ${trimBothSurviving.toLocaleString()}

\x1b[36mPerforming SPAdes assembly...\x1b[0m
  k=27, k=47, k=63, k=77, k=89, k=99, k=127

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
					'Incomplete': `1 component (${stats.bandage.largestComponentSegments} segments)`,
					'Status': 'incomplete'
				},
				chartData: {
					title: 'Component Length Distribution',
					x: ['Component 1 (incomplete)', ...stats.plasmidContigs.map((_, i) => `Component ${i + 2}`)],
					y: [stats.bandage.largestComponentSize, ...stats.plasmidContigs.map(p => p.size)],
					type: 'bar',
					xLabel: 'Component',
					yLabel: 'Length (bp)'
				},
				files: [
					{ name: '001_spades_graph_k027.gfa', type: 'gfa', size: '1.2 MB' },
					{ name: '001_spades_graph_k053.gfa', type: 'gfa', size: '2.1 MB' },
					{ name: '001_spades_graph_k071.gfa', type: 'gfa', size: '2.8 MB' },
					{ name: '001_spades_graph_k087.gfa', type: 'gfa', size: '3.2 MB' },
					{ name: '001_spades_graph_k099.gfa', type: 'gfa', size: '3.5 MB' },
					{ name: '001_spades_graph_k111.gfa', type: 'gfa', size: '3.8 MB' },
					{ name: '001_spades_graph_k119.gfa', type: 'gfa', size: '4.0 MB' },
					{ name: '001_spades_graph_k127.gfa', type: 'gfa', size: '4.2 MB' },
					{ name: '002_depth_filter.gfa', type: 'gfa', size: '8.5 MB' },
					{ name: '003_overlaps_removed.gfa', type: 'gfa', size: '7.8 MB' },
					{ name: '004_bridges_applied.gfa', type: 'gfa', size: '6.2 MB' },
					{ name: '005_final_clean.gfa', type: 'gfa', size: '5.8 MB' },
					{ name: 'assembly.fasta', type: 'fasta', size: '5.3 MB' },
					{ name: 'assembly.gfa', type: 'gfa', size: '5.8 MB' },
					{ name: 'unicycler.log', type: 'log', size: '48 KB' }
				]
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
				},
				files: [
					{ name: 'o_bandage.png', type: 'png', size: '245 KB' }
				]
			},
			'quast': {
				output: `WARNING: Python locale settings can't be changed
/home/pop/miniconda3/envs/env_quast/bin/quast o_unicycler/assembly.fasta -o o_quast

Version: 5.0.2

System information:
  OS: Linux-6.1.0-42-cloud-amd64-x86_64-with-debian-12.13 (linux_64)
  Python version: 3.6.13
  CPUs number: 4

Started: 2026-01-12 05:48:06

Logging to ${currentDir}/o_quast/quast.log
NOTICE: Maximum number of threads is set to 1 (use --threads option to set it manually)

CWD: ${currentDir}
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
    saved to ${currentDir}/o_quast/basic_stats/Nx_plot.pdf
  Drawing cumulative plot...
    saved to ${currentDir}/o_quast/basic_stats/cumulative_plot.pdf
  Drawing GC content plot...
    saved to ${currentDir}/o_quast/basic_stats/GC_content_plot.pdf
  Drawing assembly GC content plot...
    saved to ${currentDir}/o_quast/basic_stats/assembly_GC_content_plot.pdf
Done.

NOTICE: Genes are not predicted by default. Use --gene-finding or --glimmer option to enable it.

2026-01-12 05:48:09
Creating large visual summaries...
This may take a while: press Ctrl-C to skip this step..
  1 of 2: Creating Icarus viewers...
  2 of 2: Creating PDF with all tables and plots...
Done

2026-01-12 05:48:10
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

  Text versions of total report are saved to ${currentDir}/o_quast/report.txt, report.tsv, and report.tex
  Text versions of transposed total report are saved to ${currentDir}/o_quast/transposed_report.txt, transposed_report.tsv, and transposed_report.tex
  HTML version (interactive tables and plots) is saved to ${currentDir}/o_quast/report.html
  PDF version (tables and plots) is saved to ${currentDir}/o_quast/report.pdf
  Icarus (contig browser) is saved to ${currentDir}/o_quast/icarus.html
  Log is saved to ${currentDir}/o_quast/quast.log

Finished: 2026-01-12 05:48:10
Elapsed time: 0:00:03.963635
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
				},
				files: [
					{ name: 'report.html', type: 'html', size: '156 KB' },
					{ name: 'report.tsv', type: 'tsv', size: '2.3 KB' },
					{ name: 'report.txt', type: 'txt', size: '1.8 KB' },
					{ name: 'report.tex', type: 'tex', size: '2.1 KB' },
					{ name: 'report.pdf', type: 'pdf', size: '245 KB' },
					{ name: 'transposed_report.tsv', type: 'tsv', size: '1.9 KB' },
					{ name: 'transposed_report.txt', type: 'txt', size: '1.5 KB' },
					{ name: 'transposed_report.tex', type: 'tex', size: '1.7 KB' },
					{ name: 'icarus.html', type: 'html', size: '89 KB' },
					{ name: 'quast.log', type: 'log', size: '12 KB' },
					{ name: 'basic_stats/', type: 'dir', size: '420 KB' },
					{ name: 'icarus_viewers/', type: 'dir', size: '156 KB' }
				]
			},
			'prokka': {
				output: `[07:38:44] This is prokka 1.14.6
[07:38:44] Written by Torsten Seemann <torsten.seemann@gmail.com>
[07:38:44] Homepage is https://github.com/tseemann/prokka
[07:38:44] Local time is Mon Jan 12 07:38:44 2026
[07:38:44] You are pop
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
[07:38:44] Command: /home/pop/miniconda3/envs/env_abricate/bin/prokka --outdir o_prokka --prefix PROKKA o_unicycler/assembly.fasta
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
[07:46:19] Walltime used: 7.58 minutes
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
				},
				files: [
					{ name: 'PROKKA.gff', type: 'gff', size: '2.9 MB' },
					{ name: 'PROKKA.gbk', type: 'gbk', size: '9.2 MB' },
					{ name: 'PROKKA.faa', type: 'faa', size: '1.8 MB' },
					{ name: 'PROKKA.fna', type: 'fna', size: '5.4 MB' },
					{ name: 'PROKKA.ffn', type: 'ffn', size: '4.8 MB' },
					{ name: 'PROKKA.tsv', type: 'tsv', size: '1.2 MB' },
					{ name: 'PROKKA.txt', type: 'txt', size: '256 B' }
				]
			},
			'abricate': {
				output: `Using database ${stats.amrDatabase}:	5386 sequences -  2024-Jan-10
Processing: o_unicycler/assembly.fasta
Found ${stats.amrGenes.length} genes in o_unicycler/assembly.fasta

#FILE	SEQUENCE	START	END	STRAND	GENE	COVERAGE	GAPS	%COVERAGE	%IDENTITY	DATABASE	ACCESSION	PRODUCT	RESISTANCE
${formatAmrGeneRows(stats.amrGenes, stats.amrDatabase)}
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
				},
				files: [
					{ name: 'amr_output.tab', type: 'tab', size: '1.5 KB' }
				]
			},
			'checkm': {
				output: `\x1b[36mCheckM v1.2.2\x1b[0m
[2024-01-15 11:30:00] INFO: Running CheckM lineage workflow

\x1b[36mPlacing bins in reference genome tree...\x1b[0m
  Identifying marker genes: Done
  Aligning marker genes: Done
  Placing bins in tree: Done

\x1b[36mAnalyzing bins...\x1b[0m
  Bin: assembly
  Lineage: Bacteria > Proteobacteria > Gammaproteobacteria > Enterobacterales
  Marker lineage: f__Enterobacteriaceae

\x1b[36mCalculating genome statistics...\x1b[0m
  Genome size: ${stats.quast.totalLengthGe0.toLocaleString()} bp
  # contigs: ${stats.bandage.nodes}
  N50: ${stats.n50.toLocaleString()} bp
  GC: ${stats.assemblyGC.toFixed(2)}%

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  QUALITY ASSESSMENT RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  \x1b[32mCompleteness:    ${stats.checkm.completeness.toFixed(2)}%\x1b[0m  (Near complete)
  \x1b[32mContamination:   ${stats.checkm.contamination.toFixed(2)}%\x1b[0m   (Low contamination)
  \x1b[32mStrain heterog.: ${stats.checkm.strain_heterogeneity.toFixed(2)}%\x1b[0m

  Quality tier: \x1b[1;32m${stats.checkm.quality.toUpperCase()}-QUALITY DRAFT\x1b[0m
  MIMAG standard: \x1b[32mMeets ${stats.checkm.quality.toLowerCase()}-quality criteria\x1b[0m

\x1b[33mTip: Completeness >90% and Contamination <5% indicates a high-quality genome\x1b[0m
`,
				summary: {
					'Completeness': `${stats.checkm.completeness.toFixed(2)}%`,
					'Contamination': `${stats.checkm.contamination.toFixed(2)}%`,
					'Strain Heterogeneity': `${stats.checkm.strain_heterogeneity.toFixed(2)}%`,
					'Lineage': 'f__Enterobacteriaceae',
					'Marker Genes': '104/104 found',
					'Quality': `${stats.checkm.quality.toUpperCase()}-QUALITY DRAFT`,
					'MIMAG Standard': `${stats.checkm.quality}-quality`
				},
				chartData: {
					title: 'Genome Quality Assessment',
					x: ['Completeness', 'Contamination', 'Strain Heterog.'],
					y: [stats.checkm.completeness, stats.checkm.contamination, stats.checkm.strain_heterogeneity],
					type: 'bar',
					xLabel: 'Metric',
					yLabel: 'Percentage (%)'
				},
				files: [
					{ name: 'checkm_report.tsv', type: 'tsv', size: '2.3 KB' }
				]
			},
			'checkm2': {
				output: `[01/12/2026 06:24:04 AM] INFO: Running CheckM2 version 1.1.0
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
					'Coding Density': '88.2%',
					'Quality': stats.checkm.quality.toUpperCase()
				},
				chartData: {
					title: 'CheckM2 Quality Assessment',
					x: ['Completeness', 'Contamination'],
					y: [stats.checkm.completeness, stats.checkm.contamination],
					type: 'bar',
					xLabel: 'Metric',
					yLabel: 'Percentage (%)'
				},
				files: [
					{ name: 'quality_report.tsv', type: 'tsv', size: '1.8 KB' }
				]
			},
			'confindr': {
				output: `\x1b[36mConFindr v0.8.0\x1b[0m
[2024-01-15 11:35:00] INFO: Starting contamination detection

\x1b[36mAnalyzing sample: sample_01\x1b[0m
  Database: Enterobacteriaceae rMLST
  Method: rMLST gene analysis

\x1b[36mExtracting rMLST genes...\x1b[0m
  BACT000001: Found (1 copy)
  BACT000002: Found (1 copy)
  BACT000003: Found (1 copy)
  ...
  Total rMLST genes: 53/53

\x1b[36mChecking for multiple alleles...\x1b[0m
  Genes with single allele: 53
  Genes with multiple alleles: 0

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  CONTAMINATION DETECTION RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Sample: sample_01
  \x1b[32mContamination Status: CLEAN\x1b[0m

  Evidence:
    - No multi-allelic genes detected
    - Single genus detected: Klebsiella
    - All rMLST genes present with single copies

  \x1b[32m✓ No intra-species contamination detected\x1b[0m
  \x1b[32m✓ No inter-species contamination detected\x1b[0m

\x1b[33mNote: Sample appears to be a pure isolate suitable for downstream analysis\x1b[0m
`,
				summary: {
					'Sample': 'sample_01',
					'Status': 'CLEAN (No contamination)',
					'Genus Detected': 'Klebsiella',
					'rMLST Genes': '53/53 found',
					'Multi-allelic Genes': '0',
					'Intra-species Contam.': 'Not detected',
					'Inter-species Contam.': 'Not detected'
				},
				chartData: {
					title: 'Contamination Analysis',
					x: ['rMLST Genes Found', 'Single-allele Genes', 'Multi-allele Genes'],
					y: [53, 53, 0],
					type: 'bar',
					xLabel: 'Category',
					yLabel: 'Gene Count'
				},
				files: [
					{ name: 'confindr_report.csv', type: 'csv', size: '1.1 KB' },
					{ name: 'confindr_log.txt', type: 'txt', size: '4.5 KB' }
				]
			},
			'bakta': {
				output: `\x1b[36mBakta v1.8.2\x1b[0m
[2024-01-15 11:40:00] INFO: Starting annotation

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta
  Contigs: 189
  Total length: 5,566,069 bp

\x1b[36mRunning annotation pipeline...\x1b[0m
  tRNA detection (tRNAscan-SE): 86 tRNAs found
  tmRNA detection: 1 tmRNA found
  rRNA detection (Infernal): 25 rRNAs found
  ncRNA detection: 95 ncRNAs found
  CRISPR detection: 2 CRISPR arrays found
  CDS prediction (Prodigal): 5,312 CDSs predicted

\x1b[36mFunctional annotation...\x1b[0m
  UniProt matches: 4,687 (88.2%)
  COG assignments: 4,412 (83.1%)
  KEGG orthologs: 3,356 (63.2%)
  Pfam domains: 4,207 (79.2%)

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  ANNOTATION SUMMARY\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  Features annotated: 5,521
    - CDS: 5,312
    - tRNA: 86
    - rRNA: 25
    - tmRNA: 1
    - ncRNA: 95
    - CRISPR: 2

  Hypothetical proteins: 625 (11.8%)
  Proteins with function: 4,687 (88.2%)

\x1b[33mOutput files written to: bakta_results/\x1b[0m
`,
				summary: {
					'Total Features': '5,521',
					'CDS': '5,312',
					'tRNA': '86',
					'rRNA': '25',
					'ncRNA': '95',
					'CRISPR Arrays': '2',
					'Functional Annotation': '88.2%',
					'Hypothetical': '11.8%'
				},
				chartData: {
					title: 'Genome Annotation Summary',
					x: ['CDS', 'tRNA', 'rRNA', 'ncRNA', 'Other'],
					y: [5312, 86, 25, 95, 3],
					type: 'bar',
					xLabel: 'Feature Type',
					yLabel: 'Count'
				},
				files: [
					{ name: 'sample_01.gff3', type: 'gff', size: '3.2 MB' },
					{ name: 'sample_01.gbff', type: 'gbk', size: '9.5 MB' },
					{ name: 'sample_01.faa', type: 'faa', size: '1.8 MB' },
					{ name: 'sample_01.tsv', type: 'tsv', size: '980 KB' }
				]
			},
			'mlst': {
				output: `[07:16:00] This is mlst 2.23.0 running on linux with Perl 5.026002
[07:16:00] Checking mlst dependencies:
[07:16:00] Found 'blastn' => /home/pop/miniconda3/envs/env_abricate/bin/blastn
[07:16:00] Found 'any2fasta' => /home/pop/miniconda3/envs/env_abricate/bin/any2fasta
[07:16:01] Found blastn: 2.12.0+ (002012)
[07:16:01] Excluding 3 schemes: ecoli vcholerae_2 abaumannii
${Object.entries(stats.mlst.alleles).map(([locus, num]) => `[07:16:05] Found exact allele match ${stats.mlst.scheme}.${locus}-${num}`).join('\n')}
[07:16:05] Use --quiet or -q to avoid all the message output, including these witticisms.
[07:16:05] Done.
${formatMlstRow(stats.mlst)}
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
					},
					files: [
						{ name: 'plasmid_predictions.tsv', type: 'tsv', size: '1.2 KB' },
						{ name: 'plasmid_sequences.fasta', type: 'fasta', size: `${Math.round(plasmidTotalSize / 1000)} KB` },
						{ name: 'chromosome_sequences.fasta', type: 'fasta', size: `${(chromSize / 1000000).toFixed(1)} MB` }
					]
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
  R1: sample_01_R1_paired.fq.gz
  R2: sample_01_R2_paired.fq.gz

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
						'Ti/Tv Ratio': '2.34'
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

\x1b[36mInput GFF files:\x1b[0m
  - sample_01.gff (${stats.numCDS.toLocaleString()} genes)
  - sample_02.gff (${(stats.numCDS - 25).toLocaleString()} genes)
  - sample_03.gff (${(stats.numCDS - 11).toLocaleString()} genes)
  - reference.gff (${(stats.numCDS - 34).toLocaleString()} genes)

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
					'Sequences': '4',
					'Alignment Length': '3,456,789 bp',
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
					'Input Sequences': '4',
					'Recombinant Regions': '21',
					'Bases Affected': '43,234 (1.25%)',
					'Clean Alignment': '3.41 Mb',
					'SNPs (clean)': '10,234',
					'Iterations': '3',
					'Status': 'Converged'
				},
				chartData: {
					title: 'Recombination Impact',
					x: ['Original Sites', 'Recombinant Sites', 'Clean Sites'],
					y: [3456789, 43234, 3413555],
					type: 'bar',
					xLabel: 'Category',
					yLabel: 'Base Pairs'
				},
				files: [
					{ name: 'recombination_predictions.gff', type: 'gff', size: '8.5 KB' },
					{ name: 'clean.core.aln', type: 'aln', size: '3.4 MB' },
					{ name: 'clean.final_tree.tre', type: 'nwk', size: '312 B' },
					{ name: 'clean.summary.txt', type: 'txt', size: '2.1 KB' }
				]
			},
			// New tools
			'busco': {
				output: `\x1b[36mBUSCO v5.5.0\x1b[0m
[2024-01-15 13:15:00] INFO: Starting BUSCO assessment

\x1b[36mInput:\x1b[0m
  Assembly: assembly/assembly.fasta
  Mode: genome
  Lineage: bacteria_odb10 (124 BUSCOs)

\x1b[36mRunning BUSCO pipeline...\x1b[0m
  Searching for single-copy orthologs...
  Running Augustus gene predictor...
  Classifying BUSCOs...

\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;32m  BUSCO ASSESSMENT RESULTS\x1b[0m
\x1b[1;32m═══════════════════════════════════════════════════════════\x1b[0m

  C:99.2%[S:99.2%,D:0.0%],F:0.0%,M:0.8%,n:124

  \x1b[32m123 Complete BUSCOs (99.2%)\x1b[0m
     123 Complete and single-copy
     0 Complete and duplicated
  \x1b[33m0 Fragmented BUSCOs (0.0%)\x1b[0m
  \x1b[31m1 Missing BUSCOs (0.8%)\x1b[0m
  124 Total BUSCO groups searched

\x1b[32m✓ Assembly completeness: EXCELLENT\x1b[0m
`,
				summary: {
					'Complete BUSCOs': '123 (99.2%)',
					'Single-copy': '123',
					'Duplicated': '0',
					'Fragmented': '0 (0.0%)',
					'Missing': '1 (0.8%)',
					'Total': '124',
					'Quality': 'EXCELLENT'
				},
				chartData: {
					title: 'BUSCO Assessment',
					x: ['Complete', 'Fragmented', 'Missing'],
					y: [123, 0, 1],
					type: 'bar',
					xLabel: 'Category',
					yLabel: 'BUSCOs'
				},
				files: [
					{ name: 'short_summary.specific.bacteria_odb10.txt', type: 'txt', size: '1.2 KB' },
					{ name: 'full_table.tsv', type: 'tsv', size: '12 KB' },
					{ name: 'missing_busco_list.tsv', type: 'tsv', size: '128 B' }
				]
			},
			'plasmidfinder': {
				output: `/home/pop/miniconda3/envs/env_plasmidfinder/bin/plasmidfinder.py:351: DeprecationWarning: Use shutil.which instead of find_executable
  if find_executable(method_path) is None:
{'plasmidfinder': {'results': {'Enterobacteriaceae': {'enterobacteriaceae': {'19 length=49609 depth=1.36x:47871..48018:IncFII(K)_1__CP000648:95.945946': {'HSP_length': 148,
                                                                                                                                                          'accession': 'CP000648',
                                                                                                                                                          'contig_name': '19 '
                                                                                                                                                                         'length=49609 '
                                                                                                                                                                         'depth=1.36x',
                                                                                                                                                          'coverage': 100.0,
                                                                                                                                                          'hit_id': '19 '
                                                                                                                                                                    'length=49609 '
                                                                                                                                                                    'depth=1.36x:47871..48018:IncFII(K)_1__CP000648:95.945946',
                                                                                                                                                          'identity': 95.95,
                                                                                                                                                          'note': '',
                                                                                                                                                          'plasmid': 'IncFII(K)',
                                                                                                                                                          'position_in_ref': '1..148',
                                                                                                                                                          'positions_in_contig': '47871..48018',
                                                                                                                                                          'template_length': 148},
                                                                             '22 length=34124 depth=1.41x:4640..5013:IncX3_1__JN247852:100.000000': {'HSP_length': 374,
                                                                                                                                                     'accession': 'JN247852',
                                                                                                                                                     'contig_name': '22 '
                                                                                                                                                                    'length=34124 '
                                                                                                                                                                    'depth=1.41x',
                                                                                                                                                     'coverage': 100.0,
                                                                                                                                                     'hit_id': '22 '
                                                                                                                                                               'length=34124 '
                                                                                                                                                               'depth=1.41x:4640..5013:IncX3_1__JN247852:100.000000',
                                                                                                                                                     'identity': 100.0,
                                                                                                                                                     'note': '',
                                                                                                                                                     'plasmid': 'IncX3',
                                                                                                                                                     'position_in_ref': '1..374',
                                                                                                                                                     'positions_in_contig': '4640..5013',
                                                                                                                                                     'template_length': 374},
                                                                             '23 length=26349 depth=1.32x:12470..13029:IncFIB(K)_1_Kpn3_JN233704:98.928571': {'HSP_length': 560,
                                                                                                                                                              'accession': 'JN233704',
                                                                                                                                                              'contig_name': '23 '
                                                                                                                                                                             'length=26349 '
                                                                                                                                                                             'depth=1.32x',
                                                                                                                                                              'coverage': 100.0,
                                                                                                                                                              'hit_id': '23 '
                                                                                                                                                                        'length=26349 '
                                                                                                                                                                        'depth=1.32x:12470..13029:IncFIB(K)_1_Kpn3_JN233704:98.928571',
                                                                                                                                                              'identity': 98.93,
                                                                                                                                                              'note': 'Kpn3',
                                                                                                                                                              'plasmid': 'IncFIB(K)',
                                                                                                                                                              'position_in_ref': '1..560',
                                                                                                                                                              'positions_in_contig': '12470..13029',
                                                                                                                                                              'template_length': 560},
                                                                             '35 length=4315 depth=17.66x circular=true:3913..4026:Col440I_1__CP023920.1:97.368421': {'HSP_length': 114,
                                                                                                                                                                      'accession': 'CP023920.1',
                                                                                                                                                                      'contig_name': '35 '
                                                                                                                                                                                     'length=4315 '
                                                                                                                                                                                     'depth=17.66x '
                                                                                                                                                                                     'circular=true',
                                                                                                                                                                      'coverage': 100.0,
                                                                                                                                                                      'hit_id': '35 '
                                                                                                                                                                                'length=4315 '
                                                                                                                                                                                'depth=17.66x '
                                                                                                                                                                                'circular=true:3913..4026:Col440I_1__CP023920.1:97.368421',
                                                                                                                                                                      'identity': 97.37,
                                                                                                                                                                      'note': '',
                                                                                                                                                                      'plasmid': 'Col440I',
                                                                                                                                                                      'position_in_ref': '1..114',
                                                                                                                                                                      'positions_in_contig': '3913..4026',
                                                                                                                                                                      'template_length': 114}}},
                               'Gram Positive': {'Inc18': 'No hit found',
                                                 'NT_Rep': 'No hit found',
                                                 'Rep1': 'No hit found',
                                                 'Rep2': 'No hit found',
                                                 'Rep3': 'No hit found',
                                                 'RepA_N': 'No hit found',
                                                 'RepL': 'No hit found',
                                                 'Rep_trans': 'No hit found'}},
                   'run_info': {'date': '19.01.2026', 'time': '06:51:42'},
                   'user_input': {'file_format': 'fasta',
                                  'filename(s)': ['o_unicycler/assembly.fasta'],
                                  'method': 'blast'}}}
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
				},
				files: [
					{ name: 'results_tab.tsv', type: 'tsv', size: '1.5 KB' },
					{ name: 'Hit_in_genome_seq.fsa', type: 'fasta', size: '2.3 KB' }
				]
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
					'Total Genes': '6',
					'Beta-lactams': '3 genes',
					'Aminoglycosides': '2 genes',
					'Tetracyclines': '1 gene',
					'ESBL Status': 'POSITIVE (CTX-M-15)',
					'Risk': 'CRITICAL'
				},
				chartData: {
					title: 'Resistance Gene Distribution',
					x: ['Beta-lactams', 'Aminoglycosides', 'Tetracyclines'],
					y: [3, 2, 1],
					type: 'bar',
					xLabel: 'Drug Class',
					yLabel: 'Genes Found'
				},
				files: [
					{ name: 'ResFinder_results_tab.txt', type: 'txt', size: '3.2 KB' },
					{ name: 'ResFinder_results.txt', type: 'txt', size: '8.5 KB' },
					{ name: 'pheno_table.txt', type: 'txt', size: '1.8 KB' }
				]
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
				},
				files: [
					{ name: 'results_tab.tsv', type: 'tsv', size: '2.4 KB' },
					{ name: 'Virulence_genes.fsa', type: 'fasta', size: '12 KB' }
				]
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
					'Total Reads': '245,678',
					'Total Bases': '3.57 Gb',
					'Mean Length': '14,523 bp',
					'N50': '15,234 bp',
					'Mean Quality': 'Q32.4',
					'>Q20 Reads': '99.8%'
				},
				chartData: {
					title: 'Read Length Distribution',
					x: ['<5kb', '5-10kb', '10-15kb', '15-20kb', '>20kb'],
					y: [12345, 45678, 89012, 67890, 30753],
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
					'Input Reads': '245,678',
					'Output Reads': '234,567 (95.5%)',
					'Short Filtered': '8,234',
					'Quality Filtered': '2,877',
					'Output Bases': '3.41 Gb',
					'Mean Quality': 'Q33.2'
				},
				chartData: {
					title: 'Filtering Results',
					x: ['Retained', 'Too Short', 'Low Quality'],
					y: [234567, 8234, 2877],
					type: 'bar',
					xLabel: 'Category',
					yLabel: 'Reads'
				},
				files: [
					{ name: 'sample_01_filtered.fastq.gz', type: 'fastq', size: '3.2 GB' }
				]
			},
			'flye': {
				output: `\x1b[36mFlye v2.9.2\x1b[0m
[2024-01-15 14:10:00] INFO: Starting long-read assembly

\x1b[36mInput:\x1b[0m
  Reads: filtered/sample_01_filtered.fastq.gz
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
					'Total Length': '5.23 Mb',
					'Contigs': '3',
					'N50': '4.23 Mb',
					'Largest': '4.82 Mb',
					'GC Content': '51.2%',
					'Circular': '3/3'
				},
				chartData: {
					title: 'Contig Size Distribution',
					x: ['Chromosome', 'Plasmid 1', 'Plasmid 2'],
					y: [4823456, 345678, 65433],
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
  Reads: filtered/sample_01_filtered.fastq.gz
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
					'Input Size': '5.23 Mb',
					'Output Size': '5.23 Mb',
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
  File: sample_01_nanopore.fastq.gz
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
					'Input Reads': '156,789',
					'Reads w/Adapters': '92.6%',
					'Start Trimmed': '134,567',
					'End Trimmed': '128,901',
					'Chimeras Split': '3,456',
					'Output Reads': '160,245'
				},
				chartData: {
					title: 'Adapter Locations',
					x: ['Start Only', 'End Only', 'Both Ends', 'Middle (Chimera)'],
					y: [45678, 32456, 63645, 3456],
					type: 'bar',
					xLabel: 'Adapter Location',
					yLabel: 'Read Count'
				},
				files: [
					{ name: 'sample_01_trimmed.fastq.gz', type: 'fastq', size: '1.2 GB' }
				]
			},
			'kraken2': {
				output: `\x1b[36mKraken2 v2.1.3\x1b[0m
[2024-01-15 14:15:00] INFO: Taxonomic classification

\x1b[36mInput:\x1b[0m
  File: filtered/sample_01_filtered.fastq.gz
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
					'Total Reads': '234,567',
					'Classified': '98.6%',
					'Primary Species': 'E. coli',
					'Confidence': '97.4%',
					'Contamination': '< 2%',
					'Unclassified': '1.4%'
				},
				chartData: {
					title: 'Species Distribution',
					x: ['E. coli', 'S. flexneri', 'K. pneumoniae', 'Other', 'Unclassified'],
					y: [228456, 2123, 456, 199, 3333],
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
					'Read Pairs': '245,678',
					'Pairs Written': '241,234 (98.2%)',
					'Pairs Too Short': '4,444 (1.8%)',
					'Forward Primer': '515F (99.0% matched)',
					'Reverse Primer': '806R (98.9% matched)',
					'Quality': 'PASS'
				},
				chartData: {
					title: 'Primer Trimming Results',
					x: ['Pairs Written', 'Too Short', 'No Adapter'],
					y: [241234, 4444, 1000],
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
  File: sample_01_hifi.fastq.gz
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
					'Total Reads': '456,789',
					'Unique Reads': '451,234 (98.8%)',
					'Duplicates': '5,555 (1.2%)',
					'Library Complexity': 'HIGH',
					'Status': 'PASS'
				},
				chartData: {
					title: 'Read Duplication',
					x: ['Unique Reads', 'Duplicates'],
					y: [451234, 5555],
					type: 'bar',
					xLabel: 'Category',
					yLabel: 'Read Count'
				},
				files: [
					{ name: 'sample_01_dedup.fastq.gz', type: 'fastq', size: '2.8 GB' }
				]
			},
			'ccs': {
				output: `\x1b[36mccs v6.4.0\x1b[0m
[INFO] Generating CCS (Circular Consensus Sequences)...

\x1b[36mInput:\x1b[0m
  Subreads BAM: sample_01.subreads.bam
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
					'HiFi Reads': '456,789',
					'Mean Length': '12,456 bp',
					'Mean Quality': 'Q42 (99.994%)',
					'Mean Passes': '8.3',
					'Total Yield': '5.7 Gb',
					'Status': 'EXCELLENT'
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
					{ name: 'sample_01_hifi.fastq.gz', type: 'fastq', size: '5.7 GB' }
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
					'Primary Contigs': '4',
					'Total Length': '5,523,456 bp',
					'N50': '4,892,156 bp',
					'Largest Contig': '4,892,156 bp',
					'Coverage': '45x',
					'Quality': 'EXCELLENT'
				},
				chartData: {
					title: 'Contig Size Distribution',
					x: ['Chromosome', 'Plasmid 1', 'Plasmid 2', 'Plasmid 3'],
					y: [4892156, 312456, 198765, 120079],
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
  BAM file: sample_01_nanopore.bam
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

	const terminalOptions = {
		theme: {
			background: '#1e1e1e',
			foreground: '#d4d4d4',
			cursor: '#d4d4d4',
			cursorAccent: '#1e1e1e',
			selectionBackground: '#264f78',
			black: '#1e1e1e',
			red: '#f44747',
			green: '#4ec9b0',
			yellow: '#dcdcaa',
			blue: '#569cd6',
			magenta: '#c586c0',
			cyan: '#9cdcfe',
			white: '#d4d4d4',
			brightBlack: '#808080',
			brightRed: '#f44747',
			brightGreen: '#4ec9b0',
			brightYellow: '#dcdcaa',
			brightBlue: '#569cd6',
			brightMagenta: '#c586c0',
			brightCyan: '#9cdcfe',
			brightWhite: '#ffffff'
		},
		fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
		fontSize: 14,
		lineHeight: 1.2,
		cursorBlink: true,
		cursorStyle: 'block' as const,
		scrollback: 10000
	};

	function writePrompt() {
		const dataDir = get(storylineDataDir);
		const shortDir = currentDir.replace(dataDir, '~');
		terminal.write(`\r\n\x1b[32mbiolearn\x1b[0m:\x1b[34m${shortDir}\x1b[0m$ `);
	}

	function clearLine() {
		// Clear current line
		const len = commandBuffer.length;
		for (let i = 0; i < len; i++) {
			terminal.write('\b \b');
		}
	}

	function handleInput(data: string) {
		// Handle Ctrl+C first - needs to work even during execution
		if (data === '\x03') {
			if (isExecuting) {
				// Cancel the running tool
				isExecuting = false;
			} else {
				// Not executing - show ^C and new prompt
				terminal.write('^C');
				terminal.write('\r\n');
				commandBuffer = '';
				cursorPosition = 0;
				historyIndex = -1;
				writePrompt();
			}
			return;
		}

		if (isExecuting) return;

		// Handle Enter
		if (data === '\r') {
			terminal.write('\r\n');
			if (commandBuffer.trim()) {
				// Add to history
				commandHistoryList.push(commandBuffer.trim());
				historyIndex = -1;
				savedCurrentBuffer = '';
				executeCommand(commandBuffer.trim());
			} else {
				writePrompt();
			}
			commandBuffer = '';
			cursorPosition = 0;
		}
		// Handle Backspace
		else if (data === '\x7f') {
			if (cursorPosition > 0) {
				// Delete character before cursor
				commandBuffer = commandBuffer.slice(0, cursorPosition - 1) + commandBuffer.slice(cursorPosition);
				cursorPosition--;
				// Redraw line from cursor position
				terminal.write('\b');
				terminal.write(commandBuffer.slice(cursorPosition) + ' ');
				// Move cursor back to position
				for (let i = 0; i <= commandBuffer.length - cursorPosition; i++) {
					terminal.write('\b');
				}
			}
		}
		// Handle Ctrl+L (clear screen)
		else if (data === '\x0c') {
			terminal.clear();
			writePrompt();
			terminal.write(commandBuffer);
			cursorPosition = commandBuffer.length;
		}
		// Handle Tab autocomplete
		else if (data === '\t') {
			handleTabComplete();
		}
		// Handle Arrow keys (escape sequences)
		else if (data === '\x1b[A') {
			// Arrow Up - previous command
			if (commandHistoryList.length > 0) {
				if (historyIndex === -1) {
					savedCurrentBuffer = commandBuffer;
					historyIndex = commandHistoryList.length - 1;
				} else if (historyIndex > 0) {
					historyIndex--;
				}
				clearLine();
				commandBuffer = commandHistoryList[historyIndex];
				cursorPosition = commandBuffer.length;
				terminal.write(commandBuffer);
			}
		}
		else if (data === '\x1b[B') {
			// Arrow Down - next command
			if (historyIndex !== -1) {
				if (historyIndex < commandHistoryList.length - 1) {
					historyIndex++;
					clearLine();
					commandBuffer = commandHistoryList[historyIndex];
					cursorPosition = commandBuffer.length;
					terminal.write(commandBuffer);
				} else {
					historyIndex = -1;
					clearLine();
					commandBuffer = savedCurrentBuffer;
					cursorPosition = commandBuffer.length;
					terminal.write(commandBuffer);
				}
			}
		}
		// Arrow Left - move cursor left
		else if (data === '\x1b[D') {
			if (cursorPosition > 0) {
				cursorPosition--;
				terminal.write('\x1b[D');  // Move cursor left
			}
		}
		// Arrow Right - move cursor right
		else if (data === '\x1b[C') {
			if (cursorPosition < commandBuffer.length) {
				cursorPosition++;
				terminal.write('\x1b[C');  // Move cursor right
			}
		}
		// Regular characters (handles both single chars and paste)
		else if (data >= ' ' || data.length > 1) {
			// Filter out control characters for pasted text
			const cleanData = data.split('').filter(c => c >= ' ' || c === '\t').join('');
			if (cleanData.length === 0) return;

			// Insert characters at cursor position
			commandBuffer = commandBuffer.slice(0, cursorPosition) + cleanData + commandBuffer.slice(cursorPosition);
			cursorPosition += cleanData.length;
			// Write from old cursor position to end
			terminal.write(commandBuffer.slice(cursorPosition - cleanData.length));
			// Move cursor back to correct position
			for (let i = 0; i < commandBuffer.length - cursorPosition; i++) {
				terminal.write('\b');
			}
		}
	}

	function handleTabComplete() {
		const parts = commandBuffer.split(/\s+/);
		const lastPart = parts[parts.length - 1] || '';
		const command = parts[0] || '';

		// Don't allow tab completion for non-existent commands
		const validCommands = [...allowedCommandsList, ...Array.from(bioTools)];
		if (parts.length > 1 && !validCommands.includes(command)) {
			return; // Don't tab complete for invalid commands
		}

		// Get current filesystem
		const filesystem = getFilesystem();

		// Handle subdirectory paths (e.g., trimmed/sample)
		let searchDir = currentDir;
		let searchPrefix = lastPart;
		let pathPrefix = '';

		if (lastPart.includes('/')) {
			const lastSlash = lastPart.lastIndexOf('/');
			const dirPart = lastPart.slice(0, lastSlash);
			searchPrefix = lastPart.slice(lastSlash + 1);
			pathPrefix = dirPart + '/';

			// Resolve the directory path
			if (dirPart.startsWith('/')) {
				searchDir = dirPart;
			} else {
				searchDir = `${currentDir}/${dirPart}`.replace(/\/+/g, '/');
			}
		}

		const files = filesystem[searchDir] || [];

		// Find matches
		const matches = files.filter(f => f.startsWith(searchPrefix));

		if (matches.length === 0) {
			return; // No matches
		} else if (matches.length === 1) {
			// Single match - complete it
			const completion = matches[0].slice(searchPrefix.length);
			commandBuffer += completion;
			cursorPosition += completion.length;
			terminal.write(completion);
		} else {
			// Multiple matches - show them
			terminal.write('\r\n');
			const formatted = matches.map(formatFileColor);
			terminal.writeln(formatted.join('  '));
			writePrompt();
			terminal.write(commandBuffer);
			cursorPosition = commandBuffer.length;

			// Find common prefix
			const commonPrefix = findCommonPrefix(matches);
			if (commonPrefix.length > searchPrefix.length) {
				const completion = commonPrefix.slice(searchPrefix.length);
				commandBuffer += completion;
				cursorPosition += completion.length;
				terminal.write(completion);
			}
		}
	}

	function findCommonPrefix(strings: string[]): string {
		if (strings.length === 0) return '';
		let prefix = strings[0];
		for (let i = 1; i < strings.length; i++) {
			while (!strings[i].startsWith(prefix)) {
				prefix = prefix.slice(0, -1);
			}
		}
		return prefix;
	}

	// Valid files for each tool - must match exactly
	const validToolFiles: Record<string, string[]> = {
		'fastqc': [
			// Trial/Demo scenario
			'SRR36708862_1.fastq.gz', 'SRR36708862_2.fastq.gz',
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
			'SRR36708862_1.fastq.gz', 'SRR36708862_2.fastq.gz',
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
			'SRR36708862_1.fastq.gz', 'SRR36708862_2.fastq.gz',
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
	const toolRequirements: Record<string, { dirs: string[] }> = {
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
	function isValidFileForTool(tool: string, filename: string): boolean {
		const validFiles = validToolFiles[tool];
		if (!validFiles) return true;
		return validFiles.some(f => f === filename || f.endsWith(filename) || filename.endsWith(f.split('/').pop() || ''));
	}

	// Expand glob patterns (like *.fastq.gz or sequences/*.fastq) based on directory files
	function expandGlobPattern(pattern: string): string[] {
		// If not a glob pattern, return as-is
		if (!pattern.includes('*') && !pattern.includes('?')) {
			return [pattern];
		}

		// Determine target directory and file pattern
		let targetDir: string;
		let filePattern: string;
		let dirPrefix: string = '';

		if (pattern.includes('/')) {
			// Pattern has directory component: "sequences/*.fastq"
			const lastSlash = pattern.lastIndexOf('/');
			const dirPart = pattern.substring(0, lastSlash);
			filePattern = pattern.substring(lastSlash + 1);
			dirPrefix = dirPart + '/';
			targetDir = dirPart.startsWith('/')
				? dirPart
				: `${currentDir}/${dirPart}`.replace(/\/+/g, '/');
		} else {
			// Just a pattern in current directory: "*.fastq"
			targetDir = currentDir;
			filePattern = pattern;
		}

		// Get files in target directory
		const dirFiles = getFilesForDirectory(targetDir);

		// Convert glob pattern to regex
		const regexPattern = filePattern
			.replace(/\./g, '\\.')
			.replace(/\*/g, '.*')
			.replace(/\?/g, '.');
		const regex = new RegExp(`^${regexPattern}$`);

		// Filter matching files (exclude directories)
		const matches = dirFiles
			.filter(f => !f.endsWith('/'))
			.filter(f => regex.test(f))
			.map(f => dirPrefix + f);

		return matches.length > 0 ? matches : [pattern]; // Return original if no matches
	}

	// Get files for a directory (combines base and tool outputs)
	function getFilesForDirectory(dir: string): string[] {
		const files: string[] = [];

		// Add base filesystem files
		if (baseFilesystem[dir]) {
			files.push(...baseFilesystem[dir]);
		}

		// Add template filesystem files (override if present)
		if (templateFilesystem[dir]) {
			files.push(...templateFilesystem[dir]);
		}

		// Add tool-created files
		const execCmds = get(executedCommands);
		for (const [tool, outputs] of Object.entries(toolCreatedFiles)) {
			if (outputs[dir]) {
				// Skip tool outputs if template filesystem already defines this path
				if (templateFilesystem[dir]) {
					continue;
				}
				// Check if tool was executed
				if (execCmds.includes(tool)) {
					files.push(...outputs[dir]);
				}
			}
		}

		const executed = new Set(execCmds);
		const filtered = files.filter(file => {
			const match = file.match(/^o_([^/.]+)(?:[/.]|$)/);
			const tool = match ? match[1] : null;
			if (!tool) return true;
			return executed.has(tool);
		});

		return [...new Set(files)]; // Remove duplicates
	}

	async function executeCommand(cmd: string) {
		const parts = cmd.trim().split(/\s+/);
		const command = parts[0];
		const args = parts.slice(1);

		// Check for blocked commands (including less/more)
		if (blockedCommands.has(command) || command === 'less' || command === 'more') {
			if (command === 'less' || command === 'more') {
				terminal.writeln(`\x1b[31mbash: ${command}: command not available\x1b[0m`);
				terminal.writeln(`\x1b[90mUse 'head' or 'cat' to view files instead.\x1b[0m`);
			} else {
				terminal.writeln(`\x1b[31mbash: ${command}: Operation not permitted\x1b[0m`);
				terminal.writeln(`\x1b[90mThis is a learning environment. Modifying files is disabled.\x1b[0m`);
			}
			writePrompt();
			return;
		}

		// Handle built-in commands
		if (command === 'help') {
			showHelp();
			writePrompt();
			return;
		}

		if (command === 'clear') {
			terminal.clear();
			writePrompt();
			return;
		}

		if (command === 'pwd') {
			terminal.writeln(currentDir);
			executedCommands.update(cmds => {
				if (!cmds.includes('pwd')) return [...cmds, 'pwd'];
				return cmds;
			});
			writePrompt();
			return;
		}

		if (command === 'ls') {
			handleLs(args);
			// Track both count (ls:1, ls:2 for multi-line commands) and full command
			// (ls sequences/*.fastq for specific step matching)
			const fullCmd = cmd.trim();
			executedCommands.update(cmds => {
				const lsCount = cmds.filter(c => c.startsWith('ls:')).length;
				const newCmds = [...cmds, `ls:${lsCount + 1}`];
				// Also track full command if not already present
				if (!newCmds.includes(fullCmd)) {
					newCmds.push(fullCmd);
				}
				return newCmds;
			});
			writePrompt();
			return;
		}

		if (command === 'cd') {
			handleCd(args);
			// Track the specific cd command (e.g., 'cd sequences', 'cd ..', 'cd ~')
			// to ensure each cd step in tutorials is tracked separately
			// Normalize path by removing trailing slash so 'cd sequences/' matches 'cd sequences'
			const cdCmd = args.length > 0 ? `cd ${args[0].replace(/\/$/, '')}` : 'cd';
			executedCommands.update(cmds => {
				if (!cmds.includes(cdCmd)) return [...cmds, cdCmd];
				return cmds;
			});
			writePrompt();
			return;
		}

		// Handle heredoc syntax for creating R Markdown files: cat > file.Rmd << 'EOF'
		if (command === 'cat' && cmd.includes('>') && cmd.includes("<<")) {
			// This is a heredoc command for creating a file - simulate success
			const fileMatch = cmd.match(/>\s*(\S+\.Rmd)/);
			if (fileMatch) {
				const fileName = fileMatch[1];
				terminal.writeln(`\x1b[32m✓ Created ${fileName}\x1b[0m`);
				terminal.writeln(`\x1b[90mR Markdown document ready for compilation\x1b[0m`);
				// Add 'cat' to executed commands so the step gets marked complete
				executedCommands.update(cmds => [...cmds, 'cat']);
				// Also mark Rscript as executed for file creation tracking
				executedCommands.update(cmds => [...cmds, 'Rscript']);
				writePrompt();
				return;
			}
		}

		if (command === 'cat' || command === 'head' || command === 'tail') {
			// Check for output redirection
			const hasAppendRedirect = cmd.includes('>>');
			const hasOverwriteRedirect = !hasAppendRedirect && cmd.includes('>');
			const hasRedirect = hasAppendRedirect || hasOverwriteRedirect;

			if (hasRedirect) {
				// Parse the command to extract output file
				const redirectOp = hasAppendRedirect ? '>>' : '>';
				const redirectParts = cmd.split(redirectOp);
				if (redirectParts.length >= 2) {
					const outputFile = redirectParts[1].trim().split(/\s+/)[0];

					// Extract input args (before the redirect)
					const inputPart = redirectParts[0];
					const inputArgs = inputPart.trim().split(/\s+/).slice(1); // Remove command name

					// Check if input file exists
					let inputFilename: string | undefined;
					let numLines = 10; // default for head/tail
					for (let i = 0; i < inputArgs.length; i++) {
						if (inputArgs[i] === '-n' && i + 1 < inputArgs.length) {
							numLines = parseInt(inputArgs[i + 1], 10) || 10;
							i++; // skip the number
						} else if (inputArgs[i].startsWith('-n')) {
							numLines = parseInt(inputArgs[i].substring(2), 10) || 10;
						} else if (!inputArgs[i].startsWith('-')) {
							inputFilename = inputArgs[i];
						}
					}

					if (inputFilename) {
						const filesystem = getFilesystem();

						// Resolve input path
						let inputDirPath: string;
						let inputBaseName: string;
						let inputFullPath: string;

						if (inputFilename.includes('/')) {
							const parts = inputFilename.split('/');
							inputBaseName = parts.pop() || '';
							const relativeDirPath = parts.join('/');
							inputDirPath = relativeDirPath.startsWith('/')
								? relativeDirPath
								: `${currentDir}/${relativeDirPath}`.replace(/\/+/g, '/');
							inputFullPath = `${inputDirPath}/${inputBaseName}`;
						} else {
							inputBaseName = inputFilename;
							inputDirPath = currentDir;
							inputFullPath = `${currentDir}/${inputFilename}`;
						}

						const filesInDir = filesystem[inputDirPath] || [];
						const fileExists = filesInDir.some(f => f === inputBaseName);

						if (!fileExists) {
							terminal.writeln(`\x1b[31m${command}: ${inputFilename}: No such file or directory\x1b[0m`);
							writePrompt();
							return;
						}

						// Resolve output path
						let outputPath: string;
						if (outputFile.includes('/')) {
							const parts = outputFile.split('/');
							const outputName = parts.pop() || '';
							const outputDirRel = parts.join('/');
							const outputDirPath = outputDirRel.startsWith('/')
								? outputDirRel
								: `${currentDir}/${outputDirRel}`.replace(/\/+/g, '/');
							outputPath = `${outputDirPath}/${outputName}`;

							// Check if output directory exists
							if (!filesystem[outputDirPath] && !createdDirs.has(outputDirPath)) {
								terminal.writeln(`\x1b[31m${command}: ${outputFile}: No such file or directory\x1b[0m`);
								writePrompt();
								return;
							}
						} else {
							outputPath = `${currentDir}/${outputFile}`;
						}

						// Fetch source content from template API (async)
						const dataDir = get(storylineDataDir);
						const pathParts = inputFullPath.replace(dataDir, '').split('/').filter(p => p);
						const relativePath = pathParts.join('/');

						let fetchPromise: Promise<string | null>;
						if (pathParts.length >= 2 && pathParts[0].startsWith('o_')) {
							const tool = pathParts[0];
							fetchPromise = fetchFileContent(tool, inputBaseName);
						} else {
							fetchPromise = fetchRootFileContent(relativePath);
						}

						fetchPromise.then(sourceContent => {
							if (sourceContent) {
								// Apply head/tail logic
								const lines = sourceContent.split('\n');
								let outputLines: string[];
								if (command === 'head') {
									outputLines = lines.slice(0, numLines);
								} else if (command === 'tail') {
									outputLines = lines.slice(-numLines);
								} else {
									outputLines = lines;
								}
								const outputContent = outputLines.join('\n');

								// Handle append (>>) vs overwrite (>)
								if (hasAppendRedirect && createdFiles[outputPath]) {
									createdFiles[outputPath] = createdFiles[outputPath] + '\n' + outputContent;
								} else {
									createdFiles[outputPath] = outputContent;
								}
								terminal.writeln(`\x1b[32m✓ Output saved to ${outputFile}\x1b[0m`);
							} else {
								terminal.writeln(`\x1b[31m${command}: ${inputFilename}: Unable to read file\x1b[0m`);
							}

							// Track command and write prompt
							const fullCmd = cmd.trim();
							executedCommands.update(cmds => {
								if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
								return cmds;
							});
							writePrompt();
						});
						return;
					}
				}
			} else {
				// Track the full command for step completion (e.g., 'cat sample_info.txt', 'head -n 8 file.txt')
				const fullCmd = cmd.trim();
				executedCommands.update(cmds => {
					if (!cmds.includes(fullCmd)) {
						return [...cmds, fullCmd];
					}
					return cmds;
				});
				// Handle async file view and write prompt after
				handleFileView(command, args).then(() => writePrompt());
				return;
			}

			// Track the full command for step completion
			const fullCmd = cmd.trim();
			executedCommands.update(cmds => {
				if (!cmds.includes(fullCmd)) {
					return [...cmds, fullCmd];
				}
				return cmds;
			});
			writePrompt();
			return;
		}

		// Handle wc (word count) command
		if (command === 'wc') {
			handleWc(args, cmd);
			// Track the full command (e.g., 'wc -l sequences/sample_R1.fastq', 'wc sample_info.txt')
			// to ensure each wc step in tutorials is tracked separately
			const fullCmd = cmd.trim();
			executedCommands.update(cmds => {
				if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
				return cmds;
			});
			writePrompt();
			return;
		}

		// Handle mkdir command
		if (command === 'mkdir') {
			handleMkdir(args);
			// Track the full command (e.g., 'mkdir results', 'mkdir -p results/qc/fastqc')
			// to ensure each mkdir step in tutorials is tracked separately
			const fullCmd = cmd.trim();
			executedCommands.update(cmds => {
				if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
				return cmds;
			});
			writePrompt();
			return;
		}

		// Handle cp command
		if (command === 'cp') {
			handleCp(args);
			// Track the full command (e.g., 'cp /data/references/sample_info.txt .')
			// to ensure each cp step in tutorials is tracked separately
			const fullCmd = cmd.trim();
			executedCommands.update(cmds => {
				if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
				return cmds;
			});
			writePrompt();
			return;
		}

		// Handle grep command
		if (command === 'grep') {
			handleGrep(args, cmd);
			// Track the full command (e.g., 'grep "FFFFF" file.txt', 'grep -c "@" file.txt')
			// to ensure each grep step in tutorials is tracked separately
			const fullCmd = cmd.trim();
			executedCommands.update(cmds => {
				if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
				return cmds;
			});
			writePrompt();
			return;
		}

		// Handle bioinformatics tools - require proper arguments and correct directory/files
		if (bioTools.has(command)) {
			// Handle --help flag for any bio tool
			if (args.includes('--help') || args.includes('-h')) {
				handleBioToolHelp(command, args);
				writePrompt();
				return;
			}

			const req = toolRequirements[command];
			const dataDir = get(storylineDataDir);

			// Check directory requirement
			if (req && !req.dirs.includes(currentDir)) {
				const shortDirs = req.dirs.map(d => d.replace(dataDir, '~')).join(' or ');
				terminal.writeln(`\x1b[31mError: ${command} must be run from ${shortDirs}\x1b[0m`);
				terminal.writeln(`\x1b[90mCurrent directory: ${currentDir.replace(dataDir, '~')}\x1b[0m`);
				terminal.writeln(`\x1b[90mUse 'cd' to navigate to the correct directory first.\x1b[0m`);
				writePrompt();
				return;
			}

			// Check command has proper arguments
			// Phase 1: QC and Read Processing
			if (command === 'seqkit') {
				// seqkit stats sample_01_R1.fastq.gz sample_01_R2.fastq.gz
				if (!args.includes('stats')) {
					terminal.writeln(`\x1b[31mError: Missing subcommand\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: seqkit stats <file1.fastq.gz> <file2.fastq.gz>\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: seqkit stats *.fastq.gz (supports wildcards)\x1b[0m`);
					writePrompt();
					return;
				}

				// STRICT MODE: Trial scenario requires output redirection
				if (currentDir === '/data/kpneumoniae_demo') {
					const hasRedirect = args.includes('>');
					const outputFile = hasRedirect ? args[args.indexOf('>') + 1] : null;
					const hasCorrectOutput = outputFile === 'o_seqkit_stats.txt';

					// Output redirection is required - this teaches real-world practice
					if (!hasRedirect || !hasCorrectOutput) {
						terminal.writeln(`\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
						terminal.writeln(`\x1b[33m⚠  Tutorial Mode: Output file required\x1b[0m`);
						terminal.writeln(`\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
						terminal.writeln(``);
						terminal.writeln(`\x1b[90mIn real bioinformatics workflows, saving output to files is\x1b[0m`);
						terminal.writeln(`\x1b[90messential for documentation and downstream analysis.\x1b[0m`);
						terminal.writeln(``);
						terminal.writeln(`\x1b[36mPlease redirect output to a file:\x1b[0m`);
						terminal.writeln(`\x1b[32m  seqkit stats *.fastq.gz > o_seqkit_stats.txt\x1b[0m`);
						terminal.writeln(`\x1b[90m  or\x1b[0m`);
						terminal.writeln(`\x1b[32m  seqkit stats SRR36708862_1.fastq.gz SRR36708862_2.fastq.gz > o_seqkit_stats.txt\x1b[0m`);
						writePrompt();
						return;
					}
				}

				// Get raw input patterns (may include wildcards)
				const inputPatterns = args.filter(a => a.endsWith('.fastq.gz') || a.includes('*'));

				// Expand glob patterns
				let inputFiles: string[] = [];
				for (const pattern of inputPatterns) {
					const expanded = expandGlobPattern(pattern);
					inputFiles.push(...expanded);
				}

				// Filter to only .fastq.gz files
				inputFiles = inputFiles.filter(f => f.endsWith('.fastq.gz'));

				if (inputFiles.length === 0) {
					const availableFiles = getFilesForDirectory(currentDir).filter(f => f.endsWith('.fastq.gz'));
					terminal.writeln(`\x1b[31mError: Missing input FASTQ files\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: seqkit stats <file1.fastq.gz> <file2.fastq.gz>\x1b[0m`);
					if (availableFiles.length > 0) {
						terminal.writeln(`\x1b[90mAvailable files: ${availableFiles.slice(0, 4).join(', ')}${availableFiles.length > 4 ? '...' : ''}\x1b[0m`);
						terminal.writeln(`\x1b[90mTip: Use 'seqkit stats *.fastq.gz' to process all FASTQ files\x1b[0m`);
					}
					writePrompt();
					return;
				}

				// Validate input files
				for (const f of inputFiles) {
					if (!isValidFileForTool('seqkit', f)) {
						const availableFiles = getFilesForDirectory(currentDir).filter(f => f.endsWith('.fastq.gz'));
						terminal.writeln(`\x1b[31mError: '${f}' is not a valid input for seqkit\x1b[0m`);
						if (availableFiles.length > 0) {
							terminal.writeln(`\x1b[90mAvailable files: ${availableFiles.slice(0, 4).join(', ')}${availableFiles.length > 4 ? '...' : ''}\x1b[0m`);
						}
						writePrompt();
						return;
					}
				}
			}

			if (command === 'fastqc') {
				// Get raw input patterns (may include wildcards)
				const inputPatterns = args.filter(a => a.endsWith('.fastq.gz') || (a.includes('*') && !a.startsWith('-')));

				// Expand glob patterns
				let inputFiles: string[] = [];
				for (const pattern of inputPatterns) {
					const expanded = expandGlobPattern(pattern);
					inputFiles.push(...expanded);
				}

				// Filter to only .fastq.gz files
				inputFiles = inputFiles.filter(f => f.endsWith('.fastq.gz'));

				if (inputFiles.length === 0) {
					const availableFiles = getFilesForDirectory(currentDir).filter(f => f.endsWith('.fastq.gz'));
					terminal.writeln(`\x1b[31mError: Missing input file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: fastqc <input.fastq.gz> -o <output_dir>\x1b[0m`);
					if (availableFiles.length > 0) {
						terminal.writeln(`\x1b[90mAvailable files: ${availableFiles.slice(0, 4).join(', ')}${availableFiles.length > 4 ? '...' : ''}\x1b[0m`);
						terminal.writeln(`\x1b[90mTip: Use 'fastqc *.fastq.gz -o o_fastqc/' to process all files\x1b[0m`);
					}
					writePrompt();
					return;
				}

				// Validate input files
				for (const f of inputFiles) {
					if (!isValidFileForTool('fastqc', f)) {
						const availableFiles = getFilesForDirectory(currentDir).filter(f => f.endsWith('.fastq.gz'));
						terminal.writeln(`\x1b[31mError: '${f}' is not a valid input for fastqc\x1b[0m`);
						if (availableFiles.length > 0) {
							terminal.writeln(`\x1b[90mAvailable files: ${availableFiles.slice(0, 4).join(', ')}${availableFiles.length > 4 ? '...' : ''}\x1b[0m`);
						}
						writePrompt();
						return;
					}
				}

				// Check for -o flag with output directory
				const oIndex = args.indexOf('-o');
				if (oIndex === -1 || !args[oIndex + 1]) {
					terminal.writeln(`\x1b[31mError: Missing output directory\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: fastqc <input.fastq.gz> -o <output_dir>\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: fastqc *.fastq.gz -o o_fastqc/\x1b[0m`);
					writePrompt();
					return;
				}
				// Check for exact folder name
				const outputDir = args[oIndex + 1].replace(/\/$/, ''); // Remove trailing slash
				if (outputDir !== 'o_fastqc') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIndex + 1]}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use the exact folder name: o_fastqc\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: fastqc *.fastq.gz -o o_fastqc/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'trimmomatic') {
				const expectedCmd = 'trimmomatic PE -threads 2 -phred33 SRR36708862_1.fastq.gz SRR36708862_2.fastq.gz o_trimmomatic/SRR36708862_R1_paired.fq.gz o_trimmomatic/SRR36708862_R1_unpaired.fq.gz o_trimmomatic/SRR36708862_R2_paired.fq.gz o_trimmomatic/SRR36708862_R2_unpaired.fq.gz ILLUMINACLIP:TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36';
				if (args.length < 5) {
					terminal.writeln(`\x1b[31mError: Incomplete command\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: trimmomatic PE -phred33 <R1.fq.gz> <R2.fq.gz> <outputs...> ILLUMINACLIP:... SLIDINGWINDOW:... MINLEN:...\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				// Check PE mode
				if (!args.includes('PE')) {
					terminal.writeln(`\x1b[31mError: Missing 'PE' mode for paired-end reads\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -phred33
				if (!args.includes('-phred33')) {
					terminal.writeln(`\x1b[31mError: Missing '-phred33' quality encoding\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				// Check output files are in trimmed/ folder
				const outputFiles = args.filter(a => a.includes('_paired.fq.gz') || a.includes('_unpaired.fq.gz'));
				if (outputFiles.length === 0) {
					terminal.writeln(`\x1b[31mError: Missing output files\x1b[0m`);
					terminal.writeln(`\x1b[90mOutput files should be: o_trimmomatic/sample_01_R1_paired.fq.gz, o_trimmomatic/sample_01_R1_unpaired.fq.gz, etc.\x1b[0m`);
					writePrompt();
					return;
				}
				const invalidOutput = outputFiles.find(f => !f.startsWith('o_trimmomatic/'));
				if (invalidOutput) {
					terminal.writeln(`\x1b[31mError: Invalid output path '${invalidOutput}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, output files must be in the 'o_trimmomatic/' folder\x1b[0m`);
					writePrompt();
					return;
				}
				// Check ILLUMINACLIP
				const hasIlluminaclip = args.some(a => a.startsWith('ILLUMINACLIP:'));
				if (!hasIlluminaclip) {
					terminal.writeln(`\x1b[31mError: Missing ILLUMINACLIP adapter trimming parameter\x1b[0m`);
					terminal.writeln(`\x1b[90mRequired: ILLUMINACLIP:TruSeq3-PE.fa:2:30:10\x1b[0m`);
					writePrompt();
					return;
				}
				// Check SLIDINGWINDOW
				const hasSlidingwindow = args.some(a => a.startsWith('SLIDINGWINDOW:'));
				if (!hasSlidingwindow) {
					terminal.writeln(`\x1b[31mError: Missing SLIDINGWINDOW quality trimming parameter\x1b[0m`);
					terminal.writeln(`\x1b[90mRequired: SLIDINGWINDOW:4:15\x1b[0m`);
					writePrompt();
					return;
				}
				// Check MINLEN
				const hasMinlen = args.some(a => a.startsWith('MINLEN:'));
				if (!hasMinlen) {
					terminal.writeln(`\x1b[31mError: Missing MINLEN minimum length parameter\x1b[0m`);
					terminal.writeln(`\x1b[90mRequired: MINLEN:36\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'unicycler') {
				if (!args.includes('-1') || !args.includes('-2')) {
					terminal.writeln(`\x1b[31mUsage: unicycler -1 <R1_paired.fq.gz> -2 <R2_paired.fq.gz> -o <output_dir>\x1b[0m`);
					terminal.writeln(`\x1b[90mThis tool requires paired-end trimmed reads from the o_trimmomatic/ folder.\x1b[0m`);
					writePrompt();
					return;
				}
				// Check that input files are trimmed paired files
				const r1Idx = args.indexOf('-1');
				const r2Idx = args.indexOf('-2');
				const r1File = args[r1Idx + 1];
				const r2File = args[r2Idx + 1];
				// Check files are valid for unicycler
				if (!r1File || !isValidFileForTool('unicycler', r1File)) {
					terminal.writeln(`\x1b[31mError: '${r1File || 'missing'}' is not a valid input for unicycler\x1b[0m`);
					terminal.writeln(`\x1b[90mUnicycler requires: o_trimmomatic/SRR36708862_R1_paired.fq.gz\x1b[0m`);
					writePrompt();
					return;
				}
				if (!r2File || !isValidFileForTool('unicycler', r2File)) {
					terminal.writeln(`\x1b[31mError: '${r2File || 'missing'}' is not a valid input for unicycler\x1b[0m`);
					terminal.writeln(`\x1b[90mUnicycler requires: o_trimmomatic/SRR36708862_R2_paired.fq.gz\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -o flag
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: unicycler -1 <R1_paired.fq.gz> -2 <R2_paired.fq.gz> -o <output_dir>\x1b[0m`);
					writePrompt();
					return;
				}
				// Enforce exact output directory name
				const oIdx = args.indexOf('-o');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'o_unicycler') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use the exact folder name: o_unicycler\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: unicycler -1 o_trimmomatic/SRR36708862_R1_paired.fq.gz -2 o_trimmomatic/SRR36708862_R2_paired.fq.gz -o o_unicycler/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'bandage') {
				if (!args.includes('image')) {
					terminal.writeln(`\x1b[31mUsage: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
					writePrompt();
					return;
				}
				// Check GFA file
				const gfaFile = args.find(a => a.endsWith('.gfa'));
				if (!gfaFile) {
					terminal.writeln(`\x1b[31mError: Missing .gfa file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('bandage', gfaFile)) {
					terminal.writeln(`\x1b[31mError: '${gfaFile}' is not a valid input for bandage\x1b[0m`);
					terminal.writeln(`\x1b[90mBandage requires: o_unicycler/assembly.gfa (from unicycler output)\x1b[0m`);
					writePrompt();
					return;
				}
				// Check PNG output
				const pngFile = args.find(a => a.endsWith('.png'));
				if (!pngFile) {
					terminal.writeln(`\x1b[31mError: Missing output .png file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
					writePrompt();
					return;
				}
				// Enforce exact output file name
				if (pngFile !== 'o_bandage.png') {
					terminal.writeln(`\x1b[31mError: Invalid output file name '${pngFile}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: o_bandage.png\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'quast') {
				// quast o_unicycler/assembly.fasta -o o_quast/
				const inputFile = args.find(a => a.endsWith('.fasta'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: quast o_unicycler/assembly.fasta -o o_quast/\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: quast o_unicycler/assembly.fasta -o o_quast/\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('quast', inputFile)) {
					terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for quast\x1b[0m`);
					terminal.writeln(`\x1b[90mQuast requires: o_unicycler/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -o output directory
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: -o o_quast/\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.indexOf('-o');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'o_quast') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: o_quast/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'prokka') {
				// prokka --outdir o_prokka --prefix PROKKA o_unicycler/assembly.fasta
				const expectedCmd = 'prokka --outdir o_prokka --prefix PROKKA o_unicycler/assembly.fasta';
				const inputFile = args.find(a => a.endsWith('.fasta'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('prokka', inputFile)) {
					terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for prokka\x1b[0m`);
					terminal.writeln(`\x1b[90mProkka requires: o_unicycler/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				// Check output directory
				if (!args.includes('--outdir')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (--outdir flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: --outdir o_prokka\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.indexOf('--outdir');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'o_prokka') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: --outdir o_prokka\x1b[0m`);
					writePrompt();
					return;
				}
				// Check prefix
				if (!args.includes('--prefix')) {
					terminal.writeln(`\x1b[31mError: Missing output file prefix (--prefix flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: --prefix PROKKA\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'abricate') {
				// abricate --db ncbi o_unicycler/assembly.fasta -o o_abricate/
				const expectedCmd = 'abricate --db ncbi o_unicycler/assembly.fasta -o o_abricate/';
				const inputFile = args.find(a => a.endsWith('.fasta'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('abricate', inputFile)) {
					terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for abricate\x1b[0m`);
					terminal.writeln(`\x1b[90mABRicate requires: o_unicycler/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				// Check database
				if (!args.includes('--db')) {
					terminal.writeln(`\x1b[31mError: Missing database (--db flag)\x1b[0m`);
					terminal.writeln(`\x1b[90mAvailable databases: ncbi, card, resfinder, vfdb\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				// Check output
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -o o_abricate/\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.indexOf('-o');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'o_abricate') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: o_abricate/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'checkm') {
				// checkm lineage_wf assembly/ checkm_results/ -x fasta
				const expectedCmd = 'checkm lineage_wf assembly/ checkm_results/ -x fasta';
				if (!args.includes('lineage_wf')) {
					terminal.writeln(`\x1b[31mError: Missing 'lineage_wf' workflow command\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				// Check input directory
				const inputDir = args.find(a => a === 'assembly/' || a === 'assembly');
				if (!inputDir) {
					terminal.writeln(`\x1b[31mError: Missing input assembly directory\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				// Check output directory
				const outDir = args.find(a => a.includes('checkm'));
				if (!outDir) {
					terminal.writeln(`\x1b[31mError: Missing output directory\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: checkm_results/\x1b[0m`);
					writePrompt();
					return;
				}
				if (outDir !== 'checkm_results/' && outDir !== 'checkm_results') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${outDir}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: checkm_results/\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -x fasta extension flag
				if (!args.includes('-x')) {
					terminal.writeln(`\x1b[31mError: Missing file extension flag (-x)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -x fasta\x1b[0m`);
					writePrompt();
					return;
				}
				const xIdx = args.indexOf('-x');
				const ext = args[xIdx + 1];
				if (ext !== 'fasta') {
					terminal.writeln(`\x1b[31mError: Invalid extension '${ext || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: -x fasta\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'checkm2') {
				// checkm2 predict --input o_unicycler/ --output-directory o_checkm2/ -x fasta
				const expectedCmd = 'checkm2 predict --input o_unicycler/ --output-directory o_checkm2/ -x fasta';
				if (!args.includes('predict')) {
					terminal.writeln(`\x1b[31mError: Missing 'predict' workflow command\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				// Check input directory
				if (!args.includes('--input')) {
					terminal.writeln(`\x1b[31mError: Missing input directory (--input flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const inputIdx = args.indexOf('--input');
				const inputDir = args[inputIdx + 1]?.replace(/\/$/, '');
				if (!inputDir || !isValidFileForTool('checkm2', inputDir + '/')) {
					terminal.writeln(`\x1b[31mError: Invalid or missing input directory\x1b[0m`);
					terminal.writeln(`\x1b[90mCheckM2 requires: --input o_unicycler/\x1b[0m`);
					writePrompt();
					return;
				}
				// Check output directory
				if (!args.includes('--output-directory')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (--output-directory flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: --output-directory o_checkm2/\x1b[0m`);
					writePrompt();
					return;
				}
				const outIdx = args.indexOf('--output-directory');
				const outDir = args[outIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'o_checkm2') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[outIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: --output-directory o_checkm2/\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -x fasta extension flag
				if (!args.includes('-x')) {
					terminal.writeln(`\x1b[31mError: Missing file extension flag (-x)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -x fasta\x1b[0m`);
					writePrompt();
					return;
				}
				const xIdx = args.indexOf('-x');
				const ext = args[xIdx + 1];
				if (ext !== 'fasta') {
					terminal.writeln(`\x1b[31mError: Invalid extension '${ext || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: -x fasta\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'confindr') {
				// ConFindr: confindr -i assembly/assembly.fasta -o confindr_results/
				if (!args.includes('-i')) {
					terminal.writeln(`\x1b[31mUsage: confindr -i assembly/assembly.fasta -o confindr_results/\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: confindr -i assembly/assembly.fasta -o confindr_results/\x1b[0m`);
					writePrompt();
					return;
				}
				// Check input file
				const iIdx = args.indexOf('-i');
				const inputFile = args[iIdx + 1];
				if (!inputFile || !isValidFileForTool('confindr', inputFile)) {
					terminal.writeln(`\x1b[31mError: Invalid or missing input file\x1b[0m`);
					terminal.writeln(`\x1b[90mConFindr requires: assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				// Check output directory
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: -o confindr_results/\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.indexOf('-o');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'confindr_results') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: confindr_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'bakta') {
				// Bakta: bakta assembly/assembly.fasta --output bakta_results/
				const inputFile = args.find(a => a.endsWith('.fasta'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: bakta assembly/assembly.fasta --output bakta_results/\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: bakta assembly/assembly.fasta --output bakta_results/\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('bakta', inputFile)) {
					terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for bakta\x1b[0m`);
					terminal.writeln(`\x1b[90mBakta requires: assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				// Check output directory
				if (!args.includes('--output') && !args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (--output flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: --output bakta_results/\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.includes('--output') ? args.indexOf('--output') : args.indexOf('-o');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'bakta_results') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: bakta_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'mlst') {
				// mlst outputs to stdout, use redirect: mlst input.fasta > o_mlst/mlst_result.tab
				const expectedCmd = 'mlst o_unicycler/assembly.fasta > o_mlst/mlst_result.tab';
				const inputFile = args.find(a => a.endsWith('.fasta'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('mlst', inputFile)) {
					terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for mlst\x1b[0m`);
					terminal.writeln(`\x1b[90mMLST requires: o_unicycler/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				// Check output redirection - mlst outputs to stdout
				const redirectIdx = args.indexOf('>');
				if (redirectIdx === -1) {
					terminal.writeln(`\x1b[31mError: Missing output redirect (>)\x1b[0m`);
					terminal.writeln(`\x1b[33mMLST outputs to stdout. Use: > o_mlst/mlst_result.tab\x1b[0m`);
					writePrompt();
					return;
				}
				const outPath = args[redirectIdx + 1];
				if (!outPath || !outPath.startsWith('o_mlst/')) {
					terminal.writeln(`\x1b[31mError: Invalid output path '${outPath || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: > o_mlst/mlst_result.tab\x1b[0m`);
					writePrompt();
					return;
				}
			}

			// Phase 3: Plasmid Analysis
			if (command === 'mob_recon') {
				// mob_recon -i assembly/assembly.fasta -o mob_recon_results/
				const expectedCmd = 'mob_recon -i assembly/assembly.fasta -o mob_recon_results/';
				// Check -i flag
				if (!args.includes('-i')) {
					terminal.writeln(`\x1b[31mError: Missing input file flag (-i)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const iIdx = args.indexOf('-i');
				const inputFile = args[iIdx + 1];
				if (!inputFile || !inputFile.endsWith('.fasta')) {
					terminal.writeln(`\x1b[31mError: Missing or invalid input file after -i flag\x1b[0m`);
					terminal.writeln(`\x1b[90mMOB-suite requires: -i assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('mob_recon', inputFile)) {
					terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for mob_recon\x1b[0m`);
					terminal.writeln(`\x1b[90mMOB-suite requires: assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -o flag
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -o mob_recon_results/\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.indexOf('-o');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'mob_recon_results') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: mob_recon_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'platon') {
				// platon assembly/assembly.fasta -o platon_results/
				const expectedCmd = 'platon assembly/assembly.fasta -o platon_results/';
				const inputFile = args.find(a => a.endsWith('.fasta'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('platon', inputFile)) {
					terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for platon\x1b[0m`);
					terminal.writeln(`\x1b[90mPlaton requires: assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -o platon_results/\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.indexOf('-o');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'platon_results') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: platon_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			// Phase 4: Phylogenetics
			if (command === 'snippy') {
				// snippy --ref reference.gbk --ctgs assembly/assembly.fasta --outdir snippy_results/
				const expectedCmd = 'snippy --ref reference.gbk --ctgs assembly/assembly.fasta --outdir snippy_results/';
				if (!args.includes('--ref')) {
					terminal.writeln(`\x1b[31mError: Missing reference file (--ref flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('--ctgs')) {
					terminal.writeln(`\x1b[31mError: Missing contigs file (--ctgs flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: --ctgs assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				const ctgsIdx = args.indexOf('--ctgs');
				const ctgsFile = args[ctgsIdx + 1];
				if (!ctgsFile || !ctgsFile.endsWith('.fasta')) {
					terminal.writeln(`\x1b[31mError: Invalid contigs file after --ctgs flag\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: --ctgs assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('--outdir')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (--outdir flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: --outdir snippy_results/\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.indexOf('--outdir');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'snippy_results') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: snippy_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'roary') {
				// roary -f roary_results/ -e -n -v prokka_results/*.gff
				const expectedCmd = 'roary -f roary_results/ -e -n -v prokka_results/*.gff';
				if (!args.includes('-f')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-f flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const fIdx = args.indexOf('-f');
				const outDir = args[fIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'roary_results') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[fIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: roary_results/\x1b[0m`);
					writePrompt();
					return;
				}
				// Check required flags
				if (!args.includes('-e')) {
					terminal.writeln(`\x1b[31mError: Missing -e flag (create core gene alignment)\x1b[0m`);
					terminal.writeln(`\x1b[90mRequired: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-n')) {
					terminal.writeln(`\x1b[31mError: Missing -n flag (fast core alignment with MAFFT)\x1b[0m`);
					terminal.writeln(`\x1b[90mRequired: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-v')) {
					terminal.writeln(`\x1b[31mError: Missing -v flag (verbose output)\x1b[0m`);
					terminal.writeln(`\x1b[90mRequired: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const gffFiles = args.filter(a => a.endsWith('.gff') || a.includes('*.gff'));
				if (gffFiles.length === 0) {
					terminal.writeln(`\x1b[31mError: Missing GFF annotation files\x1b[0m`);
					terminal.writeln(`\x1b[90mRoary requires GFF files from prokka annotation\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'iqtree') {
				// iqtree -s roary_results/core_gene_alignment.aln -m GTR+G -bb 1000 -nt AUTO
				const expectedCmd = 'iqtree -s roary_results/core_gene_alignment.aln -m GTR+G -bb 1000 -nt AUTO';
				if (!args.includes('-s')) {
					terminal.writeln(`\x1b[31mError: Missing alignment file (-s flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const sIdx = args.indexOf('-s');
				const alnFile = args[sIdx + 1];
				if (!alnFile || !alnFile.endsWith('.aln')) {
					terminal.writeln(`\x1b[31mError: Invalid or missing alignment file\x1b[0m`);
					terminal.writeln(`\x1b[90mIQ-TREE requires: roary_results/core_gene_alignment.aln\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -m model flag
				if (!args.includes('-m')) {
					terminal.writeln(`\x1b[31mError: Missing substitution model (-m flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -m GTR+G\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -bb bootstrap flag
				if (!args.includes('-bb')) {
					terminal.writeln(`\x1b[31mError: Missing bootstrap replicates (-bb flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -bb 1000\x1b[0m`);
					writePrompt();
					return;
				}
				// Check -nt threads flag
				if (!args.includes('-nt')) {
					terminal.writeln(`\x1b[31mError: Missing threads flag (-nt)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -nt AUTO\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'gubbins') {
				// run_gubbins.py -p gubbins_results/clean roary_results/core_gene_alignment.aln
				const expectedCmd = 'run_gubbins.py -p gubbins_results/clean roary_results/core_gene_alignment.aln';
				// Check -p prefix flag
				if (!args.includes('-p')) {
					terminal.writeln(`\x1b[31mError: Missing output prefix (-p flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const pIdx = args.indexOf('-p');
				const prefix = args[pIdx + 1];
				if (!prefix || !prefix.startsWith('gubbins_results/')) {
					terminal.writeln(`\x1b[31mError: Invalid output prefix '${prefix || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -p gubbins_results/clean\x1b[0m`);
					writePrompt();
					return;
				}
				// Check alignment file
				const alnFile = args.find(a => a.endsWith('.aln'));
				if (!alnFile) {
					terminal.writeln(`\x1b[31mError: Missing alignment file\x1b[0m`);
					terminal.writeln(`\x1b[90mGubbins requires: roary_results/core_gene_alignment.aln\x1b[0m`);
					writePrompt();
					return;
				}
			}

			// =========== NEW TOOLS ===========

			if (command === 'busco') {
				// busco -i assembly/assembly.fasta -o busco_results/ -m genome -l bacteria_odb10
				const expectedCmd = 'busco -i assembly/assembly.fasta -o busco_results/ -m genome -l bacteria_odb10';
				if (!args.includes('-i')) {
					terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const iIdx = args.indexOf('-i');
				const inputFile = args[iIdx + 1];
				if (!inputFile || !inputFile.endsWith('.fasta')) {
					terminal.writeln(`\x1b[31mError: Missing or invalid input file\x1b[0m`);
					terminal.writeln(`\x1b[90mBUSCO requires: assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -o busco_results/\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-m')) {
					terminal.writeln(`\x1b[31mError: Missing mode flag (-m)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -m genome\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-l')) {
					terminal.writeln(`\x1b[31mError: Missing lineage database (-l flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -l bacteria_odb10\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'plasmidfinder' || command === 'plasmidfinder.py') {
				// plasmidfinder.py -i o_unicycler/assembly.fasta -x -o o_plasmidfinder
				const expectedCmd = `${command} -i o_unicycler/assembly.fasta -x -o o_plasmidfinder`;
				if (!args.includes('-i')) {
					terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const iIdx = args.indexOf('-i');
				const inputFile = args[iIdx + 1];
				if (!inputFile || !inputFile.endsWith('.fasta')) {
					terminal.writeln(`\x1b[31mError: Missing or invalid input file\x1b[0m`);
					terminal.writeln(`\x1b[90mPlasmidFinder requires: o_unicycler/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!isValidFileForTool('plasmidfinder', inputFile)) {
					terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for plasmidfinder\x1b[0m`);
					terminal.writeln(`\x1b[90mPlasmidFinder requires: o_unicycler/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -o o_plasmidfinder\x1b[0m`);
					writePrompt();
					return;
				}
				const oIdx = args.indexOf('-o');
				const outDir = args[oIdx + 1]?.replace(/\/$/, '');
				if (outDir !== 'o_plasmidfinder') {
					terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
					terminal.writeln(`\x1b[33mFor this training, please use: -o o_plasmidfinder\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'resfinder') {
				// resfinder -i assembly/assembly.fasta -o resfinder_results/ -db_res
				const expectedCmd = 'resfinder -i assembly/assembly.fasta -o resfinder_results/ -db_res';
				if (!args.includes('-i')) {
					terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const iIdx = args.indexOf('-i');
				const inputFile = args[iIdx + 1];
				if (!inputFile || !inputFile.endsWith('.fasta')) {
					terminal.writeln(`\x1b[31mError: Missing or invalid input file\x1b[0m`);
					terminal.writeln(`\x1b[90mResFinder requires: assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -o resfinder_results/\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-db_res')) {
					terminal.writeln(`\x1b[31mError: Missing database flag (-db_res)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -db_res (use resistance database)\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'virulencefinder') {
				// virulencefinder -i assembly/assembly.fasta -o virulencefinder_results/
				const expectedCmd = 'virulencefinder -i assembly/assembly.fasta -o virulencefinder_results/';
				if (!args.includes('-i')) {
					terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const iIdx = args.indexOf('-i');
				const inputFile = args[iIdx + 1];
				if (!inputFile || !inputFile.endsWith('.fasta')) {
					terminal.writeln(`\x1b[31mError: Missing or invalid input file\x1b[0m`);
					terminal.writeln(`\x1b[90mVirulenceFinder requires: assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -o virulencefinder_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'integron_finder') {
				// integron_finder assembly/assembly.fasta --outdir integron_results/
				const expectedCmd = 'integron_finder assembly/assembly.fasta --outdir integron_results/';
				const inputFile = args.find(a => a.endsWith('.fasta'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('--outdir')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (--outdir flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: --outdir integron_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'isescan') {
				// isescan --seqfile assembly/assembly.fasta --output isescan_results/
				const expectedCmd = 'isescan --seqfile assembly/assembly.fasta --output isescan_results/';
				if (!args.includes('--seqfile')) {
					terminal.writeln(`\x1b[31mError: Missing sequence file (--seqfile flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
					writePrompt();
					return;
				}
				const sIdx = args.indexOf('--seqfile');
				const seqFile = args[sIdx + 1];
				if (!seqFile || !seqFile.endsWith('.fasta')) {
					terminal.writeln(`\x1b[31mError: Missing or invalid sequence file\x1b[0m`);
					terminal.writeln(`\x1b[90mISEScan requires: assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('--output')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (--output flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: --output isescan_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			// PacBio/Long-read tools
			if (command === 'NanoPlot') {
				// NanoPlot --fastq sample_01_hifi.fastq.gz -o nanoplot_results/
				if (!args.includes('--fastq')) {
					terminal.writeln(`\x1b[31mError: Missing input file (--fastq flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: NanoPlot --fastq <input.fastq.gz> -o nanoplot_results/\x1b[0m`);
					writePrompt();
					return;
				}
				const fIdx = args.indexOf('--fastq');
				const fastqFile = args[fIdx + 1];
				if (!fastqFile || !fastqFile.endsWith('.fastq.gz')) {
					terminal.writeln(`\x1b[31mError: Missing or invalid FASTQ file\x1b[0m`);
					terminal.writeln(`\x1b[90mNanoPlot requires a .fastq.gz file (e.g., sample_01_hifi.fastq.gz or sample_01_nanopore.fastq.gz)\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: -o nanoplot_results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'filtlong') {
				// filtlong --min_length 5000 --min_mean_q 20 sample_01_hifi.fastq.gz | gzip > filtered/sample_01_filtered.fastq.gz
				if (!args.includes('--min_length')) {
					terminal.writeln(`\x1b[31mError: Missing minimum length (--min_length flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: filtlong --min_length <len> --min_mean_q <qual> <input.fastq.gz>\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('--min_mean_q') && !args.includes('--keep_percent')) {
					terminal.writeln(`\x1b[31mError: Missing quality filter (--min_mean_q or --keep_percent flag)\x1b[0m`);
					terminal.writeln(`\x1b[33mRequired: --min_mean_q 20 or --keep_percent 90\x1b[0m`);
					writePrompt();
					return;
				}
				const fastqFile = args.find(a => a.endsWith('.fastq.gz') && !a.includes('filtered'));
				if (!fastqFile) {
					terminal.writeln(`\x1b[31mError: Missing input FASTQ file\x1b[0m`);
					terminal.writeln(`\x1b[90mFiltlong requires: sample_01_hifi.fastq.gz, sample_01_nanopore.fastq.gz, or trimmed/sample_01_trimmed.fastq.gz\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'flye') {
				// flye --pacbio-hifi filtered/sample_01_filtered.fastq.gz -o assembly/ --threads 8
				// flye --nano-hq filtered/sample_01_filtered.fastq.gz -o assembly/ --threads 8
				if (!args.includes('--pacbio-hifi') && !args.includes('--nano-hq') && !args.includes('--nano-raw')) {
					terminal.writeln(`\x1b[31mError: Missing read type flag\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: flye --pacbio-hifi <reads.fastq.gz> -o assembly/\x1b[0m`);
					terminal.writeln(`\x1b[90mOr: flye --nano-hq <reads.fastq.gz> -o assembly/\x1b[0m`);
					writePrompt();
					return;
				}
				const inputFile = args.find(a => a.endsWith('.fastq.gz'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input FASTQ file\x1b[0m`);
					terminal.writeln(`\x1b[90mFlye requires filtered reads: filtered/sample_01_filtered.fastq.gz\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: flye --pacbio-hifi filtered/sample_01_filtered.fastq.gz -o assembly/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'medaka_consensus') {
				// medaka_consensus -i filtered/sample_01_filtered.fastq.gz -d assembly/assembly.fasta -o polished/ -m r941_min_hac_g507
				if (!args.includes('-i')) {
					terminal.writeln(`\x1b[31mError: Missing input reads (-i flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: medaka_consensus -i <reads.fastq.gz> -d <assembly.fasta> -o polished/\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-d')) {
					terminal.writeln(`\x1b[31mError: Missing draft assembly (-d flag)\x1b[0m`);
					terminal.writeln(`\x1b[90mMedaka requires: -d assembly/assembly.fasta\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: medaka_consensus -i reads.fq.gz -d assembly.fasta -o polished/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'porechop') {
				// porechop -i sample_01_nanopore.fastq.gz -o trimmed/sample_01_trimmed.fastq.gz
				if (!args.includes('-i')) {
					terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: porechop -i <input.fastq.gz> -o <output.fastq.gz>\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('-o')) {
					terminal.writeln(`\x1b[31mError: Missing output file (-o flag)\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: porechop -i sample_01_nanopore.fastq.gz -o trimmed/sample_01_trimmed.fastq.gz\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'kraken2') {
				// kraken2 --db standard --threads 8 --report kraken_report.txt filtered/sample_01_filtered.fastq.gz > kraken_output.txt
				if (!args.includes('--db')) {
					terminal.writeln(`\x1b[31mError: Missing database (--db flag)\x1b[0m`);
					terminal.writeln(`\x1b[31mUsage: kraken2 --db standard --report <report.txt> <input.fastq.gz>\x1b[0m`);
					writePrompt();
					return;
				}
				if (!args.includes('--report')) {
					terminal.writeln(`\x1b[31mError: Missing report file (--report flag)\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: kraken2 --db standard --report kraken_report.txt reads.fastq.gz\x1b[0m`);
					writePrompt();
					return;
				}
				const inputFile = args.find(a => a.endsWith('.fastq.gz'));
				if (!inputFile) {
					terminal.writeln(`\x1b[31mError: Missing input FASTQ file\x1b[0m`);
					terminal.writeln(`\x1b[90mKraken2 requires: filtered/sample_01_filtered.fastq.gz\x1b[0m`);
					writePrompt();
					return;
				}
			}

			// Amplicon/16S tools
			if (command === 'cutadapt') {
				// cutadapt -g PRIMER -G PRIMER -o output_R1 -p output_R2 input_R1 input_R2
				if (!args.includes('-g') && !args.includes('-G')) {
					terminal.writeln(`\x1b[31mError: Missing primer sequence (-g/-G flag)\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: cutadapt -g GTGCCAGCMGCCGCGGTAA -G GGACTACHVGGGTWTCTAAT -o trimmed/R1.fq.gz -p trimmed/R2.fq.gz R1.fastq.gz R2.fastq.gz\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'qiime') {
				// QIIME2 has many subcommands - just validate that there's a subcommand
				if (args.length === 0) {
					terminal.writeln(`\x1b[31mError: Missing QIIME2 subcommand\x1b[0m`);
					terminal.writeln(`\x1b[90mAvailable: tools, dada2, feature-classifier, taxa, diversity, phylogeny, etc.\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: qiime dada2 denoise-paired --i-demultiplexed-seqs demux.qza ...\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'biom') {
				// biom convert -i input.biom -o output.tsv --to-tsv
				if (args.length === 0 || !args.includes('convert')) {
					terminal.writeln(`\x1b[31mError: Missing BIOM subcommand\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: biom convert -i feature-table.biom -o feature-table.tsv --to-tsv\x1b[0m`);
					writePrompt();
					return;
				}
			}

			if (command === 'sourcetracker2') {
				// sourcetracker2 gibbs --table-path table.biom --metadata-path metadata.tsv ...
				if (args.length === 0) {
					terminal.writeln(`\x1b[31mError: Missing SourceTracker2 subcommand\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: sourcetracker2 gibbs --table-path feature-table.biom --metadata-path source-metadata.tsv --output-dir results/\x1b[0m`);
					writePrompt();
					return;
				}
			}

			// R/RMarkdown tools
			if (command === 'Rscript') {
				// Rscript -e "R code here"
				if (!args.includes('-e')) {
					terminal.writeln(`\x1b[31mError: Missing -e flag for R expression\x1b[0m`);
					terminal.writeln(`\x1b[90mExample: Rscript -e "install.packages('ggplot2')"\x1b[0m`);
					writePrompt();
					return;
				}
			}

			await executeBioTool(command, args, cmd);
			return;
		}

		// Unknown command
		terminal.writeln(`\x1b[31mbash: ${command}: command not found\x1b[0m`);
		terminal.writeln(`\x1b[90mType 'help' for available commands\x1b[0m`);
		writePrompt();
	}

	function showHelp() {
		terminal.writeln('');
		terminal.writeln('\x1b[1;33m════════════════════════════════════════════════════════\x1b[0m');
		terminal.writeln('\x1b[1;33m  BioLearn Terminal - Available Commands\x1b[0m');
		terminal.writeln('\x1b[1;33m════════════════════════════════════════════════════════\x1b[0m');
		terminal.writeln('');
		terminal.writeln('\x1b[1;36mFile Navigation:\x1b[0m');
		terminal.writeln('');
		terminal.writeln('  ls [path]       List directory contents');
		terminal.writeln('  cd [path]       Change directory');
		terminal.writeln('  pwd             Print working directory');
		terminal.writeln('  cat [file]      View file contents');
		terminal.writeln('  head [file]     View first 10 lines');
		terminal.writeln('  tail [file]     View last 10 lines');
		terminal.writeln('');
		terminal.writeln('\x1b[1;36mBioinformatics Tools:\x1b[0m');
		terminal.writeln('');
		terminal.writeln('  \x1b[1;33mPhase 1 - QC & Assembly:\x1b[0m');
		terminal.writeln('  \x1b[32mseqkit stats\x1b[0m    Read statistics (~3s)');
		terminal.writeln('  \x1b[32mfastqc\x1b[0m          Quality control (~10s)');
		terminal.writeln('  \x1b[32mtrimmomatic\x1b[0m     Read trimming (~45s)');
		terminal.writeln('  \x1b[32municycler\x1b[0m       Genome assembly (~3-5min)');
		terminal.writeln('  \x1b[32mbandage\x1b[0m         Visualize assembly graph (~5s)');
		terminal.writeln('');
		terminal.writeln('  \x1b[1;33mPhase 2 - QC & Analysis:\x1b[0m');
		terminal.writeln('  \x1b[32mquast\x1b[0m           Assembly QC (~20s)');
		terminal.writeln('  \x1b[32mcheckm\x1b[0m          Genome completeness (~30s)');
		terminal.writeln('  \x1b[32mbusco\x1b[0m           BUSCO completeness (~45s)');
		terminal.writeln('  \x1b[32mconfindr\x1b[0m        Contamination detection (~15s)');
		terminal.writeln('  \x1b[32mprokka\x1b[0m          Genome annotation (~1-2min)');
		terminal.writeln('  \x1b[32mbakta\x1b[0m           Gene annotation (~1-2min)');
		terminal.writeln('  \x1b[32mabricate\x1b[0m        AMR screening (~10s)');
		terminal.writeln('  \x1b[32mresfinder\x1b[0m       Detailed AMR detection (~15s)');
		terminal.writeln('  \x1b[32mvirulencefinder\x1b[0m Virulence genes (~15s)');
		terminal.writeln('  \x1b[32mmlst\x1b[0m            Sequence typing (~5s)');
		terminal.writeln('');
		terminal.writeln('  \x1b[1;33mPhase 3 - Plasmid & Mobile Elements:\x1b[0m');
		terminal.writeln('  \x1b[32mmob_recon\x1b[0m       Plasmid reconstruction (~30s)');
		terminal.writeln('  \x1b[32mplaton\x1b[0m          Plasmid detection (~20s)');
		terminal.writeln('  \x1b[32mplasmidfinder\x1b[0m   Replicon typing (~10s)');
		terminal.writeln('  \x1b[32mintegron_finder\x1b[0m Integron detection (~30s)');
		terminal.writeln('  \x1b[32misescan\x1b[0m         IS element detection (~45s)');
		terminal.writeln('');
		terminal.writeln('  \x1b[1;33mPhase 4 - Phylogenetics:\x1b[0m');
		terminal.writeln('  \x1b[32msnippy\x1b[0m          Variant calling (~1min)');
		terminal.writeln('  \x1b[32mroary\x1b[0m           Pan-genome analysis (~2-4min)');
		terminal.writeln('  \x1b[32miqtree\x1b[0m          Phylogenetic tree (~1-3min)');
		terminal.writeln('  \x1b[32mgubbins\x1b[0m         Recombination detection (~2-5min)');
		terminal.writeln('');
		terminal.writeln('  \x1b[1;33mLong-read Tools (PacBio/Nanopore):\x1b[0m');
		terminal.writeln('  \x1b[32mNanoPlot\x1b[0m        Long-read QC (~30s)');
		terminal.writeln('  \x1b[32mporechop\x1b[0m        Adapter trimming (~30s)');
		terminal.writeln('  \x1b[32mfiltlong\x1b[0m        Long-read filtering (~20s)');
		terminal.writeln('  \x1b[32mkraken2\x1b[0m         Species identification (~1min)');
		terminal.writeln('  \x1b[32mflye\x1b[0m            Long-read assembly (~3-6min)');
		terminal.writeln('  \x1b[32mmedaka_consensus\x1b[0m Assembly polishing (~2-4min)');
		terminal.writeln('');
		terminal.writeln('\x1b[1;36mKeyboard Shortcuts:\x1b[0m');
		terminal.writeln('');
		terminal.writeln('  ↑/↓             Browse command history');
		terminal.writeln('  ←/→             Move cursor in command line');
		terminal.writeln('  Tab             Autocomplete file names');
		terminal.writeln('  Ctrl+L          Clear screen');
		terminal.writeln('  Ctrl+C          Cancel running command');
		terminal.writeln('');
		terminal.writeln('\x1b[1;36mUtility:\x1b[0m');
		terminal.writeln('');
		terminal.writeln('  help            Show this message');
		terminal.writeln('  clear           Clear terminal');
		terminal.writeln('');
	}

	function handleLs(args: string[]) {
		const filesystem = getFilesystem();
		const path = args[0] || currentDir;

		// Check if path contains a wildcard pattern
		if (path.includes('*') || path.includes('?')) {
			// Handle wildcard patterns like "sequences/*.fastq"
			let dirPath: string;
			let pattern: string;

			if (path.includes('/')) {
				// Path has directory component: "sequences/*.fastq"
				const lastSlash = path.lastIndexOf('/');
				const dirPart = path.substring(0, lastSlash);
				pattern = path.substring(lastSlash + 1);
				dirPath = dirPart.startsWith('/')
					? dirPart
					: `${currentDir}/${dirPart}`.replace(/\/+/g, '/');
			} else {
				// Just a pattern in current directory: "*.fastq"
				dirPath = currentDir;
				pattern = path;
			}

			// Get files in the target directory
			const dirFiles = filesystem[dirPath] || [];

			if (dirFiles.length === 0) {
				terminal.writeln(`\x1b[31mls: cannot access '${path}': No such file or directory\x1b[0m`);
				return;
			}

			// Convert glob pattern to regex
			const regexPattern = pattern
				.replace(/\./g, '\\.')
				.replace(/\*/g, '.*')
				.replace(/\?/g, '.');
			const regex = new RegExp(`^${regexPattern}$`);

			// Filter matching files (exclude directories for glob patterns)
			const matches = dirFiles.filter(f => {
				const fileName = f.endsWith('/') ? f.slice(0, -1) : f;
				return regex.test(fileName) && !f.endsWith('/');
			});

			if (matches.length === 0) {
				terminal.writeln(`\x1b[31mls: cannot access '${path}': No such file or directory\x1b[0m`);
				return;
			}

			// Format and display matching files with directory prefix
			const dirPrefix = path.includes('/') ? path.substring(0, path.lastIndexOf('/') + 1) : '';
			const formatted = matches.map(f => formatFileColor(dirPrefix + f));

			terminal.writeln(formatted.join('  '));
			return;
		}

		// Standard directory listing (no wildcards)
		const fullPath = path.startsWith('/') ? path : `${currentDir}/${path}`.replace(/\/+/g, '/').replace(/\/$/, '');
		const files = filesystem[fullPath] || [];

		if (files.length === 0) {
			terminal.writeln('\x1b[90m(empty directory)\x1b[0m');
			return;
		}

		const formatted = files.map(formatFileColor);

		// Display in columns
		terminal.writeln(formatted.join('  '));
	}

	function handleCd(args: string[]) {
		const filesystem = getFilesystem();
		const dataDir = get(storylineDataDir);

		if (args.length === 0 || args[0] === '~') {
			currentDir = dataDir;
			currentDirectory.set(currentDir);
			return;
		}

		let targetPath = args[0];

		// Handle .. (parent directory)
		if (targetPath === '..' || targetPath === '../' || targetPath.startsWith('../')) {
			const parts = currentDir.split('/').filter(p => p);
			if (parts.length > 0) {
				parts.pop();
			}
			if (targetPath.startsWith('../')) {
				// Handle ../something
				const remaining = targetPath.slice(3);
				if (remaining) {
					currentDir = '/' + parts.join('/');
					currentDirectory.set(currentDir);
					handleCd([remaining]);
					return;
				}
			}
			currentDir = parts.length > 0 ? '/' + parts.join('/') : '/data';
			// Don't go above /data - reset to initial directory
			if (!currentDir.startsWith('/data')) {
				currentDir = dataDir;
			}
			currentDirectory.set(currentDir);
			return;
		}

		// Build full path
		const newPath = targetPath.startsWith('/')
			? targetPath
			: `${currentDir}/${targetPath}`.replace(/\/+/g, '/').replace(/\/$/, '');

		// Check if directory exists in filesystem
		if (filesystem[newPath] !== undefined) {
			currentDir = newPath;
			currentDirectory.set(currentDir);
		} else {
			terminal.writeln(`\x1b[31mbash: cd: ${args[0]}: No such directory\x1b[0m`);
		}
	}

	// File contents - minimal placeholder (files served from template API)
	const fileContents: Record<string, string> = {};

	async function handleFileView(cmd: string, args: string[]) {
		// Parse -n flag for head/tail
		let numLines = 10; // default
		let filename: string | undefined;

		for (let i = 0; i < args.length; i++) {
			if (args[i] === '-n' && i + 1 < args.length) {
				numLines = parseInt(args[i + 1], 10) || 10;
				i++; // skip the number
			} else if (args[i].startsWith('-n')) {
				// Handle -n8 format (no space)
				numLines = parseInt(args[i].substring(2), 10) || 10;
			} else if (!args[i].startsWith('-')) {
				filename = args[i];
			}
		}

		if (!filename) {
			terminal.writeln(`\x1b[31m${cmd}: missing file operand\x1b[0m`);
			return;
		}

		const filesystem = getFilesystem();

		// Resolve the path
		let fullPath: string;
		let dirPath: string;
		let baseName: string;

		if (filename.includes('/')) {
			// Path includes directory
			const parts = filename.split('/');
			baseName = parts.pop() || '';
			const relativeDirPath = parts.join('/');
			dirPath = relativeDirPath.startsWith('/')
				? relativeDirPath
				: `${currentDir}/${relativeDirPath}`.replace(/\/+/g, '/');
			fullPath = `${dirPath}/${baseName}`;
		} else {
			baseName = filename;
			dirPath = currentDir;
			fullPath = `${currentDir}/${filename}`;
		}

		// Check if file was created during this session (e.g., grep output or copied file)
		if (createdFiles[fullPath]) {
			const storedValue = createdFiles[fullPath];

			// Check if this is a copied file reference (format: "cp:filename")
			if (storedValue.startsWith('cp:')) {
				const copiedFileName = storedValue.substring(3);
				// Fetch from template API
				const content = await fetchRootFileContent(copiedFileName);

				if (content) {
					const lines = content.split('\n');
					let outputLines: string[];
					if (cmd === 'head') {
						outputLines = lines.slice(0, numLines);
					} else if (cmd === 'tail') {
						outputLines = lines.slice(-numLines);
					} else {
						outputLines = lines;
					}
					for (const line of outputLines) {
						terminal.writeln(line);
					}
					return;
				}
				// API fetch failed
				terminal.writeln(`\x1b[31m${cmd}: ${filename}: Unable to read file\x1b[0m`);
				return;
			}

			// Regular created file (e.g., grep output)
			const content = storedValue;
			const lines = content.split('\n');
			const maxLines = cmd === 'head' ? numLines : (cmd === 'tail' ? numLines : lines.length);
			const startLine = cmd === 'tail' ? Math.max(0, lines.length - maxLines) : 0;

			for (let i = startLine; i < Math.min(startLine + maxLines, lines.length); i++) {
				terminal.writeln(lines[i]);
			}
			return;
		}

		// Check if file exists in filesystem
		const filesInDir = filesystem[dirPath] || [];
		const fileExists = filesInDir.some(f => f === baseName || f === baseName + '/');

		if (!fileExists) {
			terminal.writeln(`\x1b[31m${cmd}: ${filename}: No such file or directory\x1b[0m`);
			return;
		}

		// Check if it's a directory
		if (filesInDir.includes(baseName + '/')) {
			terminal.writeln(`\x1b[31m${cmd}: ${filename}: Is a directory\x1b[0m`);
			return;
		}

		// Handle binary files
		if (baseName.endsWith('.png') || baseName.endsWith('.svg')) {
			terminal.writeln(`\x1b[90m[Binary image file - view via Output Files panel]\x1b[0m`);
			return;
		}
		if (baseName.endsWith('.zip')) {
			terminal.writeln(`\x1b[90m[Compressed archive - download via Output Files panel]\x1b[0m`);
			return;
		}
		if (baseName.endsWith('.gz')) {
			terminal.writeln(`\x1b[90m[Compressed file - cannot display directly]\x1b[0m`);
			return;
		}

		// Fetch file content from template API
		const dataDir = get(storylineDataDir);
		let content: string | null = null;

		// Get relative path from data directory (e.g., 'sequences/sample_R1.fastq')
		const pathParts = fullPath.replace(dataDir, '').split('/').filter(p => p);
		const relativePath = pathParts.join('/');

		// Check if file is in a tool output directory (o_*)
		if (pathParts.length >= 2 && pathParts[0].startsWith('o_')) {
			const tool = pathParts[0];
			content = await fetchFileContent(tool, baseName);
		} else {
			// Try fetching as root file with full relative path
			content = await fetchRootFileContent(relativePath);
		}

		if (content) {
			const lines = content.split('\n');
			let outputLines: string[];

			if (cmd === 'head') {
				outputLines = lines.slice(0, numLines);
			} else if (cmd === 'tail') {
				outputLines = lines.slice(-numLines);
			} else {
				outputLines = lines;
			}

			for (const line of outputLines) {
				terminal.writeln(line);
			}
		} else {
			terminal.writeln(`\x1b[31m${cmd}: ${filename}: Unable to read file\x1b[0m`);
		}
	}

	// Track created directories and files for the session
	let createdDirs: Set<string> = new Set();
	let createdFiles: Record<string, string> = {};

	function handleWc(args: string[], fullCmd: string) {
		const hasLineFlag = args.includes('-l');
		const filteredArgs = args.filter(a => !a.startsWith('-'));

		if (filteredArgs.length === 0) {
			terminal.writeln(`\x1b[31mwc: missing file operand\x1b[0m`);
			return;
		}

		const filesystem = getFilesystem();
		let totalLines = 0;
		let totalWords = 0;
		let totalBytes = 0;
		let fileCount = 0;

		// Handle wildcards
		let filesToProcess: string[] = [];
		for (const pattern of filteredArgs) {
			if (pattern.includes('*')) {
				const expanded = expandGlobPattern(pattern);
				filesToProcess.push(...expanded);
			} else {
				filesToProcess.push(pattern);
			}
		}

		for (const filename of filesToProcess) {
			// Resolve path
			let fullPath: string;
			let dirPath: string;
			let baseName: string;

			if (filename.includes('/')) {
				const parts = filename.split('/');
				baseName = parts.pop() || '';
				const relativeDirPath = parts.join('/');
				dirPath = relativeDirPath.startsWith('/')
					? relativeDirPath
					: `${currentDir}/${relativeDirPath}`.replace(/\/+/g, '/');
				fullPath = `${dirPath}/${baseName}`;
			} else {
				baseName = filename;
				dirPath = currentDir;
				fullPath = `${currentDir}/${filename}`;
			}

			// Check if file exists
			const filesInDir = filesystem[dirPath] || [];
			const fileExists = filesInDir.some(f => f === baseName);

			if (!fileExists) {
				terminal.writeln(`\x1b[31mwc: ${filename}: No such file or directory\x1b[0m`);
				continue;
			}

			// Simulate file stats based on file type
			let lines = 40, words = 120, bytes = 4800;
			if (baseName.endsWith('.fastq') || baseName.endsWith('.fastq.gz')) {
				lines = 40; words = 40; bytes = 2840;
			} else if (baseName.endsWith('.txt')) {
				lines = 5; words = 25; bytes = 180;
			} else if (baseName.endsWith('.fasta')) {
				lines = 100; words = 100; bytes = 5200;
			}

			if (hasLineFlag) {
				terminal.writeln(`  ${lines.toString().padStart(7)} ${filename}`);
			} else {
				terminal.writeln(`  ${lines.toString().padStart(7)} ${words.toString().padStart(7)} ${bytes.toString().padStart(7)} ${filename}`);
			}

			totalLines += lines;
			totalWords += words;
			totalBytes += bytes;
			fileCount++;
		}

		// Show total if multiple files
		if (fileCount > 1) {
			if (hasLineFlag) {
				terminal.writeln(`  ${totalLines.toString().padStart(7)} total`);
			} else {
				terminal.writeln(`  ${totalLines.toString().padStart(7)} ${totalWords.toString().padStart(7)} ${totalBytes.toString().padStart(7)} total`);
			}
		}
	}

	function handleMkdir(args: string[]) {
		const hasParentFlag = args.includes('-p');
		const filteredArgs = args.filter(a => !a.startsWith('-'));

		if (filteredArgs.length === 0) {
			terminal.writeln(`\x1b[31mmkdir: missing operand\x1b[0m`);
			return;
		}

		for (const dir of filteredArgs) {
			// Use normalizePath to handle ./ and ../ properly
			const fullPath = normalizePath(dir);

			if (hasParentFlag) {
				// Create all parent directories
				const parts = fullPath.split('/').filter(p => p);
				let currentPath = '';
				for (const part of parts) {
					currentPath += '/' + part;
					createdDirs.add(currentPath);
				}
				terminal.writeln(`\x1b[32m✓ Created directory: ${dir}\x1b[0m`);
			} else {
				// Check if parent exists
				const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
				const filesystem = getFilesystem();

				if (!filesystem[parentPath] && !createdDirs.has(parentPath)) {
					terminal.writeln(`\x1b[31mmkdir: cannot create directory '${dir}': No such file or directory\x1b[0m`);
					terminal.writeln(`\x1b[90mTip: Use mkdir -p to create parent directories\x1b[0m`);
					continue;
				}
				createdDirs.add(fullPath);
				terminal.writeln(`\x1b[32m✓ Created directory: ${dir}\x1b[0m`);
			}
		}
	}

	function handleCp(args: string[]) {
		const hasRecursiveFlag = args.includes('-r') || args.includes('-R');
		const filteredArgs = args.filter(a => !a.startsWith('-'));

		if (filteredArgs.length < 2) {
			terminal.writeln(`\x1b[31mcp: missing destination file operand\x1b[0m`);
			return;
		}

		const source = filteredArgs[0];
		const dest = filteredArgs[1];
		const filesystem = getFilesystem();

		// Resolve source path using normalizePath to handle ./ and ../
		const sourcePath = normalizePath(source);

		// Check if source is a directory
		const sourceIsDir = filesystem[sourcePath] !== undefined;

		if (sourceIsDir && !hasRecursiveFlag) {
			terminal.writeln(`\x1b[31mcp: -r not specified; omitting directory '${source}'\x1b[0m`);
			return;
		}

		// Get source filename
		const sourceFile = sourcePath.substring(sourcePath.lastIndexOf('/') + 1);

		// Resolve destination path - include filename if dest is a directory or '.'
		let destPath: string;
		if (dest === '.') {
			destPath = `${currentDir}/${sourceFile}`;
		} else if (dest.endsWith('/') || filesystem[normalizePath(dest)] !== undefined) {
			// Destination is a directory
			destPath = `${normalizePath(dest)}/${sourceFile}`;
		} else {
			destPath = normalizePath(dest);
		}

		// Simulate copy success
		if (sourceIsDir) {
			createdDirs.add(destPath);
			terminal.writeln(`\x1b[32m✓ Copied directory: ${source} -> ${dest}\x1b[0m`);
		} else {
			// Check source file exists
			const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/';
			const filesInDir = filesystem[sourceDir] || [];

			if (!filesInDir.includes(sourceFile)) {
				terminal.writeln(`\x1b[31mcp: cannot stat '${source}': No such file or directory\x1b[0m`);
				return;
			}

			// Store the source file reference with a special marker
			// Format: "cp:sourcePath" to indicate this is a copied file reference
			createdFiles[destPath] = `cp:${sourceFile}`;
			terminal.writeln(`\x1b[32m✓ Copied: ${source} -> ${dest}\x1b[0m`);
		}
	}

	function handleGrep(args: string[], fullCmd: string) {
		const hasCaseInsensitive = args.includes('-i');
		const hasCount = args.includes('-c');
		const filteredArgs = args.filter(a => !a.startsWith('-'));

		if (filteredArgs.length < 2) {
			terminal.writeln(`\x1b[31mUsage: grep [OPTIONS] PATTERN FILE\x1b[0m`);
			return;
		}

		const pattern = filteredArgs[0].replace(/^["']|["']$/g, ''); // Remove quotes
		const filename = filteredArgs[1];
		const filesystem = getFilesystem();

		// Resolve path
		let dirPath: string;
		let baseName: string;

		if (filename.includes('/')) {
			const parts = filename.split('/');
			baseName = parts.pop() || '';
			const relativeDirPath = parts.join('/');
			dirPath = relativeDirPath.startsWith('/')
				? relativeDirPath
				: `${currentDir}/${relativeDirPath}`.replace(/\/+/g, '/');
		} else {
			baseName = filename;
			dirPath = currentDir;
		}

		// Check if file exists
		const filesInDir = filesystem[dirPath] || [];
		const fileExists = filesInDir.some(f => f === baseName);

		if (!fileExists) {
			terminal.writeln(`\x1b[31mgrep: ${filename}: No such file or directory\x1b[0m`);
			return;
		}

		// Check for redirect
		const hasAppendRedirect = fullCmd.includes('>>');
		const hasOverwriteRedirect = !hasAppendRedirect && fullCmd.includes('>');
		const hasRedirect = hasAppendRedirect || hasOverwriteRedirect;

		// Simulate grep results based on pattern and file type
		let matchCount = 0;
		let matches: string[] = [];

		if (baseName.endsWith('.fastq') || baseName.endsWith('.fastq.gz')) {
			if (pattern === '@' || pattern.includes('@')) {
				matchCount = 10;
				matches = [
					'@M00123:45:000000000-ABC12:1:1101:15234:1000 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15235:1001 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15236:1002 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15237:1003 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15238:1004 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15239:1005 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15240:1006 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15241:1007 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15242:1008 1:N:0:1',
					'@M00123:45:000000000-ABC12:1:1101:15243:1009 1:N:0:1'
				];
			} else if (pattern.includes('F')) {
				matchCount = 10;
				matches = [
					'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
					'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
					'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
				];
			}
		} else if (baseName.endsWith('.txt')) {
			if (pattern.toLowerCase() === 'sample' || hasCaseInsensitive) {
				matchCount = 3;
				matches = [
					'Sample ID: sample_01',
					'Sample type: Bacterial isolate',
					'Sample collection: 2024-01-15'
				];
			}
		}

		if (hasRedirect) {
			// Extract output file and track it
			const redirectOp = hasAppendRedirect ? '>>' : '>';
			const redirectParts = fullCmd.split(redirectOp);
			if (redirectParts.length >= 2) {
				const outputFile = redirectParts[1].trim().split(/\s+/)[0];

				// Resolve output path
				let outputPath: string;
				if (outputFile.includes('/')) {
					const parts = outputFile.split('/');
					const outputName = parts.pop() || '';
					const outputDirRel = parts.join('/');
					const outputDirPath = outputDirRel.startsWith('/')
						? outputDirRel
						: `${currentDir}/${outputDirRel}`.replace(/\/+/g, '/');
					outputPath = `${outputDirPath}/${outputName}`;

					// Check if output directory exists
					if (!filesystem[outputDirPath] && !createdDirs.has(outputDirPath)) {
						terminal.writeln(`\x1b[31mgrep: ${outputFile}: No such file or directory\x1b[0m`);
						return;
					}
				} else {
					outputPath = `${currentDir}/${outputFile}`;
				}

				// Track the created file with actual content
				createdFiles[outputPath] = matches.join('\n');
				terminal.writeln(`\x1b[32m✓ Results saved to ${outputFile}\x1b[0m`);
			} else {
				terminal.writeln(`\x1b[32m✓ Results saved to file\x1b[0m`);
			}
		} else if (hasCount) {
			terminal.writeln(matchCount.toString());
		} else {
			for (const match of matches) {
				// Highlight the pattern in the output
				const regex = new RegExp(`(${pattern})`, hasCaseInsensitive ? 'gi' : 'g');
				const highlighted = match.replace(regex, '\x1b[1;31m$1\x1b[0m');
				terminal.writeln(highlighted);
			}
			if (matches.length === 0 && matchCount === 0) {
				// No output for no matches (standard grep behavior)
			}
		}
	}

	function handleBioToolHelp(tool: string, args: string[]) {
		// Check if this is a subcommand help request (e.g., seqkit stats --help)
		const subcommand = args.find(a => !a.startsWith('-'));

		// Merge help texts from all storylines (later imports override earlier ones)
		const helpTexts: Record<string, Record<string, string>> = {
			...tutorialHelpTexts,
			...wgsBacteriaHelpTexts
		};

		// Get help text
		let helpText: string;
		const toolHelp = helpTexts[tool];

		if (toolHelp) {
			if (subcommand && toolHelp[subcommand]) {
				helpText = toolHelp[subcommand];
			} else {
				helpText = toolHelp['main'];
			}
		} else {
			// Generic help for tools without specific help text
			helpText = `\x1b[1m${tool}\x1b[0m - Bioinformatics tool

\x1b[1mUsage:\x1b[0m
  ${tool} [options] <input files>

Use --help or -h for more information about available options.
Refer to the tool documentation for detailed usage instructions.`;
		}

		// Write each line separately for better terminal rendering
		const lines = helpText.split('\n');
		for (const line of lines) {
			terminal.writeln(line);
		}
		// Store the full command (e.g., 'seqkit --help', 'seqkit stats --help')
		// to ensure each help step is tracked separately
		const fullCmd = `${tool} ${args.join(' ')}`.trim();
		executedCommands.update(cmds => {
			if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
			return cmds;
		});
	}

	async function executeBioTool(tool: string, args: string[], fullCmd: string) {
		isExecuting = true;
		const times = toolExecutionTimes[tool] || { min: 5, max: 15 };
		const execTime = Math.floor(Math.random() * (times.max - times.min + 1)) + times.min;

		// Check if output is being redirected to a file
		const hasRedirect = args.includes('>');
		const redirectFile = hasRedirect ? args[args.indexOf('>') + 1] : null;

		// Update terminal state for output panel
		terminalState.set({
			isRunning: true,
			currentCommand: fullCmd,
			progress: 0,
			estimatedTime: execTime
		});

		// Show tool startup with disclaimer
		terminal.writeln(`\x1b[36m[${tool}]\x1b[0m Starting analysis...`);
		terminal.writeln(`\x1b[90mEstimated time: ~${execTime}s (Press Ctrl+C to cancel)\x1b[0m`);
		terminal.writeln(`\x1b[90;3m(Note: This is a simulated duration. Real analysis may take minutes to hours.)\x1b[0m`);
		if (hasRedirect && redirectFile) {
			terminal.writeln(`\x1b[90mOutput will be saved to: ${redirectFile}\x1b[0m`);
		}
		terminal.writeln('');

		// Get dynamic tool output
		const toolData = getToolOutput(tool, args, fullCmd);
		const outputLines = toolData?.output?.split('\n') || [];
		const interval = (execTime * 1000) / Math.max(outputLines.length, 10);

		let wasCancelled = false;
		for (let i = 0; i < outputLines.length; i++) {
			await sleep(interval);
			if (!isExecuting) {
				wasCancelled = true;
				break;
			}

			// Only show output in terminal if NOT redirecting to file
			if (!hasRedirect) {
				terminal.writeln(outputLines[i]);
			}
			const progress = Math.floor(((i + 1) / outputLines.length) * 100);
			terminalState.update(s => ({ ...s, progress }));
		}

		if (wasCancelled) {
			// Tool was cancelled - don't add files to filesystem
			terminal.writeln('');
			terminal.writeln(`\x1b[33m⚠ ${tool} cancelled by user\x1b[0m`);
			terminal.writeln(`\x1b[90mNo output files were created.\x1b[0m`);
		} else if (toolData) {
			// Show completion message for redirected output
			if (hasRedirect && redirectFile) {
				terminal.writeln(`\x1b[32m✓ Analysis complete\x1b[0m`);
				terminal.writeln(`\x1b[90mOutput saved to: ${redirectFile}\x1b[0m`);
				terminal.writeln(`\x1b[90mUse 'cat ${redirectFile}' to view the results.\x1b[0m`);

				// Store redirected output in createdFiles for cat to read later
				// Try to fetch from template file first, fall back to generated output
				const outputPath = redirectFile.startsWith('/') ? redirectFile : `${currentDir}/${redirectFile}`;
				try {
					const templateUrl = getRootFileUrl(redirectFile);
					if (templateUrl) {
						const response = await fetch(templateUrl);
						if (response.ok) {
							createdFiles[outputPath] = await response.text();
						} else {
							// Fall back to generated clean output (strip ANSI codes from toolData.output)
							const cleanOutput = toolData.output?.replace(/\x1b\[[0-9;]*m/g, '').trim() || '';
							createdFiles[outputPath] = cleanOutput;
						}
					}
				} catch {
					// Fall back to generated clean output
					const cleanOutput = toolData.output?.replace(/\x1b\[[0-9;]*m/g, '').trim() || '';
					createdFiles[outputPath] = cleanOutput;
				}
			}
			// Track executed command for dynamic filesystem and step completion
			// Track BOTH for all bio tools:
			// 1. The tool name (for getFilesystem() to create output files)
			// 2. The full command (for StoryPanel step completion matching)
			executedCommands.update(cmds => {
				const newCmds = [...cmds];
				// Track tool name for filesystem creation
				if (!newCmds.includes(tool)) {
					newCmds.push(tool);
				}
				// Track full command for step completion
				if (!newCmds.includes(fullCmd)) {
					newCmds.push(fullCmd);
				}
				return newCmds;
			});

			// Fetch template files from API if available
			let outputFiles = toolData.files || [];
			const templateToolFiles = get(templateFiles);
			if (templateToolFiles[tool] && templateToolFiles[tool].length > 0) {
				// Template files exist for this tool - use them instead of hardcoded files
				outputFiles = templateToolFiles[tool].map(filename => ({
					name: filename,
					type: getFileType(filename),
					size: 'N/A', // Size will be fetched when viewing
					isTemplate: true, // Mark as template file for proper URL handling
					tool: tool // Store tool name for URL generation
				}));
			}

			// Update output panel with results
			const isPdfReport = fullCmd.includes('rmarkdown::render');
			const pdfTitle = fullCmd.includes('microbiome_report') ? '16S Microbiome Analysis Report' :
							 fullCmd.includes('wgs_report') ? 'WGS Bacteria Analysis Report' :
							 fullCmd.includes('rnaseq_report') ? 'RNA-Seq Analysis Report' : 'Analysis Report';

			// For bandage, dynamically set the image path from template API
			let chartData = toolData.chartData;
			if (tool === 'bandage' && chartData?.type === 'image') {
				const templateUrl = getRootFileUrl('o_bandage.png');
				if (templateUrl) {
					chartData = { ...chartData, imagePath: templateUrl };
				}
			}

			outputData.set({
				type: tool,
				title: `${tool.charAt(0).toUpperCase() + tool.slice(1)} Results`,
				tool: fullCmd,
				summary: toolData.summary,
				chartData: chartData,
				files: outputFiles,
				// PDF report specific fields
				isPdfReport: isPdfReport,
				pdfTitle: isPdfReport ? pdfTitle : null,
				pdfPages: isPdfReport ? Math.floor(Math.random() * 5) + 8 : null,
				pdfSize: isPdfReport ? `${(Math.random() * 1.5 + 1).toFixed(1)} MB` : null,
				pdfSections: isPdfReport ? (
					fullCmd.includes('microbiome_report')
						? [
							{ title: 'Alpha Diversity (Taxa)', figures: 2 },
							{ title: 'Beta Diversity (Taxa)', figures: 1 },
							{ title: 'Functional Pathway Analysis', figures: 2 },
							{ title: 'Function Heatmap (KO/EC)', figures: 1 },
							{ title: 'Differential Abundance', figures: 2 },
							{ title: 'Taxonomic Composition', figures: 1 }
						]
						: fullCmd.includes('wgs_report')
						? [
							{ title: 'Assembly Statistics', figures: 1 },
							{ title: 'AMR Gene Analysis', figures: 2 },
							{ title: 'MLST Typing', figures: 1 },
							{ title: 'Phylogenetic Tree', figures: 1 },
							{ title: 'Plasmid Analysis', figures: 1 }
						]
						: [
							{ title: 'Quality Control', figures: 2 },
							{ title: 'PCA Analysis', figures: 1 },
							{ title: 'Differential Expression', figures: 2 },
							{ title: 'Volcano Plot', figures: 1 },
							{ title: 'Expression Heatmap', figures: 1 },
							{ title: 'Pathway Enrichment', figures: 2 }
						]
				) : null
			});

			terminal.writeln('');
			terminal.writeln(`\x1b[32m✓ Analysis complete\x1b[0m`);
		}

		isExecuting = false;
		terminalState.set({ isRunning: false, currentCommand: '', progress: 100, estimatedTime: 0 });
		writePrompt();
	}

	function sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	onMount(async () => {
		const { Terminal } = await import('@xterm/xterm');
		const { FitAddon } = await import('@xterm/addon-fit');
		const { WebLinksAddon } = await import('@xterm/addon-web-links');
		await import('@xterm/xterm/css/xterm.css');

		// Read the current directory from store (set by ThreePanelLayout based on storyline)
		currentDir = get(currentDirectory);

		terminal = new Terminal(terminalOptions);
		fitAddon = new FitAddon();
		const webLinksAddon = new WebLinksAddon();

		terminal.loadAddon(fitAddon);
		terminal.loadAddon(webLinksAddon);
		terminal.open(terminalContainer);

		setTimeout(() => fitAddon.fit(), 0);

		resizeObserver = new ResizeObserver(() => {
			fitAddon.fit();
		});
		resizeObserver.observe(terminalContainer);

		// Subscribe to stop signal
		stopUnsubscribe = stopSignal.subscribe(() => {
			if (isExecuting) {
				isExecuting = false;
			}
		});

		// Initialize the currentDirectory store with the initial directory
		currentDirectory.set(initialDir);

		// Welcome message
		terminal.writeln('\x1b[1;36m╔═══════════════════════════════════════════════════════════╗\x1b[0m');
		terminal.writeln('\x1b[1;36m║\x1b[0m   \x1b[1;32mBioLearn\x1b[0m - Bioinformatics Learning Terminal             \x1b[1;36m║\x1b[0m');
		terminal.writeln('\x1b[1;36m║\x1b[0m   Type \x1b[33mhelp\x1b[0m for available commands                         \x1b[1;36m║\x1b[0m');
		terminal.writeln('\x1b[1;36m║\x1b[0m   Use ↑/↓ for history, Tab for autocomplete               \x1b[1;36m║\x1b[0m');
		terminal.writeln('\x1b[1;36m╚═══════════════════════════════════════════════════════════╝\x1b[0m');
		writePrompt();

		terminal.onData(handleInput);
	});

	onDestroy(() => {
		if (stopUnsubscribe) stopUnsubscribe();
		if (resizeObserver) resizeObserver.disconnect();
		if (terminal) terminal.dispose();
	});
</script>

<div class="flex flex-col h-full bg-gray-900 overflow-hidden" style="display: flex; flex-direction: column; height: 100%; background: #111827; overflow: hidden;">
	<!-- Command bar -->
	<div class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700 text-xs" style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; padding: 6px 12px; background: #1f2937; border-bottom: 1px solid #374151;">
		<span class="text-gray-400" style="color: #9ca3af;">Commands:</span>
		<div class="flex gap-1 flex-wrap" style="display: flex; gap: 4px; flex-wrap: wrap;">
			{#each ['ls', 'cd', 'pwd', 'cat', 'head', 'tail', 'clear', 'help'] as cmd}
				<span class="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-[10px]" style="padding: 2px 6px; background: #374151; color: #d1d5db; border-radius: 4px; font-size: 10px;">{cmd}</span>
			{/each}
		</div>
	</div>
	<!-- Terminal notice -->
	<div class="flex-shrink-0 px-3 py-1 bg-gray-800/50 text-sm text-gray-500 italic" style="flex-shrink: 0; padding: 4px 12px; background: rgba(31, 41, 55, 0.5); font-size: 14px; color: #6b7280; font-style: italic;">
		This terminal is optimized for commands referenced in the lesson panel. Other commands may have limited functionality.
	</div>
	<!-- Terminal -->
	<div bind:this={terminalContainer} class="flex-1 min-h-0 bg-[#1e1e1e] overflow-hidden" style="flex: 1; min-height: 0; background: #1e1e1e; overflow: hidden;"></div>
</div>

<style>
	:global(.xterm) {
		padding: 8px;
		height: 100%;
	}

	:global(.xterm-screen) {
		height: 100% !important;
	}

	:global(.xterm-viewport) {
		overflow-y: scroll !important;
	}

	:global(.xterm-viewport::-webkit-scrollbar) {
		width: 10px;
	}

	:global(.xterm-viewport::-webkit-scrollbar-track) {
		background: #2d2d2d;
	}

	:global(.xterm-viewport::-webkit-scrollbar-thumb) {
		background: #555;
		border-radius: 5px;
	}

	:global(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
		background: #777;
	}
</style>
