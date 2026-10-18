// Правила и интерфейс игры. Доска, фишки и анимации лежат в game.js.
// Играют 2-4 человека за одним экраном по классическим правилам (дома/отели, обмен и залог добавим позже).

const START_MONEY = 1500;
const GO_SALARY = 200;
const JAIL_FINE = 50;
const JAIL_TILE = 10;
const GO_TO_JAIL_TILE = 30;
const DEPOT_TILES = [5, 15, 25, 35];
const UTILITY_TILES = [12, 28];
const PLAYER_COLORS = ["#3ee0ff", "#b4f23d", "#ffffff", "#ffd23f"];

// Базовая рента улиц без домов (клетка -> рента). Если у игрока вся цветовая группа, рента вдвое больше.
const BASE_RENT = {
    1: 2, 3: 4,
    6: 6, 8: 6, 9: 8,
    11: 10, 13: 10, 14: 12,
    16: 14, 18: 14, 19: 16,
    21: 18, 23: 18, 24: 20,
    26: 22, 27: 22, 29: 24,
    31: 26, 32: 26, 34: 28,
    37: 35, 39: 50
};

const NOTE_VALUES = [500, 100, 50, 10, 5, 1];
const NOTE_COLORS = { 500: "#c4b5fd", 100: "#86efac", 50: "#7dd3fc", 10: "#ffd166", 5: "#ff9bd0", 1: "#e5e9f0" };

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

// ---------- мелкие помощники ----------
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rollDie = () => 1 + Math.floor(Math.random() * 6);
const money = n => n.toLocaleString("ru-RU") + " ₽";
const cur = () => gameState.players[gameState.current];
const idxOf = p => gameState.players.indexOf(p);
const alivePlayers = () => gameState.players.filter(p => !p.bankrupt);

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

// ---------- сообщения и кнопки ----------
function say(text) {
    logLines.unshift(text);
    logLines = logLines.slice(0, 4);
    $("log").innerHTML = logLines.map(l => "<div>" + l + "</div>").join("");
}

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

