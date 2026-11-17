const { test } = require('node:test');
const assert = require('node:assert/strict');

test('integración PostgreSQL: renovación e historial, sin persistir datos de prueba', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  require('dotenv').config();
  const pool = require('../db');
  const { renovar } = require('../services/renovaciones');
  const client = await pool.connect();
  try {
    const { rows: [antes] } = await client.query(`select id, xmin::text as version,
      fecha_fin_contrato::text as fin, estado_renovacion_2026 as estado,
      (greatest(fecha_fin_contrato, (now() at time zone 'America/La_Paz')::date) + 365)::text as nueva
      from radar.registros_gps order by id limit 1`);
    assert.ok(antes);
    let auditId;
    const adaptador = { connect: async () => ({
      async query(sql, params) {
        if (sql === 'COMMIT') {
          const { rows: [actual] } = await client.query('select fecha_fin_contrato::text as fin, estado_renovacion_2026 as estado from radar.registros_gps where id=$1', [antes.id]);
          assert.equal(actual.fin, antes.nueva);
          assert.equal(actual.estado, 'RENOVADO');
          const { rows: [audit] } = await client.query('select registro_id, fecha_fin_anterior::text as fin, responsable, identidad_verificada from radar.historial_renovaciones where id=$1', [auditId]);
          assert.equal(audit.registro_id, antes.id);
          assert.equal(audit.fin, antes.fin);
          assert.equal(audit.identidad_verificada, false);
          // Nunca confirmar la renovación del registro real usado por la prueba.
          return client.query('ROLLBACK');
        }
        const result = await client.query(sql, params);
        if (sql.startsWith('insert')) auditId = result.rows[0].id;
        return result;
      },
      release() {},
    }) };
    await renovar(adaptador, antes.id, { fecha_fin_nueva: antes.nueva, anio: 2026, responsable: 'PRUEBA REVERTIDA', motivo: 'Verificación transaccional con rollback', version: antes.version });
    const { rows: [despues] } = await client.query('select fecha_fin_contrato::text as fin, estado_renovacion_2026 as estado from radar.registros_gps where id=$1', [antes.id]);
    assert.deepEqual(despues, { fin: antes.fin, estado: antes.estado });
    assert.equal((await client.query('select id from radar.historial_renovaciones where id=$1', [auditId])).rowCount, 0);
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});
