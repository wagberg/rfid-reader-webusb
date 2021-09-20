<template>
  <v-container>
    <v-row class="text-center">
      <v-col cols="12">
        <h1>RFID</h1>
        <p>Connect to an LF RFID reader</p>
        <v-btn class="ma-2" @click="connectSerial" v-if="!connected && webSerialSupported">
          <v-icon left>mdi-serial-port</v-icon>
          Connect serial
        </v-btn>
        <v-btn class="ma-2" @click="connectUsb" v-if="!connected && webUsbSupported">
          <v-icon left>mdi-usb</v-icon>
          Connect USB
        </v-btn>
        <v-btn class="ma-2" @click="disconnect" v-if="connected">Disconnect</v-btn>
      </v-col>
    </v-row>
    <v-row class="text-center">
      <v-col cols="12">
        <p class="text-h4 font-weight-bold">{{ tag }}</p>
      </v-col>
    </v-row>
    <v-row class="text-center">
      <v-col cols="12">
        <v-btn class="ma-2" @click="readTag" :disabled="!connected">
          Read tag
        </v-btn>
        <v-btn class="ma-2"  @click="writeTag" :disabled="!connected">
          Write tag
        </v-btn>
        <br>
        <v-btn class="ma-2" @click="toggleSound">
          <v-icon>{{ soundIcon }}</v-icon>
        </v-btn>
        <br>
        <p class="text-12">{{ snackbarText }}</p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
/// <reference types="w3c-web-usb" />
/// <reference types="w3c-web-serial" />
import { defineComponent, ref, computed } from 'vue';
import Pl2303WebUsbSerial from '@/composables/rfid/pl2303';
import RfidReader from '@/composables/rfid/Reader';
import Tag from '@/composables/rfid/Tag';
import { ComPort } from '@/composables/rfid/Interfaces';
import { CommTagError, NoTagError } from '@/composables/rfid/Errors';

export default defineComponent({
  setup() {
    const webUsbSupported = ref('usb' in navigator);
    const webSerialSupported = ref('serial' in navigator);

    const snackbar = ref(false);
    const snackbarText = ref('');

    const playSound = ref(false);
    const toggleSound = () => {
      playSound.value = !playSound.value;
    };
    const soundIcon = computed(() => (playSound.value ? 'mdi-bell' : 'mdi-bell-off'));

    let rfid: RfidReader;
    const connected = ref(false);
    const tag = ref(new Tag());
    const connectedString = computed(() => (connected.value ? 'Connected' : 'Not connected'));

    const connect = async (port: ComPort): Promise<void> => {
      rfid = new RfidReader(port);
      await rfid.connect();
      connected.value = rfid.isConnected;
    };

    const disconnect = async () => {
      await rfid.disconnect();
      connected.value = false;
    };

    const connectUsb = async (): Promise<void> => {
      try {
        const device = await navigator.usb.requestDevice(
          { filters: [{ vendorId: RfidReader.vendorId, productId: RfidReader.productId }] },
        );
        const port = new Pl2303WebUsbSerial(device);
        await connect(port);
      } catch (e) {
        if (e.code === 8) { // No device selected
          console.error(e.message);
          return;
        }
        if (e.code === 19) { // Unable to claim interface
          console.error(e.message);
          return;
        }
        console.error(e.code, e.name, e.message);
        throw e;
      }
      navigator.usb.addEventListener('disconnect', disconnect);
    };

    const connectSerial = async () => {
      try {
        const port = await navigator.serial.requestPort(
          { filters: [{ usbVendorId: RfidReader.vendorId, usbProductId: RfidReader.productId }] },
        );
        connect(port);
        port.addEventListener('disconnect', disconnect);
      } catch (e) {
        if (e instanceof DOMException && e.code === 8) { // No port selected by the user
          console.error(e.message);
          return;
        }
        throw e;
      }
    };

    const readTag = async () => {
      try {
        tag.value = await rfid.readTag(playSound.value);
        snackbar.value = false;
        snackbarText.value = '';
      } catch (e) {
        if (e instanceof NoTagError) {
          snackbar.value = true;
          snackbarText.value = 'No tag detected';
          return;
        }
        if (e instanceof CommTagError) {
          snackbar.value = true;
          snackbarText.value = 'Tag communication error';
        }
      }
    };

    const writeTag = async () => {
      await rfid.writeTag(tag.value, playSound.value);
    };

    return {
      connectedString,
      connected,
      playSound,
      soundIcon,
      tag,
      webUsbSupported,
      webSerialSupported,
      snackbar,
      snackbarText,
      readTag,
      toggleSound,
      writeTag,
      connectSerial,
      connectUsb,
      disconnect,
    };
  },
});
</script>
