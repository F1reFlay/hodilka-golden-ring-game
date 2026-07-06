// ==========================================
// ГЕЙМ ЧАСТЬ 1: ИНИЦИАЛИЗАЦИЯ И СТАРТ КАРТЫ
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

mapImage.onload = function() {
    mapLoadedSuccessfully = true;
    mapLoadError = null;
    clearTimeout(mapLoadTimeout);
    console.log("Map loaded successfully");
    if (players.length > 0) drawGame();
};

mapImage.onerror = function() {
    mapLoadError = "Не удалось загрузить карту. Проверьте подключение к интернету.";
    clearTimeout(mapLoadTimeout);
    console.error("Failed to load map image");
    if (players.length > 0) drawGame();
};

mapImage.src = "map.jpg";

if (mapImage.complete && mapImage.naturalWidth > 0) {
    mapLoadedSuccessfully = true;
}

let players = [];
let currentTurn = 0;
let isMoving = false;
let isExtraTurnEarned = false;

const playerColors = ["#a482ff", "#50fa7b", "#ffb86c", "#8be9fd"];

const boardRoute = {
    "5": { "x": 81, "y": 469, "type": "normal" },
    "6": { "x": 120, "y": 445, "type": "normal" },
    "7": { "x": 134, "y": 431, "type": "normal" },
    "8": { "x": 154, "y": 417, "type": "normal" },
    "9": { "x": 171, "y": 400, "type": "normal" },
    "10": { "x": 188, "y": 390, "type": "normal" },
    "11": { "x": 204, "y": 380, "type": "normal" },
    "12": { "x": 218, "y": 362, "type": "gold", "isBonus": true, "text": "Сергиев Посад\nЖемчужина Золотого кольца, славится своим духовным сердцем — величественной Троице-Сергиевой лаврой. Духовный подъем дает вам право сделать еще один ход!" },
    "13": { "x": 219, "y": 340, "type": "normal" },
    "14": { "x": 231, "y": 323, "type": "fork" },
    "15": { "x": 253, "y": 319, "type": "normal" },
    "16": { "x": 277, "y": 313, "type": "normal" },
    "17": { "x": 301, "y": 307, "type": "normal" },
    "18": { "x": 318, "y": 295, "type": "gold", "isBonus": true, "text": "Переславль-Залесский\nДревний город, хранит память о рождении Александра Невского. На берегу Плещеева озера хранится ботик Петра I! Вы получаете дополнительный ход." },
    "19": { "x": 325, "y": 273, "type": "normal" },
    "20": { "x": 335, "y": 254, "type": "normal" },
    "21": { "x": 342, "y": 234, "type": "normal" },
    "22": { "x": 356, "y": 218, "type": "normal" },
    "23": { "x": 368, "y": 197, "type": "gold", "isBonus": true, "text": "Ростов Великий\nСлавится своим величественным Кремлем с уникальными звонами белокаменных стен. Погрузиться в историю поможет посещение музеев финифти. Вы получаете дополнительный ход." },
    "24": { "x": 381, "y": 179, "type": "normal" },
    "25": { "x": 399, "y": 167, "type": "fork" }
};

