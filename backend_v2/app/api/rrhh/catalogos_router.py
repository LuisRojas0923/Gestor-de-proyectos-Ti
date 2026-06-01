"""
Router de catálogos parametrizables del módulo RP:
Areas, Cargos, Ciudades, Aprobadores.
"""
import unicodedata
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db
from app.models.rrhh.catalogos import AreaRP, CargoRP, CiudadRP, AprobadorAreaRP
from app.api.rrhh.schemas import AreaOut, CargoOut, CiudadOut, AprobadorOut, AprobadorCreate

router = APIRouter(prefix="/catalogos", tags=["RP — Catálogos"])


def quitar_tildes(texto: str) -> str:
    """Elimina tildes/diacríticos para comparaciones insensibles a acento.
    Ej: 'ADMINISTRACIÓN' → 'ADMINISTRACION'
    """
    if not texto:
        return ""
    normalizado = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in normalizado if not unicodedata.combining(c)).upper().strip()


# ──────────────────────────────────────────────
# Áreas
# ──────────────────────────────────────────────
@router.get("/areas", response_model=List[AreaOut])
async def listar_areas(solo_activas: bool = True, db: AsyncSession = Depends(obtener_db)):
    stmt = select(AreaRP)
    if solo_activas:
        stmt = stmt.where(AreaRP.activo == True)
    result = await db.execute(stmt.order_by(AreaRP.nombre))  # [CONTROLADO]
    return result.scalars().all()


@router.post("/areas", response_model=AreaOut, status_code=status.HTTP_201_CREATED)
async def crear_area(nombre: str, db: AsyncSession = Depends(obtener_db)):
    area = AreaRP(nombre=nombre.upper().strip())
    db.add(area)
    await db.commit()
    await db.refresh(area)
    return area


