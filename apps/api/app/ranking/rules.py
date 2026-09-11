"""Piso de regras do ranking: explicável, sem treino, sempre disponível.

`p_recall` de um item já visto é a curva de esquecimento 2^(-t/meia-vida); de um item novo é um prior por dificuldade,
descontado pela distância entre as letras que ele exige e a fronteira do aprendiz. A ordem serve primeiro o que está
mais esquecido, depois os itens novos na ordem do currículo, depois o que ainda está firme.
"""
from dataclasses import dataclass

from .features import ItemMeta, LearnerStats
from .scheduler import State

RULES_POLICY_VERSION = "rules-v1"
NEW_ITEM_PRIOR = {"facil": 0.80, "medio": 0.65, "dificil": 0.50}
REVIEW_THRESHOLD = 0.90
P_MIN, P_MAX = 0.02, 0.98


def clamp(value: float) -> float:
    return min(P_MAX, max(P_MIN, value))


def rules_p_recall(state: State | None, item: ItemMeta, learner: LearnerStats, recall_curve: float) -> float:
    if state is None:
        distance = max(0, item.max_letter_index - learner.frontier_index)
        return clamp(NEW_ITEM_PRIOR.get(item.difficulty, 0.65) - 0.05 * distance)
    # Lapsos recentes puxam a curva para baixo: quem errou três vezes em cinco não está tão firme quanto a meia-vida sugere.
    penalty = 0.5 * state.lapses / state.reps if state.reps else 0.0
    return clamp(recall_curve * (1 - penalty))


@dataclass(frozen=True)
class Scored:
    item_id: str
    p_recall: float
    is_new: bool
    curriculum_position: int


def bucket_of(scored: Scored) -> str:
    if scored.is_new:
        return "new"
    return "review" if scored.p_recall < REVIEW_THRESHOLD else "strong"


def rank_candidates(scored: list[Scored]) -> list[Scored]:
    """Mais esquecidos primeiro, novos na ordem do currículo, firmes por último."""
    review = sorted((item for item in scored if bucket_of(item) == "review"), key=lambda item: (item.p_recall, item.curriculum_position))
    new = sorted((item for item in scored if bucket_of(item) == "new"), key=lambda item: item.curriculum_position)
    strong = sorted((item for item in scored if bucket_of(item) == "strong"), key=lambda item: (item.p_recall, item.curriculum_position))
    return [*review, *new, *strong]
