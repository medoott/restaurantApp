import { useState } from "react";

export default function AddProductModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [img, setImg] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (typeof onSubmit !== 'function') return;
    if (!name.trim()) {
      setSubmitError("Product name is required.");
      return;
    }
    const priceNum = Number(price);
    if (!price || priceNum <= 0) {
      setSubmitError("Price must be greater than 0.");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category: category || "Misc",
        price: priceNum,
        desc,
        img,
      };
      await onSubmit(payload);
      setName("");
      setCategory("");
      setPrice("");
      setDesc("");
      setImg("");
      onClose();
    } catch (err) {
      setSubmitError(err?.message || "Failed to add product. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl p-6 mx-4">
        <h3 id="add-product-title" className="font-serif text-lg text-[#3B2515] mb-3">
          Add Product
        </h3>
        <div className="space-y-2 text-sm">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            disabled={submitting}
            className="w-full rounded-xl border border-[#EDE1CF] px-4 py-2.5 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F] disabled:opacity-50"
            autoFocus
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            disabled={submitting}
            className="w-full rounded-xl border border-[#EDE1CF] px-4 py-2.5 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F] disabled:opacity-50"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            type="number"
            step="0.01"
            min="0"
            disabled={submitting}
            className="w-full rounded-xl border border-[#EDE1CF] px-4 py-2.5 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F] disabled:opacity-50"
          />
          <input
            value={img}
            onChange={(e) => setImg(e.target.value)}
            placeholder="Image URL"
            disabled={submitting}
            className="w-full rounded-xl border border-[#EDE1CF] px-4 py-2.5 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F] disabled:opacity-50"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description"
            rows={3}
            disabled={submitting}
            className="w-full rounded-xl border border-[#EDE1CF] px-4 py-2.5 text-[#3B2515] outline-none focus:ring-2 focus:ring-[#B07B4F] resize-none disabled:opacity-50"
          />
          {submitError && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#EDE1CF] text-[#7B4B2A] text-sm font-medium hover:bg-[#FBF6EF] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-full bg-[#3B2515] text-[#F3E5D3] text-sm font-medium hover:bg-[#4A2E18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
