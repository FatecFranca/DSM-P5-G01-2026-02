"""Copia as questões curadas de bancoquestoesequiz/gerar_banco.py para apps/api/app/data/banco_questoes.json.

O container da API só leva apps/api, então o seed lê esta cópia. tests/test_question_bank.py falha se ela
divergir do gerador (quando o diretório bancoquestoesequiz está disponível).
"""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
GENERATOR = REPO / "bancoquestoesequiz" / "gerar_banco.py"
OUTPUT = ROOT / "app" / "data" / "banco_questoes.json"


def load_generator():
    spec = importlib.util.spec_from_file_location("gerar_banco", GENERATOR)
    assert spec and spec.loader, GENERATOR
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def render() -> str:
    generator = load_generator()
    questions = [
        {"id": id_, "modelo": modelo, "formato": formato, "enunciado": enunciado, "dados": dados, "gabarito": resposta}
        for id_, modelo, formato, enunciado, dados, resposta in generator.itens()
    ]
    body = {
        "$comment": "Gerado por apps/api/scripts/export_question_bank.py a partir de bancoquestoesequiz/gerar_banco.py. Não edite à mão.",
        "silabas_por_palavra": {"".join(entry.split()): entry.split() for entry in generator.SILABAS_POR_PALAVRA},
        "questoes": questions,
    }
    return json.dumps(body, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    OUTPUT.write_text(render(), encoding="utf-8", newline="\n")
    print(f"wrote {OUTPUT}")
