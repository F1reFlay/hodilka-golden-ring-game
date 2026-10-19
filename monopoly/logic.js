// Правила и интерфейс игры. Доска, фишки и анимации лежат в game.js.
// Играют 2-4 человека за одним экраном по классическим правилам (залог, обмен и аукцион добавим позже).

const START_MONEY = 1500;
const GO_SALARY = 200;
const JAIL_FINE = 50;
const JAIL_TILE = 10;
const GO_TO_JAIL_TILE = 30;
const DEPOT_TILES = [5, 15, 25, 35];
const UTILITY_TILES = [12, 28];
const PLAYER_COLORS = ["#3ee0ff", "#b4f23d", "#ffffff", "#ffd23f"];
const MAX_HOUSES = 4;   // больше 4 домов нельзя; отель (уровень 5) строится только на месте 4 домов
const HOTEL_LEVEL = 5;
const HOUSE_SUPPLY = 32; // в банке всего 32 дома и 12 отелей, как в настоящей игре
const HOTEL_SUPPLY = 12;
// Номера клеток идут против часовой стрелки (СТАРТ слева внизу), а фишки ходят по часовой: номер клетки при каждом шаге уменьшается.
const TRAVEL = -1;
// Сколько шагов от клетки from до клетки to по ходу игры.
const stepsTo = (from, to) => ((to - from) * TRAVEL % 40 + 40) % 40;

// Рента улиц: [без домов, 1 дом, 2, 3, 4 дома, отель]. Без домов, но при полной цветовой группе, рента вдвое больше.
const RENTS = {
    1: [2, 10, 30, 90, 160, 250],        3: [4, 20, 60, 180, 320, 450],
    6: [60, 240, 700, 1600, 1900, 2200],  8: [60, 240, 700, 1600, 1900, 2200], 9: [70, 280, 800, 1800, 2100, 2500],
    11: [10, 50, 150, 450, 625, 750],    13: [10, 50, 150, 450, 625, 750],   14: [12, 60, 180, 500, 700, 900],
    16: [14, 70, 200, 550, 750, 950],    18: [14, 70, 200, 550, 750, 950],   19: [16, 80, 220, 600, 800, 1000],
    21: [18, 90, 250, 700, 875, 1050],   23: [18, 90, 250, 700, 875, 1050],  24: [20, 100, 300, 750, 925, 1100],
    26: [22, 110, 330, 800, 975, 1150],  27: [22, 110, 330, 800, 975, 1150], 29: [24, 120, 360, 850, 1025, 1200],
    31: [26, 130, 390, 900, 1100, 1275], 32: [26, 130, 390, 900, 1100, 1275], 34: [28, 150, 450, 1000, 1200, 1400],
    37: [20, 100, 300, 750, 925, 1100],   39: [22, 110, 330, 800, 975, 1150]
};
const HOUSE_COST = { brown: 50, trio: 250, pink: 100, orange: 100, red: 150, yellow: 150, green: 200, blue: 150 };
const GROUP_ORDER = ["brown", "trio", "pink", "orange", "red", "yellow", "green", "blue"];

const NOTE_VALUES = [500, 100, 50, 10, 5, 1];
const NOTE_COLORS = { 500: "#c4b5fd", 100: "#86efac", 50: "#7dd3fc", 10: "#ffd166", 5: "#ff9bd0", 1: "#e5e9f0" };

const CORNER_INFO = {
    0: "Каждый раз, когда проходишь СТАРТ, банк платит тебе 200 ₽.",
    10: "Просто в гостях, если не отправили сюда. Иначе нужно выйти: дубль, штраф 50 ₽ или карта.",
    20: "Привал. Можно отдохнуть, ничего не происходит.",
    30: "Отправляйся на Штрафстоянку. СТАРТ не проходишь, 200 ₽ не получаешь."
};

// Карты: a - действие, v - значение. Половина классические, половина про программирование.
const CHANCE_CARDS = [
    { t: "Компилятор не нашёл ни одной ошибки с первого раза. Получи 100 ₽.", a: "money", v: 100 },
    { t: "Забыл точку с запятой, и всё упало. Заплати штраф 50 ₽.", a: "money", v: -50 },
    { t: "Деплой в пятницу вечером! Отправляйся на Штрафстоянку.", a: "jail" },
    { t: "Баг исправлен, релиз вышел. Иди на СТАРТ и получи 200 ₽.", a: "moveTo", v: 0 },
    { t: "Продвинься до улицы Кутузовский.", a: "moveTo", v: 39 },
    { t: "Продвинься до Тверской-Ямской. Если проходишь СТАРТ, получи 200 ₽.", a: "moveTo", v: 21 },
    { t: "Откати последний коммит: вернись на 3 клетки назад.", a: "back", v: 3 },
    { t: "Бесплатный выход из Штрафстоянки. Карту можно оставить у себя.", a: "jailFree" },
    { t: "Банк выплачивает тебе дивиденды 50 ₽.", a: "money", v: 50 },
    { t: "Продвинься до ближайшего депо. Если оно чужое, заплати владельцу вдвое больше обычного.", a: "nearestDepot" },
    { t: "Ты провёл хакатон для друзей. Заплати каждому игроку по 25 ₽.", a: "eachPay", v: 25 },
    { t: "Штраф за превышение скорости 15 ₽.", a: "money", v: -15 },
    { t: "Переполнение стека! Заплати 40 ₽ за перезапуск сервера.", a: "money", v: -40 },
    { t: "Твой проект выложили в открытый доступ, и каждый игрок отправляет тебе по 20 ₽.", a: "eachCollect", v: 20 }
];

const COMMUNITY_CARDS = [
    { t: "Банковская ошибка в твою пользу. Получи 200 ₽.", a: "money", v: 200 },
    { t: "Оплата хостинга. Заплати 50 ₽.", a: "money", v: -50 },
    { t: "Ты продал своё приложение в магазине. Получи 50 ₽.", a: "money", v: 50 },
    { t: "Бесплатный выход из Штрафстоянки. Карту можно оставить у себя.", a: "jailFree" },
    { t: "Утечка паролей! Отправляйся на Штрафстоянку.", a: "jail" },
    { t: "День рождения! Каждый игрок дарит тебе по 10 ₽.", a: "eachCollect", v: 10 },
    { t: "Возврат налога. Получи 20 ₽.", a: "money", v: 20 },
    { t: "Страховка выплачена. Получи 100 ₽.", a: "money", v: 100 },
    { t: "Оплата курсов по Python. Заплати 100 ₽.", a: "money", v: -100 },
    { t: "Ты выиграл конкурс по программированию. Получи 25 ₽.", a: "money", v: 25 },
    { t: "Иди на СТАРТ и получи 200 ₽.", a: "moveTo", v: 0 },
    { t: "Получено наследство. Получи 100 ₽.", a: "money", v: 100 },
    { t: "Подписка на редактор кода. Заплати 40 ₽.", a: "money", v: -40 },
    { t: "Ты исправил баг в чужом проекте. Получи 30 ₽.", a: "money", v: 30 }
];

