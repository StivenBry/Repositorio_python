/**
 * Cuentas Claras — backend Apps Script sobre "Mi libro de cuentas".
 *
 * La hoja de cálculo sigue siendo la única base de datos: este script solo
 * lee y escribe sobre las pestañas que ya existen (Movimientos, Presupuestos,
 * Metas), así que cualquier dispositivo que abra la app ve lo mismo.
 *
 * Si el script está vinculado a la hoja (Extensiones → Apps Script desde el
 * propio libro) no hay nada que configurar. Si lo creaste como proyecto
 * independiente, pega el ID de la hoja en SHEET_ID: está en la URL del libro,
 * entre /d/ y /edit.
 */
const SHEET_ID = '';

const TAB_MOVIMIENTOS = 'Movimientos';
const TAB_PRESUPUESTOS = 'Presupuestos';
const TAB_METAS = 'Metas';

/**
 * Punto de partida para la pestaña Presupuestos, calculado sobre el ritmo de
 * gasto de los primeros días de septiembre de 2026. Solo se escriben cuando la
 * pestaña está vacía, desde el botón "Usar valores sugeridos". Edítalos aquí o
 * directamente en la app.
 */
const TOPES_SUGERIDOS = [
  { categoria: 'alimentacion', tope: 550000 },
  { categoria: 'servicios', tope: 320000 },
  { categoria: 'compras', tope: 180000 },
  { categoria: 'educacion', tope: 40000 },
  { categoria: 'otros', tope: 900000 }
];
const OBJETIVO_SUGERIDO = 2000000;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Cuentas Claras')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function libro() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  const activa = SpreadsheetApp.getActiveSpreadsheet();
  if (!activa) {
    throw new Error('Abre el script desde la hoja (Extensiones → Apps Script) o define SHEET_ID.');
  }
  return activa;
}

function hoja(nombre) {
  const sh = libro().getSheetByName(nombre);
  if (!sh) throw new Error('No encuentro la pestaña "' + nombre + '" en el libro.');
  return sh;
}

function encabezados(sh) {
  const ultimaCol = Math.max(1, sh.getLastColumn());
  return sh.getRange(1, 1, 1, ultimaCol).getValues()[0].map(function (h) {
    return String(h).trim();
  });
}

/** Lee una pestaña como lista de objetos usando la fila 1 como encabezado. */
function leerHoja(nombre) {
  const sh = hoja(nombre);
  if (sh.getLastRow() < 2) return [];
  const heads = encabezados(sh);
  const filas = sh.getRange(2, 1, sh.getLastRow() - 1, heads.length).getValues();
  return filas
    .filter(function (fila) {
      return fila.some(function (c) { return c !== '' && c !== null; });
    })
    .map(function (fila) {
      const obj = {};
      heads.forEach(function (h, i) { obj[h] = fila[i]; });
      return obj;
    });
}

/** Las fechas pueden llegar como Date o como texto; siempre salen 'YYYY-MM-DD'. */
function normalizarFecha(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(valor || '').trim().slice(0, 10);
}

function texto(valor) {
  return String(valor === null || valor === undefined ? '' : valor).trim();
}

/** Todo lo que la interfaz necesita, en una sola llamada. */
function cargarDatos() {
  return {
    movimientos: leerHoja(TAB_MOVIMIENTOS).map(function (r) {
      return {
        id: texto(r.id),
        tipo: texto(r.tipo).toLowerCase(),
        monto: Number(r.monto) || 0,
        categoria: texto(r.categoria).toLowerCase(),
        direccion: texto(r.direccion).toLowerCase(),
        meta: texto(r.meta),
        descripcion: texto(r.descripcion),
        fecha: normalizarFecha(r.fecha)
      };
    }),
    presupuestos: leerHoja(TAB_PRESUPUESTOS).map(function (r) {
      return { categoria: texto(r.categoria).toLowerCase(), tope: Number(r.tope) || 0 };
    }),
    metas: leerHoja(TAB_METAS).map(function (r) {
      return { id: texto(r.id), nombre: texto(r.nombre), objetivo: Number(r.objetivo) || 0 };
    })
  };
}

/** Mismo formato de id que ya usa el libro: base36 de la hora + azar. */
function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function conBloqueo(accion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return accion();
  } finally {
    lock.releaseLock();
  }
}

function agregarMovimiento(mov) {
  return conBloqueo(function () {
    const sh = hoja(TAB_MOVIMIENTOS);
    const heads = encabezados(sh);
    const valores = {
      id: nuevoId(),
      tipo: texto(mov.tipo).toLowerCase(),
      monto: Number(mov.monto) || 0,
      categoria: texto(mov.categoria).toLowerCase(),
      direccion: texto(mov.direccion).toLowerCase(),
      meta: texto(mov.meta) || 'general',
      descripcion: texto(mov.descripcion),
      fecha: normalizarFecha(mov.fecha)
    };
    if (!valores.tipo || valores.monto <= 0 || !valores.fecha) {
      throw new Error('El movimiento necesita tipo, monto y fecha.');
    }
    sh.appendRow(heads.map(function (h) {
      return Object.prototype.hasOwnProperty.call(valores, h) ? valores[h] : '';
    }));
    return cargarDatos();
  });
}

