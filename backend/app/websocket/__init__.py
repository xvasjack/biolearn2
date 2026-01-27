"""
WebSocket handling for terminal sessions.

Uses PROXY architecture:
- No real bioinformatics tools are executed per user
- Pre-computed results are played back when users type commands
- Simulated typing delays for realistic experience
"""
from fastapi import WebSocket
from typing import Dict, Optional
import asyncio
import logging
import json

from app.storage import get_command_output, CommandOutput

logger = logging.getLogger(__name__)


class UserSession:
    """Tracks a user's current position in a narrative."""
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.narrative_id: Optional[str] = "hospital-outbreak"  # Default narrative
        self.current_step: int = 3  # Start at step 3 (first task)
        self.completed_commands: list[str] = []


class ConnectionManager:
    """Manages WebSocket connections for terminal sessions."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.sessions: Dict[str, UserSession] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.sessions[session_id] = UserSession(session_id)
        logger.info(f"Terminal session {session_id} connected")

    def disconnect(self, session_id: str):
        """Handle WebSocket disconnection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.sessions:
            del self.sessions[session_id]
        logger.info(f"Terminal session {session_id} disconnected")

    async def send_message(self, session_id: str, message: str):
        """Send a message to a specific session."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(message)

    async def send_json(self, session_id: str, data: dict):
        """Send JSON data to a specific session."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(data)

    async def simulate_typing(self, session_id: str, text: str, chars_per_second: int = 500):
        """
        Simulate terminal output appearing character by character.
        For long outputs, send in chunks for performance.
        """
        websocket = self.active_connections.get(session_id)
        if not websocket:
            return

        # For short outputs, send immediately
        if len(text) < 200:
            await websocket.send_text(text.replace('\n', '\r\n'))
            return

        # For longer outputs, send line by line with small delays
        lines = text.split('\n')
        for i, line in enumerate(lines):
            await websocket.send_text(line + ('\r\n' if i < len(lines) - 1 else ''))
            await asyncio.sleep(0.05)  # 50ms between lines

    async def process_command(self, session_id: str, command: str):
        """
        Process a command from the terminal.
        Looks up pre-computed results and plays them back.
        """
        websocket = self.active_connections.get(session_id)
        session = self.sessions.get(session_id)
        if not websocket or not session:
            return

        cmd = command.strip()
        if not cmd:
            return

        # Handle built-in commands
        if cmd == "help":
            await self._send_help(websocket)
            return

        if cmd == "clear":
            await websocket.send_text("\x1b[2J\x1b[H")
            return

        if cmd.startswith("cd ") or cmd == "pwd" or cmd.startswith("ls"):
            await self._handle_filesystem_command(websocket, cmd)
            return

        # Look up pre-computed result for this command
        result = get_command_output(
            narrative_id=session.narrative_id,
            step_id=session.current_step,
            command=cmd
        )

        if result:
            await self._playback_result(session_id, websocket, result)
            session.completed_commands.append(cmd)

            # Send chart/summary data as JSON for the output panel
            if result.chart_data or result.summary:
                await websocket.send_json({
                    "type": "output_data",
                    "chart": result.chart_data,
                    "summary": result.summary,
                    "files": result.files_generated,
                })
        else:
            # Command not found in pre-computed results
            await websocket.send_text(
                f"\x1b[33mHint: Try the suggested command from the story panel.\x1b[0m\r\n"
                f"\x1b[90mThis learning environment uses pre-recorded analysis results.\x1b[0m\r\n"
            )

    async def _playback_result(self, session_id: str, websocket: WebSocket, result: CommandOutput):
        """Play back a pre-computed result with realistic timing."""
        # Show "executing" message
        await websocket.send_text(f"\x1b[36m$ {result.command}\x1b[0m\r\n")

        # Simulate execution time (capped for UX)
        display_time = min(result.execution_time, 5.0)  # Max 5 seconds display
        if display_time > 0.5:
            await websocket.send_text(f"\x1b[90m[Running... ~{int(result.execution_time)}s]\x1b[0m\r\n")
            await asyncio.sleep(min(display_time, 2.0))  # Wait max 2 seconds

        # Send the terminal output
        await self.simulate_typing(session_id, result.terminal_output)

        # Show files generated
        if result.files_generated:
            await websocket.send_text("\r\n\x1b[32mFiles generated:\x1b[0m\r\n")
            for f in result.files_generated:
                await websocket.send_text(f"  📄 {f}\r\n")

    async def _send_help(self, websocket: WebSocket):
        """Send help message."""
        help_text = """
\x1b[1;33m═══════════════════════════════════════════════════════════\x1b[0m
\x1b[1;33m  BioLearn Terminal - Learning Environment\x1b[0m
\x1b[1;33m═══════════════════════════════════════════════════════════\x1b[0m

\x1b[1;36mHow it works:\x1b[0m
  Follow the story on the right panel and type the suggested
  commands. Pre-recorded results will be displayed.

\x1b[1;36mAvailable tools in this narrative:\x1b[0m
  \x1b[32mfastqc\x1b[0m       - Quality control for sequencing data
  \x1b[32mtrimmomatic\x1b[0m  - Adapter trimming and quality filtering
  \x1b[32municycler\x1b[0m    - Bacterial genome assembly
  \x1b[32mquast\x1b[0m        - Assembly quality assessment
  \x1b[32mabricate\x1b[0m     - AMR/virulence gene screening
  \x1b[32mprokka\x1b[0m       - Genome annotation
  \x1b[32mmlst\x1b[0m         - Multi-locus sequence typing

\x1b[1;36mUtility commands:\x1b[0m
  \x1b[32mhelp\x1b[0m   - Show this message
  \x1b[32mclear\x1b[0m  - Clear the terminal
  \x1b[32mls\x1b[0m     - List files
  \x1b[32mpwd\x1b[0m    - Show current directory

"""
        await websocket.send_text(help_text.replace('\n', '\r\n'))

    async def _handle_filesystem_command(self, websocket: WebSocket, cmd: str):
        """Handle simulated filesystem commands."""
        if cmd == "pwd":
            await websocket.send_text("/data/outbreak_investigation\r\n")
        elif cmd == "ls" or cmd.startswith("ls "):
            await websocket.send_text(
                "\x1b[34mraw_reads/\x1b[0m  \x1b[34mqc_reports/\x1b[0m  \x1b[34massembly/\x1b[0m  \x1b[34mannotation/\x1b[0m\r\n"
                "sample_01_R1.fastq.gz  sample_01_R2.fastq.gz\r\n"
                "sample_02_R1.fastq.gz  sample_02_R2.fastq.gz\r\n"
                "sample_03_R1.fastq.gz  sample_03_R2.fastq.gz\r\n"
            )
        elif cmd.startswith("cd "):
            await websocket.send_text("")  # Silent success