// ==========================================
// ГЕЙМ ЧАСТЬ 2: СЕРЕДИНА КАРТЫ (КЛЕТКИ 26-54)
// ==========================================
Object.assign(boardRoute, {
    "26": { "x": 422, "y": 133, "type": "normal" },
    "27": { "x": 411, "y": 111, "type": "normal" },
    "28": { "x": 401, "y": 92, "type": "gold", "isBonus": true, "text": "Ярославль\nОснован легендарным князем Ярославом Мудрым, включен в список Всемирного наследия ЮНЕСКО. Волжская набережная предлагает идеальную прогулку и дополнительный ход!" },
    "29": { "x": 420, "y": 77, "type": "normal" },
    "30": { "x": 447, "y": 71, "type": "normal" },
    "31": { "x": 475, "y": 74, "type": "normal" },
    "32": { "x": 504, "y": 74, "type": "normal" },
    "33": { "x": 529, "y": 93, "type": "normal" },
    "34": { "x": 547, "y": 111, "type": "normal" },
    "35": { "x": 568, "y": 99, "type": "normal" },
    "36": { "x": 563, "y": 75, "type": "gold", "isBonus": true, "text": "Кострома\nРовесница Москвы, основанная Юрием Долгоруким, уникально сохранила веерную планировку центральных улиц. Сделайте еще один ход!" },
    "37": { "x": 551, "y": 55, "type": "normal" },
    "38": { "x": 546, "y": 33, "type": "normal" },
    "39": { "x": 553, "y": 14, "type": "gold", "isBonus": true, "text": "Иваново\nЗнаменитый «город невест» и «ситцевый край» хранит уникальную промышленную архитектуру конструктивизма. Вы получаете дополнительный ход." },
    "40": { "x": 587, "y": 26, "type": "normal" },
    "41": { "x": 618, "y": 34, "type": "normal" },
    "42": { "x": 647, "y": 33, "type": "normal" },
    "43": { "x": 680, "y": 36, "type": "normal" },
    "44": { "x": 709, "y": 47, "type": "normal" },
    "45": { "x": 724, "y": 65, "type": "normal" },
    "46": { "x": 733, "y": 91, "type": "normal" },
    "47": { "x": 735, "y": 116, "type": "normal" },
    "48": { "x": 734, "y": 140, "type": "normal" },
    "49": { "x": 724, "y": 166, "type": "gold", "isBonus": true, "text": "Суздаль\nЭталон русского градостроительного ансамбля. Город-музей под открытым небом, сохраняющий древний облик Кремля. Получите дополнительный ход!" },
    "50": { "x": 699, "y": 168, "type": "normal" },
    "51": { "x": 671, "y": 162, "type": "normal" },
    "52": { "x": 643, "y": 173, "type": "normal" },
    "53": { "x": 620, "y": 186, "type": "normal" },
    "54": { "x": 603, "y": 200, "type": "fork" }
});


