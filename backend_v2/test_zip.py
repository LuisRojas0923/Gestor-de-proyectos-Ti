import asyncio
import os
import io

class MockUploadFile:
    def __init__(self, filename, content):
        self.filename = filename
        self._content = content
    
    async def read(self):
        return self._content

async def test_zip():
    from app.services.novedades_nomina.nomina_service import NominaService
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    import tempfile

    # Mock DB
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    file1 = MockUploadFile("file1.txt", b"Hello")
    file2 = MockUploadFile("file2.txt", b"World")

    # Mock extractor
    def mock_extractor(binarios):
        return [], {"total": 0}, []

    try:
        async with SessionLocal() as session:
            # Note: We won't actually execute NominaService.procesar_flujo fully because it touches DB schemas 
            # that might not exist in sqlite memory. We just want to test the ZIP logic.
            # I will just write the zip logic here to verify zipfile syntax.
            files = [file1, file2]
            archivos_binarios = []
            original_filenames = []
            for f in files:
                content = await f.read()
                archivos_binarios.append(content)
                original_filenames.append(getattr(f, "filename", "archivo"))

            import zipfile
            import hashlib
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                for filename, content in zip(original_filenames, archivos_binarios):
                    zf.writestr(filename, content)
            
            contenido_zip = zip_buffer.getvalue()
            hash_str = hashlib.md5(contenido_zip).hexdigest()
            
            print(f"Zip created successfully. Size: {len(contenido_zip)} bytes")
            print(f"Hash: {hash_str}")
            
            # verify zip contents
            z = zipfile.ZipFile(io.BytesIO(contenido_zip))
            print("Files in zip:", z.namelist())
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_zip())
