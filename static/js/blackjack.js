/**
 * 欧式 Blackjack（21点）游戏逻辑
 *
 * 核心规则差异（欧式）：
 * 1. 庄家起始只发一张明牌，无暗牌（Hole Card）
 * 2. 玩家先完成所有操作（Hit/Stand），庄家再抽第二张牌
 * 3. 庄家自然 Blackjack（前两张牌为 A+10点牌）：
 *    - 玩家也是自然 Blackjack → 平局
 *    - 否则庄家胜（即使玩家总点数为21但非自然 Blackjack）
 */

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

let deck = [];
let dealerCards = [];
let playerCards = [];
let gameOver = false;

// 计算手牌点数，返回 [总值, 是否为软牌（A算11）]
function calculateScore(cards) {
    let total = 0;
    let aceCount = 0;

    for (const card of cards) {
        if (card.rank === "A") {
            aceCount++;
            total += 11;
        } else if (["K", "Q", "J"].includes(card.rank)) {
            total += 10;
        } else {
            total += parseInt(card.rank);
        }
    }

    // A 从 11 降为 1 直到不爆牌
    while (total > 21 && aceCount > 0) {
        total -= 10;
        aceCount--;
    }

    return total;
}

// 判断是否为自然 Blackjack（前两张牌 A + 10点牌）
function isNaturalBlackjack(cards) {
    if (cards.length !== 2) return false;
    const hasAce = cards.some(c => c.rank === "A");
    const hasTen = cards.some(c => ["K", "Q", "J", "10"].includes(c.rank));
    return hasAce && hasTen;
}

// 洗牌
function shuffleDeck() {
    deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    // Fisher-Yates 洗牌算法
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// 抽一张牌
function drawCard() {
    if (deck.length === 0) shuffleDeck();
    return deck.pop();
}

// 渲染一张牌的 HTML
function createCardHTML(card, faceDown = false) {
    if (faceDown) {
        return '<div class="card back"></div>';
    }
    const isRed = card.suit === "♥" || card.suit === "♦";
    const redClass = isRed ? " red" : "";
    return `<div class="card${redClass}">
        <span class="rank">${card.rank}</span>
        <span class="suit">${card.suit}</span>
    </div>`;
}

// 渲染手牌区域
function renderCards(containerId, cards, hideFirst = false) {
    const container = document.getElementById(containerId);
    let html = "";
    for (let i = 0; i < cards.length; i++) {
        html += createCardHTML(cards[i], i === 0 && hideFirst);
    }
    container.innerHTML = html;
}

// 更新UI
function updateUI(showDealerAll = false) {
    // 欧式规则：庄家起始只有一张明牌，无暗牌占位
    const dealerContainer = document.getElementById("dealer-cards");
    let dealerHTML = "";
    for (let i = 0; i < dealerCards.length; i++) {
        dealerHTML += createCardHTML(dealerCards[i]);
    }
    dealerContainer.innerHTML = dealerHTML;

    // 玩家牌
    renderCards("player-cards", playerCards);

    // 分数
    const dealerScore = calculateScore(dealerCards);
    document.getElementById("dealer-score").textContent =
        showDealerAll ? `(${dealerScore})` : "";
    document.getElementById("player-score").textContent =
        `(${calculateScore(playerCards)})`;
}

// 新游戏
function newGame() {
    shuffleDeck();
    dealerCards = [];
    playerCards = [];
    gameOver = false;

    // 庄家先抽一张明牌
    dealerCards.push(drawCard());
    // 玩家抽两张牌
    playerCards.push(drawCard());
    playerCards.push(drawCard());

    updateUI(false);

    document.getElementById("btn-hit").disabled = false;
    document.getElementById("btn-stand").disabled = false;
    document.getElementById("btn-new-game").textContent = "重新开始";
    document.getElementById("game-result").textContent = "";
    document.getElementById("game-result").className = "game-result";
}

// 玩家要牌
function playerHit() {
    if (gameOver) return;

    playerCards.push(drawCard());
    updateUI(false);

    const score = calculateScore(playerCards);
    if (score > 21) {
        // 玩家爆牌，立即输
        endGame("lose", "你爆牌了！（" + score + " 点）庄家胜。");
    }
}

// 玩家停牌——庄家回合
function playerStand() {
    if (gameOver) return;

    document.getElementById("btn-hit").disabled = true;
    document.getElementById("btn-stand").disabled = true;

    // 庄家抽取第二张牌
    dealerCards.push(drawCard());
    updateUI(true);

    // 检查庄家自然 Blackjack
    if (isNaturalBlackjack(dealerCards)) {
        if (isNaturalBlackjack(playerCards)) {
            // 双方都是自然 Blackjack → 平局
            endGame("push", "双方都是自然 Blackjack，平局！");
        } else {
            // 庄家自然 Blackjack，玩家不是 → 庄家胜
            endGame("lose", "庄家自然 Blackjack！庄家胜。");
        }
        return;
    }

    // 庄家按规则要牌（软17也停？标准规则：庄家17点及以上停牌）
    let dealerScore = calculateScore(dealerCards);
    while (dealerScore < 17) {
        dealerCards.push(drawCard());
        dealerScore = calculateScore(dealerCards);
    }
    updateUI(true);

    // 判断胜负
    const playerScore = calculateScore(playerCards);

    if (dealerScore > 21) {
        endGame("win", "庄家爆牌（" + dealerScore + " 点），你赢了！");
    } else if (playerScore > dealerScore) {
        if (isNaturalBlackjack(playerCards)) {
            endGame("win", "自然 Blackjack！你赢了！");
        } else {
            endGame("win", "你 " + playerScore + " 点 vs 庄家 " + dealerScore + " 点，你赢了！");
        }
    } else if (playerScore === dealerScore) {
        endGame("push", "平局！（双方各 " + playerScore + " 点）");
    } else {
        endGame("lose", "你 " + playerScore + " 点 vs 庄家 " + dealerScore + " 点，庄家胜。");
    }
}

// 游戏结束
function endGame(result, message) {
    gameOver = true;
    document.getElementById("btn-hit").disabled = true;
    document.getElementById("btn-stand").disabled = true;
    updateUI(true);

    const resultEl = document.getElementById("game-result");
    resultEl.textContent = message;
    resultEl.className = "game-result " + result;
}

// 事件绑定
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-new-game").addEventListener("click", newGame);
    document.getElementById("btn-hit").addEventListener("click", playerHit);
    document.getElementById("btn-stand").addEventListener("click", playerStand);

    // 初始开始一局
    newGame();
});
