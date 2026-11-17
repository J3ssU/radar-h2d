const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renovar, validar, fechaValida } = require('../services/renovaciones');

const body = () => ({ fecha_fin_nueva: '2027-11-30', anio: 2026, responsable: 'Operador prueba', motivo: 'Renovación anual', version: '123' });
function mock({ anterior = { fin: '2026-10-01', estado: 'COBRAR', version: '123', hoy: '2026-11-16' }, fallaHistorial = false } = {}) {
  const llamadas = [];
  const client = {
    async query(sql, params) {
      llamadas.push({ sql, params });
      if (sql.startsWith('select')) return { rows: anterior ? [anterior] : [] };
      if (sql.startsWith('insert')) {
        if (fallaHistorial) throw new Error('fallo de auditoría');
        return { rows: [{ id: '1' }] };
      }
      return { rows: [] };
    },
    release() { llamadas.push({ sql: 'RELEASE' }); },
  };
  return { connect: async () => client, llamadas };
}

test('acepta años bisiestos y rechaza fechas inexistentes', () => {
  assert.equal(fechaValida('2028-02-29'), true);
  for (const fecha of ['2027-02-29', '2026-04-31', '2026-13-01', '01/12/2026', null]) assert.equal(fechaValida(fecha), false);
});
test('rechaza campos inválidos e identificadores manipulados', () => {
  for (const cambio of [{ anio: '2026' }, { anio: 2029 }, { responsable: ' ' }, { motivo: 'a' }, { version: null }, { fecha_fin_nueva: '2027-02-30' }])
    assert.throws(() => validar('1', { ...body(), ...cambio }), { status: 400 });
  assert.throws(() => validar('1; drop table', body()), { status: 400 });
});
test('guarda contrato e historial juntos, conservando valores anteriores', async () => {
  const pool = mock();
  await renovar(pool, '1', body());
  const insert = pool.llamadas.find(x => x.sql.startsWith('insert'));
  assert.deepEqual(insert.params, ['1', 'Operador prueba', 'Renovación anual', 2026, '2026-10-01', '2027-11-30', 'COBRAR']);
  assert.deepEqual(pool.llamadas.slice(-2).map(x => x.sql), ['COMMIT', 'RELEASE']);
});
test('revierte el contrato si falla el historial', async () => {
  const pool = mock({ fallaHistorial: true });
  await assert.rejects(renovar(pool, '1', body()), /fallo de auditoría/);
  assert.equal(pool.llamadas.some(x => x.sql === 'COMMIT'), false);
  assert.deepEqual(pool.llamadas.slice(-2).map(x => x.sql), ['ROLLBACK', 'RELEASE']);
});
test('rechaza una ficha desactualizada antes de escribir', async () => {
  const pool = mock();
  await assert.rejects(renovar(pool, '1', { ...body(), version: '122' }), { status: 409 });
  assert.equal(pool.llamadas.some(x => x.sql.startsWith('update')), false);
});
test('rechaza equipo inexistente', async () => {
  await assert.rejects(renovar(mock({ anterior: null }), '1', body()), { status: 404 });
});
test('rechaza fechas pasadas, hoy y vencimientos iguales o menores al actual', async () => {
  for (const fecha of ['2026-11-16', '2026-10-01', '2026-01-01'])
    await assert.rejects(renovar(mock(), '1', { ...body(), fecha_fin_nueva: fecha }), { status: 400 });
  const anterior = { fin: '2028-01-01', estado: 'RENOVADO', version: '123', hoy: '2026-11-16' };
  await assert.rejects(renovar(mock({ anterior }), '1', body()), { status: 400 });
});
test('permite primera fecha para contrato sin vencimiento', async () => {
  const pool = mock({ anterior: { fin: null, estado: null, version: '123', hoy: '2026-11-16' } });
  await renovar(pool, '1', body());
  assert.equal(pool.llamadas.find(x => x.sql.startsWith('insert')).params[4], null);
});
