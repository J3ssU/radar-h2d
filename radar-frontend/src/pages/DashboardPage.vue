<template>
  <q-page padding class="q-gutter-y-md">
    <div class="row items-center justify-between">
      <div class="text-h5">Panel de equipos y renovaciones</div>
      <q-btn flat no-caps icon="refresh" label="Actualizar" :loading="cargando" @click="cargar" />
    </div>

    <q-banner v-if="error" rounded class="bg-negative text-white">{{ error }}</q-banner>

    <q-btn-toggle
      v-model="org"
      no-caps
      unelevated
      toggle-color="primary"
      :options="opcionesOrg"
      @update:model-value="cargar"
    />

    <div class="row q-col-gutter-md">
      <div v-for="t in tiles" :key="t.label" class="col-6 col-md-2">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">{{ t.label }}</div>
            <div class="text-h5">{{ t.value }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1">Vencimientos de contrato, próximos 12 meses</div>
            <div class="row no-wrap items-end q-gutter-xs q-mt-md" style="height: 190px">
              <div
                v-for="m in meses"
                :key="m.key"
                class="col column justify-end items-center"
                style="height: 100%"
              >
                <div class="text-caption">{{ m.n }}</div>
                <div
                  class="bg-primary full-width"
                  :style="{ height: m.alto + '%', minHeight: '2px', borderRadius: '3px 3px 0 0' }"
                />
                <div class="text-caption text-grey-7">{{ m.label }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-5 q-gutter-y-md">
        <q-card v-for="b in barras" :key="b.titulo" flat bordered>
          <q-card-section>
            <div class="text-subtitle1 q-mb-sm">{{ b.titulo }}</div>
            <div v-for="f in b.filas" :key="f.k" class="q-mb-sm">
              <div class="row justify-between text-body2">
                <span>{{ f.label }}</span>
                <span class="text-grey-7">{{ f.n }} · {{ f.pct }}%</span>
              </div>
              <q-linear-progress
                rounded
                size="8px"
                :value="f.n / b.total"
                :color="f.color"
                track-color="grey-3"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-table
      flat
      bordered
      :title="q ? `Resultados para “${q}”` : 'Próximos vencimientos'"
      :rows="filas"
      :columns="columnas"
      row-key="id"
      :pagination="{ rowsPerPage: 25 }"
      hide-bottom
    >
      <template #top-right>
        <q-input
          v-model="q"
          dense
          outlined
          clearable
          debounce="350"
          placeholder="Buscar cliente, placa, IMEI o documento"
          style="min-width: 300px"
          @update:model-value="buscar"
        />
      </template>
      <template #body-cell-estado="props">
        <q-td :props="props">
          <q-badge :color="props.row.estado.color" :label="props.row.estado.label" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const API = 'http://localhost:3000/api/dashboard'

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const CREDITO = {
  ACTIVO: ['Activo', 'positive'],
  'FUERA DE LINEA + 30 DIAS': ['Fuera de línea +30 días', 'warning'],
  'FUERA DE LINEA + 60 DIAS': ['Fuera de línea +60 días', 'negative'],
  FINALIZADO: ['Finalizado', 'primary'],
  'NUNCA ACTIVADO': ['Nunca activado', 'grey'],
  'Sin estado': ['Sin estado', 'grey-5'],
}
const RENOVACION = {
  RENOVADO: ['Renovado', 'positive'],
  COBRAR: ['Por cobrar', 'warning'],
  'NO RENOVO': ['No renovó', 'negative'],
  'Sin dato': ['Sin dato', 'grey-5'],
}

const org = ref('') // '' = todas las organizaciones
const q = ref('')
const cargando = ref(false)
const error = ref('')
const datos = ref(null)
const equipos = ref([])

async function get(ruta, params) {
  const url = new URL(API + ruta)
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v)
  const r = await fetch(url)
  if (!r.ok) throw new Error(`El servidor respondió ${r.status}`)
  return r.json()
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const [d, e] = await Promise.all([
      get('/', { org: org.value }),
      get('/equipos', { org: org.value, q: q.value }),
    ])
    datos.value = d
    equipos.value = e
  } catch (err) {
    error.value = `No se pudieron cargar los datos. ${err.message}`
  } finally {
    cargando.value = false
  }
}

