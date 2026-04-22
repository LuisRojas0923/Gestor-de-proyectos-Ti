# Mantenimiento de Bases de Datos

Este directorio contiene herramientas de automatización para la sincronización y reparación de las bases de datos entre los entornos de Producción, Pruebas y Local.

## 🖥️ Interfaz Gráfica (Recomendado)
Para mayor facilidad, hemos creado una pequeña aplicación visual que permite ejecutar todos los scripts con un solo clic.

*   **Comando para abrir la interfaz:**
    ```bash
    python .\db_manager_gui.py
    ```
*   **Ventaja:** No necesitas recordar los nombres de los archivos ni comandos de PowerShell. La interfaz abrirá cada script en una ventana independiente.

## 🚀 Clonación de Bases de Datos

Los scripts están diseñados para ejecutarse en **PowerShell** y utilizan Docker para realizar la transferencia de datos sin necesidad de instalar PostgreSQL localmente.

### 1. Sincronizar Pruebas a Local
Ideal para replicar errores del servidor en tu entorno de desarrollo.
*   **Comando:**
    ```powershell
    powershell -ExecutionPolicy Bypass -File .\clone_test_to_local.ps1
    ```
*   **Qué hace:** 
    - Lee las credenciales de `.env.pruebas3` y `.env`.
    - Clona la DB de Pruebas a tu contenedor local.
    - **Autosanación:** Reinicia automáticamente el backend local para corregir secuencias (IDs).

### 2. Sincronizar Producción a Local
Clonación directa desde el servidor principal a tu entorno de desarrollo.
*   **Comando:**
    ```powershell
    powershell -ExecutionPolicy Bypass -File .\clone_prod_to_local.ps1
    ```
*   **Qué hace:** 
    - Extrae datos de Producción y los inyecta en el contenedor local.
    - Útil para auditorías locales rápidas.

### 3. Sincronizar Producción a Pruebas
Para mantener el servidor de pruebas actualizado con datos reales.
*   **Comando:**
    ```powershell
    powershell -ExecutionPolicy Bypass -File .\clone_prod_to_test.ps1
    ```

### 4. Sincronizar ERP (Solid) de Producción a Pruebas
Operación crítica para actualizar la base de datos del ERP espejo.
*   **Comando:**
    ```powershell
    powershell -ExecutionPolicy Bypass -File .\clone_erp_prod_to_test.ps1
    ```

---

> [!TIP]
> **Preservación de Caracteres Especiales (UTF-8)**
> Todos los scripts han sido optimizados para Windows/PowerShell. Forzamos la salida en UTF-8 para asegurar que la **ñ**, las **tildes** y otros caracteres del español no se dañen durante la transferencia de datos entre servidores.

---

## 🛠️ Sistema de Autosanación (Self-Healing)

Hemos implementado una lógica de reparación automática en el backend que se activa en cada arranque. 

### ¿Qué repara automáticamente?
- **IDs de Tickets:** Sincroniza la secuencia `ticket_id_seq` analizando el valor máximo de los IDs con formato `TKT-XXXX`.
- **Secuencias Genéricas:** Busca todas las tablas con columnas `SERIAL` o `IDENTITY` y las ajusta al valor real de los datos.

**Nota:** No es necesario ejecutar SQL manual tras un clon; el backend se encarga de todo al reiniciarse.

---

## 📋 Requisitos
1. **Docker Desktop** en ejecución.
2. Contenedores locales arriba: `docker-compose up -d`.
3. Conexión a la red de la empresa (VPN si aplica) para alcanzar las IPs de los servidores.

## ⚠️ Solución de Problemas
Si el script falla por permisos, asegúrate de ejecutarlo como Administrador o usar el flag `-ExecutionPolicy Bypass` mostrado arriba.
