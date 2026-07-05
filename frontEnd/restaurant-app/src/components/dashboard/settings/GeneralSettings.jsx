import { useState } from "react"
import {
  Store, MapPin, Phone, Mail, Globe, Clock, Map, Upload,
} from "lucide-react"

const timezones = [
  "UTC-12:00", "UTC-11:00", "UTC-10:00", "UTC-09:00", "UTC-08:00", "UTC-07:00",
  "UTC-06:00", "UTC-05:00", "UTC-04:00", "UTC-03:00", "UTC-02:00", "UTC-01:00",
  "UTC+00:00", "UTC+01:00", "UTC+02:00", "UTC+03:00", "UTC+04:00", "UTC+05:00",
  "UTC+06:00", "UTC+07:00", "UTC+08:00", "UTC+09:00", "UTC+10:00", "UTC+11:00", "UTC+12:00",
]

const languages = [
  "English", "Arabic", "French", "Spanish", "German", "Italian", "Portuguese", "Turkish",
]

const currencies = [
  "USD ($)", "EUR (€)", "GBP (£)", "EGP (E£)", "AED (د.إ)", "SAR (﷼)", "TRY (₺)",
]

export default function GeneralSettings({ data, onChange, errors }) {
  const [logoPreview, setLogoPreview] = useState(data.logo)
  const [coverPreview, setCoverPreview] = useState(data.coverImage)

  const handleChange = (field, value) => {
    onChange("general", { ...data, [field]: value })
  }

  const handleHoursChange = (index, field, value) => {
    const updated = [...data.workingHours]
    updated[index] = { ...updated[index], [field]: value }
    handleChange("workingHours", updated)
  }

  const handleImageUpload = (field, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result
      if (field === "logo") {
        setLogoPreview(base64)
        handleChange("logo", base64)
      } else {
        setCoverPreview(base64)
        handleChange("coverImage", base64)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Store size={13} /> Restaurant Name
          </label>
          <input
            value={data.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 focus:border-[#B07B4F] transition-all"
            placeholder="Enter restaurant name"
          />
          {errors?.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Globe size={13} /> Website
          </label>
          <input
            value={data.website}
            onChange={(e) => handleChange("website", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 focus:border-[#B07B4F] transition-all"
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Upload size={13} /> Restaurant Logo
          </label>
          <div className="mt-1 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store size={24} className="text-[#A9805F]" />
              )}
            </div>
            <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF] transition-colors">
              Upload Logo
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload("logo", e)} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Upload size={13} /> Cover Image
          </label>
          <div className="mt-1 flex items-center gap-4">
            <div className="w-24 h-14 rounded-xl bg-[#FBF6EF] ring-1 ring-[#EDE1CF] flex items-center justify-center overflow-hidden">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <Map size={24} className="text-[#A9805F]" />
              )}
            </div>
            <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#FBF6EF] transition-colors">
              Upload Cover
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload("coverImage", e)} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
          Description
        </label>
        <textarea
          value={data.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 focus:border-[#B07B4F] transition-all resize-none"
          placeholder="Describe your restaurant..."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <MapPin size={13} /> Address
          </label>
          <input
            value={data.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 focus:border-[#B07B4F] transition-all"
            placeholder="123 Main Street, City"
          />
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Map size={13} /> Google Maps Location
          </label>
          <input
            value={data.mapsLocation}
            onChange={(e) => handleChange("mapsLocation", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 focus:border-[#B07B4F] transition-all"
            placeholder="https://maps.google.com/?q=..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Phone size={13} /> Phone Numbers (comma separated)
          </label>
          <input
            value={data.phones}
            onChange={(e) => handleChange("phones", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 focus:border-[#B07B4F] transition-all"
            placeholder="+1 234 567 890, +1 234 567 891"
          />
        </div>
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Phone size={13} /> WhatsApp Number
          </label>
          <input
            value={data.whatsapp}
            onChange={(e) => handleChange("whatsapp", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 focus:border-[#B07B4F] transition-all"
            placeholder="+1 234 567 890"
          />
        </div>
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1.5">
            <Mail size={13} /> Email
          </label>
          <input
            value={data.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40 focus:border-[#B07B4F] transition-all"
            placeholder="info@restaurant.com"
          />
          {errors?.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium flex items-center gap-1.5 mb-3">
          <Clock size={13} /> Working Hours
        </label>
        <div className="space-y-2">
          {(data.workingHours || []).map((wh, i) => (
            <div key={wh.day} className="flex items-center gap-3 bg-[#FBF6EF] rounded-xl px-3.5 py-2">
              <label className="flex items-center gap-2 min-w-[100px] text-sm text-[#3B2515]">
                <input
                  type="checkbox"
                  checked={wh.enabled}
                  onChange={(e) => handleHoursChange(i, "enabled", e.target.checked)}
                  className="rounded border-[#EDE1CF] text-[#B07B4F] focus:ring-[#B07B4F]/40"
                />
                {wh.day}
              </label>
              <input
                type="time"
                value={wh.open}
                onChange={(e) => handleHoursChange(i, "open", e.target.value)}
                disabled={!wh.enabled}
                className="rounded-lg border border-[#EDE1CF] px-2.5 py-1.5 text-sm text-[#3B2515] bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
              />
              <span className="text-[#A9805F] text-xs">to</span>
              <input
                type="time"
                value={wh.close}
                onChange={(e) => handleHoursChange(i, "close", e.target.value)}
                disabled={!wh.enabled}
                className="rounded-lg border border-[#EDE1CF] px-2.5 py-1.5 text-sm text-[#3B2515] bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Time Zone</label>
          <select
            value={data.timezone}
            onChange={(e) => handleChange("timezone", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Language</label>
          <select
            value={data.language}
            onChange={(e) => handleChange("language", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          >
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Currency</label>
          <select
            value={data.currency}
            onChange={(e) => handleChange("currency", e.target.value)}
            className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Tax %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.taxPercentage}
              onChange={(e) => handleChange("taxPercentage", e.target.value)}
              className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            />
          </div>
          <div>
            <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-1.5 block">Service %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.serviceCharge}
              onChange={(e) => handleChange("serviceCharge", e.target.value)}
              className="w-full rounded-xl border border-[#EDE1CF] px-3.5 py-2.5 text-sm text-[#3B2515] bg-white focus:outline-none focus:ring-2 focus:ring-[#B07B4F]/40"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
