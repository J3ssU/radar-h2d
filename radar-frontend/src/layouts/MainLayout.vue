<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>Sistema Radar H2D</q-toolbar-title>
        <q-tabs shrink no-caps>
          <q-route-tab to="/" exact label="Panel" />
          <q-route-tab to="/cobranza" label="Cobranza" />
        </q-tabs>
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-grey-2">
      <router-view />
    </q-page-container>
  </q-layout>
</template>
