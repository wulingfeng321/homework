"""桥牌游戏后端逻辑（简化版，无叫牌阶段）"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any

SUITS = ["♠", "♥", "♦", "♣"]
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
RANK_ORDER = {rank: index for index, rank in enumerate(RANKS)}
PLAYERS = ["North", "East", "South", "West"]


def make_deck() -> list[dict[str, Any]]:
    deck = []
    for suit in SUITS:
        for rank in RANKS:
            deck.append({
                "rank": rank, "suit": suit,
                "label": f"{rank}{suit}", "id": f"{rank}-{suit}"
            })
    random.shuffle(deck)
    return deck


def card_strength(card: dict[str, Any]) -> int:
    return RANK_ORDER[card["rank"]]


@dataclass
class BridgeGame:
    hands: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    current_trick: list[dict[str, Any]] = field(default_factory=list)
    completed_trick: list[dict[str, Any]] = field(default_factory=list)
    trick_number: int = 1
    leader: str = "North"
    message: str = "点击新局开始桥牌游戏。"
    scores: dict[str, int] = field(default_factory=lambda: {"NS": 0, "EW": 0})
    finished: bool = False
    waiting_for_next_trick: bool = False

    @classmethod
    def new_game(cls) -> "BridgeGame":
        deck = make_deck()
        hands = {player: [] for player in PLAYERS}
        for index, card in enumerate(deck):
            hands[PLAYERS[index % 4]].append(card)
        for player in PLAYERS:
            hands[player].sort(
                key=lambda card: (SUITS.index(card["suit"]), card_strength(card))
            )
        game = cls(hands=hands)
        game.message = "南家由你控制，系统自动处理其他三家。"
        return game

    @classmethod
    def from_session(cls, flask_session: Any) -> "BridgeGame":
        payload = flask_session.get("bridge_game")
        if not payload:
            game = cls.new_game()
            game.save(flask_session)
            return game
        payload.setdefault("completed_trick", [])
        payload.setdefault("waiting_for_next_trick", False)
        return cls(**payload)

    def save(self, flask_session: Any) -> None:
        flask_session["bridge_game"] = {
            "hands": self.hands,
            "current_trick": self.current_trick,
            "completed_trick": self.completed_trick,
            "trick_number": self.trick_number,
            "leader": self.leader,
            "message": self.message,
            "scores": self.scores,
            "finished": self.finished,
            "waiting_for_next_trick": self.waiting_for_next_trick,
        }

    def legal_cards(self, player: str) -> list[dict[str, Any]]:
        hand = self.hands[player]
        if not self.current_trick:
            return hand
        lead_suit = self.current_trick[0]["card"]["suit"]
        follow = [card for card in hand if card["suit"] == lead_suit]
        return follow or hand

    def play_user_card(self, card_id: str) -> dict[str, Any]:
        if self.finished:
            return self.to_dict()
        if self.waiting_for_next_trick:
            self.advance_to_next_trick()
        self.prepare_for_user_turn()
        selected = self._find_card("South", card_id)
        if selected is None:
            self.message = "请选择你手牌中的合法牌出牌。"
            return self.to_dict()
        if selected not in self.legal_cards("South"):
            self.message = "你必须优先跟花色。"
            return self.to_dict()
        self._play_card("South", selected)
        self._complete_trick_cycle()
        return self.to_dict()

    def prepare_for_user_turn(self) -> None:
        if self.finished:
            return
        target_index = self._turn_order().index("South")
        while len(self.current_trick) < target_index and not self.finished:
            self._auto_play_one()

    def _turn_order(self) -> list[str]:
        index = PLAYERS.index(self.leader)
        return PLAYERS[index:] + PLAYERS[:index]

    def _auto_play_one(self) -> None:
        player = self._turn_order()[len(self.current_trick)]
        card = self._choose_ai_card(player)
        self._play_card(player, card)

    def _choose_ai_card(self, player: str) -> dict[str, Any]:
        legal = self.legal_cards(player)
        legal.sort(key=lambda card: (card["suit"], card_strength(card)))
        return legal[0]

    def _find_card(self, player: str, card_id: str) -> dict[str, Any] | None:
        for card in self.hands[player]:
            if card["id"] == card_id:
                return card
        return None

    def _play_card(self, player: str, card: dict[str, Any]) -> None:
        if card in self.hands[player]:
            self.hands[player].remove(card)
        self.current_trick.append({"player": player, "card": card})

    def _complete_trick_cycle(self) -> None:
        while len(self.current_trick) < 4 and not self.finished:
            self._auto_play_one()
        if len(self.current_trick) == 4:
            self.completed_trick = list(self.current_trick)
            winner = self._determine_trick_winner()
            if winner in {"North", "South"}:
                self.scores["NS"] += 1
            else:
                self.scores["EW"] += 1
            self.leader = winner
            self.trick_number += 1
            self.current_trick = []
            if all(not hand for hand in self.hands.values()):
                self.finished = True
                self.message = (
                    f"比赛结束，南北 {self.scores['NS']} 墩，"
                    f"东西 {self.scores['EW']} 墩。"
                )
            else:
                self.waiting_for_next_trick = True
                self.message = (
                    f"第 {self.trick_number - 1} 墩结束，{winner} 获得先手。"
                )

    def advance_to_next_trick(self) -> None:
        if self.finished or not self.waiting_for_next_trick:
            return
        self.waiting_for_next_trick = False
        self.completed_trick = []
        self.message = f"第 {self.trick_number - 1} 墩结束，{self.leader} 获得先手。"
        self.prepare_for_user_turn()

    def _determine_trick_winner(self) -> str:
        lead_suit = self.current_trick[0]["card"]["suit"]
        winning_play = self.current_trick[0]
        for play in self.current_trick[1:]:
            card = play["card"]
            if (
                card["suit"] == lead_suit
                and card_strength(card) > card_strength(winning_play["card"])
            ):
                winning_play = play
        return winning_play["player"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "hands": self.hands,
            "current_trick": self.current_trick or self.completed_trick,
            "active_trick": self.current_trick,
            "completed_trick": self.completed_trick,
            "trick_number": self.trick_number,
            "leader": self.leader,
            "message": self.message,
            "scores": self.scores,
            "finished": self.finished,
            "waiting_for_next_trick": self.waiting_for_next_trick,
            "south_legal_cards": self.legal_cards("South"),
        }
