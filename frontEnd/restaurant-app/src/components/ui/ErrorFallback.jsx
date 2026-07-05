import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorFallback({ message = "Something went wrong", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="alert">
      <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-rose-500">
        <AlertTriangle size={28} />
      </div>
      <h3 className="text-lg font-medium text-[#3B2515] mb-1">Error</h3>
      <p className="text-sm text-[#A9805F] max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#3B2515] text-white rounded-lg text-sm font-medium hover:bg-[#4A3020] transition-colors"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      )}
    </div>
  );
}
