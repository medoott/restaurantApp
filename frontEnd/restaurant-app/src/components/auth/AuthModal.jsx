import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function AuthModal({
  open,
  mode,
  onClose,
  onSubmit,
  loading = false,
  error = "",
  onModeChange = () => {},
}) {
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setConfirmationPassword("");
      setEmail("");
      setPassword("");
      setLocalError("");
    }
  }, [open, mode]);

  if (!open) return null;

  const handleClose = () => {
    setLocalError("");
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (isSignup) {
      if (password !== confirmationPassword) {
        setLocalError("Passwords do not match.");
        return;
      }

      await onSubmit({ name, phone, confirmationPassword, email, password });
    } else {
      await onSubmit({ email, password });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl shadow-[#3B2515]/20 ring-1 ring-[#EDE1CF]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#A9805F]">
              Secure access
            </p>
            <h3
              id="auth-modal-title"
              className="font-serif text-2xl text-[#3B2515] mt-1"
            >
              {isSignup ? "Create account" : "Login"}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-[#FBF6EF] p-2 text-[#3B2515]"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {isSignup && (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                autoComplete="name"
                placeholder="Name"
                required
                className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                autoComplete="tel"
                placeholder="Phone"
                required
                className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
              />
            </>
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="Password"
            required
            className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
          />
          {isSignup && (
            <input
              value={confirmationPassword}
              onChange={(e) => setConfirmationPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              required
              className="w-full rounded-2xl border border-[#EDE1CF] px-4 py-3 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F]"
            />
          )}

          {(error || localError) && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {localError || error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#3B2515] px-5 py-3 text-sm font-semibold text-[#F3E5D3] transition hover:bg-[#4A2E18] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Working..." : isSignup ? "Sign up" : "Login"}
          </button>

          <button
            type="button"
            onClick={() => onModeChange(isSignup ? "login" : "signup")}
            className="w-full text-sm font-medium text-[#7B4B2A] underline decoration-[#D8B68B] underline-offset-4"
          >
            {isSignup
              ? "Already have an account? Login"
              : "Need an account? Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}
