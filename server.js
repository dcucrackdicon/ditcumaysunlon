// server.js

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

// Tích hợp thuật toán từ file thuatoan.js
const predictor = require('./thuatoan.js');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// ===================================
// === Trạng thái và Cấu hình API ===
// ===================================

// Cấu trúc response mới theo yêu cầu
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
    tong_dung: 0,
    tong_sai: 0,
    pattern: ""
};

let currentSessionId = null;
let lastPrediction = null; // Lưu dự đoán của phiên trước để check đúng sai

// Lịch sử cho thuật toán (chỉ cần score và result)
const gameHistory = []; 
// Lịch sử chi tiết cho endpoint /history
const fullGameHistory = [];

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;
const MAX_ALGO_HISTORY = 50; // Lịch sử cho thuật toán
const MAX_FULL_HISTORY = 1000; // Lịch sử cho API /history

const initialMessages = [
    [
        1, "MiniGame", "GM_fbbdbebndbbc", "123123p",
        {
            "info": "{\"ipAddress\":\"2402:800:62cd:cb7c:1a7:7a52:9c3e:c290\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuZG5lYmViYnMiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTIxMDczMTUsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTQ5MjYxMDI1MjcsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwMjo4MDA6NjJjZDpjYjdjOjFhNzo3YTUyOjljM2U6YzI5MCIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZg2VzL2F2YXRhci9hdmF0YXJfMDEucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiN2RhNDlhNDQtMjlhYS00ZmRiLWJkNGMtNjU5OTQ5YzU3NDdkIiwicmVnVGltZSI6MTc1NDkyNjAyMjUxNSwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJHTV9mYmJkYmVibmRiYmMifQ.DAyEeoAnz8we-Qd0xS0tnqOZ8idkUJkxksBjr_Gei8A\",\"locale\":\"vi\",\"userId\":\"7da49a44-29aa-4fdb-bd4c-659949c5747d\",\"username\":\"GM_fbbdbebndbbc\",\"timestamp\":1754926102527,\"refreshToken\":\"7cc4ad191f4348849f69427a366ea0fd.a68ece9aa85842c7ba523170d0a4ae3e\"}",
            "signature": "53D9E12F910044B140A2EC659167512E2329502FE84A6744F1CD5CBA9B6EC04915673F2CBAE043C4EDB94DDF88F3D3E839A931100845B8F179106E1F44ECBB4253EC536610CCBD0CE90BD8495DAC3E8A9DBDB46FE49B51E88569A6F117F8336AC7ADC226B4F213ECE2F8E0996F2DD5515476C8275F0B2406CDF2987F38A6DA24"
        }
    ],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

// ===================================
// === WebSocket Client ===
// ===================================
let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
    if (ws) { ws.removeAllListeners(); ws.close(); }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
            }, i * 600);
        });
        clearInterval(pingInterval);
        pingInterval = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, PING_INTERVAL);
    });

    ws.on('pong', () => console.log('[📶] Ping OK.'));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;

            const { cmd, sid, d1, d2, d3, gBB } = data[1];
            
            if (cmd === 1008 && sid) {
                currentSessionId = sid;
                console.log(`[🆕] Phiên mới #${sid} bắt đầu.`);
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "T" : "X";
                const resultText = (result === 'T') ? 'Tài' : 'Xỉu';
                
                // Lưu lại thông tin phiên vừa kết thúc
                const previousSessionResult = {
                    phien: currentSessionId,
                    xuc_xac_1: d1,
                    xuc_xac_2: d2,
                    xuc_xac_3: d3,
                    tong: total,
                    ket_qua: resultText
                };

                // 1. Kiểm tra dự đoán của phiên vừa kết thúc
                if (lastPrediction) {
                    if (lastPrediction === result) {
                        apiResponseData.tong_dung += 1;
                    } else {
                        apiResponseData.tong_sai += 1;
                    }
                }

                // 2. Cập nhật lịch sử
                gameHistory.push({ score: total, result: result });
                if (gameHistory.length > MAX_ALGO_HISTORY) gameHistory.shift();
                
                fullGameHistory.push(previousSessionResult);
                if (fullGameHistory.length > MAX_FULL_HISTORY) fullGameHistory.shift();

                const patternString = gameHistory.map(h => h.result).join('');

                // 3. Lấy dự đoán cho phiên TIẾP THEO
                let nextPrediction = { du_doan: "?", ty_le: "0%" };
                if (gameHistory.length >= predictor.config.minHistoryLength) {
                    const analysisResult = predictor.predictTaiXiu(gameHistory);
                    if (analysisResult.success && analysisResult.prediction) {
                         nextPrediction = {
                            du_doan: analysisResult.prediction === 'T' ? 'Tài' : 'Xỉu',
                            ty_le: `${(analysisResult.confidence * 100).toFixed(0)}%`,
                        };
                        lastPrediction = analysisResult.prediction; 
                    }
                } else {
                    lastPrediction = null;
                }
                
                // 4. Cập nhật dữ liệu trả về của API
                // Lấy thông tin phiên TRƯỚC + dự đoán phiên SAU
                apiResponseData = {
                    ...apiResponseData, // Giữ lại id, tong_dung, tong_sai
                    phien: previousSessionResult.phien,
                    xuc_xac_1: previousSessionResult.xuc_xac_1,
                    xuc_xac_2: previousSessionResult.xuc_xac_2,
                    xuc_xac_3: previousSessionResult.xuc_xac_3,
                    tong: previousSessionResult.tong,
                    ket_qua: previousSessionResult.ket_qua,
                    du_doan: nextPrediction.du_doan,
                    ty_le_thanh_cong: nextPrediction.ty_le,
                    pattern: patternString
                };
                
                console.log(`[🏁] Kết quả phiên #${apiResponseData.phien}: ${apiResponseData.tong} (${apiResponseData.ket_qua}) | Dự đoán phiên tới: ${apiResponseData.du_doan}`);
                
                currentSessionId = null; 
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[🔌] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
        clearInterval(pingInterval);
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        console.error('[❌] WebSocket error:', err.message);
        ws.close();
    });
}

// ===================================
// === API Endpoints ===
// ===================================

// Endpoint chính, trả về kết quả phiên trước và dự đoán phiên sau
app.get('/scam', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(apiResponseData, null, 4));
});

// Endpoint mới để xem lịch sử
app.get('/history', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Đảo ngược mảng để phiên mới nhất ở trên cùng
    res.send(JSON.stringify([...fullGameHistory].reverse(), null, 4));
});


app.get('/', (req, res) => {
    res.send(`<h2>🎯 API Phân Tích</h2>
        <p><a href="/scam">Xem kết quả mới nhất tại /scam</a></p>
        <p><a href="/history">Xem lịch sử 1000 phiên tại /history</a></p>
    `);
});

// ===================================
// === Khởi động Server ===
// ===================================
app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
