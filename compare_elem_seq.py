import os, json
from PIL import Image

f_py = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_python\PM-MY-SGX-EML-250072 (1)_design.json"
f_zig = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1)_design.json"

with open(f_py, "r", encoding="utf-8") as f:
    d_py = json.load(f)
with open(f_zig, "r", encoding="utf-8") as f:
    d_zig = json.load(f)

elems_py = d_py["pages"][0]["elements"]
elems_zig = d_zig["pages"][0]["elements"]

print(f"Python Elements count: {len(elems_py)}")
print(f"Zig Elements count:    {len(elems_zig)}")

print("\n==================== FULL SEQUENTIAL ELEMENT LIST COMPARISON ====================")
print("Index | Type | Top (Py) | Top (Zig) | Raw Text / Asset Preview")
print("-" * 90)

max_len = max(len(elems_py), len(elems_zig))
for i in range(max_len):
    ep = elems_py[i] if i < len(elems_py) else {}
    ez = elems_zig[i] if i < len(elems_zig) else {}
    
    tp_p = f"{ep.get('top', 0.0):.1f}" if ep else "-"
    tp_z = f"{ez.get('top', 0.0):.1f}" if ez else "-"
    
    type_p = ep.get("type", "-")
    type_z = ez.get("type", "-")
    
    desc_p = ep.get("asset_path") if type_p == "image" else ep.get("raw_text", "")[:40]
    desc_z = ez.get("asset_path") if type_z == "image" else ez.get("raw_text", "")[:40]
    
    print(f"[{i:02d}] Py:({type_p:5s} @ {tp_p:>6s}) {desc_p:<40s} | Zig:({type_z:5s} @ {tp_z:>6s}) {desc_z}")
