
import io
import msoffcrypto
import pandas as pd

def test_msoffcrypto():
    print("Testing msoffcrypto performance...")
    # Crear un excel normal
    output = io.BytesIO()
    df = pd.DataFrame({'A': range(1000), 'B': range(1000)})
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    
    content = output.getvalue()
    print(f"File size: {len(content)} bytes")
    
    # Intentar detectar si esta encriptado (no lo esta)
    handle = io.BytesIO(content)
    try:
        office_file = msoffcrypto.OfficeFile(handle)
        print(f"Is encrypted: {office_file.is_encrypted()}")
    except Exception as e:
        print(f"Error detecting encryption: {e}")

if __name__ == "__main__":
    test_msoffcrypto()
