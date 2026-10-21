from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.leaderboard import points_from_attempts


def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


START = datetime(2026, 10, 21, 10, 0, tzinfo=timezone.utc)


def row(item_id, correct, minute, session_id="s1", attempt_index=1, position=None):
    """Uma linha de `attempts` com as colunas que o placar lê."""
    return SimpleNamespace(session_id=session_id, item_id=item_id, correct=correct, occurred_at=START + timedelta(minutes=minute),
                           position_in_session=position, attempt_index_in_item=attempt_index)


def test_first_try_is_worth_three_and_recovery_one():
    assert points_from_attempts([]) == 0
    assert points_from_attempts([row("x", True, 1)]) == 3
    assert points_from_attempts([row("x", False, 1), row("x", True, 2)]) == 1
    # Errar nunca tira pontos e item sem acerto não pontua.
    assert points_from_attempts([row("x", False, 1), row("x", False, 2)]) == 0
    assert points_from_attempts([row("x", False, 1), row("x", False, 2), row("x", True, 3), row("x", False, 4)]) == 1


def test_order_is_clock_then_position_then_attempt_index():
    # A ordem de entrada não importa: o erro aconteceu antes do acerto.
    assert points_from_attempts([row("x", True, 2), row("x", False, 1)]) == 1
    # Um erro depois do primeiro acerto não rebaixa o item.
    assert points_from_attempts([row("x", False, 3), row("x", True, 2)]) == 3
    # No mesmo instante, desempata a posição na sessão e depois o índice da tentativa no item.
    assert points_from_attempts([row("x", True, 1, position=2), row("x", False, 1, position=1)]) == 1
    assert points_from_attempts([row("x", True, 1, position=1, attempt_index=2), row("x", False, 1, position=1, attempt_index=1)]) == 1


def test_same_vectors_as_the_mobile_app():
    # apps/mobile/src/domain/points.test.ts::totalPoints — as duas implementações precisam concordar.
    assert points_from_attempts([
        row("x", True, 1),
        row("y", False, 2), row("y", True, 3),
        row("x", True, 4, session_id="s2"),
    ]) == 7
    assert points_from_attempts([row("x", False, 1), row("z", True, 2, session_id=None, attempt_index=1), row("z", True, 3, session_id=None, attempt_index=2)]) == 4


def test_attempts_without_session_count_alone():
    assert points_from_attempts([row("z", True, 1, session_id=None, attempt_index=1)]) == 3
    assert points_from_attempts([row("z", True, 1, session_id=None, attempt_index=3)]) == 1
    # Clientes antigos não mandavam o índice: vale como primeira apresentação.
    assert points_from_attempts([row("z", True, 1, session_id=None, attempt_index=None)]) == 3
    assert points_from_attempts([row("z", False, 1, session_id=None)]) == 0
    # Sem sessão não há grupo: um erro anterior do mesmo item não transforma o acerto em "recuperado".
    assert points_from_attempts([row("z", False, 1, session_id=None), row("z", True, 2, session_id=None)]) == 3


def attempt(event_id, item_id, minute, correct, session_id="s1", attempt_index=1):
    payload = {"client_attempt_id": event_id, "item_id": item_id, "answer": "A", "correct": correct, "duration_ms": 500,
               "session_id": session_id, "attempt_index_in_item": attempt_index}
    return {"client_event_id": event_id, "type": "attempt", "occurred_at": f"2026-10-21T10:{minute:02d}:00Z", "payload": payload}


def push(client, headers, *events):
    response = client.post("/v1/sync/push", headers=headers, json={"events": list(events)})
    assert response.status_code == 200 and response.json()["accepted"] == len(events), response.text


def learner(client, email, *events):
    response = client.post("/v1/auth/register", json={"email": email, "password": "Senha-forte-123"})
    assert response.status_code == 201, response.text
    headers = bearer(response.json())
    if events:
        push(client, headers, *events)
    return headers


