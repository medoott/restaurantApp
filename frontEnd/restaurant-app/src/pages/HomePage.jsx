import { motion } from "framer-motion";
import { ChevronRight, Star, Scan, Table2 } from "lucide-react";
import Logo from "../components/ui/Logo.jsx";
import PrimaryButton from "../components/ui/PrimaryButton.jsx";
import SectionLabel from "../components/ui/SectionLabel.jsx";
import { useSettings } from "../context/useSettings.js";

export default function HomePage({ products, onOrderNow, currentTable, onOpenScanner }) {
  const featured = (products || []).slice(0, 4);

  const settings = useSettings()?.settings;

  const generalSettings = settings?.general || {};

  return (
    <div className="min-h-screen bg-[#FBF6EF] flex flex-col justify-between pt-14">
      <div>
        {currentTable ? (
          <div className="bg-[#B07B4F] text-white px-5 py-2.5 flex items-center justify-center gap-2 text-sm font-medium">
            <Table2 size={14} /> Ordering from Table <strong>#{currentTable}</strong>
            <button onClick={onOpenScanner} className="ml-3 underline hover:no-underline text-white/80 text-xs">
              Change
            </button>
          </div>
        ) : (
          <div className="bg-[#3B2515]/5 px-5 py-2 flex items-center justify-center gap-2">
            <button onClick={onOpenScanner}
              className="flex items-center gap-1.5 text-xs text-[#7B4B2A] hover:text-[#3B2515] font-medium transition-colors">
              <Scan size={13} /> Scan QR to order from your table
            </button>
          </div>
        )}
        <header className="px-5 sm:px-10 pt-6 sm:pt-8">
          <Logo size="lg" />
        </header>

        <section className="relative mt-6 sm:mt-10 px-5 sm:px-10">
          <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">
            <img
              src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop"
              alt="Coffee and pastries"
              className="h-[62vh] sm:h-[72vh] w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1F1109]/85 via-[#1F1109]/35 to-transparent" />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-0 p-7 sm:p-14"
            >
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.35em] text-[#E8C9A0] mb-3">
                Roasted Daily &middot; Served Warm
              </p>
              <h1 className="font-serif text-4xl sm:text-6xl text-[#FBF6EF] leading-[1.05] max-w-xl">
                {generalSettings.name || "Brúne Coffee & Kitchen"}
              </h1>
              <p className="mt-4 max-w-md text-sm sm:text-base text-[#F3E5D3]/85 leading-relaxed">
                {generalSettings.description || "A quiet corner for slow mornings and good company — honest coffee, fresh kitchen plates, made the way they should be."}
              </p>
              <div className="mt-7">
                <PrimaryButton
                  onClick={onOrderNow}
                  className="bg-[#E8C9A0] text-[#3B2515] hover:bg-[#f0d8b8] shadow-black/30"
                >
                  Order Now{" "}
                  <ChevronRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </PrimaryButton>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-5 sm:px-10 py-16 sm:py-24 max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <SectionLabel>From the menu</SectionLabel>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#3B2515]">
              Featured this week
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {featured.length > 0 ? (
              featured.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                  className="group rounded-3xl bg-white p-3 shadow-sm shadow-[#3B2515]/5 ring-1 ring-[#E9DCC9] hover:shadow-xl hover:shadow-[#3B2515]/10 hover:-translate-y-1.5 transition-all duration-400"
                >
                  <div className="overflow-hidden rounded-2xl">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="px-2 pt-3 pb-2">
                    <div className="flex items-center gap-1 text-amber-500 mb-1">
                      {[...Array(5)].map((_, idx) => (
                        <Star
                          key={idx}
                          size={11}
                          fill="currentColor"
                          strokeWidth={0}
                        />
                      ))}
                    </div>
                    <h3 className="font-serif text-[#3B2515] text-lg">{p.name}</h3>
                    <p className="text-xs text-[#9C8268] mt-1 leading-relaxed">
                      {p.desc}
                    </p>
                    <p className="mt-3 text-[#B07B4F] font-semibold">
                      ${p.price.toFixed(2)}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-[#EDE1CF] bg-white p-8 text-center text-sm text-[#A9805F]">
                No products available yet.
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={onOrderNow}
              className="text-sm font-medium text-[#3B2515] underline decoration-[#D8B68B] decoration-2 underline-offset-4 hover:text-[#7B4B2A] transition-colors"
            >
              View full menu &amp; order
            </button>
          </div>
        </section>
      </div>

      {/* Dynamic Settings-based Footer */}
      <footer className="bg-[#3B2515] text-[#F3E5D3]/75 py-12 px-5 sm:px-10 border-t border-[#EDE1CF]/25 mt-16 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="space-y-3">
            <h3 className="font-serif text-[#FBF6EF] text-xl">{generalSettings.name || "Brúne Coffee & Kitchen"}</h3>
            <p className="text-xs leading-relaxed text-[#F3E5D3]/60">
              {generalSettings.description || "A quiet corner for slow mornings and good company — honest coffee, fresh kitchen plates."}
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#E8C9A0] uppercase tracking-wider">Opening Hours</h4>
            {Array.isArray(generalSettings.workingHours) ? (
              <div className="space-y-1">
                {generalSettings.workingHours.map((wh) => (
                  <div key={wh.day} className="flex justify-between max-w-[200px] text-xs">
                    <span className="font-medium">{wh.day}:</span>
                    <span className="text-[#F3E5D3]/60">{wh.enabled ? `${wh.open} - ${wh.close}` : "Closed"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs whitespace-pre-line">
                {generalSettings.workingHours || "Mon - Fri: 7:00 AM - 9:00 PM\nSat - Sun: 8:00 AM - 10:00 PM"}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#E8C9A0] uppercase tracking-wider">Contact & Location</h4>
            <p className="text-xs">{generalSettings.address || "120 Coffee Boulevard, Beans Town"}</p>
            <div className="flex flex-col gap-1.5 pt-1">
              {generalSettings.phones && (
                <a href={`tel:${generalSettings.phones}`} className="text-xs text-[#E8C9A0] hover:underline">
                  Phone: {generalSettings.phones}
                </a>
              )}
              {generalSettings.whatsapp && (
                <a href={`https://wa.me/${generalSettings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline">
                  WhatsApp Us
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-[#EDE1CF]/10 mt-8 pt-6 text-center text-[10px] text-[#F3E5D3]/40">
          &copy; {new Date().getFullYear()} {generalSettings.name || "Brúne Coffee"}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
