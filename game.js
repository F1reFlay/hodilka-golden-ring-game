// ==========================================
// ГЕЙМ ЧАСТЬ 1: ЗВУКИ, ПЕРЕМЕННЫЕ И МАРШРУТ
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Новые звуковые эффекты для школьного проекта
const soundStep = new Audio("step.mp3");
const soundGold = new Audio("gold.mp3");
const soundWin = new Audio("win.mp3");

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
    "5": { "x": 81, "y": 469, "type": "normal", "city": "Сергиев Посад" },
    "6": { "x": 120, "y": 445, "type": "normal", "city": "Сергиев Посад" },
    "7": { "x": 134, "y": 431, "type": "normal", "city": "Сергиев Посад" },
    "8": { "x": 154, "y": 417, "type": "normal", "city": "Сергиев Посад" },
    "9": { "x": 171, "y": 400, "type": "normal", "city": "Сергиев Посад" },
    "10": { "x": 188, "y": 390, "type": "normal", "city": "Сергиев Посад" },
    "11": { "x": 204, "y": 380, "type": "normal", "city": "Сергиев Посад" },
    "12": { "x": 218, "y": 362, "type": "gold", "isBonus": true, "city": "Сергиев Посад", "text": "Сергиев Посад\nЖемчужина Золотого кольца, славится своим духовным сердцем — величественной Троице-Сергиевой лаврой. Духовный подъем дает вам право сделать еще один ход!" },
    "13": { "x": 219, "y": 340, "type": "normal", "city": "Переславль-Залесский" },
    "14": { "x": 231, "y": 323, "type": "fork", "city": "Переславль-Залесский" },
    "15": { "x": 253, "y": 319, "type": "normal", "city": "Переславль-Залесский" },
    "16": { "x": 277, "y": 313, "type": "normal", "city": "Переславль-Залесский" },
    "17": { "x": 301, "y": 307, "type": "normal" , "city": "Переславль-Залесский"},
    "18": { "x": 318, "y": 295, "type": "gold", "isBonus": true, "city": "Переславль-Залесский", "text": "Переславль-Залесский\nДревний город, хранит память о рождении Александра Невского. На берегу Плещеева озера хранится ботик Петра I! Вы получаете дополнительный ход." },
    "19": { "x": 325, "y": 273, "type": "normal", "city": "Ростов Великий" },
    "20": { "x": 335, "y": 254, "type": "normal", "city": "Ростов Великий" },
    "21": { "x": 342, "y": 234, "type": "normal", "city": "Ростов Великий" },
    "22": { "x": 356, "y": 218, "type": "normal", "city": "Ростов Великий" },
    "23": { "x": 368, "y": 197, "type": "gold", "isBonus": true, "city": "Ростов Великий", "text": "Ростов Великий\nСлавится своим величественным Кремлем с уникальными звонами белокаменных стен. Погрузиться в историю поможет посещение музеев финифти. Вы получаете дополнительный ход." },
    "24": { "x": 381, "y": 179, "type": "normal", "city": "Ярославль" },
    "25": { "x": 399, "y": 167, "type": "fork", "city": "Ярославль" }
};

