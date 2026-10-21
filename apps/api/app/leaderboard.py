"""Placar entre aprendizes: pontos derivados das tentativas já sincronizadas.

A regra espelha apps/mobile/src/domain/points.ts::totalPoints; mudar uma exige mudar a outra.
Não confundir com app/ranking/, que ordena itens da repetição espaçada.
"""
import re
from collections import defaultdict
from collections.abc import Iterable
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .db import get_db
from .deps import current_user
from .models import Attempt, User

POINTS_FIRST_TRY = 3
POINTS_RECOVERED = 1

router = APIRouter(prefix="/v1/leaderboard", tags=["leaderboard"])

# Ligas do caminho da leitura (lápis até biblioteca): a pessoa entra pela soma de todos os pontos e só sobe (nunca cai, para não punir quem fica dias sem praticar).
# Dentro da liga, o placar é dos pontos da semana, que zera na segunda às 00h de Brasília (sem horário de verão desde 2019).
LEAGUES = (("lapis", "Lápis", 0), ("caderno", "Caderno", 150), ("livro", "Livro", 400), ("estante", "Estante", 800), ("biblioteca", "Biblioteca", 1500))
BRASILIA = timezone(timedelta(hours=-3))


class LeaderboardStanding(BaseModel):
    points: int
    position: int
    learners: int


class LeaderboardEntry(BaseModel):
    position: int
    name: str
    points: int
    me: bool


class LeaderboardTop(LeaderboardStanding):
    entries: list[LeaderboardEntry]
    me: LeaderboardEntry


class League(BaseModel):
    id: str
    name: str
    min_points: int


class LeagueBoard(BaseModel):
    league: League
    next: League | None
    total_points: int
    ends_at: datetime
    members: int
    entries: list[LeaderboardEntry]
    me: LeaderboardEntry


def points_from_attempts(rows: Iterable[Any]) -> int:
    """Pontos de UM aprendiz. Cada linha expõe session_id, item_id, correct, occurred_at, position_in_session e attempt_index_in_item.

    As tentativas são agrupadas por (sessão, item). O grupo com acerto vale 3 se nenhum erro veio antes do primeiro
    acerto (ordem: occurred_at, position_in_session, attempt_index_in_item), senão 1; grupo sem acerto vale 0 e errar
    nunca tira pontos. Tentativas sem sessão (clientes anteriores à ADR 0003) contam sozinhas: 3 se foi a primeira
    apresentação do item (attempt_index_in_item 1 ou ausente), senão 1.
    """
    groups: dict[tuple, list] = defaultdict(list)
    for index, attempt in enumerate(rows):
        groups[(attempt.session_id, attempt.item_id) if attempt.session_id else (None, index)].append(attempt)
    total = 0
    for (session_id, _), group in groups.items():
        ordered = sorted(group, key=lambda attempt: (attempt.occurred_at, attempt.position_in_session or 0, attempt.attempt_index_in_item or 0))
        first_correct = next((position for position, attempt in enumerate(ordered) if attempt.correct), None)
        if first_correct is None:
            continue
        recovered = first_correct > 0 if session_id else (ordered[0].attempt_index_in_item or 1) > 1
        total += POINTS_RECOVERED if recovered else POINTS_FIRST_TRY
    return total


def league_for(total_points: int) -> int:
    """Índice em LEAGUES da liga de quem soma `total_points`."""
    return max(index for index, (_, _, minimum) in enumerate(LEAGUES) if total_points >= minimum)


def week_start(now: datetime) -> datetime:
    """Segunda-feira 00h (Brasília) da semana de `now`."""
    local = now.astimezone(BRASILIA)
    return (local - timedelta(days=local.weekday())).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)


def _aware(moment: datetime) -> datetime:
    # O SQLite devolve datas sem fuso; elas foram gravadas em UTC.
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _learner_rows(db: Session, user: User) -> tuple[dict[str, list], dict[str, User]]:
    """Tentativas de cada aprendiz (contas não administradoras) e de quem chama."""
    learners = {learner.id: learner for learner in db.scalars(select(User).where(User.is_admin.is_(False)))}
    rows = db.execute(
        select(Attempt.user_id, Attempt.session_id, Attempt.item_id, Attempt.correct, Attempt.occurred_at, Attempt.position_in_session, Attempt.attempt_index_in_item)
        .join(User, User.id == Attempt.user_id)
        .where(or_(User.is_admin.is_(False), User.id == user.id)))
    by_user: dict[str, list] = defaultdict(list)
    for row in rows:
        by_user[row.user_id].append(row)
    return by_user, learners


