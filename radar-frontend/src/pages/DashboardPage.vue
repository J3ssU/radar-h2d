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
            <div class="row no-wrap q-gutter-xs q-mt-md">
              <div v-for="m in meses" :key="m.key" class="col column items-center">
                <div class="column justify-end items-center full-width" style="height: 140px">
                  <div class="text-caption">{{ m.n }}</div>
                  <div
                    class="bg-primary full-width"
                    :style="{
                      height: m.alto + 'px',
                      minHeight: '2px',
                      borderRadius: '3px 3px 0 0',
                    }"
                  />
                </div>
                <div class="text-caption text-grey-7 text-center">{{ m.label }}</div>
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

    <!-- Filtros -->
    <q-card flat bordered>
      <q-card-section class="q-pb-none">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-sm-6 col-md-3">
            <q-input
              v-model="q"
              dense
              outlined
              clearable
              debounce="350"
              placeholder="Cliente, placa, IMEI, documento"
              @update:model-value="aplicarFiltros"
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>
          <div class="col-6 col-sm-3 col-md-2">
            <q-select
              v-model="filtros.venc"
              dense
              outlined
              emit-value
              map-options
              label="Vencimiento"
              :options="OPC_VENC"
              @update:model-value="aplicarFiltros"
            />
          </div>
          <div class="col-6 col-sm-3 col-md-2">
            <q-select
              v-model="filtros.credito"
              dense
              outlined
              clearable
              emit-value
              map-options
              label="Estado del crédito"
              :options="opcionesCredito"
              @update:model-value="aplicarFiltros"
            />
          </div>
          <div class="col-6 col-sm-3 col-md-2">
            <q-select
              v-model="filtros.renov"
              dense
              outlined
              clearable
              emit-value
              map-options
              label="Renovación 2026"
              :options="OPC_RENOV"
              @update:model-value="aplicarFiltros"
            />
          </div>
          <div class="col-6 col-sm-3 col-md-3">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select
                  v-model="filtros.sucursal"
                  dense
                  outlined
                  clearable
                  emit-value
                  map-options
                  label="Sucursal"
                  :options="opcionesSucursal"
                  @update:model-value="aplicarFiltros"
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="filtros.operador"
                  dense
                  outlined
                  clearable
                  emit-value
                  map-options
                  label="Operador"
                  :options="opcionesOperador"
                  @update:model-value="aplicarFiltros"
                />
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="q-px-md">
        <div class="text-body2 text-grey-8">
          <b>{{ fmt(pagination.rowsNumber) }}</b> equipos
          <span v-if="hayFiltros">con los filtros aplicados</span>
        </div>
        <q-space />
        <q-btn
          flat
          dense
          no-caps
          icon="filter_alt_off"
          label="Limpiar filtros"
          :disable="!hayFiltros"
          @click="limpiarFiltros"
        />
        <q-btn
          flat
          dense
          no-caps
          icon="download"
          label="Exportar CSV"
          :loading="exportando"
          :disable="!pagination.rowsNumber"
          @click="exportar"
        />
      </q-card-actions>

      <q-table
        v-model:pagination="pagination"
        flat
        class="tabla-clic"
        :rows="equipos"
        :columns="columnas"
        row-key="id"
        :loading="cargandoTabla"
        :rows-per-page-options="[10, 25, 50, 100]"
        rows-per-page-label="Filas por página"
        no-data-label="No hay equipos con esos filtros"
        @request="onRequest"
        @row-click="(_, row) => abrirFicha(row.id)"
      >
        <template #body-cell-estado="props">
          <q-td :props="props">
            <q-badge :color="COLOR_ESTADO[props.row.estado] || 'grey'" :label="props.row.estado" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <FichaEquipo v-model="fichaAbierta" :equipo-id="fichaId" />
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import FichaEquipo from '@/components/FichaEquipo.vue'
import { get, urlApi } from '@/utils/api'
import { fecha, fmt } from '@/utils/formato'
import { COLOR_ESTADO, CREDITO, RENOVACION } from '@/utils/estados'

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const OPC_VENC = [
  { label: 'Todos', value: '' },
  { label: 'Próximos (desde hoy)', value: 'proximos' },
  { label: 'Vencidos', value: 'vencidos' },
  { label: 'Vencen en 30 días', value: '30' },
  { label: 'Vencen en 60 días', value: '60' },
  { label: 'Vencen en 90 días', value: '90' },
  { label: 'Sin fecha de fin', value: 'sin_fecha' },
]
const OPC_RENOV = Object.entries(RENOVACION).map(([value, [label]]) => ({ label, value }))

const org = ref('') // '' = todas las organizaciones
const q = ref('')
const filtros = reactive({ venc: '', credito: null, renov: null, sucursal: null, operador: null })
const cargando = ref(false)
const cargandoTabla = ref(false)
const exportando = ref(false)
const error = ref('')
const datos = ref(null)
const opciones = ref({ sucursales: [], operadores: [], creditos: [] })
const equipos = ref([])
const pagination = ref({ page: 1, rowsPerPage: 25, sortBy: null, descending: false, rowsNumber: 0 })

