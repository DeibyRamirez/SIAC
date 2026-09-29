from pathlib import Path
import re
t = Path("Frontend/app/(app)/cargador/evidencias/[id]/page.tsx").read_text(encoding="utf-8")

# Find both full panels
panels = list(re.finditer(
    r"\{esRechazada && comentariosRevisor\.length > 0 && \([\s\S]*?\n      \)\}",
    t,
))
print("panels found", len(panels))
for i, p in enumerate(panels):
    print(i, "start", p.start(), "end", p.end(), "len", p.end()-p.start())

if len(panels) >= 2:
    # Keep first, remove second
    p2 = panels[1]
    t2 = t[:p2.start()] + t[p2.end():]
    # clean extra blank lines
    t2 = re.sub(r"\n{3,}", "\n\n", t2)
    Path("Frontend/app/(app)/cargador/evidencias/[id]/page.tsx").write_text(t2, encoding="utf-8")
    print("removed duplicate, remaining maps", t2.count("comentariosRevisor.map"))
    print("remaining panels", len(re.findall(r"\{esRechazada && comentariosRevisor\.length > 0 && \(", t2)))
