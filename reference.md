# BioLearn Development Reference

## Template Directory Structure

The `biolearn/template/` directory contains pre-generated output files for storylines:

```
biolearn/template/
├── tutorial/
│   ├── basic_linux_commands/
│   │   └── (sample files for Linux basics tutorial)
│   └── kpneumoniae_demo/
│       ├── o_seqkit/
│       ├── o_fastqc/
│       ├── o_trimmomatic/
│       ├── o_unicycler/
│       ├── o_bandage/
│       ├── o_quast/
│       ├── o_checkm2/
│       ├── o_plasmidfinder/
│       ├── o_abricate/
│       ├── o_mlst/
│       └── o_prokka/
│
├── wgs_bacteria/
│   ├── hospital/                    # Storyline 1: Hospital Outbreak (AMR in ICU)
│   │   ├── o_fastqc/
│   │   ├── o_trimmomatic/
│   │   ├── o_unicycler/
│   │   ├── o_quast/
│   │   ├── o_checkm/
│   │   ├── o_abricate/
│   │   ├── o_mlst/
│   │   ├── o_prokka/
│   │   ├── o_mob_recon/
│   │   ├── o_plasmidfinder/
│   │   ├── o_snippy/
│   │   ├── o_roary/
│   │   ├── o_iqtree/
│   │   ├── o_resfinder/
│   │   ├── o_integron_finder/
│   │   └── o_isescan/
│   │
│   ├── foodborne/                   # Storyline 2: Food Poisoning Outbreak
│   │   └── ... (same pattern)
│   │
│   ├── plant/                       # Storyline 3: Plant Pathogen (Citrus Canker)
│   │   └── ...
│   │
│   ├── fish/                        # Storyline 4: Fish Mortality Event
│   │   └── ...
│   │
│   ├── wastewater/                  # Storyline 5: Wastewater AMR Surveillance
│   │   └── ...
│   │
│   └── clinical/                    # Storyline 6: Clinical Rapid Diagnostics
│       └── ...
│
└── amplicon_bacteria/
    ├── gut/                         # Storyline 1: Gut Microbiome (IBD vs Healthy)
    │   ├── o_fastqc/
    │   ├── o_multiqc/
    │   ├── o_cutadapt/
    │   └── o_qiime2/
    │
    ├── soil/                        # Storyline 2: Compost Microbiome
    │   └── ...
    │
    └── water/                       # Storyline 3: Water Contamination Investigation
        └── ...
```

## Frontend Route Structure

```
biolearn/frontend/src/routes/
├── +page.svelte                     # Home: category selection
├── +layout.svelte                   # Global layout
│
├── tutorial/                        # Tutorial category
│   ├── +page.svelte                 # Tutorial selection page
│   └── kpneumoniae-demo/            # K. pneumoniae intro tutorial
│       └── +page.svelte
│
├── linux-basics/                    # Linux basics tutorial
│   └── +page.svelte
│
├── wgs-bacteria/                    # WGS category
│   ├── +page.svelte                 # Storyline selection (if needed)
│   ├── hospital/                    # Hospital outbreak
│   ├── foodborne/                   # Food poisoning
│   ├── plant/                       # Plant pathogen
│   ├── fish/                        # Fish mortality
│   ├── wastewater/                  # Wastewater surveillance
│   └── clinical/                    # Clinical diagnostics
│
├── amplicon-bacteria/               # Amplicon category
│   ├── +page.svelte                 # Storyline selection
│   ├── gut/
│   ├── soil/
│   └── water/
│
├── rna-seq/                         # RNA-seq category (coming soon)
│   └── +page.svelte
│
└── reports/                         # Report viewing
    ├── wgs-bacteria/
    ├── amplicon/
    └── rnaseq/
```

## Output Folder/File Naming Convention

**Output file format: `o_toolname`**

- All output folders and files MUST follow this pattern
- **Folders**: `o_toolname/` (e.g., `o_unicycler/`, `o_abricate/`, `o_quast/`, `o_prokka/`, `o_mlst/`)
- **Single files**: `o_toolname.ext` (e.g., `o_bandage.png`, `o_seqkit_stats.txt`, `o_fastqc.html`)

## Consistency Requirements

