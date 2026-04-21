import polars as pl
from io import BytesIO
from datetime import datetime
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import delete, select
from app.models.impuestos.formato_2276 import Formato2276

class ExogenaService:
    @staticmethod
    def get_template() -> BytesIO:
        """Genera un archivo Excel premium con los 45 encabezados oficiales"""
        import xlsxwriter
        
        output = BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("Formato 2276")
        
        # Estilos Premium
        header_format = workbook.add_format({
            'bold': True,
            'font_color': 'white',
            'bg_color': '#000080', # Azul Medianoche
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'text_wrap': True
        })
        
        data_format = workbook.add_format({
            'border': 1,
            'align': 'left'
        })

        columns = [
            "Entidad informante",
            "Tipo de documento del beneficiario (TDOCB)",
            "Número de Identificación del beneficiario (NITB)",
            "Primer Apellido del beneficiario (PAP)",
            "Segundo Apellido del beneficiario (SAP)",
            "Primer Nombre del beneficiario (PNO)",
            "Otros Nombres del beneficiario (ONO)",
            "Dirección del beneficiario (DIR)",
            "Departamento del beneficiario (DPTO)",
            "Municipio del beneficiario (MUN)",
            "País del beneficiario (PAIS)",
            "Pagos por Salarios (PASA)",
            "Pagos por emolumentos eclesiásticos (PAEC)",
            "Pagos realizados con bonos electrónicos o de papel de servicio - cheques - tarjetas - vales (PABOP)",
            "Valor del exceso de los pagos por alimentación mayores a 41 UVT  art. 387-1 E.T (VAEX)",
            "Pagos por honorarios (PAHO)",
            "Pagos por servicios (PASE)",
            "Pagos por comisiones (PACO)",
            "Pagos por prestaciones sociales (PAPRE)",
            "Pagos por viáticos (PAVIA)",
            "Pagos por gastos de representación (PAGA)",
            "Pagos por compensaciones trabajo asociado cooperativo (PATRA)",
            "Valor apoyos económicos no reembolsables o condonados entregados por el Estado o financiados con recursos públicos para financiar programas educativos (VAPO)",
            "Otros pagos  (POTRO)",
            "Cesantías e Intereses Pagadas Periodo (CEIN)",
            "Cesantías consignadas al fondo de cesantías (CECO)",
            "Auxilio de cesantías reconocido a trabajadores del régimen tradicional del Código Sustantivo del Trabajo (AUCE)",
            "Pensiones de Jubilación vejez o invalidez (PEJU)",
            "Total ingresos brutos (TINGBTP)",
            "Aportes Obligatorios por Salud (APOS)",
            "Aportes Obligatorios a fondos de pensiones y solidaridad pensional (APOF)",
            "Aporte voluntarios al régimen de ahorro individual con solidaridad - RAIS (APRAIS)",
            "Aportes voluntarios a fondos de pensiones voluntarias(APOV)",
            "Aportes a cuentas AFC. (APAFC)",
            "Aportes a cuentas AVC. (APAVC)",
            "Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones (VARE)",
            "Impuesto sobre las ventas – IVA mayor valor del costo o gasto (IVAV)",
            "Retención en la fuente a título de impuesto sobre las ventas – IVA (RFIVA)",
            "Pagos por alimentación mensuales hasta a 41 UVT (PAGAHUVT)",
            "Valor ingreso laboral promedio de los últimos seis meses (VILAP)",
            "Tipo de documento del dependiente económico (TDOCDE)",
            "Número de Identificación del dependiente económico (NITDE)",
            "Identificación del fideicomiso (IDENTFC)",
            "Tipo documento participante del contrato(TDOCPCC)",
            "Identificación participante del contrato (NITPCC)"
        ]
        
        # Escribir encabezados
        worksheet.set_row(0, 45) # Altura de fila para texto largo
        for col_num, header in enumerate(columns):
            # Auto-ancho básico
            width = 15
            if "(" in header: width = 20
            if "Dirección" in header or "apoyos" in header: width = 35
            
            worksheet.set_column(col_num, col_num, width)
            worksheet.write(0, col_num, header, header_format)
            
            # Dejar una fila de ejemplo o simplemente celdas con formato de borde
            worksheet.write(1, col_num, "", data_format)
            
        workbook.close()
        output.seek(0)
        return output

    @staticmethod
    async def import_2276(
        db: AsyncSession, 
        file_content: bytes, 
        ano_gravable: int, 
        user_id: str
    ):
        """Procesa el Excel e inserta los datos en la DB"""
        # Leer Excel con Polars
        df = pl.read_excel(BytesIO(file_content))
        
        # Diccionario de mapeo exhaustivo coincidiendo con HEADERS_2276
        mapping = {
            "Entidad informante": "entidad_informante",
            "Tipo de documento del beneficiario (TDOCB)": "tdocb",
            "Número de Identificación del beneficiario (NITB)": "nitb",
            "Primer Apellido del beneficiario (PAP)": "pap",
            "Segundo Apellido del beneficiario (SAP)": "sap",
            "Primer Nombre del beneficiario (PNO)": "pno",
            "Otros Nombres del beneficiario (ONO)": "ono",
            "Dirección del beneficiario (DIR)": "dir",
            "Departamento del beneficiario (DPTO)": "dpto",
            "Municipio del beneficiario (MUN)": "mun",
            "País del beneficiario (PAIS)": "pais",
            "Pagos por Salarios (PASA)": "pasa",
            "Pagos por emolumentos eclesiásticos (PAEC)": "paec",
            "Pagos realizados con bonos electrónicos o de papel de servicio - cheques - tarjetas - vales (PABOP)": "pabop",
            "Valor del exceso de los pagos por alimentación mayores a 41 UVT  art. 387-1 E.T (VAEX)": "vaex",
            "Pagos por honorarios (PAHO)": "paho",
            "Pagos por servicios (PASE)": "pase",
            "Pagos por comisiones (PACO)": "paco",
            "Pagos por prestaciones sociales (PAPRE)": "papre",
            "Pagos por viáticos (PAVIA)": "pavia",
            "Pagos por gastos de representación (PAGA)": "paga",
            "Pagos por compensaciones trabajo asociado cooperativo (PATRA)": "patra",
            "Valor apoyos económicos no reembolsables o condonados entregados por el Estado o financiados con recursos públicos para financiar programas educativos (VAPO)": "vapo",
            "Otros pagos  (POTRO)": "potro",
            "Cesantías e Intereses Pagadas Periodo (CEIN)": "cein",
            "Cesantías consignadas al fondo de cesantías (CECO)": "ceco",
            "Auxilio de cesantías reconocido a trabajadores del régimen tradicional del Código Sustantivo del Trabajo (AUCE)": "auce",
            "Pensiones de Jubilación vejez o invalidez (PEJU)": "peju",
            "Total ingresos brutos (TINGBTP)": "tingbtp",
            "Aportes Obligatorios por Salud (APOS)": "apos",
            "Aportes Obligatorios a fondos de pensiones y solidaridad pensional (APOF)": "apof",
            "Aporte voluntarios al régimen de ahorro individual con solidaridad - RAIS (APRAIS)": "aprais",
            "Aportes voluntarios a fondos de pensiones voluntarias(APOV)": "apov",
            "Aportes a cuentas AFC. (APAFC)": "apafc",
            "Aportes a cuentas AVC. (APAVC)": "apavc",
            "Valor de las retenciones en la fuente por pagos de rentas de trabajo o pensiones (VARE)": "vare",
            "Impuesto sobre las ventas – IVA mayor valor del costo o gasto (IVAV)": "ivav",
            "Retención en la fuente a título de impuesto sobre las ventas – IVA (RFIVA)": "rfiva",
            "Pagos por alimentación mensuales hasta a 41 UVT (PAGAHUVT)": "pagahuvt",
            "Valor ingreso laboral promedio de los últimos seis meses (VILAP)": "vilap",
            "Tipo de documento del dependiente económico (TDOCDE)": "tdocde",
            "Número de Identificación del dependiente económico (NITDE)": "nitde",
            "Identificación del fideicomiso (IDENTFC)": "identfc",
            "Tipo documento participante del contrato(TDOCPCC)": "tdocpcc",
            "Identificación participante del contrato (NITPCC)": "nitpcc"
        }

        # Limpiar nombres de columnas
        df = df.rename({c: c.strip() for c in df.columns})
        
        await db.execute(delete(Formato2276).where(Formato2276.ano_gravable == ano_gravable))
        
        string_fields = [
            "entidad_informante", "tdocb", "nitb", "pap", "sap", "pno", "ono", 
            "dir", "dpto", "mun", "pais", "tdocde", "nitde", "identfc", "tdocpcc", "nitpcc"
        ]

        records = []
        for row in df.to_dicts():
            data = {
                "ano_gravable": ano_gravable,
                "cargado_por": user_id,
                "fecha_carga": datetime.now()
            }
            for excel_col, model_attr in mapping.items():
                val = row.get(excel_col)
                
                if model_attr in string_fields:
                    data[model_attr] = str(val).strip() if val is not None else ""
                else:
                    if isinstance(val, str):
                        try:
                            # Limpiar formato de miles (punto) y decimales (coma o punto)
                            cleaned_val = val.replace(".", "").replace(",", ".").strip()
                            data[model_attr] = float(cleaned_val) if cleaned_val else 0.0
                        except ValueError:
                            data[model_attr] = 0.0
                    elif val is None:
                        data[model_attr] = 0.0
                    else:
                        data[model_attr] = float(val)
            
            records.append(Formato2276(**data))
        
        if records:
            db.add_all(records)
            await db.commit()
        return len(records)

        # Limpiar nombres de columnas (quitar espacios extras)
        df = df.rename({c: c.strip() for c in df.columns})
        
        # Eliminar registros previos del mismo año para evitar duplicados
        await db.execute(delete(Formato2276).where(Formato2276.ano_gravable == ano_gravable))
        
        # Definición de tipos para limpieza
        string_fields = ["tdocb", "nitb", "pap", "sap", "pno", "ono", "dir", "dpto", "mun", "pais", "tdocde", "nitde", "identfc", "tdocpcc", "nitpcc"]

        # Iterar y crear objetos
        records = []
        for row in df.to_dicts():
            data = {
                "ano_gravable": ano_gravable,
                "cargado_por": user_id,
                "fecha_carga": datetime.now()
            }
            # Mapear columnas dinámicamente con limpieza de tipos
            for excel_col, model_attr in mapping.items():
                val = row.get(excel_col)
                
                if model_attr in string_fields:
                    # Siempre convertir a string y quitar espacios (soluciona DataError de asyncpg)
                    data[model_attr] = str(val).strip() if val is not None else ""
                else:
                    # Procesamiento de números
                    if isinstance(val, str):
                        try:
                            # Quitar puntos de miles y cambiar coma decimal por punto
                            cleaned_val = val.replace(".", "").replace(",", ".").strip()
                            data[model_attr] = float(cleaned_val) if cleaned_val else 0.0
                        except ValueError:
                            data[model_attr] = 0.0
                    elif val is None:
                        data[model_attr] = 0.0
                    else:
                        data[model_attr] = float(val)
            
            records.append(Formato2276(**data))
        
        if records:
            db.add_all(records)
            await db.commit()
        return len(records)

    @staticmethod
    async def get_records(db: AsyncSession, ano: int = None):
        """Obtiene los registros del formato 2276, opcionalmente filtrados por año"""
        query = select(Formato2276)
        if ano:
            query = query.where(Formato2276.ano_gravable == ano)
        query = query.order_by(Formato2276.ano_gravable.desc(), Formato2276.id.asc())
        result = await db.execute(query)
        return result.scalars().all()
