# Acceso desde otros equipos en la red

## Servidor

- **IP:** 192.168.40.126
- **Base de datos PostgreSQL:** 192.168.40.126:5432

---

## URLs de acceso para otros usuarios

| Recurso | URL |
|---------|-----|
| **Aplicación (principal)** | http://192.168.40.126 |
| **API / Documentación** | http://192.168.40.126:8000/docs |
| **Adminer (gestión BD)** | http://192.168.40.126:8085 |
| **Frontend directo** | http://192.168.40.126:5173 |

---

## Puertos

| Puerto | Servicio |
|--------|----------|
| 80 | Nginx (aplicación web) |
| 5432 | PostgreSQL (base de datos) |
| 8000 | Backend API |
| 5173 | Frontend (Vite) |
| 8085 | Adminer |

---

## Firewall (PowerShell como Administrador)

```powershell
netsh advfirewall firewall add rule name="Gestor TI - HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Gestor TI - Frontend" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Gestor TI - API" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="Gestor TI - Adminer" dir=in action=allow protocol=TCP localport=8085
```
