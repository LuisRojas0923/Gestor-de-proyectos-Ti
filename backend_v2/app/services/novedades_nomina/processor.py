import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlmodel import Session, select
from ...models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroCrudo, NominaRegistroNormalizado, NominaConcepto
)

logger = logging.getLogger(__name__)

class NominaProcessor:
    """Servicio para normalizar y clasificar registros de nómina"""

    def __init__(self, session: Session):
        self.session = session

    async def normalize_record(self, raw_data: Dict[str, Any], archivo: NominaArchivo, fila: int) -> NominaRegistroNormalizado:
        """Normaliza un registro crudo al formato estándar"""
        
        payload = raw_data
        
        # 1. CEDULA (Limpiar: solo dígitos)
        raw_cedula = str(self._find_value(payload, ['CEDULA', 'DOCUMENTO', 'ID', 'NIT', 'Cédula']))
        cedula = re.sub(r'\D', '', raw_cedula)
        
        # 2. VALOR (Normalizar a float)
        raw_valor = self._find_value(payload, ['VALOR', 'MONTO', 'TOTAL', 'NETO', 'Importe', 'Valor'])
        valor = self._parse_float(raw_valor)
        
        # 3. EMPRESA y CONCEPTO
        empresa = str(self._find_value(payload, ['EMPRESA', 'ENTIDAD', 'Compañía', 'Nombre Empresa']) or archivo.subcategoria)
        concepto = str(self._find_value(payload, ['CONCEPTO', 'DESCRIPCION', 'TIPO', 'Descripción']) or '')

        # 4. NOMBRE (Opcional)
        nombre = self._find_value(payload, ['NOMBRE', 'ASOCIADO', 'EMPLEADO', 'Nombre Asociado'])

        # 5. HORAS y DIAS (Para planillas)
        horas = self._parse_float(self._find_value(payload, ['HORAS', 'HRS', 'Hours']))
        dias = self._parse_float(self._find_value(payload, ['DIAS', 'DAYS', 'Días']))

        # Otros campos del archivo
        mes = archivo.mes_fact
        año = archivo.año_fact
        
        registro = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes,
            año_fact=año,
            cedula=cedula,
            nombre_asociado=nombre,
            valor=valor,
            empresa=empresa.strip(),
            concepto=concepto.strip(),
            categoria_final=archivo.categoria,
            subcategoria_final=archivo.subcategoria,
            horas=horas,
            dias=dias,
            fila_origen=fila,
            estado_validacion="PENDIENTE"
        )
        
        # Clasificación automática
        await self._classify(registro)
        
        return registro

    def _find_value(self, payload: Dict[str, Any], aliases: List[str]) -> Any:
        """Busca un valor en el payload usando una lista de alias (case insensitive y trim)"""
        keys = payload.keys()
        for alias in aliases:
            # Match exacto ignorando espacios y caso
            alias_clean = alias.strip().upper()
            for k in keys:
                if str(k).strip().upper() == alias_clean:
                    return payload[k]
        return None

    def _parse_float(self, value: Any) -> float:
        """Convierte un valor a float manejando separadores de miles y decimales"""
        if value is None: return 0.0
        if isinstance(value, (int, float)): return float(value)
        
        s = str(value).replace('$', '').replace(' ', '')
        # Caso común en Colombia: puntos para miles, coma para decimales
        if ',' in s and '.' in s:
            if s.find('.') < s.find(','): # 1.234,56
                s = s.replace('.', '').replace(',', '.')
            else: # 1,234.56
                s = s.replace(',', '')
        elif ',' in s:
            parts = s.split(',')
            if len(parts[-1]) == 3:
                s = s.replace(',', '')
            else:
                s = s.replace(',', '.')
        
        try:
            return float(s)
        except:
            return 0.0

    async def _classify(self, registro: NominaRegistroNormalizado):
        """Aplica reglas de clasificación"""
        # 1. Buscar coincidencia exacta
        statement = select(NominaConcepto).where(
            NominaConcepto.empresa == registro.empresa,
            NominaConcepto.concepto == registro.concepto
        )
        result = await self.session.execute(statement)
        match = result.scalars().first()
        
        if match:
            registro.categoria_final = match.categoria
            registro.subcategoria_final = match.subcategoria
            registro.estado_validacion = "OK"
            return

        # 2. Buscar por keywords (contiene)
        statement = select(NominaConcepto).where(NominaConcepto.keywords != None)
        result = await self.session.execute(statement)
        conceptos = result.scalars().all()
        
        for c in conceptos:
            keywords = [k.strip().upper() for k in c.keywords.split(',')]
            text_to_search = f"{registro.empresa} {registro.concepto}".upper()
            if any(kw in text_to_search for kw in keywords):
                registro.categoria_final = c.categoria
                registro.subcategoria_final = c.subcategoria
                registro.estado_validacion = "OK"
                return

        # 3. Si no hay match, marcar como NO_CLASIFICADO
        registro.estado_validacion = "NO_CLASIFICADO"
