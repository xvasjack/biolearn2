"""
File storage abstraction.

Default implementation uses local disk. Swap to a GCSFileStorage subclass
to serve files from Google Cloud Storage without changing callers.
"""
import os
from pathlib import Path
from typing import Optional


class FileStorage:
    """Local-disk file storage (default implementation)."""

    def __init__(self, base_path: Path):
        self.base_path = base_path

    def resolve(self, *parts: str) -> Path:
        """Return an absolute Path under base_path."""
        return self.base_path.joinpath(*parts)

    def exists(self, *parts: str) -> bool:
        return self.resolve(*parts).exists()

    def is_dir(self, *parts: str) -> bool:
        return self.resolve(*parts).is_dir()

    def is_file(self, *parts: str) -> bool:
        return self.resolve(*parts).is_file()

    def list_dir(self, *parts: str) -> list[Path]:
        return list(self.resolve(*parts).iterdir())

    def read_text(self, *parts: str) -> Optional[str]:
        p = self.resolve(*parts)
        if not p.exists():
            return None
        return p.read_text()

    def read_json(self, *parts: str) -> Optional[dict]:
        import json
        text = self.read_text(*parts)
        if text is None:
            return None
        return json.loads(text)

    def file_size(self, *parts: str) -> int:
        return self.resolve(*parts).stat().st_size

    def relative_to_base(self, path: Path) -> str:
        return str(path.relative_to(self.base_path))


def _default_template_dir() -> Path:
    return Path(__file__).parent.parent.parent.parent / "template"


def _default_storyline_dir() -> Path:
    return Path(__file__).parent.parent.parent.parent / "template" / "storylines"


_env_template_dir = os.getenv("TEMPLATE_DIR")

template_storage = FileStorage(
    Path(_env_template_dir) if _env_template_dir else _default_template_dir()
)

storyline_storage = FileStorage(
    Path(_env_template_dir) / "storylines" if _env_template_dir else _default_storyline_dir()
)
