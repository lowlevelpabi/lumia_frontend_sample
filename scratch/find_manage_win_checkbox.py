filepath = r"C:\Users\SIBIYA GAMING\Documents\Undergraduate Thesis System\lumia_frontend_sample\src\views\manage_win.vue"

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()
    
for i, line in enumerate(lines):
    if "checkbox" in line.lower() or "selected" in line.lower() or "toggle" in line.lower():
        print(f"Line {i+1}: {line.strip()}")
