# Mantenimiento de Bases de Datos

Este directorio contiene herramientas de automatización para la sincronización y reparación de las bases de datos entre los entornos de Producción, Pruebas y Local.

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

### 2. Sincronizar Producción a Pruebas
Para mantener el servidor de pruebas actualizado con datos reales.
*   **Comando:**
    ```powershell
    powershell -ExecutionPolicy Bypass -File .\clone_prod_to_test.ps1
    ```
*   **Qué hace:**
    - Solicita confirmación de seguridad `[S/N]`.
    - Transfiere datos de Producción a Pruebas.
    - Reinicia el servicio en el servidor de pruebas para activar la autosanación.

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