// ==========================================
// ГЕЙМ ЧАСТЬ 2: СЕРЕДИНА КАРТЫ (КЛЕТКИ 26-54)
// ==========================================
Object.assign(boardRoute, {
    "26": { "x": 422, "y": 133, "type": "normal", "city": "Ярославль" },
    "27": { "x": 411, "y": 111, "type": "normal", "city": "Ярославль" },
    "28": { "x": 401, "y": 92, "type": "gold", "isBonus": true, "city": "Ярославль", "text": "Ярославль\nОснован легендарным князем Ярославом Мудрым, включен в список Всемирного наследия ЮНЕСКО. Волжская набережная предлагает идеальную прогулку и дополнительный ход!" },
    "29": { "x": 420, "y": 77, "type": "normal", "city": "Кострома" },
    "30": { "x": 447, "y": 71, "type": "normal", "city": "Кострома" },
    "31": { "x": 475, "y": 74, "type": "normal", "city": "Кострома" },
    "32": { "x": 504, "y": 74, "type": "normal", "city": "Кострома" },
    "33": { "x": 529, "y": 93, "type": "normal", "city": "Кострома" },
    "34": { "x": 547, "y": 111, "type": "normal", "city": "Кострома" },
    "35": { "x": 568, "y": 99, "type": "normal", "city": "Кострома" },
    "36": { "x": 563, "y": 75, "type": "gold", "isBonus": true, "city": "Кострома", "text": "Кострома\nРовесница Москвы, основанная Юрием Долгоруким, уникально сохранила веерную планировку центральных улиц. Сделайте еще один ход!" },
    "37": { "x": 551, "y": 55, "type": "normal", "city": "Иваново" },
    "38": { "x": 546, "y": 33, "type": "normal", "city": "Иваново" },
    "39": { "x": 553, "y": 14, "type": "gold", "isBonus": true, "city": "Иваново", "text": "Иваново\nЗнаменитый «город невест» и «ситцевый край» хранит уникальную промышленную архитектуру конструктивизма. Вы получаете дополнительный ход." },
    "40": { "x": 587, "y": 26, "type": "normal", "city": "Суздаль" },
    "41": { "x": 618, "y": 34, "type": "normal", "city": "Суздаль" },
    "42": { "x": 647, "y": 33, "type": "normal", "city": "Суздаль" },
    "43": { "x": 680, "y": 36, "type": "normal", "city": "Суздаль" },
    "44": { "x": 709, "y": 47, "type": "normal", "city": "Суздаль" },
    "45": { "x": 724, "y": 65, "type": "normal", "city": "Суздаль" },
    "46": { "x": 733, "y": 91, "type": "normal", "city": "Суздаль" },
    "47": { "x": 735, "y": 116, "type": "normal", "city": "Суздаль" },
    "48": { "x": 734, "y": 140, "type": "normal", "city": "Суздаль" },
    "49": { "x": 724, "y": 166, "type": "gold", "isBonus": true, "city": "Суздаль", "text": "Суздаль\nЭталон русского градостроительного ансамбля. Город-музей под открытым небом, сохраняющий древний облик Кремля. Получите дополнительный ход!" },
    "50": { "x": 699, "y": 168, "type": "normal", "city": "Владимир" },
    "51": { "x": 671, "y": 162, "type": "normal" , "city": "Владимир"},
    "52": { "x": 643, "y": 173, "type": "normal", "city": "Владимир" },
    "53": { "x": 620, "y": 186, "type": "normal", "city": "Владимир" },
    "54": { "x": 603, "y": 200, "type": "fork", "city": "Владимир" }
});


