import { useEffect, useRef, useState } from "react";

// DEFINING BOTH COMMON PRINTER STANDARDS
// 58Printers usually use the GENERIC profile (ffe0)
const PROFILES = {
  STANDARD: {
    service: '000018f0-0000-1000-8000-00805f9b34fb',
    char: '00002af1-0000-1000-8000-00805f9b34fb'
  },
  GENERIC: { 
    service: '0000ffe0-0000-1000-8000-00805f9b34fb',
    char: '0000ffe1-0000-1000-8000-00805f9b34fb'
  }
};

export function useBluetoothPrinter() {
  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);
  
  // Initialize state based on previous successful connection
  const [isConnected, setIsConnected] = useState(
    localStorage.getItem("printer_connected") === "true"
  );
  const [isConnecting, setIsConnecting] = useState(false);

  /* ---------------- CONNECT ---------------- */
  const connectPrinter = async () => {
    if (isConnecting) return;
    setIsConnecting(true);

    try {
      console.log("🔍 Requesting Device...");
      
      // 1. Request Device - acceptAllDevices allows seeing "58Printer"
      // optionalServices MUST list both to allow the browser to talk to either
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [PROFILES.STANDARD.service, PROFILES.GENERIC.service]
      });

      console.log("📱 Device Selected:", device.name);
      
      device.addEventListener('gattserverdisconnected', handleDisconnect);

      // 2. Connect to GATT Server
      const server = await device.gatt.connect();
      console.log("✅ GATT Connected");

      // 3. SERVICE DISCOVERY (Smart Auto-Detect)
      // Check if we have saved UUIDs from a previous successful connection
      const savedServiceUUID = localStorage.getItem("printer_service_uuid");
      const savedCharUUID = localStorage.getItem("printer_char_uuid");

      let service, characteristic;

      if (savedServiceUUID && savedCharUUID) {
        try {
          console.log("⚡ Using Cached UUIDs for speed...");
          service = await server.getPrimaryService(savedServiceUUID);
          characteristic = await service.getCharacteristic(savedCharUUID);
        } catch (e) {
          console.log("⚠️ Cached UUID failed. Retrying full scan...");
          // If cache fails, fall back to manual scan
          const result = await scanForService(server);
          service = result.service;
          characteristic = result.characteristic;
        }
      } else {
        // No cache, do full scan
        const result = await scanForService(server);
        service = result.service;
        characteristic = result.characteristic;
      }

      // 4. Success! Save references
      deviceRef.current = device;
      characteristicRef.current = characteristic;

      // Save the specific UUIDs that worked so next time it's instant
      localStorage.setItem("printer_service_uuid", service.uuid);
      localStorage.setItem("printer_char_uuid", characteristic.uuid);
      localStorage.setItem("printer_connected", "true");
      
      setIsConnected(true);
      alert(`✅ Connected to ${device.name}`);

    } catch (err) {
      console.error("Connection Error:", err);
      // Only show alert if it wasn't the user just clicking "Cancel"
      if (err.name !== 'NotFoundError') {
        alert("Connection failed: " + err.message);
      }
      handleDisconnect();
    } finally {
      setIsConnecting(false);
    }
  };

  // Helper function to try Standard UUID first, then Generic UUID
  const scanForService = async (server) => {
    try {
      console.log("Trying Standard UUID (18f0)...");
      const s = await server.getPrimaryService(PROFILES.STANDARD.service);
      const c = await s.getCharacteristic(PROFILES.STANDARD.char);
      return { service: s, characteristic: c };
    } catch (e) {
      console.log("Standard failed. Trying Generic UUID (ffe0)...");
      try {
        const s = await server.getPrimaryService(PROFILES.GENERIC.service);
        const c = await s.getCharacteristic(PROFILES.GENERIC.char);
        return { service: s, characteristic: c };
      } catch (e2) {
        throw new Error("Could not find a printing service. Is this a thermal printer?");
      }
    }
  };

  /* ---------------- DISCONNECT ---------------- */
  const handleDisconnect = () => {
    console.log("⚠️ Disconnected");
    if (deviceRef.current && deviceRef.current.gatt.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    characteristicRef.current = null;
    setIsConnected(false);
    localStorage.removeItem("printer_connected");
  };

  /* ---------------- PRINT ---------------- */
  const printReceipt = async (billData) => {
    if (!isConnected || !characteristicRef.current) {
      alert("⚠️ Printer disconnected. Please reconnect.");
      handleDisconnect();
      return;
    }

    try {
      const encoder = new TextEncoder();

      // ESC/POS COMMANDS
      const CMD = {
        RESET: '\x1B\x40',
        CENTER: '\x1B\x61\x01',
        LEFT: '\x1B\x61\x00',
        RIGHT: '\x1B\x61\x02',
        BOLD_ON: '\x1B\x45\x01',
        BOLD_OFF: '\x1B\x45\x00',
        CUT: '\x1D\x56\x00'
      };

      // 1. Header: Company Name
      let text = `${CMD.RESET}${CMD.CENTER}${CMD.BOLD_ON}${billData.company || "STORE"}${CMD.BOLD_OFF}\n`;

      // 2. Header: Address (UPDATED LOGIC)
      if (billData.address) {
        text += `${CMD.RESET}${CMD.CENTER}${billData.address}\n`;
      }

      // 3. Separator
      text += `--------------------------------\n${CMD.LEFT}`;

      billData.items.forEach(i => {
        // Formatting for 32-column printers (Standard 58mm)
        const name = i.name.substring(0, 15);
        const qty = `x${i.qty}`;
        const price = i.subtotal; // Assumed to be string or number
        
        // Manual column spacing: Name(16) + Qty(6) + Price(10)
        text += `${name.padEnd(16)} ${qty.padEnd(6)} ${String(price).padStart(8)}\n`;
      });

      text += `--------------------------------\n`;
      text += `${CMD.RIGHT}${CMD.BOLD_ON}TOTAL: ${billData.total}${CMD.BOLD_OFF}\n`;
      text += `${CMD.CENTER}\nThank You!\n\n\n${CMD.CUT}`;

      // CHUNKING LOGIC: Essential for Android/Generic Printers
      // Sending too much data at once causes 58Printers to crash/disconnect
      const data = encoder.encode(text);
      const CHUNK_SIZE = 50; // 50 bytes per packet is safe
      
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristicRef.current.writeValue(chunk);
        // Small delay to let printer buffer clear
        await new Promise(resolve => setTimeout(resolve, 20)); 
      }

    } catch (err) {
      console.error("Print Error:", err);
      alert("❌ Print failed. Connection lost.");
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