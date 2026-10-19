// Размен купюр с банком, сделки между игроками и аукцион. Основные правила лежат в logic.js.

// ---------- кнопки управления под вопросом ----------
function updateManageRow() {
    const row = $("manage-row");
    if (!row) return;
    const on = manageable() && !gameState.debt;
    $("btn-exchange").disabled = !on;
    $("btn-trade").disabled = !on || alivePlayers().length < 2;
}

// ---------- счётчики купюр ----------
// Шесть счётчиков купюр (500, 100, 50, 10, 5, 1). have: сколько есть у игрока (null: без ограничения, банк даёт сколько нужно).
function createNotesPicker(container, have, onChange) {
    const values = emptyNotes();
    const api = {
        values: values,
        total: () => notesTotal(values),
        set(n) { NOTE_VALUES.forEach(v => { values[v] = Math.min(n[v] || 0, have ? have[v] : 40); }); render(); if (onChange) onChange(); },
        clear() { api.set({}); }
    };
    function render() {
        container.innerHTML = "";
        container.classList.add("np-grid");
        NOTE_VALUES.forEach(v => {
            const max = have ? have[v] : 40;
            const cell = document.createElement("div");
            cell.className = "np-cell" + (max === 0 ? " empty" : "");
            const note = document.createElement("div");
            note.className = "np-note";
            note.style.background = NOTE_COLORS[v];
            note.textContent = v;
            const step = document.createElement("div");
            step.className = "np-step";
            const minus = document.createElement("button");
            minus.textContent = "−";
            minus.disabled = values[v] <= 0;
            minus.onclick = () => { values[v]--; render(); if (onChange) onChange(); };
            const count = document.createElement("b");
            count.textContent = values[v];
            const plus = document.createElement("button");
            plus.textContent = "+";
            plus.disabled = values[v] >= max;
            plus.onclick = () => { values[v]++; render(); if (onChange) onChange(); };
            step.append(minus, count, plus);
            const small = document.createElement("small");
            small.textContent = have ? "есть " + have[v] : "";
            cell.append(note, step, small);
            container.appendChild(cell);
        });
    }
    render();
    return api;
}

// ---------- размен купюр с банком ----------
let exchangeGive = null, exchangeGet = null;

function openExchange() {
    if (!manageable() || gameState.debt) return;
    $("exchange-modal").classList.remove("hidden");
    setupExchange();
}

function closeExchange() {
    $("exchange-modal").classList.add("hidden");
}

function setupExchange() {
    const p = cur();
    $("ex-who").textContent = p.name + ": " + money(p.money);
    exchangeGive = createNotesPicker($("ex-give"), p.notes, updateExchange);
    exchangeGet = createNotesPicker($("ex-get"), null, updateExchange);

    // быстрые варианты: разменять одну купюру на мелкие и собрать мелкие в крупную
    const presets = $("ex-presets");
    presets.innerHTML = "";
    NOTE_VALUES.forEach((v, i) => {
        if (v === 1) return;
        const lower = NOTE_VALUES[i + 1];
        const n = v / lower;
        if (p.notes[v] > 0) addPreset(presets, v + " → " + n + "×" + lower, { [v]: 1 }, { [lower]: n });
        if (p.notes[lower] >= n) addPreset(presets, n + "×" + lower + " → " + v, { [lower]: n }, { [v]: 1 });
    });
    if (!presets.children.length) presets.innerHTML = '<span class="muted">Нет купюр для быстрого размена</span>';
    updateExchange();
}

function addPreset(box, label, give, get) {
    const b = document.createElement("button");
    b.className = "btn btn-small";
    b.textContent = label;
    b.onclick = () => { exchangeGive.set(give); exchangeGet.set(get); };
    box.appendChild(b);
}

