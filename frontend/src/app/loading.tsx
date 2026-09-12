import { Compass } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Compass className="w-12 h-12 text-orange-600 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500 font-medium">加载中...</p>
      </div>
    </div>
  );
}
