"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ShoppingBag } from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuthStore } from "@/store/authStore";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchProfile } = useAuthStore();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || loading) return;

    setLoading(true);
    try {
      await api.post("/auth/otp/verify/", { email, code, purpose: "email_verify" });
      await fetchProfile();
      toast.success("Email verified successfully");
      router.push("/");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Invalid verification code"));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email || resending) return;

    setResending(true);
    try {
      await api.post("/auth/otp/request/", { email, purpose: "email_verify" });
      toast.success("Verification code sent");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to send code"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-primary-700">
            <ShoppingBag className="w-8 h-8" /> Mary Kitchen
          </Link>
          <p className="text-gray-500 mt-2">Verify your email address</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={verify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="input-field tracking-[0.3em] text-center text-lg font-semibold"
                placeholder="000000"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify Email
            </button>
          </form>

          <button
            type="button"
            onClick={resend}
            disabled={resending || !email}
            className="mt-4 w-full text-sm font-medium text-primary-700 hover:underline disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
