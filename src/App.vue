<template>
  <v-app>
    <v-main>
      <RfidReader/>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import RfidReader from '@/components/RfidReader.vue';

export default defineComponent({
  name: 'App',

  components: {
    RfidReader,
  },

  data() {
    return {
      //
    };
  },
});
</script>
