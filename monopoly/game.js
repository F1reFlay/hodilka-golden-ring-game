const canvas = document.getElementById("board-canvas");
const ctx = canvas.getContext("2d");

// Все размеры ниже в «единицах доски» (BOARD x BOARD). Canvas хранит их в RES раз крупнее, чтобы текст был чётким.
const BOARD = 800;
const RES = canvas.width / BOARD;
const D = 112;
const W = (BOARD - 2 * D) / 9;
const GAP = 4;

const groupColors = {
    brown:  "#D85A30",
    trio:   "#378ADD",
    pink:   "#D4537E",
    orange: "#EF9F27",
    red:    "#E24B4A",
    yellow: "#FAC775",
    green:  "#97C459",
    blue:   "#7F77DD"
};

const tileBg      = "#1c1f26";
const tileBorder  = "#2e3440";
const tileText    = "#e5e9f0";
const cornerBg    = "#3C3489";
const cornerText  = "#ffffff";
const specialBg   = "#2C2C2A";
const specialText = "#F1EFE8";
const innerBg     = "#0d0e10";
const priceText   = "#8be9fd";
const taxText     = "#ff8a72";

// label: название с переносами "\n" (если нужно разбить длинное слово), иначе рисуется name.
// price: цена покупки, tax: сумма налога, hint: подпись под иконкой.
const tiles = [
    { name: "СТАРТ", group: "corner", emoji: "🚀" },
    { name: "Полевая", group: "brown", price: 60 },
    { name: "Казна", group: "special", emoji: "🏦", hint: "Возьми\nкарту" },
    { name: "Заречная", group: "brown", price: 60 },
    { name: "Подоходный налог", label: "Подоход-\nный налог", group: "special", emoji: "💰", tax: 200 },
    { name: "Депо Северное", label: "Депо\nСеверное", group: "special", emoji: "🚇", price: 200 },
    { name: "Черняховского", label: "Черняхов-\nского", group: "trio", price: 420 },
    { name: "Шанс", group: "special", emoji: "❓", hint: "Возьми\nкарту" },
    { name: "Усьевича", group: "trio", price: 420 },
    { name: "Планетная", group: "trio", price: 460 },
    { name: "ШТРАФСТОЯНКА", label: "ШТРАФ-\nСТОЯНКА", group: "corner", emoji: "🚔" },
    { name: "Абрикосовая", label: "Абрико-\nсовая", group: "pink", price: 140 },
    { name: "Электростанция", label: "Электро-\nстанция", group: "special", emoji: "⚡", price: 150 },
    { name: "Вишнёвая", group: "pink", price: 140 },
    { name: "Садовая", group: "pink", price: 160 },
    { name: "Депо Восточное", label: "Депо\nВосточное", group: "special", emoji: "🚇", price: 200 },
    { name: "Кузнечная", group: "orange", price: 180 },
    { name: "Казна", group: "special", emoji: "🏦", hint: "Возьми\nкарту" },
    { name: "Гончарная", group: "orange", price: 180 },
    { name: "Литейная", group: "orange", price: 200 },
    { name: "ПРИВАЛ", group: "corner", emoji: "☕" },
    { name: "Тверская-Ямская", label: "Тверская-\nЯмская", group: "red", price: 220 },
    { name: "Шанс", group: "special", emoji: "❓", hint: "Возьми\nкарту" },
    { name: "Пресненский Вал", label: "Преснен-\nский Вал", group: "red", price: 220 },
    { name: "Электрозаводская", label: "Электро-\nзаводская", group: "red", price: 240 },
    { name: "Депо Южное", label: "Депо\nЮжное", group: "special", emoji: "🚇", price: 200 },
    { name: "Мясницкая", group: "yellow", price: 260 },
    { name: "Покровка", group: "yellow", price: 260 },
    { name: "Водоканал", group: "special", emoji: "🚰", price: 150 },
    { name: "Маросейка", group: "yellow", price: 280 },
    { name: "НА ШТРАФСТОЯНКУ", label: "НА ШТРАФ-\nСТОЯНКУ", group: "corner", emoji: "👮" },
    { name: "Пятницкая", group: "green", price: 300 },
    { name: "Ордынка", group: "green", price: 300 },
    { name: "Казна", group: "special", emoji: "🏦", hint: "Возьми\nкарту" },
    { name: "Балчуг", group: "green", price: 320 },
    { name: "Депо Западное", label: "Депо\nЗападное", group: "special", emoji: "🚇", price: 200 },
    { name: "Шанс", group: "special", emoji: "❓", hint: "Возьми\nкарту" },
    { name: "Тверская", group: "blue", price: 240 },
    { name: "Налог на роскошь", label: "Налог на\nроскошь", group: "special", emoji: "💎", tax: 100 },
    { name: "Кутузовский", label: "Кутузов-\nский", group: "blue", price: 260 }
];

