var urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("id");
const userId = localStorage.getItem(roomId);
var currentTeamId = null;
var teamDialog = null;
var cellStates = {};
var headerStates = {};
var teamBoxes = {};
var teamNames = {};
var lastHover = -1;

const cellBgColor = "#181818";
const hoverColour = "#616161";
const hoverPct = 0.5;
const activePct = 0.5;
const invasionPct = 0.75;
const activePolygonPct = Math.sqrt(activePct);
const svgXOffset = 4;
const svgYOffset = 0;

let members = [];
let teams = {}
var lang = localStorage.getItem("lang");
if (lang != undefined) {
    // do nothing?
} else {
    lang = "en";
}

class CellState {
    goal = "";
    hover = false;
    marked = [];
    invasionMarked = [];
    activeTeamId = null;
    maxMarks = 0;

    updateMaxMarks(newMaxMarks) {
        if (this.maxMarks != newMaxMarks) {
            this.maxMarks = newMaxMarks;
            return true;
        }
        return false;
    }

    updateGoal(newGoal) {
        if (this.goal != newGoal) {
            this.goal = newGoal;
            return true;
        }
        return false;
    }

    updateHover(newHover) {
        if (this.hover != newHover) {
            this.hover = newHover;
            return true;
        }
        return false;
    }

    updateMarked(newMarked) {
        if (this.marked !== newMarked) {
            this.marked = newMarked;
            return true;
        }
        return false;
    }

    updateInvasionMarked(newInvasionMarked) {
        if (this.invasionMarked !== newInvasionMarked) {
            this.invasionMarked = newInvasionMarked;
            return true;
        }
        return false;
    }

    updateActiveTeamId(newActiveTeamId) {
        if (this.activeTeamId == newActiveTeamId) return false;
        var prevId = this.activeTeamId;
        this.activeTeamId = newActiveTeamId;

        for (var marking of this.marked) {
            if (marking[0] == newActiveTeamId || marking[0] == prevId) return true;
        }
        return false;
    }

    isMarkedFor(teamId) {
        if (teamId == null) return false;
        for (var marking of this.marked) {
            if (marking[0] == teamId) return true;
        }
        return false;
    }

    getColourFor(teamId) {
        for (var marking of this.marked) {
            if (marking[0] == teamId) return marking[1];
        }
        for (var marking of this.invasionMarked) { return marking; }
        return null;
    }

    isFull() {
        if ((this.marked.length == 1 && this.marked[0][0] == this.activeTeamId) || (this.maxMarks > 0 && this.marked.length >= this.maxMarks)) {
            return true;
        }
        return false;
    }
}

function numMarked(teamId) {
    let c = 0;
    for (const cellId in cellStates) {
        let cellState = cellStates[cellId];
        if (cellState.isMarkedFor(teamId)) {
            c += 1;
        }
    }
    return c;
}

window.addEventListener("DOMContentLoaded", () => {
    teamDialog = document.getElementById("teamDialog");
});

/*
Coloris({
    //parent: "#teamDialog-wrapper",
    theme: "default",
    themeMode: 'dark',
    alpha: false,
    swatches: [
        "#cc6e8f",
    "#FF0000",
    "#FFA500",
    "#8B4513",
    "#FFFF00",
    "#00FF00",
    "#008080",
    "#00FFFF",
    "#000080",
    "#9400D3"
    ],
  });
*/

// Get board on websocket load
function getBoard() {
    if (userId === undefined) {
        revealLogin();
    } else {
        REJOIN(roomId, userId);
    }
}

function revealLogin() {
    document.getElementById("room").hidden = true;
    document.getElementById("login-main").hidden = false;
    document.getElementById("login").disabled = false;
}

function login() {
    document.getElementById("login").disabled = true;
    JOIN(roomId, document.getElementById("username").value);
}

function exit() {
    EXIT(roomId, userId);
    window.location.href = "index.html";
}

function setTitle(title) {
    document.title = title;
    document.getElementsByTagName("h2")[0].innerText = title;
}

