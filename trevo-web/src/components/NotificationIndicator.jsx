import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { normalizeRole, ROLES } from "../lib/roles";
import {
  getNotifications,
  markNotificationAsRead,
} from "../services/notificationService";

const POLLING_INTERVAL_MS = 60000;
const PAGE_SIZE = 20;

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  );
}

function notificationsFromResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.notifications || [];
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NotificationIndicator() {
  const { isAuthenticated, role } = useAuth();
  const isShopOwner =
    isAuthenticated && normalizeRole(role) === ROLES.SHOP_OWNER;
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [readingId, setReadingId] = useState(null);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await getNotifications({ page: 0, size: PAGE_SIZE });
      setNotifications(notificationsFromResponse(response));
      setUnreadCount(response?.unreadCount || 0);
      setError("");
    } catch (loadError) {
      setError(
        getErrorMessage(loadError, "Nao foi possivel carregar notificacoes")
      );
    }
  }, []);

  useEffect(() => {
    if (!isShopOwner) {
      return undefined;
    }

    loadNotifications();
    const intervalId = window.setInterval(
      loadNotifications,
      POLLING_INTERVAL_MS
    );

    return () => window.clearInterval(intervalId);
  }, [isShopOwner, loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  if (!isShopOwner) {
    return null;
  }

  async function handleMarkAsRead(notification) {
    if (notification.read) {
      return;
    }

    setReadingId(notification.id);
    setError("");

    try {
      const updatedNotification = await markNotificationAsRead(notification.id);
      const nextNotification = {
        ...notification,
        ...(updatedNotification || {}),
        read: updatedNotification?.read ?? true,
      };

      setNotifications((currentNotifications) =>
        currentNotifications.map((currentNotification) =>
          currentNotification.id === notification.id
            ? nextNotification
            : currentNotification
        )
      );
      setUnreadCount((currentCount) => Math.max(currentCount - 1, 0));
    } catch (readError) {
      setError(
        getErrorMessage(readError, "Nao foi possivel marcar como lida")
      );
    } finally {
      setReadingId(null);
    }
  }

  return (
    <div className="fixed right-4 top-24 z-50" ref={containerRef}>
      <button
        type="button"
        aria-label="Notificacoes"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
        className="relative rounded-full border border-gray-300 bg-white px-3 py-2 text-xl shadow-sm"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 text-xs font-semibold leading-5 text-white">
            {unreadCount}
          </span>
        )}
      </button>

      <div aria-live="polite">
        {isOpen && (
          <section className="mt-2 w-80 border border-gray-200 bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">Notificacoes</h2>
              <span className="text-sm text-gray-600">
                {unreadCount} por ler
              </span>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            {notifications.length === 0 && !error && (
              <p className="mt-4 text-sm text-gray-600">
                Sem notificacoes.
              </p>
            )}

            {notifications.length > 0 && (
              <ul className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`border border-gray-200 p-3 ${
                      notification.read ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="mt-1 text-sm text-gray-700">
                          {notification.message}
                        </p>
                        {notification.createdAt && (
                          <p className="mt-2 text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </p>
                        )}
                      </div>
                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                      )}
                    </div>

                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notification)}
                        disabled={readingId === notification.id}
                        className="mt-3 border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {readingId === notification.id
                          ? "A marcar..."
                          : "Marcar como lida"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
