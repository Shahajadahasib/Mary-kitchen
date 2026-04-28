"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Search, Shield } from "lucide-react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => api.get(`/users/admin/users/?search=${search}`).then((r) => r.data),
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">User Management</h2>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email or name..." className="input-field pl-9 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Phone", "Orders", "Verified", "Status", "Joined"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : data?.results?.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                    {user.full_name}
                    {user.is_staff && <Shield className="w-3.5 h-3.5 text-primary-600" />}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-500">{user.phone_number || "–"}</td>
                  <td className="px-4 py-3 text-gray-700 font-semibold">{user.order_count}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.is_email_verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {user.is_email_verified ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {user.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(user.date_joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          {data?.count || 0} total users
        </div>
      </div>
    </div>
  );
}
