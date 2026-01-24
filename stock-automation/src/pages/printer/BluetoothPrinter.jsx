import { useEffect, useRef, useState } from "react";

const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

export function useBluetoothPrinter() {
  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);

  const [isConnected, setIsConnected] = useState(
    localStorage.getItem("printer_connected") === "true"
  );
  const [isConnecting, setIsConnecting] = useState(false);

  /* ---------------- CONNECT ---------------- */
  const connectPrinter = async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'TM-' },
          { namePrefix: 'EPSON' }
        ],
        optionalServices: [SERVICE_UUID]
      });

      device.addEventListener('gattserverdisconnected', handleDisconnect);

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHAR_UUID);

      deviceRef.current = device;
      characteristicRef.current = characteristic;

      localStorage.setItem("printer_connected", "true");
      setIsConnected(true);

      alert(`✅ Connected to ${device.name}`);
    } catch (err) {
      console.error("Bluetooth connect error:", err);
      alert("Printer connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  /* ---------------- DISCONNECT ---------------- */
  const handleDisconnect = () => {
    deviceRef.current = null;
    characteristicRef.current = null;

    localStorage.removeItem("printer_connected");
    setIsConnected(false);

    alert("⚠️ Printer disconnected");
  };

  /* ---------------- PRINT ---------------- */
  const printReceipt = async (billData) => {
    try {
      if (!characteristicRef.current) {
        throw new Error("Printer not connected");
      }

      const encoder = new TextEncoder();

      const init = '\x1B\x40';
      const center = '\x1B\x61\x01';
      const left = '\x1B\x61\x00';
      const cut = '\x1D\x56\x00';
      const boldOn = '\x1B\x45\x01';
      const boldOff = '\x1B\x45\x00';

      let text = `${init}${center}${boldOn}T-VANAMM${boldOff}\n----------------\n${left}`;

      billData.items.forEach(i => {
        text += `${i.name.padEnd(12)} x${i.qty} ${i.total}\n`;
      });

      text += `----------------\n${boldOn}TOTAL: Rs ${billData.total}${boldOff}\n\n\n${cut}`;

      await characteristicRef.current.writeValue(
        encoder.encode(text)
      );

    } catch (err) {
      console.error("Print failed:", err);
      alert("❌ Printing failed. Please reconnect printer.");
      setIsConnected(false);
      localStorage.removeItem("printer_connected");
    }
  };

  return {
    connectPrinter,
    printReceipt,
    isConnected,
    isConnecting
  };
}
