let _fallbackId = 0;
const fallbackId = () => `fb-${Date.now()}-${++_fallbackId}`;

export const normalizeProduct = (product) => ({
  ...product,
  id: product?.id ?? product?._id ?? fallbackId(),
  price: Number(product?.price) || 0,
  category: product?.category || "Misc",
  desc: product?.desc || "",
  img: product?.img || "",
});

export const normalizeOrder = (order) => ({
  ...order,
  id: order?.id ?? order?._id ?? fallbackId(),
  code: Number(order?.code) || 0,
  items: Number(order?.items) || 0,
  total: Number(order?.total) || 0,
  payment: order?.payment || "Cash",
  status: order?.status || "Pending",
  itemsDetail: Array.isArray(order?.itemsDetail) ? order.itemsDetail : [],
});

export const normalizeShortage = (shortage) => ({
  ...shortage,
  id: shortage?.id ?? shortage?._id ?? fallbackId(),
  quantityNeeded: Number(shortage?.quantityNeeded) || 1,
  message: shortage?.message || "Need restock",
  createdBy: shortage?.createdBy || "Cook",
});

export const normalizeInventoryItem = (item) => ({
  ...item,
  id: item?.id ?? item?._id ?? fallbackId(),
  name: item?.name || "",
  category: item?.category || "Uncategorized",
  currentStock: Number(item?.currentStock) || 0,
  minStockLevel: Number(item?.minStockLevel) || 10,
  maxStockLevel: Number(item?.maxStockLevel) || 100,
  unit: item?.unit || "pcs",
  supplier: item?.supplier || "",
  lastRestockDate: item?.lastRestockDate || null,
  expirationDate: item?.expirationDate || null,
  notes: item?.notes || "",
  movements: Array.isArray(item?.movements) ? item.movements : [],
});

export const unwrapList = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  return [];
};

export const normalizeReservation = (res) => ({
  ...res,
  id: res?.id ?? res?._id ?? res?.reservationId ?? fallbackId(),
  customerName: res?.customerName || "",
  phoneNumber: res?.phoneNumber || "",
  partySize: Number(res?.partySize) || 1,
  status: res?.status || "pending",
  reservationDate: res?.reservationDate || null,
  reservationTime: res?.reservationTime || "",
  notes: res?.notes || "",
});

export const normalizeTable = (table) => ({
  ...table,
  id: table?.id ?? table?._id ?? fallbackId(),
  tableNumber: Number(table?.tableNumber) || 0,
  capacity: Number(table?.capacity) || 4,
  status: table?.status || "available",
  section: table?.section || "Indoor",
});
