"""
Central Tool Registry: Registration, Gemini Function Declaration, and Safe Execution
"""

import time
import inspect
import asyncio
import logging
from typing import Dict, Any, Callable, List, Optional
from google.genai import types

from ..security.permissions import permission_engine, RiskCategory
from ..security.audit import record_audit
from ..events.websocket_manager import ws_manager
from ..config import settings

# Import OS control functions
from .applications import open_application, open_url
from .filesystem import (
    list_directory,
    search_files,
    get_file_metadata,
    read_file,
    write_file,
    create_directory,
    delete_file,
    find_large_files,
)
from .processes import list_processes, find_processes_by_name, terminate_process
from .system_info import get_system_telemetry, get_detailed_system_info
from .terminal import execute_terminal_command
from .media import set_volume, read_clipboard, take_screenshot

logger = logging.getLogger("omega.os.registry")


class ToolDefinition:
    def __init__(
        self,
        name: str,
        description: str,
        parameters_schema: Dict[str, Any],
        func: Callable,
        category: RiskCategory,
    ):
        self.name = name
        self.description = description
        self.parameters_schema = parameters_schema
        self.func = func
        self.category = category


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(
        self,
        name: str,
        description: str,
        parameters_schema: Dict[str, Any],
        func: Callable,
        category: RiskCategory = RiskCategory.READ_ONLY,
    ):
        tool_def = ToolDefinition(name, description, parameters_schema, func, category)
        self._tools[name] = tool_def
        permission_engine.register_tool_policy(name, category)

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def get_gemini_tools(self) -> List[types.Tool]:
        """
        Converts registered tools into google.genai Tool declarations.
        """
        declarations = []
        for name, tool in self._tools.items():
            properties = {}
            required = tool.parameters_schema.get("required", [])

            for prop_name, prop_meta in tool.parameters_schema.get("properties", {}).items():
                prop_type = prop_meta.get("type", "STRING").upper()
                type_enum = getattr(types.Type, prop_type, types.Type.STRING)
                items_schema = None
                if type_enum == types.Type.ARRAY:
                    items_schema = types.Schema(type=types.Type.STRING)
                properties[prop_name] = types.Schema(
                    type=type_enum,
                    description=prop_meta.get("description", ""),
                    items=items_schema,
                )

            declaration = types.FunctionDeclaration(
                name=tool.name,
                description=tool.description,
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties=properties,
                    required=required,
                ),
            )
            declarations.append(declaration)

        return [types.Tool(function_declarations=declarations)]

    async def execute_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates, permissions-checks, executes, audits, and verifies a tool call.
        """
        tool = self._tools.get(name)
        if not tool:
            return {
                "tool_name": name,
                "status": "failed",
                "error": f"Unknown tool '{name}'.",
                "verified": False,
            }

        start_time = time.time()
        category = tool.category

        # Permission check
        requires_approval = permission_engine.requires_approval(name)
        approved = True
        if requires_approval:
            desc = f"Execute tool '{name}' with arguments: {arguments}"
            approved = await permission_engine.request_approval(name, arguments, desc)
            if not approved:
                duration_ms = round((time.time() - start_time) * 1000, 2)
                record_audit(name, arguments, "rejected", duration_ms, False, False, "User rejected or approval timed out.")
                return {
                    "tool_name": name,
                    "status": "rejected",
                    "error": "Action was not approved by user or approval request timed out.",
                    "duration_ms": duration_ms,
                    "verified": False,
                }

        # Execution
        try:
            if inspect.iscoroutinefunction(tool.func):
                result = await tool.func(**arguments)
            else:
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(None, lambda: tool.func(**arguments))

            duration_ms = round((time.time() - start_time) * 1000, 2)
            verified = result.get("verified", True) if isinstance(result, dict) else True
            success = result.get("success", True) if isinstance(result, dict) else True
            status = "completed" if success else "failed"
            error = result.get("error") if isinstance(result, dict) else None

            record_audit(name, arguments, status, duration_ms, verified, approved, error)

            return {
                "tool_name": name,
                "status": status,
                "result": result,
                "duration_ms": duration_ms,
                "verified": verified,
                "required_approval": requires_approval,
            }
        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            err_str = str(e)
            record_audit(name, arguments, "error", duration_ms, False, approved, err_str)
            return {
                "tool_name": name,
                "status": "failed",
                "error": err_str,
                "duration_ms": duration_ms,
                "verified": False,
                "required_approval": requires_approval,
            }

    def _register_default_tools(self):
        # 1. Applications
        self.register(
            name="open_application",
            description="Launches an application such as VS Code, browser, file manager, terminal, or notepad.",
            parameters_schema={
                "properties": {
                    "app_name": {"type": "STRING", "description": "Name of the application: vscode, browser, explorer, terminal, etc."},
                    "target_argument": {"type": "STRING", "description": "Optional file or project path or URL to open in the app."},
                },
                "required": ["app_name"],
            },
            func=open_application,
            category=RiskCategory.REVERSIBLE,
        )

        self.register(
            name="open_url",
            description="Opens a URL in the user's default web browser.",
            parameters_schema={
                "properties": {
                    "url": {"type": "STRING", "description": "The URL to open."},
                },
                "required": ["url"],
            },
            func=open_url,
            category=RiskCategory.REVERSIBLE,
        )

        # 2. Filesystem
        self.register(
            name="list_directory",
            description="Lists files and subdirectories in an authorized directory.",
            parameters_schema={
                "properties": {
                    "path_str": {"type": "STRING", "description": "Relative or absolute directory path (defaults to current project)."},
                },
                "required": [],
            },
            func=list_directory,
            category=RiskCategory.READ_ONLY,
        )

        self.register(
            name="search_files",
            description="Searches for files matching a keyword pattern in an authorized directory.",
            parameters_schema={
                "properties": {
                    "pattern": {"type": "STRING", "description": "Keyword or file pattern to search for."},
                    "base_path_str": {"type": "STRING", "description": "Root path to start search from."},
                },
                "required": ["pattern"],
            },
            func=search_files,
            category=RiskCategory.READ_ONLY,
        )

        self.register(
            name="get_file_metadata",
            description="Inspects file size, modification time, and metadata.",
            parameters_schema={
                "properties": {
                    "path_str": {"type": "STRING", "description": "Path to file."},
                },
                "required": ["path_str"],
            },
            func=get_file_metadata,
            category=RiskCategory.READ_ONLY,
        )

        self.register(
            name="read_file",
            description="Reads the text contents of an authorized file.",
            parameters_schema={
                "properties": {
                    "path_str": {"type": "STRING", "description": "Path to the file to read."},
                    "max_chars": {"type": "INTEGER", "description": "Maximum characters to return."},
                },
                "required": ["path_str"],
            },
            func=read_file,
            category=RiskCategory.READ_ONLY,
        )

        self.register(
            name="write_file",
            description="Creates or overwrites a file in an authorized workspace with automatic backup.",
            parameters_schema={
                "properties": {
                    "path_str": {"type": "STRING", "description": "File path to write."},
                    "content": {"type": "STRING", "description": "Full file content to write."},
                    "make_backup": {"type": "BOOLEAN", "description": "Whether to create a .bak backup if file exists."},
                },
                "required": ["path_str", "content"],
            },
            func=write_file,
            category=RiskCategory.REVERSIBLE,
        )

        self.register(
            name="create_directory",
            description="Creates a new directory in the workspace.",
            parameters_schema={
                "properties": {
                    "path_str": {"type": "STRING", "description": "Directory path to create."},
                },
                "required": ["path_str"],
            },
            func=create_directory,
            category=RiskCategory.REVERSIBLE,
        )

        self.register(
            name="delete_file",
            description="Deletes a file or directory. Destructive operation requiring explicit user approval.",
            parameters_schema={
                "properties": {
                    "path_str": {"type": "STRING", "description": "Path to delete."},
                },
                "required": ["path_str"],
            },
            func=delete_file,
            category=RiskCategory.DESTRUCTIVE,
        )

        self.register(
            name="find_large_files",
            description="Scans the workspace to identify files exceeding a given size in megabytes.",
            parameters_schema={
                "properties": {
                    "base_path_str": {"type": "STRING", "description": "Directory to scan."},
                    "min_mb": {"type": "NUMBER", "description": "Minimum file size in MB."},
                },
                "required": [],
            },
            func=find_large_files,
            category=RiskCategory.READ_ONLY,
        )

        # 3. Processes
        self.register(
            name="list_processes",
            description="Lists active system processes sorted by CPU or memory usage.",
            parameters_schema={
                "properties": {
                    "limit": {"type": "INTEGER", "description": "Number of processes to return."},
                    "sort_by": {"type": "STRING", "description": "'cpu' or 'memory'."},
                },
                "required": [],
            },
            func=list_processes,
            category=RiskCategory.READ_ONLY,
        )

        self.register(
            name="find_processes_by_name",
            description="Finds running processes by application name.",
            parameters_schema={
                "properties": {
                    "name_query": {"type": "STRING", "description": "Process name or substring."},
                },
                "required": ["name_query"],
            },
            func=find_processes_by_name,
            category=RiskCategory.READ_ONLY,
        )

        self.register(
            name="terminate_process",
            description="Terminates a user process by PID. Destructive operation requiring confirmation.",
            parameters_schema={
                "properties": {
                    "pid": {"type": "INTEGER", "description": "Process ID to terminate."},
                },
                "required": ["pid"],
            },
            func=terminate_process,
            category=RiskCategory.DESTRUCTIVE,
        )

        # 4. System info
        self.register(
            name="get_system_telemetry",
            description="Fetches live hardware telemetry (CPU, RAM, disk, battery).",
            parameters_schema={"properties": {}, "required": []},
            func=get_system_telemetry,
            category=RiskCategory.READ_ONLY,
        )

        # 5. Developer Terminal
        self.register(
            name="execute_terminal_command",
            description="Executes an approved developer command (git, npm, pytest, tsc, python, oxlint) in a workspace.",
            parameters_schema={
                "properties": {
                    "command_binary": {"type": "STRING", "description": "Binary name (e.g. npm, git, pytest, python)."},
                    "arguments": {"type": "ARRAY", "description": "List of command argument strings."},
                    "cwd_path": {"type": "STRING", "description": "Workspace working directory."},
                },
                "required": ["command_binary", "arguments"],
            },
            func=execute_terminal_command,
            category=RiskCategory.SENSITIVE,
        )

        # 6. Media / Utils
        self.register(
            name="set_volume",
            description="Sets the computer master volume (0-100%).",
            parameters_schema={
                "properties": {
                    "level_percent": {"type": "INTEGER", "description": "Target volume percentage 0-100."},
                },
                "required": ["level_percent"],
            },
            func=set_volume,
            category=RiskCategory.REVERSIBLE,
        )

        self.register(
            name="read_clipboard",
            description="Reads current text from the system clipboard.",
            parameters_schema={"properties": {}, "required": []},
            func=read_clipboard,
            category=RiskCategory.SENSITIVE,
        )

        self.register(
            name="take_screenshot",
            description="Captures a desktop screenshot upon explicit user request.",
            parameters_schema={"properties": {}, "required": []},
            func=take_screenshot,
            category=RiskCategory.SENSITIVE,
        )

        # 7. Study Assistant & Research
        from ..study.retrieval import answer_study_question
        from ..study.ingestion import list_study_documents
        from ..study.quiz import generate_quiz
        from ..memory.store import save_memory, search_memory
        from ..study.graph_builder import knowledge_graph
        self.register(
            name="query_study_material",
            description="Answers questions using the student's imported study library and textbooks with explicit citations.",
            parameters_schema={
                "properties": {
                    "question": {"type": "STRING", "description": "The concept or question to answer from study materials."},
                    "subject": {"type": "STRING", "description": "Optional academic subject filter (e.g. Operating Systems, DSA)."},
                },
                "required": ["question"],
            },
            func=answer_study_question,
            category=RiskCategory.READ_ONLY,
        )

        self.register(
            name="list_study_documents",
            description="Lists all imported textbooks, lecture notes, and study files in the library.",
            parameters_schema={"properties": {}, "required": []},
            func=list_study_documents,
            category=RiskCategory.READ_ONLY,
        )

        self.register(
            name="get_quiz_questions",
            description="Generates a multiple choice quiz on a given subject and topic to test understanding.",
            parameters_schema={
                "properties": {
                    "subject": {"type": "STRING", "description": "Subject name."},
                    "topic": {"type": "STRING", "description": "Topic to quiz on."},
                },
                "required": ["subject", "topic"],
            },
            func=generate_quiz,
            category=RiskCategory.READ_ONLY,
        )

        # 8. Persistent Memory
        self.register(
            name="save_memory",
            description="Saves a personal fact, decision, preference, or project note into persistent memory.",
            parameters_schema={
                "properties": {
                    "title": {"type": "STRING", "description": "Short summary or title of the memory."},
                    "content": {"type": "STRING", "description": "Full details of the memory."},
                    "category": {"type": "STRING", "description": "'fact', 'decision', 'preference', or 'note'."},
                },
                "required": ["title", "content"],
            },
            func=save_memory,
            category=RiskCategory.REVERSIBLE,
        )

        self.register(
            name="search_memory",
            description="Searches persistent personal memories by keyword.",
            parameters_schema={
                "properties": {
                    "query": {"type": "STRING", "description": "Keyword to look up in saved memories."},
                },
                "required": ["query"],
            },
            func=search_memory,
            category=RiskCategory.READ_ONLY,
        )

        # 9. Knowledge Graph
        self.register(
            name="get_knowledge_graph",
            description="Explores the persistent 3D neural knowledge graph of concepts and relationships.",
            parameters_schema={
                "properties": {
                    "query": {"type": "STRING", "description": "Optional concept keyword to explore neighborhood around."},
                },
                "required": [],
            },
            func=lambda query=None: knowledge_graph.search_neighborhood(query) if query else knowledge_graph.get_full_graph(),
            category=RiskCategory.READ_ONLY,
        )


tool_registry = ToolRegistry()
tool_registry._register_default_tools()
