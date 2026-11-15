const express = require('express');
const pool = require('../db');

const router = express.Router();

const FROM = `from radar.registros_gps r join radar.organizaciones o on o.id = r.organizacion_id`;

// "Hoy" en hora de Bolivia (Supabase trabaja en UTC y de noche current_date ya sería mañana)
const HOY = `(now() at time zone 'America/La_Paz')::date`;

// Valores normalizados para filtrar y mostrar sin duplicados por mayúsculas o errores de tipeo
const SUCURSAL = `coalesce(case upper(trim(r.sucursal)) when '4TO AN ILLO' then '4TO ANILLO' else upper(trim(r.sucursal)) end, 'Sin sucursal')`;
const OPERADOR = `coalesce(upper(trim(r.operador)), 'Sin operador')`;
const CREDITO = `coalesce(r.estado_credito, 'Sin estado')`;
const RENOVACION = `(case when r.estado_renovacion_2026 in ('RENOVADO','NO RENOVO','COBRAR') then r.estado_renovacion_2026 else 'Sin dato' end)`;
const ESTADO = `(case when r.fecha_fin_contrato is null then 'Sin fecha'
                      when r.fecha_fin_contrato < ${HOY} then 'Vencido'
                      when r.fecha_fin_contrato <= ${HOY} + 30 then 'Por vencer'
                      else 'Vigente' end)`;

const VENC = {
  proximos: `r.fecha_fin_contrato >= ${HOY}`,
  vencidos: `r.fecha_fin_contrato < ${HOY}`,
  30: `r.fecha_fin_contrato between ${HOY} and ${HOY} + 30`,
  60: `r.fecha_fin_contrato between ${HOY} and ${HOY} + 60`,
  90: `r.fecha_fin_contrato between ${HOY} and ${HOY} + 90`,
  sin_fecha: `r.fecha_fin_contrato is null`,
};

const ORDEN = {
  cliente: 'r.nombre_cliente',
  placa: 'r.placa',
  org: 'o.nombre',
  fin: 'r.fecha_fin_contrato',
  estado: 'r.fecha_fin_contrato',
};

// Arma el WHERE a partir de los filtros de la URL. Todo valor del usuario va como parámetro.
function filtrar(query) {
  const params = [];
  const cond = [];
  const add = (sql, valor) => {
    params.push(valor);
    cond.push(sql.replace('$$', `$${params.length}`));
  };

  if (query.org) add('o.nombre = $$', String(query.org));
  if (query.credito) add(`${CREDITO} = $$`, String(query.credito));
  if (query.renov) add(`${RENOVACION} = $$`, String(query.renov));
  if (query.sucursal) add(`${SUCURSAL} = $$`, String(query.sucursal));
  if (query.operador) add(`${OPERADOR} = $$`, String(query.operador));
  if (VENC[query.venc]) cond.push(VENC[query.venc]);

  const q = String(query.q || '').trim().slice(0, 60);
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    const n = `$${params.length}`;
    cond.push(
      `(r.nombre_cliente ilike ${n} or r.placa ilike ${n} or r.imei ilike ${n} or r.documento_cliente ilike ${n})`
    );
  }
  return { where: cond.length ? ' where ' + cond.join(' and ') : '', params };
}

// Sin orden elegido: primero los que vencen pronto, luego los vencidos (el más reciente primero), al final los sin fecha
function ordenar(query) {
  const col = ORDEN[query.sort];
  if (!col) {
    return `order by (case when r.fecha_fin_contrato >= ${HOY} then 0 when r.fecha_fin_contrato is null then 2 else 1 end),
                     (case when r.fecha_fin_contrato >= ${HOY} then r.fecha_fin_contrato end) asc,
                     r.fecha_fin_contrato desc, r.id`;
  }
  const dir = query.dir === 'desc' ? 'desc' : 'asc';
  return `order by ${col} ${dir} nulls last, r.id`;
}

