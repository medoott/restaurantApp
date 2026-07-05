import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Save, RotateCcw, Undo2, Settings,
  Store, Palette, UtensilsCrossed, ShoppingCart, ListOrdered, Wallet,
  Bell, Users, Shield, HardDrive, BarChart3, UserCog, Package,
  Puzzle, Key, Monitor, Wrench, CheckCircle, X, AlertCircle,
} from "lucide-react"
import { useSettings } from "../../context/useSettings.js"

const GeneralSettings = lazy(() => import("./settings/GeneralSettings.jsx"))
const BrandingSettings = lazy(() => import("./settings/BrandingSettings.jsx"))
const MenuSettings = lazy(() => import("./settings/MenuSettings.jsx"))
const OrderingSettings = lazy(() => import("./settings/OrderingSettings.jsx"))
const OrderStatusSettings = lazy(() => import("./settings/OrderStatusSettings.jsx"))
const PaymentSettings = lazy(() => import("./settings/PaymentSettings.jsx"))
const NotificationSettings = lazy(() => import("./settings/NotificationSettings.jsx"))
const StaffManagement = lazy(() => import("./settings/StaffManagement.jsx"))
const SecuritySettings = lazy(() => import("./settings/SecuritySettings.jsx"))
const BackupSettings = lazy(() => import("./settings/BackupSettings.jsx"))
const ReportSettings = lazy(() => import("./settings/ReportSettings.jsx"))
const CustomerSettings = lazy(() => import("./settings/CustomerSettings.jsx"))
const InventorySettings = lazy(() => import("./settings/InventorySettings.jsx"))
const IntegrationSettings = lazy(() => import("./settings/IntegrationSettings.jsx"))
const ApiSettings = lazy(() => import("./settings/ApiSettings.jsx"))
const AppearanceSettings = lazy(() => import("./settings/AppearanceSettings.jsx"))
const SystemSettings = lazy(() => import("./settings/SystemSettings.jsx"))

const SECTIONS = [
  { key: "general", label: "General", icon: Store, component: GeneralSettings },
  { key: "branding", label: "Branding", icon: Palette, component: BrandingSettings },
  { key: "menu", label: "Menu Settings", icon: UtensilsCrossed, component: MenuSettings },
  { key: "ordering", label: "Ordering", icon: ShoppingCart, component: OrderingSettings },
  { key: "orderStatuses", label: "Order Statuses", icon: ListOrdered, component: OrderStatusSettings },
  { key: "payment", label: "Payment", icon: Wallet, component: PaymentSettings },
  { key: "notifications", label: "Notifications", icon: Bell, component: NotificationSettings },
  { key: "staff", label: "Staff", icon: Users, component: StaffManagement },
  { key: "security", label: "Security", icon: Shield, component: SecuritySettings },
  { key: "backup", label: "Backup", icon: HardDrive, component: BackupSettings },
  { key: "reports", label: "Reports", icon: BarChart3, component: ReportSettings },
  { key: "customer", label: "Customers", icon: UserCog, component: CustomerSettings },
  { key: "inventory", label: "Inventory", icon: Package, component: InventorySettings },
  { key: "integrations", label: "Integrations", icon: Puzzle, component: IntegrationSettings },
  { key: "api", label: "API", icon: Key, component: ApiSettings },
  { key: "appearance", label: "Appearance", icon: Monitor, component: AppearanceSettings },
  { key: "system", label: "System", icon: Wrench, component: SystemSettings },
]