// Показывает вопрос и кнопки, возвращает value нажатой кнопки.
function ask(text, options) {
    return new Promise(resolve => {
        setPrompt(text);
        renderButtons(options.map(o => ({
            label: o.label, primary: o.primary, disabled: o.disabled,
            onClick: () => { renderButtons([]); setPrompt(""); resolve(o.value); }
        })));
    });
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

// ---------- интерфейс: панели ----------
function breakIntoNotes(amount) {
    const counts = {};
    let rest = Math.max(0, amount);
    NOTE_VALUES.forEach(v => { counts[v] = Math.floor(rest / v); rest -= counts[v] * v; });
    return counts;
}

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

    const counts = breakIntoNotes(p.money);
    $("notes").innerHTML = "";
    NOTE_VALUES.forEach(v => {
        const n = document.createElement("div");
        n.className = "note" + (counts[v] === 0 ? " zero" : "");
        n.style.background = NOTE_COLORS[v];
        n.innerHTML = "<span>" + v + "</span><small>×" + counts[v] + "</small>";
        $("notes").appendChild(n);
    });

    $("props-list").innerHTML = "";
    gameState.players.forEach((o, i) => {
        const card = document.createElement("div");
        card.className = "props-card" + (i === gameState.current ? " current" : "");
        card.style.setProperty("--pc", o.color);
        const title = document.createElement("div");
        title.className = "props-title";
        title.innerHTML = "<span></span><span class='muted'></span>";
        title.children[0].textContent = o.name;
        title.children[1].textContent = o.jailCards.length ? "🗝 ×" + o.jailCards.length : "";
        card.appendChild(title);
        const chips = document.createElement("div");
        chips.className = "chips";
        let any = false;
        Object.keys(gameState.owners).map(Number).sort((a, b) => a - b).forEach(t => {
            if (gameState.owners[t] !== i) return;
            any = true;
            const chip = document.createElement("span");
            chip.className = "chip";
            chip.style.setProperty("--pc", o.color);
            chip.style.setProperty("--g", groupColors[tiles[t].group] || "#8b8f98");
            chip.innerHTML = "<i></i>";
            chip.appendChild(document.createTextNode(tiles[t].name));
            chips.appendChild(chip);
        });
        if (!any) chips.innerHTML = '<span class="muted">пока ничего</span>';
        card.appendChild(chips);
        $("props-list").appendChild(card);
    });

    $("chance-count").textContent = gameState.decks.chance.queue.length + " карт";
    $("community-count").textContent = gameState.decks.community.queue.length + " карт";
    requestDraw();
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

function addMoney(player, delta) {
    player.money += delta;
    renderAll();
    floatMoney(player, delta);
}

// ---------- деньги и банкротство ----------
// Платит amount банку (creditor === undefined) или игроку-кредитору. Возвращает false, если игрок обанкротился.
async function pay(player, amount, creditor) {
    if (amount <= 0) return true;
    if (player.money >= amount) {
        addMoney(player, -amount);
        if (creditor !== undefined) addMoney(gameState.players[creditor], amount);
        return true;
    }
    await declareBankrupt(player, creditor);
    return false;
}

async function declareBankrupt(player, creditor) {
    const i = idxOf(player);
    const rest = player.money;
    say("💥 " + player.name + " банкрот");
    if (creditor !== undefined && rest > 0) {
        gameState.players[creditor].money += rest;
        floatMoney(gameState.players[creditor], rest);
    }
    player.money = 0;
    Object.keys(gameState.owners).forEach(t => {
        if (gameState.owners[t] === i) {
            if (creditor !== undefined) gameState.owners[t] = creditor;
            else delete gameState.owners[t];
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
        $("winner-text").textContent = "Побеждает " + alivePlayers()[0].name + " с капиталом " + money(alivePlayers()[0].money) + ".";
        $("winner-modal").classList.remove("hidden");
    }
}

// ---------- движение ----------
async function movePlayer(p, steps, dir) {
    dir = dir || 1;
    highlightTile = (p.pos + dir * steps + 400) % 40;
    requestDraw();
    for (let s = 0; s < steps; s++) {
        const next = (p.pos + dir + 40) % 40;
        await hopToken(p, next);
        if (dir > 0 && next === 0) {
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
    const group = tiles[idx].group;
    const members = tiles.map((t, i) => i).filter(i => tiles[i].group === group);
    const full = members.every(i => gameState.owners[i] === owner);
    return BASE_RENT[idx] * (full ? 2 : 1);
}

async function landOn(p, idx, opts) {
    const tile = tiles[idx];
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
        const canBuy = p.money >= tile.price;
        const buy = await ask(
            "«" + tile.name + "» свободна. Цена " + money(tile.price) + (canBuy ? "." : ", но не хватает денег."),
            [{ label: "Купить за " + money(tile.price), value: true, primary: true, disabled: !canBuy },
             { label: "Отказаться", value: false }]
        );
        if (buy) {
            addMoney(p, -tile.price);
            gameState.owners[idx] = pi;
            say(p.name + " покупает «" + tile.name + "» за " + money(tile.price));
            renderAll();
        } else {
            say(p.name + " отказался от «" + tile.name + "»");
        }
    } else if (owner === pi) {
        say(p.name + " на своей клетке «" + tile.name + "»");
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
            const steps = (card.v - p.pos + 40) % 40;
            if (steps > 0) await movePlayer(p, steps);
            await landOn(p, p.pos);
            break;
        }
        case "back":
            await movePlayer(p, card.v, -1);
            await landOn(p, p.pos);
            break;
        case "nearestDepot": {
            const target = DEPOT_TILES.find(d => d > p.pos) !== undefined ? DEPOT_TILES.find(d => d > p.pos) : DEPOT_TILES[0];
            await movePlayer(p, (target - p.pos + 40) % 40);
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
    $("roll-note").textContent = "";
    renderAll();

    if (p.inJail) {
        const opts = [];
        if (p.jailCards.length) opts.push({ label: "Карта освобождения", value: "card" });
        opts.push({ label: "Заплатить " + money(JAIL_FINE), value: "pay", disabled: p.money < JAIL_FINE });
        opts.push({ label: "Бросить кубики (нужен дубль)", value: "roll", primary: true });
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
    await ask(p.name + ": ход закончен", [{ label: "Завершить ход", value: true, primary: true }]);
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
        players: names.map((name, i) => ({
            name: name, color: PLAYER_COLORS[i], money: START_MONEY, pos: 0,
            inJail: false, jailTurns: 0, jailCards: [], bankrupt: false, hop: null
        })),
        owners: {},
        current: 0,
        doubles: 0,
        over: false,
        decks: {
            chance: { queue: shuffle(CHANCE_CARDS) },
            community: { queue: shuffle(COMMUNITY_CARDS) }
        }
    };
    logLines = [];
    $("log").innerHTML = "";
    buildDice();
    say("Игра началась! У каждого по " + money(START_MONEY));
    startTurn();
}

function openSetup() {
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
    if (confirm("Начать новую игру? Текущая будет потеряна.")) location.reload();
}

function initDisclaimer() {
    let seen = null;
    try { seen = localStorage.getItem("monopolyDisclaimerSeen"); } catch (e) {}
    if (seen === "1") {
        $("disclaimer-modal").style.display = "none";
        openSetup();
    }
}

buildDice();
initDisclaimer();
