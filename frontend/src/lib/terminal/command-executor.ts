import type { TerminalContext } from './types';
import { getFilesystem, getFilesForDirectory, expandGlobPattern } from './filesystem';
import { isValidFileForTool, toolRequirements } from './tool-validation';
import { getToolOutput, getToolFromOutputName } from './tool-outputs';
import { handleLs, handleCd, handleFileView, handleWc, handleMkdir, handleCp, handleGrep, handleBioToolHelp } from './linux-commands';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function writePrompt(ctx: TerminalContext) {
    const dataDir = ctx.getStorylineDataDir();
    const shortDir = ctx.getCurrentDir().replace(dataDir, '~');
    ctx.terminal.write(`\r\n\x1b[32mbiolearn\x1b[0m:\x1b[34m${shortDir}\x1b[0m$ `);
}

export async function executeCommand(cmd: string, ctx: TerminalContext) {
	// Handle compound commands with && (execute sequentially)
	if (cmd.includes(' && ')) {
		const subCommands = cmd.split(' && ').map(c => c.trim()).filter(c => c);
		for (const subCmd of subCommands) {
			await executeCommand(subCmd, ctx);
		}
		return;
	}

	const parts = cmd.trim().split(/\s+/);
	const command = parts[0];
	const args = parts.slice(1);

	// Check for blocked commands (including less/more)
	if (ctx.getBlockedCommands().has(command) || command === 'less' || command === 'more') {
		if (command === 'less' || command === 'more') {
			ctx.terminal.writeln(`\x1b[31mbash: ${command}: command not available\x1b[0m`);
			ctx.terminal.writeln(`\x1b[90mUse 'head' or 'cat' to view files instead.\x1b[0m`);
		} else {
			ctx.terminal.writeln(`\x1b[31mbash: ${command}: Operation not permitted\x1b[0m`);
			ctx.terminal.writeln(`\x1b[90mThis is a learning environment. Modifying files is disabled.\x1b[0m`);
		}
		writePrompt(ctx);
		return;
	}

	// Handle built-in commands
	if (command === 'help') {
		showHelp(ctx);
		writePrompt(ctx);
		return;
	}

	if (command === 'clear') {
		ctx.terminal.clear();
		writePrompt(ctx);
		return;
	}

	if (command === 'pwd') {
		ctx.terminal.writeln(ctx.getCurrentDir());
		ctx.updateExecutedCommands(cmds => {
			if (!cmds.includes('pwd')) return [...cmds, 'pwd'];
			return cmds;
		});
		writePrompt(ctx);
		return;
	}

	if (command === 'ls') {
		handleLs(args, ctx);
		// Track both count (ls:1, ls:2 for multi-line commands) and full command
		// (ls sequences/*.fastq for specific step matching)
		const fullCmd = cmd.trim();
		ctx.updateExecutedCommands(cmds => {
			const lsCount = cmds.filter(c => c.startsWith('ls:')).length;
			const newCmds = [...cmds, `ls:${lsCount + 1}`];
			// Also track full command if not already present
			if (!newCmds.includes(fullCmd)) {
				newCmds.push(fullCmd);
			}
			return newCmds;
		});
		writePrompt(ctx);
		return;
	}

	if (command === 'cd') {
		handleCd(args, ctx);
		// Track the specific cd command (e.g., 'cd sequences', 'cd ..', 'cd ~')
		// to ensure each cd step in tutorials is tracked separately
		// Normalize path by removing trailing slash so 'cd sequences/' matches 'cd sequences'
		const cdCmd = args.length > 0 ? `cd ${args[0].replace(/\/$/, '')}` : 'cd';
		ctx.updateExecutedCommands(cmds => {
			if (!cmds.includes(cdCmd)) return [...cmds, cdCmd];
			return cmds;
		});
		writePrompt(ctx);
		return;
	}

	// Handle heredoc syntax for creating R Markdown files: cat > file.Rmd << 'EOF'
	if (command === 'cat' && cmd.includes('>') && cmd.includes("<<")) {
		// This is a heredoc command for creating a file - simulate success
		const fileMatch = cmd.match(/>\s*(\S+\.Rmd)/);
		if (fileMatch) {
			const fileName = fileMatch[1];
			ctx.terminal.writeln(`\x1b[32m✓ Created ${fileName}\x1b[0m`);
			ctx.terminal.writeln(`\x1b[90mR Markdown document ready for compilation\x1b[0m`);
			// Add 'cat' to executed commands so the step gets marked complete
			ctx.updateExecutedCommands(cmds => [...cmds, 'cat']);
			// Also mark Rscript as executed for file creation tracking
			ctx.updateExecutedCommands(cmds => [...cmds, 'Rscript']);
			writePrompt(ctx);
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
					const filesystem = getFilesystem(ctx);

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
							: `${ctx.getCurrentDir()}/${relativeDirPath}`.replace(/\/+/g, '/');
						inputFullPath = `${inputDirPath}/${inputBaseName}`;
					} else {
						inputBaseName = inputFilename;
						inputDirPath = ctx.getCurrentDir();
						inputFullPath = `${ctx.getCurrentDir()}/${inputFilename}`;
					}

					const filesInDir = filesystem[inputDirPath] || [];
					const fileExists = filesInDir.some(f => f === inputBaseName);

					if (!fileExists) {
						ctx.terminal.writeln(`\x1b[31m${command}: ${inputFilename}: No such file or directory\x1b[0m`);
						writePrompt(ctx);
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
							: `${ctx.getCurrentDir()}/${outputDirRel}`.replace(/\/+/g, '/');
						outputPath = `${outputDirPath}/${outputName}`;

						// Check if output directory exists
						if (!filesystem[outputDirPath] && !ctx.getCreatedDirs().has(outputDirPath)) {
							ctx.terminal.writeln(`\x1b[31m${command}: ${outputFile}: No such file or directory\x1b[0m`);
							writePrompt(ctx);
							return;
						}
					} else {
						outputPath = `${ctx.getCurrentDir()}/${outputFile}`;
					}

					// Fetch source content from template API (async)
					const dataDir = ctx.getStorylineDataDir();
					const pathParts = inputFullPath.replace(dataDir, '').split('/').filter(p => p);
					const relativePath = pathParts.join('/');

					let fetchPromise: Promise<string | null>;
					if (pathParts.length >= 2 && pathParts[0].startsWith('o_')) {
						const tool = pathParts[0].slice(2); // Strip 'o_' prefix — backend adds it back
						fetchPromise = ctx.fetchFileContent(tool, inputBaseName);
					} else {
						fetchPromise = ctx.fetchRootFileContent(relativePath);
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
							if (hasAppendRedirect && ctx.getCreatedFiles()[outputPath]) {
								ctx.setCreatedFile(outputPath, ctx.getCreatedFiles()[outputPath] + '\n' + outputContent);
							} else {
								ctx.setCreatedFile(outputPath, outputContent);
							}
							ctx.terminal.writeln(`\x1b[32m✓ Output saved to ${outputFile}\x1b[0m`);
						} else {
							ctx.terminal.writeln(`\x1b[31m${command}: ${inputFilename}: Unable to read file\x1b[0m`);
						}

						// Track command and write prompt
						const fullCmd = cmd.trim();
						ctx.updateExecutedCommands(cmds => {
							if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
							return cmds;
						});
						writePrompt(ctx);
					});
					return;
				}
			}
		} else {
			// Track the full command for step completion (e.g., 'cat sample_info.txt', 'head -n 8 file.txt')
			const fullCmd = cmd.trim();
			ctx.updateExecutedCommands(cmds => {
				if (!cmds.includes(fullCmd)) {
					return [...cmds, fullCmd];
				}
				return cmds;
			});
			// Handle async file view and write prompt after
			handleFileView(command, args, ctx).then(() => writePrompt(ctx));
			return;
		}

		// Track the full command for step completion
		const fullCmd = cmd.trim();
		ctx.updateExecutedCommands(cmds => {
			if (!cmds.includes(fullCmd)) {
				return [...cmds, fullCmd];
			}
			return cmds;
		});
		writePrompt(ctx);
		return;
	}

	// Handle wc (word count) command
	if (command === 'wc') {
		handleWc(args, cmd, ctx);
		// Track the full command (e.g., 'wc -l sequences/sample_R1.fastq', 'wc sample_info.txt')
		// to ensure each wc step in tutorials is tracked separately
		const fullCmd = cmd.trim();
		ctx.updateExecutedCommands(cmds => {
			if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
			return cmds;
		});
		writePrompt(ctx);
		return;
	}

	// Handle mkdir command
	if (command === 'mkdir') {
		handleMkdir(args, ctx);
		// Track the full command (e.g., 'mkdir results', 'mkdir -p results/qc/fastqc')
		// to ensure each mkdir step in tutorials is tracked separately
		const fullCmd = cmd.trim();
		ctx.updateExecutedCommands(cmds => {
			if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
			return cmds;
		});
		writePrompt(ctx);
		return;
	}

	// Handle cp command
	if (command === 'cp') {
		handleCp(args, ctx);
		// Track the full command (e.g., 'cp /data/references/sample_info.txt .')
		// to ensure each cp step in tutorials is tracked separately
		const fullCmd = cmd.trim();
		ctx.updateExecutedCommands(cmds => {
			if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
			return cmds;
		});
		writePrompt(ctx);
		return;
	}

	// Handle grep command
	if (command === 'grep') {
		handleGrep(args, cmd, ctx);
		// Track the full command (e.g., 'grep "FFFFF" file.txt', 'grep -c "@" file.txt')
		// to ensure each grep step in tutorials is tracked separately
		const fullCmd = cmd.trim();
		ctx.updateExecutedCommands(cmds => {
			if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
			return cmds;
		});
		writePrompt(ctx);
		return;
	}

	// Handle bioinformatics tools - require proper arguments and correct directory/files
	if (ctx.getBioTools().has(command)) {
		// Handle --help flag for any bio tool
		if (args.includes('--help') || args.includes('-h')) {
			handleBioToolHelp(command, args, ctx);
			writePrompt(ctx);
			return;
		}

		const req = toolRequirements[command];
		const dataDir = ctx.getStorylineDataDir();

		// Check directory requirement
		if (req && !req.dirs.includes(ctx.getCurrentDir())) {
			ctx.terminal.writeln(`\x1b[31mError: Wrong command. Please follow the command on the right panel.\x1b[0m`);
			writePrompt(ctx);
			return;
		}

		// Check command has proper arguments
		// Phase 1: QC and Read Processing
		if (command === 'seqkit') {
			// seqkit stats sample_01_R1.fastq.gz sample_01_R2.fastq.gz
			if (!args.includes('stats')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing subcommand\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: seqkit stats <file1.fastq.gz> <file2.fastq.gz>\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: seqkit stats *.fastq.gz (supports wildcards)\x1b[0m`);
				writePrompt(ctx);
				return;
			}

			// STRICT MODE: Trial scenario requires output redirection
			if (ctx.getCurrentDir() === '/data/kpneumoniae_demo') {
				const hasRedirect = args.includes('>');
				const outputFile = hasRedirect ? args[args.indexOf('>') + 1] : null;
				const hasCorrectOutput = outputFile === 'o_seqkit/o_seqkit_stats.txt';

				// Output redirection is required - this teaches real-world practice
				if (!hasRedirect || !hasCorrectOutput) {
					ctx.terminal.writeln(`\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
					ctx.terminal.writeln(`\x1b[33m⚠  Tutorial Mode: Output file required\x1b[0m`);
					ctx.terminal.writeln(`\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
					ctx.terminal.writeln(``);
					ctx.terminal.writeln(`\x1b[90mIn real bioinformatics workflows, saving output to files is\x1b[0m`);
					ctx.terminal.writeln(`\x1b[90messential for documentation and downstream analysis.\x1b[0m`);
					ctx.terminal.writeln(``);
					ctx.terminal.writeln(`\x1b[36mPlease redirect output to the o_seqkit/ folder:\x1b[0m`);
					ctx.terminal.writeln(`\x1b[32m  seqkit stats input_data/*.fastq.gz > o_seqkit/o_seqkit_stats.txt\x1b[0m`);
					ctx.terminal.writeln(`\x1b[90m  or\x1b[0m`);
					ctx.terminal.writeln(`\x1b[32m  seqkit stats input_data/SRR36708862_1.fastq.gz input_data/SRR36708862_2.fastq.gz > o_seqkit/o_seqkit_stats.txt\x1b[0m`);
					writePrompt(ctx);
					return;
				}
			}

			// Get raw input patterns (may include wildcards)
			const inputPatterns = args.filter(a => a.endsWith('.fastq.gz') || a.includes('*'));

			// Expand glob patterns
			let inputFiles: string[] = [];
			for (const pattern of inputPatterns) {
				const expanded = expandGlobPattern(pattern, ctx);
				inputFiles.push(...expanded);
			}

			// Filter to only .fastq.gz files
			inputFiles = inputFiles.filter(f => f.endsWith('.fastq.gz'));

			if (inputFiles.length === 0) {
				const availableFiles = getFilesForDirectory(ctx.getCurrentDir(), ctx).filter(f => f.endsWith('.fastq.gz'));
				ctx.terminal.writeln(`\x1b[31mError: Missing input FASTQ files\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: seqkit stats <file1.fastq.gz> <file2.fastq.gz>\x1b[0m`);
				if (availableFiles.length > 0) {
					ctx.terminal.writeln(`\x1b[90mAvailable files: ${availableFiles.slice(0, 4).join(', ')}${availableFiles.length > 4 ? '...' : ''}\x1b[0m`);
					ctx.terminal.writeln(`\x1b[90mTip: Use 'seqkit stats *.fastq.gz' to process all FASTQ files\x1b[0m`);
				}
				writePrompt(ctx);
				return;
			}

			// Validate input files
			for (const f of inputFiles) {
				if (!isValidFileForTool('seqkit', f)) {
					const availableFiles = getFilesForDirectory(ctx.getCurrentDir(), ctx).filter(f => f.endsWith('.fastq.gz'));
					ctx.terminal.writeln(`\x1b[31mError: '${f}' is not a valid input for seqkit\x1b[0m`);
					if (availableFiles.length > 0) {
						ctx.terminal.writeln(`\x1b[90mAvailable files: ${availableFiles.slice(0, 4).join(', ')}${availableFiles.length > 4 ? '...' : ''}\x1b[0m`);
					}
					writePrompt(ctx);
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
				const expanded = expandGlobPattern(pattern, ctx);
				inputFiles.push(...expanded);
			}

			// Filter to only .fastq.gz files
			inputFiles = inputFiles.filter(f => f.endsWith('.fastq.gz'));

			if (inputFiles.length === 0) {
				const availableFiles = getFilesForDirectory(ctx.getCurrentDir(), ctx).filter(f => f.endsWith('.fastq.gz'));
				ctx.terminal.writeln(`\x1b[31mError: Missing input file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: fastqc <input.fastq.gz> -o <output_dir>\x1b[0m`);
				if (availableFiles.length > 0) {
					ctx.terminal.writeln(`\x1b[90mAvailable files: ${availableFiles.slice(0, 4).join(', ')}${availableFiles.length > 4 ? '...' : ''}\x1b[0m`);
					ctx.terminal.writeln(`\x1b[90mTip: Use 'fastqc *.fastq.gz -o o_fastqc/' to process all files\x1b[0m`);
				}
				writePrompt(ctx);
				return;
			}

			// Validate input files
			for (const f of inputFiles) {
				if (!isValidFileForTool('fastqc', f)) {
					const availableFiles = getFilesForDirectory(ctx.getCurrentDir(), ctx).filter(f => f.endsWith('.fastq.gz'));
					ctx.terminal.writeln(`\x1b[31mError: '${f}' is not a valid input for fastqc\x1b[0m`);
					if (availableFiles.length > 0) {
						ctx.terminal.writeln(`\x1b[90mAvailable files: ${availableFiles.slice(0, 4).join(', ')}${availableFiles.length > 4 ? '...' : ''}\x1b[0m`);
					}
					writePrompt(ctx);
					return;
				}
			}

			// Check for -o flag with output directory
			const oIndex = args.indexOf('-o');
			if (oIndex === -1 || !args[oIndex + 1]) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: fastqc <input.fastq.gz> -o <output_dir>\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: fastqc *.fastq.gz -o o_fastqc/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check for exact folder name
			const outputDir = args[oIndex + 1].replace(/\/$/, ''); // Remove trailing slash
			if (outputDir !== 'o_fastqc') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIndex + 1]}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use the exact folder name: o_fastqc\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: fastqc *.fastq.gz -o o_fastqc/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'trimmomatic') {
			const expectedCmd = 'trimmomatic PE -threads 2 -phred33 input_data/SRR36708862_1.fastq.gz input_data/SRR36708862_2.fastq.gz o_trimmomatic/SRR36708862_R1_paired.fq.gz o_trimmomatic/SRR36708862_R1_unpaired.fq.gz o_trimmomatic/SRR36708862_R2_paired.fq.gz o_trimmomatic/SRR36708862_R2_unpaired.fq.gz ILLUMINACLIP:TruSeq3-PE.fa:2:30:10 SLIDINGWINDOW:4:15 MINLEN:36';
			if (args.length < 5) {
				ctx.terminal.writeln(`\x1b[31mError: Incomplete command\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: trimmomatic PE -phred33 <R1.fq.gz> <R2.fq.gz> <outputs...> ILLUMINACLIP:... SLIDINGWINDOW:... MINLEN:...\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check PE mode
			if (!args.includes('PE')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing 'PE' mode for paired-end reads\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -phred33
			if (!args.includes('-phred33')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing '-phred33' quality encoding\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check output files are in trimmed/ folder
			const outputFiles = args.filter(a => a.includes('_paired.fq.gz') || a.includes('_unpaired.fq.gz'));
			if (outputFiles.length === 0) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output files\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mOutput files should be: o_trimmomatic/sample_01_R1_paired.fq.gz, o_trimmomatic/sample_01_R1_unpaired.fq.gz, etc.\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const invalidOutput = outputFiles.find(f => !f.startsWith('o_trimmomatic/'));
			if (invalidOutput) {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output path '${invalidOutput}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, output files must be in the 'o_trimmomatic/' folder\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check ILLUMINACLIP
			const hasIlluminaclip = args.some(a => a.startsWith('ILLUMINACLIP:'));
			if (!hasIlluminaclip) {
				ctx.terminal.writeln(`\x1b[31mError: Missing ILLUMINACLIP adapter trimming parameter\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mRequired: ILLUMINACLIP:TruSeq3-PE.fa:2:30:10\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check SLIDINGWINDOW
			const hasSlidingwindow = args.some(a => a.startsWith('SLIDINGWINDOW:'));
			if (!hasSlidingwindow) {
				ctx.terminal.writeln(`\x1b[31mError: Missing SLIDINGWINDOW quality trimming parameter\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mRequired: SLIDINGWINDOW:4:15\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check MINLEN
			const hasMinlen = args.some(a => a.startsWith('MINLEN:'));
			if (!hasMinlen) {
				ctx.terminal.writeln(`\x1b[31mError: Missing MINLEN minimum length parameter\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mRequired: MINLEN:36\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'unicycler') {
			if (!args.includes('-1') || !args.includes('-2')) {
				ctx.terminal.writeln(`\x1b[31mUsage: unicycler -1 <R1_paired.fq.gz> -2 <R2_paired.fq.gz> -o <output_dir>\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mThis tool requires paired-end trimmed reads from the o_trimmomatic/ folder.\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check that input files are trimmed paired files
			const r1Idx = args.indexOf('-1');
			const r2Idx = args.indexOf('-2');
			const r1File = args[r1Idx + 1];
			const r2File = args[r2Idx + 1];
			// Check files are valid for unicycler
			if (!r1File || !isValidFileForTool('unicycler', r1File)) {
				ctx.terminal.writeln(`\x1b[31mError: '${r1File || 'missing'}' is not a valid input for unicycler\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mUnicycler requires: o_trimmomatic/SRR36708862_R1_paired.fq.gz\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!r2File || !isValidFileForTool('unicycler', r2File)) {
				ctx.terminal.writeln(`\x1b[31mError: '${r2File || 'missing'}' is not a valid input for unicycler\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mUnicycler requires: o_trimmomatic/SRR36708862_R2_paired.fq.gz\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -o flag
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: unicycler -1 <R1_paired.fq.gz> -2 <R2_paired.fq.gz> -o <output_dir>\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Enforce exact output directory name
			const oIdx = args.indexOf('-o');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'o_unicycler') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use the exact folder name: o_unicycler\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: unicycler -1 o_trimmomatic/SRR36708862_R1_paired.fq.gz -2 o_trimmomatic/SRR36708862_R2_paired.fq.gz -o o_unicycler/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'bandage') {
			if (!args.includes('image')) {
				ctx.terminal.writeln(`\x1b[31mUsage: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check GFA file
			const gfaFile = args.find(a => a.endsWith('.gfa'));
			if (!gfaFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing .gfa file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('bandage', gfaFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${gfaFile}' is not a valid input for bandage\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mBandage requires: o_unicycler/assembly.gfa (from unicycler output)\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check PNG output
			const pngFile = args.find(a => a.endsWith('.png'));
			if (!pngFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output .png file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Enforce exact output file name
			if (pngFile !== 'o_bandage.png') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output file name '${pngFile}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: o_bandage.png\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: bandage image o_unicycler/assembly.gfa o_bandage.png\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'quast') {
			// quast o_unicycler/assembly.fasta -o o_quast/
			const inputFile = args.find(a => a.endsWith('.fasta'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: quast o_unicycler/assembly.fasta -o o_quast/\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: quast o_unicycler/assembly.fasta -o o_quast/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('quast', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for quast\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mQuast requires: o_unicycler/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -o output directory
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: -o o_quast/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const oIdx = args.indexOf('-o');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'o_quast') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: o_quast/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'prokka') {
			// prokka --outdir o_prokka --prefix PROKKA o_unicycler/assembly.fasta
			const expectedCmd = 'prokka --outdir o_prokka --prefix PROKKA o_unicycler/assembly.fasta';
			const inputFile = args.find(a => a.endsWith('.fasta'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('prokka', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for prokka\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mProkka requires: o_unicycler/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check output directory
			if (!args.includes('--outdir')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (--outdir flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --outdir o_prokka\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const oIdx = args.indexOf('--outdir');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'o_prokka') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: --outdir o_prokka\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check prefix
			if (!args.includes('--prefix')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output file prefix (--prefix flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --prefix PROKKA\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'abricate') {
			// abricate --db ncbi o_unicycler/assembly.fasta > o_abricate/o_abricate_ncbi.tab
			const expectedCmd = 'abricate --db ncbi o_unicycler/assembly.fasta > o_abricate/o_abricate_ncbi.tab';
			const inputFile = args.find(a => a.endsWith('.fasta'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('abricate', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for abricate\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mABRicate requires: o_unicycler/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check database
			if (!args.includes('--db')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing database (--db flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mAvailable databases: ncbi, card, resfinder, vfdb\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check output redirection - abricate outputs to stdout
			const redirectIdx = args.indexOf('>');
			if (redirectIdx === -1) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output redirect (>)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mABRicate outputs to stdout. Use: > o_abricate/o_abricate_ncbi.tab\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const outPath = args[redirectIdx + 1];
			if (!outPath || !outPath.startsWith('o_abricate/')) {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output path '${outPath || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: > o_abricate/o_abricate_ncbi.tab\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'checkm') {
			// checkm lineage_wf assembly/ checkm_results/ -x fasta
			const expectedCmd = 'checkm lineage_wf assembly/ checkm_results/ -x fasta';
			if (!args.includes('lineage_wf')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing 'lineage_wf' workflow command\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check input directory
			const inputDir = args.find(a => a === 'assembly/' || a === 'assembly');
			if (!inputDir) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input assembly directory\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check output directory
			const outDir = args.find(a => a.includes('checkm'));
			if (!outDir) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: checkm_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (outDir !== 'checkm_results/' && outDir !== 'checkm_results') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${outDir}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: checkm_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -x fasta extension flag
			if (!args.includes('-x')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing file extension flag (-x)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -x fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const xIdx = args.indexOf('-x');
			const ext = args[xIdx + 1];
			if (ext !== 'fasta') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid extension '${ext || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: -x fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'checkm2') {
			// checkm2 predict --input o_unicycler/ --output-directory o_checkm2/ --threads 4 -x fasta
			const expectedCmd = 'checkm2 predict --input o_unicycler/ --output-directory o_checkm2/ --threads 4 -x fasta';
			if (!args.includes('predict')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing 'predict' workflow command\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check input directory
			if (!args.includes('--input')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input directory (--input flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const inputIdx = args.indexOf('--input');
			const inputDir = args[inputIdx + 1]?.replace(/\/$/, '');
			if (!inputDir || !isValidFileForTool('checkm2', inputDir + '/')) {
				ctx.terminal.writeln(`\x1b[31mError: Invalid or missing input directory\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mCheckM2 requires: --input o_unicycler/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check output directory
			if (!args.includes('--output-directory')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (--output-directory flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --output-directory o_checkm2/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const outIdx = args.indexOf('--output-directory');
			const outDir = args[outIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'o_checkm2') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[outIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: --output-directory o_checkm2/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check --threads flag
			if (!args.includes('--threads')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing threads flag (--threads)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --threads 4\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const threadsIdx = args.indexOf('--threads');
			const threads = args[threadsIdx + 1];
			if (threads !== '4') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid threads value '${threads || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: --threads 4\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -x fasta extension flag
			if (!args.includes('-x')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing file extension flag (-x)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -x fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const xIdx = args.indexOf('-x');
			const ext = args[xIdx + 1];
			if (ext !== 'fasta') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid extension '${ext || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: -x fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'confindr') {
			// ConFindr: confindr -i assembly/assembly.fasta -o confindr_results/
			if (!args.includes('-i')) {
				ctx.terminal.writeln(`\x1b[31mUsage: confindr -i assembly/assembly.fasta -o confindr_results/\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: confindr -i assembly/assembly.fasta -o confindr_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check input file
			const iIdx = args.indexOf('-i');
			const inputFile = args[iIdx + 1];
			if (!inputFile || !isValidFileForTool('confindr', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: Invalid or missing input file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mConFindr requires: assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check output directory
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: -o confindr_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const oIdx = args.indexOf('-o');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'confindr_results') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: confindr_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'bakta') {
			// Bakta: bakta assembly/assembly.fasta --output bakta_results/
			const inputFile = args.find(a => a.endsWith('.fasta'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: bakta assembly/assembly.fasta --output bakta_results/\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: bakta assembly/assembly.fasta --output bakta_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('bakta', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for bakta\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mBakta requires: assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check output directory
			if (!args.includes('--output') && !args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (--output flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: --output bakta_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const oIdx = args.includes('--output') ? args.indexOf('--output') : args.indexOf('-o');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'bakta_results') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: bakta_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'mlst') {
			// mlst outputs to stdout, use redirect: mlst input.fasta > o_mlst/mlst_result.tab
			const expectedCmd = 'mlst o_unicycler/assembly.fasta > o_mlst/mlst_result.tab';
			const inputFile = args.find(a => a.endsWith('.fasta'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('mlst', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for mlst\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mMLST requires: o_unicycler/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check output redirection - mlst outputs to stdout
			const redirectIdx = args.indexOf('>');
			if (redirectIdx === -1) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output redirect (>)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mMLST outputs to stdout. Use: > o_mlst/mlst_result.tab\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const outPath = args[redirectIdx + 1];
			if (!outPath || !outPath.startsWith('o_mlst/')) {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output path '${outPath || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: > o_mlst/mlst_result.tab\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		// Phase 3: Plasmid Analysis
		if (command === 'mob_recon') {
			// mob_recon -i assembly/assembly.fasta -o mob_recon_results/
			const expectedCmd = 'mob_recon -i assembly/assembly.fasta -o mob_recon_results/';
			// Check -i flag
			if (!args.includes('-i')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input file flag (-i)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const iIdx = args.indexOf('-i');
			const inputFile = args[iIdx + 1];
			if (!inputFile || !inputFile.endsWith('.fasta')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing or invalid input file after -i flag\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mMOB-suite requires: -i assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('mob_recon', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for mob_recon\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mMOB-suite requires: assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -o flag
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -o mob_recon_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const oIdx = args.indexOf('-o');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'mob_recon_results') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: mob_recon_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'platon') {
			// platon assembly/assembly.fasta -o platon_results/
			const expectedCmd = 'platon assembly/assembly.fasta -o platon_results/';
			const inputFile = args.find(a => a.endsWith('.fasta'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('platon', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for platon\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mPlaton requires: assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -o platon_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const oIdx = args.indexOf('-o');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'platon_results') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: platon_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		// Phase 4: Phylogenetics
		if (command === 'snippy') {
			// snippy --ref reference.gbk --ctgs assembly/assembly.fasta --outdir snippy_results/
			const expectedCmd = 'snippy --ref reference.gbk --ctgs assembly/assembly.fasta --outdir snippy_results/';
			if (!args.includes('--ref')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing reference file (--ref flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('--ctgs')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing contigs file (--ctgs flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --ctgs assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const ctgsIdx = args.indexOf('--ctgs');
			const ctgsFile = args[ctgsIdx + 1];
			if (!ctgsFile || !ctgsFile.endsWith('.fasta')) {
				ctx.terminal.writeln(`\x1b[31mError: Invalid contigs file after --ctgs flag\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: --ctgs assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('--outdir')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (--outdir flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --outdir snippy_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const oIdx = args.indexOf('--outdir');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'snippy_results') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: snippy_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'roary') {
			// roary -f roary_results/ -e -n -v prokka_results/*.gff
			const expectedCmd = 'roary -f roary_results/ -e -n -v prokka_results/*.gff';
			if (!args.includes('-f')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-f flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const fIdx = args.indexOf('-f');
			const outDir = args[fIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'roary_results') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[fIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: roary_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check required flags
			if (!args.includes('-e')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing -e flag (create core gene alignment)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mRequired: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-n')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing -n flag (fast core alignment with MAFFT)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mRequired: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-v')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing -v flag (verbose output)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mRequired: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const gffFiles = args.filter(a => a.endsWith('.gff') || a.includes('*.gff'));
			if (gffFiles.length === 0) {
				ctx.terminal.writeln(`\x1b[31mError: Missing GFF annotation files\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mRoary requires GFF files from prokka annotation\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'iqtree') {
			// iqtree -s roary_results/core_gene_alignment.aln -m GTR+G -bb 1000 -nt AUTO
			const expectedCmd = 'iqtree -s roary_results/core_gene_alignment.aln -m GTR+G -bb 1000 -nt AUTO';
			if (!args.includes('-s')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing alignment file (-s flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const sIdx = args.indexOf('-s');
			const alnFile = args[sIdx + 1];
			if (!alnFile || !alnFile.endsWith('.aln')) {
				ctx.terminal.writeln(`\x1b[31mError: Invalid or missing alignment file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mIQ-TREE requires: roary_results/core_gene_alignment.aln\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -m model flag
			if (!args.includes('-m')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing substitution model (-m flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -m GTR+G\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -bb bootstrap flag
			if (!args.includes('-bb')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing bootstrap replicates (-bb flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -bb 1000\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check -nt threads flag
			if (!args.includes('-nt')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing threads flag (-nt)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -nt AUTO\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'gubbins') {
			// run_gubbins.py -p gubbins_results/clean roary_results/core_gene_alignment.aln
			const expectedCmd = 'run_gubbins.py -p gubbins_results/clean roary_results/core_gene_alignment.aln';
			// Check -p prefix flag
			if (!args.includes('-p')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output prefix (-p flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const pIdx = args.indexOf('-p');
			const prefix = args[pIdx + 1];
			if (!prefix || !prefix.startsWith('gubbins_results/')) {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output prefix '${prefix || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -p gubbins_results/clean\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			// Check alignment file
			const alnFile = args.find(a => a.endsWith('.aln'));
			if (!alnFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing alignment file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mGubbins requires: roary_results/core_gene_alignment.aln\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		// =========== NEW TOOLS ===========

		if (command === 'busco') {
			// busco -i assembly/assembly.fasta -o busco_results/ -m genome -l bacteria_odb10
			const expectedCmd = 'busco -i assembly/assembly.fasta -o busco_results/ -m genome -l bacteria_odb10';
			if (!args.includes('-i')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const iIdx = args.indexOf('-i');
			const inputFile = args[iIdx + 1];
			if (!inputFile || !inputFile.endsWith('.fasta')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing or invalid input file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mBUSCO requires: assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -o busco_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-m')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing mode flag (-m)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -m genome\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-l')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing lineage database (-l flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -l bacteria_odb10\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'plasmidfinder' || command === 'plasmidfinder.py') {
			// mkdir o_plasmidfinder && plasmidfinder.py -i o_unicycler/assembly.fasta -o o_plasmidfinder
			const expectedCmd = `${command} -i o_unicycler/assembly.fasta -o o_plasmidfinder`;
			if (!args.includes('-i')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const iIdx = args.indexOf('-i');
			const inputFile = args[iIdx + 1];
			if (!inputFile || !inputFile.endsWith('.fasta')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing or invalid input file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mPlasmidFinder requires: o_unicycler/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!isValidFileForTool('plasmidfinder', inputFile)) {
				ctx.terminal.writeln(`\x1b[31mError: '${inputFile}' is not a valid input for plasmidfinder\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mPlasmidFinder requires: o_unicycler/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -o o_plasmidfinder\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const oIdx = args.indexOf('-o');
			const outDir = args[oIdx + 1]?.replace(/\/$/, '');
			if (outDir !== 'o_plasmidfinder') {
				ctx.terminal.writeln(`\x1b[31mError: Invalid output directory '${args[oIdx + 1] || 'missing'}'\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mFor this training, please use: -o o_plasmidfinder\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'resfinder') {
			// resfinder -i assembly/assembly.fasta -o resfinder_results/ -db_res
			const expectedCmd = 'resfinder -i assembly/assembly.fasta -o resfinder_results/ -db_res';
			if (!args.includes('-i')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const iIdx = args.indexOf('-i');
			const inputFile = args[iIdx + 1];
			if (!inputFile || !inputFile.endsWith('.fasta')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing or invalid input file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mResFinder requires: assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -o resfinder_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-db_res')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing database flag (-db_res)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -db_res (use resistance database)\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'virulencefinder') {
			// virulencefinder -i assembly/assembly.fasta -o virulencefinder_results/
			const expectedCmd = 'virulencefinder -i assembly/assembly.fasta -o virulencefinder_results/';
			if (!args.includes('-i')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const iIdx = args.indexOf('-i');
			const inputFile = args[iIdx + 1];
			if (!inputFile || !inputFile.endsWith('.fasta')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing or invalid input file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mVirulenceFinder requires: assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -o virulencefinder_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'integron_finder') {
			// integron_finder assembly/assembly.fasta --outdir integron_results/
			const expectedCmd = 'integron_finder assembly/assembly.fasta --outdir integron_results/';
			const inputFile = args.find(a => a.endsWith('.fasta'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input assembly file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('--outdir')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (--outdir flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --outdir integron_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'isescan') {
			// isescan --seqfile assembly/assembly.fasta --output isescan_results/
			const expectedCmd = 'isescan --seqfile assembly/assembly.fasta --output isescan_results/';
			if (!args.includes('--seqfile')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing sequence file (--seqfile flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: ${expectedCmd}\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const sIdx = args.indexOf('--seqfile');
			const seqFile = args[sIdx + 1];
			if (!seqFile || !seqFile.endsWith('.fasta')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing or invalid sequence file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mISEScan requires: assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('--output')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (--output flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --output isescan_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		// PacBio/Long-read tools
		if (command === 'NanoPlot') {
			// NanoPlot --fastq sample_01_hifi.fastq.gz -o nanoplot_results/
			if (!args.includes('--fastq')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input file (--fastq flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: NanoPlot --fastq <input.fastq.gz> -o nanoplot_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const fIdx = args.indexOf('--fastq');
			const fastqFile = args[fIdx + 1];
			if (!fastqFile || !fastqFile.endsWith('.fastq.gz')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing or invalid FASTQ file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mNanoPlot requires a .fastq.gz file (e.g., sample_01_hifi.fastq.gz or sample_01_nanopore.fastq.gz)\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: -o nanoplot_results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'filtlong') {
			// filtlong --min_length 5000 --min_mean_q 20 sample_01_hifi.fastq.gz | gzip > filtered/sample_01_filtered.fastq.gz
			if (!args.includes('--min_length')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing minimum length (--min_length flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: filtlong --min_length <len> --min_mean_q <qual> <input.fastq.gz>\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('--min_mean_q') && !args.includes('--keep_percent')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing quality filter (--min_mean_q or --keep_percent flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[33mRequired: --min_mean_q 20 or --keep_percent 90\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const fastqFile = args.find(a => a.endsWith('.fastq.gz') && !a.includes('filtered'));
			if (!fastqFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input FASTQ file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mFiltlong requires: sample_01_hifi.fastq.gz, sample_01_nanopore.fastq.gz, or trimmed/sample_01_trimmed.fastq.gz\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'flye') {
			// flye --pacbio-hifi filtered/sample_01_filtered.fastq.gz -o assembly/ --threads 8
			// flye --nano-hq filtered/sample_01_filtered.fastq.gz -o assembly/ --threads 8
			if (!args.includes('--pacbio-hifi') && !args.includes('--nano-hq') && !args.includes('--nano-raw')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing read type flag\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: flye --pacbio-hifi <reads.fastq.gz> -o assembly/\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mOr: flye --nano-hq <reads.fastq.gz> -o assembly/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const inputFile = args.find(a => a.endsWith('.fastq.gz'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input FASTQ file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mFlye requires filtered reads: filtered/sample_01_filtered.fastq.gz\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: flye --pacbio-hifi filtered/sample_01_filtered.fastq.gz -o assembly/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'medaka_consensus') {
			// medaka_consensus -i filtered/sample_01_filtered.fastq.gz -d assembly/assembly.fasta -o polished/ -m r941_min_hac_g507
			if (!args.includes('-i')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input reads (-i flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: medaka_consensus -i <reads.fastq.gz> -d <assembly.fasta> -o polished/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-d')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing draft assembly (-d flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mMedaka requires: -d assembly/assembly.fasta\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output directory (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: medaka_consensus -i reads.fq.gz -d assembly.fasta -o polished/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'porechop') {
			// porechop -i sample_01_nanopore.fastq.gz -o trimmed/sample_01_trimmed.fastq.gz
			if (!args.includes('-i')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input file (-i flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: porechop -i <input.fastq.gz> -o <output.fastq.gz>\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('-o')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing output file (-o flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: porechop -i sample_01_nanopore.fastq.gz -o trimmed/sample_01_trimmed.fastq.gz\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'kraken2') {
			// kraken2 --db standard --threads 8 --report kraken_report.txt filtered/sample_01_filtered.fastq.gz > kraken_output.txt
			if (!args.includes('--db')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing database (--db flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[31mUsage: kraken2 --db standard --report <report.txt> <input.fastq.gz>\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			if (!args.includes('--report')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing report file (--report flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: kraken2 --db standard --report kraken_report.txt reads.fastq.gz\x1b[0m`);
				writePrompt(ctx);
				return;
			}
			const inputFile = args.find(a => a.endsWith('.fastq.gz'));
			if (!inputFile) {
				ctx.terminal.writeln(`\x1b[31mError: Missing input FASTQ file\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mKraken2 requires: filtered/sample_01_filtered.fastq.gz\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		// Amplicon/16S tools
		if (command === 'cutadapt') {
			// cutadapt -g PRIMER -G PRIMER -o output_R1 -p output_R2 input_R1 input_R2
			if (!args.includes('-g') && !args.includes('-G')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing primer sequence (-g/-G flag)\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: cutadapt -g GTGCCAGCMGCCGCGGTAA -G GGACTACHVGGGTWTCTAAT -o trimmed/R1.fq.gz -p trimmed/R2.fq.gz R1.fastq.gz R2.fastq.gz\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'qiime') {
			// QIIME2 has many subcommands - just validate that there's a subcommand
			if (args.length === 0) {
				ctx.terminal.writeln(`\x1b[31mError: Missing QIIME2 subcommand\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mAvailable: tools, dada2, feature-classifier, taxa, diversity, phylogeny, etc.\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: qiime dada2 denoise-paired --i-demultiplexed-seqs demux.qza ...\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'biom') {
			// biom convert -i input.biom -o output.tsv --to-tsv
			if (args.length === 0 || !args.includes('convert')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing BIOM subcommand\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: biom convert -i feature-table.biom -o feature-table.tsv --to-tsv\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		if (command === 'sourcetracker2') {
			// sourcetracker2 gibbs --table-path table.biom --metadata-path metadata.tsv ...
			if (args.length === 0) {
				ctx.terminal.writeln(`\x1b[31mError: Missing SourceTracker2 subcommand\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: sourcetracker2 gibbs --table-path feature-table.biom --metadata-path source-metadata.tsv --output-dir results/\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		// R/RMarkdown tools
		if (command === 'Rscript') {
			// Rscript -e "R code here"
			if (!args.includes('-e')) {
				ctx.terminal.writeln(`\x1b[31mError: Missing -e flag for R expression\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mExample: Rscript -e "install.packages('ggplot2')"\x1b[0m`);
				writePrompt(ctx);
				return;
			}
		}

		await executeBioTool(command, args, cmd, ctx);
		return;
	}

	// Unknown command
	ctx.terminal.writeln(`\x1b[31mbash: ${command}: command not found\x1b[0m`);
	ctx.terminal.writeln(`\x1b[90mType 'help' for available commands\x1b[0m`);
	writePrompt(ctx);
}

export function showHelp(ctx: TerminalContext) {
	ctx.terminal.writeln('');
	ctx.terminal.writeln('\x1b[1;33m════════════════════════════════════════════════════════\x1b[0m');
	ctx.terminal.writeln('\x1b[1;33m  BioLearn Terminal - Available Commands\x1b[0m');
	ctx.terminal.writeln('\x1b[1;33m════════════════════════════════════════════════════════\x1b[0m');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('\x1b[1;36mFile Navigation:\x1b[0m');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('  ls [path]       List directory contents');
	ctx.terminal.writeln('  cd [path]       Change directory');
	ctx.terminal.writeln('  pwd             Print working directory');
	ctx.terminal.writeln('  cat [file]      View file contents');
	ctx.terminal.writeln('  head [file]     View first 10 lines');
	ctx.terminal.writeln('  tail [file]     View last 10 lines');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('\x1b[1;36mBioinformatics Tools:\x1b[0m');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('  \x1b[1;33mPhase 1 - QC & Assembly:\x1b[0m');
	ctx.terminal.writeln('  \x1b[32mseqkit stats\x1b[0m    Read statistics (~3s)');
	ctx.terminal.writeln('  \x1b[32mfastqc\x1b[0m          Quality control (~10s)');
	ctx.terminal.writeln('  \x1b[32mtrimmomatic\x1b[0m     Read trimming (~45s)');
	ctx.terminal.writeln('  \x1b[32municycler\x1b[0m       Genome assembly (~3-5min)');
	ctx.terminal.writeln('  \x1b[32mbandage\x1b[0m         Visualize assembly graph (~5s)');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('  \x1b[1;33mPhase 2 - QC & Analysis:\x1b[0m');
	ctx.terminal.writeln('  \x1b[32mquast\x1b[0m           Assembly QC (~20s)');
	ctx.terminal.writeln('  \x1b[32mcheckm\x1b[0m          Genome completeness (~30s)');
	ctx.terminal.writeln('  \x1b[32mbusco\x1b[0m           BUSCO completeness (~45s)');
	ctx.terminal.writeln('  \x1b[32mconfindr\x1b[0m        Contamination detection (~15s)');
	ctx.terminal.writeln('  \x1b[32mprokka\x1b[0m          Genome annotation (~1-2min)');
	ctx.terminal.writeln('  \x1b[32mbakta\x1b[0m           Gene annotation (~1-2min)');
	ctx.terminal.writeln('  \x1b[32mabricate\x1b[0m        AMR screening (~10s)');
	ctx.terminal.writeln('  \x1b[32mresfinder\x1b[0m       Detailed AMR detection (~15s)');
	ctx.terminal.writeln('  \x1b[32mvirulencefinder\x1b[0m Virulence genes (~15s)');
	ctx.terminal.writeln('  \x1b[32mmlst\x1b[0m            Sequence typing (~5s)');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('  \x1b[1;33mPhase 3 - Plasmid & Mobile Elements:\x1b[0m');
	ctx.terminal.writeln('  \x1b[32mmob_recon\x1b[0m       Plasmid reconstruction (~30s)');
	ctx.terminal.writeln('  \x1b[32mplaton\x1b[0m          Plasmid detection (~20s)');
	ctx.terminal.writeln('  \x1b[32mplasmidfinder\x1b[0m   Replicon typing (~10s)');
	ctx.terminal.writeln('  \x1b[32mintegron_finder\x1b[0m Integron detection (~30s)');
	ctx.terminal.writeln('  \x1b[32misescan\x1b[0m         IS element detection (~45s)');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('  \x1b[1;33mPhase 4 - Phylogenetics:\x1b[0m');
	ctx.terminal.writeln('  \x1b[32msnippy\x1b[0m          Variant calling (~1min)');
	ctx.terminal.writeln('  \x1b[32mroary\x1b[0m           Pan-genome analysis (~2-4min)');
	ctx.terminal.writeln('  \x1b[32miqtree\x1b[0m          Phylogenetic tree (~1-3min)');
	ctx.terminal.writeln('  \x1b[32mgubbins\x1b[0m         Recombination detection (~2-5min)');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('  \x1b[1;33mLong-read Tools (PacBio/Nanopore):\x1b[0m');
	ctx.terminal.writeln('  \x1b[32mNanoPlot\x1b[0m        Long-read QC (~30s)');
	ctx.terminal.writeln('  \x1b[32mporechop\x1b[0m        Adapter trimming (~30s)');
	ctx.terminal.writeln('  \x1b[32mfiltlong\x1b[0m        Long-read filtering (~20s)');
	ctx.terminal.writeln('  \x1b[32mkraken2\x1b[0m         Species identification (~1min)');
	ctx.terminal.writeln('  \x1b[32mflye\x1b[0m            Long-read assembly (~3-6min)');
	ctx.terminal.writeln('  \x1b[32mmedaka_consensus\x1b[0m Assembly polishing (~2-4min)');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('\x1b[1;36mKeyboard Shortcuts:\x1b[0m');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('  ↑/↓             Browse command history');
	ctx.terminal.writeln('  ←/→             Move cursor in command line');
	ctx.terminal.writeln('  Tab             Autocomplete file names');
	ctx.terminal.writeln('  Ctrl+L          Clear screen');
	ctx.terminal.writeln('  Ctrl+C          Cancel running command');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('\x1b[1;36mUtility:\x1b[0m');
	ctx.terminal.writeln('');
	ctx.terminal.writeln('  help            Show this message');
	ctx.terminal.writeln('  clear           Clear terminal');
	ctx.terminal.writeln('');
}

export async function executeBioTool(tool: string, args: string[], fullCmd: string, ctx: TerminalContext) {
	ctx.setIsExecuting(true);
	const times = ctx.getToolExecutionTimes()[tool] || { min: 5, max: 15 };
	const execTime = Math.floor(Math.random() * (times.max - times.min + 1)) + times.min;

	// Check if output is being redirected to a file
	const hasRedirect = args.includes('>');
	const redirectFile = hasRedirect ? args[args.indexOf('>') + 1] : null;

	// Update terminal state for output panel
	ctx.setTerminalState({
		isRunning: true,
		currentCommand: fullCmd,
		progress: 0,
		estimatedTime: execTime
	});

	// Show tool startup with disclaimer
	ctx.terminal.writeln(`\x1b[36m[${tool}]\x1b[0m Starting analysis...`);
	ctx.terminal.writeln(`\x1b[90mEstimated time: ~${execTime}s (Press Ctrl+C to cancel)\x1b[0m`);
	ctx.terminal.writeln(`\x1b[90;3m(Note: This is a simulated duration. Real analysis may take minutes to hours.)\x1b[0m`);
	if (hasRedirect && redirectFile) {
		ctx.terminal.writeln(`\x1b[90mOutput will be saved to: ${redirectFile}\x1b[0m`);
	}
	ctx.terminal.writeln('');

	// Get dynamic tool output
	let toolData: any;
	try {
		toolData = getToolOutput(tool, args, fullCmd, ctx);
	} catch (e) {
		console.error(`[executeBioTool] getToolOutput('${tool}') threw:`, e);
		ctx.terminal.writeln(`\x1b[31mError generating output for ${tool}: ${e}\x1b[0m`);
		ctx.setIsExecuting(false);
		ctx.setTerminalState({ isRunning: false, currentCommand: '', progress: 100, estimatedTime: 0 });
		writePrompt(ctx);
		return;
	}
	const outputLines = toolData?.output?.split('\n') || [];
	const interval = (execTime * 1000) / Math.max(outputLines.length, 10);

	let wasCancelled = false;
	for (let i = 0; i < outputLines.length; i++) {
		await sleep(interval);
		if (!ctx.getIsExecuting()) {
			wasCancelled = true;
			break;
		}

		// Only show output in terminal if NOT redirecting to file
		if (!hasRedirect) {
			ctx.terminal.writeln(outputLines[i]);
		}
		const progress = Math.floor(((i + 1) / outputLines.length) * 100);
		ctx.updateTerminalState(s => ({ ...s, progress }));
	}

	if (wasCancelled) {
		// Tool was cancelled - don't add files to filesystem
		ctx.terminal.writeln('');
		ctx.terminal.writeln(`\x1b[33m⚠ ${tool} cancelled by user\x1b[0m`);
		ctx.terminal.writeln(`\x1b[90mNo output files were created.\x1b[0m`);
	} else if (toolData) {
		// Show completion message for redirected output
		if (hasRedirect && redirectFile) {
			ctx.terminal.writeln(`\x1b[32m✓ Analysis complete\x1b[0m`);
			ctx.terminal.writeln(`\x1b[90mOutput saved to: ${redirectFile}\x1b[0m`);
			ctx.terminal.writeln(`\x1b[90mUse 'cat ${redirectFile}' to view the results.\x1b[0m`);

			// Store redirected output in createdFiles for cat to read later
			// Try to fetch from template file first, fall back to generated output
			const outputPath = redirectFile.startsWith('/') ? redirectFile : `${ctx.getCurrentDir()}/${redirectFile}`;
			try {
				// Check if redirect target is inside a tool output dir (e.g., o_seqkit/o_seqkit_stats.txt)
				const redirectParts = redirectFile.split('/');
				let templateUrl: string = '';
				if (redirectParts.length >= 2 && redirectParts[0].startsWith('o_')) {
					const toolName = redirectParts[0].slice(2); // Strip 'o_' prefix
					const fileName = redirectParts.slice(1).join('/');
					templateUrl = ctx.getToolFileUrl(toolName, fileName);
				} else {
					templateUrl = ctx.getRootFileUrl(redirectFile);
				}
				if (templateUrl) {
					const response = await fetch(templateUrl);
					if (response.ok) {
						ctx.setCreatedFile(outputPath, await response.text());
					} else {
						// Fall back to generated clean output (strip ANSI codes from toolData.output)
						const cleanOutput = toolData.output?.replace(/\x1b\[[0-9;]*m/g, '').trim() || '';
						ctx.setCreatedFile(outputPath, cleanOutput);
					}
				}
			} catch {
				// Fall back to generated clean output
				const cleanOutput = toolData.output?.replace(/\x1b\[[0-9;]*m/g, '').trim() || '';
				ctx.setCreatedFile(outputPath, cleanOutput);
			}
		}
		// Track executed command for dynamic filesystem and step completion
		// Track BOTH for all bio tools:
		// 1. The tool name (for getFilesystem() to create output files)
		// 2. The full command (for StoryPanel step completion matching)
		ctx.updateExecutedCommands(cmds => {
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
		const templateToolFiles = ctx.getTemplateFiles();
		if (templateToolFiles[tool] && templateToolFiles[tool].length > 0) {
			// Template files exist for this tool - use them instead of hardcoded files
			outputFiles = templateToolFiles[tool].map((filename: string) => ({
				name: filename,
				type: ctx.getFileType(filename),
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
			const templateUrl = ctx.getRootFileUrl('o_bandage.png');
			if (templateUrl) {
				chartData = { ...chartData, imagePath: templateUrl };
			}
		}

		ctx.setOutputData({
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

		ctx.terminal.writeln('');
		ctx.terminal.writeln(`\x1b[32m✓ Analysis complete\x1b[0m`);
	}

	ctx.setIsExecuting(false);
	ctx.setTerminalState({ isRunning: false, currentCommand: '', progress: 100, estimatedTime: 0 });
	writePrompt(ctx);
}
