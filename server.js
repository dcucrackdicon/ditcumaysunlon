// server.js

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
// Thay đổi import để gọi hàm masterPredictor từ thuật toán "Siêu Cấp"
const { masterPredictor } = require('./thuatoan.js');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// Mở rộng apiResponseData để hiển thị thêm thông tin từ thuật toán mới
let apiResponseData = {
    id: "Sunwin AI - Thuật Toán Siêu Cấp v2.0",
    phien: null,
    xuc_xac_1: null,
    xuc_xac_2: null,
    xuc_xac_3: null,
    tong: null,
    ket_qua: "",
    du_doan: "?",
    do_tin_cay: "0%",
    boi_canh: "Đang khởi động...", // Mới: Bối cảnh trận đấu
    phuong_phap: "Đang chờ phiên mới...", // Mới: Phương pháp chính
    ly_do: "Chưa có đủ dữ liệu để phân tích.", // Mới: Các yếu tố đóng góp
    tong_dung: 0,
    tong_sai: 0,
    ty_le_thang_lich_su: "0%",
    chuoi_ket_qua_gan_nhat: "",
    tong_phien_da_phan_tich: 0
};

const MAX_HISTORY_SIZE = 1000;
let currentSessionId = null;
let lastPredictionDisplay = "?"; // Chỉ lưu dự đoán dạng 'Tài'/'Xỉu' để so sánh
const fullHistory = []; // Lưu trữ lịch sử chi tiết, đây sẽ là đầu vào cho thuật toán mới

// Thông tin kết nối WebSocket (giữ nguyên)
const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 5000;
const PING_INTERVAL = 15000;

// Các message khởi tạo (giữ nguyên)
const initialMessages = [
    [1, "MiniGame", "GM_fbbdbebndbbc", "123123p", { "info": "{\"ipAddress\":\"2402:800:62cd:cb7c:1a7:7a52:9c3e:c290\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuZG5lYmViYnMiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTIxMDczMTUsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTQ5MjYxMDI1MjcsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwMjo4MDA6NjJjZDpjYjdjOjFhNzo3YTUyOjljM-M6YzI5MCIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMDEucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiN2RhNDlhNDQtMjlhYS00ZmRiLWJkNGMtNjU5OTQ5YzU3NDdkIiwicmVnVGltZSI6MTc1NDkyNjAyMjUxNSwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJHTV9mYmJkYmVibmRiYmMifQ.DAyEeoAnz8we-Qd0xS0tnqOZ8idkUJkxksBjr_Gei8A\",\"locale\":\"vi\",\"userId\":\"7da49a44-29aa-4fdb-bd4c-659949c5747d\",\"username\":\"GM_fbbdbebndbbc\",\"timestamp\":1754926102527,\"refreshToken\":\"7cc4ad191f4348849f69427a366ea0fd.a68ece9aa85842c7ba523170d0a4ae3e\"}", "signature": "53D9E12F910044B140A2EC659167512E2329502FE84A6744F1CD5CBA9B6EC04915673F2CBAE043C4EDB94DDF88F3D3E839A931100845B8F179106E1F44ECBB4253EC536610CCBD0CE90BD8495DAC3E8A9DBDB46FE49B51E88569A6F117F8336AC7ADC226B4F213ECE2F8E0996F2DD5515476C8275F0B2406CDF2987F38A6DA24"}],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let ws = null;
let pingInterval = null;

function connectWebSocket() {
    // ... (phần này giữ nguyên không đổi)
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
            }, i * 500);
        });
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) ws.ping();
        }, PING_INTERVAL);
    });

    ws.on('pong', () => console.log('[📶] Ping OK.'));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;

            const { cmd, sid, d1, d2, d3 } = data[1];

            if (cmd === 1008 && sid) {
                currentSessionId = sid;
            }

            if (cmd === 1003 && d1 != null && d2 != null && d3 != null) {
                const total = d1 + d2 + d3;
                // Chuẩn hóa dữ liệu ngay từ đầu
                const resultInternal = (total > 10) ? "T" : "X";
                const resultDisplay = (total > 10) ? "Tài" : "Xỉu";
                
                let correctnessStatus = null;
                // So sánh kết quả với dự đoán của phiên TRƯỚC
                if (lastPredictionDisplay !== "?") {
                    if (lastPredictionDisplay === resultDisplay) {
                        apiResponseData.tong_dung++;
                        correctnessStatus = "ĐÚNG";
                    } else {
                        apiResponseData.tong_sai++;
                        correctnessStatus = "SAI";
                    }
                }

                const totalGames = apiResponseData.tong_dung + apiResponseData.tong_sai;
                apiResponseData.ty_le_thang_lich_su = totalGames === 0 ? "0%" : `${((apiResponseData.tong_dung / totalGames) * 100).toFixed(0)}%`;

                // **Quan trọng: Cập nhật lịch sử với cả điểm và kết quả dạng 'T'/'X'**
                const historyEntry = { 
                    session: currentSessionId || 'N/A', 
                    d1, d2, d3, totalScore: total, 
                    result: resultInternal, // Thuật toán cần 'T'/'X'
                    predictionForThisSession: lastPredictionDisplay,
                    correctness: correctnessStatus
                };
                fullHistory.push(historyEntry);
                if (fullHistory.length > MAX_HISTORY_SIZE) fullHistory.shift();
                
                // **Gọi thuật toán "Siêu Cấp" với lịch sử chi tiết**
                const newPredictionResult = masterPredictor(fullHistory);
                
                // **Cập nhật dữ liệu API với kết quả của phiên VỪA XONG**
                apiResponseData.phien = historyEntry.session;
                apiResponseData.xuc_xac_1 = d1;
                apiResponseData.xuc_xac_2 = d2;
                apiResponseData.xuc_xac_3 = d3;
                apiResponseData.tong = total;
                apiResponseData.ket_qua = resultDisplay;

                // **Lưu và hiển thị dự đoán cho phiên SẮP TỚI**
                apiResponseData.du_doan = newPredictionResult.prediction; // đã là 'Tài'/'Xỉu' hoặc '...'
                apiResponseData.do_tin_cay = `${newPredictionResult.confidence.toFixed(0)}%`;
                apiResponseData.boi_canh = newPredictionResult.context || 'N/A';
                apiResponseData.phuong_phap = newPredictionResult.method || 'N/A';
                apiResponseData.ly_do = newPredictionResult.contributingFactors || 'N/A';
                
                // Cập nhật các thông tin khác
                apiResponseData.chuoi_ket_qua_gan_nhat = fullHistory.map(h => h.result).slice(-50).join('');
                apiResponseData.tong_phien_da_phan_tich = fullHistory.length;

                // Lưu lại dự đoán mới để kiểm tra ở vòng lặp sau
                lastPredictionDisplay = newPredictionResult.prediction;
                currentSessionId = null;
                
                console.log(`Phiên #${apiResponseData.phien}: ${apiResponseData.tong} (${resultDisplay}) | Dự đoán mới: ${apiResponseData.du_doan} | Tin cậy: ${apiResponseData.do_tin_cay} (${apiResponseData.boi_canh}) | Thắng: ${apiResponseData.ty_le_thang_lich_su}`);
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        // ... (phần này giữ nguyên)
        console.log(`[🔌] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}. Reconnecting in ${RECONNECT_DELAY / 1000}s...`);
        clearInterval(pingInterval);
        setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        // ... (phần này giữ nguyên)
        console.error('[❌] WebSocket error:', err.message);
        ws.close();
    });
}

