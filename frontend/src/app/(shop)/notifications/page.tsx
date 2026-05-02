"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Skeleton } from "@/components/ui/Skeleton";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  action_url: string;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace("/login");
  }, [hasHydrated, isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications/").then((r) => r.data),
    enabled: hasHydrated && isAuthenticated,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: () => api.get("/notifications/unread-count/").then((r) => r.data.unread_count),
    enabled: hasHydrated && isAuthenticated,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/mark-all-read/"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="container-xl py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-xl py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const items: NotificationItem[] = data?.results ?? [];

  const openNotification = (n: NotificationItem) => {
    const go = () => {
      if (n.action_url) router.push(n.action_url);
    };
    if (!n.is_read) {
      markRead.mutate(n.id, { onSuccess: go });
    } else {
      go();
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-xl py-20 text-center">
        <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No notifications yet</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          When you place an order or we update your order status, you will see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="container-xl py-8">
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-sm font-medium text-primary-700 hover:text-primary-800 disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openNotification(n)}
              className={`w-full text-left p-4 border rounded-lg transition-colors ${
                n.is_read
                  ? "border-gray-200 bg-white hover:bg-gray-50"
                  : "border-primary-200 bg-primary-50/40 hover:bg-primary-50/70"
              }`}
            >
              <p className="font-semibold text-gray-900">{n.title}</p>
              <p className="text-gray-700 text-sm mt-1">{n.message}</p>
              <span className="text-sm text-gray-500 mt-2 block">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
