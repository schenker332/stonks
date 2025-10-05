from __future__ import annotations
from typing import Sequence, Tuple
import cv2
import numpy as np
import os
import json
import sys
import traceback

# === LOGGING HELPER ===
def log(level: str, message: str, **data):
    """Strukturiertes Logging für SSE Stream."""
    payload = {"level": level, "message": message}
    if data:
        payload["data"] = data
    print("LOG:", json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()

def log_exc(err: Exception, context: str = None):
    """Loggt Exception mit Stacktrace."""
    tb = traceback.format_exception(type(err), err, err.__traceback__)
    payload = {
        "level": "error",
        "message": str(err),
        "trace": "".join(tb)
    }
    if context:
        payload["context"] = context
    print("LOG:", json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()

# === TEMPLATE MATCHING KONFIGURATION ===
TEMPLATE_HEIGHT = 170


def _detect_and_remove_top_border(image: np.ndarray) -> np.ndarray:
    """
    Erkennt den weißen Balken am oberen Rand und schneidet ihn ab.
    Sucht nach der ersten horizontalen Linie und schneidet dort ab.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    log("info", "🔍 Erkenne oberen weißen Balken")
    
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
                    log("info", "📏 Horizontale Linie erkannt", y=y, brightness=float(line_mean), std=float(line_std))
                    break
    
    if cut_y > 0:
        # Schneide oberen Bereich ab
        cropped = image[cut_y:, :]
        removed_height = cut_y
        log("info", "🗑️ Oberer Rand entfernt", removed_height=removed_height)
        return cropped
    else:
        log("warning", "⚠️ Keine klare horizontale Linie gefunden, Bild bleibt unverändert")
        return image


def _stitch_pair(
    base_img: np.ndarray,
    next_img: np.ndarray,
    *,
    template_height_px: int,
    step_index: int = 0,
) -> Tuple[np.ndarray, float | None, dict]:
    """Stitch two images using optimized template matching with absolute pixel values."""
    
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
    
    # ===  START DEBUG ==========================
    debug_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug", "stitch")
    os.makedirs(debug_dir, exist_ok=True)
    
    # 1. Template-Bereich markieren (rot)
    template_vis = base_img.copy()
    cv2.rectangle(template_vis, 
        (0, template_start_y), 
        (base_img.shape[1], base_img.shape[0]), 
        (0, 0, 255), 5)
    cv2.putText(template_vis, f"TEMPLATE ({template_height}px)", 
        (10, template_start_y - 10), 
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
    
    # 2. Match-Position markieren (grün)
    match_vis = next_img.copy()
    cv2.rectangle(match_vis,
        (match_x, match_y),
        (match_x + template.shape[1], match_y + template_height),
        (0, 255, 0), 5)
    cv2.putText(match_vis, f"MATCH at Y={match_y} ({max_val*100:.1f}%)", 
        (10, 50), 
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
    
    # Debug-Bilder speichern
    template_path = os.path.join(debug_dir, f"step_{step_index:02d}_1_template.png")
    match_path = os.path.join(debug_dir, f"step_{step_index:02d}_2_match.png")
    
    # Gecropte Version: nur den relevanten unteren Bereich des template_vis
    thumb_height = next_img.shape[0]
    template_cropped = template_vis[-thumb_height:, :] if template_vis.shape[0] > thumb_height else template_vis
    
    cv2.imwrite(template_path, template_cropped)
    cv2.imwrite(match_path, match_vis)
    
    debug_images = {
        "template": template_path,
        "match": match_path
    }
    # =================== END DEBUG ==================================

    # Crop-Position berechnen (eine ganze Zeile entfernen um    # Crop-Position berechnen
    crop_start = match_y + template_height
    remainder = next_img[crop_start:, :]
    combined = np.vstack([base_img, remainder])
    

    # =================== START DEBUG ====================================
    # 3. Zusammengefügtes Resultat mit Trennlinie
    result_vis = combined.copy()
    split_y = base_img.shape[0]
    cv2.line(result_vis, (0, split_y), (result_vis.shape[1], split_y), (255, 0, 255), 5)
    cv2.putText(result_vis, f"SPLIT at Y={split_y}", 
        (10, split_y - 10), 
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 0, 255), 3)
    
    # Gecropte Version: nur untere ~2x next_img Höhe (zeigt Overlap-Bereich)
    result_thumb_height = next_img.shape[0]
    result_cropped = result_vis[-result_thumb_height:, :] if result_vis.shape[0] > result_thumb_height else result_vis
    
    result_path = os.path.join(debug_dir, f"step_{step_index:02d}_3_result.png")
    cv2.imwrite(result_path, result_cropped)
    debug_images["result"] = result_path
    
    # Alle Infos in einer übersichtlichen Kachel loggen
    log("info", "🔗 Bild zusammengefügt", 
        match_score=f"{max_val*100:.1f}%",
        match_y=match_y,
        crop_y=crop_start,
        remaining_height=remainder.shape[0])
    
    return combined, max_val, debug_images
    # ==================== END DEBUG ====================================


def stitch_scroll_sequence(
    image_paths: Sequence[str],
    output_path: str,
) -> dict:

    frames: list[str] = list(image_paths)
    
    # Wenn nur 1 Bild: Stitching überspringen, nur Top-Border entfernen
    if len(frames) == 1:
        log("info", "ℹ️ Nur ein Bild vorhanden, Stitching nicht notwendig")
        stitched = cv2.imread(frames[0])
        log("info", "🔧 Nachbearbeitung: Entferne oberen Rand")
        stitched = _detect_and_remove_top_border(stitched)
        cv2.imwrite(output_path, stitched)
        
        result = {
            'output_path': output_path,
            'frames_used': 1,
            'last_match_score': None
        }
        log("info", "✅ Einzelbild verarbeitet", output_path=output_path)
        return result
    

    log("info", "🚀 Starte Stitching Pipeline", total_frames=len(frames), template_height=TEMPLATE_HEIGHT)

    stitched = cv2.imread(frames[0])
    last_score: float | None = None
    frames_used = frames.copy()  # Kopie für potentielle Änderungen

    for i, path in enumerate(frames[1:], 1):
        next_img = cv2.imread(path)
        stitched, last_score, debug_images = _stitch_pair(
            stitched,
            next_img,
            template_height_px=TEMPLATE_HEIGHT,
            step_index=i,
        )
        log("info", "Stitching-Fortschritt", step=i, filename=os.path.basename(path), images=debug_images)
    
    
    # Entferne oberen weißen Balken vom finalen Bild
    log("info", "🔧 Nachbearbeitung: Entferne oberen Rand")
    stitched = _detect_and_remove_top_border(stitched)

    cv2.imwrite(output_path, stitched)
    
    result = {
        'output_path': output_path,
        'frames_used': len(frames_used),
        'last_match_score': last_score
    }
    
    log("info", "✅ Stitching erfolgreich abgeschlossen", 
        frames_used=len(frames_used),
        output_path=output_path,
        final_match_score=float(last_score) if last_score else None)
    
    return result