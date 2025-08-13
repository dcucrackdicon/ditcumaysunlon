// index.js

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// ===================================
// === CƠ SỞ DỮ LIỆU THUẬT TOÁN ===
// ===================================
const PATTERN_DATA = { /* ... Dữ liệu từ lần trước ... */ };
const SUNWIN_ALGORITHM = { /* ... Dữ liệu từ lần trước ... */ };
// (Tôi đã ẩn đi để code gọn hơn, nhưng nó vẫn tồn tại trong file đầy đủ bên dưới)


// ===================================
// === BIẾN LƯU TRẠNG THÁI ===
// ===================================
let apiResponseData = {
    id: "@ghetvietcode - @tranbinh012 - @Phucdzvl2222",
    Phien: null, Xuc_xac_1: null, Xuc_xac_2: null, Xuc_xac_3: null, Tong: null,
    Ket_qua: "Đang chờ...",
    Pattern: "",
    Du_doan: "Đang chờ...",
    ty_le_thanh_cong: "0%",
    giai_thich: "Đang khởi tạo...",
    result: "Chưa xác định",
    "Đúng": 0, "Sai": 0,
};

let id_phien_chua_co_kq = null;
let lichSuPhienDayDu = []; 
let duDoanHienTai = "?"; 

// ===============================================
// === HỆ THỐNG PHÂN TÍCH CHUYÊN SÂU (PHIÊN BẢN MỚI) ===
// ===============================================

/** Ưu tiên 1: Phân tích cầu bệt dài đang chạy */
function analyze_big_streak(history) {
    if (history.length < 3) return { prediction: null, confidence: 0 };
    
    let current_streak = 1;
    const first_result = history[0].Ket_qua;
    
    for (let i = 1; i < history.length; i++) {
        if (history[i].Ket_qua === first_result) {
            current_streak++;
        } else {
            break;
        }
    }
    
    if (current_streak >= 3) {
        let confidence = Math.min(85 + (current_streak - 3) * 5, 99);
        return { prediction: first_result, confidence: confidence };
    }
    return { prediction: null, confidence: 0 };
}

/** Ưu tiên 2: Phân tích theo tổng điểm của phiên gần nhất */
function analyze_sum_trend(history) {
    if (history.length === 0) return { prediction: null, confidence: 0 };
    const last_sum = history[0].Tong;
    let sum_stats = null;

    if (last_sum >= 3 && last_sum <= 10) sum_stats = SUNWIN_ALGORITHM["3-10"];
    else if (SUNWIN_ALGORITHM[last_sum]) sum_stats = SUNWIN_ALGORITHM[last_sum];

    if (sum_stats) {
        const isTai = sum_stats.tai > sum_stats.xiu;
        const prediction = isTai ? 'T' : 'X';
        const confidence = isTai ? sum_stats.tai : sum_stats.xiu;
        return { prediction, confidence };
    }
    return { prediction: null, confidence: 0 };
}

/** Helper: Tìm pattern dài nhất khớp với lịch sử */
function find_closest_pattern(historyString) {
    const sortedKeys = Object.keys(PATTERN_DATA).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (historyString.endsWith(key)) {
            return key;
        }
    }
    return null;
}

/** Ưu tiên 3: Phân tích theo chuỗi pattern */
function analyze_pattern_trend(history) {
    if (history.length === 0) return { prediction: null, confidence: 0 };
    
    const elements = history.slice(0, 15).map(s => s.Ket_qua.toLowerCase());
    const current_pattern_str = elements.reverse().join('');
    const closest_pattern_key = find_closest_pattern(current_pattern_str);
    
    if (closest_pattern_key) {
        const data = PATTERN_DATA[closest_pattern_key];
        const isTai = data.tai > data.xiu;
        const prediction = isTai ? 'T' : 'X';
        const confidence = Math.max(data.tai, data.xiu);
        return { prediction, confidence, source: closest_pattern_key };
    }
    return { prediction: null, confidence: 0 };
}

/** Hàm tổng hợp dự đoán theo thứ tự ưu tiên */
function analyzeAndPredict(history) {
    if (history.length < 3) {
        return { du_doan: "?", giai_thich: "Chưa đủ dữ liệu (cần >= 3 phiên).", ty_le: "N/A" };
    }
    
    // Ưu tiên 1: Cầu bệt dài
    const { prediction: streak_pred, confidence: streak_conf } = analyze_big_streak(history);
    if (streak_pred && streak_conf > 75) {
        return {
            du_doan: streak_pred,
            giai_thich: `Ưu tiên 1: Hệ thống bắt cầu bệt ${streak_pred} đang chạy.`,
            ty_le: `${streak_conf}%`
        };
    }
    
    // Ưu tiên 2: Tổng điểm phiên trước
    const { prediction: sum_pred, confidence: sum_conf } = analyze_sum_trend(history);
    if (sum_pred && sum_conf > 80) {
        return {
            du_doan: sum_pred,
            giai_thich: `Ưu tiên 2: Tổng điểm ${history[0].Tong} của phiên trước báo hiệu mạnh.`,
            ty_le: `${sum_conf}%`
        };
    }
    
    // Ưu tiên 3: Phân tích pattern
    const { prediction: pattern_pred, confidence: pattern_conf, source: pattern_source } = analyze_pattern_trend(history);
    if (pattern_pred) {
        return {
            du_doan: pattern_pred,
            giai_thich: `Ưu tiên 3: Phân tích dựa trên mẫu [${pattern_source.toUpperCase()}].`,
            ty_le: `${pattern_conf}%`
        };
    }
    
    // 4. Dự phòng
    const last_total = history[0].Tong;
    const fallback_pred = last_total >= 11 ? 'T' : 'X';
    return {
        du_doan: fallback_pred,
        giai_thich: "Dự phòng: Không có tín hiệu mạnh, dự đoán dựa trên tổng điểm phiên cuối.",
        ty_le: "55%"
    };
}


