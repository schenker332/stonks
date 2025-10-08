import json
import os
import shutil
import sys
from datetime import datetime, UTC

from capture_scroll_hq import capture_and_crop_screenshots
from stitch_overlap import stitch_scroll_sequence
from ocr_extract import ocr_extract

script_path = os.path.dirname(os.path.abspath(__file__))
shots_path = os.path.join(script_path, "shots")
cropped_path = os.path.join(script_path, "shots_cropped")

debug_stitch_path = os.path.join(script_path, "debug", "stitch")
debug_ocr_path = os.path.join(script_path, "debug")

stitched_path = os.path.join(script_path, "stitched.png")
data_dir = os.path.abspath(os.path.join(script_path, "..", "..", "data"))
latest_items_path = os.path.join(data_dir, "ocr-latest.json")


def log(level: str, message: str, step: str | None = None, **data):
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


def save_latest_items(items):
    try:
        os.makedirs(data_dir, exist_ok=True)
        with open(latest_items_path, "w", encoding="utf-8") as handle:
            json.dump(items, handle, ensure_ascii=False, indent=2)
        log("info", "💾 OCR Items gespeichert", step="ocr", count=len(items))
    except Exception as exc:
        log("error", "❌ Konnte OCR Items nicht speichern", step="ocr", error=str(exc))


def run_pipeline():
    try:
        log("info", "🚀 Pipeline gestartet")

        # 1. Alte Ordner löschen, wenn sie existieren
        try:
            for directory, description in [(shots_path, "Screenshots"), (cropped_path, "beschnittene Bilder")]:
                if os.path.exists(directory):
                    shutil.rmtree(directory)
                    log("info", f"🗑️ {description} gelöscht", path=directory)
        except Exception as e:
            log("error", "❌ Fehler beim Löschen alter Ordner", error=str(e))
            raise

        # 2. Neue Ordner erstellen
        try:
            os.makedirs(shots_path, exist_ok=True)
            os.makedirs(cropped_path, exist_ok=True)
            log("info", "📁 Ordner erstellt")
        except Exception as e:
            log("error", "❌ Fehler beim Erstellen der Ordner", error=str(e))
            raise

        # 3. Screenshots aufnehmen und croppen (speichert in shots_path und cropped_path)
        try:
            log("info", "📸 Starte Screenshot-Phase", step="capture")
            capture_and_crop_screenshots(shots_path, cropped_path)
        except Exception as e:
            log("error", "❌ Screenshot-Phase fehlgeschlagen", step="capture", error=str(e))
            raise

        # 4. Gecroppte Bilder zu einem langen Bild zusammenfügen (speichert in stitched_path)
        #   Die Debug-Bilder werden im debug_stitch_path gespeichert 
        try:
            log("info", "🧵 Starte Stitch-Phase", step="stitch")
            stitch_scroll_sequence(cropped_path, stitched_path, debug_stitch_path)
        except Exception as e:
            log("error", "❌ Stitch-Phase fehlgeschlagen", step="stitch", error=str(e))
            raise

        # 5. OCR auf dem langen Bild ausführen und Ergebnis zurückgeben
        #   Die Debug-Bilder werden im debug_ocr_path gespeichert
        try:
            log("info", "🧠 Starte OCR-Phase", step="ocr")
            ocr_result = ocr_extract(stitched_path, debug_ocr_path)
            save_latest_items(ocr_result)
        except Exception as e:
            log("error", "❌ OCR-Phase fehlgeschlagen", step="ocr", error=str(e))
            raise

        log("info", "✅ Pipeline abgeschlossen")
        return ocr_result
        
    except Exception as e:
        log("error", "❌ Pipeline mit Fehler beendet", error=str(e))
        raise


if __name__ == "__main__":
    try:
        run_pipeline()
    except Exception as e:
        log("error", "❌ Kritischer Fehler", error=str(e))
        sys.exit(1)


        
