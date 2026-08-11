/**
 * 图片性能工具：尺寸统一 + 预加载
 */

/** 统一 Unsplash 图片尺寸（替换 URL 中的 w 参数；非 Unsplash 原样返回） */
export function imgSrc(url: string, w: number): string {
  if (url.includes("images.unsplash.com")) {
    return url.replace(/&w=\d+/, `&w=${w}`).replace(/\?w=\d+/, `?w=${w}`);
  }
  return url;
}

/** 预加载图片列表（new Image 提前缓存） */
export function preloadImages(urls: string[]): void {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url) continue;
    const img = new Image();
    img.src = url;
  }
}
