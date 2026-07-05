import { useState } from "react"
import { Upload, Palette, Type, Sun, Moon } from "lucide-react"

const fontFamilies = [
  "Poppins", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Playfair Display",
  "Merriweather", "Nunito", "Quicksand",
]

export default function BrandingSettings({ data, onChange }) {
  const [logoPreview, setLogoPreview] = useState(data.logo)
  const [faviconPreview, setFaviconPreview] = useState(data.favicon)

  const handleChange = (field, value) => {
    onChange("branding", { ...data, [field]: value })
  }

  const handleUpload = (field, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result
      if (field === "logo") setLogoPreview(base64)
      else setFaviconPreview(base64)
      handleChange(field, base64)
    }
    reader.readAsDataURL(file)
  }

  const themePreview = {
    light: {
      bg: "#FBF6EF",
      card: "#FFFFFF",
      text: "#3B2515",
      muted: "#A9805F",
      border: "#EDE1CF",
    },
    dark: {
      bg: "#1A0F0A",
      card: "#2A1B12",
      text: "#F3E5D3",
      muted: "#9C8268",
      border: "#3B2515",
    },
  }

  const tp = themePreview[data.mode] || themePreview.light

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Upload size={13} /> Logo
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B4B2A] to-[#C9925F]" />
              )}
            </div>
            <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF] transition-colors">
              Upload Logo
              <input type="file" accept="image/*" onChange={(e) => handleUpload("logo", e)} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Upload size={13} /> Favicon
          </label>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#FBF6EF] ring-1 ring-[#EDE1CF] flex items-center justify-center overflow-hidden">
              {faviconPreview ? (
                <img src={faviconPreview} alt="Favicon" className="w-full h-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7B4B2A] to-[#C9925F]" />
              )}
            </div>
            <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF] transition-colors">
              Upload Favicon
              <input type="file" accept="image/*" onChange={(e) => handleUpload("favicon", e)} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Palette size={13} /> Primary Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.primaryColor}
              onChange={(e) => handleChange("primaryColor", e.target.value)}
              className="w-10 h-10 rounded-lg border border-[#EDE1CF] cursor-pointer bg-transparent"
            />
            <input
              value={data.primaryColor}
              onChange={(e) => handleChange("primaryColor", e.target.value)}
              className="flex-1 rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Palette size={13} /> Secondary Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.secondaryColor}
              onChange={(e) => handleChange("secondaryColor", e.target.value)}
              className="w-10 h-10 rounded-lg border border-[#EDE1CF] cursor-pointer bg-transparent"
            />
            <input
              value={data.secondaryColor}
              onChange={(e) => handleChange("secondaryColor", e.target.value)}
              className="flex-1 rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Palette size={13} /> Accent Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.accentColor}
              onChange={(e) => handleChange("accentColor", e.target.value)}
              className="w-10 h-10 rounded-lg border border-[#EDE1CF] cursor-pointer bg-transparent"
            />
            <input
              value={data.accentColor}
              onChange={(e) => handleChange("accentColor", e.target.value)}
              className="flex-1 rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Type size={13} /> Font Family
          </label>
          <select
            value={data.fontFamily}
            onChange={(e) => handleChange("fontFamily", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          >
            {fontFamilies.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            {data.mode === "dark" ? <Moon size={13} /> : <Sun size={13} />} Theme Mode
          </label>
          <div className="flex gap-2">
            {["light", "dark"].map((mode) => (
              <button
                key={mode}
                onClick={() => handleChange("mode", mode)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm capitalize transition-all ${
                  data.mode === mode
                    ? "border-[#B07B4F] bg-[#B07B4F]/10 text-[#3B2515] font-medium"
                    : "border-[#EDE1CF] text-[#A9805F] hover:bg-[#FBF6EF]"
                }`}
              >
                {mode === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                {mode} Mode
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-3 block">Theme Preview</label>
        <div
          className="rounded-2xl border overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: tp.bg,
            borderColor: tp.border,
            color: tp.text,
          }}
        >
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${tp.border}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full" style={{ background: `linear-gradient(135deg, ${data.primaryColor}, ${data.accentColor})` }} />
              <span className="font-serif text-sm" style={{ fontFamily: data.fontFamily }}>Brúne Admin</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tp.muted }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tp.muted }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tp.muted }} />
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="h-2 w-3/4 rounded-full" style={{ backgroundColor: tp.border }} />
            <div className="h-2 w-1/2 rounded-full" style={{ backgroundColor: tp.border }} />
            <div className="flex gap-2 mt-3">
              <div className="h-6 flex-1 rounded-lg" style={{ backgroundColor: data.primaryColor }} />
              <div className="h-6 flex-1 rounded-lg" style={{ backgroundColor: data.secondaryColor }} />
              <div className="h-6 flex-1 rounded-lg" style={{ backgroundColor: data.accentColor }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
