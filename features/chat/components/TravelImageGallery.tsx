"use client";
/* eslint-disable @next/next/no-img-element -- Provider images have dynamic remote hosts and render one lazy image at a time. */

import { useMemo, useState } from "react";
import { IconButton } from "../../shared/components/IconButton";

export type GalleryImage = { url: string; alt?: string; sourceUrl?: string };
type Props = { images: GalleryImage[]; name: string };

export const galleryNextIndex = (index: number, length: number) => length ? (index + 1) % length : 0;
export const galleryPreviousIndex = (index: number, length: number) => length ? (index - 1 + length) % length : 0;

/** Renders one Card image at a time so multi-photo entities stay compact in chat. */
export function TravelImageGallery({ images, name }: Props) {
  const boundedImages = useMemo(() => images.slice(0, 5), [images]);
  const imageKey = boundedImages.map((image) => image.url).join("|");
  const [failedState, setFailedState] = useState<{ key: string; urls: Set<string> }>({ key: imageKey, urls: new Set() });
  const [index, setIndex] = useState(0);
  const failedUrls = failedState.key === imageKey ? failedState.urls : new Set<string>();
  const availableImages = boundedImages.filter((image) => !failedUrls.has(image.url));
  const safeIndex = availableImages.length ? Math.min(index, availableImages.length - 1) : 0;

  if (!availableImages.length) return null;
  const image = availableImages[safeIndex];
  const multiple = availableImages.length > 1;
  return <div className="rich-card-gallery">
    <img src={image.url} alt={image.alt || name} loading="lazy" onError={() => setFailedState((failed) => ({ key: imageKey, urls: new Set(failed.key === imageKey ? failed.urls : []).add(image.url) }))} />
    {multiple && <>
      <span className="rich-gallery-control rich-gallery-previous"><IconButton aria-label="上一张图片" icon="chevronLeft" size="md" variant="ghost" onClick={() => setIndex(galleryPreviousIndex(safeIndex, availableImages.length))} /></span>
      <span className="rich-gallery-control rich-gallery-next"><IconButton aria-label="下一张图片" icon="chevronRight" size="md" variant="ghost" onClick={() => setIndex(galleryNextIndex(safeIndex, availableImages.length))} /></span>
      <span className="rich-gallery-counter" aria-live="polite">{safeIndex + 1} / {availableImages.length}</span>
    </>}
  </div>;
}
