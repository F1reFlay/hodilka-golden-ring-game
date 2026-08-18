// ==========================================
// МОНОПОЛИЯ ЧАСТЬ 1: ДАННЫЕ ПОЛЯ
// ==========================================
const canvas = document.getElementById("board-canvas");
const ctx = canvas.getContext("2d");

const GRID = 11;
const CELL = canvas.width / GRID;

// цвета групп - в духе остального сайта (тёмная тема, приглушённые акценты)
const groupColors = {
    brown:   { fill: "#4A1B0C", text: "#FAECE7" },
    trio:    { fill: "#0C447C", text: "#E6F1FB" }, // район Черняховского/Усьевича/Планетной
    pink:    { fill: "#72243E", text: "#FBEAF0" },
    orange:  { fill: "#633806", text: "#FAEEDA" },
    red:     { fill: "#791F1F", text: "#FCEBEB" },
    yellow:  { fill: "#854F0B", text: "#FAEEDA" },
    green:   { fill: "#27500A", text: "#EAF3DE" },
    blue:    { fill: "#26215C", text: "#EEEDFE" },
    util:    { fill: "#444441", text: "#F1EFE8" },
    corner:  { fill: "#3C3489", text: "#EEEDFE" },
    special: { fill: "#2C2C2A", text: "#F1EFE8" }
};

// 40 клеток по кругу. Цена/аренда - заглушки (null), заполним, когда дойдём до денег.
const tiles = [
    { name: "СТАРТ", group: "corner", corner: true },
    { name: "Полевая", group: "brown", price: 60 },
    { name: "Казна", group: "special" },
    { name: "Заречная", group: "brown", price: 60 },
    { name: "Подоходный налог", group: "special" },
    { name: "Депо Северное", group: "util", price: 200 },
    { name: "Черняховского", group: "trio", price: 100 },
    { name: "Шанс", group: "special" },
    { name: "Усьевича", group: "trio", price: 100 },
    { name: "Планетная", group: "trio", price: 120 },
    { name: "ШТРАФСТОЯНКА", group: "corner", corner: true },
    { name: "Абрикосовая", group: "pink", price: 140 },
    { name: "Электростанция", group: "util", price: 150 },
    { name: "Вишнёвая", group: "pink", price: 140 },
    { name: "Садовая", group: "pink", price: 160 },
    { name: "Депо Восточное", group: "util", price: 200 },
    { name: "Кузнечная", group: "orange", price: 180 },
    { name: "Казна", group: "special" },
    { name: "Гончарная", group: "orange", price: 180 },
    { name: "Литейная", group: "orange", price: 200 },
    { name: "ПРИВАЛ", group: "corner", corner: true },
    { name: "Тверская-Ямская", group: "red", price: 220 },
    { name: "Шанс", group: "special" },
    { name: "Пресненский Вал", group: "red", price: 220 },
    { name: "Электрозаводская", group: "red", price: 240 },
    { name: "Депо Южное", group: "util", price: 200 },
    { name: "Мясницкая", group: "yellow", price: 260 },
    { name: "Покровка", group: "yellow", price: 260 },
    { name: "Водоканал", group: "util", price: 150 },
    { name: "Маросейка", group: "yellow", price: 280 },
    { name: "НА ШТРАФСТОЯНКУ", group: "corner", corner: true },
    { name: "Пятницкая", group: "green", price: 300 },
    { name: "Ордынка", group: "green", price: 300 },
    { name: "Казна", group: "special" },
    { name: "Балчуг", group: "green", price: 320 },
    { name: "Депо Западное", group: "util", price: 200 },
    { name: "Шанс", group: "special" },
    { name: "Тверская", group: "blue", price: 350 },
    { name: "Налог на роскошь", group: "special" },
    { name: "Кутузовский", group: "blue", price: 400 }
];

// index 0..39 -> позиция (col,row) в сетке 11x11, обход по часовой стрелке,
// 0 = нижний правый угол (СТАРТ), как в классической монополии
function getTileGridPos(index) {
    const i = ((index % 40) + 40) % 40;
    if (i <= 10) {
        return { col: i, row: GRID - 1 };
    } else if (i <= 20) {
        return { col: GRID - 1, row: GRID - 1 - (i - 10) };
    } else if (i <= 30) {
        return { col: GRID - 1 - (i - 20), row: 0 };
    } else {
        return { col: 0, row: i - 30 };
    }
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

function rotateBoard() {
    rotationStep = (rotationStep + 1) % 4;
    document.getElementById("active-side-label").textContent = rotationStep + 1;
    drawBoard();
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const angle = rotationStep * (Math.PI / 2);

    // клетки и подписи на них поворачиваем вместе, как настоящий стол -
    // именно поэтому и нужна кнопка поворота, чтобы прочитать свою сторону
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = "#0d0e10";
    ctx.fillRect(CELL, CELL, canvas.width - CELL * 2, canvas.height - CELL * 2);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 40; i++) {
        const { col, row } = getTileGridPos(i);
        const x = col * CELL, y = row * CELL;
        const tile = tiles[i];
        const colors = groupColors[tile.group];

        ctx.fillStyle = colors.fill;
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = "#111213";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL, CELL);

        ctx.fillStyle = colors.text;
        ctx.font = tile.corner ? "bold 9px sans-serif" : "bold 8px sans-serif";
        wrapText(tile.name, x + CELL / 2, y + CELL / 2, CELL - 6, 9);
    }
    ctx.restore();

    // центр поля - статичный, НИКОГДА не поворачивается, читается с любой стороны стола
    ctx.fillStyle = "#f1f2f3";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("МЕТРОПОЛИЯ", cx, cy - 10);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#9aa3b2";
    ctx.fillText("экономическая игра", cx, cy + 16);
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
