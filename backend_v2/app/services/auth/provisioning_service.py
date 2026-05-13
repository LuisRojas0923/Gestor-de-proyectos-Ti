"""
Servicio de aprovisionamiento de usuarios desde ERP - Backend V2 (Async + SQLModel)
"""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import config
from app.models.auth.usuario import Usuario
from app.services.erp import EmpleadosService


async def crear_analista_desde_erp(
    db: AsyncSession, db_erp, cedula: str
) -> Usuario:
    """Consulta al ERP y crea un usuario analista si existe (Async)."""
    from .servicio import ServicioAuth

    # 1. Validar si ya existe
    usuario_existente = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if usuario_existente:
        raise ValueError("El usuario ya existe en el sistema")

    # 2. Consultar ERP
    datos_erp = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula)
    if not datos_erp:
        raise ValueError("No se encontro el empleado en Solid ERP o esta inactivo")

    # 3. Crear usuario
    id_usuario = f"USR-{cedula}"
    hash_pwd = ServicioAuth.obtener_hash_contrasena(cedula)
    correo_erp = (
        datos_erp.get("correocorporativo").strip()
        if datos_erp.get("correocorporativo")
        else None
    )

    nuevo_usuario = Usuario(
        id=id_usuario,
        cedula=cedula,
        nombre=datos_erp["nombre"],
        correo=correo_erp,
        hash_contrasena=hash_pwd,
        rol="analyst",
        esta_activo=True,
        area=datos_erp.get("area"),
        cargo=datos_erp.get("cargo"),
        sede=datos_erp.get("ciudadcontratacion"),
        centrocosto=datos_erp.get("centrocosto"),
        viaticante=datos_erp.get("viaticante"),
        baseviaticos=datos_erp.get("baseviaticos"),
        correo_actualizado=bool(correo_erp),
        correo_verificado=False,
    )

    db.add(nuevo_usuario)
    await db.commit()
    await db.refresh(nuevo_usuario)

    # 4. Notificar bienvenida/seguridad
    if correo_erp:
        from app.services.notifications.email_service import EmailService
        import asyncio

        asyncio.create_task(
            asyncio.to_thread(
                EmailService.enviar_notificacion_reseteo_clave,
                correo_erp,
                nuevo_usuario.nombre,
            )
        )

    return nuevo_usuario


async def crear_usuario_portal_desde_erp(
    db: AsyncSession, db_erp, cedula: str, contrasena: str
) -> Usuario:
    """Crea un usuario con rol 'usuario' validando contra Solid ERP (para segundo factor)."""
    from .servicio import ServicioAuth

    usuario_existente = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if usuario_existente:
        raise ValueError("El usuario ya tiene una contraseña configurada")

    datos_erp = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula)
    if not datos_erp:
        raise ValueError("No se encontro el empleado en Solid ERP")

    id_usuario = f"USR-P-{cedula}"
    hash_pwd = ServicioAuth.obtener_hash_contrasena(contrasena)

    viaticante_val = bool(datos_erp.get("viaticante"))
    nuevo_usuario = Usuario(
        id=id_usuario,
        cedula=cedula,
        nombre=datos_erp["nombre"],
        hash_contrasena=hash_pwd,
        rol="viaticante" if viaticante_val else "usuario",
        esta_activo=True,
        area=datos_erp.get("area"),
        cargo=datos_erp.get("cargo"),
        sede=datos_erp.get("ciudadcontratacion"),
        centrocosto=datos_erp.get("centrocosto"),
        viaticante=viaticante_val,
        baseviaticos=datos_erp.get("baseviaticos"),
        correo=datos_erp.get("correocorporativo").strip()
        if datos_erp.get("correocorporativo")
        else None,
        correo_actualizado=bool(datos_erp.get("correocorporativo")),
        correo_verificado=False,
    )

    db.add(nuevo_usuario)
    await db.commit()
    await db.refresh(nuevo_usuario)
    return nuevo_usuario


