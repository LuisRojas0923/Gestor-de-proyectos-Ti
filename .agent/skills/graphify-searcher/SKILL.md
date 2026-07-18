---
name: graphify-searcher
description: Use when locating project files, symbols, modules, dependencies, or paths through an existing graphify knowledge graph.
---

# Adaptador Antigravity: graphify-searcher

Lee, en orden, `.opencode/agent/_shared-discovery.md`, `AGENTS.md` y `.opencode/agent/graphify-searcher.md`.

La definicion OpenCode es la fuente canonica del algoritmo y salida. Usa primero los comandos read-only `graphify query`, `graphify path`, `graphify explain` y `graphify check-update` sobre artefactos existentes. No ejecutes extraccion, update, export ni otros comandos que escriban; si falta el grafo, informa al orquestador para que decida si lo genera.
