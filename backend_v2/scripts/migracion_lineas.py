
import os
import sys
import polars as pl
from datetime import datetime
from dotenv import load_dotenv

# Configuración de Rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Cargar variables de entorno
load_dotenv(os.path.join(BASE_DIR, ".env"))

from app.database import SessionLocal
from app.models.linea_corporativa import LineaCorporativa, EmpleadoLinea

def clean_money(value) -> float:
    """Limpia strings de moneda (ej: '$ 60.931') y los convierte a float."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    
    # Limpiar caracteres no numéricos excepto punto y coma si se usa como decimal
    # En este caso parece que el punto es separador de miles y no hay decimales, o el sistema espera float
    s_value = str(value).replace("$", "").replace(" ", "").replace(".", "").replace(",", ".")
    try:
        return float(s_value)
    except ValueError:
        return 0.0

def map_convenio(value) -> float:
    """Mapea porcentajes de convenio a coeficientes de cobro fijo."""
    if not value:
        return 0.5 # Valor por defecto
    s_val = str(value).strip().replace("%", "")
    try:
        pct = float(s_val)
        return pct / 100.0
    except ValueError:
        return 0.5

def run_migration(excel_path: str):
    print(f"🚀 Iniciando migración desde: {excel_path}")
    
    if not os.path.exists(excel_path):
        print(f"❌ Error: El archivo no existe en {excel_path}")
        return

    try:
        # Usamos Polars para lectura rápida
        # 'header_row': 10 significa que la fila 11 (índice 0) son los headers
        df = pl.read_excel(
            excel_path,
            sheet_name="MATRIZ CELULARES",
            read_options={"skip_rows": 10, "has_header": True}
        )
        # Normalizar encabezados (quitar espacios al inicio y final)
        df.columns = [c.strip() for c in df.columns]
        print(f"📊 Datos leídos: {len(df)} registros encontrados.")
    except Exception as e:
        print(f"❌ Error al leer Excel con Polars: {e}")
        return

    db = SessionLocal()
    count_success = 0
    count_errors = 0

    try:
        for row in df.iter_rows(named=True):
            # 1. Gestionar Empleado (Asignado)
            doc_asignado = str(row.get("DOCUMENTO DE ASIGNADO") or "").strip()
            if not doc_asignado or doc_asignado == "None":
                # Si no hay documento de asignado, usamos el de cobro o saltamos
                doc_asignado = str(row.get("DOCUMENTO DE COBRO") or "").strip()
            
            if not doc_asignado:
                print(f"⚠️ Saltando fila {row.get('N° DE LINEA')} por falta de documento.")
                continue

            nombre_asignado = str(row.get("NOMBRE DE ASIGNADO") or "DESCONOCIDO").strip()
            
            # Buscar o crear empleado
            empleado = db.get(EmpleadoLinea, doc_asignado)
            if not empleado:
                empleado = EmpleadoLinea(
                    documento=doc_asignado,
                    nombre=nombre_asignado,
                    tipo="INTERNO" if "TERCERO" not in str(row.get("CARGO") or "").upper() else "EXTERNO",
                    cargo=row.get("CARGO"),
                    area=row.get("AREA"),
                    centro_costo=str(row.get("CENTRO DE COSTO") or "").strip()
                )
                db.add(empleado)
                db.flush() # Para asegurar relación

            # 2. Gestionar Empresa Responsable (Cobro)
            doc_cobro = str(row.get("DOCUMENTO DE COBRO") or "").strip()
            if doc_cobro and doc_cobro != doc_asignado:
                responsable = db.get(EmpleadoLinea, doc_cobro)
                if not responsable:
                    responsable = EmpleadoLinea(
                        documento=doc_cobro,
                        nombre=str(row.get("EMPLEADO DE COBRO") or "EMPRESA").strip(),
                        tipo="EXTERNO"
                    )
                    db.add(responsable)
                    db.flush()

            # 3. Datos de la Línea
            nro_linea = str(row.get("LINEA") or "").strip()
            if not nro_linea:
                continue

            # Convertir fecha si es necesario
            fecha_upd = row.get("FECHA DE ACTUALIZACION")
            if isinstance(fecha_upd, datetime):
                fecha_upd = fecha_upd.date()
            elif isinstance(fecha_upd, str):
                try:
                    fecha_upd = datetime.strptime(fecha_upd, "%d/%m/%Y").date()
                except Exception:
                    fecha_upd = None

            # Crear Línea
            linea_corp = LineaCorporativa(
                linea=nro_linea,
                fecha_actualizacion=fecha_upd,
                empresa=str(row.get("EMPRESA") or "CLARO").strip(),
                estatus=str(row.get("ESTATUS") or "ACTIVA").strip(),
                estado_asignacion=str(row.get("ESTADO DE ASIGNACION") or "ASIGNADA").strip(),
                documento_asignado=doc_asignado,
                documento_cobro=doc_cobro if doc_cobro else doc_asignado,
                nombre_plan=row.get("NOMBRE DEL PLAN ACTUAL"),
                convenio=str(row.get("CONVENIO #1") or ""),
                aprobado_por=row.get("APROBADO POR"),
                observaciones=row.get("OBSERVACIONES"),
                cobro_fijo_coef=map_convenio(row.get("CONVENIO #1")),
                # Snapshots financieros
                cfm_con_iva=clean_money(row.get("CFM CON IVA")),
                cfm_sin_iva=clean_money(row.get("CFM-SIN IVA")),
                descuento_39=clean_money(row.get("DESC,39%")),
                vr_factura=clean_money(row.get("V/R FACTURA")),
                pago_empleado=clean_money(row.get("PAGO EMPLEADO")),
                pago_empresa=clean_money(row.get("PAGO REFRIDCOL")),
                primera_quincena=clean_money(row.get("1ERA Q")),
                segunda_quincena=clean_money(row.get("2DA Q"))
            )
            
            db.add(linea_corp)
            count_success += 1

        db.commit()
        print("✅ Migración finalizada con éxito.")
        print(f"📈 Resumen: {count_success} líneas cargadas, {count_errors} fallos.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error crítico durante la migración: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Obtener path del primer argumento o usar default
    path_default = os.path.join(os.path.dirname(BASE_DIR), "MATRIZ_CORPORATIVA.xlsx")
    target_path = sys.argv[1] if len(sys.argv) > 1 else path_default
    
    run_migration(target_path)
