export interface TerminalContext {
	// Terminal instance
	terminal: any;

	// Mutable state
	getCurrentDir: () => string;
	setCurrentDir: (dir: string) => void;
	getIsExecuting: () => boolean;
	setIsExecuting: (val: boolean) => void;
	getExecutedToolsList: () => string[];
	getTemplateFilesystem: () => Record<string, string[]>;
	getCreatedDirs: () => Set<string>;
	addCreatedDir: (dir: string) => void;
	getCreatedFiles: () => Record<string, string>;
	setCreatedFile: (path: string, content: string) => void;

	// Store accessors
	getStorylineDataDir: () => string;
	getStorylineContext: () => any;
	getTemplateFiles: () => any;
	getAllowedCommands: () => Set<string>;
	getBlockedCommands: () => Set<string>;
	getBioTools: () => Set<string>;
	getExecutedCommands: () => string[];

	// Store writers
	addExecutedCommand: (cmd: string) => void;
	updateExecutedCommands: (fn: (cmds: string[]) => string[]) => void;
	setOutputData: (data: any) => void;
	setTerminalState: (state: any) => void;
	updateTerminalState: (fn: (s: any) => any) => void;

	// Services
	fetchFileContent: (tool: string, filename: string) => Promise<string | null>;
	fetchRootFileContent: (path: string) => Promise<string | null>;
	getToolFileUrl: (tool: string, filename: string) => string;
	getRootFileUrl: (path: string) => string;
	getFileType: (filename: string) => string;
	formatFileSize: (size: number) => string;
	getToolExecutionTimes: () => Record<string, { min: number; max: number }>;
	getStorylineStats: (category: string, storyline: string) => any;

	// Formatting utilities
	formatAmrGeneRows: (...args: any[]) => any;
	formatMlstRow: (...args: any[]) => any;
	formatFileColor: (name: string) => string;
}

export interface ToolOutput {
	output: string;
	summary?: Record<string, string>;
	chartData?: any;
	files: { name: string; type: string; size: string }[];
}
