// Боты: характеры, доверие, окно чата с выбором реплик, переговоры (сделка, скидка на ренту, беседа, предложения бота)
// и сам игровой ИИ ботов. Боты не нейросети: все реплики и развилки написаны заранее.

// ---------- характеры ----------
const PERSONAS = {
    calm:   { title: "Расчётливый", emoji: "🧐", greed: 0.9,  risk: 0.3, base: 48, reserve: 260 },
    greedy: { title: "Хваткий",     emoji: "🤑", greed: 1.25, risk: 0.7, base: 35, reserve: 140 },
    friend: { title: "Весельчак",   emoji: "😄", greed: 1.0,  risk: 0.5, base: 62, reserve: 180 }
};
const BOT_NAMES = ["Гоша", "Жора", "Тима", "Кеша", "Лёва", "Мира", "Алиса", "Ярик"];

let botActing = false;
let BOT_SLOW = 1;        // множитель пауз бота (для проверок можно уменьшить)
const botWait = (ms) => sleep(ms * BOT_SLOW);   // пока true, бот может строить, закладывать и продавать как обычный игрок
let chat = null;         // текущий разговор: { bot, human, mood, flags, used }

const pick = list => list[Math.floor(Math.random() * list.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round10 = n => Math.max(10, Math.round(n / 10) * 10);

// ---------- доверие ----------
function getTrust(bot, human) {
    const hi = idxOf(human);
    if (!bot.trust) bot.trust = {};
    if (bot.trust[hi] === undefined) bot.trust[hi] = PERSONAS[bot.persona].base;
    return bot.trust[hi];
}

function changeTrust(bot, human, delta) {
    bot.trust[idxOf(human)] = clamp(Math.round(getTrust(bot, human) + delta), 0, 100);
    updateChatHead();
    renderAll();
}

// Кружок доверия: чем больше зелёного, тем охотнее бот соглашается.
function trustColor(v) { return v < 30 ? "#ff8a72" : v < 55 ? "#ffd166" : "#50fa7b"; }

// ---------- цена вещей для бота ----------
function groupOwnedBy(idx, ownerIdx) {
    const members = groupMembers(tiles[idx].group);
    return { total: members.length, owned: members.filter(i => gameState.owners[i] === ownerIdx).length };
}

// Сколько стоит клетка для бота, когда он её получает.
function worthToGet(bot, idx) {
    const t = tiles[idx];
    let v = t.price * (isMortgaged(idx) ? 0.65 : 1);
    if (tileKind(idx) === "street") {
        const g = groupOwnedBy(idx, idxOf(bot));
        if (g.owned + 1 === g.total) v *= 2.0;
        else if (g.owned >= 1) v *= 1.25;
    } else if (tileKind(idx) === "depot") {
        v *= 1 + 0.2 * ownedCount(idxOf(bot), DEPOT_TILES);
    }
    return v;
}

// Сколько стоит клетка для бота, когда он её отдаёт: он не любит отдавать комплекты и свои сильные улицы.
function costToGive(bot, human, idx) {
    const t = tiles[idx];
    let v = t.price * (isMortgaged(idx) ? 0.65 : 1);
    if (tileKind(idx) === "street") {
        const mine = groupOwnedBy(idx, idxOf(bot));
        if (mine.owned === mine.total) v *= 1.6;
        else if (mine.owned >= 2) v *= 1.3;
        const hum = groupOwnedBy(idx, idxOf(human));
        if (hum.owned + 1 === hum.total) v *= 1.8; // отдать значит подарить комплект человеку
    }
    return v * PERSONAS[bot.persona].greed;
}

// Справедливость сделки с точки зрения бота: > 0 выгодно ему, < 0 невыгодно.
// d описан с точки зрения человека: give* он отдаёт боту, get* просит у бота.
function dealFairness(bot, human, d) {
    const get = d.giveCash + d.giveProps.reduce((s, t) => s + worthToGet(bot, t), 0) + 50 * d.giveJail;   // что бот получает
    const give = d.getCash + d.getProps.reduce((s, t) => s + costToGive(bot, human, t), 0) + 50 * d.getJail; // что бот отдаёт
    return { get: get, give: give, f: (get - give) / Math.max(80, (get + give) / 2) };
}

// ---------- окно чата ----------
function updateChatHead() {
    if (!chat) return;
    const bot = chat.bot, P = PERSONAS[bot.persona];
    const t = getTrust(bot, chat.human);
    $("chat-avatar").textContent = P.emoji;
    $("chat-name").textContent = bot.name;
    $("chat-persona").textContent = P.emoji + " " + P.title;
    $("chat-trust").style.setProperty("--p", t);
    $("chat-trust").style.setProperty("--c", trustColor(t));
    $("chat-trust-num").textContent = t + "%";
}

function chatOpen(bot, human, dealHtml) {
    chat = { bot: bot, human: human, mood: 0, flags: new Set(), used: {}, stage: 0 };
    $("chat-log").innerHTML = "";
    $("chat-choices").innerHTML = "";
    $("chat-deal").innerHTML = dealHtml || "";
    $("chat-deal").classList.toggle("hidden", !dealHtml);
    $("chat-modal").classList.remove("hidden");
    updateChatHead();
}

function chatClose() {
    $("chat-modal").classList.add("hidden");
    chat = null;
}

function chatBubble(who, text) {
    const b = document.createElement("div");
    b.className = "bubble " + who;
    b.textContent = text;
    $("chat-log").appendChild(b);
    $("chat-log").scrollTop = $("chat-log").scrollHeight;
    return b;
}

async function chatBot(text) {
    const typing = chatBubble("bot typing", "…");
    await sleep(Math.min(1100, 300 + text.length * 9));
    typing.remove();
    chatBubble("bot", text);
}

function chatMe(text) { chatBubble("me", text); }

// Показывает варианты ответа. Заблокированные (locked: причина) видны с замком. Возвращает value выбранного.
function chatChoose(options) {
    return new Promise(resolve => {
        const box = $("chat-choices");
        box.innerHTML = "";
        options.forEach(o => {
            const b = document.createElement("button");
            b.className = "chat-choice" + (o.locked ? " locked" : "") + (o.danger ? " danger" : "");
            b.disabled = !!o.locked;
            const label = document.createElement("b");
            label.textContent = (o.locked ? "🔒 " : "") + o.label;
            const text = document.createElement("span");
            text.textContent = o.locked ? o.locked : (o.text || "");
            b.append(label, text);
            b.onclick = () => {
                box.innerHTML = "";
                if (o.say) chatMe(o.say);
                resolve(o.value);
            };
            box.appendChild(b);
        });
        $("chat-log").scrollTop = $("chat-log").scrollHeight;
    });
}

// ---------- реплики ----------
const TONES = {
    friendly:  { label: "😊 По-дружески",   group: "warm", p: { calm: 0.5,  greedy: 0.35, friend: 0.85 }, mood: 0.14, trust: 4 },
    business:  { label: "📊 По-деловому",   group: "cold", p: { calm: 0.8,  greedy: 0.6,  friend: 0.5 },  mood: 0.12, trust: 2 },
    joke:      { label: "😜 Пошутить",       group: "warm", p: { calm: 0.35, greedy: 0.3,  friend: 0.85 }, mood: 0.14, trust: 4 },
    flatter:   { label: "🌟 Польстить",      group: "warm", p: { calm: 0.4,  greedy: 0.75, friend: 0.6 },  mood: 0.16, trust: 3 },
    plead:     { label: "🥺 Пожалобиться",   group: "sad",  p: { calm: 0.4,  greedy: 0.2,  friend: 0.7 },  mood: 0.14, trust: 2 },
    pressure:  { label: "😠 Надавить",       group: "hard", p: { calm: 0.25, greedy: 0.4,  friend: 0.2 },  mood: 0.18, trust: -2 },
    remind:    { label: "🤝 Напомнить о добром", group: "warm", p: { calm: 0.85, greedy: 0.8, friend: 0.95 }, mood: 0.2, trust: 5 },
    ally:      { label: "🛡 Предложить союз", group: "warm", p: { calm: 0.6, greedy: 0.45, friend: 0.7 },  mood: 0.2,  trust: 5 },
    apologize: { label: "🙏 Извиниться",     group: "sorry", p: { calm: 0.8, greedy: 0.7,  friend: 0.9 },  mood: 0.1,  trust: 4 },
    warm:      { label: "☕ Растопить лёд",  group: "warm", p: { calm: 0.7,  greedy: 0.55, friend: 0.9 },  mood: 0.12, trust: 3 },
    insideJoke:{ label: "😂 Общая шутка",    group: "warm", p: { calm: 0.8,  greedy: 0.7,  friend: 0.95 }, mood: 0.24, trust: 5 },
    favor:     { label: "🎁 Попросить по-свойски", group: "warm", p: { calm: 0.7, greedy: 0.85, friend: 0.85 }, mood: 0.25, trust: 3 }
};

// Реплики игрока: по тонам, для сделки (deal) и для ренты (rent).
const HUMAN_LINES = {
    deal: {
        friendly: ["Слушай, мы же нормально общаемся. Давай договоримся по-хорошему?", "Давай как друзья: тебе хорошо, мне хорошо.", "Я к тебе по-честному. Идём навстречу друг другу?", "Без обид и хитростей: предлагаю нормальный обмен.", "Мы столько партий сыграли, давай без лишних споров."],
        business: ["Смотри на цифры: условия честные, выгода есть у обоих.", "Предлагаю чётко: вот что даю, вот что прошу. Прикинь сам.", "Это взаимовыгодно. Посчитай: ты не в минусе.", "Цена нормальная. Давай закроем вопрос.", "Без эмоций, по-деловому: берёшь или нет?"],
        joke: ["Я так торгуюсь, что даже банк просит у меня скидку. Ну что, по рукам?", "Откажешься, и я напишу на тебя баг-репорт.", "Соглашайся, пока я в хорошем настроении и не начал ворчать.", "Предложение хорошее, как код без багов. То есть почти не бывает. Бери!", "Откажешься, придётся перезапустить переговоры с начала."],
        flatter: ["Ты самый умный игрок за этим столом, сразу видишь выгоду.", "С таким чутьём на сделки тебе надо в банке работать.", "Тебя трудно обыграть, поэтому хочу договориться именно с тобой.", "Ты играешь лучше всех, не зря тебя все побаиваются."],
        plead: ["Мне правда очень нужна эта сделка, иначе я проиграю...", "Пожалуйста, выручи. У меня тяжёлая партия.", "Я почти на мели. Помоги, и я не забуду.", "Ну пожалуйста, ты же добрый."],
        pressure: ["Соглашайся, а то потом пожалеешь, когда я соберу комплект.", "Это последнее предложение. Дважды повторять не буду.", "Откажешься, и я больше с тобой торговаться не буду.", "Подумай хорошо: другого такого шанса не будет."],
        remind: ["Помнишь, мы хорошо договорились раньше? Повторим?", "Мы же уже выручали друг друга. Я на тебя надеюсь.", "Ты меня знаешь: я всегда выполняю договорённости."],
        ally: ["Лидер скоро всех задавит. Давай держаться вместе против него.", "Нас двое против остальных. Давай помогать друг другу.", "Если объединимся, оба выиграем больше."],
        apologize: ["Извини, я перегнул. Давай начнём разговор заново.", "Прости, это было грубо. Давай спокойно обсудим.", "Мой косяк. Забудем и вернёмся к сделке?"],
        warm: ["Слушай, давай сначала помиримся, а потом про дела.", "Я не хотел быть холодным. Давай заново, по-человечески."],
        insideJoke: ["А помнишь тот случай с кубиками? Вот был позор. Давай хоть тут договоримся!", "Раз смеёмся над одним и тем же, значит договоримся."],
        favor: ["Раз уж мы подружились, сделай мне одолжение?", "Ты же свой человек. Давай по-свойски."]
    },
    rent: {
        friendly: ["Слушай, мы же друзья. Сделай скидочку, а?", "Ну между своими же можно и дешевле, правда?", "Давай по-дружески: я не буду в обиде, а ты снизишь цену."],
        business: ["Давай посчитаем: я часто здесь бываю, мне положена скидка постоянного клиента.", "Предлагаю вернуться к этому позже: сейчас у меня кассовый разрыв.", "Рента завышена. Предлагаю честную цену."],
        joke: ["Я пришёл не платить, а смотреть достопримечательности. Бесплатно можно?", "Давай я заплачу вдвое меньше, а ты вдвое больше улыбнёшься?", "Если не снизишь, я оставлю плохой отзыв на сайте."],
        flatter: ["У тебя лучшая улица на всей доске. Такой хозяин не будет мелочиться.", "Ты тут самый щедрый, это все знают."],
        plead: ["У меня почти не осталось денег... Может, простишь?", "Пожалуйста, мне и так тяжело. Хотя бы половину.", "Я потом верну добром, честное слово."],
        pressure: ["Не заплачу, и всё. Что ты мне сделаешь?", "Или скидка, или я больше сюда ни ногой."],
        remind: ["Помнишь, как я тебя выручал? Теперь твоя очередь.", "Мы же с тобой договаривались по-честному. Давай и сейчас."],
        ally: ["Мы же с тобой против лидера. Своих надо беречь.", "Давай поддерживать друг друга: сегодня я, завтра ты."],
        apologize: ["Извини, был резок. Давай нормально поговорим про ренту.", "Прости, пожалуйста. Начнём заново?"],
        warm: ["Давай без напряжения. Я правда не хотел тебя злить.", "Давай просто нормально поговорим."],
        insideJoke: ["Ха, как в тот раз с кубиками! Ну давай, снизь цену, в память об этом.", "Мы же вместе смеёмся над этим. Скидка в честь шутки!"],
        favor: ["По-свойски: скинь ренту, а я тебе пригожусь.", "Ты же свой. Сделай одолжение."]
    }
};

// Ответы бота на реплику: по характеру, исходу (ok/bad) и группе тона.
const BOT_REACT = {
    calm: {
        ok:  { warm: ["Приятно слышать. Ладно, продолжим.", "Что ж, звучит разумно.", "Хорошо, я готов обсуждать."], cold: ["Логично. Давай прикинем.", "Цифры понятны, слушаю дальше.", "Профессионально. Продолжай."], sad: ["Тяжело тебе, понимаю. Но дела есть дела.", "Хм, ладно, сделаю скидку на сочувствие.", "Не люблю жалобы, но тебя я услышал."], hard: ["Ты настойчив. Это даже уважения достойно.", "Давишь, но по делу. Ладно.", "Хорошо, не горячись."], sorry: ["Принято. Забыли.", "Ладно, всякое бывает.", "Извинения приняты."] },
        bad: { warm: ["Давай без лирики.", "Это не аргумент.", "Милые слова цену не меняют."], cold: ["Цифры у тебя не сходятся.", "Слишком красиво говоришь, а по сути пусто.", "Не убедил."], sad: ["Жалость не входит в мою таблицу.", "Не давай на жалость, это скучно.", "Мне чужие проблемы не помогут."], hard: ["Угрозы не работают. Совсем.", "Не люблю, когда давят.", "Тон смени."], sorry: ["Слова слишком дёшево стоят.", "Посмотрим по делам.", "Осадочек остался."] }
    },
    greedy: {
        ok:  { warm: ["О, а ты умеешь общаться. Люблю таких.", "Хех, лесть работает. Продолжай.", "Мне это нравится. Говори дальше."], cold: ["Деньги считаешь, молодец.", "Деловой подход. Ценю.", "Ладно, цифры мне по душе."], sad: ["Ну ладно, пожалею. Немного.", "Эх, ты меня растрогал. Чуть-чуть.", "Ладно, не буду драть втридорога."], hard: ["Ого, напористый. Мне такое нравится.", "Сильный ход, не ожидал.", "Хорошо, хорошо, не кипятись."], sorry: ["Ладно, извинения засчитаны.", "Принято, но с процентами.", "Прощаю. Бесплатно."] },
        bad: { warm: ["Слова не деньги.", "Не подлизывайся, это не работает.", "Ты мне зубы заговариваешь."], cold: ["Слабо. Где моя выгода?", "Считать надо лучше.", "Мне невыгодно, так и знай."], sad: ["Бедность не порок, но и не повод для скидки.", "Нет, жалеть не буду.", "Слёзы в банк не положишь."], hard: ["Ты мне угрожаешь? Зря.", "Не на того напал!", "Давление? Я сам давить умею."], sorry: ["Извинения в карман не положишь.", "Потом посмотрим.", "Не верю."] }
    },
    friend: {
        ok:  { warm: ["Ха-ха, ну ты даёшь! Мне нравится.", "С тобой реально приятно общаться!", "Ладно-ладно, ты меня подкупил."], cold: ["Ну вот, нормальный разговор.", "Круто, что ты всё разложил.", "Хорошо, понял тебя."], sad: ["Ой, ну не грусти, всё наладится!", "Эх, ладно, помогу тебе.", "Держись, друг, разберёмся."], hard: ["Ну-ну, не горячись, ладно.", "Давишь, но я не обижаюсь.", "Окей-окей, понял."], sorry: ["Да ладно, забыли!", "Конечно, мир!", "Всё нормально, не переживай."] },
        bad: { warm: ["Эээ, не сработало, но смешно.", "Ха, хорошая попытка, но нет.", "Милый подкат, но не катит."], cold: ["Скучно говоришь, давай живее.", "Слишком формально для меня.", "Ну такое..."], sad: ["Не надо давить на жалость, а?", "Ой, не начинай.", "Я тебе сочувствую, но нет."], hard: ["Эй, это уже обидно!", "Зачем так грубо?", "Не люблю, когда на меня давят."], sorry: ["Ну... допустим.", "Хм, посмотрим.", "Осадок, но ладно."] }
    }
};

const BOT_GREET = {
    calm: ["Здравствуй. Что предлагаешь?", "Слушаю. Только давай по делу.", "Показывай, что у тебя."],
    greedy: ["О, клиент пришёл! Что принёс?", "Ну, я весь внимание. Сколько заплатишь?", "Давай, удиви меня выгодой."],
    friend: ["О, привет! Чем порадуешь?", "Привет-привет! Что у тебя?", "Рад тебя видеть! Выкладывай."]
};

const BOT_QUESTION = ["А зачем тебе эта улица?", "Чего ты на самом деле хочешь?", "Подожди, а в чём подвох?", "Мне интересно, какая тебе с этого выгода?"];

const BOT_ACCEPT = {
    calm: ["Расчёт сходится. Согласен.", "Хорошо, сделка выгодна обоим.", "По рукам."],
    greedy: ["Ха, неплохо! Беру.", "Сделка. Но ты у меня в долгу.", "Ладно, согласен. Мне это нравится."],
    friend: ["Договорились, друг!", "Ура, по рукам!", "Да, конечно! Приятно иметь с тобой дело."]
};
const BOT_REFUSE = {
    cheap: { calm: ["Слишком дёшево. Нет.", "Не сходится по цифрам. Отказываюсь.", "Это невыгодно."], greedy: ["Ты шутишь? За такое я и пальцем не пошевелю.", "Нет. Мало.", "Хочешь меня обобрать? Не выйдет."], friend: ["Эх, не получится, слишком в минус мне.", "Прости, друг, так нельзя.", "Нет, давай что-то другое."] },
    trust: { calm: ["Я тебе пока не доверяю. Отказ.", "Слишком много вопросов. Нет.", "Не сейчас."], greedy: ["Ты мне не нравишься. До свидания.", "Не хочу с тобой связываться.", "Нет, и точка."], friend: ["Знаешь, у меня плохое предчувствие. Нет.", "Пока не готов, прости.", "Не сегодня, ладно?"] }
};
const BOT_COUNTER = {
    calm: ["Добавь {extra} ₽ сверху, и мы договоримся.", "Почти. Но нужно ещё {extra} ₽."],
    greedy: ["Хочешь это? Плати ещё {extra} ₽.", "Ещё {extra} ₽, и по рукам."],
    friend: ["Слушай, мне не хватает {extra} ₽, добавишь?", "Давай ещё {extra} ₽ и будем довольны оба."]
};

// ---------- розыгрыш реплики ----------
// Выбирает неповторявшуюся фразу игрока (память по боту).
function pickHumanLine(bot, ctxKey, tone) {
    const pool = HUMAN_LINES[ctxKey][tone] || HUMAN_LINES.deal[tone];
    if (!bot.used) bot.used = {};
    const key = ctxKey + ":" + tone;
    const used = bot.used[key] || (bot.used[key] = []);
    let fresh = pool.filter((l, i) => used.indexOf(i) === -1);
    if (!fresh.length) { used.length = 0; fresh = pool.slice(); }
    const line = pick(fresh);
    used.push(pool.indexOf(line));
    return line;
}

// Какие реплики показать и какие заперты: замки открываются тем, что ты говорил раньше в этом разговоре.
function toneOptions(ctxKey, allowed) {
    const bot = chat.bot, human = chat.human;
    const trust = getTrust(bot, human);
    const flags = chat.flags;
    const locks = {
        friendly: () => flags.has("insulted") ? "он обижен после твоих слов" : null,
        joke: () => flags.has("insulted") ? "он обижен после твоих слов" : null,
        flatter: () => null, business: () => null, plead: () => null, pressure: () => null,
        remind: () => trust >= 60 ? null : "нужно доверие от 60%",
        ally: () => (alivePlayers().length >= 3 && trust >= 45) ? null : "нужен третий игрок и доверие от 45%",
        apologize: () => flags.has("insulted") ? null : "пока не за что извиняться",
        warm: () => flags.has("cold") ? null : "и так не холодно",
        insideJoke: () => flags.has("laugh") ? null : "сначала нужно рассмешить",
        favor: () => flags.has("flattered") ? null : "сначала нужно понравиться"
    };
    return allowed.map(tone => {
        const reason = locks[tone]();
        const line = reason ? "" : pickHumanLine(bot, ctxKey, tone);
        return { label: TONES[tone].label, text: line ? "«" + line + "»" : "", say: line, value: tone, locked: reason, danger: tone === "pressure" };
    });
}

// Применяет реплику: бросает кубик успеха, меняет настроение, доверие и флаги. Возвращает true, если реплика зашла.
async function playTone(tone) {
    const bot = chat.bot, human = chat.human, persona = bot.persona;
    const T = TONES[tone];
    const trust = getTrust(bot, human);
    const repeat = chat.used[tone] ? 0.18 : 0;
    const p = clamp(T.p[persona] + (trust - 50) / 250 + chat.mood * 0.25 - repeat, 0.05, 0.95);
    const ok = Math.random() < p;
    chat.used[tone] = true;
    if (ok) {
        chat.mood += T.mood;
        changeTrust(bot, human, T.trust);
        if (tone === "joke") chat.flags.add("laugh");
        if (tone === "flatter") chat.flags.add("flattered");
        if (tone === "apologize") chat.flags.delete("insulted");
        if (tone === "warm") chat.flags.delete("cold");
    } else {
        chat.mood -= 0.1;
        changeTrust(bot, human, tone === "pressure" ? -7 : -3);
        if (tone === "pressure") chat.flags.add("insulted");
        if (tone === "friendly" || tone === "business") chat.flags.add("cold");
        if (tone === "pressure" && trust < 30) chat.mood -= 0.1;
    }
    await chatBot(pick(BOT_REACT[persona][ok ? "ok" : "bad"][T.group]));
    return ok;
}

// ---------- итог сделки ----------
function dealHtml(bot, human, d) {
    const names = list => list.map(t => "«" + tiles[t].name + "»").join(", ");
    const part = (cash, props, jail) => {
        const a = [];
        if (cash) a.push(money(cash));
        if (props.length) a.push(names(props));
        if (jail) a.push("карта освобождения ×" + jail);
        return a.length ? a.join(" + ") : "ничего";
    };
    return "<div><b>" + esc(human.name) + " отдаёт:</b> " + esc(part(d.giveCash, d.giveProps, d.giveJail)) + "</div>" +
        "<div><b>" + esc(bot.name) + " отдаёт:</b> " + esc(part(d.getCash, d.getProps, d.getJail)) + "</div>";
}

// ---------- переговоры: человек предлагает сделку боту ----------
// d: { giveCash, giveProps, giveJail } - что отдаёт человек, { getCash, getProps, getJail } - что он просит у бота.
// Возвращает { accepted, extra } (extra: сколько человек добавляет деньгами по просьбе бота).
async function negotiateDeal(bot, human, d) {
    chatOpen(bot, human, dealHtml(bot, human, d));
    const persona = bot.persona;
    const result = { accepted: false, extra: 0 };
    await chatBot(pick(BOT_GREET[persona]));

    const base = ["friendly", "business", "joke", "flatter", "plead", "pressure", "remind", "ally", "apologize", "warm", "insideJoke", "favor"];
    // 1. первая реплика
    let first = await chatChoose(toneOptions("deal", base).concat([{ label: "🚪 Уйти", text: "Передумал.", value: "leave" }]));
    if (first === "leave") { chatClose(); return result; }
    await playTone(first);

    // 2. вопрос бота (если он что-то отдаёт)
    if (d.getProps.length && Math.random() < 0.75) {
        await chatBot(pick(BOT_QUESTION));
        const completes = d.getProps.some(t => tileKind(t) === "street" && groupOwnedBy(t, idxOf(human)).owned + 1 === groupOwnedBy(t, idxOf(human)).total);
        const answers = [
            { label: "🗣 Сказать как есть", text: completes ? "«Честно: это закрывает мне цветовую группу.»" : "«Честно: мне это пригодится в игре.»", say: completes ? "Честно: это закрывает мне цветовую группу." : "Честно: мне это пригодится в игре.", value: "honest" },
            { label: "🙈 Увильнуть", text: "«Просто так, захотелось.»", say: "Просто так, захотелось.", value: "dodge" },
            { label: "🎭 Приврать", text: "«Хочу построить там дачу и жить мирно.»", say: "Хочу построить там дачу и жить мирно.", value: "bluff" },
            { label: "😜 Отшутиться", text: "«Собираю коллекцию улиц Москвы.»", say: "Собираю коллекцию улиц Москвы.", value: "jokeA" }
        ];
        const ans = await chatChoose(answers);
        if (ans === "honest") {
            changeTrust(bot, human, 3);
            chat.mood -= 0.04;
            chat.flags.add("revealed");
            await chatBot(completes ? pick(["Ага, значит комплект собираешь. Это дорого стоит.", "Понятно. Тогда и цена будет другая.", "Честно, ценю. Но ты мне подарок комплектом не делаешь, поэтому цена вырастет."]) : pick(["Честность это хорошо.", "Ладно, спасибо, что не юлишь.", "Хм, разумно."]));
        } else if (ans === "dodge") {
            chat.mood -= 0.03;
            await chatBot(pick(["Не скажешь? Ну ладно.", "Подозрительно, но допустим.", "Секрет? Ладно, мне всё равно."]));
        } else if (ans === "bluff") {
            const P = PERSONAS[persona];
            const caught = Math.random() < clamp(0.45 - P.risk * 0.2 + (completes ? 0.15 : 0) - getTrust(bot, human) / 400, 0.1, 0.8);
            if (caught) {
                chat.mood -= 0.2;
                chat.flags.add("liar");
                changeTrust(bot, human, -8);
                await chatBot(pick(["Ха! Дачу? Я вижу, что ты что-то скрываешь.", "Не ври мне. Я тебя раскусил.", "Какая дача? Ты комплект собираешь!"]));
            } else {
                chat.mood += 0.08;
                await chatBot(pick(["Дача? Мило. Ладно, верю.", "Ну, мирно жить это неплохо.", "Хм, звучит безобидно."]));
            }
        } else {
            const ok = Math.random() < clamp(TONES.joke.p[persona] + 0.1, 0.1, 0.95);
            if (ok) { chat.mood += 0.1; chat.flags.add("laugh"); await chatBot(pick(["Коллекция? Ха-ха, ладно, ты смешной.", "Ну ты и выдумщик!", "Улицы Москвы? Кто бы мог подумать."])); }
            else { chat.mood -= 0.05; await chatBot(pick(["Шутки шутками, а я жду ответа.", "Не смешно.", "Ну такое."])); }
        }
    }

    // 3. второй аргумент (или сразу к делу)
    const more = await chatChoose(toneOptions("deal", base).concat([{ label: "⏩ Хватит болтать", text: "Спросить, согласен ли он.", value: "go" }]));
    if (more !== "go") await playTone(more);

    // 4. решение
    return await botDecideDeal(bot, human, d, result);
}

async function botDecideDeal(bot, human, d, result) {
    const persona = bot.persona;
    const trust = getTrust(bot, human);
    const fair = dealFairness(bot, human, d);
    const f = fair.f - (chat.flags.has("revealed") ? 0.18 : 0); // если игрок признался, что это ему нужно для комплекта, бот просит больше
    const score = f + chat.mood + (trust - 50) / 100 * 0.5 + (Math.random() * 0.12 - 0.06);
    if (score >= 0) {
        await chatBot(pick(BOT_ACCEPT[persona]));
        changeTrust(bot, human, 6);
        result.accepted = true;
        await sleep(500);
        chatClose();
        return result;
    }
    if (score >= -0.4 && human.money >= 20) {
        let extra = round10(Math.max(0, (fair.give - fair.get)) * 0.85 + 10 + Math.random() * 20);
        extra = Math.min(extra, Math.max(10, human.money - 10));
        await chatBot(pick(BOT_COUNTER[persona]).replace("{extra}", extra));
        return await counterRound(bot, human, d, result, extra, 0);
    }
    const cheap = f < -0.35;
    await chatBot(pick(BOT_REFUSE[cheap ? "cheap" : "trust"][persona]));
    changeTrust(bot, human, cheap ? -2 : -4);
    await sleep(600);
    chatClose();
    return result;
}

async function counterRound(bot, human, d, result, extra, round) {
    const persona = bot.persona;
    const options = [
        { label: "✅ Согласиться", text: "Добавить " + money(extra) + ".", say: "Ладно, добавлю " + extra + " ₽.", value: "yes" },
        { label: "💬 Поторговаться", text: "Попросить скинуть.", value: "haggle", locked: round >= 1 ? "он уже назвал последнюю цену" : null },
        { label: "🙅 Отказаться", text: "Нет, так не пойдёт.", say: "Нет, так не пойдёт.", value: "no" }
    ];
    const choice = await chatChoose(options);
    if (choice === "yes") {
        await chatBot(pick(BOT_ACCEPT[persona]));
        changeTrust(bot, human, 5);
        result.accepted = true;
        result.extra = extra;
        await sleep(500);
        chatClose();
        return result;
    }
    if (choice === "no") {
        await chatBot(pick(["Ну как знаешь.", "Жаль. Тогда без сделки.", "Ладно, до встречи."]));
        changeTrust(bot, human, -1);
        await sleep(500);
        chatClose();
        return result;
    }
    // торг
    const tone = await chatChoose(toneOptions("deal", ["friendly", "business", "joke", "plead", "pressure", "remind", "favor", "flatter"]));
    const ok = await playTone(tone);
    const newExtra = ok ? Math.max(10, round10(extra * 0.55)) : round10(extra * 1.15);
    if (ok) await chatBot(pick(BOT_COUNTER[persona]).replace("{extra}", newExtra).replace(/^/, "Ладно, уступлю. "));
    else await chatBot(pick(["Нет, цена стала ещё выше: ", "Теперь только так: ", "Я предупреждал. Теперь: "]) + newExtra + " ₽, и это последнее слово.");
    if (human.money < newExtra) { await chatBot("Хотя у тебя столько и нет. Значит, сделки не будет."); await sleep(600); chatClose(); return result; }
    return await counterRound(bot, human, d, result, newExtra, 1);
}

// ---------- скидка на ренту ----------
const RENT_OUTCOME = {
    calm: { waive: ["Ладно, в этот раз прощаю.", "Бери бесплатно. Один раз."], half: ["Пополам, и вопрос закрыт.", "Половину скину."], full: ["Рента есть рента. Платишь полностью.", "Нет, цена остаётся."], worse: ["Ты меня утомил. С тебя на 10% больше.", "За эти разговоры плати надбавку."] },
    greedy: { waive: ["Ха, так и быть, сегодня я добрый.", "Прощаю, но запомню."], half: ["Скину половину. Не наглей.", "Пополам, и точка."], full: ["Ничего не скину, плати.", "Деньги на бочку."], worse: ["Надоел! Плати ещё сверху.", "Надбавка за наглость!"] },
    friend: { waive: ["Да ладно, иди так! Свои же!", "Бесплатно, друг. Для тебя можно."], half: ["Давай пополам, ага?", "Окей, скину половину."], full: ["Эх, прости, но тут правила. Плати.", "Не могу, так нечестно к другим."], worse: ["Ой, ты меня разозлил. Надбавка!", "Не надо было так. Плати больше."] }
};

// Возвращает, сколько человек платит.
async function negotiateRent(bot, human, rent, tile) {
    chatOpen(bot, human, "<div>Рента на «" + esc(tile.name) + "»: <b>" + money(rent) + "</b></div>");
    const persona = bot.persona;
    await chatBot(pick({ calm: ["Рента по таблице. О чём речь?", "Слушаю твои аргументы."], greedy: ["Платить надо, а не болтать. Но слушаю.", "Скидку? Смешно. Ну, говори."], friend: ["О, ты хочешь скидку? Ну давай обсудим!", "Хе-хе, торгуемся?"] }[persona]));
    const base = ["friendly", "business", "joke", "flatter", "plead", "pressure", "remind", "ally", "apologize", "warm", "insideJoke", "favor"];
    let tone = await chatChoose(toneOptions("rent", base).concat([{ label: "💸 Просто заплатить", text: "Передумал просить.", value: "pay" }]));
    if (tone === "pay") { chatClose(); return rent; }
    let ok = await playTone(tone);
    let score = chat.mood + (getTrust(bot, human) - 50) / 100 * 0.6 + (ok ? 0.1 : -0.1);

    // встречный вопрос
    await chatBot(pick(["А что дашь взамен?", "Ладно, а что я получу?", "Предположим. А какая мне выгода?"]));
    const offerCash = Math.max(10, round10(rent * 0.15));
    const give = await chatChoose([
        { label: "💰 Добавить немного", text: "«Вот " + offerCash + " ₽ за беспокойство.»", say: "Вот " + offerCash + " ₽ сверху.", value: "cash", locked: human.money < rent + offerCash ? "не хватает денег" : null },
        { label: "🤝 Обещать услугу", text: "«В следующий раз я тебя выручу.»", say: "В следующий раз я тебя выручу.", value: "favor" },
        { label: "🎭 Приврать", text: "«Я тебя угощу после игры.»", say: "Я тебя угощу после игры.", value: "bluff" },
        { label: "🤐 Ничего", text: "Промолчать.", value: "none" }
    ]);
    if (give === "cash") score += 0.3;
    else if (give === "favor") score += 0.12;
    else if (give === "bluff") score += Math.random() < 0.5 ? 0.15 : -0.2;
    else score -= 0.05;
    score += Math.random() * 0.2 - 0.1;

    const R = RENT_OUTCOME[persona];
    let pay, line;
    if (score >= 0.5) { pay = 0; line = pick(R.waive); changeTrust(bot, human, 3); }
    else if (score >= 0.2) { pay = Math.round(rent / 2); line = pick(R.half); changeTrust(bot, human, 2); }
    else if (score >= -0.1) { pay = rent; line = pick(R.full); }
    else { pay = Math.round(rent * 1.1); line = pick(R.worse); changeTrust(bot, human, -4); }
    if (give === "cash" && pay > 0) pay += offerCash;
    else if (give === "cash") pay = offerCash;
    await chatBot(line + (pay === 0 ? "" : " С тебя " + money(pay) + "."));
    await sleep(600);
    chatClose();
    return pay;
}

// ---------- беседа (поднять доверие) ----------
const TALK_TOPICS = [
    { bot: "Слушай, как тебе вообще школа? Не устал от контрольных?", opts: [["Устал, но держусь. А ты как?", 4, "Ха, держись, все такие."], ["Ужас, всё бесит.", 1, "Понимаю тебя, всем тяжело."], ["Давай лучше про игру.", 0, "Ладно, как скажешь."], ["Не твоё дело.", -5, "Эй, я просто спросил."]] },
    { bot: "А ты вообще умеешь программировать? Или только играешь?", opts: [["Немного учусь, это круто.", 4, "О, респект! Тоже хочу научиться."], ["Умею, но это скучно.", 1, "Ну такое бывает."], ["Только играю.", 2, "Тоже вариант, главное чтобы весело."], ["Отстань с этим.", -4, "Ладно, ладно, тише."]] },
    { bot: "Какой у тебя план в этой партии? Будешь собирать комплекты?", opts: [["Конечно, и тебя обыграю.", 3, "Ха, посмотрим, кто кого!"], ["Хочу просто повеселиться.", 4, "Вот, отличный настрой!"], ["Не скажу, это секрет.", 0, "Секретничаешь, значит, есть что скрывать."], ["Раздавлю всех, и тебя первым.", -5, "Не слишком ли ты самоуверен?"]] },
    { bot: "Что думаешь про эту доску? Названия улиц нормальные?", opts: [["Мне нравится, я многие знаю.", 4, "Хорошо, что игра про знакомые места."], ["Могло быть и лучше.", 0, "Ну, каждому своё."], ["Лучше бы названия поменять.", -1, "Хм, не согласен, но спорить не буду."], ["Мне всё равно.", -2, "Ну и ладно."]] },
    { bot: "Если бы ты мог поменять одно правило в Монополии, что бы это было?", opts: [["Чтобы аукцион был жарче.", 3, "О, интересно, мне тоже нравится торговаться."], ["Чтобы налоги отменить.", 2, "Ха! Налоги никто не любит."], ["Чтобы банк не жадничал.", 2, "Банк вообще жадный, согласен."], ["Ничего, всё и так плохо.", -2, "Мрачновато."]] },
    { bot: "Ты когда-нибудь выигрывал в Монополию? Как это было?", opts: [["Да, и это было эпично!", 3, "Расскажешь потом подробности?"], ["Пару раз, повезло.", 2, "Скромничаешь!"], ["Нет, всегда проигрываю.", 3, "Ничего, это тоже опыт!"], ["Выигрывал, но это не интересно.", -2, "Ну да, понятно."]] }
];

async function smallTalk(bot, human) {
    chatOpen(bot, human, "");
    const topics = shuffle(TALK_TOPICS).slice(0, 3);
    await chatBot(pick({ calm: ["Давай поговорим, если есть время.", "Можно и поболтать."], greedy: ["Поболтать? Ладно, но недолго.", "Хм, давай, пока я при деньгах."], friend: ["О, давай поболтаем!", "Ура, разговор! Давай!"] }[bot.persona]));
    let total = 0;
    for (const t of topics) {
        await chatBot(t.bot);
        const options = shuffle(t.opts).map(o => ({ label: "💬 Ответить", text: "«" + o[0] + "»", say: o[0], value: o }));
        const ans = await chatChoose(options);
        total += ans[1];
        changeTrust(bot, human, ans[1]);
        await chatBot(ans[2]);
    }
    await chatBot(total >= 6 ? "Мне с тобой реально интересно. Спасибо за разговор!" : total >= 0 ? "Хорошо поговорили." : "Ну, это было не очень приятно...");
    await sleep(700);
    chatClose();
}

// ---------- предложения от бота ----------
// В конце хода бот может предложить человеку продать клетку, которая закрывает ему комплект.
async function botMaybeOffer(bot) {
    if (gameState.over || bot.bankrupt || Math.random() > 0.6) return;
    const P = PERSONAS[bot.persona];
    const bi = idxOf(bot);
    const humans = gameState.players.filter(p => !p.bot && !p.bankrupt);
    if (!humans.length) return;
    // клетка человека, закрывающая комплект боту
    let target = null;
    Object.keys(gameState.owners).map(Number).forEach(t => {
        const o = gameState.owners[t];
        if (gameState.players[o].bot || tileKind(t) !== "street" || isMortgaged(t) || housesOn(t) > 0) return;
        const g = groupOwnedBy(t, bi);
        if (g.owned + 1 === g.total && groupMembers(tiles[t].group).every(i => housesOn(i) === 0)) target = target || t;
    });
    if (target === null) return;
    const human = gameState.players[gameState.owners[target]];
    if (bot.offerAt !== undefined && gameState.turnCounter - bot.offerAt < 4) return;
    const price = round10(tiles[target].price * (1.2 + Math.random() * 0.35) * P.greed);
    if (bot.money < price + 30) return;
    bot.offerAt = gameState.turnCounter;
    $("log-last") && say(bot.name + " хочет поговорить с " + human.name);
    await offerDialog(bot, human, target, price);
}

async function offerDialog(bot, human, idx, price) {
    const persona = bot.persona;
    chatOpen(bot, human, "<div>" + esc(bot.name) + " предлагает купить «" + esc(tiles[idx].name) + "» за <b>" + money(price) + "</b></div>");
    await chatBot(pick({ calm: ["Есть деловое предложение. Продай мне «" + tiles[idx].name + "». Цена серьёзная: " + price + " ₽.", "Предлагаю сделку: " + price + " ₽ за «" + tiles[idx].name + "»."], greedy: ["Продай «" + tiles[idx].name + "», дам " + price + " ₽. Это щедро, не тупи.", "Эй, " + price + " ₽ за «" + tiles[idx].name + "». Бери, пока даю."], friend: ["Слушай, продашь мне «" + tiles[idx].name + "»? Дам " + price + " ₽!", "Привет! У меня к тебе просьба: «" + tiles[idx].name + "» за " + price + " ₽, а?"] }[persona]));
    let curPrice = price, haggled = false;
    for (;;) {
        const opts = [
            { label: "✅ Согласиться", text: "Продать за " + money(curPrice) + ".", say: "Согласен, продаю.", value: "yes" },
            { label: "💰 Запросить больше", text: "Поторговаться.", value: "haggle", locked: haggled ? "он уже назвал последнюю цену" : null },
            { label: "🔨 Выставить на аукцион", text: "Пусть решает, кто даст больше.", say: "Давай устроим аукцион.", value: "auction" },
            { label: "🙂 Вежливо отказать", text: "«Спасибо, но я пока оставлю.»", say: "Спасибо, но я пока оставлю.", value: "no" },
            { label: "😤 Отказать резко", text: "«Даже не мечтай.»", say: "Даже не мечтай.", value: "rude", danger: true }
        ];
        const choice = await chatChoose(opts);
        if (choice === "yes") {
            await chatBot(pick(BOT_ACCEPT[persona]));
            changeTrust(bot, human, 4);
            applyTradeData({ me: idxOf(bot), partner: idxOf(human), giveProps: [], getProps: [idx], giveJail: 0, getJail: 0, giveNotes: null, getNotes: null, cashFromMeToPartner: curPrice });
            await sleep(500);
            chatClose();
            return;
        }
        if (choice === "no") { await chatBot(pick(["Ладно, жаль.", "Понял. Не настаиваю.", "Эх, ну хорошо."])); changeTrust(bot, human, persona === "greedy" ? -2 : -1); await sleep(500); chatClose(); return; }
        if (choice === "rude") { await chatBot(pick(["Ох, как грубо!", "Ну и ладно, больше не спрошу.", "Зря ты так."])); changeTrust(bot, human, -6); await sleep(500); chatClose(); return; }
        if (choice === "auction") {
            await chatBot(pick(["Аукцион так аукцион.", "Ладно, посмотрим, кто победит.", "Хм, смело."]));
            await sleep(400);
            chatClose();
            await auction(idx, human, idxOf(human));
            return;
        }
        // торг
        haggled = true;
        const tone = await chatChoose(toneOptions("deal", ["friendly", "business", "joke", "plead", "pressure", "remind", "flatter", "favor"]));
        const ok = await playTone(tone);
        const limit = Math.min(bot.money - 20, price * 1.6);
        const raise = ok ? round10(curPrice * (1.15 + Math.random() * 0.2)) : curPrice;
        if (ok && raise <= limit) { curPrice = raise; await chatBot(pick(["Ладно, " + curPrice + " ₽. Это моя максимальная цена.", "Хорошо, давай " + curPrice + " ₽ и закончим.", "Ох, " + curPrice + " ₽, и ни монетой больше."])); }
        else { await chatBot(pick(["Больше не дам. Моя цена: " + curPrice + " ₽.", "Всё, предел. " + curPrice + " ₽.", "Не торгуйся, я уже сказал цену."])); }
        document.querySelector("#chat-deal").innerHTML = "<div>" + esc(bot.name) + " предлагает купить «" + esc(tiles[idx].name) + "» за <b>" + money(curPrice) + "</b></div>";
    }
}

// ---------- меню чата с ботом ----------
async function openBotMenu(botIdx) {
    if (!manageable() || gameState.debt) return;
    const bot = gameState.players[botIdx], human = cur();
    if (human.bot || !bot.bot || bot.bankrupt) return;
    chatOpen(bot, human, "");
    await chatBot(pick(BOT_GREET[bot.persona]));
    for (;;) {
        const talked = bot.talkedTurn === gameState.turnCounter;
        const choice = await chatChoose([
            { label: "💬 Поболтать", text: "Поговорить, чтобы он стал доверять больше.", value: "talk", locked: talked ? "на этом ходу уже болтали" : null },
            { label: "🤝 Предложить сделку", text: "Обмен, покупка или продажа.", value: "trade" },
            { label: "🚪 Уйти", text: "", value: "leave" }
        ]);
        if (choice === "talk") {
            bot.talkedTurn = gameState.turnCounter;
            chatClose();
            await smallTalk(bot, human);
            return;
        }
        if (choice === "trade") {
            chatClose();
            openTrade(botIdx);
            return;
        }
        chatClose();
        return;
    }
}

// ---------- игровой ИИ ботов ----------
function botWantsToBuy(bot, idx) {
    const P = PERSONAS[bot.persona];
    const price = tiles[idx].price;
    if (bot.money < price) return false;
    const after = bot.money - price;
    let need = P.reserve;
    if (tileKind(idx) === "street") {
        const mine = groupOwnedBy(idx, idxOf(bot));
        if (mine.owned + 1 === mine.total) need = 30;
        else if (mine.owned >= 1) need = P.reserve * 0.6;
        // не дать человеку собрать комплект
        const others = groupMembers(tiles[idx].group).filter(i => i !== idx);
        const rival = others.length && others.every(i => gameState.owners[i] !== undefined && gameState.owners[i] === gameState.owners[others[0]] && gameState.owners[i] !== idxOf(bot));
        if (rival) need = Math.min(need, 60);
    } else {
        need = P.reserve * 0.8;
    }
    return after >= need && Math.random() < 0.9;
}

async function botManage(bot) {
    botActing = true;
    try {
        const P = PERSONAS[bot.persona];
        const bi = idxOf(bot);
        // выкупить заложенное, когда много денег
        for (const t of Object.keys(gameState.owners).map(Number).filter(t => gameState.owners[t] === bi && isMortgaged(t))) {
            if (bot.money > unmortgageCost(t) + P.reserve + 150 && canUnmortgage(t)) { unmortgageTile(t); await sleep(350); }
        }
        // строить дома равномерно, пока есть деньги
        for (let k = 0; k < 4; k++) {
            const options = Object.keys(gameState.owners).map(Number).filter(t => gameState.owners[t] === bi && canBuildNow(t) && bot.money - HOUSE_COST[tiles[t].group] >= P.reserve);
            if (!options.length) break;
            options.sort((a, b) => housesOn(a) - housesOn(b));
            buildHouse(options[0]);
            await botWait(350);
        }
    } finally { botActing = false; }
}

async function botRaiseFunds(bot, amount) {
    botActing = true;
    gameState.actor = bot;
    try {
        const bi = idxOf(bot);
        while (bot.money < amount) {
            const owned = Object.keys(gameState.owners).map(Number).filter(t => gameState.owners[t] === bi);
            let acted = false;
            for (const t of owned.slice().sort((a, b) => housesOn(b) - housesOn(a))) {
                if (canSellHouse(t)) { sellHouse(t); acted = true; break; }
            }
            if (!acted) {
                for (const t of owned.slice().sort((a, b) => tiles[a].price - tiles[b].price)) {
                    if (canMortgage(t)) { mortgageTile(t); acted = true; break; }
                }
            }
            if (!acted) break;
            await botWait(300);
        }
    } finally {
        botActing = false;
        gameState.actor = null;
    }
    return bot.money >= amount;
}

// Сколько бот готов дать на аукционе за клетку (0 = пас).
function botBid(bot, idx, high) {
    const P = PERSONAS[bot.persona];
    const cap = worthToGet(bot, idx) * 0.85 * (0.85 + 0.25 * P.greed);
    const limit = Math.min(cap, bot.money - 30);
    if (high + 10 > limit) return 0;
    const room = limit - high;
    let inc = 10;
    if (room >= 150 && Math.random() < 0.4) inc = 50;
    if (room >= 500 && Math.random() < 0.25) inc = 100;
    return inc;
}

// Ответы бота на вопросы игры (бросить кубики, купить, выйти из тюрьмы, завершить ход).
async function botAsk(ctx, pending) {
    await botWait(450 + Math.random() * 400);
    if (!gameState || gameState.over || gameState.pending !== pending) return;
    const p = ctx.player;
    switch (ctx.kind) {
        case "roll":
        case "doubles":
            pending.resolve(true);
            break;
        case "jail": {
            const P = PERSONAS[p.persona];
            if (p.jailCards.length) pending.resolve("card");
            else if (p.money > P.reserve + 150) pending.resolve("pay");
            else pending.resolve("roll");
            break;
        }
        case "buy":
            pending.resolve(botWantsToBuy(p, ctx.idx));
            break;
        case "end":
            await botManage(p);
            if (gameState.over || gameState.pending !== pending) return;
            await botMaybeOffer(p);
            if (gameState.over || gameState.pending !== pending) return;
            pending.resolve(true);
            break;
        default:
            pending.resolve(true);
    }
}
