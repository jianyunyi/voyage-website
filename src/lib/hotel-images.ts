import type { CompareItem } from "./api";

export const DEFAULT_HOTEL_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000";

export function resolveHotelImage(item: Pick<CompareItem, "image" | "images">): string {
  if (isSafeImageUrl(item.image)) return item.image.trim();

  const firstImage = item.images?.[0];
  if (isSafeImageUrl(firstImage)) return firstImage.trim();

  return DEFAULT_HOTEL_IMAGE;
}

export function handleHotelImageError(event: Event): void {
  const target = event.currentTarget;
  if (typeof HTMLImageElement === "undefined" || !(target instanceof HTMLImageElement)) return;

  target.onerror = null;
  target.src = DEFAULT_HOTEL_IMAGE;
}

function isSafeImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const protocol = new URL(value.trim()).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
