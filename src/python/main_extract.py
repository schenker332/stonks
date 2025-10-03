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
    Step 1: Lade stitched image und erkenne alle Contours
    Viel Debugging und Visualisierung um zu verstehen was wir haben
    """
    
    # Pfad zum stitched image
    script_dir = os.path.dirname(os.path.abspath(__file__))
    stitched_path = os.path.join(script_dir, "stitched.png")
    
    if not os.path.exists(stitched_path):
        print("❌ Kein stitched.png gefunden! Führen Sie zuerst main.py aus.")
        return None
    
    print("🔍 Step 1: Lade stitched image und erkenne Contours...")
    
    # Image laden (wie im Original)
    image_BGR = cv2.imread(stitched_path)
    if image_BGR is None:
        print("❌ Konnte stitched.png nicht laden!")
        return None
    
    print(f"📏 Bildgröße: {image_BGR.shape[1]}x{image_BGR.shape[0]} (WxH)")
    
    # Preprocessing (exakt wie im Original)
    image_RGB = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(image_BGR, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"🔍 Insgesamt {len(contours)} Contours gefunden")
    
    # Debugging: Analysiere alle Contour-Größen
    contour_stats = []
    for i, contour in enumerate(contours):
        x, y, w, h = cv2.boundingRect(contour)
        area = cv2.contourArea(contour)
        contour_stats.append({
            'id': i,
            'x': x, 'y': y, 'w': w, 'h': h,
            'area': area
        })
    
    # Sortiere nach Größe (area) für bessere Übersicht
    contour_stats_sorted = sorted(contour_stats, key=lambda x: x['area'], reverse=True)
    
    print("\n📊 Top 10 größte Contours:")
    for i, stats in enumerate(contour_stats_sorted[:10]):
        print(f"  {i+1:2d}. ID:{stats['id']:3d} | Pos:({stats['x']:4d},{stats['y']:4d}) | "
              f"Size:{stats['w']:3d}x{stats['h']:3d} | Area:{stats['area']:6.0f}")
    
    # Visualisierung vorbereiten
    black = cv2.cvtColor(thresh.copy(), cv2.COLOR_GRAY2BGR)
    OG = image_RGB.copy()
    
    # Zeichne ALLE Contours zur Analyse (verschiedene Farben je nach Größe)
    for stats in contour_stats:
        x, y, w, h = stats['x'], stats['y'], stats['w'], stats['h']
        area = stats['area']
        
        # Farbkodierung basierend auf Größe
        if area > 50000:  # Sehr große Contours - ROT
            color = (255, 0, 0)
            thickness = 3
        elif area > 10000:  # Mittelgroße Contours - GRÜN
            color = (0, 255, 0)
            thickness = 2
        elif area > 1000:  # Kleine Contours - BLAU
            color = (0, 0, 255)
            thickness = 1
        else:  # Sehr kleine - GRAU
            color = (128, 128, 128)
            thickness = 1
        
        cv2.rectangle(black, (x, y), (x + w, y + h), color, thickness)
        cv2.rectangle(OG, (x, y), (x + w, y + h), color, thickness)
        
        # Zeige ID für große Contours
        if area > 10000:
            cv2.putText(OG, str(stats['id']), (x + 5, y + 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    # Speichere nur 2 wichtige Debug-Bilder mit OpenCV (verlustfrei)
    debug_dir = os.path.join(script_dir, "debug")
    if not os.path.exists(debug_dir):
        os.makedirs(debug_dir)
    
    # Konvertiere RGB zurück zu BGR für OpenCV speichern
    OG_BGR = cv2.cvtColor(OG, cv2.COLOR_RGB2BGR)
    
    # Nur 2 Bilder speichern:
    # 1. Threshold-Bild (schwarz-weiß)
    cv2.imwrite(os.path.join(debug_dir, 'step1_threshold.png'), thresh)
    
    # 2. Original mit allen Contours
    cv2.imwrite(os.path.join(debug_dir, 'step1_contours.png'), OG_BGR)
    
    print(f"\n✅ Step 1 abgeschlossen!")
    print(f"📁 Nur 2 Debug-Bilder gespeichert in: {debug_dir}")
    print(f"   - step1_threshold.png (Schwarz-Weiß Threshold-Bild)")
    print(f"   - step1_contours.png (Original mit farbigen Contour-Rechtecken)")
    print(f"\n🎯 Analysieren Sie diese 2 Bilder um das Layout zu verstehen!")
    
    return {
        'image_BGR': image_BGR,
        'image_RGB': image_RGB,
        'gray': gray,
        'thresh': thresh,
        'contours': contours,
        'contour_stats': contour_stats_sorted,
        'debug_dir': debug_dir
    }

if __name__ == "__main__":
    result = step1_basic_contour_detection()
    if result:
        print(f"\n🔍 Analyse der ersten 5 größten Contours:")
        for i, stats in enumerate(result['contour_stats'][:5]):
            print(f"  {i+1}. Größe: {stats['w']}x{stats['h']}, "
                  f"Position: ({stats['x']}, {stats['y']}), "
                  f"Area: {stats['area']:.0f}")
