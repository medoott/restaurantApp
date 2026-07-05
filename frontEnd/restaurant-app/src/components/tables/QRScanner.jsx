import { useState, useRef, useCallback, useEffect } from "react";
import { Scan, X, Camera, Hash, AlertCircle, Upload } from "lucide-react";

function extractTableNumber(text) {
  if (!text) return null;
  const match = text.match(/[?&]table=(\d+)/i);
  if (match) return Number(match[1]);
  const digits = text.match(/\d+/);
  if (digits) return Number(digits[0]);
  return null;
}

async function detectQR(video) {
  if ("BarcodeDetector" in window) {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const barcodes = await detector.detect(video);
    if (barcodes.length > 0) return barcodes[0].rawValue;
  }
  return null;
}

async function detectQRFromImage(img) {
  if ("BarcodeDetector" in window) {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const barcodes = await detector.detect(img);
    if (barcodes.length > 0) return barcodes[0].rawValue;
  }
  return null;
}

export default function QRScanner({ onDetect, onClose }) {
  const [mode, setMode] = useState("choice");
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = async () => {
    setError("");
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        scanTimerRef.current = setInterval(async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            const result = await detectQR(videoRef.current);
            if (result) {
              stopCamera();
              const tableNum = extractTableNumber(result);
              if (tableNum) { onDetect(tableNum); return; }
              setError("QR code does not contain a valid table number. Try again or enter manually.");
              setScanning(false);
            }
          } catch { }
        }, 500);
      }
    } catch {
      const hasBarcodeDetector = "BarcodeDetector" in window;
      setError(
        hasBarcodeDetector
          ? "Camera access denied. Allow camera access or enter the table number manually."
          : "Camera QR scanning requires a secure connection (HTTPS) and a compatible browser. Enter the table number manually.",
      );
      setScanning(false);
    }
  };

  const handleManualSubmit = () => {
    const num = Number(manualInput);
    if (!num || num < 1) { setError("Please enter a valid table number"); return; }
    onDetect(num);
  };

  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const img = new Image();
    img.onload = async () => {
      try {
        const result = await detectQRFromImage(img);
        if (result) {
          const tableNum = extractTableNumber(result);
          if (tableNum) { onDetect(tableNum); return; }
          setError("QR code does not contain a valid table number");
        } else {
          setError("Could not read QR code. Make sure the image is clear and contains a QR code.");
        }
      } catch {
        setError("Could not process the image. Try entering the table number manually.");
      }
    };
    img.onerror = () => setError("Failed to load image");
    img.src = URL.createObjectURL(file);
  };

  const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE1CF]">
          <h3 className="font-serif text-base text-[#3B2515] flex items-center gap-2">
            <Scan size={16} /> Scan Table QR
          </h3>
          <button onClick={onClose} className="text-[#9C8268] hover:text-[#3B2515]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {mode === "choice" && (
            <div className="space-y-3">
              {hasBarcodeDetector && (
                <button onClick={() => { setMode("camera"); startCamera(); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#B07B4F] text-white px-4 py-3 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                  <Camera size={16} /> Use Camera
                </button>
              )}
              {hasBarcodeDetector && (
                <label className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#EDE1CF] text-[#7B4B2A] px-4 py-3 text-sm font-medium hover:bg-[#FBF6EF] cursor-pointer transition-colors">
                  <Upload size={16} /> Scan from Image
                  <input type="file" accept="image/*" onChange={handleFileScan} className="hidden" />
                </label>
              )}
              <button onClick={() => setMode("manual")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#EDE1CF] text-[#7B4B2A] px-4 py-3 text-sm hover:bg-[#FBF6EF] transition-colors">
                <Hash size={16} /> Enter Table Number
              </button>
              {!hasBarcodeDetector && (
                <p className="text-xs text-[#9C8268] text-center px-2">
                  QR scanning not available on this device/browser. Enter the table number manually.
                </p>
              )}
            </div>
          )}

          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {scanning && cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white/40 rounded-xl" />
                    <p className="absolute bottom-4 text-white/60 text-xs">Point camera at QR code</p>
                  </div>
                )}
                {!cameraReady && scanning && (
                  <div className="text-white/60 text-sm">Starting camera...</div>
                )}
              </div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => { stopCamera(); setMode("choice"); setError(""); }}
                  className="rounded-full border border-[#EDE1CF] px-4 py-2 text-xs text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                  Cancel
                </button>
                <button onClick={() => setMode("manual")}
                  className="rounded-full border border-[#EDE1CF] px-4 py-2 text-xs text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                  Enter Manually
                </button>
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">
                  Table Number
                </label>
                <input type="number" min="1" value={manualInput} autoFocus
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
                  placeholder="Enter table number..."
                  className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-3 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMode("choice")}
                  className="flex-1 rounded-full border border-[#EDE1CF] px-4 py-2.5 text-sm text-[#7B4B2A] hover:bg-[#FBF6EF] transition-colors">
                  Back
                </button>
                <button onClick={handleManualSubmit}
                  className="flex-1 rounded-full bg-[#B07B4F] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#C9925F] transition-colors">
                  Set Table
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