let lastDiceSum = 7;
let logLines = [];
let setupCount = 2;
let infoTile = -1;     // клетка, на которой стоит фишка (экранчик с информацией)
let hoverTile = -1;    // клетка под мышкой
let pinnedTile = -1;   // клетка, на которую нажали (для телефона)
let propsView = null;  // чьи владения показаны (null = ходящего)
let previewTimer = 0;

// ---------- мелкие помощники ----------
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rollDie = () => 1 + Math.floor(Math.random() * 6);
const money = n => n.toLocaleString("ru-RU") + " ₽";
const cur = () => gameState.players[gameState.current];
const idxOf = p => gameState.players.indexOf(p);
const alivePlayers = () => gameState.players.filter(p => !p.bankrupt);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const houseEmoji = n => n >= HOTEL_LEVEL ? "🏨" : "🏠".repeat(n);

function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function tileKind(i) {
    if (DEPOT_TILES.indexOf(i) !== -1) return "depot";
    if (UTILITY_TILES.indexOf(i) !== -1) return "utility";
    if (groupColors[tiles[i].group]) return "street";
    return "other";
}

function groupMembers(group) {
    return tiles.map((t, i) => i).filter(i => tiles[i].group === group);
}

const housesOn = i => (gameState && gameState.houses[i]) || 0;
const isMortgaged = i => !!(gameState && gameState.mortgaged[i]);
const mortgageValue = i => tiles[i].price / 2;
const unmortgageCost = i => Math.round(tiles[i].price * 0.55); // залог + 10%
// Кто сейчас распоряжается имуществом: ходящий игрок или должник, пока он собирает деньги.
const actor = () => gameState.actor || cur();

// ---------- купюры ----------
// У каждого игрока настоящий набор купюр (player.notes); сумма денег (player.money) считается из него.
const START_NOTES = { 500: 2, 100: 3, 50: 3, 10: 4, 5: 2, 1: 0 };
const emptyNotes = () => ({ 500: 0, 100: 0, 50: 0, 10: 0, 5: 0, 1: 0 });
const notesTotal = n => NOTE_VALUES.reduce((s, v) => s + v * (n[v] || 0), 0);

function notesFromAmount(amount) {
    const r = emptyNotes();
    let rest = amount;
    NOTE_VALUES.forEach(v => { r[v] = Math.floor(rest / v); rest -= r[v] * v; });
    return r;
}
function addNotes(target, add) { NOTE_VALUES.forEach(v => { target[v] += add[v] || 0; }); }
function subNotes(target, sub) { NOTE_VALUES.forEach(v => { target[v] -= sub[v] || 0; }); }

// Игрок.money - сумма его купюр; в сохранение не попадает (enumerable: false).
function attachMoney(p) {
    Object.defineProperty(p, "money", { get() { return notesTotal(p.notes); }, enumerable: false, configurable: true });
    return p;
}

// Набор купюр из have ровно на target или null.
function findSubset(have, target) {
    function rec(i, rest) {
        if (rest === 0) return emptyNotes();
        if (i >= NOTE_VALUES.length) return null;
        const v = NOTE_VALUES[i];
        for (let k = Math.min(have[v], Math.floor(rest / v)); k >= 0; k--) {
            const sub = rec(i + 1, rest - k * v);
            if (sub) { sub[v] = k; return sub; }
        }
        return null;
    }
    return rec(0, target);
}

// Какие купюры отдать за amount: ровно, а если нельзя, то с минимальной переплатой (сдачу даст банк).
function pickNotesToPay(player, amount) {
    const total = player.money;
    for (let t = amount; t <= total; t++) {
        const sub = findSubset(player.notes, t);
        if (sub) return { given: sub, change: t - amount };
    }
    return null;
}

// Перевод amount от from к to (to === null: банку). Сдачу всегда даёт банк. Деньги проверяются заранее.
function settle(from, to, amount) {
    const r = pickNotesToPay(from, amount);
    subNotes(from.notes, r.given);
    if (to) addNotes(to.notes, r.given); // банк свои купюры не копит
    if (r.change > 0) {
        if (to) {
            // получатель вернул бы сдачу сам: она уходит банку, а плательщик берёт такую же сумму из банка
            const back = pickNotesToPay(to, r.change);
            subNotes(to.notes, back.given);
            if (back.change > 0) addNotes(to.notes, notesFromAmount(back.change));
        }
        addNotes(from.notes, notesFromAmount(r.change));
    }
}

// ---------- события (строка-консоль) ----------
function say(text) {
    logLines.unshift(text);
    logLines = logLines.slice(0, 60);
    $("log-last").textContent = text;
    $("log-full").innerHTML = logLines.map(l => "<div>" + esc(l) + "</div>").join("");
}

function toggleLog() {
    const open = $("log-full").classList.toggle("hidden") === false;
    $("log-bar").classList.toggle("open", open);
}

// ---------- вопросы и кнопки ----------
function setPrompt(text) { $("prompt").textContent = text || ""; }

function renderButtons(list) {
    const box = $("buttons");
    box.innerHTML = "";
    list.forEach(o => {
        const b = document.createElement("button");
        b.className = "btn" + (o.primary ? " primary" : "");
        b.textContent = o.label;
        b.disabled = !!o.disabled;
        b.onclick = o.onClick;
        box.appendChild(b);
    });
}

// Показывает вопрос и кнопки, возвращает value нажатой кнопки. Пока ждём ответ, можно строить дома, закладывать, меняться.
// options - список или функция, возвращающая список (пересчитывается при каждом обновлении панелей).
// auto - функция: как только вернёт true, вопрос закрывается сам со значением "auto".
function ask(text, options, auto) {
    return new Promise(resolve => {
        const pending = { options: options, auto: auto, resolve: null };
        pending.resolve = value => {
            gameState.pending = null;
            gameState.idle = false;
            renderButtons([]);
            setPrompt("");
            renderProps();
            updateManageRow();
            resolve(value);
        };
        gameState.pending = pending;
        gameState.idle = true;
        setPrompt(text);
        renderAsk();
        renderProps();
        updateManageRow();
    });
}

