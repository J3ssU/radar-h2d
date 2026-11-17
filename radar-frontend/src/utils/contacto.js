const digitos = (t) => String(t || '').replace(/\D/g, '')

// Celulares de Bolivia: 8 dígitos que empiezan con 6 o 7
export const esCelular = (t) => /^[67]\d{7}$/.test(digitos(t))

// Números que parecen de relleno: 60000076, 71111111...
export const telDudoso = (t) =>
  esCelular(t) && (/(\d)\1{4,}/.test(digitos(t)) || /^[67]0{4}/.test(digitos(t)))

export const whatsapp = (t, texto = '') =>
  esCelular(t) && !telDudoso(t)
    ? `https://wa.me/591${digitos(t)}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
    : ''

export const placaValida = (p) => /^\d{3,4}\s?[A-Za-z]{3}$/.test(String(p || '').trim())

// Un teléfono con al menos 7 dígitos; descarta "***", "xxx", "0%"
export const telUsable = (t) => digitos(t).length >= 7
