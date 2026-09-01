import os
import json
from PIL import Image

dir_oxide = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_pdfoxide"
dir_pymupdf = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package"

def inspect_pkg(name, d):
    print(f"==================== {name} ====================")
    json_file = os.path.join(d, "PM-MY-SGX-EML-250072 (1)_design.json")
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print("Specs:", data.get("target_email_specs"))
    page = data["pages"][0]
    print(f"Page Canvas Pt: {page.get('canvas_width_pt')} x {page.get('canvas_height_pt')}")
    print(f"Preview Pixels: {page.get('preview_pixel_width')} x {page.get('preview_pixel_height')}")
    print(f"Top-level page keys: {list(page.keys())}")
    
    if "background_cards" in page:
        print(f"Background cards count: {len(page['background_cards'])}")
        for c in page['background_cards'][:5]:
            print("  card:", c)
    else:
        print("Background cards: NONE")
        
    elements = page.get("elements", [])
    print(f"Total Elements: {len(elements)}")
    
    img_elems = [e for e in elements if e.get("type") == "image"]
    text_elems = [e for e in elements if e.get("type") == "text_block"]
    print(f"  Image elements: {len(img_elems)}")
    print(f"  Text elements: {len(text_elems)}")
    
    print("\nSample 3 Image Elements:")
    for img in img_elems[:3]:
        print(" ", json.dumps(img))
        
    print("\nSample 3 Text Elements:")
    for t in text_elems[:3]:
        # print condensed
        print(" ", {k: v for k, v in t.items() if k not in ["lines"]})
        if "lines" in t and len(t["lines"]) > 0:
            print("    first line spans:", t["lines"][0].get("spans", [])[:2])
            
    # Check parent_container_colors distribution
    colors = {}
    for t in text_elems:
        c = t.get("parent_container_color")
        colors[c] = colors.get(c, 0) + 1
    print("\nParent Container Colors distribution in text blocks:", colors)
    
    # Check CTA detection
    ctas = [t for t in text_elems if t.get("is_cta_button")]
    print(f"CTA Button elements count: {len(ctas)}")
    for cta in ctas:
        print("  CTA:", cta.get("raw_text"), cta.get("parent_container_color"), cta.get("dominant_color"))

    # Check preview image resolution
    prev_img_path = os.path.join(d, page.get("page_preview_image", "page_2_preview.png"))
    if os.path.exists(prev_img_path):
        with Image.open(prev_img_path) as im:
            print(f"\nActual Preview Image File Size: {im.size}, mode: {im.mode}")
            
    # Check asset image dimensions
    assets_dir = os.path.join(d, "assets")
    if os.path.exists(assets_dir):
        print(f"\nAssets dimensions (first 5):")
        for af in sorted(os.listdir(assets_dir))[:5]:
            ap = os.path.join(assets_dir, af)
            try:
                with Image.open(ap) as im:
                    print(f"  {af}: {im.size}, mode={im.mode}")
            except Exception as e:
                print(f"  {af}: err {e}")

inspect_pkg("PDFOXIDE / ZIG", dir_oxide)
print("\n")
inspect_pkg("PYMUPDF / PYTHON", dir_pymupdf)