// ---- состояние игры (его создаёт logic.js; до старта игры доска рисуется пустой) ----
let gameState = null;

// ---- анимации ----
const depress = new Array(40).fill(0); // 0..1, насколько клетка «прогнулась» под фишкой
let highlightTile = -1;                // клетка, на которую идёт фишка (подсвечена, пока фишка в пути)
let rafId = 0;

function getTileRectRaw(index) {
    const i = ((index % 40) + 40) % 40;
    // нумерация клеток идёт против часовой стрелки (СТАРТ слева внизу), а фишки ходят в обратную сторону, см. TRAVEL в logic.js
    if (i === 0)  return { x: 0, y: BOARD - D, w: D, h: D, corner: true };
    if (i === 10) return { x: BOARD - D, y: BOARD - D, w: D, h: D, corner: true };
    if (i === 20) return { x: BOARD - D, y: 0, w: D, h: D, corner: true };
    if (i === 30) return { x: 0, y: 0, w: D, h: D, corner: true };
    if (i < 10)  return { x: D + (i - 1) * W, y: BOARD - D, w: W, h: D, side: "bottom" };
    if (i < 20)  return { x: BOARD - D, y: BOARD - D - (i - 10) * W, w: D, h: W, side: "right" };
    if (i < 30)  return { x: BOARD - D - (i - 20) * W, y: 0, w: W, h: D, side: "top" };
    return { x: 0, y: D + (i - 31) * W, w: D, h: W, side: "left" };
}

function getTileRect(index) {
    const raw = getTileRectRaw(index);
    return { x: raw.x + GAP / 2, y: raw.y + GAP / 2, w: raw.w - GAP, h: raw.h - GAP, side: raw.side, corner: raw.corner };
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Делит текст на строки: по "\n" из label, иначе по пробелам с учётом ширины.
function splitLines(text, maxWidth) {
    if (text.indexOf("\n") !== -1) return text.split("\n");
    const lines = [];
    let current = "";
    text.split(" ").forEach(word => {
        const test = current ? current + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    });
    if (current) lines.push(current);
    return lines;
}

// Подбирает размер шрифта так, чтобы самая длинная строка влезла в maxWidth, и рисует строки по центру.
function drawFittedText(text, x, y, maxWidth, maxSize, minSize, lineGap, weight, family) {
    let size = maxSize;
    let lines;
    for (;;) {
        ctx.font = weight + " " + size + "px " + family;
        lines = splitLines(text, maxWidth);
        const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
        if (widest <= maxWidth || size <= minSize) break;
        size -= 0.5;
    }
    const lineHeight = size + lineGap;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => ctx.fillText(line, x, startY + idx * lineHeight));
    return lines.length;
}

function getSideRotation(side) {
    if (side === "right") return -Math.PI / 2;
    if (side === "top") return Math.PI;
    if (side === "left") return Math.PI / 2;
    return 0;
}

let currentAngle = 0;
let targetAngle = 0;

function rotateBoard() {
    targetAngle += Math.PI / 2;
    const sideNumber = (Math.round(targetAngle / (Math.PI / 2)) % 4 + 4) % 4;
    document.getElementById("active-side-label").textContent = sideNumber + 1;

    const startAngle = currentAngle;
    const startTime = performance.now();
    const duration = 450;

    function frame(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        currentAngle = startAngle + (targetAngle - startAngle) * eased;
        drawBoard();
        if (typeof onBoardRotate === "function") onBoardRotate();
        if (t < 1) { requestAnimationFrame(frame); }
    }
    requestAnimationFrame(frame);
}

