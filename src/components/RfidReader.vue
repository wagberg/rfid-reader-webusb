<template>
  <v-container>
    <v-row class="text-center">
      <v-col cols="12">
        <h1>RFID</h1>
        <p>Connect to an LF RFID reader</p>
        <v-btn class="ma-2" @click="connect" v-if="!connected && webSerialSupported">
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
import {
  Beep,
  ReadTag,
  SetLedColor,
  WriteTag2,
  WriteTag3,
} from '@/composables/rfid/Comands';
import Tag from '@/composables/rfid/Tag';
import { LedColor, ReturnStatus } from '@/composables/rfid/Interfaces';

export default defineComponent({
  setup() {
    const webUsbSupported = ref('usb' in navigator);
    const webSerialSupported = ref('serial' in navigator);

    const playSound = ref(false);
    const toggleSound = () => {
      playSound.value = !playSound.value;
    };
    const soundIcon = computed(() => (playSound.value ? 'mdi-bell' : 'mdi-bell-off'));

    let rfid: RfidReader;
    const connected = ref(false);
    const tag = ref(new Tag());
    const connectedString = computed(() => (connected.value ? 'Connected' : 'Not connected'));

    const connectUsb = async () => {
      try {
        const device = await navigator.usb.requestDevice({ filters: [{ vendorId: 0x067b }] });
        const port = new Pl2303WebUsbSerial(device);
        rfid = new RfidReader(port);
        await rfid.ready;
        connected.value = rfid.connected;
      } catch (error) {
        console.error(error);
      }
    };

    const connect = async () => {
      const filters = [{ usbVendorId: 0x067b }];
      try {
        console.log('Requesting port');
        const port = await navigator.serial.requestPort({ filters });
        rfid = new RfidReader(port);
        rfid.ready.then(() => {
          connected.value = true;
          navigator.serial.addEventListener('disconnect', (event: Event) => {
            console.log(event);
            connected.value = false;
          });
        });
      } catch (e) {
        console.log(e);
      }
    };

    const disconnect = async () => {
      await rfid.disconnect();
      connected.value = false;
    };

    const readTag = async () => {
      const response = await rfid.writeRequest(new ReadTag());
      if (response.status === 0) {
        await rfid.writeRequest(new SetLedColor(LedColor.GREEN));
        if (playSound.value) await rfid.writeRequest(new Beep(5));
        setTimeout(async () => rfid.writeRequest(new SetLedColor(LedColor.NONE)), 300);
      }
      tag.value = new Tag(response.data);
    };

    const writeTag = async () => {
      let { status, data } = await rfid.writeRequest(new WriteTag2(tag.value));
      if (status !== ReturnStatus.OK) return;
      ({ status, data } = await rfid.writeRequest(new ReadTag()));
      if (
        status === ReturnStatus.OK
          && data.length === tag.value.data.length
          && data.every((value, index) => tag.value.data[index] === value)
      ) {
        await rfid.writeRequest(new SetLedColor(LedColor.GREEN));
        if (playSound.value) await rfid.writeRequest(new Beep(5));
        setInterval(() => rfid.writeRequest(new SetLedColor(LedColor.NONE)), 300);
        return;
      }
      ({ status, data } = await rfid.writeRequest(new WriteTag3(tag.value)));
      if (status !== ReturnStatus.OK) return;
      ({ status, data } = await rfid.writeRequest(new ReadTag()));
      if (
        status === ReturnStatus.OK
        && data.length === tag.value.data.length
        && data.every((value, index) => tag.value.data[index] === value)
      ) {
        await rfid.writeRequest(new SetLedColor(LedColor.GREEN));
        if (playSound.value) await rfid.writeRequest(new Beep(5));
        setInterval(() => rfid.writeRequest(new SetLedColor(LedColor.NONE)), 300);
        return;
      }
      await rfid.writeRequest(new SetLedColor(LedColor.RED));
    };

    return {
      connectedString,
      connected,
      playSound,
      soundIcon,
      tag,
      webUsbSupported,
      webSerialSupported,
      readTag,
      toggleSound,
      writeTag,
      connect,
      connectUsb,
      disconnect,
    };
  },
});
</script>
