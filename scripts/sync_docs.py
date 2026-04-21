import os
import psycopg2
from dotenv import load_dotenv

def read_file_safe(path):
    for enc in ["utf-8", "latin-1", "utf-16"]:
        try:
            with open(path, "r", encoding=enc) as f:
                return f.read(), enc
        except UnicodeDecodeError:
            continue
    raise Exception(f"No se pudo decodificar el archivo {path}")

def sync_db_docs():
    """Consulta la base de datos y genera documentación detallada."""
    load_dotenv()
    
    # Intentar conexión con localhost primero, luego con la IP del host
    db_host = "localhost" # Forzar localhost para ejecución desde el host
    db_port = os.getenv("DB_PORT", "5432")
    db_user = os.getenv("DB_USER", "user")
    db_pass = os.getenv("DB_PASS", "password_segura_refridcol")
    db_name = os.getenv("DB_NAME", "project_manager")

    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_pass,
            database=db_name,
            connect_timeout=5
        )
        cur = conn.cursor()
        print(f"Conectado a la base de datos: {db_name}")

        # 1. Obtener tablas y columnas
        cur.execute("""
            SELECT 
                t.table_name, 
                c.column_name, 
                c.data_type, 
                c.is_nullable,
                c.column_default
            FROM information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public'
            ORDER BY t.table_name, c.ordinal_position;
        """)
        rows = cur.fetchall()

        schema_info = {}
        for row in rows:
            table, col, dtype, nullable, default = row
            if table not in schema_info:
                schema_info[table] = []
            schema_info[table].append({
                "col": col, 
                "type": dtype, 
                "null": nullable, 
                "default": default
            })

        # 2. Generar Mermaid ER Diagram
        mermaid_content = "erDiagram\n"
        for table, cols in schema_info.items():
            mermaid_content += f"    {table.upper()} {{\n"
            for c in cols:
                mermaid_content += f"        {c['type']} {c['col']}\n"
            mermaid_content += "    }\n"

        # 3. Leer archivo original
        doc_path = os.path.join("docs", "ESQUEMA_BASE_DATOS.md")
        content, encoding = read_file_safe(doc_path)

        # 4. Preparar bloque auto-generado
        auto_section = f"\n\n## 🔄 Detalles Técnicos (Auto-generado)\n"
        auto_section += "> [!NOTE]\n"
        auto_section += "> Esta sección es generada automáticamente por `scripts/sync_docs.py`. No editar manualmente.\n\n"
        auto_section += "### 📊 Diagrama Entidad-Relación Dinámico\n"
        auto_section += "```mermaid\n" + mermaid_content + "```\n\n"
        
        auto_section += "### 📋 Diccionario de Datos\n"
        for table, cols in schema_info.items():
            auto_section += f"#### Tabla: `{table}`\n"
            auto_section += "| Columna | Tipo | Nulable | Defecto |\n"
            auto_section += "|---------|------|---------|---------|\n"
            for c in cols:
                auto_section += f"| {c['col']} | {c['type']} | {c['null']} | {c['default'] if c['default'] else '-'} |\n"
            auto_section += "\n"

        # 5. Insertar o reemplazar la sección auto-generada
        marker = "## 🔄 Detalles Técnicos (Auto-generado)"
        if marker in content:
            parts = content.split(marker)
            new_content = parts[0] + auto_section
        else:
            new_content = content + auto_section

        with open(doc_path, "w", encoding=encoding) as f:
            f.write(new_content)

        print(f"Documentación sincronizada exitosamente en {doc_path} (Codificación: {encoding})")
        cur.close()
        conn.close()

    except Exception as e:
        print(f"Error al sincronizar documentación: {e}")

if __name__ == "__main__":
    sync_db_docs()
