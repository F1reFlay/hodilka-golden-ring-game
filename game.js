// ==========================================
// ЧАСТЬ 1: ИНИЦИАЛИЗАЦИЯ И СТАРТ ПУТЕВОДИТЕЛЯ
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mapImage = new Image();
let mapLoadedSuccessfully = false;
let mapLoadError = null;

const mapLoadTimeout = setTimeout(() => {
    if (!mapLoadedSuccessfully) {
        mapLoadError = "Карта долго загружается. Используется режим без карты.";
        console.warn("Map load timeout");
    }
}, 10000);

mapImage.src = "map.jpg";

mapImage.onload = function() {
    mapLoadedSuccessfully = true;
    mapLoadError = null;
    clearTimeout(mapLoadTimeout);
    console.log("Map loaded successfully");
};

mapImage.onerror = function() {
    mapLoadError = "Не удалось загрузить карту. Проверьте интернет-соединение.";
    clearTimeout(mapLoadTimeout);
    console.error("Failed to load map image");
};

let players = [];
let currentTurn = 0;
let isMoving = false;
let isExtraTurnEarned = false;

const playerColors = ["#a482ff", "#50fa7b", "#ffb86c", "#8be9fd"];

const SCALE_X = 0.85;
const SCALE_Y = 0.85;

const boardRoute = {
    "5": { "x": Math.round(95 * SCALE_X), "y": Math.round(552 * SCALE_Y), "type": "normal" },
    "6": { "x": Math.round(141 * SCALE_X), "y": Math.round(524 * SCALE_Y), "type": "normal" },
    "7": { "x": Math.round(158 * SCALE_X), "y": Math.round(507 * SCALE_Y), "type": "normal" },
    "8": { "x": Math.round(181 * SCALE_X), "y": Math.round(491 * SCALE_Y), "type": "normal" },
    "9": { "x": Math.round(201 * SCALE_X), "y": Math.round(471 * SCALE_Y), "type": "normal" },
    "10": { "x": Math.round(221 * SCALE_X), "y": Math.round(459 * SCALE_Y), "type": "normal" },
    "11": { "x": Math.round(240 * SCALE_X), "y": Math.round(447 * SCALE_Y), "type": "normal" },
    "12": { "x": Math.round(257 * SCALE_X), "y": Math.round(426 * SCALE_Y), "type": "gold", "text": "Сергиев Посад\nЖемчужина Золотого кольца, славится своим духовным сердцем — величественной Троице-Сергиевой лаврой, притягивающей паломников со всего мира. Именно здесь можно проследить всю историю русского православия. Духовный подъем дает вам право сделать еще один ход!" },
    "13": { "x": Math.round(258 * SCALE_X), "y": Math.round(400 * SCALE_Y), "type": "normal" },
    "14": { "x": Math.round(272 * SCALE_X), "y": Math.round(380 * SCALE_Y), "type": "fork" },
    "15": { "x": Math.round(298 * SCALE_X), "y": Math.round(375 * SCALE_Y), "type": "normal" },
    "16": { "x": Math.round(326 * SCALE_X), "y": Math.round(368 * SCALE_Y), "type": "normal" },
    "17": { "x": Math.round(354 * SCALE_X), "y": Math.round(361 * SCALE_Y), "type": "normal" },
    "18": { "x": Math.round(374 * SCALE_X), "y": Math.round(347 * SCALE_Y), "type": "gold", "text": "Переславль-Залесский\nДревний город, хранит память о рождении великого русского полководца Александра Невского. На берегу Плещеева озера можно увидеть знаменитый Синь-камень, а в местном музее хранится ботик Петра I!" },
    "19": { "x": Math.round(382 * SCALE_X), "y": Math.round(321 * SCALE_Y), "type": "normal" },
    "20": { "x": Math.round(394 * SCALE_X), "y": Math.round(299 * SCALE_Y), "type": "normal" },
    "21": { "x": Math.round(402 * SCALE_X), "y": Math.round(275 * SCALE_Y), "type": "normal" },
    "22": { "x": Math.round(419 * SCALE_X), "y": Math.round(256 * SCALE_Y), "type": "normal" },
    "23": { "x": Math.round(433 * SCALE_X), "y": Math.round(232 * SCALE_Y), "type": "gold", "text": "Ростов Великий\nОдин из ключевых точек Золотого кольца. Славится своим величественным Кремлем с уникальными звонами белокаменных стен. Погрузиться в историю поможет посещение музеев финифти." },
    "24": { "x": Math.round(448 * SCALE_X), "y": Math.round(211 * SCALE_Y), "type": "normal" },
    "25": { "x": Math.round(469 * SCALE_X), "y": Math.round(197 * SCALE_Y), "type": "fork" }
};


