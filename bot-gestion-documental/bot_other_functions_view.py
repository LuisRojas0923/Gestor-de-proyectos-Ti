"""
Bot Other Functions View - Vista de otras funciones
=================================================

Vista secundaria para funciones menos utilizadas del bot.
"""

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from tkinter import Toplevel, messagebox
from typing import Callable


class OtherFunctionsView(Toplevel):
    """Vista para otras funciones del bot"""
    
    def __init__(self, master, bot_instance, logger: Callable[[str], None]):
        super().__init__(master)
        self.title("Otras Funciones")
        self.geometry("600x400")
        self.transient(master)
        self.grab_set()
        
        self.bot = bot_instance
        self._log = logger
        
        self._create_ui()
        self._log("⚙️ Vista de otras funciones lista")
    
    def _create_ui(self):
        """Crear interfaz de usuario"""
        main_frame = ttk.Frame(self, padding="20")
        main_frame.pack(fill=BOTH, expand=True)
        
        # Título
        title_frame = ttk.Frame(main_frame)
        title_frame.pack(fill=X, pady=(0, 20))
        
        ttk.Label(title_frame, text="⚙️ Otras Funciones", 
                 font=("Arial", 16, "bold")).pack()
        
        # Descripción
        ttk.Label(title_frame, text="Funciones adicionales del bot de gestión documental", 
                 font=("Arial", 10)).pack(pady=(5, 0))
        
        # Botones organizados verticalmente
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill=BOTH, expand=True, pady=(0, 20))
        
        # Botón Escanear Carpetas
        ttk.Button(buttons_frame, text="📁 Escanear Carpetas", 
                  command=self._scan_folders, 
                  bootstyle=INFO, width=40).pack(pady=8)
        
        # Botón Comparar y Sugerir
        ttk.Button(buttons_frame, text="🔍 Comparar y Sugerir", 
                  command=self._compare_and_suggest, 
                  bootstyle=PRIMARY, width=40).pack(pady=8)
        
        # Botón Validar Controles
        ttk.Button(buttons_frame, text="📋 Validar Controles", 
                  command=self._validate_controls, 
                  bootstyle=WARNING, width=40).pack(pady=8)
        
        # Botón Gestionar Controles TI
        ttk.Button(buttons_frame, text="📂 Gestionar Controles TI", 
                  command=self._open_ti_controls, 
                  bootstyle=INFO, width=40).pack(pady=8)
        
        # Botón Cerrar
        close_frame = ttk.Frame(main_frame)
        close_frame.pack(fill=X)
        
        ttk.Button(close_frame, text="❌ Cerrar", 
                  command=self.destroy, 
                  bootstyle=DANGER, width=40).pack(pady=(10, 0))
    
    def _scan_folders(self):
        """Ejecutar escaneo de carpetas"""
        self._log("📁 Ejecutando escaneo de carpetas...")
        try:
            self.bot._scan_folders()
            self._log("✅ Escaneo de carpetas completado")
            self.destroy()
        except Exception as e:
            self._log(f"❌ Error en escaneo de carpetas: {e}")
            messagebox.showerror("Error", f"Error en escaneo de carpetas: {e}")
    
    def _compare_and_suggest(self):
        """Ejecutar comparación y sugerencias"""
        self._log("🔍 Ejecutando comparación y sugerencias...")
        try:
            self.bot._compare_and_suggest()
            self._log("✅ Comparación y sugerencias completadas")
            self.destroy()
        except Exception as e:
            self._log(f"❌ Error en comparación: {e}")
            messagebox.showerror("Error", f"Error en comparación: {e}")
    
    def _validate_controls(self):
        """Ejecutar validación de controles"""
        self._log("📋 Ejecutando validación de controles...")
        try:
            self.bot._validate_controls()
            self._log("✅ Validación de controles completada")
            self.destroy()
        except Exception as e:
            self._log(f"❌ Error en validación de controles: {e}")
            messagebox.showerror("Error", f"Error en validación de controles: {e}")
    
    def _open_ti_controls(self):
        """Abrir gestión de controles TI"""
        self._log("📂 Abriendo gestión de controles TI...")
        try:
            self.bot._open_ti_controls()
            self._log("✅ Gestión de controles TI abierta")
            self.destroy()
        except Exception as e:
            self._log(f"❌ Error abriendo controles TI: {e}")
            messagebox.showerror("Error", f"Error abriendo controles TI: {e}")