function updateExchange() {
    const g = exchangeGive.total(), r = exchangeGet.total();
    $("ex-give-sum").textContent = money(g);
    $("ex-get-sum").textContent = money(r);
    const same = NOTE_VALUES.every(v => exchangeGive.values[v] === exchangeGet.values[v]);
    $("ex-ok").disabled = !(g > 0 && g === r && !same);
    $("ex-msg").textContent = g === r ? (g > 0 ? "Суммы равны, можно менять." : "Выбери купюры, которые отдаёшь и получаешь.") : "Суммы должны быть равны: разница " + money(Math.abs(g - r)) + ".";
}

function doExchange() {
    const p = cur();
    subNotes(p.notes, exchangeGive.values);
    addNotes(p.notes, exchangeGet.values);
    say(p.name + " меняет купюры в банке на " + money(exchangeGive.total()));
    renderAll();
    setupExchange();
}

// ---------- сделки между игроками ----------
let trade = null;

function tradableTiles(playerIdx) {
    return Object.keys(gameState.owners).map(Number).filter(t => gameState.owners[t] === playerIdx).filter(t => {
        if (tileKind(t) !== "street") return true;
        return groupMembers(tiles[t].group).every(i => housesOn(i) === 0); // с домами менять нельзя: сначала продай их
    }).sort((a, b) => pileOrder(a) - pileOrder(b));
}

function openTrade(preselected) {
    if (!manageable() || gameState.debt) return;
    const me = gameState.current;
    const others = gameState.players.map((p, i) => i).filter(i => i !== me && !gameState.players[i].bankrupt);
    trade = { me: me, partner: null, step: "partner" };
    $("trade-modal").classList.remove("hidden");
    if (typeof preselected === "number" && others.indexOf(preselected) !== -1) { trade.partner = preselected; trade.step = "offer"; }
    else if (others.length === 1) { trade.partner = others[0]; trade.step = "offer"; }
    renderTrade();
}

function closeTrade() {
    $("trade-modal").classList.add("hidden");
    trade = null;
}

function renderTrade() {
    const body = $("trade-body");
    body.innerHTML = "";
    const players = gameState.players;
    if (trade.step === "partner") {
        $("trade-title").textContent = "Сделка: с кем?";
        const row = document.createElement("div");
        row.className = "trade-partners";
        players.forEach((p, i) => {
            if (i === trade.me || p.bankrupt) return;
            const b = document.createElement("button");
            b.className = "btn";
            b.innerHTML = '<span class="dot" style="background:' + p.color + ';color:' + p.color + '"></span> ' + esc(p.name);
            b.onclick = () => { trade.partner = i; trade.step = "offer"; renderTrade(); };
            row.appendChild(b);
        });
        body.appendChild(row);
        return;
    }

    const me = players[trade.me], other = players[trade.partner];
    if (trade.step === "offer") {
        $("trade-title").textContent = "Сделка: " + me.name + " и " + other.name;
        const offer = trade.offer = trade.offer || { giveProps: [], getProps: [], giveJail: 0, getJail: 0 };
        const cols = document.createElement("div");
        cols.className = "trade-cols";
        cols.appendChild(buildTradeSide(me, trade.me, "Отдаёт " + me.name, offer, "give"));
        cols.appendChild(buildTradeSide(other, trade.partner, "Отдаёт " + other.name, offer, "get"));
        body.appendChild(cols);
        const msg = document.createElement("div");
        msg.id = "trade-msg";
        msg.className = "muted";
        body.appendChild(msg);
        const actions = document.createElement("div");
        actions.className = "modal-actions";
        const ok = document.createElement("button");
        ok.className = "btn primary";
        ok.id = "trade-offer-btn";
        ok.textContent = "Предложить";
        ok.onclick = () => {
            if (other.bot) { startBotDeal(); return; }
            trade.step = "review";
            renderTrade();
        };
        const cancel = document.createElement("button");
        cancel.className = "btn";
        cancel.textContent = "Отмена";
        cancel.onclick = closeTrade;
        actions.append(ok, cancel);
        body.appendChild(actions);
        updateTradeButton();
        return;
    }

    // step === "review": партнёр решает
    $("trade-title").textContent = other.name + ", принимаешь сделку?";
    const o = trade.offer;
    const describe = (playerName, props, jail, notes) => {
        const parts = [];
        if (notes.total() > 0) parts.push(money(notes.total()) + " купюрами");
        props.forEach(t => parts.push("«" + tiles[t].name + "»" + (isMortgaged(t) ? " (в залоге)" : "")));
        if (jail > 0) parts.push("карта освобождения ×" + jail);
        return "<div class='trade-sum'><b>" + esc(playerName) + " отдаёт:</b> " + (parts.length ? parts.map(esc).join(", ") : "ничего") + "</div>";
    };
    body.innerHTML = describe(me.name, o.giveProps, o.giveJail, trade.giveNotes) + describe(other.name, o.getProps, o.getJail, trade.getNotes);
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const yes = document.createElement("button");
    yes.className = "btn primary";
    yes.textContent = "Принять";
    yes.onclick = executeTrade;
    const no = document.createElement("button");
    no.className = "btn";
    no.textContent = "Отказаться";
    no.onclick = () => { say(other.name + " отказывается от сделки"); closeTrade(); };
    const back = document.createElement("button");
    back.className = "btn btn-small";
    back.textContent = "← Изменить";
    back.onclick = () => { trade.step = "offer"; renderTrade(); };
    actions.append(yes, no, back);
    body.appendChild(actions);
}