// ==========================================
// ЧАСТЬ 2: ПУТЕВОДИТЕЛЬ (ПРОДОЛЖЕНИЕ)
// ==========================================
Object.assign(boardRoute, {
    "26": { "x": Math.round(497 * SCALE_X), "y": Math.round(157 * SCALE_Y), "type": "normal" },
    "27": { "x": Math.round(483 * SCALE_X), "y": Math.round(131 * SCALE_Y), "type": "normal" },
    "28": { "x": Math.round(472 * SCALE_X), "y": Math.round(108 * SCALE_Y), "type": "gold", "text": "Ярославль\nОснован легендарным князем Ярославом Мудрым, включен в список наследия ЮНЕСКО. Набережная Волги, украшенная ажурными беседками, предлагает идеальную прогулку мимо Спасо-Преображенского монастыря." },
    "29": { "x": Math.round(494 * SCALE_X), "y": Math.round(91 * SCALE_Y), "type": "normal" },
    "30": { "x": Math.round(526 * SCALE_X), "y": Math.round(84 * SCALE_Y), "type": "normal" },
    "31": { "x": Math.round(559 * SCALE_X), "y": Math.round(87 * SCALE_Y), "type": "normal" },
    "32": { "x": Math.round(593 * SCALE_X), "y": Math.round(87 * SCALE_Y), "type": "normal" },
    "33": { "x": Math.round(622 * SCALE_X), "y": Math.round(109 * SCALE_Y), "type": "normal" },
    "34": { "x": Math.round(643 * SCALE_X), "y": Math.round(131 * SCALE_Y), "type": "normal" },
    "35": { "x": Math.round(668 * SCALE_X), "y": Math.round(116 * SCALE_Y), "type": "normal" },
    "36": { "x": Math.round(662 * SCALE_X), "y": Math.round(88 * SCALE_Y), "type": "gold", "text": "Кострома\nРовесница Москвы, основанная Юрием Долгоруким, уникально сохранила веерную планировку центральных улиц. Пожарная каланча на Сусанинской площади — главный символ города." },
    "37": { "x": Math.round(648 * SCALE_X), "y": Math.round(65 * SCALE_Y), "type": "normal" },
    "38": { "x": Math.round(642 * SCALE_X), "y": Math.round(39 * SCALE_Y), "type": "normal" },
    "39": { "x": Math.round(650 * SCALE_X), "y": Math.round(17 * SCALE_Y), "type": "gold", "text": "Иваново\nЗнаменитый «город невест» и «ситцевый край» хранит уникальную промышленную архитектуру. Выделяется «Дом-корабль» дореволюционного конструктивизма." },
    "40": { "x": Math.round(690 * SCALE_X), "y": Math.round(30 * SCALE_Y), "type": "normal" },
    "41": { "x": Math.round(727 * SCALE_X), "y": Math.round(40 * SCALE_Y), "type": "normal" },
    "42": { "x": Math.round(761 * SCALE_X), "y": Math.round(39 * SCALE_Y), "type": "normal" },
    "43": { "x": Math.round(800 * SCALE_X), "y": Math.round(42 * SCALE_Y), "type": "normal" },
    "44": { "x": Math.round(834 * SCALE_X), "y": Math.round(55 * SCALE_Y), "type": "normal" },
    "45": { "x": Math.round(852 * SCALE_X), "y": Math.round(76 * SCALE_Y), "type": "normal" },
    "46": { "x": Math.round(862 * SCALE_X), "y": Math.round(107 * SCALE_Y), "type": "normal" },
    "47": { "x": Math.round(865 * SCALE_X), "y": Math.round(137 * SCALE_Y), "type": "normal" },
    "48": { "x": Math.round(864 * SCALE_X), "y": Math.round(165 * SCALE_Y), "type": "normal" },
    "49": { "x": Math.round(852 * SCALE_X), "y": Math.round(195 * SCALE_Y), "type": "gold", "text": "Суздаль\nЭталон русского градостроительного ансамбля. Город-музей под открытым небом, где запрещено строить высотные здания, чтобы сохранить древний облик Кремля." },
    "50": { "x": Math.round(822 * SCALE_X), "y": Math.round(198 * SCALE_Y), "type": "normal" },
    "51": { "x": Math.round(789 * SCALE_X), "y": Math.round(191 * SCALE_Y), "type": "normal" },
    "52": { "x": Math.round(757 * SCALE_X), "y": Math.round(203 * SCALE_Y), "type": "normal" },
    "53": { "x": Math.round(729 * SCALE_X), "y": Math.round(219 * SCALE_Y), "type": "normal" },
    "54": { "x": Math.round(709 * SCALE_X), "y": Math.round(235 * SCALE_Y), "type": "fork" }
});


