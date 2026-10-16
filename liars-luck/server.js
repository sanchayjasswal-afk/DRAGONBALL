"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream");
const { randomInt, randomUUID } = require("node:crypto");
const { WebSocket, WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ANDROID_PACKAGE_NAME = "com.sanchayjasswal.liarsluck";
const PUBLIC_DIR = path.join(__dirname, "public");
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_MS = 3 * 60 * 60 * 1000;
const items = [
    { name: "Basketball", sound: "bounce" },
    { name: "Laser Gun", sound: "laser" },
    { name: "Metal Kettle", sound: "metallic" },
    { name: "Alarm Clock", sound: "beep" }
];

const rooms = new Map();

function send(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

function broadcast(room, payload) {
    for (const player of room.players) send(player.socket, payload);
}

function roomPlayers(room) {
    return room.players.map(player => ({
        id: player.id,
        name: player.name,
        score: player.score,
        streak: player.streak,
        connected: player.socket.readyState === WebSocket.OPEN
    }));
}

function broadcastRoomState(room) {
    broadcast(room, {
        type: "roomState",
        code: room.code,
        phase: room.phase,
        players: roomPlayers(room)
    });
}

function makeRoomCode() {
    let code;
    do {
        code = Array.from({ length: 6 }, () =>
            ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
        ).join("");
    } while (rooms.has(code));
    return code;
}

function cleanName(value) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 18);
}

function error(socket, message) {
    send(socket, { type: "error", message });
}

function startRound(room) {
    if (room.players.length !== 2 || room.players.some(player => player.socket.readyState !== WebSocket.OPEN)) {
        room.phase = "waiting";
        room.roundData = null;
        broadcastRoomState(room);
        return;
    }

    room.round += 1;
    room.phase = "playing";
    room.players.forEach(player => { player.answer = null; });

    const realItem = items[randomInt(items.length)];
    const isTruth = randomInt(2) === 1;
    const claimedItem = isTruth
        ? realItem
        : items.filter(item => item.name !== realItem.name)[randomInt(items.length - 1)];

    room.roundData = {
        number: room.round,
        realItem,
        claimed: claimedItem.name,
        isTruth
    };
    room.lastActivity = Date.now();

    broadcast(room, {
        type: "round",
        number: room.round,
        claimed: claimedItem.name,
        sound: realItem.sound
    });
    broadcastRoomState(room);
}

function removePlayer(socket) {
    const room = socket.room;
    const player = socket.player;
    if (!room || !player) return;

    room.players = room.players.filter(candidate => candidate !== player);
    socket.room = null;
    socket.player = null;
    room.phase = "waiting";
    room.roundData = null;
    room.lastActivity = Date.now();

    if (room.players.length === 0) {
        clearTimeout(room.nextRoundTimer);
        rooms.delete(room.code);
        return;
    }

    clearTimeout(room.nextRoundTimer);
    for (const remainingPlayer of room.players) remainingPlayer.answer = null;
    broadcastRoomState(room);
    broadcast(room, { type: "peerLeft", message: `${player.name} left the room. Invite another player to continue.` });
}

function finishRound(room) {
    const round = room.roundData;
    if (!round || room.players.length !== 2 || room.players.some(player => player.answer === null)) return;

    room.phase = "reveal";
    for (const player of room.players) {
        const correct = player.answer === round.isTruth;
        if (correct) {
            player.score += 10;
            player.streak += 1;
        } else {
            player.streak = 0;
        }
    }

    broadcast(room, {
        type: "result",
        number: round.number,
        realItem: round.realItem.name,
        isTruth: round.isTruth,
        claimed: round.claimed,
        players: room.players.map(player => ({
            id: player.id,
            name: player.name,
            score: player.score,
            streak: player.streak,
            guess: player.answer,
            correct: player.answer === round.isTruth
        }))
    });
    room.lastActivity = Date.now();

    clearTimeout(room.nextRoundTimer);
    room.nextRoundTimer = setTimeout(() => {
        if (rooms.get(room.code) === room && room.phase === "reveal") startRound(room);
    }, 2600);
}