function renderAsk() {
    const pd = gameState && gameState.pending;
    if (!pd) return;
    if (pd.auto && pd.auto()) { pd.resolve("auto"); return; }
    const list = typeof pd.options === "function" ? pd.options() : pd.options;
    renderButtons(list.map(o => ({ label: o.label, primary: o.primary, disabled: o.disabled, onClick: () => pd.resolve(o.value) })));
}

function showCard(deckKey, text) {
    return new Promise(resolve => {
        const chance = deckKey === "chance";
        $("card-box").className = "modal-box card-box " + (chance ? "chance" : "community");
        $("card-icon").textContent = chance ? "❓" : "🏦";
        $("card-title").textContent = chance ? "Шанс" : "Казна";
        $("card-text").textContent = text;
        $("card-modal").classList.remove("hidden");
        $("card-ok").onclick = () => { $("card-modal").classList.add("hidden"); resolve(); };
    });
}

// ---------- кубики ----------
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function buildDice() {
    ["die1", "die2"].forEach(id => {
        const die = $(id);
        die.innerHTML = "";
        for (let i = 0; i < 9; i++) die.appendChild(document.createElement("span")).className = "pip";
    });
    setDie($("die1"), 1);
    setDie($("die2"), 1);
}

function setDie(el, value) {
    const pips = el.children;
    for (let i = 0; i < 9; i++) pips[i].classList.toggle("on", PIPS[value].indexOf(i) !== -1);
}

async function animateDice(a, b) {
    const d1 = $("die1"), d2 = $("die2");
    $("roll-sum").textContent = "…";
    $("roll-note").textContent = "";
    d1.classList.add("rolling");
    d2.classList.add("rolling");
    const end = performance.now() + 850;
    while (performance.now() < end) {
        setDie(d1, rollDie());
        setDie(d2, rollDie());
        await sleep(80);
    }
    d1.classList.remove("rolling");
    d2.classList.remove("rolling");
    setDie(d1, a);
    setDie(d2, b);
    $("roll-sum").textContent = a + b;
    $("roll-note").textContent = a === b ? "дубль!" : "ходит на";
}

// ---------- карточка клетки (экранчик и предпросмотр владений) ----------
function tileInfoHTML(idx) {
    const t = tiles[idx];
    const kind = tileKind(idx);
    const owner = gameState ? gameState.owners[idx] : undefined;
    const ownerHtml = owner !== undefined
        ? '<span class="tc-owner"><i style="--pc:' + gameState.players[owner].color + '"></i>' + esc(gameState.players[owner].name) + "</span>"
        : (t.price !== undefined ? "<span>Свободна</span>" : "<span></span>");
    const bg = groupColors[t.group] || (t.group === "corner" ? "#3C3489" : "#4b5263");
    const light = !groupColors[t.group];
    const sub = isMortgaged(idx) ? "🔒 в залоге" : (t.price !== undefined ? money(t.price) : (t.tax !== undefined ? "налог " + money(t.tax) : ""));
    const head = '<div class="tc-head' + (light ? " light" : "") + '" style="--g:' + bg + '"><span>' +
        (t.emoji ? t.emoji + " " : "") + esc(t.name) + '</span><span class="tc-sub">' + sub + "</span></div>";
    let body = "";

    if (kind === "street") {
        const r = RENTS[idx];
        const built = housesOn(idx);
        const rows = [["Рента", r[0]], ["Вся группа", r[0] * 2], ["🏠", r[1]], ["🏠🏠", r[2]], ["🏠🏠🏠", r[3]], ["🏠×4", r[4]], ["🏨", r[5]]];
        body = (built ? '<div class="tc-built">' + houseEmoji(built) + "</div>" : "") +
            '<div class="tc-rows">' + rows.map(x => "<span>" + x[0] + "</span><span>" + x[1] + " ₽</span>").join("") + "</div>" +
            '<div class="tc-foot"><span>Дом/отель: ' + HOUSE_COST[t.group] + " ₽ · залог: " + mortgageValue(idx) + " ₽</span>" + ownerHtml + "</div>";
    } else if (kind === "depot") {
        body = '<div class="tc-rows"><span>1 депо</span><span>25 ₽</span><span>2 депо</span><span>50 ₽</span><span>3 депо</span><span>100 ₽</span><span>4 депо</span><span>200 ₽</span></div>' +
            '<div class="tc-foot"><span>Залог: ' + mortgageValue(idx) + " ₽</span>" + ownerHtml + "</div>";
    } else if (kind === "utility") {
        body = '<div class="tc-text">Рента: 4 × число на кубиках. Если у владельца обе клетки (Электростанция и Водоканал): 10 ×.</div>' +
            '<div class="tc-foot"><span>Залог: ' + mortgageValue(idx) + " ₽</span>" + ownerHtml + "</div>";
    } else if (t.tax !== undefined) {
        body = '<div class="tc-text">Заплати банку ' + money(t.tax) + ".</div>";
    } else if (t.name === "Шанс" || t.name === "Казна") {
        body = '<div class="tc-text">Возьми верхнюю карту колоды «' + t.name + "» и выполни, что на ней написано.</div>";
    } else {
        body = '<div class="tc-text">' + (CORNER_INFO[idx] || "") + "</div>";
    }
    return '<div class="tile-card">' + head + '<div class="tc-body">' + body + "</div></div>";
}

// Экранчик в центре доски: если клетка в верхней половине, он над надписью «МОНОПОЛИЯ», иначе под ней; пунктир тянется к клетке.
function refreshInfo() {
    const idx = hoverTile >= 0 ? hoverTile : (pinnedTile >= 0 ? pinnedTile : infoTile);
    const box = $("tile-info");
    if (idx < 0) {
        box.classList.add("hidden");
        $("link-line").setAttribute("x2", $("link-line").getAttribute("x1"));
        $("link-dot").setAttribute("r", 0);
        return;
    }
    const changed = box.dataset.shown !== String(idx) || box.classList.contains("hidden");
    box.innerHTML = tileInfoHTML(idx);
    box.dataset.shown = String(idx);
    if (changed) {
        box.style.animation = "none";
        void box.offsetWidth;
        box.style.animation = "";
    }
    box.classList.remove("hidden");
    positionInfo(idx);
}

