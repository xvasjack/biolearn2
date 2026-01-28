# Project Reference

Interactive bioinformatics learning platform that teaches sequencing data analysis through guided storylines. Users execute bioinformatics commands in a terminal emulator that plays back pre-computed results.

**Architecture**: SvelteKit frontend + FastAPI backend + Docker

---

## Root Files

| File | Description |
|------|-------------|
| `CLAUDE_NOTES.md` | Development notes and patterns for Terminal component, ANSI codes, step completion tracking |
| `REFERENCE.md` | This file — project directory/file summary |

---

## `backend/` — FastAPI REST API and WebSocket Server

| Path | Description |
|------|-------------|
| `Dockerfile` | Python 3.11 container for backend service |
| `requirements.txt` | Python dependencies (FastAPI, uvicorn, SQLAlchemy, Redis, Celery, websockets) |
| `app/main.py` | FastAPI app setup; CORS, API routes, WebSocket endpoint `/ws/terminal/{session_id}` |
| `app/api/__init__.py` | Router config; includes analysis, narratives, templates, users routers under `/api/` |
| `app/api/templates.py` | Template file serving; lists categories/storylines, returns file structures from `/template/` |
| `app/api/narratives.py` | Narrative content endpoints; defines NarrativeStep and Narrative models |
| `app/api/analysis.py` | Analysis job endpoints; tool registry (fastqc, trimmomatic, etc.) |
| `app/api/payments.py` | Stripe payment integration; checkout sessions, webhooks |
| `app/api/users.py` | User management; registration, profile, progress tracking |
| `app/websocket/__init__.py` | WebSocket connection manager; processes commands, plays back pre-computed results with typing simulation |
| `app/services/template_loader.py` | Loads manifest.json, terminal outputs, and file contents from template directories |
| `app/storage/__init__.py` | Storage layer for command outputs (placeholder for database) |
| `content/results/` | Holds backend analysis output files |

---

## `frontend/` — SvelteKit Interactive Learning Interface

### Config Files

| File | Description |
|------|-------------|
| `Dockerfile` | Node container for frontend service |
| `package.json` | Dependencies: SvelteKit, Vite, Tailwind CSS, xterm.js (terminal), Plotly.js (charts) |
| `svelte.config.js` | SvelteKit configuration with vitePreprocess |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS theming |
| `postcss.config.js` | PostCSS for Tailwind |
| `tsconfig.json` | TypeScript configuration |

### App Root (`src/`)

| File | Description |
|------|-------------|
| `app.html` | Base HTML template |
| `app.css` | Global styles and Tailwind directives |
| `app.d.ts` | TypeScript type augmentations for SvelteKit |

### Assets (`src/lib/assets/`)

| File | Description |
|------|-------------|
| `favicon.svg` | SVG favicon for the application |

### Components (`src/lib/components/`)

| Component | Description |
|-----------|-------------|
| `AuthModal.svelte` | Authentication modal for login/registration |
| `ChangePasswordModal.svelte` | Modal for changing user password |
| `Terminal.svelte` | Terminal emulator shell (xterm.js); state, input handling, tab completion, prompt — delegates command execution and tool output to `src/lib/terminal/` modules |
| `StoryPanel.svelte` | Left panel — narrative sections; tracks executed commands for step completion, manages decision branches, shows phase progress |
| `OutputPanel.svelte` | Right panel — displays tool outputs; renders charts (Plotly), file tables, PDF reports, tab switching between chart/files/notes |
| `ThreePanelLayout.svelte` | Main layout; arranges StoryPanel + Terminal + OutputPanel in three-column resizable layout |
| `index.ts` | Component barrel exports |

### Terminal Logic (`src/lib/terminal/`)

Extracted from Terminal.svelte into pure TypeScript modules. All functions receive a `TerminalContext` object for accessing component state and stores.

| File | Description |
|------|-------------|
| `types.ts` | `TerminalContext` interface (state getters/setters, store accessors, services) and `ToolOutput` interface |
| `filesystem.ts` | Virtual filesystem: `baseFilesystem`, `normalizePath()`, `getFilesystem()`, `getFilesForDirectory()`, `expandGlobPattern()` |
| `tool-validation.ts` | `validToolFiles` (expected files per tool), `toolRequirements` (input validation), `isValidFileForTool()` |
| `tool-outputs.ts` | `getToolOutput()` — generates simulated terminal output for ~30 bioinformatics tools; `getToolFromOutputName()` |
| `linux-commands.ts` | Handlers for shell builtins: `handleLs`, `handleCd`, `handleFileView` (cat/head/tail), `handleWc`, `handleMkdir`, `handleCp`, `handleGrep`, `handleBioToolHelp` |
| `command-executor.ts` | `executeCommand()` — main command dispatcher; `executeBioTool()` — progress simulation and output rendering; `showHelp()` |

