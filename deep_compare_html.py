import os, json
from bs4 import BeautifulSoup

html_py_path = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_python\hi.html"
html_zig_path = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1).html"

with open(html_py_path, "r", encoding="utf-8") as f:
    h_py = f.read()
with open(html_zig_path, "r", encoding="utf-8") as f:
    h_zig = f.read()

soup_py = BeautifulSoup(h_py, "html.parser")
soup_zig = BeautifulSoup(h_zig, "html.parser")

print("=== HTML STRUCTURAL COMPARISON ===")
print("Python (PyMuPDF-based AI HTML):")
print("  Total length:", len(h_py))
print("  Tables count:", len(soup_py.find_all("table")))
print("  Images count:", len(soup_py.find_all("img")))
print("  Links count:", len(soup_py.find_all("a")))
imgs_py = [img.get("src") for img in soup_py.find_all("img") if img.get("src")]
print("  Sample image sources (Python):", imgs_py[:10])

print("\nZig (PDFium-based AI HTML):")
print("  Total length:", len(h_zig))
print("  Tables count:", len(soup_zig.find_all("table")))
print("  Images count:", len(soup_zig.find_all("img")))
print("  Links count:", len(soup_zig.find_all("a")))
imgs_zig = [img.get("src") for img in soup_zig.find_all("img") if img.get("src")]
print("  Sample image sources (Zig):", imgs_zig[:10])

print("\n=== ASSETS CHECK ===")
assets_py_dir = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_python\assets"
assets_zig_dir = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\assets"

files_py = sorted(os.listdir(assets_py_dir))
files_zig = sorted(os.listdir(assets_zig_dir))

print(f"Python Assets count: {len(files_py)}")
print(f"Zig Assets count:    {len(files_zig)}")
