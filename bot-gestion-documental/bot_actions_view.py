"""
Bot Actions View - Vista para acciones agrupadas
===============================================

Vista para mostrar y ejecutar acciones agrupadas por tipo.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import messagebox, END
from typing import List, Dict, Any
from bot_actions import ActionManager


class ActionsView:
    """Vista para mostrar acciones agrupadas"""
    
    def __init__(self, parent, base_path: str, log_callback=None):
        self.parent = parent
        self.base_path = base_path
        self.log_callback = log_callback or print
        self.action_manager = ActionManager(base_path, log_callback)
        self.suggestions = []
        
        # Crear ventana
        self.window = ttk.Toplevel(parent)
        self.window.title("Vista de Acciones - Recomendaciones")
        self.window.geometry("1200x700")
        
        # Crear interfaz
        self._create_ui()
    
    def _log(self, message: str):
        """Log con callback"""
        self.log_callback(message)
    
    def _create_ui(self):
        """Crear interfaz de usuario"""
        # Frame principal
        main_frame = ttk.Frame(self.window, padding="10")
        main_frame.pack(fill=BOTH, expand=True)
        
        # Título
        title_label = ttk.Label(main_frame, text="🎯 Acciones Agrupadas por Tipo", 
                               font=("Arial", 16, "bold"))
        title_label.pack(pady=(0, 20))
        
        # Frame de botones principales
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Button(button_frame, text="🔄 Actualizar Vista", 
                  command=self._refresh_view, bootstyle=INFO).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="🆕 Ejecutar Creaciones", 
                  command=self._execute_creations, bootstyle=SUCCESS).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📁 Ejecutar Movimientos", 
                  command=self._execute_moves, bootstyle=WARNING).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="❌ Cerrar", 
                  command=self._close_view, bootstyle=DANGER).pack(side=LEFT, padx=(0, 5))
        
        # Frame de contenido
        content_frame = ttk.Frame(main_frame)
        content_frame.pack(fill=BOTH, expand=True)
        
        # Notebook para pestañas
        self.notebook = ttk.Notebook(content_frame)
        self.notebook.pack(fill=BOTH, expand=True)
        
        # Pestaña de Creaciones
        self.create_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.create_frame, text="🆕 Crear Carpetas")
        
        # TreeView para creaciones
        self.create_tree = ttk.Treeview(self.create_frame, 
                                       columns=("id", "nombre", "etapa", "accion"), 
                                       show="headings", height=8)
        self.create_tree.pack(fill=BOTH, expand=True, padx=10, pady=10)
        
        # Configurar columnas de creaciones
        self.create_tree.heading("id", text="ID")
        self.create_tree.heading("nombre", text="Nombre")
        self.create_tree.heading("etapa", text="Etapa")
        self.create_tree.heading("accion", text="Acción")
        
        self.create_tree.column("id", width=120)
        self.create_tree.column("nombre", width=400)
        self.create_tree.column("etapa", width=200)
        self.create_tree.column("accion", width=150)
        
        # Pestaña de Movimientos
        self.move_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.move_frame, text="📁 Mover Carpetas")
        
        # TreeView para movimientos
        self.move_tree = ttk.Treeview(self.move_frame, 
                                     columns=("id", "nombre", "etapa", "ruta_actual", "accion"), 
                                     show="headings", height=8)
        self.move_tree.pack(fill=BOTH, expand=True, padx=10, pady=10)
        
        # Configurar columnas de movimientos
        self.move_tree.heading("id", text="ID")
        self.move_tree.heading("nombre", text="Nombre")
        self.move_tree.heading("etapa", text="Etapa")
        self.move_tree.heading("ruta_actual", text="Ruta Actual")
        self.move_tree.heading("accion", text="Acción")
        
        self.move_tree.column("id", width=120)
        self.move_tree.column("nombre", width=300)
        self.move_tree.column("etapa", width=150)
        self.move_tree.column("ruta_actual", width=300)
        self.move_tree.column("accion", width=150)
        
        # Pestaña de Pendientes
        self.pending_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.pending_frame, text="⏸️ Pendientes")
        
        # TreeView para pendientes
        self.pending_tree = ttk.Treeview(self.pending_frame, 
                                        columns=("id", "nombre", "motivo"), 
                                        show="headings", height=8)
        self.pending_tree.pack(fill=BOTH, expand=True, padx=10, pady=10)
        
        # Configurar columnas de pendientes
        self.pending_tree.heading("id", text="ID")
        self.pending_tree.heading("nombre", text="Nombre")
        self.pending_tree.heading("motivo", text="Motivo")
        
        self.pending_tree.column("id", width=120)
        self.pending_tree.column("nombre", width=400)
        self.pending_tree.column("motivo", width=300)
        
        # Log
        self.log_text = ttk.Text(main_frame, height=6, wrap=WORD)
        self.log_text.pack(fill=X, pady=(10, 0))
        
        # Scrollbar para log
        scrollbar = ttk.Scrollbar(main_frame, orient=VERTICAL, command=self.log_text.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.log_text.configure(yscrollcommand=scrollbar.set)
    
    def load_suggestions(self, suggestions: List[Dict[str, Any]]):
        """Cargar sugerencias en la vista"""
        self.suggestions = suggestions
        self._refresh_view()
    
    def _refresh_view(self):
        """Actualizar vista con datos actuales"""
        if not self.suggestions:
            self._log("❌ No hay sugerencias para mostrar")
            return
        
        # Agrupar acciones
        grouped = self.action_manager.group_actions(self.suggestions)
        
        # Limpiar trees
        for item in self.create_tree.get_children():
            self.create_tree.delete(item)
        for item in self.move_tree.get_children():
            self.move_tree.delete(item)
        for item in self.pending_tree.get_children():
            self.pending_tree.delete(item)
        
        # Llenar pestaña de creaciones
        for suggestion in grouped["🆕 CREAR"]:
            self.create_tree.insert("", END, values=(
                suggestion['dev_id'],
                suggestion['name'],
                suggestion['stage'],
                suggestion['action']
            ))
        
        # Llenar pestaña de movimientos
        for suggestion in grouped["📁 ABRIR"]:
            self.move_tree.insert("", END, values=(
                suggestion['dev_id'],
                suggestion['name'],
                suggestion['stage'],
                suggestion.get('folder_path', 'No encontrada'),
                suggestion['action']
            ))
        
        # Llenar pestaña de pendientes
        for suggestion in grouped["⏸️ PENDIENTE"]:
            self.pending_tree.insert("", END, values=(
                suggestion['dev_id'],
                suggestion['name'],
                suggestion['suggestion']
            ))
        
        # Actualizar títulos de pestañas con conteos
        self.notebook.tab(0, text=f"🆕 Crear ({len(grouped['🆕 CREAR'])})")
        self.notebook.tab(1, text=f"📁 Mover ({len(grouped['📁 ABRIR'])})")
        self.notebook.tab(2, text=f"⏸️ Pendientes ({len(grouped['⏸️ PENDIENTE'])})")
        
        # Mostrar resumen
        summary = self.action_manager.get_action_summary(self.suggestions)
        self._log(f"📊 Vista actualizada - Crear: {summary['crear']}, Mover: {summary['abrir']}, Pendientes: {summary['pendiente']}")
    
    def _execute_creations(self):
        """Ejecutar acciones de creación"""
        if not self.suggestions:
            messagebox.showwarning("Sin datos", "No hay sugerencias cargadas")
            return
        
        # Obtener desarrollos para crear
        to_create = self.action_manager.get_creatable_developments(self.suggestions)
        
        if not to_create:
            messagebox.showinfo("Sin acciones", "No hay desarrollos para crear")
            return
        
        # Confirmar ejecución
        if not messagebox.askyesno("Confirmar", f"¿Ejecutar creación de {len(to_create)} carpetas?"):
            return
        
        # Ejecutar acciones
        results = self.action_manager.execute_create_actions(to_create)
        
        # Mostrar resultado
        if results['success']:
            messagebox.showinfo("Éxito", f"Se crearon {len(results['success'])} carpetas exitosamente")
        if results['errors']:
            messagebox.showerror("Errores", f"Hubo {len(results['errors'])} errores en la creación")
        
        # Actualizar vista
        self._refresh_view()
    
    def _execute_moves(self):
        """Ejecutar acciones de movimiento"""
        if not self.suggestions:
            messagebox.showwarning("Sin datos", "No hay sugerencias cargadas")
            return
        
        # Obtener desarrollos para mover
        to_move = self.action_manager.get_movable_developments(self.suggestions)
        
        if not to_move:
            messagebox.showinfo("Sin acciones", "No hay desarrollos para mover")
            return
        
        # Confirmar ejecución
        if not messagebox.askyesno("Confirmar", f"¿Ejecutar movimiento de {len(to_move)} carpetas?"):
            return
        
        # Ejecutar acciones
        results = self.action_manager.execute_move_actions(to_move)
        
        # Mostrar resultado
        if results['success']:
            messagebox.showinfo("Éxito", f"Se movieron {len(results['success'])} carpetas exitosamente")
        if results['errors']:
            messagebox.showerror("Errores", f"Hubo {len(results['errors'])} errores en el movimiento")
        
        # Actualizar vista
        self._refresh_view()
    
    def _close_view(self):
        """Cerrar vista"""
        self.window.destroy()
    
    def _log(self, message: str):
        """Agregar mensaje al log"""
        try:
            from datetime import datetime
            timestamp = datetime.now().strftime("%H:%M:%S")
            self.log_text.insert(END, f"[{timestamp}] {message}\n")
            self.log_text.see(END)
        except:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
