import os
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import re

try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False
    # Fallback: usar el portapapeles de tkinter (menos confiable pero funciona)

class LineCounterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Contador de Líneas de Código - Control de tamaño de proyectos")
        self.root.geometry("1200x800")
        
        # Configuración de estilos
        style = ttk.Style()
        style.theme_use('clam')
        
        # Carpetas a ignorar (para rendimiento y relevancia)
        self.IGNORE_DIRS = {
            'node_modules', '.git', '__pycache__', 'venv', 'env', 
            '.idea', '.vscode', 'dist', 'build', 'coverage', '.pytest_cache', 'z_backend_obsoleto_backup'
        }
        
        # Extensiones a incluir (si está vacío, intenta leer todos los archivos de texto)
        # Puedes agregar o quitar extensiones según necesites
        self.TARGET_EXTENSIONS = {
            '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', 
            '.java', '.c', '.cpp', '.h', '.sql', '.md', '.json', 
            '.xml', '.yaml', '.yml', '.bat', '.sh', '.env'
        }
        
        # Archivos específicos a excluir (archivos generados automáticamente)
        self.EXCLUDE_FILES = {
            'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
            'composer.lock', 'poetry.lock', 'Pipfile.lock',
            'pyvenv.cfg'  # Archivo de configuración del entorno virtual
        }

        # Patrones para auditoría de diseño
        self.DESIGN_PATTERNS = {
            'Nativo: <button>': re.compile(r'<button\b'),
            'Nativo: <input>': re.compile(r'<input\b'),
            'Nativo: <select>': re.compile(r'<select\b'),
            'Nativo: <textarea>': re.compile(r'<textarea\b'),
            'Nativo: <h1>-<h6>': re.compile(r'<h[1-6]\b'),
            'Nativo: <p>': re.compile(r'<p\b'),
            'Nativo: <span>': re.compile(r'<span\b'),
            'Nativo: <label>': re.compile(r'<label\b'),
            'Nativo: <b> / <i>': re.compile(r'<(b|i)\b'),
            'Estilo Inline': re.compile(r'style=\{\{'),
            'Legacy: MaterialButton': re.compile(r'MaterialButton\b'),
            'Legacy: MaterialTextField': re.compile(r'MaterialTextField\b'),
            'Legacy: MaterialSelect': re.compile(r'MaterialSelect\b'),
            # ISO 25010 - Seguridad
            'Seguridad: Hardcoded Secrets': re.compile(r'(?i)(password|secret|api_key|token|access_key)\s*=\s*["\'][^"\']+["\']'),
            'Seguridad: SQL Injection': re.compile(r'(?i)(execute|query|cursor\.execute)\s*\(\s*f["\'].*\{.+\}.*["\']'),
            'Seguridad: SQL Injection (Concat)': re.compile(r'(?i)(execute|query|cursor\.execute)\s*\(.+\s*\+\s*.+\)'),
            # ISO 25010 - Fiabilidad
            'Fiabilidad: API/DB Sin Control': re.compile(r'(?i)(\.execute\(|fetch\(|axios\.|http\.|request\()'),
            # Sistema de Diseño Ampliado
            'Nativo: <input type="submit">': re.compile(r'<input\b[^>]*type=["\'](submit|button)["\']'),
            'Nativo: class="btn"': re.compile(r'class(Name)?=["\'].*\bbtn\b.*["\']'),
        }
        
        self.audit_data = []
        self.security_data = [] # Seguridad
        self.reliability_data = [] # Fiabilidad
        self.enable_console_audit = True # Auditoría por consola

        self.setup_ui()
        
        # Ejecutar escaneo al iniciar
        self.start_scan()

    def setup_ui(self):
        # --- Panel Superior (Resumen) ---
        top_frame = tk.Frame(self.root, bg="#f0f0f0", pady=10)
        top_frame.pack(fill=tk.X)

        self.lbl_total_lines = tk.Label(
            top_frame, 
            text="Total Líneas: 0", 
            font=("Arial", 16, "bold"), 
            bg="#f0f0f0", 
            fg="#0056b3"
        )
        self.lbl_total_lines.pack(side=tk.LEFT, padx=20)

        self.lbl_total_files = tk.Label(
            top_frame, 
            text="Archivos: 0", 
            font=("Arial", 12), 
            bg="#f0f0f0", 
            fg="#666"
        )
        self.lbl_total_files.pack(side=tk.LEFT, padx=20)
        
        self.lbl_scan_info = tk.Label(
            top_frame, 
            text="📁 Escaneando proyecto completo", 
            font=("Arial", 10), 
            bg="#f0f0f0", 
            fg="#888"
        )
        self.lbl_scan_info.pack(side=tk.LEFT, padx=20)

        # Botones de acción
        btn_frame = tk.Frame(top_frame, bg="#f0f0f0")
        btn_frame.pack(side=tk.RIGHT, padx=10)
        
        btn_copy_all = ttk.Button(btn_frame, text="📋 Copiar Todo", command=self.copy_all)
        btn_copy_all.pack(side=tk.LEFT, padx=5)
        
        btn_copy_selected = ttk.Button(btn_frame, text="📄 Copiar Selección", command=self.copy_selected)
        btn_copy_selected.pack(side=tk.LEFT, padx=5)
        
        btn_refresh = ttk.Button(btn_frame, text="🔄 Recalcular", command=self.start_scan)
        btn_refresh.pack(side=tk.LEFT, padx=5)

        # --- Notebook (Pestañas) ---
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # --- Pestaña 1: Contador de Líneas ---
        line_tab = tk.Frame(self.notebook)
        self.notebook.add(line_tab, text="📊 Conteo de Líneas")

        # Tabla de líneas
        tree_frame = tk.Frame(line_tab)
        tree_frame.pack(fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(tree_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Definir columnas
        columns = ("lines", "imports", "complexity", "comments", "module", "filename", "extension", "path")
        self.tree = ttk.Treeview(
            tree_frame, 
            columns=columns, 
            show="headings", 
            yscrollcommand=scrollbar.set,
            selectmode="extended"
        )
        
        # Configurar tags para formato condicional
        self.tree.tag_configure("small", background="#dfffff")  # Normal (< 500 líneas) color verde claro
        self.tree.tag_configure("medium", background="#fff4e6")  # 500-1000 líneas (amarillo claro)
        self.tree.tag_configure("large", background="#ffe6e6")   # > 1000 líneas (rojo claro)
        
        # Configurar encabezados
        self.tree.heading("lines", text="Líneas", command=lambda: self.sort_column("lines", False))
        self.tree.heading("imports", text="Imports", command=lambda: self.sort_column("imports", False))
        self.tree.heading("complexity", text="Compl.", command=lambda: self.sort_column("complexity", False))
        self.tree.heading("comments", text="Coment. %", command=lambda: self.sort_column("comments", False))
        self.tree.heading("module", text="Módulo", command=lambda: self.sort_column("module", False))
        self.tree.heading("filename", text="Archivo", command=lambda: self.sort_column("filename", False))
        self.tree.heading("extension", text="Extensión", command=lambda: self.sort_column("extension", False))
        self.tree.heading("path", text="Ruta Relativa", command=lambda: self.sort_column("path", False))

        # Configurar anchos
        self.tree.column("lines", width=70, anchor=tk.CENTER)
        self.tree.column("imports", width=70, anchor=tk.CENTER)
        self.tree.column("complexity", width=70, anchor=tk.CENTER)
        self.tree.column("comments", width=80, anchor=tk.CENTER)
        self.tree.column("module", width=90, anchor=tk.CENTER)
        self.tree.column("filename", width=150)
        self.tree.column("extension", width=70, anchor=tk.CENTER)
        self.tree.column("path", width=300)

        self.tree.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.tree.yview)
        
        # --- Pestaña 2: Auditoría de Diseño ---
        audit_tab = tk.Frame(self.notebook)
        self.notebook.add(audit_tab, text="🔍 Auditoría de Diseño")

        audit_tree_frame = tk.Frame(audit_tab)
        audit_tree_frame.pack(fill=tk.BOTH, expand=True)

        audit_scrollbar = ttk.Scrollbar(audit_tree_frame)
        audit_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        audit_columns = ("severity", "file", "line", "element", "suggestion", "path")
        self.audit_tree = ttk.Treeview(
            audit_tree_frame,
            columns=audit_columns,
            show="headings",
            yscrollcommand=audit_scrollbar.set
        )

        self.audit_tree.heading("severity", text="Gravedad", command=lambda: self.sort_audit_column("severity", False, 'audit'))
        self.audit_tree.heading("file", text="Archivo", command=lambda: self.sort_audit_column("file", False, 'audit'))
        self.audit_tree.heading("line", text="Línea", command=lambda: self.sort_audit_column("line", False, 'audit'))
        self.audit_tree.heading("element", text="Elemento", command=lambda: self.sort_audit_column("element", False, 'audit'))
        self.audit_tree.heading("suggestion", text="Sugerencia", command=lambda: self.sort_audit_column("suggestion", False, 'audit'))
        self.audit_tree.heading("path", text="Ruta", command=lambda: self.sort_audit_column("path", False, 'audit'))

        self.audit_tree.column("severity", width=80, anchor=tk.CENTER)
        self.audit_tree.column("file", width=150)
        self.audit_tree.column("line", width=60, anchor=tk.CENTER)
        self.audit_tree.column("element", width=150)
        self.audit_tree.column("suggestion", width=250)
        self.audit_tree.column("path", width=400)

        self.audit_tree.tag_configure("critical", background="#ffcccc", foreground="#990000") # Rojo fuerte
        self.audit_tree.tag_configure("important", background="#fff4e6", foreground="#995c00") # Naranja
        self.audit_tree.tag_configure("minor", background="#e6f3ff", foreground="#004d99")    # Azul claro
        self.audit_tree.tag_configure("legacy", background="#f0f0f0") 

        self.audit_tree.pack(fill=tk.BOTH, expand=True)
        audit_scrollbar.config(command=self.audit_tree.yview)

        # --- Pestaña 3: Seguridad (ISO 25010) ---
        security_tab = tk.Frame(self.notebook)
        self.notebook.add(security_tab, text="🛡️ Seguridad")
        
        sec_tree_frame = tk.Frame(security_tab)
        sec_tree_frame.pack(fill=tk.BOTH, expand=True)
        sec_scroll = ttk.Scrollbar(sec_tree_frame)
        sec_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.security_tree = ttk.Treeview(sec_tree_frame, columns=audit_columns, show="headings", yscrollcommand=sec_scroll.set)
        for col in audit_columns:
            self.security_tree.heading(col, text=col.capitalize(), command=lambda c=col: self.sort_audit_column(c, False, 'security'))
            self.security_tree.column(col, width=100)
        
        self.security_tree.column("severity", width=80, anchor=tk.CENTER)
        self.security_tree.column("file", width=150)
        self.security_tree.column("suggestion", width=300)
        self.security_tree.column("path", width=300)
        
        self.security_tree.tag_configure("critical", background="#ffcccc", foreground="#990000")
        self.security_tree.pack(fill=tk.BOTH, expand=True)
        sec_scroll.config(command=self.security_tree.yview)

        # --- Pestaña 4: Fiabilidad (ISO 25010) ---
        liability_tab = tk.Frame(self.notebook)
        self.notebook.add(liability_tab, text="⚠️ Fiabilidad")
        
        rel_tree_frame = tk.Frame(liability_tab)
        rel_tree_frame.pack(fill=tk.BOTH, expand=True)
        rel_scroll = ttk.Scrollbar(rel_tree_frame)
        rel_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.reliability_tree = ttk.Treeview(rel_tree_frame, columns=audit_columns, show="headings", yscrollcommand=rel_scroll.set)
        for col in audit_columns:
            self.reliability_tree.heading(col, text=col.capitalize(), command=lambda c=col: self.sort_audit_column(c, False, 'reliability'))
        
        self.reliability_tree.tag_configure("important", background="#fff4e6", foreground="#995c00")
        self.reliability_tree.pack(fill=tk.BOTH, expand=True)
        rel_scroll.config(command=self.reliability_tree.yview)

        # --- Leyenda de Colores (Formato Condicional) ---
        legend_frame = tk.Frame(self.root, bg="#f9f9f9", pady=5)
        legend_frame.pack(fill=tk.X, padx=10, pady=(0, 5))
        
        tk.Label(legend_frame, text="Leyenda Conteo:", font=("Arial", 9, "bold"), bg="#f9f9f9").pack(side=tk.LEFT, padx=5)
        
        # Normal
        normal_box = tk.Frame(legend_frame, bg="#ffffff", width=20, height=15, relief=tk.SOLID, borderwidth=1)
        normal_box.pack(side=tk.LEFT, padx=5)
        tk.Label(legend_frame, text="< 500", font=("Arial", 8), bg="#f9f9f9").pack(side=tk.LEFT, padx=2)
        
        # Medio
        medium_box = tk.Frame(legend_frame, bg="#fff4e6", width=20, height=15, relief=tk.SOLID, borderwidth=1)
        medium_box.pack(side=tk.LEFT, padx=5)
        tk.Label(legend_frame, text="500-1000", font=("Arial", 8), bg="#f9f9f9").pack(side=tk.LEFT, padx=2)
        
        # Grande
        large_box = tk.Frame(legend_frame, bg="#ffe6e6", width=20, height=15, relief=tk.SOLID, borderwidth=1)
        large_box.pack(side=tk.LEFT, padx=5)
        tk.Label(legend_frame, text="> 1000", font=("Arial", 8), bg="#f9f9f9").pack(side=tk.LEFT, padx=2)

        tk.Label(legend_frame, text=" | Auditoría:", font=("Arial", 9, "bold"), bg="#f9f9f9").pack(side=tk.LEFT, padx=10)
        
        crit_box = tk.Frame(legend_frame, bg="#ffcccc", width=20, height=15, relief=tk.SOLID, borderwidth=1)
        crit_box.pack(side=tk.LEFT, padx=5)
        tk.Label(legend_frame, text="Crítico", font=("Arial", 8), bg="#f9f9f9").pack(side=tk.LEFT, padx=2)

        imp_box = tk.Frame(legend_frame, bg="#fff4e6", width=20, height=15, relief=tk.SOLID, borderwidth=1)
        imp_box.pack(side=tk.LEFT, padx=5)
        tk.Label(legend_frame, text="Importante", font=("Arial", 8), bg="#f9f9f9").pack(side=tk.LEFT, padx=2)

        minor_box = tk.Frame(legend_frame, bg="#e6f3ff", width=20, height=15, relief=tk.SOLID, borderwidth=1)
        minor_box.pack(side=tk.LEFT, padx=5)
        tk.Label(legend_frame, text="Leve", font=("Arial", 8), bg="#f9f9f9").pack(side=tk.LEFT, padx=2)

        # --- Barra de Estado ---
        self.status_var = tk.StringVar()
        if not HAS_PYPERCLIP:
            self.status_var.set("💡 Tip: Instala 'pyperclip' (pip install pyperclip) para mejor funcionalidad de copiar")
        else:
            self.status_var.set("Listo")
        status_bar = tk.Label(self.root, textvariable=self.status_var, bd=1, relief=tk.SUNKEN, anchor=tk.W)
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def start_scan(self):
        self.status_var.set("Escaneando proyecto...")
        # Limpiar tablas
        for tree in [self.tree, self.audit_tree, self.security_tree, self.reliability_tree]:
            for item in tree.get_children():
                tree.delete(item)
        
        self.audit_data = [] # Diseño
        self.security_data = [] # Seguridad
        self.reliability_data = [] # Fiabilidad
        
        # Ejecutar en hilo separado para no congelar la UI
        threading.Thread(target=self.scan_process, daemon=True).start()

    def scan_process(self):
        root_dir = os.getcwd()
        total_lines = 0
        total_files = 0
        file_data = []
        
        # Escanear todo el proyecto desde la raíz, excluyendo venv y otras carpetas innecesarias
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Modificar dirnames in-place para ignorar carpetas
            dirnames[:] = [d for d in dirnames if d not in self.IGNORE_DIRS]
            
            # Obtener el módulo basado en la carpeta
            rel_dir = os.path.relpath(dirpath, root_dir)
            if rel_dir == '.':
                module = 'RAIZ'
            else:
                # Obtener la primera carpeta del path relativo como módulo
                parts = rel_dir.split(os.sep)
                module = parts[0].upper() if parts[0] else 'RAIZ'

            for filename in filenames:
                # Excluir archivos de lock generados automáticamente
                if filename in self.EXCLUDE_FILES:
                    continue
                
                ext = os.path.splitext(filename)[1].lower()
                
                # Filtrar por extensión
                if ext not in self.TARGET_EXTENSIONS and filename not in ['Dockerfile', '.dockerignore']:
                   continue

                full_path = os.path.join(dirpath, filename)
                try:
                    lines_content = []
                    import_count = 0
                    complexity_score = 0
                    comment_lines = 0
                    
                    # Patrones para métricas
                    import_pattern = re.compile(r'^(import\s|from\s)')
                    complexity_pattern = re.compile(r'\b(if|else|elif|map|switch|case|while|for|catch|finally)\b')
                    comment_pattern = re.compile(r'^\s*(//|#|/\*)')

                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for i, line_text in enumerate(f, 1):
                            lines_content.append(line_text)
                            
                            # Contar imports
                            if import_pattern.match(line_text.strip()):
                                import_count += 1
                                
                            # Contar complejidad
                            complexity_score += len(complexity_pattern.findall(line_text))
                            
                            # Contar comentarios
                            if comment_pattern.match(line_text.strip()):
                                comment_lines += 1
                    
                    lines = len(lines_content)
                    if lines == 0: continue
                    
                    comment_ratio = round((comment_lines / lines) * 100, 1)
                    
                    # Auditoría de diseño
                    if ext in ['.tsx', '.jsx']:
                        rel_path = os.path.relpath(full_path, root_dir)
                        path_lower = rel_path.lower().replace('\\', '/')
                        
                        for i, line_text in enumerate(lines_content, 1):
                            for name, pattern in self.DESIGN_PATTERNS.items():
                                if pattern.search(line_text):
                                    # Excepciones: Los átomos DEBEN implementar los tags nativos
                                    if "atoms/" in path_lower:
                                        if "button.tsx" in path_lower and "Nativo: <button>" in name: continue
                                        if "input.tsx" in path_lower and "Nativo: <input>" in name: continue
                                        if "select.tsx" in path_lower and "Nativo: <select>" in name: continue
                                        if "textarea.tsx" in path_lower and "Nativo: <textarea>" in name: continue
                                        if ("checkbox.tsx" in path_lower or "switch.tsx" in path_lower) and "Nativo: <input>" in name: continue

                                    suggestion = "Usar componentes del sistema"
                                    severity = "Leve"
                                    tag = "minor"
                                    
                                    # Clasificación de Gravedad
                                    if "Estilo Inline" in name:
                                        severity = "Importante"
                                        tag = "important"
                                        suggestion = "Evitar deuda técnica visual. Usar clases o tokens de diseño."
                                    elif "atoms/" in path_lower:
                                        severity = "Crítico"
                                        tag = "critical"
                                        suggestion = "¡PROHIBIDO! Los átomos no deben usar tags nativos. Usa otros átomos o CSS puro."
                                    elif "pages/" in path_lower:
                                        severity = "Leve"
                                        tag = "minor"
                                        suggestion = "Deuda técnica. Considerar abstraer a componentes/moléculas."
                                    elif "Legacy" in name:
                                        severity = "Importante"
                                        tag = "legacy"
                                        suggestion = "Migrar componente legacy a Átomo moderno"
                                    # ISO 25010
                                    elif "Seguridad:" in name:
                                        severity = "Crítico"
                                        tag = "critical"
                                        if "Hardcoded" in name:
                                            suggestion = "¡RIESGO DE SEGURIDAD! Usar variables de entorno (.env)."
                                        else:
                                            suggestion = "Posible SQL Injection. Usar consultas parametrizadas."
                                    elif "Fiabilidad:" in name:
                                        # Heurística simple: Si no hay 'try' cerca, es sospechoso.
                                        # Como este escáner es línea por línea, solo advertimos para revisión manual.
                                        severity = "Importante"
                                        tag = "important"
                                        suggestion = "Verificar manejo de errores (bloques try/catch o .catch)."
                                    elif "Nativo:" in name and "btn" in name: # Captura botones nativos o clases btn
                                         severity = "Crítico" if "atoms/" in path_lower else "Leve"
                                         tag = "critical" if "atoms/" in path_lower else "minor"
                                         suggestion = "Usar <Button /> (Átomo)."

                                    # Refinar sugerencias por tipo
                                    if severity != "Importante" and "Legacy" not in name:
                                        if "button" in name.lower(): suggestion = "Usar <Button /> (Átomo)"
                                        elif "input" in name.lower(): suggestion = "Usar <Input /> (Átomo)"
                                        elif "select" in name.lower(): suggestion = "Usar <Select /> (Átomo)"
                                        elif "textarea" in name.lower(): suggestion = "Usar <Textarea /> (Átomo)"
                                        elif "<h1>-<h6>" in name: suggestion = "Usar <Title /> o <Subtitle /> (Átomo)"
                                        elif name in ["Nativo: <p>", "Nativo: <span>", "Nativo: <label>"]: suggestion = "Usar <Text /> (Átomo)"
                                        elif "<b> / <i>" in name: suggestion = "Usar <Text weight='bold' /> o similar"

                                    issue_data = {
                                        'values': (severity, filename, i, name, suggestion, rel_path),
                                        'tag': tag,
                                        'severity_rank': 1 if severity == "Crítico" else 2 if severity == "Importante" else 3
                                    }

                                    if "Seguridad:" in name:
                                        self.security_data.append(issue_data)
                                    elif "Fiabilidad:" in name:
                                        self.reliability_data.append(issue_data)
                                    else:
                                        self.audit_data.append(issue_data)
                        
                    # Ruta relativa desde la raíz del proyecto
                    rel_path = os.path.relpath(full_path, root_dir)
                    file_data.append((lines, import_count, complexity_score, f"{comment_ratio}%", module, filename, ext, rel_path))
                    total_lines += lines
                    total_files += 1
                except Exception as e:
                    # Archivos binarios o sin permisos se ignoran silenciosamente
                    pass

        # Ordenar por líneas descendente por defecto
        file_data.sort(key=lambda x: x[0], reverse=True)

        # Actualizar UI en el hilo principal
        self.root.after(0, lambda: self.update_ui(file_data, total_lines, total_files))

    def update_ui(self, file_data, total_lines, total_files):
        for item in file_data:
            lines = item[0]
            # Determinar tag según número de líneas (formato condicional)
            if lines > 1000:
                tag = "large"
            elif lines > 500:
                tag = "medium"
            else:
                tag = "small"
            
            self.tree.insert("", tk.END, values=item, tags=(tag,))
        
        self.lbl_total_lines.config(text=f"Total Líneas: {total_lines:,}")
        self.lbl_total_files.config(text=f"Archivos: {total_files}")
        
        # Insertar datos de auditoría
        # Insertar datos de Auditoría de Diseño
        for audit in self.audit_data:
            self.audit_tree.insert("", tk.END, values=audit['values'], tags=(audit['tag'],))

        # Insertar datos de Seguridad
        for item in self.security_data:
            self.security_tree.insert("", tk.END, values=item['values'], tags=(item['tag'],))

        # Insertar datos de Fiabilidad
        for item in self.reliability_data:
            self.reliability_tree.insert("", tk.END, values=item['values'], tags=(item['tag'],))
            
        # Imprimir auditoría en consola si está habilitado
        if self.enable_console_audit and self.audit_data:
            print("\n" + "="*80)
            print("🎨 AUDITORÍA DEL SISTEMA DE DISEÑO")
            print("="*80)
            for audit in self.audit_data:
                severity, filename, line, element, suggestion, _ = audit['values']
                print(f"[{severity}] {filename}:{line} - {element}")
                print(f"      Sugerencia: {suggestion}")
            print("="*80 + "\n")
        # Contar problemas de diseño
        # Contar problemas
        design_issues = len(self.audit_data)
        sec_issues = len(self.security_data)
        rel_issues = len(self.reliability_data)
        
        self.lbl_scan_info.config(text=f"📁 {total_files} archivos | 🎨 {design_issues} diseño | 🛡️ {sec_issues} seguridad | ⚠️ {rel_issues} fiabilidad")
        
        # Contar archivos grandes
        large_files = sum(1 for item in file_data if item[0] > 500)
        high_imports = sum(1 for item in file_data if item[1] > 15)
        high_complexity = sum(1 for item in file_data if item[2] > 30)
        
        status_msg = f"Escaneo completado. {total_files} archivos analizados."
        alerts = []
        if large_files > 0: alerts.append(f"⚠️ {large_files} > 500 líneas")
        if high_imports > 0: alerts.append(f"📦 {high_imports} > 15 imports")
        if high_complexity > 0: alerts.append(f"🧩 {high_complexity} complejidad alta")
        
        if alerts:
            status_msg += " " + " | ".join(alerts)
            
        self.status_var.set(status_msg)
    
    def copy_to_clipboard(self, text):
        """Copia texto al portapapeles"""
        try:
            if HAS_PYPERCLIP:
                pyperclip.copy(text)
            else:
                # Fallback usando tkinter
                self.root.clipboard_clear()
                self.root.clipboard_append(text)
                self.root.update()
            return True
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo copiar al portapapeles: {str(e)}")
            return False
    
    def copy_all(self):
        """Copia toda la tabla de la pestaña activa al portapapeles"""
        current_tab = self.notebook.index("current")
        
        if current_tab == 0:  # Pestaña de Líneas
            tree = self.tree
            headers = ["Líneas", "Imports", "Compl.", "Coment. %", "Módulo", "Archivo", "Extensión", "Ruta Relativa"]
        elif current_tab == 1: # Auditoría Diseño
            tree = self.audit_tree
            headers = ["Gravedad", "Archivo", "Línea", "Elemento", "Sugerencia", "Ruta"]
        elif current_tab == 2: # Seguridad
            tree = self.security_tree
            headers = ["Gravedad", "Archivo", "Línea", "Elemento", "Sugerencia", "Ruta"]
        else: # Fiabilidad
            tree = self.reliability_tree
            headers = ["Gravedad", "Archivo", "Línea", "Elemento", "Sugerencia", "Ruta"]

        items = tree.get_children()
        if not items:
            messagebox.showinfo("Info", "No hay datos para copiar.")
            return
        
        lines = ["\t".join(headers)]
        
        for item in items:
            values = tree.item(item, "values")
            lines.append("\t".join(str(v) for v in values))
        
        text = "\n".join(lines)
        if self.copy_to_clipboard(text):
            self.status_var.set(f"✅ {len(items)} filas copiadas al portapapeles ({'Líneas' if current_tab == 0 else 'Auditoría'}).")
    
    def copy_selected(self):
        """Copia las filas seleccionadas de la pestaña activa al portapapeles"""
        current_tab = self.notebook.index("current")
        
        if current_tab == 0:  # Pestaña de Líneas
            tree = self.tree
            headers = ["Líneas", "Imports", "Compl.", "Coment. %", "Módulo", "Archivo", "Extensión", "Ruta Relativa"]
        elif current_tab == 1: # Auditoría Diseño
            tree = self.audit_tree
            headers = ["Gravedad", "Archivo", "Línea", "Elemento", "Sugerencia", "Ruta"]
        elif current_tab == 2: # Seguridad
            tree = self.security_tree
            headers = ["Gravedad", "Archivo", "Línea", "Elemento", "Sugerencia", "Ruta"]
        else: # Fiabilidad
            tree = self.reliability_tree
            headers = ["Gravedad", "Archivo", "Línea", "Elemento", "Sugerencia", "Ruta"]

        selected = tree.selection()
        if not selected:
            messagebox.showinfo("Info", "Por favor selecciona al menos una fila en la pestaña activa.")
            return
        
        lines = ["\t".join(headers)]
        
        for item in selected:
            values = tree.item(item, "values")
            lines.append("\t".join(str(v) for v in values))
        
        text = "\n".join(lines)
        if self.copy_to_clipboard(text):
            self.status_var.set(f"✅ {len(selected)} fila(s) copiada(s) al portapapeles ({'Líneas' if current_tab == 0 else 'Auditoría'}).")

    def sort_column(self, col, reverse):
        l = [(self.tree.set(k, col), k) for k in self.tree.get_children('')]
        
        # Intentar convertir a número si es una columna numérica
        if col in ["lines", "imports", "complexity"]:
            l.sort(key=lambda t: int(t[0].replace(',', '')), reverse=reverse)
        elif col == "comments":
            l.sort(key=lambda t: float(t[0].replace('%', '')), reverse=reverse)
        else:
            l.sort(reverse=reverse)

        # Reordenar items
        for index, (val, k) in enumerate(l):
            self.tree.move(k, '', index)

        # Invertir orden para el próximo click
        self.tree.heading(col, command=lambda: self.sort_column(col, not reverse))

    def sort_audit_column(self, col, reverse, tree_type='audit'):
        """Ordenado específico para tablas de auditoría"""
        if tree_type == 'security':
            tree = self.security_tree
            data_source = self.security_data
        elif tree_type == 'reliability':
            tree = self.reliability_tree
            data_source = self.reliability_data
        else:
            tree = self.audit_tree
            data_source = self.audit_data

        # Obtener datos incluyendo el rank de gravedad si existe
        l = []
        for k in tree.get_children(''):
            val = tree.set(k, col)
            
            # Buscar el item original para obtener el ranking de gravedad
            rank = 999
            if col == "severity":
                # Intentar encontrar coincidencia por los valores de la fila
                row_vals = tree.item(k, "values")
                for item in data_source:
                    if item['values'] == tuple(row_vals):
                        rank = item.get('severity_rank', 999)
                        break
            
            l.append((rank if col == "severity" else val, k))

        # Intentar convertir a número si es la columna de línea
        if col == "line":
            l.sort(key=lambda t: int(str(t[0])), reverse=reverse)
        else:
            l.sort(reverse=reverse)

        for index, (val, k) in enumerate(l):
            tree.move(k, '', index)

        tree.heading(col, command=lambda: self.sort_audit_column(col, not reverse, tree_type))

if __name__ == "__main__":
    try:
        root = tk.Tk()
        app = LineCounterApp(root)
        root.mainloop()
    except KeyboardInterrupt:
        print("\nAplicación cerrada por el usuario.")

