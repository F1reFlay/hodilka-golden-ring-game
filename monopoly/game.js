// ==========================================
// МОНОПОЛИЯ ЧАСТЬ 1: ДАННЫЕ ПОЛЯ
// ==========================================
const canvas = document.getElementById("board-canvas");
const ctx = canvas.getContext("2d");

const BOARD = 720;               // логический размер доски (до масштабирования канваса)
const D = 100;                   // глубина клетки к центру (и размер угла)
const W = (BOARD - 2 * D) / 9;   // ширина обычной клетки вдоль края

const groupColors = {
    brown:  "#D85A30",
    trio:   "#378ADD", // район Черняховского/Усьевича/Планетной
    pink:   "#D4537E",
    orange: "#EF9F27",
    red:    "#E24B4A",
    yellow: "#FAC775",
    green:  "#97C459",
    blue:   "#7F77DD"
};

const groupEmoji = {
    brown: "🌾", trio: "🏙️", pink: "🌸", orange: "🍊",
    red: "🎪", yellow: "🌻", green: "🌳", blue: "💎"
};

const tileBg     = "#1c1f26";
const tileBorder = "#2e3440";
const tileText   = "#e5e9f0";
const cornerBg   = "#3C3489";
const cornerText = "#ffffff";
const specialBg  = "#2C2C2A";
const specialText= "#F1EFE8";
const innerBg    = "#0d0e10";

// 40 клеток по кругу. Цена - заготовка, дойдём до денег - используем.
const tiles = [
    { name: "СТАРТ", group: "corner", emoji: "🚀" },
    { name: "Полевая", group: "brown", price: 60 },
    { name: "Казна", group: "special", emoji: "🏦" },
    { name: "Заречная", group: "brown", price: 60 },
    { name: "Подоходный налог", group: "special", emoji: "💸" },
    { name: "Депо Северное", group: "special", emoji: "🚇", price: 200 },
    { name: "Черняховского", group: "trio", price: 100 },
    { name: "Шанс", group: "special", emoji: "❓" },
    { name: "Усьевича", group: "trio", price: 100 },
    { name: "Планетная", group: "trio", price: 120 },
    { name: "ШТРАФСТОЯНКА", group: "corner", emoji: "🚔" },
    { name: "Абрикосовая", group: "pink", price: 140 },
    { name: "Электростанция", group: "special", emoji: "⚡", price: 150 },
    { name: "Вишнёвая", group: "pink", price: 140 },
    { name: "Садовая", group: "pink", price: 160 },
    { name: "Депо Восточное", group: "special", emoji: "🚇", price: 200 },
    { name: "Кузнечная", group: "orange", price: 180 },
    { name: "Казна", group: "special", emoji: "🏦" },
    { name: "Гончарная", group: "orange", price: 180 },
    { name: "Литейная", group: "orange", price: 200 },
    { name: "ПРИВАЛ", group: "corner", emoji: "☕" },
    { name: "Тверская-Ямская", group: "red", price: 220 },
    { name: "Шанс", group: "special", emoji: "❓" },
    { name: "Пресненский Вал", group: "red", price: 220 },
    { name: "Электрозаводская", group: "red", price: 240 },
    { name: "Депо Южное", group: "special", emoji: "🚇", price: 200 },
    { name: "Мясницкая", group: "yellow", price: 260 },
    { name: "Покровка", group: "yellow", price: 260 },
    { name: "Водоканал", group: "special", emoji: "🚰", price: 150 },
    { name: "Маросейка", group: "yellow", price: 280 },
    { name: "НА ШТРАФСТОЯНКУ", group: "corner", emoji: "👮" },
    { name: "Пятницкая", group: "green", price: 300 },
    { name: "Ордынка", group: "green", price: 300 },
    { name: "Казна", group: "special", emoji: "🏦" },
    { name: "Балчуг", group: "green", price: 320 },
    { name: "Депо Западное", group: "special", emoji: "🚇", price: 200 },
    { name: "Шанс", group: "special", emoji: "❓" },
    { name: "Тверская", group: "blue", price: 350 },
    { name: "Налог на роскошь", group: "special", emoji: "💎" },
    { name: "Кутузовский", group: "blue", price: 400 }
];

// пиксельный прямоугольник клетки: угловые клетки квадратные (D x D),
// обычные - вытянуты к центру (глубина D больше ширины вдоль края W)
function getTileRect(index) {
    const i = ((index % 40) + 40) % 40;
    if (i === 0)  return { x: 0, y: BOARD - D, w: D, h: D, corner: true };
    if (i === 10) return { x: BOARD - D, y: BOARD - D, w: D, h: D, corner: true };
    if (i === 20) return { x: BOARD - D, y: 0, w: D, h: D, corner: true };
    if (i === 30) return { x: 0, y: 0, w: D, h: D, corner: true };
    if (i < 10)  return { x: D + (i - 1) * W, y: BOARD - D, w: W, h: D, side: "bottom" };
    if (i < 20)  return { x: BOARD - D, y: BOARD - D - (i - 10) * W, w: D, h: W, side: "right" };
    if (i < 30)  return { x: BOARD - D - (i - 20) * W, y: 0, w: W, h: D, side: "top" };
    return { x: 0, y: D + (i - 31) * W, w: D, h: W, side: "left" };
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

function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    const lines = [];
    let current = "";
    words.forEach(word => {
        const test = current ? current + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    });
    if (current) lines.push(current);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => ctx.fillText(line, x, startY + idx * lineHeight));
}

