import json

f_oxide = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_pdfoxide\PM-MY-SGX-EML-250072 (1)_design.json"
f_pymupdf = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1)_design.json"

with open(f_oxide, 'r', encoding='utf-8') as f:
    d_ox = json.load(f)
with open(f_pymupdf, 'r', encoding='utf-8') as f:
    d_py = json.load(f)

imgs_ox = [e for e in d_ox['pages'][0]['elements'] if e['type'] == 'image']
imgs_py = [e for e in d_py['pages'][0]['elements'] if e['type'] == 'image']

print("=== IMAGE ELEMENTS COMPARISON ===")
for i, (iox, ipy) in enumerate(zip(imgs_ox, imgs_py)):
    print(f"[{i+1}]")
    print(f"  PyMuPDF: file={ipy.get('asset_path')}, link={ipy.get('hyperlink')}, bbox={ipy.get('bbox')}, w_px={ipy.get('width_px')}")
    print(f"  Oxide:   file={iox.get('asset_path')}, link={iox.get('hyperlink')}, bbox={iox.get('bbox')}, w_px={iox.get('width_px')}")
