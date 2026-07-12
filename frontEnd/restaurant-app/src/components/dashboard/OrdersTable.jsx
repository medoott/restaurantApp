import { useMemo } from "react";
import { Search } from "lucide-react";
import StatusBadge from "../ui/StatusBadge.jsx";
import { ORDER_STATUSES, VALID_TRANSITIONS } from "../../utils/constants.js";
import { useSettings } from "../../context/useSettings.js";
import { getCurrencySymbol } from "../../utils/currency.js";

export default function OrdersTable({
  orders,
  title,
  showFilters,
  statusFilter = "All",
  onStatusChange = () => {},
  searchTerm = "",
  onSearchChange = () => {},
  onUpdateOrderStatus = () => {},
  canUpdateOrderStatus = false,
  loading = false,
  page = 1,
  pages = 1,
  onPrevPage = () => {},
  onNextPage = () => {},
}) {
  const settings = useSettings()?.settings;

  const density = settings?.appearance?.tableDensity || "default";
  const currency = getCurrencySymbol(settings?.general?.currency);
  const statusesList = settings?.orderStatuses?.statuses?.map((s) => s.name) || ORDER_STATUSES;

  const paddingClass = useMemo(() => {
    if (density === "compact") return "px-3 py-1.5";
    if (density === "spacious") return "px-6 py-4";
    return "px-5 py-3";
  }, [density]);

  if (!orders.length) {
    return (
      <div className="rounded-[1.5rem] border border-[#EDE1CF] bg-white p-8 text-center text-sm text-[#A9805F] shadow-sm shadow-[#3B2515]/5">
        {loading ? "Loading orders..." : "No orders found."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#EDE1CF] bg-white shadow-sm shadow-[#3B2515]/5">
      <div className="flex items-center justify-between border-b border-[#EDE1CF] px-5 py-4">
        <h2 className="font-serif text-lg text-[#3B2515]">{title}</h2>
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {["All", ...statusesList.slice(0, 4)].map((f) => (
              <button
                key={f}
                onClick={() => onStatusChange(f)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  statusFilter === f
                    ? "bg-[#3B2515] text-[#F3E5D3]"
                    : "bg-[#FBF6EF] text-[#7B4B2A] ring-1 ring-[#EDE1CF] hover:bg-[#F3E5D3]/60"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
      {showFilters && (
        <div className="px-5 py-3 border-b border-[#EDE1CF]">
          <div className="flex items-center gap-2 rounded-full bg-[#FBF6EF] px-3.5 py-2 ring-1 ring-[#EDE1CF]">
            <Search size={14} className="text-[#A9805F]" />
            <input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by order, customer, or payment"
              className="w-full bg-transparent text-sm text-[#3B2515] placeholder:text-[#A9805F] outline-none"
              aria-label="Search orders"
            />
          </div>
        </div>
      )}

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3 px-5 py-3">
        {orders.map((o) => (
          <div
            key={o.id}
            className="rounded-[1.25rem] bg-white p-4 ring-1 ring-[#EDE1CF] shadow-sm shadow-[#3B2515]/5"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#3B2515]">{o.id}</p>
                  <p className="text-xs text-[#9C8268]">{o.customer}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#7B4B2A]">
                <div className="rounded-2xl bg-[#FBF6EF] p-3">
                  <p className="font-semibold">Code</p>
                  <p>{o.code}</p>
                </div>
                <div className="rounded-2xl bg-[#FBF6EF] p-3">
                  <p className="font-semibold">Items</p>
                  <p>{o.items}</p>
                </div>
                {o.tableNumber && (
                  <div className="rounded-2xl bg-[#FBF6EF] p-3">
                    <p className="font-semibold">Table</p>
                    <p>#{o.tableNumber}</p>
                  </div>
                )}
                <div className="rounded-2xl bg-[#FBF6EF] p-3">
                  <p className="font-semibold">Payment</p>
                  <p>{o.payment}</p>
                </div>
                <div className="rounded-2xl bg-[#FBF6EF] p-3">
                  <p className="font-semibold">Total</p>
                  <p>{currency}{o.total.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#A9805F] uppercase tracking-[0.2em]">
                  Update status
                </label>
                {canUpdateOrderStatus ? (
                  <select
                    value={o.status}
                    onChange={(e) => onUpdateOrderStatus(o.id, e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    aria-label={`Update status for order ${o.id}`}
                  >
                    {VALID_TRANSITIONS[o.status]?.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-[#A9805F]">No access</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#A9805F] text-xs uppercase tracking-wide">
              <th className={`${paddingClass} font-medium`}>Order ID</th>
              <th className={`${paddingClass} font-medium`}>Customer</th>
              <th className={`${paddingClass} font-medium`}>Code</th>
              <th className={`${paddingClass} font-medium`}>Items</th>
              <th className={`${paddingClass} font-medium`}>Table</th>
              <th className={`${paddingClass} font-medium`}>Prep Time</th>
              <th className={`${paddingClass} font-medium`}>Payment</th>
              <th className={`${paddingClass} font-medium`}>Total</th>
              <th className={`${paddingClass} font-medium`}>Status</th>
              <th className={`${paddingClass} font-medium`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, idx) => (
              <tr
                key={o.id}
                className={`${idx !== orders.length - 1 ? "border-b border-[#F3EBDC]" : ""} hover:bg-[#FBF6EF] transition-colors`}
              >
                <td className={`${paddingClass} font-medium text-[#3B2515]`}>{o.id}</td>
                <td className={`${paddingClass} text-[#5B4632]`}>{o.customer}</td>
                <td className={`${paddingClass} text-[#9C8268]`}>{o.code}</td>
                <td className={`${paddingClass} text-[#9C8268]`}>{o.items}</td>
                <td className={`${paddingClass} text-[#9C8268]`}>{o.tableNumber ? `#${o.tableNumber}` : "-"}</td>
                <td className={`${paddingClass} text-[#9C8268]`}>{o.status === "Preparing" ? "10 mins" : o.status === "Ready" || o.status === "Delivered" ? "Served" : "-"}</td>
                <td className={`${paddingClass} text-[#9C8268]`}>{o.payment}</td>
                <td className={`${paddingClass} font-medium text-[#B07B4F]`}>
                  {currency}{o.total.toFixed(2)}
                </td>
                <td className={paddingClass}>
                  <StatusBadge status={o.status} />
                </td>
                <td className={paddingClass}>
                  {canUpdateOrderStatus ? (
                    <select
                      value={o.status}
                      onChange={(e) => onUpdateOrderStatus(o.id, e.target.value)}
                      className="text-sm rounded-md border px-2 py-1 bg-transparent text-[#3B2515]"
                      aria-label={`Update status for order ${o.id}`}
                    >
                      {VALID_TRANSITIONS[o.status]?.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-[#9C8268]">No Access</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#EDE1CF] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[#9C8268]">
          Page{" "}
          <span className="font-semibold text-[#3B2515]">{page}</span> of{" "}
          <span className="font-semibold text-[#3B2515]">{pages}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={onPrevPage}
            disabled={page <= 1}
            className="rounded-full bg-[#FBF6EF] px-4 py-2 text-xs font-semibold text-[#7B4B2A] ring-1 ring-[#EDE1CF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={onNextPage}
            disabled={page >= pages}
            className="rounded-full bg-[#3B2515] px-4 py-2 text-xs font-semibold text-[#F3E5D3] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
