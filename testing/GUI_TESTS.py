
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import subprocess
import threading
import os
import sys
from datetime import datetime

class TestRunnerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 Gestor TI - Suite de Pruebas")
        self.root.geometry("900x700")
        self.root.configure(bg="#1a1a1a")
        
        # Estilos
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Colores
        self.bg_color = "#1a1a1a"
        self.accent_color = "#3b82f6"
        self.success_color = "#10b981"
        self.error_color = "#ef4444"
        self.text_color = "#f3f4f6"
        
        self.setup_ui()
        
    def setup_ui(self):
        # Header
        header_frame = tk.Frame(self.root, bg="#111827", height=80)
        header_frame.pack(fill=tk.X)
        header_frame.pack_propagate(False)
        
        tk.Label(
            header_frame, 
            text="LABORATORIO DE PRUEBAS", 
            font=("Segoe UI", 18, "bold"), 
            bg="#111827", 
            fg=self.accent_color
        ).pack(pady=20)

        # Main Layout
        main_frame = tk.Frame(self.root, bg=self.bg_color, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Control Panel
        controls = tk.Frame(main_frame, bg=self.bg_color)
        controls.pack(fill=tk.X, pady=(0, 20))

        self.btn_all = tk.Button(
            controls, text="Correr Toda la Suite", 
            command=self.run_all_tests,
            bg=self.accent_color, fg="white", 
            font=("Segoe UI", 10, "bold"),
            padx=20, pady=10, relief=tk.FLAT,
            cursor="hand2"
        )
        self.btn_all.pack(side=tk.LEFT, padx=5)

        self.btn_critical = tk.Button(
            controls, text="Solo Críticos", 
            command=self.run_critical_tests,
            bg="#4b5563", fg="white", 
            font=("Segoe UI", 10, "bold"),
            padx=20, pady=10, relief=tk.FLAT,
            cursor="hand2"
        )
        self.btn_critical.pack(side=tk.LEFT, padx=5)

        self.btn_clear = tk.Button(
            controls, text="Limpiar Consola", 
            command=self.clear_log,
            bg="#1f2937", fg="#9ca3af", 
            font=("Segoe UI", 10),
            padx=20, pady=10, relief=tk.FLAT,
            cursor="hand2"
        )
        self.btn_clear.pack(side=tk.RIGHT, padx=5)

        # Status Bar
        self.status_var = tk.StringVar(value="Listo para iniciar")
        status_bar = tk.Label(
            main_frame, textvariable=self.status_var, 
            bg="#262626", fg="#9ca3af", 
            font=("Consolas", 9), anchor=tk.W,
            padx=10, pady=5
        )
        status_bar.pack(fill=tk.X, pady=(0, 10))

        # Log Area
        self.log_area = scrolledtext.ScrolledText(
            main_frame, 
            bg="#0f172a", fg="#e2e8f0", 
            insertbackground="white",
            font=("Consolas", 10),
            padx=10, pady=10,
            borderwidth=0
        )
        self.log_area.pack(fill=tk.BOTH, expand=True)
        
        # Tags for coloring
        self.log_area.tag_config("passed", foreground=self.success_color)
        self.log_area.tag_config("failed", foreground=self.error_color)
        self.log_area.tag_config("info", foreground=self.accent_color)
        self.log_area.tag_config("header", font=("Consolas", 11, "bold"))

    def log(self, message, tag=None):
        self.log_area.insert(tk.END, message + "\n", tag)
        self.log_area.see(tk.END)

    def clear_log(self):
        self.log_area.delete(1.0, tk.END)

    def run_command(self, cmd_list):
        def worker():
            self.btn_all.config(state=tk.DISABLED)
            self.btn_critical.config(state=tk.DISABLED)
            self.status_var.set("Ejecutando pruebas... por favor espere")
            self.clear_log()
            
            start_time = datetime.now()
            self.log(f"Iniciando ejecución: {start_time.strftime('%H:%M:%S')}", "header")
            self.log("-" * 60)

            # Preparar entorno
            env = os.environ.copy()
            env["PYTHONPATH"] = "backend_v2"
            
            try:
                process = subprocess.Popen(
                    cmd_list,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    env=env,
                    shell=True
                )

                for line in process.stdout:
                    clean_line = line.strip()
                    if "PASSED" in clean_line:
                        self.log(line, "passed")
                    elif "FAILED" in clean_line:
                        self.log(line, "failed")
                    elif "SKIPPED" in clean_line:
                        self.log(line, "info")
                    else:
                        self.log(line)
                
                process.wait()
                
                end_time = datetime.now()
                duration = end_time - start_time
                self.log("-" * 60)
                self.log(f"Terminado en {duration.total_seconds():.1f}s", "header")
                
                if process.returncode == 0:
                    self.status_var.set("✅ ÉXITO: Todas las pruebas pasaron")
                    messagebox.showinfo("Pruebas Completadas", "La suite ha finalizado con ÉXITO.")
                else:
                    self.status_var.set("❌ FALLO: Se detectaron errores")
                    messagebox.showwarning("Pruebas Fallidas", "Se han detectado fallos en la suite.")

            except Exception as e:
                self.log(f"ERROR: {str(e)}", "failed")
                self.status_var.set("Error de ejecución")
            
            finally:
                self.btn_all.config(state=tk.NORMAL)
                self.btn_critical.config(state=tk.NORMAL)

        threading.Thread(target=worker, daemon=True).start()

    def run_all_tests(self):
        self.run_command("pytest testing/backend -v")

    def run_critical_tests(self):
        self.run_command("pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v")

if __name__ == "__main__":
    root = tk.Tk()
    app = TestRunnerGUI(root)
    root.mainloop()
