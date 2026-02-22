# Plan para Levantar Entorno de Pruebas en el Servidor

Este documento detalla los pasos necesarios para configurar y levantar un entorno de pruebas fiable para el proyecto Gestor de Proyectos TI.

## 1. Requisitos Previos
- **Sistema Operativo**: Servidor Linux (Ubuntu/Debian) o Windows Server.
- **Base de Datos**: PostgreSQL (Obligatorio según las reglas del proyecto).
- **Control de Versiones**: Git.
- **Entorno de Ejecución**: Node.js/Python/Java (dependiendo del stack del backend) y gestor de paquetes correspondiente (npm, pip, maven, etc).

## 2. Preparación del Entorno
1. **Clonar el Repositorio de Pruebas**:
   ```bash
   git clone <URL_DEL_REPOSITORIO> app-testing
   cd app-testing
   git checkout <RAMA_DE_TESTING_O_STAGING>
   ```

2. **Configuración de Variables de Entorno**:
   Crear un archivo `.env.test` o configurar las variables de entorno del servidor con las credenciales específicas de la base de datos de pruebas.
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=test_user
   DB_PASSWORD=test_password
   DB_NAME=gestor_proyectos_test
   ```

## 3. Configuración de Base de Datos (PostgreSQL)
El proyecto utiliza PostgreSQL. El entorno de pruebas debe tener una base de datos aislada del entorno de producción.
1. Acceder a PostgreSQL:
   ```bash
   psql -U postgres
   ```
2. Crear la base de datos y usuario de pruebas:
   ```sql
   CREATE DATABASE gestor_proyectos_test;
   CREATE USER test_user WITH ENCRYPTED PASSWORD 'test_password';
   GRANT ALL PRIVILEGES ON DATABASE gestor_proyectos_test TO test_user;
   ```
3. Ejecutar las migraciones o scripts de creación de esquemas correspondientes en `gestor_proyectos_test`.

## 4. Instalación de Dependencias
Instalar las dependencias necesarias para asegurar que el proyecto se pueda compilar y ejecutar.
```bash
# Ejemplo para Node.js
npm install
```

## 5. Ejecución del Entorno de Pruebas
Levantar los servicios correspondientes utilizando herramientas de gestión de procesos como `pm2`, `systemd` o Docker.
```bash
# Ejemplo Docker Compose
docker-compose -f docker-compose.test.yml up -d
```

## 6. Verificación
- Comprobar los logs del servidor para verificar que no hay errores de conexión a PostgreSQL.
- Ejecutar la suite de pruebas automatizadas (Tests unitarios y de integración).
- Verificar que la interfaz de usuario se renderiza correctamente importando los componentes del sistema de diseño establecido.
