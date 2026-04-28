"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      return api.get(`/orders/admin/orders/?${params}`).then((r) => r.data);
    },
  });

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    setUpdating(true);
    try {
      await api.post(`/orders/admin/orders/${selectedOrder.order_number}/status/`, { status: newStatus, note });
      toast.success("Order status updated!");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedOrder(null);
      setNewStatus("");
      setNote("");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Order Management</h2>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order # or email..." className="input-field pl-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-sm w-auto">
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Order #", "Customer", "Type", "Items", "Total", "Payment", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : data?.results?.map((order: any) => (
                <tr key={order.id} className={`hover:bg-gray-50 ${order.has_out_of_stock_items ? "bg-orange-50/50" : ""}`}>
                  <td className="px-4 py-3 font-mono font-bold text-primary-700">
                    #{order.order_number}
                    {order.has_out_of_stock_items && <span className="ml-1 text-orange-500">⚠</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.user_name}</p>
                    <p className="text-xs text-gray-400">{order.user_email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{order.order_type}</td>
                  <td className="px-4 py-3 text-gray-600">{order.items?.length}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusColor(order.payment_status)}`}>{order.payment_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusColor(order.status)}`}>{order.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedOrder(order); setNewStatus(order.status); }} className="text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-1">Update Order Status</h3>
            <p className="text-sm text-gray-500 mb-4">Order #{selectedOrder.order_number}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input-field">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input-field resize-none min-h-[80px]" placeholder="Internal note..." />
              </div>
              <div className="flex gap-3">
                <button onClick={handleStatusUpdate} disabled={updating} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {updating && <RefreshCw className="w-4 h-4 animate-spin" />} Update
                </button>
                <button onClick={() => setSelectedOrder(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
