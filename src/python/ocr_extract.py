import cv2
import matplotlib
matplotlib.use('Agg') 
import os
import numpy as np
import pytesseract
import json
import sys
import traceback
from datetime import datetime


# === LOGGING HELPER ===
STEP_NAME = "ocr"


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


# Referenzfarben (Lab) für Expense/Income basierend auf RGB (54,24,145) bzw. (44,198,85)
EXPENSE_LAB = np.array([39.0, 66.0, -55.0], dtype=np.float32)
INCOME_LAB = np.array([78.0, -55.0, 52.0], dtype=np.float32)


def classify_amount_from_color(region_rgb: np.ndarray | None) -> tuple[str | None, list[float] | None]:
    if region_rgb is None or region_rgb.size == 0:
        return None, None

    try:
        roi = region_rgb.astype(np.float32)

        h, w, _ = roi.shape
        if h > 4 and w > 4:
            border_h = max(1, int(h * 0.2))
            border_w = max(1, int(w * 0.1))
            cropped = roi[border_h:h - border_h, border_w:w - border_w]
            if cropped.size > 0:
                roi = cropped

        roi_bgr = cv2.cvtColor(roi, cv2.COLOR_RGB2BGR)
        roi_lab = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2LAB)

        pixels = roi_lab.reshape(-1, 3)

        L = pixels[:, 0]
        a = pixels[:, 1]
        b = pixels[:, 2]
        color_mask = (L < 240) & ((np.abs(a - 128) > 4) | (np.abs(b - 128) > 4))
        if np.count_nonzero(color_mask) > 10:
            pixels = pixels[color_mask]

        avg_lab = np.median(pixels, axis=0)

        dist_expense = np.linalg.norm(avg_lab - EXPENSE_LAB)
        dist_income = np.linalg.norm(avg_lab - INCOME_LAB)

        if np.isnan(dist_expense) or np.isnan(dist_income):
            return None, avg_lab.tolist()

        detected = "expense" if dist_expense <= dist_income else "income"
        return detected, avg_lab.tolist()
    except Exception:
        return None, None



def boxdrawer(start_x, start_y, height, source, destination, mode, buffer, draw):
    import cv2, numpy as np
    k = white_rows = 0
    step = 1 if mode == 'starting_left' else -1
    
    # Bildgrenzen ermitteln
    max_width = source.shape[1]
    max_height = source.shape[0]
    
    get_pixel = lambda x: source[start_y:start_y + height, x]
    cond = lambda px: np.sum(px < 100) if mode == 'starting_left' else np.sum(px == 0)
    
    while white_rows < buffer:
        # Berechne die aktuelle X-Position
        current_x = start_x + k if mode == 'starting_left' else start_x - k
        
        # Prüfe ob wir noch im Bild sind
        if current_x < 0 or current_x >= max_width:
            break
            
        px = get_pixel(current_x)
        if cond(px) > 0: white_rows = 0
        else: white_rows += 1
        k += 1
    if draw:
        x1 = start_x if mode == 'starting_left' else start_x - k + 4
        x2 = start_x + k - 4 if mode == 'starting_left' else start_x
        cv2.rectangle(destination, (x1, start_y), (x2, start_y + height), (0, 0, 255), 1)
    return k