// ==========================================
// ЧАСТЬ 3: ПУТЕВОДИТЕЛЬ (ФИНАЛ) И СВЯЗИ
// ==========================================
Object.assign(boardRoute, {
    "56": { "x": Math.round(667 * SCALE_X), "y": Math.round(277 * SCALE_Y), "type": "gold", "text": "Владимир\nДревняя столица Руси, хранит белокаменные шедевры домонгольского зодчества — Успенский собор с фресками Андрея Рублева и Дмитриевский собор. Золотые ворота поражают величием!" },
    "57": { "x": Math.round(643 * SCALE_X), "y": Math.round(294 * SCALE_Y), "type": "normal" },
    "58": { "x": Math.round(619 * SCALE_X), "y": Math.round(315 * SCALE_Y), "type": "normal" },
    "59": { "x": Math.round(598 * SCALE_X), "y": Math.round(337 * SCALE_Y), "type": "normal" },
    "60": { "x": Math.round(590 * SCALE_X), "y": Math.round(363 * SCALE_Y), "type": "normal" },
    "61": { "x": Math.round(586 * SCALE_X), "y": Math.round(400 * SCALE_Y), "type": "gold", "text": "Углич\nХранитель драматических страниц истории, приковывает внимание Кремлем на берегу Волги, где палаты угличских князей до сих пор хранят свои тайны." },
    "62": { "x": Math.round(583 * SCALE_X), "y": Math.round(431 * SCALE_Y), "type": "normal" },
    "63": { "x": Math.round(580 * SCALE_X), "y": Math.round(464 * SCALE_Y), "type": "gold", "text": "Плёс\nВдохновлял великого пейзажиста Исаака Левитана. Пейзажи «Тихая обитель» и «Над вечным покоем» покоряют своими панорамными видами на Волгу." },
    "64": { "x": Math.round(590 * SCALE_X), "y": Math.round(486 * SCALE_Y), "type": "normal" },
    "65": { "x": Math.round(600 * SCALE_X), "y": Math.round(511 * SCALE_Y), "type": "normal" },
    "66": { "x": Math.round(612 * SCALE_X), "y": Math.round(537 * SCALE_Y), "type": "normal" },
    "67": { "x": Math.round(625 * SCALE_X), "y": Math.round(560 * SCALE_Y), "type": "normal" },
    "68": { "x": Math.round(637 * SCALE_X), "y": Math.round(587 * SCALE_Y), "type": "gold", "text": "Юрьев-Польский\nОснован Юрием Долгоруким. Георгиевский собор славится своей удивительной древней каменной резьбой." },
    "69": { "x": Math.round(602 * SCALE_X), "y": Math.round(578 * SCALE_Y), "type": "normal" },
    "70": { "x": Math.round(575 * SCALE_X), "y": Math.round(563 * SCALE_Y), "type": "normal" },
    "71": { "x": Math.round(546 * SCALE_X), "y": Math.round(548 * SCALE_Y), "type": "normal" },
    "72": { "x": Math.round(521 * SCALE_X), "y": Math.round(539 * SCALE_Y), "type": "normal" },
    "73": { "x": Math.round(499 * SCALE_X), "y": Math.round(526 * SCALE_Y), "type": "normal" },
    "74": { "x": Math.round(470 * SCALE_X), "y": Math.round(528 * SCALE_Y), "type": "normal" },
    "75": { "x": Math.round(434 * SCALE_X), "y": Math.round(530 * SCALE_Y), "type": "normal" },
    "76": { "x": Math.round(404 * SCALE_X), "y": Math.round(536 * SCALE_Y), "type": "normal" },
    "77": { "x": Math.round(370 * SCALE_X), "y": Math.round(553 * SCALE_Y), "type": "normal" },
    "78": { "x": Math.round(332 * SCALE_X), "y": Math.round(571 * SCALE_Y), "type": "normal" }, 
    "79": { "x": Math.round(249 * SCALE_X), "y": Math.round(365 * SCALE_Y), "type": "normal" },
    "80": { "x": Math.round(225 * SCALE_X), "y": Math.round(349 * SCALE_Y), "type": "normal" },
    "81": { "x": Math.round(193 * SCALE_X), "y": Math.round(332 * SCALE_Y), "type": "normal" },
    "82": { "x": Math.round(170 * SCALE_X), "y": Math.round(319 * SCALE_Y), "type": "normal" },
    "83": { "x": Math.round(138 * SCALE_X), "y": Math.round(308 * SCALE_Y), "type": "normal" },
    "84": { "x": Math.round(102 * SCALE_X), "y": Math.round(281 * SCALE_Y), "type": "swamp" },
    "85": { "x": Math.round(94 * SCALE_X), "y": Math.round(237 * SCALE_Y), "type": "normal" },
    "86": { "x": Math.round(99 * SCALE_X), "y": Math.round(209 * SCALE_Y), "type": "normal" },
    "87": { "x": Math.round(105 * SCALE_X), "y": Math.round(179 * SCALE_Y), "type": "normal" },
    "88": { "x": Math.round(110 * SCALE_X), "y": Math.round(151 * SCALE_Y), "type": "normal" },
    "89": { "x": Math.round(127 * SCALE_X), "y": Math.round(123 * SCALE_Y), "type": "normal" },
    "90": { "x": Math.round(154 * SCALE_X), "y": Math.round(110 * SCALE_Y), "type": "gold", "text": "Александров\nБывшая опричная столица Ивана Грозного. Здесь вершилась история Российского государства." },
    "91": { "x": Math.round(174 * SCALE_X), "y": Math.round(127 * SCALE_Y), "type": "normal" },
    "92": { "x": Math.round(202 * SCALE_X), "y": Math.round(137 * SCALE_Y), "type": "normal" },
    "93": { "x": Math.round(227 * SCALE_X), "y": Math.round(140 * SCALE_Y), "type": "normal" },
    "94": { "x": Math.round(252 * SCALE_X), "y": Math.round(134 * SCALE_Y), "type": "normal" },
    "95": { "x": Math.round(278 * SCALE_X), "y": Math.round(150 * SCALE_Y), "type": "normal" },
    "96": { "x": Math.round(286 * SCALE_X), "y": Math.round(174 * SCALE_Y), "type": "normal" },
    "97": { "x": Math.round(293 * SCALE_X), "y": Math.round(201 * SCALE_Y), "type": "normal" },
    "98": { "x": Math.round(312 * SCALE_X), "y": Math.round(221 * SCALE_Y), "type": "normal" },
    "99": { "x": Math.round(340 * SCALE_X), "y": Math.round(230 * SCALE_Y), "type": "normal" },
    "100": { "x": Math.round(364 * SCALE_X), "y": Math.round(235 * SCALE_Y), "type": "normal" },
    "101": { "x": Math.round(396 * SCALE_X), "y": Math.round(233 * SCALE_Y), "type": "normal" }, 
    "103": { "x": Math.round(511 * SCALE_X), "y": Math.round(199 * SCALE_Y), "type": "normal" },
    "104": { "x": Math.round(543 * SCALE_X), "y": Math.round(207 * SCALE_Y), "type": "normal" },
    "105": { "x": Math.round(574 * SCALE_X), "y": Math.round(211 * SCALE_Y), "type": "normal" },
    "106": { "x": Math.round(600 * SCALE_X), "y": Math.round(200 * SCALE_Y), "type": "gold", "text": "Муром\nРодина былинного богатыря Ильи Муромца и святых Петра и Февронии." },
    "107": { "x": Math.round(627 * SCALE_X), "y": Math.round(194 * SCALE_Y), "type": "normal" },
    "108": { "x": Math.round(650 * SCALE_X), "y": Math.round(177 * SCALE_Y), "type": "normal" },
    "109": { "x": Math.round(661 * SCALE_X), "y": Math.round(151 * SCALE_Y), "type": "normal" }, 
    "110": { "x": Math.round(687 * SCALE_X), "y": Math.round(255 * SCALE_Y), "type": "fork" }, 
    "111": { "x": Math.round(716 * SCALE_X), "y": Math.round(275 * SCALE_Y), "type": "normal" },
    "112": { "x": Math.round(746 * SCALE_X), "y": Math.round(281 * SCALE_Y), "type": "normal" },
    "113": { "x": Math.round(774 * SCALE_X), "y": Math.round(291 * SCALE_Y), "type": "normal" },
    "114": { "x": Math.round(805 * SCALE_X), "y": Math.round(303 * SCALE_Y), "type": "normal" },
    "115": { "x": Math.round(834 * SCALE_X), "y": Math.round(313 * SCALE_Y), "type": "normal" },
    "116": { "x": Math.round(862 * SCALE_X), "y": Math.round(321 * SCALE_Y), "type": "normal" },
    "117": { "x": Math.round(904 * SCALE_X), "y": Math.round(327 * SCALE_Y), "type": "gold", "text": "Рязань\nДревний рязанский Кремль и старинные улочки. Родина великого русского поэта Сергея Есенина." },
    "118": { "x": Math.round(906 * SCALE_X), "y": Math.round(355 * SCALE_Y), "type": "normal" },
    "119": { "x": Math.round(898 * SCALE_X), "y": Math.round(385 * SCALE_Y), "type": "normal" },
    "120": { "x": Math.round(894 * SCALE_X), "y": Math.round(410 * SCALE_Y), "type": "normal" },
    "121": { "x": Math.round(890 * SCALE_X), "y": Math.round(440 * SCALE_Y), "type": "normal" },
    "122": { "x": Math.round(881 * SCALE_X), "y": Math.round(465 * SCALE_Y), "type": "normal" },
    "123": { "x": Math.round(874 * SCALE_X), "y": Math.round(514 * SCALE_Y), "type": "swamp" },
    "124": { "x": Math.round(814 * SCALE_X), "y": Math.round(527 * SCALE_Y), "type": "normal" },
    "125": { "x": Math.round(774 * SCALE_X), "y": Math.round(518 * SCALE_Y), "type": "normal" },
    "126": { "x": Math.round(742 * SCALE_X), "y": Math.round(500 * SCALE_Y), "type": "normal" },
    "127": { "x": Math.round(708 * SCALE_X), "y": Math.round(485 * SCALE_Y), "type": "normal" },
    "128": { "x": Math.round(670 * SCALE_X), "y": Math.round(483 * SCALE_Y), "type": "normal" },
    "129": { "x": Math.round(630 * SCALE_X), "y": Math.round(481 * SCALE_Y), "type": "normal" }
});

