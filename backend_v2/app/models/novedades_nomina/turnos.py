"""Validacion y calculo compartido de jornadas diarias."""
from datetime import time
from typing import Optional


def minutos_jornada(
    hora_entrada: Optional[time],
    hora_salida: Optional[time],
    minutos_almuerzo: int = 0,
    cruza_medianoche: bool = False,
) -> int:
    """Devuelve minutos efectivos y valida franco, par de horas y cruce."""
    if hora_entrada is None and hora_salida is None:
        if minutos_almuerzo != 0 or cruza_medianoche:
            raise ValueError("Un franco requiere almuerzo 0 y cruza_medianoche falso")
        return 0
    if hora_entrada is None or hora_salida is None:
        raise ValueError("hora_entrada y hora_salida deben informarse juntas")

    entrada = hora_entrada.hour * 60 + hora_entrada.minute
    salida = hora_salida.hour * 60 + hora_salida.minute
    if entrada == salida:
        raise ValueError("hora_entrada y hora_salida no pueden ser iguales")
    if salida < entrada and not cruza_medianoche:
        raise ValueError("cruza_medianoche debe ser verdadero cuando la salida es menor")
    if salida > entrada and cruza_medianoche:
        raise ValueError("cruza_medianoche solo aplica cuando la salida es menor")

    minutos_brutos = salida + (1440 if cruza_medianoche else 0) - entrada
    efectivos = minutos_brutos - minutos_almuerzo
    if efectivos <= 0 or efectivos >= 1440:
        raise ValueError("La duracion efectiva debe ser mayor que cero y menor de 24 horas")
    return efectivos


def horas_jornada(
    hora_entrada: Optional[time],
    hora_salida: Optional[time],
    minutos_almuerzo: int = 0,
    cruza_medianoche: bool = False,
) -> float:
    return round(
        minutos_jornada(
            hora_entrada, hora_salida, minutos_almuerzo, cruza_medianoche
        ) / 60.0,
        2,
    )
