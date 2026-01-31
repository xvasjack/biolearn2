## Terminal Panel — Error Text

frontend/src/lib/terminal/command-executor.ts
Lines 32-42: blocked command errors ("command not available", "Operation not permitted"). Lines 172-174: "No such file or directory". Per-tool validation errors throughout lines 352-1200+.

frontend/src/lib/terminal/linux-commands.ts
Line 123: cd "No such directory". Line 145: cat/head/tail "missing file operand". Line 223: "No such file or directory". Line 229: "Is a directory". Line 285: "Unable to read file". Lines 234-245: binary/compressed file messages.

## Terminal Panel — Commands

frontend/src/lib/terminal/command-executor.ts
Lines 17-174: executeCommand() routes all commands. pwd (line 57), ls (line 67), cd (line 85), cat/head/tail (line 116), wc/mkdir/cp/grep dispatched to linux-commands.ts. Bio tools dispatched starting line 330+.

frontend/src/lib/terminal/linux-commands.ts
handleLs (line 6), handleCd (line 79), handleFileView (line 127, handles cat/head/tail), handleWc (line 289), handleMkdir (line 376), handleCp (line 414), handleGrep (line 473), handleBioToolHelp (line 591).

frontend/src/lib/stores/terminal.ts
Line 385-389: allowedCommands set (ls, cat, head, tail, pwd, cd, clear, help, wc, mkdir, cp, grep). Lines 392-397: blockedCommands set. Lines 400-414: bioTools set (~37 tools).

## Terminal Panel — Output Files

frontend/src/lib/terminal/tool-outputs.ts
Line 19: getToolOutput() returns { output, summary, files } per tool. Each tool block defines output filenames, types, sizes.

frontend/src/lib/terminal/filesystem.ts
Lines 4-67: baseFilesystem defines o_* directories and their files. Lines 285-298: getFilesystem() filters o_* entries — only visible after tool execution.

frontend/src/lib/terminal/tool-validation.ts
Lines 2-152: validToolFiles — valid input files per tool. Lines 155-203: toolRequirements — required directories per tool.

frontend/src/lib/services/templateService.ts
Lines 32-74: fallbackTemplateFiles — hardcoded fallback file lists when API unavailable.

## Terminal Panel — Summary

frontend/src/lib/components/OutputPanel.svelte
Lines 333-355: renders Summary tab from currentOutput.summary as key-value grid.

frontend/src/lib/terminal/tool-outputs.ts
Each tool returns summary: { key: value } — seqkit (line 73, undefined), fastqc (line 122), multiqc (line 147), trimmomatic (line 174), unicycler (line 317), Bandage (line 363), quast (line 457), prokka (line 515), abricate (line 541), checkm2 (line 579), mlst (line 686), mob_recon (line 754), plasmidfinder (line 1155).

frontend/src/lib/stores/terminal.ts
Line 33: outputData store holds OutputData with summary?: Record<string, string>.

## Story Panel — Command and Parameter

frontend/src/lib/storylines/tutorial/linux-basics.ts
Sections array (line 14+): each task has command (string) and parameters (array of {name, desc}).

frontend/src/lib/storylines/tutorial/kpneumoniae-demo.ts
Same structure: command and parameters per task section.

frontend/src/lib/storylines/wgs-bacteria/*.ts
Same structure for all WGS storylines.

frontend/src/lib/storylines/types.ts
Lines 3-16: StorylineSection interface defines command?: string, parameters?: Array<{name, desc}>.

frontend/src/lib/components/StoryPanel.svelte
Renders command and parameters from storyline sections. Step completion logic at lines 74-144: matches executed commands against section command strings.
