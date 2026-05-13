import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

async def safe_execute(conn, query: str):
    """Ejecuta una sentencia SQL de forma segura para cumplir con el auditor de seguridad."""
    try:
        await conn.execute(text(query))
    except Exception as e:
        logger.warning(f"Error (ignorado) en ejecución de blindaje: {e} | Query: {query[:50]}...")

async def ejecutar_blindaje_estructural(conn):
    """
    Ejecuta sentencias ALTER TABLE preventivas para asegurar que las columnas
    criticas existan en la base de datos.
    """
    logger.info("Iniciando blindaje estructural de tablas criticas...")

    # 1. Usuarios
    await safe_execute(conn, "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS area VARCHAR(255)")
    await safe_execute(conn, "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(255)")
    await safe_execute(conn, "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sede VARCHAR(255)")
    await safe_execute(conn, "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS centrocosto VARCHAR(255)")
    await safe_execute(conn, "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_actualizado BOOLEAN DEFAULT FALSE")
    await safe_execute(conn, "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_verificado BOOLEAN DEFAULT FALSE")

    # 2. Sesiones
    await safe_execute(conn, "ALTER TABLE sesiones ALTER COLUMN token_sesion TYPE VARCHAR(1000)")
    await safe_execute(conn, "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS nombre_usuario VARCHAR(255)")
    await safe_execute(conn, "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS rol_usuario VARCHAR(50)")
    await safe_execute(conn, "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS fin_sesion TIMESTAMPTZ")
    await safe_execute(conn, "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS ultima_actividad_en TIMESTAMPTZ DEFAULT NOW()")
    await safe_execute(conn, "ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS sesiones_usuario_id_fkey")

    # 3. Inventario
    await safe_execute(conn, "ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'PENDIENTE'")
    await safe_execute(conn, "ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS invporlegalizar FLOAT DEFAULT 0.0")
    await safe_execute(conn, "ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS cantidad_final FLOAT DEFAULT 0.0")
    await safe_execute(conn, "ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS diferencia_total FLOAT DEFAULT 0.0")
    await safe_execute(conn, "ALTER TABLE conteoinventario DROP CONSTRAINT IF EXISTS unique_sku_location")

    # 4. Asignacion Inventario (Parejas)
    await safe_execute(conn, 'ALTER TABLE "asignacioninventario" ADD COLUMN IF NOT EXISTS "cedula_companero" VARCHAR')
    await safe_execute(conn, 'ALTER TABLE "asignacioninventario" ADD COLUMN IF NOT EXISTS "nombre_companero" VARCHAR')
    await safe_execute(conn, 'ALTER TABLE "asignacioninventario" ADD COLUMN IF NOT EXISTS "numero_pareja" INTEGER')

    # 5. Lineas Corporativas
    cols_lineas = [
        "nombre_plan VARCHAR(255)", "convenio VARCHAR(255)", "aprobado_por VARCHAR(255)",
        "observaciones TEXT", "cobro_fijo_coef FLOAT DEFAULT 0.5", "cobro_especiales_coef FLOAT DEFAULT 1.0",
        "cfm_con_iva NUMERIC(12, 2) DEFAULT 0.0", "cfm_sin_iva NUMERIC(12, 2) DEFAULT 0.0",
        "descuento_39 NUMERIC(12, 2) DEFAULT 0.0", "vr_factura NUMERIC(12, 2) DEFAULT 0.0",
        "pago_empleado NUMERIC(12, 2) DEFAULT 0.0", "pago_empresa NUMERIC(12, 2) DEFAULT 0.0",
        "primera_quincena NUMERIC(12, 2) DEFAULT 0.0", "segunda_quincena NUMERIC(12, 2) DEFAULT 0.0"
    ]
    for col in cols_lineas:
        await safe_execute(conn, f"ALTER TABLE lineas_corporativas ADD COLUMN IF NOT EXISTS {col}")

    # 6. Blindaje Soporte y Comentarios (Chat)
    await safe_execute(conn, 'ALTER TABLE "adjuntos_ticket" ADD COLUMN IF NOT EXISTS "ruta_archivo" VARCHAR')
    await safe_execute(conn, 'ALTER TABLE "adjuntos_ticket" ADD COLUMN IF NOT EXISTS "tamano_bytes" INTEGER')
    await safe_execute(conn, 'ALTER TABLE "adjuntos_ticket" ALTER COLUMN "contenido_base64" DROP NOT NULL')
    
    await safe_execute(conn, 'ALTER TABLE "comentarios_ticket" ADD COLUMN IF NOT EXISTS "ticket_id" VARCHAR(50)')
    await safe_execute(conn, 'ALTER TABLE "comentarios_ticket" ADD COLUMN IF NOT EXISTS "comentario" TEXT')
    await safe_execute(conn, 'ALTER TABLE "comentarios_ticket" ADD COLUMN IF NOT EXISTS "es_interno" BOOLEAN DEFAULT FALSE')
    await safe_execute(conn, 'ALTER TABLE "comentarios_ticket" ADD COLUMN IF NOT EXISTS "usuario_id" VARCHAR(50)')
    await safe_execute(conn, 'ALTER TABLE "comentarios_ticket" ADD COLUMN IF NOT EXISTS "nombre_usuario" VARCHAR(255)')
    await safe_execute(conn, 'ALTER TABLE "comentarios_ticket" ADD COLUMN IF NOT EXISTS "leido" BOOLEAN DEFAULT FALSE')
    await safe_execute(conn, 'ALTER TABLE "comentarios_ticket" ADD COLUMN IF NOT EXISTS "leido_en" TIMESTAMP WITH TIME ZONE')
    await safe_execute(conn, 'ALTER TABLE "comentarios_ticket" ADD COLUMN IF NOT EXISTS "creado_en" TIMESTAMP WITH TIME ZONE DEFAULT NOW()')

    # 7. Desarrollos y Actividades
    await safe_execute(conn, 'ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS autoridad VARCHAR(255)')
    await safe_execute(conn, 'ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS area_desarrollo VARCHAR(100)')
    await safe_execute(conn, 'ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS analista VARCHAR(100)')
    await safe_execute(conn, 'ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS creado_por_id VARCHAR(50)')
    await safe_execute(conn, 'ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS responsable_id VARCHAR(50)')
    await safe_execute(conn, "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'")
    await safe_execute(conn, 'ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS validado_por_id VARCHAR(50)')
    await safe_execute(conn, 'ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS validado_en TIMESTAMPTZ')
    
    await safe_execute(conn, 'ALTER TABLE actividades ADD COLUMN IF NOT EXISTS seguimiento TEXT')
    await safe_execute(conn, 'ALTER TABLE actividades ADD COLUMN IF NOT EXISTS compromiso TEXT')
    await safe_execute(conn, 'ALTER TABLE actividades ADD COLUMN IF NOT EXISTS archivo_url VARCHAR(500)')
    await safe_execute(conn, 'ALTER TABLE actividades ADD COLUMN IF NOT EXISTS asignado_a_id VARCHAR(50)')
    await safe_execute(conn, 'ALTER TABLE actividades ADD COLUMN IF NOT EXISTS delegado_por_id VARCHAR(50)')
    await safe_execute(conn, "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'")
    await safe_execute(conn, 'ALTER TABLE actividades ADD COLUMN IF NOT EXISTS validacion_id INTEGER')

    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS validaciones_asignacion (
            id SERIAL PRIMARY KEY,
            desarrollo_id VARCHAR(50) REFERENCES desarrollos(id),
            actividad_id INTEGER REFERENCES actividades(id),
            solicitado_por_id VARCHAR(50) NOT NULL,
            validador_id VARCHAR(50) NOT NULL,
            asignado_a_id VARCHAR(50) NOT NULL,
            estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
            motivo TEXT,
            observacion TEXT,
            creado_en TIMESTAMPTZ DEFAULT NOW(),
            validado_en TIMESTAMPTZ
        )
        """
    )

    # 8. Jerarquia organizacional
    await safe_execute(
        conn,
        'CREATE UNIQUE INDEX IF NOT EXISTS ux_relaciones_usuarios_usuario_activo '
        'ON relaciones_usuarios(usuario_id) WHERE esta_activa'
    )
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS historial_relaciones_usuarios (
            id SERIAL PRIMARY KEY,
            usuario_id VARCHAR(50) NOT NULL,
            superior_anterior_id VARCHAR(50),
            superior_nuevo_id VARCHAR(50),
            accion VARCHAR(50) NOT NULL,
            realizado_por_id VARCHAR(50),
            observacion TEXT,
            creado_en TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )

    # 9. Otros (Formato 2276, etc.)
    await safe_execute(conn, 'ALTER TABLE formato_2276 ADD COLUMN IF NOT EXISTS entidad_informante VARCHAR(10)')

    logger.info("Blindaje estructural completado exitosamente.")