async def auto_provisionar_usuario_portal(
    db: AsyncSession, db_erp, cedula: str, datos_erp: dict
) -> Usuario:
    """Crea un registro de usuario local automáticamente si no existe (Just-In-Time Provisioning)."""
    from .servicio import ServicioAuth

    id_usuario = f"USR-P-{cedula}"
    hash_temporal = ServicioAuth.obtener_hash_contrasena(config.portal_pending_pwd)

    is_viaticante = bool(datos_erp.get("viaticante"))

    nuevo_usuario = Usuario(
        id=id_usuario,
        cedula=cedula,
        nombre=datos_erp["nombre"],
        hash_contrasena=hash_temporal,
        rol="viaticante" if is_viaticante else "usuario",
        esta_activo=True,
        area=datos_erp.get("area"),
        cargo=datos_erp.get("cargo"),
        sede=datos_erp.get("ciudadcontratacion"),
        centrocosto=datos_erp.get("centrocosto"),
        viaticante=is_viaticante,
        baseviaticos=datos_erp.get("baseviaticos"),
        correo=datos_erp.get("correocorporativo").strip()
        if datos_erp.get("correocorporativo")
        else None,
        correo_actualizado=bool(datos_erp.get("correocorporativo")),
        correo_verificado=False,
    )

    db.add(nuevo_usuario)
    await db.commit()
    await db.refresh(nuevo_usuario)
    return nuevo_usuario


async def registrar_usuario_portal(
    db: AsyncSession,
    db_erp,
    cedula: str,
    nombre: str,
    correo: Optional[str],
    contrasena: str,
) -> Usuario:
    """Registra un usuario del portal con cuenta pendiente de aprobación."""
    from .servicio import ServicioAuth

    # 1. Verificar que no exista localmente
    usuario_existente = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if usuario_existente:
        raise ValueError("La cédula ya está registrada en el sistema")

    # 2. Validar que la contraseña no sea igual a la cédula
    if contrasena.lower() == cedula.lower():
        raise ValueError("La contraseña no puede ser igual a la cédula")

    # 3. Intentar consultar ERP (con manejo de excepción)
    datos_erp = None
    try:
        if db_erp:
            datos_erp = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula)
    except Exception as e:
        print(f"DEBUG: ERP no disponible o usuario no encontrado en ERP: {e}")

    # 4. Hashear contraseña
    hash_pwd = ServicioAuth.obtener_hash_contrasena(contrasena)

    # 5. Determinar datos del usuario
    if datos_erp:
        nombre_final = datos_erp.get("nombre") or nombre
        area = datos_erp.get("area")
        cargo = datos_erp.get("cargo")
        sede = datos_erp.get("ciudadcontratacion")
        centrocosto = datos_erp.get("centrocosto")
        viaticante_val = bool(datos_erp.get("viaticante"))
        correo_final = (
            datos_erp.get("correocorporativo")
            if datos_erp.get("correocorporativo")
            else correo
        )
    else:
        nombre_final = nombre
        area = None
        cargo = None
        sede = None
        centrocosto = None
        viaticante_val = False
        correo_final = correo

    # 6. Crear usuario con esta_activo=False (pendiente de aprobación)
    id_usuario = f"USR-P-{cedula}"
    nuevo_usuario = Usuario(
        id=id_usuario,
        cedula=cedula,
        nombre=nombre_final,
        correo=correo_final,
        hash_contrasena=hash_pwd,
        rol="viaticante" if viaticante_val else "usuario",
        esta_activo=False,
        area=area,
        cargo=cargo,
        sede=sede,
        centrocosto=centrocosto,
        viaticante=viaticante_val,
        baseviaticos=datos_erp.get("baseviaticos") if datos_erp else None,
        correo_actualizado=bool(correo_final),
        correo_verificado=False,
    )

    db.add(nuevo_usuario)
    await db.commit()
    await db.refresh(nuevo_usuario)
    return nuevo_usuario
