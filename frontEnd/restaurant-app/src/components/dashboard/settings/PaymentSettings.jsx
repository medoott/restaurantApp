import SettingsToggle from "../../ui/SettingsToggle.jsx"
import {
  Banknote, CreditCard, Apple, Globe, Zap, CircleDollarSign, Building2, Phone,
} from "lucide-react"

const paymentMethods = [
  { key: "cash", label: "Cash", icon: Banknote, desc: "Accept cash payments at the counter" },
  { key: "creditCard", label: "Credit Card", icon: CreditCard, desc: "Visa, Mastercard, Amex" },
  { key: "debitCard", label: "Debit Card", icon: CreditCard, desc: "Direct debit from bank account" },
  { key: "applePay", label: "Apple Pay", icon: Apple, desc: "Apple ecosystem payments" },
  { key: "googlePay", label: "Google Pay", icon: Globe, desc: "Android & web payments" },
  { key: "stripe", label: "Stripe", icon: Zap, desc: "Online payment processing" },
  { key: "paypal", label: "PayPal", icon: CircleDollarSign, desc: "Global payment platform" },
  { key: "fawry", label: "Fawry", icon: Building2, desc: "Egyptian payment network" },
  { key: "vodafoneCash", label: "Vodafone Cash", icon: Phone, desc: "Mobile wallet payments" },
]

export default function PaymentSettings({ data, onChange }) {
  const handleToggle = (key) => {
    const currentMethods = data.methods || []
    const updated = currentMethods.map((m) =>
      m.key === key ? { ...m, enabled: !m.enabled } : m
    )
    onChange("payment", { ...data, methods: updated })
  }

  return (
    <div className="space-y-3">
      {(data.methods || []).map((method) => {
        const meta = paymentMethods.find((m) => m.key === method.key)
        if (!meta) return null
        return (
          <SettingsToggle
            key={method.key}
            icon={meta.icon}
            label={meta.label}
            description={meta.desc}
            enabled={method.enabled}
            onChange={() => handleToggle(method.key)}
          />
        )
      })}
    </div>
  )
}