function eliminarMovimiento(id) {
  return conBloqueo(function () {
    const sh = hoja(TAB_MOVIMIENTOS);
    const heads = encabezados(sh);
    const colId = heads.indexOf('id');
    if (colId === -1) throw new Error('La pestaña Movimientos no tiene columna "id".');
    if (sh.getLastRow() < 2) return cargarDatos();

    const ids = sh.getRange(2, colId + 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (texto(ids[i][0]) === texto(id)) {
        sh.deleteRow(i + 2);
        break;
      }
    }
    return cargarDatos();
  });
}

/** Escribe el tope de una categoría; actualiza la fila si ya existe. */
function escribirTope(sh, heads, colCat, colTope, categoria, tope) {
  const cat = texto(categoria).toLowerCase();
  const valor = Math.max(0, Number(tope) || 0);

  if (sh.getLastRow() >= 2) {
    const filas = sh.getRange(2, 1, sh.getLastRow() - 1, heads.length).getValues();
    for (let i = 0; i < filas.length; i++) {
      if (texto(filas[i][colCat]).toLowerCase() === cat) {
        sh.getRange(i + 2, colTope + 1).setValue(valor);
        return;
      }
    }
  }

  const nueva = new Array(heads.length).fill('');
  nueva[colCat] = cat;
  nueva[colTope] = valor;
  sh.appendRow(nueva);
}

function hojaPresupuestos() {
  const sh = hoja(TAB_PRESUPUESTOS);
  const heads = encabezados(sh);
  const colCat = heads.indexOf('categoria');
  const colTope = heads.indexOf('tope');
  if (colCat === -1 || colTope === -1) {
    throw new Error('La pestaña Presupuestos necesita las columnas "categoria" y "tope".');
  }
  return { sh: sh, heads: heads, colCat: colCat, colTope: colTope };
}

/** Crea o actualiza el tope de una categoría en la pestaña Presupuestos. */
function guardarTope(categoria, tope) {
  return conBloqueo(function () {
    const p = hojaPresupuestos();
    escribirTope(p.sh, p.heads, p.colCat, p.colTope, categoria, tope);
    return cargarDatos();
  });
}

/** Siembra los topes sugeridos y el objetivo de ahorro en una sola pasada. */
function aplicarValoresSugeridos() {
  return conBloqueo(function () {
    const p = hojaPresupuestos();
    TOPES_SUGERIDOS.forEach(function (t) {
      escribirTope(p.sh, p.heads, p.colCat, p.colTope, t.categoria, t.tope);
    });

    // El objetivo solo se siembra si aún no hay uno: nunca pisa una meta propia.
    const actual = leerHoja(TAB_METAS).filter(function (m) {
      return texto(m.id) === 'general';
    })[0];
    if (!actual || !(Number(actual.objetivo) > 0)) {
      escribirObjetivo('general', OBJETIVO_SUGERIDO, 'Ahorro general');
    }
    return cargarDatos();
  });
}

/** Escribe el objetivo de una meta; actualiza la fila si ya existe. */
function escribirObjetivo(id, objetivo, nombre) {
  const sh = hoja(TAB_METAS);
  const heads = encabezados(sh);
  const colId = heads.indexOf('id');
  const colObj = heads.indexOf('objetivo');
  const colNom = heads.indexOf('nombre');
  if (colId === -1 || colObj === -1) {
    throw new Error('La pestaña Metas necesita las columnas "id" y "objetivo".');
  }

  const metaId = texto(id) || 'general';
  const valor = Math.max(0, Number(objetivo) || 0);

  if (sh.getLastRow() >= 2) {
    const filas = sh.getRange(2, 1, sh.getLastRow() - 1, heads.length).getValues();
    for (let i = 0; i < filas.length; i++) {
      if (texto(filas[i][colId]) === metaId) {
        sh.getRange(i + 2, colObj + 1).setValue(valor);
        return;
      }
    }
  }

  const nueva = new Array(heads.length).fill('');
  nueva[colId] = metaId;
  nueva[colObj] = valor;
  if (colNom !== -1) nueva[colNom] = texto(nombre) || 'Ahorro general';
  sh.appendRow(nueva);
}

/** Crea o actualiza el objetivo de una meta en la pestaña Metas. */
function guardarObjetivo(id, objetivo, nombre) {
  return conBloqueo(function () {
    escribirObjetivo(id, objetivo, nombre);
    return cargarDatos();
  });
}
