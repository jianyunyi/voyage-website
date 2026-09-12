import { Link } from "react-router-dom";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3 mb-6">
        <Compass className="w-10 h-10 text-orange-600" />
        <span className="font-serif font-bold text-2xl text-gray-900 dark:text-stone-100">
          Voyage<span className="text-orange-600">X</span>
        </span>
      </div>
      <h1 className="text-7xl font-serif font-bold text-orange-600 mb-2">404</h1>
      <p className="text-gray-500 dark:text-stone-400 mb-8 text-center max-w-sm">
        这片目的地还没有被探索过——页面不存在或已被移动
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 返回探索
      </Link>
    </div>
  );
}
