import { useState } from "react";

export function useBluetoothPrinter() {
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectPrinter = async () => {
    setIsConnecting(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'TM-' }, 
          { namePrefix: 'EPSON' }, 
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
      const server = await device.gatt?.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      
      setConnectedPrinter({ device, characteristic });
      alert(`✅ Connected to ${device.name}`);
    } catch (error) { 
      console.error(error);
      alert("Connection failed."); 
    } finally { 
      setIsConnecting(false); 
    }
  };

  const printReceipt = async (billData) => {
    if (!connectedPrinter?.characteristic) return;
    try {
      const encoder = new TextEncoder();
      
      // ESC/POS Commands
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
      
      await connectedPrinter.characteristic.writeValue(encoder.encode(text));
    } catch (err) { 
      console.error("Print error:", err); 
    }
  };

  return { connectPrinter, printReceipt, isConnected: !!connectedPrinter, isConnecting };
}