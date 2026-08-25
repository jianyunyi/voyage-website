import { useEffect, useState } from "react";
import { Check, X, ShieldCheck } from "lucide-react";
import { fetchAdminSubmissions, moderateSubmission, type Submission } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AdminSubmissions() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetchAdminSubmissions(accessToken)
      .then(setItems)
      .catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : "无权访问审核队列"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [accessToken]);

  const moderate = async (id: string, action: "approve" | "reject") => {
    try {
      await moderateSubmission(id, action, accessToken);
      setItems(current => current.filter(item => item.id !== id));
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "审核失败");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-stone-950 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-stone-100">内容审核</h1>
            <p className="text-sm text-gray-500 dark:text-stone-400">审核通过后，投稿才会出现在公开内容列表。</p>
          </div>
        </div>
        {loading && <p className="text-gray-500">加载审核队列...</p>}
        {!loading && error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {!loading && !error && items.length === 0 && <div className="rounded-2xl bg-white p-10 text-center text-gray-500 shadow-sm">暂无待审核内容</div>}
        <div className="space-y-4">
          {items.map(item => (
            <article key={item.id} className="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{item.type === "guide" ? "攻略" : "美食"}</span>
                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">{item.title}</h2>
                  {item.destination && <p className="mt-1 text-sm text-gray-500">{item.destination}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => moderate(item.id, "reject")} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><X className="h-4 w-4" />驳回</button>
                  <button onClick={() => moderate(item.id, "approve")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"><Check className="h-4 w-4" />通过</button>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-stone-300">{item.content}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