// ==========================================
// ГЕЙМ ЧАСТЬ 3: ОСТАВШИЕСЯ КЛЕТКИ И СВЯЗИ
// ==========================================
Object.assign(boardRoute, {
    "56": { "x": 567, "y": 235, "type": "gold", "isBonus": true, "text": "Владимир\nДревняя столица Северо-Восточной Руси, основанная в X веке, хранит белокаменные шедевры домонгольского зодчества — Золотые ворота и Успенский собор. Сделайте дополнительный ход!" },
    "57": { "x": 547, "y": 250, "type": "normal" },
    "58": { "x": 526, "y": 268, "type": "normal" },
    "59": { "x": 508, "y": 286, "type": "normal" },
    "60": { "x": 502, "y": 309, "type": "normal" },
    "61": { "x": 498, "y": 340, "type": "gold", "isBonus": true, "text": "Углич\nХранитель драматических страниц истории, приковывает внимание Кремлем на берегу великой реки Волги. Вам начислен дополнительный ход." },
    "62": { "x": 496, "y": 366, "type": "normal" },
    "63": { "x": 493, "y": 394, "type": "gold", "isBonus": true, "text": "Плёс\nМаленький живописный город, пейзажи которого вдохновляли великого русского художника Исаака Левитана. Сделайте еще один ход!" },
    "64": { "x": 502, "y": 413, "type": "normal" },
    "65": { "x": 510, "y": 434, "type": "normal" },
    "66": { "x": 520, "y": 456, "type": "normal" },
    "67": { "x": 531, "y": 476, "type": "normal" },
    "68": { "x": 541, "y": 499, "type": "gold", "isBonus": true, "text": "Юрьев-Польский\nОснован Юрием Долгоруким. Георгиевский собор знаменит своей удивительной древней каменной резьбой. Бонусный ход ваш!" },
    "69": { "x": 512, "y": 491, "type": "normal" },
    "70": { "x": 489, "y": 479, "type": "normal" },
    "71": { "x": 464, "y": 466, "type": "normal" },
    "72": { "x": 443, "y": 458, "type": "normal" },
    "73": { "x": 424, "y": 447, "type": "normal" },
    "74": { "x": 400, "y": 449, "type": "normal" },
    "75": { "x": 369, "y": 451, "type": "normal" },
    "76": { "x": 343, "y": 456, "type": "normal" },
    "77": { "x": 315, "y": 470, "type": "normal" },
    "78": { "x": 282, "y": 485, "type": "normal" }, 
    "79": { "x": 212, "y": 310, "type": "normal" },
    "80": { "x": 191, "y": 297, "type": "normal" },
    "81": { "x": 164, "y": 282, "type": "normal" },
    "82": { "x": 145, "y": 271, "type": "normal" },
    "83": { "x": 117, "y": 262, "type": "normal" },
    "84": { "x": 87, "y": 239, "type": "swamp" },
    "85": { "x": 80, "y": 201, "type": "normal" },
    "86": { "x": 84, "y": 178, "type": "normal" },
    "87": { "x": 89, "y": 152, "type": "normal" },
    "88": { "x": 94, "y": 128, "type": "normal" },
    "89": { "x": 108, "y": 105, "type": "normal" },
    "90": { "x": 131, "y": 94, "type": "gold", "isBonus": true, "text": "Александров\nБывшая опричная столица Ивана Грозного. Здесь вершилась история Российского государства. Сделайте еще один ход!" },
    "91": { "x": 148, "y": 108, "type": "normal" },
    "92": { "x": 172, "y": 116, "type": "normal" },
    "93": { "x": 193, "y": 119, "type": "normal" },
    "94": { "x": 214, "y": 114, "type": "normal" },
    "95": { "x": 236, "y": 128, "type": "normal" },
    "96": { "x": 243, "y": 148, "type": "normal" },
    "97": { "x": 249, "y": 171, "type": "normal" },
    "98": { "x": 265, "y": 188, "type": "normal" },
    "99": { "x": 289, "y": 196, "type": "normal" },
    "100": { "x": 309, "y": 200, "type": "normal" },
    "101": { "x": 337, "y": 198, "type": "normal" }, 
    "103": { "x": 434, "y": 169, "type": "normal" },
    "104": { "x": 462, "y": 176, "type": "normal" },
    "105": { "x": 488, "y": 179, "type": "normal" },
    "106": { "x": 510, "y": 170, "type": "gold", "isBonus": true, "text": "Муром\nРодина былинного богатыря Ильи Муромца и святых Петра и Февронии. Сделайте дополнительный ход!" },
    "107": { "x": 533, "y": 165, "type": "normal" },
    "108": { "x": 553, "y": 150, "type": "normal" },
    "109": { "x": 562, "y": 128, "type": "normal" }, 
    "110": { "x": 584, "y": 217, "type": "fork" }, 
    "111": { "x": 609, "y": 234, "type": "normal" },
    "112": { "x": 634, "y": 239, "type": "normal" },
    "113": { "x": 658, "y": 247, "type": "normal" },
    "114": { "x": 684, "y": 258, "type": "normal" },
    "115": { "x": 709, "y": 266, "type": "normal" },
    "116": { "x": 733, "y": 273, "type": "normal" },
    "117": { "x": 768, "y": 278, "type": "gold", "isBonus": true, "text": "Рязань\nДревний рязанский Кремль и старинные улочки. Родина великого русского поэта Сергея Есенина. Вы получаете дополнительный ход." },
    "118": { "x": 770, "y": 302, "type": "normal" },
    "119": { "x": 763, "y": 327, "type": "normal" },
    "120": { "x": 760, "y": 349, "type": "normal" },
    "121": { "x": 757, "y": 374, "type": "normal" },
    "122": { "x": 749, "y": 395, "type": "normal" },
    "123": { "x": 743, "y": 437, "type": "swamp" },
    "124": { "x": 692, "y": 448, "type": "normal" },
    "125": { "x": 658, "y": 440, "type": "normal" },
    "126": { "x": 631, "y": 425, "type": "normal" },
    "127": { "x": 602, "y": 412, "type": "normal" },
    "128": { "x": 570, "y": 411, "type": "normal" },
    "129": { "x": 536, "y": 409, "type": "normal" }
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
// ГЕЙМ ЧАСТЬ 4: ПРАВИЛА И ЗАПУСК РЕЖИМОВ
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

function closeRulesModal() {
    document.getElementById("rules-modal").style.display = "none";
}

function startGame(totalPlayers, hasBots) {
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
            skipNextTurn: false,
            isJustGotBonus: false
        });
    }
    
    currentTurn = 0;
    isMoving = false;
    updateUI();
    drawGame();
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (mapLoadedSuccessfully && mapImage.complete && mapImage.naturalWidth > 0) {
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#16181c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        mapImage.addEventListener('load', () => {
            if (players.length > 0) drawGame();
        }, { once: true });
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

    const listContainer = document.getElementById("bookmark-players-list");
    if (listContainer) {
        listContainer.innerHTML = "";
        players.forEach(p => {
            const row = document.createElement("div");
            row.className = "player-status-row";
            
            let badgeHTML = '<span class="badge-state badge-normal">—</span>';
            if (p.skipNextTurn) {
                badgeHTML = '<span class="badge-state badge-swamp">В болоте</span>';
            } else if (p.isJustGotBonus) {
                badgeHTML = '<span class="badge-state badge-gold">Доп. ход</span>';
            }
            
            row.innerHTML = `
                <div class="status-name-box">
                    <span class="status-color-dot" style="background: ${p.color}"></span>
                    <span style="font-weight: ${p.id === currentTurn ? 'bold' : 'normal'}">${p.name}</span>
                </div>
                ${badgeHTML}
            `;
            listContainer.appendChild(row);
        });
    }
}