def _points(by_user: dict[str, list], learners: dict[str, User], user: User) -> dict[str, int]:
    """Pontos por aprendiz; quem não tem tentativas vale 0."""
    points = {user_id: 0 for user_id in learners}
    points.update({user_id: points_from_attempts(attempts) for user_id, attempts in by_user.items()})
    points.setdefault(user.id, 0)
    return points


def _learner_points(db: Session, user: User) -> tuple[dict[str, int], dict[str, User]]:
    """Pontos de cada aprendiz (contas não administradoras), mais os de quem chama; quem não tem tentativas vale 0."""
    by_user, learners = _learner_rows(db, user)
    return _points(by_user, learners, user), learners


def _place(points: dict[str, int], learners: dict[str, User], value: int) -> int:
    """Lugar de quem tem `value` pontos: empates dividem o lugar."""
    return 1 + sum(1 for user_id, other in points.items() if user_id in learners and other > value)


def public_name(user: User) -> str:
    """Só o primeiro nome (ou o começo do e-mail) aparece para os outros aprendizes."""
    first = (user.name or "").strip().split(" ")[0]
    if first:
        return first
    local = re.sub(r"[._-]+", " ", user.email.split("@")[0]).strip().split(" ")[0]
    return local[:1].upper() + local[1:] if local else "Aprendiz"


@router.get("/me", response_model=LeaderboardStanding)
def my_standing(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Pontos e lugar de quem chama entre os aprendizes (contas não administradoras); empates dividem o lugar."""
    points, learners = _learner_points(db, user)
    mine = points[user.id]
    # Administradores ficam fora do placar, mas veem o lugar que teriam.
    return LeaderboardStanding(points=mine, position=_place(points, learners, mine), learners=len(learners))


@router.get("", response_model=LeaderboardTop)
def top(limit: int = Query(4, ge=1, le=20), user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Primeiros do placar (tela "Minha pontuação", Figma 9:277) e a linha de quem chama, mesmo fora do topo."""
    points, learners = _learner_points(db, user)
    ordered = sorted(learners.values(), key=lambda learner: (-points[learner.id], public_name(learner).lower(), learner.created_at))
    entries = [LeaderboardEntry(position=_place(points, learners, points[learner.id]), name=public_name(learner), points=points[learner.id], me=learner.id == user.id)
               for learner in ordered[:limit]]
    mine = points[user.id]
    me = LeaderboardEntry(position=_place(points, learners, mine), name=public_name(user), points=mine, me=True)
    return LeaderboardTop(points=mine, position=me.position, learners=len(learners), entries=entries, me=me)


def _league(index: int) -> League:
    league_id, name, minimum = LEAGUES[index]
    return League(id=league_id, name=name, min_points=minimum)


@router.get("/league", response_model=LeagueBoard)
def league_board(limit: int = Query(10, ge=1, le=30), user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Aba Ranking: a liga de quem chama e o placar da semana entre quem está na mesma liga."""
    by_user, learners = _learner_rows(db, user)
    totals = _points(by_user, learners, user)
    start = week_start(_now())
    weekly = _points({user_id: [row for row in rows if _aware(row.occurred_at) >= start] for user_id, rows in by_user.items()}, learners, user)
    index = league_for(totals[user.id])
    members = {user_id: learner for user_id, learner in learners.items() if league_for(totals[user_id]) == index}
    ordered = sorted(members.values(), key=lambda learner: (-weekly[learner.id], public_name(learner).lower(), learner.created_at))
    entries = [LeaderboardEntry(position=_place(weekly, members, weekly[learner.id]), name=public_name(learner), points=weekly[learner.id], me=learner.id == user.id)
               for learner in ordered[:limit]]
    me = LeaderboardEntry(position=_place(weekly, members, weekly[user.id]), name=public_name(user), points=weekly[user.id], me=True)
    return LeagueBoard(league=_league(index), next=_league(index + 1) if index + 1 < len(LEAGUES) else None, total_points=totals[user.id],
                       ends_at=start + timedelta(days=7), members=len(members), entries=entries, me=me)
