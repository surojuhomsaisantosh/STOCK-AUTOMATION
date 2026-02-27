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
    console.log("🔌 Printer Disconnected");
    deviceRef.current = null;
    characteristicRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
  };

  /**
   * HELPER: wrapText
   * Splits a long string into multiple lines based on character limit 
   * without breaking words. Perfect for centering long addresses.
   */
  const wrapText = (text, limit = 32) => {
    if (!text) return "";
    const words = text.split(' ');
    let lines = [];
    let currentLine = "";

    words.forEach(word => {
      if ((currentLine + word).length <= limit) {
        currentLine += (currentLine === "" ? "" : " ") + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    lines.push(currentLine);
    return lines.join('\n');
  };

  const connectPrinter = async () => {
    if (supportError) {
      alert(supportError);
      return;
    }

    if (isConnected || isConnecting) return;
    setIsConnecting(true);

    try {
      console.log("🚀 Requesting Bluetooth Device...");

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

      console.log(`🔗 Device Selected: ${device.name}`);
      console.log("📡 Connecting to GATT Server...");
      const server = await device.gatt.connect();

      device.addEventListener('gattserverdisconnected', handleDisconnect);

      console.log("🔍 Looking for Services...");

      let characteristic;
      try {
        const service = await server.getPrimaryService(PROFILES.GENERIC.service);
        characteristic = await service.getCharacteristic(PROFILES.GENERIC.char);
        console.log("✅ Using Generic Profile characteristic");
      } catch (e) {
        console.log("⚠️ Generic profile not found, trying Standard profile...");
        const service = await server.getPrimaryService(PROFILES.STANDARD.service);
        characteristic = await service.getCharacteristic(PROFILES.STANDARD.char);
        console.log("✅ Using Standard Profile characteristic");
      }

      deviceRef.current = device;
      characteristicRef.current = characteristic;
      setIsConnected(true);
      console.log("🎊 CONNECTION SUCCESSFUL");

    } catch (err) {
      console.error("❌ Connection failed:", err);
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
    console.group("🖨️ PRINT DEBUGGER");
    console.log("1. RAW BILL DATA RECEIVED:", billData);

    if (!billData) {
      console.error("❌ ABORT: No billData provided to printReceipt()");
      console.groupEnd();
      return;
    }

    if (!isConnected || !characteristicRef.current) {
      console.error("❌ ABORT: Printer not connected or characteristic missing.");
      console.groupEnd();
      alert("Printer not connected!");
      return;
    }

    try {
      const encoder = new TextEncoder();

      // ESC/POS Command definitions
      const ESC = '\x1B';
      const reset = ESC + '@';
      const center = ESC + 'a' + '\x01';
      const left = ESC + 'a' + '\x00';
      const boldOn = ESC + 'E' + '\x01';
      const boldOff = ESC + 'E' + '\x00';

      let text = reset;

      // 1. Header: Company Name (Centered & Bold)
      text += center + boldOn + (billData.company || "RECEIPT").toUpperCase() + boldOff + "\n\n";

      // 2. Address: Auto-wrapped for clean centering on 58mm paper
      if (billData.address) {
        const wrappedAddress = wrapText(billData.address.toUpperCase(), 28);
        text += wrappedAddress + "\n";
      }
      text += "--------------------------------\n" + left;

      // 3. Metadata: Date and 12-Hour Format Time
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      text += "\n"; // One line space
      if (billData.billId) {
        text += `Bill Ref No: #${billData.billId}\n`;
      }
      text += `Date: ${new Date().toLocaleString()}\n`;
      text += "--------------------------------\n";

      // 4. Table Header
      text += "Item            Qty    Price\n";
      text += "--------------------------------\n" + left;
      // 5. Items Loop
      billData.items.forEach(i => {
        const name = (i.name || "Item").slice(0, 15).padEnd(16);
        const qty = `x${i.qty}`.padEnd(6);
        const sub = `${i.subtotal}`.padStart(9);
        text += `${name}${qty}${sub}\n`;

      });

      // 6. Footer: Total and Thank You
      text += "--------------------------------\n";

      if (billData.discount && parseFloat(billData.discount) > 0) {
        text += `Subtotal:`.padEnd(15) + `${billData.subtotal}`.padStart(16) + "\n";
        text += `Discount:`.padEnd(15) + `-${billData.discount}`.padStart(16) + "\n";
        text += "--------------------------------\n";
      }

      text += boldOn + `TOTAL:`.padEnd(15) + `${billData.total}`.padStart(16) + boldOff + "\n";
      text += "\n" + center + (billData.thankYouMsg || "Thank You!, Visit Again.") + "\n";
      text += "\n\n\n\n"; // Final feed for easy tearing

      console.log("6. FINAL FORMATTED TEXT:\n", text);
      const data = encoder.encode(text);

      console.log(`7. ENCODED BYTES: ${data.length} bytes`);
      console.log("📤 Sending chunks to printer...");

      const CHUNK_SIZE = 20;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristicRef.current.writeValue(chunk);
        await new Promise(r => setTimeout(r, 35));
      }

      console.log("✅ PRINT TASK FINISHED");
    } catch (err) {
      console.error("❌ PRINT HARDWARE ERROR:", err);
      disconnectPrinter();
    } finally {
      console.groupEnd();
    }
  };

  return (
    <PrinterContext.Provider value={{
      connectPrinter,
      disconnectPrinter,
      printReceipt,
      isConnected,
      isConnecting,
      supportError
    }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function useBluetoothPrinter() {
  return useContext(PrinterContext);
}