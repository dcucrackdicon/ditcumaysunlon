/**
 * thuatoan.js
 * Phiên bản "Bắt Cầu Toàn Diện".
 * Bổ sung cầu 1-2 lặp lại và cầu gánh 2-1-2.
 * Bắt đầu dự đoán từ phiên 5.
 */

// --- CÁC HÀM PHÂN TÍCH (Không thay đổi) ---
function analyzeStreak(history) {
    if (history.length === 0) return { streak: 0, currentResult: null, breakProb: 0.0 };
    let streak = 1;
    const currentResult = history[history.length - 1].result;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === currentResult) streak++; else break;
    }
    let breakProb = 0.0;
    if (streak >= 7) breakProb = 0.90;
    else if (streak >= 5) breakProb = 0.75 + (streak - 5) * 0.07;
    else if (streak >= 3) breakProb = 0.40 + (streak - 3) * 0.1;
    return { streak, currentResult, breakProb };
}
function analyzeStatistics(history) {
    const results = history.map(h => h.result);
    const scores = history.map(h => h.totalScore);
    const taiCount = results.filter(r => r === 'Tài').length;
    const xiuCount = results.length - taiCount;
    const taiRatio = taiCount / results.length;
    const switches = results.slice(1).reduce((count, curr, idx) => count + (curr !== results[idx] ? 1 : 0), 0);
    const switchRate = results.length > 1 ? switches / (results.length - 1) : 0;
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const scoreStdDev = Math.sqrt(scores.map(x => Math.pow(x - avgScore, 2)).reduce((a, b) => a + b) / scores.length);
    return { taiCount, xiuCount, taiRatio, imbalance: Math.abs(taiCount - xiuCount) / results.length, switchRate, avgScore, scoreStdDev };
}
function analyzePatterns(history, patternLength = 3) {
    const results = history.map(h => h.result);
    if (results.length < patternLength + 1) return { prediction: null, confidence: 0 };
    const lastPattern = results.slice(-patternLength).join('-');
    const occurrences = { 'Tài': 0, 'Xỉu': 0, 'total': 0 };
    for (let i = 0; i <= results.length - (patternLength + 1); i++) {
        const currentSlice = results.slice(i, i + patternLength).join('-');
        if (currentSlice === lastPattern) {
            const nextResult = results[i + patternLength];
            occurrences[nextResult]++;
            occurrences.total++;
        }
    }
    if (occurrences.total < 2) return { prediction: null, confidence: 0, reason: "Không tìm thấy mẫu hình lặp lại đủ mạnh." };
    const taiProb = occurrences['Tài'] / occurrences.total;
    const xiuProb = occurrences['Xỉu'] / occurrences.total;
    const prediction = taiProb > xiuProb ? 'Tài' : 'Xỉu';
    const confidence = Math.max(taiProb, xiuProb);
    return { prediction, confidence, reason: `Mẫu [${lastPattern}] đã xuất hiện ${occurrences.total} lần, thường dẫn đến ${prediction} (${(confidence * 100).toFixed(0)}%)` };
}

// --- CLASS DỰ ĐOÁN CHÍNH ---

class MasterPredictor {
    constructor() {
        this.history = [];
        this.MAX_HISTORY_SIZE = 200;
    }

    async updateData(newResult) {
        const formattedResult = {
            totalScore: newResult.score,
            result: newResult.result
        };
        this.history.push(formattedResult);

        if (this.history.length > this.MAX_HISTORY_SIZE) {
            this.history.shift();
        }
    }

    async predict() {
        if (this.history.length < 5) {
            return {
                prediction: "?",
                confidence: 0,
                reason: `Đang chờ đủ 5 phiên để bắt đầu. Hiện có: ${this.history.length} phiên.`
            };
        }

        const r = this.history.map(h => h.result);
        const r1 = r[r.length - 1], r2 = r[r.length - 2], r3 = r[r.length - 3];
        const r4 = r[r.length - 4], r5 = r[r.length - 5], r6 = r[r.length - 6];

        // --- ƯU TIÊN 1: CÁC CẦU ĐẶC BIỆT ---
        if (r.length >= 6) {
            // Cầu 3-3: (VD: T-T-T-X-X-X -> Dự đoán T)
            if (r1 === r2 && r2 === r3 && r4 === r5 && r5 === r6 && r1 !== r4) {
                 return { prediction: r4, confidence: 0.88, reason: `Phát hiện cầu 3-3, bẻ cầu.` };
            }
            // MỚI: Cầu 1-2 lặp lại (VD: T-XX-T-XX -> Dự đoán T)
            if (r1 === r2 && r1 !== r3 && r4 === r5 && r4 !== r6 && r3 === r6) {
                return { prediction: r3, confidence: 0.87, reason: `Phát hiện cầu 1-2 lặp lại, theo cầu.`};
            }
        }
        
        if (r.length >= 5) {
            // Cầu gánh 2-1-1-2
            if (r1 === r4 && r2 === r3 && r1 !== r2 && r4 !== r5) {
                 return { prediction: r1, confidence: 0.86, reason: `Phát hiện cầu gánh 2-1-1-2, theo đối xứng.` };
            }
            // MỚI: Cầu gánh 2-1-2 (VD: T-T-X-T -> Dự đoán T)
            if (r1 === r4 && r3 === r1 && r3 !== r2) {
                return { prediction: r1, confidence: 0.85, reason: `Phát hiện cầu gánh 2-1-2, theo đối xứng.`};
            }
        }

        // Cầu 2-2
        if (r1 === r2 && r3 === r4 && r1 !== r3) {
             return { prediction: r3, confidence: 0.82, reason: `Phát hiện cầu 2-2, bẻ cầu.` };
        }
        
        // --- ƯU TIÊN 2: CÁC CẦU CƠ BẢN ---
        // Cầu bệt dài (3+ phiên)
        if (r1 === r2 && r2 === r3) {
            return { prediction: r1, confidence: 0.85, reason: `Phát hiện cầu bệt dài ${r1}, đi theo cầu.` };
        }

        // Cầu 1-1
        if (r1 !== r2 && r1 === r3) {
            return { prediction: r2, confidence: 0.80, reason: `Phát hiện cầu 1-1, đi theo cầu.` };
        }

        // Cầu bệt non (2 phiên)
        if (r1 === r2 && r1 !== r3) {
            return { prediction: r1, confidence: 0.75, reason: `Phát hiện cầu bệt non ${r1}, đi theo cầu.` };
        }

        // --- MẶC ĐỊNH: DỰ ĐOÁN NGẪU NHIÊN ---
        const prediction = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
        const confidence = 0.50;
        const reason = `Không có cầu rõ ràng, dự đoán ngẫu nhiên là ${prediction}.`;
        
        return { prediction, confidence, reason };
    }
}

module.exports = { MasterPredictor };