1. **Terminal output** = **Guidance screen** = **Backend**
   - All three must use the same folder names and file paths
   - Terminal.svelte toolCreatedFiles must match storyline commands
   - Output file generation is enabled

2. **All scenarios and tools must reflect real events**
   - Use realistic tool output formats
   - Use biologically accurate data (correct organism, ST types, AMR genes, etc.)
   - Match expected tool behavior and output structure

3. **When changing a filename/path, update ALL locations:**
   - `Terminal.svelte` - toolCreatedFiles, toolOutputs, files array
   - `wgs-bacteria.ts` / `tutorial.ts` - storyline commands
   - `ThreePanelLayout.svelte` - toolOutputFiles mapping
   - `OutputPanel.svelte` - mockFileContents
   - `terminal.ts` - bioTools set (if adding new tool)

## Storyline Files

| Category | File | Description |
|----------|------|-------------|
| Tutorial | `tutorial.ts` | K. pneumoniae demo, Linux basics |
| WGS Bacteria | `wgs-bacteria.ts` | Hospital, foodborne, plant, fish, wastewater, clinical |
| Amplicon | `amplicon-bacteria.ts` | Gut, soil, water microbiome |
| Reports | `r-reports.ts` | R-based PDF report generation |

## K. pneumoniae Demo (Tutorial)

**Organism**: Klebsiella pneumoniae ST307
**Dataset**: SRR36708862
**Tools used**: seqkit, fastqc, trimmomatic, unicycler, bandage, quast, checkm2, plasmidfinder, abricate, mlst, prokka

### Key Data Points
- **Assembly**: 117 contigs, 5,564,255 bp, N50 371,705 bp, GC 57.18%
- **Completeness**: 100.0%
- **Contamination**: 0.16%
- **Sequence Type**: ST307
- **Plasmids**: IncFII(K), IncX3, IncFIB(K), Col440I
- **AMR genes**: blaKPC-2, blaSHV-11, fosA, oqxA, oqxB

## Backend API Endpoints

### Template File Serving (`/api/templates/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates/` | GET | List all template categories |
| `/api/templates/{category}` | GET | List storylines in a category |
| `/api/templates/{category}/{storyline}` | GET | Get storyline template info |
| `/api/templates/{category}/{storyline}/{tool}` | GET | List files in tool output |
| `/api/templates/{category}/{storyline}/{tool}/{filename}` | GET | Serve template file |

## File Locations

- **Tutorial storylines**: `biolearn/frontend/src/lib/storylines/tutorial.ts`
- **WGS storylines**: `biolearn/frontend/src/lib/storylines/wgs-bacteria.ts`
- **Terminal outputs**: `biolearn/frontend/src/lib/components/Terminal.svelte`
- **Terminal store**: `biolearn/frontend/src/lib/stores/terminal.ts`
- **Three panel layout**: `biolearn/frontend/src/lib/components/ThreePanelLayout.svelte`
- **Output panel**: `biolearn/frontend/src/lib/components/OutputPanel.svelte`

## Common Pitfalls

1. **Filename mismatch**: Always search for the old filename across all files before changing
2. **Inconsistent paths**: Input files should use source folder (e.g., `o_unicycler/assembly.fasta`)
3. **Missing tool in bioTools**: New tools must be added to the bioTools set in terminal.ts

## Linux Basics Tutorial - Step 5a and 5b Reference

**Location**: `biolearn/frontend/src/lib/storylines/tutorial/linux-basics.ts`

### Step 5a: Redirect Output to File
```typescript
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
}
```

### Step 5b: Append to File
```typescript
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
}
```

### Expected Output
- **Step 5a**: 8 lines from sample_R1.fastq (2 complete FASTQ reads with `1:N:0:1` headers)
- **Step 5b**: 8 lines appended from sample_R2.fastq (2 complete FASTQ reads with `2:N:0:1` headers)
- **Total in first_reads.txt**: 16 lines (8+8)

### FASTQ Content Location
- `Terminal.svelte` contains `sample_R1.fastq` and `sample_R2.fastq` content definitions
- R1 uses `1:N:0:1` headers (forward reads)
- R2 uses `2:N:0:1` headers (reverse reads)
