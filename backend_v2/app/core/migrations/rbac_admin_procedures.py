"""Procedimientos privilegiados mínimos para administración RBAC desde la API."""
import re

from sqlalchemy import text


CAPABILITY_VALIDATOR = {
    "args": "p_capacidad character varying",
    "return": "void",
    "runtime_execute": False,
    "body": """
BEGIN
    IF p_capacidad IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.configuracion_seguridad_runtime
        WHERE clave = 'rbac_admin'
          AND valor_hash = encode(sha256(convert_to(p_capacidad, 'UTF8')), 'hex')
    ) THEN
        RAISE EXCEPTION 'Capacidad no autorizada' USING ERRCODE = '42501';
    END IF;
END;
""",
}

ADMIN_FUNCTIONS = {
    "admin_actualizar_usuario": {
        "args": "p_capacidad character varying, p_actor character varying, p_usuario character varying, p_rol character varying",
        "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_actor AND rol = 'admin' AND esta_activo) THEN
        RAISE EXCEPTION 'Actor no autorizado' USING ERRCODE = '42501';
    END IF;
    UPDATE public.usuarios SET rol = p_rol WHERE id = p_usuario;
END;
""",
    },
    "admin_configurar_permiso": {
        "args": "p_capacidad character varying, p_actor character varying, p_rol character varying, p_modulo character varying, p_permitido boolean",
        "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_actor AND rol = 'admin' AND esta_activo) THEN
        RAISE EXCEPTION 'Actor no autorizado' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.permisos_rol (rol, modulo, permitido)
    VALUES (p_rol, p_modulo, p_permitido)
    ON CONFLICT (rol, modulo) DO UPDATE SET permitido = EXCLUDED.permitido;
END;
""",
    },
    "admin_crear_rol": {
        "args": "p_capacidad character varying, p_actor character varying, p_id character varying, p_nombre character varying, p_descripcion character varying",
        "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_actor AND rol = 'admin' AND esta_activo) THEN
        RAISE EXCEPTION 'Actor no autorizado' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.roles_sistema (id, nombre, descripcion, es_sistema)
    VALUES (p_id, p_nombre, p_descripcion, FALSE);
END;
""",
    },
    "admin_eliminar_rol": {
        "args": "p_capacidad character varying, p_actor character varying, p_id character varying",
        "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_actor AND rol = 'admin' AND esta_activo) THEN
        RAISE EXCEPTION 'Actor no autorizado' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.roles_sistema WHERE id = p_id AND es_sistema = FALSE;
END;
""",
    },
}

HASH_FUNCTION = {
    "args": "p_capacidad character varying, p_usuario character varying, p_hash character varying",
    "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    UPDATE public.usuarios SET hash_contrasena = p_hash WHERE id = p_usuario;
END;
""",
}

RECOVERY_HASH_FUNCTION = {
    "args": "p_capacidad character varying, p_usuario character varying, p_hash_esperado character varying, p_hash_nuevo character varying",
    "return": "boolean",
    "runtime_execute": True,
    "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    UPDATE public.usuarios
    SET hash_contrasena = p_hash_nuevo
    WHERE id = p_usuario AND hash_contrasena = p_hash_esperado;
    RETURN FOUND;
END;
""",
}

EMAIL_FUNCTION = {
    "args": "p_capacidad character varying, p_usuario character varying, p_correo character varying, p_actualizado boolean, p_verificado boolean",
    "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    UPDATE public.usuarios
    SET correo = p_correo,
        correo_actualizado = p_actualizado,
        correo_verificado = p_verificado
    WHERE id = p_usuario;
END;
""",
}

STATUS_FUNCTION = {
    "args": "p_capacidad character varying, p_actor character varying, p_usuario character varying, p_activo boolean",
    "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_actor AND rol = 'admin' AND esta_activo) THEN
        RAISE EXCEPTION 'Actor no autorizado' USING ERRCODE = '42501';
    END IF;
    UPDATE public.usuarios SET esta_activo = p_activo WHERE id = p_usuario;
END;
""",
}

