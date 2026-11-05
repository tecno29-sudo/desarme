# Desarme Notebooks

App para el celular del servicio técnico: registra cada notebook que se desarma y las piezas que se le sacan (pantalla, RAM, procesador, gráfica, WiFi, ventiladores…), con la caja donde quedó guardada cada una.

- App: https://tecno29-sudo.github.io/desarme/
- Datos compartidos: una planilla de Google (hojas `equipos` y `piezas`) a través de Apps Script.
- Funciona sin internet: lo registrado queda en el teléfono y se sube solo cuando vuelve la señal.

Este repositorio solo tiene código. Los datos viven en la planilla y en cada teléfono.

## Instalación

### 1. Planilla y servidor (una vez)
1. Crea una planilla de Google nueva, por ejemplo "Desarme Notebooks".
2. **Extensiones → Apps Script**. Borra lo que haya, pega `apps-script/Codigo.gs` completo y guarda.
3. Elige la función **configurar** → **Ejecutar**. Acepta los permisos (Google avisa que la app no está verificada: *Configuración avanzada → Ir a…*). Se crean las hojas y una clave secreta.
4. **Implementar → Nueva implementación** → tipo **Aplicación web**. *Ejecutar como:* Yo. *Quién tiene acceso:* Cualquier usuario. **Implementar**.
5. Elige la función **codigoConexion** → **Ejecutar**. En el registro aparece un código que empieza con `desarme:`. Cópialo completo.

### 2. Cada teléfono
1. Abre https://tecno29-sudo.github.io/desarme/ con internet.
   - Android (Chrome): ⋮ → **Instalar aplicación**.
   - iPhone (Safari): Compartir → **Agregar a inicio**.
2. En la app, botón de ajustes (arriba a la derecha) → pega el código → **Conectar**. Debe decir "Conectada".

Si registraste cosas antes de conectar, se suben al conectar.

## Uso
- **Equipos → + Equipo**: marca, modelo, número de serie, notas. Recibe un código `EQ-XXXX`.
- Dentro del equipo, **Sacar pieza**: toca el tipo, escribe modelo o part number, detalle y caja. **Guardar y registrar otra** mantiene equipo y caja y pasa al siguiente tipo pendiente.
- Cada pieza: estado (probada OK / sin probar / dañada), para (reparación / venta / ambos), precio, situación (en caja / usada / vendida).
- **Piezas**: búsqueda y filtros. **Cajas**: contenido de cada caja. **Inicio**: totales y avisos.
- Ajustes: sincronizar ahora, respaldo JSON, restaurar, exportar CSV.

## Seguridad
- Quien tenga el código de conexión puede leer y escribir la planilla. Compártelo solo con quien trabaja contigo.
- Si se pierde un teléfono: en Apps Script ejecuta **nuevaClave** y luego **codigoConexion**, y conecta de nuevo los teléfonos que sigan.
- La planilla se puede revisar y corregir a mano. No cambies los encabezados ni la columna `id`.

## Actualizar
- **App**: se suben los cambios a este repo y se cambia `CACHE` en `sw.js`. En el teléfono: abrir con internet, cerrar del todo y volver a abrir.
- **Apps Script**: pegar el código nuevo → **Implementar → Gestionar implementaciones** → lápiz → *Versión: Nueva versión* → Implementar. La dirección no cambia.

## Archivos
- `index.html`: la app completa (HTML, CSS y JS).
- `sw.js`: uso sin conexión. `manifest.webmanifest` e íconos: instalación.
- `apps-script/Codigo.gs`: servidor en la planilla (`ping`, `list`, `sync`, con bloqueo para escrituras simultáneas).