// Одна сторона сделки: имущество галочками, карты освобождения, купюры счётчиками.
function buildTradeSide(player, playerIdx, title, offer, side) {
    const box = document.createElement("div");
    box.className = "trade-side";
    const h = document.createElement("h4");
    h.innerHTML = '<span class="dot" style="background:' + player.color + ';color:' + player.color + '"></span> ' + esc(title);
    box.appendChild(h);

    const props = side === "give" ? offer.giveProps : offer.getProps;
    const list = document.createElement("div");
    list.className = "chips trade-props";
    const mine = tradableTiles(playerIdx);
    if (!mine.length) list.innerHTML = '<span class="muted">Нет имущества для обмена</span>';
    mine.forEach(t => {
        const chip = document.createElement("label");
        chip.className = "chip pick" + (props.indexOf(t) !== -1 ? " on" : "");
        chip.style.setProperty("--pc", player.color);
        chip.style.setProperty("--g", groupColors[tiles[t].group] || "#8b8f98");
        chip.innerHTML = "<i></i>";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = props.indexOf(t) !== -1;
        cb.onchange = () => {
            const k = props.indexOf(t);
            if (cb.checked && k === -1) props.push(t);
            if (!cb.checked && k !== -1) props.splice(k, 1);
            chip.classList.toggle("on", cb.checked);
            updateTradeButton();
        };
        chip.append(cb, document.createTextNode(tiles[t].name + (isMortgaged(t) ? " 🔒" : "")));
        list.appendChild(chip);
    });
    box.appendChild(list);

    if (player.jailCards.length) {
        const row = document.createElement("div");
        row.className = "trade-jail";
        const key = side === "give" ? "giveJail" : "getJail";
        const minus = document.createElement("button");
        minus.textContent = "−";
        const count = document.createElement("b");
        const plus = document.createElement("button");
        plus.textContent = "+";
        const sync = () => { count.textContent = offer[key]; minus.disabled = offer[key] <= 0; plus.disabled = offer[key] >= player.jailCards.length; updateTradeButton(); };
        minus.onclick = () => { offer[key]--; sync(); };
        plus.onclick = () => { offer[key]++; sync(); };
        row.append(document.createTextNode("🗝 Карты освобождения: "), minus, count, plus);
        box.appendChild(row);
        sync();
    }

    const notesBox = document.createElement("div");
    box.appendChild(notesBox);
    const picker = createNotesPicker(notesBox, player.notes, () => { sum.textContent = "Деньги: " + money(picker.total()); updateTradeButton(); });
    if (side === "give") { if (trade.giveNotes) picker.set(trade.giveNotes.values); trade.giveNotes = picker; }
    else { if (trade.getNotes) picker.set(trade.getNotes.values); trade.getNotes = picker; }
    const sum = document.createElement("div");
    sum.className = "np-sum";
    sum.textContent = "Деньги: " + money(picker.total());
    box.appendChild(sum);
    return box;
}

