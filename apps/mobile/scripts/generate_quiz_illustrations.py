"""Gera as ilustrações do nivelamento: arquivos .svg embarcados e o JSX equivalente para illustrations.tsx."""
import json
from pathlib import Path

N = "#234B5A"  # contorno azul-marinho do projeto
FLOOR = ("rect", {"x": 20, "y": 204, "width": 280, "height": 8, "rx": 4, "fill": "#E2D6C2"})


def table(x0=54, width=212):
    x1 = x0 + width
    return [
        ("rect", {"x": x0, "y": 80, "width": width, "height": 34, "rx": 10, "fill": "#C98B55"}),
        ("line", {"x1": x0 + 28, "y1": 110, "x2": x0 + 16, "y2": 204, "stroke": N, "stroke-width": 12}),
        ("line", {"x1": x1 - 28, "y1": 110, "x2": x1 - 16, "y2": 204, "stroke": N, "stroke-width": 12}),
    ]


def glass(x, bottom):
    top = bottom - 58
    return ("path", {"d": f"M{x} {top}h40l-6 58h-28z", "fill": "#A8D9EA", "stroke": N, "stroke-width": 6})


SHAPES = {
    "colher": [
        ("path", {"d": "M140 108L282 98q14 0 14 12t-14 12L140 122z", "fill": "#C8D2D8", "stroke": N, "stroke-width": 6, "stroke-linejoin": "round"}),
        ("ellipse", {"cx": 92, "cy": 115, "rx": 62, "ry": 34, "fill": "#C8D2D8", "stroke": N, "stroke-width": 7}),
        ("path", {"d": "M58 106q20-16 52-12", "fill": "none", "stroke": "#FFFFFF", "stroke-width": 6, "stroke-linecap": "round"}),
    ],
    "sapato": [
        ("path", {"d": "M48 168q-2-46 34-56l52-14q22-4 34 16l18 22q8 8 22 10l40 6q30 6 30 34v4H48z", "fill": "#C98B55", "stroke": N, "stroke-width": 7}),
        ("rect", {"x": 44, "y": 182, "width": 238, "height": 18, "rx": 8, "fill": N}),
        ("line", {"x1": 132, "y1": 112, "x2": 152, "y2": 136, "stroke": "#FFF9EE", "stroke-width": 5, "stroke-linecap": "round"}),
        ("line", {"x1": 148, "y1": 106, "x2": 168, "y2": 128, "stroke": "#FFF9EE", "stroke-width": 5, "stroke-linecap": "round"}),
    ],
    "copo-em-cima-da-mesa": [FLOOR, *table(), glass(140, 80)],
    "copo-debaixo-da-mesa": [FLOOR, *table(), glass(140, 204)],
    "copo-no-chao": [FLOOR, *table(28, 176), glass(244, 204)],
    "prato-vazio": [
        ("ellipse", {"cx": 160, "cy": 120, "rx": 116, "ry": 70, "fill": "#FFFFFF", "stroke": N, "stroke-width": 8}),
        ("ellipse", {"cx": 160, "cy": 120, "rx": 74, "ry": 40, "fill": "none", "stroke": "#C8D2D8", "stroke-width": 6}),
    ],
    "varal": [
        ("line", {"x1": 28, "y1": 36, "x2": 28, "y2": 210, "stroke": N, "stroke-width": 8}),
        ("line", {"x1": 292, "y1": 36, "x2": 292, "y2": 210, "stroke": N, "stroke-width": 8}),
        ("path", {"d": "M28 48Q160 70 292 48", "fill": "none", "stroke": N, "stroke-width": 4}),
        ("rect", {"x": 52, "y": 56, "width": 40, "height": 52, "rx": 4, "fill": "#8AB9D0"}),
        ("rect", {"x": 102, "y": 60, "width": 36, "height": 44, "rx": 4, "fill": "#F2C14E"}),
        ("path", {"d": "M156 64l18-6h32l18 6 10 20-16 6v44h-56V90l-16-6z", "fill": "#76A98F", "stroke": N, "stroke-width": 4}),
        ("rect", {"x": 196, "y": 50, "width": 8, "height": 18, "rx": 2, "fill": "#E98B58"}),
        ("circle", {"cx": 252, "cy": 118, "r": 18, "fill": "#C98B70"}),
        ("path", {"d": "M230 142q22-10 44 0v68h-44z", "fill": "#E98B58"}),
        ("line", {"x1": 238, "y1": 150, "x2": 206, "y2": 72, "stroke": "#C98B70", "stroke-width": 10, "stroke-linecap": "round"}),
    ],
}

JSX_TAG = {"rect": "Rect", "line": "Line", "ellipse": "Ellipse", "circle": "Circle", "path": "Path"}
JSX_ATTR = {"stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin"}


def svg(name):
    body = "".join(f"<{tag} " + " ".join(f'{k}="{v}"' for k, v in attrs.items()) + "/>" for tag, attrs in SHAPES[name])
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 230" role="img"><rect width="320" height="230" rx="24" fill="#F6F1E7"/>{body}</svg>\n'


def jsx(name):
    parts = "".join(f"<{JSX_TAG[tag]} " + " ".join(f'{JSX_ATTR.get(k, k)}="{v}"' for k, v in attrs.items()) + " />" for tag, attrs in SHAPES[name])
    return f'    {{name === "{name}" && <>{parts}</>}}'


if __name__ == "__main__":
    mobile = Path(__file__).resolve().parents[1]
    out = mobile / "assets" / "images" / "quiz"
    out.mkdir(parents=True, exist_ok=True)
    for name in SHAPES:
        (out / f"{name}.svg").write_text(svg(name), encoding="utf-8")
    # Regrava o bloco do nivelamento em illustrations.tsx (o app desenha com react-native-svg, sem ler os .svg).
    tsx = mobile / "src" / "assets" / "illustrations.tsx"
    marker = "    {/* Nivelamento (contracts/placement-quiz.json); gerado por scripts/generate_quiz_illustrations.py. */}"
    lines = [line for line in tsx.read_text(encoding="utf-8").splitlines() if not any(line.startswith(f'    {{name === "{name}"') for name in SHAPES)]
    lines[lines.index(marker) + 1:lines.index(marker) + 1] = [jsx(name) for name in SHAPES]
    tsx.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(sorted(SHAPES)))
