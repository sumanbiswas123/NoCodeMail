import json

f_oxide = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_pdfoxide\PM-MY-SGX-EML-250072 (1)_design.json"
f_pymupdf = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1)_design.json"

with open(f_oxide, 'r', encoding='utf-8') as f:
    d_ox = json.load(f)
with open(f_pymupdf, 'r', encoding='utf-8') as f:
    d_py = json.load(f)

elems_ox = d_ox['pages'][0]['elements']
elems_py = d_py['pages'][0]['elements']

print("=== TOTAL ELEMENTS ===")
print(f"Oxide: {len(elems_ox)} (Images: {len([e for e in elems_ox if e['type']=='image'])}, Text: {len([e for e in elems_ox if e['type']=='text_block'])})")
print(f"PyMuPDF: {len(elems_py)} (Images: {len([e for e in elems_py if e['type']=='image'])}, Text: {len([e for e in elems_py if e['type']=='text_block'])})")

# Compare Text Blocks grouping
print("\n=== TEXT BLOCKS COMPARISON (First 10) ===")
print("--- PyMuPDF (Clean Natural Paragraphs) ---")
for i, e in enumerate([e for e in elems_py if e['type']=='text_block'][:10]):
    print(f"[{i+1}] Top: {e['top']:.1f}, Lines: {len(e.get('lines',[]))}, Color: {e.get('dominant_color')}, Bg: {e.get('parent_container_color')}")
    print(f"    Raw: {e.get('raw_text')[:120]}...")

print("\n--- PDFOxide (Fragmented Lines) ---")
for i, e in enumerate([e for e in elems_ox if e['type']=='text_block'][:10]):
    print(f"[{i+1}] Top: {e['top']:.1f}, Lines: {len(e.get('lines',[]))}, Color: {e.get('dominant_color')}, Bg: {e.get('parent_container_color')}")
    print(f"    Raw: {e.get('raw_text')[:120]}...")
