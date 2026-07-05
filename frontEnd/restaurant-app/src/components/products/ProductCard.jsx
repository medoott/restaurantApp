import { motion } from "framer-motion";
import { Plus, Minus, Star, Flame, ClipboardList } from "lucide-react";
import { useSettings } from "../../context/useSettings.js";

export default function ProductCard({ product, qty, onQty, onAdd }) {
  const settings = useSettings()?.settings;

  const menuSettings = settings?.menu || {};
  const orderingSettings = settings?.ordering || {};

  const showImages = menuSettings.enableProductImages !== false;
  const showRatings = menuSettings.enableProductRatings !== false;
  const showCalories = !!menuSettings.showCalories;
  const showIngredients = menuSettings.showIngredients !== false;
  const onlineOrderingEnabled = orderingSettings.enableOnlineOrdering !== false;

  if (!product) return null;

  const maxQty = parseInt(orderingSettings.maxQuantityPerItem) || 99;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -6 }}
      className="rounded-3xl bg-white ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5 hover:shadow-xl hover:shadow-[#3B2515]/10 transition-shadow duration-300 overflow-hidden flex flex-col"
    >
      {showImages && (
        <div className="overflow-hidden h-40 relative">
          <img
            src={product.img}
            alt={product.name}
            className="h-full w-full object-cover hover:scale-110 transition-transform duration-500"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-[#3B2515] text-lg leading-tight flex-1">
            {product.name}
          </h3>
          {showRatings && product.rating && (
            <div className="flex items-center gap-1 text-amber-500 text-xs shrink-0 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
              <Star size={10} fill="currentColor" strokeWidth={0} />
              <span className="font-semibold">{product.rating}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-[#9C8268] mt-1.5 leading-relaxed flex-1">
          {product.desc}
        </p>

        {showIngredients && product.ingredients && Array.isArray(product.ingredients) && (
          <p className="text-[10px] text-[#A9805F] mt-2 italic flex items-center gap-1">
            <ClipboardList size={10} /> {product.ingredients.join(", ")}
          </p>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-col">
            <span className="text-[#B07B4F] font-semibold text-lg">
              ${product.price.toFixed(2)}
            </span>
            {showCalories && product.calories && (
              <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5 mt-0.5">
                <Flame size={10} /> {product.calories} kcal
              </span>
            )}
          </div>

          {onlineOrderingEnabled && (
            <div className="flex items-center gap-2 bg-[#FBF6EF] rounded-full px-1.5 py-1 ring-1 ring-[#EDE1CF]">
              <button
                onClick={() => onQty(product.id, -1)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#3B2515] hover:bg-[#EDE1CF] transition-colors"
                aria-label={`Decrease quantity of ${product.name}`}
              >
                <Minus size={13} />
              </button>
              <span className="w-4 text-center text-sm font-medium text-[#3B2515]">
                {qty}
              </span>
              <button
                onClick={() => {
                  if (qty < maxQty) onQty(product.id, 1);
                  else alert(`Maximum quantity per item is ${maxQty}`);
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#3B2515] hover:bg-[#EDE1CF] transition-colors"
                aria-label={`Increase quantity of ${product.name}`}
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>

          {onlineOrderingEnabled && (
          <button
            onClick={() => onAdd(product)}
            className="mt-3 w-full rounded-full bg-[#3B2515] text-[#F3E5D3] text-sm font-medium py-2.5 hover:bg-[#4A2E18] active:scale-[0.97] transition-all duration-200"
            aria-label={`Add ${product.name} to cart`}
          >
            Add to Cart
          </button>
        )}
      </div>
    </motion.div>
  );
}