// API endpoint để lấy dữ liệu JSON (giữ nguyên)
app.get('/sunlon', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(apiResponseData, null, 4));
});

// API endpoint để xem lịch sử phiên (Cập nhật để hiển thị đúng)
app.get('/history', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let html = `
        <style>
            body { font-family: 'Courier New', Courier, monospace; background-color: #121212; color: #e0e0e0; padding: 20px; }
            h2 { color: #4e8af4; border-bottom: 2px solid #4e8af4; padding-bottom: 10px; }
            .container { max-width: 800px; margin: auto; }
            .entry { border: 1px solid #333; padding: 10px; margin-bottom: 10px; background-color: #1e1e1e; border-radius: 5px; }
            .tai, .dung { color: #28a745; font-weight: bold; }
            .xiu, .sai { color: #dc3545; font-weight: bold; }
            .status { margin-left: 10px; font-size: 0.9em; }
            b { color: #f0ad4e; }
        </style>
        <div class="container">
            <h2>Lịch sử ${fullHistory.length} phiên gần nhất</h2>`;

    if (fullHistory.length === 0) {
        html += '<p>Chưa có dữ liệu lịch sử.</p>';
    } else {
        [...fullHistory].reverse().forEach(h => {
            // Chuyển đổi 'T'/'X' từ lịch sử sang 'Tài'/'Xỉu' để hiển thị
            const resultDisplayForHistory = h.result === 'T' ? 'Tài' : 'Xỉu';
            const resultClass = resultDisplayForHistory === 'Tài' ? 'tai' : 'xiu';
            
            let statusHtml = '';
            if (h.correctness === "ĐÚNG") {
                statusHtml = ` <span class="status dung">✅ ĐÚNG</span>`;
            } else if (h.correctness === "SAI") {
                statusHtml = ` <span class="status sai">❌ SAI</span>`;
            }

            html += `
                <div class="entry">
                    <b>Phiên:</b> ${h.session}<br/>
                    <b>Dự đoán cho phiên này:</b> ${h.predictionForThisSession}${statusHtml}<br/>
                    <b>Kết quả:</b> <span class="${resultClass}">${resultDisplayForHistory}</span> (Tổng: ${h.totalScore})<br/>
                    <b>Xúc xắc:</b> [${h.d1}]-[${h.d2}]-[${h.d3}]
                </div>`;
        });
    }
    html += '</div>';
    res.send(html);
});

// Trang chủ (giữ nguyên)
app.get('/', (req, res) => {
    res.send(`
        <h2 style="font-family: sans-serif; color: #333;">🎯 API Phân Tích Sunwin Tài Xỉu</h2>
        <p style="font-family: sans-serif;">Sử dụng Thuật Toán Siêu Cấp v2.0</p>
        <p style="font-family: sans-serif;">Xem kết quả JSON: <a href="/sunlon">/sunlon</a></p>
        <p style="font-family: sans-serif;">Xem lịch sử các phiên gần nhất: <a href="/history">/history</a></p>`);
});

app.listen(PORT, () => {
    console.log('[🚀] Đã kích hoạt Thuật Toán Siêu Cấp v2.0!');
    console.log(`[🌐] Server đang chạy tại http://localhost:${PORT}`);
    connectWebSocket();
});
