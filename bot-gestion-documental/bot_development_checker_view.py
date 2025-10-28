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
            "dev_id", "folder_name", "status", "total_found", "total_required", 
            "c003_status", "c004_status", "c021_status", "can_copy"
        ), show="headings", height=20)
        self.tree.pack(side=LEFT, fill=BOTH, expand=True)
        
        # Configurar columnas
        self.tree.heading("dev_id", text="ID")
        self.tree.heading("folder_name", text="Carpeta")
        self.tree.heading("status", text="Estado")
        self.tree.heading("total_found", text="Archivos Encontrados")
        self.tree.heading("total_required", text="Archivos Requeridos")
        self.tree.heading("c003_status", text="C003-GT")
        self.tree.heading("c004_status", text="C004-GT")
        self.tree.heading("c021_status", text="C021-GT")
        self.tree.heading("can_copy", text="Puede Copiar")
        
        self.tree.column("dev_id", width=100)
        self.tree.column("folder_name", width=200)
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
        # Limpiar tree
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Llenar con resultados
        for result in self.check_results:
            dev_id = result.get('dev_id', 'N/A')
            folder_name = result.get('folder_name', 'N/A')
            status = result.get('overall_status', 'UNKNOWN')
            
            # Estado visual
            if status == 'COMPLETE':
                status_icon = "✅"
            elif status == 'PARTIAL':
                status_icon = "⚠️"
            elif status == 'INCOMPLETE':
                status_icon = "❌"
            else:
                status_icon = "❓"
            
            # Archivos
            total_found = result.get('total_files_found', 0)
            total_required = result.get('total_files_required', 0)
            
            # Estados de controles
            controls_status = result.get('controls_status', {})
            c003_status = self._get_control_status_icon(controls_status.get('C003-GT', {}))
            c004_status = self._get_control_status_icon(controls_status.get('C004-GT', {}))
            c021_status = self._get_control_status_icon(controls_status.get('C021-GT', {}))
            
            # Puede copiar
            can_copy = result.get('can_copy_any', False)
            can_copy_text = "✅ Sí" if can_copy else "❌ No"
            
            self.tree.insert("", END, values=(
                dev_id, folder_name, f"{status_icon} {status}",
                f"{total_found}/{total_required}", total_required,
                c003_status, c004_status, c021_status, can_copy_text
            ))
    
    def _get_control_status_icon(self, control_status: Dict[str, Any]) -> str:
        """Obtener icono de estado para un control"""
        if not control_status:
            return "❓"
        
        files_found = len(control_status.get('files_found', []))
        files_required = len(control_status.get('files_required', []))
        
        if files_required == 0:
            return "⏸️"
        elif files_found == files_required:
            return "✅"
        elif files_found > 0:
            return "⚠️"
        else:
            return "❌"
    
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
        # Buscar resultado del desarrollo
        result = None
        for r in self.check_results:
            if r.get('dev_id') == dev_id and r.get('folder_name') == folder_name:
                result = r
                break
        
        if not result:
            messagebox.showwarning("Sin datos", "No se encontraron datos para este desarrollo.")
            return
        
        # Crear ventana de detalles
        details_window = Toplevel(self)
        details_window.title(f"Detalles - {dev_id}")
        details_window.geometry("800x600")
        details_window.transient(self)
        
        # Frame principal
        main_frame = ttk.Frame(details_window, padding="10")
        main_frame.pack(fill=BOTH, expand=True)
        
        # Información general
        info_frame = ttk.LabelFrame(main_frame, text="Información General", padding="10")
        info_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Label(info_frame, text=f"ID: {dev_id}").pack(anchor=W)
        ttk.Label(info_frame, text=f"Carpeta: {folder_name}").pack(anchor=W)
        ttk.Label(info_frame, text=f"Estado: {result.get('overall_status', 'UNKNOWN')}").pack(anchor=W)
        ttk.Label(info_frame, text=f"Archivos encontrados: {result.get('total_files_found', 0)}/{result.get('total_files_required', 0)}").pack(anchor=W)
        
        # Detalles por control
        controls_frame = ttk.LabelFrame(main_frame, text="Detalles por Control", padding="10")
        controls_frame.pack(fill=BOTH, expand=True)
        
        controls_status = result.get('controls_status', {})
        for control_code, status in controls_status.items():
            control_name = status.get('control_name', 'N/A')
            files_found = status.get('files_found', [])
            files_missing = status.get('files_missing', [])
            
            # Frame para cada control
            control_frame = ttk.Frame(controls_frame)
            control_frame.pack(fill=X, pady=(0, 5))
            
            ttk.Label(control_frame, text=f"{control_code}: {control_name}", 
                     font=("Arial", 10, "bold")).pack(anchor=W)
            
            if files_found:
                ttk.Label(control_frame, text=f"✅ Encontrados: {', '.join(files_found)}", 
                         foreground="green").pack(anchor=W, padx=(20, 0))
            
            if files_missing:
                ttk.Label(control_frame, text=f"❌ Faltantes: {', '.join(files_missing)}", 
                         foreground="red").pack(anchor=W, padx=(20, 0))
    
    def _show_summary(self):
        """Mostrar resumen de verificación"""
        if not self.check_results:
            messagebox.showwarning("Sin datos", "No hay resultados de verificación para mostrar.")
            return
        
        summary = self.checker.generate_summary_report(self.check_results)
        messagebox.showinfo("Resumen de Verificación", summary)
    
    def _export_results(self):
        """Exportar resultados a archivo"""
        if not self.check_results:
            messagebox.showwarning("Sin datos", "No hay resultados para exportar.")
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"verificacion_desarrollos_{timestamp}.txt"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("REPORTE DE VERIFICACIÓN DE DESARROLLOS\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Total desarrollos: {len(self.check_results)}\n\n")
                
                for result in self.check_results:
                    f.write(f"Desarrollo: {result.get('dev_id')} - {result.get('folder_name')}\n")
                    f.write(f"Estado: {result.get('overall_status')}\n")
                    f.write(f"Archivos: {result.get('total_files_found', 0)}/{result.get('total_files_required', 0)}\n")
                    
                    controls_status = result.get('controls_status', {})
                    for control_code, status in controls_status.items():
                        f.write(f"  {control_code}: {len(status.get('files_found', []))}/{len(status.get('files_required', []))}\n")
                    
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
