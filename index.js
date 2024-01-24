websocket.addEventListener("open", () => {
    GAMES();
    LIST();
    const gameDropdown = document.getElementById("game");
    gameDropdown.addEventListener("input", (event) => {
        GET_GENERATORS(gameDropdown.value);
    });
    document.getElementById("generator").addEventListener("input", setLargeBoards);
});

function setLargeBoards() {
    let genDropdown = document.getElementById("generator");
    let bool = genDropdown.options[genDropdown.selectedIndex].classList.contains("small_gen");
    for (const opt of document.getElementById("board").getElementsByClassName("large")) {
        opt.disabled = bool;
    }
    let boardDropdown = document.getElementById("board");
    boardDropdown.selectedIndex = 0;
}

// Response listeners
window.addEventListener("GAMES", (data) => {
    // Get games (on load)
    const event = data.detail;
    let games = event.games;
    const gameSelect = document.getElementById("game");
    gameSelect.innerHTML = "";
    for (const game of games) {
        gameSelect.add(new Option(game, game))
    }
    GET_GENERATORS(gameSelect.value);
});

window.addEventListener("GENERATORS", (data) => {
    // Get a game's generators (every time game updates)
    const event = data.detail;
    let gens = event.generators; 
    let genSelect = document.getElementById("generator");
    genSelect.innerHTML = "";
    for (const gen of gens) {
        let opt = new Option(gen.name, gen.name);
        if (gen.count < 169) { opt.classList.add("small_gen"); }
        genSelect.add(opt);
    }
    if (gens.length == 1) { genSelect.disabled = true; } 
    else { genSelect.disabled = false; }
    setLargeBoards();
});

window.addEventListener("LISTED", (data) => {
    const event = data.detail;
    const roomList = document.getElementById("room-list-inner");
    roomList.innerHTML = "";
    const table = roomList.appendChild(document.createElement("table"));
    const tBody = table.createTBody();
    table.createTHead();
    const headerRow = table.tHead.insertRow();
    headerRow.insertCell().textContent = "Room";
    headerRow.insertCell().textContent = "Game";
    headerRow.insertCell().textContent = "Variant";
    headerRow.insertCell().textContent = "Board";
    headerRow.insertCell().textContent = "Count";
    for (const [roomId, roomData] of Object.entries(event.list)) {
        const row = tBody.insertRow();

        const linkCell = row.insertCell();
        const link = document.createElement("a");
        link.setAttribute("href", "board.html?id=" + roomId)
        let linkText = document.createTextNode(roomData.name);
        link.appendChild(linkText);
        linkCell.appendChild(link);

        row.insertCell().textContent = roomData.game;
        row.insertCell().textContent = roomData.variant;
        row.insertCell().textContent = roomData.board;
        const countCell = row.insertCell()
        countCell.textContent = roomData.count;
        countCell.style = "text-align: end;"
    }
});

window.addEventListener("OPENED", (data) => {
    const event = data.detail;
    localStorage.setItem(event.roomId, event.userId);
    window.location.href = "board.html?id=" + event.roomId;
});

function create_room() {
    document.getElementById("create_room").disabled = true;

    OPEN(document.getElementById("roomName").value,
        document.getElementById("username").value,
        document.getElementById("game").value,
        document.getElementById("generator").value,
        document.getElementById("board").value,
        document.getElementById("seed").value);
}

function join_room(roomId) {
    window.location.href = "board.html?id=" + roomId;
}

window.addEventListener("DOMContentLoaded", () => {
    let wsUrl = localStorage.getItem("wsUrl");
    if (wsUrl != null) {
        document.getElementById("websocket-url").value = wsUrl;
    }
    document.getElementById("websocket-url").addEventListener("change", (event) => {
        console.log("Websocket changing to " + event.target.value);
        websocket = new ReconnectingWebSocket(event.target.value);
        localStorage.setItem("wsUrl", event.target.value);
    });
});

