import os
import shutil

from capture_scroll_hq import capture_and_crop_screenshots
from stitch_overlap import stitch_scroll_sequence
from ocr_extract import ocr_extract

script_path = os.path.dirname(os.path.abspath(__file__))
shots_path = os.path.join(script_path, "shots")
cropped_path = os.path.join(script_path, "shots_cropped")

debug_path = os.path.join(script_path, "debug", "stitch")

stitched_path = os.path.join(script_path, "stitched.png")
    
def run_pipeline():

    # 1. Alte Ordner löschen, wenn sie existieren
    for directory, description in [(shots_path, "Screenshots"), (cropped_path, "beschnittene Bilder")]:
        if os.path.exists(directory):
            shutil.rmtree(directory)

    # 2. Neue Ordner erstellen
    os.makedirs(shots_path, exist_ok=True)
    os.makedirs(cropped_path, exist_ok=True)

    # 3. Screenshots aufnehmen und croppen (speichert in shots_path und cropped_path)
    capture_and_crop_screenshots(shots_path, cropped_path)

    # 4. Gecroppte Bilder zu einem langen Bild zusammenfügen (speichert in stitched_path)
    #   Die Debug-Bilder werden im debug_path gespeichert 
    stitch_scroll_sequence(cropped_path, stitched_path, debug_path)

    # 5. OCR auf dem langen Bild ausführen und Ergebnis zurückgeben
    ocr_result = ocr_extract(stitched_path, debug_path)
    return ocr_result


if __name__ == "__main__":
    run_pipeline()