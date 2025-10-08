import time
import os
import subprocess
import pyautogui
import shutil
import cv2
import json
import sys
import traceback
from datetime import datetime, UTC
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
STEP_NAME = "capture"


def log(level: str, message: str, step: str | None = STEP_NAME, **data):
    """Strukturiertes Logging für SSE Stream."""
    payload = {
        "level": level,
        "message": message,
        "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }
    if step:
        payload["step"] = step
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
    try:
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
        result = subprocess.run(["osascript", "-e", applescript], capture_output=True, text=True)
        if result.returncode != 0:
            log("warning", "⚠️ AppleScript hatte Fehler", stderr=result.stderr)
        else:
            log("info", "✅ Fenster erfolgreich gewechselt")
    except Exception as e:
        log("error", "❌ Fehler beim Fensterwechsel", error=str(e), traceback=traceback.format_exc())
        raise


def restore_browser():
    """Stellt Browser-Fenster wieder her."""
    try:
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
        result = subprocess.run(["osascript", "-e", applescript], capture_output=True, text=True)
        if result.returncode != 0:
            log("warning", "⚠️ Konnte Browser nicht wiederherstellen", stderr=result.stderr)
        else:
            log("info", "✅ Browser wiederhergestellt")
    except Exception as e:
        log("warning", "⚠️ Fehler beim Wiederherstellen des Browsers (nicht kritisch)", error=str(e))


def find_finanzguru_window():
    """Findet das Finanzguru-Fenster und gibt (x, y, width, height) zurück."""
    try:
        infos = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID)
        for win in infos:
            if win.get("kCGWindowOwnerName") == "Finanzguru":
                b = win["kCGWindowBounds"]
                log("info", "✅ Finanzguru-Fenster gefunden", x=int(b["X"]), y=int(b["Y"]), width=int(b["Width"]), height=int(b["Height"]))
                return int(b["X"]), int(b["Y"]), int(b["Width"]), int(b["Height"])
        log("error", "❌ Finanzguru-Fenster nicht gefunden")
        raise RuntimeError("Finanzguru-Fenster nicht in der Fensterliste gefunden")
    except Exception as e:
        log("error", "❌ Fehler beim Suchen des Finanzguru-Fensters", error=str(e), traceback=traceback.format_exc())
        raise
    


def capture_region_hq(x, y, w, h, out_path):
    """Macht HQ-Screenshot der Region (x,y,w,h) mit macOS screencapture und speichert das bild bei dem richtigen path."""
    try:
        cmd = [
            "screencapture",
            "-R", f"{x},{y},{w},{h}",
            "-t", "png",
            "-x",
            out_path
        ]
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        
        # Prüfen ob Datei wirklich erstellt wurde
        if not os.path.exists(out_path):
            raise RuntimeError(f"Screenshot-Datei wurde nicht erstellt: {out_path}")
        
        # Debug: Bildgröße nach Screenshot auslesen
        img = Image.open(out_path)
        log(
            "info",
            "📐 Screenshot-Größe",
            width=img.width,
            height=img.height,
            filesize_kb=round(os.path.getsize(out_path) / 1024, 2),
        )
    except subprocess.CalledProcessError as e:
        log("error", "❌ screencapture Befehl fehlgeschlagen", error=str(e), stderr=e.stderr)
        raise
    except Exception as e:
        log("error", "❌ Fehler beim Screenshot aufnehmen", error=str(e), traceback=traceback.format_exc())
        raise


def scroll_down(x, y, w, h):
    """Bewegt Maus in Fenstermitte und scrollt um SCROLL_AMOUNT Pixel nach unten."""
    try:
        mid_x, mid_y = x + w//2, y + h//2
        log("info", "🖱️ Bewege Maus zu Fenstermitte", x=mid_x, y=mid_y)
        pyautogui.moveTo(mid_x, mid_y, duration=0.2)
        
        log("info", "⏬ Scrolle nach unten", pixels=SCROLL_AMOUNT)
        ev = CGEventCreateScrollWheelEvent(None, kCGScrollEventUnitPixel, 1, SCROLL_AMOUNT)
        if ev is None:
            raise RuntimeError("CGEventCreateScrollWheelEvent hat None zurückgegeben")
        CGEventPost(kCGHIDEventTap, ev)
        log("info", "✅ Scroll-Event erfolgreich gesendet")
    except Exception as e:
        log("error", "❌ Fehler beim Scrollen", error=str(e), traceback=traceback.format_exc())
        raise


