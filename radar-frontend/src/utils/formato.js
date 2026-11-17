export const fmt = (n) => String(n ?? '—').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const fecha = (s) => (s ? s.split('-').reverse().join('/') : '')

// Quita los marcadores que trae el Excel donde no hay dato
export const limpio = (x) => {
  const s = x == null ? '' : String(x).trim()
  return s && s !== '***' && s !== '/' ? s : ''
}

export const bs = (x) =>
  x == null
    ? ''
    : `Bs ${Number(x).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const titulo = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (m) => m.toUpperCase())
