"""
Bot Development Checker View - Vista para verificación de desarrollos
====================================================================

Vista para mostrar el estado de archivos requeridos en cada desarrollo.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import Toplevel, messagebox, scrolledtext
from typing import List, Dict, Any, Callable
from datetime import datetime
from bot_development_checker import DevelopmentChecker
from bot_development_checker_view_helpers import (
    populate_tree, get_control_status_icon, show_development_details, export_results
)


class DevelopmentCheckerView(Toplevel):
    """Vista para verificar archivos en desarrollos"""
    
    def __init__(self, master, base_path: str, logger: Callable[[str], None]):
        super().__init__(master)
        self.title("Verificación de Archivos en Desarrollos")
        self.geometry("1400x800")
        self.transient(master)
        self.grab_set()
        
        self.base_path = base_path
        self._log = logger
        self.checker = DevelopmentChecker(base_path, logger)
        self.check_results: List[Dict[str, Any]] = []
        
        self._create_ui()
    
    def _create_ui(self):
        """Crear interfaz de usuario"""
        main_frame = ttk.Frame(self, padding="10")
        main_frame.pack(fill=BOTH, expand=True)
        
        # Título
        title_frame = ttk.Frame(main_frame)
        title_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(title_frame, text="🔍 Verificación de Archivos en Desarrollos", 
                 font=("Arial", 16, "bold")).pack(side=LEFT)
        
        # Botones de control
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Button(button_frame, text="🔄 Verificar Desarrollos", 
                  command=self._check_developments, bootstyle=SUCCESS).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📊 Resumen", 
                  command=self._show_summary, bootstyle=INFO).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📋 Exportar", 
                  command=self._export_results, bootstyle=WARNING).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="❌ Cerrar", 
                  command=self.destroy, bootstyle=DANGER).pack(side=RIGHT)
        
        # TreeView para resultados
        tree_frame = ttk.Frame(main_frame)
        tree_frame.pack(fill=BOTH, expand=True, pady=(0, 10))
        
        self.tree = ttk.Treeview(tree_frame, columns=(
            "dev_id", "folder_name", "phase", "status", "total_found", "total_required", 
            "c003_status", "c004_status", "c021_status", "can_copy"
        ), show="headings", height=20)
        self.tree.pack(side=LEFT, fill=BOTH, expand=True)
        
        # Configurar columnas
        self.tree.heading("dev_id", text="ID")
        self.tree.heading("folder_name", text="Carpeta")
        self.tree.heading("phase", text="Fase")
        self.tree.heading("status", text="Estado")
        self.tree.heading("total_found", text="Archivos Encontrados")
        self.tree.heading("total_required", text="Archivos Requeridos")
        self.tree.heading("c003_status", text="C003-GT")
        self.tree.heading("c004_status", text="C004-GT")
        self.tree.heading("c021_status", text="C021-GT")
        self.tree.heading("can_copy", text="Puede Copiar")
        
        self.tree.column("dev_id", width=100)
        self.tree.column("folder_name", width=200)
        self.tree.column("phase", width=120)
        self.tree.column("status", width=120)
        self.tree.column("total_found", width=120)
        self.tree.column("total_required", width=120)
        self.tree.column("c003_status", width=100)
        self.tree.column("c004_status", width=100)
        self.tree.column("c021_status", width=100)
        self.tree.column("can_copy", width=100)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(tree_frame, orient=VERTICAL, command=self.tree.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Eventos
        self.tree.bind("<Double-1>", self._on_double_click)
        
        # Log
        log_frame = ttk.LabelFrame(main_frame, text="Registro de Operaciones", padding="10")
        log_frame.pack(fill=BOTH, expand=True)
        
        self.log_text = ttk.Text(log_frame, height=8, wrap=WORD, state="disabled")
        self.log_text.pack(side=LEFT, fill=BOTH, expand=True)
        
        scrollbar_log = ttk.Scrollbar(log_frame, orient=VERTICAL, command=self.log_text.yview)
        scrollbar_log.pack(side=RIGHT, fill=Y)
        self.log_text.configure(yscrollcommand=scrollbar_log.set)
    
    def _check_developments(self):
        """Ejecutar verificación de desarrollos"""
        self._log("🔍 Iniciando verificación de desarrollos...")
        
        try:
            self.check_results = self.checker.check_all_developments()
            self._populate_tree()
            self._log("✅ Verificación completada")
            
        except Exception as e:
            self._log(f"❌ Error en verificación: {e}")
            messagebox.showerror("Error", f"Error en verificación: {e}")
    
    def _populate_tree(self):
        """Poblar tree con resultados"""
        populate_tree(self)
    
    def _get_control_status_icon(self, control_status: Dict[str, Any]) -> str:
        """Obtener icono de estado para un control"""
        return get_control_status_icon(control_status)
    
    def _on_double_click(self, event):
        """Manejar doble clic en tree"""
        selection = self.tree.selection()
        if not selection:
            return
        
        item = selection[0]
        values = self.tree.item(item, "values")
        
        if values:
            dev_id = values[0]
            folder_name = values[1]
            self._show_development_details(dev_id, folder_name)
    
    def _show_development_details(self, dev_id: str, folder_name: str):
        """Mostrar detalles de un desarrollo específico"""
        show_development_details(self, dev_id, folder_name)
    
    def _show_summary(self):
        """Mostrar resumen de verificación"""
        if not self.check_results:
            messagebox.showwarning("Sin datos", "No hay resultados de verificación para mostrar.")
            return
        
        summary = self.checker.generate_summary_report(self.check_results)
        messagebox.showinfo("Resumen de Verificación", summary)
    
    def _export_results(self):
        """Exportar resultados a archivo"""
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
