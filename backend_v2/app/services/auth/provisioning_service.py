"""
Servicio de aprovisionamiento de usuarios desde ERP - Backend V2 (Async + SQLModel)
"""

from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth.usuario import Usuario
from app.services.erp.empleados_service import EmpleadosService, normalizar_bool_erp


MENSAJE_AUTOGESTION_NO_HABILITADA = (
    "No fue posible habilitar la cuenta con la informacion proporcionada. "
    "Verifique los datos o contacte al administrador."
)


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
        rol="usuario",
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

    cedula_norm = cedula.strip().lower()
    usuario_existente = await ServicioAuth.obtener_usuario_por_cedula(db, cedula_norm)
    if usuario_existente:
        raise ValueError("El usuario ya tiene una contraseña configurada")

    datos_erp = await EmpleadosService.validar_empleado_activo_autogestion(db_erp, cedula_norm)
    if not datos_erp:
        raise ValueError(MENSAJE_AUTOGESTION_NO_HABILITADA)

    id_usuario = f"USR-P-{cedula_norm}"
    hash_pwd = ServicioAuth.obtener_hash_contrasena(contrasena)

    viaticante_val = normalizar_bool_erp(datos_erp.get("viaticante"))
    nuevo_usuario = Usuario(
        id=id_usuario,
        cedula=cedula_norm,
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

    try:
        db.add(nuevo_usuario)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ValueError("La cédula ya está registrada en el sistema")
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
    """Registra un usuario del portal si ERP confirma contrato activo."""
    from .servicio import ServicioAuth

    cedula_norm = cedula.strip().lower()

    # 1. Verificar que no exista localmente
    usuario_existente = await ServicioAuth.obtener_usuario_por_cedula(db, cedula_norm)
    if usuario_existente:
        raise ValueError("La cédula ya está registrada en el sistema")

    # 2. Validar que la contraseña no sea igual a la cédula
    if contrasena.strip().lower() == cedula_norm:
        raise ValueError("La contraseña no puede ser igual a la cédula")

    # 3. Validar ERP como fuente de verdad para autogestion.
    datos_erp = await EmpleadosService.validar_empleado_activo_autogestion(db_erp, cedula_norm)
    if not datos_erp:
        raise ValueError(MENSAJE_AUTOGESTION_NO_HABILITADA)

    # 4. Hashear contraseña
    hash_pwd = ServicioAuth.obtener_hash_contrasena(contrasena)

    # 5. Determinar datos del usuario
    nombre_final = datos_erp.get("nombre") or nombre
    area = datos_erp.get("area")
    cargo = datos_erp.get("cargo")
    sede = datos_erp.get("ciudadcontratacion")
    centrocosto = datos_erp.get("centrocosto")
    viaticante_val = normalizar_bool_erp(datos_erp.get("viaticante"))
    correo_final = (
        datos_erp.get("correocorporativo")
        if datos_erp.get("correocorporativo")
        else correo
    )

    # 6. Crear usuario habilitado por ERP activo.
    id_usuario = f"USR-P-{cedula_norm}"
    nuevo_usuario = Usuario(
        id=id_usuario,
        cedula=cedula_norm,
        nombre=nombre_final,
        correo=correo_final,
        hash_contrasena=hash_pwd,
        rol="viaticante" if viaticante_val else "usuario",
        esta_activo=True,
        area=area,
        cargo=cargo,
        sede=sede,
        centrocosto=centrocosto,
        viaticante=viaticante_val,
        baseviaticos=datos_erp.get("baseviaticos"),
        correo_actualizado=bool(correo_final),
        correo_verificado=False,
    )

    try:
        db.add(nuevo_usuario)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise ValueError("La cédula ya está registrada en el sistema")
    await db.refresh(nuevo_usuario)
    return nuevo_usuario
