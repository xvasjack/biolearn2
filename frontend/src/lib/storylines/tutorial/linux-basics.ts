import type { Storyline } from '../types';

export const linuxBasics: Storyline = {
	id: 'linux-basics',
	category: 'tutorial',
	templateId: 'basic_linux_commands',
	title: 'Linux Command Line Basics',
	subtitle: 'Essential Command Line Skills for Bioinformatics',
	organism: 'N/A',
	technology: 'linux-basics',
	technologyLabel: 'Command Line Fundamentals',
	dataDir: '/data/linux_tutorial',
	toolsUsed: ['pwd', 'ls', 'cd', 'cat', 'head', 'tail', 'wc', 'mkdir', 'cp', 'grep'],
	sections: [
		{
			type: 'intro',
			text: `<strong>Welcome to the Basic Linux Tutorial!</strong>

Before diving into bioinformatics analysis, you need to be comfortable with the Linux command line. This tutorial covers the essential commands you'll use daily when working with sequencing data.`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'context',
			text: `<strong>What you'll learn:</strong>

<ol><li>Getting help with commands</li><li>Navigating the filesystem</li><li>Viewing and inspecting files</li><li>Creating directories</li><li>Searching file contents</li><li>Redirecting output</li></ol>

Let's begin!`,
			hint: null,
			requiredDir: null
		},
		{
			type: 'phase',
			title: 'Phase 0: Getting Started',
			text: 'Learn how to get help and perform basic file operations before diving into bioinformatics.',
			phase: 0
		},
		{
			type: 'task',
			title: 'Step 0a: Get Tool Help',
			text: `Most command-line tools have built-in help. Use the --help flag to see available options for seqkit, a tool you'll use later.`,
			command: 'seqkit --help',
			explanation: 'The --help flag displays usage information, available subcommands, and options for any tool.',
			requiredDir: null,
			parameters: [
				{ name: '--help', desc: 'Display help information' }
			]
		},
		{
			type: 'task',
			title: 'Step 0b: Get Subcommand Help',
			text: `Tools often have subcommands with their own options. Let's see the help for seqkit's stats subcommand.`,
			command: 'seqkit stats --help',
			explanation: 'Subcommands have their own help pages showing specific options for that function.',
			requiredDir: null,
			parameters: [
				{ name: 'stats', desc: 'Subcommand for sequence statistics' },
				{ name: '--help', desc: 'Show stats-specific options' }
			]
		},
		{
			type: 'task',
			title: 'Step 0c: Copy a File',
			text: `Copy files using the cp command. Let's copy a reference file to your working directory.`,
			command: 'cp /data/linux_tutorial/sample_info.txt ./sample_info_copy.txt',
			explanation: 'The cp command copies files. The dot (.) represents the current directory as the destination.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'cp', desc: 'Copy command' },
				{ name: 'source', desc: 'File to copy from' },
				{ name: '.', desc: 'Current directory (destination)' }
			]
		},
		{
			type: 'task',
			title: 'Step 0d: Copy a Directory',
			text: `To copy directories with their contents, use the -r (recursive) flag. Type 1 line at a time.`,
			command: 'ls\ncp -r /data/linux_tutorial/scripts ./my_scripts\nls',
			explanation: 'The -r flag tells cp to copy directories recursively, including all subdirectories and files. The ls commands show the directory contents before and after the copy.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'ls', desc: 'List directory contents (before copy)' },
				{ name: '-r', desc: 'Recursive copy for directories' },
				{ name: './my_scripts', desc: 'New directory name' },
				{ name: 'ls', desc: 'List directory contents (after copy)' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 1: Navigation & Exploration',
			text: 'Master navigating the filesystem - the foundation of all command-line work.',
			phase: 1
		},
		{
			type: 'task',
			title: 'Step 1a: Print Working Directory',
			text: `Find out where you are in the filesystem. The pwd command shows your current location.`,
			command: 'pwd',
			explanation: 'pwd (print working directory) shows the absolute path to your current location.',
			requiredDir: null,
			parameters: [
				{ name: 'pwd', desc: 'Print current directory path' }
			]
		},
		{
			type: 'task',
			title: 'Step 1b: List Directory Contents',
			text: `See what files and directories are in your current location using ls.`,
			command: 'ls',
			explanation: 'ls lists all visible files and directories. Hidden files (starting with .) are not shown by default.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'ls', desc: 'List directory contents' }
			]
		},
		{
			type: 'task',
			title: 'Step 1c: Change Directory',
			text: `Navigate into a subdirectory using cd. Let's go into the sequences folder.`,
			command: 'cd sequences',
			explanation: 'cd (change directory) moves you into the specified directory.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'cd', desc: 'Change directory' },
				{ name: 'sequences', desc: 'Directory to enter' }
			]
		},
		{
			type: 'task',
			title: 'Step 1d: Move Up One Level',
			text: `Go back up one directory using cd .. (two dots represent the parent directory).`,
			command: 'cd ..',
			explanation: 'The .. notation refers to the parent directory, allowing you to move up in the hierarchy.',
			requiredDir: '/data/linux_tutorial/sequences',
			parameters: [
				{ name: '..', desc: 'Parent directory' }
			]
		},
		{
			type: 'task',
			title: 'Step 1e: Return Home',
			text: `Use cd ~ to quickly return to your home directory (the tutorial's starting location).`,
			command: 'cd ~',
			explanation: 'The tilde (~) is a shortcut for your home directory. In this tutorial, it returns you to /data/linux_tutorial.',
			requiredDir: null,
			parameters: [
				{ name: '~', desc: 'Home directory shortcut' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 2: File Inspection',
			text: 'Learn to examine file contents - essential for checking data quality.',
			phase: 2
		},
		{
			type: 'task',
			title: 'Step 2a: View Entire File',
			text: `Use cat to view file content.`,
			command: 'cat sample_info.txt',
			explanation: 'cat (concatenate) outputs the file contents. Note: Use only for small files.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'cat', desc: 'Display file contents' }
			]
		},
		{
			type: 'task',
			title: 'Step 2b: View First Lines',
			text: `For large files, use head to see just the beginning. Let's look at a FASTQ file.`,
			command: 'head sequences/sample_R1.fastq',
			explanation: 'head shows the first 10 lines by default. FASTQ files have 4 lines per read.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'head', desc: 'Show first lines' }
			]
		},
		{
			type: 'task',
			title: 'Step 2c: Specify Line Count',
			text: `Use -n to control how many lines head displays. Let's see exactly 8 lines (2 FASTQ reads).`,
			command: 'head -n 8 sequences/sample_R1.fastq',
			explanation: 'The -n option lets you specify the exact number of lines to show.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: '-n 8', desc: 'Show exactly 8 lines' }
			]
		},
		{
			type: 'task',
			title: 'Step 2d: View Last Lines',
			text: `Use tail to see the end of a file. This is useful for checking if a process completed.`,
			command: 'tail sequences/sample_R1.fastq',
			explanation: 'tail shows the last 10 lines. Use -n to change the number, just like head.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'tail', desc: 'Show last lines' }
			]
		},
		{
			type: 'task',
			title: 'Step 2e: Count Lines',
			text: `Use wc (word count) with -l to count lines in a file. For FASTQ files, divide by 4 to get read count.`,
			command: 'wc -l sequences/sample_R1.fastq',
			explanation: 'wc -l counts lines. FASTQ has 4 lines per read, so 40 lines = 10 reads.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'wc', desc: 'Word/line/byte count' },
				{ name: '-l', desc: 'Count lines only' }
			]
		},
		{
			type: 'task',
			title: 'Step 2f: Full Word Count',
			text: `Without flags, wc shows lines, words, and bytes - useful for understanding file size.`,
			command: 'wc sample_info.txt',
			explanation: 'wc outputs three numbers: lines, words, and bytes (characters).',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'wc', desc: 'Show lines, words, bytes' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 3: File Management',
			text: 'Organize your analysis by creating directories for outputs.',
			phase: 3
		},
		{
			type: 'task',
			title: 'Step 3a: Create a Directory',
			text: `Use mkdir to create a new directory for analysis results.`,
			command: 'mkdir results',
			explanation: 'mkdir (make directory) creates a new folder in the current location.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'mkdir', desc: 'Make directory' },
				{ name: 'results', desc: 'New directory name' }
			]
		},
		{
			type: 'task',
			title: 'Step 3b: Create Nested Directories',
			text: `Use -p to create a directory structure with multiple levels at once.`,
			command: 'mkdir -p results/qc/fastqc',
			explanation: 'The -p flag creates parent directories as needed. Without it, mkdir fails if parents don\'t exist.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: '-p', desc: 'Create parent directories' },
				{ name: 'results/qc/fastqc', desc: 'Nested path to create' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 4: Text Processing',
			text: 'Search and filter file contents - critical for finding information in large datasets.',
			phase: 4
		},
		{
			type: 'task',
			title: 'Step 4a: Search for Patterns',
			text: `Use grep to find lines containing a specific pattern. Let's find quality scores with 'F' (highest quality).`,
			command: 'grep "FFFFF" sequences/sample_R1.fastq',
			explanation: 'grep searches for text patterns and prints matching lines.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'grep', desc: 'Search for patterns' },
				{ name: '"FFFFF"', desc: 'Pattern to search for' }
			]
		},
		{
			type: 'task',
			title: 'Step 4b: Case-Insensitive Search',
			text: `Use -i to ignore case when searching. Let's find all mentions of "sample" regardless of capitalization.`,
			command: 'grep -i "sample" sample_info.txt',
			explanation: 'The -i flag makes the search case-insensitive (matches SAMPLE, Sample, sample, etc.).',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: '-i', desc: 'Ignore case' }
			]
		},
		{
			type: 'task',
			title: 'Step 4c: Count Matches',
			text: `Use -c to count how many lines match a pattern, instead of showing them.`,
			command: 'grep -c "@" sequences/sample_R1.fastq',
			explanation: 'The -c flag counts matching lines. In FASTQ, @ starts each read header, so this counts reads.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: '-c', desc: 'Count matching lines' }
			]
		},
		{
			type: 'phase',
			title: 'Phase 5: Redirection & Wildcards',
			text: 'Save command output to files and work with multiple files efficiently.',
			phase: 5
		},
		{
			type: 'task',
			title: 'Step 5a: Redirect Output to File',
			text: `Use > to save command output to a file instead of displaying it on screen.`,
			command: 'head -n 8 sequences/sample_R1.fastq > results/first_reads.txt',
			explanation: 'The > operator redirects output to a file, creating it if needed or overwriting if it exists.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: '>', desc: 'Redirect output (overwrite)' }
			]
		},
		{
			type: 'task',
			title: 'Step 5b: Append to File',
			text: `Use >> to add output to an existing file without overwriting it.`,
			command: 'head -n 8 sequences/sample_R2.fastq >> results/first_reads.txt',
			explanation: 'The >> operator appends to a file, preserving existing content.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: '>>', desc: 'Redirect output (append)' }
			]
		},
		{
			type: 'task',
			title: 'Step 5c: Use Wildcards',
			text: `The * wildcard matches any characters. Let's list all FASTQ files at once.`,
			command: 'ls sequences/*.fastq',
			explanation: 'The asterisk (*) matches zero or more characters. *.fastq matches all files ending in .fastq.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: '*', desc: 'Wildcard matching any characters' },
				{ name: '*.fastq', desc: 'All files ending in .fastq' }
			]
		},
		{
			type: 'task',
			title: 'Step 5d: Count Multiple Files',
			text: `Combine wildcards with wc to count lines in multiple files at once.`,
			command: 'wc -l sequences/*.fastq',
			explanation: 'Wildcards expand to all matching files, allowing batch operations.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'sequences/*.fastq', desc: 'All FASTQ files in sequences/' }
			]
		},
		{
			type: 'task',
			title: 'Step 5e: Save Search Results',
			text: `Combine grep with redirection to save search results to a file.`,
			command: 'grep "@" sequences/sample_R1.fastq > results/read_headers.txt',
			explanation: 'This saves all read headers to a file for later analysis or record-keeping.',
			requiredDir: '/data/linux_tutorial',
			parameters: [
				{ name: 'grep "@"', desc: 'Find header lines' },
				{ name: '> results/', desc: 'Save to results directory' }
			]
		},
		{
			type: 'complete',
			title: 'Tutorial Complete!',
			text: `**Congratulations!** You've mastered the essential Linux commands for bioinformatics.

---

**Commands Learned:**

| Category | Commands |
|----------|----------|
| Navigation | pwd, ls, cd |
| File Inspection | cat, head, tail, wc |
| File Management | mkdir, cp |
| Text Processing | grep |
| Redirection | >, >> |
| Wildcards | * |

---

**What's Next?**
You're now ready to tackle real bioinformatics workflows! Try the **Exploring K. pneumoniae** tutorial to apply these skills to whole-genome sequencing analysis.`
		}
	]
};
