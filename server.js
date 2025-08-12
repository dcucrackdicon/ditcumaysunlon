const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// ==================================================================
//               SỬA ĐỔI: THÊM DÒNG NÀY ĐỂ ĐỊNH DẠNG JSON
// ==================================================================
app.set('json spaces', 2); // Thêm dòng này để JSON hiển thị "dọc" (pretty-print)

const PORT = process.env.PORT || 5000;

// ==================================================================
//               TÍCH HỢP THUẬT TOÁN DỰ ĐOÁN PRO MAX
// ==================================================================
function predictTaiXiuChanLeTongProMax(history) {
    if (!history || history.length < 10) { throw new Error(`Yêu cầu tối thiểu 10 kết quả lịch sử`); }
    const analysisPeriods = { ultraShort: history.slice(-10), short: history.length >= 30 ? history.slice(-30) : history, medium: history.length >= 100 ? history.slice(-100) : history, long: history.length >= 500 ? history.slice(-500) : history };
    const analysisLayers = { basicStats: getWeightedStats(analysisPeriods), streak: getStreakAnalysis(analysisPeriods.ultraShort), patterns: getPatternAnalysis(analysisPeriods.medium), cycles: detectCycles(analysisPeriods.long), anomalies: detectAnomalies(history), trends: getTrendAnalysis(analysisPeriods) };
    return { taiXiu: synthesizePrediction('taiXiu', analysisLayers), chanLe: synthesizePrediction('chanLe', analysisLayers), tong: predictTong(analysisLayers), confidence: calculateConfidence(analysisLayers), analysisReport: generateAnalysisReport(analysisLayers) };
    function getWeightedStats(periods) {
      const stats = {}; const weightProfile = { ultraShort: 0.4, short: 0.3, medium: 0.2, long: 0.1 }; stats.tongDistribution = {};
      for (const [periodName, data] of Object.entries(periods)) {
        if (!data || data.length === 0) continue;
        const weight = weightProfile[periodName]; const periodStats = { tai: 0, xiu: 0, chan: 0, le: 0, tongDistribution: {} };
        data.forEach((item, index) => {
          const { Tong } = item; const isTai = Tong > 10; const isChan = Tong % 2 === 0;
          const itemWeight = weight * (0.5 + 0.5 * (index / data.length));
          if (isTai) periodStats.tai += itemWeight; else periodStats.xiu += itemWeight;
          if (isChan) periodStats.chan += itemWeight; else periodStats.le += itemWeight;
          periodStats.tongDistribution[Tong] = (periodStats.tongDistribution[Tong] || 0) + itemWeight;
        });
        for (const key of ['tai', 'xiu', 'chan', 'le']) { stats[key] = (stats[key] || 0) + periodStats[key]; }
        for (const [tong, count] of Object.entries(periodStats.tongDistribution)) { stats.tongDistribution[tong] = (stats.tongDistribution[tong] || 0) + count; }
      }
      return stats;
    }
    function getStreakAnalysis(data) {
      const analysis = { current: { tai: 0, xiu: 0, chan: 0, le: 0 }, max: { tai: 0, xiu: 0, chan: 0, le: 0 }, averages: { tai: 0, xiu: 0, chan: 0, le: 0 }};
      let lastTaiXiu = null, lastChanLe = null; let streakCounts = { tai: [], xiu: [], chan: [], le: [] }; let currentStreaks = { tai: 0, xiu: 0, chan: 0, le: 0 };
      data.forEach(item => {
          const { Tong } = item; const isTai = Tong > 10; const isChan = Tong % 2 === 0;
          if (lastTaiXiu !== null && isTai !== lastTaiXiu) { streakCounts[lastTaiXiu ? 'tai' : 'xiu'].push(currentStreaks[lastTaiXiu ? 'tai' : 'xiu']); currentStreaks.tai = 0; currentStreaks.xiu = 0; }
          currentStreaks[isTai ? 'tai' : 'xiu']++; lastTaiXiu = isTai;
          if (lastChanLe !== null && isChan !== lastChanLe) { streakCounts[lastChanLe ? 'chan' : 'le'].push(currentStreaks[lastChanLe ? 'chan' : 'le']); currentStreaks.chan = 0; currentStreaks.le = 0; }
          currentStreaks[isChan ? 'chan' : 'le']++; lastChanLe = isChan;
      });
      analysis.current = currentStreaks;
      for(const key of ['tai', 'xiu', 'chan', 'le']) {
          const streaks = streakCounts[key];
          analysis.max[key] = streaks.length > 0 ? Math.max(...streaks, analysis.current[key]) : analysis.current[key];
          analysis.averages[key] = streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;
      }
      return analysis;
    }
    function getPatternAnalysis(data) {
      const patternConfigs = [ { length: 3, minOccurrences: 2 }, { length: 5, minOccurrences: 2 }]; const patternResults = {};
      patternConfigs.forEach(config => {
        const { length } = config; if (data.length < length * 2) return;
        const patterns = {}; const currentPattern = data.slice(-length).map(e => (e.Tong > 10 ? 'T' : 'X')).join('');
        for (let i = 0; i <= data.length - length - 1; i++) {
          const pattern = data.slice(i, i + length).map(e => (e.Tong > 10 ? 'T' : 'X')).join('');
          const outcome = data[i + length].Tong > 10 ? 'T' : 'X';
          if (!patterns[pattern]) patterns[pattern] = { T: 0, X: 0, occurrences: 0 };
          patterns[pattern][outcome]++; patterns[pattern].occurrences++;
        }
        const validPatterns = Object.entries(patterns).filter(([_, stats]) => stats.occurrences >= config.minOccurrences);
        let bestMatch = null, bestScore = 0;
        validPatterns.forEach(([pattern, stats]) => {
          const similarity = calculatePatternSimilarity(currentPattern, pattern);
          const score = similarity * Math.log(stats.occurrences + 1);
          if (score > bestScore) { bestScore = score; bestMatch = { pattern, stats }; }
        });
        if (bestMatch) { patternResults[`length${length}`] = { currentPattern, bestMatch, confidence: bestScore, prediction: bestMatch.stats.T > bestMatch.stats.X ? 'Tài' : 'Xỉu' }; }
      });
      return patternResults;
    }
    function detectCycles(data) { return { detected: false, cycleLength: null, confidence: 0 }; }
    function detectAnomalies(data) {
      if(data.length < 10) return { count: 0, recentAnomalies: [], mean: 0, stdDev: 0 };
      const tongValues = data.map(item => item.Tong); const mean = tongValues.reduce((a, b) => a + b, 0) / tongValues.length;
      const stdDev = Math.sqrt(tongValues.map(n => Math.pow(n - mean, 2)).reduce((a, b) => a + b) / tongValues.length);
      const anomalies = []; const zScoreThreshold = 2.5;
      data.forEach((item, index) => {
        if (stdDev > 0) {
            const zScore = Math.abs((item.Tong - mean) / stdDev);
            if (zScore > zScoreThreshold) { anomalies.push({ index, tong: item.Tong, zScore, isRecent: index >= data.length - 10 }); }
        }
      });
      return { count: anomalies.length, recentAnomalies: anomalies.filter(a => a.isRecent), mean, stdDev };
    }
    function getTrendAnalysis(periods) {
        const trends = { taiXiu: { direction: 'neutral' }, chanLe: { direction: 'neutral' }};
        const getRatios = (data) => {
            if (!data || data.length < 2) return { taiRatio: 0.5, chanRatio: 0.5 };
            let tai = 0, chan = 0; data.forEach(item => { if (item.Tong > 10) tai++; if (item.Tong % 2 === 0) chan++; });
            return { taiRatio: tai / data.length, chanRatio: chan / data.length };
        };
        const ultraShortStats = getRatios(periods.ultraShort); const shortStats = getRatios(periods.short);
        const trendStrengthTX = ((ultraShortStats.taiRatio - shortStats.taiRatio) || 0) * 0.7;
        if (Math.abs(trendStrengthTX) > 0.05) trends.taiXiu.direction = trendStrengthTX > 0 ? 'up' : 'down';
        return trends;
    }
    function synthesizePrediction(type, analysis) {
      const weights = { basicStats: 0.4, streak: 0.3, patterns: 0.2, trends: 0.1 }; let score1 = 0, score2 = 0;
      if (type === 'taiXiu') {
          score1 += (analysis.basicStats.tai || 0) * weights.basicStats; score2 += (analysis.basicStats.xiu || 0) * weights.basicStats;
          const { current, max } = analysis.streak;
          if(max && max.tai > 0) score2 += (current.tai / max.tai) * weights.streak;
          if(max && max.xiu > 0) score1 += (current.xiu / max.xiu) * weights.streak;
          for (const [_, pattern] of Object.entries(analysis.patterns)) {
              if (pattern.prediction === 'Tài') score1 += (pattern.confidence || 0) * weights.patterns;
              else score2 += (pattern.confidence || 0) * weights.patterns;
          }
          if (analysis.trends.taiXiu.direction === 'up') score1 += weights.trends;
          else if (analysis.trends.taiXiu.direction === 'down') score2 += weights.trends;
          return score1 > score2 ? 'Tài' : 'Xỉu';
      } else { return 'Chẵn'; }
    }
    function calculatePatternSimilarity(p1, p2) { let m = 0; for (let i = 0; i < p1.length; i++) if (p1[i] === p2[i]) m++; return m / p1.length; }
    function predictTong(analysis) {
        if(!analysis.basicStats.tongDistribution) return []; const tongDistribution = {};
        for (const [tong, count] of Object.entries(analysis.basicStats.tongDistribution)) { tongDistribution[tong] = (tongDistribution[tong] || 0) + count * 0.6; }
        analysis.anomalies.recentAnomalies.forEach(anomaly => { if(tongDistribution[anomaly.tong]) tongDistribution[anomaly.tong] *= 0.5; });
        return Object.entries(tongDistribution).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tong]) => parseInt(tong));
    }
    function calculateConfidence(analysis) {
        let taiXiuConfidence = 0; const totalStats = (analysis.basicStats.tai || 0) + (analysis.basicStats.xiu || 0);
        if(totalStats > 0) taiXiuConfidence += Math.abs(analysis.basicStats.tai - analysis.basicStats.xiu) / totalStats * 40;
        const streakRatio = analysis.streak.current.tai > analysis.streak.current.xiu ? analysis.streak.current.tai / (analysis.streak.max.tai || 1) : analysis.streak.current.xiu / (analysis.streak.max.xiu || 1);
        taiXiuConfidence += Math.min(streakRatio, 1) * 25;
        const patternConf = Object.values(analysis.patterns).reduce((sum, p) => sum + (p.confidence || 0), 0);
        taiXiuConfidence += Math.min(patternConf, 1) * 20;
        if (analysis.trends.taiXiu.direction !== 'neutral') taiXiuConfidence += 15;
        return { taiXiu: Math.min(98, Math.round(50 + taiXiuConfidence / 2)), chanLe: 50 };
    }
}
// ==================================================================


