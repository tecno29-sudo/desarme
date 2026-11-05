/**
 * Desarme Notebooks · servidor en Google Sheets (Apps Script)
 *
 * Instalación:
 * 1. Crea una planilla de Google nueva (por ejemplo "Desarme Notebooks").
 * 2. Extensiones → Apps Script. Borra lo que haya y pega este archivo completo. Guarda.
 * 3. Arriba elige la función "configurar" y toca Ejecutar. Acepta los permisos.
 *    Crea las hojas "equipos" y "piezas" y una clave secreta.
 * 4. Implementar → Nueva implementación → tipo "Aplicación web".
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario. → Implementar.
 * 5. Elige la función "codigoConexion" y toca Ejecutar. En el registro aparece
 *    un código que empieza con "desarme:". Pégalo en la app → Ajustes → Conectar.
 *
 * Al cambiar este código: Implementar → Gestionar implementaciones → editar (lápiz)
 * → Versión: Nueva versión → Implementar. Así la dirección no cambia.
 */

var VERSION = '1.0.0';
var HOJAS = {
  equipos: ['id', 'codigo', 'marca', 'modelo', 'serie', 'estado', 'notas', 'creado', 'editado'],
  piezas: ['id', 'tipo', 'modelo', 'detalle', 'cantidad', 'caja', 'equipoId', 'origen', 'estado', 'destino', 'precio', 'situacion', 'notas', 'creado', 'editado']
};
var NUMEROS = { cantidad: 1, precio: 1, creado: 1, editado: 1 };
var MAX_TEXTO = 2000;

function configurar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HOJAS).forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    var cols = HOJAS[nombre];
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); // todo como texto: part numbers y cajas no se convierten
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  var hoja1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hoja1 && hoja1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(hoja1);
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CLAVE')) props.setProperty('CLAVE', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('Listo. Ahora implementa como aplicación web y luego ejecuta "codigoConexion".');
}

function codigoConexion() {
  var url = ScriptApp.getService().getUrl();
  var clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave) { Logger.log('Primero ejecuta "configurar".'); return; }
  if (!url) { Logger.log('Primero implementa como aplicación web (paso 4).'); return; }
  url = url.replace(/\/dev$/, '/exec');
  Logger.log('Código de conexión (cópialo completo):\n\ndesarme:' + Utilities.base64EncodeWebSafe(JSON.stringify({ u: url, k: clave })));
}

/** Cambia la clave: todos los teléfonos deberán conectarse de nuevo. */
function nuevaClave() {
  PropertiesService.getScriptProperties().setProperty('CLAVE', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('Clave cambiada. Ejecuta "codigoConexion" para el código nuevo.');
}

function doGet(e) {
  return responder(manejar(e && e.parameter ? e.parameter : {}));
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return responder({ ok: false, error: 'json' }); }
  return responder(manejar(body));
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function manejar(p) {
  var clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave) return { ok: false, error: 'sin_configurar' };
  if (!p.k || String(p.k) !== clave) { Utilities.sleep(500); return { ok: false, error: 'clave' }; }
  try {
    switch (p.a) {
      case 'ping': return { ok: true, version: VERSION, nombre: SpreadsheetApp.getActiveSpreadsheet().getName() };
      case 'list': return { ok: true, equipos: leer('equipos'), piezas: leer('piezas'), t: Date.now() };
      case 'sync': return sync(p.ops || []);
      default: return { ok: false, error: 'accion' };
    }
  } catch (err) {
    return { ok: false, error: 'servidor', detalle: String(err && err.message || err).slice(0, 200) };
  }
}

function leer(nombre) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!sh) throw new Error('Falta la hoja ' + nombre + '. Ejecuta "configurar".');
  var last = sh.getLastRow();
  if (last < 2) return [];
  var cols = HOJAS[nombre];
  return sh.getRange(2, 1, last - 1, cols.length).getValues().filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var o = {};
    cols.forEach(function (c, i) { o[c] = NUMEROS[c] ? (Number(r[i]) || 0) : String(r[i]); });
    return o;
  });
}

/** ops: [{mid, op:'set'|'del', col:'equipos'|'piezas', id, data}] · devuelve los mid aplicados. */
function sync(ops) {
  if (!Array.isArray(ops) || ops.length > 100) return { ok: false, error: 'ops' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'ocupado' };
  var hechos = [], rechazados = [];
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cache = {};
    ops.forEach(function (o) {
      var cols = HOJAS[o && o.col];
      var id = String(o && o.id || '');
      if (!cols || !/^[A-Za-z0-9_-]{4,40}$/.test(id) || (o.op !== 'set' && o.op !== 'del')) { rechazados.push(o && o.mid); return; }
      var sh = ss.getSheetByName(o.col);
      if (!cache[o.col]) cache[o.col] = idsDe(sh);
      var ids = cache[o.col];
      var fila = ids.indexOf(id);
      if (o.op === 'del') {
        if (fila >= 0) { sh.deleteRow(fila + 2); ids.splice(fila, 1); }
        hechos.push(o.mid); return;
      }
      var d = o.data || {};
      if (fila >= 0) {
        var actual = Number(sh.getRange(fila + 2, cols.indexOf('editado') + 1).getValue()) || 0;
        if (actual > (Number(d.editado) || 0)) { hechos.push(o.mid); return; } // ya hay una versión más nueva
      }
      var valores = cols.map(function (c) {
        if (c === 'id') return id;
        var v = d[c];
        if (NUMEROS[c]) return String(Math.max(0, Math.round(Number(v) || 0)));
        return String(v == null ? '' : v).slice(0, MAX_TEXTO).replace(/^=/, "'="); // evita fórmulas
      });
      if (fila >= 0) sh.getRange(fila + 2, 1, 1, cols.length).setValues([valores]);
      else {
        var nueva = ids.length + 2;
        if (nueva > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
        sh.getRange(nueva, 1, 1, cols.length).setNumberFormat('@').setValues([valores]);
        ids.push(id);
      }
      hechos.push(o.mid);
    });
  } finally {
    lock.releaseLock();
  }
  return { ok: true, hechos: hechos, rechazados: rechazados };
}

function idsDe(sh) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); });
}