// Ficha del equipo
const fichaAbierta = ref(false)
const fichaId = ref(null)
function abrirFicha(id) {
  fichaId.value = id
  fichaAbierta.value = true
}

// Filtros y orden que comparten la tabla y la exportación
const paramsTabla = () => ({
  org: org.value,
  q: q.value,
  ...filtros,
  sort: pagination.value.sortBy,
  dir: pagination.value.descending ? 'desc' : 'asc',
})

let tokenTabla = 0
async function cargarEquipos(p = pagination.value) {
  const mio = ++tokenTabla
  cargandoTabla.value = true
  try {
    const params = { ...paramsTabla(), sort: p.sortBy, dir: p.descending ? 'desc' : 'asc' }
    const r = await get('/equipos', { ...params, page: p.page, limit: p.rowsPerPage })
    if (mio !== tokenTabla) return
    equipos.value = r.rows
    pagination.value = { ...p, rowsNumber: r.total }
  } catch (err) {
    if (mio === tokenTabla) error.value = `No se pudo cargar la tabla. ${err.message}`
  } finally {
    if (mio === tokenTabla) cargandoTabla.value = false
  }
}

const onRequest = ({ pagination: p }) => cargarEquipos(p)
const aplicarFiltros = () => cargarEquipos({ ...pagination.value, page: 1 })

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const [d] = await Promise.all([
      get('/', { org: org.value }),
      cargarEquipos({ ...pagination.value, page: 1 }),
    ])
    datos.value = d
  } catch (err) {
    error.value = `No se pudieron cargar los datos. ${err.message}`
  } finally {
    cargando.value = false
  }
}

async function cargarOpciones() {
  try {
    opciones.value = await get('/filtros', {})
  } catch {
    // los filtros por lista quedan vacíos; el resto del panel sigue funcionando
  }
}

const hayFiltros = computed(
  () =>
    !!(
      q.value ||
      filtros.venc ||
      filtros.credito ||
      filtros.renov ||
      filtros.sucursal ||
      filtros.operador
    ),
)

function limpiarFiltros() {
  q.value = ''
  Object.assign(filtros, { venc: '', credito: null, renov: null, sucursal: null, operador: null })
  aplicarFiltros()
}

async function exportar() {
  exportando.value = true
  try {
    const r = await fetch(urlApi('/equipos.csv', paramsTabla()))
    if (!r.ok) throw new Error(`El servidor respondió ${r.status}`)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(await r.blob())
    a.download = `radar-equipos-${new Date().toLocaleDateString('sv-SE')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch (err) {
    error.value = `No se pudo exportar. ${err.message}`
  } finally {
    exportando.value = false
  }
}

/* ---------- datos del panel ---------- */
const opcionesOrg = computed(() => {
  const orgs = datos.value?.orgs ?? []
  const todas = orgs.reduce((a, o) => a + o.n, 0)
  return [
    { label: `Todas (${fmt(todas)})`, value: '' },
    ...orgs.map((o) => ({ label: `${o.k} (${fmt(o.n)})`, value: o.k })),
  ]
})
const opcionesCredito = computed(() =>
  opciones.value.creditos.map((o) => ({
    label: `${CREDITO[o.k]?.[0] ?? o.k} (${fmt(o.n)})`,
    value: o.k,
  })),
)
const opcionesSucursal = computed(() =>
  opciones.value.sucursales.map((o) => ({ label: `${o.k} (${fmt(o.n)})`, value: o.k })),
)
const opcionesOperador = computed(() =>
  opciones.value.operadores.map((o) => ({ label: `${o.k} (${fmt(o.n)})`, value: o.k })),
)

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
    const anio = i === 0 || d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(2)}` : ''
    return { key, label: MES[d.getMonth()] + anio, n: mapa.get(key) ?? 0 }
  })
  const max = Math.max(1, ...lista.map((m) => m.n))
  return lista.map((m) => ({ ...m, alto: Math.round((m.n / max) * 110) })) // px; deja sitio al número
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

const columnas = [
  {
    name: 'cliente',
    label: 'Cliente',
    field: 'cliente',
    align: 'left',
    sortable: true,
    format: (v) => v || '—',
  },
  {
    name: 'placa',
    label: 'Placa',
    field: 'placa',
    align: 'left',
    sortable: true,
    format: (v) => v || '—',
  },
  { name: 'imei', label: 'IMEI', field: 'imei', align: 'left', format: (v) => v || '—' },
  { name: 'org', label: 'Organización', field: 'org', align: 'left', sortable: true },
  {
    name: 'fin',
    label: 'Fin de contrato',
    field: 'fin',
    align: 'left',
    sortable: true,
    format: (v) => fecha(v) || '—',
  },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left', sortable: true },
]

onMounted(() => {
  cargarOpciones()
  cargar()
})
</script>

<style scoped>
.tabla-clic :deep(tbody tr) {
  cursor: pointer;
}
</style>
