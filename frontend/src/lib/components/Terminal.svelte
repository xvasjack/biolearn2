<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { outputData, terminalState, toolExecutionTimes, allowedCommands, blockedCommands, bioTools, executedCommands, executedSteps, currentDirectory, stopSignal, storylineDataDir, templateFiles, storylineContext, API_BASE_URL } from '$lib/stores/terminal';
	import { get } from 'svelte/store';
	import { getToolFiles, getToolFileUrl, getRootFileUrl, getFileType, formatFileSize, fetchFileContent, fetchRootFileContent, fetchFilesystemStructure } from '$lib/services/templateService';
	import { formatAmrGeneRows, formatMlstRow, formatFileColor } from '$lib/utils/format-utils';
	import { getStorylineStats } from '$lib/storylines/tool-outputs-index';

	// Import extracted terminal modules
	import type { TerminalContext } from '$lib/terminal/types';
	import { getFilesystem, getFilesForDirectory, normalizePath } from '$lib/terminal/filesystem';
	import { executeCommand } from '$lib/terminal/command-executor';

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

	// Track created directories and files for the session
	let createdDirs: Set<string> = new Set();
	let createdFiles: Record<string, string> = {};

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

	// Build TerminalContext for extracted modules
	function getContext(): TerminalContext {
		return {
			terminal,
			getCurrentDir: () => currentDir,
			setCurrentDir: (dir: string) => { currentDir = dir; currentDirectory.set(dir); },
			getIsExecuting: () => isExecuting,
			setIsExecuting: (val: boolean) => { isExecuting = val; },
			getExecutedToolsList: () => executedToolsList,
			getTemplateFilesystem: () => templateFilesystem,
			getCreatedDirs: () => createdDirs,
			addCreatedDir: (dir: string) => { createdDirs.add(dir); },
			getCreatedFiles: () => createdFiles,
			setCreatedFile: (path: string, content: string) => { createdFiles[path] = content; },

			getStorylineDataDir: () => get(storylineDataDir),
			getStorylineContext: () => get(storylineContext),
			getTemplateFiles: () => get(templateFiles),
			getAllowedCommands: () => allowedCommands,
			getBlockedCommands: () => blockedCommands,
			getBioTools: () => bioTools,
			getExecutedCommands: () => get(executedCommands),

			addExecutedCommand: (cmd: string) => {
				executedCommands.update(cmds => {
					if (!cmds.includes(cmd)) return [...cmds, cmd];
					return cmds;
				});
			},
			updateExecutedCommands: (fn: (cmds: string[]) => string[]) => {
				executedCommands.update(fn);
			},
			setOutputData: (data: any) => { outputData.set(data); },
			setTerminalState: (state: any) => { terminalState.set(state); },
			updateTerminalState: (fn: (s: any) => any) => { terminalState.update(fn); },

			fetchFileContent,
			fetchRootFileContent,
			getToolFileUrl: (tool: string, filename: string) => getToolFileUrl(tool, filename),
			getRootFileUrl: (path: string) => getRootFileUrl(path),
			getFileType,
			formatFileSize,
			getToolExecutionTimes: () => toolExecutionTimes,
			getStorylineStats,

			formatAmrGeneRows,
			formatMlstRow,
			formatFileColor
		};
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
				executeCommand(commandBuffer.trim(), getContext());
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
		const ctx = getContext();
		const filesystem = getFilesystem(ctx);

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
