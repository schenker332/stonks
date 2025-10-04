"""
OCR Pipeline für Roll Screenshots - Clean Version
Eine Hauptfunkti    # SPEZIELLE MASKE: Erstes Datum (weiß-auf-lila) mit invertierter Threshold
    _, first_date_mask = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY_INV)
    
    # Speichere zum Testen
    cv2.imwrite(os.path.join(debug_dir, 'first_date_mask.png'), first_date_mask)ine Debug-Funktion
"""

import cv2
import matplotlib
matplotlib.use('Agg') 
import os
import numpy as np
from boxdrawer import boxdrawer

def main_ocr_extract():
    """
    Hauptfunktion: Komplette OCR Pipeline in einer Funktion
    - Image laden, Preprocessing
    - Contour-Erkennung und Filtering  
    - Boxdrawer für alle Text-Bereiche
    Returns: Saubere Datenstruktur für Debug
    """
    
    # Pfad zum stitched image
    script_dir = os.path.dirname(os.path.abspath(__file__))
    stitched_path = os.path.join(script_dir, "stitched.png")
    
    if not os.path.exists(stitched_path):
        return None
    
    # Image laden
    image_BGR = cv2.imread(stitched_path)
    if image_BGR is None:
        return None

    # Preprocessing
    image_RGB = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 253, 255, cv2.THRESH_BINARY) 
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
    
    # Kategorisieren und filtern
    transaction_boxes = [s for s in contour_stats if s['area'] > 50000]
    other_contours = [s for s in contour_stats if s['area'] <= 50000]
    
    # Transaktions-Boxen nach Y-Position sortieren (von oben nach unten)
    transaction_boxes_sorted = sorted(transaction_boxes, key=lambda x: x['y'])
    
    # Debug-Ordner vorbereiten
    debug_dir = os.path.join(script_dir, "debug")
    if not os.path.exists(debug_dir):
        os.makedirs(debug_dir)

    # Individuelle Threshold-Masken für alle Text-Typen
    _, date_mask = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY)      # Gleich wie thresh
    _, name_mask = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)      # Gleich wie thresh  
    _, category_mask = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY)  # Gleich wie thresh
    _, price_mask = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY)     # Gleich wie thresh
    _, tag_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)       # Gleich wie thresh
    _, first_date_mask = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY_INV)
    

    
    # THRESHOLD OVERVIEW: Alle Masken in einem Bild (nur erstes Fünftel)
    h, w = gray.shape
    crop_h = h // 5  # Nur das erste Fünftel der Höhe
    
    overview = np.ones((crop_h * 3, w * 3), dtype=np.uint8) * 255  # 3x3 Grid, weißer Hintergrund
    
    # Helper function für Text mit weißer Umrandung
    def draw_text_with_outline(img, text, pos, font, scale, color, thickness):
        x, y = pos
        # Weiße Umrandung (dicker)
        cv2.putText(img, text, (x, y), font, scale, 255, thickness + 2)
        # Schwarzer Text (dünner)
        cv2.putText(img, text, (x, y), font, scale, color, thickness)
    
    # Grid Position 0,0: Original gray (crop)
    overview[0:crop_h, 0:w] = gray[0:crop_h, :]
    draw_text_with_outline(overview, 'Original (gray)', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Grid Position 0,1: thresh (Contour Detection)
    overview[0:crop_h, w:w*2] = thresh[0:crop_h, :]
    draw_text_with_outline(overview, 'thresh (250, BINARY)', (w+10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Grid Position 0,2: date_mask
    overview[0:crop_h, w*2:w*3] = date_mask[0:crop_h, :]
    draw_text_with_outline(overview, 'date_mask (250, BINARY)', (w*2+10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Grid Position 1,0: name_mask
    overview[crop_h:crop_h*2, 0:w] = name_mask[0:crop_h, :]
    draw_text_with_outline(overview, 'name_mask (250, BINARY)', (10, crop_h+30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Grid Position 1,1: category_mask
    overview[crop_h:crop_h*2, w:w*2] = category_mask[0:crop_h, :]
    draw_text_with_outline(overview, 'category_mask (250, BINARY)', (w+10, crop_h+30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Grid Position 1,2: price_mask
    overview[crop_h:crop_h*2, w*2:w*3] = price_mask[0:crop_h, :]
    draw_text_with_outline(overview, 'price_mask (250, BINARY)', (w*2+10, crop_h+30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Grid Position 2,0: tag_mask
    overview[crop_h*2:crop_h*3, 0:w] = tag_mask[0:crop_h, :]
    draw_text_with_outline(overview, 'tag_mask (250, BINARY)', (10, crop_h*2+30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Grid Position 2,1: first_date_mask
    overview[crop_h*2:crop_h*3, w:w*2] = first_date_mask[0:crop_h, :]
    draw_text_with_outline(overview, 'first_date_mask (190, INV)', (w+10, crop_h*2+30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Grid Position 2,2: Leer (weiß)
    draw_text_with_outline(overview, 'Unused', (w*2+10, crop_h*2+30), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    
    # Speichere Übersichtsbild
    cv2.imwrite(os.path.join(debug_dir, 'threshold_overview.png'), overview)
    

    print(f"🖼️  OVERVIEW: Alle Threshold-Masken in einem Bild!")
    print(f"   Nur erstes Fünftel ({crop_h}/{h} Pixel Höhe) für Übersicht")
    print(f"   Gespeichert: debug/threshold_overview.png (3x3 Grid)")

    # Boxdrawer für Text-Bereiche (wie im Original text_recog.py)
    black = cv2.cvtColor(thresh.copy(), cv2.COLOR_GRAY2BGR)
    OG = image_RGB.copy()


    first_date_length = boxdrawer(start_x=1350, start_y=9, height=26, 
                                 source=first_date_mask, destination=OG, 
                                 mode='starting_left', buffer=12, draw=True)
    





    # Arrays für Koordinaten (wie im Original)
    widht = []
    hight = []
    x_coord = []
    y_coord = []
    io_date = 0
    i = 0
    text_boxes_data = []
    
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
            length_date = boxdrawer(start_x=x+20, start_y=y-33, height=26, 
                                  source=date_mask, destination=OG, mode='starting_left', 
                                  buffer=12, draw=True)



        # Tag 
        a = 0
        b = 0
        lenght1 = boxdrawer(start_x=x + 102, start_y=y + 56, height=38, 
                           source=thresh, destination=black, mode='starting_left', 
                           buffer=3, draw=False)
        
        row_pixel = black[y + 56:y + 56 + 38, x + 102:x + 102 + lenght1]
        black_pixel = np.sum(row_pixel == 0)

        if black_pixel > 10000:
            lenght1 = boxdrawer(start_x=x + 102, start_y=y + 56, height=38, 
                               source=thresh, destination=OG, mode='starting_left', 
                               buffer=3, draw=True)
            b = lenght1 + 3
            a = 5





        # Price 
        c = 0
        lenght3 = boxdrawer(start_x=x + 733, start_y=y + 35, height=40, 
                           source=thresh, destination=black, mode='starting_right', 
                           buffer=3, draw=False)
        row_pixel1 = black[y + 35:y + 35 + 40, x + 733:x + 733 + lenght3]
        black_pixel1 = np.sum(row_pixel1 == 0)
        if black_pixel1 > 1000:
            c = lenght3 + 3

        lenght_price = boxdrawer(start_x=x + 725 - c, start_y=y + 35, height=40, 
                               source=price_mask, destination=OG, mode='starting_right', 
                               buffer=12, draw=True)





        # Name 
        lenght_name = boxdrawer(start_x=x + 98, start_y=y + 20 - a, height=35, 
                              source=name_mask, destination=black, mode='starting_left', 
                              buffer=12, draw=True)
        lenght_name = boxdrawer(start_x=x + 98, start_y=y + 20 - a, height=35, 
                              source=name_mask, destination=OG, mode='starting_left', 
                              buffer=12, draw=True)




        # Category 
        lenght_category = boxdrawer(start_x=x + 98 + b, start_y=y + 59, height=35, 
                                  source=category_mask, destination=black, mode='starting_left', 
                                  buffer=12, draw=True)
        lenght_category = boxdrawer(start_x=x + 98 + b, start_y=y + 59, height=35, 
                                  source=category_mask, destination=OG, mode='starting_left', 
                                  buffer=12, draw=True)




        # Number auf image (wie im Original)
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 1
        thickness = 2
        color = (255, 0, 0)
        text = str(i)
        text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
        center_x = x + w // 2
        center_y = y + h // 2
        text_x = center_x - text_size[0] // 2
        text_y = center_y + text_size[1] // 2

        cv2.putText(black, text, (text_x, text_y + 30), font, font_scale, color, thickness)
        cv2.putText(OG, text, (text_x, text_y + 30), font, font_scale, color, thickness)

        # Sammle Box-Daten
        text_boxes_data.append({
            'contour_id': i,
            'transaction_box': {'x': x, 'y': y, 'w': w, 'h': h},
            'date_box': {'x': x+20, 'y': y-33, 'w': length_date, 'h': 26},
            'name_box': {'x': x+98, 'y': y+20-a, 'w': lenght_name, 'h': 35},
            'category_box': {'x': x+98+b, 'y': y+59, 'w': lenght_category, 'h': 35},
            'price_box': {'x': x+725-c-lenght_price, 'y': y+35, 'w': lenght_price, 'h': 40},
            'tag_box': {'x': x+102, 'y': y+56, 'w': lenght1, 'h': 38, 'black_pixels': black_pixel}
        })

        io_date = y

    return {
        'image_BGR': image_BGR,
        'image_RGB': image_RGB,
        'gray': gray,
        'thresh': thresh,
        'contours': contours,
        'transaction_boxes': transaction_boxes_sorted,
        'other_contours': other_contours,
        'debug_dir': debug_dir,
        'image_size': (image_BGR.shape[1], image_BGR.shape[0]),
        'black': black,
        'OG': OG,
        'text_boxes_data': text_boxes_data,
        'widht': widht,
        'hight': hight,
        'x_coord': x_coord,
        'y_coord': y_coord
    }


def debug_ocr(result):
    """
    Einzige Debug-Funktion: Alle Statistiken, Ausgaben und Debug-Bilder
    """
    if result is None:
        print("❌ Kein stitched.png gefunden! Führen Sie zuerst main.py aus.")
        return
    
    transaction_boxes = result['transaction_boxes']
    other_contours = result['other_contours']
    image_size = result['image_size']
    text_boxes_data = result['text_boxes_data']
    
    print("🔍 OCR Pipeline: Lade stitched image und erkenne Contours...")
    print(f"📏 Bildgröße: {image_size[0]}x{image_size[1]} (WxH)")
    print(f"🔍 Insgesamt {len(result['contours'])} Contours gefunden")
    
    print(f"\n📈 Contour-Kategorien Analyse:")
    
    if transaction_boxes:
        tx_sorted_by_area = sorted(transaction_boxes, key=lambda x: x['area'], reverse=True)
        print(f"🔴 Transaktions-Boxen (>50k): {len(transaction_boxes)} Stück")
        print(f"   📊 Größte 2:")
        for i, box in enumerate(tx_sorted_by_area[:2], 1):
            print(f"      {i}. Size: {box['w']}x{box['h']}, Pos: ({box['x']}, {box['y']}), Area: {box['area']:.0f}")
        print(f"   📊 Kleinste 2:")
        for i, box in enumerate(tx_sorted_by_area[-2:], 1):
            print(f"      {i}. Size: {box['w']}x{box['h']}, Pos: ({box['x']}, {box['y']}), Area: {box['area']:.0f}")
    
    if other_contours:
        other_sorted_by_area = sorted(other_contours, key=lambda x: x['area'], reverse=True)
        print(f"⚪ Andere Contours (≤50k): {len(other_contours)} Stück")
        print(f"   📊 Größte 2:")
        for i, box in enumerate(other_sorted_by_area[:2], 1):
            print(f"      {i}. Size: {box['w']}x{box['h']}, Pos: ({box['x']}, {box['y']}), Area: {box['area']:.0f}")
        print(f"   📊 Kleinste 2:")
        for i, box in enumerate(other_sorted_by_area[-2:], 1):
            print(f"      {i}. Size: {box['w']}x{box['h']}, Pos: ({box['x']}, {box['y']}), Area: {box['area']:.0f}")

    print(f"\n🔍 Boxdrawer Text-Bereich Erkennung...")
    print(f"📦 {len(text_boxes_data)} Transaktions-Boxen verarbeitet")
    
    for i, box_data in enumerate(text_boxes_data, 1):
        tx_box = box_data['transaction_box']
        date_box = box_data['date_box']
        name_box = box_data['name_box']
        category_box = box_data['category_box']
        price_box = box_data['price_box']
        tag_box = box_data['tag_box']
        
        print(f"\n📦 Contour {i}: x={tx_box['x']}, y={tx_box['y']}, w={tx_box['w']}, h={tx_box['h']}")
        print(f"   📅 Date box: x={date_box['x']}, y={date_box['y']}, w={date_box['w']}, h={date_box['h']}")
        print(f"   📝 Name box: x={name_box['x']}, y={name_box['y']}, w={name_box['w']}, h={name_box['h']}")
        print(f"   📂 Category box: x={category_box['x']}, y={category_box['y']}, w={category_box['w']}, h={category_box['h']}")
        print(f"   💰 Price box: x={price_box['x']}, y={price_box['y']}, w={price_box['w']}, h={price_box['h']}")
        print(f"   🏷️  Tag box: x={tag_box['x']}, y={tag_box['y']}, w={tag_box['w']}, h={tag_box['h']} (black pixels: {tag_box['black_pixels']})")
        
        if tag_box['black_pixels'] > 10000:
            print(f"       ✅ Tag detected!")
        else:
            print(f"       ❌ No tag detected")

    # Debug-Bilder speichern
    debug_dir = result['debug_dir']
    thresh = result['thresh']
    OG = result['OG']
    
    # Convert RGB back to BGR für OpenCV speichern
    OG_BGR = cv2.cvtColor(OG, cv2.COLOR_RGB2BGR)
    
    cv2.imwrite(os.path.join(debug_dir, 'ocr_threshold.png'), thresh)
    cv2.imwrite(os.path.join(debug_dir, 'ocr_result.png'), OG_BGR)
    
    print(f"\n✅ OCR Pipeline abgeschlossen!")
    print(f"📊 {len(text_boxes_data)} Transaktions-Boxen verarbeitet")
    print(f"📁 Debug-Bilder gespeichert in: {debug_dir}")
    print(f"   - ocr_threshold.png (Schwarz-Weiß Threshold-Bild)")
    print(f"   - ocr_result.png (Original mit allen Boxen und Nummern)")


if __name__ == "__main__":
    print("🚀 Starting Clean OCR Pipeline für Roll Screenshots...")
    
    # Hauptfunktion: Alles in einer
    result = main_ocr_extract()
    
    # Debug-Funktion: Alles debuggen
    debug_ocr(result)
