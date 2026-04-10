from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.api.auth.profile_router import obtener_usuario_actual_db
from app.services.impuestos.exogena_service import ExogenaService
from app.services.impuestos.certificado_service import CertificadoService
from app.models.impuestos.formato_2276 import Formato2276

router = APIRouter(prefix="/impuestos", tags=["Impuestos"])

@router.get("/template")
async def descargar_plantilla():
    """Descarga el Excel en blanco con encabezados para el 2276"""
    buffer = ExogenaService.get_template()
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Plantilla_2276.xlsx"}
    )

@router.post("/upload")
async def cargar_2276(
    ano_gravable: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Carga masiva de datos desde Excel (Solo rol contabilidad o admin)"""
    if usuario.rol not in ["contabilidad", "admin", "admin_sistemas"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para cargar información exógena")
    
    content = await file.read()
    registros = await ExogenaService.import_2276(db, content, ano_gravable, usuario.id)
    return {"message": f"Se cargaron {registros} registros exitosamente", "ano": ano_gravable}

@router.get("/certificados/años")
async def listar_años_disponibles(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Lista los años disponibles para el usuario actual"""
    try:
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar años: {str(e)}")

@router.get("/certificado-220/{ano}")
async def descargar_pdf_220(
    ano: int,
    cedula_target: str = None, # Solo para contabilidad/admin
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Genera y descarga el PDF del formato 220"""
    # Lógica de seguridad: Si no es admin/contabilidad, solo puede ver su propia cédula
    cedula_a_buscar = usuario.cedula
    if cedula_target and usuario.rol in ["contabilidad", "admin", "admin_sistemas"]:
        cedula_a_buscar = cedula_target

    try:
        result = await db.execute(query)
        registro = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al recuperar datos del certificado: {str(e)}")

    if not registro:
        raise HTTPException(status_code=404, detail="No se encontró información para el año y documento especificado")

    pdf_buffer = CertificadoService.generate_pdf_220(registro)
    
    filename = f"Formato_220_{ano}_{cedula_a_buscar}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/admin/registros")
async def listar_todas_las_cargas(
    ano: int = None,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db)
):
    """Muestra todos los registros cargados (Solo contabilidad)"""
    if usuario.rol not in ["contabilidad", "admin", "admin_sistemas"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    return await ExogenaService.get_records(db, ano)
