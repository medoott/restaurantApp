import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ShoppingBag, SquareStack, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../components/ui/Logo.jsx";
import ProductCard from "../components/products/ProductCard.jsx";
import { useSettings } from "../context/useSettings.js";

export default function MenuPage({ cart, addToCart, onOpenCart, products, currentTable, onClearTable }) {
  const [activeCat, setActiveCat] = useState("Coffee");
  const [qtyMap, setQtyMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const settings = useSettings()?.settings;

  const menuSettings = settings?.menu || {};
  const orderingSettings = settings?.ordering || {};

  const enableCategories = menuSettings.enableCategories !== false;
  const enableProductSearch = menuSettings.enableProductSearch !== false;
  const onlineOrderingEnabled = orderingSettings.enableOnlineOrdering !== false;
  const productSorting = menuSettings.productSorting || "name-asc";

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const categories = useMemo(
    () => [...new Set((products || []).map((p) => p.category))],
    [products],
  );

  useEffect(() => {
    if (categories.length && !categories.includes(activeCat)) {
      setActiveCat(categories[0]);
    }
  }, [activeCat, categories]);

  const adjustQty = useCallback((id, delta) => {
    setQtyMap((prev) => {
      const next = Math.max(1, (prev[id] || 1) + delta);
      return { ...prev, [id]: next };
    });
  }, []);

  const handleAdd = useCallback(
    (product) => {
      const qty = qtyMap[product.id] || 1;
      addToCart(product, qty);
      setQtyMap((prev) => ({ ...prev, [product.id]: 1 }));
    },
    [qtyMap, addToCart],
  );

  const sortedAndFilteredProducts = useMemo(() => {
    let list = [...(products || [])];

    // Search filter
    if (searchTerm.trim() && enableProductSearch) {
      const query = searchTerm.trim().toLowerCase();
      list = list.filter((p) =>
        [p.name, p.desc, p.category].some((value) =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Category filter
    if (enableCategories && activeCat) {
      list = list.filter((p) => p.category === activeCat);
    }

    // Sorting
    list.sort((a, b) => {
      if (productSorting === "name-asc") return a.name.localeCompare(b.name);
      if (productSorting === "name-desc") return b.name.localeCompare(a.name);
      if (productSorting === "price-asc") return a.price - b.price;
      if (productSorting === "price-desc") return b.price - a.price;
      if (productSorting === "category") return a.category.localeCompare(b.category);
      if (productSorting === "popularity") return b.id - a.id;
      if (productSorting === "newest") return b.id - a.id;
      return 0;
    });

    return list;
  }, [products, searchTerm, activeCat, enableCategories, enableProductSearch, productSorting]);

  return (
    <div className="min-h-screen bg-[#FBF6EF] pb-28 lg:pb-12">
      {!onlineOrderingEnabled && (
        <div className="bg-amber-600 text-[#FBF6EF] text-xs font-semibold px-4 py-2.5 text-center sticky top-14 z-40 shadow-sm">
          Online ordering is currently disabled. You can still browse our menu!
        </div>
      )}

        <div className="sticky top-14 z-30 backdrop-blur-md bg-[#FBF6EF]/85 border-b border-[#EDE1CF]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">
            {currentTable && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#B07B4F]/10 text-[#7B4B2A] px-3 py-1.5 text-xs font-medium">
                <SquareStack size={12} /> Table #{currentTable}
                <button onClick={onClearTable} className="ml-1 hover:text-[#3B2515]" title="Clear table">
                  <X size={12} />
                </button>
              </div>
            )}
            {onlineOrderingEnabled && (
              <button
                onClick={onOpenCart}
                className="relative w-10 h-10 rounded-full bg-[#3B2515] flex items-center justify-center text-[#F3E5D3] hover:bg-[#4A2E18] transition-colors"
                aria-label={`Open cart with ${cartCount} items`}
              >
                <ShoppingBag size={17} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C9572F] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#FBF6EF]">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {enableProductSearch && (
          <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-2">
            <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2.5 ring-1 ring-[#EDE1CF] shadow-sm">
              <Search size={14} className="text-[#A9805F]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search drinks, desserts, or sandwiches"
                className="w-full bg-transparent text-sm text-[#3B2515] placeholder:text-[#A9805F] outline-none"
                aria-label="Search menu"
              />
            </div>
          </div>
        )}

        {enableCategories && (
          <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeCat === cat
                      ? "bg-[#3B2515] text-[#F3E5D3] shadow-md shadow-[#3B2515]/20"
                      : "bg-white text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#F3E5D3]/60"
                  }`}
                >
                  {cat}
                </button>
              ))
            ) : (
              <span className="rounded-full bg-white px-4 py-2 text-sm text-[#A9805F] ring-1 ring-[#EDE1CF]">
                No categories yet
              </span>
            )}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={enableCategories ? activeCat : "all"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {sortedAndFilteredProducts.length > 0 ? (
              sortedAndFilteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  qty={qtyMap[p.id] || 1}
                  onQty={adjustQty}
                  onAdd={handleAdd}
                />
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-[#EDE1CF] bg-white p-8 text-center text-sm text-[#A9805F]">
                No products match your search yet.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
