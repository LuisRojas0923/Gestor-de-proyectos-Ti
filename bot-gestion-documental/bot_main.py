"""
Bot de Gestión Documental - Versión Simplificada
===============================================

Bot principal simplificado que delega funcionalidades a módulos especializados.
"""

import os
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import messagebox, END
from datetime import datetime
import json
from bot_ui_helpers import UIHelpers
from bot_actions_view import ActionsView
from bot_quality_controls import QualityControlValidator
from bot_controls_view import ControlsView
from bot_filter_manager import FilterManager
from bot_ti_controls_view import TIControlsView
from bot_docker_view import DockerView
from bot_main_helpers import BotMainHelpers
from bot_other_functions_view import OtherFunctionsView
from bot_development_checker import DevelopmentChecker


class SimpleDocumentBot:
    """Bot simple de gestión documental"""
    
    def __init__(self):
        self.root = ttk.Window(themename="darkly")
        self.root.title("Bot de Gestión Documental - Simple")
        self.root.geometry("1400x720")
        
        # Variables
        self.base_path = "C:/Users/lerv8093/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos"
        self.developments = []
        self.ui_helpers = UIHelpers(self.base_path, self._log)
        self.quality_validator = QualityControlValidator(self.base_path, self._log)
        self.main_helpers = BotMainHelpers(self._log)
        
        # Crear interfaz
        self._create_ui()
        
        # NO cargar datos automáticamente - el usuario debe hacerlo manualmente
        self._log("✅ Bot listo - Use el botón 'Actualizar' para cargar datos")
        # Restaurar pantalla activa si existe
        self._restore_active_screen()
    
    def _create_ui(self):
        """Crear interfaz de usuario"""
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=BOTH, expand=True)
        
        # Botones
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Button(button_frame, text="🔄 Actualizar", command=self._load_data, bootstyle=SUCCESS).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="🎯 Vista de Acciones", command=self._open_actions_view, bootstyle=SECONDARY).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="🐳 Docker", command=self._open_docker_view, bootstyle=SECONDARY).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="🔍 Verificar Desarrollos", command=self._open_development_checker, bootstyle=INFO).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="⚙️ Otras Funciones", command=self._open_other_functions, bootstyle=WARNING).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="❌ Cerrar", command=self._close_bot, bootstyle=DANGER).pack(side=LEFT, padx=(0, 5))
        
        # Separador visual bajo la barra de acciones
        ttk.Separator(main_frame, orient=HORIZONTAL).pack(fill=X, pady=(6, 6))

        # Contenido principal con divisor vertical (pantalla arriba, log abajo)
        content_paned = ttk.Panedwindow(main_frame, orient=VERTICAL)
        content_paned.pack(fill=BOTH, expand=True)

        # Contenedor de pantallas (pane superior)
        self.screen_container = ttk.Frame(content_paned)
        content_paned.add(self.screen_container, weight=4)
        self.screens = {}
        
        # Crear y mostrar pantalla de inicio (Home)
        self._ensure_screen("home")
        self.show_screen("home")

        # Nota: navegación embebida deshabilitada; se usan ventanas dedicadas (Toplevel)
        
        # Log (pane inferior)
        log_frame = ttk.LabelFrame(content_paned, text="Registro", padding="6")
        content_paned.add(log_frame, weight=1)
        self.log_text = ttk.Text(log_frame, height=8, wrap=WORD)
        self.log_text.pack(side=LEFT, fill=BOTH, expand=True)
        # Scrollbar para log
        scrollbar = ttk.Scrollbar(log_frame, orient=VERTICAL, command=self.log_text.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.log_text.configure(yscrollcommand=scrollbar.set)

        # Configurar pesos y tamaños mínimos de panes para evitar superposición
        try:
            content_paned.paneconfigure(self.screen_container, weight=5, minsize=300)
            content_paned.paneconfigure(log_frame, weight=1, minsize=140)
        except Exception:
            pass

        # Posicionar sash inicial: reservar ~160px para el log
        def _place_sash():
            try:
                total_h = content_paned.winfo_height() or self.root.winfo_height()
                pos = max(280, total_h - 160)
                content_paned.sashpos(0, pos)
            except Exception:
                pass
        self.root.after(150, _place_sash)

    def _ensure_screen(self, name: str):
        if name in self.screens:
            return
        if name == "home":
            frame = HomeScreen(self.screen_container, self)
        else:
            raise ValueError(name)
        self.screens[name] = frame
        frame.grid(row=0, column=0, sticky="nsew")

    def show_screen(self, name: str):
        self._ensure_screen(name)
        self.screens[name].tkraise()
        # Guardar pantalla activa
        try:
            settings_path = os.path.join(os.path.dirname(__file__), 'settings.json')
            with open(settings_path, 'w', encoding='utf-8') as f:
                json.dump({"active_screen": name}, f)
        except Exception as e:
            self._log(f"⚠️ No se pudo guardar pantalla activa: {e}")

    def _restore_active_screen(self):
        try:
            settings_path = os.path.join(os.path.dirname(__file__), 'settings.json')
            if os.path.exists(settings_path):
                with open(settings_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    screen = data.get('active_screen')
                    if screen == 'home':
                        self.show_screen('home')
                    else:
                        # Forzar home si había otra pantalla guardada
                        self.show_screen('home')
        except Exception as e:
            self._log(f"⚠️ No se pudo restaurar pantalla activa: {e}")
    
    def _log(self, message):
        """Agregar mensaje al log"""
        try:
            timestamp = datetime.now().strftime("%H:%M:%S")
            self.log_text.insert(END, f"[{timestamp}] {message}\n")
            self.log_text.see(END)
            self.root.update()
        except:
            # Si hay error con el log (ej: ventana cerrada), solo imprimir
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
    
    def _load_data(self):
        """Cargar datos desde el servicio"""
        # Usar helper para cargar datos
        tree_data, developments = self.ui_helpers.load_data_from_service()
        
        if tree_data:
            # Guardar desarrollos originales para comparación
            self.developments = developments
            # Configurar datos en el filtro de la pantalla Home
            self.screens["home"].filter_manager.set_tree_data(tree_data)
            
            # Limpiar tree
            for item in self.screens["home"].tree.get_children():
                self.screens["home"].tree.delete(item)
            
            # Llenar tree
            for data in tree_data:
                self.screens["home"].tree.insert("", END, values=data)
    
    def _scan_folders(self):
        """Escanear carpetas existentes"""
        # Usar helper para escanear carpetas
        tree_data = self.ui_helpers.scan_folders()
        
        if tree_data:
            # Configurar datos en el filtro de la pantalla Home
            self.screens["home"].filter_manager.set_tree_data(tree_data)
            
            # Limpiar tree
            for item in self.screens["home"].tree.get_children():
                self.screens["home"].tree.delete(item)
            
            # Llenar tree
            for data in tree_data:
                self.screens["home"].tree.insert("", END, values=data)
    
    def _compare_and_suggest(self):
        """Comparar desarrollos del servicio contra rutas y sugerir acciones"""
        if not self.developments:
            self._log("❌ No hay desarrollos cargados. Use 'Actualizar' primero.")
            return
        
        try:
            # Usar helper para comparar
            tree_data, suggestions = self.ui_helpers.compare_and_suggest(self.developments)
            
            # Guardar sugerencias para la vista de acciones
            self.current_suggestions = suggestions
            
            # Limpiar tree (Home)
            for item in self.screens["home"].tree.get_children():
                self.screens["home"].tree.delete(item)
            # Mostrar resultados en tree (Home)
            for data in tree_data:
                self.screens["home"].tree.insert("", END, values=data)
            
        except Exception as e:
            self._log(f"❌ Error en comparación: {e}")
    
    def _open_actions_view(self):
        """Abrir vista de acciones agrupadas"""
        self._log("🎯 Abriendo vista de acciones...")
        
        try:
            # Automáticamente actualizar datos y generar sugerencias
            self._log("🔄 Actualizando datos automáticamente...")
            self._load_data()
            
            if not self.developments:
                self._log("❌ No se pudieron cargar desarrollos. Verifique la conexión al servicio.")
                messagebox.showerror("Error", "No se pudieron cargar desarrollos. Verifique la conexión al servicio.")
                return
            
            self._log("🔍 Generando sugerencias automáticamente...")
            self._compare_and_suggest()
            
            if not hasattr(self, 'current_suggestions') or not self.current_suggestions:
                self._log("❌ No se generaron sugerencias.")
                messagebox.showerror("Error", "No se generaron sugerencias.")
                return
            
            # Crear vista de acciones
            actions_view = ActionsView(self.root, self.base_path, self._log)
            actions_view.load_suggestions(self.current_suggestions)
            self._log("🎯 Vista de acciones abierta con datos actualizados")
            
        except Exception as e:
            self._log(f"❌ Error abriendo vista de acciones: {e}")
            messagebox.showerror("Error", f"Error abriendo vista de acciones: {e}")
    
    def _validate_controls(self):
        """Validar controles de calidad"""
        self._log("🎯 Abriendo vista de controles de calidad...")
        
        try:
            # Verificar que hay desarrollos cargados
            if not self.developments:
                self._log("🔄 Cargando datos automáticamente...")
                self._load_data()
                
                if not self.developments:
                    self._log("❌ No se pudieron cargar desarrollos. Verifique la conexión al servicio.")
                    messagebox.showerror("Error", "No se pudieron cargar desarrollos. Verifique la conexión al servicio.")
                    return
            
            # Validar controles para todos los desarrollos
            self._log("🔍 Validando controles de calidad...")
            validation_results = self.quality_validator.validate_multiple_developments(self.developments)
            
            if not validation_results:
                self._log("❌ No se generaron resultados de validación.")
                messagebox.showerror("Error", "No se generaron resultados de validación.")
                return
            
            # Crear vista de controles
            controls_view = ControlsView(self.root, self.base_path, self._log)
            controls_view.load_validation_results(validation_results)
            self._log("🎯 Vista de controles abierta con resultados de validación")
            
        except Exception as e:
            self._log(f"❌ Error validando controles: {e}")
            messagebox.showerror("Error", f"Error validando controles: {e}")
    
    def _open_ti_controls(self):
        """Abrir vista de gestión de controles TI"""
        self._log("📂 Abriendo vista de gestión de controles TI...")
        
        try:
            # Verificar que hay desarrollos cargados
            if not self.developments:
                self._log("🔄 Cargando datos automáticamente...")
                self._load_data()
                
                if not self.developments:
                    self._log("❌ No se pudieron cargar desarrollos. Verifique la conexión al servicio.")
                    messagebox.showerror("Error", "No se pudieron cargar desarrollos. Verifique la conexión al servicio.")
                    return
            
            # Crear vista de controles TI
            ti_controls_view = TIControlsView(self.root, self.base_path, self._log)
            ti_controls_view.load_developments(self.developments)
            self._log("📂 Vista de controles TI abierta con datos actualizados")
            
        except Exception as e:
            self._log(f"❌ Error abriendo vista de controles TI: {e}")
            messagebox.showerror("Error", f"Error abriendo vista de controles TI: {e}")

    def _open_docker_view(self):
        """Abrir vista de gestión de Docker y contenedores"""
        try:
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            DockerView(self.root, project_root, self._log)
            self._log("🐳 Vista de Docker abierta")
        except Exception as e:
            self._log(f"❌ Error abriendo vista de Docker: {e}")
            messagebox.showerror("Error", f"Error abriendo vista de Docker: {e}")
    
    def _open_other_functions(self):
        """Abrir ventana de otras funciones"""
        try:
            OtherFunctionsView(self.root, self, self._log)
            self._log("⚙️ Vista de otras funciones abierta")
        except Exception as e:
            self._log(f"❌ Error abriendo otras funciones: {e}")
            messagebox.showerror("Error", f"Error abriendo otras funciones: {e}")
    
    def _open_development_checker(self):
        """Abrir vista de verificación de desarrollos"""
        self.main_helpers.open_development_checker(self.root, self.base_path)
    
    def _on_double_click(self, event):
        """Manejar doble clic en tree"""
        # Redirigir al tree de HomeScreen
        item = self.screens["home"].tree.selection()[0]
        values = self.screens["home"].tree.item(item, "values")
        
        if values:
            dev_id = values[0]
            name = values[1]
            path = values[3]
            
            self._log(f"🖱️ Doble clic en: {dev_id} - {name}")
            
            if path and path != "No encontrada":
                try:
                    import os
                    os.startfile(path)
                    self._log(f"📁 Abriendo carpeta: {path}")
                except Exception as e:
                    self._log(f"❌ Error abriendo carpeta: {e}")
            else:
                self._log(f"⚠️ No hay carpeta para {dev_id}")
    
    
    def _close_bot(self):
        """Cerrar el bot con confirmación"""
        self._log("❌ Usuario solicitó cerrar el bot")
        if messagebox.askyesno("Cerrar Bot", "¿Estás seguro de que quieres cerrar el bot?"):
            self._log("✅ Bot cerrado por el usuario")
            self.root.quit()
    
    def run(self):
        """Ejecutar bot"""
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            self._log("✅ Bot cerrado por interrupción del teclado")
        except Exception as e:
            self._log(f"❌ Error inesperado: {e}")
        finally:
            self._log("✅ Bot finalizado")

class HomeScreen(ttk.Frame):
    """Pantalla de inicio: contiene filtros y listado (TreeView) actuales"""
    def __init__(self, parent, app: SimpleDocumentBot):
        super().__init__(parent)
        # Filtros
        self.filter_manager = FilterManager(self, app._log)
        # Contenedor del listado
        list_frame = ttk.LabelFrame(self, text="Listado de desarrollos", padding="6")
        list_frame.pack(fill=BOTH, expand=True)
        # Tree + scrollbars
        tree_wrap = ttk.Frame(list_frame)
        tree_wrap.pack(fill=BOTH, expand=True)
        yscroll = ttk.Scrollbar(tree_wrap, orient=VERTICAL)
        xscroll = ttk.Scrollbar(tree_wrap, orient=HORIZONTAL)
        self.tree = ttk.Treeview(
            tree_wrap,
            columns=("id", "nombre", "etapa", "ruta", "accion"),
            show="headings",
            height=18,
            yscrollcommand=yscroll.set,
            xscrollcommand=xscroll.set,
        )
        yscroll.configure(command=self.tree.yview)
        xscroll.configure(command=self.tree.xview)
        self.tree.pack(side=LEFT, fill=BOTH, expand=True)
        yscroll.pack(side=RIGHT, fill=Y)
        xscroll.pack(side=BOTTOM, fill=X)
        # Configurar columnas
        self.tree.heading("id", text="ID")
        self.tree.heading("nombre", text="Nombre")
        self.tree.heading("etapa", text="Etapa")
        self.tree.heading("ruta", text="Ruta")
        self.tree.heading("accion", text="Acción")
        self.tree.column("id", width=140, anchor=W, stretch=True)
        self.tree.column("nombre", width=520, anchor=W, stretch=True)
        self.tree.column("etapa", width=180, anchor=W, stretch=True)
        self.tree.column("ruta", width=420, anchor=W, stretch=True)
        self.tree.column("accion", width=140, anchor=W, stretch=False)
        # Conectar filtro con TreeView
        self.filter_manager.set_tree(self.tree)
        # Eventos
        self.tree.bind("<Double-1>", app._on_double_click)

        # Ajuste visual de altura de filas para pantallas grandes
        try:
            style = ttk.Style()
            style.configure('Treeview', rowheight=26)
        except Exception:
            pass


class TIControlsScreen(ttk.Frame):
    """Pantalla Controles TI: placeholder que dispara la vista existente o futura UI embebida"""
    def __init__(self, parent, app: SimpleDocumentBot):
        super().__init__(parent)
        ttk.Label(self, text="Gestión de Controles TI", font=("Arial", 14, "bold")).pack(pady=10)
        actions_bar = ttk.Frame(self)
        actions_bar.pack(fill=X, pady=(0, 10))
        self.btn_validate = ttk.Button(actions_bar, text="Validar Controles (Embebido)", bootstyle=SUCCESS,
                   command=lambda: self._embedded_validate(app))
        self.btn_validate.pack(side=LEFT, padx=(0, 5))
        ttk.Button(actions_bar, text="Abrir vista completa (Toplevel)", bootstyle=PRIMARY,
                   command=app._open_ti_controls).pack(side=LEFT, padx=(0, 5))

        # Tabla resumida embebida
        self.table = ttk.Treeview(self, columns=("id", "nombre", "estado", "%"), show="headings", height=14)
        self.table.pack(fill=BOTH, expand=True)
        self.table.heading("id", text="ID")
        self.table.heading("nombre", text="Nombre")
        self.table.heading("estado", text="Estado")
        self.table.heading("%", text="% Cumpl.")
        self.table.column("id", width=140)
        self.table.column("nombre", width=420)
        self.table.column("estado", width=160)
        self.table.column("%", width=100)

    def _embedded_validate(self, app: SimpleDocumentBot):
        # Asegurar datos cargados
        if not app.developments:
            app._log("🔄 Cargando datos para validar controles (embebido)...")
            app._load_data()
            if not app.developments:
                app._log("❌ No hay desarrollos para validar.")
                messagebox.showwarning("Validación", "No hay desarrollos para validar.")
                return
        try:
            # Loader: deshabilitar botón y mostrar barra indeterminada
            self.btn_validate.configure(state=DISABLED)
            pb = ttk.Progressbar(self, mode='indeterminate')
            pb.pack(fill=X, pady=(6, 6))
            pb.start(10)
            app._log("🔍 Validando controles TI (embebido)...")
            results = app.quality_validator.validate_multiple_developments(app.developments)
            # Limpiar tabla
            for item in self.table.get_children():
                self.table.delete(item)
            # Resumir por desarrollo: estado general y % promedio
            for r in results:
                dev_id = r.get('dev_id', 'N/A')
                dev_name = r.get('dev_name', 'N/A')
                overall = r.get('overall_status', 'N/A')
                controls = r.get('controls_status', {}) or {}
                # Promedio simple de completion_percentage si está
                percents = []
                for cs in controls.values():
                    p = cs.get('completion_percentage')
                    if isinstance(p, (int, float)):
                        percents.append(p)
                avg = round(sum(percents)/len(percents), 1) if percents else 0.0
                self.table.insert("", END, values=(dev_id, dev_name, overall, f"{avg}%"))
            app._log("✅ Validación embebida finalizada")
        except Exception as e:
            app._log(f"❌ Error en validación embebida: {e}")
            messagebox.showerror("Error", f"Error en validación embebida: {e}")
        finally:
            # Quitar loader y habilitar botón
            try:
                pb.stop(); pb.destroy()
            except:
                pass
            self.btn_validate.configure(state=NORMAL)


class DevelopmentCheckerScreen(ttk.Frame):
    """Pantalla de Verificación de Desarrollos: resumen embebido y acceso a vista completa"""
    def __init__(self, parent, app: SimpleDocumentBot):
        super().__init__(parent)
        self.app = app
        ttk.Label(self, text="Verificación de Desarrollos", font=("Arial", 14, "bold")).pack(pady=10)
        bar = ttk.Frame(self)
        bar.pack(fill=X, pady=(0, 10))
        self.btn_check = ttk.Button(bar, text="Verificar (Embebido)", bootstyle=SUCCESS,
                   command=self._embedded_check)
        self.btn_check.pack(side=LEFT, padx=(0, 5))
        ttk.Button(bar, text="Abrir vista completa (Toplevel)", bootstyle=PRIMARY,
                   command=self.app._open_development_checker).pack(side=LEFT, padx=(0, 5))

        # Tabla de resultados
        self.table = ttk.Treeview(self, columns=("id", "carpeta", "fase", "estado", "encontrados", "requeridos"), show="headings", height=14)
        self.table.pack(fill=BOTH, expand=True)
        for key, text, width in (
            ("id", "ID", 140), ("carpeta", "Carpeta", 380), ("fase", "Fase", 160),
            ("estado", "Estado", 140), ("encontrados", "Encontrados", 120), ("requeridos", "Requeridos", 120)
        ):
            self.table.heading(key, text=text)
            self.table.column(key, width=width)

        # Resumen de faltantes por control
        summary_frame = ttk.Labelframe(self, text="Resumen de faltantes por control")
        summary_frame.pack(fill=X, pady=(8, 0))
        self.lbl_c003 = ttk.Label(summary_frame, text="C003-GT: 0")
        self.lbl_c003.pack(side=LEFT, padx=(10, 10))
        self.lbl_c004 = ttk.Label(summary_frame, text="C004-GT: 0")
        self.lbl_c004.pack(side=LEFT, padx=(10, 10))
        self.lbl_c021 = ttk.Label(summary_frame, text="C021-GT: 0")
        self.lbl_c021.pack(side=LEFT, padx=(10, 10))

    def _embedded_check(self):
        try:
            # Loader: deshabilitar botón y mostrar barra indeterminada
            self.btn_check.configure(state=DISABLED)
            pb = ttk.Progressbar(self, mode='indeterminate')
            pb.pack(fill=X, pady=(6, 6))
            pb.start(10)
            self.app._log("🔍 Verificando desarrollos (embebido)...")
            checker = DevelopmentChecker(self.app.base_path, self.app._log)
            results = checker.check_all_developments(filter_by_service=False)

            # Limpiar tabla
            for item in self.table.get_children():
                self.table.delete(item)

            # Poblar
            for r in results:
                self.table.insert(
                    "", END,
                    values=(
                        r.get('dev_id', 'N/A'),
                        r.get('folder_name', 'N/A'),
                        r.get('phase', 'N/A'),
                        r.get('overall_status', 'N/A'),
                        r.get('total_files_found', 0),
                        r.get('total_files_required', 0),
                    )
                )
            # Calcular resumen faltantes por control
            c003_missing = 0; c004_missing = 0; c021_missing = 0
            for r in results:
                cs = r.get('controls_status', {}) or {}
                if 'C003-GT' in cs:
                    c003_missing += len(cs['C003-GT'].get('files_missing', []))
                if 'C004-GT' in cs:
                    c004_missing += len(cs['C004-GT'].get('files_missing', []))
                if 'C021-GT' in cs:
                    c021_missing += len(cs['C021-GT'].get('files_missing', []))
            self.lbl_c003.configure(text=f"C003-GT: {c003_missing}")
            self.lbl_c004.configure(text=f"C004-GT: {c004_missing}")
            self.lbl_c021.configure(text=f"C021-GT: {c021_missing}")
            self.app._log("✅ Verificación embebida finalizada")
        except Exception as e:
            self.app._log(f"❌ Error verificando (embebido): {e}")
            messagebox.showerror("Error", f"Error verificando (embebido): {e}")
        finally:
            # Quitar loader y habilitar botón
            try:
                pb.stop(); pb.destroy()
            except:
                pass
            self.btn_check.configure(state=NORMAL)


if __name__ == "__main__":
    bot = SimpleDocumentBot(); bot.run()
