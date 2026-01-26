/**
 * Template Service - Handles fetching template files from the backend API
 *
 * This service provides functions to:
 * - Get list of files available for each tool in a storyline
 * - Fetch file contents for display in OutputPanel
 * - Handle both tool-specific files (in o_tool/ folders) and root files (like o_bandage.png)
 */

import { get } from 'svelte/store';
import { storylineContext, API_BASE_URL, templateFiles, templateRootFiles } from '$lib/stores/terminal';

export interface StorylineFiles {
	category: string;
	storyline: string;
	tools: Record<string, string[]>; // tool_name -> list of filenames
	root_files: string[]; // Files directly in storyline folder
}

export interface TemplateFile {
	name: string;
	path: string;
	size: number;
	is_directory: boolean;
}

// Cache for storyline files to avoid repeated API calls
let filesCache: StorylineFiles | null = null;
let cacheKey: string | null = null;

/**
 * Get all files available in the current storyline
 */
export async function getStorylineFiles(): Promise<StorylineFiles | null> {
	const context = get(storylineContext);
	if (!context) {
		console.warn('No storyline context set');
		return null;
	}

	const key = `${context.category}/${context.storyline}`;

	// Return cached result if available
	if (filesCache && cacheKey === key) {
		return filesCache;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/templates/${context.category}/${context.storyline}/files`);
		if (!response.ok) {
			console.error('Failed to fetch storyline files:', response.statusText);
			return null;
		}

		filesCache = await response.json();
		cacheKey = key;
		return filesCache;
	} catch (error) {
		console.error('Error fetching storyline files:', error);
		return null;
	}
}

/**
 * Get files for a specific tool
 */
export async function getToolFiles(tool: string): Promise<string[]> {
	const files = await getStorylineFiles();
	if (!files) return [];

	return files.tools[tool] || [];
}

/**
 * Get the URL for a tool output file
 */
export function getToolFileUrl(tool: string, filename: string): string {
	const context = get(storylineContext);
	if (!context) return '';

	return `${API_BASE_URL}/templates/${context.category}/${context.storyline}/${tool}/${filename}`;
}

/**
 * Get the URL for a root file (file directly in storyline folder)
 */
export function getRootFileUrl(filename: string): string {
	const context = get(storylineContext);
	if (!context) return '';

	return `${API_BASE_URL}/templates/${context.category}/${context.storyline}/root/${filename}`;
}

/**
 * Fetch file content as text
 */
export async function fetchFileContent(tool: string, filename: string): Promise<string | null> {
	const url = getToolFileUrl(tool, filename);
	if (!url) return null;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error('Failed to fetch file content:', response.statusText);
			return null;
		}

		return await response.text();
	} catch (error) {
		console.error('Error fetching file content:', error);
		return null;
	}
}

/**
 * Fetch root file content as text
 */
export async function fetchRootFileContent(filename: string): Promise<string | null> {
	const url = getRootFileUrl(filename);
	if (!url) return null;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error('Failed to fetch root file content:', response.statusText);
			return null;
		}

		return await response.text();
	} catch (error) {
		console.error('Error fetching root file content:', error);
		return null;
	}
}

/**
 * Check if a tool has template files available
 */
export async function hasToolFiles(tool: string): Promise<boolean> {
	const files = await getToolFiles(tool);
	return files.length > 0;
}

/**
 * Clear the cache (call when switching storylines)
 */
export function clearCache(): void {
	filesCache = null;
	cacheKey = null;
}

/**
 * Load template files for the current storyline and populate stores
 * Call this when initializing a storyline
 */
export async function loadTemplateFiles(): Promise<boolean> {
	const files = await getStorylineFiles();
	if (!files) {
		templateFiles.set({});
		templateRootFiles.set([]);
		return false;
	}

	templateFiles.set(files.tools);
	templateRootFiles.set(files.root_files);
	return true;
}

/**
 * Set the storyline context and load template files
 */
export async function initializeStoryline(category: string, storyline: string): Promise<boolean> {
	// Clear existing cache and stores
	clearCache();
	templateFiles.set({});
	templateRootFiles.set([]);

	// Set the new context
	storylineContext.set({ category, storyline });

	// Load template files for this storyline
	return await loadTemplateFiles();
}

export interface FilesystemStructure {
	data_dir: string;
	filesystem: Record<string, string[]>;
}

/**
 * Fetch the filesystem structure for a storyline from the template directory
 */
export async function fetchFilesystemStructure(dataDir: string): Promise<FilesystemStructure | null> {
	const context = get(storylineContext);
	if (!context) {
		console.warn('No storyline context set');
		return null;
	}

	try {
		const response = await fetch(
			`${API_BASE_URL}/templates/${context.category}/${context.storyline}/filesystem?data_dir=${encodeURIComponent(dataDir)}`
		);
		if (!response.ok) {
			console.error('Failed to fetch filesystem structure:', response.statusText);
			return null;
		}

		return await response.json();
	} catch (error) {
		console.error('Error fetching filesystem structure:', error);
		return null;
	}
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
	const lastDot = filename.lastIndexOf('.');
	return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
}

/**
 * Get file type category for display
 */
export function getFileType(filename: string): string {
	const ext = getFileExtension(filename);
	const typeMap: Record<string, string> = {
		'html': 'html',
		'txt': 'text',
		'tsv': 'tsv',
		'csv': 'csv',
		'json': 'json',
		'fasta': 'fasta',
		'fa': 'fasta',
		'fna': 'fasta',
		'faa': 'fasta',
		'fastq': 'fastq',
		'fq': 'fastq',
		'gff': 'gff',
		'gbk': 'genbank',
		'gfa': 'gfa',
		'log': 'log',
		'png': 'png',
		'svg': 'svg',
		'pdf': 'pdf',
		'zip': 'zip',
	};
	return typeMap[ext] || 'unknown';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
