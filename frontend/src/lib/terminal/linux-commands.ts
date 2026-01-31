import type { TerminalContext } from './types';
import { getFilesystem, getFilesForDirectory, expandGlobPattern, normalizePath, embeddedFileContents } from './filesystem';
import { helpTexts as tutorialHelpTexts } from '$lib/storylines/tutorial/terminal-outputs';
import { helpTexts as wgsBacteriaHelpTexts } from '$lib/storylines/wgs-bacteria/terminal-outputs';

export function handleLs(args: string[], ctx: TerminalContext) {
	const filesystem = getFilesystem(ctx);
	const path = args[0] || ctx.getCurrentDir();

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
				: `${ctx.getCurrentDir()}/${dirPart}`.replace(/\/+/g, '/');
		} else {
			// Just a pattern in current directory: "*.fastq"
			dirPath = ctx.getCurrentDir();
			pattern = path;
		}

		// Get files in the target directory
		const dirFiles = filesystem[dirPath] || [];

		if (dirFiles.length === 0) {
			ctx.terminal.writeln(`\x1b[31mls: cannot access '${path}': No such file or directory\x1b[0m`);
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
			ctx.terminal.writeln(`\x1b[31mls: cannot access '${path}': No such file or directory\x1b[0m`);
			return;
		}

		// Format and display matching files with directory prefix
		const dirPrefix = path.includes('/') ? path.substring(0, path.lastIndexOf('/') + 1) : '';
		const formatted = matches.map(f => ctx.formatFileColor(dirPrefix + f));

		ctx.terminal.writeln(formatted.join('  '));
		return;
	}

	// Standard directory listing (no wildcards)
	const fullPath = path.startsWith('/') ? path : `${ctx.getCurrentDir()}/${path}`.replace(/\/+/g, '/').replace(/\/$/, '');
	const files = filesystem[fullPath] || [];

	if (files.length === 0) {
		ctx.terminal.writeln('\x1b[90m(empty directory)\x1b[0m');
		return;
	}

	const formatted = files.map(ctx.formatFileColor);

	// Display in columns
	ctx.terminal.writeln(formatted.join('  '));
}

export function handleCd(args: string[], ctx: TerminalContext) {
	const filesystem = getFilesystem(ctx);
	const dataDir = ctx.getStorylineDataDir();

	if (args.length === 0 || args[0] === '~') {
		ctx.setCurrentDir(dataDir);
		return;
	}

	let targetPath = args[0];

	// Handle .. (parent directory)
	if (targetPath === '..' || targetPath === '../' || targetPath.startsWith('../')) {
		const parts = ctx.getCurrentDir().split('/').filter(p => p);
		if (parts.length > 0) {
			parts.pop();
		}
		if (targetPath.startsWith('../')) {
			// Handle ../something
			const remaining = targetPath.slice(3);
			if (remaining) {
				ctx.setCurrentDir('/' + parts.join('/'));
				handleCd([remaining], ctx);
				return;
			}
		}
		let newDir = parts.length > 0 ? '/' + parts.join('/') : '/data';
		// Don't go above /data - reset to initial directory
		if (!newDir.startsWith('/data')) {
			newDir = dataDir;
		}
		ctx.setCurrentDir(newDir);
		return;
	}

	// Build full path
	const newPath = targetPath.startsWith('/')
		? targetPath
		: `${ctx.getCurrentDir()}/${targetPath}`.replace(/\/+/g, '/').replace(/\/$/, '');

	// Check if directory exists in filesystem
	if (filesystem[newPath] !== undefined) {
		ctx.setCurrentDir(newPath);
	} else {
		ctx.terminal.writeln(`\x1b[31mbash: cd: ${args[0]}: No such directory\x1b[0m`);
	}
}

