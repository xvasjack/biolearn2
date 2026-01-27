"""Narrative content endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class NarrativeStep(BaseModel):
    """A single step in a narrative."""
    id: int
    type: str  # intro, context, task, result
    title: Optional[str] = None
    content: str
    command: Optional[str] = None
    hint: Optional[str] = None
    expected_output: Optional[str] = None


class Narrative(BaseModel):
    """A complete narrative storyline."""
    id: str
    title: str
    subtitle: str
    category: str  # wgs, amplicon, rnaseq, metagenomics
    difficulty: str  # beginner, intermediate, advanced
    estimated_time: str
    description: str
    steps: list[NarrativeStep]


# Sample narratives (will be loaded from content files)
NARRATIVES = {
    "hospital-outbreak": Narrative(
        id="hospital-outbreak",
        title="Hospital Outbreak Investigation",
        subtitle="Track a mysterious cluster of infections",
        category="wgs",
        difficulty="beginner",
        estimated_time="2-3 hours",
        description="Investigate a potential outbreak at St. Mary's Hospital using whole genome sequencing to identify the source of antibiotic-resistant infections.",
        steps=[
            NarrativeStep(
                id=1,
                type="intro",
                title="The Alert",
                content="It's Monday morning at St. Mary's Hospital. Dr. Sarah Chen reviews the weekend reports and notices something unusual: five patients in the ICU have developed similar antibiotic-resistant infections within the past 72 hours.",
            ),
            NarrativeStep(
                id=2,
                type="context",
                content="The infection control team has collected samples and sent them for whole genome sequencing. Your task is to analyze these bacterial genomes to determine if this is an outbreak and identify the source.",
                hint="You will use WGS analysis to trace the outbreak",
            ),
            NarrativeStep(
                id=3,
                type="task",
                title="Quality Control",
                content="First, let's check the quality of our sequencing data. We've received FASTQ files from the sequencer.",
                command="fastqc sample_01.fastq.gz -o qc_reports/",
                hint="FastQC analyzes raw sequence data and generates quality reports",
            ),
            NarrativeStep(
                id=4,
                type="task",
                title="Read Trimming",
                content="The quality report shows some adapter contamination. Let's trim the reads to remove adapters and low-quality bases.",
                command="trimmomatic PE -phred33 sample_01_R1.fastq.gz sample_01_R2.fastq.gz sample_01_R1_paired.fq.gz sample_01_R1_unpaired.fq.gz sample_01_R2_paired.fq.gz sample_01_R2_unpaired.fq.gz ILLUMINACLIP:TruSeq3-PE.fa:2:30:10 LEADING:3 TRAILING:3 SLIDINGWINDOW:4:15 MINLEN:36",
                hint="Trimmomatic removes adapter sequences and trims low-quality bases",
            ),
            NarrativeStep(
                id=5,
                type="task",
                title="Genome Assembly",
                content="Now we'll assemble the cleaned reads into contiguous sequences (contigs) that represent the bacterial genome.",
                command="unicycler -1 sample_01_R1_paired.fq.gz -2 sample_01_R2_paired.fq.gz -o assembly/",
                hint="Unicycler is optimized for bacterial genome assembly",
            ),
        ],
    ),
    "food-poisoning": Narrative(
        id="food-poisoning",
        title="Food Poisoning Investigation",
        subtitle="Trace the source of a foodborne outbreak",
        category="wgs",
        difficulty="intermediate",
        estimated_time="3-4 hours",
        description="Multiple cases of food poisoning have been reported across the city. Use genomic analysis to identify the pathogen and trace it back to its source.",
        steps=[
            NarrativeStep(
                id=1,
                type="intro",
                title="The Reports",
                content="The health department has received 23 reports of severe gastroenteritis over the past week. Initial tests suggest Salmonella, but the source remains unknown.",
            ),
        ],
    ),
}


@router.get("/")
async def list_narratives() -> list[dict]:
    """List all available narratives."""
    return [
        {
            "id": n.id,
            "title": n.title,
            "subtitle": n.subtitle,
            "category": n.category,
            "difficulty": n.difficulty,
            "estimated_time": n.estimated_time,
        }
        for n in NARRATIVES.values()
    ]


@router.get("/{narrative_id}")
async def get_narrative(narrative_id: str) -> Narrative:
    """Get a specific narrative with all its steps."""
    if narrative_id not in NARRATIVES:
        raise HTTPException(status_code=404, detail=f"Narrative '{narrative_id}' not found")
    return NARRATIVES[narrative_id]


@router.get("/{narrative_id}/step/{step_id}")
async def get_narrative_step(narrative_id: str, step_id: int) -> NarrativeStep:
    """Get a specific step from a narrative."""
    if narrative_id not in NARRATIVES:
        raise HTTPException(status_code=404, detail=f"Narrative '{narrative_id}' not found")

    narrative = NARRATIVES[narrative_id]
    for step in narrative.steps:
        if step.id == step_id:
            return step

    raise HTTPException(status_code=404, detail=f"Step {step_id} not found in narrative '{narrative_id}'")