// ==========================================
// ГЕЙМ ЧАСТЬ 3: ФИНАЛ КАРТЫ, СВЯЗИ И БАЗА ВОПРОСОВ
// ==========================================
Object.assign(boardRoute, {
    "56": { "x": 567, "y": 235, "type": "gold", "isBonus": true, "city": "Владимир", "text": "Владимир\nДревняя столица Северо-Восточной Руси, основанная в X века, хранит белокаменные шедевры домонгольского зодчества — Золотые ворота и Успенский собор. Сделайте дополнительный ход!" },
    "57": { "x": 547, "y": 250, "type": "normal", "city": "Владимир" },
    "58": { "x": 526, "y": 268, "type": "normal", "city": "Владимир" },
    "59": { "x": 508, "y": 286, "type": "normal", "city": "Владимир" },
    "60": { "x": 502, "y": 309, "type": "normal", "city": "Владимир" },
    "61": { "x": 498, "y": 340, "type": "gold", "isBonus": true, "city": "Владимир", "text": "Углич\nХранитель драматических страниц истории, приковывает внимание Кремлем на берегу великой реки Волги. Вам начислен дополнительный ход." },
    "62": { "x": 496, "y": 366, "type": "normal", "city": "Владимир" },
    "63": { "x": 493, "y": 394, "type": "gold", "isBonus": true, "city": "Владимир", "text": "Плёс\nМаленький живописный город, пейзажи которого вдохновляли великого русского художника Исаака Левитана. Сделайте еще один ход!" },
    "64": { "x": 502, "y": 413, "type": "normal", "city": "Владимир" },
    "65": { "x": 510, "y": 434, "type": "normal", "city": "Владимир" },
    "66": { "x": 520, "y": 456, "type": "normal", "city": "Владимир" },
    "67": { "x": 531, "y": 476, "type": "normal", "city": "Владимир" },
    "68": { "x": 541, "y": 499, "type": "gold", "isBonus": true, "city": "Владимир", "text": "Юрьев-Польский\nОснован Юрием Долгоруким. Георгиевский собор знаменит своей удивительной древней каменной резьбой. Бонусный ход ваш!" },
    "69": { "x": 512, "y": 491, "type": "normal", "city": "Сергиев Посад" },
    "70": { "x": 489, "y": 479, "type": "normal", "city": "Сергиев Посад" },
    "71": { "x": 464, "y": 466, "type": "normal", "city": "Сергиев Посад" },
    "72": { "x": 443, "y": 458, "type": "normal", "city": "Сергиев Посад" },
    "73": { "x": 424, "y": 447, "type": "normal", "city": "Сергиев Посад" },
    "74": { "x": 400, "y": 449, "type": "normal", "city": "Сергиев Посад" },
    "75": { "x": 369, "y": 451, "type": "normal", "city": "Сергиев Посад" },
    "76": { "x": 343, "y": 456, "type": "normal", "city": "Сергиев Посад" },
    "77": { "x": 315, "y": 470, "type": "normal", "city": "Сергиев Посад" },
    "78": { "x": 282, "y": 485, "type": "normal", "city": "Сергиев Посад" }, 
    "79": { "x": 212, "y": 310, "type": "normal", "city": "Переславль-Залесский" },
    "80": { "x": 191, "y": 297, "type": "normal", "city": "Переславль-Залесский" },
    "81": { "x": 164, "y": 282, "type": "normal", "city": "Переславль-Залесский" },
    "82": { "x": 145, "y": 271, "type": "normal", "city": "Переславль-Залесский" },
    "83": { "x": 117, "y": 262, "type": "normal", "city": "Переславль-Залесский" },
    "84": { "x": 87, "y": 239, "type": "swamp", "city": "Переславль-Залесский" },
    "85": { "x": 80, "y": 201, "type": "normal", "city": "Переславль-Залесский" },
    "86": { "x": 84, "y": 178, "type": "normal", "city": "Переславль-Залесский" },
    "87": { "x": 89, "y": 152, "type": "normal", "city": "Переславль-Залесский" },
    "88": { "x": 94, "y": 128, "type": "normal", "city": "Переславль-Залесский" },
    "89": { "x": 108, "y": 105, "type": "normal", "city": "Переславль-Залесский" },
    "90": { "x": 131, "y": 94, "type": "gold", "isBonus": true, "city": "Переславль-Залесский", "text": "Александров\nБывшая опричная столица Ивана Грозного. Здесь вершилась история Российского государства. Сделайте еще один ход!" },
    "91": { "x": 148, "y": 108, "type": "normal", "city": "Переславль-Залесский" },
    "92": { "x": 172, "y": 116, "type": "normal", "city": "Переславль-Залесский" },
    "93": { "x": 193, "y": 119, "type": "normal", "city": "Переславль-Залесский" },
    "94": { "x": 214, "y": 114, "type": "normal", "city": "Переславль-Залесский" },
    "95": { "x": 236, "y": 128, "type": "normal", "city": "Переславль-Залесский" },
    "96": { "x": 243, "y": 148, "type": "normal", "city": "Переславль-Залесский" },
    "97": { "x": 249, "y": 171, "type": "normal", "city": "Переславль-Залесский" },
    "98": { "x": 265, "y": 188, "type": "normal", "city": "Переславль-Залесский" },
    "99": { "x": 289, "y": 196, "type": "normal", "city": "Переславль-Залесский" },
    "100": { "x": 309, "y": 200, "type": "normal", "city": "Переславль-Залесский" },
    "101": { "x": 337, "y": 198, "type": "normal", "city": "Переславль-Залесский" }, 
    "103": { "x": 434, "y": 169, "type": "normal", "city": "Ростов Великий" },
    "104": { "x": 462, "y": 176, "type": "normal", "city": "Ростов Великий" },
    "105": { "x": 488, "y": 179, "type": "normal", "city": "Ростов Великий" },
    "106": { "x": 510, "y": 170, "type": "gold", "isBonus": true, "city": "Ростов Великий", "text": "Муром\nРодина былинного богатыря Ильи Муромца и святых Петра и Февронии. Сделайте дополнительный ход!" },
    "107": { "x": 533, "y": 165, "type": "normal", "city": "Ростов Великий" },
    "108": { "x": 553, "y": 150, "type": "normal", "city": "Ростов Великий" },
    "109": { "x": 562, "y": 128, "type": "normal", "city": "Ростов Великий" }, 
    "110": { "x": 584, "y": 217, "type": "fork", "city": "Суздаль" }, 
    "111": { "x": 609, "y": 234, "type": "normal", "city": "Суздаль" },
    "112": { "x": 634, "y": 239, "type": "normal", "city": "Суздаль" },
    "113": { "x": 658, "y": 247, "type": "normal", "city": "Суздаль" },
    "114": { "x": 684, "y": 258, "type": "normal", "city": "Суздаль" },
    "115": { "x": 709, "y": 266, "type": "normal", "city": "Суздаль" },
    "116": { "x": 733, "y": 273, "type": "normal", "city": "Суздаль" },
    "117": { "x": 768, "y": 278, "type": "gold", "isBonus": true, "city": "Суздаль", "text": "Рязань\nДревний рязанский Кремль и старинные улочки. Родина великого русского поэта Сергея Есенина. Вы получаете дополнительный ход." },
    "118": { "x": 770, "y": 302, "type": "normal", "city": "Суздаль" },
    "119": { "x": 763, "y": 327, "type": "normal", "city": "Суздаль" },
    "120": { "x": 760, "y": 349, "type": "normal", "city": "Суздаль" },
    "121": { "x": 757, "y": 374, "type": "normal", "city": "Суздаль" },
    "122": { "x": 749, "y": 395, "type": "normal", "city": "Суздаль" },
    "123": { "x": 743, "y": 437, "type": "swamp", "city": "Суздаль" },
    "124": { "x": 692, "y": 448, "type": "normal", "city": "Суздаль" },
    "125": { "x": 658, "y": 440, "type": "normal", "city": "Суздаль" },
    "126": { "x": 631, "y": 425, "type": "normal", "city": "Суздаль" },
    "127": { "x": 602, "y": 412, "type": "normal", "city": "Суздаль" },
    "128": { "x": 570, "y": 411, "type": "normal", "city": "Суздаль" },
    "129": { "x": 536, "y": 409, "type": "normal", "city": "Суздаль" }
});

