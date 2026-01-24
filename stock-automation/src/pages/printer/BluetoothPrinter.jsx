import { useEffect, useRef, useState } from "react";

// Common UUIDs for thermal printers. 
// If your printer is still not printing after connecting, 
// try changing these to: '0000ffe0-0000-1000-8000-00805f9b34fb'
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
      // FIX: Using acceptAllDevices allows you to see non-Epson/TM printers
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID]
      });

      console.log("Device selected:", device.name);

      device.addEventListener('gattserverdisconnected', handleDisconnect);

      const server = await device.gatt.connect();

      // Attempt to get the service
      try {
        const service = await server.getPrimaryService(SERVICE_UUID);
        const characteristic = await service.getCharacteristic(CHAR_UUID);

        deviceRef.current = device;
        characteristicRef.current = characteristic;

        localStorage.setItem("printer_connected", "true");
        setIsConnected(true);

        alert(`✅ Connected to ${device.name}`);
      } catch (serviceErr) {
        console.error("Service Error:", serviceErr);
        alert(`Connected to ${device.name}, but the specific Printer Service UUID was not found. Your printer might use a different UUID.`);
        device.gatt.disconnect();
      }

    } catch (err) {
      console.error("Bluetooth connect error:", err);
      if (err.name !== 'NotFoundError') {
        alert("Printer connection failed: " + err.message);
      }
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
    // console.log("⚠️ Printer disconnected");
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

      let text = `${init}${center}${boldOn}${billData.company || "T-VANAMM"}${boldOff}\n----------------\n${left}`;

      billData.items.forEach(i => {
        // Truncate name to 15 chars so it fits on line
        const shortName = i.name.substring(0, 15);
        // FIX: Used i.subtotal to match what is sent from Store.jsx
        text += `${shortName.padEnd(16)} x${i.qty} ${i.subtotal}\n`;
      });

      text += `----------------\n${boldOn}TOTAL: Rs ${billData.total}${boldOff}\n\n\n${cut}`;

      await characteristicRef.current.writeValue(
        encoder.encode(text)
      );

    } catch (err) {
      console.error("Print failed:", err);
      alert("❌ Printing failed. Connection lost?");
      handleDisconnect();
    }
  };

  return {
    connectPrinter,
    printReceipt,
    isConnected,
    isConnecting
  };
}