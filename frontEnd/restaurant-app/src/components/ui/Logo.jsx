import { Coffee } from "lucide-react";

export default function Logo({ size = "md" }) {
  const dims = size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-base";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${dims} rounded-full bg-gradient-to-br from-[#7B4B2A] to-[#3B2515] flex items-center justify-center shadow-md shadow-[#3B2515]/30`}
      >
        <Coffee
          className="text-[#F3E5D3]"
          size={size === "lg" ? 26 : 18}
          strokeWidth={1.75}
        />
      </div>
      <div className="leading-none">
        <p className="font-serif text-[#3B2515] tracking-wide text-base sm:text-lg">
          Brúne
        </p>
        <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#A9805F]">
          Coffee &amp; Kitchen
        </p>
      </div>
    </div>
  );
}
