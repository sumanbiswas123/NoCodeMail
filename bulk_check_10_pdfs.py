import os, sys, subprocess, json, time, shutil

# Remove any old garbled test folders
for item in os.listdir(r"C:\Users\SumanBiswas\Downloads\PDFs"):
    if "ai_package" in item and "" in item:
        shutil.rmtree(os.path.join(r"C:\Users\SumanBiswas\Downloads\PDFs", item), ignore_errors=True)

pdf_list = [
    r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1).pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\cp-488747v2_R0_V1.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\cp-431461v4_JANP-112642_R0_V3.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\ZEJULA PARPi Connectors Program Invite 2026 MY.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\AMR & WAAW 2025- HCP Mass Email 2 - Peru - Augmentin1.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\Augmentin Monsoon TON Mass emailer_June 2026.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\Email Shingrix - Bidirecionalidade HZ - Endócrino - Julho-2026.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\NX-IN-ID-EML-250012 1 (1).pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\PM-BR-BPR-EML-260014_0.5.pdf",
    r"C:\Users\SumanBiswas\Downloads\PDFs\PM-PE-ACA-EML-250023_0.6.pdf",
]

exe = r"C:\Users\SumanBiswas\Downloads\NoCodeMail\zig-out\bin\nocodemail.exe"

results = []

print("=" * 90)
print(f"BULK EXTRACTION & VALIDATION BENCHMARK (10/10 REAL-WORLD PDFS)")
print("=" * 90)

for idx, pdf in enumerate(pdf_list):
    name = os.path.basename(pdf)
    if not os.path.exists(pdf):
        print(f"[{idx+1:02d}] SKIPPED: {name}")
        continue
    
    t0 = time.time()
    cmd = [exe, "--extract", pdf, "--page", "1"]
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    dur = (time.time() - t0) * 1000
    
    base = os.path.splitext(name)[0]
    pkg_dir = os.path.join(os.path.dirname(pdf), f"{base}_ai_package")
    json_path = os.path.join(pkg_dir, f"{base}_design.json")
    
    status = "SUCCESS" if os.path.exists(json_path) else "FAILED"
    
    images_count = 0
    texts_count = 0
    cards_count = 0
    links_count = 0
    canvas_w = 0
    canvas_h = 0
    preview_exists = False
    
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            page = data["pages"][0]
            canvas_w = page.get("canvas_width_pt", 0)
            canvas_h = page.get("canvas_height_pt", 0)
            elems = page.get("elements", [])
            imgs = [e for e in elems if e.get("type") == "image"]
            txts = [e for e in elems if e.get("type") == "text_block"]
            bg_cards = page.get("background_cards", [])
            
            images_count = len(imgs)
            texts_count = len(txts)
            cards_count = len(bg_cards)
            
            for e in elems:
                if e.get("hyperlink"):
                    links_count += 1
                if e.get("lines"):
                    for l in e["lines"]:
                        for sp in l.get("spans", []):
                            if sp.get("hyperlink"):
                                links_count += 1
            
            prev_img = page.get("page_preview_image")
            if prev_img and os.path.exists(os.path.join(pkg_dir, prev_img)):
                preview_exists = True
        except Exception as ex:
            status = f"JSON_ERR ({ex})"
            
    res_item = {
        "index": idx + 1,
        "name": name,
        "status": status,
        "time_ms": dur,
        "canvas": f"{canvas_w:.1f}x{canvas_h:.1f}",
        "images": images_count,
        "texts": texts_count,
        "cards": cards_count,
        "links": links_count,
        "preview_ok": preview_exists,
        "json_size_kb": os.path.getsize(json_path) / 1024 if os.path.exists(json_path) else 0
    }
    results.append(res_item)
    print(f"[{idx+1:02d}/10] {status:<7} | {dur:6.1f}ms | Imgs:{images_count:2d} | Texts:{texts_count:3d} | Cards:{cards_count:2d} | Links:{links_count:2d} | Canvas:{canvas_w:5.1f}x{canvas_h:5.1f} | {name[:36]}")

print("\n" + "=" * 90)
print("BULK VALIDATION SUMMARY TABLE (10/10)")
print("=" * 90)
print(f"{'#':<3} | {'Status':<7} | {'Speed':<8} | {'Images':<6} | {'Texts':<6} | {'Cards':<6} | {'Links':<6} | {'JSON Size':<10} | {'PDF Name'}")
print("-" * 90)
for r in results:
    print(f"{r['index']:<3} | {r['status']:<7} | {r['time_ms']:5.0f} ms | {r['images']:<6} | {r['texts']:<6} | {r['cards']:<6} | {r['links']:<6} | {r['json_size_kb']:6.1f} KB  | {r['name']}")
print("=" * 90)
