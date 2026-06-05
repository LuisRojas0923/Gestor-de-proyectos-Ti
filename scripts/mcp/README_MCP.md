# Servidor MCP - Gestor de Proyectos TI

Este directorio contiene la implementación del **Model Context Protocol (MCP)** para el Gestor de Proyectos TI. Permite a los agentes de Inteligencia Artificial (como Claude Desktop, Cursor, Copilot) conectarse de forma nativa a la base de datos y matriz de desarrollos mediante una interfaz de entrada/salida estándar (stdio).

---

## 🛠️ Arquitectura y Seguridad

El diseño del servidor MCP sigue un enfoque de seguridad **Zero Trust / Defense in Depth** basado en las siguientes directrices:

1. **Tokens JWT Firmados y de Vigencia Controlada**: Cada sesión MCP cuenta con su propio token JWT con fecha de vencimiento y alcance (`scope`) restringido.
2. **Protección de Credenciales (Keyring)**: El token de acceso nunca se almacena en texto plano. Se guarda de forma segura en el llavero de credenciales nativo del sistema operativo (Windows Credential Manager, macOS Keychain, o Secret Service en Linux).
3. **Verificación Local de Firma**: El servidor MCP utiliza el secreto `GPM_JWT_SECRET` para comprobar localmente la firma del token recibido por el cliente antes de llamar al backend, impidiendo la manipulación de scopes.
4. **Rate Limiting Local**: Se aplica un algoritmo *Token Bucket* en el servidor local para evitar el abuso de llamadas de API (límite por herramienta y global) antes de que afecten al backend.

---

## 📋 Requisitos de Instalación

Las dependencias de este módulo se gestionan de forma independiente a través de `scripts/mcp/requirements-mcp.txt`. 

Para instalar el entorno localmente, puedes ejecutar:
```bash
pip install -r scripts/mcp/requirements-mcp.txt
```
*(O utilizar `uv` directamente para ejecuciones inmediatas y aisladas).*

---

## 🚀 Guía de Configuración e Inicio Rápido

### Paso 1: Generar un Token de Acceso Seguro
Ejecuta la CLI interactiva para loguearte con tu usuario y contraseña. El script generará el token MCP JWT y lo guardará automáticamente en el keyring de tu sistema:
```bash
uv run scripts/mcp/mcp_token_cli.py
```
*Te solicitará tu cédula (cédula del usuario), contraseña, el motivo/nombre del token (ej. "claude-desktop") y la vigencia en días (máx. 30).*

### Paso 2: Probar el Servidor MCP en Local (Smoke Test)
Puedes ejecutar el script de verificación End-to-End para certificar que el protocolo stdio, JSON-RPC y las conexiones del backend estén respondiendo de forma correcta:
```bash
# Setea la variable con la contraseña de tu llavero y ejecuta el test e2e
GPM_TEST_PASSWORD="tu_contraseña" uv run scripts/mcp/e2e_mcp_server.py
```

### Paso 3: Configurar en Clientes (ej: Claude Desktop)
Para integrar este servidor en Claude Desktop, añade el siguiente objeto a tu archivo de configuración de cliente `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gestor-proyectos-ti": {
      "command": "uv",
      "args": [
        "run",
        "scripts/mcp/mcp_run.py",
        "gpm_mcp_TU_CEDULA_AQUI"
      ],
      "env": {
        "GPM_API_URL": "http://127.0.0.1:8000/api/v2",
        "GPM_JWT_SECRET": "VALOR_DE_JWT_SECRET_KEY_DEL_ENV"
      }
    }
  }
}
```

---

## 🔧 Herramientas (Tools) Expuestas

| Herramienta | Scope | Descripción |
|---|---|---|
| **`whoami`** | `read` | Valida y retorna la identidad de la sesión MCP actual, el usuario emisor y el alcance del token. |
| **`listar_desarrollos`** | `read` | Lista los desarrollos del sistema aplicando paginación y filtros opcionales por estado. |
| **`obtener_desarrollo`** | `read` | Retorna el detalle completo de un proyecto/desarrollo por su ID. |
| **`listar_actividades`** | `read` | Obtiene el árbol estructurado (WBS) y todas las actividades ligadas a un desarrollo. |

---

## 🚦 Comandos de Verificación (Pruebas Pytest)

Para ejecutar la suite completa de pruebas unitarias y de integración de la infraestructura del servidor MCP:

```bash
# 1. Ejecutar pruebas unitarias de servicios de emisión y revocación
$env:PYTHONPATH="backend_v2"; pytest testing/backend/test_mcp_service.py -v
$env:PYTHONPATH="backend_v2"; pytest testing/backend/test_mcp_revocation.py -v
$env:PYTHONPATH="backend_v2"; pytest testing/backend/test_mcp_secret_rotation.py -v

# 2. Ejecutar pruebas unitarias de control de rate limit y scopes
$env:PYTHONPATH="backend_v2"; pytest testing/backend/test_mcp_rate_limit.py -v
$env:PYTHONPATH="backend_v2"; pytest testing/backend/test_mcp_scope_enforcement.py -v
$env:PYTHONPATH="backend_v2"; pytest testing/backend/test_mcp_scope_bypass.py -v
```
