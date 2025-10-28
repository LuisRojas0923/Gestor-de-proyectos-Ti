"""
Bot Controls View - Vista de Controles de Calidad
=================================================

Vista especializada para mostrar y gestionar controles de calidad.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import messagebox, Toplevel, scrolledtext
from typing import List, Dict, Any, Callable
from datetime import datetime


class ControlsView(Toplevel):
    """Vista para mostrar controles de calidad de desarrollos"""
    
    def __init__(self, master, base_path: str, logger: Callable[[str], None]):
        super().__init__(master)
        self.title("Vista de Controles de Calidad")
        self.geometry("1400x800")
        self.transient(master)
        self.grab_set()
        
        self.base_path = base_path
        self._log = logger
        self.validation_results: List[Dict[str, Any]] = []
        
        self._create_ui()
    
    def _create_ui(self):
        """Crear interfaz de usuario"""
        main_frame = ttk.Frame(self, padding="10")
        main_frame.pack(fill=BOTH, expand=True)
        
        # Título
        title_frame = ttk.Frame(main_frame)
        title_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(title_frame, text="🎯 Controles de Calidad de Desarrollos", 
                 font=("Arial", 16, "bold")).pack(side=LEFT)
        
        # Botones de control
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Button(button_frame, text="🔄 Validar Controles", 
                  command=self._validate_controls, bootstyle=SUCCESS).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📊 Resumen", 
                  command=self._show_summary, bootstyle=INFO).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📋 Exportar", 
                  command=self._export_results, bootstyle=WARNING).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="❌ Cerrar", 
                  command=self.destroy, bootstyle=DANGER).pack(side=RIGHT)
        
        # Notebook para diferentes vistas
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.pack(fill=BOTH, expand=True, pady=(0, 10))
        
        # Pestaña de resultados detallados
        self.details_frame = ttk.Frame(self.notebook, padding="10")
        self.notebook.add(self.details_frame, text="📋 Detalles")
        self._create_details_tab()
        
        # Pestaña de resumen por control
        self.controls_frame = ttk.Frame(self.notebook, padding="10")
        self.notebook.add(self.controls_frame, text="🎯 Por Control")
        self._create_controls_tab()
        
        # Pestaña de entregables faltantes
        self.deliverables_frame = ttk.Frame(self.notebook, padding="10")
        self.notebook.add(self.deliverables_frame, text="📦 Entregables")
        self._create_deliverables_tab()
        
        # Log
        log_frame = ttk.LabelFrame(main_frame, text="Registro de Validación", padding="10")
        log_frame.pack(fill=BOTH, expand=True)
        
        self.log_text = ttk.Text(log_frame, height=8, wrap=WORD, state="disabled")
        self.log_text.pack(side=LEFT, fill=BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(log_frame, orient=VERTICAL, command=self.log_text.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.log_text.configure(yscrollcommand=scrollbar.set)
    
    def _create_details_tab(self):
        """Crear pestaña de detalles"""
        # TreeView para resultados detallados
        tree_frame = ttk.Frame(self.details_frame)
        tree_frame.pack(fill=BOTH, expand=True)
        
        self.details_tree = ttk.Treeview(tree_frame, columns=(
            "dev_id", "dev_name", "stage", "status", "controls_passed", "controls_total"
        ), show="headings", height=15)
        self.details_tree.pack(side=LEFT, fill=BOTH, expand=True)
        
        # Configurar columnas
        self.details_tree.heading("dev_id", text="ID")
        self.details_tree.heading("dev_name", text="Nombre")
        self.details_tree.heading("stage", text="Etapa")
        self.details_tree.heading("status", text="Estado")
        self.details_tree.heading("controls_passed", text="Controles OK")
        self.details_tree.heading("controls_total", text="Total Controles")
        
        self.details_tree.column("dev_id", width=120)
        self.details_tree.column("dev_name", width=300)
        self.details_tree.column("stage", width=150)
        self.details_tree.column("status", width=100)
        self.details_tree.column("controls_passed", width=100)
        self.details_tree.column("controls_total", width=100)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(tree_frame, orient=VERTICAL, command=self.details_tree.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.details_tree.configure(yscrollcommand=scrollbar.set)
        
        # Eventos
        self.details_tree.bind("<Double-1>", self._on_double_click_details)
    
    def _create_controls_tab(self):
        """Crear pestaña de controles"""
        # TreeView para controles
        tree_frame = ttk.Frame(self.controls_frame)
        tree_frame.pack(fill=BOTH, expand=True)
        
        self.controls_tree = ttk.Treeview(tree_frame, columns=(
            "control_code", "control_name", "applicable", "passed", "failed", "total"
        ), show="headings", height=15)
        self.controls_tree.pack(side=LEFT, fill=BOTH, expand=True)
        
        # Configurar columnas
        self.controls_tree.heading("control_code", text="Código")
        self.controls_tree.heading("control_name", text="Nombre")
        self.controls_tree.heading("applicable", text="Aplicables")
        self.controls_tree.heading("passed", text="Aprobados")
        self.controls_tree.heading("failed", text="Fallidos")
        self.controls_tree.heading("total", text="Total")
        
        self.controls_tree.column("control_code", width=100)
        self.controls_tree.column("control_name", width=300)
        self.controls_tree.column("applicable", width=100)
        self.controls_tree.column("passed", width=100)
        self.controls_tree.column("failed", width=100)
        self.controls_tree.column("total", width=100)
    
    def _create_deliverables_tab(self):
        """Crear pestaña de entregables"""
        # TreeView para entregables
        tree_frame = ttk.Frame(self.deliverables_frame)
        tree_frame.pack(fill=BOTH, expand=True)
        
        self.deliverables_tree = ttk.Treeview(tree_frame, columns=(
            "dev_id", "dev_name", "control", "deliverable", "status", "path"
        ), show="headings", height=15)
        self.deliverables_tree.pack(side=LEFT, fill=BOTH, expand=True)
        
        # Configurar columnas
        self.deliverables_tree.heading("dev_id", text="ID")
        self.deliverables_tree.heading("dev_name", text="Nombre")
        self.deliverables_tree.heading("control", text="Control")
        self.deliverables_tree.heading("deliverable", text="Entregable")
        self.deliverables_tree.heading("status", text="Estado")
        self.deliverables_tree.heading("path", text="Ruta")
        
        self.deliverables_tree.column("dev_id", width=120)
        self.deliverables_tree.column("dev_name", width=250)
        self.deliverables_tree.column("control", width=100)
        self.deliverables_tree.column("deliverable", width=200)
        self.deliverables_tree.column("status", width=100)
        self.deliverables_tree.column("path", width=200)
    
    def load_validation_results(self, results: List[Dict[str, Any]]):
        """Cargar resultados de validación"""
        self.validation_results = results
        self._populate_details_tab()
        self._populate_controls_tab()
        self._populate_deliverables_tab()
    
    def _populate_details_tab(self):
        """Poblar pestaña de detalles"""
        # Limpiar tree
        for item in self.details_tree.get_children():
            self.details_tree.delete(item)
        
        # Llenar con resultados
        for result in self.validation_results:
            controls_status = result.get('controls_status', {})
            passed_count = sum(1 for status in controls_status.values() 
                              if status.get('validation_passed', False))
            total_count = len(controls_status)
            
            # Determinar color según estado
            status = result.get('overall_status', 'PENDIENTE')
            if status == 'COMPLETO':
                status_icon = "✅"
            elif status == 'PARCIAL':
                status_icon = "⚠️"
            elif status == 'PENDIENTE':
                status_icon = "⏸️"
            else:
                status_icon = "❌"
            
            self.details_tree.insert("", END, values=(
                result.get('dev_id', 'N/A'),
                result.get('dev_name', 'N/A'),
                result.get('stage', 'N/A'),
                f"{status_icon} {status}",
                passed_count,
                total_count
            ))
    
    def _populate_controls_tab(self):
        """Poblar pestaña de controles"""
        # Limpiar tree
        for item in self.controls_tree.get_children():
            self.controls_tree.delete(item)
        
        # Agrupar por control
        control_stats = {}
        for result in self.validation_results:
            controls_status = result.get('controls_status', {})
            for control_code, status in controls_status.items():
                if control_code not in control_stats:
                    control_stats[control_code] = {
                        'applicable': 0,
                        'passed': 0,
                        'failed': 0
                    }
                
                if status.get('status') == 'APLICA':
                    control_stats[control_code]['applicable'] += 1
                    if status.get('validation_passed', False):
                        control_stats[control_code]['passed'] += 1
                    else:
                        control_stats[control_code]['failed'] += 1
        
        # Llenar tree
        for control_code, stats in control_stats.items():
            total = stats['applicable']
            passed = stats['passed']
            failed = stats['failed']
            
            self.controls_tree.insert("", END, values=(
                control_code,
                f"Control {control_code}",
                total,
                passed,
                failed,
                total
            ))
    
    def _populate_deliverables_tab(self):
        """Poblar pestaña de entregables"""
        # Limpiar tree
        for item in self.deliverables_tree.get_children():
            self.deliverables_tree.delete(item)
        
        # Llenar con entregables
        for result in self.validation_results:
            dev_id = result.get('dev_id', 'N/A')
            dev_name = result.get('dev_name', 'N/A')
            controls_status = result.get('controls_status', {})
            
            for control_code, status in controls_status.items():
                if status.get('status') == 'APLICA':
                    # Entregables encontrados
                    for deliverable in status.get('deliverables_found', []):
                        self.deliverables_tree.insert("", END, values=(
                            dev_id, dev_name, control_code, deliverable, "✅ Encontrado", "N/A"
                        ))
                    
                    # Entregables faltantes
                    for deliverable in status.get('deliverables_missing', []):
                        self.deliverables_tree.insert("", END, values=(
                            dev_id, dev_name, control_code, deliverable, "❌ Faltante", "N/A"
                        ))
    
    def _on_double_click_details(self, event):
        """Manejar doble clic en detalles"""
        item = self.details_tree.selection()[0]
        values = self.details_tree.item(item, "values")
        
        if values:
            dev_id = values[0]
            self._log(f"🖱️ Doble clic en desarrollo: {dev_id}")
            # Aquí se podría abrir una vista detallada del desarrollo
    
    def _validate_controls(self):
        """Validar controles (placeholder)"""
        self._log("🔄 Validación de controles iniciada...")
        messagebox.showinfo("Validación", "Esta funcionalidad se implementará en la siguiente versión.")
    
    def _show_summary(self):
        """Mostrar resumen"""
        if not self.validation_results:
            messagebox.showwarning("Sin datos", "No hay resultados de validación para mostrar.")
            return
        
        # Calcular estadísticas
        total = len(self.validation_results)
        completo = sum(1 for r in self.validation_results if r.get('overall_status') == 'COMPLETO')
        parcial = sum(1 for r in self.validation_results if r.get('overall_status') == 'PARCIAL')
        pendiente = sum(1 for r in self.validation_results if r.get('overall_status') == 'PENDIENTE')
        
        summary = f"""
