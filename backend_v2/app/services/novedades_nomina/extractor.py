import pandas as pd
import pdfplumber
import io
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class NominaExtractor:
    """Servicio para extraer datos de archivos PDF, CSV y Excel"""

    @staticmethod
    def extract_from_binary(content: bytes, file_type: str) -> List[Dict[str, Any]]:
        """Extrae datos de un archivo binario según su tipo"""
        if file_type == 'pdf':
            return NominaExtractor._extract_from_pdf(content)
        elif file_type == 'csv':
            return NominaExtractor._extract_from_csv(content)
        elif file_type == 'xlsx' or file_type == 'xls':
            return NominaExtractor._extract_from_excel(content)
        else:
            raise ValueError(f"Tipo de archivo no soportado: {file_type}")

    @staticmethod
    def _extract_from_pdf(content: bytes) -> List[Dict[str, Any]]:
        """Extrae tablas de un PDF usando pdfplumber"""
        data = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    # Intentar identificar cabecera
                    header = table[0]
                    for row in table[1:]:
                        if len(row) == len(header):
                            row_dict = {str(header[i]): row[i] for i in range(len(header)) if header[i]}
                            data.append(row_dict)
        return data

    @staticmethod
    def _extract_from_csv(content: bytes) -> List[Dict[str, Any]]:
        """Extrae datos de un CSV usando pandas"""
        # Intentar detectar separador
        try:
            df = pd.read_csv(io.BytesIO(content), sep=',', encoding='utf-8')
        except:
            df = pd.read_csv(io.BytesIO(content), sep=';', encoding='utf-8')
        
        return df.where(pd.notnull(df), None).to_dict(orient='records')

    @staticmethod
    def _extract_from_excel(content: bytes) -> List[Dict[str, Any]]:
        """Extrae datos de un Excel usando pandas"""
        df = pd.read_excel(io.BytesIO(content))
        return df.where(pd.notnull(df), None).to_dict(orient='records')
