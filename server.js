// server.js

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
// Nạp thuật toán từ file 'thuatoan.js'
const analyzeAndPredict = require('./thuatoan.js');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// ===================================
// === Trạng thái và Cấu hình API ===
// ===================================
let apiResponseData = {
    id: "@ghetvietcode - @tranbinh012 - @Phucdzvl2222",
    phien: null,
    xuc_xac_1: null,
    xuc_xac_2: null,
    xuc_xac_3: null,
    tong: null,
    ket_qua: "",
    du_doan: "?",
    ty_le_thanh_cong: "0%",
    giai_thich: "Đang chờ đủ dữ liệu để phân tích...",
    pattern: ""
};

let currentSessionId = null;
const patternHistory = [];
const fullGameHistory = [];

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 15000;
const MAX_PATTERN_HISTORY = 1000;

// Các message khởi tạo cần gửi sau khi kết nối thành công
const initialMessages = [
    [1, "MiniGame", "GM_freeallala", "00000000", { "info": "{\"ipAddress\":\"2001:ee0:1a67:a4ff:c44b:cb:f74c:232e\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuY2Juc25zYiIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOmZhbHNlLCJwbGF5RXZlbnRMb2JieSI6ZmFsc2UsImN1c3RvbWVySWQiOjMxMjQ0MDc1MSwiYWZmSWQiOiJkZWZhdWx0IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTUxMjM3MzM5MTYsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjAwMTplZTA6MWE2NzphNGZmOmM0NGI6Y2I6Zjc0YzoyMzJlIiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8yMC5wbmciLCJwbGF0Zm9ybUlkIjo1LCJ1c2VySWQiOiJkYTIwNDliMy0wZmI3LTRkMGUtYjcwZS1hNzFkOThlOTVhOWEiLCJyZWdUaW1lIjoxNzU1MTIzNjI3ODQ0LCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2ZyZWVhbGxhbGEifQ.1_TOsgvoOC0a9npbrSmg3C5rRP3sLdJUFIyB0vael3E\",\"locale\":\"vi\",\"userId\":\"da2049b3-0fb7-4d0e-b70e-a71d98e95a9a\",\"username\":\"GM_freeallala\",\"timestamp\":1755123733916,\"refreshToken\":\"db2b9da2c3264625b601a3d76d83b69f.6054e3c11d244bc48b4b8d7b0459f98d\"}", "signature": "279EFBD41388A221A4D3C44DFE320DA68FF51D935E69E28C339D81BC9E023D1D6F88336DB8025A3106EC5BCE0BF9D20B41DBACBAF844CB160326A62D90FBC8DFE55BB003BBE951773909E0F29426052AC2B3E1333C932CC70D0028878FD037EBFF0FA371216F23C08E2F126B1A882DBC6B1078ED44B40519CF7E8F5C772DF8DF" }],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

// ===================================
// === WebSocket Client ===
// ===================================
let ws = null;
let pingInterval = null;

function connectWebSocket() {
    console.log(`[🔄] Đang kết nối tới ${WEBSOCKET_URL}...`);
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }

    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] Kết nối WebSocket thành công.');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(msg));
                }
            }, i * 600);
        });

        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.ping((err) => {
                    if (err) {
                        console.error('[❌] Ping thất bại, có thể kết nối đã mất:', err);
                        ws.terminate();
                    }
                });
            }
        }, PING_INTERVAL);
    });

    ws.on('pong', () => {
        // console.log('[📶] Ping OK.');
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || data.length < 2 || typeof data[1] !== 'object' || data[1] === null) {
                return;
            }

            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                currentSessionId = sid;
            }

            if (cmd === 1003 && gBB && d1 !== undefined && d2 !== undefined && d3 !== undefined) {
                const total = d1 + d2 + d3;
                const result = (total > 10) ? "T" : "X";
                const resultText = (result === 'T') ? 'Tài' : 'Xỉu';

                patternHistory.push(result);
                if (patternHistory.length > MAX_PATTERN_HISTORY) {
                    patternHistory.shift();
                }

                const historyEntry = {
                    session: currentSessionId || 'N/A',
                    dice: [d1, d2, d3],
                    total: total,
                    result: resultText
                };
                fullGameHistory.unshift(historyEntry);
                if (fullGameHistory.length > MAX_PATTERN_HISTORY) {
                    fullGameHistory.pop();
                }
                
                const prediction = analyzeAndPredict(patternHistory);

                apiResponseData = {
                    ...apiResponseData,
                    phien: currentSessionId,
                    xuc_xac_1: d1,
                    xuc_xac_2: d2,
                    xuc_xac_3: d3,
                    tong: total,
                    ket_qua: resultText,
                    du_doan: (prediction.du_doan === "?") ? "?" : (prediction.du_doan === "T" ? "Tài" : "Xỉu"),
                    ty_le_thanh_cong: prediction.ty_le_thanh_cong,
                    giai_thich: prediction.giai_thich,
                    pattern: patternHistory.join('')
                };

                console.log(`[GAME] Phiên ${apiResponseData.phien}: ${apiResponseData.tong} (${apiResponseData.ket_qua}) | Dự đoán: ${apiResponseData.du_doan} | Pattern: ...${patternHistory.slice(-10).join('')}`);
                
                currentSessionId = null;
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        const reasonText = reason.toString() || 'Không rõ lý do';
        console.log(`[🔌] Kết nối WebSocket đã đóng. Mã: ${code}, Lý do: ${reasonText}. Tự động kết nối lại sau ${RECONNECT_DELAY / 1000} giây...`);
        clearInterval(pingInterval);
        setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        console.error('[❌] Lỗi WebSocket:', err.message);
    });
}

// ===================================
// === API Endpoint ===
// ===================================
app.get('/sunlon', (req, res) => {
    res.json(apiResponseData);
});

app.get('/history', (req, res) => {
    res.json(fullGameHistory);
});

app.get('/', (req, res) => {
    res.send(`
        <h2>🎯 API Phân Tích Sunwin Tài Xỉu</h2>
        <p>Server đang hoạt động. Vui lòng sử dụng các endpoint sau:</p>
        <ul>
            <li><a href="/sunlon">/sunlon</a>: Xem kết quả và dự đoán của phiên mới nhất.</li>
            <li><a href="/history">/history</a>: Xem lịch sử chi tiết các phiên gần đây.</li>
        </ul>
        <p>Thời gian hoạt động của server: ${new Date().toLocaleString('vi-VN')}</p>
    `);
});

// ===================================
// === Khởi động Server ===
// ===================================
app.listen(PORT, () => {
    console.log(`[🌐] Server đang chạy tại http://localhost:${PORT}`);
    connectWebSocket();
});

