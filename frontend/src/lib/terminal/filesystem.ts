import type { TerminalContext } from './types';

// Base filesystem - limited to the Linux tutorial fallback when templates are unavailable
export const baseFilesystem: Record<string, string[]> = {
	// Linux Tutorial directory (results/ is NOT present initially - created by mkdir step)
	'/data/linux_tutorial': [
		'sample_info.txt', 'sequences/', 'references/', 'scripts/'
	],
	'/data/linux_tutorial/sequences': [
		'sample_R1.fastq', 'sample_R2.fastq'
	],
	'/data/linux_tutorial/references': [
		'genome.fasta', 'annotations.gff'
	],
	'/data/linux_tutorial/scripts': []
};

// Files created by each tool
// Hardcoded tool outputs are disabled; non-tutorial storylines should rely on template files.
export const toolCreatedFiles: Record<string, Record<string, string[]>> = {};

// Normalize a path by resolving . and .. components
export function normalizePath(path: string, currentDir: string): string {
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
export function getFilesystem(ctx: TerminalContext): Record<string, string[]> {
	const fs: Record<string, string[]> = {};
	const templateFilesystem = ctx.getTemplateFilesystem();
	const executedToolsList = ctx.getExecutedToolsList();
	const createdDirs = ctx.getCreatedDirs();
	const createdFiles = ctx.getCreatedFiles();
	const executedCommands = ctx.getExecutedCommands();

	// Start with base filesystem (fallback for paths not in template)
	for (const [path, files] of Object.entries(baseFilesystem)) {fs[path] = [...files];}

	// Merge with template filesystem (loaded from API) - combine entries, don't overwrite
	for (const [path, files] of Object.entries(templateFilesystem)) {
		if (!fs[path]) {
			fs[path] = [...files];
		} else {
			// Merge: add any files from template that aren't already in base
			for (const file of files) {
				if (!fs[path].includes(file)) {
					fs[path].push(file);
				}
			}
		}
	}

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

	const executed = new Set(executedCommands);
	// Only show the list of files after tool commands are executed
	for (const [path, entries] of Object.entries(fs)) {
		fs[path] = entries.filter(entry => {
			if (!entry.startsWith('o_')) return true;
			// Check if entry matches any executed tool (e.g., o_seqkit/ or o_seqkit_stats.txt)
			for (const cmd of executed) {
				if (entry.startsWith(`o_${cmd}/`) || entry.startsWith(`o_${cmd}.`) || entry === `o_${cmd}`) return true;
				// Also match files like o_seqkit_stats.txt (tool name followed by underscore)
				if (entry.startsWith(`o_${cmd}_`)) return true;
			}
			return false;
		});
	}
	return fs;
}

// Get files for a directory (combines base and tool outputs)
export function getFilesForDirectory(dir: string, ctx: TerminalContext): string[] {
	const files: string[] = [];
	const templateFilesystem = ctx.getTemplateFilesystem();
	const executedCommands = ctx.getExecutedCommands();

	// Add base filesystem files
	if (baseFilesystem[dir]) {
		files.push(...baseFilesystem[dir]);
	}

	// Add template filesystem files (override if present)
	if (templateFilesystem[dir]) {
		files.push(...templateFilesystem[dir]);
	}

	// Add tool-created files
	for (const [tool, outputs] of Object.entries(toolCreatedFiles)) {
		if (outputs[dir]) {
			// Skip tool outputs if template filesystem already defines this path
			if (templateFilesystem[dir]) {
				continue;
			}
			// Check if tool was executed
			if (executedCommands.includes(tool)) {
				files.push(...outputs[dir]);
			}
		}
	}

	const executed = new Set(executedCommands);
	const filtered = files.filter(file => {
		const match = file.match(/^o_([^/.]+)(?:[/.]|$)/);
		const tool = match ? match[1] : null;
		if (!tool) return true;
		return executed.has(tool);
	});

	return [...new Set(files)]; // Remove duplicates
}

// Expand glob patterns (like *.fastq.gz or sequences/*.fastq) based on directory files
export function expandGlobPattern(pattern: string, ctx: TerminalContext): string[] {
	const currentDir = ctx.getCurrentDir();

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
	const dirFiles = getFilesForDirectory(targetDir, ctx);

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