const error500 = (res, e) => {
  console.error(e);
  res.status(500).json({ error: 'No se pudo consultar la base de datos' });
};

// GET /api/dashboard?org=FREMAR -> resumen, vencimientos por mes, estados y organizaciones
router.get('/', async (req, res) => {
  const org = req.query.org || null;
  const ORG = `($1::text is null or o.nombre = $1)`;
  try {
    const [resumen, meses, credito, renovacion, orgs] = await Promise.all([
      pool.query(
        `select count(*)::int as equipos,
                count(distinct nullif(trim(r.documento_cliente), ''))::int as clientes,
                count(*) filter (where r.fecha_fin_contrato < ${HOY})::int as pasada,
                count(*) filter (where r.fecha_fin_contrato between ${HOY} and ${HOY} + 30)::int as v30,
                count(*) filter (where r.fecha_fin_contrato between ${HOY} and ${HOY} + 60)::int as v60,
                count(*) filter (where r.fecha_fin_contrato is null)::int as sin_fecha
         ${FROM} where ${ORG}`,
        [org]
      ),
      pool.query(
        `select to_char(date_trunc('month', r.fecha_fin_contrato), 'YYYY-MM') as mes, count(*)::int as n
         ${FROM}
         where ${ORG}
           and r.fecha_fin_contrato >= date_trunc('month', ${HOY})
           and r.fecha_fin_contrato < date_trunc('month', ${HOY}) + interval '12 months'
         group by 1 order by 1`,
        [org]
      ),
      pool.query(`select ${CREDITO} as k, count(*)::int as n ${FROM} where ${ORG} group by 1 order by 2 desc`, [org]),
      pool.query(`select ${RENOVACION} as k, count(*)::int as n ${FROM} where ${ORG} group by 1 order by 2 desc`, [org]),
      pool.query(`select o.nombre as k, count(*)::int as n ${FROM} group by 1 order by 2 desc`),
    ]);
    res.json({
      resumen: resumen.rows[0],
      meses: meses.rows,
      credito: credito.rows,
      renovacion: renovacion.rows,
      orgs: orgs.rows,
    });
  } catch (e) {
    error500(res, e);
  }
});

// GET /api/dashboard/filtros -> opciones disponibles para los filtros de la tabla
router.get('/filtros', async (req, res) => {
  try {
    const [sucursales, operadores, creditos] = await Promise.all([
      pool.query(`select ${SUCURSAL} as k, count(*)::int as n ${FROM} group by 1 order by 2 desc`),
      pool.query(`select ${OPERADOR} as k, count(*)::int as n ${FROM} group by 1 order by 2 desc`),
      pool.query(`select ${CREDITO} as k, count(*)::int as n ${FROM} group by 1 order by 2 desc`),
    ]);
    res.json({ sucursales: sucursales.rows, operadores: operadores.rows, creditos: creditos.rows });
  } catch (e) {
    error500(res, e);
  }
});

// GET /api/dashboard/equipos?org&q&venc&credito&renov&sucursal&operador&sort&dir&page&limit
router.get('/equipos', async (req, res) => {
  const { where, params } = filtrar(req.query);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  try {
    const [total, filas] = await Promise.all([
      pool.query(`select count(*)::int as n ${FROM}${where}`, params),
      pool.query(
        `select r.id, r.nombre_cliente as cliente, r.placa, r.imei, o.nombre as org,
                r.fecha_fin_contrato::text as fin, ${ESTADO} as estado
         ${FROM}${where} ${ordenar(req.query)}
         limit ${limit} offset ${(page - 1) * limit}`,
        params
      ),
    ]);
    res.json({ total: total.rows[0].n, rows: filas.rows });
  } catch (e) {
    error500(res, e);
  }
});

// Celda de CSV: comillas dobles y protección contra fórmulas de Excel (=, @, +texto, -texto)
const celda = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=@\t\r]|^[+-](?!\d)/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

