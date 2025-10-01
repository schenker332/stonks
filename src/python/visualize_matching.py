"""
Visualisierungs-Tool für Template-Matching mit absoluten Pixel-Werten.
Zeichnet Template-Bereiche und Matches direkt in die Bilder ein.
"""

import os
import glob
import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def visualize_template_matching(img1_path, img2_path, template_height_px=150, search_height_px=400):
    """
    Visualisiert das Template-Matching zwischen zwei Bildern mit absoluten Pixel-Werten.
    
    Args:
        img1_path: Pfad zu Bild 1 (Template wird von unten extrahiert)
        img2_path: Pfad zu Bild 2 (Template wird gesucht)
        template_height_px: Höhe des Templates in Pixeln (von unten in Bild 1)
        search_height_px: Such-Höhe in Pixeln (von oben in Bild 2)
    """
    
    # Bilder laden
    img1 = cv2.imread(img1_path)
    img2 = cv2.imread(img2_path)
    
    if img1 is None or img2 is None:
        print("❌ Konnte Bilder nicht laden")
        return
    
    # BGR zu RGB für matplotlib
    img1_rgb = cv2.cvtColor(img1, cv2.COLOR_BGR2RGB)
    img2_rgb = cv2.cvtColor(img2, cv2.COLOR_BGR2RGB)
    
    h1, w1 = img1.shape[:2]
    h2, w2 = img2.shape[:2]
    
    print(f"📸 Bild 1: {w1} x {h1}px - {os.path.basename(img1_path)}")
    print(f"📸 Bild 2: {w2} x {h2}px - {os.path.basename(img2_path)}")
    
    # Template-Bereich berechnen (von unten)
    template_height = min(template_height_px, h1)
    template_start_y = h1 - template_height
    
    # Such-Bereich berechnen (von oben)
    search_height = min(search_height_px, h2)
    
    print(f"🎯 Template-Höhe: {template_height}px")
    print(f"📏 Template-Bereich: Y{template_start_y} bis Y{h1} (untere {template_height}px)")
    print(f"🔍 Such-Bereich: Y0 bis Y{search_height} (obere {search_height}px)")
    
    # Template extrahieren (unterer Teil von Bild 1)
    template = img1[template_start_y:h1, :]
    
    # Such-Bereich extrahieren (oberer Teil von Bild 2)
    search_area = img2[0:search_height, :]
    
    # Template-Matching nur im Such-Bereich durchführen
    res = cv2.matchTemplate(search_area, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(res)
    
    match_x, match_y = max_loc
    
    print(f"📊 Match Score: {max_val:.3f} ({max_val*100:.1f}%)")
    print(f"📍 Match Position: X={match_x}, Y={match_y}")
    
    # Crop-Position berechnen
    crop_start = match_y + template_height
    remaining_height = h2 - crop_start
    
    print(f"✂️  Crop würde starten bei Y={crop_start}")
    print(f"📏 Verbleibende Höhe: {remaining_height}px")
    
    # Visualisierung erstellen
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle(f'Template Matching: {template_height}px Template, {search_height}px Suchbereich', 
                fontsize=16, fontweight='bold')
    
    # Bild 1 mit Template-Bereich markiert
    ax1 = axes[0, 0]
    ax1.imshow(img1_rgb)
    ax1.set_title(f'Bild 1: Template-Bereich (rot)\n{os.path.basename(img1_path)}')
    
    # Template-Bereich als rotes Rechteck
    rect1 = patches.Rectangle((0, template_start_y), w1, template_height, 
                             linewidth=3, edgecolor='red', facecolor='red', alpha=0.3)
    ax1.add_patch(rect1)
    
    # Template-Info
    ax1.text(10, 30, f'Template: {template_height}px\nvon Y{template_start_y} bis Y{h1}', 
             bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.8),
             fontsize=10, fontweight='bold')
    
    # Bild 2 mit Such-Bereich und Match markiert
    ax2 = axes[0, 1]
    ax2.imshow(img2_rgb)
    ax2.set_title(f'Bild 2: Suchbereich (gelb) + Match (grün)\n{os.path.basename(img2_path)}')
    
    # Such-Bereich als gelbes Rechteck
    rect_search = patches.Rectangle((0, 0), w2, search_height, 
                                  linewidth=2, edgecolor='yellow', facecolor='yellow', alpha=0.2)
    ax2.add_patch(rect_search)
    
    # Match-Bereich als grünes Rechteck
    rect2 = patches.Rectangle((match_x, match_y), w1, template_height, 
                             linewidth=3, edgecolor='green', facecolor='green', alpha=0.4)
    ax2.add_patch(rect2)
    
    # Crop-Linie
    if crop_start < h2:
        ax2.axhline(y=crop_start, color='blue', linestyle='--', linewidth=3)
        ax2.text(10, crop_start+20, f'Crop-Linie Y={crop_start}', 
                bbox=dict(boxstyle="round,pad=0.3", facecolor="lightblue", alpha=0.8),
                fontsize=10, fontweight='bold')
    
    # Such-Info
    ax2.text(10, 30, f'Suchbereich: {search_height}px\nMatch Score: {max_val:.3f}\nPosition: Y{match_y}', 
             bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgreen", alpha=0.8),
             fontsize=10, fontweight='bold')
    
    # Template allein zeigen
    ax3 = axes[1, 0]
    template_rgb = cv2.cvtColor(template, cv2.COLOR_BGR2RGB)
    ax3.imshow(template_rgb)
    ax3.set_title(f'Extrahiertes Template\n{template_rgb.shape[1]} x {template_rgb.shape[0]}px')
    
    # Crop-Ergebnis zeigen
    ax4 = axes[1, 1]
    if crop_start < h2 and remaining_height > 0:
        cropped = img2[crop_start:h2, :]
        cropped_rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
        ax4.imshow(cropped_rgb)
        ax4.set_title(f'Crop-Ergebnis\n{cropped_rgb.shape[1]} x {cropped_rgb.shape[0]}px\n(ab Y{crop_start})')
    else:
        ax4.text(0.5, 0.5, f'Kein Crop möglich\nCrop-Position: Y{crop_start}\nBild-Höhe: {h2}px', 
                ha='center', va='center', transform=ax4.transAxes,
                bbox=dict(boxstyle="round,pad=0.3", facecolor="orange", alpha=0.8),
                fontsize=12, fontweight='bold')
        ax4.set_xlim(0, 1)
        ax4.set_ylim(0, 1)
    
    # Achsen entfernen für bessere Übersicht
    for ax in axes.flat:
        ax.set_xticks([])
        ax.set_yticks([])
    
    plt.tight_layout()
    
    # Speichern
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, f"template_match_{template_height}px_search_{search_height}px.png")
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    
    print(f"\n💾 Visualisierung gespeichert: {os.path.basename(output_path)}")
    plt.show()
    
    return max_val, match_y, crop_start, remaining_height

