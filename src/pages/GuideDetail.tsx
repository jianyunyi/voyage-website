import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Wallet, ThumbsUp, Check, Share2, Heart } from "lucide-react";
import { findGuide } from "../data/guides";
import { useFavorites } from "../context/FavoritesContext";

export default function GuideDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const guide = id ? findGuide(id) : undefined;
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fff7ed]">
        <p className="text-gray-500 mb-4">攻略不存在</p>
        <button onClick={() => navigate("/guides")} className="text-orange-600 underline">返回攻略列表</button>
      </div>
    );
  }

  const fav = isFavorite(guide.id);

  return (
    <div className="min-h-screen bg-[#fff7ed] pb-20">
      {/* Hero */}
      <div className="relative h-[42vh] md:h-[52vh] bg-gray-900">
        <img src={guide.image} alt={guide.title} className="w-full h-full object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="flex items-center gap-2 text-white/85 text-sm mb-2">
            <MapPin className="w-4 h-4 text-orange-400" />
            {guide.destination}
            <span className="text-white/50">·</span>
            {guide.tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm">{t}</span>
            ))}
          </div>
          <h1 className="text-2xl md:text-4xl font-serif font-bold text-white leading-tight">{guide.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-white/80 text-sm flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-orange-400" /> {guide.days} 天</span>
            <span className="flex items-center gap-1"><Wallet className="w-4 h-4 text-orange-400" /> 人均 ¥{guide.budget.toLocaleString()}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4 text-orange-400" /> {guide.likes.toLocaleString()}</span>
            <span className="text-white/60">by {guide.author}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
        {/* 操作栏 */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => toggleFavorite({ id: guide.id, type: "guide", title: guide.title, subtitle: guide.destination, image: guide.image, rating: guide.likes, addedAt: Date.now() })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              fav ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
            }`}
          >
            <Heart className={`w-4 h-4 ${fav ? "fill-white" : ""}`} />
            {fav ? "已收藏" : "收藏攻略"}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:border-gray-300 transition-colors">
            <Share2 className="w-4 h-4" /> 分享
          </button>
        </div>

        {/* 正文 */}
        <article className="space-y-6">
          {guide.content.map((para, i) => (
            <p key={i} className="text-gray-700 leading-relaxed text-[15px] md:text-base">{para}</p>
          ))}
        </article>

        {/* 行程亮点 */}
        <div className="mt-10 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">行程亮点</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guide.highlights.map(h => (
              <div key={h} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-orange-600" />
                </span>
                {h}
              </div>
            ))}
          </div>
        </div>

        {/* 其他攻略 */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">更多攻略</h2>
          <Link to="/guides" className="text-orange-600 text-sm hover:underline">← 返回攻略列表</Link>
        </div>
      </div>
    </div>
  );
}
