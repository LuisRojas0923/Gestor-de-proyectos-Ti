"""
Bot Development Checker View Helpers - Funciones auxiliares de la vista
======================================================================

Funciones auxiliares para reducir el tamaño de bot_development_checker_view.py.
"""

from typing import Dict, Any
from datetime import datetime
from tkinter import messagebox, Toplevel
import ttkbootstrap as ttk
from ttkbootstrap.constants import *


def populate_tree(view) -> None:
    """Poblar tree con resultados de verificación"""
    # Limpiar tree
    for item in view.tree.get_children():
        view.tree.delete(item)
    
    # Usar resultados filtrados si están disponibles, sino todos los resultados
    results_to_show = view.filtered_results if hasattr(view, 'filtered_results') and view.filtered_results else view.check_results
    
    # Llenar con resultados
    for result in results_to_show:
        dev_id = result.get('dev_id', 'N/A')
        folder_name = result.get('folder_name', 'N/A')
        phase = result.get('phase', 'N/A')
        status = result.get('overall_status', 'UNKNOWN')
        
        # Estado visual
        if status == 'COMPLETE':
            status_icon = "✅"
        elif status == 'PARTIAL':
            status_icon = "⚠️"
        elif status == 'INCOMPLETE':
            status_icon = "❌"
        elif status == 'NO_FOLDER':
            status_icon = "📁"
        else:
            status_icon = "❓"
        
        # Archivos
        total_found = result.get('total_files_found', 0)
        total_required = result.get('total_files_required', 0)
        
        # Estados de controles
        controls_status = result.get('controls_status', {})
        c003_status = get_control_status_icon(controls_status.get('C003-GT', {}))
        c004_status = get_control_status_icon(controls_status.get('C004-GT', {}))
        c021_status = get_control_status_icon(controls_status.get('C021-GT', {}))
        
        # Puede copiar
        can_copy = result.get('can_copy_any', False)
        can_copy_text = "✅ Sí" if can_copy else "❌ No"
        
        view.tree.insert("", END, values=(
            dev_id, folder_name, phase, f"{status_icon} {status}",
            f"{total_found}/{total_required}", total_required,
            c003_status, c004_status, c021_status, can_copy_text
        ))


def get_control_status_icon(control_status: Dict[str, Any]) -> str:
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


def show_development_details(view, dev_id: str, folder_name: str) -> None:
    """Mostrar detalles de un desarrollo específico"""
    # Buscar resultado del desarrollo en todos los resultados (no filtrados)
    result = None
    for r in view.check_results:
        if r.get('dev_id') == dev_id and r.get('folder_name') == folder_name:
            result = r
            break
    
    if not result:
        messagebox.showwarning("Sin datos", "No se encontraron datos para este desarrollo.")
        return
    
    # Crear ventana de detalles
    details_window = Toplevel(view)
    details_window.title(f"Detalles - {dev_id}")
    details_window.geometry("800x600")
    details_window.transient(view)
    
    # Frame principal
    main_frame = ttk.Frame(details_window, padding="10")
    main_frame.pack(fill=BOTH, expand=True)
    
    # Información general
    info_frame = ttk.LabelFrame(main_frame, text="Información General", padding="10")
    info_frame.pack(fill=X, pady=(0, 10))
    
    ttk.Label(info_frame, text=f"ID: {dev_id}").pack(anchor=W)
    ttk.Label(info_frame, text=f"Carpeta: {folder_name}").pack(anchor=W)
    ttk.Label(info_frame, text=f"Fase: {result.get('phase', 'N/A')}").pack(anchor=W)
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


def export_results(view) -> None:
    """Exportar resultados a archivo"""
    # Usar resultados filtrados si están disponibles, sino todos los resultados
    results_to_export = view.filtered_results if hasattr(view, 'filtered_results') and view.filtered_results else view.check_results
    
    if not results_to_export:
        messagebox.showwarning("Sin datos", "No hay resultados para exportar.")
        return
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"verificacion_desarrollos_{timestamp}.txt"
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("REPORTE DE VERIFICACIÓN DE DESARROLLOS\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total desarrollos: {len(results_to_export)}\n\n")
        
        for result in results_to_export:
                f.write(f"Desarrollo: {result.get('dev_id')} - {result.get('folder_name')}\n")
                f.write(f"Fase: {result.get('phase', 'N/A')}\n")
                f.write(f"Estado: {result.get('overall_status')}\n")
                f.write(f"Archivos: {result.get('total_files_found', 0)}/{result.get('total_files_required', 0)}\n")
                
                controls_status = result.get('controls_status', {})
                for control_code, status in controls_status.items():
                    f.write(f"  {control_code}: {len(status.get('files_found', []))}/{len(status.get('files_required', []))}\n")
                
                f.write("-" * 30 + "\n")
        
        view._log(f"✅ Resultados exportados a: {filename}")
        messagebox.showinfo("Exportación", f"Resultados exportados a: {filename}")
        
    except Exception as e:
        view._log(f"❌ Error exportando resultados: {e}")
        messagebox.showerror("Error", f"Error exportando resultados: {e}")
