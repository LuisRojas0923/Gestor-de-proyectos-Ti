"""
Script de Carga Masiva de Actividades WBS
==========================================

Inserta actividades con subtareas (jerarquía) directamente en PostgreSQL.

Uso:
    python scripts/seed_actividades_masivo.py

Requiere:
    pip install psycopg2-binary python-dotenv

Flujo:
    1. Define tus actividades en la lista ACTIVIDADES_A_CARGAR (al final del archivo)
    2. Ejecuta el script
    3. Verifica en consola el resultado

Jerarquía:
    - Las actividades raíz tienen parent_id = None
    - Las subtareas usan parent_ref: el índice (0-based) de su padre en la lista ACTIVIDADES_A_CARGAR
      IMPORTANTE: el padre debe aparecer ANTES que sus hijos en la lista
"""

import os
import sys
import psycopg2
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

# ─────────────────────────────────────────────
#  CONFIGURACIÓN DE CONEXIÓN
#  Modifica estos valores según tu entorno
# ─────────────────────────────────────────────

DB_CONFIG = {
    "host": "localhost",       # Si el contenedor Docker mapea al 5432 local
    "port": 5432,
    "dbname": "project_manager",
    "user": "user",
    "password": "password_segura_refridcol",
}

# ─────────────────────────────────────────────
#  ESTRUCTURA DE UNA ACTIVIDAD
# ─────────────────────────────────────────────
#
# Campos disponibles:
#   desarrollo_id   (str)   OBLIGATORIO - ID del desarrollo (ej: "HO-5")
#   titulo          (str)   OBLIGATORIO - Nombre de la actividad
#   parent_ref      (int)   OPCIONAL    - Índice 0-based del padre en esta lista (None = raíz)
#   descripcion     (str)   OPCIONAL
#   estado          (str)   OPCIONAL    - "Pendiente" | "En Progreso" | "Bloqueado" | "Completado"
#   responsable_id  (str)   OPCIONAL    - Nombre o ID del responsable
#   fecha_inicio    (str)   OPCIONAL    - Formato "YYYY-MM-DD"
#   fecha_fin       (str)   OPCIONAL    - Formato "YYYY-MM-DD"
#   horas_estimadas (float) OPCIONAL
#   porcentaje      (float) OPCIONAL    - 0 a 100
#   seguimiento     (str)   OPCIONAL
#   compromiso      (str)   OPCIONAL

# ─────────────────────────────────────────────
#  ✏️  DEFINE TUS ACTIVIDADES AQUÍ
#
#  Ejemplo de estructura con 2 niveles:
#
#  ACTIVIDADES_A_CARGAR = [
#      # Índice 0 — Actividad raíz
#      {
#          "desarrollo_id": "HO-5",
#          "titulo": "Fase 1: Análisis",
#          "parent_ref": None,
#          "estado": "En Progreso",
#          "responsable_id": "LUIS ENRIQUE",
#          "fecha_inicio": "2024-01-15",
#          "fecha_fin": "2024-02-15",
#      },
#      # Índice 1 — Hijo del índice 0
#      {
#          "desarrollo_id": "HO-5",
#          "titulo": "Levantamiento de requerimientos",
#          "parent_ref": 0,   ← índice del padre en esta lista
#          "estado": "Completado",
#          "responsable_id": "LUIS ENRIQUE",
#          "fecha_inicio": "2024-01-15",
#          "fecha_fin": "2024-01-20",
#      },
#      # Índice 2 — Nieto (hijo del índice 1)
#      {
#          "desarrollo_id": "HO-5",
#          "titulo": "Reunión con el área de Gestión Humana",
#          "parent_ref": 1,   ← índice del padre en esta lista
#          "estado": "Completado",
#      },
#  ]
# ─────────────────────────────────────────────

ACTIVIDADES_A_CARGAR = [
    # ── PEGA O ESCRIBE TUS ACTIVIDADES AQUÍ ──────────────────────────

    # Ejemplo (borra esto y pon las tuyas):
    {
        "desarrollo_id": "CAMBIAR-ID",          # ← Pon el ID real del desarrollo
        "titulo": "Actividad de ejemplo raíz",
        "parent_ref": None,
        "estado": "Pendiente",
        "responsable_id": "RESPONSABLE",
        "fecha_inicio": "2024-01-01",
        "fecha_fin": "2024-01-31",
        "descripcion": "Descripción de la actividad",
    },
    {
        "desarrollo_id": "CAMBIAR-ID",
        "titulo": "Subtarea de ejemplo",
        "parent_ref": 0,                        # ← hijo de la actividad en índice 0
        "estado": "Pendiente",
        "fecha_inicio": "2024-01-05",
        "fecha_fin": "2024-01-15",
    },

    # ── FIN DE TUS ACTIVIDADES ────────────────────────────────────────
]