function tradeIsEmpty() {
    const o = trade.offer;
    return !(trade.giveNotes.total() + trade.getNotes.total() + o.giveProps.length + o.getProps.length + o.giveJail + o.getJail);
}

function updateTradeButton() {
    const btn = $("trade-offer-btn");
    if (!btn || !trade || !trade.giveNotes || !trade.getNotes) return;
    const empty = tradeIsEmpty();
    btn.disabled = empty;
    $("trade-msg").textContent = empty ? "Выбери, что меняете." : "Другой игрок должен согласиться на следующем шаге.";
}

// Общая часть сделки. data: { me, partner (номера игроков), giveProps/getProps (с точки зрения me), giveJail/getJail,
// giveNotes/getNotes (объекты с купюрами или null), cashFromMeToPartner (деньги, которые me отдаёт сверху) }.
function applyTradeData(data) {
    const me = gameState.players[data.me], other = gameState.players[data.partner];
    const gn = data.giveNotes, tn = data.getNotes;
    const ownsAll = (idx, list) => list.every(t => gameState.owners[t] === idx);
    const haveNotes = (p, n) => !n || NOTE_VALUES.every(v => p.notes[v] >= n[v]);
    if (!ownsAll(data.me, data.giveProps) || !ownsAll(data.partner, data.getProps) || !haveNotes(me, gn) || !haveNotes(other, tn)
        || me.jailCards.length < data.giveJail || other.jailCards.length < data.getJail
        || (data.cashFromMeToPartner || 0) > me.money) {
        say("Сделка сорвалась: у кого-то уже нет нужного");
        return false;
    }
    if (gn) { subNotes(me.notes, gn); addNotes(other.notes, gn); }
    if (tn) { subNotes(other.notes, tn); addNotes(me.notes, tn); }
    if (data.cashFromMeToPartner > 0) settle(me, other, data.cashFromMeToPartner);
    data.giveProps.forEach(t => { gameState.owners[t] = data.partner; });
    data.getProps.forEach(t => { gameState.owners[t] = data.me; });
    for (let k = 0; k < data.giveJail; k++) other.jailCards.push(me.jailCards.shift());
    for (let k = 0; k < data.getJail; k++) me.jailCards.push(other.jailCards.shift());
    const cashA = (gn ? notesTotal(gn) : 0) + (data.cashFromMeToPartner || 0), cashB = tn ? notesTotal(tn) : 0;
    const parts = [];
    if (cashA) parts.push(me.name + " отдаёт " + money(cashA));
    if (cashB) parts.push(other.name + " отдаёт " + money(cashB));
    const names = list => list.map(t => "«" + tiles[t].name + "»").join(", ");
    if (data.giveProps.length) parts.push(me.name + " отдаёт " + names(data.giveProps));
    if (data.getProps.length) parts.push(other.name + " отдаёт " + names(data.getProps));
    if (data.giveJail || data.getJail) parts.push("меняются картами освобождения");
    say("🤝 Сделка " + me.name + " и " + other.name + ": " + parts.join("; "));
    renderAll();
    return true;
}

function executeTrade() {
    const o = trade.offer;
    applyTradeData({
        me: trade.me, partner: trade.partner, giveProps: o.giveProps, getProps: o.getProps, giveJail: o.giveJail, getJail: o.getJail,
        giveNotes: trade.giveNotes.values, getNotes: trade.getNotes.values
    });
    closeTrade();
}

