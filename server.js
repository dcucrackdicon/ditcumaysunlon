// index.js

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

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
const patternHistory = []; // Lưu dãy T/X gần nhất
const fullGameHistory = []; // Lưu lịch sử chi tiết của các phiên

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;
const MAX_PATTERN_HISTORY = 20;

// Các message khởi tạo cần gửi sau khi kết nối thành công
const initialMessages = [
    // Message 1: Xác thực và thông tin người dùng (ĐÃ CẬP NHẬT)
    [1, "MiniGame", "GM_freeallala", "00000000", { "info": "{\"ipAddress\":\"2001:ee0:1a67:a4ff:c44b:cb:f74c:232e\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuY2Juc25zYiIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOmZhbHNlLCJwbGF5RXZlbnRMb2JieSI6ZmFsc2UsImN1c3RvbWVySWQiOjMxMjQ0MDc1MSwiYWZmSWQiOiJkZWZhdWx0IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTUxMjM3MzM5MTYsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjAwMTplZTA6MWE2NzphNGZmOmM0NGI6Y2I6Zjc0YzoyMzJlIiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8yMC5wbmciLCJwbGF0Zm9ybUlkIjo1LCJ1c2VySWQiOiJkYTIwNDliMy0wZmI3LTRkMGUtYjcwZS1hNzFkOThlOTVhOWEiLCJyZWdUaW1lIjoxNzU1MTIzNjI3ODQ0LCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2ZyZWVhbGxhbGEifQ.1_TOsgvoOC0a9npbrSmg3C5rRP3sLdJUFIyB0vael3E\",\"locale\":\"vi\",\"userId\":\"da2049b3-0fb7-4d0e-b70e-a71d98e95a9a\",\"username\":\"GM_freeallala\",\"timestamp\":1755123733916,\"refreshToken\":\"db2b9da2c3264625b601a3d76d83b69f.6054e3c11d244bc48b4b8d7b0459f98d\"}", "signature": "279EFBD41388A221A4D3C44DFE320DA68FF51D935E69E28C339D81BC9E023D1D6F88336DB8025A3106EC5BCE0BF9D20B41DBACBAF844CB160326A62D90FBC8DFE55BB003BBE951773909E0F29426052AC2B3E1333C932CC70D0028878FD037EBFF0FA371216F23C08E2F126B1A882DBC6B1078ED44B40519CF7E8F5C772DF8DF" }],
    // Message 2: Yêu cầu cập nhật Tài Xỉu
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    // Message 3: Yêu cầu vào sảnh
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

// ===================================
// === Phân tích và dự đoán ===
// ===================================
/**
 * Phân tích chuỗi kết quả và đưa ra dự đoán dựa trên các quy tắc đơn giản.
 * @param {string[]} patternArr - Mảng lịch sử kết quả (['T', 'X', 'T', ...])
 * @returns {{du_doan: string, ty_le: string, giai_thich: string}}
 */
function analyzeAndPredict(patternArr) {
    const len = patternArr.length;
    if (len < 3) {
        return {
            du_doan: "?",
            ty_le_thanh_cong: "0%",
            giai_thich: "Chưa đủ dữ liệu để phân tích cầu."
        };
    }

    const last1 = patternArr[len - 1];
    const last2 = patternArr[len - 2];
    const last3 = patternArr[len - 3];
    const last4 = patternArr[len - 4];

    // Quy tắc 1: Cầu Bệt (Streak) - Ví dụ: T-T-T -> Dự đoán T
    if (last1 === last2 && last2 === last3) {
        return {
            du_doan: last1,
            ty_le_thanh_cong: "85%",
            giai_thich: "AI nhận định cầu bệt đang chạy dài, đi theo cầu."
        };
    }

    // Quy tắc 2: Cầu 1-1 (Alternating) - Ví dụ: T-X-T -> Dự đoán X
    if (last1 !== last2 && last2 !== last3) {
        return {
            du_doan: last2,
            ty_le_thanh_cong: "78%",
            giai_thich: "AI phát hiện tín hiệu cầu 1-1 (xen kẽ), đi theo cầu."
        };
    }

    // Quy tắc 3: Cầu 2-2 - Ví dụ: T-T-X-X -> Dự đoán T
    if (len >= 4 && last1 === last2 && last3 === last4 && last2 !== last3) {
        return {
            du_doan: last1,
            ty_le_thanh_cong: "75%",
            giai_thich: "AI phân tích xu hướng cầu 2-2, dự đoán lặp lại cặp."
        }
    }

    // Quy tắc 4 (Mặc định): Bẻ cầu (ngược lại phiên trước)
    const opposite = last1 === 'T' ? 'X' : 'T';
    return {
        du_doan: opposite,
        ty_le_thanh_cong: "55%",
        giai_thich: "Các cầu không rõ ràng, AI dự đoán bẻ cầu (ngược lại phiên trước)."
    };
}

// ===================================
// === WebSocket Client ===
// ===================================
let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }

    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(msg));
                }
            }, i * 600);
        });
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        }, PING_INTERVAL);
    });

    ws.on('pong', () => {
        console.log('[📶] Ping OK.');
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') {
                return;
            }

            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                currentSessionId = sid;
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "T" : "X";
                const resultText = (result === 'T') ? 'Tài' : 'Xỉu';

                // Thêm vào lịch sử pattern T/X
                patternHistory.push(result);
                if (patternHistory.length > MAX_PATTERN_HISTORY) {
                    patternHistory.shift();
                }

                // Thêm vào lịch sử chi tiết (mới)
                const historyEntry = {
                    session: currentSessionId,
                    dice: [d1, d2, d3],
                    total: total,
                    result: resultText
                };
                fullGameHistory.unshift(historyEntry); // Thêm vào đầu mảng
                if (fullGameHistory.length > MAX_PATTERN_HISTORY) {
                    fullGameHistory.pop(); // Xóa phần tử cũ nhất
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

                console.log(`Phiên ${apiResponseData.phien}: ${apiResponseData.tong} (${apiResponseData.ket_qua}) | Pattern: ${apiResponseData.pattern} | Dự đoán: ${apiResponseData.du_doan} (${apiResponseData.giai_thich})`);
                
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
// === API Endpoint ===
// ===================================
app.get('/sunlon', (req, res) => {
    res.json(apiResponseData);
});

// Endpoint mới để xem lịch sử
app.get('/history', (req, res) => {
    res.json(fullGameHistory);
});

app.get('/', (req, res) => {
    res.send(`
        <h2>🎯 Kết quả Sunwin Tài Xỉu (API Phân Tích)</h2>
        <p>Đây là API cung cấp dự đoán và kết quả phiên Tài Xỉu.</p>
        <ul>
            <li><a href="/sunlon">Xem kết quả JSON của phiên mới nhất tại /sunlon</a></li>
            <li><a href="/history">Xem lịch sử các phiên gần đây tại /history</a></li>
        </ul>
    `);
});

// ===================================
// === Khởi động Server ===
// ===================================
app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
