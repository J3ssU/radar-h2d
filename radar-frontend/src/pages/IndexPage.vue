<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Panel de Control - Renovaciones GPS</div>

    <q-table
      title="Estado de Clientes"
      :rows="clientes"
      :columns="columns"
      row-key="id"
      :filter="filter"
      :rows-per-page-options="[10, 20, 50]"
    >
      <!-- Buscador en la parte superior derecha -->
      <template #top-right>
        <q-input borderless dense debounce="300" v-model="filter" placeholder="Buscar cliente...">
          <template #append>
            <q-icon name="search" />
          </template>
        </q-input>
      </template>

      <!-- Personalizamos la columna de estado para ponerle colores -->
      <template #body-cell-estado="props">
        <q-td :props="props">
          <q-chip
            :color="props.row.estado === 'Al día' ? 'positive' : props.row.estado === 'Por Vencer' ? 'warning' : 'negative'"
            text-color="white"
            dense
          >
            {{ props.row.estado }}
          </q-chip>
        </q-td>
      </template>

      <!-- Añadimos una nueva columna con botones de acción -->
      <template #body-cell-acciones="props">
        <q-td :props="props">
          <q-btn flat round color="primary" icon="visibility" size="sm" @click="verDetalles(props.row)" />
          <q-btn flat round color="secondary" icon="payment" size="sm" @click="procesarPago(props.row)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Variable reactiva para el buscador
const filter = ref('');

// Definimos las columnas (añadimos la columna 'acciones')
const columns = [
  { name: 'nombre', required: true, label: 'Nombre del Cliente', align: 'left', field: 'nombre', sortable: true },
  { name: 'servicio', align: 'left', label: 'Servicio/Plan', field: 'servicio', sortable: true },
  { name: 'vencimiento', label: 'Fecha de Vencimiento', align: 'center', field: 'vencimiento', sortable: true },
  { name: 'estado', label: 'Estado', align: 'center', field: 'estado', sortable: true },
  { name: 'balance', label: 'Balance (Bs)', align: 'right', field: 'balance', sortable: true },
  { name: 'acciones', label: 'Acciones', align: 'center', field: 'acciones' }
];

// Datos falsos
const clientes = ref([
  {
    id: 1,
    nombre: 'WALTER GUTIERREZ MAMANI',
    servicio: 'RENOVACION ANUAL',
    vencimiento: '2026-01-13',
    estado: 'Al día',
    balance: 8335
  },
  {
    id: 2,
    nombre: 'ANDREA BELEN RODRIGUEZ',
    servicio: 'RENOVACION ANUAL',
    vencimiento: '2026-01-15',
    estado: 'Por Vencer',
    balance: 2241
  },
  {
    id: 3,
    nombre: 'JOEL ARIEL ARISPE PALACIOS',
    servicio: 'PEDIDOS YA - 2 MOTOS',
    vencimiento: '2026-01-02',
    estado: 'Mora',
    balance: -400
  }
]);

// Funciones para los botones
const verDetalles = (cliente) => {
  alert(`Viendo detalles de: ${cliente.nombre}`);
};

const procesarPago = (cliente) => {
  alert(`Generando QR de cobro para: ${cliente.nombre}`);
};
</script>
