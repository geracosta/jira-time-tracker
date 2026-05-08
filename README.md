# Jira Time Tracker

App de escritorio (Electron + React + TypeScript) para trackear tiempo y registrar horas en Jira.

## Requisitos

- Node.js 18+
- npm
- Windows (el `dist` está configurado para generar instalador NSIS)

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