### Stores (`src/lib/stores/`)

| File | Description |
|------|-------------|
| `auth.ts` | Authentication state store (user session, login status) |
| `authModal.ts` | Auth modal visibility state store |
| `terminal.ts` | Svelte stores for global state: outputData, terminalState, stopSignal, executedCommands, currentDirectory, storylineContext, templateFiles, API_BASE_URL |

### Services (`src/lib/services/`)

| File | Description |
|------|-------------|
| `templateService.ts` | API client for fetching template files; caches results per category/storyline |

### Types (`src/lib/types/`)

| File | Description |
|------|-------------|
| `plotly.d.ts` | TypeScript type definitions for Plotly.js |

### Utils (`src/lib/utils/`)

| File | Description |
|------|-------------|
| `format-utils.ts` | Formatting utilities for AMR gene rows, MLST results, file colors |

### Storylines (`src/lib/storylines/`)

| File | Description |
|------|-------------|
| `types.ts` | Core interfaces: Storyline, StorylineSection, AmrGeneEntry, MlstProfile, PlasmidResult, CheckmResult, StorylineStats |
| `tool-outputs-index.ts` | Aggregates storyline statistics across all categories for dynamic output generation |

**Tutorial** (`storylines/tutorial/`):

| File | Description |
|------|-------------|
| `index.ts` | Exports tutorial storylines (linux-basics, kpneumoniae-demo) |
| `linux-basics.ts` | Linux command fundamentals tutorial (pwd, ls, cd, cat, head, tail, wc, mkdir, cp, grep) |
| `kpneumoniae-demo.ts` | K. pneumoniae genome analysis demo workflow |
| `terminal-outputs.ts` | Help text strings for tutorial tools with ANSI color codes |
| `tool-outputs.ts` | Pre-computed terminal output data for linux-basics tutorial |
| `kpneumoniae-demo-tool-outputs.ts` | Pre-computed terminal output data for K. pneumoniae demo |

**WGS Bacteria** (`storylines/wgs-bacteria/`):

| File | Description |
|------|-------------|
| `index.ts` | Exports WGS storylines (hospital, plant, fish, foodborne, wastewater, clinical) |
| `hospital.ts` | Hospital outbreak investigation — carbapenem-resistant K. pneumoniae |
| `plant.ts` | Plant pathogenic bacteria analysis |
| `fish.ts` | Fish pathogen investigation |
| `foodborne.ts` | Foodborne pathogen outbreak analysis |
| `wastewater.ts` | Wastewater microbial surveillance |
| `clinical.ts` | Clinical isolate analysis |
| `sections.ts` | Shared section templates for Illumina analysis phases |
| `terminal-outputs.ts` | Help texts for WGS bioinformatics tools |
| `tool-outputs.ts` | Shared tool output utilities for WGS analysis |
| `hospital-tool-outputs.ts` | Pre-computed tool outputs for hospital scenario |
| `clinical-tool-outputs.ts` | Pre-computed tool outputs for clinical scenario |
| `plant-tool-outputs.ts` | Pre-computed tool outputs for plant scenario |
| `fish-tool-outputs.ts` | Pre-computed tool outputs for fish scenario |
| `foodborne-tool-outputs.ts` | Pre-computed tool outputs for foodborne scenario |
| `wastewater-tool-outputs.ts` | Pre-computed tool outputs for wastewater scenario |

**Amplicon Bacteria** (`storylines/amplicon-bacteria/`):

| File | Description |
|------|-------------|
| `index.ts` | Exports amplicon storylines (gut, soil, water) |
| `gut.ts` | Gut microbiome analysis |
| `soil.ts` | Soil microbiome analysis |
| `water.ts` | Water microbiome analysis |
| `sections.ts` | Shared amplicon workflow sections |

**R Reports** (`storylines/r-reports/`):

| File | Description |
|------|-------------|
| `index.ts` | Exports report storylines (wgs-bacteria, amplicon, rnaseq) |
| `wgs-bacteria.ts` | WGS analysis report visualization |
| `amplicon.ts` | Amplicon analysis report visualization |
| `rnaseq.ts` | RNA-seq analysis report visualization |

### Routes (`src/routes/`)

| File | Description |
|------|-------------|
| `+layout.svelte` | Root layout with navigation, footer, and auth modals |

