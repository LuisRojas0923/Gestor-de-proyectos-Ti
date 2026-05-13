from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth.usuario import (
    NodoJerarquia,
    HistorialRelacionUsuario,
    RelacionUsuario,
    RelacionUsuarioLeer,
    Usuario,
    UsuarioJerarquiaPublico,
)


class JerarquiaService:
    """Operaciones de jerarquía organizacional sobre usuarios."""

    @staticmethod
    async def crear_relacion(
        db: AsyncSession,
        usuario_id: str,
        superior_id: str,
        tipo_relacion: str = "lineal",
        realizado_por_id: Optional[str] = None,
        observacion: Optional[str] = None,
    ) -> RelacionUsuario:
        await JerarquiaService._validar_relacion(db, usuario_id, superior_id)
        existente = await db.scalar(
            select(RelacionUsuario).where(
                RelacionUsuario.usuario_id == usuario_id,
                RelacionUsuario.esta_activa.is_(True),
            )
        )
        if existente:
            raise ValueError("El usuario ya tiene un superior activo")

        relacion = RelacionUsuario(
            usuario_id=usuario_id,
            superior_id=superior_id,
            tipo_relacion=tipo_relacion,
        )
        db.add(relacion)
        db.add(HistorialRelacionUsuario(
            usuario_id=usuario_id,
            superior_nuevo_id=superior_id,
            accion="crear",
            realizado_por_id=realizado_por_id,
            observacion=observacion,
        ))
        await db.commit()
        await db.refresh(relacion)
        return relacion

    @staticmethod
    async def asignar_superior(
        db: AsyncSession,
        usuario_id: str,
        superior_id: str,
        tipo_relacion: str = "lineal",
        realizado_por_id: Optional[str] = None,
        observacion: Optional[str] = None,
    ) -> RelacionUsuario:
        await JerarquiaService._validar_relacion(db, usuario_id, superior_id)
        existente = await db.scalar(
            select(RelacionUsuario).where(
                RelacionUsuario.usuario_id == usuario_id,
                RelacionUsuario.esta_activa.is_(True),
            )
        )

        superior_anterior_id = None
        if existente:
            superior_anterior_id = existente.superior_id
            existente.esta_activa = False
            existente.actualizado_en = datetime.utcnow()

        relacion = RelacionUsuario(
            usuario_id=usuario_id,
            superior_id=superior_id,
            tipo_relacion=tipo_relacion,
        )
        db.add(relacion)
        db.add(HistorialRelacionUsuario(
            usuario_id=usuario_id,
            superior_anterior_id=superior_anterior_id,
            superior_nuevo_id=superior_id,
            accion="reasignar" if superior_anterior_id else "crear",
            realizado_por_id=realizado_por_id,
            observacion=observacion,
        ))
        await db.commit()
        await db.refresh(relacion)
        return relacion

    @staticmethod
    async def desactivar_relacion(
        db: AsyncSession,
        relacion_id: int,
        realizado_por_id: Optional[str] = None,
        observacion: Optional[str] = None,
    ) -> RelacionUsuario:
        relacion = await db.get(RelacionUsuario, relacion_id)
        if not relacion:
            raise ValueError("Relación no encontrada")

        relacion.esta_activa = False
        relacion.actualizado_en = datetime.utcnow()
        db.add(HistorialRelacionUsuario(
            usuario_id=relacion.usuario_id,
            superior_anterior_id=relacion.superior_id,
            accion="desactivar",
            realizado_por_id=realizado_por_id,
            observacion=observacion,
        ))
        await db.commit()
        await db.refresh(relacion)
        return relacion

    @staticmethod
    async def listar_usuarios(db: AsyncSession) -> List[UsuarioJerarquiaPublico]:
        result = await db.execute(select(Usuario).where(Usuario.esta_activo.is_(True)).order_by(Usuario.nombre))
        return [JerarquiaService._usuario_publico(usuario) for usuario in result.scalars().all()]

    @staticmethod
    async def listar_relaciones(db: AsyncSession, solo_activas: bool = True) -> List[RelacionUsuarioLeer]:
        stmt = select(RelacionUsuario)
        if solo_activas:
            stmt = stmt.where(RelacionUsuario.esta_activa.is_(True))
        result = await db.execute(stmt.order_by(RelacionUsuario.usuario_id))
        relaciones = list(result.scalars().all())
        usuarios = await JerarquiaService._obtener_usuarios_por_relaciones(db, relaciones, "")

        return [
            RelacionUsuarioLeer(
                id=rel.id,
                usuario_id=rel.usuario_id,
                superior_id=rel.superior_id,
                tipo_relacion=rel.tipo_relacion,
                esta_activa=rel.esta_activa,
                creado_en=rel.creado_en,
                actualizado_en=rel.actualizado_en,
                usuario=JerarquiaService._usuario_publico(usuarios[rel.usuario_id]) if rel.usuario_id in usuarios else None,
                superior=JerarquiaService._usuario_publico(usuarios[rel.superior_id]) if rel.superior_id in usuarios else None,
            )
            for rel in relaciones
        ]

    @staticmethod
    async def obtener_arbol_completo(db: AsyncSession) -> List[NodoJerarquia]:
        relaciones = await JerarquiaService._obtener_relaciones_activas(db)
        usuarios = await JerarquiaService._obtener_usuarios_por_relaciones(db, relaciones, "")
        subordinados = {rel.usuario_id for rel in relaciones}
        superiores = {rel.superior_id for rel in relaciones}
        raices = sorted(superiores - subordinados, key=lambda user_id: usuarios.get(user_id).nombre if usuarios.get(user_id) else user_id)
        return [
            NodoJerarquia(
                usuario_id=raiz_id,
                superior_id=None,
                tipo_relacion=None,
                usuario=JerarquiaService._usuario_publico(usuarios[raiz_id]),
                subordinados=JerarquiaService._construir_arbol(raiz_id, relaciones, usuarios),
            )
            for raiz_id in raices
            if raiz_id in usuarios
        ]

    @staticmethod
    async def obtener_equipo(db: AsyncSession, usuario_id: str) -> List[NodoJerarquia]:
        relaciones = await JerarquiaService._obtener_relaciones_activas(db)
        usuarios = await JerarquiaService._obtener_usuarios_por_relaciones(db, relaciones, usuario_id)
        return JerarquiaService._construir_arbol(usuario_id, relaciones, usuarios)

    @staticmethod
    async def obtener_ids_subordinados(db: AsyncSession, usuario_id: str) -> List[str]:
        equipo = await JerarquiaService.obtener_equipo(db, usuario_id)
        ids: List[str] = []

        def recorrer(nodos: List[NodoJerarquia]) -> None:
            for nodo in nodos:
                ids.append(nodo.usuario_id)
                recorrer(nodo.subordinados)

        recorrer(equipo)
        return ids

    @staticmethod
    async def obtener_ids_y_nombres_subordinados(db: AsyncSession, usuario_id: str) -> dict:
        """Devuelve IDs y nombres de todos los subordinados (directos e indirectos)."""
        equipo = await JerarquiaService.obtener_equipo(db, usuario_id)
        ids: List[str] = []
        nombres: List[str] = []

        def recorrer(nodos: List[NodoJerarquia]) -> None:
            for nodo in nodos:
                ids.append(nodo.usuario_id)
                if nodo.usuario and nodo.usuario.nombre:
                    nombres.append(nodo.usuario.nombre)
                recorrer(nodo.subordinados)

        recorrer(equipo)
        return {"ids": ids, "nombres": nombres}

    @staticmethod
    async def _obtener_relaciones_activas(db: AsyncSession) -> List[RelacionUsuario]:
        result = await db.execute(
            select(RelacionUsuario).where(RelacionUsuario.esta_activa.is_(True))
        )
        return list(result.scalars().all())

    @staticmethod
    async def _obtener_usuarios_por_relaciones(
        db: AsyncSession,
        relaciones: List[RelacionUsuario],
        usuario_id: str,
    ) -> Dict[str, Usuario]:
        usuario_ids = {usuario_id}
        for relacion in relaciones:
            usuario_ids.add(relacion.usuario_id)
            usuario_ids.add(relacion.superior_id)

        result = await db.execute(select(Usuario).where(Usuario.id.in_(usuario_ids)))
        return {usuario.id: usuario for usuario in result.scalars().all()}

    @staticmethod
    def _construir_arbol(
        superior_id: str,
        relaciones: List[RelacionUsuario],
        usuarios: Dict[str, Usuario],
    ) -> List[NodoJerarquia]:
        directos = [rel for rel in relaciones if rel.superior_id == superior_id]
        directos.sort(key=lambda rel: usuarios.get(rel.usuario_id).nombre if usuarios.get(rel.usuario_id) else rel.usuario_id)

        nodos: List[NodoJerarquia] = []
        for relacion in directos:
            usuario = usuarios.get(relacion.usuario_id)
            if not usuario:
                continue

            nodos.append(
                NodoJerarquia(
                    usuario_id=relacion.usuario_id,
                    superior_id=relacion.superior_id,
                    tipo_relacion=relacion.tipo_relacion,
                    usuario=UsuarioJerarquiaPublico(
                        id=usuario.id,
                        cedula=usuario.cedula,
                        nombre=usuario.nombre,
                        rol=usuario.rol,
                        area=usuario.area,
                        cargo=usuario.cargo,
                    ),
                    subordinados=JerarquiaService._construir_arbol(relacion.usuario_id, relaciones, usuarios),
                )
            )

        return nodos

    @staticmethod
    async def _validar_relacion(db: AsyncSession, usuario_id: str, superior_id: str) -> None:
        if usuario_id == superior_id:
            raise ValueError("Un usuario no puede ser su propio superior")

        usuario = await db.get(Usuario, usuario_id)
        superior = await db.get(Usuario, superior_id)
        if not usuario or not superior:
            raise ValueError("Usuario o superior no encontrado")

        subordinados_superior = await JerarquiaService.obtener_ids_subordinados(db, usuario_id)
        if superior_id in subordinados_superior:
            raise ValueError("La relación genera un ciclo jerárquico")

    @staticmethod
    def _usuario_publico(usuario: Usuario) -> UsuarioJerarquiaPublico:
        return UsuarioJerarquiaPublico(
            id=usuario.id,
            cedula=usuario.cedula,
            nombre=usuario.nombre,
            rol=usuario.rol,
            area=usuario.area,
            cargo=usuario.cargo,
        )
