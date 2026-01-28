"""Template file serving endpoints."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

from app.storage.files import template_storage

router = APIRouter()

TEMPLATE_DIR = template_storage.base_path


class TemplateInfo(BaseModel):
    """Information about a template directory."""
    category: str
    storyline: str
    tools: list[str]
    file_count: int


class TemplateFile(BaseModel):
    """Information about a template file."""
    name: str
    path: str
    size: int
    is_directory: bool


def get_template_path(category: str, storyline: str, tool: Optional[str] = None, filename: Optional[str] = None) -> Path:
    """Build the path to a template file or directory."""
    path = TEMPLATE_DIR / category / storyline
    if tool:
        path = path / f"o_{tool}"
    if filename:
        path = path / filename
    return path


@router.get("/")
async def list_categories() -> list[str]:
    """List all template categories."""
    if not TEMPLATE_DIR.exists():
        return []
    return [d.name for d in TEMPLATE_DIR.iterdir() if d.is_dir()]


@router.get("/{category}")
async def list_storylines(category: str) -> list[str]:
    """List all storylines in a category."""
    category_path = TEMPLATE_DIR / category
    if not category_path.exists():
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")
    return [d.name for d in category_path.iterdir() if d.is_dir()]


class StorylineFiles(BaseModel):
    """All files available in a storyline, organized by tool."""
    category: str
    storyline: str
    tools: dict[str, list[str]]  # tool_name -> list of filenames
    root_files: list[str]  # Files directly in storyline folder (like o_bandage.png)


@router.get("/{category}/{storyline}")
async def get_storyline_info(category: str, storyline: str) -> TemplateInfo:
    """Get information about a storyline's templates."""
    storyline_path = get_template_path(category, storyline)
    if not storyline_path.exists():
        raise HTTPException(status_code=404, detail=f"Storyline '{storyline}' not found in category '{category}'")

    # List tool output directories (o_toolname format)
    tools = []
    file_count = 0
    for item in storyline_path.iterdir():
        if item.is_dir() and item.name.startswith("o_"):
            tool_name = item.name[2:]  # Remove 'o_' prefix
            tools.append(tool_name)
            # Count files in tool directory
            file_count += sum(1 for f in item.iterdir() if f.is_file() and f.name != ".gitkeep")

    return TemplateInfo(
        category=category,
        storyline=storyline,
        tools=sorted(tools),
        file_count=file_count
    )


@router.get("/{category}/{storyline}/files")
async def get_storyline_files(category: str, storyline: str) -> StorylineFiles:
    """Get all files in a storyline, organized by tool.

    This returns all files that can be used for output display:
    - Files in o_toolname/ directories
    - Files directly in the storyline folder (like o_bandage.png)
    """
    storyline_path = get_template_path(category, storyline)
    if not storyline_path.exists():
        raise HTTPException(status_code=404, detail=f"Storyline '{storyline}' not found in category '{category}'")

    tools: dict[str, list[str]] = {}
    root_files: list[str] = []

    for item in storyline_path.iterdir():
        if item.name == ".gitkeep":
            continue

        if item.is_dir() and item.name.startswith("o_"):
            # This is a tool output directory
            tool_name = item.name[2:]  # Remove 'o_' prefix
            files = [f.name for f in item.iterdir() if f.is_file() and f.name != ".gitkeep"]
            if files:
                tools[tool_name] = sorted(files)
        elif item.is_file() and item.name.startswith("o_"):
            # This is a root-level output file (like o_bandage.png)
            root_files.append(item.name)

    return StorylineFiles(
        category=category,
        storyline=storyline,
        tools=tools,
        root_files=sorted(root_files)
    )


class FilesystemStructure(BaseModel):
    """Filesystem structure for a storyline - maps directory paths to file/folder lists."""
    data_dir: str  # The root data directory (e.g., /data/linux_tutorial)
    filesystem: dict[str, list[str]]  # path -> list of files/folders


