import time
import os
import subprocess
import pyautogui
import shutil
import cv2
from PIL import Image, ImageChops
import numpy as np
from Quartz import (
    CGWindowListCopyWindowInfo,
    kCGWindowListOptionOnScreenOnly,
    kCGNullWindowID,
    CGEventCreateScrollWheelEvent,
    kCGScrollEventUnitPixel,
    CGEventPost,
    kCGHIDEventTap
)


# === KONFIGURATION ===
# Crop-Konstanten - nur unten abschneiden, Rest behalten
CROP_BOTTOM_OFFSET = 1  # Schneide nur 1 Pixel unten ab

# Screenshot-Einstellungen
MAX_FRAMES = 20
DELAY = 0.7
SCROLL_AMOUNT = 700


def hide_browser_show_finanzguru():
    """Versteckt Browser-Fenster und bringt Finanzguru in den Vordergrund."""
    applescript = '''
    tell application "System Events"
        try
            tell application "Arc" to set miniaturized of front window to true
        on error
            -- Browser nicht gefunden, ignorieren
        end try
        
        try
            tell application "Finanzguru" to activate
        on error
            -- Finanzguru läuft nicht, ignorieren
        end try
    end tell
    '''
    subprocess.run(["osascript", "-e", applescript])


def restore_browser():
    """Stellt Browser-Fenster wieder her."""
    applescript = '''
    tell application "Arc"
        try
            activate
            set miniaturized of front window to false
        on error
            -- Fehler ignorieren
        end try
    end tell
    '''
    subprocess.run(["osascript", "-e", applescript])


def find_finanzguru_window():
    """Findet das Finanzguru-Fenster und gibt (x, y, width, height) zurück."""
    infos = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID)
    for win in infos:
        if win.get("kCGWindowOwnerName") == "Finanzguru":
            b = win["kCGWindowBounds"]
            return int(b["X"]), int(b["Y"]), int(b["Width"]), int(b["Height"])
    raise RuntimeError("Finanzguru-Fenster nicht gefunden")


def capture_region_hq(x, y, w, h, out_path):
    """Macht HQ-Screenshot der Region (x,y,w,h) mit macOS screencapture."""
    cmd = [
        "screencapture",
        "-R", f"{x},{y},{w},{h}",
        "-t", "png",
        "-x",
        out_path
    ]
    subprocess.run(cmd, check=True)
    return out_path


def scroll_down(x, y, w, h):
    """Bewegt Maus in Fenstermitte und scrollt um SCROLL_AMOUNT Pixel nach unten."""
    mid_x, mid_y = x + w//2, y + h//2
    pyautogui.moveTo(mid_x, mid_y, duration=0.2)
    ev = CGEventCreateScrollWheelEvent(None, kCGScrollEventUnitPixel, 1, SCROLL_AMOUNT)
    CGEventPost(kCGHIDEventTap, ev)


def has_changed(img1_path, img2_path, compare_height=200, threshold=5):
    """Vergleicht die unteren compare_height Pixel von zwei Screenshots."""
    img1 = Image.open(img1_path)
    img2 = Image.open(img2_path)

    # unteren Bereich ausschneiden
    box = (0, img1.height - compare_height, img1.width, img1.height)
    crop1 = img1.crop(box)
    crop2 = img2.crop(box)

    # Differenz berechnen
    diff = ImageChops.difference(crop1, crop2)
    diff_array = np.array(diff)

    # Anzahl unterschiedlicher Pixel
    changed_pixels = np.count_nonzero(diff_array)
    print(f"🔎 Vergleich: {changed_pixels} veränderte Pixel")

    return changed_pixels > threshold


def _crop_all_images(image_paths, output_dir):
    """Croppt alle Bilder - schneidet nur unten ab, Rest bleibt original."""
    
    print(f"🔪 Schneide {len(image_paths)} Bilder zu...")
    print(f"   Schneide nur {CROP_BOTTOM_OFFSET} Pixel unten ab, Rest bleibt original")
    
    cropped_paths = []
    
    for i, img_path in enumerate(image_paths):
        # Bild laden
        img = cv2.imread(img_path)
        if img is None:
            print(f"❌ Konnte {img_path} nicht laden")
            continue
            
        # Nur unten abschneiden, alles andere behalten
        original_height = img.shape[0]
        new_bottom = original_height - CROP_BOTTOM_OFFSET
        cropped = img[0:new_bottom, :]  # Von oben bis new_bottom, alle Spalten
        
        # Gecropptes Bild speichern
        filename = f"cropped_{i:03d}.png"
        output_path = os.path.join(output_dir, filename)
        cv2.imwrite(output_path, cropped)
        cropped_paths.append(output_path)
        
        print(f"   ✂️  {os.path.basename(img_path)} -> {filename} (Original: {original_height}px, Neu: {new_bottom}px)")
    
    print(f"📁 {len(cropped_paths)} beschnittene Bilder gespeichert in: shots_cropped/")
    return cropped_paths


def capture_and_crop_screenshots():
    """
    Macht Screenshots und croppt sie automatisch.
    
    Returns:
        tuple: (original_shots, cropped_shots) - Listen mit Dateipfaden
    """
    # shots_dir im selben Ordner wie das Python-Script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    shots_dir = os.path.join(script_dir, "shots")
    cropped_dir = os.path.join(script_dir, "shots_cropped")
    
    # Beide Ordner komplett leeren falls vorhanden
    for directory, name in [(shots_dir, "Screenshots"), (cropped_dir, "beschnittene Bilder")]:
        if os.path.exists(directory):
            print(f"🧹 Lösche alte {name}...")
            shutil.rmtree(directory)
    
    # Neue Ordner erstellen
    os.makedirs(shots_dir, exist_ok=True)
    os.makedirs(cropped_dir, exist_ok=True)
    print("📁 Ordner bereit für neue Screenshots")

    # Browser verstecken und Finanzguru aktivieren
    print("🪟 Verstecke Browser und aktiviere Finanzguru...")
    hide_browser_show_finanzguru()
    time.sleep(1)  # Kurz warten bis Fenster gewechselt haben

    x, y, w, h = find_finanzguru_window()

    # Fenster aktivieren
    click_x, click_y = x + 10, y + h // 2
    pyautogui.click(click_x, click_y)
    time.sleep(0.5)

    shots = []
    prev_path = None

    for i in range(MAX_FRAMES):
        path = os.path.join(shots_dir, f"shot_{i:03d}.png")
        capture_region_hq(x, y, w, h, path)

        if prev_path:
            if not has_changed(prev_path, path):
                print("⏹️  Kein neuer Inhalt mehr → Aufnahme beendet.")
                # Letzten doppelten Screenshot löschen
                os.remove(path)
                print(f"🗑️  Doppelten Screenshot entfernt: {os.path.basename(path)}")
                break
            else:
                print("✅ Neuer Inhalt erkannt, weiter scrollen...")
        
        # Screenshot nur zur Liste hinzufügen wenn er verwendet wird
        shots.append(path)

        scroll_down(x, y, w, h)
        time.sleep(DELAY)
        prev_path = path

    print(f"📸 {len(shots)} Screenshots erstellt")
    
    # Automatisches Cropping
    cropped_shots = _crop_all_images(shots, cropped_dir)
    
    # Browser wiederherstellen
    print("🔄 Stelle Browser wieder her...")
    restore_browser()
    
    return shots, cropped_shots