// GET /api/dashboard/equipos.csv?... -> mismos filtros que la tabla, sin paginar (máx. 20.000 filas)
router.get('/equipos.csv', async (req, res) => {
  const { where, params } = filtrar(req.query);
  try {
    const { rows } = await pool.query(
      `select o.nombre as org, r.nombre_cliente, r.documento_cliente, r.telefono_1, r.telefono_2,
              r.placa, r.imei, r.sim, ${OPERADOR} as operador, ${SUCURSAL} as sucursal,
              r.fecha_fin_contrato::text as fin, ${ESTADO} as estado, ${CREDITO} as credito,
              ${RENOVACION} as renovacion, r.importe_contrato
       ${FROM}${where} ${ordenar(req.query)} limit 20000`,
      params
    );
    const cab = ['Organización', 'Cliente', 'Documento', 'Teléfono 1', 'Teléfono 2', 'Placa', 'IMEI', 'SIM',
      'Operador', 'Sucursal', 'Fin de contrato', 'Estado del contrato', 'Estado del crédito',
      'Renovación 2026', 'Importe (Bs)'];
    const cols = ['org', 'nombre_cliente', 'documento_cliente', 'telefono_1', 'telefono_2', 'placa', 'imei', 'sim',
      'operador', 'sucursal', 'fin', 'estado', 'credito', 'renovacion', 'importe_contrato'];
    const lineas = [cab.map(celda).join(';'), ...rows.map((r) => cols.map((c) => celda(r[c])).join(';'))];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('﻿' + lineas.join('\r\n')); // BOM para que Excel lea bien los acentos
  } catch (e) {
    error500(res, e);
  }
});

// GET /api/dashboard/equipos/:id -> ficha: datos del registro, historial mensual y otros equipos del cliente
router.get('/equipos/:id', async (req, res) => {
  if (!/^\d{1,12}$/.test(req.params.id)) return res.status(400).json({ error: 'Identificador no válido' });
  const id = req.params.id;
  try {
    const { rows } = await pool.query(
      `select r.id, o.nombre as org, r.nombre_cliente, r.documento_cliente, r.telefono_1, r.telefono_2,
              r.imei, r.sim, ${OPERADOR} as operador, r.modelo_gps, r.estado_gps,
              r.tipo_vehiculo, r.modelo_vehiculo, r.placa, r.chasis, r.motor,
              ${SUCURSAL} as sucursal, r.comercial, ${CREDITO} as estado_credito, r.notas,
              r.estado_renovacion_2025, r.estado_renovacion_2026, r.estado_renovacion_2027, r.estado_renovacion_2028,
              r.fecha_entrega::text as fecha_entrega, r.fecha_activacion::text as fecha_activacion,
              r.fecha_inicio_contrato::text as fecha_inicio_contrato, r.fecha_fin_contrato::text as fecha_fin_contrato,
              r.importe_contrato, r.facturado, r.mes_registro, ${ESTADO} as estado,
              i.archivo, r.fila_excel
       ${FROM} join radar.importaciones i on i.id = r.importacion_id
       where r.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe ese equipo' });
    const ficha = rows[0];
    const doc = (ficha.documento_cliente || '').trim();

    const [historial, otros] = await Promise.all([
      pool.query(
        `select etiqueta_mes as mes, valor_original as valor
         from radar.historial_mensual where registro_id = $1 order by posicion_columna`,
        [id]
      ),
      doc
        ? pool.query(
            `select r.id, r.placa, r.imei, r.fecha_fin_contrato::text as fin, ${ESTADO} as estado
             from radar.registros_gps r
             where trim(r.documento_cliente) = $1 and r.id <> $2
             order by r.fecha_fin_contrato nulls last, r.id limit 50`,
            [doc, id]
          )
        : { rows: [] },
    ]);
    res.json({ ficha, historial: historial.rows, otros: otros.rows });
  } catch (e) {
    error500(res, e);
  }
});

module.exports = router;