function create_with_class(type, cls) {
    let element = document.createElement(type)
    element.classList += cls
    return element
}

function create_svg(type) {
    return document.createElementNS("http://www.w3.org/2000/svg", type);
}

function createBoard(boardMin) {
    let height = boardMin.height;
    let width = boardMin.width;
    let table = document.getElementById("board");
    table.replaceChildren([]);
    cellStates = {};
    let headerRow = create_with_class("thead", "bingo-col-header-row");
    let corner = create_with_class("th", "bingo-col-header");
    headerRow.appendChild(corner);
    for (let x = 1; x <= width; x++) {
        let header = create_with_class("th", "bingo-col-header");
        let headerContainer = create_with_class("div", "header-container");
        header.id = "header" + x;
        headerStates[x] = new CellState();
        let textDiv = create_with_class("div", "header-content");
        textDiv.innerText = x;
        headerContainer.appendChild(textDiv);
        let svgDiv = create_with_class("div", "svg-container");
        let svg = create_svg("svg");
        svg.id = "header-bg" + x;
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("preserveAspectRatio", "none");
        svgDiv.appendChild(svg);
        headerContainer.appendChild(svgDiv);
        header.appendChild(headerContainer);
        headerRow.appendChild(header);
    }
    table.appendChild(headerRow);
    for (let y = 1; y <= height; y++) {
        let row = create_with_class("tr", "")
        let rowHeader = create_with_class("th", "bingo-row-header");
        rowHeader.innerText = y;
        row.appendChild(rowHeader);
        for (let x = 1; x <= width; x++) {
            let index = (y - 1) * width + x - 1
            cellStates[index] = new CellState();
            let cell = create_with_class("td", "bingo-cell");
            cell.id = "cell" + index;
            cell.addEventListener("mouseover", onCellHoverChanged(index));
            cell.addEventListener("mouseleave", onCellHoverChanged(index));
            let svgDiv = create_with_class("div", "svg-container");
            let svg = create_svg("svg");
            svg.id = "cell-bg" + index;
            svg.setAttribute("viewBox", "0 0 100 100");
            svg.setAttribute("preserveAspectRatio", "none");
            svgDiv.appendChild(svg);
            cell.appendChild(svgDiv);
            let textDiv = create_with_class("div", "bingo-cell-content");
            textDiv.id = "cell-text" + index
            cell.appendChild(textDiv);
            cell.appendChild(create_with_class("div", "bingo-shadow"))
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
}

function pointPrinter(width, height) {
    function scaler(point) {
        let [x, y] = point;
        return `${x * width},${y * height}`
    }
    return scaler;
}

function getRGB(colour) {
    return [parseInt(colour.substring(1, 3), 16), parseInt(colour.substring(3, 5), 16), parseInt(colour.substring(5, 7), 16)];
}

function interpolate(colour1, colour2, pct) {
    var [r1, g1, b1] = getRGB(colour1);
    var [r2, g2, b2] = getRGB(colour2);
    const r = Math.round(r1 + (r2 - r1) * pct);
    const g = Math.round(g1 + (g2 - g1) * pct);
    const b = Math.round(b1 + (b2 - b1) * pct);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const squarePolygon = [[0, 0], [1, 0], [1, 1], [0, 1]];
const activePolygon = [[0, activePolygonPct], [activePolygonPct, 0], [1, 0], [1, 1 - activePolygonPct], [1 - activePolygonPct, 1], [0, 1]];

function renderPolygon(svg, width, height, polygon, colour, hover) {
    let node = create_svg("polygon");
    node.setAttribute('points', polygon.map(pointPrinter(width, height)).join(' '));
    if (hover) colour = interpolate(colour, hoverColour, hoverPct);
    node.style = `fill:${colour};stroke:black;stroke-width:1`;
    svg.appendChild(node);
}

function skew(frac) {
    return Math.pow(frac, areaSkew);
}

function reverseSkew(frac) {
    return 1 - skew(1 - frac);
}

function topLeftPoint(pct) {
    if (pct <= 1) return [0, 1 - pct];
    else return [pct - 1, 0];
}

function bottomRightPoint(pct) {
    if (pct <= 1) return [pct, 1];
    else return [1, 2 - pct];
}

// Given a triangle with sides |size|, |size|, and |size| * sqrt(2), divide it evenly into N sections perpendicular to the hypotenuse.
// Results are coordinates along the hypotenuse, scaled to [0, 2*size]
function splitTriangle(size, sections) {
    let totalArea = size * size / 2.0;
    let share = totalArea / sections;

    let splits = [];
    let currentShare = 0;
    let half = ((sections % 2 == 0) ? (sections - 2) : (sections - 1)) / 2;
    for (i = 0; i < half; i++) {
        currentShare += share;

        // x^2/2 = currentShare; x = sqrt(2 * currentShare)
        // dist = sqrt(2) * x; dist = 2 * sqrt(currentShare)
        splits.push(2 * Math.sqrt(currentShare));
    }

    if (sections % 2 == 0) splits.push(size);
    for (i = 0; i < half; i++) splits.push(2 * size - splits[half - 1 - i]);
    return splits;
}

function computeCrossPolygon(startPct, endPct) {
    const points = []
    if (startPct > 0) {
        points.push(bottomRightPoint(startPct));
        points.push(topLeftPoint(startPct));
    } else {
        points.push([0, 1]);
    }
    if (startPct < 1 && endPct > 1) {
        points.push([0, 0]);
    }
    if (endPct < 2) {
        points.push(topLeftPoint(endPct));
        points.push(bottomRightPoint(endPct));
    } else {
        points.push([1, 0]);
    }
    if (startPct < 1 && endPct > 1) {
        points.push([1, 1]);
    }

    return points;
}

function renderCrossPolygons(svg, width, height, markings, hover, leaveGap) {
    if (markings.length == 0) return;

    let pcts = [];
    if (leaveGap) {
        pcts.push(1 - activePolygonPct);
        for (var split of splitTriangle(activePolygonPct, markings.length)) {
            pcts.push(1 - activePolygonPct + split);
        }
        pcts.push(1 + activePolygonPct);
    } else {
        pcts.push(0);
        pcts.push(...splitTriangle(1, markings.length));
        pcts.push(2);
    }

    console.debug("pcts: " + pcts + "; " + markings.length);
    for (i = 0; i + 1 < pcts.length; i++) {
        let polygon = computeCrossPolygon(pcts[i], pcts[i + 1]);
        renderPolygon(svg, width, height, polygon, markings[i][1], hover);
    }
}

function buildSvgShapes(cell, svg, state) {
    if (state.marked.length == 0 && state.invasionMarked.length == 0) {
        svg.width = 0;
        svg.height = 0;
        return;
    }

    let rect = cell.getBoundingClientRect();
    let width = Math.trunc(rect.right - rect.left) + svgXOffset;
    let height = Math.trunc(rect.bottom - rect.top) + svgYOffset;
    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);

    if (state.marked.length == 1 && state.isFull()) {
       renderPolygon(svg, 100, 100, squarePolygon, state.marked[0][1], state.hover);
       return;
    }
    if (state.marked.length == 0 && state.invasionMarked.length == 1) {
       renderPolygon(svg, 100, 100, squarePolygon, state.invasionMarked[0], state.hover);
       return;
    }

    if (!state.isFull() || state.isMarkedFor(currentTeamId)) {
        let filtered = [];
        for (var marking of state.marked) {
            if (marking[0] != currentTeamId) {
                filtered.push(marking);
            }
        }
        renderCrossPolygons(svg, 100, 100, filtered, state.hover, true);
        renderPolygon(svg, 100, 100, activePolygon, state.isMarkedFor(currentTeamId) ? state.getColourFor(currentTeamId) : cellBgColor, state.hover);
    } else {
        renderCrossPolygons(svg, 100, 100, state.marked, state.hover, false);
    }
}

function updateCellMarkings(index, teamMarkings, invasionMarked) {
    if (index == -1) return;

    const cell = document.getElementById("cell" + index);
    let newHover = cell.matches(':hover');
    if (newHover) lastHover = index;
    let updated = false;

    let state = cellStates[index];
    if (teamMarkings != null && state.updateMarked(teamMarkings)) updated = true;
    if (invasionMarked != null && state.updateInvasionMarked(invasionMarked)) updated = true;
    if (state.updateActiveTeamId(currentTeamId)) updated = true;
    if (state.updateHover(newHover)) updated = true;
    if (!updated) return;

    const svg = document.getElementById("cell-bg" + index);
    svg.replaceChildren([]);
    buildSvgShapes(cell, svg, state);
}

function updateHeaderMarkings(index, teamMarkings) {
    if (index == -1) return;

    const header = document.getElementById("header" + index);
    let updated = false;

    let state = headerStates[index];
    if (teamMarkings != null && state.updateMarked(teamMarkings)) updated = true;
    if (state.updateActiveTeamId(currentTeamId)) updated = true;
    if (!updated) return;

    const svg = document.getElementById("header-bg" + index);
    svg.replaceChildren([]);
    buildSvgShapes(header, svg, state);
}

function updateCurrentTeamId(newTeamId) {
    currentTeamId = newTeamId;

    for (const cellId in cellStates) {
        updateCellMarkings(cellId, null, null);
    }
}

function setTeamText(teamId) {
    txt = teamNames[teamId];
    count = numMarked(teamId);
    if (count > 0) {
        txt += " (" + count + ")";
    }
    teamBoxes[teamId].innerText = txt;
}

function fillBoard(boardData, teamColours) {
    // Update local state.
    let goals = boardData.goals;
    let marks = boardData.marks;
    let max_marks = boardData.maxMarksPerSquare;
    let extras = boardData.extras;
    if (extras != undefined) {
        var headers = boardData.extras.colMarks;
        var invasion_moves = boardData.extras.invasionMoves;
    }
    for (const cellId in cellStates) {
        cellStates[cellId].updateMaxMarks(max_marks);
    }
    if (goals != undefined) {
        for (const i in goals) {
            let goal = goals[i];
            let state = cellStates[i];
            if (state.updateGoal(goal)) {
                const textDiv = document.getElementById("cell-text" + i);
                const node = document.createTextNode(getTranslatedGoalName(goal));
                textDiv.replaceChildren(node);
                fitText(textDiv, 0.7);

                const cell = document.getElementById("cell" + i);
                cell.onclick = markOrUnmarkGoal(i);
            }
        }
    }
    if (marks != undefined && teamColours != undefined) {
        var all_marks = {};
        var invasion_marks = {};
        for (const cellId in cellStates) {
            all_marks[cellId] = [];
            invasion_marks[cellId] = [];
        }
        for (const teamId in marks) {
            let colour = teamColours[teamId];
            for (const marked of marks[teamId]) {
                all_marks[marked].push([teamId, colour]);
            }
        }
        if (invasion_moves != undefined && currentTeamId != null) {
            let colour = interpolate(teamColours[currentTeamId], "#000000", invasionPct);
            for (const cellId of invasion_moves) {
                invasion_marks[cellId].push(colour);
            }
        }

        // We have to loop over all ids in case some goal was unmarked.
        for (const cellId in cellStates) {
            updateCellMarkings(cellId, all_marks[cellId], invasion_marks[cellId]);
        }
    }
    if (headers != undefined) {
        var all_headings = {}
        for (const headerId in headerStates) {
            all_headings[headerId] = [];
        }
        for (const teamId in headers) {
            let colour = teamColours[teamId];
            let index = headers[teamId] + 1;
            all_headings[index].push([teamId, colour]);
        }
        for (const headId in headerStates) {
            updateHeaderMarkings(headId, all_headings[headId])
        }
    }
    for (const teamId in teamBoxes) {
        setTeamText(teamId);
    }
}

function closeTeamDialog() {
    teamDialog.close();
}

function noPropagate(event) {
    event.stopPropagation();
}

function createTeamDialog() {
    teamDialog.showModal();
}

function onCellHoverChanged(id) {
    function func(event) {
        updateCellMarkings(lastHover, null, null);
        updateCellMarkings(id, null, null);
    }
    return func;
}

function createTeam() {
    CREATE_TEAM(roomId,
        document.getElementById("team-name").value,
        document.getElementById("team-color").value);
    
    teamDialog.close();
}

function joinTeam(el) {
    console.log(el);
    let teamid = el.getAttribute("teamid");
    JOIN_TEAM(roomId, teamid);
}

function markOrUnmarkGoal(index) {
    function handleEvent(event) {
        let state = cellStates[index];
        if (state.isMarkedFor(currentTeamId)) {
            UNMARK(roomId, `${index}`)
        } else {
            MARK(roomId, `${index}`)
        }
    }
    return handleEvent;
}

function spectate() {
    SPECTATE(roomId);
}

const emojinums = {
    0: "0️⃣",
    1: "1️⃣",
    2: "2️⃣",
    3: "3️⃣",
    4: "4️⃣",
    5: "5️⃣",
    6: "6️⃣",
    7: "7️⃣",
    8: "8️⃣",
    9: "9️⃣"
}

const huenums = [0, 13, 40, 70, 164, 265];

const huevalues = { //this array is ENTIRELY subjective based on my personal opinion of where hues start and end. there's probably a better way to do this.
    0: "🟥",
    13: "🟧",
    40: "🟨",
    70: "🟩",
    164: "🟦",
    265: "🟪"
}

function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

function closestNum(num, arr) {
    num = Math.floor(num);
    console.log(num);
    curr = arr[0];
    for (var arrval of arr){
        if (num - arrval > 0) {
            if ((num - arrval) < (num - curr)){
                curr = arrval;
            }
        }
    }
    return curr;
}

function copyResults() {
    let boardWidth = currentUpdate.board.width;
    let boardHeight = currentUpdate.board.height;
    let outerArray = new Array();

    for (let i = 0; i < boardWidth; i++){
        outerArray[i] = new Array(boardHeight).fill("⬜");
    }
    // let innerArray = Array(boardWidth).fill("⬛");
    // let outerArray = Array(boardHeight).fill(innerArray);
    
    let teamColour = currentUpdate.teamColours[currentTeamId];
    let r = parseInt(teamColour.substr(1,2), 16);
    let g = parseInt(teamColour.substr(3,2), 16);
    let b = parseInt(teamColour.substr(5,2), 16);

    let hue = rgbToHsl(r, g, b)[0] * 360;
    //console.log(huevalues[closestNum(hue, huenums)]);

    emojiColour = huevalues[closestNum(hue, huenums)];
    for (var mark of currentUpdate.board.marks[currentTeamId]) {
        let outer = Math.floor(mark / boardWidth);
        let inner = mark % boardWidth;
        outerArray[outer][inner] = emojiColour;
    }
    let finalString = "Generated on https://byngosink.manicjamie.com/\n||#️⃣";
    for (let i = 1; i < boardWidth+1; i++){
        if (i < 10) {
            finalString += emojinums[i];
        } else {
            finalString += emojinums[i-10];
        }
    }
    finalString += "\n";
    for (let i = 0; i < boardHeight; i++){
        let text = outerArray[i].join("");
        if (i < 9) {
            finalString += emojinums[i+1];
        } else {
            console.log(i-10);
            finalString += emojinums[i-9];
        }
        finalString += text;
        finalString += "\n";
    }
    finalString += "||";
    console.log(finalString);
    navigator.clipboard.writeText(finalString);
}

function listLanguages(joinView) {
    var langs = joinView.languages;
    var langSelector = document.getElementById("lang-select");
    var englishOpt = document.createElement("option");
    englishOpt.text = "en";
    englishOpt.value = "en";
    langSelector.replaceChildren(englishOpt)
    for (const l in langs) {
        var el = document.createElement("option");
        el.text = l;
        el.value = l;
        langSelector.appendChild(el);
    }
    langSelector.value = lang;
}

function switchLanguage() {
    var langSelector = document.getElementById("lang-select");
    lang = langSelector.options[langSelector.selectedIndex].value;
    localStorage.setItem("lang", lang);
    location.reload();
}

function getTranslatedGoalName(goal) {
    if (lang != "en" && "translations" in goal && lang in goal.translations) {
        return goal.translations[lang]
    }
    return goal.name
}

websocket.addEventListener("open", getBoard);

// Websocket listeners
window.addEventListener("NOTFOUND", (data) => {
    window.location.href = "notfound.html";
});

window.addEventListener("JOINED", (data) => {
    const event = data.detail;
    updateCurrentTeamId(null);
    localStorage.setItem(roomId, event.userId);
    document.getElementById("room").hidden = false;
    document.getElementById("login-main").hidden = true;
    setTitle(event.roomName);
    createBoard(event.boardMin);
    fillBoard(event.boardMin, event.teamColours);
    listLanguages(event);
});

window.addEventListener("REJOINED", (data) => {
    const event = data.detail;
    updateCurrentTeamId(event.teamId);
    setTitle(event.roomName);
    createBoard(event.boardMin);
    fillBoard(event.boardMin, event.teamColours);
    listLanguages(event);
});

function sendChatMessage(chatMessageHTMLEl) {
    const chatBox = document.getElementById("chat-box");
    // flex direction is column-reverse so we prepend
    chatBox.prepend(chatMessageHTMLEl);
}

function createColouredSpan(text, colour) {
    const span = document.createElement("span");
    if (colour) {
        span.style["color"] = colour;
    }
    span.innerText = text;
    return span;
}

function createSystemMessageForMember(memberName, message, colour) {
    const memberSpan = createColouredSpan(memberName, colour);
    const chatMessage = create_with_class("div", "chat-message");
    chatMessage.appendChild(memberSpan);
    chatMessage.innerHTML += ` ${message}`;
    return chatMessage;
}

function getMemberColour(member, membersEvent) {
    if (member.teamId) {
        const team = membersEvent.teams[member.teamId];
        if (team) {
            return team.colour;
        }
    }
    return null;
}

function sendSystemMessagesFromUpdatedMembers(membersEvent) {
    const newMembers = membersEvent.members;
    for (const newMember of newMembers) {
        const colour = getMemberColour(newMember, membersEvent);
        let teamChanged = false;
        const existingMember = members.find(member => member && (member.name === newMember.name));
        if (!existingMember) {
            if (newMember.connected) {
                sendChatMessage(createSystemMessageForMember(newMember.name, "joined", colour));
                teamChanged = true;
            }
            if (!newMember.connected) {
                // when you join a room where people have already disconnected
                sendChatMessage(createSystemMessageForMember(newMember.name, "is disconnected", colour));
            }
        }
        if (existingMember) {
            if (existingMember.teamId !== newMember.teamId) {
                teamChanged = true;
            }
            if (existingMember.connected && !newMember.connected) {
                sendChatMessage(createSystemMessageForMember(newMember.name, "disconnected", colour));
            }
            if (!existingMember.connected && newMember.connected) {
                sendChatMessage(createSystemMessageForMember(newMember.name, "reconnected", colour));
            }
        }
        const newTeam = membersEvent.teams[newMember.teamId];
        if (teamChanged && newTeam) {
            const chatMessage = create_with_class("div", "chat-message");
            const memberSpan = createColouredSpan(newMember.name, newTeam.colour);
            const teamSpan = createColouredSpan(`team ${newTeam.name}`, newTeam.colour);
            chatMessage.appendChild(memberSpan);
            chatMessage.innerHTML += " joined ";
            chatMessage.appendChild(teamSpan);
            sendChatMessage(chatMessage);
        }
    }
    for (const existingMember of members) {
        const newMember = newMembers.find(member => member && (member.name === existingMember.name));
        if (!newMember) {
            const colour = getMemberColour(existingMember, membersEvent);
            sendChatMessage(createSystemMessageForMember(existingMember.name, "left", colour));
        }
    }

    members = newMembers;
}

function createSystemMessageForTeam(team, message) {
    const teamSpan = createColouredSpan(`Team ${team.name}`, team.colour);
    const chatMessage = create_with_class("div", "chat-message");
    chatMessage.appendChild(teamSpan);
    chatMessage.innerHTML += ` ${message}`;
    return chatMessage;
}

function sendSystemMessagesFromUpdatedTeams(membersEvent) {
    const newTeams = membersEvent.teams;
    for (const teamId in newTeams) {
        const newTeam = newTeams[teamId];
        const existingTeam = teams[teamId];
        if (!existingTeam) {
            sendChatMessage(createSystemMessageForTeam(newTeam, "was created"));
        }
    }

    for (const teamId in teams) {
        const newTeam = newTeams[teamId];
        if (!newTeam) {
            sendChatMessage(createSystemMessageForTeam(newTeam, "was removed"));
        }
    }

    teams = newTeams;
}

function sendSystemMessagesFromUpdatedMembersEvent(membersEvent) {
    if (membersEvent.verb !== "MEMBERS") {
        console.error("sendSystemMessagesFromUpdatedMembersEvent called with invalid event");
        return;
    }

    sendSystemMessagesFromUpdatedMembers(membersEvent);
    sendSystemMessagesFromUpdatedTeams(membersEvent);
}

window.addEventListener("MEMBERS", (data) => {
    const event = data.detail;
    sendSystemMessagesFromUpdatedMembersEvent(event)
    const teamSelectorInner = document.getElementById("teamSelector-inner");
    teamSelectorInner.textContent = "";
    teamBoxes = {};
    teamNames = {};
    for (const teamId in event.teams) {
        teamView = event.teams[teamId];
        let teamWrapper = create_with_class("div", "team-wrapper");
        teamWrapper.setAttribute("teamId", teamId);
        teamWrapper.setAttribute("ondblclick", "joinTeam(this)");
        let teamBox = create_with_class("div", "team-box bordered");
        teamBox.setAttribute("style", "background-color: " + teamView.colour + ";");
        teamWrapper.appendChild(teamBox);
        
        teamBoxes[teamId] = teamBox;
        teamNames[teamId] = teamView.name;
        setTeamText(teamId);

        for (const member of teamView.members) {
            let memberPara = create_with_class("p", "team-member");
            memberPara.innerText = member.name;
            if (!member.connected) {
                memberPara.classList.add("disconnected");
            }
            teamWrapper.appendChild(memberPara);
        }
        teamSelectorInner.appendChild(teamWrapper);
    }
});

window.addEventListener("TEAM_JOINED", (data) => {
    const event = data.detail;
    updateCurrentTeamId(event.teamId);
    createBoard(event.board);
    fillBoard(event.board, event.teamColours);
});

window.addEventListener("TEAM_CREATED", (data) => {
    const event = data.detail;
    updateCurrentTeamId(event.teamId);
    createBoard(event.board);
    fillBoard(event.board, event.teamColours);
});

window.addEventListener("TEAM_LEFT", (data) => {
    updateCurrentTeamId(null);
});

var currentUpdate = null; 

window.addEventListener("UPDATE", (data) => {
    const event = data.detail;
    currentUpdate = event;
    fillBoard(event.board, event.teamColours);
});

window.addEventListener("NOAUTH", (data) => {
    revealLogin();
    localStorage.removeItem(roomId);
});

window.addEventListener("DOMContentLoaded", () => {
    let wsUrl = localStorage.getItem("wsUrl");
    if (wsUrl != null) {
        document.getElementById("websocket-url").value = wsUrl;
    }
    document.getElementById("websocket-url").addEventListener("change", (event) => {
        console.log("Websocket changing to " + event.target.value);
        websocket = new ReconnectingWebSocket(event.target.value);
        subscribeWebsocket();
        localStorage.setItem("wsUrl", event.target.value);
    });
});