@router.put("/areas/{area_id}", response_model=AreaOut)
async def actualizar_area(area_id: int, nombre: str, activo: bool = True,
                          db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(select(AreaRP).where(AreaRP.id == area_id))  # [CONTROLADO]
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    area.nombre = nombre.upper().strip()
    area.activo = activo
    await db.commit()
    await db.refresh(area)
    return area


# ──────────────────────────────────────────────
# Cargos
# ──────────────────────────────────────────────
@router.get("/cargos", response_model=List[CargoOut])
async def listar_cargos(area_id: int = None, solo_activos: bool = True, db: AsyncSession = Depends(obtener_db)):
    stmt = select(CargoRP)
    if area_id is not None:
        stmt = stmt.where(CargoRP.area_id == area_id)
    if solo_activos:
        stmt = stmt.where(CargoRP.activo == True)
    result = await db.execute(stmt.order_by(CargoRP.nombre))  # [CONTROLADO]
    return result.scalars().all()


@router.post("/cargos", response_model=CargoOut, status_code=status.HTTP_201_CREATED)
async def crear_cargo(area_id: int, nombre: str, cargo_superior_id: int = None, db: AsyncSession = Depends(obtener_db)):
    cargo = CargoRP(area_id=area_id, nombre=nombre.strip(), cargo_superior_id=cargo_superior_id)
    db.add(cargo)
    await db.commit()
    await db.refresh(cargo)
    return cargo


@router.put("/cargos/{cargo_id}", response_model=CargoOut)
async def actualizar_cargo(cargo_id: int, nombre: str = None, activo: bool = None,
                           cargo_superior_id: int = -1, db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(select(CargoRP).where(CargoRP.id == cargo_id))  # [CONTROLADO]
    cargo = result.scalar_one_or_none()
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo no encontrado")
    if nombre is not None:
        cargo.nombre = nombre.strip()
    if activo is not None:
        cargo.activo = activo
    if cargo_superior_id != -1:
        if cargo_superior_id == 0:
            cargo.cargo_superior_id = None
        else:
            cargo.cargo_superior_id = cargo_superior_id
    await db.commit()
    await db.refresh(cargo)
    return cargo


# ──────────────────────────────────────────────
# Ciudades
# ──────────────────────────────────────────────
@router.get("/ciudades", response_model=List[CiudadOut])
async def listar_ciudades(db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(  # [CONTROLADO]
        select(CiudadRP).where(CiudadRP.activo == True).order_by(CiudadRP.nombre)
    )
    return result.scalars().all()


@router.post("/ciudades", response_model=CiudadOut, status_code=status.HTTP_201_CREATED)
async def crear_ciudad(nombre: str, db: AsyncSession = Depends(obtener_db)):
    ciudad = CiudadRP(nombre=nombre.upper().strip())
    db.add(ciudad)
    await db.commit()
    await db.refresh(ciudad)
    return ciudad


@router.put("/ciudades/{ciudad_id}", response_model=CiudadOut)
async def actualizar_ciudad(ciudad_id: int, nombre: str = None, activo: bool = None,
                            db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(select(CiudadRP).where(CiudadRP.id == ciudad_id))  # [CONTROLADO]
    ciudad = result.scalar_one_or_none()
    if not ciudad:
        raise HTTPException(status_code=404, detail="Ciudad no encontrada")
    if nombre is not None:
        ciudad.nombre = nombre.upper().strip()
    if activo is not None:
        ciudad.activo = activo
    await db.commit()
    await db.refresh(ciudad)
    return ciudad


# ──────────────────────────────────────────────
# Aprobadores por área
# ──────────────────────────────────────────────
@router.get("/aprobadores", response_model=List[AprobadorOut])
async def listar_aprobadores(db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(select(AprobadorAreaRP).order_by(AprobadorAreaRP.area_id))  # [CONTROLADO]
    return result.scalars().all()


@router.post("/aprobadores", response_model=AprobadorOut, status_code=status.HTTP_201_CREATED)
async def crear_aprobador(payload: AprobadorCreate, db: AsyncSession = Depends(obtener_db)):
    aprobador = AprobadorAreaRP(**payload.model_dump())
    db.add(aprobador)
    await db.commit()
    await db.refresh(aprobador)
    return aprobador


@router.put("/aprobadores/{aprobador_id}", response_model=AprobadorOut)
async def actualizar_aprobador(aprobador_id: int, payload: AprobadorCreate,
                               db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(select(AprobadorAreaRP).where(AprobadorAreaRP.id == aprobador_id))  # [CONTROLADO]
    aprobador = result.scalar_one_or_none()
    if not aprobador:
        raise HTTPException(status_code=404, detail="Aprobador no encontrado")
    for k, v in payload.model_dump().items():
        setattr(aprobador, k, v)
    await db.commit()
    await db.refresh(aprobador)
    return aprobador


# ──────────────────────────────────────────────
# Sincronización con la Jerarquía Organizacional
# ──────────────────────────────────────────────
async def sincronizar_catalogos_desde_jerarquia(db: AsyncSession):
    from app.models.auth.usuario import Usuario, RelacionUsuario
    from app.models.rrhh.catalogos import AreaRP, CargoRP
    from sqlmodel import select
    from sqlalchemy import func

    # 1. Obtener usuarios activos con área y cargo
    result_usuarios = await db.execute(  # [CONTROLADO]
        select(Usuario).where(
            Usuario.esta_activo == True,
            Usuario.area.isnot(None),
            Usuario.cargo.isnot(None)
        )
    )
    usuarios = result_usuarios.scalars().all()

    # 2. Sincronizar áreas
    # Cargar todas las áreas activas para hacer búsqueda insensible a tildes en Python
    res_todas_areas = await db.execute(select(AreaRP).where(AreaRP.activo == True))  # [CONTROLADO]
    todas_areas = res_todas_areas.scalars().all()
    # Mapa: nombre_sin_tilde → objeto area (preferimos la versión acentuada si existe)
    areas_sin_tilde_map: dict = {quitar_tildes(a.nombre): a for a in todas_areas}

    areas_insertadas = {}  # clave: nombre_sin_tilde → area_id
    for u in usuarios:
        area_norm = u.area.upper().strip()
        if not area_norm:
            continue
        area_sin_tilde = quitar_tildes(area_norm)
        if area_sin_tilde not in areas_insertadas:
            area_obj = areas_sin_tilde_map.get(area_sin_tilde)
            if not area_obj:
                # No existe ni con tilde ni sin tilde → crear nueva
                area_obj = AreaRP(nombre=area_norm, activo=True)
                db.add(area_obj)
                await db.flush()
                areas_sin_tilde_map[area_sin_tilde] = area_obj
            areas_insertadas[area_sin_tilde] = area_obj.id

    # 3. Sincronizar cargos
    cargos_insertados = {}
    for u in usuarios:
        area_sin_tilde = quitar_tildes(u.area) if u.area else ""
        cargo_norm = u.cargo.strip() if u.cargo else ""
        if not area_sin_tilde or not cargo_norm:
            continue
        area_id = areas_insertadas.get(area_sin_tilde)
        if not area_id:
            continue

        clave_cargo = (area_id, cargo_norm.upper())
        if clave_cargo not in cargos_insertados:
            res_cargo = await db.execute(  # [CONTROLADO]
                select(CargoRP).where(
                    CargoRP.area_id == area_id,
                    func.upper(CargoRP.nombre) == func.upper(cargo_norm)
                )
            )
            cargo_obj = res_cargo.scalars().first()
            if not cargo_obj:
                cargo_obj = CargoRP(area_id=area_id, nombre=cargo_norm, activo=True)
                db.add(cargo_obj)
                await db.flush()
            cargos_insertados[clave_cargo] = cargo_obj.id

    # 3.4 Obtener relaciones jerárquicas activas
    result_relaciones = await db.execute(  # [CONTROLADO]
        select(RelacionUsuario).where(RelacionUsuario.esta_activa == True)
    )
    relaciones = result_relaciones.scalars().all()

    # Construir mapa de usuario_id -> superior_id para calcular niveles
    parent_map = {r.usuario_id: r.superior_id for r in relaciones}

    def obtener_nivel_usuario(uid: str) -> int:
        nivel = 0
        visitados = set()
        actual = uid
        while actual in parent_map:
            actual = parent_map[actual]
            if actual in visitados:
                break
            visitados.add(actual)
            nivel += 1
        return nivel

    # 3.5 Sincronizar Aprobadores/Directores de área (Nivel N3 en la Jerarquía)
    from app.models.rrhh.catalogos import AprobadorAreaRP
    for u in usuarios:
        cargo_upper = u.cargo.upper() if u.cargo else ""
        rol_lower = u.rol.lower() if u.rol else ""
        
        nivel_arbol = obtener_nivel_usuario(u.id)
        
        # Determinar si es director N3:
        # Debe cumplir con la nomenclatura de director (excluyendo subdirectores, gerentes, jefes, coordinadores, etc.)
        es_director_por_nombre = (rol_lower == "director") or (
            "DIRECTOR" in cargo_upper 
            and "SUBDIRECTOR" not in cargo_upper
            and "GERENTE" not in cargo_upper
            and "JEFE" not in cargo_upper
            and "COORDINADOR" not in cargo_upper
            and "LIDER" not in cargo_upper
            and "SUPERVISOR" not in cargo_upper
            and "ANALISTA" not in cargo_upper
            and "ASISTENTE" not in cargo_upper
            and "AUXILIAR" not in cargo_upper
        )
        
        if len(relaciones) > 0:
            # Si el árbol de jerarquía tiene relaciones, debe estar en el nivel 2 (N3) o inferior (para tolerar self-loops/raíces)
            is_director = (nivel_arbol <= 2) and es_director_por_nombre
        else:
            is_director = es_director_por_nombre
        
        if is_director and u.area:
            area_id = areas_insertadas.get(quitar_tildes(u.area))
            if not area_id:
                continue
            
            email_busqueda = u.correo.lower().strip() if u.correo else f"{u.cedula.strip().lower()}@refridcol.com"
            stmt_aprob = select(AprobadorAreaRP).where(
                (func.lower(AprobadorAreaRP.email_aprobador) == email_busqueda) |
                (func.lower(AprobadorAreaRP.nombre_aprobador) == u.nombre.lower().strip())
            )
            res_aprob = await db.execute(stmt_aprob)  # [CONTROLADO]
            aprob_obj = res_aprob.scalars().first()
            
            if not aprob_obj:
                aprob_obj = AprobadorAreaRP(
                    area_id=area_id,
                    nombre_aprobador=u.nombre.upper().strip(),
                    email_aprobador=email_busqueda,
                    activo=True
                )
                db.add(aprob_obj)
                await db.flush()

    # 4. Sincronizar relaciones jerárquicas (asignar directores/aprobadores a los cargos de forma ascendente)

    user_to_cargo_id = {}
    for u in usuarios:
        area_sin_tilde = quitar_tildes(u.area) if u.area else ""
        cargo_norm = u.cargo.strip() if u.cargo else ""
        area_id = areas_insertadas.get(area_sin_tilde)
        if area_id and cargo_norm:
            cargo_id = cargos_insertados.get((area_id, cargo_norm.upper()))
            if cargo_id:
                user_to_cargo_id[u.id] = cargo_id

    # Obtener lista de aprobadores activos
    aprobadores_res = await db.execute(select(AprobadorAreaRP).where(AprobadorAreaRP.activo == True))  # [CONTROLADO]
    aprobadores_list = aprobadores_res.scalars().all()

    def buscar_aprobador(user_obj) -> Optional[AprobadorAreaRP]:
        if not user_obj:
            return None
        email = user_obj.correo.lower().strip() if user_obj.correo else ""
        nombre = user_obj.nombre.lower().strip() if user_obj.nombre else ""
        for ap in aprobadores_list:
            if (email and ap.email_aprobador.lower() == email) or (ap.nombre_aprobador.lower() == nombre):
                return ap
        return None

    for rel in relaciones:
        sub_cargo_id = user_to_cargo_id.get(rel.usuario_id)
        if not sub_cargo_id:
            continue

        # Subir por el árbol jerárquico hasta encontrar al superior que sea Director/Aprobador registrado
        superior_actual_id = rel.superior_id
        aprob_obj = None
        visitados = set()

        while superior_actual_id and superior_actual_id not in visitados:
            visitados.add(superior_actual_id)
            user_sup = next((u for u in usuarios if u.id == superior_actual_id), None)
            if not user_sup:
                break

            aprob_obj = buscar_aprobador(user_sup)
            if aprob_obj:
                break

            # Si el superior actual no es aprobador (por ejemplo, es un jefe intermedio), seguimos subiendo
            superior_actual_id = parent_map.get(superior_actual_id)

        if aprob_obj:
            cargo_sub = await db.get(CargoRP, sub_cargo_id)
            if cargo_sub:
                cargo_sub.cargo_superior_id = aprob_obj.id
                db.add(cargo_sub)

    await db.commit()


@router.post("/sincronizar-jerarquia", status_code=status.HTTP_200_OK)
async def sincronizar_jerarquia(db: AsyncSession = Depends(obtener_db)):
    """Sincroniza áreas, cargos y sus relaciones superiores a partir de los datos consolidados en los usuarios."""
    try:
        await sincronizar_catalogos_desde_jerarquia(db)
        return {"detail": "Sincronización exitosa."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la sincronización: {str(e)}")


@router.delete("/aprobadores/{aprobador_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desactivar_aprobador(aprobador_id: int, db: AsyncSession = Depends(obtener_db)):
    result = await db.execute(select(AprobadorAreaRP).where(AprobadorAreaRP.id == aprobador_id))  # [CONTROLADO]
    aprobador = result.scalar_one_or_none()
    if not aprobador:
        raise HTTPException(status_code=404, detail="Aprobador no encontrado")
    aprobador.activo = False  # Baja lógica
    await db.commit()
