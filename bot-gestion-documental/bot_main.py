import json
import os
import shutil
import tkinter as tk
from tkinter import ttk, messagebox
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

from bot_api_client import APIClient
from bot_models import map_dev_to_row
from bot_file_manager import (
    scan_base_directories,
    process_requirements,
    ProcessInput,
    find_existing_folder,
)
from bot_ui_components import setup_tree_columns, fill_tree


class DocumentBotApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Bot de Gestión Documental")
        self.geometry("1400x600")
        self._build_ui()
        # Ejecutar automáticamente acciones al iniciar
        self.after(150, self._auto_load)

    def _build_ui(self) -> None:
        container = ttk.Frame(self, padding=16)
        container.pack(fill=tk.BOTH, expand=True)

        title = ttk.Label(container, text="Bot de Gestión Documental", font=("Segoe UI", 14, "bold"))
        title.pack(anchor=tk.W, pady=(0, 8))

        controls = ttk.Frame(container)
        controls.pack(fill=tk.X, pady=(0, 12))

        # Filtros básicos
        self.filter_var = tk.StringVar()
        ttk.Label(controls, text="Filtro:").pack(side=tk.LEFT)
        ttk.Entry(controls, textvariable=self.filter_var, width=20).pack(side=tk.LEFT, padx=8)
        ttk.Button(controls, text="Buscar", command=self._on_search).pack(side=tk.LEFT)
        
        # Filtros avanzados
        ttk.Label(controls, text="Estado:").pack(side=tk.LEFT, padx=(16, 4))
        self.status_var = tk.StringVar()
        status_combo = ttk.Combobox(controls, textvariable=self.status_var, width=12, state="readonly")
        status_combo['values'] = ('Todos', 'Pendiente', 'En curso', 'Completado', 'Cancelado')
        status_combo.set('Todos')
        status_combo.pack(side=tk.LEFT, padx=4)
        
        ttk.Label(controls, text="Proveedor:").pack(side=tk.LEFT, padx=(16, 4))
        self.provider_var = tk.StringVar()
        provider_entry = ttk.Entry(controls, textvariable=self.provider_var, width=15)
        provider_entry.pack(side=tk.LEFT, padx=4)
        
        ttk.Button(controls, text="Filtrar", command=self._on_advanced_filter).pack(side=tk.LEFT, padx=8)

        self.tree = ttk.Treeview(container)
        setup_tree_columns(self.tree)
        self.tree.pack(fill=tk.BOTH, expand=True)
        
        # Doble clic para ver etapas
        self.tree.bind("<Double-1>", self._on_double_click)

        actions = ttk.Frame(container)
        actions.pack(fill=tk.X, pady=(12, 0))
        ttk.Button(actions, text="Cargar desde API", command=self._on_load_from_api_fast).pack(side=tk.LEFT)
        ttk.Button(actions, text="Analizar carpetas", command=self._on_scan_folders).pack(side=tk.LEFT, padx=8)
        ttk.Button(actions, text="Ver etapas", command=self._on_view_stages).pack(side=tk.LEFT, padx=8)
        ttk.Button(actions, text="Abrir carpeta", command=self._on_open_folder).pack(side=tk.LEFT, padx=8)
        ttk.Button(actions, text="Cambiar etapa", command=self._on_change_stage).pack(side=tk.LEFT, padx=8)
        ttk.Button(actions, text="Procesar seleccionados", command=self._on_process_selected).pack(side=tk.LEFT, padx=8)
        ttk.Button(actions, text="Validar y Reorganizar", command=self._on_validate_and_reorganize).pack(side=tk.LEFT, padx=8)
        ttk.Button(actions, text="Salir", command=self.destroy).pack(side=tk.RIGHT)

        self._seed_rows()

    def _seed_rows(self) -> None:
        # Dejar vacío inicialmente; se poblará desde API
        pass

    def _on_search(self) -> None:
        term = self.filter_var.get().strip().lower()
        for item in self.tree.get_children():
            values = self.tree.item(item, "values")
            text = " ".join(map(str, values)).lower()
            self.tree.detach(item)
            if term in text or term == "":
                self.tree.reattach(item, "", tk.END)

    def _on_advanced_filter(self) -> None:
        """Aplicar filtros avanzados desde API"""
        try:
            client = APIClient.from_env_or_file()
            
            # Obtener parámetros de filtro
            status = self.status_var.get()
            provider = self.provider_var.get().strip()
            
            # Mapear estado para API
            status_map = {
                'Pendiente': 'Pendiente',
                'En curso': 'En curso', 
                'Completado': 'Completado',
                'Cancelado': 'Cancelado'
            }
            
            # Construir parámetros
            params = {'limit': 200}
            if status != 'Todos' and status in status_map:
                params['status'] = status_map[status]
            if provider:
                params['provider'] = provider
                
            items, err = client.list_developments(**params)
            if err:
                messagebox.showerror("Error API", err)
                return
                
            # Base path para resolver rutas
            base_path = self._resolve_base_path()
            rows = []
            for dev in items:
                if dev is None:
                    continue
                
                # Obtener datos completos del desarrollo individual
                dev_id = dev.get('id')
                if dev_id:
                    full_dev, err = client.get_development(dev_id)
                    if not err and full_dev:
                        dev = full_dev  # Usar datos completos
                
                row = map_dev_to_row(dev)
                ruta = find_existing_folder(base_path, row.id) or ""
                # Obtener etapa actual de datos completos
                current_stage = dev.get('current_stage', {}) if dev else {}
                stage_name = current_stage.get('stage_name', 'Sin etapa') if current_stage else 'Sin etapa'
                
                # Log para debug
                
                # Determinar acción requerida
                action = self._determine_required_action(
                    base_path, row.id, row.name, 
                    row.general_status or "", 
                    stage_name, 
                    ruta
                )
                rows.append((row.id, row.name, row.general_status or "", stage_name, ruta, action))
            fill_tree(self.tree, rows)
            
            messagebox.showinfo("Filtro aplicado", f"Mostrando {len(rows)} desarrollos con filtros aplicados")
            
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo aplicar filtros: {e}")

    def _on_change_stage(self) -> None:
        """Cambiar etapa del desarrollo seleccionado"""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("Selección", "Selecciona un desarrollo primero")
            return
        item = selection[0]
        values = self.tree.item(item, "values")
        if not values:
            return
        dev_id = values[0]
        self._show_stage_change_dialog(dev_id)

    def _show_stage_change_dialog(self, dev_id: str) -> None:
        """Mostrar diálogo para cambiar etapa"""
        try:
            # Crear ventana de cambio de etapa
            stage_window = tk.Toplevel(self)
            stage_window.title(f"Cambiar Etapa - {dev_id}")
            stage_window.geometry("400x300")
            stage_window.grab_set()  # Modal
            
            # Frame principal
            main_frame = ttk.Frame(stage_window, padding=16)
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Información del desarrollo
            ttk.Label(main_frame, text=f"Desarrollo: {dev_id}", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W, pady=(0, 12))
            
            # Selección de nueva etapa
            ttk.Label(main_frame, text="Nueva etapa:").pack(anchor=tk.W)
            self.new_stage_var = tk.StringVar()
            stage_combo = ttk.Combobox(main_frame, textvariable=self.new_stage_var, width=30, state="readonly")
            stage_combo['values'] = (
                '1 - Definición',
                '2 - Análisis', 
                '3 - Elaboración Propuesta',
                '4 - Aprobación Propuesta',
                '5 - Desarrollo del Requerimiento',
                '6 - Despliegue (Pruebas)',
                '7 - Plan de Pruebas',
                '8 - Ejecución de Pruebas',
                '9 - Aprobación (Pase)',
                '10 - Desplegado',
                '11 - Entrega a Producción'
            )
            stage_combo.pack(fill=tk.X, pady=(4, 12))
            
            # Progreso
            ttk.Label(main_frame, text="Progreso (%):").pack(anchor=tk.W)
            self.progress_var = tk.StringVar(value="0")
            progress_entry = ttk.Entry(main_frame, textvariable=self.progress_var, width=10)
            progress_entry.pack(anchor=tk.W, pady=(4, 12))
            
            # Notas
            ttk.Label(main_frame, text="Notas:").pack(anchor=tk.W)
            notes_text = tk.Text(main_frame, height=4, wrap=tk.WORD)
            notes_text.pack(fill=tk.BOTH, expand=True, pady=(4, 12))
            
            # Botones
            button_frame = ttk.Frame(main_frame)
            button_frame.pack(fill=tk.X)
            
            ttk.Button(button_frame, text="Cambiar Etapa", command=lambda: self._execute_stage_change(dev_id, stage_window, notes_text)).pack(side=tk.LEFT, padx=(0, 8))
            ttk.Button(button_frame, text="Cancelar", command=stage_window.destroy).pack(side=tk.LEFT)
            
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo mostrar diálogo: {e}")

    def _execute_stage_change(self, dev_id: str, window: tk.Toplevel, notes_widget: tk.Text) -> None:
        """Ejecutar cambio de etapa"""
        try:
            # Obtener datos del formulario
            stage_text = self.new_stage_var.get()
            if not stage_text:
                messagebox.showwarning("Validación", "Selecciona una etapa")
                return
                
            # Extraer ID de etapa (número al inicio)
            stage_id = int(stage_text.split(' - ')[0])
            
            progress_text = self.progress_var.get().strip()
            try:
                progress = float(progress_text) if progress_text else 0.0
            except ValueError:
                progress = 0.0
                
            notes = notes_widget.get("1.0", tk.END).strip()
            
            # Ejecutar cambio
            client = APIClient.from_env_or_file()
            success, err = client.change_stage(
                development_id=dev_id,
                new_stage_id=stage_id,
                progress_percentage=progress,
                notes=notes if notes else None,
                changed_by="Bot Usuario"
            )
            
            if success:
                messagebox.showinfo("Éxito", f"Etapa cambiada exitosamente para {dev_id}")
                window.destroy()
                # Refrescar lista
                self._on_load_from_api()
            else:
                messagebox.showerror("Error", f"No se pudo cambiar etapa: {err}")
                
        except Exception as e:
            messagebox.showerror("Error", f"Error ejecutando cambio: {e}")

    def _on_load_from_api_fast(self, silent: bool = False) -> None:
        """Carga rápida desde API sin llamadas individuales"""
        try:
            client = APIClient.from_env_or_file()
            items, err = client.list_developments(limit=200)
            if err:
                if not silent:
                    messagebox.showerror("Error API", err)
                return
            
            # Base path para resolver rutas
            base_path = self._resolve_base_path()
            rows = []
            for dev in items:
                if dev is None:
                    continue
                
                # Usar datos directamente del list_developments (más rápido)
                row = map_dev_to_row(dev)
                ruta = find_existing_folder(base_path, row.id) or ""
                
                # Obtener etapa actual directamente de los datos del listado
                current_stage = dev.get('current_stage', {}) if dev else {}
                stage_name = current_stage.get('stage_name', 'Sin etapa') if current_stage else 'Sin etapa'
                
                # Determinar acción requerida
                action = self._determine_required_action(
                    base_path, row.id, row.name, 
                    row.general_status or "", 
                    stage_name, 
                    ruta
                )
                rows.append((row.id, row.name, row.general_status or "", stage_name, ruta, action))
            
            fill_tree(self.tree, rows)
            
        except Exception as e:
            if not silent:
                messagebox.showerror("Error", f"No se pudo cargar desde API: {e}")
            else:
                print(f"ERROR API: {e}")

    def _on_load_from_api(self, silent: bool = False) -> None:
        try:
            client = APIClient.from_env_or_file()
            items, err = client.list_developments(limit=200)
            if err:
                if not silent:
                    messagebox.showerror("Error API", err)
                return
            # Base path para resolver rutas
            base_path = self._resolve_base_path()
            rows = []
            for dev in items:
                if dev is None:
                    continue
                
                # Obtener datos completos del desarrollo individual
                dev_id = dev.get('id')
                if dev_id:
                    full_dev, err = client.get_development(dev_id)
                    if not err and full_dev:
                        dev = full_dev  # Usar datos completos
                
                row = map_dev_to_row(dev)
                ruta = find_existing_folder(base_path, row.id) or ""
                # Obtener etapa actual de datos completos
                current_stage = dev.get('current_stage', {}) if dev else {}
                stage_name = current_stage.get('stage_name', 'Sin etapa') if current_stage else 'Sin etapa'
                
                # Log para debug
                
                # Determinar acción requerida
                action = self._determine_required_action(
                    base_path, row.id, row.name, 
                    row.general_status or "", 
                    stage_name, 
                    ruta
                )
                rows.append((row.id, row.name, row.general_status or "", stage_name, ruta, action))
            fill_tree(self.tree, rows)
            # Silencioso en auto-load para no interrumpir con diálogos
        except Exception as e:
            if not silent:
                messagebox.showerror("Error", f"No se pudo cargar desde API: {e}")
            else:
                print(f"ERROR API: {e}")

    def _on_scan_folders(self) -> None:
        """Analizar carpetas y mostrar acciones requeridas (procesamiento paralelo)"""
        try:
            base_path = self._resolve_base_path()
            print(f"SCAN FOLDERS: Analizando rutas en {base_path}")
            
            # Obtener todas las filas de una vez
            all_items = list(self.tree.get_children())
            print(f"SCAN FOLDERS: Procesando {len(all_items)} desarrollos en paralelo...")
            
            # Procesar en paralelo usando ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=4) as executor:
                # Preparar tareas
                futures = []
                for i, item in enumerate(all_items):
                    values = list(self.tree.item(item, "values"))
                    if not values or len(values) < 4:
                        continue
                        
                    dev_id = str(values[0]) if len(values) > 0 else ""
                    name = str(values[1]) if len(values) > 1 else ""
                    state = str(values[2]) if len(values) > 2 else ""
                    stage = str(values[3]) if len(values) > 3 else "Sin_etapa"
                    
                    if not dev_id:
                        continue
                    
                    # Enviar tarea al pool de hilos
                    future = executor.submit(
                        self._process_single_development, 
                        base_path, dev_id, name, state, stage, item
                    )
                    futures.append((future, i))
                
                # Procesar resultados conforme se completan
                completed = 0
                for future, index in futures:
                    try:
                        result = future.result()
                        if result:
                            # Actualizar la fila en la UI (thread-safe)
                            self.after(0, lambda r=result: self._update_tree_item(r))
                        completed += 1
                        if completed % 10 == 0:
                            print(f"SCAN FOLDERS: Procesados {completed}/{len(futures)} desarrollos")
                    except Exception as e:
                        print(f"SCAN FOLDERS: Error procesando desarrollo {index}: {e}")
                
            print(f"SCAN FOLDERS: Completado - {completed} desarrollos analizados en paralelo")
        except Exception as e:
            print(f"SCAN FOLDERS ERROR: {e}")
            messagebox.showerror("Error", f"No se pudo analizar carpetas: {e}")

    def _process_single_development(self, base_path: str, dev_id: str, name: str, state: str, stage: str, item) -> dict:
        """Procesar un solo desarrollo (para uso en paralelo)"""
        try:
            # Buscar carpeta existente
            found_path = find_existing_folder(base_path, dev_id)
            
            # Determinar acción requerida
            action = self._determine_required_action(base_path, dev_id, name, state, stage, found_path)
            
            return {
                'item': item,
                'found_path': found_path if found_path else "No encontrada",
                'action': action
            }
        except Exception as e:
            return {
                'item': item,
                'found_path': "Error",
                'action': f"❌ Error: {e}"
            }

    def _update_tree_item(self, result: dict) -> None:
        """Actualizar item del tree (thread-safe)"""
        try:
            item = result['item']
            values = list(self.tree.item(item, "values"))
            
            # Ajustar longitud del array a 6 columnas si es necesario
            while len(values) < 6:
                values.append("")
            
            # Actualizar columnas Ruta y Acción
            values[4] = result['found_path']
            values[5] = result['action']
            
            self.tree.item(item, values=tuple(values))
        except Exception as e:
            print(f"UPDATE TREE ERROR: {e}")

    def _determine_required_action(self, base_path: str, dev_id: str, name: str, state: str, stage: str, found_path: str) -> str:
        """Determinar qué acción se requiere para este desarrollo"""
        try:
            if not state or not stage:
                return "❌ Datos incompletos"
            
            # Ruta correcta donde debería estar
            correct_state_dir = os.path.join(base_path, state)
            correct_stage_dir = os.path.join(correct_state_dir, stage)
            
            # Crear nombre de carpeta correcto
            if name and name.strip():
                folder_name = f"{dev_id}_{name}"
            else:
                folder_name = dev_id
                
            correct_dev_dir = os.path.join(correct_stage_dir, folder_name)
            
            if not found_path:
                return "🆕 CREAR"
            elif found_path == correct_dev_dir:
                return "✅ CORRECTO"
            else:
                return "🔄 MOVER"
                
        except Exception as e:
            return f"❌ Error: {e}"

    def _resolve_base_path(self) -> str:
        cfg_path = os.path.join(os.getcwd(), "config.json")
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    base_dirs = cfg.get("base_directories", [])
                    if base_dirs:
                        return base_dirs[0]
            except Exception:
                pass
        return r"C:\\Users\\lerv8093\\OneDrive - Grupo Coomeva\\PROYECTOS DESARROLLOS\\Desarrollos"

    def _on_double_click(self, event) -> None:
        """Doble clic en fila para abrir carpeta del desarrollo"""
        selection = self.tree.selection()
        if not selection:
            return
        item = selection[0]
        values = self.tree.item(item, "values")
        if not values or len(values) < 6:
            return
        
        dev_id = values[0]
        name = values[1] if len(values) > 1 else ""
        state = values[2] if len(values) > 2 else ""
        stage = values[3] if len(values) > 3 else "Sin_etapa"
        found_path = values[4] if len(values) > 4 else ""
        
        # Si ya tiene una ruta encontrada, abrirla directamente
        if found_path and found_path != "No encontrada" and found_path != "Error":
            self._open_folder_path(found_path)
        else:
            # Si no tiene ruta, intentar abrir la carpeta correcta
            self._open_development_folder(dev_id, name, state, stage)

    def _open_folder_path(self, folder_path: str) -> None:
        """Abrir una carpeta específica"""
        try:
            if not folder_path or not os.path.exists(folder_path):
                messagebox.showwarning("Carpeta no encontrada", f"La carpeta no existe:\n{folder_path}")
                return
            
            # Normalizar la ruta
            normalized_path = os.path.normpath(folder_path)
            print(f"ABRIR CARPETA: {normalized_path}")
            
            # Intentar abrir con el explorador de Windows
            try:
                os.startfile(normalized_path)
                print(f"CARPETA ABIERTA: {normalized_path}")
            except Exception as e:
                # Fallback: usar subprocess
                import subprocess
                subprocess.run(["explorer", normalized_path], check=True)
                print(f"CARPETA ABIERTA (fallback): {normalized_path}")
                
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo abrir la carpeta:\n{e}")

    def _on_view_stages(self) -> None:
        """Ver etapas del desarrollo seleccionado"""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("Selección", "Selecciona un desarrollo primero")
            return
        item = selection[0]
        values = self.tree.item(item, "values")
        if not values:
            return
        dev_id = values[0]
        self._show_development_stages(dev_id)

    def _on_open_folder(self) -> None:
        """Abrir carpeta del desarrollo seleccionado"""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("Selección", "Selecciona un desarrollo primero")
            return
        item = selection[0]
        values = self.tree.item(item, "values")
        if not values:
            return
        dev_id = values[0]
        self._open_development_folder(dev_id)

    def _show_development_stages(self, dev_id: str) -> None:
        """Mostrar ventana con etapas del desarrollo"""
        try:
            client = APIClient.from_env_or_file()
            dev, err = client.get_development(dev_id)
            if err:
                messagebox.showerror("Error", f"No se pudo cargar desarrollo: {err}")
                return
            
            # Crear ventana de etapas
            stages_window = tk.Toplevel(self)
            stages_window.title(f"Etapas - {dev_id}")
            stages_window.geometry("600x400")
            
            # Frame principal
            main_frame = ttk.Frame(stages_window, padding=16)
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Información del desarrollo
            info_frame = ttk.LabelFrame(main_frame, text="Información del Desarrollo", padding=8)
            info_frame.pack(fill=tk.X, pady=(0, 12))
            
            ttk.Label(info_frame, text=f"ID: {dev.get('id', 'N/A')}").pack(anchor=tk.W)
            ttk.Label(info_frame, text=f"Nombre: {dev.get('name', 'N/A')}").pack(anchor=tk.W)
            ttk.Label(info_frame, text=f"Estado: {dev.get('general_status', 'N/A')}").pack(anchor=tk.W)
            
            # Fase y etapa actual
            current_phase = dev.get('current_phase', {})
            current_stage = dev.get('current_stage', {})
            
            # Log para debug
            print(f"DEBUG DOBLE CLIC: Dev {dev.get('id')} - current_stage: {current_stage}")
            
            if current_phase:
                ttk.Label(info_frame, text=f"Fase actual: {current_phase.get('phase_name', 'N/A')}").pack(anchor=tk.W)
            if current_stage:
                ttk.Label(info_frame, text=f"Etapa actual: {current_stage.get('stage_name', 'N/A')}").pack(anchor=tk.W)
            
            # Observaciones
            obs_frame = ttk.LabelFrame(main_frame, text="Observaciones", padding=8)
            obs_frame.pack(fill=tk.BOTH, expand=True)
            
            obs_text = tk.Text(obs_frame, height=10, wrap=tk.WORD)
            obs_scroll = ttk.Scrollbar(obs_frame, orient=tk.VERTICAL, command=obs_text.yview)
            obs_text.configure(yscrollcommand=obs_scroll.set)
            
            obs_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            obs_scroll.pack(side=tk.RIGHT, fill=tk.Y)
            
            # Cargar observaciones
            observations, obs_err = client.list_observations(dev_id)
            if obs_err:
                obs_text.insert(tk.END, f"Error cargando observaciones: {obs_err}")
            else:
                for obs in observations:
                    obs_text.insert(tk.END, f"[{obs.get('observation_date', 'N/A')}] {obs.get('author', 'Sistema')}: {obs.get('content', '')}\n")
            
            obs_text.config(state=tk.DISABLED)
            
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo mostrar etapas: {e}")

    def _open_development_folder(self, dev_id: str) -> None:
        """Abrir carpeta del desarrollo en explorador usando etapa actual"""
        try:
            import subprocess
            import os
            from datetime import datetime
            
            # Obtener información del desarrollo para saber su etapa actual
            client = APIClient.from_env_or_file()
            dev, err = client.get_development(dev_id)
            if err:
                messagebox.showerror("Error", f"No se pudo obtener información del desarrollo: {err}")
                return
            
            # Obtener etapa actual del desarrollo
            current_stage = dev.get('current_stage', {})
            stage_name = current_stage.get('stage_name', 'Sin_etapa')
            
            # Usar la función de búsqueda que ya implementamos
            base_path = self._resolve_base_path()
            dev_folder = find_existing_folder(base_path, dev_id)
            
            # Log de la operación
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] LOG: Intentando abrir carpeta para desarrollo {dev_id}")
            print(f"[{timestamp}] LOG: Etapa actual: {stage_name}")
            print(f"[{timestamp}] LOG: Ruta base: {base_path}")
            
            if dev_folder and os.path.exists(dev_folder):
                print(f"[{timestamp}] LOG: Carpeta encontrada: {dev_folder}")
                print(f"[{timestamp}] LOG: Abriendo en explorador...")
                # Normalizar la ruta para evitar problemas con barras invertidas
                normalized_path = os.path.normpath(dev_folder)
                try:
                    # Usar os.startfile que es más confiable en Windows
                    os.startfile(normalized_path)
                    print(f"[{timestamp}] LOG: Explorador abierto exitosamente")
                except Exception as e:
                    # Fallback a subprocess si startfile falla
                    subprocess.run(["explorer", normalized_path], check=True)
                    print(f"[{timestamp}] LOG: Explorador abierto exitosamente (fallback)")
            else:
                print(f"[{timestamp}] LOG: Carpeta no encontrada, creando nueva estructura...")
                # Obtener estado general del desarrollo
                general_status = dev.get('general_status', 'Sin estado')
                
                # Crear estructura: Estado/Etapa/Desarrollo
                status_folder = os.path.join(base_path, general_status)
                stage_folder = os.path.join(status_folder, stage_name)
                dev_folder = os.path.join(stage_folder, dev_id)
                
                # Crear todas las carpetas necesarias
                os.makedirs(dev_folder, exist_ok=True)
                
                print(f"[{timestamp}] LOG: Estructura creada: {general_status}/{stage_name}/{dev_id}")
                print(f"[{timestamp}] LOG: Carpeta creada: {dev_folder}")
                # Normalizar la ruta para evitar problemas con barras invertidas
                normalized_path = os.path.normpath(dev_folder)
                try:
                    # Usar os.startfile que es más confiable en Windows
                    os.startfile(normalized_path)
                    print(f"[{timestamp}] LOG: Explorador abierto con carpeta nueva")
                except Exception as e:
                    # Fallback a subprocess si startfile falla
                    subprocess.run(["explorer", normalized_path], check=True)
                    print(f"[{timestamp}] LOG: Explorador abierto con carpeta nueva (fallback)")
                messagebox.showinfo("Carpeta creada", f"Se creó la carpeta en {general_status}/{stage_name}: {dev_folder}")
                
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] ERROR: No se pudo abrir carpeta: {e}")
            messagebox.showerror("Error", f"No se pudo abrir carpeta: {e}")

    def _on_process_selected(self) -> None:
        """Procesar seleccionados: mover/crear carpetas según estado, similar a Excel VBA"""
        try:
            selection = self.tree.selection()
            if not selection:
                messagebox.showwarning("Selección", "Selecciona uno o más desarrollos")
                return
            
            # Base path
            base_path = r"C:\Users\lerv8093\OneDrive - Grupo Coomeva\PROYECTOS DESARROLLOS\Desarrollos"
            
            items = []
            row_num = 0
            for item in selection:
                values = self.tree.item(item, "values")
                if not values:
                    continue
                incident_id = str(values[0]).strip()
                name = str(values[1]).strip() if len(values) > 1 else ""
                state = str(values[2]).strip() if len(values) > 2 else ""
                stage = str(values[3]).strip() if len(values) > 3 else "Sin_etapa"  # Nueva columna Etapa
                items.append((row_num, ProcessInput(incident_id=incident_id, development_name=name, state=state, stage=stage)))
                row_num += 1
            
            results = process_requirements(base_path, items)
            
            # Construir mensaje de log
            log_lines = []
            for r in results:
                log_lines.append(f"Fila {r.row_index}: {r.incident_id} - {r.message}")
            
            messagebox.showinfo("Resultado del proceso", "\n".join(log_lines) if log_lines else "No hubo elementos para procesar")
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo procesar: {e}")

    def _on_validate_and_reorganize(self) -> None:
        """Validar y reorganizar todos los desarrollos según su estado y etapa"""
        try:
            # Confirmar acción
            result = messagebox.askyesno(
                "Confirmar Reorganización", 
                "¿Desea validar y reorganizar TODOS los desarrollos?\n\n"
                "Esto moverá carpetas a su ubicación correcta según estado/etapa."
            )
            if not result:
                return
            
            base_path = self._resolve_base_path()
            print(f"VALIDATE: Iniciando validación en {base_path}")
            
            # Obtener todos los desarrollos de la tabla
            all_items = []
            for item in self.tree.get_children():
                values = self.tree.item(item, "values")
                if not values or len(values) < 4:
                    continue
                
                dev_id = str(values[0])
                name = str(values[1]) if len(values) > 1 else ""
                state = str(values[2]) if len(values) > 2 else ""
                stage = str(values[3]) if len(values) > 3 else "Sin_etapa"
                
                all_items.append((dev_id, name, state, stage))
            
            print(f"VALIDATE: Procesando {len(all_items)} desarrollos")
            
            # Procesar cada desarrollo en paralelo
            results = []
            with ThreadPoolExecutor(max_workers=4) as executor:
                # Enviar todas las tareas al pool
                futures = []
                for dev_id, name, state, stage in all_items:
                    future = executor.submit(
                        self._validate_single_development, 
                        base_path, dev_id, name, state, stage
                    )
                    futures.append(future)
                
                # Recoger resultados conforme se completan
                for i, future in enumerate(futures):
                    try:
                        result = future.result()
                        results.append(result)
                        if (i + 1) % 10 == 0:
                            print(f"VALIDATE: Procesados {i + 1}/{len(futures)} desarrollos")
                    except Exception as e:
                        print(f"VALIDATE: Error procesando desarrollo {i}: {e}")
                        results.append({
                            "dev_id": "Error",
                            "status": "error",
                            "message": f"Error: {e}",
                            "path": None
                        })
            
            # Mostrar resumen
            self._show_validation_results(results)
            
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo validar y reorganizar: {e}")

    def _validate_single_development(self, base_path: str, dev_id: str, name: str, state: str, stage: str) -> dict:
        """Validar un solo desarrollo y moverlo si es necesario"""
        try:
            print(f"VALIDATE DEV: {dev_id} - Estado: {state}, Etapa: {stage}")
            
            # Ruta correcta donde debería estar
            correct_state_dir = os.path.join(base_path, state)
            correct_stage_dir = os.path.join(correct_state_dir, stage)
            
            # Crear nombre de carpeta con ID y nombre del desarrollo
            if name and name.strip():
                folder_name = f"{dev_id}_{name}"
            else:
                folder_name = dev_id
                
            correct_dev_dir = os.path.join(correct_stage_dir, folder_name)
            
            # Buscar carpeta existente en cualquier lugar
            existing_path = find_existing_folder(base_path, dev_id)
            
            if existing_path:
                # Carpeta existe, verificar si está en el lugar correcto
                if existing_path == correct_dev_dir:
                    return {
                        "dev_id": dev_id,
                        "status": "correct",
                        "message": f"Ya está en ubicación correcta: {state}/{stage}",
                        "path": existing_path
                    }
                else:
                    # Mover a ubicación correcta
                    try:
                        # Crear directorios necesarios
                        os.makedirs(correct_stage_dir, exist_ok=True)
                        
                        # Si la carpeta destino ya existe, eliminar la existente primero
                        if os.path.exists(correct_dev_dir):
                            shutil.rmtree(correct_dev_dir)
                        
                        # Mover carpeta
                        shutil.move(existing_path, correct_dev_dir)
                        return {
                            "dev_id": dev_id,
                            "status": "moved",
                            "message": f"Movido de {os.path.basename(os.path.dirname(existing_path))} a {state}/{stage}",
                            "path": correct_dev_dir
                        }
                    except Exception as e:
                        return {
                            "dev_id": dev_id,
                            "status": "error",
                            "message": f"Error moviendo: {e}",
                            "path": existing_path
                        }
            else:
                # No existe, crear en ubicación correcta
                try:
                    os.makedirs(correct_dev_dir, exist_ok=True)
                    # Crear subcarpetas
                    for subfolder in ["Correos", "Formatos", "Documentos"]:
                        os.makedirs(os.path.join(correct_dev_dir, subfolder), exist_ok=True)
                    return {
                        "dev_id": dev_id,
                        "status": "created",
                        "message": f"Creado en {state}/{stage}",
                        "path": correct_dev_dir
                    }
                except Exception as e:
                    return {
                        "dev_id": dev_id,
                        "status": "error",
                        "message": f"Error creando: {e}",
                        "path": None
                    }
                    
        except Exception as e:
            return {
                "dev_id": dev_id,
                "status": "error",
                "message": f"Error general: {e}",
                "path": None
            }

    def _show_validation_results(self, results: list) -> None:
        """Mostrar resultados de la validación"""
        # Contar resultados
        correct = sum(1 for r in results if r["status"] == "correct")
        moved = sum(1 for r in results if r["status"] == "moved")
        created = sum(1 for r in results if r["status"] == "created")
        errors = sum(1 for r in results if r["status"] == "error")
        
        # Crear ventana de resultados
        result_window = tk.Toplevel(self)
        result_window.title("Resultados de Validación")
        result_window.geometry("800x600")
        
        # Frame principal
        main_frame = ttk.Frame(result_window, padding=16)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Resumen
        summary_frame = ttk.LabelFrame(main_frame, text="Resumen", padding=8)
        summary_frame.pack(fill=tk.X, pady=(0, 12))
        
        ttk.Label(summary_frame, text=f"✅ Correctos: {correct}").pack(anchor=tk.W)
        ttk.Label(summary_frame, text=f"🔄 Movidos: {moved}").pack(anchor=tk.W)
        ttk.Label(summary_frame, text=f"🆕 Creados: {created}").pack(anchor=tk.W)
        ttk.Label(summary_frame, text=f"❌ Errores: {errors}").pack(anchor=tk.W)
        
        # Detalles
        details_frame = ttk.LabelFrame(main_frame, text="Detalles", padding=8)
        details_frame.pack(fill=tk.BOTH, expand=True)
        
        # Treeview para resultados
        columns = ("desarrollo", "estado", "mensaje")
        tree = ttk.Treeview(details_frame, columns=columns, show="headings", height=15)
        tree.heading("desarrollo", text="Desarrollo")
        tree.heading("estado", text="Estado")
        tree.heading("mensaje", text="Mensaje")
        tree.column("desarrollo", width=150)
        tree.column("estado", width=100)
        tree.column("mensaje", width=400)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(details_frame, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)
        
        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Llenar datos
        for result in results:
            status_icon = {
                "correct": "✅",
                "moved": "🔄", 
                "created": "🆕",
                "error": "❌"
            }.get(result["status"], "❓")
            
            tree.insert("", tk.END, values=(
                result["dev_id"],
                f"{status_icon} {result['status']}",
                result["message"]
            ))
        
        # Botones
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(12, 0))
        
        ttk.Button(button_frame, text="Actualizar Vista", command=lambda: [self._on_scan_folders(), result_window.destroy()]).pack(side=tk.LEFT)
        ttk.Button(button_frame, text="Cerrar", command=result_window.destroy).pack(side=tk.RIGHT)

    def _auto_load(self) -> None:
        """Carga automática al iniciar: API + análisis de carpetas"""
        try:
            # Cargar desde API primero (modo silencioso y rápido)
            self._on_load_from_api_fast(silent=True)
            # Luego analizar carpetas
            self._on_scan_folders()
        except Exception as e:
            print(f"AUTO-LOAD ERROR: {e}")
            # No mostrar diálogos de error en auto-load


def main() -> None:
    app = DocumentBotApp()
    app.mainloop()


if __name__ == "__main__":
    main()