# ─────────────────────────────────────────────
#  LÓGICA DEL SCRIPT (no necesitas modificar)
# ─────────────────────────────────────────────

INSERT_SQL = """
    INSERT INTO actividades (
        desarrollo_id,
        parent_id,
        titulo,
        descripcion,
        estado,
        responsable_id,
        fecha_inicio_estimada,
        fecha_fin_estimada,
        horas_estimadas,
        porcentaje_avance,
        seguimiento,
        compromiso,
        estado_validacion,
        creado_en
    ) VALUES (
        %(desarrollo_id)s,
        %(parent_id)s,
        %(titulo)s,
        %(descripcion)s,
        %(estado)s,
        %(responsable_id)s,
        %(fecha_inicio)s,
        %(fecha_fin)s,
        %(horas_estimadas)s,
        %(porcentaje_avance)s,
        %(seguimiento)s,
        %(compromiso)s,
        'aprobada',
        NOW()
    )
    RETURNING id;
"""


def parse_date(val: Optional[str]) -> Optional[date]:
    if not val:
        return None
    try:
        return date.fromisoformat(val)
    except ValueError:
        print(f"  ⚠️  Fecha inválida ignorada: '{val}' (usa formato YYYY-MM-DD)")
        return None


def validar_desarrollo(cur, desarrollo_id: str) -> bool:
    cur.execute("SELECT id FROM desarrollos WHERE id = %s", (desarrollo_id,))  # [CONTROLADO]
    return cur.fetchone() is not None


def main():
    if not ACTIVIDADES_A_CARGAR:
        print("❌ La lista ACTIVIDADES_A_CARGAR está vacía. Agrega actividades antes de ejecutar.")
        sys.exit(1)

    print("=" * 60)
    print("  CARGA MASIVA DE ACTIVIDADES WBS")
    print("=" * 60)
    print(f"  Total a insertar: {len(ACTIVIDADES_A_CARGAR)} actividades")
    print(f"  Conectando a: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}")
    print()

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        print("\nVerifica DB_CONFIG al inicio del script.")
        sys.exit(1)

    # Mapa índice → id_real_en_bd
    id_map: dict[int, int] = {}
    insertadas = 0
    errores = 0

    try:
        for idx, act in enumerate(ACTIVIDADES_A_CARGAR):
            # Validaciones básicas
            desarrollo_id = act.get("desarrollo_id", "").strip()
            titulo = act.get("titulo", "").strip()

            if not desarrollo_id or not titulo:
                print(f"  [{idx}] ❌ OMITIDA — falta 'desarrollo_id' o 'titulo'")
                errores += 1
                continue

            if not validar_desarrollo(cur, desarrollo_id):
                print(f"  [{idx}] ❌ OMITIDA — desarrollo '{desarrollo_id}' no existe en la BD")
                errores += 1
                continue

            # Resolver parent_id real
            parent_ref = act.get("parent_ref")
            parent_id = None
            if parent_ref is not None:
                parent_id = id_map.get(parent_ref)
                if parent_id is None:
                    print(f"  [{idx}] ❌ OMITIDA — parent_ref={parent_ref} no fue insertado aún (¿está antes en la lista?)")
                    errores += 1
                    continue

            params = {
                "desarrollo_id":  desarrollo_id,
                "parent_id":      parent_id,
                "titulo":         titulo,
                "descripcion":    act.get("descripcion"),
                "estado":         act.get("estado", "Pendiente"),
                "responsable_id": act.get("responsable_id"),
                "fecha_inicio":   parse_date(act.get("fecha_inicio")),
                "fecha_fin":      parse_date(act.get("fecha_fin")),
                "horas_estimadas":act.get("horas_estimadas", 0.0),
                "porcentaje_avance": act.get("porcentaje", 0.0),
                "seguimiento":    act.get("seguimiento"),
                "compromiso":     act.get("compromiso"),
            }

            cur.execute(INSERT_SQL, params)
            new_id = cur.fetchone()[0]
            id_map[idx] = new_id
            nivel = "  " * (0 if parent_ref is None else 1) if parent_ref is None else "    └─ "
            padre_info = f"(parent_id={parent_id})" if parent_id else "(raíz)"
            print(f"  [{idx}] ✅ ID={new_id:5d} {padre_info:18s} → {titulo[:55]}")
            insertadas += 1

        conn.commit()
        print()
        print("=" * 60)
        print(f"  ✅ COMPLETADO: {insertadas} insertadas, {errores} errores")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error durante la inserción — ROLLBACK ejecutado: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
