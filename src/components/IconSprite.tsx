import type { Icon } from '../data/types';
import { getIconsPath, type DatasetVersion } from '../data/loader';

interface Props {
  icon: Icon;
  size: number;
  version?: DatasetVersion;
}

// The sprite sheet uses 64x64 tiles
const ICON_TILE = 64;
// Sprite sheet total dimensions (from FactorioLab)
const SPRITE_SHEET_SIZE = 1320;

export function IconSprite({ icon, size, version = '2.0' }: Props) {
  const scale = size / ICON_TILE;
  const iconsPath = getIconsPath(version);

  return (
    <div
      data-testid={`icon-${icon.id}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        backgroundImage: `url(${iconsPath})`,
        backgroundPosition: `${-icon.x * scale}px ${-icon.y * scale}px`,
        backgroundSize: `${SPRITE_SHEET_SIZE * scale}px ${SPRITE_SHEET_SIZE * scale}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}