// Школьная база исторических вопросов по городам
const quizDatabase = {
    "Сергиев Посад": { q: "Какая великая православная обитель находится в Сергиевом Посаде?", a: ["Троице-Сергиева лавра", "Киево-Печерская лавра", "Александро-Невская лавра"], right: 0 },
    "Переславль-Залесский": { q: "Какое известное озеро находится в Переславле-Залесском?", a: ["Байкал", "Плещеево озеро", "Ладожское озеро"], right: 1 },
    "Ростов Великий": { q: "Каким уникальным искусством росписи по эмали славится Ростов?", a: ["Гжель", "Финифть", "Хохлома"], right: 1 },
    "Ярославль": { q: "Какой великий князь основал город Ярославль?", a: ["Ярослав Мудрый", "Владимир Мономах", "Юрий Долгорукий"], right: 0 },
    "Кострома": { q: "Какая сказочная героиня официально считается символом Костромы?", a: ["Баба Яга", "Снегурочка", "Русалочка"], right: 1 },
    "Иваново": { q: "Какое промышленное прозвище исторически носит город Иваново?", a: ["Город машиностроителей", "Ситцевый край (город невест)", "Оружейная столица"], right: 1 },
    "Суздаль": { q: "Что запрещено строить в Суздале, чтобы сохранить его древний облик?", a: ["Деревянные дома", "Высотные здания", "Каменные церкви"], right: 1 },
    "Владимир": { q: "Каменные ворота какого цвета являются главным символом древнего Владимира?", a: ["Красные ворота", "Золотые ворота", "Серебряные ворота"], right: 1 }
};