function getNextCellId(currentId, goesFork) {
    let num = Number(currentId);
    if (num === 14) return goesFork ? "79" : "15";
    if (num === 25) return goesFork ? "103" : "26";
    if (num === 54) return "110";
    if (num === 101) return "23";
    if (num === 109) return "34";
    if (num === 110) return goesFork ? "111" : "56";
    if (num === 129) return "64";
    if (num === 78) return null; 
    let nextPossible = (num + 1).toString();
    if (boardRoute[nextPossible]) return nextPossible;
    return null;
}



// ==========================================
// ЧАСТЬ 4: МЕНЮ ПРАВИЛ И ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ==========================================
const gameRulesText = "ПРАВИЛА\nИгры-Путешествия «Золотое кольцо России»\n\n" +
"• Поставьте все фишки игроков на поле «Москва».\n\n" +
"• Бросайте кубик и передвигайте фишки по «шагам»-кружочкам столько, какое число выпало на кубике сверху.\n\n" +
"• В случае попадания фишки на «стрелку», в следующий ход двигайте фишку по указанному направлению.\n\n" +
"• Если фишка оказалась в «болоте», игрок пропускает ход.\n\n" +
"• Если фишка попала на оранжевые «шаги»-кружочки (золотые города), игрок получает дополнительный ход.\n\n" +
"• Обратный ход запрещен.\n\n" +
"• Побеждает тот, кто первым дойдет до обратной стороны «Москвы»!\n\n" +
"Приятной игры!";

