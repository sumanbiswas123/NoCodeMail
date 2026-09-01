import json

p_py = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_python\PM-MY-SGX-EML-250072 (1)_design.json"
p_zig = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1)_design.json"

with open(p_py, "r", encoding="utf-8") as f:
    d_py = json.load(f)
with open(p_zig, "r", encoding="utf-8") as f:
    d_zig = json.load(f)

page_py = d_py["pages"][0]
page_zig = d_zig["pages"][0]

print("=" * 80)
print("1. CANVAS & SPECIFICATIONS")
print("=" * 80)
print(f"Canvas (PyMuPDF): {page_py.get('canvas_width_pt')} x {page_py.get('canvas_height_pt')} pt")
print(f"Canvas (PDFium):  {page_zig.get('canvas_width_pt')} x {page_zig.get('canvas_height_pt')} pt")

print("\n" + "=" * 80)
print("2. BACKGROUND CARDS")
print("=" * 80)
cards_py = page_py.get("background_cards", [])
cards_zig = page_zig.get("background_cards", [])
print(f"Count: Python={len(cards_py)} | Zig={len(cards_zig)}")
for i, c in enumerate(cards_zig):
    print(f"  Zig Card {i+1}: bbox={c.get('bbox')} | fill={c.get('fill_color')}")

print("\n" + "=" * 80)
print("3. IMAGES EXTRACTION (15 Images)")
print("=" * 80)
imgs_py = [e for e in page_py.get("elements", []) if e.get("type") == "image"]
imgs_zig = [e for e in page_zig.get("elements", []) if e.get("type") == "image"]
print(f"Count: Python={len(imgs_py)} | Zig={len(imgs_zig)}")
for i in range(max(len(imgs_py), len(imgs_zig))):
    ip = imgs_py[i] if i < len(imgs_py) else {}
    iz = imgs_zig[i] if i < len(imgs_zig) else {}
    print(f"Image {i+1:02d}:")
    print(f"  Py:  path={ip.get('asset_path')} | bbox={ip.get('bbox')} | w_px={ip.get('width_px')} | link={ip.get('hyperlink') is not None}")
    print(f"  Zig: path={iz.get('asset_path')} | bbox={iz.get('bbox')} | w_px={iz.get('width_px')} | link={iz.get('hyperlink') is not None}")

print("\n" + "=" * 80)
print("4. TEXT BLOCKS & READING ORDER")
print("=" * 80)
texts_py = [e for e in page_py.get("elements", []) if e.get("type") == "text_block"]
texts_zig = [e for e in page_zig.get("elements", []) if e.get("type") == "text_block"]
print(f"Count: Python={len(texts_py)} | Zig={len(texts_zig)}")

print("\nFirst 6 Zig Text Blocks vs Python:")
for i in range(min(6, len(texts_zig))):
    iz = texts_zig[i]
    ip = texts_py[i] if i < len(texts_py) else {}
    print(f"\n[Block {i+1}]")
    print(f"  Zig: bbox={iz.get('bbox')} | color={iz.get('dominant_color')} | cta={iz.get('is_cta_button')} | parent_card={iz.get('parent_container_color')}")
    print(f"       text: {repr(iz.get('raw_text')[:80])}")
    if ip:
        print(f"  Py:  bbox={ip.get('bbox')} | color={ip.get('dominant_color')} | cta={ip.get('is_cta_button')} | parent_card={ip.get('parent_container_color')}")
        print(f"       text: {repr(ip.get('raw_text')[:80])}")
