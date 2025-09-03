import openai
import google.generativeai as genai
import logging
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        # Configure OpenAI
        openai.api_key = os.getenv("OPENAI_API_KEY")
        
        # Configure Google Gemini
        genai.configure(api_key=os.getenv("GOOGLE_GEMINI_API_KEY"))
        self.gemini_model = genai.GenerativeModel('gemini-pro')
        
        logging.basicConfig(level=logging.INFO)
    
    async def analyze_requirement(self, requirement_data: Dict) -> Dict:
        """Analyze a requirement using AI to extract insights and suggestions"""
        try:
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
            if openai.api_key:
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
            else:
                response = self.gemini_model.generate_content(prompt)
                analysis = response.text
            
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
            if openai.api_key:
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
            else:
                response = self.gemini_model.generate_content(prompt)
                content = response.text
            
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
            if openai.api_key:
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
            else:
                response = self.gemini_model.generate_content(prompt)
                validation = response.text
            
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
