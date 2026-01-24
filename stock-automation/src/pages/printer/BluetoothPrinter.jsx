import React, { createContext, useContext, useRef, useState } from "react";

// Create Context
const PrinterContext = createContext();

// Common UUIDs for 58mm Thermal Printers
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

export function PrinterProvider({ children }) {
  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  /* ---------------- CONNECT ---------------- */
  const connectPrinter = async () => {
    if (isConnected) {
      console.log("⚠️ Printer already connected");
      return;
    }
    if (isConnecting) return;
    
    setIsConnecting(true);

    try {
      console.log("🔍 Requesting Device...");
      
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [PROFILES.STANDARD.service, PROFILES.GENERIC.service]
      });

      console.log("📱 Device Selected:", device.name);
      
      device.addEventListener('gattserverdisconnected', handleDisconnect);

      const server = await device.gatt.connect();
      console.log("✅ GATT Connected");

      // SERVICE DISCOVERY
      const savedServiceUUID = localStorage.getItem("printer_service_uuid");
      const savedCharUUID = localStorage.getItem("printer_char_uuid");

      let service, characteristic;

      if (savedServiceUUID && savedCharUUID) {
        try {
          console.log("⚡ Trying Cached UUIDs...");
          service = await server.getPrimaryService(savedServiceUUID);
          characteristic = await service.getCharacteristic(savedCharUUID);
          console.log("⚡ Cached UUIDs worked!");
        } catch (e) {
          console.warn("⚠️ Cached UUIDs failed. Scanning fresh...");
          const result = await scanForService(server);
          service = result.service;
          characteristic = result.characteristic;
        }
      } else {
        const result = await scanForService(server);
        service = result.service;
        characteristic = result.characteristic;
      }

      deviceRef.current = device;
      characteristicRef.current = characteristic;

      localStorage.setItem("printer_service_uuid", service.uuid);
      localStorage.setItem("printer_char_uuid", characteristic.uuid);
      
      setIsConnected(true);

    } catch (err) {
      console.error("Connection Error:", err);
      if (err.name !== 'NotFoundError') {
        alert("Connection failed: " + err.message);
      }
      handleDisconnect();
    } finally {
      setIsConnecting(false);
    }
  };

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
  const disconnectPrinter = () => {
    console.log("🔌 Disconnecting...");
    if (deviceRef.current) {
      deviceRef.current.removeEventListener('gattserverdisconnected', handleDisconnect); // Prevent loop
      if (deviceRef.current.gatt.connected) {
        deviceRef.current.gatt.disconnect();
      }
    }
    
    deviceRef.current = null;
    characteristicRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
  };
  
  // Internal handler for event listener
  const handleDisconnect = () => {
      console.log("⚠️ Printer Disconnected (Event)");
      deviceRef.current = null;
      characteristicRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
  };

  /* ---------------- PRINT ---------------- */
  const printReceipt = async (billData) => {
    if (!isConnected || !characteristicRef.current) {
      alert("⚠️ Printer disconnected. Please reconnect.");
      disconnectPrinter();
      return;
    }

    try {
      const encoder = new TextEncoder();
      const CMD = {
        RESET: '\x1B\x40',
        CENTER: '\x1B\x61\x01',
        LEFT: '\x1B\x61\x00',
        RIGHT: '\x1B\x61\x02',
        BOLD_ON: '\x1B\x45\x01',
        BOLD_OFF: '\x1B\x45\x00',
        CUT: '\x1D\x56\x00'
      };

      let text = '';
      text += CMD.RESET + CMD.CENTER + CMD.BOLD_ON + (billData.company || "STORE") + CMD.BOLD_OFF + '\n\n';

      if (billData.address) {
        text += CMD.CENTER + billData.address + '\n';
      }
      
      text += '\n'; 
      text += "--------------------------------\n";
      text += CMD.LEFT + CMD.BOLD_ON + "ITEM             QTY     TOTAL" + CMD.BOLD_OFF + '\n';
      text += "--------------------------------\n";

      billData.items.forEach(i => {
        let name = (i.name || "Item").substring(0, 16).padEnd(16, " ");
        let qty = String(i.qty).padStart(3, " ");
        let price = String(i.subtotal).padStart(10, " ");
        text += `${name} ${qty} ${price}\n`;
      });

      text += "--------------------------------\n";
      text += '\n';
      text += CMD.CENTER + CMD.BOLD_ON + "TOTAL: " + billData.total + CMD.BOLD_OFF + '\n\n';

      if (billData.thankYouMsg) {
        text += CMD.CENTER + billData.thankYouMsg + '\n';
      } else {
         text += CMD.CENTER + "Thank You!\n";
      }

      text += "\n\n\n"; 

      const data = encoder.encode(text);
      const CHUNK_SIZE = 50; 
      
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristicRef.current.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 20)); 
      }

    } catch (err) {
      console.error("Print Error:", err);
      alert("❌ Print failed. Connection lost.");
      disconnectPrinter();
    }
  };

  return (
    <PrinterContext.Provider value={{
      connectPrinter,
      disconnectPrinter,
      printReceipt,
      isConnected,
      isConnecting
    }}>
      {children}
    </PrinterContext.Provider>
  );
}

// Hook to consume the context
export function useBluetoothPrinter() {
  return useContext(PrinterContext);
}