# Radar H2D — Contexto, progreso y siguientes pasos

Actualizado: 16/11/2026

## 1. Qué es el proyecto

Sistema web para una empresa de rastreo vehicular GPS en Santa Cruz, Bolivia. Reemplaza el control en Excel por una plataforma que gestiona:

- inventario de equipos GPS y SIM,
- clientes y vencimiento de contratos,
- renovaciones y cobranza (a futuro: pagos por QR).

Equipo de 2 integrantes, SCRUM con sprints semanales, entrega objetivo: noviembre 2026.

## 2. Stack y estructura

| Parte | Tecnología |
|---|---|
| Frontend (`radar-frontend`) | Quasar (Vue 3, JavaScript), q-table, hash router |
| Backend (`radar-backend`) | Node.js + Express, librería `pg` |
| Base de datos | Supabase (proyecto `Radar_H2D`, id `onmnmuyjlumdxiiusiqr`), esquema `radar` |
| Repositorio | https://github.com/J3ssU/radar-h2d (rama `main`) |
| Carpeta local | `C:\Users\j3ss\Desktop\Radar H2D` |

Cómo correrlo en local:

1. `git pull`
2. Backend: `cd radar-backend` → `npm start` (usa `DATABASE_URL` del `.env`, ver `.env.example`; escucha en `http://localhost:3000`)
3. Frontend: `cd radar-frontend` → `npx quasar dev` (abre en `http://localhost:9000`)

## 3. Base de datos (esquema `radar`)

Tablas: `registros_gps` (tabla principal, una fila por equipo), `importaciones`, `organizaciones`, `historial_mensual`, `solicitudes_cobro`, `pagos_confirmados`. Vista: `revision_modelos`.

Datos importados de Excel de 3 organizaciones:

- **FREMAR** (~1.908 equipos): una fila por equipo, sin nombre de cliente, documento, teléfono ni fecha de fin de contrato. Tiene historial de pago mensual en `historial_mensual` (CANCELADO, FALTA PAGAR, FALTA PAGAR 2, ACTIVADO, INACTIVOS).
- **RADAR GPS** (~1.395) y **PEDIDOS YA** (~52): sí traen datos del cliente y `fecha_fin_contrato`.

Estados de renovación 2026 (`estado_renovacion_2026`): RENOVADO (311), COBRAR (150), NO RENOVO (420), más valores basura (`***`).

Detalles técnicos relevantes:

- "Hoy" se calcula en hora de La Paz: `(now() at time zone 'America/La_Paz')::date` (Supabase está en UTC).
- **Seguridad:** RLS activado en las 6 tablas. El rol `anon` no tiene privilegios sobre el esquema `radar`. El backend entra con `DATABASE_URL` (rol postgres, que ignora RLS). Cuando se agregue login habrá que crear políticas.

## 4. Lo que ya está hecho

### Limpieza de datos
- Unificados: 4TO ANILLO, ENTEL, 7MO ANILLO (y 7TO), PLAN 3000 (y 3K) en sucursal/operador.

### Panel (`/`)
- Selector de organización, 6 indicadores, gráfico de vencimientos de los próximos 12 meses, barras de estado de crédito y renovación 2026.
- Filtros: búsqueda (cliente, placa, IMEI, documento), vencimiento, crédito, renovación, sucursal, operador.
- Tabla con paginación y orden en el servidor; exportar a CSV (separador `;`, UTF-8 con BOM, protección contra inyección de fórmulas).

### Ficha del equipo/cliente
- Panel lateral al hacer clic en una fila: contacto, equipo GPS, vehículo, contrato, historial mensual (FREMAR), otros equipos del mismo cliente, origen en el Excel.
- Botón de WhatsApp en teléfonos celulares; advertencia en números que parecen de relleno.

### Cobranza (`/cobranza`) — último punto completado (commit 8418c25)
- Cuatro grupos: vencen en 30 días, vencidos hasta 30 días, de 31 a 90, y más de 90. Cada uno con cantidad y monto en Bs.
- Con los datos del 16/11 (ocultando renovados): 87 / 41 / 60 / 382 contratos.
- Botón de WhatsApp por teléfono, con mensaje editable (`{nombre}`, `{vehiculo}`, `{vencimiento}`, guardado en el navegador).
- Buscador, filtro de renovación, interruptor "Ocultar los ya renovados" (activo por defecto), orden por columnas, exportar CSV.
- Los equipos FREMAR no aparecen (no tienen fecha de fin).

### Código compartido
`src/utils/` (`api.js`, `formato.js`, `contacto.js`, `estados.js`) y `src/components/FichaEquipo.vue`.

### API (`/api/dashboard`)
`/`, `/filtros`, `/equipos`, `/equipos.csv`, `/equipos/:id`, `/cobranza`, `/cobranza.csv`. Consultas parametrizadas y con listas blancas para orden y filtros.

## 5. Supuestos pendientes de confirmar

1. **RENOVADO = ya pagó.** Por eso se ocultan por defecto de la cobranza. Casi todos tienen la fecha de fin vencida, es decir, la fecha no se actualizó al renovar.
2. **"FALTA PAGAR 2"** se pinta en rojo asumiendo que significa dos meses sin pagar. Falta confirmar su significado real.
3. **FREMAR** no tiene lista de cobranza porque no tiene fecha de fin; se cobraría desde su historial mensual.

## 6. Pendientes de datos (esperan decisión tuya)

- Unificar modelo y tipo de vehículo (revisar la vista `radar.revision_modelos`).
- `modelo_gps`: Premium → GPS PREMIUM, INALAMBRICOS → GPS INALAMBRICO.
- Formatos de `mes_registro`.
- Valores basura (`***`, etc.), nombres y placas inconsistentes.
- IMEI duplicados.

## 7. Qué sigue (en orden sugerido)

1. **Acción "Renovar" con historial de cambios.** Botón en la ficha y en la cobranza que:
   - actualiza la fecha de fin del contrato y el estado de renovación,
   - guarda quién/cuándo/qué cambió (tabla de auditoría nueva),
   - saca el contrato de la lista de vencidos.

   Esto resuelve el problema de los RENOVADO con fecha vieja.
2. **Cobranza para FREMAR** a partir de `historial_mensual` (FALTA PAGAR / FALTA PAGAR 2), una vez confirmado el significado.
3. **Limpieza de datos pendiente** (sección 6).
4. **Login con Supabase Auth.** Después habrá que crear políticas RLS y dejar de depender del rol postgres en el backend.
5. **Inventario con escáner de IMEI por cámara** (PWA para móvil).
6. **Pagos por QR** (QR Simple interbancario) con webhook que acredite el pago y renueve el contrato.
7. **Cron diario** para actualizar estados y vencimientos.
8. **Despliegue** (backend y frontend) y pruebas finales.