// ==========================================
// ГЕЙМ ЧАСТЬ 5: 3D АНИМАЦИЯ И ОЧЕРЕДЬ ХОДОВ
// ==========================================
function playerTurn() {
    if (isMoving) return;
    executeTurn();
}

function executeTurn() {
    if (document.getElementById("win-modal").style.display === "block") return;
    
    isMoving = true;
    players[currentTurn].isJustGotBonus = false;
    updateUI(); 
    const activePlayer = players[currentTurn];
    
    if (activePlayer.skipNextTurn) {
        activePlayer.skipNextTurn = false;
        isMoving = false;
        nextTurn();
        return;
    }
    
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const videoEl = document.getElementById("dice-video");
    
    if (videoEl) {
        // ИСПРАВЛЕНО: Загружаем твои новые легкие 3D WebM ролики
        videoEl.src = "cubic_" + diceRoll + ".webm";
        videoEl.load();
        
        videoEl.play().catch(err => {
            console.warn("Видео заблокировано браузером, шагаем сразу:", err);
            moveStepByStep(activePlayer, diceRoll);
        });
        
        // Ждем окончания ролика в 60 FPS перед тем, как фишка пойдет
        videoEl.onended = function() {
            moveStepByStep(activePlayer, diceRoll);
        };
    } else {
        moveStepByStep(activePlayer, diceRoll);
    }
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
    
    const videoEl = document.getElementById("dice-video");
    if (videoEl) videoEl.src = "";
    
    players = [];
    isMoving = false;
}

function checkCellEffect(player) {
    if (document.getElementById("win-modal").style.display === "block") return;

    const cell = boardRoute[player.currentCell];
    isExtraTurnEarned = false;
    
    if (cell) {
        if (cell.type === "gold" || cell.isBonus) {
            player.isJustGotBonus = true;
            isExtraTurnEarned = true;
            
            if (!player.isBot) {
                document.getElementById("gold-modal-text").textContent = cell.text;
                document.getElementById("gold-modal").style.display = "block";
                updateUI();
                return;
            }
        }
        if (cell.type === "swamp") { 
            player.skipNextTurn = true; 
        }
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
        if (player.isBot) { setTimeout(executeTurn, 1000); }
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

