import os, sys, subprocess, json, time, shutil

# Ensure pdftoppt directory is in sys.path
sys.path.insert(0, r"C:\Users\SumanBiswas\Downloads\pdftoppt")
from json_extractor import AIDesignPackageExtractor

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

zig_exe = r"C:\Users\SumanBiswas\Downloads\NoCodeMail\zig-out\bin\nocodemail.exe"
py_out_root = r"C:\Users\SumanBiswas\Downloads\PDFs\batch_eval_python"
zig_out_root = r"C:\Users\SumanBiswas\Downloads\PDFs\batch_eval_zig"

os.makedirs(py_out_root, exist_ok=True)
os.makedirs(zig_out_root, exist_ok=True)

py_extractor = AIDesignPackageExtractor()
comparison_results = []

for idx, pdf in enumerate(pdf_list):
    name = os.path.basename(pdf)
    base = os.path.splitext(name)[0]
    
    # 1. PYTHON
    t0_py = time.time()
    try:
        py_pkg, py_json_path = py_extractor.extract(pdf, output_dir=py_out_root, select_pages_str="1", email_width=700)
        py_dur = (time.time() - t0_py) * 1000
    except Exception as e:
        py_dur = 0
        py_json_path = None

    # 2. ZIG
    t0_zig = time.time()
    zig_pkg_dir = os.path.join(zig_out_root, f"{base}_ai_package")
    zig_json_path = os.path.join(zig_pkg_dir, f"{base}_design.json")
    p = subprocess.run([zig_exe, "--extract", pdf, "--page", "1", "--out", zig_out_root], capture_output=True, text=True, encoding="utf-8")
    zig_dur = (time.time() - t0_zig) * 1000

    # 3. PARSE
    py_data, zig_data = None, None
    if py_json_path and os.path.exists(py_json_path):
        with open(py_json_path, "r", encoding="utf-8") as f:
            py_data = json.load(f)
    if os.path.exists(zig_json_path):
        with open(zig_json_path, "r", encoding="utf-8") as f:
            zig_data = json.load(f)

    py_imgs, zig_imgs = 0, 0
    py_texts, zig_texts = 0, 0
    py_cards, zig_cards = 0, 0
    py_links, zig_links = 0, 0
    py_canvas, zig_canvas = "-", "-"

    if py_data:
        p0 = py_data["pages"][0]
        py_canvas = f"{p0.get('canvas_width_pt',0):.1f}x{p0.get('canvas_height_pt',0):.1f}"
        elems = p0.get("elements", [])
        py_imgs = len([e for e in elems if e.get("type") == "image"])
        py_texts = len([e for e in elems if e.get("type") == "text_block"])
        py_cards = len(p0.get("background_cards", []))
        for e in elems:
            if e.get("hyperlink"): py_links += 1
            for l in e.get("lines", []):
                for sp in l.get("spans", []):
                    if sp.get("hyperlink"): py_links += 1

    if zig_data:
        z0 = zig_data["pages"][0]
        zig_canvas = f"{z0.get('canvas_width_pt',0):.1f}x{z0.get('canvas_height_pt',0):.1f}"
        elems = z0.get("elements", [])
        zig_imgs = len([e for e in elems if e.get("type") == "image"])
        zig_texts = len([e for e in elems if e.get("type") == "text_block"])
        zig_cards = len(z0.get("background_cards", []))
        for e in elems:
            if e.get("hyperlink"): zig_links += 1
            for l in e.get("lines", []):
                for sp in l.get("spans", []):
                    if sp.get("hyperlink"): zig_links += 1

    res = {
        "index": idx + 1,
        "name": name,
        "py_dur": py_dur,
        "zig_dur": zig_dur,
        "py_imgs": py_imgs,
        "zig_imgs": zig_imgs,
        "py_texts": py_texts,
        "zig_texts": zig_texts,
        "py_cards": py_cards,
        "zig_cards": zig_cards,
        "py_links": py_links,
        "zig_links": zig_links,
        "py_canvas": py_canvas,
        "zig_canvas": zig_canvas,
    }
    comparison_results.append(res)

print("\n" + "=" * 115)
print("DEEP ACCURACY & STRUCTURAL COMPARISON: PYTHON (PyMuPDF) vs ZIG (PDFium)")
print("=" * 115)
print(f"{'#':<3} | {'PDF Name':<34} | {'Canvas WxH (P / Z)':<20} | {'Imgs (P/Z)':<11} | {'Texts (P/Z)':<12} | {'Cards (P/Z)':<11} | {'Links (P/Z)'}")
print("-" * 115)
for r in comparison_results:
    print(f"{r['index']:<3} | {r['name'][:34]:<34} | {r['py_canvas']:<8} / {r['zig_canvas']:<8} | {r['py_imgs']:2d}  / {r['zig_imgs']:<2d}     | {r['py_texts']:3d}  / {r['zig_texts']:<3d}    | {r['py_cards']:2d}  / {r['zig_cards']:<2d}    | {r['py_links']:2d}  / {r['zig_links']:<2d}")
print("=" * 115)
