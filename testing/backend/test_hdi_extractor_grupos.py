import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from app.services.novedades_nomina.hdi_extractor import extraer_hdi, normalizar_df, _limpiar_numero

def test_limpiar_numero_formato_colombiano():
    """Valida la conversión de cadenas de texto con distintos formatos de notación monetaria."""
    assert _limpiar_numero("391.085,00") == 391085.0
    assert _limpiar_numero("1.234.567,89") == 1234567.89
    assert _limpiar_numero("$ 354.310") == 354310.0
    assert _limpiar_numero("$ 920,200") == 920200.0
    assert _limpiar_numero(391085.0) == 391085.0
    assert _limpiar_numero(None) == 0.0
    assert _limpiar_numero("") == 0.0


def test_hdi_normalizar_df():
    # Columnas de HDI: CERT, NOV, TIPO, IDENTIFICACION, NOMBRES Y APELLIDOS, EDAD, PLAN, VALOR ASEGURADO, PRIMA ANUAL, EXTRAPRIMA, PRIMA COBRO
    data = {
        "CERT": [2, 2, 2],
        "NOV": ["CAR", "CAR", "CAR"],
        "TIPO": ["D", "D", "P"],
        "IDENTIFICACION": ["59661342", "1116235786", "94416010"],
        "NOMBRES Y APELLIDOS": ["FELIZA DUENAS", "HECTOR PAUL CRUZ", "JOSE ROBINSON PRECIADO"],
        "EDAD": [71, 39, 52],
        "PLAN": [1, 1, 1],
        "VALOR ASEGURADO": ["$ 55,000,000", "$ 200,000,000", "$ 85,000,000"],
        "PRIMA ANUAL": ["$ 354,310", "$ 920,200", "$ 391,085"],
        "EXTRAPRIMA": ["$ 0", "$ 0", "$ 0"],
        "PRIMA COBRO": ["$ 72,447", "$ 72,447", "$ 72,447"]
    }
    df = pd.DataFrame(data)
    df_result = normalizar_df(df)
    
    rows = df_result.to_dict(orient="records")
    assert len(rows) == 3
    
    # Registro 1 (D)
    assert rows[0]["cedula"] == "59661342"
    assert rows[0]["tipo"] == "D"
    assert rows[0]["cert"] == "2"
    
    # Registro 2 (D, con ID y Nombre reemplazados)
    assert rows[1]["cedula"] == "66903320"  # Reemplazo de 1116235786
    assert rows[1]["nombre_asociado"] == "TORRES AGUDELO MARIBEL"  # Reemplazo de HECTOR PAUL CRUZ + formato
    assert rows[1]["tipo"] == "D"
    assert rows[1]["cert"] == "2"
    
    # Registro 3 (P, Titular)
    assert rows[2]["cedula"] == "94416010"
    assert rows[2]["tipo"] == "P"
    assert rows[2]["cert"] == "2"

def test_hdi_extractor_calculations():
    # CERT 2 tiene 3 miembros:
    # 1. Jose (P, prima_anual=391085)
    # 2. Feliza (D, prima_anual=354310)
    # 3. Maribel (D, prima_anual=920200)
    import io
    data = {
        "CERT": ["2", "2", "2"],
        "NOV": ["CAR", "CAR", "CAR"],
        "TIPO": ["D", "D", "P"],
        "IDENTIFICACION": ["59661342", "1116235786", "94416010"],
        "NOMBRES Y APELLIDOS": ["FELIZA DUENAS", "HECTOR PAUL CRUZ", "JOSE ROBINSON PRECIADO"],
        "EDAD": [71, 39, 52],
        "PLAN": [1, 1, 1],
        "VALOR ASEGURADO": ["$ 55,000,000", "$ 200,000,000", "$ 85,000,000"],
        "PRIMA ANUAL": ["$ 354,310", "$ 920,200", "$ 391,085"],
        "EXTRAPRIMA": ["$ 0", "$ 0", "$ 0"],
        "PRIMA COBRO": ["$ 72,447", "$ 72,447", "$ 72,447"]
    }
    df = pd.DataFrame(data)
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    
    rows, summary, warnings = extraer_hdi([excel_buffer.getvalue()])
        
    # Debe consolidarse bajo la cédula del titular
    assert len(rows) == 1
    res = rows[0]
    
    assert res["cedula"] == "94416010"
    assert res["nombre_asociado"] == "ROBINSON PRECIADO JOSE"
    assert res["valor_rdc"] == 7821.70
    assert res["valor_colaborador"] == 130977.89
    assert res["valor"] == 138799.59


