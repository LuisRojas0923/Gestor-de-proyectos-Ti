"""
Seed del módulo de Horas Extras y Novedades (S0 sprint).

Carga datos maestros:
  - 16 novedades del catálogo (códigos del Excel regional)
  - 5 niveles de riesgo ARL con factores prestacionales
  - Parámetros legales con vigencia

Es idempotente: si el registro ya existe, no lo duplica.
"""
from datetime import date
from sqlmodel import select
from ...models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaFactorPrestacionalRiesgo,
    NominaParametroLegal,
)
from ...database import AsyncSessionLocal


NOVEDADES_CATALOGO = [
    # --- Horas extras (CST Art. 161, Ley 2466/2025) ---
    {
        "codigo": "HED",
        "descripcion_corta": "Hora extra diurna",
        "descripcion_larga": "Hora extra diurna (06:00-22:00). Recargo 25% sobre hora ordinaria.",
        "categoria": "HORA_EXTRA",
        "subcategoria": "DIURNA",
        "factor_hora_ordinaria": 1.25,
        "acredita_bolsa": True,
        "descuenta_bolsa": True,
        "requiere_autorizacion": True,
        "unidad": "HORAS",
    },
    {
        "codigo": "HEN",
        "descripcion_corta": "Hora extra nocturna",
        "descripcion_larga": "Hora extra nocturna (22:00-06:00). Recargo 75% sobre hora ordinaria.",
        "categoria": "HORA_EXTRA",
        "subcategoria": "NOCTURNA",
        "factor_hora_ordinaria": 1.75,
        "acredita_bolsa": True,
        "descuenta_bolsa": True,
        "requiere_autorizacion": True,
        "unidad": "HORAS",
    },
    {
        "codigo": "HEFD",
        "descripcion_corta": "Hora extra festiva diurna",
        "descripcion_larga": "Hora extra en día festivo, jornada diurna. Recargo 105% sobre hora ordinaria.",
        "categoria": "HORA_EXTRA",
        "subcategoria": "FESTIVA_DIURNA",
        "factor_hora_ordinaria": 2.05,
        "acredita_bolsa": True,
        "descuenta_bolsa": True,
        "requiere_autorizacion": True,
        "unidad": "HORAS",
    },
    {
        "codigo": "HEFN",
        "descripcion_corta": "Hora extra festiva nocturna",
        "descripcion_larga": "Hora extra en día festivo, jornada nocturna. Recargo 155% sobre hora ordinaria.",
        "categoria": "HORA_EXTRA",
        "subcategoria": "FESTIVA_NOCTURNA",
        "factor_hora_ordinaria": 2.55,
        "acredita_bolsa": True,
        "descuenta_bolsa": True,
        "requiere_autorizacion": True,
        "unidad": "HORAS",
    },
    {
        "codigo": "HF",
        "descripcion_corta": "Hora festiva diurna",
        "descripcion_larga": "Trabajo en día festivo dentro de jornada ordinaria. Recargo 80% sobre hora ordinaria (Art. 179 CST).",
        "categoria": "HORA_EXTRA",
        "subcategoria": "FESTIVA_DIURNA",
        "factor_hora_ordinaria": 1.80,
        "acredita_bolsa": True,
        "descuenta_bolsa": False,
        "requiere_autorizacion": True,
        "unidad": "HORAS",
    },
    # --- Recargos nocturnos (CST Art. 160) ---
    {
        "codigo": "RN",
        "descripcion_corta": "Recargo nocturno ordinario",
        "descripcion_larga": "Trabajo nocturno dentro de jornada ordinaria (22:00-06:00). Recargo 35% sobre hora ordinaria.",
        "categoria": "RECARGO_NOCTURNO",
        "subcategoria": "NOCTURNA",
        "factor_hora_ordinaria": 1.35,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": False,
        "unidad": "HORAS",
    },
    {
        "codigo": "RF",
        "descripcion_corta": "Recargo festivo",
        "descripcion_larga": "Recargo por trabajo en día festivo dentro de jornada ordinaria.",
        "categoria": "RECARGO_NOCTURNO",
        "subcategoria": "FESTIVA",
        "factor_hora_ordinaria": 1.80,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": False,
        "unidad": "HORAS",
    },
    # --- Licencias y vacaciones (CST) ---
    {
        "codigo": "LIC",
        "descripcion_corta": "Licencia remunerada",
        "descripcion_larga": "Licencia remunerada (calamidad, luto, matrimonio, paternidad). No descuenta salario.",
        "categoria": "LICENCIA",
        "subcategoria": "REMUNERADA",
        "factor_hora_ordinaria": 1.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": True,
        "unidad": "DIAS",
    },
    {
        "codigo": "PNR",
        "descripcion_corta": "Licencia no remunerada",
        "descripcion_larga": "Permiso no remunerado (sin goce de salario). No afecta bolsa.",
        "categoria": "LICENCIA",
        "subcategoria": "NO_REMUNERADA",
        "factor_hora_ordinaria": 0.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": True,
        "unidad": "DIAS",
    },
    {
        "codigo": "VAC",
        "descripcion_corta": "Vacaciones disfrutadas",
        "descripcion_larga": "Días de vacaciones efectivamente disfrutados.",
        "categoria": "VACACION",
        "subcategoria": "DISFRUTADAS",
        "factor_hora_ordinaria": 1.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": True,
        "unidad": "DIAS",
    },
    # --- Incapacidades (Ley 100/1993) ---
    {
        "codigo": "INC",
        "descripcion_corta": "Incapacidad",
        "descripcion_larga": "Incapacidad médica general (EPS) o profesional (ARL).",
        "categoria": "INCAPACIDAD",
        "subcategoria": "MEDICA",
        "factor_hora_ordinaria": 1.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": False,
        "unidad": "DIAS",
    },
    {
        "codigo": "DXT",
        "descripcion_corta": "Descanso por tratamiento",
        "descripcion_larga": "Descanso remunerado por tratamiento (art. 57 CST y Ley 1280/2009).",
        "categoria": "INCAPACIDAD",
        "subcategoria": "TRATAMIENTO",
        "factor_hora_ordinaria": 1.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": False,
        "unidad": "DIAS",
    },
    # --- Ausencias y sanciones ---
    {
        "codigo": "AUS",
        "descripcion_corta": "Ausencia injustificada",
        "descripcion_larga": "Ausencia no justificada. Descuenta salario, no afecta bolsa.",
        "categoria": "AUSENCIA",
        "subcategoria": "INJUSTIFICADA",
        "factor_hora_ordinaria": 0.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": False,
        "unidad": "HORAS",
    },
    {
        "codigo": "SAN",
        "descripcion_corta": "Sanción disciplinaria",
        "descripcion_larga": "Sanción disciplinaria (suspensión sin goce de salario).",
        "categoria": "AUSENCIA",
        "subcategoria": "SANCION",
        "factor_hora_ordinaria": 0.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": False,
        "unidad": "DIAS",
    },
    {
        "codigo": "RET",
        "descripcion_corta": "Retardo",
        "descripcion_larga": "Retardo en la llegada. No descuenta salario, observación de asistencia.",
        "categoria": "AUSENCIA",
        "subcategoria": "RETARDO",
        "factor_hora_ordinaria": 1.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": False,
        "requiere_autorizacion": False,
        "unidad": "HORAS",
    },
    # --- Compensatorio (CMP) ---
    {
        "codigo": "CMP",
        "descripcion_corta": "Compensatorio",
        "descripcion_larga": "Día compensatorio por horas extras laboradas (tiempo libre). Descuenta de la bolsa 1:1.",
        "categoria": "COMPENSACION",
        "subcategoria": "TIEMPO_LIBRE",
        "factor_hora_ordinaria": 1.0,
        "acredita_bolsa": False,
        "descuenta_bolsa": True,
        "requiere_autorizacion": True,
        "unidad": "HORAS",
    },
]

