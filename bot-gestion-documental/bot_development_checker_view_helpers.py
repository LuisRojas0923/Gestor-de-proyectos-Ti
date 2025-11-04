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
import os
import re


def open_development_folder(view) -> None:
    """Abrir carpeta del desarrollo seleccionado en el tree."""
    from tkinter import messagebox

    selection = view.tree.selection()
    if not selection:
        messagebox.showwarning("Sin selección", "Seleccione un desarrollo para abrir su carpeta.")
        return

    item = selection[0]
    values = view.tree.item(item, "values")

    if values:
        dev_id = values[0]
        folder_name = values[1]

        try:
            # Buscar carpeta del desarrollo en la ruta base
            folder_path = find_development_folder_path(view.base_path, dev_id, folder_name)

            if folder_path and os.path.exists(folder_path):
                os.startfile(folder_path)
                view._log(f"📁 Abriendo carpeta: {folder_path}")
            else:
                messagebox.showinfo("Carpeta no encontrada",
                                    f"No se encontró la carpeta para el desarrollo:\n{dev_id}\n\n"
                                    f"Carpeta: {folder_name}\n"
                                    f"Ruta base: {view.base_path}")

        except Exception as e:
            view._log(f"❌ Error abriendo carpeta: {e}")
            messagebox.showerror("Error", f"Error abriendo carpeta: {e}")


def find_development_folder_path(base_path: str, dev_id: str, folder_name: str) -> str:
    """Buscar ruta completa de la carpeta del desarrollo."""
    if not os.path.exists(base_path):
        return ""
    
    try:
        # Buscar en todas las fases
        for root, dirs, files in os.walk(base_path):
            for dir_name in dirs:
                # Buscar por ID del desarrollo o por nombre de carpeta
                if dev_id in dir_name or folder_name in dir_name:
                    full_path = os.path.join(root, dir_name)
                    if os.path.isdir(full_path):
                        return full_path
    except Exception as e:
        print(f"❌ Error buscando carpeta para {dev_id}: {e}")
    
    return ""


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
        
        # Determinar tag según estado principal
        if status == 'COMPLETE':
            status_icon = "✅"
            status_tag = "status_complete"
        elif status == 'PARTIAL':
            status_icon = "⚠️"
            status_tag = "status_partial"
        elif status == 'INCOMPLETE':
            status_icon = "❌"
            status_tag = "status_incomplete"
        elif status == 'NO_FOLDER':
            status_icon = "📁"
            status_tag = "status_no_folder"
        else:
            status_icon = "❓"
            status_tag = "status_unknown"
        
        # Archivos
        total_found = result.get('total_files_found', 0)
        total_required = result.get('total_files_required', 0)
        
        # Estados de controles con tags
        controls_status = result.get('controls_status', {})
        c003_status, c003_tag = get_control_status_icon_with_tag(controls_status.get('C003-GT', {}))
        c004_status, c004_tag = get_control_status_icon_with_tag(controls_status.get('C004-GT', {}))
        c021_status, c021_tag = get_control_status_icon_with_tag(controls_status.get('C021-GT', {}))
        
        # Puede copiar con tag
        can_copy = result.get('can_copy_any', False)
        can_copy_text = "✅ Sí" if can_copy else "❌ No"
        copy_tag = "copy_yes" if can_copy else "copy_no"
        
        # Combinar tags (usar el tag del estado principal como base)
        tags = [status_tag]
        
        # Insertar con tags
        item_id = view.tree.insert("", END, values=(
            dev_id, folder_name, phase, f"{status_icon} {status}",
            f"{total_found}/{total_required}", total_required,
            c003_status, c004_status, c021_status, can_copy_text
        ), tags=tags)


def get_control_status_icon_with_tag(control_status: Dict[str, Any]) -> tuple:
    """Obtener icono de estado y tag para un control"""
    if not control_status:
        return "❓", "control_unknown"
    
    files_found = len(control_status.get('files_found', []))
    files_required = len(control_status.get('files_required', []))
    
    if files_required == 0:
        return "⏸️", "control_paused"
    elif files_found == files_required:
        return "✅", "control_complete"
    elif files_found > 0:
        return "⚠️", "control_partial"
    else:
        return "❌", "control_incomplete"


def get_control_status_icon(control_status: Dict[str, Any]) -> str:
    """Obtener icono de estado para un control (versión legacy, mantiene compatibilidad)"""
    icon, _ = get_control_status_icon_with_tag(control_status)
    return icon


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
        optional_missing = status.get('optional_missing', [])
        
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
        
        if optional_missing:
            ttk.Label(control_frame, text=f"⚪ Opcionales (no encontrados): {', '.join(optional_missing)}", 
                     foreground="gray").pack(anchor=W, padx=(20, 0))


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
