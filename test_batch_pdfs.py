import os, json

pdfs = [
    r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1).pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\cp-488747v2_R0_V1.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\cp-431461v4_JANP-112642_R0_V3.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\ZEJULA PARPi Connectors Program Invite 2026 MY.pdf",
]

for pdf in pdfs:
    print(f"\n=======================================================")
    print(f"Testing PDF: {os.path.basename(pdf)}")
    cmd = f'.\\zig-out\\bin\\nocodemail.exe --extract "{pdf}" --page 1'
    res = os.system(cmd)
    
    base = os.path.splitext(os.path.basename(pdf))[0]
    pkg_dir = os.path.join(os.path.dirname(pdf), f"{base}_ai_package")
    json_path = os.path.join(pkg_dir, f"{base}_design.json")
    
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            d = json.load(f)
        page = d["pages"][0]
        elements = page.get("elements", [])
        imgs = [e for e in elements if e["type"] == "image"]
        texts = [e for e in elements if e["type"] == "text_block"]
        bg_cards = page.get("background_cards", [])
        links_with_url = [e for e in elements if e.get("hyperlink")]
        
        print(f"SUCCESS: Exit={res}")
        print(f"  Canvas: {page.get('canvas_width_pt'):.1f} x {page.get('canvas_height_pt'):.1f}")
        print(f"  Images: {len(imgs)} (Links: {len([img for img in imgs if img.get('hyperlink')])})")
        print(f"  Text Blocks: {len(texts)} (Links: {len([t for t in texts if any(sp.get('hyperlink') for l in t.get('lines',[]) for sp in l.get('spans',[]))])})")
        print(f"  Background Cards: {len(bg_cards)}")
        if bg_cards:
            print(f"    Cards: {[c.get('fill_color') for c in bg_cards[:4]]}")
        if texts:
            print(f"  Sample Text 1: {texts[0].get('raw_text')[:70]}... (Color: {texts[0].get('dominant_color')}, Bg: {texts[0].get('parent_container_color')})")
    else:
        print(f"FAILED to produce JSON: {json_path}")
