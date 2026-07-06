import os
import re

DIR = r"c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\frontend\src\pages\ServicePortal\pages\NOVEDADES_NOMINA"

# Excluir NominaPreviewView y ExcepcionesPreview
EXCLUDE = ["NominaPreviewView.tsx", "ExcepcionesPreview.tsx", "ControlDescuentosPreview.tsx"]

IMPORTS_TO_ADD = """
import ContextMenuExcepcion from './components/ContextMenuExcepcion';
import ModalVincularExcepcion from './components/ModalVincularExcepcion';
"""

def extract_subcategoria(content):
    # Buscar historial?subcategoria=X
    match = re.search(r'subcategoria=([A-Z0-9_]+)', content)
    if match:
        return match.group(1)
    return "DESCONOCIDO"

def inject_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "ContextMenuExcepcion" in content:
        print(f"Skipping {os.path.basename(filepath)}, ya tiene menú contextual.")
        return

    subcategoria = extract_subcategoria(content)

    # 1. Inject imports
    content = re.sub(r"(import React.*?\n)", r"\1" + IMPORTS_TO_ADD, content, count=1)

    # 2. Inject state and handlers right after addNotification line
    STATE_CODE = f"""
    // --- Estado para menú contextual y modal de excepciones ---
    const [ctxMenu, setCtxMenu] = useState<{{ x: number; y: number; record: any }} | null>(null);
    const [modalRegistro, setModalRegistro] = useState<any | null>(null);

    const handleContextMenu = (e: React.MouseEvent, record: any) => {{
        e.preventDefault();
        setCtxMenu({{ x: e.clientX, y: e.clientY, record }});
    }};

    const handleVinculado = (registroId: number | string, _excepcionId: number) => {{
        if (!data) return;
        const [cedula, concepto] = String(registroId).split('-');
        setData({{
            ...data,
            rows: data.rows.map(r => 
                (r.cedula === cedula && r.concepto === concepto)
                    ? {{ ...r, estado_erp: 'EXCEPTUADO' }} 
                    : r
            )
        }});
        addNotification('success', 'Excepción vinculada exitosamente. Actualice la tabla o vuelva a procesar.');
    }};

    const handleDesvincular = async (registroId: number | string) => {{
        if (!data) return;
        const [cedula, concepto] = String(registroId).split('-');
        try {{
            await axios.delete(`${{API_CONFIG.BASE_URL}}/novedades-nomina/excepciones/vincular-dinamico`, {{  # [CONTROLADO]
                data: {{ cedula, concepto, mes, anio, subcategoria: "{subcategoria}" }}
            }});
            setData({{
                ...data,
                rows: data.rows.map(r => 
                    (r.cedula === cedula && r.concepto === concepto)
                        ? {{ ...r, estado_erp: 'OK' }} 
                        : r
                )
            }});
            addNotification('info', 'Excepción removida del registro.');
        }} catch (e) {{
            addNotification('error', 'No se pudo remover la excepción.');
        }}
    }};
"""
    content = re.sub(r"(const { addNotification } = useNotifications\(\);\n)", r"\1" + STATE_CODE, content, count=1)

    # 3. Inject ContextMenu and Modal at the end, just before final </div>
    COMPONENTS_CODE = f"""
            {{/* Menú contextual clic derecho */}}
            <ContextMenuExcepcion
                x={{ctxMenu?.x ?? 0}}
                y={{ctxMenu?.y ?? 0}}
                visible={{!!ctxMenu}}
                tieneExcepcion={{ctxMenu?.record?.estado_erp === 'EXCEPTUADO' || String(ctxMenu?.record?.estado_erp).includes('EXCEPCION')}}
                onVincular={{() => {{ setModalRegistro(ctxMenu?.record); setCtxMenu(null); }}}}
                onDesvincular={{() => {{ if (ctxMenu?.record) handleDesvincular(`${{ctxMenu.record.cedula}}-${{ctxMenu.record.concepto}}`); setCtxMenu(null); }}}}
                onClose={{() => setCtxMenu(null)}}
            />

            {{/* Modal de vinculación dinámica */}}
            <ModalVincularExcepcion
                visible={{!!modalRegistro}}
                registro={{modalRegistro}}
                mes={{mes}}
                anio={{anio}}
                subcategoria="{subcategoria}"
                onClose={{() => setModalRegistro(null)}}
                onVinculado={{handleVinculado}}
            />
        </div>
    );
"""
    content = re.sub(r"</div>\s*\n\s*\);\s*\n\s*};\s*\n", COMPONENTS_CODE + r"};\n", content)

    # 4. Inject onContextMenu and class on <tr> inside map
    # We look for <tr key=... className="hover:bg-slate-50..."
    # Since React code varies, we match `<tr key={` or `<tr key={`...
    
    def repl_tr(m):
        original_tr = m.group(0)
        # Add onContextMenu inside the tag
        modified_tr = original_tr.replace("<tr ", "<tr onContextMenu={(e) => handleContextMenu(e, row)} ")
        # Insert dynamic class based on estado_erp
        if "className={" in modified_tr:
            # It already has dynamic class
            modified_tr = re.sub(r'className=\{`([^`]+)`\}', r'className={`\1 cursor-context-menu ${row.estado_erp === "EXCEPTUADO" ? "bg-slate-100/80 opacity-60 line-through" : ""}`}', modified_tr)
        elif 'className="' in modified_tr:
            # It has static class
            modified_tr = re.sub(r'className="([^"]+)"', r'className={`\1 cursor-context-menu ${row.estado_erp === "EXCEPTUADO" ? "bg-slate-100/80 opacity-60 line-through" : ""}`}', modified_tr)
        return modified_tr

    content = re.sub(r"<tr key=\{[^\}]+\}.*?>", repl_tr, content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"Injected into {os.path.basename(filepath)}")

for filename in os.listdir(DIR):
    if filename.endswith("Preview.tsx") and filename not in EXCLUDE:
        inject_file(os.path.join(DIR, filename))
