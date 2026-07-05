import { X } from "lucide-react";
import QrScanner from "./QrScanner.jsx";

export default function ScannerModal({ open, onClose, onScan, error }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="font-serif text-lg text-[#3B2515]">Scan Table QR</h2>
          <button
            onClick={onClose}
            className="text-[#9C8268] hover:text-[#3B2515] p-1 rounded-full hover:bg-[#FBF6EF] transition-colors"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5">
          <QrScanner onScan={onScan} />
        </div>

        {error && (
          <div className="px-5 pb-5">
            <p className="text-sm text-rose-600 text-center bg-rose-50 rounded-xl px-4 py-3" role="alert">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
