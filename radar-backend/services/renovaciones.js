const fallo = (status, message) => Object.assign(new Error(message), { status });

function fechaValida(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validar(id, body) {
  if (!/^\d{1,12}$/.test(id)) throw fallo(400, 'Identificador no válido');
  if (!body || !fechaValida(body.fecha_fin_nueva)) throw fallo(400, 'Fecha no válida');
  if (!Number.isInteger(body.anio) || body.anio < 2025 || body.anio > 2028)
    throw fallo(400, 'El año de renovación debe estar entre 2025 y 2028');
  for (const [campo, min, max] of [['responsable', 2, 100], ['motivo', 3, 1000]]) {
    if (typeof body[campo] !== 'string' || body[campo].trim().length < min || body[campo].trim().length > max)
      throw fallo(400, `${campo === 'responsable' ? 'Responsable' : 'Motivo'}: entre ${min} y ${max} caracteres`);
  }
  if (typeof body.version !== 'string' || !/^\d+$/.test(body.version))
    throw fallo(400, 'Falta la versión del equipo; vuelve a abrir la ficha');
}

async function renovar(pool, id, body) {
  validar(id, body);
  // El identificador de columna solo procede de un entero validado en una lista cerrada.
  const columna = `estado_renovacion_${body.anio}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `select fecha_fin_contrato::text as fin, ${columna} as estado, xmin::text as version,
              (now() at time zone 'America/La_Paz')::date::text as hoy
       from radar.registros_gps where id = $1 for update`, [id]);
    const anterior = rows[0];
    if (!anterior) throw fallo(404, 'No existe ese equipo');
    if (anterior.version !== body.version)
      throw fallo(409, 'El equipo cambió desde que lo abriste. Cierra y vuelve a abrir para revisar los cambios.');
    if (body.fecha_fin_nueva <= anterior.hoy || (anterior.fin && body.fecha_fin_nueva <= anterior.fin))
      throw fallo(400, 'El nuevo vencimiento debe ser posterior a hoy y al vencimiento actual');
    await client.query(
      `update radar.registros_gps set fecha_fin_contrato = $2::date, ${columna} = 'RENOVADO' where id = $1`,
      [id, body.fecha_fin_nueva]);
    const historial = await client.query(
      `insert into radar.historial_renovaciones
       (registro_id, responsable, motivo, anio, fecha_fin_anterior, fecha_fin_nueva, estado_anterior, estado_nuevo)
       values ($1, $2, $3, $4, $5::date, $6::date, $7, 'RENOVADO') returning id`,
      [id, body.responsable.trim(), body.motivo.trim(), body.anio, anterior.fin, body.fecha_fin_nueva, anterior.estado]);
    await client.query('COMMIT');
    return { id: historial.rows[0].id };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { renovar, validar, fechaValida };
