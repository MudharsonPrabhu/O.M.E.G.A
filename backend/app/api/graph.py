"""
API Route: Persistent Neural Knowledge Graph
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from ..study.graph_builder import knowledge_graph

router = APIRouter(prefix="/graph", tags=["graph"])


class GraphNodeCreate(BaseModel):
    id: str
    kind: str = "concept"
    label: str
    sub: Optional[str] = None
    color: Optional[str] = None
    size: float = 0.2


class GraphEdgeCreate(BaseModel):
    source: str
    target: str
    kind: str = "related_to"


@router.get("")
async def get_graph():
    return knowledge_graph.get_full_graph()


@router.get("/search")
async def search_graph(q: str = Query(..., min_length=1), depth: int = 1):
    return knowledge_graph.search_neighborhood(q, depth=depth)


@router.post("/node")
async def add_node(node: GraphNodeCreate):
    knowledge_graph.add_entity(
        node_id=node.id,
        kind=node.kind,
        label=node.label,
        sub=node.sub,
        color=node.color,
        size=node.size,
    )
    return {"success": True, "node_id": node.id}


@router.post("/edge")
async def add_edge(edge: GraphEdgeCreate):
    knowledge_graph.add_relationship(
        source_id=edge.source,
        target_id=edge.target,
        kind=edge.kind,
    )
    return {"success": True, "source": edge.source, "target": edge.target}
