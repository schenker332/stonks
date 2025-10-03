from __future__ import annotations
from typing import Sequence, Tuple
import cv2
import numpy as np
import os

# === TEMPLATE MATCHING KONFIGURATION ===
TEMPLATE_HEIGHT = 170


def _detect_and_remove_top_border(image: np.ndarray) -> np.ndarray:
    """
    Erkennt den weißen Balken am oberen Rand und schneidet ihn ab.
    Sucht nach der ersten horizontalen Linie und schneidet dort ab.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    print("🔍 Erkenne oberen weißen Balken...")
    
    # Suche nach der ersten deutlichen horizontalen Linie
    cut_y = 0
    
    # Durchsuche die ersten 300 Pixel von oben
    search_height = min(300, height)
    
    for y in range(10, search_height):
        # Nimm eine horizontale Linie
        line = gray[y, :]
        
        # Berechne Standardabweichung der Pixel-Werte in dieser Linie
        line_std = np.std(line)
        
        # Wenn die Linie sehr einheitlich ist (niedriger std), könnte es eine Grenze sein
        if line_std < 20:  # Sehr einheitliche Linie
            # Prüfe ob es einen deutlichen Unterschied zur nächsten Linie gibt
            if y + 1 < height:
                next_line = gray[y + 1, :]
                next_std = np.std(next_line)
                
                # Wenn nächste Linie viel variabler ist, haben wir die Grenze gefunden
                if next_std > line_std + 30:
                    cut_y = y + 1
                    line_mean = np.mean(line)
                    print(f"   📏 Horizontale Linie erkannt bei Y={y} (Helligkeit: {line_mean:.0f}, Std: {line_std:.1f})")
                    print(f"   ✂️  Schneide bei Y={cut_y} ab")
                    break
    
    if cut_y > 0:
        # Schneide oberen Bereich ab
        cropped = image[cut_y:, :]
        removed_height = cut_y
        print(f"   🗑️  Entfernt: {removed_height}px von oben")
        print(f"   📏 Neue Bildgröße: {cropped.shape[1]}x{cropped.shape[0]}")
        return cropped
    else:
        print("   ⚠️  Keine klare horizontale Linie gefunden, Bild bleibt unverändert")
        return image


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
    frames_used = frames.copy()  # Kopie für potentielle Änderungen

    print(f"🔄 Stitching mit Template={TEMPLATE_HEIGHT}px, Suchbereich=gesamte Bildhöhe")

    for i, path in enumerate(frames[1:], 1):
        next_img = _load_image(path)
        stitched, current_score = _stitch_pair(
            stitched,
            next_img,
            template_height_px=TEMPLATE_HEIGHT,
        )
        last_score = current_score
        
        # Prüfe ob letztes Bild und schlechter Match-Score
        if i == len(frames) - 1 and current_score is not None and current_score < 0.85:
            print(f"⚠️  Letztes Bild hat schlechten Match-Score ({current_score:.3f} < 0.85)")
            print(f"🗑️  Entferne wahrscheinlich doppeltes letztes Bild: {os.path.basename(path)}")
            
            # Letztes Bild aus der Verwendung entfernen
            frames_used.remove(path)
            
            # Falls es ein Datei-Pfad ist, auch die Datei löschen
            if os.path.exists(path):
                try:
                    os.remove(path)
                    print(f"🗑️  Datei gelöscht: {os.path.basename(path)}")
                except Exception as e:
                    print(f"⚠️  Konnte Datei nicht löschen: {e}")
            
            # Das stitched Bild ist jetzt ohne das letzte schlechte Bild
            # Wir müssen es neu erstellen ohne das letzte Bild
            if len(frames_used) >= 2:
                print("🔄 Erstelle Stitching neu ohne das schlechte letzte Bild...")
                return stitch_scroll_sequence(frames_used, output_path)
            break

    # Entferne oberen weißen Balken vom finalen Bild
    print("\n🔧 Nachbearbeitung: Entferne oberen Rand...")
    stitched = _detect_and_remove_top_border(stitched)

    cv2.imwrite(output_path, stitched)
    return {
        'output_path': output_path,
        'frames_used': len(frames_used),
        'last_match_score': last_score
    }


def _stitch_pair(
    base_img: np.ndarray,
    next_img: np.ndarray,
    *,
    template_height_px: int,
) -> Tuple[np.ndarray, float | None]:
    """Stitch two images using optimized template matching with absolute pixel values."""
    
    base_img, next_img = _align_widths(base_img, next_img)

    # Template aus unteren X Pixeln des base_img extrahieren
    template_height = min(template_height_px, base_img.shape[0])
    template_start_y = base_img.shape[0] - template_height
    template = base_img[template_start_y:, :]

    # Im gesamten next_img suchen
    search_area = next_img

    # Template Matching im Suchbereich
    res = cv2.matchTemplate(search_area, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(res)
    
    match_x, match_y = max_loc
    
    print(f"   📊 Match Score: {max_val:.3f} ({max_val*100:.1f}%) bei Y={match_y}")

    # Crop-Position berechnen (eine ganze Zeile entfernen um    # Crop-Position berechnen
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