"""Protecciones DB contra escalado desde la credencial runtime."""
import re

from sqlalchemy import text


AUTH_PROTECTION_FUNCTION_BODY = """
BEGIN
    IF session_user = '{runtime_role}' AND current_user = '{runtime_role}' THEN
        IF TG_OP = 'INSERT' AND NEW.rol NOT IN ('usuario', 'viaticante') THEN
            RAISE EXCEPTION 'Operación sensible no permitida' USING ERRCODE = '42501';
        ELSIF TG_OP = 'UPDATE' AND (
            NEW.id IS DISTINCT FROM OLD.id OR
            NEW.rol IS DISTINCT FROM OLD.rol OR
            NEW.hash_contrasena IS DISTINCT FROM OLD.hash_contrasena OR
            NEW.cedula IS DISTINCT FROM OLD.cedula OR
            NEW.correo IS DISTINCT FROM OLD.correo OR
            NEW.correo_actualizado IS DISTINCT FROM OLD.correo_actualizado OR
            NEW.correo_verificado IS DISTINCT FROM OLD.correo_verificado OR
            NEW.esta_activo IS DISTINCT FROM OLD.esta_activo OR
            NEW.viaticante IS DISTINCT FROM OLD.viaticante
        ) THEN
            RAISE EXCEPTION 'Operación sensible no permitida' USING ERRCODE = '42501';
        ELSIF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Operación sensible no permitida' USING ERRCODE = '42501';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
"""


async def instalar_proteccion_auth_runtime(session, runtime_role: str) -> None:
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", runtime_role) is None:
        raise RuntimeError("El rol runtime configurado no es válido")
    body = AUTH_PROTECTION_FUNCTION_BODY.format(runtime_role=runtime_role)
    await session.execute(text(  # @audit-ok: migración fail-fast
        """
        DO $drop$ DECLARE signature text;
        BEGIN
            FOR signature IN
                SELECT p.oid::regprocedure::text FROM pg_proc p
                WHERE p.pronamespace = 'public'::regnamespace
                  AND p.proname = 'proteger_credenciales_admin_runtime'
            LOOP EXECUTE 'DROP FUNCTION ' || signature || ' CASCADE'; END LOOP;
        END $drop$;
    """))
    await session.execute(text(  # @audit-ok: migración fail-fast
        f"""
        CREATE FUNCTION public.proteger_credenciales_admin_runtime()
        RETURNS trigger AS $$
        {body}
        $$ LANGUAGE plpgsql
    """))
    await session.execute(text("REVOKE ALL ON FUNCTION public.proteger_credenciales_admin_runtime() FROM PUBLIC"))  # @audit-ok: migración fail-fast
    await session.execute(text("DROP TRIGGER IF EXISTS trg_usuarios_proteger_admin_runtime ON public.usuarios"))  # @audit-ok: migración fail-fast
    await session.execute(text(  # @audit-ok: migración fail-fast
        """
        CREATE TRIGGER trg_usuarios_proteger_admin_runtime
        BEFORE INSERT OR UPDATE OR DELETE ON public.usuarios
        FOR EACH ROW EXECUTE FUNCTION public.proteger_credenciales_admin_runtime()
    """))
    await session.commit()
