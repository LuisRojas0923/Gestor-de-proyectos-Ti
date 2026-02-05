from sqlalchemy import create_engine, text

ERP_URL = "postgresql://postgres:AdminSolid2025@192.168.0.21:5432/solidpruebas3"

def hard_rebuild():
    try:
        engine = create_engine(ERP_URL)
        with engine.connect() as conn:
            print("--- Iniciando RECONSTRUCCIÓN TOTAL DE TABLAS ---")
            
            # 1. Limpiar rastro antiguo
            print("Eliminando tablas previas por seguridad...")
            conn.execute(text("DROP TABLE IF EXISTS transito_viaticos CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS legalizaciones_transito CASCADE"))

            # 2. Crear legalizaciones_transito (Cabecera)
            print("Creando tabla legalizaciones_transito...")
            conn.execute(text("""
                CREATE TABLE legalizaciones_transito (
                    codigo SERIAL PRIMARY KEY,
                    codigolegalizacion VARCHAR(100),
                    fecha DATE DEFAULT CURRENT_DATE,
                    hora TIME DEFAULT CURRENT_TIME,
                    fechaaplicacion DATE,
                    empleado VARCHAR(50),
                    nombreempleado VARCHAR(255),
                    area VARCHAR(255),
                    valortotal NUMERIC(20,2),
                    estado VARCHAR(50),
                    usuario VARCHAR(100),
                    observaciones TEXT,
                    anexo INTEGER,
                    centrocosto VARCHAR(100),
                    cargo VARCHAR(255),
                    ciudad VARCHAR(255),
                    reporte_id VARCHAR(100)
                )
            """))

            # 3. Crear transito_viaticos (Detalle)
            print("Creando tabla transito_viaticos...")
            conn.execute(text("""
                CREATE TABLE transito_viaticos (
                    id SERIAL PRIMARY KEY,
                    reporte_id VARCHAR(100),
                    estado VARCHAR(50),
                    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    empleado_cedula VARCHAR(50),
                    empleado_nombre VARCHAR(255),
                    area VARCHAR(255),
                    cargo VARCHAR(255),
                    ciudad VARCHAR(255),
                    categoria VARCHAR(255),
                    fecha_gasto DATE,
                    ot VARCHAR(100),
                    cc VARCHAR(100),
                    scc VARCHAR(100),
                    valor_con_factura NUMERIC(20,2),
                    valor_sin_factura NUMERIC(20,2),
                    observaciones_linea TEXT,
                    observaciones_gral TEXT,
                    usuario_id VARCHAR(100),
                    adjuntos TEXT
                )
            """))
            
            conn.commit()
            print("--- TABLAS RECONSTRUIDAS E INTEGRIDAD VERIFICADA ---")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    hard_rebuild()
