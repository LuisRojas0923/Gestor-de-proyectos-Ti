import openai
import google.generativeai as genai
import logging
from typing import Dict, List, Optional
import os
import random
import asyncio
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        # Configure OpenAI
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        
        # Configure Google Gemini
        self.gemini_api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        
        # Mock mode - si no hay APIs configuradas, usar respuestas simuladas
        self.mock_mode = not (self.openai_api_key or self.anthropic_api_key or self.gemini_api_key)
        
        if not self.mock_mode:
            if self.openai_api_key:
                openai.api_key = self.openai_api_key
            if self.gemini_api_key:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-pro')
        
        logging.basicConfig(level=logging.INFO)
        logging.info(f"AI Service initialized in {'MOCK' if self.mock_mode else 'LIVE'} mode")
    
    async def analyze_requirement(self, requirement_data: Dict) -> Dict:
        """Analyze a requirement using AI to extract insights and suggestions"""
        try:
            if self.mock_mode:
                return await self._mock_analyze_requirement(requirement_data)
            
            # Create prompt for requirement analysis
            prompt = f"""
            Analiza el siguiente requerimiento de software y proporciona:
            
            Requerimiento:
            Título: {requirement_data.get('title', 'N/A')}
            Descripción: {requirement_data.get('description', 'N/A')}
            Prioridad: {requirement_data.get('priority', 'N/A')}
            Tipo: {requirement_data.get('type', 'N/A')}
            
            Por favor proporciona:
            1. Resumen ejecutivo (2-3 líneas)
            2. Clasificación sugerida (Bug, Feature, Enhancement, etc.)
            3. Prioridad sugerida (Baja, Media, Alta, Crítica)
            4. Estimación de esfuerzo (Bajo, Medio, Alto)
            5. Áreas técnicas impactadas
            6. Riesgos identificados
            7. Recomendaciones para el proveedor
            """
            
            # Use OpenAI for analysis
            if self.openai_api_key:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un analista de sistemas experto en gestión de proyectos de software."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=500,
                    temperature=0.3
                )
                
                analysis = response.choices[0].message.content
                
            # Fallback to Gemini if OpenAI fails
            elif self.gemini_api_key:
                response = self.gemini_model.generate_content(prompt)
                analysis = response.text
            else:
                return await self._mock_analyze_requirement(requirement_data)
            
            # Parse the analysis into structured format
            structured_analysis = self._parse_ai_response(analysis)
            
            return {
                "success": True,
                "analysis": structured_analysis,
                "raw_response": analysis
            }
            
        except Exception as e:
            logging.error(f"AI analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "analysis": {}
            }
    
    async def generate_communication(self, requirement_data: Dict, communication_type: str) -> Dict:
        """Generate communication content using AI"""
        try:
            if self.mock_mode:
                return await self._mock_generate_communication(requirement_data, communication_type)
            
            prompt = f"""
            Genera una comunicación de tipo '{communication_type}' para el siguiente requerimiento:
            
            Título: {requirement_data.get('title', 'N/A')}
            Descripción: {requirement_data.get('description', 'N/A')}
            Prioridad: {requirement_data.get('priority', 'N/A')}
            
            Tipo de comunicación: {communication_type}
            
            Por favor genera:
            1. Asunto del correo
            2. Contenido del mensaje (formato profesional)
            3. Puntos clave a destacar
            4. Llamada a la acción
            """
            
            # Use OpenAI for communication generation
            if self.openai_api_key:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un profesional de comunicación empresarial experto en gestión de proyectos."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=400,
                    temperature=0.4
                )
                
                content = response.choices[0].message.content
                
            # Fallback to Gemini
            elif self.gemini_api_key:
                response = self.gemini_model.generate_content(prompt)
                content = response.text
            else:
                return await self._mock_generate_communication(requirement_data, communication_type)
            
            # Parse the communication content
            communication = self._parse_communication_response(content, communication_type)
            
            return {
                "success": True,
                "communication": communication,
                "raw_response": content
            }
            
        except Exception as e:
            logging.error(f"Communication generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "communication": {}
            }
    
    async def validate_requirement_format(self, requirement_data: Dict) -> Dict:
        """Validate if requirement follows FD-FT-284 format"""
        try:
            if self.mock_mode:
                return await self._mock_validate_requirement(requirement_data)
            
            prompt = f"""
            Valida si el siguiente requerimiento cumple con el formato estándar FD-FT-284:
            
            Requerimiento:
            Título: {requirement_data.get('title', 'N/A')}
            Descripción: {requirement_data.get('description', 'N/A')}
            Prioridad: {requirement_data.get('priority', 'N/A')}
            Tipo: {requirement_data.get('type', 'N/A')}
            
            Verifica:
            1. ¿El título es claro y específico?
            2. ¿La descripción incluye contexto suficiente?
            3. ¿La prioridad está bien definida?
            4. ¿El tipo está correctamente categorizado?
            5. ¿Faltan campos obligatorios?
            
            Responde con:
            - Validación: Pasa/No pasa
            - Errores encontrados
            - Recomendaciones de mejora
            """
            
            # Use OpenAI for validation
            if self.openai_api_key:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Eres un validador experto en formatos de requerimientos de software."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=300,
                    temperature=0.2
                )
                
                validation = response.choices[0].message.content
                
            # Fallback to Gemini
            elif self.gemini_api_key:
                response = self.gemini_model.generate_content(prompt)
                validation = response.text
            else:
                return await self._mock_validate_requirement(requirement_data)
            
            # Parse validation response
            validation_result = self._parse_validation_response(validation)
            
            return {
                "success": True,
                "validation": validation_result,
                "raw_response": validation
            }
            
        except Exception as e:
            logging.error(f"Requirement validation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "validation": {}
            }
    
    def _parse_ai_response(self, response: str) -> Dict:
        """Parse AI response into structured format"""
        # This is a simplified parser - in production you'd want more sophisticated parsing
        lines = response.split('\n')
        analysis = {
            "resumen": "",
            "clasificacion": "",
            "prioridad_sugerida": "",
            "esfuerzo_estimado": "",
            "areas_impactadas": "",
            "riesgos": "",
            "recomendaciones": ""
        }
        
        current_section = None
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if "resumen" in line.lower():
                current_section = "resumen"
            elif "clasificación" in line.lower():
                current_section = "clasificacion"
            elif "prioridad" in line.lower():
                current_section = "prioridad_sugerida"
            elif "esfuerzo" in line.lower():
                current_section = "esfuerzo_estimado"
            elif "áreas" in line.lower() or "impactadas" in line.lower():
                current_section = "areas_impactadas"
            elif "riesgos" in line.lower():
                current_section = "riesgos"
            elif "recomendaciones" in line.lower():
                current_section = "recomendaciones"
            elif current_section and line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.')):
                analysis[current_section] = line[2:].strip()
        
        return analysis
    
    def _parse_communication_response(self, response: str, comm_type: str) -> Dict:
        """Parse communication response into structured format"""
        lines = response.split('\n')
        communication = {
            "subject": "",
            "content": "",
            "key_points": [],
            "call_to_action": ""
        }
        
        current_section = None
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if "asunto" in line.lower():
                current_section = "subject"
            elif "contenido" in line.lower():
                current_section = "content"
            elif "puntos clave" in line.lower():
                current_section = "key_points"
            elif "llamada" in line.lower() or "acción" in line.lower():
                current_section = "call_to_action"
            elif current_section == "subject" and line:
                communication["subject"] = line
            elif current_section == "content" and line:
                communication["content"] += line + "\n"
            elif current_section == "key_points" and line.startswith(('•', '-', '*', '1.', '2.')):
                communication["key_points"].append(line[1:].strip())
            elif current_section == "call_to_action" and line:
                communication["call_to_action"] = line
        
        return communication
    
    def _parse_validation_response(self, response: str) -> Dict:
        """Parse validation response into structured format"""
        lines = response.split('\n')
        validation = {
            "pasa": False,
            "errores": [],
            "recomendaciones": []
        }
        
        for line in lines:
            line = line.strip().lower()
            if "pasa" in line and "no" not in line:
                validation["pasa"] = True
            elif "error" in line or "problema" in line:
                validation["errores"].append(line)
            elif "recomendación" in line or "mejora" in line:
                validation["recomendaciones"].append(line)
        
        return validation
    
    # =====================================================================================
    # MOCK METHODS FOR DEVELOPMENT WITHOUT API KEYS
    # =====================================================================================
    
    async def _mock_analyze_requirement(self, requirement_data: Dict) -> Dict:
        """Mock analysis for development without API keys"""
        await asyncio.sleep(random.uniform(0.5, 2.0))  # Simulate API delay
        
        title = requirement_data.get('title', 'Requerimiento sin título')
        priority = requirement_data.get('priority', 'media')
        
        mock_responses = {
            "resumen": f"El requerimiento '{title}' requiere análisis detallado para determinar su impacto en el sistema actual.",
            "clasificacion": random.choice(["Feature", "Enhancement", "Bug Fix", "Integration"]),
            "prioridad_sugerida": priority.title() if priority else random.choice(["Baja", "Media", "Alta", "Crítica"]),
            "esfuerzo_estimado": random.choice(["Bajo", "Medio", "Alto"]),
            "areas_impactadas": random.choice([
                "Frontend, Backend, Base de datos",
                "API, Autenticación, Seguridad",
                "UI/UX, Performance, Integración"
            ]),
            "riesgos": random.choice([
                "Posible impacto en funcionalidades existentes",
                "Dependencias externas no controladas",
                "Complejidad técnica subestimada"
            ]),
            "recomendaciones": random.choice([
                "Realizar pruebas exhaustivas antes del despliegue",
                "Documentar todos los cambios realizados",
                "Coordinar con el equipo de QA para validación"
            ])
        }
        
        return {
            "success": True,
            "analysis": mock_responses,
            "raw_response": f"Análisis mock generado para: {title}",
            "mock_mode": True
        }
    
    async def _mock_generate_communication(self, requirement_data: Dict, communication_type: str) -> Dict:
        """Mock communication generation"""
        await asyncio.sleep(random.uniform(0.3, 1.5))
        
        title = requirement_data.get('title', 'Requerimiento')
        
        mock_communications = {
            "subject": f"[{communication_type.upper()}] {title}",
            "content": f"Estimado equipo,\n\nSe requiere atención sobre el requerimiento: {title}\n\nPor favor revisar y proporcionar feedback.\n\nSaludos cordiales.",
            "key_points": [
                f"Requerimiento: {title}",
                f"Tipo de comunicación: {communication_type}",
                "Se requiere respuesta en 48 horas"
            ],
            "call_to_action": "Por favor confirmar recepción y proporcionar timeline estimado."
        }
        
        return {
            "success": True,
            "communication": mock_communications,
            "raw_response": f"Comunicación mock generada para: {title}",
            "mock_mode": True
        }
    
    async def _mock_validate_requirement(self, requirement_data: Dict) -> Dict:
        """Mock requirement validation"""
        await asyncio.sleep(random.uniform(0.2, 1.0))
        
        title = requirement_data.get('title', '')
        description = requirement_data.get('description', '')
        
        # Simple validation logic
        errors = []
        if not title or len(title) < 5:
            errors.append("Título muy corto o vacío")
        if not description or len(description) < 10:
            errors.append("Descripción insuficiente")
        
        passes = len(errors) == 0
        
        return {
            "success": True,
            "validation": {
                "pasa": passes,
                "errores": errors,
                "recomendaciones": [
                    "Asegurar que el título sea descriptivo",
                    "Incluir contexto suficiente en la descripción"
                ] if not passes else ["Formato correcto"]
            },
            "raw_response": f"Validación mock completada: {'PASA' if passes else 'NO PASA'}",
            "mock_mode": True
        }
    
    async def analyze_development(self, development_id: str, query: str) -> Dict:
        """Analyze a specific development with context"""
        if self.mock_mode:
            await asyncio.sleep(random.uniform(1.0, 3.0))
            return {
                "success": True,
                "analysis": f"Análisis mock del desarrollo {development_id}: {query}",
                "confidence": random.uniform(0.7, 0.95),
                "recommendations": [
                    "Revisar cronograma actual",
                    "Validar recursos asignados",
                    "Monitorear indicadores de calidad"
                ],
                "risks": [
                    "Posible retraso en entregables",
                    "Dependencias externas pendientes"
                ],
                "mock_mode": True
            }
        # TODO: Implement real AI analysis
        return {"success": False, "error": "Real AI analysis not implemented yet"}
    
    async def get_recommendations(self, development_id: str, context: Dict) -> Dict:
        """Get AI recommendations for a development"""
        if self.mock_mode:
            await asyncio.sleep(random.uniform(0.8, 2.5))
            return {
                "success": True,
                "recommendations": [
                    {
                        "title": "Optimizar proceso de testing",
                        "description": "Implementar pruebas automatizadas para reducir tiempo de validación",
                        "priority": "high",
                        "category": "process_improvement",
                        "confidence": 0.85,
                        "estimated_impact": "Reducción del 30% en tiempo de testing"
                    },
                    {
                        "title": "Mejorar comunicación con proveedor",
                        "description": "Establecer reuniones semanales de seguimiento",
                        "priority": "medium",
                        "category": "communication",
                        "confidence": 0.78,
                        "estimated_impact": "Mejora en alineación de expectativas"
                    }
                ],
                "summary": f"Se generaron 2 recomendaciones para el desarrollo {development_id}",
                "mock_mode": True
            }
        # TODO: Implement real recommendations
        return {"success": False, "error": "Real recommendations not implemented yet"}
    
    async def contextual_chat(self, message: str, context: Dict) -> Dict:
        """Contextual chat with system knowledge"""
        if self.mock_mode:
            await asyncio.sleep(random.uniform(0.5, 2.0))
            
            responses = [
                f"Basándome en el contexto del sistema, puedo ayudarte con: {message}",
                f"Según los datos disponibles, te sugiero revisar los indicadores de calidad para: {message}",
                f"Para responder a tu consulta sobre '{message}', necesitaría más información sobre el desarrollo específico.",
                f"Basándome en el análisis de tendencias, puedo proporcionar insights sobre: {message}"
            ]
            
            return {
                "success": True,
                "response": random.choice(responses),
                "context_used": ["developments", "kpis", "quality_metrics"],
                "mock_mode": True
            }
        # TODO: Implement real contextual chat
        return {"success": False, "error": "Real contextual chat not implemented yet"}

# Example usage
if __name__ == "__main__":
    ai_service = AIService()
    
    # Test requirement data
    test_requirement = {
        "title": "Implementar autenticación OAuth2",
        "description": "Necesitamos agregar autenticación OAuth2 para integrar con servicios externos",
        "priority": "alta",
        "type": "feature"
    }
    
    print("Testing AI Service...")
    # Note: This would need to be run in an async context
    # analysis = await ai_service.analyze_requirement(test_requirement)
    # print(f"Analysis: {analysis}")
