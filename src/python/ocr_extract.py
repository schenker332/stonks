import cv2
import matplotlib
matplotlib.use('Agg') 
import os
import numpy as np
import pytesseract


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

def ocr_extract():

    pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"
    os.environ["TESSDATA_PREFIX"] = "/opt/homebrew/share/tessdata/"
    
    # Pfad zum stitched image
    script_dir = os.path.dirname(os.path.abspath(__file__))
    stitched_path = os.path.join(script_dir, "stitched.png")
    
    # Image laden
    image_BGR = cv2.imread(stitched_path)

    # Preprocessing
    image_RGB = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 253, 255, cv2.THRESH_BINARY) 
    _, first_date_mask = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY_INV) # für erstes Datum
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
    
    # Transaktions-Boxen nach Y-Position sortieren (von oben nach unten)
    transaction_boxes_sorted = sorted(transaction_boxes, key=lambda x: x['y'])

    # Boxdrawer für Text-Bereiche (wie im Original text_recog.py)
    black = cv2.cvtColor(thresh.copy(), cv2.COLOR_GRAY2BGR)
    OG = image_RGB.copy()

    first_date_length = boxdrawer(start_x=1350, start_y=9, height=26, 
                                 source=first_date_mask, destination=OG, 
                                 mode='starting_left', buffer=12, draw=True)
    first_date = ""
    if first_date_length > 0:
        first_date = pytesseract.image_to_string(gray[9:9 + 26, 1350:1350 + first_date_length], lang="deu", config='--psm 6').strip()

    


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
            if new_date: current_date = new_date; print(f"date: {current_date}")


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
        price = pytesseract.image_to_string(gray[y + 35:y + 35 + 40, x + 725 - c - lenght3:x + 725 - c], lang="deu", config=price_config)
        if "," not in price: price = price[:-5] + "," + price[-5:]
        


        # Name
        lenght2 = boxdrawer(start_x=x + 98, start_y=y + 20 - a, height=35, source=thresh, destination=black, mode='starting_left', buffer=12, draw=True)
        lenght2 = boxdrawer(start_x=x + 98, start_y=y + 20 - a, height=35, source=thresh, destination=OG, mode='starting_left', buffer=12, draw=True)
        name = pytesseract.image_to_string(gray[y + 20 - a:y + 20 - a + 35, x + 98:x + 98 + lenght2], lang="deu", config='--psm 6')

        # Category
        lenght4 = boxdrawer(start_x=x + 98 + b, start_y=y + 59, height=35, source=thresh, destination=black, mode='starting_left', buffer=12, draw=True)
        lenght4 = boxdrawer(start_x=x + 98 + b, start_y=y + 59, height=35, source=thresh, destination=OG, mode='starting_left', buffer=12, draw=True)
        category = pytesseract.image_to_string(gray[y + 59:y + 59 + 35, x + 98 + b:x + 98 + b + lenght4], lang="deu", config='--psm 6')

        # OCR-Ergebnisse ausgeben und sammeln 
        print(f"item {i}:  {name.strip()} | {category.strip()} | {price.strip()} | {tag.strip()}")
        items.append({"name": name.strip(), "category": category.strip(), "price": price.strip(), "tag": tag.strip(), "date": current_date})


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

    # Debug-Bilder speichern
    debug_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug")
    
    # Convert RGB back to BGR für OpenCV speichern
    OG_BGR = cv2.cvtColor(OG, cv2.COLOR_RGB2BGR)
    
    cv2.imwrite(os.path.join(debug_dir, 'ocr_threshold.png'), thresh)
    cv2.imwrite(os.path.join(debug_dir, 'ocr_result.png'), OG_BGR)
    
    # OCR-Ergebnisse anzeigen (exakt wie in text_recog.py)
    if items:
        print(f"\n📋 OCR ERGEBNISSE: {len(items)} Transaktionen extrahiert")
        for i, item in enumerate(items, 1):
            print(f"{i:2d}. {item['date']:12s} | {item['name']:25s} | {item['category']:15s} | {item['price']:10s} | {item['tag']:10s}")
    
    print(f"\n✅ OCR Pipeline abgeschlossen!")
    print(f"📁 Debug-Bilder gespeichert in: {debug_dir}")
    
    return {"items": items, "first_date": first_date}






if __name__ == "__main__":
    print("🚀 Starting Clean OCR Pipeline für Roll Screenshots...")
    result = ocr_extract()