function positionInfo(idx) {
    const box = $("tile-info");
    const c = tileCenterOnScreen(idx);
    const upper = c.y < BOARD / 2;
    if (upper) { box.style.top = "auto"; box.style.bottom = (100 - 335 / 8) + "%"; }
    else { box.style.bottom = "auto"; box.style.top = (465 / 8) + "%"; }

    const stage = $("board-stage");
    const sr = stage.getBoundingClientRect();
    const unit = stage.clientWidth / BOARD;
    const br = box.getBoundingClientRect();
    const l = (br.left - sr.left - stage.clientLeft) / unit, r = (br.right - sr.left - stage.clientLeft) / unit;
    const t = (br.top - sr.top - stage.clientTop) / unit, b = (br.bottom - sr.top - stage.clientTop) / unit;
    const px = Math.min(Math.max(c.x, l), r), py = Math.min(Math.max(c.y, t), b);
    const line = $("link-line");
    line.setAttribute("x1", px); line.setAttribute("y1", py);
    line.setAttribute("x2", c.x); line.setAttribute("y2", c.y);
    $("link-dot").setAttribute("cx", c.x); $("link-dot").setAttribute("cy", c.y);
    $("link-dot").setAttribute("r", 5);
}

function onBoardRotate() {
    const idx = hoverTile >= 0 ? hoverTile : (pinnedTile >= 0 ? pinnedTile : infoTile);
    if (idx >= 0 && !$("tile-info").classList.contains("hidden")) positionInfo(idx);
}

function setInfoTile(idx) {
    infoTile = idx;
    pinnedTile = -1;
    refreshInfo();
}

// Узкий экран (телефон): меню под доской, а не справа от неё.
function isNarrowLayout() {
    return $("props-col").getBoundingClientRect().left < 320;
}

function showTileSheet(idx) {
    clearTimeout(previewTimer);
    const pv = $("card-preview");
    pv.innerHTML = tileInfoHTML(idx);
    pv.classList.add("sheet");
    pv.classList.remove("hidden");
    const close = document.createElement("div");
    close.className = "tc-close";
    close.textContent = "Нажми вне карточки, чтобы закрыть";
    pv.firstChild.appendChild(close);
}

function tileUnderPointer(e) {
    const r = canvas.getBoundingClientRect();
    return tileAtScreenPoint((e.clientX - r.left) / r.width * BOARD, (e.clientY - r.top) / r.height * BOARD);
}

// Мышь: информация о клетке по наведению. Телефон и мышь: нажатие закрепляет информацию, повторное нажатие убирает.
function initHover() {
    canvas.addEventListener("pointermove", e => {
        if (e.pointerType !== "mouse") return;
        const t = tileUnderPointer(e);
        if (t !== hoverTile) { hoverTile = t; refreshInfo(); }
    });
    canvas.addEventListener("pointerleave", e => {
        if (e.pointerType === "mouse" && hoverTile !== -1) { hoverTile = -1; refreshInfo(); }
    });
    canvas.addEventListener("click", e => {
        const t = tileUnderPointer(e);
        if (isNarrowLayout()) {
            // телефон: подробности клетки выезжают снизу, на доске мало места
            if (t >= 0) showTileSheet(t); else $("card-preview").classList.add("hidden");
            e.stopPropagation();
            return;
        }
        pinnedTile = (t === pinnedTile || t < 0) ? -1 : t;
        refreshInfo();
    });
}

// ---------- интерфейс: панели ----------
function renderAll() {
    if (!gameState) return;
    const p = cur();

    $("turn-name").textContent = p.name;
    $("turn-dot").style.background = p.color;
    $("turn-dot").style.color = p.color;

    $("me-name").textContent = p.name;
    $("me-dot").style.background = p.color;
    $("me-dot").style.color = p.color;
    $("me-total").textContent = money(p.money);

    $("others-list").innerHTML = "";
    gameState.players.forEach((o, i) => {
        if (i === gameState.current) return;
        const row = document.createElement("div");
        row.className = "player-row" + (o.bankrupt ? " bankrupt" : "");
        row.id = "other-" + i;
        row.innerHTML = '<span class="dot" style="background:' + o.color + ";color:" + o.color + '"></span>' +
            '<span class="pname"></span><span class="pmoney">' + (o.bankrupt ? "банкрот" : money(o.money)) + "</span>";
        row.querySelector(".pname").textContent = o.name + (o.inJail ? " 🚔" : "");
        $("others-list").appendChild(row);
    });

    const counts = p.notes;
    $("notes").innerHTML = "";
    NOTE_VALUES.forEach(v => {
        const n = document.createElement("div");
        n.className = "note" + (counts[v] === 0 ? " zero" : "");
        n.style.background = NOTE_COLORS[v];
        n.innerHTML = "<span>" + v + "</span><small>×" + counts[v] + "</small>";
        $("notes").appendChild(n);
    });

    renderProps();
    $("chance-count").textContent = gameState.decks.chance.queue.length + " карт";
    $("community-count").textContent = gameState.decks.community.queue.length + " карт";
    refreshInfo();
    renderAsk();
    updateManageRow();
    requestDraw();
}

// Порядок в стопке: по цвету, потом депо и электричество.
function pileOrder(i) {
    const k = tileKind(i);
    if (k === "street") return GROUP_ORDER.indexOf(tiles[i].group) * 100 + i;
    if (k === "depot") return 1000 + i;
    return 2000 + i;
}

function renderProps() {
    if (!gameState) return;
    $("bank-supply").textContent = "банк: 🏠 " + housesLeft() + " · 🏨 " + hotelsLeft();
    const viewIdx = propsView === null ? (gameState.actor ? idxOf(gameState.actor) : gameState.current) : propsView;
    const viewer = gameState.players[viewIdx];

    $("props-tabs").innerHTML = "";
    gameState.players.forEach((o, i) => {
        const tab = document.createElement("div");
        tab.className = "ptab" + (i === viewIdx ? " active" : "");
        tab.style.setProperty("--pc", o.color);
        tab.innerHTML = "<i></i><span></span>";
        tab.querySelector("span").textContent = o.name + (o.jailCards.length ? " 🗝" + o.jailCards.length : "");
        tab.onclick = () => { propsView = i; renderProps(); };
        $("props-tabs").appendChild(tab);
    });

    const pile = $("props-pile");
    pile.innerHTML = "";
    const mine = Object.keys(gameState.owners).map(Number).filter(t => gameState.owners[t] === viewIdx).sort((a, b) => pileOrder(a) - pileOrder(b));
    if (!mine.length) pile.innerHTML = '<div class="muted">Пока ничего не куплено</div>';
    mine.forEach(t => {
        const strip = document.createElement("div");
        strip.className = "pstrip";
        strip.style.setProperty("--pc", viewer.color);
        strip.style.setProperty("--g", groupColors[tiles[t].group] || "#8b8f98");
        strip.innerHTML = "<i></i><span class='pname'></span><span class='ph'></span>";
        strip.dataset.tile = t;
        strip.classList.toggle("mortgaged", isMortgaged(t));
        strip.querySelector(".pname").textContent = tiles[t].name;
        strip.querySelector(".ph").textContent = isMortgaged(t) ? "🔒" : houseEmoji(housesOn(t));
        if (canBuildNow(t)) {
            const level = housesOn(t) + 1;
            const btn = document.createElement("button");
            btn.className = "pbuild";
            btn.textContent = "＋" + (level >= HOTEL_LEVEL ? "🏨" : "🏠") + " " + HOUSE_COST[tiles[t].group];
            btn.title = level >= HOTEL_LEVEL ? "Построить отель" : "Построить дом";
            btn.onclick = e => { e.stopPropagation(); buildHouse(t); };
            strip.appendChild(btn);
        }
        strip.onmouseenter = () => showPreview(t, strip);
        strip.onclick = () => showPreview(t, strip);
        strip.onmouseleave = schedulePreviewHide;
        pile.appendChild(strip);
    });
}

