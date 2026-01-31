## Bottom Left Panel — Summary, Output, Notes Values

frontend/src/lib/stores/terminal.ts
Lines 82-332: fileNotes object — per-tool FileNote[] arrays for Notes tab (seqkit, fastqc, trimmomatic, unicycler, Bandage, quast, prokka, abricate, checkm2, plasmidfinder, mlst, plasmidfinder.py).

frontend/src/lib/stores/terminal.ts
Lines 335-376: toolExecutionTimes — min/max seconds per tool (40+ tools). Controls loading progress bar duration.

frontend/src/lib/stores/terminal.ts
Lines 385-389: allowedCommands values. Lines 392-397: blockedCommands values. Lines 400-414: bioTools values.

frontend/src/lib/terminal/tool-outputs.ts
Lines 59-2200+: per-tool output generation — hardcoded output text, summary key-value pairs, file arrays. Each tool block contains inline values for statistics, formatting, filenames.

frontend/src/lib/terminal/filesystem.ts
Lines 4-67: baseFilesystem — hardcoded directory names, filenames per storyline. File content is fetched from the backend API only.

frontend/src/lib/terminal/tool-validation.ts
Lines 2-152: validToolFiles — hardcoded valid input filenames per tool. Lines 155-203: toolRequirements — hardcoded required directory lists per tool.

frontend/src/lib/services/templateService.ts
Lines 32-74: fallbackTemplateFiles — hardcoded tool-to-file mappings.

frontend/src/lib/storylines/tutorial/terminal-outputs.ts
Hardcoded helpTexts object — help text strings per tool per subcommand.

frontend/src/lib/components/OutputPanel.svelte
Line 149: hardcoded fallback '/data/kpneumoniae_demo'. Line 119: hardcoded error "Backend server may not be running". Line 165, 175, 213: hardcoded fallback messages.

frontend/src/lib/stores/terminal.ts
Line 50, 54: hardcoded default directory '/data/outbreak_investigation'. Line 65: API_BASE_URL default '/api'.
