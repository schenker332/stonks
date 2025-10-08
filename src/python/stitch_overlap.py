from __future__ import annotations
from typing import Sequence, Tuple
import cv2
import numpy as np
import os
import json
import sys
import traceback
from datetime import datetime

# === LOGGING HELFER ===
STEP_NAME = "stitch"


def log(level: str, message: str, step: str | None = STEP_NAME, **data):
    """Strukturiertes Logging für SSE Stream."""
    payload = {
        "level": level,
        "message": message,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    if step:
        payload["step"] = step
    if data:
        payload["data"] = data
    print("LOG:", json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()


# === TEMPLATE MATCHING KONFIGURATION ===
TEMPLATE_HEIGHT = 170


def detect_and_remove_top_border(stitched_path):
    """
    Erkennt den weißen Balken am oberen Rand und schneidet ihn ab.
    Sucht nach der ersten horizontalen Linie und schneidet dort ab.

    nimmt das bild aus 'stitched_path', speichert das beschnittene bild zurück in 'stitched_path'
    """
    image = cv2.imread(stitched_path)
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
                    log(
                        "info",
                        "📏 Horizontale Linie erkannt",
                        y=y,
                        brightness=float(line_mean),
                        std=float(line_std),
                    )
                    break
    
    if cut_y > 0:
        # Schneide oberen Bereich ab
        cropped = image[cut_y:, :]
        cv2.imwrite(stitched_path, cropped)
        log("info", "🗑️ Oberer Rand entfernt", removed_height=cut_y)
        return 
    else:
        log("warning", "⚠️ Keine klare horizontale Linie gefunden, Bild bleibt unverändert")
        return 


def _stitch_pair(
    base_img: np.ndarray,
    next_img: np.ndarray,
    *,
    template_height_px: int,
    step_index: int = 0,
    debug_path: str = None
) -> None:
    """Stitch two images using optimized template matching with absolute pixel values."""
    
    # Template aus unteren X Pixeln des base_img extrahieren
    template_height = min(template_height_px, base_img.shape[0])
    template_start_y = base_img.shape[0] - template_height
    template = base_img[template_start_y:, :]
    search_area = next_img
    res = cv2.matchTemplate(search_area, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(res)
    match_x, match_y = max_loc
    
    # ===  START DEBUG ==========================
    os.makedirs(debug_path, exist_ok=True)
    
    # 1. Template-Bereich markieren (rot)
    template_vis = base_img.copy()
    cv2.rectangle(template_vis, (0, template_start_y), (base_img.shape[1], base_img.shape[0]), (0, 0, 255), 5)

    # 2. Match-Position markieren (grün)
    match_vis = next_img.copy()
    cv2.rectangle(match_vis, (match_x, match_y), (match_x + template.shape[1], match_y + template_height), (0, 255, 0), 5)

    thumb_height = next_img.shape[0]
    template_cropped = template_vis[-thumb_height:, :] if template_vis.shape[0] > thumb_height else template_vis

    # DEBUG_ - Bilder speichern
    template_path = os.path.join(debug_path, f"step_{step_index:02d}_1_template.png")
    match_path = os.path.join(debug_path, f"step_{step_index:02d}_2_match.png")

    cv2.imwrite(template_path, template_cropped)
    cv2.imwrite(match_path, match_vis)
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
    result_thumb_height = next_img.shape[0]
    result_cropped = result_vis[-result_thumb_height:, :] if result_vis.shape[0] > result_thumb_height else result_vis
    
    result_path = os.path.join(debug_path, f"step_{step_index:02d}_3_result.png")
    cv2.imwrite(result_path, result_cropped)

    
    # Alle Infos in einer übersichtlichen Kachel loggen
    log(
        "info",
        "🔗 Bild zusammengefügt",
        match_score=f"{max_val*100:.1f}%",
        match_y=match_y,
        crop_y=crop_start,
        remaining_height=remainder.shape[0],
        debug_template=template_path,
        debug_match=match_path,
        debug_result=result_path,
    )
    
    
    # ==================== END DEBUG ====================================

    return combined

def stitch_scroll_sequence(cropped_path: str, stitched_path: str, debug_path: str) -> None:

    # Alle PNG-Dateien aus cropped_path Verzeichnis holen und sortieren
    image_files = sorted([f for f in os.listdir(cropped_path) if f.endswith('.png')])
    frames: list[str] = [os.path.join(cropped_path, f) for f in image_files]
    

    # Debug-Ordner aufräumen vor jedem Durchlauf
    if os.path.exists(debug_path):
        import shutil
        shutil.rmtree(debug_path)
    os.makedirs(debug_path, exist_ok=True)

    # Wenn nur 1 Bild: Stitching überspringen, nur Top-Border entfernen
    # if len(frames) == 1:
    #     log("info", "ℹ Nur ein Bild vorhanden, Stitching nicht notwendig") 
    #     log("info", " Nachbearbeitung: Entferne oberen Rand") 
    #     # Top-Bereich entfernen nimmt einzige Bild path->  speichert in 'stitched_path'
    #     detect_and_remove_top_border(frames[0], stitched_path)
    #     log("info", " Einzelbild verarbeitet")
    #     return 

    
    log("info", "🚀 Starte Stitching Pipeline", total_frames=len(frames), template_height=TEMPLATE_HEIGHT)

    stitched = cv2.imread(frames[0])
    for i, path in enumerate(frames[1:], 1):
        next_img = cv2.imread(path)
        stitched = _stitch_pair(stitched, next_img, template_height_px=TEMPLATE_HEIGHT, step_index=i, debug_path=debug_path)
        log("info", "Stitching-Fortschritt", step=i, filename=os.path.basename(path))
    cv2.imwrite(stitched_path, stitched)
    

    log("info", "🔧 Nachbearbeitung: Entferne oberen Rand")
    detect_and_remove_top_border(stitched_path)
    log("info", "✅ Stitching erfolgreich abgeschlossen")
    