def test_hdi_excel_extractor():
    """Prueba que extraer_hdi procese correctamente un archivo binario de Excel (.xlsx)."""
    import io
    data = {
        "CERT": ["10", "10"],
        "TIPO": ["P", "D"],
        "IDENTIFICACION": ["94416010", "59661342"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO", "FELIZA DUENAS"],
        "PRIMA ANUAL": ["$ 391,085", "$ 354,310"]
    }
    df = pd.DataFrame(data)

    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="HDI_HOJA1")

    excel_bytes = excel_buffer.getvalue()

    rows, summary, warnings = extraer_hdi([excel_bytes])

    assert len(rows) == 1
    res = rows[0]
    assert res["cedula"] == "94416010"
    assert res["nombre_asociado"] == "ROBINSON PRECIADO JOSE"
    assert summary["archivos_procesados"] == 1
    assert summary["total_asociados"] == 1


def test_hdi_tipo_invalido_omitido():
    """Un TIPO inválido debe cancelar la extracción completa."""
    warnings_out = []
    data = {
        "CERT": [1, 2],
        "TIPO": ["X", None],  # Ambas son inválidas
        "IDENTIFICACION": ["94416010", "59661342"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO", "FELIZA DUENAS"],
        "PRIMA ANUAL": ["$ 391,085", "$ 354,310"]
    }
    df = pd.DataFrame(data)
    with pytest.raises(ValueError, match="TIPO.*P o D"):
        normalizar_df(df, warnings_out=warnings_out)


@pytest.mark.parametrize(
    "columna_faltante",
    ["CERT", "TIPO", "IDENTIFICACION", "NOMBRES Y APELLIDOS", "PRIMA ANUAL"],
)
def test_hdi_rechaza_cualquier_columna_obligatoria_faltante(columna_faltante):
    data = {
        "CERT": ["10"],
        "TIPO": ["P"],
        "IDENTIFICACION": ["94416010"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO"],
        "PRIMA ANUAL": ["391.085,00"],
    }
    data.pop(columna_faltante)

    with pytest.raises(ValueError, match="columnas obligatorias"):
        normalizar_df(pd.DataFrame(data))


def test_hdi_rechaza_columna_obligatoria_duplicada():
    df = pd.DataFrame([
        ["10", "P", "94416010", "JOSE ROBINSON PRECIADO", "391.085,00", "1"],
    ])
    df.columns = [
        "CERT", "TIPO", "IDENTIFICACION", "NOMBRES Y APELLIDOS",
        "PRIMA ANUAL", "PRIMA ANUAL",
    ]

    with pytest.raises(ValueError, match="duplicada"):
        normalizar_df(df)


@pytest.mark.parametrize(
    ("campo", "valor", "mensaje"),
    [
        ("CERT", "", "CERT"),
        ("IDENTIFICACION", "abc", "IDENTIFICACION"),
        ("NOMBRES Y APELLIDOS", "", "NOMBRES Y APELLIDOS"),
        ("PRIMA ANUAL", "valor-invalido", "PRIMA ANUAL"),
    ],
)
def test_hdi_rechaza_archivo_completo_si_una_fila_es_invalida(campo, valor, mensaje):
    data = {
        "CERT": ["10", "11"],
        "TIPO": ["P", "P"],
        "IDENTIFICACION": ["94416010", "59661342"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO", "FELIZA DUENAS"],
        "PRIMA ANUAL": ["391.085,00", "354.310,00"],
    }
    data[campo][1] = valor

    with pytest.raises(ValueError, match=mensaje):
        normalizar_df(pd.DataFrame(data), sheet_name="HDI", first_data_row=2)


@pytest.mark.parametrize("nombre", [12345, True, 12.5])
def test_hdi_rechaza_nombre_que_no_sea_texto(nombre):
    data = {
        "CERT": ["10"],
        "TIPO": ["P"],
        "IDENTIFICACION": ["94416010"],
        "NOMBRES Y APELLIDOS": [nombre],
        "PRIMA ANUAL": ["391.085,00"],
    }

    with pytest.raises(ValueError, match="NOMBRES Y APELLIDOS.*texto"):
        normalizar_df(pd.DataFrame(data), sheet_name="HDI")


@pytest.mark.parametrize(
    "prima",
    ["COP 391.085,00", "abc123", "12.34.56", True],
)
def test_hdi_rechaza_prima_malformada_aunque_contenga_digitos(prima):
    data = {
        "CERT": ["10"],
        "TIPO": ["P"],
        "IDENTIFICACION": ["94416010"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO"],
        "PRIMA ANUAL": [prima],
    }

    with pytest.raises(ValueError, match="PRIMA ANUAL"):
        normalizar_df(pd.DataFrame(data), sheet_name="HDI")


@pytest.mark.parametrize("tipos", [["D", "D"], ["P", "P"]])
def test_hdi_exige_un_titular_por_certificado(tipos):
    """Cada CERT debe tener exactamente un titular para calcular el subsidio."""
    import io

    data = {
        "CERT": ["10", "10"],
        "TIPO": tipos,
        "IDENTIFICACION": ["94416010", "59661342"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO", "FELIZA DUENAS"],
        "PRIMA ANUAL": ["391.085,00", "354.310,00"],
    }
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        pd.DataFrame(data).to_excel(writer, index=False)

    with pytest.raises(ValueError, match="exactamente un Titular"):
        extraer_hdi([output.getvalue()])


def test_hdi_aisla_certificado_igual_entre_hojas():
    """Un CERT repetido en hojas distintas no debe mezclar titulares."""
    import io
    data_hoja1 = {
        "CERT": ["10"], "TIPO": ["P"], "IDENTIFICACION": ["94416010"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO"], "PRIMA ANUAL": ["$ 391,085"]
    }
    data_hoja2 = {
        "CERT": ["10"], "TIPO": ["P"], "IDENTIFICACION": ["59661342"],
        "NOMBRES Y APELLIDOS": ["FELIZA DUENAS"], "PRIMA ANUAL": ["$ 354.310"]
    }

    buf1 = io.BytesIO()
    with pd.ExcelWriter(buf1, engine="openpyxl") as w1:
        pd.DataFrame(data_hoja1).to_excel(w1, index=False, sheet_name="PLAN_A")
        pd.DataFrame(data_hoja2).to_excel(w1, index=False, sheet_name="PLAN_B")

    rows, summary, warnings = extraer_hdi([buf1.getvalue()])

    assert summary["archivos_procesados"] == 1
    assert summary["total_asociados"] == 2
    assert len(rows) == 2


def test_hdi_row_header_offset():
    """Verifica que el extractor encuentre los encabezados HDI cuando están desplazados varias filas (skiprows 1..5)."""
    import io
    # Encabezados vacíos o irrelevantes en filas 0 y 1
    data_matrix = [
        ["REFRIDCOL S.A.", "", "", "", ""],
        ["REPORTE MENSUAL SEGUROS HDI", "", "", "", ""],
        ["CERT", "TIPO", "IDENTIFICACION", "NOMBRES Y APELLIDOS", "PRIMA ANUAL"],
        ["10", "P", "94416010", "JOSE ROBINSON PRECIADO", "$ 391.085,00"]
    ]
    df_raw = pd.DataFrame(data_matrix)

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        df_raw.to_excel(w, index=False, header=False)

    rows, summary, warnings = extraer_hdi([buf.getvalue()])

    assert len(rows) == 1
    assert rows[0]["cedula"] == "94416010"
    assert rows[0]["valor"] > 0


def test_hdi_corrupt_or_empty_excel():
    """Un archivo corrupto debe cancelar el lote en lugar de producir éxito vacío."""
    corrupt_bytes = b"ESTO_NO_ES_UN_EXCEL_VALIDO_12345"
    with pytest.raises(ValueError, match="format cannot be determined"):
        extraer_hdi([corrupt_bytes])


def test_hdi_cop_currency_formatting():
    """Prueba la extracción precisa de valores en formato COP complejo (puntos de miles y comas decimales)."""
    import io
    data = {
        "CERT": ["1", "2"],
        "TIPO": ["P", "P"],
        "IDENTIFICACION": ["94416010", "59661342"],
        "NOMBRES Y APELLIDOS": ["JOSE ROBINSON PRECIADO", "FELIZA DUENAS"],
        "PRIMA ANUAL": ["1.234.567,89", "391.085,00"]
    }
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        pd.DataFrame(data).to_excel(w, index=False)

    rows, summary, warnings = extraer_hdi([buf.getvalue()])
    assert len(rows) == 2
    cedulas = {r["cedula"]: r for r in rows}

    # 1.234.567,89 / 12 = 102880.6575 -> 24% subsidio RDC = 24691.36
    assert cedulas["94416010"]["valor"] > 100000
    # 391.085,00 / 12 = 32590.416 -> 24% subsidio RDC = 7821.70
    assert cedulas["59661342"]["valor_rdc"] == 7821.70


@pytest.mark.parametrize("filename", ["factura.pdf", "factura.xlsx"])
def test_hdi_api_pdf_rejected_415(filename):
    """La API rechaza un PDF incluso si se disfraza con extensión .xlsx."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.rate_limiter import limiter

    limiter.enabled = False
    client = TestClient(app)
    # PDF Magic bytes b"%PDF-1.4..."
    pdf_content = b"%PDF-1.4 contenido de prueba pdf"

    # Mock de autenticación/dependencias para simular permisos
    from app.api.novedades_nomina.dependencies import requiere_permiso_nomina_novedades
    app.dependency_overrides[requiere_permiso_nomina_novedades] = lambda: {"sub": "test_user"}

    try:
        response = client.post(
            "/api/v2/novedades-nomina/hdi/preview",
            data={"mes": 7, "anio": 2026},
            files=[("files", (filename, pdf_content, "application/pdf"))]
        )
        assert response.status_code == 415
        detail = response.json()["detail"]
        assert "Excel" in detail or "coincide" in detail
    finally:
        limiter.enabled = True
        app.dependency_overrides.clear()


def test_hdi_api_data_preservation_on_empty_extraction():
    """Verifica que una extracción vacía o fallida eleve HTTP 400 sin borrar los datos existentes en la BD."""
    import pytest
    from fastapi import HTTPException
    from unittest.mock import AsyncMock
    from app.services.novedades_nomina.nomina_service import NominaService

    mock_session = AsyncMock()
    mock_db_erp = AsyncMock()

    import io
    import zipfile

    contenido = io.BytesIO()
    with zipfile.ZipFile(contenido, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("xl/workbook.xml", "<workbook />")

    mock_file = AsyncMock()
    mock_file.read = AsyncMock(return_value=contenido.getvalue())
    mock_file.filename = "test.xlsx"
    mock_file.content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    # Función extractora que devuelve 0 filas
    mock_extractor_vacio = lambda files: ([], {"total_asociados": 0}, ["Advertencia: 0 filas"])

    with pytest.raises(HTTPException) as exc_info:
        import asyncio
        asyncio.run(NominaService.procesar_flujo(
            session=mock_session,
            db_erp=mock_db_erp,
            files=[mock_file],
            categoria="OTROS",
            subcategoria="SEGUROS HDI",
            extractor_fn=mock_extractor_vacio,
            extension="xlsx",
            mes=7,
            anio=2026
        ))

    assert exc_info.value.status_code == 400
    assert "No se pudieron extraer registros válidos" in exc_info.value.detail
    # Verificar que mock_session.execute (que ejecuta el delete de registros) NUNCA se invocó
    assert mock_session.execute.call_count == 0
