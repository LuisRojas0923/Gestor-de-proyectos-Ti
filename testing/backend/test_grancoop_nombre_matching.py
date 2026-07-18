import pytest
from unittest.mock import patch, MagicMock
from app.services.novedades_nomina.nomina_helper import NominaHelper
from app.services.novedades_nomina.grancoop_extractor import extraer_grancoop

def test_normalizacion_y_matching_nombres():
    """
    Valida que la normalización y comparación por tokens ignore
    el orden de las palabras, tildes, la eñe y variaciones tipográficas leves.
    """
    # 1. Probar normalización
    assert NominaHelper.normalizar_nombre("SEBASTIAN VILLAFAÑE GARCIA") == "SEBASTIAN VILLAFANE GARCIA"
    assert NominaHelper.normalizar_nombre("  Sebastián  Villafañe   García  ") == "SEBASTIAN VILLAFANE GARCIA"

    # 2. Probar matching por conjunto de tokens con variaciones
    lista_empleados = [
        {"nrocedula": "1026100035", "nombre": "SEBASTIAN VILLAFAÑE GARCIA", "estado": "Activo"},
        {"nrocedula": "987654321", "nombre": "JUAN PEREZ SANDOVAL", "estado": "Activo"}
    ]

    # Orden diferente, sin Ñ, con un error leve de digitación ("GARCUA" vs "GARCIA")
    # Tokens buscado: {'VILLAFANE', 'GARCUA', 'SEBASTIAN'}
    # Tokens ERP: {'SEBASTIAN', 'VILLAFANE', 'GARCIA'}
    # Intersección: {'SEBASTIAN', 'VILLAFANE'} (2 de 3 tokens, ratio = 66.7%)
    cedula_resuelta = NominaHelper.buscar_cedula_por_nombre("VILLAFANE GARCUA SEBASTIAN", lista_empleados)
    assert cedula_resuelta == "1026100035"

    # Caso en que no coincide lo suficiente
    cedula_fallida = NominaHelper.buscar_cedula_por_nombre("VILLAFANE RAMIREZ SEBASTIAN", lista_empleados)
    assert cedula_fallida is None

@patch("pdfplumber.open")
def test_grancoop_extractor_sin_cedula(mock_open):
    """
    Valida que el extractor de Grancoop no descarte a los asociados que no tienen
    el renglón 'OBLIGACION ESTATUTARIA' (cédula), sino que retorne cedula = ""
    para que la capa superior los resuelva por nombre.
    """
    # Simular estructura de páginas de pdfplumber
    mock_pdf = MagicMock()
    mock_page = MagicMock()

    # Texto simulado del PDF con un empleado con cédula y otro sin ella
    texto_pdf = (
        "Asociado : AGUDELO FRANCO OSCAR ALFONSO\n"
        "Documento\n"
        "10 251000836 CREDIAPORTES Capital 42.288 Interes 2.137 Mora 0 Vida 95 Patri 0 Capz 0 Otros 0 Gastos 0 Aporte 0 Totales 44.520\n"
        "206 14637404 OBLIGACION ESTATUTARIA Capital 0 Interes 0 Mora 0 Vida 0 Patri 0 Capz 0 Otros 0 Gastos 0 Aporte 58.500 Totales 58.500\n"
        "Totales : Capital 42.288 Interes 2.137 Mora 0 Vida 95 Patri 0 Capz 0 Otros 0 Gastos 0 Aporte 58.500 Totales 103.020\n"
        "\n"
        "Asociado : VILLAFANE GARCUA SEBASTIAN\n"
        "Documento\n"
        "10 261000353 LIBRE INVERSION Capital 160.994 Interes 206.400 Mora 0 Vida 5.280 Patri 0 Capz 0 Otros 0 Gastos 0 Aporte 0 Totales 372.674\n"
        "Totales : Capital 160.994 Interes 206.400 Mora 0 Vida 5.280 Patri 0 Capz 0 Otros 0 Gastos 0 Aporte 0 Totales 372.674\n"
    )

    mock_page.extract_text.return_value = texto_pdf
    mock_pdf.pages = [mock_page]
    mock_open.return_value.__enter__.return_value = mock_pdf

    # Ejecutar extractor
    rows, summary, warnings = extraer_grancoop([b"fake pdf content"])

    # Validar
    assert len(rows) > 0
    
    # Empleado 1: Con cédula extraída
    row_agudelo = [r for r in rows if r["nombre_asociado"] == "AGUDELO FRANCO OSCAR ALFONSO"]
    assert len(row_agudelo) > 0
    assert row_agudelo[0]["cedula"] == "14637404"
    
    # Empleado 2: Cédula vacía (para resolver por nombre)
    row_villafane = [r for r in rows if r["nombre_asociado"] == "VILLAFANE GARCUA SEBASTIAN"]
    assert len(row_villafane) > 0
    assert row_villafane[0]["cedula"] == ""
    
    # Validar que se registró la advertencia informativa de la cédula no detectada
    assert any("Cédula no detectada" in w for w in warnings)

