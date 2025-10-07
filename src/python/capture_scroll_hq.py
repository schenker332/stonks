import time
import os
import subprocess
import pyautogui
import shutil
import cv2
import json
import sys
import traceback
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


# === LOGGING HELPER ===
def log(level: str, message: str, **data):
    """Strukturiertes Logging für SSE Stream."""
    payload = {"level": level, "message": message}
    if data:
        payload["data"] = data
    print("LOG:", json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()


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
            log("info", "✅ Finanzguru-Fenster gefunden", x=int(b["X"]), y=int(b["Y"]), width=int(b["Width"]), height=int(b["Height"]))
            return int(b["X"]), int(b["Y"]), int(b["Width"]), int(b["Height"])
    


def capture_region_hq(x, y, w, h, out_path):
    """Macht HQ-Screenshot der Region (x,y,w,h) mit macOS screencapture und speichert das bild bei dem richtigen path."""
    cmd = [
        "screencapture",
        "-R", f"{x},{y},{w},{h}",
        "-t", "png",
        "-x",
        out_path
    ]
    subprocess.run(cmd, check=True)
    
    # Debug: Bildgröße nach Screenshot auslesen
    img = Image.open(out_path)
    log("debug", "📐 Screenshot-Größe", width=img.width, height=img.height, filesize_kb=round(os.path.getsize(out_path) / 1024, 2))


def scroll_down(x, y, w, h):
    """Bewegt Maus in Fenstermitte und scrollt um SCROLL_AMOUNT Pixel nach unten."""
    mid_x, mid_y = x + w//2, y + h//2
    pyautogui.moveTo(mid_x, mid_y, duration=0.2)
    ev = CGEventCreateScrollWheelEvent(None, kCGScrollEventUnitPixel, 1, SCROLL_AMOUNT)
    CGEventPost(kCGHIDEventTap, ev)


def has_changed(img1_path, img2_path, compare_height=200, threshold=20000):
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
    log("info", "🔎 Vergleich: veränderte Pixel", changed_pixels=int(changed_pixels), threshold=threshold)

    return changed_pixels > threshold


def crop_all_images(shots_path, cropped_path):
    """
    Croppt Screenshots: entfernt unteren Rand (CROP_BOTTOM_OFFSET px).

    shots_path: Verzeichnis mit Original-Bildern (shot_XXX.png)
    cropped_path: Zielverzeichnis für cropped_XXX.png Dateien
    """

    # Alle PNG-Dateien aus shots_path holen und sortieren
    image_files = sorted([f for f in os.listdir(shots_path) if f.endswith('.png')])
    
    for i, img_filename in enumerate(image_files):
        img_path = os.path.join(shots_path, img_filename)
        # Bild laden
        img = cv2.imread(img_path)
            
        # Nur unten abschneiden, alles andere behalten
        original_height = img.shape[0]
        new_bottom = original_height - CROP_BOTTOM_OFFSET
        cropped = img[0:new_bottom, :]  # Von oben bis new_bottom, alle Spalten
        
        # Gecropptes Bild speichern
        filename = f"cropped_{i:03d}.png"
        output_path = os.path.join(cropped_path, filename)
        cv2.imwrite(output_path, cropped)

        log("info", "✂️ Bild zugeschnitten", filename=filename)
    
    log("info", "📁 Cropping abgeschlossen")



def capture_and_crop_screenshots(shots_path, cropped_path):

    log("info", "🚀 Starte Capture & Crop Pipeline")

    # Browser verstecken und Finanzguru aktivieren
    hide_browser_show_finanzguru()
    time.sleep(0.3)  # Kurz warten bis Fenster gewechselt haben
    x, y, w, h = find_finanzguru_window() #hier wird wirklich gespeichert
    
    # Summary: Finanzguru-Fenster (für Dashboard)
    log("summary", "🖥️ Finanzguru-Fenster", x=x, y=y, width=w, height=h)
    
    time.sleep(0.5)

    prev_path = None
    total_shots = 0

    for i in range(MAX_FRAMES):
        path = os.path.join(shots_path, f"shot_{i:03d}.png")
        # speichert die Screenshots in shots_path/
        capture_region_hq(x, y, w, h, path)
        log("info", "📸 Screenshot aufgenommen", index=i, filename=f"shot_{i:03d}.png")

        if prev_path:
            if not has_changed(prev_path, path):
                log("info", "⏹️ Kein neuer Inhalt mehr → Aufnahme beendet. Doppelter Screenshot entfernt", filename=os.path.basename(path))
                os.remove(path)
                break
            else:
                log("info", "✅ Neuer Inhalt erkannt, weiter scrollen")
        
        # scrollt
        scroll_down(x, y, w, h)
        time.sleep(DELAY)
        prev_path = path
        total_shots += 1

    log("info", "📸 Screenshot-Aufnahme abgeschlossen", total_shots=total_shots)
    # Browser wiederherstellen
    restore_browser()
    # Automatisches Cropping - speichert in cropped_path/
    crop_all_images(shots_path, cropped_path)
    log("info", "✅ Capture & Crop erfolgreich abgeschlossen")





##### hier wird nur aus paths geladen - keine echten numpy arrays 

