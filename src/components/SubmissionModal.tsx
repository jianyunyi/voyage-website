import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Upload, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { submitGuide } from '../lib/guideService';
import { submitFood } from '../lib/foodService';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'guide' | 'food';
  onSuccess?: () => void;
}

const initialGuideForm = {
  title: '',
  destination: '',
  days: '',
  budget: '',
  content: '',
  image: '',
  tags: '',
  author: '',
};

const initialFoodForm = {
  name: '',
  province: '',
  city: '',
  address: '',
  type: '',
  price: '',
  description: '',
  image: '',
  tags: '',
  author: '',
};

export default function SubmissionModal({ isOpen, onClose, type, onSuccess }: SubmissionModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [guideForm, setGuideForm] = useState({
    ...initialGuideForm,
    author: user?.name || '',
  });
  const [foodForm, setFoodForm] = useState({
    ...initialFoodForm,
    author: user?.name || '',
  });

  const resetForm = () => {
    setGuideForm({ ...initialGuideForm, author: user?.name || '' });
    setFoodForm({ ...initialFoodForm, author: user?.name || '' });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const author = (type === 'guide' ? guideForm.author : foodForm.author).trim() || user?.name || '匿名用户';

    if (type === 'food') {
      const result = await submitFood({
        name: foodForm.name.trim(),
        province: foodForm.province.trim(),
        city: foodForm.city.trim(),
        address: foodForm.address.trim(),
        type: foodForm.type.trim(),
        price: Number(foodForm.price),
        description: foodForm.description.trim(),
        author,
        authorId: user?.id,
        image: foodForm.image.trim() || undefined,
        tags: foodForm.tags
          ? foodForm.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
          : [],
      });

      setIsSubmitting(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setIsSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        setIsSuccess(false);
        handleClose();
      }, 2000);
      return;
    }

    const result = await submitGuide({
      title: guideForm.title.trim(),
      destination: guideForm.destination.trim(),
      days: Number(guideForm.days),
      budget: Number(guideForm.budget),
      content: guideForm.content.trim(),
      author,
      authorId: user?.id,
      image: guideForm.image.trim() || undefined,
      tags: guideForm.tags
        ? guideForm.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
        : [],
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setIsSuccess(true);
    onSuccess?.();

    setTimeout(() => {
      setIsSuccess(false);
      handleClose();
    }, 2000);
  };

  const updateGuideField = (field: keyof typeof guideForm, value: string) => {
    setGuideForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateFoodField = (field: keyof typeof foodForm, value: string) => {
    setFoodForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {type === 'guide' ? '发布旅行攻略' : '推荐地道美食'}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">投稿成功！</h3>
                  <p className="text-gray-500 text-center">
                    {type === 'guide'
                      ? '感谢您的分享，您的攻略将在审核通过后展示在旅行攻略板块。'
                      : '感谢您的分享，您的美食推荐将在审核通过后展示在美食板块。'}
                  </p>
                </div>
              ) : (
                <form id="submission-form" onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      {error}
                    </p>
                  )}

                  {type === 'guide' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">封面图片链接</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
                          <div className="flex items-center gap-3 mb-2">
                            <Upload className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">粘贴图片 URL（选填，留空使用默认封面）</span>
                          </div>
                          <input
                            type="url"
                            value={guideForm.image}
                            onChange={(e) => updateGuideField('image', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">攻略标题</label>
                        <input
                          required
                          type="text"
                          value={guideForm.title}
                          onChange={(e) => updateGuideField('title', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                          placeholder="例如：成都5日深度游全攻略"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">作者昵称</label>
                        <input
                          required
                          type="text"
                          value={guideForm.author}
                          onChange={(e) => updateGuideField('author', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                          placeholder="您的昵称"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">目的地</label>
                          <input
                            required
                            type="text"
                            value={guideForm.destination}
                            onChange={(e) => updateGuideField('destination', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="例如：成都"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">游玩天数</label>
                          <input
                            required
                            type="number"
                            min="1"
                            value={guideForm.days}
                            onChange={(e) => updateGuideField('days', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="例如：5"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">人均预算 (元)</label>
                          <input
                            required
                            type="number"
                            min="0"
                            value={guideForm.budget}
                            onChange={(e) => updateGuideField('budget', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="例如：3000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">特色标签</label>
                          <input
                            type="text"
                            value={guideForm.tags}
                            onChange={(e) => updateGuideField('tags', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="深度游, 美食, 文化"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">攻略正文</label>
                        <textarea
                          required
                          rows={6}
                          value={guideForm.content}
                          onChange={(e) => updateGuideField('content', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                          placeholder="分享您的行程安排、交通指南、避坑建议等..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">封面图片链接</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
                          <div className="flex items-center gap-3 mb-2">
                            <Upload className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">粘贴图片 URL（选填，留空使用默认封面）</span>
                          </div>
                          <input
                            type="url"
                            value={foodForm.image}
                            onChange={(e) => updateFoodField('image', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">餐厅/美食名称</label>
                        <input
                          required
                          type="text"
                          value={foodForm.name}
                          onChange={(e) => updateFoodField('name', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                          placeholder="例如：宽窄巷子老火锅"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">推荐人昵称</label>
                        <input
                          required
                          type="text"
                          value={foodForm.author}
                          onChange={(e) => updateFoodField('author', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                          placeholder="您的昵称"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">省份</label>
                          <input
                            required
                            type="text"
                            value={foodForm.province}
                            onChange={(e) => updateFoodField('province', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="例如：四川"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">城市</label>
                          <input
                            required
                            type="text"
                            value={foodForm.city}
                            onChange={(e) => updateFoodField('city', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="例如：成都"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">详细地址</label>
                        <input
                          required
                          type="text"
                          value={foodForm.address}
                          onChange={(e) => updateFoodField('address', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                          placeholder="例如：青羊区宽巷子8号"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">美食类型</label>
                          <input
                            required
                            type="text"
                            value={foodForm.type}
                            onChange={(e) => updateFoodField('type', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="例如：火锅、川菜"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">人均消费 (元)</label>
                          <input
                            required
                            type="number"
                            min="0"
                            value={foodForm.price}
                            onChange={(e) => updateFoodField('price', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="例如：120"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">口味标签</label>
                        <input
                          type="text"
                          value={foodForm.tags}
                          onChange={(e) => updateFoodField('tags', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                          placeholder="麻辣, 香辣, 不辣"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">推荐理由</label>
                        <textarea
                          required
                          rows={4}
                          value={foodForm.description}
                          onChange={(e) => updateFoodField('description', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                          placeholder="说说这家店有什么必点菜，环境如何，服务怎样..."
                        />
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>

            {!isSuccess && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  form="submission-form"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:bg-orange-400 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      提交中...
                    </>
                  ) : (
                    '确认发布'
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