export async function handleFileView(cmd: string, args: string[], ctx: TerminalContext) {
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
		ctx.terminal.writeln(`\x1b[31m${cmd}: missing file operand\x1b[0m`);
		return;
	}

	const filesystem = getFilesystem(ctx);

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
			: `${ctx.getCurrentDir()}/${relativeDirPath}`.replace(/\/+/g, '/');
		fullPath = `${dirPath}/${baseName}`;
	} else {
		baseName = filename;
		dirPath = ctx.getCurrentDir();
		fullPath = `${ctx.getCurrentDir()}/${filename}`;
	}

	// Check if file was created during this session (e.g., grep output or copied file)
	if (ctx.getCreatedFiles()[fullPath]) {
		const storedValue = ctx.getCreatedFiles()[fullPath];

		// Check if this is a copied file reference (format: "cp:filename")
		if (storedValue.startsWith('cp:')) {
			const copiedFileName = storedValue.substring(3);
			// Fetch from template API, fallback to embedded content
			const dataDir = ctx.getStorylineDataDir();
			let content = await ctx.fetchRootFileContent(copiedFileName);
			if (!content) {
				const embeddedPath = `${dataDir}/${copiedFileName}`.replace(/\/+/g, '/');
				content = embeddedFileContents[embeddedPath] || null;
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
					ctx.terminal.writeln(line);
				}
				return;
			}
			// API fetch failed
			ctx.terminal.writeln(`\x1b[31m${cmd}: ${filename}: Unable to read file\x1b[0m`);
			return;
		}

		// Regular created file (e.g., grep output)
		const content = storedValue;
		const lines = content.split('\n');
		const maxLines = cmd === 'head' ? numLines : (cmd === 'tail' ? numLines : lines.length);
		const startLine = cmd === 'tail' ? Math.max(0, lines.length - maxLines) : 0;

		for (let i = startLine; i < Math.min(startLine + maxLines, lines.length); i++) {
			ctx.terminal.writeln(lines[i]);
		}
		return;
	}

	// Check if file exists in filesystem
	const filesInDir = filesystem[dirPath] || [];
	const fileExists = filesInDir.some(f => f === baseName || f === baseName + '/');

	if (!fileExists) {
		ctx.terminal.writeln(`\x1b[31m${cmd}: ${filename}: No such file or directory\x1b[0m`);
		return;
	}

	// Check if it's a directory
	if (filesInDir.includes(baseName + '/')) {
		ctx.terminal.writeln(`\x1b[31m${cmd}: ${filename}: Is a directory\x1b[0m`);
		return;
	}

	// Handle binary files
	if (baseName.endsWith('.png') || baseName.endsWith('.svg')) {
		ctx.terminal.writeln(`\x1b[90m[Binary image file - view via Output Files panel]\x1b[0m`);
		return;
	}
	if (baseName.endsWith('.zip')) {
		ctx.terminal.writeln(`\x1b[90m[Compressed archive - download via Output Files panel]\x1b[0m`);
		return;
	}
	// Fetch file content from template API
	const dataDir = ctx.getStorylineDataDir();
	let content: string | null = null;

	// Get relative path from data directory (e.g., 'sequences/sample_R1.fastq')
	const pathParts = fullPath.replace(dataDir, '').split('/').filter(p => p);
	const relativePath = pathParts.join('/');

	// Check if file is in a tool output directory (o_*)
	if (pathParts.length >= 2 && pathParts[0].startsWith('o_')) {
		const tool = pathParts[0].slice(2); // Strip 'o_' prefix — backend adds it back
		content = await ctx.fetchFileContent(tool, baseName);
	} else {
		// Try fetching as root file with full relative path
		content = await ctx.fetchRootFileContent(relativePath);
	}

	// Fallback to embedded file contents if API fetch failed
	if (!content) {
		content = embeddedFileContents[fullPath] || null;
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
			ctx.terminal.writeln(line);
		}
		if (baseName.endsWith('.gz')) {
			ctx.terminal.writeln('');
			ctx.terminal.writeln(`\x1b[90mNote: In real bioinformatics, .gz files are compressed and cannot be viewed directly with ${cmd}.`);
			ctx.terminal.writeln(`Use zcat, zless, or gunzip first to decompress them.\x1b[0m`);
		}
	} else {
		ctx.terminal.writeln(`\x1b[31m${cmd}: ${filename}: Unable to read file\x1b[0m`);
	}
}

export function handleWc(args: string[], fullCmd: string, ctx: TerminalContext) {
	const hasLineFlag = args.includes('-l');
	const filteredArgs = args.filter(a => !a.startsWith('-'));

	if (filteredArgs.length === 0) {
		ctx.terminal.writeln(`\x1b[31mwc: missing file operand\x1b[0m`);
		return;
	}

	const filesystem = getFilesystem(ctx);
	let totalLines = 0;
	let totalWords = 0;
	let totalBytes = 0;
	let fileCount = 0;

	// Handle wildcards
	let filesToProcess: string[] = [];
	for (const pattern of filteredArgs) {
		if (pattern.includes('*')) {
			const expanded = expandGlobPattern(pattern, ctx);
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
				: `${ctx.getCurrentDir()}/${relativeDirPath}`.replace(/\/+/g, '/');
			fullPath = `${dirPath}/${baseName}`;
		} else {
			baseName = filename;
			dirPath = ctx.getCurrentDir();
			fullPath = `${ctx.getCurrentDir()}/${filename}`;
		}

		// Check if file exists
		const filesInDir = filesystem[dirPath] || [];
		const fileExists = filesInDir.some(f => f === baseName);

		if (!fileExists) {
			ctx.terminal.writeln(`\x1b[31mwc: ${filename}: No such file or directory\x1b[0m`);
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
			ctx.terminal.writeln(`  ${lines.toString().padStart(7)} ${filename}`);
		} else {
			ctx.terminal.writeln(`  ${lines.toString().padStart(7)} ${words.toString().padStart(7)} ${bytes.toString().padStart(7)} ${filename}`);
		}

		totalLines += lines;
		totalWords += words;
		totalBytes += bytes;
		fileCount++;
	}

	// Show total if multiple files
	if (fileCount > 1) {
		if (hasLineFlag) {
			ctx.terminal.writeln(`  ${totalLines.toString().padStart(7)} total`);
		} else {
			ctx.terminal.writeln(`  ${totalLines.toString().padStart(7)} ${totalWords.toString().padStart(7)} ${totalBytes.toString().padStart(7)} total`);
		}
	}
}