// ==========================================
// МОНОПОЛИЯ ЧАСТЬ 2: ПОВОРОТ ДОСКИ И ОТРИСОВКА
// ==========================================
let rotationStep = 0; // 0,1,2,3 -> 0°,90°,180°,270°
const SCALE = canvas.width / BOARD;

function rotateBoard() {
    rotationStep = (rotationStep + 1) % 4;
    document.getElementById("active-side-label").textContent = rotationStep + 1;
    drawBoard();
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const angle = rotationStep * (Math.PI / 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    ctx.scale(SCALE, SCALE);

    // внутренняя область поля
    roundRect(D * 0.15, D * 0.15, BOARD - D * 0.3, BOARD - D * 0.3, 16);
    ctx.fillStyle = innerBg;
    ctx.fill();

    for (let i = 0; i < 40; i++) {
        const tile = tiles[i];
        const r = getTileRect(i);
        const isColorGroup = !!groupColors[tile.group];

        // сама клетка, скруглённая
        roundRect(r.x, r.y, r.w, r.h, 10);
        ctx.fillStyle = tile.corner ? cornerBg : (tile.group === "special" ? specialBg : tileBg);
        ctx.fill();
        ctx.strokeStyle = tileBorder;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // цветная плашка со свечением - только у клеток с ценой/районом, НЕ на всю клетку
        if (isColorGroup) {
            const pad = (r.w > r.h ? r.h : r.w) * 0.16;
            let sx, sy, sw, sh;
            if (r.side === "bottom") { sw = r.w - pad * 2; sh = r.h * 0.28; sx = r.x + pad; sy = r.y + r.h - sh - pad * 0.6; }
            else if (r.side === "top") { sw = r.w - pad * 2; sh = r.h * 0.28; sx = r.x + pad; sy = r.y + pad * 0.6; }
            else if (r.side === "left") { sh = r.h - pad * 2; sw = r.w * 0.28; sx = r.x + pad * 0.6; sy = r.y + pad; }
            else { sh = r.h - pad * 2; sw = r.w * 0.28; sx = r.x + r.w - sw - pad * 0.6; sy = r.y + pad; }

            ctx.save();
            ctx.shadowColor = groupColors[tile.group];
            ctx.shadowBlur = 12;
            roundRect(sx, sy, sw, sh, 6);
            ctx.fillStyle = groupColors[tile.group];
            ctx.fill();
            ctx.restore();
        }

        // подпись
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = tile.corner ? cornerText : (tile.group === "special" ? specialText : tileText);
        ctx.font = tile.corner ? "700 11px sans-serif" : "600 8px sans-serif";
        const textCx = r.x + r.w / 2;
        const textCy = tile.corner ? r.y + r.h / 2 + 8 : r.y + r.h / 2 - (isColorGroup ? 5 : 0);
        wrapText(tile.name, textCx, textCy, r.w - 8, 9);

        // эмодзи для атмосферы
        if (tile.emoji) {
            ctx.font = (tile.corner ? 20 : 12) + "px sans-serif";
            const emojiY = tile.corner ? r.y + r.h / 2 - 18 : r.y + r.h - 10;
            ctx.fillText(tile.emoji, r.x + r.w / 2, emojiY);
        }
    }

    ctx.restore();

    // центр поля - статичный, НИКОГДА не поворачивается, читается с любой стороны стола
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(164,130,255,0.7)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#c9b8ff";
    ctx.font = "800 34px sans-serif";
    ctx.fillText("МОНОПОЛИЯ", cx, cy - 12);
    ctx.shadowBlur = 0;
    ctx.font = "500 15px sans-serif";
    ctx.fillStyle = "#9aa3b2";
    ctx.fillText("экономическая игра", cx, cy + 22);
}

// ==========================================
// МОНОПОЛИЯ ЧАСТЬ 3: ДИСКЛЕЙМЕР И СТАРТ
// ==========================================
function closeDisclaimer() {
    document.getElementById("disclaimer-modal").style.display = "none";
    try { localStorage.setItem("monopolyDisclaimerSeen", "1"); } catch (e) {}
}

function initDisclaimer() {
    let seen = null;
    try { seen = localStorage.getItem("monopolyDisclaimerSeen"); } catch (e) {}
    if (seen === "1") {
        document.getElementById("disclaimer-modal").style.display = "none";
    }
}

initDisclaimer();
drawBoard();
