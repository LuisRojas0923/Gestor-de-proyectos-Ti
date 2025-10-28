"""
Bot TI Controls View - Vista de Gestión de Controles TI
=======================================================

Vista especializada para gestionar la copia de documentación a carpetas de controles TI.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import messagebox, Toplevel, scrolledtext
from typing import List, Dict, Any, Callable
from datetime import datetime
from bot_ti_controls_manager import TIControlsManager
from bot_ti_controls_view_helpers import (
    populate_main_tab,
    populate_summary_tab,
    show_summary,
    export_results,
    open_destination_folder,
    copy_control_files,
)


class TIControlsView(Toplevel):
    """Vista para gestionar controles TI de desarrollos"""
    
    def __init__(self, master, base_path: str, logger: Callable[[str], None]):
        super().__init__(master)
        self.title("Gestión de Controles TI")
        self.geometry("1600x900")
        self.transient(master)
        self.grab_set()
        
        self.base_path = base_path
        self._log = logger
        self.developments: List[Dict[str, Any]] = []
        self.validation_results: List[Dict[str, Any]] = []
        
        # Inicializar gestor de controles TI
        self.ti_manager = TIControlsManager(base_path, self._log)
        
        self._create_ui()
    
    def _create_ui(self):
        """Crear interfaz de usuario"""
        main_frame = ttk.Frame(self, padding="10")
        main_frame.pack(fill=BOTH, expand=True)
        
        # Título
        title_frame = ttk.Frame(main_frame)
        title_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(title_frame, text="📂 Gestión de Controles TI", 
                 font=("Arial", 16, "bold")).pack(side=LEFT)
        
        # Botones de control
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Button(button_frame, text="🔄 Validar Controles TI", 
                  command=self._validate_ti_controls, bootstyle=SUCCESS).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📊 Resumen", 
                  command=self._show_summary, bootstyle=INFO).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📋 Exportar", 
                  command=self._export_results, bootstyle=WARNING).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="❌ Cerrar", 
                  command=self.destroy, bootstyle=DANGER).pack(side=RIGHT)
        
        # Notebook para diferentes vistas
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.pack(fill=BOTH, expand=True, pady=(0, 10))
        
        # Pestaña principal de controles TI
        self.main_frame = ttk.Frame(self.notebook, padding="10")
        self.notebook.add(self.main_frame, text="🎯 Controles TI")
        self._create_main_tab()
        
        # Pestaña de resumen por control
        self.summary_frame = ttk.Frame(self.notebook, padding="10")
        self.notebook.add(self.summary_frame, text="📊 Resumen por Control")
        self._create_summary_tab()
        
        # Log
        log_frame = ttk.LabelFrame(main_frame, text="Registro de Operaciones", padding="10")
        log_frame.pack(fill=BOTH, expand=True)
        
        self.log_text = ttk.Text(log_frame, height=8, wrap=WORD, state="disabled")
        self.log_text.pack(side=LEFT, fill=BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(log_frame, orient=VERTICAL, command=self.log_text.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.log_text.configure(yscrollcommand=scrollbar.set)
    
    def _create_main_tab(self):
        """Crear pestaña principal"""
        # TreeView para controles TI
        tree_frame = ttk.Frame(self.main_frame)
        tree_frame.pack(fill=BOTH, expand=True)
        
        self.main_tree = ttk.Treeview(tree_frame, columns=(
            "dev_id", "dev_name", "stage", "control", "control_name", 
            "status", "can_copy", "documents_found", "documents_missing"
        ), show="headings", height=20)
        self.main_tree.pack(side=LEFT, fill=BOTH, expand=True)
        
        # Configurar columnas
        self.main_tree.heading("dev_id", text="ID")
        self.main_tree.heading("dev_name", text="Nombre")
        self.main_tree.heading("stage", text="Etapa")
        self.main_tree.heading("control", text="Control")
        self.main_tree.heading("control_name", text="Descripción")
        self.main_tree.heading("status", text="Estado TI")
        self.main_tree.heading("can_copy", text="Puede Copiar")
        self.main_tree.heading("documents_found", text="Docs Encontrados")
        self.main_tree.heading("documents_missing", text="Docs Faltantes")
        
        self.main_tree.column("dev_id", width=100)
        self.main_tree.column("dev_name", width=200)
        self.main_tree.column("stage", width=150)
        self.main_tree.column("control", width=100)
        self.main_tree.column("control_name", width=300)
        self.main_tree.column("status", width=120)
        self.main_tree.column("can_copy", width=100)
        self.main_tree.column("documents_found", width=150)
        self.main_tree.column("documents_missing", width=150)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(tree_frame, orient=VERTICAL, command=self.main_tree.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.main_tree.configure(yscrollcommand=scrollbar.set)
        
        # Eventos
        self.main_tree.bind("<Double-1>", self._on_double_click_main)
        
        # Botones de acción
        action_frame = ttk.Frame(self.main_frame)
        action_frame.pack(fill=X, pady=(10, 0))
        
        ttk.Button(action_frame, text="📋 Copiar Seleccionado", 
                  command=self._copy_selected, bootstyle=PRIMARY).pack(side=LEFT, padx=(0, 5))
        ttk.Button(action_frame, text="📁 Abrir Carpeta Destino", 
                  command=self._open_destination_folder, bootstyle=SECONDARY).pack(side=LEFT, padx=(0, 5))
    
    def _create_summary_tab(self):
        """Crear pestaña de resumen"""
        # TreeView para resumen por control
        tree_frame = ttk.Frame(self.summary_frame)
        tree_frame.pack(fill=BOTH, expand=True)
        
        self.summary_tree = ttk.Treeview(tree_frame, columns=(
            "control_code", "control_name", "total_applicable", "complete", 
            "partial", "not_copied", "percentage"
        ), show="headings", height=20)
        self.summary_tree.pack(side=LEFT, fill=BOTH, expand=True)
        
        # Configurar columnas
        self.summary_tree.heading("control_code", text="Control")
        self.summary_tree.heading("control_name", text="Descripción")
        self.summary_tree.heading("total_applicable", text="Aplicables")
        self.summary_tree.heading("complete", text="Completos")
        self.summary_tree.heading("partial", text="Parciales")
        self.summary_tree.heading("not_copied", text="No Copiados")
        self.summary_tree.heading("percentage", text="% Cumplimiento")
        
        self.summary_tree.column("control_code", width=100)
        self.summary_tree.column("control_name", width=300)
        self.summary_tree.column("total_applicable", width=100)
        self.summary_tree.column("complete", width=100)
        self.summary_tree.column("partial", width=100)
        self.summary_tree.column("not_copied", width=100)
        self.summary_tree.column("percentage", width=120)
    
    def load_developments(self, developments: List[Dict[str, Any]]):
        """Cargar desarrollos en la vista"""
        self.developments = developments
        self._log(f"📋 Cargados {len(developments)} desarrollos")
        
        # Validar automáticamente
        self._validate_ti_controls()
    
    def _validate_ti_controls(self):
        """Validar controles TI para todos los desarrollos"""
        if not self.developments:
            self._log("❌ No hay desarrollos cargados")
            messagebox.showwarning("Sin datos", "No hay desarrollos cargados para validar.")
            return
        
        self._log("🔍 Validando controles TI...")
        
        try:
            self.validation_results = self.ti_manager.validate_all_controls(self.developments)
            self._populate_main_tab()
            self._populate_summary_tab()
            self._log("✅ Validación de controles TI completada")
            
        except Exception as e:
            self._log(f"❌ Error validando controles TI: {e}")
            messagebox.showerror("Error", f"Error validando controles TI: {e}")
    
    def _populate_main_tab(self):
        """Poblar pestaña principal"""
        populate_main_tab(self)
    
    def _populate_summary_tab(self):
        """Poblar pestaña de resumen"""
        populate_summary_tab(self)
    
    def _on_double_click_main(self, event):
        """Manejar doble clic en tree principal"""
        item = self.main_tree.selection()[0]
        values = self.main_tree.item(item, "values")
        
        if values:
            dev_id = values[0]
            control_code = values[3]
            self._log(f"🖱️ Doble clic en: {dev_id} - {control_code}")
            copy_control_files(self, dev_id, control_code)
    
    def _copy_selected(self):
        """Copiar archivos del elemento seleccionado"""
        selection = self.main_tree.selection()
        if not selection:
            messagebox.showwarning("Sin selección", "Seleccione un elemento para copiar.")
            return
        
        item = selection[0]
        values = self.main_tree.item(item, "values")
        
        if values:
            dev_id = values[0]
            control_code = values[3]
            copy_control_files(self, dev_id, control_code)
    
    def _copy_control_files(self, dev_id: str, control_code: str):
        """Copiar archivos de un control específico"""
        copy_control_files(self, dev_id, control_code)
    
    def _open_destination_folder(self):
        """Abrir carpeta destino del elemento seleccionado"""
        open_destination_folder(self)
    
    def _show_summary(self):
        """Mostrar resumen de controles TI"""
        show_summary(self)
    
    def _export_results(self):
        """Exportar resultados de controles TI"""
        export_results(self)
    
    def _log(self, message: str):
        """Agregar mensaje al log"""
        try:
            timestamp = datetime.now().strftime("%H:%M:%S")
            self.log_text.configure(state="normal")
            self.log_text.insert(END, f"[{timestamp}] {message}\n")
            self.log_text.see(END)
            self.log_text.configure(state="disabled")
        except:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
