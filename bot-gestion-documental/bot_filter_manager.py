"""
Bot Filter Manager - Manejador de Filtros
=========================================

Módulo para gestionar filtros en el bot de gestión documental.
"""

from typing import List, Tuple, Callable
import tkinter as tk
from tkinter import ttk


class FilterManager:
    """Manejador de filtros para el bot"""
    
    def __init__(self, parent_frame, logger: Callable[[str], None]):
        self.parent_frame = parent_frame
        self._log = logger
        self.all_tree_data = []
        self.filter_entry = None
        self.filter_label = None
        self.tree = None
        
        self._create_filter_ui()
    
    def _create_filter_ui(self):
        """Crear interfaz de filtros"""
        # Frame de filtros
        filter_frame = ttk.LabelFrame(self.parent_frame, text="🔍 Filtros", padding="10")
        filter_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Filtro por nombre
        ttk.Label(filter_frame, text="Buscar por nombre:").pack(side=tk.LEFT, padx=(0, 5))
        self.filter_entry = ttk.Entry(filter_frame, width=40)
        self.filter_entry.pack(side=tk.LEFT, padx=(0, 10))
        self.filter_entry.bind('<KeyRelease>', self._on_filter_change)
        
        # Botón limpiar filtro
        ttk.Button(filter_frame, text="🗑️ Limpiar", command=self._clear_filter, bootstyle="light").pack(side=tk.LEFT, padx=(0, 5))
        
        # Contador de resultados
        self.filter_label = ttk.Label(filter_frame, text="Mostrando todos los elementos")
        self.filter_label.pack(side=tk.RIGHT)
    
    def set_tree(self, tree):
        """Establecer referencia al TreeView"""
        self.tree = tree
    
    def set_tree_data(self, tree_data: List[Tuple]):
        """Establecer datos del TreeView"""
        self.all_tree_data = tree_data.copy()
        self._update_filter_label()
    
    def _on_filter_change(self, event):
        """Manejar cambio en el filtro"""
        filter_text = self.filter_entry.get().strip().lower()
        
        if not filter_text:
            # Si no hay filtro, mostrar todos los datos
            self._apply_filter("")
        else:
            # Aplicar filtro
            self._apply_filter(filter_text)
    
    def _apply_filter(self, filter_text):
        """Aplicar filtro a los datos"""
        if not self.tree or not self.all_tree_data:
            return
        
        # Limpiar tree
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        filtered_count = 0
        
        for data in self.all_tree_data:
            # data es una tupla: (id, nombre, etapa, ruta, accion)
            if len(data) >= 2:
                nombre = data[1].lower() if data[1] else ""
                
                # Si no hay filtro o el nombre contiene el filtro
                if not filter_text or filter_text in nombre:
                    self.tree.insert("", tk.END, values=data)
                    filtered_count += 1
        
        # Actualizar contador
        total_count = len(self.all_tree_data)
        if filter_text:
            self.filter_label.config(text=f"Mostrando {filtered_count} de {total_count} elementos (filtrado por: '{filter_text}')")
        else:
            self.filter_label.config(text=f"Mostrando {total_count} elementos")
    
    def _clear_filter(self):
        """Limpiar filtro"""
        self.filter_entry.delete(0, tk.END)
        self._apply_filter("")
        self._log("🗑️ Filtro limpiado")
    
    def _update_filter_label(self):
        """Actualizar etiqueta del contador"""
        total_count = len(self.all_tree_data)
        self.filter_label.config(text=f"Mostrando {total_count} elementos")
    
    def refresh_filter(self):
        """Refrescar filtro actual"""
        filter_text = self.filter_entry.get().strip().lower()
        self._apply_filter(filter_text)
