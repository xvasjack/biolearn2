"""
Template loader service for loading storyline content from template files.

This module loads:
- manifest.json: Tool metadata, execution times, file mappings
- terminal/*.txt: Terminal output for each tool
- files/*: Output file contents (loaded on demand)

The template directory structure:
    biolearn/template/storylines/{storyline_id}/
    ├── manifest.json
    ├── terminal/
    │   ├── fastqc.txt
    │   ├── unicycler.txt
    │   └── ...
    └── files/
        ├── sample_01_R1_fastqc.html
        ├── assembly.fasta
        └── ...
"""
import json
from pathlib import Path
from typing import Optional
from functools import lru_cache


# Base path to template directory
TEMPLATE_BASE_PATH = Path(__file__).parent.parent.parent.parent / "template" / "storylines"


@lru_cache(maxsize=10)
def load_manifest(storyline_id: str) -> Optional[dict]:
    """
    Load the manifest.json for a storyline.

    Args:
        storyline_id: The storyline identifier (e.g., 'hospital-outbreak')

    Returns:
        Parsed manifest dict or None if not found
    """
    manifest_path = TEMPLATE_BASE_PATH / storyline_id / "manifest.json"
    if not manifest_path.exists():
        return None

    with open(manifest_path, 'r') as f:
        return json.load(f)


def get_tool_config(storyline_id: str, tool_name: str) -> Optional[dict]:
    """
    Get configuration for a specific tool from the manifest.

    Args:
        storyline_id: The storyline identifier
        tool_name: The tool name (e.g., 'fastqc', 'unicycler')

    Returns:
        Tool configuration dict or None if not found
    """
    manifest = load_manifest(storyline_id)
    if not manifest:
        return None

    tools = manifest.get("tools", {})
    return tools.get(tool_name)


def get_terminal_output(storyline_id: str, tool_name: str) -> Optional[str]:
    """
    Load terminal output for a tool from the template files.

    Args:
        storyline_id: The storyline identifier
        tool_name: The tool name

    Returns:
        Terminal output string or None if not found
    """
    tool_config = get_tool_config(storyline_id, tool_name)
    if not tool_config:
        return None

    terminal_file = tool_config.get("terminal_output")
    if not terminal_file:
        return None

    terminal_path = TEMPLATE_BASE_PATH / storyline_id / terminal_file
    if not terminal_path.exists():
        return None

    with open(terminal_path, 'r') as f:
        return f.read()


def get_file_content(storyline_id: str, filename: str) -> Optional[str]:
    """
    Load output file content from the template files.

    Args:
        storyline_id: The storyline identifier
        filename: The output filename (e.g., 'assembly.fasta')

    Returns:
        File content string or None if not found
    """
    file_path = TEMPLATE_BASE_PATH / storyline_id / "files" / filename
    if not file_path.exists():
        return None

    # Handle binary files
    if filename.endswith(('.png', '.zip', '.gz')):
        return f"[Binary file: {filename}]"

    with open(file_path, 'r') as f:
        return f.read()


def get_tool_files(storyline_id: str, tool_name: str) -> list[str]:
    """
    Get list of output files for a tool.

    Args:
        storyline_id: The storyline identifier
        tool_name: The tool name

    Returns:
        List of output filenames
    """
    tool_config = get_tool_config(storyline_id, tool_name)
    if not tool_config:
        return []

    return tool_config.get("files", [])


def get_execution_time(storyline_id: str, tool_name: str) -> float:
    """
    Get execution time for a tool.

    Args:
        storyline_id: The storyline identifier
        tool_name: The tool name

    Returns:
        Execution time in seconds (default 10 if not found)
    """
    tool_config = get_tool_config(storyline_id, tool_name)
    if not tool_config:
        return 10.0

    return float(tool_config.get("execution_time", 10))


def get_summary(storyline_id: str, tool_name: str) -> Optional[dict]:
    """
    Get summary statistics for a tool.

    Args:
        storyline_id: The storyline identifier
        tool_name: The tool name

    Returns:
        Summary dict or None
    """
    tool_config = get_tool_config(storyline_id, tool_name)
    if not tool_config:
        return None

    return tool_config.get("summary")


def get_chart_data(storyline_id: str, tool_name: str) -> Optional[dict]:
    """
    Get chart data for visualization.

    Args:
        storyline_id: The storyline identifier
        tool_name: The tool name

    Returns:
        Chart data dict or None
    """
    tool_config = get_tool_config(storyline_id, tool_name)
    if not tool_config:
        return None

    return tool_config.get("chart_data")


def get_all_tools(storyline_id: str) -> list[str]:
    """
    Get list of all tools defined for a storyline.

    Args:
        storyline_id: The storyline identifier

    Returns:
        List of tool names
    """
    manifest = load_manifest(storyline_id)
    if not manifest:
        return []

    return list(manifest.get("tools", {}).keys())


def list_storylines() -> list[str]:
    """
    List all available storylines.

    Returns:
        List of storyline IDs
    """
    if not TEMPLATE_BASE_PATH.exists():
        return []

    return [
        d.name for d in TEMPLATE_BASE_PATH.iterdir()
        if d.is_dir() and (d / "manifest.json").exists()
    ]


def clear_cache():
    """Clear the manifest cache (useful for development)."""
    load_manifest.cache_clear()
