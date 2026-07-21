import os
import re
import psycopg2
from psycopg2 import sql
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
    
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_user = os.getenv("DB_USER", "user")
    db_pass = os.getenv("DB_PASS", "password_segura_refridcol")
    db_name = os.getenv("DB_NAME", "project_manager")
    db_role = os.getenv("DB_ROLE", "").strip()
    if db_role and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", db_role) is None:
        raise ValueError("DB_ROLE no es un identificador PostgreSQL valido")

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
        if db_role:
            cur.execute(sql.SQL("SET ROLE {}").format(sql.Identifier(db_role)))
        print(f"Conectado a la base de datos: {db_name}")

        # 1. Obtener tablas y columnas
        cur.execute("""
            SELECT 
                t.table_name, 
                c.column_name, 
                c.data_type, 
                c.character_maximum_length,
                c.is_nullable,
                c.column_default
            FROM information_schema.tables t
            JOIN information_schema.columns c
              ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE t.table_schema = 'public'
            ORDER BY t.table_name, c.ordinal_position;
        """)
        rows = cur.fetchall()

        cur.execute("""
            SELECT tabla.relname, columna.attname
            FROM pg_constraint restriccion
            JOIN pg_class tabla ON tabla.oid = restriccion.conrelid
            JOIN pg_namespace esquema ON esquema.oid = tabla.relnamespace
            CROSS JOIN LATERAL unnest(restriccion.conkey) AS clave(numero)
            JOIN pg_attribute columna
              ON columna.attrelid = tabla.oid AND columna.attnum = clave.numero
            WHERE esquema.nspname = 'public' AND restriccion.contype = 'p';
        """)
        primary_keys = set(cur.fetchall())

        cur.execute("""
            SELECT hija.relname, columna_hija.attname,
                   padre.relname, columna_padre.attname,
                   NOT columna_hija.attnotnull AS nullable,
                   EXISTS (
                       SELECT 1 FROM pg_index indice
                       WHERE indice.indrelid = hija.oid
                         AND indice.indisunique AND indice.indpred IS NULL
                         AND indice.indnkeyatts = 1
                         AND indice.indkey[0] = clave_hija.numero
                   ) AS unica
            FROM pg_constraint restriccion
            JOIN pg_class hija ON hija.oid = restriccion.conrelid
            JOIN pg_namespace esquema ON esquema.oid = hija.relnamespace
            JOIN pg_class padre ON padre.oid = restriccion.confrelid
            CROSS JOIN LATERAL unnest(restriccion.conkey)
                WITH ORDINALITY AS clave_hija(numero, posicion)
            CROSS JOIN LATERAL unnest(restriccion.confkey)
                WITH ORDINALITY AS clave_padre(numero, posicion)
            JOIN pg_attribute columna_hija
              ON columna_hija.attrelid = hija.oid
             AND columna_hija.attnum = clave_hija.numero
            JOIN pg_attribute columna_padre
              ON columna_padre.attrelid = padre.oid
             AND columna_padre.attnum = clave_padre.numero
            WHERE esquema.nspname = 'public' AND restriccion.contype = 'f'
              AND clave_hija.posicion = clave_padre.posicion;
        """)
        foreign_keys = cur.fetchall()
        foreign_columns = {
            (tabla, columna) for tabla, columna, _, _, _, _ in foreign_keys
        }

        schema_info = {}
        for row in rows:
            table, col, dtype, length, nullable, default = row
            documented_type = (
                f"{dtype}({length})" if length is not None else dtype
            )
            if table not in schema_info:
                schema_info[table] = []
            schema_info[table].append({
                "col": col, 
                "type": documented_type,
                "null": nullable, 
                "default": default,
                "key": " ".join(
                    key for key, enabled in (
                        ("PK", (table, col) in primary_keys),
                        ("FK", (table, col) in foreign_columns),
                    ) if enabled
                ),
            })

        # 2. Generar Mermaid ER Diagram
        mermaid_content = "erDiagram\n"
        for table, cols in schema_info.items():
            mermaid_content += f"    {table.upper()} {{\n"
            for c in cols:
                tipo = c['type'].replace(' ', '_').replace('(', '_').replace(')', '')
                clave = f" {c['key']}" if c['key'] else ""
                mermaid_content += f"        {tipo} {c['col']}{clave}\n"
            mermaid_content += "    }\n"
        for (
            child_table, child_column, parent_table, parent_column,
            nullable, unique,
        ) in foreign_keys:
            lado_padre = "o|" if nullable else "||"
            lado_hijo = "o|" if unique else "o{"
            mermaid_content += (
                f"    {parent_table.upper()} {lado_padre}--{lado_hijo} "
                f"{child_table.upper()} : "
                f"\"{parent_column} a {child_column}\"\n"
            )

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
            auto_section += "| Columna | Tipo | Clave | Nulable | Defecto |\n"
            auto_section += "|---------|------|-------|---------|---------|\n"
            for c in cols:
                auto_section += f"| {c['col']} | {c['type']} | {c['key'] or '-'} | {c['null']} | {c['default'] if c['default'] else '-'} |\n"
            auto_section += "\n"

        # 5. Insertar o reemplazar la sección auto-generada
        marker = "## 🔄 Detalles Técnicos (Auto-generado)"
        if marker in content:
            parts = content.split(marker)
            new_content = parts[0] + auto_section
        else:
            new_content = content + auto_section

        with open(doc_path, "w", encoding=encoding) as f:
            f.write(new_content.rstrip() + "\n")

        print(f"Documentación sincronizada exitosamente en {doc_path} (Codificación: {encoding})")
        cur.close()
        conn.close()

    except Exception as e:
        print(f"Error al sincronizar documentación: {e}")
        raise

if __name__ == "__main__":
    sync_db_docs()
