import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import os

class DBManagerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Gestor de Base de Datos - Mantenimiento")
        self.root.geometry("500x450")
        self.root.resizable(False, False)
        
        # Estilo
        style = ttk.Style()
        style.configure("TButton", padding=10, font=('Helvetica', 10))
        style.configure("Header.TLabel", font=('Helvetica', 14, 'bold'), padding=20)
        
        # Header
        header = ttk.Label(root, text="DB Maintenance Manager", style="Header.TLabel")
        header.pack()
        
        # Container
        container = ttk.Frame(root, padding=20)
        container.pack(fill=tk.BOTH, expand=True)
        
        # Botones
        self.create_button(container, "1. Pruebas -> Local", "clone_test_to_local.ps1", "#e1f5fe")
        self.create_button(container, "2. Producción -> Local", "clone_prod_to_local.ps1", "#e1f5fe")
        self.create_button(container, "3. Producción -> Pruebas (Gestor)", "clone_prod_to_test.ps1", "#fff3e0")
        self.create_button(container, "4. Producción -> Pruebas (ERP Solid)", "clone_erp_prod_to_test.ps1", "#fff3e0")
        
        # Footer
        footer = ttk.Label(root, text="Nota: Los scripts se abrirán en una ventana de PowerShell aparte.", 
                          font=('Helvetica', 8), foreground="gray", padding=10)
        footer.pack(side=tk.BOTTOM)

    def create_button(self, parent, text, script_name, color):
        btn = tk.Button(parent, text=text, command=lambda: self.run_script(script_name),
                       bg=color, relief=tk.RAISED, pady=10, font=('Helvetica', 10, 'bold'))
        btn.pack(fill=tk.X, pady=5)

    def run_script(self, script_name):
        script_path = os.path.join(os.path.dirname(__file__), script_name)
        if not os.path.exists(script_path):
            messagebox.showerror("Error", f"No se encontró el archivo: {script_name}")
            return
            
        # Comando para abrir en una nueva ventana de PowerShell
        cmd = f'start powershell -NoExit -ExecutionPolicy Bypass -File "{script_path}"'
        
        try:
            subprocess.Popen(cmd, shell=True)
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo ejecutar el script: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = DBManagerGUI(root)
    root.mainloop()