📊 RESUMEN DE CONTROLES DE CALIDAD

📋 Total desarrollos: {total}
✅ Completos: {completo}
⚠️ Parciales: {parcial}
⏸️ Pendientes: {pendiente}

📈 Porcentaje de cumplimiento: {(completo/total*100):.1f}%
        """
        
        messagebox.showinfo("Resumen de Controles", summary)
    
    def _export_results(self):
        """Exportar resultados"""
        if not self.validation_results:
            messagebox.showwarning("Sin datos", "No hay resultados para exportar.")
            return
        
        # Crear archivo de exportación
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"controles_calidad_{timestamp}.txt"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("REPORTE DE CONTROLES DE CALIDAD\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Total desarrollos: {len(self.validation_results)}\n\n")
                
                for result in self.validation_results:
                    f.write(f"Desarrollo: {result.get('dev_id')} - {result.get('dev_name')}\n")
                    f.write(f"Etapa: {result.get('stage')}\n")
                    f.write(f"Estado: {result.get('overall_status')}\n")
                    f.write("-" * 30 + "\n")
            
            self._log(f"✅ Resultados exportados a: {filename}")
            messagebox.showinfo("Exportación", f"Resultados exportados a: {filename}")
            
        except Exception as e:
            self._log(f"❌ Error exportando resultados: {e}")
            messagebox.showerror("Error", f"Error exportando resultados: {e}")
    
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