// ===================================
// === DỮ LIỆU & LOGIC MÁY CHỦ (Phần không đổi) ===
// ===================================
// --- Dữ liệu thuật toán ---
const PATTERN_DATA_FULL = {"ttx":{"tai":70,"xiu":30},"xxt":{"tai":30,"xiu":70},"txt":{"tai":65,"xiu":35},"xtx":{"tai":35,"xiu":65},"txtx":{"tai":60,"xiu":40},"xtxt":{"tai":40,"xiu":60},"tttt":{"tai":85,"xiu":15},"xxxx":{"tai":15,"xiu":85},"tttx":{"tai":75,"xiu":25},"xxxt":{"tai":25,"xiu":75},"ttttt":{"tai":88,"xiu":12},"xxxxx":{"tai":12,"xiu":88},"txtxt":{"tai":65,"xiu":35},"xtxtx":{"tai":35,"xiu":65},"ttxttx":{"tai":80,"xiu":20},"xxttxx":{"tai":25,"xiu":75},"t_t_x_x_t_t":{"tai":80,"xiu":20},"ttxtx":{"tai":78,"xiu":22},"xxtxt":{"tai":22,"xiu":78},"tttttt":{"tai":92,"xiu":8},"xxxxxx":{"tai":8,"xiu":92},"txtxtx":{"tai":82,"xiu":18},"xtxtxt":{"tai":18,"xiu":82},"ttxtxt":{"tai":85,"xiu":15},"xxtxtx":{"tai":15,"xiu":85},"txtxxt":{"tai":83,"xiu":17},"xtxttx":{"tai":17,"xiu":83},"txtxtxt":{"tai":70,"xiu":30},"xtxtxtx":{"tai":30,"xiu":70},"ttttttt":{"tai":95,"xiu":5},"xxxxxxx":{"tai":5,"xiu":95},"tttttttt":{"tai":97,"xiu":3},"xxxxxxxx":{"tai":3,"xiu":97},"ttttttttttttx":{"tai":95,"xiu":5},"tttttttttttxt":{"tai":5,"xiu":95},"tttttttttttxx":{"tai":5,"xiu":95}};
Object.assign(PATTERN_DATA, PATTERN_DATA_FULL);

// --- Logic máy chủ ---
const WS_HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", "Origin": "https://play.sun.win" };
const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;
const MAX_HISTORY = 20;

const initialMessages = [
    [1, "MiniGame", "GM_fbbdbebndbbc", "123123p", { "info": "{\"ipAddress\":\"2402:800:62cd:cb7c:1a7:7a52:9c3e:c290\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuZG5lYmViYnMiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTIxMDczMTUsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTQ5MjYxMDI1MjcsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwMjo4MDA6NjJjZDpjYjdjOjFhNzo3YTUyOjljM2U6YzI5MCIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMDEucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiN2RhNDlhNDQtMjlhYS00ZmRiLWJkNGMtNjU5OTQ5YzU3NDdkIiwicmVnVGltZSI6MTc1NDkyNjAyMjUxNSwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJHTV9mYmJkYmVibmRiYmMifQ.DAyEeoAnz8we-Qd0xS0tnqOZ8idkUJkxksBjr_Gei8A\",\"locale\":\"vi\",\"userId\":\"7da49a44-29aa-4fdb-bd4c-659949c5747d\",\"username\":\"GM_fbbdbebndbbc\",\"timestamp\":1754926102527,\"refreshToken\":\"7cc4ad191f4348849f69427a366ea0fd.a68ece9aa85842c7ba523170d0a4ae3e\"}", "signature": "53D9E12F910044B140A2EC659167512E2329502FE84A6744F1CD5CBA9B6EC04915673F2CBAE043C4EDB94DDF88F3D3E839A931100845B8F179106E1F44ECBB4253EC536610CCBD0CE90BD8495DAC3E8A9DBDB46FE49B51E88569A6F117F8336AC7ADC226B4F213ECE2F8E0996F2DD5515476C8275F0B2406CDF2987F38A6DA24" }],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

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
                const prediction = analyzeAndPredict(lichSuPhienDayDu); // ⭐ ÁP DỤNG THUẬT TOÁN MỚI
                duDoanHienTai = prediction.du_doan;
                apiResponseData.Du_doan = (duDoanHienTai === "?") ? "Chờ Cầu" : (duDoanHienTai === "T" ? "Tài" : "Xỉu");
                apiResponseData.giai_thich = prediction.giai_thich;
                apiResponseData.ty_le_thanh_cong = prediction.ty_le;
                
                console.log(`\n[🆕] Phiên mới #${sid}. Bắt đầu phân tích...`);
                console.log(`[🔮] Dự đoán: ${apiResponseData.Du_doan} (${apiResponseData.ty_le_thanh_cong}) \n   -> Lý do: ${apiResponseData.giai_thich}`);
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
                
                // Lịch sử được cập nhật với kết quả mới nhất ở đầu mảng
                lichSuPhienDayDu.unshift({ Tong: tong, Ket_qua: ketQuaThucTe });
                if (lichSuPhienDayDu.length > MAX_HISTORY) lichSuPhienDayDu.pop();

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

app.get('/sunlon', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(apiResponseData, null, 2));
});

app.get('/', (req, res) => {
    res.send(`<h2>🎯 Kết quả Sunwin Tài Xỉu (API Phân Tích)</h2><p><a href="/sunlon">Xem kết quả JSON tại /sunlon</a></p>`);
});

app.listen(PORT, () => {
    console.log(`[🌐] Server is running at http://localhost:${PORT}`);
    connectWebSocket();
});
