import os
import tkinter as tk
import threading
import argparse
import sys

from .config import get_project_root
from .scanners.line_counter import count_lines, get_summary
from .scanners.design_audit import scan_design_issues
from .scanners.security_audit import scan_security_issues, scan_reliability_issues
from .scanners.structure_audit import scan_structure_issues
from .scanners.utils import get_files_to_scan
from .ui.tkinter_app import AuditApp

class AuditController:
    """Controlador principal que coordina los escaneos."""
    
    def __init__(self, incremental=False):
        self.root_dir = get_project_root()
        self.incremental = incremental
        self.root = tk.Tk()
        self.app = AuditApp(self.root, self.start_scan)
        self.root.title(f"Auditor de Infraestructura TI {'(Modo Incremental)' if incremental else '(Escaneo Completo)'}")
    
    def start_scan(self):
        """Inicia el escaneo en un hilo separado."""
        threading.Thread(target=self._scan_process, daemon=True).start()
    
    def _scan_process(self, no_ui=False):
        """Ejecuta todos los escáneres."""
        # Obtener lista de archivos a escanear
        files_to_scan = get_files_to_scan(self.root_dir, incremental=self.incremental)
        
        if no_ui:
            print(f"Iniciando escaneo incremental: {self.incremental}")
            if self.incremental:
                print(f"Archivos a escanear: {len(files_to_scan) if files_to_scan else 0}")
        
        # Conteo de líneas
        line_data = count_lines(self.root_dir, file_list=files_to_scan)
        summary = get_summary(line_data)
        
        # Auditorías
        design_data = scan_design_issues(self.root_dir, file_list=files_to_scan)
        security_data = scan_security_issues(self.root_dir, file_list=files_to_scan)
        reliability_data = scan_reliability_issues(self.root_dir, file_list=files_to_scan)
        structure_data = scan_structure_issues(self.root_dir, file_list=files_to_scan)
        
        if no_ui:
            print("\n=== RESUMEN DE AUDITORÍA ===")
            print(f"Total líneas: {summary['total_lines']}")
            print(f"Total archivos: {summary['total_files']}")
            print(f"Violaciones diseño: {len(design_data)}")
            print(f"Vulnerabilidades seguridad: {len(security_data)}")
            print(f"Problemas fiabilidad: {len(reliability_data)}")
            print(f"Problemas estructura: {len(structure_data)}")
            print("============================\n")
            # Salir del mainloop si existe
            if hasattr(self, 'root'):
                self.root.quit()
            return

        # Actualizar UI en hilo principal
        self.root.after(0, lambda: self.app.update_data(
            line_data, design_data, security_data, reliability_data, structure_data, summary
        ))
    
    def run(self, no_ui=False):
        """Ejecuta la aplicación."""
        if no_ui:
            self._scan_process(no_ui=True)
            return
            
        # Escaneo inicial
        self.start_scan()
        self.root.mainloop()

def main():
    """Función principal."""
    parser = argparse.ArgumentParser(description="Herramienta de Auditoría de Infraestructura")
    parser.add_argument("--incremental", action="store_true", help="Escanear solo archivos modificados en Git")
    parser.add_argument("--full", action="store_false", dest="incremental", help="Escanear todo el proyecto (por defecto)")
    parser.add_argument("--no-ui", action="store_true", help="Ejecutar en consola sin interfaz gráfica")
    
    args = parser.parse_args()
    
    try:
        # Solo inicializar Tkinter si no es modo no-ui
        if args.no_ui:
            controller = AuditController(incremental=args.incremental)
            # Monkeypatch para evitar error de tk.Tk() si es posible, 
            # pero AuditController lo hace en __init__.
            # Ajustamos el init para que sea opcional.
            controller.run(no_ui=True)
        else:
            controller = AuditController(incremental=args.incremental)
            controller.run()
    except KeyboardInterrupt:
        print("\nAplicación cerrada por el usuario.")
    except Exception as e:
        print(f"Error fatal: {e}")

if __name__ == "__main__":
    main()