export default function SettingsView() {
  const {
    settings,
    saving,
    notification,
    errors,
    hasChanges,
    changedSections,
    unsavedCount,
    updateSection,
    handleSave,
    handleReset,
    handleRestoreDefaults,
  } = useSettings()

  const [expandedSection, setExpandedSection] = useState("general")
  const [searchQuery, setSearchQuery] = useState("")
  const contentRef = useRef(null)

  useEffect(() => {
    if (!hasChanges) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasChanges])

  const handleSectionChange = useCallback((sectionKey, newData) => {
    updateSection(sectionKey, newData)
  }, [updateSection])

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS
    const q = searchQuery.toLowerCase()
    return SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const expandedSectionData = useMemo(() => {
    return SECTIONS.find((s) => s.key === expandedSection)
  }, [expandedSection])

  const sectionErrors = useMemo(() => {
    const errMap = {}
    if (errors.name) errMap.general = true
    if (errors.email) errMap.general = true
    return errMap
  }, [errors])

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault()
      if (hasChanges && !saving) handleSave()
    }
  }, [hasChanges, saving, handleSave])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="relative min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif text-xl text-[#3B2515] flex items-center gap-2">
              <Settings size={18} /> Settings
            </h2>
            <p className="text-xs text-[#A9805F] mt-0.5">
              Manage your restaurant configuration
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A9805F]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full rounded-full border border-[#EDE1CF] bg-white pl-9 pr-4 py-2.5 text-sm text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A9805F] hover:text-[#3B2515]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 rounded-xl px-4 py-3 text-sm flex items-center gap-2.5 ${
              notification.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : notification.type === "error"
                ? "bg-rose-50 border border-rose-200 text-rose-700"
                : "bg-sky-50 border border-sky-200 text-sky-700"
            }`}
          >
            {notification.type === "error" ? (
              <AlertCircle size={15} />
            ) : (
              <CheckCircle size={15} />
            )}
            {notification.message}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <nav className="space-y-0.5 sticky top-24">
              {filteredSections.length > 0 ? (
                filteredSections.map((section) => {
                  const Icon = section.icon
                  const hasErr = sectionErrors[section.key]
                  const isChanged = changedSections.has(section.key)
                  return (
                    <button
                      key={section.key}
                      onClick={() => setExpandedSection(section.key)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                        expandedSection === section.key
                          ? "bg-[#3B2515] text-[#F3E5D3]"
                          : "text-[#7B4B2A] hover:bg-[#EDE1CF]/50"
                      }`}
                    >
                      <Icon size={15} />
                      <span className="flex-1 text-left">{section.label}</span>
                      {isChanged && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                      {hasErr && (
                        <AlertCircle size={12} className="text-rose-400" />
                      )}
                    </button>
                  )
                })
              ) : (
                <p className="text-sm text-[#9C8268] px-3.5 py-8 text-center">
                  No settings match "{searchQuery}"
                </p>
              )}
            </nav>
          </div>

          <div className="lg:col-span-3" ref={contentRef}>
            <AnimatePresence mode="wait">
              {expandedSectionData && (
                <motion.div
                  key={expandedSectionData.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE1CF]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FBF6EF] ring-1 ring-[#EDE1CF] flex items-center justify-center">
                        <expandedSectionData.icon size={15} className="text-[#7B4B2A]" />
                      </div>
                      <div>
                        <h3 className="font-serif text-base text-[#3B2515]">
                          {expandedSectionData.label}
                        </h3>
                      </div>
                    </div>
                    {changedSections.has(expandedSectionData.key) && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                  <div className="px-5 py-5">
                    <Suspense fallback={<div className="p-6 text-center text-sm text-[#A9805F]">Loading...</div>}>
                      <expandedSectionData.component
                        data={settings[expandedSectionData.key]}
                        onChange={handleSectionChange}
                        errors={errors}
                      />
                    </Suspense>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-[#2A1B12] text-[#F3E5D3] rounded-2xl shadow-2xl shadow-[#2A1B12]/30 px-5 py-3 flex items-center gap-4 sm:gap-6">
              <div className="hidden sm:block text-sm">
                <span className="text-[#C9B496]">{unsavedCount} section{unsavedCount !== 1 ? "s" : ""} changed</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-full bg-[#B07B4F] text-white px-4 py-2 text-sm font-medium hover:bg-[#C9925F] transition-colors disabled:opacity-60"
                >
                  {saving ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? "Saving..." : "Save All"}
                </button>
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-full border border-[#3B2515] text-[#C9B496] px-4 py-2 text-sm hover:bg-[#3B2515]/50 transition-colors disabled:opacity-40"
                >
                  <Undo2 size={14} />
                  Reset
                </button>
                <button
                  onClick={handleRestoreDefaults}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-full border border-[#3B2515] text-[#C9B496] px-4 py-2 text-sm hover:bg-[#3B2515]/50 transition-colors disabled:opacity-40"
                >
                  <RotateCcw size={14} />
                  Defaults
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
