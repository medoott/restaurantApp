import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_BASE } from "../utils/constants.js";
import { getApiToken } from "../services/api.js";

export default function useSocket(events = {}) {
  const socketRef = useRef(null);
  const eventsRef = useRef(events);
  const trackOrderRef = useRef();

  // Always update eventsRef to have the latest closures
  eventsRef.current = events;

  const trackOrder = (orderId) => {
    trackOrderRef.current?.(orderId);
  };

  useEffect(() => {
    const token = getApiToken();
    const socket = io(API_BASE, {
      transports: ["websocket"],
      autoConnect: true,
      auth: { token },
    });

    socketRef.current = socket;

    const registerEvents = () => {
      Object.entries(eventsRef.current).forEach(([event, handler]) => {
        socket.off(event).on(event, handler);
      });
    };

    socket.on("connect", registerEvents);
    registerEvents();

    trackOrderRef.current = (orderId) => {
      socket.emit("track-order", orderId);
    };

    return () => {
      socket.off("connect", registerEvents);
      socket.close();
      socketRef.current = null;
    };
  }, []);

  return { socket: socketRef, trackOrder };
}