function getNextCellId(currentId, goesFork) {
    let num = Number(currentId);
    if (num === 14) return goesFork ? "79" : "15";
    if (num === 25) return goesFork ? "103" : "26";
    if (num === 110) return goesFork ? "111" : "56";
    if (num === 101) return "23";
    if (num === 109) return "34";
    if (num === 129) return "64";
    if (num === 78) return null; 
    let nextPossible = (num + 1).toString();
    if (boardRoute[nextPossible]) return nextPossible;
    return null;
}


// ==========================================
// ГЕЙМ ЧАСТЬ 4: ПРЕДЗАГРУЗКА И ОБНОВЛЕНИЕ UI
// ==========================================
let preloadedVideos = [];

function startGame(totalPlayers, hasBots) {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-interface").style.display = "flex";
    
    preloadedVideos = [];
    for (let i = 1; i <= 6; i++) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "video";
        link.href = "cubic_" + i + ".webm";
        document.head.appendChild(link);
        
        const v = document.createElement("video");
        v.src = "cubic_" + i + ".webm";
        v.preload = "auto";
        preloadedVideos.push(v);
    }
    
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
            isJustGotBonus: false,
            score: 0 // ИСПРАВЛЕНО: Каждому игроку добавляем стартовый счет баллов
        });
    }
    
    currentTurn = 0;
    isMoving = false;
    updateUI();
    
    const videoEl = document.getElementById("dice-video");
    if (videoEl) {
        videoEl.src = "cubic_1.webm";
        videoEl.load();
    }
    
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
    
    const cellGroups = {};
    players.forEach(player => {
        if (!cellGroups[player.currentCell]) {
            cellGroups[player.currentCell] = [];
        }
        cellGroups[player.currentCell].push(player);
    });

    Object.keys(cellGroups).forEach(cellId => {
        const group = cellGroups[cellId];
        const cell = boardRoute[cellId];
        
        if (cell) {
            group.forEach((player, index) => {
                let offsetX = 0;
                let offsetY = 0;
                
                if (group.length > 1) {
                    const angle = (index * 2 * Math.PI) / group.length;
                    const radius = 9;
                    offsetX = Math.cos(angle) * radius;
                    offsetY = Math.sin(angle) * radius;
                }
                
                ctx.beginPath();
                ctx.arc(cell.x + offsetX, cell.y + offsetY, 8, 0, Math.PI * 2);
                ctx.fillStyle = player.color;
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.closePath();
            });
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
            
            // ИСПРАВЛЕНО: Добавили выгрузку баллов в Путевой Лист справа
            row.innerHTML = `
                <div class="status-name-box">
                    <span class="status-color-dot" style="background: ${p.color}"></span>
                    <span style="font-weight: ${p.id === currentTurn ? 'bold' : 'normal'}">${p.name} (${p.score} б.)</span>
                </div>
                ${badgeHTML}
            `;
            listContainer.appendChild(row);
        });
    }
}