# Niveles ARL — Decreto 1295/1994, Art. 26
FACTORES_PRESTACIONALES = [
    {
        "nivel_riesgo": "I",
        "nivel_macro": "DIRECCION",
        "arl_nombre": "SURA / BOLIVAR (típico)",
        "factor_prestacional": 0.50522,
        "porcentaje_arl": 0.00522,
    },
    {
        "nivel_riesgo": "II",
        "nivel_macro": "ADMINISTRATIVO",
        "arl_nombre": "POSITIVA / SURA",
        "factor_prestacional": 0.51044,
        "porcentaje_arl": 0.01044,
    },
    {
        "nivel_riesgo": "III",
        "nivel_macro": "OPERATIVO",
        "arl_nombre": "SURA / COLMENA",
        "factor_prestacional": 0.52436,
        "porcentaje_arl": 0.02436,
    },
    {
        "nivel_riesgo": "IV",
        "nivel_macro": "OPERATIVO",
        "arl_nombre": "POSITIVA / BOLIVAR",
        "factor_prestacional": 0.54350,
        "porcentaje_arl": 0.04350,
    },
    {
        "nivel_riesgo": "V",
        "nivel_macro": "OPERATIVO",
        "arl_nombre": "LA EQUIDAD / POSITIVA",
        "factor_prestacional": 0.56960,
        "porcentaje_arl": 0.06960,
    },
]