function showPreview(idx, strip) {
    clearTimeout(previewTimer);
    const pv = $("card-preview");
    pv.innerHTML = tileInfoHTML(idx);
    pv.classList.remove("hidden");
    // кнопки действий (строить, продать, заложить, выкупить) для имущества того, кто сейчас распоряжается
    const actions = [];
    if (canBuildNow(idx)) actions.push([housesOn(idx) + 1 >= HOTEL_LEVEL ? "＋ Отель " + HOUSE_COST[tiles[idx].group] + " ₽" : "＋ Дом " + HOUSE_COST[tiles[idx].group] + " ₽", () => buildHouse(idx), true]);
    else if (canBuildRules(idx) && !buildSupplyLeft(idx)) actions.push([housesOn(idx) + 1 >= HOTEL_LEVEL ? "Отели в банке закончились" : "Дома в банке закончились", () => {}, false, true]);
    if (canSellHouse(idx)) actions.push(["− Продать " + (housesOn(idx) >= HOTEL_LEVEL ? "отель" : "дом") + " +" + HOUSE_COST[tiles[idx].group] / 2 + " ₽", () => sellHouse(idx)]);
    if (canMortgage(idx)) actions.push(["Заложить +" + mortgageValue(idx) + " ₽", () => mortgageTile(idx)]);
    if (canUnmortgage(idx)) actions.push(["Выкупить −" + unmortgageCost(idx) + " ₽", () => unmortgageTile(idx), true]);
    if (actions.length) {
        const row = document.createElement("div");
        row.className = "tc-actions";
        actions.forEach(a => {
            const b = document.createElement("button");
            b.className = "btn btn-small" + (a[2] ? " primary" : "");
            b.textContent = a[0];
            b.disabled = !!a[3];
            b.onclick = () => {
                a[1]();
                const s = [...document.querySelectorAll(".pstrip")].find(x => Number(x.dataset.tile) === idx);
                if (s) showPreview(idx, s); else pv.classList.add("hidden");
            };
            row.appendChild(b);
        });
        pv.firstChild.appendChild(row);
    }
    const r = strip.getBoundingClientRect();
    const panel = $("props-col").getBoundingClientRect();
    if (panel.left >= 320) {
        // компьютер: карточка выезжает влево от стопки, поверх доски
        pv.classList.remove("sheet");
        const h = pv.offsetHeight;
        pv.style.left = (panel.left - 310) + "px";
        pv.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, r.top + r.height / 2 - h / 2)) + "px";
    } else {
        // телефон: карточка выезжает снизу экрана, закрывается касанием вне неё
        pv.classList.add("sheet");
        const close = document.createElement("div");
        close.className = "tc-close";
        close.textContent = "Нажми вне карточки, чтобы закрыть";
        pv.firstChild.appendChild(close);
    }
}

function schedulePreviewHide() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => $("card-preview").classList.add("hidden"), 150);
}

// Всплывающая сумма над счётом игрока.
function floatMoney(player, delta) {
    const i = idxOf(player);
    const target = i === gameState.current ? $("me-total") : $("other-" + i);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "float-money " + (delta >= 0 ? "plus" : "minus");
    el.textContent = (delta >= 0 ? "+" : "−") + money(Math.abs(delta));
    el.style.left = (r.left + r.width / 2 - 30) + "px";
    el.style.top = (r.top - 4) + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
}

// Игрок получает от банка delta (если delta > 0) или платит банку -delta (если delta < 0).
function addMoney(player, delta) {
    if (delta > 0) addNotes(player.notes, notesFromAmount(delta));
    else if (delta < 0) settle(player, null, -delta);
    renderAll();
    floatMoney(player, delta);
}

// ---------- дома, отели, залог ----------
const manageable = () => !!gameState && gameState.idle && !gameState.over;
const ownsGroup = (p, group) => groupMembers(group).every(i => gameState.owners[i] === idxOf(p));
const groupHasMortgage = group => groupMembers(group).some(isMortgaged);

const housesLeft = () => HOUSE_SUPPLY - Object.values(gameState.houses).reduce((n, l) => n + (l >= HOTEL_LEVEL ? 0 : l), 0);
const hotelsLeft = () => HOTEL_SUPPLY - Object.values(gameState.houses).filter(l => l >= HOTEL_LEVEL).length;

// Можно строить, если вся цветовая группа твоя и не в залоге, строишь равномерно, не больше 4 домов, отель только вместо 4 домов.
function canBuildRules(idx) {
    if (!manageable() || gameState.debt) return false;
    const p = actor();
    if (p.bankrupt || tileKind(idx) !== "street" || gameState.owners[idx] !== idxOf(p)) return false;
    const group = tiles[idx].group;
    if (!ownsGroup(p, group) || groupHasMortgage(group)) return false;
    const members = groupMembers(group);
    const level = housesOn(idx);
    if (level >= HOTEL_LEVEL) return false;
    if (level > Math.min(...members.map(housesOn))) return false; // равномерная застройка
    return true;
}

// Есть ли в банке то, что строим: отель (когда на улице 4 дома) или дом.
const buildSupplyLeft = idx => housesOn(idx) + 1 >= HOTEL_LEVEL ? hotelsLeft() > 0 : housesLeft() > 0;

function canBuildNow(idx) {
    return canBuildRules(idx) && buildSupplyLeft(idx) && actor().money >= HOUSE_COST[tiles[idx].group];
}

