import os
import sys
from io import BytesIO

# Add the app directory to sys.path
sys.path.append(os.getcwd())

from app.services.impuestos.certificado_service import CertificadoService
from app.models.impuestos.formato_2276 import Formato2276

def test_gen():
    mock_data = Formato2276(
        ano_gravable=2024,
        tdocb=13,
        nitb="10025741",
        pno="JUAN",
        ono="SEBASTIAN",
        pap="PEREZ",
        sap="GARCIA",
        pasa=50000000,
        papre=5000000,
        paho=0,
        potro=1000000,
        cein=2500000,
        apos=2000000,
        apof=2000000,
        vare=4500000,
        tingbtp=56000000,
        user_id="test_user"
    )
    
    # MockingTEMPLATE_PATH because we are running from root
    CertificadoService.TEMPLATE_PATH = "app/resources/templates/form_220_2024.pdf"
    
    try:
        pdf_buffer = CertificadoService.generate_pdf_220(mock_data)
        with open("scratch/test_220_output.pdf", "wb") as f:
            f.write(pdf_buffer.getvalue())
        print("PDF generated successfully at scratch/test_220_output.pdf")
    except Exception as e:
        print(f"Error generating PDF: {e}")

if __name__ == "__main__":
    test_gen()
