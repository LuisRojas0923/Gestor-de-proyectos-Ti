"""
Servicio de Chat IA para la creación de tickets - Backend V2
"""
import json
from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from app.config import config
from app.models.ticket.ticket import CategoriaTicket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

class ChatTicketService:
    """Orquestador de conversación para extracción de datos de tickets"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=config.ia_api_key,
            base_url=config.ia_base_url
        )
        self.model = "meta/llama-3.1-405b-instruct" if "nvidia" in config.ia_provider.lower() else "gpt-4-turbo-preview"

    async def obtener_categorias(self, db: AsyncSession) -> List[Dict[str, str]]:
        """Obtiene las categorías disponibles para el prompt"""
        result = await db.execute(select(CategoriaTicket))
        categorias = result.scalars().all()
        return [{"id": cat.id, "nombre": cat.nombre, "descripcion": cat.descripcion} for cat in categorias]

    async def procesar_mensaje(
        self, 
        mensaje_usuario: str, 
        historial: List[Dict[str, str]], 
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Procesa un mensaje y decide si pedir más info o crear el ticket"""
        
        categorias = await self.obtener_categorias(db)
        categorias_str = "\\n".join([f"- {c['id']}: {c['nombre']} ({c['descripcion']})" for c in categorias])

        system_prompt = f"""
Eres un asistente inteligente de soporte técnico para Refridcol. Tu objetivo es ayudar al usuario a reportar un problema o solicitud de forma conversacional.

Debes extraer la siguiente información para crear un ticket:
1. **asunto**: Un título breve y descriptivo (máximo 100 caracteres).
2. **descripcion**: Detalle completo de lo que sucede.
3. **prioridad**: Debe ser una de: 'Baja', 'Media', 'Alta', 'Crítica'.
4. **categoria_id**: Debe ser uno de los IDs de esta lista:
{categorias_str}

REGLAS DE INTERACCIÓN:
- Sé amable, profesional y eficiente.
- Si falta información, pídela de forma natural en tu respuesta.
- Si el usuario te da información vaga, ayúdale a precisar.
- Cuando tengas TODA la información necesaria, DEBES finalizar tu respuesta con un bloque JSON que contenga los campos extraídos bajo la clave "ticket_data".

EJEMPLO DE CIERRE CON DATOS:
"Perfecto, ya tengo toda la información. Voy a crear tu ticket de Soporte de Software por el fallo en Excel.
{{
  \\"ticket_data\\": {{
    \\"asunto\\": \\"Error al abrir archivos Excel\\",
    \\"descripcion\\": \\"El usuario reporta que al intentar abrir cualquier archivo de Excel el programa se cierra inesperadamente sin mostrar error.\\",
    \\"prioridad\\": \\"Media\\",
    \\"categoria_id\\": \\"soporte_software\\"
  }}
}} "
"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(historial)
        messages.append({"role": "user", "content": mensaje_usuario})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )

        respuesta_texto = response.choices[0].message.content
        
        # Intentar extraer JSON si existe
        ticket_data = None
        if "ticket_data" in respuesta_texto:
            try:
                # Buscar el inicio y fin del JSON
                start_idx = respuesta_texto.find("{")
                end_idx = respuesta_texto.rfind("}") + 1
                json_str = respuesta_texto[start_idx:end_idx]
                data = json.loads(json_str)
                ticket_data = data.get("ticket_data")
            except Exception:
                pass

        return {
            "respuesta": respuesta_texto,
            "ticket_data": ticket_data
        }