// === Biến lưu trạng thái API và Thống kê ===
let apiResponseData = {
    id: "@ghetvietcode - @tranbinh012 - @Phucdzvl2222",
    Phien: null,
    Xuc_xac_1: null,
    Xuc_xac_2: null,
    Xuc_xac_3: null,
    Tong: null,
    Ket_qua: "Đang chờ...",
    Pattern: "",
    Du_doan: "Đang chờ...",
    result: "Chưa xác định",
    "Đúng": 0,
    "Sai": 0,
};

let id_phien_chua_co_kq = null;
let lichSuPhienDayDu = []; // ⭐ MỚI: Lưu lịch sử đầy đủ {Tong: ...} để phân tích
let duDoanHienTai = "Chờ phiên mới"; // ⭐ MỚI: Lưu dự đoán cho phiên sắp tới để so sánh

// === Tin nhắn khởi tạo WebSocket ===
const messagesToSend = [ [ 1, "MiniGame", "GM_fbbdbebndbbc", "123123p", { "info": "{\"ipAddress\":\"2402:800:62cd:cb7c:1a7:7a52:9c3e:c290\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuZG5lYmViYnMiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMTIxMDczMTUsImFmZklkIjoiR0VNV0lOIiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJnZW0iLCJ0aW1lc3RhbXAiOjE3NTQ5MjYxMDI1MjcsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjQwMjo4MDA6NjJjZDpjYjdjOjFhNzo3YTUyOjljM2U6YzI5MCIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMDEucG5nIiwicGxhdGZvcm1JZCI6NSwidXNlcklkIjoiN2RhNDlhNDQtMjlhYS00ZmRiLWJkNGMtNjU5OTQ5YzU3NDdkIiwicmVnVGltZSI6MTc1NDkyNjAyMjUxNSwicGhvbmUiOiIiLCJkZXBvc2l0IjpmYWxzZSwidXNlcm5hbWUiOiJHTV9mYmJkYmVibmRiYmMifQ.DAyEeoAnz8we-Qd0xS0tnqOZ8idkUJkxksBjr_Gei8A\",\"locale\":\"vi\",\"userId\":\"7da49a44-29aa-4fdb-bd4c-659949c5747d\",\"username\":\"GM_fbbdbebndbbc\",\"timestamp\":1754926102527,\"refreshToken\":\"7cc4ad191f4348849f69427a366ea0fd.a68ece9aa85842c7ba523170d0a4ae3e\"}", "signature": "53D9E12F910044B140A2EC659167512E2329502FE84A6744F1CD5CBA9B6EC04915673F2CBAE043C4EDB94DDF88F3D3E839A931100845B8F179106E1F44ECBB4253EC536610CCBD0CE90BD8495DAC3E8A9DBDB46FE49B51E88569A6F117F8336AC7ADC226B4F213ECE2F8E0996F2DD5515476C8275F0B2406CDF2987F38A6DA24" } ], [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }], [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }] ];

