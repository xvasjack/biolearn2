# BioLearn Development Notes

Reference notes for development patterns and fixes in the BioLearn bioinformatics training platform.

## Project Structure

```
biolearn/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── Terminal.svelte      # Main terminal emulator (xterm.js)
│   │   │   │   ├── ThreePanelLayout.svelte
│   │   │   │   ├── StoryPanel.svelte
│   │   │   │   └── OutputPanel.svelte
│   │   │   ├── storylines/
│   │   │   │   ├── tutorial/
│   │   │   │   │   ├── linux-basics.ts       # Tutorial storyline definition
│   │   │   │   │   └── terminal-outputs.ts   # Help texts for tutorial tools
│   │   │   │   └── wgs-bacteria/
│   │   │   │       └── terminal-outputs.ts   # Help texts for WGS tools
│   │   │   └── stores/
│   │   │       └── terminal.ts
│   │   └── routes/
│   │       └── tutorial/
│   │           └── linux-basics/
│   │               └── +page.svelte
```

## Terminal Component (Terminal.svelte)

### Key Functions
- `handleBioToolHelp(tool, args)` - Displays help text for bioinformatics tools
- `executeBioTool(tool, args, fullCmd)` - Simulates tool execution with progress
- `writePrompt()` - Writes the command prompt

### Help Text Handling

Help texts are stored in storyline-specific `terminal-outputs.ts` files and merged at runtime:

```typescript
const helpTexts: Record<string, Record<string, string>> = {
    ...tutorialHelpTexts,
    ...wgsBacteriaHelpTexts  // Later imports override earlier ones
};
```

### Important: Writing Multiline Text to Terminal

**DO NOT** write multiline strings with a single `terminal.writeln()` call:
```typescript
// BAD - causes rendering issues with line positioning
terminal.writeln(helpText);  // where helpText contains \n characters
```

**DO** split and write lines individually:
```typescript
// GOOD - renders correctly
const lines = helpText.split('\n');
for (const line of lines) {
    terminal.writeln(line);
}
```

This is because xterm.js can have issues positioning lines correctly when processing
multiline strings with ANSI escape codes in a single write operation.

## Terminal Output Files Format

Help texts use array of strings joined with newlines:

```typescript
export const helpTexts: Record<string, Record<string, string>> = {
    'toolname': {
        'main': [
            '\x1b[1mtoolname\x1b[0m - Tool description',
            '',
            '\x1b[1mUsage:\x1b[0m',
            '  toolname [command]',
            '',
            '\x1b[1mOptions:\x1b[0m',
            '  -h, --help      Show help',
        ].join('\n'),
        'subcommand': [
            // Subcommand-specific help
        ].join('\n')
    }
};
```

### ANSI Escape Codes Used
- `\x1b[1m` - Bold text ON
- `\x1b[0m` - Reset formatting
- `\x1b[32m` - Green text
- `\x1b[34m` - Blue text
- `\x1b[31m` - Red text
- `\x1b[36m` - Cyan text
- `\x1b[90m` - Gray text (bright black)

### Indentation
- Use **tabs** for source code indentation (not spaces)
- Use **spaces** within strings for CLI-style column alignment:
  ```typescript
  '  stats       simple statistics of FASTA/Q files',
  '  seq         transform sequences',
  ```

## Terminal Configuration

Located in `Terminal.svelte`:

```typescript
const terminalOptions = {
    theme: { /* color scheme */ },
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    fontSize: 14,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 10000
};
```

Uses `FitAddon` to automatically size terminal to container.

## Running the App

```bash
cd biolearn/frontend
npm run dev
```

Access at: http://localhost:5173

## Step Completion Tracking

### Rule: Always Track Full Commands

When tracking executed commands in `Terminal.svelte` for step completion, **always track the full command string**, not just the tool name.

```typescript
// BAD - causes premature step completion
executedCommands.update(cmds => {
    if (!cmds.includes('grep')) return [...cmds, 'grep'];
    return cmds;
});

// GOOD - each step requires its exact command
const fullCmd = cmd.trim();
executedCommands.update(cmds => {
    if (!cmds.includes(fullCmd)) return [...cmds, fullCmd];
    return cmds;
});
```

**Why:** If multiple steps use the same tool (e.g., `grep "FFFFF" file.txt` and `grep "@" file.txt`), tracking only the tool name causes all steps using that tool to be marked complete when any one is executed.

**Files involved:**
- `Terminal.svelte` - tracks commands via `executedCommands.update()`
- `StoryPanel.svelte` - matches commands for step completion (line ~107-118)

**Commands requiring full match** (in `StoryPanel.svelte`):
- `cd`, `cat`, `head`, `tail`, `seqkit`, `wc`, `grep`, `ls`

**Exception: Multi-line commands** use count-based tracking instead. Steps with multiple commands (separated by newlines) check that each tool was executed the required number of times via `ls:1`, `ls:2`, etc. This is handled separately in `StoryPanel.svelte` (lines ~78-101).

When adding new command handlers to Terminal.svelte, follow the pattern used by `head`/`cat`/`tail`/`wc`/`grep`/`ls`.

## Common Issues & Fixes

### Issue: Terminal help text displays with incorrect line positioning
**Cause:** Using `terminal.writeln()` with multiline strings containing ANSI codes
**Fix:** Split the string and write each line individually (see above)

### Issue: Inconsistent whitespace in source files
**Cause:** Mixed tabs and spaces in TypeScript files
**Fix:** Use tabs for indentation consistently; linter will auto-fix

### Issue: Steps marked complete before executed
**Cause:** Command tracked by tool name only instead of full command
**Fix:** Track full command string (see "Step Completion Tracking" section above)