def test_template_matching():
    """Testet Template-Matching mit konfigurierbaren Pixel-Werten"""
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Bilder finden
    cropped_pattern = os.path.join(script_dir, "shots_cropped", "cropped_*.png")
    cropped_files = sorted(glob.glob(cropped_pattern))
    
    if len(cropped_files) >= 2:
        print("📁 Verwende beschnittene Bilder aus shots_cropped/")
        img1_path = cropped_files[5]
        img2_path = cropped_files[6]

    
    print(f"\n🔍 Analysiere:")
    print(f"   Bild 1: {os.path.basename(img1_path)}")
    print(f"   Bild 2: {os.path.basename(img2_path)}")
    
    # Parameter abfragen
    print(f"\n🎛️  Template-Matching Parameter:")
    template_height = int(input("Template-Höhe in Pixeln (z.B. 150): ") or "150")
    search_height = int(input("Such-Höhe in Pixeln (z.B. 400): ") or "400")
    
    print(f"\n{'='*60}")
    print(f"🎯 TEMPLATE MATCHING TEST")
    print(f"{'='*60}")
    
    # Test durchführen
    max_val, match_y, crop_start, remaining_height = visualize_template_matching(
        img1_path, img2_path, template_height, search_height
    )
    
    # Zusammenfassung
    print(f"\n📋 ERGEBNIS:")
    print(f"   Template-Höhe: {template_height}px")
    print(f"   Such-Höhe: {search_height}px")
    print(f"   Match Score: {max_val:.3f} ({max_val*100:.1f}%)")
    print(f"   Match Position: Y{match_y}")
    print(f"   Crop-Position: Y{crop_start}")
    print(f"   Verbleibende Höhe: {remaining_height}px")

if __name__ == "__main__":

    test_template_matching()
