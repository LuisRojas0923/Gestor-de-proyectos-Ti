from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.erp.centro_costo import ERPCentroCostoUen, ERPSubcentroCosto, ERPEspecialidad
from app.api.erp.centro_costo_schemas import UenCreate, SubcentroCreate, EspecialidadCreate
from typing import List

class CentroCostoErpService:
    @staticmethod
    def inicializar_tablas_erp(engine) -> None:
        """Crea las tablas en la base de datos ERP si no existen"""
        ddls = [
            """
            CREATE TABLE IF NOT EXISTS erp_centro_costo_uen (
                codigo VARCHAR(10) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                activo BOOLEAN DEFAULT TRUE NOT NULL
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS erp_subcentro_costo (
                codigo VARCHAR(10) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                activo BOOLEAN DEFAULT TRUE NOT NULL
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS erp_especialidad (
                codigo VARCHAR(10) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                activo BOOLEAN DEFAULT TRUE NOT NULL
            );
            """
        ]
        with engine.connect() as conn:
            with conn.begin():
                for ddl in ddls:
                    conn.execute(text(ddl))

    @staticmethod
    def semillar_datos_iniciales(db: Session) -> None:
        """Semilla los catálogos iniciales en el ERP si las tablas correspondientes están vacías"""
        # 1. Semillado UEN
        if db.query(ERPCentroCostoUen).count() == 0:
            uens = [
                ERPCentroCostoUen(codigo="10", nombre="RCE", activo=True),
                ERPCentroCostoUen(codigo="20", nombre="RCC", activo=True),
                ERPCentroCostoUen(codigo="30", nombre="ADN", activo=True),
                ERPCentroCostoUen(codigo="40", nombre="YAK", activo=True),
                ERPCentroCostoUen(codigo="50", nombre="WELLDONE", activo=True),
                ERPCentroCostoUen(codigo="60", nombre="REFRIDOORS", activo=True),
                ERPCentroCostoUen(codigo="70", nombre="OPERACIONES", activo=True),
                ERPCentroCostoUen(codigo="99", nombre="GENERALES", activo=True),
            ]
            db.add_all(uens)
            db.commit()

        # 2. Semillado Subcentros
        if db.query(ERPSubcentroCosto).count() == 0:
            subcentros = [
                ERPSubcentroCosto(codigo="10", nombre="ADMINISTRACION", activo=True),
                ERPSubcentroCosto(codigo="20", nombre="COMERCIAL", activo=True),
                ERPSubcentroCosto(codigo="25", nombre="COMERCIALIZACION", activo=True),
                ERPSubcentroCosto(codigo="30", nombre="PRESUPUESTOS", activo=True),
                ERPSubcentroCosto(codigo="40", nombre="ING. DESARROLLO", activo=True),
                ERPSubcentroCosto(codigo="50", nombre="INVESTIGACION Y DESARROLLO", activo=True),
                ERPSubcentroCosto(codigo="51", nombre="DTI", activo=True),
                ERPSubcentroCosto(codigo="60", nombre="PLANTA", activo=True),
                ERPSubcentroCosto(codigo="70", nombre="LOGISTICA", activo=True),
                ERPSubcentroCosto(codigo="80", nombre="OPERACIONES", activo=True),
                ERPSubcentroCosto(codigo="81", nombre="TI", activo=True),
                ERPSubcentroCosto(codigo="90", nombre="SERV. GENERALES POR DISTRIB.", activo=True),
            ]
            db.add_all(subcentros)
            db.commit()

        # 3. Semillado Especialidad
        if db.query(ERPEspecialidad).count() == 0:
            especialidades = [
                ERPEspecialidad(codigo="10", nombre="PANELERIA Y ARMADO", activo=True),
                ERPEspecialidad(codigo="20", nombre="FREON", activo=True),
                ERPEspecialidad(codigo="21", nombre="FREON - GLICOL", activo=True),
                ERPEspecialidad(codigo="30", nombre="NH3", activo=True),
                ERPEspecialidad(codigo="31", nombre="NH3 - GLICOL", activo=True),
                ERPEspecialidad(codigo="40", nombre="CO2", activo=True),
                ERPEspecialidad(codigo="41", nombre="CO2 - GLICOL", activo=True),
                ERPEspecialidad(codigo="50", nombre="CIVIL-CONCRETO", activo=True),
                ERPEspecialidad(codigo="51", nombre="CIVIL-MAMPOSTERIA", activo=True),
                ERPEspecialidad(codigo="52", nombre="CIVIL-ESTRUC. METALICA", activo=True),
                ERPEspecialidad(codigo="60", nombre="PROPANO", activo=True),
                ERPEspecialidad(codigo="99", nombre="GENERALES", activo=True),
            ]
            db.add_all(especialidades)
            db.commit()

    # --- Operaciones CRUD para UEN ---
    @staticmethod
    def obtener_todos_uen(db: Session) -> List[ERPCentroCostoUen]:
        return db.query(ERPCentroCostoUen).order_by(ERPCentroCostoUen.codigo).all()

    @staticmethod
    def crear_o_actualizar_uen(db: Session, data: UenCreate) -> ERPCentroCostoUen:
        uen = db.query(ERPCentroCostoUen).filter(ERPCentroCostoUen.codigo == data.codigo).first()
        if uen:
            uen.nombre = data.nombre
            uen.activo = data.activo
        else:
            uen = ERPCentroCostoUen(codigo=data.codigo, nombre=data.nombre, activo=data.activo)
            db.add(uen)
        db.commit()
        db.refresh(uen)
        return uen

    @staticmethod
    def cambiar_estado_uen(db: Session, codigo: str, activo: bool) -> ERPCentroCostoUen:
        uen = db.query(ERPCentroCostoUen).filter(ERPCentroCostoUen.codigo == codigo).first()
        if uen:
            uen.activo = activo
            db.commit()
            db.refresh(uen)
        return uen

    # --- Operaciones CRUD para Subcentro ---
    @staticmethod
    def obtener_todos_subcentro(db: Session) -> List[ERPSubcentroCosto]:
        return db.query(ERPSubcentroCosto).order_by(ERPSubcentroCosto.codigo).all()

    @staticmethod
    def crear_o_actualizar_subcentro(db: Session, data: SubcentroCreate) -> ERPSubcentroCosto:
        subcentro = db.query(ERPSubcentroCosto).filter(ERPSubcentroCosto.codigo == data.codigo).first()
        if subcentro:
            subcentro.nombre = data.nombre
            subcentro.activo = data.activo
        else:
            subcentro = ERPSubcentroCosto(codigo=data.codigo, nombre=data.nombre, activo=data.activo)
            db.add(subcentro)
        db.commit()
        db.refresh(subcentro)
        return subcentro

    @staticmethod
    def cambiar_estado_subcentro(db: Session, codigo: str, activo: bool) -> ERPSubcentroCosto:
        subcentro = db.query(ERPSubcentroCosto).filter(ERPSubcentroCosto.codigo == codigo).first()
        if subcentro:
            subcentro.activo = activo
            db.commit()
            db.refresh(subcentro)
        return subcentro

    # --- Operaciones CRUD para Especialidad ---
    @staticmethod
    def obtener_todos_especialidad(db: Session) -> List[ERPEspecialidad]:
        return db.query(ERPEspecialidad).order_by(ERPEspecialidad.codigo).all()

    @staticmethod
    def crear_o_actualizar_especialidad(db: Session, data: EspecialidadCreate) -> ERPEspecialidad:
        especialidad = db.query(ERPEspecialidad).filter(ERPEspecialidad.codigo == data.codigo).first()
        if especialidad:
            especialidad.nombre = data.nombre
            especialidad.activo = data.activo
        else:
            especialidad = ERPEspecialidad(codigo=data.codigo, nombre=data.nombre, activo=data.activo)
            db.add(especialidad)
        db.commit()
        db.refresh(especialidad)
        return especialidad

    @staticmethod
    def cambiar_estado_especialidad(db: Session, codigo: str, activo: bool) -> ERPEspecialidad:
        especialidad = db.query(ERPEspecialidad).filter(ERPEspecialidad.codigo == codigo).first()
        if especialidad:
            especialidad.activo = activo
            db.commit()
            db.refresh(especialidad)
        return especialidad
