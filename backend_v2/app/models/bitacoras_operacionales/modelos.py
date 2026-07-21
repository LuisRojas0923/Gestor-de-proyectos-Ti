"""Modelos persistentes de Bitacoras Operacionales."""
from datetime import date, datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


def _uuid_pk() -> Column:
    return Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        nullable=False,
        server_default=text("gen_random_uuid()"),
    )


class BitacoraOperacional(SQLModel, table=True):
    __tablename__ = "bitacoras_operacionales"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('BORRADOR', 'FINALIZADA')",
            name="ck_bitacora_estado_valido",
        ),
        CheckConstraint("version > 0", name="ck_bitacora_version_positiva"),
        CheckConstraint(
            "btrim(orden_trabajo) <> '' AND btrim(nombre_obra) <> '' "
            "AND btrim(ciudad) <> '' AND btrim(ingeniero_responsable) <> ''",
            name="ck_bitacora_snapshots_no_vacios",
        ),
        CheckConstraint(
            "novedades_dia IS NULL OR btrim(novedades_dia) <> ''",
            name="ck_bitacora_novedad_no_vacia",
        ),
        CheckConstraint(
            "btrim(codigo_formato) <> '' AND btrim(version_formato) <> ''",
            name="ck_bitacora_formato_no_vacio",
        ),
        CheckConstraint(
            "NOT sin_novedad OR novedades_dia IS NULL",
            name="ck_bitacora_novedad_coherente",
        ),
        CheckConstraint(
            "(firma_hash IS NULL OR firma_hash ~ '^[0-9a-f]{64}$') AND "
            "(pdf_hash IS NULL OR pdf_hash ~ '^[0-9a-f]{64}$')",
            name="ck_bitacora_hashes_sha256",
        ),
        CheckConstraint(
            "(estado = 'BORRADOR' AND finalizado_por_id IS NULL "
            "AND firma_ruta IS NULL AND firma_hash IS NULL "
            "AND pdf_ruta IS NULL AND pdf_hash IS NULL "
            "AND nombre_firmante IS NULL AND version_constancia IS NULL "
            "AND finalizado_en IS NULL) OR "
            "(estado = 'FINALIZADA' AND finalizado_por_id IS NOT NULL "
            "AND finalizado_por_id = creado_por_id "
            "AND firma_ruta IS NOT NULL AND firma_hash IS NOT NULL "
            "AND pdf_ruta IS NOT NULL AND pdf_hash IS NOT NULL "
            "AND nombre_firmante IS NOT NULL AND version_constancia IS NOT NULL "
            "AND btrim(firma_ruta) <> '' AND btrim(pdf_ruta) <> '' "
            "AND btrim(nombre_firmante) <> '' AND btrim(version_constancia) <> '' "
            "AND finalizado_en IS NOT NULL "
            "AND (sin_novedad OR COALESCE(btrim(novedades_dia), '') <> ''))",
            name="ck_bitacora_estado_artefactos",
        ),
        Index(
            "idx_bitacoras_propietario_fecha",
            "creado_por_id",
            "fecha_elaboracion",
        ),
        Index("idx_bitacoras_ot_fecha", "orden_trabajo", "fecha_elaboracion"),
        Index("idx_bitacoras_estado_fecha", "estado", "fecha_elaboracion"),
    )

    id: UUID = Field(default_factory=uuid4, sa_column=_uuid_pk())
    fecha_elaboracion: date = Field(sa_column=Column(Date, nullable=False))
    orden_trabajo: str = Field(sa_column=Column(String(50), nullable=False))
    nombre_obra: str = Field(sa_column=Column(String(255), nullable=False))
    ciudad: str = Field(sa_column=Column(String(120), nullable=False))
    ingeniero_responsable: str = Field(
        sa_column=Column(String(255), nullable=False)
    )
    estado: str = Field(
        default="BORRADOR",
        sa_column=Column(String(20), nullable=False, server_default="BORRADOR"),
    )
    version: int = Field(
        default=1,
        ge=1,
        sa_column=Column(Integer, nullable=False, server_default="1"),
    )
    novedades_dia: Optional[str] = Field(default=None, sa_column=Column(Text))
    sin_novedad: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
    )
    creado_por_id: str = Field(
        sa_column=Column(
            String(50),
            ForeignKey(
                "usuarios.id", ondelete="RESTRICT", name="fk_bitacora_creador"
            ),
            nullable=False,
        )
    )
    finalizado_por_id: Optional[str] = Field(
        default=None,
        sa_column=Column(
            String(50),
            ForeignKey(
                "usuarios.id", ondelete="RESTRICT", name="fk_bitacora_finalizador"
            ),
        ),
    )
    firma_ruta: Optional[str] = Field(
        default=None, sa_column=Column(String(500))
    )
    firma_hash: Optional[str] = Field(default=None, sa_column=Column(String(64)))
    pdf_ruta: Optional[str] = Field(default=None, sa_column=Column(String(500)))
    pdf_hash: Optional[str] = Field(default=None, sa_column=Column(String(64)))
    nombre_firmante: Optional[str] = Field(
        default=None, sa_column=Column(String(255))
    )
    version_constancia: Optional[str] = Field(
        default=None, sa_column=Column(String(50))
    )
    codigo_formato: str = Field(sa_column=Column(String(30), nullable=False))
    fecha_formato: date = Field(sa_column=Column(Date, nullable=False))
    version_formato: str = Field(sa_column=Column(String(20), nullable=False))
    creado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
    actualizado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
    finalizado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True)),
    )


class BitacoraOperacionalActividad(SQLModel, table=True):
    __tablename__ = "bitacora_operacional_actividades"
    __table_args__ = (
        CheckConstraint("orden > 0", name="ck_bitacora_actividad_orden_positivo"),
        CheckConstraint(
            "btrim(descripcion) <> ''",
            name="ck_bitacora_actividad_descripcion_no_vacia",
        ),
        UniqueConstraint(
            "bitacora_id",
            "orden",
            name="uq_bitacora_actividad_orden",
            deferrable=True,
            initially="DEFERRED",
        ),
    )

    id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            BigInteger,
            primary_key=True,
            autoincrement=True,
            nullable=False,
        ),
    )
    bitacora_id: UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey(
                "bitacoras_operacionales.id",
                ondelete="RESTRICT",
                name="fk_bitacora_actividad_padre",
            ),
            nullable=False,
        )
    )
    orden: int = Field(sa_column=Column(SmallInteger, nullable=False))
    descripcion: str = Field(sa_column=Column(Text, nullable=False))


class BitacoraOperacionalFotografia(SQLModel, table=True):
    __tablename__ = "bitacora_operacional_fotografias"
    __table_args__ = (
        CheckConstraint("orden > 0", name="ck_bitacora_fotografia_orden_positivo"),
        CheckConstraint(
            "tamano_bytes > 0 AND ancho > 0 AND alto > 0",
            name="ck_bitacora_fotografia_dimensiones_positivas",
        ),
        CheckConstraint(
            "btrim(ruta_relativa) <> '' AND btrim(nombre_original) <> '' "
            "AND btrim(tipo_mime) <> ''",
            name="ck_bitacora_fotografia_metadatos_no_vacios",
        ),
        CheckConstraint(
            "hash_sha256 ~ '^[0-9a-f]{64}$'",
            name="ck_bitacora_fotografia_hash_sha256",
        ),
        UniqueConstraint(
            "bitacora_id",
            "orden",
            name="uq_bitacora_fotografia_orden",
            deferrable=True,
            initially="DEFERRED",
        ),
        UniqueConstraint(
            "ruta_relativa",
            name="uq_bitacora_fotografia_ruta",
        ),
    )

    id: UUID = Field(default_factory=uuid4, sa_column=_uuid_pk())
    bitacora_id: UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey(
                "bitacoras_operacionales.id",
                ondelete="RESTRICT",
                name="fk_bitacora_fotografia_padre",
            ),
            nullable=False,
        )
    )
    orden: int = Field(sa_column=Column(SmallInteger, nullable=False))
    ruta_relativa: str = Field(sa_column=Column(String(500), nullable=False))
    nombre_original: str = Field(sa_column=Column(String(255), nullable=False))
    tipo_mime: str = Field(sa_column=Column(String(100), nullable=False))
    tamano_bytes: int
    ancho: int
    alto: int
    hash_sha256: str = Field(sa_column=Column(String(64), nullable=False))
    creado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
