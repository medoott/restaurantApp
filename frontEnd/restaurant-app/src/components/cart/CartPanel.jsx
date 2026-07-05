import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import CartContents from "./CartContents.jsx";

export default function CartPanel({ open, onClose, editingOrder = null, ...rest }) {
  return (
    <>
      <div className="hidden lg:flex fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl shadow-[#3B2515]/15 z-40 flex-col border-l border-[#EDE1CF]" style={{ marginTop: '56px', height: 'calc(100vh - 56px)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE1CF]">
          <h2 className="font-serif text-xl text-[#3B2515]">Your Cart</h2>
        </div>
        <CartContents {...rest} editingOrder={editingOrder} />
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-black/40 z-[55]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="lg:hidden fixed bottom-0 inset-x-0 h-[80vh] bg-white rounded-t-[2rem] shadow-2xl z-[60] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE1CF]">
                <div className="mx-auto w-10 h-1 rounded-full bg-[#EDE1CF] absolute top-2 left-1/2 -translate-x-1/2" />
                <h2 className="font-serif text-xl text-[#3B2515]">Your Cart</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[#FBF6EF] flex items-center justify-center text-[#3B2515]"
                  aria-label="Close cart"
                >
                  <X size={16} />
                </button>
              </div>
              <CartContents {...rest} editingOrder={editingOrder} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