function openRulesModal() {
    document.getElementById("rules-modal-text").textContent = gameRulesText;
    document.getElementById("rules-modal").style.display = "block";
}

// Утилита для закрытия окна правил
function closeRulesModal() {
    document.getElementById("rules-modal").style.display = "none";
}

function startGame(totalPlayers, hasBots) {
    if (mapLoadError) {
        console.warn("Map error:", mapLoadError);
    }
    
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-interface").style.display = "flex";
    
    players = [];
    for (let i = 0; i < totalPlayers; i++) {
        let isPlayerABot = false;
        if (hasBots && i !== 0) {
            isPlayerABot = true;
        }
        
        players.push({
            id: i,
            name: isPlayerABot ? "Бот " + i : "Игрок " + (i + 1),
            isBot: isPlayerABot,
            currentCell: "5",
            color: playerColors[i],
            skipNextTurn: false
        });
    }
    
    currentTurn = 0;
    isMoving = false;
    updateUI();
    
    if (mapLoadedSuccessfully) {
        drawGame();
    } else if (mapLoadError) {
        drawGame();
    } else {
        mapImage.addEventListener('load', drawGame, { once: true });
        mapImage.addEventListener('error', drawGame, { once: true });
        setTimeout(drawGame, 2000);
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (mapLoadedSuccessfully && mapImage.complete && mapImage.naturalWidth > 0) {
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#16181c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (mapLoadError) {
            ctx.fillStyle = "#ff5555";
            ctx.font = "16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(mapLoadError, canvas.width / 2, 30);
        }
    }
    
    players.forEach((player, index) => {
        const cell = boardRoute[player.currentCell];
        if (cell) {
            const offsetX = (index % 2 === 0 ? 8 : -8);
            const offsetY = (index > 1 ? 8 : -8);
            
            ctx.beginPath();
            ctx.arc(cell.x + offsetX, cell.y + offsetY, 12, 0, Math.PI * 2);
            ctx.fillStyle = player.color;
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
    });
}

function updateUI() {
    const activePlayer = players[currentTurn];
    const turnIndicator = document.getElementById("turn-indicator");
    const rollButton = document.getElementById("roll-button");
    
    turnIndicator.textContent = "Ходит: " + activePlayer.name;
    turnIndicator.style.color = activePlayer.color;
    
    if (!activePlayer.isBot && !isMoving) {
        rollButton.disabled = false;
        rollButton.style.background = "#50fa7b";
        rollButton.style.color = "#111213";
    } else {
        rollButton.disabled = true;
        rollButton.style.background = "#ff5555";
        rollButton.style.color = "#ffffff";
    }
}


// ==========================================
// ЧАСТЬ 5: БЕЗОПАСНОЕ ДВИЖЕНИЕ И ФИНИШ
// ==========================================
function playerTurn() {
    if (isMoving) return;
    executeTurn();
}

function executeTurn() {
    if (document.getElementById("win-modal").style.display === "block") return;
    
    isMoving = true;
    updateUI(); 
    const activePlayer = players[currentTurn];
    
    if (activePlayer.skipNextTurn) {
        activePlayer.skipNextTurn = false;
        isMoving = false;
        nextTurn();
        return;
    }
    
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const diceFaces = ["🎲", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    document.getElementById("dice-zone").textContent = diceFaces[diceRoll];
    
    moveStepByStep(activePlayer, diceRoll);
}

function moveStepByStep(player, stepsLeft) {
    if (stepsLeft <= 0) {
        checkCellEffect(player);
        return;
    }
    
    const currentCellData = boardRoute[player.currentCell];
    const isExactForkStop = (stepsLeft === 1 && currentCellData && currentCellData.type === "fork");
    const nextCellId = getNextCellId(player.currentCell, isExactForkStop);
    
    if (nextCellId === null) {
        showWinModal(player);
        return;
    }
    
    player.currentCell = nextCellId;
    drawGame();
    
    setTimeout(() => { moveStepByStep(player, stepsLeft - 1); }, 300);
}

function showWinModal(player) {
    isMoving = false;
    const winModal = document.getElementById("win-modal");
    const winnerNameEl = document.getElementById("winner-name");
    
    winnerNameEl.textContent = player.name;
    winnerNameEl.style.background = player.color;
    winnerNameEl.style.color = (player.id === 0 && player.name.indexOf("Бот") === -1) ? "#111213" : "#ffffff";
    
    winModal.style.display = "block";
}

function backToMenu() {
    document.getElementById("win-modal").style.display = "none";
    document.getElementById("game-interface").style.display = "none";
    document.getElementById("start-screen").style.display = "block";
    players = [];
    isMoving = false;
}

function checkCellEffect(player) {
    if (document.getElementById("win-modal").style.display === "block") return;

    const cell = boardRoute[player.currentCell];
    isExtraTurnEarned = false;
    
    if (cell) {
        if (cell.type === "gold") {
            if (!player.isBot) {
                document.getElementById("gold-modal-text").textContent = cell.text;
                document.getElementById("gold-modal").style.display = "block";
                if (cell.text.indexOf("еще один ход") !== -1) { isExtraTurnEarned = true; }
                return;
            } else {
                if (cell.text.indexOf("еще один ход") !== -1) { isExtraTurnEarned = true; }
            }
        }
        if (cell.type === "swamp") { player.skipNextTurn = true; }
    }
    finishCellEffect();
}

function closeGoldModal() {
    document.getElementById("gold-modal").style.display = "none";
    finishCellEffect();
}

function finishCellEffect() {
    if (document.getElementById("win-modal").style.display === "block") return;

    isMoving = false;
    const player = players[currentTurn];
    if (isExtraTurnEarned) {
        updateUI();
        if (player.isBot) { 
            setTimeout(() => { executeTurn(); }, 1000); 
        }
    } else {
        nextTurn();
    }
}

function nextTurn() {
    if (document.getElementById("win-modal").style.display === "block") return;

    currentTurn = (currentTurn + 1) % players.length;
    updateUI();
    if (players[currentTurn].isBot) { 
        setTimeout(() => { executeTurn(); }, 1000); 
    }
}