export function handleMkdir(args: string[], ctx: TerminalContext) {
	const hasParentFlag = args.includes('-p');
	const filteredArgs = args.filter(a => !a.startsWith('-'));

	if (filteredArgs.length === 0) {
		ctx.terminal.writeln(`\x1b[31mmkdir: missing operand\x1b[0m`);
		return;
	}

	for (const dir of filteredArgs) {
		// Use normalizePath to handle ./ and ../ properly
		const fullPath = normalizePath(dir, ctx.getCurrentDir());

		if (hasParentFlag) {
			// Create all parent directories
			const parts = fullPath.split('/').filter(p => p);
			let currentPath = '';
			for (const part of parts) {
				currentPath += '/' + part;
				ctx.addCreatedDir(currentPath);
			}
			ctx.terminal.writeln(`\x1b[32m✓ Created directory: ${dir}\x1b[0m`);
		} else {
			// Check if parent exists
			const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
			const filesystem = getFilesystem(ctx);

			if (!filesystem[parentPath] && !ctx.getCreatedDirs().has(parentPath)) {
				ctx.terminal.writeln(`\x1b[31mmkdir: cannot create directory '${dir}': No such file or directory\x1b[0m`);
				ctx.terminal.writeln(`\x1b[90mTip: Use mkdir -p to create parent directories\x1b[0m`);
				continue;
			}
			ctx.addCreatedDir(fullPath);
			ctx.terminal.writeln(`\x1b[32m✓ Created directory: ${dir}\x1b[0m`);
		}
	}
}

export function handleCp(args: string[], ctx: TerminalContext) {
	const hasRecursiveFlag = args.includes('-r') || args.includes('-R');
	const filteredArgs = args.filter(a => !a.startsWith('-'));

	if (filteredArgs.length < 2) {
		ctx.terminal.writeln(`\x1b[31mcp: missing destination file operand\x1b[0m`);
		return;
	}

	const source = filteredArgs[0];
	const dest = filteredArgs[1];
	const filesystem = getFilesystem(ctx);

	// Resolve source path using normalizePath to handle ./ and ../
	const sourcePath = normalizePath(source, ctx.getCurrentDir());

	// Check if source is a directory
	const sourceIsDir = filesystem[sourcePath] !== undefined;

	if (sourceIsDir && !hasRecursiveFlag) {
		ctx.terminal.writeln(`\x1b[31mcp: -r not specified; omitting directory '${source}'\x1b[0m`);
		return;
	}

	// Get source filename
	const sourceFile = sourcePath.substring(sourcePath.lastIndexOf('/') + 1);

	// Resolve destination path - include filename if dest is a directory or '.'
	let destPath: string;
	if (dest === '.') {
		destPath = `${ctx.getCurrentDir()}/${sourceFile}`;
	} else if (dest.endsWith('/') || filesystem[normalizePath(dest, ctx.getCurrentDir())] !== undefined) {
		// Destination is a directory
		destPath = `${normalizePath(dest, ctx.getCurrentDir())}/${sourceFile}`;
	} else {
		destPath = normalizePath(dest, ctx.getCurrentDir());
	}

	// Simulate copy success
	if (sourceIsDir) {
		ctx.addCreatedDir(destPath);
		ctx.terminal.writeln(`\x1b[32m✓ Copied directory: ${source} -> ${dest}\x1b[0m`);
	} else {
		// Check source file exists
		const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/';
		const filesInDir = filesystem[sourceDir] || [];

		if (!filesInDir.includes(sourceFile)) {
			ctx.terminal.writeln(`\x1b[31mcp: cannot stat '${source}': No such file or directory\x1b[0m`);
			return;
		}

		// Store the source file reference with a special marker
		// Format: "cp:sourcePath" to indicate this is a copied file reference
		ctx.setCreatedFile(destPath, `cp:${sourceFile}`);
		ctx.terminal.writeln(`\x1b[32m✓ Copied: ${source} -> ${dest}\x1b[0m`);
	}
}

