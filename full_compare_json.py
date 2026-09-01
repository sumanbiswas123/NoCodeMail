import json

f_zig = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1)_design.json"
f_py  = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_python\PM-MY-SGX-EML-250072 (1)_design.json"

with open(f_zig, "r", encoding="utf-8") as f:
    d_zig = json.load(f)
with open(f_py, "r", encoding="utf-8") as f:
    d_py = json.load(f)

p_zig = d_zig["pages"][0]
p_py = d_py["pages"][0]

print("==================== 1. CANVAS & METRICS ====================")
print(f"Canvas (Zig):    {p_zig['canvas_width_pt']:.1f} x {p_zig['canvas_height_pt']:.1f} pt (Preview: {p_zig['preview_pixel_width']}x{p_zig['preview_pixel_height']})")
print(f"Canvas (Python): {p_py['canvas_width_pt']:.1f} x {p_py['canvas_height_pt']:.1f} pt (Preview: {p_py['preview_pixel_width']}x{p_py['preview_pixel_height']})")

print("\n==================== 2. BACKGROUND CARDS ====================")
bg_zig = p_zig.get("background_cards", [])
bg_py  = p_py.get("background_cards", [])
print(f"Zig Cards Count:    {len(bg_zig)}")
print(f"Python Cards Count: {len(bg_py)}")
print("\nZig Cards (first 6):")
for c in bg_zig[:6]:
    print(" ", c)
print("\nPython Cards (first 6):")
for c in bg_py[:6]:
    print(" ", c)

print("\n==================== 3. ELEMENTS SUMMARY ====================")
elems_zig = p_zig.get("elements", [])
elems_py  = p_py.get("elements", [])

imgs_zig = [e for e in elems_zig if e["type"] == "image"]
imgs_py  = [e for e in elems_py if e["type"] == "image"]
texts_zig = [e for e in elems_zig if e["type"] == "text_block"]
texts_py  = [e for e in elems_py if e["type"] == "text_block"]

print(f"Total Elements: Zig={len(elems_zig)}, Python={len(elems_py)}")
print(f"Images:         Zig={len(imgs_zig)}, Python={len(imgs_py)}")
print(f"Text Blocks:    Zig={len(texts_zig)}, Python={len(texts_py)}")

print("\n==================== 4. HYPERLINKS ON IMAGES ====================")
for i, (iz, ip) in enumerate(zip(imgs_zig, imgs_py)):
    link_z = iz.get("hyperlink")
    link_p = ip.get("hyperlink")
    print(f"Image [{i+1}] {iz.get('asset_path')}:")
    print(f"  Zig Link:    {link_z[:80] if link_z else None}")
    print(f"  Python Link: {link_p[:80] if link_p else None}")

print("\n==================== 5. CONTAINER COLOR DISTRIBUTION ====================")
colors_zig = {}
for t in texts_zig:
    c = t.get("parent_container_color")
    colors_zig[c] = colors_zig.get(c, 0) + 1

colors_py = {}
for t in texts_py:
    c = t.get("parent_container_color")
    colors_py[c] = colors_py.get(c, 0) + 1

print(f"Zig text container colors:    {colors_zig}")
print(f"Python text container colors: {colors_py}")

print("\n==================== 6. SAMPLE TEXT BLOCKS ====================")
for i in range(min(5, len(texts_zig), len(texts_py))):
    tz = texts_zig[i]
    tp = texts_py[i]
    print(f"\n--- Block [{i+1}] ---")
    print(f"Zig:    (Top={tz['top']:.1f}, Lines={len(tz.get('lines',[]))}, Bg={tz.get('parent_container_color')}, DomColor={tz.get('dominant_color')})")
    print(f"        Text: {tz.get('raw_text')[:90]}...")
    print(f"Python: (Top={tp['top']:.1f}, Lines={len(tp.get('lines',[]))}, Bg={tp.get('parent_container_color')}, DomColor={tp.get('dominant_color')})")
    print(f"        Text: {tp.get('raw_text')[:90]}...")
