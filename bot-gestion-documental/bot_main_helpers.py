"""
Bot Main Helpers - Funciones auxiliares del bot principal
========================================================

Funciones auxiliares para reducir el tamaño de bot_main.py.
"""

from typing import Callable
from tkinter import messagebox
from bot_development_checker_view import DevelopmentCheckerView


class BotMainHelpers:
    """Funciones auxiliares para el bot principal"""
    
    def __init__(self, logger: Callable[[str], None]):
        self._log = logger
    
    def open_development_checker(self, master, base_path: str):
        """Abrir vista de verificación de desarrollos"""
        try:
            DevelopmentCheckerView(master, base_path, self._log)
            self._log("🔍 Vista de verificación de desarrollos abierta")
        except Exception as e:
            self._log(f"❌ Error abriendo vista de verificación: {e}")
            messagebox.showerror("Error", f"Error abriendo vista de verificación: {e}")
