import os

f1 = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package_pdfoxide\PM-MY-SGX-EML-250072 (1).html"
f2 = r"C:\Users\SumanBiswas\Downloads\PDFs\PM-MY-SGX-EML-250072 (1)_ai_package\hi.html"

with open(f1, "r", encoding="utf-8") as f:
    h1 = f.read()

with open(f2, "r", encoding="utf-8") as f:
    h2 = f.read()

print("HTML 1 (PDFOxide/Zig AI Output) Length:", len(h1))
print("HTML 2 (PyMuPDF/Python AI Output) Length:", len(h2))

print("\n--- HTML 1 First 1000 chars ---")
print(h1[:1000])

print("\n--- HTML 2 First 1000 chars ---")
print(h2[:1000])
