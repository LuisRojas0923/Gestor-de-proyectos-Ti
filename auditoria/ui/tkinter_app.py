"""
Interfaz gráfica Tkinter para la herramienta de auditoría.
"""
import tkinter as tk
from tkinter import ttk, messagebox

try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False

class AuditApp:
    """Aplicación principal de auditoría con interfaz Tkinter."""
    
    def __init__(self, root, scan_callback):
        self.root = root
        self.root.title("Auditoría de Código - Control de tamaño de proyectos")
        self.root.geometry("1200x800")
        self.scan_callback = scan_callback
        
        # Configurar estilo
        style = ttk.Style()
        style.theme_use('clam')
        
        # Datos
        self.line_data = []
        self.design_data = []
        self.security_data = []
        self.reliability_data = []
        self.structure_data = []
        
        self.setup_ui()
    
    def setup_ui(self):
        """Configura la interfaz de usuario."""
        # Panel superior
        top = tk.Frame(self.root, bg="#f0f0f0", pady=10)
        top.pack(fill=tk.X)
        
        self.lbl_lines = tk.Label(top, text="Total Líneas: 0", font=("Arial", 16, "bold"), bg="#f0f0f0", fg="#0056b3")
        self.lbl_lines.pack(side=tk.LEFT, padx=20)
        
        self.lbl_files = tk.Label(top, text="Archivos: 0", font=("Arial", 12), bg="#f0f0f0", fg="#666")
        self.lbl_files.pack(side=tk.LEFT, padx=20)
        
        self.lbl_info = tk.Label(top, text="📁 Escaneando proyecto...", font=("Arial", 10), bg="#f0f0f0", fg="#888")
        self.lbl_info.pack(side=tk.LEFT, padx=20)
        
        # Botones
        btn_frame = tk.Frame(top, bg="#f0f0f0")
        btn_frame.pack(side=tk.RIGHT, padx=10)
        
        ttk.Button(btn_frame, text="📋 Copiar Todo", command=self.copy_all).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="🔄 Recalcular", command=self.refresh).pack(side=tk.LEFT, padx=5)
        
        # Notebook (pestañas)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Configurar pestañas
        self._setup_lines_tab()
        self._setup_design_tab()
        self._setup_security_tab()
        self._setup_reliability_tab()
        self._setup_structure_tab()
        
        # Leyenda
        self._setup_legend()
        
        # Barra de estado
        self.status = tk.StringVar(value="Listo" if HAS_PYPERCLIP else "💡 Instala pyperclip para mejor copiado")
        tk.Label(self.root, textvariable=self.status, bd=1, relief=tk.SUNKEN, anchor=tk.W).pack(side=tk.BOTTOM, fill=tk.X)
    
    def _create_tree(self, parent, columns, widths):
        """Crea un Treeview con scrollbar."""
        frame = tk.Frame(parent)
        frame.pack(fill=tk.BOTH, expand=True)
        
        scroll = ttk.Scrollbar(frame)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        tree = ttk.Treeview(frame, columns=columns, show="headings", yscrollcommand=scroll.set)
        
        for col, width in zip(columns, widths):
            tree.heading(col, text=col.capitalize())
            tree.column(col, width=width, anchor=tk.CENTER if width < 100 else tk.W)
        
        # Tags para colores
        tree.tag_configure("small", background="#dfffff")
        tree.tag_configure("medium", background="#fff4e6")
        tree.tag_configure("large", background="#ffe6e6")
        tree.tag_configure("critical", background="#ffcccc", foreground="#990000")
        tree.tag_configure("important", background="#fff4e6", foreground="#995c00")
        tree.tag_configure("minor", background="#e6f3ff", foreground="#004d99")
        tree.tag_configure("legacy", background="#f0f0f0")
        
        tree.pack(fill=tk.BOTH, expand=True)
        scroll.config(command=tree.yview)
        
        return tree
    
    def _setup_lines_tab(self):
        tab = tk.Frame(self.notebook)
        self.notebook.add(tab, text="📊 Conteo de Líneas")
        cols = ("lines", "imports", "complexity", "comments", "module", "filename", "extension", "path")
        widths = (70, 70, 70, 80, 90, 150, 70, 300)
        self.tree_lines = self._create_tree(tab, cols, widths)
    
    def _setup_design_tab(self):
        tab = tk.Frame(self.notebook)
        self.notebook.add(tab, text="🎨 Auditoría de Diseño")
        cols = ("severity", "file", "line", "element", "suggestion", "path")
        widths = (80, 150, 60, 150, 250, 400)
        self.tree_design = self._create_tree(tab, cols, widths)
    
    def _setup_security_tab(self):
        tab = tk.Frame(self.notebook)
        self.notebook.add(tab, text="🛡️ Seguridad")
        cols = ("severity", "file", "line", "element", "suggestion", "path")
        widths = (80, 150, 60, 150, 300, 300)
        self.tree_security = self._create_tree(tab, cols, widths)
    
    def _setup_reliability_tab(self):
        tab = tk.Frame(self.notebook)
        self.notebook.add(tab, text="⚠️ Fiabilidad")
        cols = ("severity", "file", "line", "element", "suggestion", "path")
        widths = (80, 150, 60, 150, 300, 300)
        self.tree_reliability = self._create_tree(tab, cols, widths)
    
    def _setup_structure_tab(self):
        tab = tk.Frame(self.notebook)
        self.notebook.add(tab, text="🏗️ Estructura")
        cols = ("severity", "file", "line", "element", "suggestion", "path")
        widths = (80, 150, 60, 150, 300, 300)
        self.tree_structure = self._create_tree(tab, cols, widths)
    
    def _setup_legend(self):
        legend = tk.Frame(self.root, bg="#f9f9f9", pady=5)
        legend.pack(fill=tk.X, padx=10, pady=(0, 5))
        
        tk.Label(legend, text="Conteo:", font=("Arial", 9, "bold"), bg="#f9f9f9").pack(side=tk.LEFT, padx=5)
        for color, label in [("#dfffff", "<500"), ("#fff4e6", "500-1000"), ("#ffe6e6", ">1000")]:
            tk.Frame(legend, bg=color, width=15, height=12, relief=tk.SOLID, bd=1).pack(side=tk.LEFT, padx=2)
            tk.Label(legend, text=label, font=("Arial", 8), bg="#f9f9f9").pack(side=tk.LEFT, padx=2)
        
        tk.Label(legend, text=" | Auditoría:", font=("Arial", 9, "bold"), bg="#f9f9f9").pack(side=tk.LEFT, padx=10)
        for color, label in [("#ffcccc", "Crítico"), ("#fff4e6", "Importante"), ("#e6f3ff", "Leve")]:
            tk.Frame(legend, bg=color, width=15, height=12, relief=tk.SOLID, bd=1).pack(side=tk.LEFT, padx=2)
            tk.Label(legend, text=label, font=("Arial", 8), bg="#f9f9f9").pack(side=tk.LEFT, padx=2)
    
    def refresh(self):
        """Ejecuta nuevo escaneo."""
        self.status.set("Escaneando proyecto...")
        self.scan_callback()
    
    def update_data(self, lines, design, security, reliability, structure, summary):
        """Actualiza todos los datos en la UI."""
        # Limpiar árboles
        for tree in [self.tree_lines, self.tree_design, self.tree_security, self.tree_reliability, self.tree_structure]:
            for item in tree.get_children():
                tree.delete(item)
        
        # Líneas
        for item in lines:
            values = (item['lines'], item['imports'], item['complexity'], item['comments'],
                     item['module'], item['filename'], item['extension'], item['path'])
            self.tree_lines.insert("", tk.END, values=values, tags=(item['size_tag'],))
        
        # Diseño
        for item in design:
            values = (item['severity'], item['file'], item['line'], item['element'], item['suggestion'], item['path'])
            self.tree_design.insert("", tk.END, values=values, tags=(item['tag'],))
        
        # Seguridad
        for item in security:
            values = (item['severity'], item['file'], item['line'], item['element'], item['suggestion'], item['path'])
            self.tree_security.insert("", tk.END, values=values, tags=(item['tag'],))
        
        # Fiabilidad
        for item in reliability:
            values = (item['severity'], item['file'], item['line'], item['element'], item['suggestion'], item['path'])
            self.tree_reliability.insert("", tk.END, values=values, tags=(item['tag'],))
        
        # Estructura
        for item in structure:
            values = (item['severity'], item['file'], item['line'], item['element'], item['suggestion'], item['path'])
            self.tree_structure.insert("", tk.END, values=values, tags=(item['tag'],))
        
        # Actualizar labels
        self.lbl_lines.config(text=f"Total Líneas: {summary['total_lines']:,}")
        self.lbl_files.config(text=f"Archivos: {summary['total_files']}")
        self.lbl_info.config(text=f"🎨 {len(design)} diseño | 🛡️ {len(security)} seguridad | ⚠️ {len(reliability)} fiabilidad | 🏗️ {len(structure)} estructura")
        self.status.set("Escaneo completado.")
        
        # Imprimir auditoría en consola
        if design:
            print("\n" + "="*80)
            print("🎨 AUDITORÍA DEL SISTEMA DE DISEÑO")
            print("="*80)
            for item in design:
                print(f"[{item['severity']}] {item['file']}:{item['line']} - {item['element']}")
                print(f"      Sugerencia: {item['suggestion']}")
            print("="*80 + "\n")
    
    def copy_all(self):
        """Copia datos de la pestaña activa al portapapeles."""
        idx = self.notebook.index("current")
        trees = [self.tree_lines, self.tree_design, self.tree_security, self.tree_reliability, self.tree_structure]
        tree = trees[idx]
        
        items = tree.get_children()
        if not items:
            messagebox.showinfo("Info", "No hay datos para copiar.")
            return
        
        cols = tree["columns"]
        lines = ["\t".join(cols)]
        for item in items:
            values = tree.item(item, "values")
            lines.append("\t".join(str(v) for v in values))
        
        text = "\n".join(lines)
        try:
            if HAS_PYPERCLIP:
                pyperclip.copy(text)
            else:
                self.root.clipboard_clear()
                self.root.clipboard_append(text)
            self.status.set(f"✅ {len(items)} filas copiadas.")
        except Exception as e:
            messagebox.showerror("Error", str(e))