function buildHouse(idx) {
    if (!canBuildNow(idx)) return;
    const p = actor();
    const cost = HOUSE_COST[tiles[idx].group];
    const level = housesOn(idx) + 1;
    gameState.houses[idx] = level;
    addMoney(p, -cost);
    say(p.name + " строит " + (level >= HOTEL_LEVEL ? "отель" : "дом (" + level + " из " + MAX_HOUSES + ")") + " на «" + tiles[idx].name + "» за " + money(cost));
    setInfoTile(idx);
    renderAll();
}

// Продавать дома можно равномерно: сначала там, где их больше всего. Банк платит половину цены. Отель продаётся как дом.
function canSellHouse(idx) {
    if (!manageable()) return false;
    const p = actor();
    if (tileKind(idx) !== "street" || gameState.owners[idx] !== idxOf(p) || housesOn(idx) === 0) return false;
    if (housesOn(idx) < Math.max(...groupMembers(tiles[idx].group).map(housesOn))) return false;
    return housesOn(idx) < HOTEL_LEVEL || housesLeft() >= MAX_HOUSES; // отель превращается в 4 дома, им нужно место в банке
}

function sellHouse(idx) {
    if (!canSellHouse(idx)) return;
    const p = actor();
    const refund = HOUSE_COST[tiles[idx].group] / 2;
    const was = housesOn(idx);
    gameState.houses[idx] = was - 1;
    if (gameState.houses[idx] === 0) delete gameState.houses[idx];
    say(p.name + " продаёт " + (was >= HOTEL_LEVEL ? "отель" : "дом") + " на «" + tiles[idx].name + "» за " + money(refund));
    addMoney(p, refund);
}

// Заложить можно улицу без домов во всей группе (дома сначала продаются), депо или электростанцию.
function canMortgage(idx) {
    if (!manageable()) return false;
    const p = actor();
    if (tiles[idx].price === undefined || gameState.owners[idx] !== idxOf(p) || isMortgaged(idx)) return false;
    if (tileKind(idx) === "street" && groupMembers(tiles[idx].group).some(i => housesOn(i) > 0)) return false;
    return true;
}

function mortgageTile(idx) {
    if (!canMortgage(idx)) return;
    const p = actor();
    gameState.mortgaged[idx] = true;
    say(p.name + " закладывает «" + tiles[idx].name + "» за " + money(mortgageValue(idx)));
    addMoney(p, mortgageValue(idx));
}

function canUnmortgage(idx) {
    if (!manageable() || gameState.debt) return false;
    const p = actor();
    return gameState.owners[idx] === idxOf(p) && isMortgaged(idx) && p.money >= unmortgageCost(idx);
}

function unmortgageTile(idx) {
    if (!canUnmortgage(idx)) return;
    const p = actor();
    delete gameState.mortgaged[idx];
    say(p.name + " выкупает «" + tiles[idx].name + "» за " + money(unmortgageCost(idx)));
    addMoney(p, -unmortgageCost(idx));
}

// Сколько денег игрок может собрать, продав всё: деньги, половина цены домов, залог всего незаложенного.
function liquidationValue(p) {
    const pi = idxOf(p);
    let sum = p.money;
    Object.keys(gameState.owners).map(Number).filter(t => gameState.owners[t] === pi).forEach(t => {
        if (tileKind(t) === "street") sum += housesOn(t) * HOUSE_COST[tiles[t].group] / 2;
        if (!isMortgaged(t)) sum += mortgageValue(t);
    });
    return sum;
}

// ---------- деньги и банкротство ----------
// Если не хватает денег, но имущества хватит, игрок продаёт дома и закладывает, пока не наберёт сумму. Иначе банкротство.
async function raiseFunds(player, amount) {
    if (liquidationValue(player) < amount) return false;
    const pi = idxOf(player);
    gameState.actor = player;
    gameState.debt = true;
    propsView = pi;
    say(player.name + ": не хватает " + money(amount - player.money) + ", нужно продать дома или заложить имущество");
    renderAll();
    const choice = await ask(
        player.name + ": нужно заплатить " + money(amount) + ", не хватает " + money(Math.max(0, amount - player.money)) + ". Продай дома или заложи имущество в стопке справа.",
        [{ label: "Сдаться (банкротство)", value: "bankrupt" }],
        () => player.money >= amount
    );
    gameState.actor = null;
    gameState.debt = false;
    propsView = null;
    return choice !== "bankrupt";
}

// Платит amount банку (creditor === undefined) или игроку-кредитору. Возвращает false, если игрок обанкротился.
async function pay(player, amount, creditor) {
    if (amount <= 0) return true;
    if (player.money < amount) {
        const ok = await raiseFunds(player, amount);
        if (!ok) {
            await declareBankrupt(player, creditor);
            return false;
        }
    }
    const to = creditor === undefined ? null : gameState.players[creditor];
    settle(player, to, amount);
    renderAll();
    floatMoney(player, -amount);
    if (to) floatMoney(to, amount);
    return true;
}

async function declareBankrupt(player, creditor) {
    const i = idxOf(player);
    const rest = player.money;
    say("💥 " + player.name + " банкрот");
    if (creditor !== undefined && rest > 0) {
        addNotes(gameState.players[creditor].notes, player.notes);
        floatMoney(gameState.players[creditor], rest);
    }
    player.notes = emptyNotes();
    Object.keys(gameState.owners).forEach(t => {
        if (gameState.owners[t] === i) {
            delete gameState.houses[t]; // постройки сносятся
            if (creditor !== undefined) gameState.owners[t] = creditor;
            else { delete gameState.owners[t]; delete gameState.mortgaged[t]; }
        }
    });
    player.jailCards.forEach(c => gameState.decks[c.deck].queue.push(c.card));
    player.jailCards = [];
    player.bankrupt = true;
    renderAll();
    await showCard("community", player.name + " обанкротился и выбывает из игры." +
        (creditor !== undefined ? " Всё имущество переходит к игроку " + gameState.players[creditor].name + "." : " Всё имущество возвращается банку."));
    if (alivePlayers().length === 1) {
        gameState.over = true;
        clearSave();
        $("winner-text").textContent = "Побеждает " + alivePlayers()[0].name + " с капиталом " + money(alivePlayers()[0].money) + ".";
        $("winner-modal").classList.remove("hidden");
    }
}

