# Jira Time Tracker

App de escritorio (Electron + React + TypeScript) para trackear tiempo y registrar horas en Jira.

## Requisitos

- Node.js 18+
- npm
- Windows (el `dist` está configurado para generar instalador NSIS)

## Configuración: generar el API Token de Jira

La app se conecta a Jira Cloud usando autenticación básica con tu email + un **API Token** de Atlassian (no tu contraseña). Para generarlo:

1. Iniciá sesión en Atlassian y abrí: https://id.atlassian.com/manage-profile/security/api-tokens
2. Hacé clic en **Create API token**.
3. Ponele un nombre que reconozcas (por ejemplo `jira-time-tracker`) y confirmá.
4. Copiá el token **en ese momento** — Atlassian solo lo muestra una vez. Si lo perdés, tenés que crear uno nuevo.

Luego, en la pantalla de **Settings** de la app, completá:

- **Jira URL**: la URL de tu instancia, por ejemplo `https://tu-empresa.atlassian.net`
- **Email**: el email de tu cuenta de Atlassian
- **API Token**: el token que acabás de copiar

Hacé clic en **Test / Guardar** para validar la conexión. Las credenciales se guardan localmente en tu equipo.

> Nota: si dejás de usar la app o creés que el token se filtró, podés revocarlo desde la misma página de tokens de Atlassian.

## Instalación de dependencias

```powershell
npm install
```

## Desarrollo

Levanta la app en modo desarrollo con hot reload:

```powershell
npm run dev
```

## Generar instalador (`dist`)

Compila main/preload/renderer y genera el instalador `.exe` en la carpeta `release/`:

```powershell
npm run dist
```

El comando ejecuta `electron-vite build` y luego `electron-builder --win`. El instalador NSIS queda en:

```
release/Jira Time Tracker Setup <version>.exe
```

Notas:
- La versión sale del campo `version` de `package.json` — subila ahí antes de generar un release.
- `oneClick` está en `false`, así que el instalador permite elegir carpeta de instalación.
- El icono se toma de `resources/icon.png`.

## Commit y push

Flujo estándar:

```powershell
git status
git add <archivos>
git commit -m "mensaje descriptivo"
git push
```

Para ver qué cambió antes de commitear:

```powershell
git diff              # cambios no staged
git diff --staged     # cambios ya en stage
```

Si es la primera vez que pusheás una rama nueva:

```powershell
git push -u origin <nombre-rama>
```

## Estructura del proyecto

```
src/
  main/        # proceso principal de Electron (tray, ventana, mini-widget, notificaciones)
  preload/     # bridge seguro main <-> renderer
  renderer/    # UI React (App, contextos, estilos)
resources/     # iconos
out/           # build compilado (generado por electron-vite)
release/       # instaladores generados (generado por electron-builder)
```

## Scripts disponibles

| Script          | Descripción                                          |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | Modo desarrollo con hot reload                       |
| `npm run build` | Compila el proyecto sin empaquetar instalador       |
| `npm run preview` | Previsualiza el build de producción                |
| `npm run dist`  | Build + instalador NSIS para Windows en `release/`  |
