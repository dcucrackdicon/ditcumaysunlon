// index.js

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// ===================================
// === Biến lưu trạng thái API và Thống kê ===
// ===================================
let apiResponseData = {
    id: "@ghetvietcode - @tranbinh012 - @Phucdzvl2222",
    Phien: null,
    Xuc_xac_1: null,
    Xuc_xac_2: null,
    Xuc_xac_3: null,
    Tong: null,
    Ket_qua: "Đang chờ...",
    Pattern: "",
    Du_doan: "Đang chờ...", // Dự đoán cho phiên sắp tới
    giai_thich: "Đang khởi tạo...", // Giải thích cho dự đoán
    result: "Chưa xác định", // Kết quả của dự đoán cho phiên vừa rồi (Đúng/Sai)
    "Đúng": 0,
    "Sai": 0,
};

let id_phien_chua_co_kq = null;
let lichSuPhienDayDu = []; // ⭐ LƯU LỊCH SỬ ĐẦY ĐỦ {Tong, Ket_qua}
let duDoanHienTai = "?"; // ⭐ LƯU DỰ ĐOÁN ('T' or 'X') CHO PHIÊN SẮP TỚI

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", "Origin": "https://play.sun.win" };
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;
const MAX_HISTORY = 20;

const initialMessages = [
    [1, "MiniGame", "GM_fbbdbebndbbc", "123123p", { "info": "{\"ipAddress\":\"2402:800:62cd:cb7c:1a7:7a52:9c3e:c290\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuZG5lYmViYnMiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTIxMDczMTUsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTQ5MjYxMDI1MjcsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwMjo4MDA6NjJjZDpjYjdjOjFhNzo3YTUyOjljM2U6YzI5MCIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMDEucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiN2RhNDlhNDQtMjlhYS00ZmRiLWJkNGMtNjU5OTQ5YzU3NDdkIiwicmVnVGltZSI6MTc1NDkyNjAyMjUxNSwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJHTV9mYmJkYmVibmRiYmMifQ.DAyEeoAnz8we-Qd0xS0tnqOZ8idkUJkxksBjr_Gei8A\",\"locale\":\"vi\",\"userId\":\"7da49a44-29aa-4fdb-bd4c-659949c5747d\",\"username\":\"GM_fbbdbebndbbc\",\"timestamp\":1754926102527,\"refreshToken\":\"7cc4ad191f4348849f69427a366ea0fd.a68ece9aa85842c7ba523170d0a4ae3e\"}", "signature": "53D9E12F910044B140A2EC659167512E2329502FE84A6744F1CD5CBA9B6EC04915673F2CBAE043C4EDB94DDF88F3D3E839A931100845B8F179106E1F44ECBB4253EC536610CCBD0CE90BD8495DAC3E8A9DBDB46FE49B51E88569A6F117F8336AC7ADC226B4F213ECE2F8E0996F2DD5515476C8275F0B2406CDF2987F38A6DA24" }],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

// ===================================
// === Thuật Toán Dự Đoán Siêu Cấp (Đã dịch từ Python) ===
// ===================================
function analyzeAndPredictUltimate(history) {
    const patternArr = history.map(p => p.Ket_qua);
    if (patternArr.length < 4) {
        return { du_doan: "?", giai_thich: "Chưa đủ dữ liệu (cần >= 4 phiên) để phân tích đa chiều." };
    }

    const reversed_history = patternArr.slice().reverse();
    let score = { 'T': 0, 'X': 0 };
    let reasons = [];

    // --- Phân tích Cầu Bệt ---
    if (reversed_history.length >= 4) {
        if (reversed_history.slice(0, 4).every(h => h === 'T')) {
            score['T'] += 5;
            reasons.push("Bệt Tài (>=4) -> +5 điểm cho TÀI");
        } else if (reversed_history.slice(0, 4).every(h => h === 'X')) {
            score['X'] += 5;
            reasons.push("Bệt Xỉu (>=4) -> +5 điểm cho XỈU");
        }
    }
    if (reversed_history.length >= 8) {
        if (reversed_history.slice(0, 8).every(h => h === 'T')) {
            score['X'] += 10;
            reasons.push("Bệt Tài quá dài (>=8), khả năng bẻ cao -> +10 điểm cho XỈU");
        } else if (reversed_history.slice(0, 8).every(h => h === 'X')) {
            score['T'] += 10;
            reasons.push("Bệt Xỉu quá dài (>=8), khả năng bẻ cao -> +10 điểm cho TÀI");
        }
    }

    // --- Phân tích Cầu 1-1 và 2-2 ---
    // Lưu ý: JSON.stringify là cách đơn giản để so sánh 2 mảng trong JS
    if (reversed_history.length >= 4) {
        const last4 = JSON.stringify(reversed_history.slice(0, 4));
        if (last4 === JSON.stringify(['X', 'T', 'X', 'T'])) { // Mẫu gần nhất là X-T-X-T -> dự đoán T
            score['T'] += 4;
            reasons.push("Cầu 1-1 (XTXT) -> +4 điểm cho TÀI");
        } else if (last4 === JSON.stringify(['T', 'X', 'T', 'X'])) { // Mẫu gần nhất là T-X-T-X -> dự đoán X
            score['X'] += 4;
            reasons.push("Cầu 1-1 (TXTX) -> +4 điểm cho XỈU");
        } else if (last4 === JSON.stringify(['X', 'X', 'T', 'T'])) { // Mẫu gần nhất là X-X-T-T -> dự đoán T
            score['T'] += 3;
            reasons.push("Cầu 2-2 (XXTT) -> +3 điểm cho TÀI");
        } else if (last4 === JSON.stringify(['T', 'T', 'X', 'X'])) { // Mẫu gần nhất là T-T-X-X -> dự đoán X
            score['X'] += 3;
            reasons.push("Cầu 2-2 (TTXX) -> +3 điểm cho XỈU");
        }
    }
    
    // --- Phân tích Cầu Nâng Cao (Nhịp) ---
    if (reversed_history.length >= 6) {
        const last6 = JSON.stringify(reversed_history.slice(0, 6));
        if (last6 === JSON.stringify(['T', 'T', 'T', 'X', 'X', 'T'])) { // 3T-2X-1T -> dự đoán X
             score['X'] += 7;
             reasons.push("Cầu 3-2-1 -> +7 điểm cho XỈU");
        } else if (last6 === JSON.stringify(['X', 'X', 'X', 'T', 'T', 'X'])) { // 3X-2T-1X -> dự đoán T
             score['T'] += 7;
             reasons.push("Cầu 3-2-1 -> +7 điểm cho TÀI");
        } else if (last6 === JSON.stringify(['T', 'T', 'T', 'X', 'X', 'T'])) { // 1T-2X-3T -> dự đoán X
             score['X'] += 7;
             reasons.push("Cầu 1-2-3 -> +7 điểm cho XỈU");
        } else if (last6 === JSON.stringify(['X', 'X', 'X', 'T', 'T', 'X'])) { // 1X-2T-3X -> dự đoán T
             score['T'] += 7;
             reasons.push("Cầu 1-2-3 -> +7 điểm cho TÀI");
        }
    }

    // --- Đưa ra quyết định cuối cùng ---
    const diff = Math.abs(score['T'] - score['X']);
    const threshold = 5; // Ngưỡng chênh lệch điểm tối thiểu để ra quyết định
    let final_prediction = "?";
    let decision_reason = `Tổng điểm (Tài: ${score.T} - Xỉu: ${score.X}). `;

    if (reasons.length === 0) {
        decision_reason += "Không phát hiện được cầu nào rõ ràng. Nên chờ.";
    } else {
        if (diff >= threshold) {
            if (score['T'] > score['X']) {
                final_prediction = 'T';
                decision_reason += `Điểm TÀI vượt trội. Chênh lệch ${diff} điểm.`;
            } else {
                final_prediction = 'X';
                decision_reason += `Điểm XỈU vượt trội. Chênh lệch ${diff} điểm.`;
            }
        } else {
            decision_reason += `Chênh lệch điểm (${diff}) không đủ lớn (yêu cầu >= ${threshold}). Không có cầu đủ mạnh.`;
        }
    }
    
    // Nối các lý do phân tích vào giải thích cuối cùng
    const full_explanation = reasons.length > 0 
        ? `Các yếu tố: [${reasons.join('; ')}]. ${decision_reason}` 
        : decision_reason;

    return { du_doan: final_prediction, giai_thich: full_explanation };
}


// ===================================
// === WebSocket Client ===
// ===================================
let ws = null, pingInterval = null, reconnectTimeout = null;

function connectWebSocket() {
    if (ws) { ws.removeAllListeners(); ws.close(); }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        initialMessages.forEach((msg, i) => setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }, i * 600));
        clearInterval(pingInterval);
        pingInterval = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, PING_INTERVAL);
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;

            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                id_phien_chua_co_kq = sid;
                const prediction = analyzeAndPredictUltimate(lichSuPhienDayDu); // ⭐ SỬ DỤNG THUẬT TOÁN MỚI
                duDoanHienTai = prediction.du_doan;
                apiResponseData.Du_doan = (duDoanHienTai === "?") ? " chờ cầu " : (duDoanHienTai === "T" ? "Tài" : "Xỉu");
                apiResponseData.giai_thich = prediction.giai_thich;
                
                console.log(`\n[🆕] Phiên mới #${sid}. Bắt đầu phân tích...`);
                console.log(`[🔮] Dự đoán: ${apiResponseData.Du_doan} \n   -> Lý do: ${apiResponseData.giai_thich}`);
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const tong = d1 + d2 + d3;
                const ketQuaThucTe = (tong > 10) ? "T" : "X";
                
                if (duDoanHienTai !== "?") {
                    if (duDoanHienTai === ketQuaThucTe) {
                        apiResponseData.result = "Đúng";
                        apiResponseData["Đúng"]++;
                    } else {
                        apiResponseData.result = "Sai";
                        apiResponseData["Sai"]++;
                    }
                } else {
                    apiResponseData.result = "Không dự đoán";
                }
                
                lichSuPhienDayDu.push({ Tong: tong, Ket_qua: ketQuaThucTe });
                if (lichSuPhienDayDu.length > MAX_HISTORY) lichSuPhienDayDu.shift();

                apiResponseData.Phien = id_phien_chua_co_kq;
                apiResponseData.Xuc_xac_1 = d1;
                apiResponseData.Xuc_xac_2 = d2;
                apiResponseData.Xuc_xac_3 = d3;
                apiResponseData.Tong = tong;
                apiResponseData.Ket_qua = (ketQuaThucTe === 'T') ? 'Tài' : 'Xỉu';
                apiResponseData.Pattern = lichSuPhienDayDu.map(p => p.Ket_qua).join('');

                console.log(`[🏁] Kết quả phiên #${apiResponseData.Phien}: ${apiResponseData.Ket_qua} (${apiResponseData.Tong}) - Dự đoán đã ${apiResponseData.result}`);
                console.log(JSON.stringify(apiResponseData, null, 2));
            }
        } catch (e) { console.error('[❌] Lỗi xử lý message:', e.message); }
    });

    ws.on('close', (code, reason) => {
        console.log(`[🔌] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
        clearInterval(pingInterval); clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => { ws.close(); console.error('[❌] WebSocket error:', err.message); });
}

// ===================================
// === API Endpoint ===
// ===================================
app.get('/sunlon', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(apiResponseData, null, 2));
});

app.get('/', (req, res) => {
    res.send(`<h2>🎯 Kết quả Sunwin Tài Xỉu (API Phân Tích)</h2><p><a href="/sunlon">Xem kết quả JSON tại /sunlon</a></p>`);
});

// ===================================
// === Khởi động Server ===
// ===================================
app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