def ocr_extract(stitched_path, debug_path):

    log("info", "🔍 Starte OCR-Extraktion", path=stitched_path)
    
    pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"
    os.environ["TESSDATA_PREFIX"] = "/opt/homebrew/share/tessdata/"
        
    # Image laden
    log("info", "📂 Lade Bild", path=stitched_path)
    image_BGR = cv2.imread(stitched_path)

    # Preprocessing
    log("info", "🔧 Preprocessing: Konvertiere zu RGB und Graustufen")
    image_RGB = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 253, 255, cv2.THRESH_BINARY) 
    _, first_date_mask = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY_INV) # für erstes Datum
    log("info", "🔍 Suche Konturen für Transaktionsboxen")
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Contour-Stats erstellen
    contour_stats = []
    for i, contour in enumerate(contours):
        x, y, w, h = cv2.boundingRect(contour)
        area = cv2.contourArea(contour)
        contour_stats.append({
            'id': i,
            'x': x, 'y': y, 'w': w, 'h': h,
            'area': area
        })
    
    log("info", "📊 Alle Konturen gefunden", total_contours=len(contour_stats))
    
    # Kategorisieren und filtern
    transaction_boxes = [s for s in contour_stats if s['area'] > 50000]
    log("info", "📦 Transaktionsboxen gefiltert", count=len(transaction_boxes))
    
    # Summary: Contour-Statistiken (für Dashboard)
    if transaction_boxes:
        # Sortiere für Preview
        sorted_boxes = sorted(transaction_boxes, key=lambda x: x['y'])
        
        # Erste 5 Boxen für Detailansicht
        box_details = []
        for box in sorted_boxes[:5]:
            box_details.append({
                'x': box['x'],
                'y': box['y'], 
                'w': box['w'],
                'h': box['h']
            })
        
        log(
            "summary",
            "📦 Transaktionsboxen",
            count=len(transaction_boxes),
            boxes=box_details,
        )
        
        # Debug: Details zu allen Boxen
        for i, box in enumerate(sorted_boxes[:10], 1):  # Erste 10 Boxen
            log(
                "info",
                f"📦 Box #{i}",
                x=box['x'],
                y=box['y'],
                width=box['w'],
                height=box['h'],
                area=round(box['area'], 2),
            )
    
    # Transaktions-Boxen nach Y-Position sortieren (von oben nach unten)
    transaction_boxes_sorted = sorted(transaction_boxes, key=lambda x: x['y'])

    # Boxdrawer für Text-Bereiche 
    black = cv2.cvtColor(thresh.copy(), cv2.COLOR_GRAY2BGR)
    OG = image_RGB.copy()

    first_date_length = boxdrawer(start_x=1110, start_y=9, height=26, 
                                 source=first_date_mask, destination=OG, 
                                 mode='starting_left', buffer=12, draw=True)
    first_date = ""
    if first_date_length > 0:
        first_date = pytesseract.image_to_string(gray[9:9 + 26, 1110:1110 + first_date_length], lang="deu", config='--psm 6').strip()
        log("info", "📅 Erstes Datum erkannt", date=first_date)

    


    # Arrays für Koordinaten (wie im Original)
    widht = []
    hight = []
    x_coord = []
    y_coord = []
    io_date = 0
    current_date = first_date  # Beginne mit dem ersten Datum
    i = 0
    items = []  # Für OCR-Ergebnisse wie in text_recog.py

    
    # Loop über transaction_boxes (bereits gefiltert!)
    for box_stats in transaction_boxes_sorted:
        x, y, w, h = box_stats['x'], box_stats['y'], box_stats['w'], box_stats['h']
        
        i += 1
        widht.append(w)
        hight.append(h)
        x_coord.append(x)
        y_coord.append(y)

        # Draw bounding box 
        cv2.rectangle(black, (x, y), (x + w, y + h), (255, 0, 0), 2)
        cv2.rectangle(OG, (x, y), (x + w, y + h), (255, 0, 0), 2)

        # Date 
        length_date = 0
        if y - io_date > 20 + h:
            length_date = boxdrawer(start_x=x+20, start_y=y-33, height=26, source=gray, destination=OG, mode='starting_left', buffer=12, draw=True)
            new_date = pytesseract.image_to_string(gray[y-33:y-33 + 26, x+20:x+20 + length_date], lang="deu", config='--psm 6').strip()
            if new_date: 
                current_date = new_date
                log("info", "📅 Neues Datum erkannt", date=current_date, item=i)


        # Tag 
        a = b = 0
        lenght1 = boxdrawer(start_x=x + 102, start_y=y + 56, height=38, source=thresh, destination=black, mode='starting_left', buffer=3, draw=False)
        row_pixel = black[y + 56:y + 56 + 38, x + 102:x + 102 + lenght1]
        black_pixel = np.sum(row_pixel == 0)
        tag = ""
        if black_pixel > 10000:
            lenght1 = boxdrawer(start_x=x + 102, start_y=y + 56, height=38, source=thresh, destination=black, mode='starting_left', buffer=3, draw=True)
            lenght1 = boxdrawer(start_x=x + 102, start_y=y + 56, height=38, source=thresh, destination=OG, mode='starting_left', buffer=3, draw=True)
            b, a = lenght1 + 3, 5
            tag = pytesseract.image_to_string(gray[y + 56:y + 56 + 38, x + 102:x + 102 + lenght1], lang="deu", config='--psm 6')



        # Price
        lenght3 = boxdrawer(start_x=x + 733, start_y=y + 35, height=40, source=thresh, destination=black, mode='starting_right', buffer=3, draw=False)
        black_pixel1 = np.sum(black[y + 35:y + 35 + 40, x + 733:x + 733 + lenght3] == 0)
        c = lenght3 + 3 if black_pixel1 > 1000 else 0
        lenght3 = boxdrawer(start_x=x + 725 - c, start_y=y + 35, height=40, source=thresh, destination=OG, mode='starting_right', buffer=12, draw=True)
        price_config = '--oem 3 --psm 7 -c tessedit_char_whitelist="-−0123456789,. €$" --psm 7'
        price_slice = (slice(y + 35, y + 35 + 40), slice(x + 725 - c - lenght3, x + 725 - c))
        price_gray = gray[price_slice]
        price_rgb = OG[price_slice]
        price = pytesseract.image_to_string(price_gray, lang="deu", config=price_config)
        if len(price) > 5 and "," not in price:
            price = price[:-5] + "," + price[-5:]

        price_clean = price.strip()
        has_minus = "-" in price_clean or "−" in price_clean
        color_type, color_lab = classify_amount_from_color(price_rgb)
        if color_type is None:
            detected_type = "expense" if has_minus else "income"
        else:
            detected_type = color_type

        normalized = price_clean.lstrip("-−+")
        if detected_type == "expense":
            price_clean = f"-{normalized}" if normalized else "-0,00"
        else:
            price_clean = normalized

        price = price_clean.strip()

        # Name
        lenght2 = boxdrawer(start_x=x + 98, start_y=y + 20 - a, height=35, source=thresh, destination=black, mode='starting_left', buffer=12, draw=True)
        lenght2 = boxdrawer(start_x=x + 98, start_y=y + 20 - a, height=35, source=thresh, destination=OG, mode='starting_left', buffer=12, draw=True)
        name = pytesseract.image_to_string(gray[y + 20 - a:y + 20 - a + 35, x + 98:x + 98 + lenght2], lang="deu", config='--psm 6')

        # Category
        lenght4 = boxdrawer(start_x=x + 98 + b, start_y=y + 59, height=35, source=thresh, destination=black, mode='starting_left', buffer=12, draw=True)
        lenght4 = boxdrawer(start_x=x + 98 + b, start_y=y + 59, height=35, source=thresh, destination=OG, mode='starting_left', buffer=12, draw=True)
        category = pytesseract.image_to_string(gray[y + 59:y + 59 + 35, x + 98 + b:x + 98 + b + lenght4], lang="deu", config='--psm 6')

        # OCR-Ergebnisse ausgeben und sammeln 
        log("info", f"📝 Item {i} verarbeitet", 
            name=name.strip(), 
            category=category.strip(), 
            price=price.strip(), 
            tag=tag.strip(),
            date=current_date,
            type=detected_type,
            color_lab=color_lab)
        items.append({
            "name": name.strip(),
            "category": category.strip(),
            "price": price.strip(),
            "tag": tag.strip(),
            "date": current_date,
            "type": detected_type,
            "color_lab": color_lab,
        })


        # Nummer auf Image
        text = str(i)
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale, thickness = 1, 2
        color = (255, 0, 0)
        text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
        text_x = x + w // 2 - text_size[0] // 2
        text_y = y + h // 2 + text_size[1] // 2

        cv2.putText(black, text, (text_x, text_y + 30), font, font_scale, color, thickness)
        cv2.putText(OG, text, (text_x, text_y + 30), font, font_scale, color, thickness)


        io_date = y


    # Convert RGB back to BGR für OpenCV speichern
    OG_BGR = cv2.cvtColor(OG, cv2.COLOR_RGB2BGR)
    
    cv2.imwrite(os.path.join(debug_path, 'ocr_threshold.png'), thresh)
    cv2.imwrite(os.path.join(debug_path, 'ocr_result.png'), OG_BGR)

    log("info", "✅ OCR Pipeline abgeschlossen", total_items=len(items))

    return items