function createPlayer(socket, name) {
    const player = {
        id: randomUUID(),
        name,
        score: 0,
        streak: 0,
        answer: null,
        socket
    };
    socket.player = player;
    return player;
}

function handleCreate(socket, message) {
    if (socket.room) return error(socket, "Leave your current room before creating another.");
    const name = cleanName(message.name);
    if (!name) return error(socket, "Enter a player name first.");

    const code = makeRoomCode();
    const room = {
        code,
        players: [],
        phase: "waiting",
        round: 0,
        roundData: null,
        nextRoundTimer: null,
        lastActivity: Date.now()
    };
    const player = createPlayer(socket, name);
    room.players.push(player);
    rooms.set(code, room);
    socket.room = room;

    send(socket, { type: "welcome", playerId: player.id, code });
    send(socket, { type: "roomState", code, phase: room.phase, players: roomPlayers(room) });
}

function handleJoin(socket, message) {
    if (socket.room) return error(socket, "Leave your current room before joining another.");
    const name = cleanName(message.name);
    const code = typeof message.code === "string"
        ? message.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
        : "";
    if (!name) return error(socket, "Enter a player name first.");

    const room = rooms.get(code);
    if (!room) return error(socket, "That room wasn't found. Check the code and try again.");
    if (room.phase !== "waiting" || room.players.length !== 1) {
        return error(socket, "That room is already full or in a round.");
    }

    const player = createPlayer(socket, name);
    room.players.push(player);
    room.lastActivity = Date.now();
    socket.room = room;
    send(socket, { type: "welcome", playerId: player.id, code });
    broadcastRoomState(room);
    startRound(room);
}

function handleAnswer(socket, message) {
    const room = socket.room;
    const player = socket.player;
    if (!room || !player) return error(socket, "Join a room before answering.");
    if (room.phase !== "playing" || !room.roundData) return error(socket, "Wait for the next round.");
    if (typeof message.guess !== "boolean") return error(socket, "Choose truth or bluff.");
    if (player.answer !== null) return error(socket, "Your answer is already locked in.");

    player.answer = message.guess;
    room.lastActivity = Date.now();
    const answered = room.players.filter(candidate => candidate.answer !== null).length;
    broadcast(room, {
        type: "answerStatus",
        answered,
        total: room.players.length,
        submittedPlayerIds: room.players.filter(candidate => candidate.answer !== null).map(candidate => candidate.id)
    });
    finishRound(room);
}

function handleMessage(socket, data) {
    let message;
    try {
        message = JSON.parse(data.toString());
    } catch {
        return error(socket, "Couldn't read that game message.");
    }
    if (!message || typeof message !== "object" || Array.isArray(message)) {
        return error(socket, "Invalid game message.");
    }

    if (message.type === "create") return handleCreate(socket, message);
    if (message.type === "join") return handleJoin(socket, message);
    if (message.type === "answer") return handleAnswer(socket, message);
    error(socket, "Unknown game action.");
}

const staticFiles = new Map([
    ["/", { file: "index.html", type: "text/html; charset=utf-8", cache: "no-cache" }],
    ["/index.html", { file: "index.html", type: "text/html; charset=utf-8", cache: "no-cache" }],
    ["/manifest.webmanifest", { file: "manifest.webmanifest", type: "application/manifest+json; charset=utf-8", cache: "public, max-age=3600" }],
    ["/sw.js", { file: "sw.js", type: "application/javascript; charset=utf-8", cache: "no-cache", serviceWorker: true }],
    ["/icons/icon-192.png", { file: "icons/icon-192.png", type: "image/png", cache: "public, max-age=604800, immutable" }],
    ["/icons/icon-512.png", { file: "icons/icon-512.png", type: "image/png", cache: "public, max-age=604800, immutable" }],
    ["/icons/icon.svg", { file: "icons/icon.svg", type: "image/svg+xml; charset=utf-8", cache: "public, max-age=604800, immutable" }],
    ["/privacy", { file: "privacy.html", type: "text/html; charset=utf-8", cache: "no-cache" }],
    ["/privacy/", { file: "privacy.html", type: "text/html; charset=utf-8", cache: "no-cache" }]
]);

