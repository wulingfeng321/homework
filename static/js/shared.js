/** 共享渲染工具 */

function cardTemplate(card, back = false) {
    const div = document.createElement("div");
    div.className = back ? "playing-card back" : "playing-card";
    div.textContent = back ? "背面" : card.label;
    return div;
}

function renderCards(container, cards, { back = false, onClick = null, canClick = null } = {}) {
    container.innerHTML = "";
    cards.forEach((card) => {
        const element = cardTemplate(card, back);
        if (onClick && !back && (!canClick || canClick(card))) {
            element.addEventListener("click", () => onClick(card));
        }
        container.appendChild(element);
    });
}
