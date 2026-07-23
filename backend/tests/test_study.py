"""
Automated Tests for Study Assistant, Document Ingestion, and Knowledge Graph
"""

import pytest
from pathlib import Path
from app.study.ingestion import ingest_document, list_study_documents
from app.study.retrieval import search_study_chunks
from app.study.graph_builder import knowledge_graph


def test_document_ingestion_and_search(tmp_path):
    sample_doc = Path("backend/data/sample_lecture_notes.md")
    sample_doc.parent.mkdir(parents=True, exist_ok=True)
    sample_doc.write_text(
        "# Operating Systems Notes\n\nProcess scheduling algorithms include Round Robin, Shortest Job First, and Priority Scheduling. Context switching incurs CPU overhead.",
        encoding="utf-8",
    )

    # Ingest
    res = ingest_document(str(sample_doc), subject="Operating Systems", title="OS Lecture Notes")
    assert res["success"] is True
    assert res["chunks_indexed"] >= 1

    # Search
    chunks = search_study_chunks("Round Robin scheduling", subject="Operating Systems")
    assert len(chunks) >= 1
    assert "Context switching" in chunks[0]["text"]


def test_knowledge_graph_structure():
    graph_data = knowledge_graph.get_full_graph()
    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert len(graph_data["nodes"]) >= 5

    # Check neighborhood search
    nbr = knowledge_graph.search_neighborhood("Operating Systems")
    assert len(nbr["nodes"]) >= 1
