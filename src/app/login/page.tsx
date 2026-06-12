"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage("確認メールを送信しました。メールを確認してください。");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-base font-bold text-gray-900 mb-1">Instagram Content Dashboard</h1>
        <p className="text-xs text-gray-400 mb-6">{mode === "login" ? "ログイン" : "アカウント作成"}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              placeholder="8文字以上"
            />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          {message && <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? "処理中…" : mode === "login" ? "ログイン" : "アカウントを作成"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setMessage(null); }}
          className="mt-4 text-xs text-gray-400 hover:text-gray-700 w-full text-center"
        >
          {mode === "login" ? "アカウントをお持ちでない方はこちら" : "ログインはこちら"}
        </button>
      </div>
    </div>
  );
}
