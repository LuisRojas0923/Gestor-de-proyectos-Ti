"""
Punto de entrada principal de la herramienta de auditoría.
Ejecutar: python -m auditoria
"""
import os
import tkinter as tk
import threading

from .config import get_project_root
from .scanners.line_counter import count_lines, get_summary
from .scanners.design_audit import scan_design_issues
from .scanners.security_audit import scan_security_issues, scan_reliability_issues
from .scanners.structure_audit import scan_structure_issues
from .ui.tkinter_app import AuditApp

class AuditController:
    """Controlador principal que coordina los escaneos."""
    
    def __init__(self):
        self.root_dir = get_project_root()
        self.root = tk.Tk()
        self.app = AuditApp(self.root, self.start_scan)
    
    def start_scan(self):
        """Inicia el escaneo en un hilo separado."""
        threading.Thread(target=self._scan_process, daemon=True).start()
    
    def _scan_process(self):
        """Ejecuta todos los escáneres."""
        # Conteo de líneas
        line_data = count_lines(self.root_dir)
        summary = get_summary(line_data)
        
        # Auditorías
        design_data = scan_design_issues(self.root_dir)
        security_data = scan_security_issues(self.root_dir)
        reliability_data = scan_reliability_issues(self.root_dir)
        structure_data = scan_structure_issues(self.root_dir)
        
        # Actualizar UI en hilo principal
        self.root.after(0, lambda: self.app.update_data(
            line_data, design_data, security_data, reliability_data, structure_data, summary
        ))
    
    def run(self):
        """Ejecuta la aplicación."""
        # Escaneo inicial
        self.start_scan()
        self.root.mainloop()

def main():
    """Función principal."""
    try:
        controller = AuditController()
        controller.run()
    except KeyboardInterrupt:
        print("\nAplicación cerrada por el usuario.")

if __name__ == "__main__":
    main()
