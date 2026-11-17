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