@router.get("/{category}/{storyline}/filesystem")
async def get_storyline_filesystem(category: str, storyline: str, data_dir: str = "/data") -> FilesystemStructure:
    """Get the filesystem structure for a storyline.

    Scans the template directory recursively and returns all files and directories
    that should appear in the terminal filesystem.
    """
    storyline_path = get_template_path(category, storyline)
    if not storyline_path.exists():
        raise HTTPException(status_code=404, detail=f"Storyline '{storyline}' not found in category '{category}'")

    filesystem: dict[str, list[str]] = {}
    root_data_dir = data_dir
    if root_data_dir.rstrip("/") == "/data":
        root_data_dir = f"{data_dir}/{storyline}"

    def scan_directory(path: Path, virtual_path: str):
        """Recursively scan directory and build filesystem structure."""
        entries = []
        for item in sorted(path.iterdir()):
            if item.name == ".gitkeep":
                continue
            if item.is_dir():
                entries.append(item.name + "/")
                # Recursively scan subdirectory
                scan_directory(item, f"{virtual_path}/{item.name}")
            else:
                entries.append(item.name)
        filesystem[virtual_path] = entries

    scan_directory(storyline_path, root_data_dir)

    return FilesystemStructure(
        data_dir=root_data_dir,
        filesystem=filesystem
    )


@router.get("/{category}/{storyline}/root/{filename:path}")
async def get_root_file(category: str, storyline: str, filename: str) -> FileResponse:
    """Serve a file directly from the storyline folder (not in an o_tool/ subdirectory).

    This handles files like o_bandage.png that are stored directly in the storyline folder.
    """
    storyline_path = get_template_path(category, storyline)
    file_path = storyline_path / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    if not file_path.is_file():
        raise HTTPException(status_code=400, detail=f"'{filename}' is not a file")

    # Determine media type based on extension
    media_types = {
        ".html": "text/html",
        ".txt": "text/plain",
        ".tsv": "text/tab-separated-values",
        ".csv": "text/csv",
        ".json": "application/json",
        ".fasta": "text/plain",
        ".fa": "text/plain",
        ".fna": "text/plain",
        ".faa": "text/plain",
        ".fastq": "text/plain",
        ".fq": "text/plain",
        ".gff": "text/plain",
        ".gbk": "text/plain",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".pdf": "application/pdf",
        ".zip": "application/zip",
    }

    ext = file_path.suffix.lower()
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )


@router.get("/{category}/{storyline}/{tool}")
async def list_tool_files(category: str, storyline: str, tool: str) -> list[TemplateFile]:
    """List all files in a tool's output directory."""
    tool_path = get_template_path(category, storyline, tool)
    if not tool_path.exists():
        raise HTTPException(status_code=404, detail=f"Tool output 'o_{tool}' not found")

    files = []
    for item in tool_path.iterdir():
        if item.name == ".gitkeep":
            continue
        files.append(TemplateFile(
            name=item.name,
            path=str(item.relative_to(TEMPLATE_DIR)),
            size=item.stat().st_size if item.is_file() else 0,
            is_directory=item.is_dir()
        ))

    return sorted(files, key=lambda f: f.name)


@router.get("/{category}/{storyline}/{tool}/{filename:path}")
async def get_template_file(category: str, storyline: str, tool: str, filename: str) -> FileResponse:
    """Serve a specific template file."""
    file_path = get_template_path(category, storyline, tool, filename)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    if not file_path.is_file():
        raise HTTPException(status_code=400, detail=f"'{filename}' is not a file")

    # Determine media type based on extension
    media_types = {
        ".html": "text/html",
        ".txt": "text/plain",
        ".tsv": "text/tab-separated-values",
        ".csv": "text/csv",
        ".json": "application/json",
        ".fasta": "text/plain",
        ".fa": "text/plain",
        ".fna": "text/plain",
        ".faa": "text/plain",
        ".fastq": "text/plain",
        ".fq": "text/plain",
        ".gff": "text/plain",
        ".gbk": "text/plain",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".pdf": "application/pdf",
        ".zip": "application/zip",
    }

    ext = file_path.suffix.lower()
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )
