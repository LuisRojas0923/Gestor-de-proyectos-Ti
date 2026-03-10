from sqlmodel import select
from ...models.novedades_nomina.nomina import NominaConcepto
from ...database import AsyncSessionLocal

async def seed_nomina_conceptos():
    """Seed inicial de conceptos de nómina para clasificación automática"""
    conceptos = [
        # LIBRANZAS
        {"empresa": "BANCO DE BOGOTA", "concepto": "LIBRANZA", "categoria": "LIBRANZAS", "subcategoria": "BOGOTA LIBRANZA", "keywords": "BOGOTA, LIBRANZA"},
        {"empresa": "DAVIVIENDA", "concepto": "LIBRANZA", "categoria": "LIBRANZAS", "subcategoria": "DAVIVIENDA LIBRANZA", "keywords": "DAVIVIENDA, LIBRANZA"},
        {"empresa": "BANCO DE OCCIDENTE", "concepto": "LIBRANZA", "categoria": "LIBRANZAS", "subcategoria": "OCCIDENTE LIBRANZA", "keywords": "OCCIDENTE, LIBRANZA"},
        
        # FUNEBRES
        {"empresa": "CAMPOSANTO", "concepto": "PLAN EXEQUIAL", "categoria": "FUNEBRES", "subcategoria": "CAMPOSANTO", "keywords": "CAMPOSANTO, EXEQUIAL"},
        {"empresa": "RECORDAR", "concepto": "PLAN EXEQUIAL", "categoria": "FUNEBRES", "subcategoria": "RECORDAR", "keywords": "RECORDAR, EXEQUIAL"},
        
        # COOPERATIVAS
        {"empresa": "BENEFICIAR", "concepto": "APORTE", "categoria": "COOPERATIVAS", "subcategoria": "BENEFICIAR", "keywords": "BENEFICIAR"},
        {"empresa": "GRANCOOP", "concepto": "APORTE", "categoria": "COOPERATIVAS", "subcategoria": "GRANCOOP", "keywords": "GRANCOOP"},
    ]
    
    async with AsyncSessionLocal() as session:
        for c_data in conceptos:
            statement = select(NominaConcepto).where(
                NominaConcepto.empresa == c_data["empresa"],
                NominaConcepto.concepto == c_data["concepto"]
            )
            result = await session.execute(statement)
            if not result.scalars().first():
                concepto = NominaConcepto(**c_data)
                session.add(concepto)
        await session.commit()
