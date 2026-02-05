from sqlalchemy import create_engine, text

# Esta URL se toma de tu .env para el ERP de pruebas
ERP_URL = "postgresql://postgres:AdminSolid2025@192.168.0.21:5432/solidpruebas3"

def rebuild_tables():
    """
    Este script restaura las tablas personalizadas de Viaticos que NO existen en el ERP estándar.
    Utilízalo siempre después de restaurar un backup de producción en el ambiente de pruebas.
    """
    try:
        engine = create_engine(ERP_URL)
        with engine.connect() as conn:
            print("--- Restaurando Tablas de Tránsito (Misión Marina) ---")
            
            # 1. Crear legalizaciones_transito (Cabecera de borradores)
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS legalizaciones_transito (
                    codigo SERIAL PRIMARY KEY,
                    codigolegalizacion VARCHAR(50),
                    fecha DATE DEFAULT CURRENT_DATE,
                    hora TIME DEFAULT CURRENT_TIME,
                    fechaaplicacion DATE,
                    empleado VARCHAR(20),
                    nombreempleado VARCHAR(255),
                    area VARCHAR(255),
                    valortotal NUMERIC(15,2),
                    estado VARCHAR(50),
                    usuario VARCHAR(50),
                    observaciones TEXT,
                    anexo INTEGER,
                    centrocosto VARCHAR(50),
                    cargo VARCHAR(255),
                    ciudad VARCHAR(255),
                    reporte_id VARCHAR(50)
                )
            """))

            # 2. Crear transito_viaticos (Detalle de líneas de gastos)
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS transito_viaticos (
                    id SERIAL PRIMARY KEY,
                    reporte_id VARCHAR(50),
                    estado VARCHAR(50),
                    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    empleado_cedula VARCHAR(20),
                    empleado_nombre VARCHAR(255),
                    area VARCHAR(255),
                    cargo VARCHAR(255),
                    ciudad VARCHAR(255),
                    categoria VARCHAR(100),
                    fecha_gasto DATE,
                    ot VARCHAR(50),
                    cc VARCHAR(50),
                    scc VARCHAR(50),
                    valor_con_factura NUMERIC(15,2),
                    valor_sin_factura NUMERIC(15,2),
                    observaciones_linea TEXT,
                    observaciones_gral TEXT,
                    usuario_id VARCHAR(50),
                    adjuntos TEXT
                )
            """))
            
            conn.commit()
            print("--- Tablas restauradas y listas para usar ---")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    rebuild_tables()