// Человек предложил сделку боту: идёт разговор, итог решает бот.
async function startBotDeal() {
    const o = trade.offer;
    const human = gameState.players[trade.me], bot = gameState.players[trade.partner];
    if (bot.dealRefusedTurn === gameState.turnCounter) {
        say(bot.name + " не хочет больше торговаться на этом ходу");
        closeTrade();
        return;
    }
    const d = {
        giveCash: trade.giveNotes.total(), giveProps: o.giveProps.slice(), giveJail: o.giveJail,
        getCash: trade.getNotes.total(), getProps: o.getProps.slice(), getJail: o.getJail
    };
    const giveNotes = Object.assign({}, trade.giveNotes.values), getNotes = Object.assign({}, trade.getNotes.values);
    $("trade-modal").classList.add("hidden");
    const res = await negotiateDeal(bot, human, d);
    if (res.accepted) {
        const ok = applyTradeData({
            me: trade.me, partner: trade.partner, giveProps: d.giveProps, getProps: d.getProps, giveJail: d.giveJail, getJail: d.getJail,
            giveNotes: giveNotes, getNotes: getNotes, cashFromMeToPartner: res.extra
        });
        if (ok) say(bot.name + " согласился на сделку");
    } else {
        bot.dealRefusedTurn = gameState.turnCounter;
        say(bot.name + " отказался от сделки");
    }
    trade = null;
    renderAll();
}

// ---------- аукцион ----------
// Имущество, от которого отказался игрок, продаётся тому, кто даст больше. Ставки по кругу: +10, +50, +100, +500 или пас.
async function auction(idx, decliner, sellerIdx) {
    const tile = tiles[idx];
    const all = gameState.players.filter(p => !p.bankrupt && (sellerIdx === undefined || idxOf(p) !== sellerIdx));
    const start = all.indexOf(decliner);
    let active = start === -1 ? all.slice() : all.slice(start + 1).concat(all.slice(0, start + 1));
    let high = 0, leader = null, t = 0;

    $("auction-card").innerHTML = tileInfoHTML(idx);
    $("auction-modal").classList.remove("hidden");

    while (active.length > 0 && !(leader && active.length === 1)) {
        if (t >= active.length) t = 0;
        const p = active[t];
        if (p === leader) { t++; continue; }
        $("auction-info").innerHTML = "Ставка: <b>" + (leader ? money(high) + "</b> (" + esc(leader.name) + ")" : "пока нет</b>") +
            "<br>Ставит: <b>" + esc(p.name) + "</b> (" + money(p.money) + ")";
        const choice = p.bot ? await (async () => { await botWait(600 + Math.random() * 500); $("auction-buttons").innerHTML = ""; return botBid(p, idx, high); })() : await new Promise(resolve => {
            const box = $("auction-buttons");
            box.innerHTML = "";
            [10, 50, 100, 500].forEach(inc => {
                const b = document.createElement("button");
                b.className = "btn" + (inc === 10 ? " primary" : "");
                b.textContent = "+" + inc + " (" + (high + inc) + " ₽)";
                b.disabled = p.money < high + inc;
                b.onclick = () => resolve(inc);
                box.appendChild(b);
            });
            const pass = document.createElement("button");
            pass.className = "btn";
            pass.textContent = "Пас";
            pass.onclick = () => resolve(0);
            box.appendChild(pass);
        });
        if (choice === 0) {
            active.splice(t, 1); // следующий игрок встаёт на это же место
        } else {
            high += choice;
            leader = p;
            t++;
            say(p.name + " ставит " + money(high) + " на «" + tile.name + "»");
        }
    }

    $("auction-modal").classList.add("hidden");
    if (!leader) {
        say("Аукцион: никто не купил «" + tile.name + "»");
        return;
    }
    say("Аукцион выигрывает " + leader.name + ": «" + tile.name + "» за " + money(high));
    if (await pay(leader, high, sellerIdx)) {
        gameState.owners[idx] = idxOf(leader);
        renderAll();
    }
}