async function buscar() {
  try {
    equipos.value = await get('/equipos', { org: org.value, q: q.value })
  } catch (err) {
    error.value = `No se pudo buscar. ${err.message}`
  }
}

const fmt = (n) => String(n ?? '—').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const opcionesOrg = computed(() => {
  const orgs = datos.value?.orgs ?? []
  const todas = orgs.reduce((a, o) => a + o.n, 0)
  return [
    { label: `Todas (${fmt(todas)})`, value: '' },
    ...orgs.map((o) => ({ label: `${o.k} (${fmt(o.n)})`, value: o.k })),
  ]
})

const tiles = computed(() => {
  const r = datos.value?.resumen
  return [
    { label: 'Equipos registrados', value: fmt(r?.equipos) },
    { label: 'Clientes (por documento)', value: fmt(r?.clientes) },
    { label: 'Fecha de fin vencida', value: fmt(r?.pasada) },
    { label: 'Vencen en 30 días', value: fmt(r?.v30) },
    { label: 'Vencen en 60 días', value: fmt(r?.v60) },
    { label: 'Sin fecha de fin', value: fmt(r?.sin_fecha) },
  ]
})

const meses = computed(() => {
  const mapa = new Map((datos.value?.meses ?? []).map((m) => [m.mes, m.n]))
  const hoy = new Date()
  const lista = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: MES[d.getMonth()], n: mapa.get(key) ?? 0 }
  })
  const max = Math.max(1, ...lista.map((m) => m.n))
  return lista.map((m) => ({ ...m, alto: (m.n / max) * 82 }))
})

function barra(titulo, filas, mapa) {
  const total = filas.reduce((a, f) => a + f.n, 0) || 1
  const orden = [...filas].sort(
    (a, b) => Number(/^Sin /.test(a.k)) - Number(/^Sin /.test(b.k)) || b.n - a.n,
  )
  return {
    titulo,
    total,
    filas: orden.map((f) => ({
      k: f.k,
      n: f.n,
      label: mapa[f.k]?.[0] ?? f.k,
      color: mapa[f.k]?.[1] ?? 'grey',
      pct: Math.round((f.n / total) * 100),
    })),
  }
}
const barras = computed(() => [
  barra('Estado del crédito', datos.value?.credito ?? [], CREDITO),
  barra('Renovación 2026', datos.value?.renovacion ?? [], RENOVACION),
])

function estadoContrato(fin) {
  if (!fin) return { label: 'Sin fecha', color: 'grey' }
  const hoy = new Date()
  hoy.setHours(12, 0, 0, 0)
  const dias = Math.round((new Date(`${fin}T12:00:00`).getTime() - hoy.getTime()) / 86400000)
  if (dias < 0) return { label: 'Vencido', color: 'negative' }
  if (dias <= 30) return { label: 'Por vencer', color: 'warning' }
  return { label: 'Vigente', color: 'positive' }
}

const filas = computed(() => equipos.value.map((e) => ({ ...e, estado: estadoContrato(e.fin) })))

const columnas = [
  { name: 'cliente', label: 'Cliente', field: 'cliente', align: 'left' },
  { name: 'placa', label: 'Placa', field: 'placa', align: 'left' },
  { name: 'imei', label: 'IMEI', field: 'imei', align: 'left' },
  { name: 'org', label: 'Organización', field: 'org', align: 'left' },
  {
    name: 'fin',
    label: 'Fin de contrato',
    field: 'fin',
    align: 'left',
    format: (v) => (v ? v.split('-').reverse().join('/') : '—'),
  },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
]

onMounted(cargar)
</script>