def has_changed(img1_path, img2_path, compare_height=200, threshold=20000):
    """Vergleicht die unteren compare_height Pixel von zwei Screenshots."""
    try:
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
        log(
            "info",
            "🔎 Vergleich: veränderte Pixel",
            changed_pixels=int(changed_pixels),
            threshold=threshold,
        )

        return changed_pixels > threshold
    except Exception as e:
        log("error", "❌ Fehler beim Bildvergleich", error=str(e), img1=img1_path, img2=img2_path, traceback=traceback.format_exc())
        raise


def crop_all_images(shots_path, cropped_path):
    """
    Croppt Screenshots: entfernt unteren Rand (CROP_BOTTOM_OFFSET px).

    shots_path: Verzeichnis mit Original-Bildern (shot_XXX.png)
    cropped_path: Zielverzeichnis für cropped_XXX.png Dateien
    """
    try:
        # Alle PNG-Dateien aus shots_path holen und sortieren
        image_files = sorted([f for f in os.listdir(shots_path) if f.endswith('.png')])
        log("info", "📂 Starte Cropping", total_images=len(image_files))
        
        for i, img_filename in enumerate(image_files):
            try:
                img_path = os.path.join(shots_path, img_filename)
                # Bild laden
                img = cv2.imread(img_path)
                
                if img is None:
                    log("error", "❌ Konnte Bild nicht laden", filename=img_filename)
                    continue
                    
                # Nur unten abschneiden, alles andere behalten
                original_height = img.shape[0]
                new_bottom = original_height - CROP_BOTTOM_OFFSET
                cropped = img[0:new_bottom, :]  # Von oben bis new_bottom, alle Spalten
                
                # Gecropptes Bild speichern
                filename = f"cropped_{i:03d}.png"
                output_path = os.path.join(cropped_path, filename)
                cv2.imwrite(output_path, cropped)

                log("info", "✂️ Bild zugeschnitten", filename=filename)
            except Exception as e:
                log("error", "❌ Fehler beim Croppen eines Bildes", filename=img_filename, error=str(e))
                raise
        

    except Exception as e:
        log("error", "❌ Fehler beim Cropping", error=str(e), traceback=traceback.format_exc())
        raise



def capture_and_crop_screenshots(shots_path, cropped_path):
    try:
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
            try:
                path = os.path.join(shots_path, f"shot_{i:03d}.png")
                log("info", "🎬 Starte Screenshot-Aufnahme", index=i, frame=f"{i+1}/{MAX_FRAMES}")
                
                # speichert die Screenshots in shots_path/
                capture_region_hq(x, y, w, h, path)
                log("info", "📸 Screenshot aufgenommen", index=i, filename=f"shot_{i:03d}.png")

                if prev_path:
                    if not has_changed(prev_path, path):
                        log(
                            "info",
                            "⏹️ Kein neuer Inhalt mehr → Aufnahme beendet. Doppelter Screenshot entfernt",
                            filename=os.path.basename(path),
                        )
                        os.remove(path)
                        break
                    else:
                        log("info", "✅ Neuer Inhalt erkannt, weiter scrollen")
                
                # scrollt
                scroll_down(x, y, w, h)
                log("info", "⏬ Gescrollt, warte auf nächsten Screenshot")
                time.sleep(DELAY)
                prev_path = path
                total_shots += 1
            except Exception as e:
                log("error", "❌ Fehler bei Screenshot-Iteration", index=i, error=str(e), traceback=traceback.format_exc())
                raise

        log("info", "📸 Screenshot-Aufnahme abgeschlossen", total_shots=total_shots)
        # Browser wiederherstellen
        restore_browser()
        # Automatisches Cropping - speichert in cropped_path/
        crop_all_images(shots_path, cropped_path)
        log("info", "✅ Capture & Crop erfolgreich abgeschlossen")
    except Exception as e:
        log("error", "❌ Capture & Crop Pipeline fehlgeschlagen", error=str(e), traceback=traceback.format_exc())
        # Versuche trotzdem Browser wiederherzustellen
        try:
            restore_browser()
        except:
            pass
        raise





##### hier wird nur aus paths geladen - keine echten numpy arrays 
