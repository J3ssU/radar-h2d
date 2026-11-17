<template>
  <q-page padding class="q-gutter-y-md">
    <div class="row items-start justify-between q-col-gutter-sm">
      <div class="col">
        <div class="text-h5">Cobranza</div>
        <div class="text-caption text-grey-7">
          Contratos por fecha de fin, desde hoy. Los equipos de FREMAR no aparecen porque no tienen
          fecha de fin.
        </div>
      </div>
      <div class="col-auto">
        <q-btn
          flat
          no-caps
          icon="download"
          label="Exportar CSV"
          :loading="exportando"
          :disable="!pagination.rowsNumber"
          @click="exportar"
        />
        <q-btn
          flat
          no-caps
          icon="refresh"
          label="Actualizar"
          :loading="cargando"
          @click="aplicar"
        />
      </div>
    </div>

    <q-banner v-if="error" rounded class="bg-negative text-white">{{ error }}</q-banner>

    <!-- Grupos -->
    <div class="row q-col-gutter-md">
      <div v-for="s in grupos" :key="s.k" class="col-6 col-md-3">
        <q-card
          v-ripple
          flat
          bordered
          class="grupo cursor-pointer"
          :class="{ 'grupo-activo': seg === s.k }"
          role="button"
          tabindex="0"
          :aria-pressed="seg === s.k"
          @click="elegir(s.k)"
          @keyup.enter="elegir(s.k)"
        >
          <q-card-section>
            <div class="row items-center no-wrap text-caption text-grey-8">
              <q-icon name="circle" :color="s.color" size="10px" class="q-mr-xs" />
              {{ s.etiqueta }}
            </div>
            <div class="text-h5">{{ s.n == null ? '—' : fmt(s.n) }}</div>
            <div class="text-caption text-grey-7">
              {{ s.monto == null ? '' : `Bs ${fmt(Math.round(s.monto))} en contratos` }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section class="q-pb-none">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-12 col-sm-6 col-md-4">
            <q-input
              v-model="q"
              dense
              outlined
              clearable
              debounce="350"
              placeholder="Cliente, placa, IMEI, documento"
              @update:model-value="aplicar"
            >
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </div>
          <div class="col-6 col-sm-3 col-md-3">
            <q-select
              v-model="renov"
              dense
              outlined
              clearable
              emit-value
              map-options
              label="Renovación 2026"
              :options="OPC_RENOV"
              @update:model-value="aplicar"
            />
          </div>
          <div class="col-6 col-sm-3 col-md-5">
            <q-toggle
              v-model="ocultarRenovados"
              label="Ocultar los ya renovados"
              @update:model-value="aplicar"
            />
          </div>
        </div>

        <q-expansion-item dense icon="chat" label="Mensaje de WhatsApp" class="q-mt-sm">
          <div class="q-pa-sm q-gutter-y-sm">
            <q-input
              v-model="plantilla"
              type="textarea"
              autogrow
              outlined
              dense
              label="Texto que se abre en WhatsApp"
              hint="Puedes usar {nombre}, {vehiculo} y {vencimiento}. Se guarda en este navegador."
            />
            <div class="row items-center q-gutter-sm">
              <q-btn
                flat
                dense
                no-caps
                icon="restart_alt"
                label="Restablecer"
                @click="restablecer"
              />
              <span class="text-caption text-grey-7">Ejemplo: {{ ejemplo }}</span>
            </div>
          </div>
        </q-expansion-item>
      </q-card-section>

      <q-card-actions class="q-px-md">
        <div class="text-body2 text-grey-8">
          <b>{{ fmt(pagination.rowsNumber) }}</b> contratos en «{{ etiquetaSeg }}»
        </div>
      </q-card-actions>

      <q-table
        v-model:pagination="pagination"
        flat
        class="tabla-clic"
        :rows="filas"
        :columns="columnas"
        row-key="id"
        :loading="cargandoTabla"
        :rows-per-page-options="[10, 25, 50, 100]"
        rows-per-page-label="Filas por página"
        no-data-label="No hay contratos en este grupo con esos filtros"
        @request="onRequest"
        @row-click="(_, row) => abrirFicha(row.id)"
      >
        <template #body-cell-cliente="props">
          <q-td :props="props">
            <div>{{ props.row.cliente || '—' }}</div>
            <div v-if="props.row.documento" class="text-caption text-grey-7">
              {{ props.row.documento }}
            </div>
          </q-td>
        </template>

        <template #body-cell-contacto="props">
          <q-td :props="props">
            <div v-for="c in contactos(props.row)" :key="c.tel" class="row items-center no-wrap">
              <span>{{ c.tel }}</span>
              <q-btn
                v-if="c.wa"
                flat
                dense
                round
                size="sm"
                icon="chat"
                color="positive"
                :href="c.wa"
                target="_blank"
                rel="noopener"
                @click.stop
              >
                <q-tooltip>Abrir WhatsApp con el mensaje</q-tooltip>
              </q-btn>
              <q-icon
                v-else-if="c.dudoso"
                name="warning"
                color="warning"
                size="18px"
                class="q-ml-xs"
              >
                <q-tooltip>Número que parece de relleno</q-tooltip>
              </q-icon>
            </div>
            <span v-if="!contactos(props.row).length" class="text-grey-6">Sin teléfono</span>
          </q-td>
        </template>

        <template #body-cell-dias="props">
          <q-td :props="props">
            <span :class="props.row.dias < 0 ? 'text-negative' : ''">{{
              textoDias(props.row.dias)
            }}</span>
          </q-td>
        </template>

        <template #body-cell-acciones="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="event_repeat"
              label="Renovar"
              @click.stop="abrirFicha(props.row.id, true)"
            />
          </q-td>
        </template>
        <template #body-cell-renov="props">
          <q-td :props="props">
            <q-badge
              :color="RENOVACION[props.row.renov]?.[1] || 'grey'"
              :label="RENOVACION[props.row.renov]?.[0] || props.row.renov"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <FichaEquipo
      v-model="fichaAbierta"
      :equipo-id="fichaId"
      :renovar-al-abrir="renovarAlAbrir"
      @renovado="aplicar"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import FichaEquipo from '@/components/FichaEquipo.vue'
import { get, urlApi } from '@/utils/api'
import { bs, fecha, fmt, titulo } from '@/utils/formato'
import { placaValida, telDudoso, telUsable, whatsapp } from '@/utils/contacto'
import { RENOVACION } from '@/utils/estados'

const GRUPOS = {
  por_vencer: ['Vencen en 30 días', 'warning'],
  vencidos_30: ['Vencidos hasta 30 días', 'negative'],
  vencidos_90: ['Vencidos de 31 a 90 días', 'negative'],
  vencidos_mas: ['Vencidos hace más de 90 días', 'grey'],
}
const OPC_RENOV = Object.entries(RENOVACION).map(([value, [label]]) => ({ label, value }))

const PLANTILLA_INICIAL =
  'Hola {nombre}, le escribimos de Radar GPS. El servicio de rastreo de {vehiculo} {vencimiento}. ¿Desea renovarlo? Quedamos atentos.'
const CLAVE_PLANTILLA = 'radar-plantilla-whatsapp'

const seg = ref('por_vencer')
const q = ref('')
const renov = ref(null)
const ocultarRenovados = ref(true)
const plantilla = ref(PLANTILLA_INICIAL)
const cargando = ref(false)
const cargandoTabla = ref(false)
const exportando = ref(false)
const error = ref('')
const segmentos = ref([])
const filas = ref([])
const pagination = ref({ page: 1, rowsPerPage: 25, sortBy: null, descending: false, rowsNumber: 0 })

const fichaAbierta = ref(false)
const fichaId = ref(null)
const renovarAlAbrir = ref(false)
function abrirFicha(id, renovar = false) {
  renovarAlAbrir.value = renovar
  fichaId.value = id
  fichaAbierta.value = true
}

const grupos = computed(() =>
  Object.entries(GRUPOS).map(([k, [etiqueta, color]]) => {
    const s = segmentos.value.find((x) => x.k === k)
    return { k, etiqueta, color, n: s?.n ?? null, monto: s?.monto ?? null }
  }),
)
const etiquetaSeg = computed(() => GRUPOS[seg.value][0])

const paramsTabla = () => ({
  seg: seg.value,
  q: q.value,
  renov: renov.value,
  ocultar: ocultarRenovados.value ? '1' : '',
  sort: pagination.value.sortBy,
  dir: pagination.value.descending ? 'desc' : 'asc',
})

let token = 0
async function cargarTabla(p = pagination.value) {
  const mio = ++token
  cargandoTabla.value = true
  cargando.value = true
  error.value = ''
  try {
    const params = { ...paramsTabla(), sort: p.sortBy, dir: p.descending ? 'desc' : 'asc' }
    const r = await get('/cobranza', { ...params, page: p.page, limit: p.rowsPerPage })
    if (mio !== token) return
    segmentos.value = r.segmentos
    filas.value = r.rows
    pagination.value = { ...p, rowsNumber: r.total }
  } catch (err) {
    if (mio === token) error.value = `No se pudo cargar la cobranza. ${err.message}`
  } finally {
    if (mio === token) {
      cargandoTabla.value = false
      cargando.value = false
    }
  }
}

const onRequest = ({ pagination: p }) => cargarTabla(p)
const aplicar = () => cargarTabla({ ...pagination.value, page: 1 })
function elegir(k) {
  seg.value = k
  pagination.value = { ...pagination.value, sortBy: null, descending: false }
  aplicar()
}

async function exportar() {
  exportando.value = true
  try {
    const r = await fetch(urlApi('/cobranza.csv', paramsTabla()))
    if (!r.ok) throw new Error(`El servidor respondió ${r.status}`)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(await r.blob())
    a.download = `radar-cobranza-${seg.value}-${new Date().toLocaleDateString('sv-SE')}.csv`
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

/* ---------- mensaje de WhatsApp ---------- */
function mensaje(row, texto = plantilla.value) {
  const nombre =
    titulo(
      String(row.cliente || '')
        .trim()
        .split(/\s+/)[0],
    ) || 'estimado cliente'
  const vehiculo = placaValida(row.placa)
    ? `su vehículo ${String(row.placa).trim().toUpperCase()}`
    : 'su equipo GPS'
  const f = fecha(row.fin)
  const vencimiento =
    row.dias === 0 ? 'vence hoy' : row.dias > 0 ? `vence el ${f}` : `venció el ${f}`
  return texto
    .replaceAll('{nombre}', nombre)
    .replaceAll('{vehiculo}', vehiculo)
    .replaceAll('{vencimiento}', vencimiento)
}

const ejemplo = computed(() =>
  mensaje({ cliente: 'JUAN PÉREZ', placa: '1234 ABC', dias: 5, fin: '2026-11-21' }),
)

function contactos(row) {
  const vistos = new Set()
  const lista = []
  for (const t of [row.tel1, row.tel2]) {
    const tel = String(t || '').trim()
    if (!telUsable(tel) || vistos.has(tel)) continue
    vistos.add(tel)
    lista.push({ tel, wa: whatsapp(tel, mensaje(row)), dudoso: telDudoso(tel) })
  }
  return lista
}

function restablecer() {
  plantilla.value = PLANTILLA_INICIAL
}

watch(plantilla, (v) => {
  try {
    localStorage.setItem(CLAVE_PLANTILLA, v)
  } catch {
    // sin almacenamiento del navegador: el texto vale solo para esta sesión
  }
})

function textoDias(d) {
  if (d === 0) return 'hoy'
  if (d > 0) return `en ${d} ${d === 1 ? 'día' : 'días'}`
  return `hace ${-d} ${d === -1 ? 'día' : 'días'}`
}

const columnas = [
  { name: 'acciones', label: 'Acciones', field: 'id', align: 'left' },
  { name: 'cliente', label: 'Cliente', field: 'cliente', align: 'left', sortable: true },
  { name: 'contacto', label: 'Contacto', field: 'tel1', align: 'left' },
  { name: 'placa', label: 'Placa', field: 'placa', align: 'left', format: (v) => v || '—' },
  {
    name: 'fin',
    label: 'Fin de contrato',
    field: 'fin',
    align: 'left',
    sortable: true,
    format: (v) => fecha(v) || '—',
  },
  { name: 'dias', label: 'Plazo', field: 'dias', align: 'left', sortable: true },
  {
    name: 'importe',
    label: 'Importe',
    field: 'importe',
    align: 'right',
    sortable: true,
    format: (v) => bs(v) || '—',
  },
  { name: 'renov', label: 'Renovación 2026', field: 'renov', align: 'left', sortable: true },
]

onMounted(() => {
  try {
    const guardada = localStorage.getItem(CLAVE_PLANTILLA)
    if (guardada) plantilla.value = guardada
  } catch {
    // se usa el texto por defecto
  }
  cargarTabla()
})
</script>

<style scoped>
.tabla-clic :deep(tbody tr) {
  cursor: pointer;
}
.grupo {
  border-width: 2px;
}
.grupo-activo {
  border-color: var(--q-primary);
}
</style>
