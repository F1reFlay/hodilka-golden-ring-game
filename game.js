// ==========================================
// ЧАСТЬ 1: ИНИЦИАЛИЗАЦИЯ И СТАРТ ПУТЕВОДИТЕЛЯ
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Карта загружается напрямую из интернета для стабильной работы на телефонах
const mapImage = new Image();
let mapLoadedSuccessfully = false;
let mapLoadError = null;

// Установка таймаута для загрузки карты (10 секунд)
const mapLoadTimeout = setTimeout(() => {
    if (!mapLoadedSuccessfully) {
        mapLoadError = "Карта долго загружается. Используется режим без карты.";
        console.warn("Map load timeout");
    }
}, 10000);

mapImage.src = "https://i.postimg.cc/6qyTxxhZ/map.jpg";

// Обработка успешной загрузки
mapImage.onload = function() {
    mapLoadedSuccessfully = true;
    mapLoadError = null;
    clearTimeout(mapLoadTimeout);
    console.log("Map loaded successfully");
};

// Обработка ошибки загрузки
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

const boardRoute = {
    "5": { "x": 95, "y": 552, "type": "normal" },
    "6": { "x": 141, "y": 524, "type": "normal" },
    "7": { "x": 158, "y": 507, "type": "normal" },
    "8": { "x": 181, "y": 491, "type": "normal" },
    "9": { "x": 201, "y": 471, "type": "normal" },
    "10": { "x": 221, "y": 459, "type": "normal" },
    "11": { "x": 240, "y": 447, "type": "normal" },
    "12": { "x": 257, "y": 426, "type": "gold", "text": "Сергиев Посад\nЖемчужина Золотого кольца, славится своим духовным сердцем — в[...]
    "13": { "x": 258, "y": 400, "type": "normal" },
    "14": { "x": 272, "y": 380, "type": "fork" },
    "15": { "x": 298, "y": 375, "type": "normal" },
    "16": { "x": 326, "y": 368, "type": "normal" },
    "17": { "x": 354, "y": 361, "type": "normal" },
    "18": { "x": 374, "y": 347, "type": "gold", "text": "Переславль-Залесский\nДревний город, хранит память о рождении великого русско[...]
    "19": { "x": 382, "y": 321, "type": "normal" },
    "20": { "x": 394, "y": 299, "type": "normal" },
    "21": { "x": 402, "y": 275, "type": "normal" },
    "22": { "x": 419, "y": 256, "type": "normal" },
    "23": { "x": 433, "y": 232, "type": "gold", "text": "Ростов Великий\nОдин из ключевых точек Золотого кольца. Славится своим величе�[...]
    "24": { "x": 448, "y": 211, "type": "normal" },
    "25": { "x": 469, "y": 197, "type": "fork" }
};

// ==========================================
// ЧАСТЬ 2: ПУТЕВОДИТЕЛЬ (ПРОДОЛЖЕНИЕ)
// ==========================================
Object.assign(boardRoute, {
    "26": { "x": 497, "y": 157, "type": "normal" },
    "27": { "x": 483, "y": 131, "type": "normal" },
    "28": { "x": 472, "y": 108, "type": "gold", "text": "Ярославль\nОснован легендарным князем Ярославом Мудрым, включен в список Всем[...]
    "29": { "x": 494, "y": 91, "type": "normal" },
    "30": { "x": 526, "y": 84, "type": "normal" },
    "31": { "x": 559, "y": 87, "type": "normal" },
    "32": { "x": 593, "y": 87, "type": "normal" },
    "33": { "x": 622, "y": 109, "type": "normal" },
    "34": { "x": 643, "y": 131, "type": "normal" },
    "35": { "x": 668, "y": 116, "type": "normal" },
    "36": { "x": 662, "y": 88, "type": "gold", "text": "Кострома\nРовесница Москвы, основанная Юрием Долгоруким, уникально сохранила �[...]
    "37": { "x": 648, "y": 65, "type": "normal" },
    "38": { "x": 642, "y": 39, "type": "normal" },
    "39": { "x": 650, "y": 17, "type": "gold", "text": "Иваново\nЗнаменитый «город невест» и «ситцевый край» хранит уникальную промыш[...]
    "40": { "x": 690, "y": 30, "type": "normal" },
    "41": { "x": 727, "y": 40, "type": "normal" },
    "42": { "x": 761, "y": 39, "type": "normal" },
    "43": { "x": 800, "y": 42, "type": "normal" },
    "44": { "x": 834, "y": 55, "type": "normal" },
    "45": { "x": 852, "y": 76, "type": "normal" },
    "46": { "x": 862, "y": 107, "type": "normal" },
    "47": { "x": 865, "y": 137, "type": "normal" },
    "48": { "x": 864, "y": 165, "type": "normal" },
    "49": { "x": 852, "y": 195, "type": "gold", "text": "Суздаль\nЭталон русского градостроительного ансамбля. Город-музей под открыт�[...]
    "50": { "x": 822, "y": 198, "type": "normal" },
    "51": { "x": 789, "y": 191, "type": "normal" },
    "52": { "x": 757, "y": 203, "type": "normal" },
    "53": { "x": 729, "y": 219, "type": "normal" },
    "54": { "x": 709, "y": 235, "type": "fork" }
});
// ==========================================
// ЧАСТЬ 3: ПУТЕВОДИТЕЛЬ (ФИНАЛ) И СВЯЗИ
// ==========================================
Object.assign(boardRoute, {
    "56": { "x": 667, "y": 277, "type": "gold", "text": "Владимир\nДревняя столица Руси, хранит белокаменные шедевры домонгольского з�[...]
    "57": { "x": 643, "y": 294, "type": "normal" },
    "58": { "x": 619, "y": 315, "type": "normal" },
    "59": { "x": 598, "y": 337, "type": "normal" },
    "60": { "x": 590, "y": 363, "type": "normal" },
    "61": { "x": 586, "y": 400, "type": "gold", "text": "Углич\nХранитель драматических страниц истории, приковывает внимание Кремлем[...]
    "62": { "x": 583, "y": 431, "type": "normal" },
    "63": { "x": 580, "y": 464, "type": "gold", "text": "Плёс\nВдохновлял великого пейзажиста Исаака Левитана. Пейзажи «Тихая обитель�[...]
    "64": { "x": 590, "y": 486, "type": "normal" },
    "65": { "x": 600, "y": 511, "type": "normal" },
    "66": { "x": 612, "y": 537, "type": "normal" },
    "67": { "x": 625, "y": 560, "type": "normal" },
    "68": { "x": 637, "y": 587, "type": "gold", "text": "Юрьев-Польский\nОснован Юрием Долгоруким. Георгиевский собор славится своей у[...]
    "69": { "x": 602, "y": 578, "type": "normal" },
    "70": { "x": 575, "y": 563, "type": "normal" },
    "71": { "x": 546, "y": 548, "type": "normal" },
    "72": { "x": 521, "y": 539, "type": "normal" },
    "73": { "x": 499, "y": 526, "type": "normal" },
    "74": { "x": 470, "y": 528, "type": "normal" },
    "75": { "x": 434, "y": 530, "type": "normal" },
    "76": { "x": 404, "y": 536, "type": "normal" },
    "77": { "x": 370, "y": 553, "type": "normal" },
    "78": { "x": 332, "y": 571, "type": "normal" }, 
    "79": { "x": 249, "y": 365, "type": "normal" },
    "80": { "x": 225, "y": 349, "type": "normal" },
    "81": { "x": 193, "y": 332, "type": "normal" },
    "82": { "x": 170, "y": 319, "type": "normal" },
    "83": { "x": 138, "y": 308, "type": "normal" },
    "84": { "x": 102, "y": 281, "type": "swamp" },
    "85": { "x": 94, "y": 237, "type": "normal" },
    "86": { "x": 99, "y": 209, "type": "normal" },
    "87": { "x": 105, "y": 179, "type": "normal" },
    "88": { "x": 110, "y": 151, "type": "normal" },
    "89": { "x": 127, "y": 123, "type": "normal" },
    "90": { "x": 154, "y": 110, "type": "gold", "text": "Александров\nБывшая опричная столица Ивана Грозного. Здесь вершилась история [...]
    "91": { "x": 174, "y": 127, "type": "normal" },
    "92": { "x": 202, "y": 137, "type": "normal" },
    "93": { "x": 227, "y": 140, "type": "normal" },
    "94": { "x": 252, "y": 134, "type": "normal" },
    "95": { "x": 278, "y": 150, "type": "normal" },
    "96": { "x": 286, "y": 174, "type": "normal" },
    "97": { "x": 293, "y": 201, "type": "normal" },
    "98": { "x": 312, "y": 221, "type": "normal" },
    "99": { "x": 340, "y": 230, "type": "normal" },
    "100": { "x": 364, "y": 235, "type": "normal" },
    "101": { "x": 396, "y": 233, "type": "normal" }, 
    "103": { "x": 511, "y": 199, "type": "normal" },
    "104": { "x": 543, "y": 207, "type": "normal" },
    "105": { "x": 574, "y": 211, "type": "normal" },
    "106": { "x": 600, "y": 200, "type": "gold", "text": "Муром\nРодина былинного богатыря Ильи Муромца и святых Петра и Февронии." },
    "107": { "x": 627, "y": 194, "type": "normal" },
    "108": { "x": 650, "y": 177, "type": "normal" },
    "109": { "x": 661, "y": 151, "type": "normal" }, 
    "110": { "x": 687, "y": 255, "type": "fork" }, 
    "111": { "x": 716, "y": 275, "type": "normal" },
    "112": { "x": 746, "y": 281, "type": "normal" },
    "113": { "x": 774, "y": 291, "type": "normal" },
    "114": { "x": 805, "y": 303, "type": "normal" },
    "115": { "x": 834, "y": 313, "type": "normal" },
    "116": { "x": 862, "y": 321, "type": "normal" },
    "117": { "x": 904, "y": 327, "type": "gold", "text": "Рязань\nДревний рязанский Кремль и старинные улочки. Родина великого русског�[...]
    "118": { "x": 906, "y": 355, "type": "normal" },
    "119": { "x": 898, "y": 385, "type": "normal" },
    "120": { "x": 894, "y": 410, "type": "normal" },
    "121": { "x": 890, "y": 440, "type": "normal" },
    "122": { "x": 881, "y": 465, "type": "normal" },
    "123": { "x": 874, "y": 514, "type": "swamp" },
    "124": { "x": 814, "y": 527, "type": "normal" },
    "125": { "x": 774, "y": 518, "type": "normal" },
    "126": { "x": 742, "y": 500, "type": "normal" },
    "127": { "x": 708, "y": 485, "type": "normal" },
    "128": { "x": 670, "y": 483, "type": "normal" },
    "129": { "x": 630, "y": 481, "type": "normal" }
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
// ЧАСТЬ 4: СТАРТ И ОБНОВЛЕННЫЙ ЦВЕТ КНОПКИ
// ==========================================
function startGame(totalPlayers) {
    // Показываем ошибку загрузки карты, если она есть
    if (mapLoadError) {
        console.warn("Map error:", mapLoadError);
        // Игра всё равно работает, просто без фонового изображения
    }
    
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-interface").style.display = "flex";
    
    players = [];
    for (let i = 0; i < totalPlayers; i++) {
        players.push({
            id: i,
            name: i === 0 ? "Вы" : "Бот " + i,
            isBot: i !== 0,
            currentCell: "5",
            color: playerColors[i],
            skipNextTurn: false
        });
    }
    
    currentTurn = 0;
    isMoving = false;
    updateUI();
    
    // Улучшенная логика загрузки карты с обработкой ошибок
    if (mapLoadedSuccessfully) {
        // Карта уже загружена
        drawGame();
    } else if (mapLoadError) {
        // Карта не загрузилась, но игра продолжается без неё
        console.warn("Playing without map background:", mapLoadError);
        drawGame();
    } else {
        // Карта ещё загружается
        mapImage.addEventListener('load', drawGame, { once: true });
        mapImage.addEventListener('error', drawGame, { once: true });
        
        // Fallback: рисуем через 2 секунды в любом случае
        setTimeout(drawGame, 2000);
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем фоновое изображение только если оно успешно загрузилось
    if (mapLoadedSuccessfully && mapImage.complete && mapImage.naturalWidth > 0) {
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback: рисуем чёрный фон с сообщением
        ctx.fillStyle = "#16181c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (mapLoadError) {
            ctx.fillStyle = "#ff5555";
            ctx.font = "16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(mapLoadError, canvas.width / 2, 30);
        }
    }
    
    // Рисуем фишки игроков
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
        rollButton.style.color = "#111213"; // Темный текст на зеленом
    } else {
        rollButton.disabled = true;
        rollButton.style.background = "#ff5555";
        rollButton.style.color = "#ffffff"; // Четкий белый текст на красном!
    }
}

// ==========================================
// ЧАСТЬ 5: ДВИЖЕНИЕ И БЕСШОВНОЕ МЕНЮ СЛЕВА
// ==========================================
function playerTurn() {
    if (isMoving) return;
    executeTurn();
}

function executeTurn() {
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
        // Запускаем кастомное окно победы без alert()
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
    winnerNameEl.style.background = player.color; // Окрашиваем кнопку в цвет игрока
    
    // Если выиграл игрок, цвет текста темный для читаемости, если бот — белый
    winnerNameEl.style.color = (player.id === 0) ? "#111213" : "#ffffff";
    
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
    currentTurn = (currentTurn + 1) % players.length;
    updateUI();
    if (players[currentTurn].isBot) { setTimeout(executeTurn, 1000); }
}
