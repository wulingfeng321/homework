/** 桥牌前端交互 */

const bridgeMessageEl = document.getElementById("bridge-message");
const bridgeNewGameBtn = document.getElementById("bridge-new-game");
const northHandEl = document.getElementById("north-hand");
const eastHandEl = document.getElementById("east-hand");
const southHandEl = document.getElementById("south-hand");
const westHandEl = document.getElementById("west-hand");
const currentTrickEl = document.getElementById("current-trick");
const scoreNsEl = document.getElementById("score-ns");
const scoreEwEl = document.getElementById("score-ew");
const trickNumberEl = document.getElementById("trick-number");

let advanceTimer = null;

async function loadBridgeState() {
    const response = await fetch("/api/bridge/state");
    renderBridge(await response.json());
}

async function newBridgeGame() {
    if (advanceTimer) {
        clearTimeout(advanceTimer);
        advanceTimer = null;
    }
    const response = await fetch("/api/bridge/new", { method: "POST" });
    renderBridge(await response.json());
}

async function playCard(card) {
    if (advanceTimer) {
        clearTimeout(advanceTimer);
        advanceTimer = null;
    }
    const response = await fetch("/api/bridge/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: card.id }),
    });
    const state = await response.json();
    renderBridge(state);

    // 等待后自动进入下一墩
    if (state.waiting_for_next_trick) {
        advanceTimer = setTimeout(async () => {
            const advanceResponse = await fetch("/api/bridge/advance", { method: "POST" });
            renderBridge(await advanceResponse.json());
            advanceTimer = null;
        }, 1200);
    }
}

function renderBridge(state) {
    // 对手手牌显示背面
    renderCards(northHandEl, state.hands.North || [], { back: true });
    renderCards(eastHandEl, state.hands.East || [], { back: true });
    renderCards(westHandEl, state.hands.West || [], { back: true });

    // 玩家手牌可点击
    const legalIds = new Set((state.south_legal_cards || []).map((card) => card.id));
    renderCards(southHandEl, state.hands.South || [], {
        onClick: playCard,
        canClick: (card) => legalIds.has(card.id) && !state.waiting_for_next_trick,
    });

    // 当前墩
    currentTrickEl.innerHTML = "";
    const trickSlots = ["North", "East", "South", "West"];
    trickSlots.forEach((seat) => {
        const play = (state.current_trick || []).find(
            (item) => item.player === seat
        );
        const slot = document.createElement("div");
        slot.className = "trick-item";
        slot.innerHTML = play
            ? `<strong>${seat}</strong><span>${play.card.label}</span>`
            : `<strong>${seat}</strong><span>等待</span>`;
        currentTrickEl.appendChild(slot);
    });

    // 更新状态
    bridgeMessageEl.textContent = state.message;
    scoreNsEl.textContent = state.scores.NS;
    scoreEwEl.textContent = state.scores.EW;
    trickNumberEl.textContent = state.trick_number;
}

bridgeNewGameBtn.addEventListener("click", newBridgeGame);

// 初始加载
loadBridgeState();
