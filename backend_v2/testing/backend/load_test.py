"""
Tests de Carga - Backend V2
Usa Locust para simular usuarios concurrentes

Ejecutar con:
    locust -f testing/backend/load_test.py --host=http://localhost:8000

O para modo headless (sin UI):
    locust -f testing/backend/load_test.py --host=http://localhost:8000 --headless -u 50 -r 5 -t 60s

NOTA: El host debe ser http://localhost:8000 (SIN /api/v2)

Parámetros:
    -u: Número total de usuarios
    -r: Usuarios por segundo (spawn rate)
    -t: Duración del test
"""
import os
from locust import HttpUser, task, between
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Credenciales desde .env
USER_CEDULA = os.getenv("USER", "admin")
USER_PASS = os.getenv("PASSWORD", "admin123")


class UsuarioPortal(HttpUser):
    """Simula un usuario del portal de soporte"""
    
    wait_time = between(1, 3)
    token = None
    
    def on_start(self):
        """Login al iniciar"""
        response = self.client.post(
            "/api/v2/auth/login",
            data={"username": USER_CEDULA, "password": USER_PASS}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            print(f"Error en login: {response.status_code} - {response.text}")
    
    def auth_headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    @task(10)
    def health_check(self):
        """Endpoint de salud - Alta frecuencia"""
        self.client.get("/health", name="GET /health")
    
    @task(5)
    def listar_categorias(self):
        """Listar categorías de tickets"""
        self.client.get(
            "/api/v2/soporte/categorias", 
            headers=self.auth_headers(),
            name="GET /soporte/categorias"
        )
    
    @task(3)
    def listar_tickets(self):
        """Listar tickets"""
        self.client.get(
            "/api/v2/soporte/", 
            headers=self.auth_headers(),
            name="GET /soporte/"
        )
    
    @task(2)
    def obtener_modulos_solid(self):
        """Obtener módulos SOLID"""
        self.client.get(
            "/api/v2/solid/modulos", 
            headers=self.auth_headers(),
            name="GET /solid/modulos"
        )
    
    @task(2)
    def ver_estadisticas_resumen(self):
        """Ver resumen de estadísticas"""
        self.client.get(
            "/api/v2/soporte/estadisticas/resumen", 
            headers=self.auth_headers(),
            name="GET /estadisticas/resumen"
        )
    
    @task(1)
    def crear_ticket(self):
        """Crear un ticket de prueba"""
        import time
        ticket_id = f"LOAD-{int(time.time() * 1000)}"
        payload = {
            "id": ticket_id,
            "categoria_id": "soporte_software",
            "asunto": "Test de Carga Automatizado",
            "descripcion": "Ticket generado por prueba de carga.",
            "creador_id": USER_CEDULA,
            "nombre_creador": "Load Tester",
            "correo_creador": "loadtest@example.com",
            "prioridad": "Baja",
            "areas_impactadas": ["Tecnología"]
        }
        self.client.post(
            "/api/v2/soporte/", 
            json=payload,
            headers=self.auth_headers(),
            name="POST /soporte/"
        )


class UsuarioAnalista(HttpUser):
    """Simula un analista consultando estadísticas"""
    
    wait_time = between(2, 5)
    token = None
    weight = 1
    
    def on_start(self):
        response = self.client.post(
            "/api/v2/auth/login",
            data={"username": USER_CEDULA, "password": USER_PASS}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
    
    def auth_headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    @task(3)
    def ver_estadisticas_avanzadas(self):
        self.client.get(
            "/api/v2/soporte/estadisticas/avanzadas", 
            headers=self.auth_headers(),
            name="GET /estadisticas/avanzadas"
        )
    
    @task(3)
    def ver_rendimiento(self):
        self.client.get(
            "/api/v2/soporte/estadisticas/rendimiento", 
            headers=self.auth_headers(),
            name="GET /estadisticas/rendimiento"
        )
    
    @task(2)
    def listar_todos_tickets(self):
        self.client.get(
            "/api/v2/soporte/", 
            headers=self.auth_headers(),
            name="GET /soporte/ (analista)"
        )
    
    @task(2)
    def ver_desarrollos(self):
        self.client.get(
            "/api/v2/desarrollos/", 
            headers=self.auth_headers(),
            name="GET /desarrollos/"
        )
    
    @task(2)
    def ver_metricas_panel(self):
        self.client.get(
            "/api/v2/panel-control/metricas", 
            headers=self.auth_headers(),
            name="GET /panel-control/metricas"
        )
    
    @task(1)
    def ver_kpis_dashboard(self):
        self.client.get(
            "/api/v2/kpis/dashboard", 
            headers=self.auth_headers(),
            name="GET /kpis/dashboard"
        )
