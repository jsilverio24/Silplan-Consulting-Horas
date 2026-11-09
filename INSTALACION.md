# Silplan Consulting — App de Horas Extras

**CONSULTORA · SILPLAN CONSULTING**
Servicios de Ingeniería y Planificación — República Dominicana
www.silplanconsulting.com · Av. República de Argentina #1, Plaza Belle Vue, Módulo 1A

---

## Cómo funciona

1. El empleado abre la app en su móvil y registra: brigada, nombre y cédula, fecha, horario
   (las horas se calculan solas), obra/proyecto, tipo de trabajo, cliente, provincia,
   ciudad/sector, descripción y firmas.
2. Al guardar, el registro se **envía automáticamente a Contabilidad**:
   - se agrega una fila en la hoja de Google **"Horas Extras"**,
   - las firmas se guardan en Google Drive (carpeta *Silplan - Firmas Horas Extras*) con su enlace en la fila,
   - Contabilidad recibe un **correo** con el resumen.
3. Si no hay señal en la obra, el registro queda en cola en el móvil y se envía solo cuando vuelve la conexión.
   En el historial cada registro muestra *📤 Enviado a contabilidad* o *⏳ Por enviar*.
4. La app recuerda el nombre, la cédula y la brigada del empleado para no escribirlos cada vez.

## Configuración (una sola vez, ~10 minutos)

### 1. Crear la hoja y el receptor (Google Apps Script)
1. Con la cuenta de Google de la empresa, crea una hoja de cálculo nueva: **"Silplan — Horas Extras"**.
2. Menú **Extensiones → Apps Script**.
3. Borra el contenido y pega todo el archivo [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
4. Cambia al inicio:
   - `CONTABILIDAD_EMAIL` → el correo de Contabilidad (varios: separados por comas).
   - `APP_TOKEN` → una clave propia (cualquier texto).
5. Guarda (💾).
6. **Implementar → Nueva implementación → Tipo: Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
7. Autoriza los permisos (Hoja, Drive y Gmail) y copia la **URL de la aplicación web** (termina en `/exec`).
   Ábrela en el navegador: debe mostrar `{"ok":true,...}`.

### 2. Conectar la app
Edita [`config.js`](config.js):
```js
ENDPOINT: 'https://script.google.com/macros/s/XXXXXXXX/exec',
TOKEN: 'la-misma-clave-que-APP_TOKEN'
```

### 3. Publicar
Sube la carpeta completa (`index.html`, `config.js`, `manifest.webmanifest`, `sw.js`, `icons/`)
a Netlify (el sitio actual: https://melodious-swan-d7484f.netlify.app) o a cualquier hosting con **https**.
La instalación en el móvil solo funciona con https.

> Si cambias `Codigo.gs` más adelante: **Implementar → Gestionar implementaciones → Editar → Nueva versión**
> para mantener la misma URL.

## Instalar en el móvil (empleados)

- **Android (Chrome):** abre el enlace → aparece el aviso **"📲 Instala la app" → Instalar**
  (o menú ⋮ → *Instalar aplicación* / *Agregar a pantalla de inicio*).
- **iPhone (Safari):** abre el enlace → botón **Compartir ⬆️ → "Agregar a pantalla de inicio"**.

Queda un ícono **Silplan Horas** en la pantalla de inicio y abre como una aplicación, también sin señal.

## Para Contabilidad

- Hoja **"Horas Extras"**: una fila por día trabajado, con ID único (los reintentos no duplican).
  La última columna **"Estado contabilidad"** sale como *Pendiente* para que la marquen como *Pagado*/*Revisado*.
- Se puede filtrar por empleado, obra, provincia o fecha y descargar en Excel (Archivo → Descargar).
- Para no recibir correos y usar solo la hoja: `ENVIAR_CORREO = false` en `Codigo.gs`.
