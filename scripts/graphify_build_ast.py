#!/usr/bin/env python3
"""
Genera graphify-out/ en modo AST-only (sin LLM semántico).

Uso (desde la raíz del repo):
  py -3.12 scripts/graphify_build_ast.py

Requisito: pip install graphifyy
Corpus por defecto: backend_v2/app, frontend/src, docs
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_repo_env() -> None:
    env_file = REPO_ROOT / ".env"
    try:
        from dotenv import load_dotenv

        load_dotenv(env_file, override=False)
    except ImportError:
        pass


SCAN_PATHS = [
    REPO_ROOT / "backend_v2" / "app",
    REPO_ROOT / "frontend" / "src",
    REPO_ROOT / "docs",
]
OUT = REPO_ROOT / "graphify-out"


def _merge_detect(results: list[dict]) -> dict:
    merged_files: dict[str, list[str]] = {}
    total_files = 0
    total_words = 0
    skipped: list[str] = []
    for r in results:
        total_files += r.get("total_files", 0)
        total_words += r.get("total_words", 0)
        skipped.extend(r.get("skipped_sensitive", []) or [])
        for cat, paths in (r.get("files") or {}).items():
            merged_files.setdefault(cat, []).extend(paths)
    for cat in merged_files:
        merged_files[cat] = sorted(set(merged_files[cat]))
    return {
        "total_files": total_files,
        "total_words": total_words,
        "files": merged_files,
        "skipped_sensitive": skipped,
        "needs_graph": total_files > 0,
        "warning": (
            "AST-only build (no semantic LLM). "
            "Set GEMINI_API_KEY and run: py -3.12 -m graphify extract . "
            "for richer docs/rationale edges."
        ),
        "graphifyignore_patterns": 0,
        "mode": "ast_only",
    }


def main() -> int:
    _load_repo_env()
    try:
        from graphify.detect import detect
        from graphify.extract import collect_files, extract
        from graphify.build import build_from_json
        from graphify.cluster import cluster, score_all
        from graphify.analyze import god_nodes, surprising_connections, suggest_questions
        from graphify.report import generate
        from graphify.export import to_json
    except ImportError:
        print("error: instala graphifyy — pip install graphifyy", file=sys.stderr)
        return 1

    for p in SCAN_PATHS:
        if not p.exists():
            print(f"error: ruta no encontrada: {p}", file=sys.stderr)
            return 1

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / ".graphify_python").write_text(sys.executable, encoding="utf-8")
    (OUT / ".graphify_root").write_text(str(REPO_ROOT.resolve()), encoding="utf-8")

    detections = [detect(p) for p in SCAN_PATHS]
    detection = _merge_detect(detections)
    (OUT / ".graphify_detect.json").write_text(
        json.dumps(detection, indent=2), encoding="utf-8"
    )

    code_paths = [Path(f) for f in detection.get("files", {}).get("code", [])]
    code_files: list[Path] = []
    for f in code_paths:
        code_files.extend(collect_files(f) if f.is_dir() else [f])

    if code_files:
        ast = extract(code_files, cache_root=REPO_ROOT)
    else:
        ast = {"nodes": [], "edges": [], "input_tokens": 0, "output_tokens": 0}

    (OUT / ".graphify_ast.json").write_text(json.dumps(ast, indent=2), encoding="utf-8")

    sem = {"nodes": [], "edges": [], "hyperedges": [], "input_tokens": 0, "output_tokens": 0}
    (OUT / ".graphify_semantic.json").write_text(json.dumps(sem, indent=2), encoding="utf-8")

    merged_nodes = list(ast["nodes"])
    merged_edges = list(ast.get("edges", []))
    extraction = {
        "nodes": merged_nodes,
        "edges": merged_edges,
        "hyperedges": [],
        "input_tokens": 0,
        "output_tokens": 0,
    }
    (OUT / ".graphify_extract.json").write_text(
        json.dumps(extraction, indent=2), encoding="utf-8"
    )

    G = build_from_json(extraction)
    if G.number_of_nodes() == 0:
        print("error: grafo vacío tras extracción AST", file=sys.stderr)
        return 1

    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    labels = {cid: f"Comunidad {cid}" for cid in communities}
    questions = suggest_questions(G, communities, labels)
    tokens = {"input": 0, "output": 0}

    report = generate(
        G,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        detection,
        tokens,
        str(REPO_ROOT),
        suggested_questions=questions,
    )
    (OUT / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
    to_json(G, communities, str(OUT / "graph.json"))
    (OUT / ".graphify_labels.json").write_text(
        json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False),
        encoding="utf-8",
    )
    analysis = {
        "communities": {str(k): v for k, v in communities.items()},
        "cohesion": {str(k): v for k, v in cohesion.items()},
        "gods": gods,
        "surprises": surprises,
        "questions": questions,
        "build": "ast_only",
    }
    (OUT / ".graphify_analysis.json").write_text(
        json.dumps(analysis, indent=2), encoding="utf-8"
    )

    print(
        f"graphify-out listo: {G.number_of_nodes()} nodos, "
        f"{G.number_of_edges()} aristas, {len(communities)} comunidades (AST-only)"
    )
    print(f"  GRAPH_REPORT.md -> {OUT / 'GRAPH_REPORT.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