// Центр клетки на экране (в координатах доски 0..BOARD) с учётом поворота доски.
function tileCenterOnScreen(index) {
    const r = getTileRect(index);
    const dx = r.x + r.w / 2 - BOARD / 2, dy = r.y + r.h / 2 - BOARD / 2;
    return {
        x: BOARD / 2 + dx * Math.cos(currentAngle) - dy * Math.sin(currentAngle),
        y: BOARD / 2 + dx * Math.sin(currentAngle) + dy * Math.cos(currentAngle)
    };
}

// Какая клетка под точкой (px, py) в координатах доски на экране; -1, если никакая.
function tileAtScreenPoint(px, py) {
    const dx = px - BOARD / 2, dy = py - BOARD / 2;
    const x = BOARD / 2 + dx * Math.cos(-currentAngle) - dy * Math.sin(-currentAngle);
    const y = BOARD / 2 + dx * Math.sin(-currentAngle) + dy * Math.cos(-currentAngle);
    for (let i = 0; i < 40; i++) {
        const r = getTileRectRaw(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
}

// Рисует содержимое клетки в её собственных координатах: центр (0,0), «вниз» (+y) = к внешнему краю доски.
// lw - длина клетки вдоль стороны, lh - глубина клетки (от центра доски наружу).
function drawTileContent(tile, lw, lh, houses) {
    const isCorner = tile.group === "corner";
    const textW = lw - 10;

    if (isCorner) {
        ctx.fillStyle = cornerText;
        ctx.font = "30px sans-serif";
        ctx.fillText(tile.emoji, 0, -22);
        drawFittedText(tile.label || tile.name, 0, 24, lw - 16, 11, 8, 3, "700", "'Unbounded', sans-serif");
        return;
    }

    // цветная плашка со свечением у внешнего края
    if (groupColors[tile.group]) {
        const thin = 12;
        ctx.save();
        ctx.shadowColor = groupColors[tile.group];
        ctx.shadowBlur = 10;
        roundRect(-lw / 2 + 6, lh / 2 - thin - 6, lw - 12, thin, 4);
        ctx.fillStyle = groupColors[tile.group];
        ctx.fill();
        ctx.restore();
    }

    const hasPrice = tile.price !== undefined || tile.tax !== undefined;
    ctx.fillStyle = tile.group === "special" ? specialText : tileText;
    if (tile.emoji) {
        ctx.font = "22px sans-serif";
        ctx.fillText(tile.emoji, 0, -lh / 2 + 24);
    }
    // дома и отель - в свободной верхней части клетки (у внутреннего края)
    if (houses > 0) {
        ctx.fillStyle = "#ffffff";
        if (houses >= 5) {
            ctx.font = "17px sans-serif";
            ctx.fillText("🏨", 0, -lh / 2 + 11);
        } else {
            ctx.font = "12px sans-serif";
            for (let k = 0; k < houses; k++) ctx.fillText("🏠", (k - (houses - 1) / 2) * 13, -lh / 2 + 10);
        }
    }
    // с иконкой название ниже, без иконки - выше; двухстрочное название сдвинуто вниз, чтобы не задевать фишки
    const twoLines = (tile.label || "").indexOf("\n") !== -1;
    const nameY = tile.emoji ? -4 : (twoLines ? -3 : -10);
    drawFittedText(tile.label || tile.name, 0, nameY, textW, 12.5, 8.5, 2, "600", "sans-serif");

    if (tile.hint) {
        ctx.fillStyle = "#9aa3b2";
        drawFittedText(tile.hint, 0, lh / 2 - 26, textW, 11, 8.5, 2, "600", "sans-serif");
    }

    if (hasPrice) {
        ctx.fillStyle = tile.tax !== undefined ? taxText : priceText;
        const text = (tile.tax !== undefined ? tile.tax : tile.price) + " ₽";
        drawFittedText(text, 0, lh / 2 - (groupColors[tile.group] ? 32 : 22), textW, 13, 9, 0, "700", "sans-serif");
    }
}

// ---- фишки ----
function activePlayersOnTile(tileIdx) {
    if (!gameState) return [];
    return gameState.players.filter(p => !p.bankrupt && p.pos === tileIdx);
}

// Позиция фишки (в координатах доски) в «слоте» клетки; slot/count - место среди фишек на этой клетке.
function tokenWorldPos(tileIdx, slot, count) {
    const r = getTileRect(tileIdx);
    const corner = !!r.corner;
    const sideways = r.side === "left" || r.side === "right";
    const lh = sideways ? r.w : r.h;
    const spacing = corner ? 18 : 12.5;
    const lx = (slot - (count - 1) / 2) * spacing;
    // на улицах фишки ниже домов, на остальных клетках у самого внутреннего края
    const ly = corner ? 0 : (groupColors[tiles[tileIdx].group] ? -30 : -lh / 2 + 13);
    const rot = corner ? 0 : getSideRotation(r.side);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    return {
        x: cx + lx * Math.cos(rot) - ly * Math.sin(rot),
        y: cy + lx * Math.sin(rot) + ly * Math.cos(rot)
    };
}

function slotOnTile(tileIdx, player) {
    const list = activePlayersOnTile(tileIdx).slice();
    if (list.indexOf(player) === -1) list.push(player);
    list.sort((a, b) => gameState.players.indexOf(a) - gameState.players.indexOf(b));
    return { slot: list.indexOf(player), count: list.length };
}

function drawToken(player, x, y, boost, shadowX, shadowY) {
    const radius = 6.6 * boost;
    if (shadowX !== undefined) {
        ctx.beginPath();
        ctx.arc(shadowX, shadowY + 1.5, 6.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fill();
    }
    ctx.save();
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#0d0e10";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
}

function drawTokens() {
    if (!gameState) return;
    const order = gameState.players.filter(p => !p.bankrupt);
    // ходящий рисуется поверх остальных
    order.sort((a, b) => (gameState.players.indexOf(a) === gameState.current ? 1 : 0) - (gameState.players.indexOf(b) === gameState.current ? 1 : 0));
    order.forEach(p => {
        if (p.hop) {
            const fs = slotOnTile(p.hop.from, p);
            const ts = slotOnTile(p.hop.to, p);
            const a = tokenWorldPos(p.hop.from, fs.slot, fs.count);
            const b = tokenWorldPos(p.hop.to, ts.slot, ts.count);
            const e = p.hop.t < 0.5 ? 2 * p.hop.t * p.hop.t : 1 - Math.pow(-2 * p.hop.t + 2, 2) / 2;
            const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
            drawToken(p, x, y, 1 + 0.55 * Math.sin(Math.PI * p.hop.t), x, y);
        } else {
            const s = slotOnTile(p.pos, p);
            const pos = tokenWorldPos(p.pos, s.slot, s.count);
            drawToken(p, pos.x, pos.y, 1);
        }
    });
}

// Фишка «наступает» на клетку: клетка прогибается, пока на ней фишка (или она вот-вот приземлится).
function occupiedTiles() {
    const set = new Set();
    if (!gameState) return set;
    gameState.players.forEach(p => {
        if (p.bankrupt) return;
        if (p.hop) {
            if (p.hop.t <= 0.15) set.add(p.hop.from);
            if (p.hop.t >= 0.55) set.add(p.hop.to);
        } else {
            set.add(p.pos);
        }
    });
    return set;
}

function tick() {
    rafId = 0;
    let active = false;
    const occupied = occupiedTiles();
    for (let i = 0; i < 40; i++) {
        const target = occupied.has(i) ? 1 : 0;
        const diff = target - depress[i];
        if (Math.abs(diff) > 0.01) { depress[i] += diff * 0.3; active = true; }
        else depress[i] = target;
    }
    if (highlightTile >= 0) active = true;
    if (gameState && gameState.players.some(p => p.hop)) active = true;
    drawBoard();
    if (active) requestDraw();
}

function requestDraw() {
    if (!rafId) rafId = requestAnimationFrame(tick);
}

// Прыжок фишки на соседнюю (или дальнюю) клетку; завершается, когда фишка приземлилась.
function hopToken(player, to, ms) {
    return new Promise(resolve => {
        const start = performance.now();
        const duration = ms || 230;
        player.hop = { from: player.pos, to: to, t: 0 };
        function step(now) {
            const t = Math.min((now - start) / duration, 1);
            if (player.hop) player.hop.t = t;
            requestDraw();
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                player.pos = to;
                player.hop = null;
                requestDraw();
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

function drawBoard() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(RES, RES);
    const cx = BOARD / 2, cy = BOARD / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(currentAngle);
    ctx.translate(-cx, -cy);

    roundRect(D * 0.15, D * 0.15, BOARD - D * 0.3, BOARD - D * 0.3, 18);
    ctx.fillStyle = innerBg;
    ctx.fill();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 140);

    for (let i = 0; i < 40; i++) {
        const tile = tiles[i];
        const isCorner = tile.group === "corner";
        const r = getTileRect(i);
        const owner = gameState ? gameState.owners[i] : undefined;
        const ownerColor = owner !== undefined ? gameState.players[owner].color : null;

        ctx.save();
        // прогиб: клетка чуть уменьшается вокруг своего центра
        const squish = 1 - 0.12 * depress[i];
        const tcx = r.x + r.w / 2, tcy = r.y + r.h / 2;
        ctx.translate(tcx, tcy);
        ctx.scale(squish, squish);
        ctx.translate(-tcx, -tcy);

        roundRect(r.x, r.y, r.w, r.h, 10);
        ctx.fillStyle = isCorner ? cornerBg : (tile.group === "special" ? specialBg : tileBg);
        ctx.fill();

        if (i === highlightTile) {
            ctx.save();
            ctx.shadowColor = "#a482ff";
            ctx.shadowBlur = 10 + 14 * pulse;
            ctx.fillStyle = "rgba(164,130,255," + (0.12 + 0.12 * pulse) + ")";
            ctx.fill();
            ctx.strokeStyle = "#c9b8ff";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        } else if (ownerColor) {
            ctx.save();
            ctx.shadowColor = ownerColor;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = ownerColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.strokeStyle = tileBorder;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // текст развёрнут по своей стороне (задумано: так читается с «места» игрока, для удобства есть кнопка «Повернуть»)
        const sideways = r.side === "left" || r.side === "right";
        const lw = sideways ? r.h : r.w;
        const lh = sideways ? r.w : r.h;
        ctx.save();
        ctx.translate(tcx, tcy);
        ctx.rotate(isCorner ? -currentAngle : getSideRotation(r.side));
        drawTileContent(tile, lw, lh, gameState ? (gameState.houses[i] || 0) : 0);
        if (gameState && gameState.mortgaged && gameState.mortgaged[i]) {
            // заложенная клетка: затемнена, с замком
            roundRect(-lw / 2, -lh / 2, lw, lh, 10);
            ctx.fillStyle = "rgba(13,14,16,0.68)";
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "22px sans-serif";
            ctx.fillText("🔒", 0, -2);
            ctx.font = "700 8px sans-serif";
            ctx.fillStyle = "#c9b8ff";
            ctx.fillText("В ЗАЛОГЕ", 0, 16);
        }
        ctx.restore();

        ctx.restore();
    }

    drawTokens();

    ctx.restore();

    // центр поля - статичный, шрифт Unbounded, свечение
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(164,130,255,0.7)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#c9b8ff";
    ctx.font = "900 40px 'Unbounded', sans-serif";
    ctx.fillText("МОНОПОЛИЯ", cx, cy - 12);
    ctx.shadowBlur = 0;
    ctx.font = "500 15px sans-serif";
    ctx.fillStyle = "#9aa3b2";
    ctx.fillText("экономическая игра", cx, cy + 24);
}

function closeDisclaimer() {
    document.getElementById("disclaimer-modal").style.display = "none";
    try { localStorage.setItem("monopolyDisclaimerSeen", "1"); } catch (e) {}
    if (typeof openSetup === "function") openSetup();
}

document.fonts.ready.then(drawBoard);
drawBoard();
