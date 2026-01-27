import React, { createContext, useContext, useRef, useState, useEffect } from "react";

const PrinterContext = createContext();

const PROFILES = {
  GENERIC: { 
    service: '0000ffe0-0000-1000-8000-00805f9b34fb',
    char: '0000ffe1-0000-1000-8000-00805f9b34fb'
  },
  STANDARD: {
    service: '000018f0-0000-1000-8000-00805f9b34fb',
    char: '00002af1-0000-1000-8000-00805f9b34fb'
  }
};

export function PrinterProvider({ children }) {
  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [supportError, setSupportError] = useState(null);

  // Check for Web Bluetooth support on mount
  useEffect(() => {
    if (!navigator.bluetooth) {
      setSupportError("Web Bluetooth is not supported on this browser. iOS users: Try the 'Bluefy' or 'WebBLE' browser apps.");
    }
  }, []);

  const handleDisconnect = () => {
    deviceRef.current = null;
    characteristicRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
  };

  const connectPrinter = async () => {
    if (supportError) {
      alert(supportError);
      return;
    }
    
    if (isConnected || isConnecting) return;
    setIsConnecting(true);

    try {
      console.log("🚀 Initializing fast-scan...");
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [PROFILES.GENERIC.service] },
          { services: [PROFILES.STANDARD.service] },
          { namePrefix: 'MPT' },
          { namePrefix: 'RT' },
          { namePrefix: 'POS' },
          { namePrefix: 'Printer' }
        ],
        optionalServices: [PROFILES.GENERIC.service, PROFILES.STANDARD.service]
      });

      console.log("🔗 Device found. Connecting to GATT...");
      const server = await device.gatt.connect();
      
      device.addEventListener('gattserverdisconnected', handleDisconnect);

      console.log("🔍 Locating Print Characteristic...");
      
      let characteristic;
      try {
        const service = await server.getPrimaryService(PROFILES.GENERIC.service);
        characteristic = await service.getCharacteristic(PROFILES.GENERIC.char);
      } catch (e) {
        console.log("Falling back to Standard profile...");
        const service = await server.getPrimaryService(PROFILES.STANDARD.service);
        characteristic = await service.getCharacteristic(PROFILES.STANDARD.char);
      }

      deviceRef.current = device;
      characteristicRef.current = characteristic;
      setIsConnected(true);
      console.log("✅ Connected!");

    } catch (err) {
      console.error("Connection failed:", err);
      handleDisconnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPrinter = () => {
    if (deviceRef.current && deviceRef.current.gatt.connected) {
      deviceRef.current.gatt.disconnect();
    }
    handleDisconnect();
  };

  const printReceipt = async (billData) => {
    if (!isConnected || !characteristicRef.current) return;

    try {
      const encoder = new TextEncoder();
      const reset = '\x1B\x40';
      const center = '\x1B\x61\x01';
      const left = '\x1B\x61\x00';
      
      let text = reset + center + (billData.company || "RECEIPT") + "\n\n" + left;
      
      billData.items.forEach(i => {
        text += `${(i.name || "Item").slice(0, 16).padEnd(16)} x${i.qty} ${i.subtotal}\n`;
      });
      
      text += "\n--------------------------------\n";
      text += `TOTAL: ${billData.total}\n\n\n\n`;

      const data = encoder.encode(text);
      
      const CHUNK_SIZE = 20; 
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristicRef.current.writeValue(chunk);
        await new Promise(r => setTimeout(r, 25)); // Slightly increased delay for iPad stability
      }
    } catch (err) {
      console.error("Print Error:", err);
      disconnectPrinter();
    }
  };

  return (
    <PrinterContext.Provider value={{ 
      connectPrinter, 
      disconnectPrinter, 
      printReceipt, 
      isConnected, 
      isConnecting,
      supportError // Export this so you can show a UI warning
    }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function useBluetoothPrinter() {
  return useContext(PrinterContext);
}