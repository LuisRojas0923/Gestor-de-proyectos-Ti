"""
Bot TI Controls View Helpers - Funciones auxiliares de la vista de controles TI
================================================================

Funciones auxiliares para reducir el tamaño de `bot_ti_controls_view.py`.
"""

import os
from typing import Dict, Any


def populate_main_tab(view) -> None:
    """Llenar la pestaña principal con los resultados de validación."""
    # Limpiar tree
    for item in view.main_tree.get_children():
        view.main_tree.delete(item)

    # Llenar con resultados
    for result in view.validation_results:
        dev_id = result.get('dev_id', 'N/A')
        dev_name = result.get('dev_name', 'N/A')
        stage = result.get('stage', 'N/A')
        controls_status: Dict[str, Any] = result.get('controls_status', {})

        for control_code, status in controls_status.items():
            control_name = view.ti_manager.ti_controls.get(control_code, {}).get('name', 'N/A')

            # Determinar estado visual y tag
            status_text = status.get('status', 'N/A')
            if status_text == 'COMPLETE':
                status_icon = "✅"
                status_tag = "status_complete"
            elif status_text == 'PARTIAL':
                status_icon = "⚠️"
                status_tag = "status_partial"
            elif status_text == 'NO_COPIED':
                status_icon = "📁"
                status_tag = "status_no_copied"
            elif status_text == 'NO_APLICA':
                status_icon = "⏸️"
                status_tag = "status_no_aplica"
            else:
                status_icon = "❌"
                status_tag = "status_incomplete"

            # Estado de copia con tag
            can_copy = status.get('can_copy', False)
            can_copy_text = "✅ Sí" if can_copy else "❌ No"
            copy_tag = "copy_yes" if can_copy else "copy_no"

            # Documentos
            docs_found = len(status.get('documents_found', []))
            docs_missing = len(status.get('documents_missing', []))

            # Usar el tag del estado principal
            tags = [status_tag]

            view.main_tree.insert("", view.END, values=(
                dev_id, dev_name, stage, control_code, control_name,
                f"{status_icon} {status_text}", can_copy_text,
                f"{docs_found} docs", f"{docs_missing} docs"
            ), tags=tags)


def populate_summary_tab(view) -> None:
    """Llenar la pestaña de resumen por control."""
    # Limpiar tree
    for item in view.summary_tree.get_children():
        view.summary_tree.delete(item)

    # Agrupar por control
    control_stats: Dict[str, Dict[str, int]] = {}
    for result in view.validation_results:
        controls_status: Dict[str, Any] = result.get('controls_status', {})
        for control_code, status in controls_status.items():
            if control_code not in control_stats:
                control_stats[control_code] = {
                    'total_applicable': 0,
                    'complete': 0,
                    'partial': 0,
                    'not_copied': 0
                }

            if status.get('status') != 'NO_APLICA':
                control_stats[control_code]['total_applicable'] += 1

                status_type = status.get('status', 'NO_COPIED')
                if status_type == 'COMPLETE':
                    control_stats[control_code]['complete'] += 1
                elif status_type == 'PARTIAL':
                    control_stats[control_code]['partial'] += 1
                else:
                    control_stats[control_code]['not_copied'] += 1

    # Llenar tree
    for control_code, stats in control_stats.items():
        control_name = view.ti_manager.ti_controls.get(control_code, {}).get('name', 'N/A')
        total = stats['total_applicable']
        complete = stats['complete']
        percentage = (complete / total * 100) if total > 0 else 0

        view.summary_tree.insert("", view.END, values=(
            control_code, control_name, total, complete,
            stats['partial'], stats['not_copied'], f"{percentage:.1f}%"
        ))


def show_summary(view) -> None:
    """Mostrar resumen general en un messagebox."""
    from tkinter import messagebox

    if not view.validation_results:
        messagebox.showwarning("Sin datos", "No hay resultados de validación para mostrar.")
        return

    total_controls = 0
    complete_controls = 0
    partial_controls = 0
    not_copied_controls = 0

    for result in view.validation_results:
        controls_status: Dict[str, Any] = result.get('controls_status', {})
        for status in controls_status.values():
            if status.get('status') != 'NO_APLICA':
                total_controls += 1
                status_type = status.get('status', 'NO_COPIED')
                if status_type == 'COMPLETE':
                    complete_controls += 1
                elif status_type == 'PARTIAL':
                    partial_controls += 1
                else:
                    not_copied_controls += 1

    percentage = (complete_controls / total_controls * 100) if total_controls > 0 else 0

    summary = f"""
📊 RESUMEN DE CONTROLES TI

📋 Total controles aplicables: {total_controls}
✅ Completos: {complete_controls}
⚠️ Parciales: {partial_controls}
📁 No copiados: {not_copied_controls}

📈 Porcentaje de cumplimiento: {percentage:.1f}%
    """

    messagebox.showinfo("Resumen de Controles TI", summary)


