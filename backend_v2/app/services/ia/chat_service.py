"""
Servicio de Chat IA para la creación de tickets - Backend V2
"""

import json
from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from app.config import config
from app.models.ticket.ticket import CategoriaTicket
from app.models.herramientas_informaticas.maestro import HerramientaInformatica
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
import logging
from app.utils_cache import global_cache
from app.services.ia.prompts import SYSTEM_PROMPT_TICKET

logger = logging.getLogger(__name__)


class ChatTicketService:
    """Orquestador de conversación para extracción de datos de tickets"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=config.ia_api_key, base_url=config.ia_base_url
        )
        self.model = (
            "meta/llama-3.1-70b-instruct"
            if "nvidia" in config.ia_provider.lower()
            else "gpt-4-turbo-preview"
        )

    async def obtener_categorias(self, db: AsyncSession) -> List[Dict[str, str]]:
        """Obtiene las categorías disponibles (con cache)"""
        cache_key = "ticket_categories_list"
        cached = global_cache.get(cache_key)
        if cached is not None:
            return cached

        result = await db.execute(select(CategoriaTicket))
        categorias = result.scalars().all()
        data = [
            {"id": cat.id, "nombre": cat.nombre, "descripcion": cat.descripcion}
            for cat in categorias
        ]

        # Cache por 10 minutos
        global_cache.set(cache_key, data, ttl=600)
        return data

    async def _obtener_inventario_completo(self, db: AsyncSession):
        """Obtiene y cachea el inventario completo para búsquedas rápidas (Python-side)"""
        cache_key = "ia:inventario_maestro"
        cached = global_cache.get(cache_key)
        if cached:
            return cached
        
        # Si no está en cache, cargar de DB
        query = select(HerramientaInformatica)
        result = await db.execute(query)
        herramientas = result.scalars().all()
        
        data = [
            {
                "id": h.id,
                "nombre": h.nombre,
                "descripcion": h.descripcion or "",
                "responsable": h.responsable or "N/A",
                "departamento": h.departamento or "N/A"
            }
            for h in herramientas
        ]
        
        # Cacheamos por 1 hora para evitar consultas constantes
        global_cache.set(cache_key, data, ttl=3600)
        return data

    async def buscar_herramientas_relevantes(self, mensaje: str, db: AsyncSession):
        """
        Busca herramientas en el inventario que coincidan con el mensaje del usuario.
        Utiliza el cache maestro para evitar latencia de BD.
        """
        # 1. Obtener inventario completo (desde Redis/RAM)
        inventario = await self._obtener_inventario_completo(db)
        fuente = "REDIS" if global_cache._redis_enabled else "RAM"
        logger.info(f"🔍 Buscando herramientas en cache ({fuente})...")
        
        # 2. Extraer palabras clave significativas
        palabras = [p.lower() for p in mensaje.split() if len(p) > 3]
        if not palabras:
            return []

        # 3. Búsqueda local en Python (muy rápida para < 1000 items)
        herramientas_encontradas = []
        vistos = set()

        for herramienta in inventario:
            nombre_low = herramienta.get('nombre', '').lower()
            desc_low = herramienta.get('descripcion', '').lower()
            
            for palabra in palabras:
                if palabra in nombre_low or palabra in desc_low:
                    if herramienta['id'] not in vistos:
                        herramientas_encontradas.append(herramienta)
                        vistos.add(herramienta['id'])
                    break
        
        return herramientas_encontradas[:3] # Limitamos a las 3 más relevantes

    async def procesar_mensaje(
        self, mensaje_usuario: str, historial: List[Dict[str, str]], db: AsyncSession
    ) -> Dict[str, Any]:
        """Procesa un mensaje y decide si pedir más info o crear el ticket"""

        categorias = await self.obtener_categorias(db)
        categorias_str = "\n".join(
            [f"- {c['id']}: {c['nombre']} ({c.get('descripcion', 'Sin descripción')})" for c in categorias]
        )

        # Búsqueda de contexto en inventario
        herramientas = await self.buscar_herramientas_relevantes(mensaje_usuario, db)
        contexto_inventario = ""
        if herramientas:
            nombres = ", ".join([h['nombre'] for h in herramientas])
            contexto_inventario = f"\n\nINSTRUCCIÓN DE INVENTARIO: Se ha detectado coincidencia con activos: {nombres}. DEBES usar la categoría 'soporte_mejora' obligatoriamente. NO menciones datos internos al usuario para mantener la respuesta ágil."

        system_prompt = SYSTEM_PROMPT_TICKET.format(
            contexto_inventario=contexto_inventario,
            categorias_str=categorias_str
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(historial)
        messages.append({"role": "user", "content": mensaje_usuario})

        response = await self.client.chat.completions.create(
            model=self.model, messages=messages, temperature=0.1, max_tokens=600
        )

        respuesta_texto = response.choices[0].message.content
        ticket_data = self.extraer_ticket_data(respuesta_texto)

        return {"respuesta": respuesta_texto, "ticket_data": ticket_data}

    def extraer_ticket_data(self, texto: str) -> Optional[Dict[str, Any]]:
        """Extrae el JSON de ticket_data de un texto"""
        if "ticket_data" in texto:
            try:
                start_idx = texto.find("{")
                end_idx = texto.rfind("}") + 1
                json_str = texto[start_idx:end_idx]
                data = json.loads(json_str)
                return data.get("ticket_data")
            except Exception:
                pass
        return None

    async def procesar_mensaje_stream(
        self, mensaje_usuario: str, historial: List[Dict[str, str]], db: AsyncSession
    ):
        """Generador para streaming de respuesta de IA"""
        
        categorias = await self.obtener_categorias(db)
        categorias_str = "\n".join(
            [f"- {c['id']}: {c['nombre']} ({c.get('descripcion', 'Sin descripción')})" for c in categorias]
        )

        herramientas = await self.buscar_herramientas_relevantes(mensaje_usuario, db)
        contexto_inventario = ""
        if herramientas:
            nombres = ", ".join([h['nombre'] for h in herramientas])
            contexto_inventario = f"\n\nINSTRUCCIÓN DE INVENTARIO: Se ha detectado coincidencia con activos: {nombres}. DEBES usar la categoría 'soporte_mejora' obligatoriamente. NO menciones datos internos al usuario para mantener la respuesta ágil."

        system_prompt = SYSTEM_PROMPT_TICKET.format(
            contexto_inventario=contexto_inventario,
            categorias_str=categorias_str
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(historial)
        messages.append({"role": "user", "content": mensaje_usuario})

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.1,
            max_tokens=600,
            stream=True
        )

        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
