export default function PrimaryButton({ children, className = "", disabled, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-full bg-[#3B2515] px-7 py-3.5 text-sm font-medium text-[#F3E5D3] tracking-wide shadow-lg shadow-[#3B2515]/25 transition-all duration-300 hover:bg-[#4A2E18] hover:shadow-xl hover:shadow-[#3B2515]/30 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}
