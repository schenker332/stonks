"""
Step 1: Grundlegendes Laden des Stitched Images und Contour-Erkennung
Basiert auf dem bewährten Code aus text_recog.py aber angepasst für Roll-Screenshots
"""

import cv2
import matplotlib
matplotlib.use('Agg') 
import os

def step1_basic_contour_detection():
    """
    Funktionaler Code: Lade stitched image, erkenne Contours, filtere Transaktions-Boxen
    Returns: Saubere Datenstruktur ohne Print-Statements oder Debugging
    """
    
    # Pfad zum stitched image
    script_dir = os.path.dirname(os.path.abspath(__file__))
    stitched_path = os.path.join(script_dir, "stitched.png")
    
    # Image laden
    image_BGR = cv2.imread(stitched_path)

    # Preprocessing
    image_RGB = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY)
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
    
    return {
        'image_BGR': image_BGR,
        'image_RGB': image_RGB,
        'gray': gray,
        'thresh': thresh,
        'contours': contours,
        'transaction_boxes': transaction_boxes_sorted,
        'other_contours': other_contours,
        'debug_dir': debug_dir,
        'image_size': (image_BGR.shape[1], image_BGR.shape[0])  # (width, height)
    }


def debug_analyze_contours(result):
    """
    Debugging-Code: Statistiken ausgeben, Visualisierung erstellen, Debug-Bilder speichern
    """
    if result is None:
        print("❌ Kein stitched.png gefunden! Führen Sie zuerst main.py aus.")
        return
    
    transaction_boxes = result['transaction_boxes']
    other_contours = result['other_contours']
    image_size = result['image_size']
    
    print("🔍 Step 1: Lade stitched image und erkenne Contours...")
    print(f"📏 Bildgröße: {image_size[0]}x{image_size[1]} (WxH)")
    print(f"🔍 Insgesamt {len(result['contours'])} Contours gefunden")
    
    print(f"\n📈 2-Kategorien Analyse:")
    
    if transaction_boxes:
        # Sortiere nach Area für Min/Max-Analyse
        tx_sorted_by_area = sorted(transaction_boxes, key=lambda x: x['area'], reverse=True)
        
        print(f"🔴 Transaktions-Boxen (>50k): {len(transaction_boxes)} Stück")
        
        # Größte 2
        print(f"   📊 Größte 2:")
        for i, box in enumerate(tx_sorted_by_area[:2], 1):
            print(f"      {i}. Size: {box['w']}x{box['h']}, Pos: ({box['x']}, {box['y']}), Area: {box['area']:.0f}")
        
        # Kleinste 2  
        print(f"   📊 Kleinste 2:")
        for i, box in enumerate(tx_sorted_by_area[-2:], 1):
            print(f"      {i}. Size: {box['w']}x{box['h']}, Pos: ({box['x']}, {box['y']}), Area: {box['area']:.0f}")
    
    if other_contours:
        # Sortiere nach Area für Min/Max-Analyse
        other_sorted_by_area = sorted(other_contours, key=lambda x: x['area'], reverse=True)
        
        print(f"⚪ Andere Contours (≤50k): {len(other_contours)} Stück")
        
        # Größte 2
        print(f"   📊 Größte 2:")
        for i, box in enumerate(other_sorted_by_area[:2], 1):
            print(f"      {i}. Size: {box['w']}x{box['h']}, Pos: ({box['x']}, {box['y']}), Area: {box['area']:.0f}")
        
        # Kleinste 2
        print(f"   📊 Kleinste 2:")
        for i, box in enumerate(other_sorted_by_area[-2:], 1):
            print(f"      {i}. Size: {box['w']}x{box['h']}, Pos: ({box['x']}, {box['y']}), Area: {box['area']:.0f}")
    
    print(f"\n📐 Text-Box Ratios (basierend auf Original-Code, später zu implementieren)")
    print(f"   Datum-Box: x+20, y-33, h=26")
    print(f"   Name-Box: x+98, y+20, h=35") 
    print(f"   Kategorie-Box: x+98, y+59, h=35")
    print(f"   Preis-Box: x+725, y+35, h=40")
    
    # Visualisierung erstellen
    _create_debug_visualizations(result)
def _create_debug_visualizations(result):
    """
    Erstelle Debug-Visualisierungen und speichere PNG-Dateien
    """
    image_RGB = result['image_RGB']
    thresh = result['thresh']
    transaction_boxes = result['transaction_boxes']
    debug_dir = result['debug_dir']
    
    # Visualisierung vorbereiten
    black = cv2.cvtColor(thresh.copy(), cv2.COLOR_GRAY2BGR)
    OG = image_RGB.copy()
    
    print(f"\n🎨 Zeichne nur {len(transaction_boxes)} Transaktions-Boxen...")
    
    # Zeichne nur die wichtigen Transaktions-Boxen (ROT)
    red_contour_number = 1
    
    for stats in transaction_boxes:
        x, y, w, h = stats['x'], stats['y'], stats['w'], stats['h']
        
        # Nur ROT zeichnen
        color = (255, 0, 0)
        thickness = 3
        
        cv2.rectangle(black, (x, y), (x + w, y + h), color, thickness)
        cv2.rectangle(OG, (x, y), (x + w, y + h), color, thickness)
        
        # Nummerierung
        cv2.putText(OG, str(red_contour_number), (x + 5, y + 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 3)  # Weiße Zahlen
        cv2.putText(OG, str(red_contour_number), (x + 5, y + 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)  # Rote Zahlen
        red_contour_number += 1
    
    # Speichere Debug-Bilder
    OG_BGR = cv2.cvtColor(OG, cv2.COLOR_RGB2BGR)
    cv2.imwrite(os.path.join(debug_dir, 'step1_threshold.png'), thresh)
    cv2.imwrite(os.path.join(debug_dir, 'step1_contours.png'), OG_BGR)
    
    print(f"✅ {len(transaction_boxes)} Transaktions-Boxen gezeichnet")
    print(f"\n✅ Step 1 abgeschlossen!")
    print(f"📁 Nur 2 Debug-Bilder gespeichert in: {debug_dir}")
    print(f"   - step1_threshold.png (Schwarz-Weiß Threshold-Bild)")
    print(f"   - step1_contours.png (Original mit farbigen Contour-Rechtecken)")
    print(f"\n🎯 Analysieren Sie diese 2 Bilder um das Layout zu verstehen!")

if __name__ == "__main__":
    print("🚀 Starting OCR Pipeline für Roll Screenshots...")
    
    # Funktionaler Code: Contour-Detektion
    result = step1_basic_contour_detection()
    
    # Debug-Code: Analyse und Visualisierung  
    debug_analyze_contours(result)