// === WebSocket ===
let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIxzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0", {
    headers: { "User-Agent": "Mozilla/5.0", "Origin": "https://play.sun.win" }
  });

  ws.on('open', () => {
    console.log('[✅] WebSocket kết nối');
    messagesToSend.forEach((msg, i) => {
      setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }, i * 600);
    });
    pingInterval = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, 15000);
  });

  ws.on('pong', () => { /* Ping OK */ });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (Array.isArray(data) && typeof data[1] === 'object') {
        const cmd = data[1].cmd;

        if (cmd === 1008 && data[1].sid) {
          id_phien_chua_co_kq = data[1].sid;
        }

        if (cmd === 1003 && data[1].gBB) {
          const { d1, d2, d3 } = data[1];
          const total = d1 + d2 + d3;
          const ketQuaThucTe = total > 10 ? "Tài" : "Xỉu"; // Chú ý: Sunwin dùng > 10, khác với >= 11

          // 1. So sánh kết quả với dự đoán trước đó để tính thắng/thua
          if (duDoanHienTai !== "Chờ phiên mới" && duDoanHienTai.includes('(') === false) {
            if (ketQuaThucTe === duDoanHienTai) {
                apiResponseData.result = "Đúng";
                apiResponseData["Đúng"]++;
            } else {
                apiResponseData.result = "Sai";
                apiResponseData["Sai"]++;
            }
          }

          // 2. Cập nhật lịch sử đầy đủ
          lichSuPhienDayDu.push({ Tong: total });
          if (lichSuPhienDayDu.length > 1000) lichSuPhienDayDu.shift();

          // 3. Tạo dự đoán mới cho phiên tiếp theo
          let duDoanMoi = "Đang chờ...";
          if (lichSuPhienDayDu.length < 10) {
            duDoanMoi = `Chờ đủ dữ liệu (${lichSuPhienDayDu.length}/10)`;
          } else {
            try {
              const predictionResult = predictTaiXiuChanLeTongProMax(lichSuPhienDayDu);
              const duDoanGoc = predictionResult.taiXiu;
              
              // !!! ĐẢO NGƯỢC DỰ ĐOÁN THEO YÊU CẦU !!!
              duDoanMoi = duDoanGoc === 'Tài' ? 'Xỉu' : 'Tài';
              console.log(`   [AI Phân tích] Dự đoán gốc: ${duDoanGoc} -> Đảo thành: ${duDoanMoi}`);

            } catch (error) {
              duDoanMoi = "Lỗi phân tích";
            }
          }
          duDoanHienTai = duDoanMoi; // Cập nhật dự đoán hiện tại cho lần so sánh sau

          // 4. Cập nhật toàn bộ đối tượng JSON để trả về cho API
          const patternString = lichSuPhienDayDu.map(p => p.Tong > 10 ? 'T' : 'X').slice(-20).join('');
          apiResponseData.Phien = id_phien_chua_co_kq;
          apiResponseData.Xuc_xac_1 = d1;
          apiResponseData.Xuc_xac_2 = d2;
          apiResponseData.Xuc_xac_3 = d3;
          apiResponseData.Tong = total;
          apiResponseData.Ket_qua = ketQuaThucTe;
          apiResponseData.Pattern = patternString;
          apiResponseData.Du_doan = duDoanHienTai;
          
          console.log(`Phiên #${apiResponseData.Phien}: ${ketQuaThucTe} (${total}) | Dự đoán trước: ${apiResponseData.result} | Thắng: ${apiResponseData['Đúng']} - Thua: ${apiResponseData['Sai']}`);
          id_phien_chua_co_kq = null;
        }
      }
    } catch (e) {
      console.error('[Lỗi]:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[🔌] WebSocket ngắt. Đang kết nối lại...');
    clearInterval(pingInterval);
    reconnectTimeout = setTimeout(connectWebSocket, 2500);
  });

  ws.on('error', (err) => {
    console.error('[❌] WebSocket lỗi:', err.message);
  });
}

// === API ===
app.get('/sunlon', (req, res) => {
  // Trả về đối tượng JSON đã được cập nhật liên tục và đã được định dạng
  res.json(apiResponseData);
});

app.get('/', (req, res) => {
  res.send(`<h2>🎯 Kết quả Sunwin Tài Xỉu (API Phân Tích)</h2><p><a href="/sunlon">Xem kết quả JSON tại /sunlon</a></p>`);
});

// === Khởi động server ===
app.listen(PORT, () => {
  console.log(`[🌐] Server chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
