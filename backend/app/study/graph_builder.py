"""
Persistent Neural Knowledge Graph Engine (SQLite + NetworkX)
"""

import sqlite3
import json
import logging
from typing import Dict, Any, List, Optional
import networkx as nx

from .ingestion import get_db_connection

logger = logging.getLogger("omega.study.graph")

DEFAULT_TOKENS = {
    "signal": "#5eead4",
    "pulse": "#7c9cff",
    "coding": "#3b82f6",
    "research": "#b794f6",
    "memory": "#34d399",
    "warning": "#fbbf24",
    "alert": "#fb5d6b",
}


def init_graph_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL, -- agent, memory, thought, concept, subject, document
                label TEXT NOT NULL,
                sub TEXT,
                color TEXT NOT NULL,
                size REAL DEFAULT 0.2,
                metadata TEXT
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                kind TEXT NOT NULL, -- routes, chain, touches, contains, requires, related_to
                FOREIGN KEY (source) REFERENCES knowledge_graph_nodes (id) ON DELETE CASCADE,
                FOREIGN KEY (target) REFERENCES knowledge_graph_nodes (id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()

        # Check if table is empty, seed with initial computer science knowledge graph
        cursor.execute("SELECT COUNT(*) FROM knowledge_graph_nodes")
        if cursor.fetchone()[0] == 0:
            seed_initial_cs_graph(conn)

    finally:
        conn.close()


def seed_initial_cs_graph(conn: sqlite3.Connection):
    cursor = conn.cursor()
    initial_nodes = [
        # Subjects
        ("subj-os", "subject", "Operating Systems", "Core CS Domain", DEFAULT_TOKENS["research"], 0.35),
        ("subj-dsa", "subject", "Data Structures & Algos", "Core CS Domain", DEFAULT_TOKENS["coding"], 0.35),
        ("subj-dbms", "subject", "Database Systems", "Core CS Domain", DEFAULT_TOKENS["memory"], 0.35),
        ("subj-cn", "subject", "Computer Networks", "Core CS Domain", DEFAULT_TOKENS["pulse"], 0.35),

        # OS Concepts
        ("c-scheduling", "concept", "Process Scheduling", "CPU Allocation Algorithms", DEFAULT_TOKENS["pulse"], 0.25),
        ("c-ctx-switch", "concept", "Context Switching", "PCB state save and reload", DEFAULT_TOKENS["signal"], 0.20),
        ("c-paging", "concept", "Paging & Virtual Memory", "Page tables, TLB, page faults", DEFAULT_TOKENS["pulse"], 0.25),
        ("c-segmentation", "concept", "Segmentation", "Logical memory address translation", DEFAULT_TOKENS["signal"], 0.20),
        ("c-deadlock", "concept", "Deadlock & Banker's Algo", "Mutual exclusion, hold & wait", DEFAULT_TOKENS["alert"], 0.22),

        # DSA Concepts
        ("c-trees", "concept", "Binary Trees & BST", "Hierarchical data structures", DEFAULT_TOKENS["coding"], 0.22),
        ("c-graphs", "concept", "Graph Traversal (DFS/BFS)", "Topological sorting, Dijkstra", DEFAULT_TOKENS["signal"], 0.24),
        ("c-dp", "concept", "Dynamic Programming", "Optimal substructure & memoization", DEFAULT_TOKENS["pulse"], 0.24),

        # DBMS Concepts
        ("c-indexing", "concept", "B-Tree Indexing", "Query optimization & index lookups", DEFAULT_TOKENS["memory"], 0.24),
        ("c-acid", "concept", "ACID Transactions", "Concurrency & isolation levels", DEFAULT_TOKENS["memory"], 0.22),
    ]

    cursor.executemany(
        "INSERT INTO knowledge_graph_nodes (id, kind, label, sub, color, size, metadata) VALUES (?, ?, ?, ?, ?, ?, '{}')",
        initial_nodes,
    )

    initial_edges = [
        ("subj-os", "c-scheduling", "contains"),
        ("c-scheduling", "c-ctx-switch", "requires"),
        ("subj-os", "c-paging", "contains"),
        ("subj-os", "c-segmentation", "contains"),
        ("c-paging", "c-segmentation", "related_to"),
        ("subj-os", "c-deadlock", "contains"),
        ("subj-dsa", "c-trees", "contains"),
        ("subj-dsa", "c-graphs", "contains"),
        ("subj-dsa", "c-dp", "contains"),
        ("subj-dbms", "c-indexing", "contains"),
        ("subj-dbms", "c-acid", "contains"),
        ("c-indexing", "c-trees", "requires"),
    ]

    cursor.executemany(
        "INSERT INTO knowledge_graph_edges (source, target, kind) VALUES (?, ?, ?)",
        initial_edges,
    )
    conn.commit()


init_graph_db()


class KnowledgeGraphEngine:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._load_from_db()

    def _load_from_db(self):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM knowledge_graph_nodes")
            nodes = cursor.fetchall()
            for n in nodes:
                self.graph.add_node(
                    n["id"],
                    kind=n["kind"],
                    label=n["label"],
                    sub=n["sub"],
                    color=n["color"],
                    size=n["size"],
                    metadata=json.loads(n["metadata"] or "{}"),
                )

            cursor.execute("SELECT * FROM knowledge_graph_edges")
            edges = cursor.fetchall()
            for e in edges:
                self.graph.add_edge(e["source"], e["target"], kind=e["kind"])
        finally:
            conn.close()

    def add_entity(
        self,
        node_id: str,
        kind: str,
        label: str,
        sub: Optional[str] = None,
        color: Optional[str] = None,
        size: float = 0.2,
        metadata: Optional[Dict] = None,
    ):
        c = color or DEFAULT_TOKENS.get(kind, DEFAULT_TOKENS["signal"])
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO knowledge_graph_nodes (id, kind, label, sub, color, size, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (node_id, kind, label, sub, c, size, json.dumps(metadata or {})),
            )
            conn.commit()
        finally:
            conn.close()

        self.graph.add_node(node_id, kind=kind, label=label, sub=sub, color=c, size=size, metadata=metadata or {})

    def add_relationship(self, source_id: str, target_id: str, kind: str = "related_to"):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO knowledge_graph_edges (source, target, kind) VALUES (?, ?, ?)",
                (source_id, target_id, kind),
            )
            conn.commit()
        finally:
            conn.close()

        self.graph.add_edge(source_id, target_id, kind=kind)

    def get_full_graph(self) -> Dict[str, Any]:
        """
        Returns full graph formatted directly for the 3D NeuralGraphPage.
        """
        nodes = []
        for n_id, data in self.graph.nodes(data=True):
            nodes.append({
                "id": n_id,
                "kind": data.get("kind", "concept"),
                "label": data.get("label", n_id),
                "sub": data.get("sub", None),
                "color": data.get("color", DEFAULT_TOKENS["signal"]),
                "size": data.get("size", 0.2),
                "active": False,
                "raw": data,
            })

        edges = []
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "kind": data.get("kind", "related_to"),
            })

        return {"nodes": nodes, "edges": edges}

    def search_neighborhood(self, query: str, depth: int = 1) -> Dict[str, Any]:
        matched_nodes = []
        q = query.lower()
        for n_id, data in self.graph.nodes(data=True):
            if q in data.get("label", "").lower() or q in n_id.lower():
                matched_nodes.append(n_id)

        subgraph_nodes = set(matched_nodes)
        for n in matched_nodes:
            # Add neighbors up to depth
            neighbors = nx.single_source_shortest_path_length(self.graph.to_undirected(), n, cutoff=depth)
            subgraph_nodes.update(neighbors.keys())

        nodes = []
        for n_id in subgraph_nodes:
            data = self.graph.nodes[n_id]
            nodes.append({
                "id": n_id,
                "kind": data.get("kind", "concept"),
                "label": data.get("label", n_id),
                "sub": data.get("sub", None),
                "color": data.get("color", DEFAULT_TOKENS["signal"]),
                "size": data.get("size", 0.2),
                "active": n_id in matched_nodes,
                "raw": data,
            })

        subgraph = self.graph.subgraph(subgraph_nodes)
        edges = [
            {"source": u, "target": v, "kind": data.get("kind", "related_to")}
            for u, v, data in subgraph.edges(data=True)
        ]

        return {"query": query, "nodes": nodes, "edges": edges}


knowledge_graph = KnowledgeGraphEngine()