def standing(client, headers):
    response = client.get("/v1/leaderboard/me", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_learners_are_ranked_and_ties_share_a_place(client):
    ana = learner(client, "ana@example.com",
                  attempt("a1", "exercise-A-listen", 0, True),  # 3: de primeira
                  attempt("a2", "exercise-A-recognize", 1, False), attempt("a3", "exercise-A-recognize", 2, True, attempt_index=2))  # 1: recuperado
    bia = learner(client, "bia@example.com",
                  attempt("b1", "exercise-A-listen", 0, True, session_id="s9"),  # 3
                  attempt("b2", "exercise-E-listen", 1, False, session_id=None),  # 0: sem sessão, conta sozinha
                  attempt("b3", "exercise-E-listen", 2, True, session_id=None, attempt_index=2))  # 1
    caio = learner(client, "caio@example.com", attempt("c1", "exercise-A-listen", 0, True))  # 3
    duda = learner(client, "duda@example.com")  # 0: ainda sem tentativas
    assert standing(client, ana) == {"points": 4, "position": 1, "learners": 4}
    assert standing(client, bia) == {"points": 4, "position": 1, "learners": 4}
    assert standing(client, caio) == {"points": 3, "position": 3, "learners": 4}
    assert standing(client, duda) == {"points": 0, "position": 4, "learners": 4}


def test_admin_is_left_out_but_sees_the_place_it_would_have(client):
    ana = learner(client, "ana@example.com", attempt("a1", "exercise-A-listen", 0, True))  # 3
    bia = learner(client, "bia@example.com")  # 0
    setup = client.post("/v1/admin/setup", json={"email": "admin@example.com", "password": "Senha-forte-123"})
    assert setup.status_code == 201
    admin = bearer(setup.json())
    push(client, admin, attempt("x1", "exercise-A-listen", 0, False), attempt("x2", "exercise-A-listen", 1, True, attempt_index=2))  # 1
    # Se a conta administradora contasse, Bia estaria em 3º lugar e haveria 3 aprendizes.
    assert standing(client, bia) == {"points": 0, "position": 2, "learners": 2}
    assert standing(client, ana) == {"points": 3, "position": 1, "learners": 2}
    assert standing(client, admin) == {"points": 1, "position": 2, "learners": 2}


def test_leaderboard_requires_login(client):
    assert client.get("/v1/leaderboard/me").status_code in (401, 403)


def test_top_lists_first_learners_and_me_with_first_names_only(client):
    register = client.post("/v1/auth/register", json={"email": "ana.souza@example.com", "password": "Senha-forte-123", "name": "Ana Souza"})
    assert register.status_code == 201, register.text
    ana = bearer(register.json())
    push(client, ana, attempt("a1", "exercise-A-listen", 0, True), attempt("a2", "exercise-A-recognize", 1, True))  # 6
    learner(client, "bia@example.com", attempt("b1", "exercise-A-listen", 0, True))  # 3
    learner(client, "caio@example.com", attempt("c1", "exercise-A-listen", 0, True))  # 3
    duda = learner(client, "duda@example.com")  # 0
    response = client.get("/v1/leaderboard?limit=3", headers=duda)
    assert response.status_code == 200, response.text
    body = response.json()
    assert [(entry["position"], entry["name"], entry["points"], entry["me"]) for entry in body["entries"]] == [(1, "Ana", 6, False), (2, "Bia", 3, False), (2, "Caio", 3, False)]
    assert body["me"] == {"position": 4, "name": "Duda", "points": 0, "me": True}
    assert (body["points"], body["position"], body["learners"]) == (0, 4, 4)
    # Quem está no topo aparece marcado na própria lista.
    assert client.get("/v1/leaderboard", headers=ana).json()["entries"][0]["me"] is True


def test_top_requires_login(client):
    assert client.get("/v1/leaderboard").status_code in (401, 403)


def test_week_starts_monday_midnight_in_brasilia():
    from app.leaderboard import week_start
    # Quarta, 21/10/2026, 10h UTC (7h em Brasília): a semana começou na segunda, 19/10, 00h de Brasília (03h UTC).
    assert week_start(START) == datetime(2026, 10, 19, 3, 0, tzinfo=timezone.utc)
    # Segunda 02h UTC ainda é domingo 23h em Brasília: semana anterior.
    assert week_start(datetime(2026, 10, 19, 2, 0, tzinfo=timezone.utc)) == datetime(2026, 10, 12, 3, 0, tzinfo=timezone.utc)


def test_league_comes_from_total_points_and_only_goes_up():
    from app.leaderboard import LEAGUES, league_for
    assert [league_for(minimum) for _, _, minimum in LEAGUES] == list(range(len(LEAGUES)))
    assert league_for(0) == 0 and league_for(149) == 0 and league_for(10_000) == len(LEAGUES) - 1


def test_league_board_ranks_this_week_among_the_same_league(client, monkeypatch):
    import app.leaderboard as leaderboard
    # Agora: sexta 23/10/2026; a semana começou na segunda 19/10 às 03h UTC. As tentativas dos testes são de 21/10.
    monkeypatch.setattr(leaderboard, "_now", lambda: datetime(2026, 10, 23, 12, 0, tzinfo=timezone.utc))
    old = {"client_event_id": "old", "type": "attempt", "occurred_at": "2026-10-12T10:00:00Z",
           "payload": {"client_attempt_id": "old", "item_id": "exercise-E-listen", "answer": "A", "correct": True, "duration_ms": 500, "session_id": "s0", "attempt_index_in_item": 1}}
    ana = learner(client, "ana@example.com", old, attempt("a1", "exercise-A-listen", 0, True))  # 6 no total, 3 na semana
    learner(client, "bia@example.com", attempt("b1", "exercise-A-listen", 0, True), attempt("b2", "exercise-A-recognize", 1, True))  # 6 na semana
    learner(client, "caio@example.com")  # 0
    body = client.get("/v1/leaderboard/league", headers=ana).json()
    assert body["league"] == {"id": "lapis", "name": "Lápis", "min_points": 0}
    assert body["next"]["id"] == "caderno"
    assert body["total_points"] == 6 and body["members"] == 3
    assert body["ends_at"].startswith("2026-10-26T03:00:00")
    assert [(entry["position"], entry["name"], entry["points"], entry["me"]) for entry in body["entries"]] == [(1, "Bia", 6, False), (2, "Ana", 3, True), (3, "Caio", 0, False)]
    assert body["me"] == {"position": 2, "name": "Ana", "points": 3, "me": True}


def test_league_board_leaves_other_leagues_out(client, monkeypatch):
    import app.leaderboard as leaderboard
    monkeypatch.setattr(leaderboard, "LEAGUES", (("lapis", "Lápis", 0), ("caderno", "Caderno", 5)))
    ana = learner(client, "ana@example.com", attempt("a1", "exercise-A-listen", 0, True), attempt("a2", "exercise-A-recognize", 1, True))  # 6: Caderno
    bia = learner(client, "bia@example.com", attempt("b1", "exercise-A-listen", 0, True))  # 3: Lápis
    body = client.get("/v1/leaderboard/league", headers=ana).json()
    assert body["league"]["id"] == "caderno" and body["next"] is None and body["members"] == 1
    assert [entry["name"] for entry in body["entries"]] == ["Ana"]
    assert client.get("/v1/leaderboard/league", headers=bia).json()["members"] == 1


def test_league_board_requires_login(client):
    assert client.get("/v1/leaderboard/league").status_code in (401, 403)
