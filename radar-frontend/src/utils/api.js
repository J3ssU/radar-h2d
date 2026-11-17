export const API = 'http://localhost:3000/api/dashboard'

export function urlApi(ruta, params = {}) {
  const url = new URL(API + ruta)
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v)
  return url
}

export async function get(ruta, params) {
  const r = await fetch(urlApi(ruta, params))
  if (!r.ok) throw new Error(`El servidor respondió ${r.status}`)
  return r.json()
}

export async function post(ruta, datos) {
  const r = await fetch(urlApi(ruta), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  const resultado = await r.json()
  if (!r.ok) throw new Error(resultado.error || `El servidor respondió ${r.status}`)
  return resultado
}
