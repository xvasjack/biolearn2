"""
Pre-computed analysis results storage.

This module handles the proxy architecture where:
1. Admin runs real analysis during development
2. Results (terminal output, files, charts) are stored
3. Users receive stored results when they type commands

No actual bioinformatics tools run per user - just playback of stored results.
"""
from pydantic import BaseModel
from typing import Optional
import json
from pathlib import Path


class CommandOutput(BaseModel):
    """Stored output for a command."""
    command: str  # The command user types
    terminal_output: str  # What appears in terminal (with ANSI colors)
    execution_time: float  # Simulated execution time in seconds
    files_generated: list[str] = []  # List of output files
    chart_data: Optional[dict] = None  # Data for Plotly charts
    summary: Optional[dict] = None  # Summary statistics


class StepResults(BaseModel):
    """All results for a narrative step."""
    step_id: int
    commands: list[CommandOutput]


class NarrativeResults(BaseModel):
    """Complete pre-computed results for a narrative."""
    narrative_id: str
    steps: list[StepResults]


# In-memory storage for pre-computed results
# In production, this would be loaded from files/database
PRECOMPUTED_RESULTS: dict[str, NarrativeResults] = {}


def load_narrative_results(narrative_id: str) -> Optional[NarrativeResults]:
    """Load pre-computed results for a narrative."""
    if narrative_id in PRECOMPUTED_RESULTS:
        return PRECOMPUTED_RESULTS[narrative_id]

    # Try to load from JSON file
    results_path = Path(__file__).parent.parent.parent / "content" / "results" / f"{narrative_id}.json"
    if results_path.exists():
        with open(results_path) as f:
            data = json.load(f)
            results = NarrativeResults(**data)
            PRECOMPUTED_RESULTS[narrative_id] = results
            return results

    return None


def get_command_output(narrative_id: str, step_id: int, command: str) -> Optional[CommandOutput]:
    """
    Get the pre-computed output for a specific command.

    Args:
        narrative_id: The narrative being played
        step_id: Current step in the narrative
        command: The command user typed

    Returns:
        CommandOutput if found, None otherwise
    """
    results = load_narrative_results(narrative_id)
    if not results:
        return None

    for step in results.steps:
        if step.step_id == step_id:
            for cmd_output in step.commands:
                # Match command (could be exact or fuzzy matching)
                if command.strip() == cmd_output.command.strip():
                    return cmd_output
                # Also match if user typed the base command
                if command.strip().split()[0] == cmd_output.command.split()[0]:
                    return cmd_output

    return None
