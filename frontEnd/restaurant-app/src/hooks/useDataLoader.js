import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as dataService from "../services/data.js";
import { getApiToken } from "../services/api.js";

export default function useDataLoader() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (token) => {
    setLoading(true);
    setError("");
    try {
      const p = await dataService.fetchAllProducts();
      if (!mountedRef.current) return;
      setProducts(p);

      if (token) {
        const [o, s] = await Promise.all([
          dataService.fetchAllOrders(),
          dataService.fetchAllShortages(),
        ]);
        if (!mountedRef.current) return;
        setOrders(o);
        setShortages(s);
      } else {
        setOrders([]);
        setShortages([]);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if (err?.status === 401) {
        setProducts([]);
        setOrders([]);
        setShortages([]);
      } else {
        setError(err?.message || "Failed to load data");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(getApiToken());
  }, [refresh]);

  const addProduct = useCallback(async (product) => {
    const created = await dataService.createProduct(product);
    setProducts((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateOrderStatus = useCallback(async (id, status) => {
    const updated = await dataService.updateOrderStatus(id, status);
    setOrders((prev) =>
      prev.map((o) => (String(o.id) === String(updated.id) ? updated : o)),
    );
    return updated;
  }, []);

  const addOrder = useCallback((order) => {
    setOrders((prev) => {
      const exists = prev.some((o) => String(o.id) === String(order.id));
      if (exists) return prev;
      return [order, ...prev];
    });
  }, []);

  const updateOrder = useCallback((order) => {
    setOrders((prev) =>
      prev.map((o) =>
        String(o.id) === String(order.id) ? order : o,
      ),
    );
  }, []);

  const addShortage = useCallback(async (payload) => {
    const shortage = await dataService.reportShortage(payload);
    setShortages((prev) => [shortage, ...prev]);
    return shortage;
  }, []);

  return useMemo(() => ({
    products, setProducts, orders, setOrders, shortages, setShortages,
    loading, error, refresh, addProduct, updateOrderStatus,
    addOrder, updateOrder, addShortage,
  }), [products, orders, shortages, loading, error, refresh, addProduct, updateOrderStatus, addOrder, updateOrder, addShortage]);
}