Each route has a `+page.svelte`:

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/pricing/` | Pricing page with subscription options |
| `/reset-password/` | Password reset page |
| `/tutorial/` | Tutorial category landing page |
| `/tutorial/linux-basics/` | Linux command tutorial |
| `/tutorial/kpneumoniae-demo/` | K. pneumoniae genome analysis tutorial |
| `/wgs-bacteria/` | WGS bacteria category landing page |
| `/wgs-bacteria/hospital/` | Hospital outbreak investigation |
| `/wgs-bacteria/clinical/` | Clinical isolate analysis |
| `/wgs-bacteria/plant/` | Plant pathogen analysis |
| `/wgs-bacteria/fish/` | Fish pathogen analysis |
| `/wgs-bacteria/foodborne/` | Foodborne pathogen analysis |
| `/wgs-bacteria/wastewater/` | Wastewater surveillance |
| `/amplicon-bacteria/` | Amplicon bacteria category landing page |
| `/amplicon-bacteria/gut/` | Gut microbiome analysis |
| `/amplicon-bacteria/soil/` | Soil microbiome analysis |
| `/amplicon-bacteria/water/` | Water microbiome analysis |
| `/reports/wgs-bacteria/` | WGS analysis report |
| `/reports/amplicon/` | Amplicon analysis report |
| `/reports/rnaseq/` | RNA-seq analysis report |
| `/rna-seq/` | RNA-seq analysis page |

### Static Assets (`static/`)

| File | Description |
|------|-------------|
| `favicon.svg` | Site favicon |
| `robots.txt` | Web crawler instructions |
| `images/` | Static images directory |

---

## `template/` — Pre-computed Analysis Results

Holds pre-recorded tool outputs that the terminal plays back for each storyline.

### Tutorial Templates

| Path | Description |
|------|-------------|
| `tutorial/basic_linux_commands/` | Sample files for Linux tutorial |
| `tutorial/basic_linux_commands/references/` | Reference files for Linux tutorial |
| `tutorial/basic_linux_commands/scripts/` | Script files for Linux tutorial |
| `tutorial/basic_linux_commands/sequences/` | Sequence files for Linux tutorial |
| `tutorial/kpneumoniae_demo/` | K. pneumoniae demo data with all tool output directories |

**K. pneumoniae demo tool output directories:**

| Directory | Description |
|-----------|-------------|
| `input_data/` | Raw sequencing files (FASTQ.gz) |
| `o_seqkit/` | Sequence statistics |
| `o_fastqc/` | Quality control reports (HTML) |
| `o_trimmomatic/` | Trimmed read files (paired/unpaired FASTQ) |
| `o_unicycler/` | Genome assembly (FASTA, GFA, log) |
| `o_quast/` | Assembly quality metrics |
| `o_checkm2/` | Genome quality assessment |
| `o_prokka/` | Genome annotation (GBK, GFF, TSV, TBL) |
| `o_mlst/` | Multilocus sequence typing |
| `o_abricate/` | Antimicrobial resistance genes |
| `o_plasmidfinder/` | Plasmid detection |

### WGS Bacteria Templates (`template/wgs_bacteria/`)

Scenarios: `hospital/`, `clinical/`, `plant/`, `fish/`, `foodborne/`, `wastewater/`

Each scenario contains:

| Directory | Description |
|-----------|-------------|
| `input_data/` | Raw sequencing input files |
| `o_fastqc/` | Quality control |
| `o_trimmomatic/` | Read trimming |
| `o_unicycler/` | Genome assembly |
| `o_quast/` | Assembly quality |
| `o_checkm/` | Genome completeness |
| `o_prokka/` | Genome annotation |
| `o_mlst/` | Sequence typing |
| `o_abricate/` | AMR gene detection |
| `o_plasmidfinder/` | Plasmid detection |
| `o_resfinder/` | Resistance database search |
| `o_mob_recon/` | Plasmid reconstruction |
| `o_integron_finder/` | Integron detection |
| `o_isescan/` | Insertion sequence detection |
| `o_snippy/` | Variant calling |
| `o_roary/` | Pan-genome analysis |
| `o_iqtree/` | Phylogenetic trees |

### Amplicon Bacteria Templates (`template/amplicon_bacteria/`)

Samples: `gut/`, `soil/`, `water/`

Each contains:

| Directory | Description |
|-----------|-------------|
| `input_data/` | Raw sequencing input files |
| `o_fastqc/` | Quality control |
| `o_cutadapt/` | Adapter trimming |
| `o_multiqc/` | QC aggregation |
| `o_qiime2/` | Microbiome analysis (QIIME2 outputs) |

---

## `deploy/` — Deployment Configuration

| File | Description |
|------|-------------|
| `biolearn-backend.service` | Systemd service file for backend |
| `biolearn-frontend.service` | Systemd service file for frontend |
| `biolearn.nginx` | Nginx configuration for reverse proxy |
| `deploy.sh` | Deployment script |
| `setup-server.sh` | Server setup script |
