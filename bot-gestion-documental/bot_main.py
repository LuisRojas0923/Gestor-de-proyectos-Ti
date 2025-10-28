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
from bot_ui_helpers import UIHelpers
from bot_actions_view import ActionsView
from bot_quality_controls import QualityControlValidator
from bot_controls_view import ControlsView
from bot_filter_manager import FilterManager
from bot_ti_controls_view import TIControlsView
from bot_docker_view import DockerView


class SimpleDocumentBot:
    """Bot simple de gestión documental"""
    
    def __init__(self):
        self.root = ttk.Window(themename="darkly")
        self.root.title("Bot de Gestión Documental - Simple")
        self.root.geometry("1360x590")
        
        # Variables
        self.base_path = "C:/Users/lerv8093/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos"
        self.developments = []
        self.ui_helpers = UIHelpers(self.base_path, self._log)
        self.quality_validator = QualityControlValidator(self.base_path, self._log)
        
        # Crear interfaz
        self._create_ui()
        
        # NO cargar datos automáticamente - el usuario debe hacerlo manualmente
        self._log("✅ Bot listo - Use el botón 'Actualizar' para cargar datos")
    
    def _create_ui(self):
        """Crear interfaz de usuario"""
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=BOTH, expand=True)
        
        # Botones
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=X, pady=(0, 10))
        
        ttk.Button(button_frame, text="🔄 Actualizar", command=self._load_data, bootstyle=SUCCESS).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📁 Escanear Carpetas", command=self._scan_folders, bootstyle=INFO).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="🔍 Comparar y Sugerir", command=self._compare_and_suggest, bootstyle=PRIMARY).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="🎯 Vista de Acciones", command=self._open_actions_view, bootstyle=SECONDARY).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📋 Validar Controles", command=self._validate_controls, bootstyle=WARNING).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="📂 Gestionar Controles TI", command=self._open_ti_controls, bootstyle=INFO).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="🐳 Docker", command=self._open_docker_view, bootstyle=SECONDARY).pack(side=LEFT, padx=(0, 5))
        ttk.Button(button_frame, text="❌ Cerrar", command=self._close_bot, bootstyle=DANGER).pack(side=LEFT, padx=(0, 5))
        
        # Filtros
        self.filter_manager = FilterManager(main_frame, self._log)
        
        # TreeView
        self.tree = ttk.Treeview(main_frame, columns=("id", "nombre", "etapa", "ruta", "accion"), show="headings", height=14)
        self.tree.pack(fill=BOTH, expand=True)
        
        # Configurar columnas
        self.tree.heading("id", text="ID")
        self.tree.heading("nombre", text="Nombre")
        self.tree.heading("etapa", text="Etapa")
        self.tree.heading("ruta", text="Ruta")
        self.tree.heading("accion", text="Acción")
        
        self.tree.column("id", width=120)
        self.tree.column("nombre", width=400)
        self.tree.column("etapa", width=150)
        self.tree.column("ruta", width=300)
        self.tree.column("accion", width=100)
        
        # Conectar filtro con TreeView
        self.filter_manager.set_tree(self.tree)
        
        # Eventos
        self.tree.bind("<Double-1>", self._on_double_click)
        
        # Log
        self.log_text = ttk.Text(main_frame, height=8, wrap=WORD)
        self.log_text.pack(fill=X, pady=(10, 0))
        
        # Scrollbar para log
        scrollbar = ttk.Scrollbar(main_frame, orient=VERTICAL, command=self.log_text.yview)
        scrollbar.pack(side=RIGHT, fill=Y)
        self.log_text.configure(yscrollcommand=scrollbar.set)
    
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
            # Configurar datos en el filtro
            self.filter_manager.set_tree_data(tree_data)
            
            # Limpiar tree
            for item in self.tree.get_children():
                self.tree.delete(item)
            
            # Llenar tree
            for data in tree_data:
                self.tree.insert("", END, values=data)
    
    def _scan_folders(self):
        """Escanear carpetas existentes"""
        # Usar helper para escanear carpetas
        tree_data = self.ui_helpers.scan_folders()
        
        if tree_data:
            # Configurar datos en el filtro
            self.filter_manager.set_tree_data(tree_data)
            
            # Limpiar tree
            for item in self.tree.get_children():
                self.tree.delete(item)
            
            # Llenar tree
            for data in tree_data:
                self.tree.insert("", END, values=data)
    
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
            
            # Limpiar tree
            for item in self.tree.get_children():
                self.tree.delete(item)
            
            # Mostrar resultados en tree
            for data in tree_data:
                self.tree.insert("", END, values=data)
            
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
    
    def _on_double_click(self, event):
        """Manejar doble clic en tree"""
        item = self.tree.selection()[0]
        values = self.tree.item(item, "values")
        
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


if __name__ == "__main__":
    bot = SimpleDocumentBot(); bot.run()
