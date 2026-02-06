# Configurar credenciales de Git para GitHub (Windows)

Para poder hacer `git pull` y `git push` con el repositorio en GitHub necesitas credenciales. GitHub ya **no acepta contraseña** por HTTPS; debes usar un **Personal Access Token (PAT)**.

---

## 1. Credenciales ya configuradas en tu equipo

- **Almacenamiento:** Git está configurado para usar el **Administrador de credenciales de Windows** (`credential.helper = manager`).
- La **primera vez** que hagas `git pull` o `git push`, Windows te pedirá usuario y “contraseña”; en contraseña debes pegar el **token** (no tu contraseña de GitHub).

---

## 2. Crear un Personal Access Token (PAT) en GitHub

1. Entra a **GitHub** e inicia sesión.
2. Clic en tu **foto de perfil** (arriba a la derecha) → **Settings**.
3. En el menú izquierdo, al final: **Developer settings**.
4. **Personal access tokens** → **Tokens (classic)**.
5. **Generate new token** → **Generate new token (classic)**.
6. Pon un **nombre** (ej: `Gestor-de-proyectos-Ti`) y elige **expiración** (ej: 90 días o No expiration).
7. Marca el permiso **repo** (acceso completo a repositorios privados).
8. Clic en **Generate token**.
9. **Copia el token** y guárdalo en un lugar seguro; solo se muestra una vez.

---

## 3. Usar el token al hacer pull/push

1. Abre **PowerShell** o **CMD** en la carpeta del proyecto:
   ```powershell
   cd C:\Users\amejoramiento2\Documents\Gestor-de-proyectos-Ti-2
   ```
2. Ejecuta:
   ```powershell
   git pull origin main
   ```
3. Cuando pida **usuario:** tu usuario de GitHub (ej: `LuisRojas0923`).
4. Cuando pida **contraseña:** pega el **token** (no la contraseña de tu cuenta).
5. Windows guardará las credenciales; las próximas veces no debería pedírtelas de nuevo.

---

## 4. Si sigue pidiendo credenciales o da error

- Asegúrate de pegar el **token** en “contraseña”, no la contraseña de GitHub.
- En **Administrador de credenciales de Windows** (buscar “Credential Manager”):
  - **Credenciales de Windows** → buscar `git:https://github.com`.
  - Si hay una antigua, **editar** y poner el nuevo token en contraseña, o **quitar** y volver a hacer `git pull` para que pida de nuevo.

---

## 5. Alternativa: usar SSH

Si prefieres no usar token por HTTPS:

1. Generar una clave SSH en tu PC.
2. Añadir la clave pública en GitHub (Settings → SSH and GPG keys).
3. Cambiar la URL del remoto a SSH:
   ```powershell
   git remote set-url origin git@github.com:LuisRojas0923/Gestor-de-proyectos-Ti.git
   ```
4. A partir de ahí, `git pull` y `git push` usarán la clave SSH.

---

**Resumen:** Crea un token en GitHub (Developer settings → Personal access tokens), haz `git pull origin main` y cuando pida contraseña pega el **token**. Git ya está configurado para guardar esas credenciales en Windows.