def export_results(view) -> None:
    """Exportar resultados a un archivo de texto."""
    from tkinter import messagebox
    from datetime import datetime

    if not view.validation_results:
        messagebox.showwarning("Sin datos", "No hay resultados para exportar.")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"controles_ti_{timestamp}.txt"

    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("REPORTE DE CONTROLES TI\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Total desarrollos: {len(view.validation_results)}\n\n")

            for result in view.validation_results:
                f.write(f"Desarrollo: {result.get('dev_id')} - {result.get('dev_name')}\n")
                f.write(f"Etapa: {result.get('stage')}\n")

                controls_status: Dict[str, Any] = result.get('controls_status', {})
                for control_code, status in controls_status.items():
                    f.write(f"  {control_code}: {status.get('status', 'N/A')}\n")
                    if status.get('documents_found'):
                        f.write(f"    Documentos encontrados: {', '.join(status['documents_found'])}\n")
                    if status.get('documents_missing'):
                        f.write(f"    Documentos faltantes: {', '.join(status['documents_missing'])}\n")

                f.write("-" * 30 + "\n")

        view._log(f"✅ Resultados exportados a: {filename}")
        messagebox.showinfo("Exportación", f"Resultados exportados a: {filename}")

    except Exception as e:
        view._log(f"❌ Error exportando resultados: {e}")
        messagebox.showerror("Error", f"Error exportando resultados: {e}")


def open_source_folder(view) -> None:
    """Abrir carpeta origen del desarrollo seleccionado en el tree principal."""
    from tkinter import messagebox

    selection = view.main_tree.selection()
    if not selection:
        messagebox.showwarning("Sin selección", "Seleccione un elemento para abrir su carpeta origen.")
        return

    item = selection[0]
    values = view.main_tree.item(item, "values")

    if values:
        dev_id = values[0]

        try:
            # Buscar carpeta origen del desarrollo
            source_folder = view.ti_manager._find_development_folder(dev_id)

            if source_folder and os.path.exists(source_folder):
                os.startfile(source_folder)
                view._log(f"📁 Abriendo carpeta origen: {source_folder}")
            else:
                messagebox.showinfo("Carpeta no encontrada",
                                    f"No se encontró la carpeta origen para el desarrollo:\n{dev_id}\n\n"
                                    f"Ruta base: {view.ti_manager.base_path}")

        except Exception as e:
            view._log(f"❌ Error abriendo carpeta origen: {e}")
            messagebox.showerror("Error", f"Error abriendo carpeta origen: {e}")


def open_destination_folder(view) -> None:
    """Abrir carpeta de destino del elemento seleccionado en el tree principal."""
    from tkinter import messagebox

    selection = view.main_tree.selection()
    if not selection:
        messagebox.showwarning("Sin selección", "Seleccione un elemento para abrir su carpeta destino.")
        return

    item = selection[0]
    values = view.main_tree.item(item, "values")

    if values:
        dev_id = values[0]
        control_code = values[3]

        try:
            destination_path = view.ti_manager.get_destination_path(dev_id, control_code)

            if os.path.exists(destination_path):
                os.startfile(destination_path)
                view._log(f"📁 Abriendo carpeta destino: {destination_path}")
            else:
                messagebox.showinfo("Carpeta no existe",
                                    f"La carpeta destino no existe aún:\n{destination_path}")

        except Exception as e:
            view._log(f"❌ Error abriendo carpeta: {e}")
            messagebox.showerror("Error", f"Error abriendo carpeta: {e}")


def copy_control_files(view, dev_id: str, control_code: str) -> None:
    """Copiar archivos del control seleccionado, con confirmaciones y overwrite opcional."""
    from tkinter import messagebox

    try:
        # Verificar que se puede copiar
        can_copy = False
        for result in view.validation_results:
            if result.get('dev_id') == dev_id:
                controls_status = result.get('controls_status', {})
                if control_code in controls_status:
                    can_copy = controls_status[control_code].get('can_copy', False)
                    break

        if not can_copy:
            messagebox.showwarning("No se puede copiar",
                                   f"No se pueden copiar los archivos para {dev_id} - {control_code}.\n"
                                   f"Verifique que todos los documentos requeridos estén en la carpeta del desarrollo.")
            return

        # Obtener documentos requeridos
        required_docs = view.ti_manager.ti_controls[control_code]["documents"]

        # Confirmación
        message = f"¿Copiar los siguientes documentos para {dev_id} - {control_code}?\n\n"
        for doc in required_docs:
            message += f"• {doc}\n"

        if not messagebox.askyesno("Confirmar copia", message):
            return

        # Verificar archivos existentes en destino
        destination_path = view.ti_manager.get_destination_path(dev_id, control_code)
        overwrite = False

        if os.path.exists(destination_path):
            existing_files = []
            for doc in required_docs:
                if view.ti_manager._search_file_in_folder(destination_path, doc):
                    existing_files.append(doc)

            if existing_files:
                overwrite_msg = "Los siguientes archivos ya existen en destino:\n\n"
                for file in existing_files:
                    overwrite_msg += f"• {file}\n"
                overwrite_msg += "\n¿Desea sobrescribirlos?"

                overwrite = messagebox.askyesno("Archivos existentes", overwrite_msg)

        # Copiar archivos
        view._log(f"📋 Copiando archivos para {dev_id} - {control_code}...")
        result = view.ti_manager.copy_files_to_control(dev_id, control_code, required_docs, overwrite)

        if result['success']:
            view._log(f"✅ Copia exitosa: {result['message']}")
            messagebox.showinfo("Copia exitosa",
                                 f"Copia completada:\n\n"
                                 f"Archivos copiados: {len(result['files_copied'])}\n"
                                 f"Archivos fallidos: {len(result['files_failed'])}\n\n"
                                 f"Destino: {result['destination_path']}")

            # Actualizar vista
            view._validate_ti_controls()
        else:
            view._log(f"❌ Error en copia: {result['message']}")
            messagebox.showerror("Error en copia", result['message'])

    except Exception as e:
        view._log(f"❌ Error copiando archivos: {e}")
        messagebox.showerror("Error", f"Error copiando archivos: {e}")


