"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { playAdminOrderChime } from "@/lib/adminOrderChime";

type AdminNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string;
  created_at: string;
};

export default function AdminOrderNotifications() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number | null>(null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["admin-order-notifications-unread"],
    queryFn: () => api.get("/notifications/admin/unread-count/").then((r) => r.data.unread_count),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: listData } = useQuery({
    queryKey: ["admin-order-notifications"],
    queryFn: () => api.get("/notifications/admin/?page_size=15").then((r) => r.data),
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  useEffect(() => {
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = unreadCount;
      return;
    }
    if (unreadCount > prevUnreadRef.current) {
      playAdminOrderChime();
      toast.success("New paid order received");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-order-notifications"] });
    }
    prevUnreadRef.current = unreadCount;
  }, [qc, unreadCount]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order-notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["admin-order-notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/admin/mark-all-read/"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order-notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["admin-order-notifications"] });
    },
  });

  const items: AdminNotification[] = listData?.results ?? [];

  const handleOpenNotification = (n: AdminNotification) => {
    const go = () => {
      setOpen(false);
      if (n.action_url) router.push(n.action_url);
    };
    if (!n.is_read) {
      markRead.mutate(n.id, { onSuccess: go });
    } else {
      go();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Order notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-[100] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">New orders</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-primary-700 hover:text-primary-800 disabled:opacity-50"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-500 text-center">No order alerts yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpenNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    n.is_read ? "" : "bg-primary-50/50"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
