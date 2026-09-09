from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Node:
    id: str
    kind: str
    label: str
    description: str
    status: str = "machine-indexed"
    jurisdiction: str | None = None
    category: str | None = None
    reviewed_at: str | None = None
    source_url: str | None = None
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class Edge:
    source: str
    target: str
    relation: str
    order: int | None = None


@dataclass
class CrawlResult:
    connector: str
    started_at: str
    finished_at: str
    nodes: list[Node] = field(default_factory=list)
    edges: list[Edge] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

