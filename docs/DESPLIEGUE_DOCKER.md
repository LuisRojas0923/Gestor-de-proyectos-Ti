# 🐳 Instructivo de Despliegue Docker - Gestor de Proyectos TI

Guía paso a paso para gestionar el sistema en el servidor de producción (`SRV-BD`).

- **Sistema operativo**: Windows Server con WSL2 (Ubuntu)
- **Ruta del proyecto**: `/mnt/c/GestorTI`

---

## 1. Configuración Inicial (Solo una vez)

Abrir **PowerShell como Administrador** en el servidor y ejecutar el siguiente comando para que Docker arranque automáticamente cada vez que el servidor se encienda:

```powershell
$action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d Ubuntu -e bash -c 'sudo docker compose -f /mnt/c/GestorTI/docker-compose.prod.yml up -d && sleep infinity'"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "DockerGestorTI" -Action $action -Trigger $trigger -Principal $principal -Description "Inicia Docker del Gestor TI al arrancar Windows"
```

Para verificar que se creó correctamente:

```powershell
Get-ScheduledTask -TaskName "DockerGestorTI"
```

> A partir de este momento, el sistema arrancará solo cada vez que el servidor se encienda o reinicie. No es necesario abrir ninguna terminal.

---

## 2. Desplegar Actualizaciones de Código

Cada vez que se suban cambios nuevos a GitHub, abrir una terminal de **Ubuntu (WSL)** y ejecutar:

```bash
cd /mnt/c/GestorTI
git pull origin main
sudo docker-compose -f docker-compose.prod.yml up --build -d
```

Verificar que los contenedores estén corriendo:

```bash
sudo docker ps
```

> Ya puedes cerrar la terminal. Los contenedores seguirán corriendo en segundo plano.

---

## 3. Ver Logs del Sistema

Para consultar los registros de actividad del sistema:

```bash
# Todos los servicios
sudo docker-compose -f docker-compose.prod.yml logs -f

# Solo el backend
sudo docker-compose -f docker-compose.prod.yml logs -f backend

# Solo el frontend
sudo docker-compose -f docker-compose.prod.yml logs -f frontend

# Solo la base de datos
sudo docker-compose -f docker-compose.prod.yml logs -f db
```

> Para salir de los logs presionar `Ctrl + C`.

---

## 4. Reiniciar los Servicios

Si la aplicación presenta comportamiento inusual:

```bash
cd /mnt/c/GestorTI
sudo docker-compose -f docker-compose.prod.yml restart
```

---

## 5. Solución de Problemas

### Error `ContainerConfig` en la base de datos

```bash
sudo docker rm -f gestor-de-proyectos-ti-db
sudo docker-compose -f docker-compose.prod.yml up --build -d
```

### Error `duplicate key` al crear tickets

```bash
sudo docker exec -it gestor-de-proyectos-ti-db psql -U postgres -d gestor_ti -c "
  SELECT setval('ticket_id_seq', (SELECT COALESCE(MAX(id), 0) FROM ticket));
  SELECT setval('historial_ticket_id_seq', (SELECT COALESCE(MAX(id), 0) FROM historial_ticket));
  SELECT setval('adjuntos_ticket_id_seq', (SELECT COALESCE(MAX(id), 0) FROM adjuntos_ticket));
"
```

### Detener completamente el sistema

```bash
cd /mnt/c/GestorTI
sudo docker-compose -f docker-compose.prod.yml down
```

---

*Última actualización: febrero 2026*
