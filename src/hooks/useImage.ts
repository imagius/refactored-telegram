import { useState, useEffect } from 'react';
import type { Icon } from '../data/types';

const ICON_TILE = 64;

/**
 * Loads an icon from the sprite sheet and returns a cropped HTMLImageElement.
 * Returns null while loading.
 */
export function useIconImage(
  iconsPath: string | null,
  icon: Icon | undefined
): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!iconsPath || !icon) {
      setImage(null);
      return;
    }

    let cancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;

      // Crop the icon from the sprite sheet using a canvas
      const canvas = document.createElement('canvas');
      canvas.width = ICON_TILE;
      canvas.height = ICON_TILE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(
        img,
        icon.x, icon.y, ICON_TILE, ICON_TILE,
        0, 0, ICON_TILE, ICON_TILE
      );

      const cropped = new Image();
      cropped.onload = () => {
        if (!cancelled) setImage(cropped);
      };
      cropped.src = canvas.toDataURL();
    };
    img.src = iconsPath;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [iconsPath, icon]);

  return image;
}