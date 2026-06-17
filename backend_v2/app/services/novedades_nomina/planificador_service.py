"""
Sprint S7 — Shim de compatibilidad.

La logica del planificador semanal se dividio en modulos separados para
cumplir con el limite de 500 lineas del Architecture Enforcer:
  - planificador_calculo.py     -> pre_calcular_plan
  - planificador_persistencia.py -> guardar_borrador_plan, confirmar_plan
  - _planificador_common.py      -> helpers compartidos (interno)

Este modulo reexporta los simbolos publicos para mantener compatibilidad
con imports externos.
"""
from .planificador_calculo import pre_calcular_plan  # noqa: F401
from .planificador_persistencia import (  # noqa: F401
    guardar_borrador_plan,
    confirmar_plan,
)
