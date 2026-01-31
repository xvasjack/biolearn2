import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, readdir, stat } from 'fs/promises';
import type { Dirent } from 'fs';
import { join, extname } from 'path';

const TEMPLATE_DIR = join(process.cwd(), '..', 'template');

const MEDIA_TYPES: Record<string, string> = {
	'.html': 'text/html',
	'.txt': 'text/plain',
	'.tsv': 'text/tab-separated-values',
	'.csv': 'text/csv',
	'.json': 'application/json',
	'.fasta': 'text/plain',
	'.fa': 'text/plain',
	'.fna': 'text/plain',
	'.faa': 'text/plain',
	'.fastq': 'text/plain',
	'.fq': 'text/plain',
	'.gff': 'text/plain',
	'.gbk': 'text/plain',
	'.gfa': 'text/plain',
	'.log': 'text/plain',
	'.tab': 'text/tab-separated-values',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.zip': 'application/zip',
	'.gz': 'application/gzip'
};

export const GET: RequestHandler = async ({ params, url }) => {
	const pathParts = params.path?.split('/') || [];

	if (pathParts.length < 2) {
		throw error(400, 'Invalid path');
	}

	const category = pathParts[0];
	const storyline = pathParts[1];

	// Handle /files endpoint: GET /api/templates/{category}/{storyline}/files
	if (pathParts.length === 3 && pathParts[2] === 'files') {
		const storylinePath = join(TEMPLATE_DIR, category, storyline);
		try {
			const entries = await readdir(storylinePath, { withFileTypes: true });
			const tools: Record<string, string[]> = {};
			const root_files: string[] = [];

			for (const entry of entries) {
				if (entry.name === '.gitkeep') continue;

				if (entry.isDirectory() && entry.name.startsWith('o_')) {
					const toolName = entry.name.slice(2);
					const toolPath = join(storylinePath, entry.name);
					const toolEntries = await readdir(toolPath);
					const files = toolEntries.filter(f => f !== '.gitkeep').sort();
					if (files.length > 0) {
						tools[toolName] = files;
					}
				} else if (entry.isFile() && entry.name.startsWith('o_')) {
					root_files.push(entry.name);
				}
			}

			return new Response(JSON.stringify({ category, storyline, tools, root_files: root_files.sort() }), {
				headers: { 'Content-Type': 'application/json' }
			});
		} catch {
			throw error(404, 'Storyline not found');
		}
	}

	// Handle /filesystem endpoint
	if (pathParts.length === 3 && pathParts[2] === 'filesystem') {
		let dataDir = url.searchParams.get('data_dir') || '/data';

		// If data_dir is just /data, append the storyline name
		if (dataDir === '/data') {
			dataDir = `/data/${storyline}`;
		}

		const storylinePath = join(TEMPLATE_DIR, category, storyline);
		const filesystem: Record<string, string[]> = {};

		async function scanDir(dirPath: string, fsPath: string): Promise<void> {
			let entries;
			try {
				entries = await readdir(dirPath, { withFileTypes: true });
			} catch {
				return;
			}

			const items: string[] = [];
			// Sort entries alphabetically
			entries.sort((a: Dirent, b: Dirent) => a.name.localeCompare(b.name));

			for (const entry of entries) {
				if (entry.name === '.gitkeep') continue;

				if (entry.isDirectory()) {
					items.push(entry.name + '/');
					// Recurse into subdirectory
					await scanDir(join(dirPath, entry.name), `${fsPath}/${entry.name}`);
				} else {
					items.push(entry.name);
				}
			}

			filesystem[fsPath] = items;
		}

		await scanDir(storylinePath, dataDir);

		return new Response(JSON.stringify({ data_dir: dataDir, filesystem }), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Handle /root/{filename} endpoint
	if (pathParts.length >= 3 && pathParts[2] === 'root') {
		const filename = pathParts.slice(3).join('/');
		const filePath = join(TEMPLATE_DIR, category, storyline, filename);
		try {
			const data = await readFile(filePath);
			const ext = extname(filename).toLowerCase();
			const contentType = MEDIA_TYPES[ext] || 'application/octet-stream';
			return new Response(data, {
				headers: { 'Content-Type': contentType }
			});
		} catch {
			throw error(404, 'File not found');
		}
	}

	// Handle /{tool}/{filename} endpoint: serves from o_{tool}/{filename}
	if (pathParts.length >= 4) {
		const tool = pathParts[2];
		const filename = pathParts.slice(3).join('/');
		const filePath = join(TEMPLATE_DIR, category, storyline, `o_${tool}`, filename);

		try {
			const data = await readFile(filePath);
			const ext = extname(filename).toLowerCase();
			const contentType = MEDIA_TYPES[ext] || 'application/octet-stream';
			return new Response(data, {
				headers: { 'Content-Type': contentType }
			});
		} catch {
			throw error(404, `File '${filename}' not found in o_${tool}`);
		}
	}

	throw error(400, 'Invalid template path');
};
