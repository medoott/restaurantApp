import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Printer } from "lucide-react";
import * as paymentService from "../../services/payment.js";

export default function PaymentModal({ open, onClose, order, onPaid }) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [loading, setLoading] = useState(false);
  const [_session, setSession] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  const handleStart = async () => {
    if (!order?.id) return;
    setError("");
    setLoading(true);
    try {
      const data = await paymentService.createPaymentSession(order.id, paymentMethod);
      setSession(data?.session);
      if (data?.session?._id) {
        const result = await paymentService.processPayment(data.session._id, {
          discount,
          discountType,
        });
        setReceipt(result?.receipt);
        setSession(result?.session);
        if (onPaid) onPaid(order.id);
      }
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (receipt && order?.id) {
      try {
        await paymentService.closeTable(order.id);
      } catch { }
    }
    setSession(null);
    setReceipt(null);
    setError("");
    setDiscount(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-[#EDE1CF] px-5 py-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-[#3B2515]">
                {receipt ? "Payment Receipt" : "Process Payment"}
              </h2>
              <button onClick={handleClose} className="p-1 hover:bg-[#FBF6EF] rounded-lg">
                <X size={18} className="text-[#A9805F]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {receipt ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <Printer size={40} className="mx-auto text-[#3B2515] mb-2" />
                    <p className="text-sm font-medium text-[#3B2515]">Payment Complete</p>
                  </div>

                  <div className="rounded-xl bg-[#FBF6EF] p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-[#7B4B2A]">
                      <span>Order</span>
                      <span className="font-medium">{receipt.orderId?.slice(-8)}</span>
                    </div>
                    {receipt.tableNumber && (
                      <div className="flex justify-between text-[#7B4B2A]">
                        <span>Table</span>
                        <span className="font-medium">{receipt.tableNumber}</span>
                      </div>
                    )}
                    <div className="border-t border-[#EDE1CF] my-2" />
                    <div className="flex justify-between text-[#3B2515]">
                      <span>Subtotal</span>
                      <span>${Number(receipt.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {receipt.discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount</span>
                        <span>-${Number(receipt.discount).toFixed(2)}</span>
                      </div>
                    )}
                    {receipt.tax > 0 && (
                      <div className="flex justify-between text-[#7B4B2A]">
                        <span>Tax</span>
                        <span>${Number(receipt.tax).toFixed(2)}</span>
                      </div>
                    )}
                    {receipt.serviceCharge > 0 && (
                      <div className="flex justify-between text-[#7B4B2A]">
                        <span>Service Charge</span>
                        <span>${Number(receipt.serviceCharge).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-[#EDE1CF] my-2" />
                    <div className="flex justify-between text-lg font-bold text-[#3B2515]">
                      <span>Total</span>
                      <span>${Number(receipt.total || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#7B4B2A]">
                      <span>Paid</span>
                      <span>${Number(receipt.amountPaid || 0).toFixed(2)}</span>
                    </div>
                    {receipt.change > 0 && (
                      <div className="flex justify-between text-sm text-blue-600">
                        <span>Change</span>
                        <span>${Number(receipt.change).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-[#9C8268]">
                      <span>Method</span>
                      <span>{receipt.paymentMethod}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full rounded-xl bg-[#3B2515] text-[#F3E5D3] py-3 text-sm font-medium hover:bg-[#4A3020] transition-colors"
                  >
                    Close & Free Table
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-[#FBF6EF] p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#9C8268]">Order</span>
                      <span className="font-medium text-[#3B2515]">{order?.id?.slice(-8)}</span>
                    </div>
                    {order?.tableNumber && (
                      <div className="flex justify-between">
                        <span className="text-[#9C8268]">Table</span>
                        <span className="font-medium text-[#3B2515]">{order.tableNumber}</span>
                      </div>
                    )}
                    {order?.customer && (
                      <div className="flex justify-between">
                        <span className="text-[#9C8268]">Customer</span>
                        <span className="font-medium text-[#3B2515]">{order.customer}</span>
                      </div>
                    )}
                    <div className="border-t border-[#EDE1CF]" />
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-[#3B2515]">Total</span>
                      <span className="text-[#3B2515]">${Number(order?.total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2 block">
                      Payment Method
                    </label>
                    <div className="flex gap-2">
                      {["Cash", "Card", "Online"].map((m) => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`flex-1 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                            paymentMethod === m
                              ? "bg-[#3B2515] text-[#F3E5D3]"
                              : "bg-[#FBF6EF] text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#EDE1CF]"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#A9805F] uppercase tracking-wide font-medium mb-2 block">
                      Discount
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        className="flex-1 rounded-xl border border-[#EDE1CF] px-3.5 py-2 text-sm text-[#3B2515] bg-white focus:outline-none"
                        placeholder="0"
                        min="0"
                      />
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className="rounded-xl border border-[#EDE1CF] px-3 py-2 text-sm text-[#3B2515] bg-white focus:outline-none"
                      >
                        <option value="fixed">$</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={loading}
                    className="w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      "Processing..."
                    ) : (
                      <>
                        <DollarSign size={16} />
                        Process Payment of ${Number(order?.total || 0).toFixed(2)}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
