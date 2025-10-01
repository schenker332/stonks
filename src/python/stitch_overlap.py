from __future__ import annotations
from typing import Sequence, Tuple
import cv2
import numpy as np

# === TEMPLATE MATCHING KONFIGURATION ===
TEMPLATE_HEIGHT = 170
SEARCH_HEIGHT = 1400


def stitch_scroll_sequence(
    image_paths: Sequence[str],
    output_path: str,
) -> dict:
    """Stitch a sequence of overlapping screenshots into a single image.

    Args:
        image_paths: Ordered collection of frame paths (top to bottom).
        output_path: File path where the stitched image should be written.

    Returns:
        StitchResult containing metadata about the stitching run.

    Raises:
        ValueError: If fewer than two images are provided or any image cannot be loaded.
    """

    frames: list[str] = list(image_paths)
    if len(frames) < 2:
        raise ValueError("Need at least two frames to perform stitching.")

    stitched = _load_image(frames[0])
    last_score: float | None = None

    print(f"🔄 Stitching mit Template={TEMPLATE_HEIGHT}px, Suchbereich={SEARCH_HEIGHT}px")

    for path in frames[1:]:
        next_img = _load_image(path)
        stitched, last_score = _stitch_pair(
            stitched,
            next_img,
            template_height_px=TEMPLATE_HEIGHT,
            search_height_px=SEARCH_HEIGHT,
        )

    cv2.imwrite(output_path, stitched)
    return {
        'output_path': output_path,
        'frames_used': len(frames),
        'last_match_score': last_score
    }


def _stitch_pair(
    base_img: np.ndarray,
    next_img: np.ndarray,
    *,
    template_height_px: int,
    search_height_px: int,
) -> Tuple[np.ndarray, float | None]:
    """Stitch two images using optimized template matching with absolute pixel values."""
    
    base_img, next_img = _align_widths(base_img, next_img)

    # Template aus unteren X Pixeln des base_img extrahieren
    template_height = min(template_height_px, base_img.shape[0])
    template_start_y = base_img.shape[0] - template_height
    template = base_img[template_start_y:, :]

    # Nur in den oberen X Pixeln des next_img suchen
    search_height = min(search_height_px, next_img.shape[0])
    search_area = next_img[:search_height, :]

    # Template Matching im Suchbereich
    res = cv2.matchTemplate(search_area, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(res)
    
    match_x, match_y = max_loc
    
    print(f"   📊 Match Score: {max_val:.3f} ({max_val*100:.1f}%) bei Y={match_y}")

    # Crop-Position berechnen
    crop_start = match_y + template_height
    
    if crop_start >= next_img.shape[0]:
        # Überlappung bedeckt das ganze Bild; ganzes Bild anhängen
        print(f"   ⚠️  Crop-Position ({crop_start}) >= Bildhöhe ({next_img.shape[0]}) → ganzes Bild anhängen")
        combined = np.vstack([base_img, next_img])
        return combined, max_val

    remainder = next_img[crop_start:, :]
    if remainder.size == 0:
        print(f"   ⚠️  Kein verbleibendes Bild → ganzes Bild anhängen")
        combined = np.vstack([base_img, next_img])
        return combined, max_val

    print(f"   ✂️  Croppe ab Y={crop_start}, verbleibend: {remainder.shape[0]}px")
    combined = np.vstack([base_img, remainder])
    return combined, max_val


def _align_widths(img_a: np.ndarray, img_b: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Crop both images symmetrically to the smallest width so they stack cleanly."""
    width = min(img_a.shape[1], img_b.shape[1])
    if img_a.shape[1] != width:
        offset = (img_a.shape[1] - width) // 2
        img_a = img_a[:, offset : offset + width]
    if img_b.shape[1] != width:
        offset = (img_b.shape[1] - width) // 2
        img_b = img_b[:, offset : offset + width]
    return img_a, img_b


def _load_image(path: str) -> np.ndarray:
    image = cv2.imread(path)
    if image is None:
        raise ValueError(f"Could not read image at '{path}'.")
    return image


__all__ = ["stitch_scroll_sequence", "StitchResult"]