// ==========================================
// ГЕЙМ ЧАСТЬ 5: ДВИЖЕНИЕ, ЗВУКИ И ВИКТОРИНА
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
        videoEl.src = "cubic_" + diceRoll + ".webm";
        videoEl.load();
        
        videoEl.play().catch(err => {
            console.warn("Видео заблокировано браузером, шагаем сразу:", err);
            moveStepByStep(activePlayer, diceRoll, diceRoll, true);
        });
        
        videoEl.onended = function() {
            moveStepByStep(activePlayer, diceRoll, diceRoll, true);
        };
    } else {
        moveStepByStep(activePlayer, diceRoll, diceRoll, true);
    }
}

function moveStepByStep(player, stepsLeft, totalRoll, isFirstStep) {
    if (stepsLeft <= 0) {
        checkCellEffect(player);
        return;
    }
    
    const goesFork = isFirstStep;
    const nextCellId = getNextCellId(player.currentCell, goesFork);
    
    if (nextCellId === null) {
        // ИСПРАВЛЕНО: Первый пришедший к финишу получает жирный бонус +50 баллов!
        player.score += 50;
        soundWin.play();
        showWinModal();
        return;
    }
    
    player.currentCell = nextCellId;
    drawGame();
    
    // ИСПРАВЛЕНО: Включаем звук шага фишки на каждой клетке
    soundStep.currentTime = 0;
    soundStep.play().catch(() => {});
    
    let stepDelay = totalRoll >= 4 ? 700 : 500;
    setTimeout(() => { moveStepByStep(player, stepsLeft - 1, totalRoll, false); }, stepDelay);
}

// ИСПРАВЛЕНО: Конец игры теперь определяет лидера по максимальным баллам
function showWinModal() {
    isMoving = false;
    const winModal = document.getElementById("win-modal");
    const winnerNameEl = document.getElementById("winner-name");
    
    let highestScore = -1;
    let absoluteWinner = players[0];
    
    players.forEach(p => {
        if (p.score > highestScore) {
            highestScore = p.score;
            absoluteWinner = p;
        }
    });
    
    winnerNameEl.textContent = absoluteWinner.name + " (" + absoluteWinner.score + " б.)";
    winnerNameEl.style.background = absoluteWinner.color;
    
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
            soundGold.play().catch(() => {});
            
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
    
    // ИСПРАВЛЕНО: После каждого обычного хода запускается школьная викторина
    launchQuiz(player);
}

// Новая функция запуска викторины по городам Золотого кольца
function launchQuiz(player) {
    const cell = boardRoute[player.currentCell];
    const cityName = (cell && cell.city) ? cell.city : "Ярославль";
    const qData = quizDatabase[cityName];
    
    if (!player.isBot) {
        // Выкатываем интерактивное окно вопросов для человека
        document.getElementById("quiz-modal-question").textContent = `Город: ${cityName}\n\n${qData.q}`;
        const container = document.getElementById("quiz-options-container");
        container.innerHTML = "";
        
        qData.a.forEach((optText, index) => {
            const btn = document.createElement("button");
            btn.className = "btn-quiz-opt";
            btn.textContent = optText;
            btn.onclick = function() {
                if (index === qData.right) {
                    player.score += 10; // Начисляем +10 баллов
                    alert("Правильно! +10 баллов!");
                } else {
                    alert("Неверно! Правильный ответ: " + qData.a[qData.right]);
                }
                document.getElementById("quiz-modal").style.display = "none";
                finishCellEffect();
            };
            container.appendChild(btn);
        });
        document.getElementById("quiz-modal").style.display = "block";
    } else {
        // Роботы отвечают автоматически (50% шанс угадать)
        const botGuess = Math.random() > 0.5 ? qData.right : -1;
        if (botGuess === qData.right) {
            player.score += 10;
        }
        finishCellEffect();
    }
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