// ---------- движение ----------
// dir: TRAVEL (по умолчанию) - вперёд по ходу игры, -TRAVEL - назад.
async function movePlayer(p, steps, dir) {
    dir = dir || TRAVEL;
    highlightTile = (p.pos + dir * steps + 400) % 40;
    requestDraw();
    for (let s = 0; s < steps; s++) {
        const next = (p.pos + dir + 40) % 40;
        await hopToken(p, next);
        if (dir === TRAVEL && next === 0) {
            say(p.name + " проходит СТАРТ: +" + money(GO_SALARY));
            addMoney(p, GO_SALARY);
        }
        await sleep(40);
    }
    highlightTile = -1;
    requestDraw();
}

async function sendToJail(p) {
    say("🚔 " + p.name + " отправляется на Штрафстоянку");
    highlightTile = JAIL_TILE;
    requestDraw();
    await hopToken(p, JAIL_TILE, 600);
    highlightTile = -1;
    p.inJail = true;
    p.jailTurns = 0;
    gameState.doubles = 0;
    setInfoTile(JAIL_TILE);
    renderAll();
}

// ---------- клетки ----------
function ownedCount(owner, list) {
    return list.filter(t => gameState.owners[t] === owner).length;
}

function calcRent(idx, opts) {
    const owner = gameState.owners[idx];
    const kind = tileKind(idx);
    if (kind === "depot") {
        const n = ownedCount(owner, DEPOT_TILES);
        return 25 * Math.pow(2, n - 1) * ((opts && opts.rentMult) || 1);
    }
    if (kind === "utility") {
        const n = ownedCount(owner, UTILITY_TILES);
        return (n === 2 ? 10 : 4) * lastDiceSum;
    }
    const built = housesOn(idx);
    if (built > 0) return RENTS[idx][built];
    const full = groupMembers(tiles[idx].group).every(i => gameState.owners[i] === owner);
    return RENTS[idx][0] * (full ? 2 : 1);
}

async function landOn(p, idx, opts) {
    const tile = tiles[idx];
    setInfoTile(idx);
    if (tile.group === "corner") {
        if (idx === GO_TO_JAIL_TILE) await sendToJail(p);
        return;
    }
    if (tile.name === "Шанс") { await drawCard(p, "chance"); return; }
    if (tile.name === "Казна") { await drawCard(p, "community"); return; }
    if (tile.tax !== undefined) {
        say(p.name + " платит налог " + money(tile.tax));
        await pay(p, tile.tax);
        return;
    }
    if (tile.price === undefined) return;

    const owner = gameState.owners[idx];
    const pi = idxOf(p);
    if (owner === undefined) {
        const buy = await ask(
            "«" + tile.name + "» свободна. Цена " + money(tile.price) + ".",
            () => [{ label: "Купить за " + money(tile.price), value: true, primary: true, disabled: p.money < tile.price },
                   { label: "Отказаться (аукцион)", value: false }]
        );
        if (buy) {
            addMoney(p, -tile.price);
            gameState.owners[idx] = pi;
            say(p.name + " покупает «" + tile.name + "» за " + money(tile.price));
            renderAll();
        } else {
            say(p.name + " отказался от «" + tile.name + "»: аукцион");
            await auction(idx, p);
        }
    } else if (owner === pi) {
        say(p.name + " на своей клетке «" + tile.name + "»");
    } else if (isMortgaged(idx)) {
        say("«" + tile.name + "» в залоге, рента не берётся");
    } else {
        const rent = calcRent(idx, opts);
        say(p.name + " платит " + money(rent) + " игроку " + gameState.players[owner].name + " за «" + tile.name + "»");
        await pay(p, rent, owner);
    }
}

// ---------- карты ----------
async function drawCard(p, deckKey) {
    const deck = gameState.decks[deckKey];
    const card = deck.queue.shift();
    if (card.a === "jailFree") p.jailCards.push({ deck: deckKey, card: card });
    else deck.queue.push(card);
    renderAll();
    await showCard(deckKey, card.t);
    await applyCard(p, card);
}

async function applyCard(p, card) {
    const others = () => gameState.players.filter(o => !o.bankrupt && o !== p);
    switch (card.a) {
        case "money":
            if (card.v >= 0) addMoney(p, card.v);
            else await pay(p, -card.v);
            break;
        case "jailFree":
            say(p.name + " оставляет карту освобождения себе");
            break;
        case "jail":
            await sendToJail(p);
            break;
        case "moveTo": {
            const steps = stepsTo(p.pos, card.v);
            if (steps > 0) await movePlayer(p, steps);
            await landOn(p, p.pos);
            break;
        }
        case "back":
            await movePlayer(p, card.v, -TRAVEL);
            await landOn(p, p.pos);
            break;
        case "nearestDepot": {
            // ближайшее депо впереди по ходу игры
            const target = DEPOT_TILES.slice().sort((a, b) => stepsTo(p.pos, a) - stepsTo(p.pos, b)).find(d => stepsTo(p.pos, d) > 0);
            await movePlayer(p, stepsTo(p.pos, target));
            await landOn(p, p.pos, { rentMult: 2 });
            break;
        }
        case "eachPay":
            for (const o of others()) {
                if (p.bankrupt) break;
                await pay(p, card.v, idxOf(o));
            }
            break;
        case "eachCollect":
            for (const o of others()) {
                if (gameState.over) break;
                await pay(o, card.v, idxOf(p));
            }
            break;
    }
}

function useJailCard(p) {
    const c = p.jailCards.shift();
    gameState.decks[c.deck].queue.push(c.card);
    p.inJail = false;
    p.jailTurns = 0;
    say(p.name + " использует карту и выходит со Штрафстоянки");
    renderAll();
}

// ---------- ход ----------
async function startTurn() {
    if (gameState.over) return;
    const p = cur();
    gameState.doubles = 0;
    propsView = null;
    setInfoTile(-1);
    $("roll-note").textContent = "";
    renderAll();
    saveGame();

    if (p.inJail) {
        const opts = () => {
            const list = [];
            if (p.jailCards.length) list.push({ label: "Карта освобождения", value: "card" });
            list.push({ label: "Заплатить " + money(JAIL_FINE), value: "pay", disabled: p.money < JAIL_FINE });
            list.push({ label: "Бросить кубики (нужен дубль)", value: "roll", primary: true });
            return list;
        };
        const choice = await ask(p.name + " на Штрафстоянке (попытка " + (p.jailTurns + 1) + " из 3)", opts);
        if (choice === "roll") { await playRoll(); return; }
        if (choice === "card") useJailCard(p);
        if (choice === "pay") {
            say(p.name + " платит штраф " + money(JAIL_FINE) + " и выходит");
            await pay(p, JAIL_FINE);
            p.inJail = false;
            p.jailTurns = 0;
            renderAll();
        }
    }
    await ask(p.name + ": твой ход", [{ label: "Бросить кубики", value: true, primary: true }]);
    await playRoll();
}

