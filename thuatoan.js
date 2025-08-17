/**
 * thuatoan.js
 * Phiên bản "Bắt Cầu Thông Minh & Ngẫu Nhiên Đảo Ngược".
 * Ưu tiên 1: Bắt cầu bệt dài (3+).
 * Ưu tiên 2: Bắt cầu 1-1.
 * Ưu tiên 3: Bắt cầu bệt non (2).
 * Mặc định: NGẪU NHIÊN & ĐẢO NGƯỢC.
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

        const last = this.history[this.history.length - 1].result;
        const secondLast = this.history[this.history.length - 2].result;
        const thirdLast = this.history[this.history.length - 3].result;

        // --- ƯU TIÊN 1: KIỂM TRA CẦU BỆT DÀI (3+ phiên) ---
        if (last === secondLast && secondLast === thirdLast) {
            return {
                prediction: last,
                confidence: 0.85,
                reason: `Phát hiện cầu bệt dài ${last} (3+ phiên), đi theo cầu.`
            };
        }

        // --- ƯU TIÊN 2: KIỂM TRA CẦU 1-1 ---
        if (last !== secondLast && last === thirdLast) {
            return {
                prediction: secondLast,
                confidence: 0.80,
                reason: `Phát hiện cầu 1-1 (${thirdLast}-${secondLast}-${last}), đi theo cầu.`
            };
        }

        // --- ƯU TIÊN 3: KIỂM TRA CẦU BỆT NON (2 phiên) ---
        if (last === secondLast && last !== thirdLast) {
            return {
                prediction: last,
                confidence: 0.75,
                reason: `Phát hiện cầu bệt non ${last} (2 phiên), đi theo cầu.`
            };
        }

        // --- MẶC ĐỊNH MỚI: NGẪU NHIÊN & ĐẢO NGƯỢC ---
        // Nếu không có cầu rõ ràng, tạo một dự đoán ngẫu nhiên rồi đảo ngược nó.
        
        // Bước 1: Tạo một dự đoán ngẫu nhiên (Tài hoặc Xỉu)
        const randomPrediction = Math.random() < 0.5 ? 'Tài' : 'Xỉu';

        // Bước 2: Đảo ngược dự đoán ngẫu nhiên đó
        const finalPrediction = randomPrediction === 'Tài' ? 'Xỉu' : 'Tài';
        
        const confidence = 0.50; // Độ tin cậy là 50/50 vì đây là ngẫu nhiên
        const reason = `Không có cầu rõ ràng, dự đoán ngẫu nhiên đảo ngược (${randomPrediction} -> ${finalPrediction}).`;
        
        return { 
            prediction: finalPrediction, 
            confidence, 
            reason 
        };
    }
}

module.exports = { MasterPredictor };