# Parámetros legales base
PARAMETROS_LEGALES = [
    {
        "codigo": "MAX_HE_DIARIAS",
        "nombre": "Máximo de horas extras diarias",
        "valor": "2",
        "tipo_dato": "NUMERICO",
        "norma_soporte": "CST Art. 161",
    },
    {
        "codigo": "MAX_HE_SEMANALES",
        "nombre": "Máximo de horas extras semanales",
        "valor": "12",
        "tipo_dato": "NUMERICO",
        "norma_soporte": "CST Art. 161",
    },
    {
        "codigo": "MAX_HE_ANUALES",
        "nombre": "Máximo de horas extras anuales",
        "valor": "480",
        "tipo_dato": "NUMERICO",
        "norma_soporte": "CST Art. 161",
    },
    {
        "codigo": "JORNADA_MAXIMA_SEMANAL",
        "nombre": "Jornada máxima legal semanal",
        "valor": "48",
        "tipo_dato": "NUMERICO",
        "norma_soporte": "CST Art. 161",
    },
    {
        "codigo": "REDUCCION_JORNADA_2101",
        "nombre": "Reducción gradual jornada Ley 2101/2021 (horas/semana)",
        "valor": '{"2026": 47, "2027": 46, "2028": 44, "2030": 42}',
        "tipo_dato": "JSON",
        "norma_soporte": "Ley 2101/2021 Art. 2",
    },
    {
        "codigo": "HORA_NOCTURNA_INICIO",
        "nombre": "Inicio hora nocturna",
        "valor": "22:00",
        "tipo_dato": "TEXTO",
        "norma_soporte": "CST Art. 160",
    },
    {
        "codigo": "HORA_NOCTURNA_FIN",
        "nombre": "Fin hora nocturna",
        "valor": "06:00",
        "tipo_dato": "TEXTO",
        "norma_soporte": "CST Art. 160",
    },
    {
        "codigo": "DIVISOR_HORA_ORDINARIA",
        "nombre": "Divisor para valor hora ordinaria (horas/mes)",
        "valor": "240",
        "tipo_dato": "NUMERICO",
        "norma_soporte": "CST Art. 144",
    },
    {
        "codigo": "BOLSA_GLOBAL_HABILITADA",
        "nombre": "Habilitar bolsa de horas (global)",
        "valor": "true",
        "tipo_dato": "BOOLEANO",
        "norma_soporte": "Política interna — decisión organizacional",
    },
]


async def seed_horas_extras_catalogo():
    """Seed del catálogo de novedades. Idempotente."""
    async with AsyncSessionLocal() as session:
        for n in NOVEDADES_CATALOGO:
            stmt = select(NominaCatalogoNovedad).where(
                NominaCatalogoNovedad.codigo == n["codigo"]
            )
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if existing is None:
                session.add(NominaCatalogoNovedad(**n))
        await session.commit()


async def seed_factores_prestacionales():
    """Seed de los 5 niveles ARL. Idempotente."""
    async with AsyncSessionLocal() as session:
        for f in FACTORES_PRESTACIONALES:
            stmt = select(NominaFactorPrestacionalRiesgo).where(
                NominaFactorPrestacionalRiesgo.nivel_riesgo == f["nivel_riesgo"]
            )
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if existing is None:
                session.add(NominaFactorPrestacionalRiesgo(**f))
        await session.commit()


async def seed_parametros_legales():
    """Seed de parámetros legales con vigencia. Idempotente."""
    async with AsyncSessionLocal() as session:
        for p in PARAMETROS_LEGALES:
            stmt = select(NominaParametroLegal).where(
                NominaParametroLegal.codigo == p["codigo"]
            )
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if existing is None:
                p.setdefault("vigente_desde", date.today())
                session.add(NominaParametroLegal(**p))
        await session.commit()


async def seed_horas_extras_completo():
    """Ejecuta todos los seeds del módulo HE en orden."""
    await seed_horas_extras_catalogo()
    await seed_factores_prestacionales()
    await seed_parametros_legales()
