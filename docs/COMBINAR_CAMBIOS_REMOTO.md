# Combinar cambios del repositorio con los tuyos

Tus cambios locales ya están guardados en un **stash**. Sigue estos pasos en **PowerShell** o **CMD** (en tu PC, donde puedas escribir tu token de GitHub).

---

## Paso 1: Ir al proyecto

```powershell
cd C:\Users\amejoramiento2\Documents\Gestor-de-proyectos-Ti-2
```

---

## Paso 2: Traer los cambios del remoto

```powershell
git pull origin main
```

- Si pide **usuario:** tu usuario de GitHub (ej: `LuisRojas0923`).
- Si pide **contraseña:** pega tu **Personal Access Token** de GitHub (no la contraseña de la cuenta).

Con eso se bajan los últimos commits del repositorio y se fusionan con tu rama `main`.

---

## Paso 3: Recuperar tus cambios locales

```powershell
git stash pop
```

Eso vuelve a aplicar los cambios que habías guardado en el stash (archivos modificados y los que habías añadido sin commit).

---

## Si hay conflictos al hacer `git stash pop`

Si Git dice que hay conflictos en algún archivo:

1. Abre los archivos que indique Git (suelen tener marcas `<<<<<<<`, `=======`, `>>>>>>>`).
2. Deja en cada archivo la versión que quieras (tuyas, del remoto o una mezcla).
3. Borra las marcas de conflicto (`<<<<<<<`, `=======`, `>>>>>>>`).
4. Guarda los archivos.
5. Añade los archivos resueltos y haz commit:
   ```powershell
   git add .
   git commit -m "Resolver conflictos al combinar con remoto"
   ```

Si prefieres no resolver ahora:
```powershell
git stash drop
```
Eso borra el stash; tus cambios quedarían solo donde los tengas guardados (copia de seguridad, etc.).

---

## Resumen de comandos

| Orden | Comando | Qué hace |
|-------|---------|-----------|
| 1 | `cd C:\Users\amejoramiento2\Documents\Gestor-de-proyectos-Ti-2` | Entrar al proyecto |
| 2 | `git pull origin main` | Traer y fusionar cambios del repositorio (pedirá token) |
| 3 | `git stash pop` | Volver a aplicar tus cambios encima del remoto |

Cuando termines, tendrás en tu copia: los últimos cambios del repositorio **y** tus cambios locales combinados.