@patch("pdfplumber.open")
def test_grancoop_separa_crediprima_y_recalcula(mock_open):
    """
    Valida que CREDIPRIMA se separe de adicionales y que el total del PDF
    no se sume dos veces.
    """
    mock_pdf = MagicMock()
    mock_page = MagicMock()
    texto_pdf = (
        "Asociado : BOBADILLA PRADA KAROL VIVIAM\n"
        "Documento\n"
        "10 261000092 CREDIPRIMA 0 0 0 1,937 0 0 1,174,879 0 0 1,176,816\n"
        "38 261002174 FONDO MUTUAL 0 0 0 0 0 0 58,200 0 0 58,200\n"
        "Totales : 0 0 0 1,937 0 0 ********** 0 0 1,235,016\n"
    )
    mock_page.extract_text.return_value = texto_pdf
    mock_pdf.pages = [mock_page]
    mock_open.return_value.__enter__.return_value = mock_pdf

    rows, summary, warnings = extraer_grancoop([b"fake pdf content"])

    rows_bobadilla = [r for r in rows if r["nombre_asociado"] == "BOBADILLA PRADA KAROL VIVIAM"]
    conceptos = {row["concepto"]: row["valor"] for row in rows_bobadilla}

    assert conceptos == {
        "GRANCOOP ADICIONALES": 58200,
        "GRANCOOP PRIMA": 1176816,
    }
    assert summary["total_valor"] == 1235016


@patch("pdfplumber.open")
def test_grancoop_nompri_clasifica_fondo_mutual_como_prima(mock_open):
    mock_pdf = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = (
        "Asociado : BOBADILLA PRADA KAROL VIVIAM\n"
        "Documento\n"
        "206 12345678 OBLIGACION ESTATUTARIA 0 0 0 0 0 0 0 0 0 0\n"
        "10 261000092 CREDIPRIMA 0 0 0 1,937 0 0 1,174,879 0 0 1,176,816\n"
        "38 261002174 FONDO MUTUAL 0 0 0 0 0 0 58,200 0 0 58,200\n"
        "Totales : 0 0 0 1,937 0 0 1,233,079 0 0 1,235,016\n"
    )
    mock_pdf.pages = [mock_page]
    mock_open.return_value.__enter__.return_value = mock_pdf

    rows, summary, warnings = extraer_grancoop(
        [b"fake pdf content"], ["nompri_junio.pdf"]
    )

    assert warnings == []
    assert [(row["concepto"], row["valor"]) for row in rows] == [
        ("GRANCOOP PRIMA", 1235016)
    ]
    assert summary["total_valor"] == 1235016


@pytest.mark.parametrize(
    "nombres",
    [[None], [""], ["uno.pdf", "dos.pdf"]],
)
def test_grancoop_rechaza_nombres_ausentes_o_desalineados(nombres):
    with pytest.raises(ValueError, match="nombres"):
        extraer_grancoop([b"fake pdf content"], nombres)


@patch("pdfplumber.open")
def test_grancoop_nompri_debe_ser_token_del_nombre(mock_open):
    mock_pdf = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = (
        "Asociado : PERSONA PRUEBA\n"
        "Documento\n"
        "38 261002174 FONDO MUTUAL 0 0 0 0 0 0 58,200 0 0 58,200\n"
        "Totales : 0 0 0 0 0 0 58,200 0 0 58,200\n"
    )
    mock_pdf.pages = [mock_page]
    mock_open.return_value.__enter__.return_value = mock_pdf

    rows, _, _ = extraer_grancoop([b"fake"], ["archivo_XNOMPRIX.pdf"])

    assert [(row["concepto"], row["valor"]) for row in rows] == [
        ("GRANCOOP ADICIONALES", 58200)
    ]


@patch("pdfplumber.open")
def test_grancoop_rechaza_pdf_con_demasiadas_paginas(mock_open):
    mock_pdf = MagicMock()
    mock_pdf.pages = [MagicMock() for _ in range(501)]
    mock_open.return_value.__enter__.return_value = mock_pdf

    with pytest.raises(ValueError, match="páginas"):
        extraer_grancoop([b"fake"], ["archivo.pdf"])


@patch("pdfplumber.open")
@patch(
    "app.services.novedades_nomina.grancoop_extractor.MAX_CARACTERES_PDF",
    10,
)
def test_grancoop_rechaza_pdf_con_demasiado_texto(mock_open):
    mock_pdf = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "x" * 11
    mock_pdf.pages = [mock_page]
    mock_open.return_value.__enter__.return_value = mock_pdf

    with pytest.raises(ValueError, match="texto"):
        extraer_grancoop([b"fake"], ["archivo.pdf"])
