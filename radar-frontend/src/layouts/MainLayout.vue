<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Barra superior simplificada -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          Sistema Radar H2D
        </q-toolbar-title>
        <!-- Aquí podemos poner el nombre del usuario después -->
        <div>Admin</div>
      </q-toolbar>
    </q-header>

    <!-- El contenedor donde se renderiza IndexPage.vue -->
    <q-page-container class="bg-grey-2">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// Aquí ya no necesitamos lógica para el menú lateral
</script>
