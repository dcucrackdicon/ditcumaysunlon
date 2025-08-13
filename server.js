// index.js

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// ===================================
// === CƠ SỞ DỮ LIỆU THUẬT TOÁN MỚI ===
// ===================================

// Lưu ý: Các key trùng lặp đã được hợp nhất, giữ lại giá trị cuối cùng bạn cung cấp.
const PATTERN_DATA = {
    "ttx": {"tai": 70, "xiu": 30},
    "xxt": {"tai": 30, "xiu": 70},
    "txt": {"tai": 65, "xiu": 35},
    "xtx": {"tai": 35, "xiu": 65},
    "txtx": {"tai": 60, "xiu": 40}, 
    "xtxt": {"tai": 40, "xiu": 60},
    "tttt": {"tai": 85, "xiu": 15}, 
    "xxxx": {"tai": 15, "xiu": 85},
    "tttx": {"tai": 75, "xiu": 25}, 
    "xxxt": {"tai": 25, "xiu": 75},
    "ttttt": {"tai": 88, "xiu": 12}, 
    "xxxxx": {"tai": 12, "xiu": 88},
    "txtxt": {"tai": 65, "xiu": 35}, 
    "xtxtx": {"tai": 35, "xiu": 65},
    "ttxttx": {"tai": 80, "xiu": 20},
    "xxttxx": {"tai": 25, "xiu": 75}, // key "xxttxx" được cập nhật giá trị cuối
    "t_t_x_x_t_t": {"tai": 80, "xiu": 20},
    "ttxtx": {"tai": 78, "xiu": 22}, 
    "xxtxt": {"tai": 22, "xiu": 78},
    "tttttt": {"tai": 92, "xiu": 8}, 
    "xxxxxx": {"tai": 8, "xiu": 92},
    "txtxtx": {"tai": 82, "xiu": 18}, 
    "xtxtxt": {"tai": 18, "xiu": 82},
    "ttxtxt": {"tai": 85, "xiu": 15}, 
    "xxtxtx": {"tai": 15, "xiu": 85},
    "txtxxt": {"tai": 83, "xiu": 17}, 
    "xtxttx": {"tai": 17, "xiu": 83},
    "txtxtxt": {"tai": 70, "xiu": 30}, 
    "xtxtxtx": {"tai": 30, "xiu": 70},
    "ttttttt": {"tai": 95, "xiu": 5}, 
    "xxxxxxx": {"tai": 5, "xiu": 95},
    "tttttttt": {"tai": 97, "xiu": 3}, 
    "xxxxxxxx": {"tai": 3, "xiu": 97},
    "ttttttttttttx": {"tai": 95, "xiu": 5},
    "tttttttttttxt": {"tai": 5, "xiu": 95},
    "tttttttttttxx": {"tai": 5, "xiu": 95},
};

const SUNWIN_ALGORITHM = {
    "3-10": {"tai": 0, "xiu": 100},
    "11": {"tai": 10, "xiu": 90},
    "12": {"tai": 20, "xiu": 80},
    "13": {"tai": 35, "xiu": 65},
    "14": {"tai": 45, "xiu": 55},
    "15": {"tai": 65, "xiu": 35},
    "16": {"tai": 80, "xiu": 20},
    "17": {"tai": 90, "xiu": 10},
    "18": {"tai": 100, "xiu": 0}
};

// ===================================
// === Biến lưu trạng thái API và Thống kê ===
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

// ===================================
// === Thuật Toán Kết Hợp Mới ===
// ===================================
function analyzeAndPredict(history) {
    if (history.length === 0) {
        return { du_doan: "?", giai_thich: "Chưa có dữ liệu lịch sử.", ty_le: "0%" };
    }

    const historyString = history.map(p => p.Ket_qua.toLowerCase()).join('');
    const lastSession = history[history.length - 1];
    let reasons = [];

    // 1. Phân tích Pattern (Trọng số 70%)
    let patternRule = null;
    let patternWeight = 0.7;
    for (let len = 13; len >= 3; len--) { // Ưu tiên tìm pattern dài nhất
        if (historyString.length >= len) {
            const sub = historyString.slice(-len);
            if (PATTERN_DATA[sub]) {
                patternRule = PATTERN_DATA[sub];
                reasons.push(`Mẫu [${sub.toUpperCase()}] được áp dụng (Tỷ lệ T/X: ${patternRule.tai}/${patternRule.xiu})`);
                break;
            }
        }
    }

    // 2. Phân tích Điểm phiên trước (Trọng số 30%)
    let sunwinRule = null;
    let sunwinWeight = 0.3;
    const lastTotal = lastSession.Tong;
    if (lastTotal >= 3 && lastTotal <= 10) {
        sunwinRule = SUNWIN_ALGORITHM["3-10"];
    } else if (SUNWIN_ALGORITHM[lastTotal]) {
        sunwinRule = SUNWIN_ALGORITHM[lastTotal];
    }
    if(sunwinRule) {
        reasons.push(`Điểm phiên trước [${lastTotal}] được áp dụng (Tỷ lệ T/X: ${sunwinRule.tai}/${sunwinRule.xiu})`);
    }

    // 3. Tính toán kết quả cuối cùng
    let finalTai = 0;
    let finalXiu = 0;

    if (patternRule && sunwinRule) {
        finalTai = (patternRule.tai * patternWeight) + (sunwinRule.tai * sunwinWeight);
        finalXiu = (patternRule.xiu * patternWeight) + (sunwinRule.xiu * sunwinWeight);
    } else if (patternRule) {
        finalTai = patternRule.tai;
        finalXiu = patternRule.xiu;
    } else if (sunwinRule) {
        finalTai = sunwinRule.tai;
        finalXiu = sunwinRule.xiu;
    } else {
        return { du_doan: "?", giai_thich: "Không tìm thấy quy tắc nào phù hợp.", ty_le: "N/A" };
    }
    
    let prediction = "?";
    let confidence = "0%";
    if (finalTai > finalXiu) {
        prediction = 'T';
        confidence = `${Math.round(finalTai)}%`;
    } else if (finalXiu > finalTai) {
        prediction = 'X';
        confidence = `${Math.round(finalXiu)}%`;
    }
    
    return {
        du_doan: prediction,
        giai_thich: reasons.join('; '),
        ty_le: confidence,
    };
}


// ===================================
// === WebSocket Client & Server Logic (Không đổi) ===
// ===================================
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
