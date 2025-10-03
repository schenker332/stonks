import os
import glob

from capture_scroll_hq import capture_and_crop_screenshots
from stitch_overlap import stitch_scroll_sequence

if __name__ == "__main__":
    # 1. Screenshots aufnehmen UND automatisch croppen 
    # original_shots, cropped_shots = capture_and_crop_screenshots()
    
    # 2. Bilder aus Ordner laden
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cropped_dir = os.path.join(script_dir, "shots_cropped")
    cropped_pattern = os.path.join(cropped_dir, "cropped_*.png")
    available_cropped = sorted(glob.glob(cropped_pattern))
    output_path = os.path.join(script_dir, "stitched.png")
    print(f"\n🔄 Füge {len(available_cropped)} Bilder zusammen...")
    
    # 3. Bilder zusammenfügen
    result = stitch_scroll_sequence(
        image_paths=available_cropped,  # Immer aus Ordner laden!
        output_path=output_path
    )
    
    print(f"✅ Erfolgreich zusammengefügt!")
    print(f"   📁 Ausgabe: {result['output_path']}")
    print(f"   📸 Bilder verwendet: {result['frames_used']}")
    if result['last_match_score'] is not None:
        print(f"   🎯 Letzte Übereinstimmung: {result['last_match_score']:.3f}")
        


