const express = require('express');
const pool = require('../db');

const router = express.Router();

const FROM = `from radar.registros_gps r join radar.organizaciones o on o.id = r.organizacion_id`;
const ORG = `($1::text is null or o.nombre = $1)`; // $1 = nombre de la organización o null (todas)

// GET /api/dashboard?org=FREMAR -> resumen, vencimientos por mes, estados y organizaciones
router.get('/', async (req, res) => {
  const org = req.query.org || null;
  try {
    const [resumen, meses, credito, renovacion, orgs] = await Promise.all([
      pool.query(
        `select count(*)::int as equipos,
                count(distinct nullif(trim(r.documento_cliente), ''))::int as clientes,
                count(*) filter (where r.fecha_fin_contrato < current_date)::int as pasada,
                count(*) filter (where r.fecha_fin_contrato between current_date and current_date + 30)::int as v30,
                count(*) filter (where r.fecha_fin_contrato between current_date and current_date + 60)::int as v60,
                count(*) filter (where r.fecha_fin_contrato is null)::int as sin_fecha
         ${FROM} where ${ORG}`,
        [org]
      ),
      pool.query(
        `select to_char(date_trunc('month', r.fecha_fin_contrato), 'YYYY-MM') as mes, count(*)::int as n
         ${FROM}
         where ${ORG}
           and r.fecha_fin_contrato >= date_trunc('month', current_date)
           and r.fecha_fin_contrato < date_trunc('month', current_date) + interval '12 months'
         group by 1 order by 1`,
        [org]
      ),
      pool.query(
        `select coalesce(r.estado_credito, 'Sin estado') as k, count(*)::int as n
         ${FROM} where ${ORG} group by 1 order by 2 desc`,
        [org]
      ),
      pool.query(
        `select case when r.estado_renovacion_2026 in ('RENOVADO','NO RENOVO','COBRAR')
                     then r.estado_renovacion_2026 else 'Sin dato' end as k, count(*)::int as n
         ${FROM} where ${ORG} group by 1 order by 2 desc`,
        [org]
      ),
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
    console.error(e);
    res.status(500).json({ error: 'No se pudo consultar la base de datos' });
  }
});

// GET /api/dashboard/equipos?q=texto&org=FREMAR -> sin q: próximos vencimientos; con q: búsqueda (máx. 25)
router.get('/equipos', async (req, res) => {
  const org = req.query.org || null;
  const q = String(req.query.q || '').trim().slice(0, 60);
  const like = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null;
  try {
    const { rows } = await pool.query(
      `select r.id, r.nombre_cliente as cliente, r.placa, r.imei, o.nombre as org,
              r.fecha_fin_contrato::text as fin
       ${FROM}
       where ${ORG}
         and (($2::text is null and r.fecha_fin_contrato >= current_date)
           or ($2::text is not null and (r.nombre_cliente ilike $2 or r.placa ilike $2
                                         or r.imei ilike $2 or r.documento_cliente ilike $2)))
       order by (case when $2::text is null then r.fecha_fin_contrato end) asc nulls last,
                r.nombre_cliente nulls last
       limit 25`,
      [org, like]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo consultar la base de datos' });
  }
});

module.exports = router;
