"""
Schemas Pydantic para festivos (S5').

Listado y resultado de sincronización de festivos nacionales
(Ley Emiliani + Calendarific fallback).
"""
from datetime import date
from typing import Optional
from sqlmodel import SQLModel


class FestivoRead(SQLModel):
    fecha: date
    nombre: str
    fuente: str  # 'CALENDARIFIC' | 'LEY_EMILIANI'


class FestivoSincronizarResult(SQLModel):
    anio: int
    fuente: str
    cantidad: int
    calendarific_error: Optional[str] = None
    mensaje: str
