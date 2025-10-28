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
        self.filtered_results: List[Dict[str, Any]] = []
        self.service_dev_ids: set = set()
        
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
        
        # Filtros de búsqueda
        filter_frame = ttk.LabelFrame(main_frame, text="Filtros de Búsqueda", padding="10")
        filter_frame.pack(fill=X, pady=(0, 10))
        
        # Búsqueda por nombre
        search_frame = ttk.Frame(filter_frame)
        search_frame.pack(fill=X, pady=(0, 5))
        
        ttk.Label(search_frame, text="🔍 Buscar por nombre:").pack(side=LEFT, padx=(0, 5))
        self.search_var = ttk.StringVar()
        self.search_entry = ttk.Entry(search_frame, textvariable=self.search_var, width=40)
        self.search_entry.pack(side=LEFT, padx=(0, 10))
        self.search_entry.bind('<KeyRelease>', self._on_search_change)
        
        # Filtro por fase
        phase_frame = ttk.Frame(filter_frame)
        phase_frame.pack(fill=X)
        
        ttk.Label(phase_frame, text="📁 Filtrar por fase:").pack(side=LEFT, padx=(0, 5))
        self.phase_var = ttk.StringVar()
        self.phase_combo = ttk.Combobox(phase_frame, textvariable=self.phase_var, width=30, state="readonly")
        self.phase_combo.pack(side=LEFT, padx=(0, 10))
        self.phase_combo.bind('<<ComboboxSelected>>', self._on_phase_change)
        
        # Botón limpiar filtros
        ttk.Button(phase_frame, text="🗑️ Limpiar", 
                  command=self._clear_filters, bootstyle=SECONDARY).pack(side=LEFT)
        
        # Checkbox para filtrar por servicio
        check_frame = ttk.Frame(filter_frame)
        check_frame.pack(fill=X, pady=(5, 0))
        
        self.filter_with_service_var = ttk.BooleanVar(value=True)
        self.service_check = ttk.Checkbutton(
            check_frame, 
            text="Solo desarrollos en BD con carpeta creada",
            variable=self.filter_with_service_var,
            command=self._on_service_filter_change,
            bootstyle="primary-round-toggle"
        )
        self.service_check.pack(side=LEFT)
        
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
            # Obtener IDs del servicio si el checkbox está marcado
            filter_by_service = self.filter_with_service_var.get()
            if filter_by_service:
                self.service_dev_ids = set(self.checker.get_developments_from_service())
                if not self.service_dev_ids:
                    self._log("⚠️ No se pudieron obtener desarrollos del servicio")
                    messagebox.showwarning("Advertencia", "No se pudieron obtener desarrollos del servicio. Verifique la conexión.")
                    return
            
            self.check_results = self.checker.check_all_developments(filter_by_service)
            self.filtered_results = self.check_results.copy()
            self._populate_phase_combo()
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
    
    def _populate_phase_combo(self):
        """Poblar combo de fases con las fases disponibles"""
        phases = set()
        for result in self.check_results:
            phase = result.get('phase', 'N/A')
            if phase != 'N/A':
                phases.add(phase)
        
        phase_list = ['Todas las fases'] + sorted(list(phases))
        self.phase_combo['values'] = phase_list
        self.phase_combo.set('Todas las fases')
    
    def _on_search_change(self, event=None):
        """Manejar cambio en búsqueda por nombre"""
        self._apply_filters()
    
    def _on_phase_change(self, event=None):
        """Manejar cambio en filtro de fase"""
        self._apply_filters()
    
    def _on_service_filter_change(self):
        """Manejar cambio en filtro de servicio"""
        if self.filter_with_service_var.get():
            # Obtener IDs del servicio
            self.service_dev_ids = set(self.checker.get_developments_from_service())
            if not self.service_dev_ids:
                self._log("⚠️ No se pudieron obtener desarrollos del servicio")
                messagebox.showwarning("Advertencia", "No se pudieron obtener desarrollos del servicio. Verifique la conexión.")
                self.filter_with_service_var.set(False)
                return
        self._apply_filters()
    
    def _clear_filters(self):
        """Limpiar todos los filtros"""
        self.search_var.set("")
        self.phase_var.set("Todas las fases")
        self.filter_with_service_var.set(True)
        self.filtered_results = self.check_results.copy()
        self._populate_tree()
        self._log("🗑️ Filtros limpiados")
    
    def _apply_filters(self):
        """Aplicar filtros de búsqueda, fase y servicio"""
        search_text = self.search_var.get().lower()
        selected_phase = self.phase_var.get()
        
        self.filtered_results = []
        
        for result in self.check_results:
            dev_id = result.get('dev_id', '')
            folder_name = result.get('folder_name', '').lower()
            
            # Filtro por nombre
            name_match = (not search_text or 
                         search_text in folder_name or 
                         search_text in dev_id.lower())
            
            # Filtro por fase
            phase_match = (selected_phase == 'Todas las fases' or 
                          result.get('phase', '') == selected_phase)
            
            # Filtro por servicio (solo si checkbox está marcado)
            if self.filter_with_service_var.get():
                # Inicializar service_dev_ids si no está inicializado
                if not hasattr(self, 'service_dev_ids') or not self.service_dev_ids:
                    self.service_dev_ids = set(self.checker.get_developments_from_service())
                service_match = dev_id in self.service_dev_ids
            else:
                service_match = True
            
            if name_match and phase_match and service_match:
                self.filtered_results.append(result)
        
        self._populate_tree()
        self._log(f"🔍 Filtros aplicados: {len(self.filtered_results)} resultados")
    
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
