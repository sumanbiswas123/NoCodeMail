import json
import os

f_zig = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1)_design.json"
f_py  = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_python\PM-MY-SGX-EML-250072 (1)_design.json"
if not os.path.exists(f_py):
    # fallback to original python folder if present
    f_py = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1)_design.json.bak"

with open(f_zig, "r", encoding="utf-8") as f:
    d_zig = json.load(f)

page = d_zig["pages"][0]
print("=== NEW ZIG EXTRACTION RESULTS ===")
print("Canvas:", page["canvas_width_pt"], "x", page["canvas_height_pt"])
print("Background cards count:", len(page.get("background_cards", [])))
for c in page.get("background_cards", [])[:5]:
    print("  card:", c)

elements = page.get("elements", [])
imgs = [e for e in elements if e["type"] == "image"]
texts = [e for e in elements if e["type"] == "text_block"]
print(f"\nTotal elements: {len(elements)} (Images: {len(imgs)}, Text Blocks: {len(texts)})")

print("\n--- Sample Images with Hyperlinks ---")
for img in imgs[:5]:
    print(" ", img.get("asset_path"), "bbox:", img.get("bbox"), "link:", img.get("hyperlink"))

print("\n--- Sample Clustered Text Blocks ---")
for i, t in enumerate(texts[:5]):
    top_val = t.get("top", 0.0)
    print(f"[{i+1}] Top: {top_val:.1f}, DomColor: {t.get('dominant_color')}, ContainerColor: {t.get('parent_container_color')}")
    print(f"    Raw: {t.get('raw_text')[:100]}...")
    lines = t.get("lines", [])
    print(f"    Lines: {len(lines)}")
    if lines and lines[0].get("spans"):
        print(f"    First span text: {lines[0]['spans'][0].get('text')}, bold: {lines[0]['spans'][0].get('bold')}, super: {lines[0]['spans'][0].get('superscript')}")

colors = {}
for t in texts:
    c = t.get("parent_container_color")
    colors[c] = colors.get(c, 0) + 1
print("\nParent Container Colors distribution in text blocks:", colors)
