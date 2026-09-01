import os
from bs4 import BeautifulSoup

h_py_path = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_python\hi.html"
h_zig_path = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1).html"

with open(h_py_path, "r", encoding="utf-8") as f:
    h_py = f.read()
with open(h_zig_path, "r", encoding="utf-8") as f:
    h_zig = f.read()

soup_py = BeautifulSoup(h_py, "html.parser")
soup_zig = BeautifulSoup(h_zig, "html.parser")

print("==================== HTML SECTIONS & CONTAINER COLORS ====================")
def extract_section_colors(soup):
    colors = []
    for el in soup.find_all(True):
        style = el.get("style", "")
        bg = el.get("background-color") or el.get("bgcolor")
        for s in style.split(";"):
            if "background-color" in s:
                c = s.split(":")[1].strip()
                if c and c.lower() not in ["none", "transparent", "#ffffff", "white"]:
                    colors.append(c.lower())
        if bg and bg.lower() not in ["none", "transparent", "#ffffff", "white"]:
            colors.append(bg.lower())
    return sorted(list(set(colors)))

print("Python HTML Background Colors:", extract_section_colors(soup_py))
print("Zig HTML Background Colors:   ", extract_section_colors(soup_zig))

print("\n==================== HYPERLINKS IN COMPILED HTML ====================")
links_py = sorted(list(set([a.get("href") for a in soup_py.find_all("a") if a.get("href")])))
links_zig = sorted(list(set([a.get("href") for a in soup_zig.find_all("a") if a.get("href")])))

print(f"Python Links count: {len(links_py)}")
print(f"Zig Links count:    {len(links_zig)}")
print("Common links count:", len(set(links_py).intersection(set(links_zig))))
for i, l in enumerate(links_zig):
    print(f"  [{i+1}] {l[:80]}")

print("\n==================== IMAGES IN COMPILED HTML ====================")
imgs_py = [img.get("src") for img in soup_py.find_all("img") if img.get("src")]
imgs_zig = [img.get("src") for img in soup_zig.find_all("img") if img.get("src")]
print("Python Images in HTML:", len(imgs_py))
print("Zig Images in HTML:   ", len(imgs_zig))
