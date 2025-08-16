// server.js

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
// THAY ĐỔI: Import class TaiXiuPredictor từ file thuatoan.js
const { TaiXiuPredictor } = require('./thuatoan.js');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// ===================================
// === Trạng thái và Cấu hình API ===
// ===================================
// JSON trả về (giữ nguyên cấu trúc)
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
    pattern: "",
    tong_phien_da_phan_tich: 0
};

// --- Biến quản lý trạng thái ---
const MAX_HISTORY_SIZE = 1000;
let currentSessionId = null;
let lastPrediction = null; // Lưu dự đoán của phiên trước để so sánh
const fullHistory = []; // Lịch sử giờ sẽ lưu cả dự đoán và kết quả đúng/sai

// THAY ĐỔI: Khởi tạo một thực thể của predictor
const predictor = new TaiXiuPredictor();

// --- Cấu hình WebSocket ---
const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;

const initialMessages = [
    [1, "MiniGame", "GM_fbbdbebndbbc", "123123p", { "info": "{\"ipAddress\":\"2402:800:62cd:cb7c:1a7:7a52:9c3e:c290\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuZG5lYmViYnMiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTIxMDczMTUsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTQ5MjYxMDI1MjcsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwMjo4MDA6NjJjZDpjYjdjOjFhNzo3YTUyOjljM2U6YzI5MCIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMDEucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiN2RhNDlhNDQtMjlhYS00ZmRiLWJkNGMtNjU5OTQ5YzU3NDdkIiwicmVnVGltZSI6MTc1NDkyNjAyMjUxNSwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJHTV9mYmJkYmVibmRiYmMifQ.DAyEeoAnz8we-Qd0xS0tnqOZ8idkUJkxksBjr_Gei8A\",\"locale\":\"vi\",\"userId\":\"7da49a44-29aa-4fdb-bd4c-659949c5747d\",\"username\":\"GM_fbbdbebndbbc\",\"timestamp\":1754926102527,\"refreshToken\":\"7cc4ad191f4348849f69427a366ea0fd.a68ece9aa85842c7ba523170d0a4ae3e\"}", "signature": "53D9E12F910044B140A2EC659167512E2329502FE84A6744F1CD5CBA9B6EC04915673F2CBAE043C4EDB94DDF88F3D3E839A931100845B8F179106E1F44ECBB4253EC536610CCBD0CE90BD8495DAC3E8A9DBDB46FE49B51E88569A6F117F8336AC7ADC226B4F213ECE2F8E0996F2DD5515476C8275F0B2406CDF2987F38A6DA24"}],
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
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
            }, i * 600);
        });
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.ping();
        }, PING_INTERVAL);
    });

    ws.on('pong', () => console.log('[📶] Ping OK.'));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;

            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                currentSessionId = sid;
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";
                
                // THAY ĐỔI: Logic xử lý dự đoán và lịch sử
                let correctnessStatus = null;
                if (lastPrediction && lastPrediction !== "?") {
                    if (lastPrediction === result) {
                        apiResponseData.tong_dung++;
                        correctnessStatus = "ĐÚNG";
                    } else {
                        apiResponseData.tong_sai++;
                        correctnessStatus = "SAI";
                    }
                }
                const totalGames = apiResponseData.tong_dung + apiResponseData.tong_sai;
                apiResponseData.ty_le_thanh_cong = totalGames === 0 ? "0%" : `${((apiResponseData.tong_dung / totalGames) * 100).toFixed(0)}%`;

                const historyEntry = { 
                    session: currentSessionId, 
                    d1, d2, d3, 
                    totalScore: total, 
                    result, 
                    prediction: lastPrediction, // Lưu dự đoán đã đưa ra cho phiên này
                    correctness: correctnessStatus // Lưu trạng thái đúng/sai
                };
                fullHistory.push(historyEntry);
                if (fullHistory.length > MAX_HISTORY_SIZE) {
                    fullHistory.shift();
                }

                // Cập nhật thuật toán với kết quả mới nhất
                const algoResultFormat = result === 'Tài' ? 'T' : 'X';
                predictor.updateData([algoResultFormat]);
                
                // Lấy dự đoán mới từ thuật toán (không đảo ngược)
                const { prediction: algoPrediction } = predictor.predict();
                let finalPrediction = "?";
                if (algoPrediction) {
                    finalPrediction = algoPrediction === 'T' ? 'Tài' : 'Xỉu';
                }

                // Cập nhật JSON trả về
                apiResponseData.phien = currentSessionId;
                apiResponseData.xuc_xac_1 = d1;
                apiResponseData.xuc_xac_2 = d2;
                apiResponseData.xuc_xac_3 = d3;
                apiResponseData.tong = total;
                apiResponseData.ket_qua = result;
                apiResponseData.du_doan = finalPrediction; // Sử dụng dự đoán gốc
                apiResponseData.pattern = fullHistory.map(h => h.result === 'Tài' ? 'T' : 'X').join('');
                apiResponseData.tong_phien_da_phan_tich = fullHistory.length;

                // Lưu lại dự đoán MỚI để so sánh ở phiên tiếp theo
                lastPrediction = finalPrediction;
                
                currentSessionId = null;

                console.log(`Phiên #${apiResponseData.phien}: ${apiResponseData.tong} (${result}) | Dự đoán mới: ${finalPrediction} | Tỷ lệ: ${apiResponseData.ty_le_thanh_cong}`);
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[🔌] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}. Reconnecting...`);
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
app.get('/sunlon', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(apiResponseData, null, 4));
});

// THAY ĐỔI: Endpoint /history hiển thị ĐÚNG/SAI
app.get('/history', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let html = `<style>
                    body{font-family:monospace;background-color:#121212;color:#e0e0e0;}
                    .entry{border-bottom:1px solid #444;padding:5px;}
                    .tai, .dung{color:#28a745;}
                    .xiu, .sai{color:#dc3545;}
                </style>
                <h2>Lịch sử ${fullHistory.length} phiên gần nhất</h2>`;

    if (fullHistory.length === 0) {
        html += '<p>Chưa có dữ liệu lịch sử.</p>';
    } else {
        [...fullHistory].reverse().forEach(h => {
            const resultClass = h.result === 'Tài' ? 'tai' : 'xiu';
            let statusHtml = '';
            if (h.correctness === "ĐÚNG") {
                statusHtml = ` <span class="dung">✅ ĐÚNG</span>`;
            } else if (h.correctness === "SAI") {
                statusHtml = ` <span class="sai">❌ SAI</span>`;
            }

            const predictionHtml = h.prediction && h.prediction !== "?"
                ? `- Dự đoán: <b>${h.prediction}</b>${statusHtml}<br/>`
                : '';

            html += `<div class="entry">
                        - Phiên: ${h.session}<br/>
                        ${predictionHtml}
                        - Kết quả: <b class="${resultClass}">${h.result}</b><br/>
                        - Xúc xắc: [${h.d1}]-[${h.d2}]-[${h.d3}]<br/>
                        - Tổng: ${h.totalScore}
                     </div>`;
        });
    }
    res.send(html);
});


app.get('/', (req, res) => {
    res.send(`<h2>🎯 API Phân Tích Sunwin Tài Xỉu</h2><p>Xem kết quả JSON (định dạng dọc): <a href="/sunlon">/sunlon</a></p><p>Xem lịch sử 1000 phiên gần nhất: <a href="/history">/history</a></p>`);
});

// ===================================
// === Khởi động Server ===
// ===================================
app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
