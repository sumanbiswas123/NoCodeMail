import re
from bs4 import BeautifulSoup

path_zig = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\PM-MY-SGX-EML-250072 (1).html"
path_py = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_python\jio.html"

with open(path_zig, "r", encoding="utf-8") as f:
    html_zig = f.read()

with open(path_py, "r", encoding="utf-8") as f:
    html_py = f.read()

soup_zig = BeautifulSoup(html_zig, "html.parser")
soup_py = BeautifulSoup(html_py, "html.parser")

print("=" * 80)
print("COMPARING COMPILED HTML: PYTHON (jio.html) vs ZIG (PM-MY-SGX.html)")
print("=" * 80)

# 1. Container & Width Check
print("\n--- 1. CONTAINER & WIDTHS ---")
def get_table_widths(soup):
    tables = soup.find_all("table")
    widths = [t.get("width") for t in tables if t.get("width")]
    return widths

print("Python table widths sample:", set(get_table_widths(soup_py)))
print("Zig table widths sample:   ", set(get_table_widths(soup_zig)))

# Check body / wrapper width
body_py = soup_py.find("body")
body_zig = soup_zig.find("body")

# 2. Images Extraction Check
print("\n--- 2. EMBEDDED IMAGES ---")
imgs_py = [img.get("src") for img in soup_py.find_all("img")]
imgs_zig = [img.get("src") for img in soup_zig.find_all("img")]

print(f"Total <img> tags: Python = {len(imgs_py)} | Zig = {len(imgs_zig)}")
print("Python images:", imgs_py)
print("Zig images:   ", imgs_zig)

# 3. Hyperlinks Check
print("\n--- 3. HYPERLINKS ---")
links_py = [a.get("href") for a in soup_py.find_all("a") if a.get("href")]
links_zig = [a.get("href") for a in soup_zig.find_all("a") if a.get("href")]

print(f"Total <a> links: Python = {len(links_py)} | Zig = {len(links_zig)}")

qualtrics_py = [l for l in links_py if "qualtrics" in l.lower()]
qualtrics_zig = [l for l in links_zig if "qualtrics" in l.lower()]
print(f"Qualtrics rating survey links: Python = {len(qualtrics_py)} | Zig = {len(qualtrics_zig)}")

# 4. Color Palette Check
print("\n--- 4. BACKGROUND & COLOR CODES ---")
def extract_hex_colors(html_text):
    return set(re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}\b', html_text))

colors_py = extract_hex_colors(html_py)
colors_zig = extract_hex_colors(html_zig)

print("Python distinct hex colors:", sorted(colors_py))
print("Zig distinct hex colors:   ", sorted(colors_zig))

# 5. Dynamic / Personalization Tokens
print("\n--- 5. PERSONALIZATION TAGS ---")
def find_merge_tags(html_text):
    return set(re.findall(r'\{\{[^\}]+\}\}', html_text))

tags_py = find_merge_tags(html_py)
tags_zig = find_merge_tags(html_zig)

print("Python merge tags:", tags_py)
print("Zig merge tags:   ", tags_zig)
