from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, select
from app.models.erp.requisiciones import (
    SolicitudMaterial,
    LineaSolicitudMaterial,
    SolicitudMaterialCrear,
)


class RequisicionesService:
    @staticmethod
    def obtener_ots_solicitudes(
        db_erp: Session, busqueda: Optional[str] = None, limit: int = 100
    ):
        """Obtiene el listado de OTS (Ordenes de Trabajo) para el autocompletado del formulario."""
        query = "SELECT * FROM otsistemasolicitudes"
        params: Dict[str, Any] = {}

        if busqueda:
            query += " WHERE orden ILIKE :busqueda OR cliente ILIKE :busqueda OR especialidad ILIKE :busqueda"
            params["busqueda"] = f"%{busqueda}%"

        query += " LIMIT :limit"
        params["limit"] = limit

        resultado = db_erp.execute(text(query), params).mappings().all()
        return [dict(r) for r in resultado]

    @staticmethod
    def obtener_catalogo_producto(
        db_erp: Session,
        busqueda: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ):
        """Busca en el catálogo de productos."""
        query = "SELECT * FROM catalogoproducto"
        params: Dict[str, Any] = {}

        if busqueda:
            query += " WHERE referencia ILIKE :busqueda OR descripcion ILIKE :busqueda"
            params["busqueda"] = f"%{busqueda}%"

        query += " LIMIT :limit OFFSET :offset"
        params["limit"] = limit
        params["offset"] = offset

        resultado = db_erp.execute(text(query), params).mappings().all()
        return [dict(r) for r in resultado]

    @staticmethod
    def generar_codigo_solicitud(db_erp: Session, prefijo: str) -> str:
        """
        Genera el código de solicitud basado en el prefijo.
        Ej: Si prefijo="MAT", busca el último "MAT-S%" y le suma 1 al número.
        """
        query = text(
            "SELECT codigosolicitud FROM solicitudmaterial "
            "WHERE codigosolicitud LIKE :patron "
            "ORDER BY codigo DESC LIMIT 1"
        )
        resultado = db_erp.execute(query, {"patron": f"{prefijo}-S%"}).scalar()

        if not resultado:
            return f"{prefijo}-S1000"

        try:
            # Extraer el numero despues de "-S"
            partes = resultado.split("-S")
            if len(partes) == 2:
                numero = int(partes[1])
                return f"{prefijo}-S{numero + 1}"
        except Exception:
            pass

        return f"{prefijo}-S1000"

    @staticmethod
    def crear_solicitud_material(
        db_erp: Session,
        solicitud_data: SolicitudMaterialCrear,
        usuario_id: Optional[int] = None,
        nombre_usuario: Optional[str] = None,
    ):
        """Crea la solicitud de materiales y sus líneas en el ERP."""

        # 1. Generar código
        codigosolicitud = RequisicionesService.generar_codigo_solicitud(
            db_erp, solicitud_data.prefijo_tipo
        )

        from datetime import datetime

        ahora = datetime.now()

        # 2. Crear encabezado
        nueva_solicitud = SolicitudMaterial(
            codigosolicitud=codigosolicitud,
            fecha=ahora.date(),
            hora=ahora.time(),
            ordentrabajo=solicitud_data.ordentrabajo,
            cliente=solicitud_data.cliente,
            uen=solicitud_data.uen,
            fechanecesidad=solicitud_data.fechanecesidad,
            estado="SOLICITADO",
            usuario=usuario_id,
            nombreusuario=nombre_usuario,
            observaciones=solicitud_data.observaciones,
            anexo=None,  # Ignorado por el momento
        )

        db_erp.add(nueva_solicitud)
        db_erp.flush()  # Para obtener el 'codigo' autogenerado

        # 3. Crear líneas
        for linea_data in solicitud_data.lineas:
            nueva_linea = LineaSolicitudMaterial(
                solicitudmaterial=nueva_solicitud.codigo,  # Relación FK
                fecha=ahora.date(),
                especialidad=linea_data.especialidad,
                subindice=linea_data.subindice,
                centrocosto=linea_data.centrocosto,
                subcentrocosto=linea_data.subcentrocosto,
                tipodestino=linea_data.tipodestino,
                tipoproducto=linea_data.tipoproducto,
                materialde=linea_data.materialde,
                referenciaproducto=linea_data.referenciaproducto,
                descripcionproducto=linea_data.descripcionproducto,
                cantidad=linea_data.cantidad,
                unidadmedida=linea_data.unidadmedida,
                tipo=linea_data.tipo,
                clasificacion=linea_data.clasificacion,
                rotacion=linea_data.rotacion,
                proveedorfrecuente=linea_data.proveedorfrecuente,
                observaciones=linea_data.observaciones,
            )
            db_erp.add(nueva_linea)

        db_erp.commit()
        db_erp.refresh(nueva_solicitud)

        return nueva_solicitud

    @staticmethod
    def obtener_mis_solicitudes(
        db_erp: Session,
        usuario_id: Optional[int] = None,
        nombre_usuario: Optional[str] = None,
        limit: int = 50,
    ):
        """Consulta el historial de solicitudes enviadas al ERP por el usuario actual."""
        query = select(SolicitudMaterial).order_by(
            SolicitudMaterial.fecha.desc(), SolicitudMaterial.hora.desc()
        )

        # Filtro base: O por ID de usuario o por nombre exacto si no hay ID
        if usuario_id is not None:
            query = query.where(SolicitudMaterial.usuario == usuario_id)
        elif nombre_usuario:
            query = query.where(SolicitudMaterial.nombreusuario == nombre_usuario)

        query = query.limit(limit)

        resultados = db_erp.execute(query).scalars().all()
        return resultados