const server = http.createServer((request, response) => {
    let url;
    try {
        url = new URL(request.url, "http://localhost");
    } catch {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end("Bad request");
        return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" });
        response.end("Method not allowed");
        return;
    }
    if (url.pathname === "/health") {
        response.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff"
        });
        response.end(JSON.stringify({
            status: "ok",
            rooms: rooms.size,
            players: Array.from(rooms.values()).reduce((total, room) => total + room.players.length, 0)
        }));
        return;
    }

    if (url.pathname === "/.well-known/assetlinks.json") {
        const fingerprints = (process.env.PLAY_ASSET_LINKS_SHA256 || "")
            .split(",")
            .map(value => value.trim().toUpperCase().replace(/[^A-F0-9]/g, ""))
            .filter(value => /^[A-F0-9]{64}$/.test(value));
        if (fingerprints.length === 0) {
            response.writeHead(404, {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "no-store",
                "x-content-type-options": "nosniff"
            });
            response.end(JSON.stringify({ error: "Android Play app-signing certificate is not configured." }));
            return;
        }
        response.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
            "x-content-type-options": "nosniff"
        });
        response.end(JSON.stringify([{
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
                namespace: "android_app",
                package_name: ANDROID_PACKAGE_NAME,
                sha256_cert_fingerprints: [...new Set(fingerprints)]
            }
        }]));
        return;
    }

    const asset = staticFiles.get(url.pathname);
    if (!asset) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
    }
    const assetPath = path.join(PUBLIC_DIR, asset.file);
    response.writeHead(200, {
        "content-type": asset.type,
        "cache-control": asset.cache,
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "content-security-policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; manifest-src 'self'; worker-src 'self'",
        ...(asset.serviceWorker ? { "service-worker-allowed": "/" } : {})
    });
    if (request.method === "HEAD") {
        response.end();
        return;
    }
    pipeline(fs.createReadStream(assetPath), response, error => {
        if (error && !response.headersSent) {
            response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
            response.end("Game asset could not be loaded.");
        }
    });
});

const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 4096 });
const heartbeatTimer = setInterval(() => {
    for (const socket of websocketServer.clients) {
        if (socket.isAlive === false) {
            socket.terminate();
            continue;
        }
        socket.isAlive = false;
        socket.ping();
    }
}, 30000);
heartbeatTimer.unref();

server.on("upgrade", (request, socket, head) => {
    let url;
    try {
        url = new URL(request.url, "http://localhost");
    } catch {
        socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
    }
    const origin = request.headers.origin;
    let validOrigin = true;
    if (origin) {
        try {
            const parsedOrigin = new URL(origin);
            validOrigin = (parsedOrigin.protocol === "http:" || parsedOrigin.protocol === "https:")
                && parsedOrigin.host === request.headers.host;
        } catch {
            validOrigin = false;
        }
    }
    if (url.pathname !== "/ws" || !validOrigin) {
        socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
    }
    websocketServer.handleUpgrade(request, socket, head, client => {
        websocketServer.emit("connection", client, request);
    });
});

websocketServer.on("connection", socket => {
    socket.room = null;
    socket.player = null;
    socket.isAlive = true;
    socket.on("pong", () => { socket.isAlive = true; });
    socket.on("message", data => handleMessage(socket, data));
    socket.on("close", () => removePlayer(socket));
    socket.on("error", () => removePlayer(socket));
});

const cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - ROOM_TTL_MS;
    for (const [code, room] of rooms) {
        if (room.lastActivity < cutoff) {
            clearTimeout(room.nextRoundTimer);
            for (const player of room.players) {
                send(player.socket, { type: "error", message: "This room expired. Create a new room to keep playing." });
                player.socket.close(1000, "Room expired");
            }
            rooms.delete(code);
        }
    }
}, 10 * 60 * 1000);
cleanupTimer.unref();

server.listen(PORT, HOST, () => {
    console.log(`Liar's Luck listening on http://${HOST}:${PORT}`);
});

function shutdown() {
    clearInterval(cleanupTimer);
    clearInterval(heartbeatTimer);
    for (const room of rooms.values()) clearTimeout(room.nextRoundTimer);
    websocketServer.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
