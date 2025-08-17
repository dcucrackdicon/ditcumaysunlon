/**
 * thuatoan.js
 * Phiên bản "Đảo Ngược".
 * Thuật toán sẽ chờ đủ 5 phiên và sau đó luôn dự đoán ngược lại
 * kết quả của phiên gần nhất (Tài -> Xỉu, Xỉu -> Tài).
 */

// --- CÁC HÀM PHÂN TÍCH (Không được sử dụng trong phiên bản này) ---
// Giữ lại các hàm này nếu bạn muốn quay lại thuật toán cũ sau này.
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
        this.MAX_HISTORY_SIZE = 200; // Giới hạn lịch sử để tối ưu bộ nhớ
    }

    /**
     * Cập nhật lịch sử với kết quả của phiên vừa kết thúc.
     * @param {Object} newResult - Dữ liệu phiên mới, ví dụ: { score: 12, result: 'Tài' }
     */
    async updateData(newResult) {
        const formattedResult = {
            totalScore: newResult.score,
            result: newResult.result
        };
        this.history.push(formattedResult);

        // Giữ cho lịch sử không quá dài
        if (this.history.length > this.MAX_HISTORY_SIZE) {
            this.history.shift();
        }
    }

    /**
     * Thực hiện dự đoán cho phiên tiếp theo.
     * @returns {Promise<Object>} - Đối tượng dự đoán, ví dụ: { prediction: 'Xỉu', confidence: 0.85, reason: '...' }
     */
    async predict() {
        // BƯỚC 1: KIỂM TRA ĐIỀU KIỆN (Yêu cầu 5 phiên)
        if (this.history.length < 5) {
            return {
                prediction: "?",
                confidence: 0,
                reason: `Đang chờ đủ 5 phiên để bắt đầu. Hiện có: ${this.history.length} phiên.`
            };
        }

        // BƯỚC 2: THỰC HIỆN DỰ ĐOÁN "ĐẢO NGƯỢC"
        // Lấy kết quả của phiên gần nhất.
        const lastResult = this.history[this.history.length - 1].result;

        // Đảo ngược kết quả đó để ra dự đoán mới.
        const prediction = lastResult === 'Tài' ? 'Xỉu' : 'Tài';

        // Đặt một độ tin cậy cố định cho chiến lược này.
        const confidence = 0.80; // 80%

        const reason = `Dự đoán đảo ngược kết quả phiên trước (${lastResult} -> ${prediction}).`;

        // BƯỚC 3: TRẢ VỀ KẾT QUẢ
        return {
            prediction: prediction,
            confidence: confidence,
            reason: reason
        };
    }
}

// Export class để server.js có thể require()
module.exports = { MasterPredictor };