async function playRoll() {
    const p = cur();
    setInfoTile(-1);
    const a = rollDie(), b = rollDie();
    await animateDice(a, b);
    const sum = a + b;
    lastDiceSum = sum;
    let doubles = a === b;
    say(p.name + " выбрасывает " + a + " и " + b + " (" + sum + ")");

    if (p.inJail) {
        if (doubles) {
            p.inJail = false;
            p.jailTurns = 0;
            say(p.name + " выбрасывает дубль и выходит со Штрафстоянки");
            await movePlayer(p, sum);
            await landOn(p, p.pos);
        } else {
            p.jailTurns++;
            if (p.jailTurns >= 3) {
                say("Третья неудача: штраф " + money(JAIL_FINE));
                if (await pay(p, JAIL_FINE)) {
                    p.inJail = false;
                    p.jailTurns = 0;
                    await movePlayer(p, sum);
                    await landOn(p, p.pos);
                }
            } else {
                say(p.name + " остаётся на Штрафстоянке");
            }
        }
        doubles = false; // из тюрьмы дубль не даёт второго броска
    } else {
        if (doubles) gameState.doubles++; else gameState.doubles = 0;
        if (doubles && gameState.doubles >= 3) {
            say("Третий дубль подряд!");
            await sendToJail(p);
            doubles = false;
        } else {
            await movePlayer(p, sum);
            await landOn(p, p.pos);
        }
    }
    await afterAction(doubles);
}

async function afterAction(doubles) {
    if (gameState.over) return;
    const p = cur();
    if (p.bankrupt) { endTurn(); return; }
    if (doubles && !p.inJail) {
        await ask("Дубль! " + p.name + " бросает ещё раз", [{ label: "Бросить кубики", value: true, primary: true }]);
        await playRoll();
        return;
    }
    await ask(p.name + ": ход закончен (можно построить дома)", [{ label: "Завершить ход", value: true, primary: true }]);
    endTurn();
}

function endTurn() {
    if (gameState.over) return;
    let next = gameState.current;
    do { next = (next + 1) % gameState.players.length; } while (gameState.players[next].bankrupt);
    gameState.current = next;
    startTurn();
}

// ---------- старт и перезапуск ----------
function newGame(names) {
    gameState = {
        players: names.map((name, i) => attachMoney({
            name: name, color: PLAYER_COLORS[i], notes: Object.assign(emptyNotes(), START_NOTES), pos: 0,
            inJail: false, jailTurns: 0, jailCards: [], bankrupt: false, hop: null
        })),
        owners: {},
        houses: {},
        mortgaged: {},
        current: 0,
        doubles: 0,
        idle: false,
        pending: null,
        actor: null,
        debt: false,
        over: false,
        decks: {
            chance: { queue: shuffle(CHANCE_CARDS) },
            community: { queue: shuffle(COMMUNITY_CARDS) }
        }
    };
    logLines = [];
    $("log-full").innerHTML = "";
    buildDice();
    say("Игра началась! У каждого по " + money(START_MONEY));
    startTurn();
}

function openSetup() {
    const saved = loadSave();
    $("continue-btn").classList.toggle("hidden", !saved);
    if (saved) $("continue-btn").textContent = "Продолжить сохранённую игру (ходит " + saved.state.players[saved.state.current].name + ")";
    renderSetup();
    $("setup-modal").classList.remove("hidden");
}

function renderSetup() {
    const row = $("count-row");
    row.innerHTML = "";
    [2, 3, 4].forEach(n => {
        const b = document.createElement("button");
        b.className = "count-btn" + (n === setupCount ? " active" : "");
        b.textContent = n;
        b.onclick = () => { setupCount = n; renderSetup(); };
        row.appendChild(b);
    });
    const names = [];
    document.querySelectorAll("#setup-names input").forEach(inp => names.push(inp.value));
    $("setup-names").innerHTML = "";
    for (let i = 0; i < setupCount; i++) {
        const r = document.createElement("div");
        r.className = "name-row";
        r.innerHTML = '<span class="dot" style="background:' + PLAYER_COLORS[i] + ";color:" + PLAYER_COLORS[i] + '"></span><input maxlength="14" placeholder="Игрок ' + (i + 1) + '">';
        r.querySelector("input").value = names[i] || "";
        $("setup-names").appendChild(r);
    }
}

function startFromSetup() {
    const names = [];
    document.querySelectorAll("#setup-names input").forEach((inp, i) => names.push(inp.value.trim() || "Игрок " + (i + 1)));
    $("setup-modal").classList.add("hidden");
    newGame(names);
}

function restartGame() {
    if (confirm("Начать новую игру? Текущая будет потеряна.")) {
        clearSave();
        location.reload();
    }
}

// ---------- сохранение (в этом браузере, в начале каждого хода) ----------
const SAVE_KEY = "monopolySave";

function saveGame() {
    if (!gameState || gameState.over) return;
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ state: gameState, log: logLines },
            (k, v) => (k === "pending" || k === "hop" || k === "actor") ? undefined : v));
    } catch (e) {}
}

function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

function loadSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function continueSaved() {
    const s = loadSave();
    if (!s) return;
    gameState = s.state;
    gameState.players.forEach(p => { attachMoney(p); p.hop = null; });
    gameState.pending = null;
    gameState.actor = null;
    gameState.debt = false;
    gameState.idle = false;
    logLines = [];
    $("log-full").innerHTML = "";
    (s.log || []).slice().reverse().forEach(say);
    $("setup-modal").classList.add("hidden");
    buildDice();
    say("Игра продолжается: ходит " + cur().name);
    startTurn();
}

function initDisclaimer() {
    let seen = null;
    try { seen = localStorage.getItem("monopolyDisclaimerSeen"); } catch (e) {}
    if (seen === "1" || window.innerWidth >= 900) {
        $("disclaimer-modal").style.display = "none";
        openSetup();
    }
}

document.addEventListener("click", e => {
    if (!e.target.closest("#card-preview") && !e.target.closest(".pstrip")) $("card-preview").classList.add("hidden");
});
$("card-preview").addEventListener("mouseenter", () => clearTimeout(previewTimer));
$("card-preview").addEventListener("mouseleave", schedulePreviewHide);
buildDice();
initHover();
initDisclaimer();
