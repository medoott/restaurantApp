import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

export default function QrScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    let html5QrCode = null;
    let mounted = true;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted) return;
        const scannerId = "qr-scanner-element";
        html5QrCode = new Html5Qrcode(scannerId);
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (mounted) {
              html5QrCode?.stop().catch(() => {});
              setScanning(false);
              onScan(decodedText);
            }
          },
          () => {},
        );
        if (mounted) setScanning(true);
      } catch (err) {
        if (mounted) {
          setCameraError(
            err.message?.includes("NotAllowedError")
              ? "Camera access denied. Please allow camera access or enter the table number manually."
              : "Could not access camera. Please enter your table number manually.",
          );
          onError?.(err.message);
        }
      }
    }

    start();

    return () => {
      mounted = false;
      html5QrCode?.stop().catch(() => {});
    };
  }, [onScan, onError]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const num = Number(manualInput);
    if (num > 0 && Number.isInteger(num)) {
      onScan(`table:${num}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden ring-2 ring-[#EDE1CF] bg-[#FBF6EF]" style={{ minHeight: "250px" }}>
        <div
          id="qr-scanner-element"
          ref={scannerRef}
          className="w-full h-full"
        />

        {!scanning && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#A9805F] gap-2 pointer-events-none">
            <Camera size={40} />
            <p className="text-sm font-medium">Position QR code in frame</p>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#A9805F] gap-2 px-6 pointer-events-none">
            <CameraOff size={40} />
            <p className="text-sm text-center">{cameraError}</p>
          </div>
        )}
      </div>

      {!showManual ? (
        <div className="text-center">
          <button
            onClick={() => setShowManual(true)}
            className="text-sm text-[#B07B4F] hover:text-[#3B2515] underline underline-offset-2"
          >
            Or enter table number manually
          </button>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="max-w-xs mx-auto space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#A9805F] mb-1">
              Table Number
            </label>
            <input
              type="number"
              min="1"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="e.g. 12"
              className="w-full rounded-xl border border-[#EDE1CF] bg-white px-4 py-2.5 text-sm text-[#3B2515] placeholder-[#D8C5A8] focus:outline-none focus:ring-2 focus:ring-[#B07B4F]"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!manualInput}
            className="w-full rounded-xl bg-[#3B2515] text-[#F3E5D3] py-2.5 text-sm font-medium disabled:opacity-40"
          >
            Find My Table
          </button>
          <button
            type="button"
            onClick={() => setShowManual(false)}
            className="w-full text-xs text-[#A9805F] hover:text-[#7B4B2A]"
          >
            Back to scanner
          </button>
        </form>
      )}
    </div>
  );
}