export function handleGrep(args: string[], fullCmd: string, ctx: TerminalContext) {
	const hasCaseInsensitive = args.includes('-i');
	const hasCount = args.includes('-c');
	const filteredArgs = args.filter(a => !a.startsWith('-'));

	if (filteredArgs.length < 2) {
		ctx.terminal.writeln(`\x1b[31mUsage: grep [OPTIONS] PATTERN FILE\x1b[0m`);
		return;
	}

	const pattern = filteredArgs[0].replace(/^["']|["']$/g, ''); // Remove quotes
	const filename = filteredArgs[1];
	const filesystem = getFilesystem(ctx);

	// Resolve path
	let dirPath: string;
	let baseName: string;

	if (filename.includes('/')) {
		const parts = filename.split('/');
		baseName = parts.pop() || '';
		const relativeDirPath = parts.join('/');
		dirPath = relativeDirPath.startsWith('/')
			? relativeDirPath
			: `${ctx.getCurrentDir()}/${relativeDirPath}`.replace(/\/+/g, '/');
	} else {
		baseName = filename;
		dirPath = ctx.getCurrentDir();
	}

	// Check if file exists
	const filesInDir = filesystem[dirPath] || [];
	const fileExists = filesInDir.some(f => f === baseName);

	if (!fileExists) {
		ctx.terminal.writeln(`\x1b[31mgrep: ${filename}: No such file or directory\x1b[0m`);
		return;
	}

	// Check for redirect
	const hasAppendRedirect = fullCmd.includes('>>');
	const hasOverwriteRedirect = !hasAppendRedirect && fullCmd.includes('>');
	const hasRedirect = hasAppendRedirect || hasOverwriteRedirect;

	// Grep file contents - use embedded content as source of truth
	let matchCount = 0;
	let matches: string[] = [];

	const fullPath = filename.includes('/')
		? (filename.startsWith('/') ? filename : `${ctx.getCurrentDir()}/${filename}`.replace(/\/+/g, '/'))
		: `${dirPath}/${baseName}`;
	const fileContent = embeddedFileContents[fullPath];

	if (fileContent) {
		const lines = fileContent.split('\n');
		const flags = hasCaseInsensitive ? 'i' : '';
		let regex: RegExp;
		try {
			regex = new RegExp(pattern, flags);
		} catch {
			regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
		}
		for (const line of lines) {
			if (regex.test(line)) {
				matches.push(line);
			}
		}
		matchCount = matches.length;
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
					: `${ctx.getCurrentDir()}/${outputDirRel}`.replace(/\/+/g, '/');
				outputPath = `${outputDirPath}/${outputName}`;

				// Check if output directory exists
				if (!filesystem[outputDirPath] && !ctx.getCreatedDirs().has(outputDirPath)) {
					ctx.terminal.writeln(`\x1b[31mgrep: ${outputFile}: No such file or directory\x1b[0m`);
					return;
				}
			} else {
				outputPath = `${ctx.getCurrentDir()}/${outputFile}`;
			}

			// Track the created file with actual content
			ctx.setCreatedFile(outputPath, matches.join('\n'));
			ctx.terminal.writeln(`\x1b[32m✓ Results saved to ${outputFile}\x1b[0m`);
		} else {
			ctx.terminal.writeln(`\x1b[32m✓ Results saved to file\x1b[0m`);
		}
	} else if (hasCount) {
		ctx.terminal.writeln(matchCount.toString());
	} else {
		for (const match of matches) {
			// Highlight the pattern in the output
			const regex = new RegExp(`(${pattern})`, hasCaseInsensitive ? 'gi' : 'g');
			const highlighted = match.replace(regex, '\x1b[1;31m$1\x1b[0m');
			ctx.terminal.writeln(highlighted);
		}
		if (matches.length === 0 && matchCount === 0) {
			// No output for no matches (standard grep behavior)
		}
	}
}

export function handleBioToolHelp(tool: string, args: string[], ctx: TerminalContext) {
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
		ctx.terminal.writeln(line);
	}
	// Store the full command (e.g., 'seqkit --help', 'seqkit stats --help')
	// to ensure each help step is tracked separately
	const fullCmd = `${tool} ${args.join(' ')}`.trim();
	ctx.updateExecutedCommands(cmds => {
		if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
		return cmds;
	});
}
