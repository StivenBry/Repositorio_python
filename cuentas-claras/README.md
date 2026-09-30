# Cuentas Claras

Interfaz web para el libro de cuentas en Google Sheets. Corre como aplicación de
Google Apps Script: la hoja sigue siendo la única base de datos, así que el PC y el
celular ven exactamente lo mismo sin necesidad de sincronizar nada a mano.

## Qué hace

La app tiene dos pestañas.

**Resumen** — para consultar:

- Ingresos, gastos, ahorro y disponible del mes.
- Gasto por categoría en barras, ordenado de mayor a menor.
- Presupuestos con semáforo (verde / amarillo / rojo) según cuánto se lleva del tope.
- Meta de ahorro acumulada, con el aporte del mes en curso aparte.
- Lista de movimientos, con opción de eliminar.

### Qué se reinicia cada mes

| | Se reinicia | Por qué |
|---|---|---|
| Ingresos, gastos, ahorro y disponible | Sí | Son el resumen del mes en curso. |
| Gasto por categoría | Sí | Idem. |
| Consumo de cada presupuesto | Sí | Los topes son mensuales; el tope en sí se conserva. |
| Meta de ahorro | No | Cuenta todo el historial menos los retiros: es un colchón que se junta mes a mes. La línea "Este mes" sí muestra solo el aporte del mes. |
| Lista de movimientos | No | Es el libro completo. |

**Registrar** — para anotar rápido:

- Tipo en un selector de tres botones: gasto, ingreso o ahorro.
- Monto con el teclado del propio dispositivo: el campo se enfoca solo al entrar
  y usa `inputmode="numeric"`, así que en el celular sale el teclado numérico. Los
  miles se agrupan mientras se escribe y Enter guarda.
- Categoría con botones grandes, del mismo color que usa el resto de la app.
  "Otra…" abre un campo de texto para categorías nuevas.
- Fecha y descripción quedan plegadas: por defecto es hoy sin nota.
- En el celular ocupa una sola pantalla, sin desplazarse.

Todo se guarda directo en la hoja y la pantalla se refresca sola cada 30 segundos
y al volver a la pestaña.

## Estructura de hoja que espera

Las tres pestañas del libro, con estos encabezados en la fila 1:

| Pestaña | Columnas |
|---|---|
| `Movimientos` | `id`, `tipo`, `monto`, `categoria`, `direccion`, `meta`, `descripcion`, `fecha` |
| `Presupuestos` | `categoria`, `tope` |
| `Metas` | `id`, `nombre`, `objetivo` |

`tipo` acepta `gasto`, `ingreso` o `ahorro`. En los movimientos de ahorro,
`direccion` distingue `in` (depósito) de `out` (retiro). Los `id` se generan con el
mismo formato que ya usa el libro: base36 de la hora más una parte aleatoria.

## Despliegue

1. Abre **Mi libro de cuentas** en Google Sheets.
2. Menú **Extensiones → Apps Script**. Se abre el editor vinculado a la hoja.
3. Reemplaza el contenido de `Código.gs` con el de [`Codigo.gs`](./Codigo.gs).
4. Botón **+** junto a *Archivos* → **HTML** → nómbralo `Index` (sin `.html`) y pega
   el contenido de [`Index.html`](./Index.html).
5. Guarda (Ctrl+S) y luego **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Solo yo**
6. Autoriza los permisos que pide y copia la URL que termina en `/exec`.

Esa URL es la aplicación. Ábrela en el PC y en el celular con la misma cuenta de
Google.

### En el celular

Abre la URL en Chrome, menú de tres puntos → **Agregar a pantalla de inicio**.
Queda como un ícono más, y al abrirla lee el estado actual de la hoja.

## Notas

- El script está pensado para vivir **vinculado a la hoja**. Si prefieres crearlo
  como proyecto independiente, pon el ID del libro en la constante `SHEET_ID` de
  `Codigo.gs` (está en la URL de la hoja, entre `/d/` y `/edit`).
- Las escrituras usan `LockService`, así que dos dispositivos guardando a la vez no
  se pisan las filas.
- Cada operación de guardado devuelve el estado completo de la hoja, de modo que la
  pantalla queda siempre con lo que realmente quedó escrito.
