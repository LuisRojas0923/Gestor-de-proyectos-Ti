from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.ticket.ticket import CategoriaTicket


class CategoryService:
    @staticmethod
    async def listar_categorias(db: AsyncSession) -> List[CategoriaTicket]:
        """Lista todas las categorias de tickets (Async)"""
        result = await db.execute(select(CategoriaTicket))
        return result.scalars().all()
