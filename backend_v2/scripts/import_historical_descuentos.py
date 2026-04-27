import os
import sys
import pandas as pd
from datetime import datetime
from sqlmodel import Session, create_engine, SQLModel
from dotenv import load_dotenv

# Añadir el directorio raíz al path para poder importar la app
# Estructura: root/backend_v2/scripts/import_historical_descuentos.py
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(ROOT_DIR, "backend_v2"))

# Cargar .env desde la raíz
load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(ROOT_DIR, "backend_v2", ".env"), override=True) # Prioridad al de backend si existe

from app.models.novedades_nomina.nomina import ControlDescuentoActivo

def get_sync_engine():
    # Cargar explícitamente del root .env para asegurar password_segura_refridcol
    user = os.getenv("DB_USER", "user")
    password = os.getenv("DB_PASS", "password_segura_refridcol")
    host = "localhost" # Forzado para ejecución desde host
    port = "5433"      # Puerto expuesto en docker-compose
    name = os.getenv("DB_NAME", "project_manager")
    
    db_url = f"postgresql://{user}:{password}@{host}:{port}/{name}"
    
    # Censurar para el log
    print(f"DEBUG: Conectando a {host}:{port}/{name} con usuario {user}")
    
    return create_engine(db_url)


def clean_currency(value):
    if pd.isna(value) or not isinstance(value, str):
        return 0.0
    # Eliminar símbolo de peso, espacios y puntos de miles
    clean_val = value.replace('$', '').replace(' ', '').replace('.', '')
    # Reemplazar coma decimal por punto decimal
    clean_val = clean_val.replace(',', '.')
    try:
        return float(clean_val)
    except ValueError:
        return 0.0

def parse_date(date_str):
    if pd.isna(date_str) or not isinstance(date_str, str):
        return None
    try:
        # Formato esperado DD/MM/YYYY
        return datetime.strptime(date_str, '%d/%m/%Y')
    except ValueError:
        return None

def import_historical_data():
    csv_path = os.path.join(ROOT_DIR, 'CTRL_DESCUENTO_HISTORICO.csv')
    print(f"Leyendo archivo: {csv_path}")
    
    if not os.path.exists(csv_path):
        print(f"ERROR: El archivo {csv_path} no existe.")
        return

    try:
        # Usar cp1252 que es común en archivos CSV de Windows para español
        df = pd.read_csv(csv_path, sep=';', encoding='cp1252')
    except Exception as e:
        print(f"Error al leer el CSV con cp1252: {e}")
        try:
            df = pd.read_csv(csv_path, sep=';', encoding='latin-1')
        except Exception as e2:
            print(f"Error al leer el CSV con latin-1: {e2}")
            return

    print(f"Registros encontrados: {len(df)}")
    
    engine = get_sync_engine()
    
    with Session(engine) as session:
        # LIMPIEZA: Eliminar los registros corruptos de la carga anterior
        try:
            from sqlalchemy import text
            deleted = session.execute(text("DELETE FROM nomina_control_descuentos_activos WHERE observaciones = 'CARGA HISTÓRICA CSV'"))
            session.commit()
            print(f"DEBUG: Se eliminaron {deleted.rowcount} registros corruptos previos.")
        except Exception as e:
            print(f"Error limpiando registros previos: {e}")
            session.rollback()

        count = 0
        for index, row in df.iterrows():
            try:
                # Mapeo de columnas con corrección de caracteres especiales (¾ -> Ñ)
                cedula = str(row['CEDULA']).strip()
                nombre = str(row['NOMBRE']).strip().upper().replace('\u00be', 'Ñ')
                empresa = str(row['EMPRESA']).strip().upper().replace('\u00be', 'Ñ')
                concepto = str(row['CONCEPTO DE DESCUENTO']).strip().upper().replace('\u00be', 'Ñ')

                valor_descuento = clean_currency(row['VALOR A DESCONTAR'])
                n_cuotas = int(row['NUMERO DE CUOTAS'])
                valor_cuota = clean_currency(row['VALOR CUOTA'])
                fecha_inicio = parse_date(row['FECHA DE INICIO'])
                fecha_finalizacion = parse_date(row['FECHA DE FINALIZACION'])

                
                if not fecha_inicio or not fecha_finalizacion:
                    print(f"Skipping row {index}: Fecha inválida ({row['FECHA DE INICIO']} / {row['FECHA DE FINALIZACION']})")
                    continue

                # Crear instancia del modelo
                nuevo_registro = ControlDescuentoActivo(
                    cedula=cedula,
                    nombre=nombre,
                    empresa=empresa,
                    concepto=concepto,
                    valor_descuento=valor_descuento,
                    n_cuotas=n_cuotas,
                    valor_cuota=valor_cuota,
                    concepto_nomina="111",
                    fecha_inicio=fecha_inicio,
                    fecha_finalizacion=fecha_finalizacion,
                    observaciones="CARGA HISTÓRICA CSV"
                )
                
                session.add(nuevo_registro)
                count += 1
                
                if count % 50 == 0:
                    session.commit()
                    print(f"Procesados {count} registros...")
                    
            except Exception as e:
                print(f"Error procesando fila {index}: {e}")
                continue
        
        session.commit()
        print(f"IMPORTACIÓN FINALIZADA. Se insertaron {count} registros con éxito.")

if __name__ == "__main__":
    import_historical_data()

