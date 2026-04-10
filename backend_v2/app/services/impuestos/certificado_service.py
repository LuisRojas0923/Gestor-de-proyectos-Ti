import os
from datetime import datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from io import BytesIO
from pypdf import PdfReader, PdfWriter
from app.models.impuestos.formato_2276 import Formato2276


class CertificadoService:
    # Ruta de la plantilla oficial
    TEMPLATE_PATH = os.path.join(
        os.path.dirname(__file__), "../../resources/templates/form_220_2024.pdf"
    )

    @staticmethod
    def generate_pdf_220(data: Formato2276) -> BytesIO:
        """Genera el PDF del Formato 220 sobre la plantilla oficial de la DIAN"""

        # 1. Crear la capa de datos con ReportLab
        data_layer_buffer = BytesIO()
        c = canvas.Canvas(data_layer_buffer, pagesize=LETTER)

        # Configuración de fuente estándar para formularios
        c.setFont("Helvetica", 9)

        # --- AÑO GRAVABLE ---
        c.drawString(310, 738, str(data.ano_gravable))

        # --- DATOS DEL RETENEDOR (EMPRESA) ---
        # Box 5: NIT, Box 6: DV, Box 12: Razón Social (REFRIDCOL S.A.)
        c.drawString(40, 685, "805005717")  # NIT
        c.drawString(190, 685, "5")  # DV
        c.drawString(90, 675, "INDUSTRIAS REFRIDCOL S.A.S.")

        # --- DATOS DEL TRABAJADOR ---
        c.drawString(50, 650, str(data.tdocb))  # Box 24: Tipo Doc
        c.drawString(85, 650, str(data.nitb))  # Box 25: NIT
        # --Nombres y apellidos del trabajador--
        c.drawString(
            235, 650, (data.pap or "").upper()
        )  # Box 26: 1er Apellido (TEST COORDS)
        c.drawString(325, 650, (data.sap or "").upper())  # Box 27: 2do Apellido
        c.drawString(415, 650, (data.pno or "").upper())  # Box 28: 1er Nombre
        c.drawString(515, 650, (data.ono or "").upper())  # Box 29: Otros nombres

        # --- PERÍODO Y LUGAR (Boxes 30-35) ---
        y_p = 626

        # Casilla 30. PERIODO DE: (AAAA | MM | DD)
        c.drawString(50, y_p, str(data.ano_gravable))  # 30: Año
        c.drawString(90, y_p, "01")  # 30: Mes (Enero)
        c.drawString(120, y_p, "01")  # 30: Día (1)

        # Casilla 31. PERIODO A: (AAAA | MM | DD)
        c.drawString(170, y_p, str(data.ano_gravable))  # 31: Año
        c.drawString(200, y_p, "12")  # 31: Mes (Diciembre)
        c.drawString(230, y_p, "31")  # 31: Día (31)

        # Casilla 32. FECHA DE EXPEDICIÓN (AAAA | MM | DD)
        today = datetime.now()
        c.drawString(270, y_p, str(today.year))  # 32: Año Actual
        c.drawString(300, y_p, f"{today.month:02d}")  # 32: Mes Actual
        c.drawString(320, y_p, f"{today.day:02d}")  # 32: Día Actual

        # Casillas 33, 34, 35. LUGAR DE EXPEDICIÓN
        c.setFont("Helvetica", 7)
        c.drawString(350, y_p, "VALLE DEL CAUCA / YUMBO")  # 33: Ciudad/Depto
        c.setFont("Helvetica", 9)
        c.drawString(520, y_p, "76")  # 34: Cód. Depto
        c.drawString(550, y_p, "892")  # 35: Cód. Municipio

        # --- CONCEPTOS DE INGRESOS (CASILLAS 36 - 52) ---
        def draw_value(y_coord: float, val: float):
            if not val or val == 0:
                return
            formatted_val = f"{val:,.0f}".replace(",", ".")
            c.drawRightString(585, y_coord, formatted_val)

        # Sección 1: Ingresos Brutos
        draw_value(602.40, data.pasa)  # 36: Salarios
        draw_value(590.40, data.pabop)  # 37: Bonos/Tarjetas
        draw_value(578.40, data.vaex)  # 38: Exceso alimentación
        draw_value(
            566.41, (data.paho or 0) + (data.paec or 0)
        )  # 39: Honorarios + Emolumentos
        draw_value(554.41, data.pase)  # 40: Servicios
        draw_value(542.41, data.paco)  # 41: Comisiones
        draw_value(530.41, data.papre)  # 42: Prestaciones sociales
        draw_value(518.41, data.pavia)  # 43: Viáticos
        draw_value(506.41, data.paga)  # 44: Gastos de representación
        draw_value(494.42, data.patra)  # 45: Trabajo asociado cooperativo
        draw_value(482.42, data.potro)  # 46: Otros pagos
        draw_value(470.42, data.cein)  # 47: Cesantías e intereses (pagadas)
        draw_value(458.42, data.auce)  # 48: Cesantías (régimen tradicional)
        draw_value(446.82, data.ceco)  # 49: Censantias pagadas al fondo de cesantias
        # 50: Otras pensiones (no mapeado en modelo aún)
        draw_value(422.83, data.vapo)  # 51: Apoyos económicos educativos
        draw_value(410.83, data.tingbtp)  # 52: TOTAL INGRESOS BRUTOS

        # --- APORTES Y RETENCIONES (CASILLAS 53 - 60) ---
        draw_value(386.33, data.apos)  # 53: Salud
        draw_value(374.83, data.apof)  # 54: Pensión y FSP
        draw_value(363.23, data.apov)  # 55: Voluntarios Pensión (126-1)
        draw_value(351.63, data.aprais)  # 56: Voluntarios RAIS (126-4)
        draw_value(340.03, data.apafc)  # 57: AFC
        draw_value(328.03, data.apavc)  # 58: AVC
        draw_value(316.03, data.vare)  # 59: Retenciones fuente
        draw_value(304.04, data.vilap)  # 60: Ingreso laboral promedio

        c.save()
        data_layer_buffer.seek(0)

        # 2. Fusionar con la plantilla oficial usando PyPDF
        if not os.path.exists(CertificadoService.TEMPLATE_PATH):
            raise FileNotFoundError(
                f"No se encontró la plantilla oficial en: {CertificadoService.TEMPLATE_PATH}"
            )

        template_pdf = PdfReader(CertificadoService.TEMPLATE_PATH)
        data_pdf = PdfReader(data_layer_buffer)

        output = PdfWriter()
        page = template_pdf.pages[0]
        # Superponer la capa de datos sobre la plantilla
        page.merge_page(data_pdf.pages[0])
        output.add_page(page)

        final_buffer = BytesIO()
        output.write(final_buffer)
        final_buffer.seek(0)

        return final_buffer
