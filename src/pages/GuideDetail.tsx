import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Calendar, Wallet, ThumbsUp, Check, Share2, Heart, MessageSquare, Star } from "lucide-react";
import { findGuide, travelGuides } from "../data/guides";
import { imgSrc } from "../lib/image";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { toggleLikeRemote, fetchLikesRemote, fetchPublicGuides, type PublicGuide } from "../lib/api";

export default function GuideDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [publishedGuides, setPublishedGuides] = useState<PublicGuide[]>([]);
  useEffect(() => {
    fetchPublicGuides().then(setPublishedGuides).catch(() => undefined);
  }, []);
  const guide = id ? (findGuide(id) || publishedGuides.find(item => item.id === id)) : undefined;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { accessToken } = useAuth();
  const [likeState, setLikeState] = useState<{ count: number; liked: boolean }>({ count: 0, liked: false });

  // 加载点赞状态
  useEffect(() => {
    if (!guide || !accessToken) return;
    fetchLikesRemote([guide.id], accessToken).then(res => {
      const s = res[guide.id];
      if (s) setLikeState(s);
    }).catch(() => undefined);
  }, [guide?.id, accessToken]);

  const handleLike = async () => {
    if (!guide || !accessToken) return;
    try {
      setLikeState(await toggleLikeRemote(guide.id, accessToken));
    } catch {
      // 忽略
    }
  };

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-stone-950">
        <p className="text-gray-500 mb-4">攻略不存在</p>
        <button onClick={() => navigate("/guides")} className="text-orange-600 underline">返回攻略列表</button>
      </div>
    );
  }

  const fav = isFavorite(guide.id);

  // 相关攻略推荐：同目的地优先 → 共享标签 → 排除当前，取 3
  const allGuides = [...publishedGuides, ...travelGuides.filter(item => !publishedGuides.some(publicGuide => publicGuide.id === item.id))];
  const relatedGuides = allGuides
    .filter(g => g.id !== guide.id)
    .sort((a, b) => {
      const aScore = (a.destination === guide.destination ? 2 : 0) + a.tags.filter(t => guide.tags.includes(t)).length;
      const bScore = (b.destination === guide.destination ? 2 : 0) + b.tags.filter(t => guide.tags.includes(t)).length;
      return bScore - aScore;
    })
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 pb-20">
      {/* Hero（与正文内容区同宽的文章头图） */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
        <div className="relative h-[36vh] md:h-[44vh] bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
          <img src={imgSrc(guide.image, 1280)} alt={guide.title} fetchPriority="high" className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            aria-label="返回上一页"
            className="absolute top-5 left-5 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
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
            <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4 text-orange-400" /> {(likeState.count || guide.likes).toLocaleString()}</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4 text-orange-400" /> {guide.comments.length} 条评论</span>
            <span className="text-white/60">by {guide.author}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10">
        {/* 操作栏 */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              likeState.liked ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700"
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${likeState.liked ? "fill-white" : ""}`} />
            {likeState.count.toLocaleString()} 赞
          </button>
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
            <p key={i} className="text-gray-700 dark:text-stone-300 leading-relaxed text-[15px] md:text-base">{para}</p>
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

        {/* 评论区 */}
        <div className="mt-10 bg-gray-50 dark:bg-stone-900 rounded-2xl p-6 border border-gray-100 dark:border-stone-800">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">评论区</h2>
            <span className="text-sm text-gray-400">({guide.comments.length})</span>
          </div>
          <div className="space-y-5">
            {guide.comments.map(cm => (
              <div key={cm.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-stone-800 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {cm.user.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-stone-100 text-sm">{cm.user}</span>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: cm.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-500" />
                      ))}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{cm.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-stone-300 leading-relaxed">{cm.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 相关攻略推荐 */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">相关攻略</h2>
            <Link to="/guides" className="text-orange-600 text-sm hover:underline">← 返回攻略列表</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedGuides.map(rg => (
              <Link
                key={rg.id}
                to={`/guide/${rg.id}`}
                className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-stone-800"
              >
                <div className="relative h-36 overflow-hidden">
                  <img src={imgSrc(rg.image, 600)} alt={rg.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-stone-100 line-clamp-2 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{rg.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-stone-400 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> {rg.destination} · {rg.days}天 · 👍{(rg.likes / 1000).toFixed(1)}k
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
