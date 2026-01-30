from datetime import datetime, timedelta, timezone

def get_bogota_now() -> datetime:
    """
    Retorna la fecha y hora actual ajustada a Bogotá (UTC-5).
    Retorna un objeto 'naive' (sin tzinfo) para compatibilidad con 
    los campos TIMESTAMP WITHOUT TIME ZONE de la base de datos.
    """
    # Bogotá es UTC-5
    bogota_tz = timezone(timedelta(hours=-5))
    dt_aware = datetime.now(bogota_tz)
    # Convertimos a naive restando la información de zona horaria 
    # pero manteniendo el valor del reloj local de Bogotá
    return dt_aware.replace(tzinfo=None)