MODULE_FUNCTION = {
    "args": "p_capacidad character varying, p_actor character varying, p_modulo character varying, p_nombre character varying, p_categoria character varying, p_descripcion character varying, p_activo boolean, p_critico boolean",
    "return": "void",
    "runtime_execute": True,
    "body": """
BEGIN
    PERFORM public.validar_capacidad_rbac(p_capacidad);
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_actor AND rol = 'admin' AND esta_activo) THEN
        RAISE EXCEPTION 'Actor no autorizado' USING ERRCODE = '42501';
    END IF;
    UPDATE public.modulos_sistema
    SET nombre = COALESCE(p_nombre, nombre),
        categoria = COALESCE(p_categoria, categoria),
        descripcion = COALESCE(p_descripcion, descripcion),
        esta_activo = COALESCE(p_activo, esta_activo),
        es_critico = COALESCE(p_critico, es_critico),
        actualizado_en = NOW()
    WHERE id = p_modulo;
END;
""",
}

for _contract in ADMIN_FUNCTIONS.values():
    _contract.update({"return": "void", "runtime_execute": True})
HASH_FUNCTION.update({"return": "void", "runtime_execute": True})
EMAIL_FUNCTION.update({"return": "void", "runtime_execute": True})
STATUS_FUNCTION.update({"return": "void", "runtime_execute": True})
PRIVILEGED_FUNCTIONS = {
    "validar_capacidad_rbac": CAPABILITY_VALIDATOR,
    **ADMIN_FUNCTIONS,
    "auth_actualizar_hash_usuario": HASH_FUNCTION,
    "auth_consumir_token_recuperacion": RECOVERY_HASH_FUNCTION,
    "auth_actualizar_correo_usuario": EMAIL_FUNCTION,
    "admin_actualizar_estado_usuario": STATUS_FUNCTION,
    "admin_actualizar_modulo": MODULE_FUNCTION,
}


async def instalar_procedimientos_admin(
    session, runtime_role: str, capacidad: str
) -> None:
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", runtime_role) is None:
        raise RuntimeError("El rol runtime configurado no es válido")
    if len(capacidad) < 32:
        raise RuntimeError("La capacidad RBAC configurada no es válida")
    await session.execute(text(  # @audit-ok: migración fail-fast
        "DROP TABLE IF EXISTS public.configuracion_seguridad_runtime CASCADE"
    ))
    await session.execute(text(  # @audit-ok: migración fail-fast
        """
        CREATE TABLE public.configuracion_seguridad_runtime (
            clave VARCHAR(50) PRIMARY KEY,
            valor_hash CHAR(64) NOT NULL
        )
    """))
    await session.execute(text(  # @audit-ok: migración fail-fast
        """
        INSERT INTO public.configuracion_seguridad_runtime (clave, valor_hash)
        VALUES ('rbac_admin', encode(sha256(convert_to(:capacidad, 'UTF8')), 'hex'))
        ON CONFLICT (clave) DO UPDATE SET valor_hash = EXCLUDED.valor_hash
    """), {"capacidad": capacidad})
    for nombre, definition in PRIVILEGED_FUNCTIONS.items():
        args = definition["args"]
        await session.execute(text(  # @audit-ok: rol validado y migración fail-fast
            f"""
            DO $drop$ DECLARE signature text;
            BEGIN
                FOR signature IN
                    SELECT format('public.%I(%s)', p.proname,
                                  pg_get_function_identity_arguments(p.oid))
                    FROM pg_proc p
                    WHERE p.pronamespace = 'public'::regnamespace
                      AND p.proname = '{nombre}'
                LOOP EXECUTE 'DROP FUNCTION ' || signature || ' CASCADE'; END LOOP;
            END $drop$;
        """))
        await session.execute(text(  # @audit-ok: firma controlada y fail-fast
            f"""
            CREATE FUNCTION public.{nombre}({args}) RETURNS {definition['return']}
            SECURITY DEFINER SET search_path = pg_catalog, public AS $$
            {definition['body']}
            $$ LANGUAGE plpgsql
        """))
        await session.execute(text(  # @audit-ok: firma controlada y fail-fast
            f"REVOKE ALL ON FUNCTION public.{nombre}({args}) FROM PUBLIC"
        ))
        if definition["runtime_execute"]:
            await session.execute(text(  # @audit-ok: rol validado y fail-fast
                f"GRANT EXECUTE ON FUNCTION public.{nombre}({args}) TO {runtime_role}"
            ))
    await session.execute(text(  # @audit-ok: rol validado y fail-fast
        f"REVOKE ALL ON TABLE public.configuracion_seguridad_runtime FROM PUBLIC, {runtime_role}"
    ))
    await session.commit()
