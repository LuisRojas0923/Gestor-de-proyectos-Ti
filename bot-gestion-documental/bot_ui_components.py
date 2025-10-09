from __future__ import annotations

import tkinter as tk
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from typing import Iterable, Tuple


def setup_tree_columns(tree: ttk.Treeview) -> None:
    tree.configure(
        columns=("id", "nombre", "estado", "etapa", "ultima_actividad", "ruta", "accion"), 
        show="headings", 
        height=12,
        bootstyle="info"  # Estilo moderno para el TreeView
    )
    tree.heading("id", text="ID")
    tree.heading("nombre", text="Nombre")
    tree.heading("estado", text="Estado")
    tree.heading("etapa", text="Etapa")
    tree.heading("ultima_actividad", text="Última Actividad")
    tree.heading("ruta", text="Ruta")
    tree.heading("accion", text="Acción")
    tree.column("id", width=120, anchor=tk.W)
    tree.column("nombre", width=280, anchor=tk.W)
    tree.column("estado", width=100, anchor=tk.W)
    tree.column("etapa", width=130, anchor=tk.W)
    tree.column("ultima_actividad", width=150, anchor=tk.W)
    tree.column("ruta", width=350, anchor=tk.W)
    tree.column("accion", width=120, anchor=tk.CENTER)


def fill_tree(tree: ttk.Treeview, rows: Iterable[Tuple[str, str, str, str, str, str, str]]) -> None:
    for item in tree.get_children():
        tree.delete(item)
    for rid, name, status, stage, last_activity, path, action in rows:
        tree.insert("", tk.END, values=(rid, name, status, stage, last_activity, path, action))


