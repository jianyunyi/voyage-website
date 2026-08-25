import { useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { X, Upload, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createSubmissionRemote } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "guide" | "food";
}

export default function SubmissionModal({ isOpen, onClose, type }: SubmissionModalProps) {
  const { accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [image, setImage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("请选择图片文件");
    if (file.size > 500 * 1024) return alert("图片不能超过 500KB");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 从表单收集数据（字段无 name，用 FormData 顺序取）
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const title = String(fd.get("title") || fd.get("name") || "未命名投稿").trim();
    const content = String(fd.get("content") || fd.get("description") || "").trim();
    const destination = String(fd.get("destination") || fd.get("city") || "").trim();
    const extra = {
      image,
      days: Number(fd.get("days") || 1),
      budget: Number(fd.get("budget") || 0),
      tags: String(fd.get("tags") || "").split(/[，,]/).map(item => item.trim()).filter(Boolean),
      highlights: String(fd.get("highlights") || "").split(/[，,]/).map(item => item.trim()).filter(Boolean),
    };

    try {
      await createSubmissionRemote({ type, title, destination: destination || undefined, content, extra }, accessToken);
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setIsSubmitting(false);
      alert(err instanceof Error ? err.message : "投稿失败，请重试");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {type === "guide" ? "发布旅行攻略" : "推荐地道美食"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-grow">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">投稿成功！</h3>
                  <p className="text-gray-500 text-center">
                    感谢您的分享，您的内容将在审核后展示给更多旅行者。
                  </p>
                </div>
              ) : (
                <form id="submission-form" onSubmit={handleSubmit} className="space-y-6">
                  {/* Common Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">封面图片</label>
                    <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      {image ? <img src={image} alt="封面预览" className="h-32 w-full rounded-lg object-cover" /> : <><Upload className="w-8 h-8 text-gray-400 mb-2" /><span className="text-sm text-gray-500">点击上传封面图片</span><span className="text-xs text-gray-400 mt-1">JPG、PNG，最大 500KB</span></>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </div>

                  {type === "guide" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">攻略标题</label>
                        <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" name="title" placeholder="例如：成都5日深度游全攻略" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">目的地</label>
                          <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" name="destination" placeholder="例如：成都" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">游玩天数</label>
                          <input required name="days" type="number" min="1" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="例如：5" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">人均预算 (元)</label>
                        <input required name="budget" type="number" min="0" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="例如：3000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">攻略正文</label>
                        <input name="tags" className="w-full px-4 py-3 mb-4 rounded-xl border border-gray-200" placeholder="标签，用逗号分隔，如：美食,周末游" />
                        <input name="highlights" className="w-full px-4 py-3 mb-4 rounded-xl border border-gray-200" placeholder="亮点，用逗号分隔，如：熊猫基地,火锅" />
                        <textarea required rows={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none" name="content" placeholder="分享您的行程安排、交通指南、避坑建议等..."></textarea>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">餐厅/美食名称</label>
                        <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" name="title" placeholder="例如：宽窄巷子老火锅" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">省份</label>
                          <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="例如：四川" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">城市</label>
                          <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" name="city" placeholder="例如：成都" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">详细地址</label>
                          <input required name="address" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="例如：青羊区宽巷子8号" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">美食类型</label>
                          <input required name="tags" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="例如：火锅、川菜" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">人均消费 (元)</label>
                        <input required name="budget" type="number" min="0" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="例如：120" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">推荐理由</label>
                        <textarea required name="content" rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none" placeholder="说说这家店有什么必点菜，环境如何，服务怎样..."></textarea>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>

            {/* Footer */}
            {!isSuccess && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
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
                    "确认发布"
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
