import { useState, useCallback, useRef } from "react";
import { Coffee, ArrowRight, CheckCircle } from "lucide-react";
import QrScanner from "../components/qr/QrScanner.jsx";

export default function QrScanPage({ onTableVerified }) {
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [tableNumber, setTableNumber] = useState(null);
  const manualInputRef = useRef(null);

  const handleScan = useCallback(
    (decodedText) => {
      let tableNum = null;

      if (decodedText.startsWith("table:")) {
        tableNum = Number(decodedText.split(":")[1]);
      } else {
        try {
          const url = new URL(decodedText);
          const t = url.searchParams.get("table");
          if (t) tableNum = Number(t);
        } catch {
          const num = Number(decodedText);
          if (num > 0 && Number.isInteger(num)) tableNum = num;
        }
      }

      if (tableNum && tableNum > 0) {
        setTableNumber(tableNum);
        setVerified(true);
      } else {
        setError("Could not read table number. Please try again or enter it manually.");
      }
    },
    [],
  );

  const handleContinue = () => {
    if (tableNumber) {
      onTableVerified(tableNumber);
    }
  };

  const handleManualSubmit = () => {
    const num = Number(manualInputRef.current?.value);
    if (num > 0) {
      setTableNumber(num);
      setVerified(true);
    } else {
      setError("Please enter a valid table number.");
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-[#FBF6EF] flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-[#3B2515] mb-1">Table {tableNumber}</h1>
            <p className="text-sm text-[#A9805F]">Your table has been identified</p>
          </div>
          <button
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B2515] text-[#F3E5D3] px-8 py-3 text-sm font-medium hover:bg-[#4A3020] transition-colors"
          >
            Start Ordering
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF6EF] flex flex-col">
      <div className="flex items-center justify-center pt-12 pb-6">
        <Coffee size={28} className="text-[#3B2515]" />
        <span className="font-serif text-xl font-bold text-[#3B2515] ml-2">Coffe</span>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-12">
        <div className="text-center mb-6 max-w-sm">
          <h1 className="font-serif text-2xl text-[#3B2515] mb-2">Welcome</h1>
          <p className="text-sm text-[#A9805F]">
            Scan the QR code on your table to start ordering
          </p>
        </div>

        <QrScanner onScan={handleScan} />

        {error && (
          <p className="mt-4 text-sm text-rose-600 text-center max-w-sm">{error}</p>
        )}

        <div className="mt-8 border-t border-[#EDE1CF]/60 pt-6 w-full max-w-sm text-center">
          <p className="text-xs text-[#A9805F] mb-3">Or enter your Table Number manually</p>
          <div className="flex gap-2 justify-center">
            <input
              type="number"
              min="1"
              placeholder="Table #"
              ref={manualInputRef}
              className="w-24 text-center rounded-xl border border-[#EDE1CF] px-3 py-2 text-sm bg-white focus:outline-none"
              onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
            />
            <button
              onClick={handleManualSubmit}
              className="rounded-xl bg-[#3B2515] text-[#F3E5D3] px-4 py-2 text-xs font-semibold hover:bg-[#4A3020]"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
