/**
 * thuatoan.js (Phiên bản Siêu Tốc 10 phiên)
 * Bắt đầu dự đoán từ phiên thứ 10.
 *
 * --- LOGIC 2 CHẾ ĐỘ ---
 * - Chế độ Nhanh (10-29 phiên): Dùng logic đơn giản, tập trung vào cầu ngắn và các mẫu gần nhất. RỦI RO CAO HƠN.
 * - Chế độ Sâu (30+ phiên): Kích hoạt đầy đủ các phân tích phức tạp để có độ chính xác tốt nhất.
 */

// --- CÁC HẰNG SỐ ĐỂ TINH CHỈNH ---
const WEIGHTS = {
    // Trọng số cho Chế độ Sâu (30+ phiên)
    DEEP_STREAK_ANALYSIS: 1.5,
    DEEP_PATTERN_4: 1.4,
    DEEP_COMMON_BRIDGE: 1.8,
    DEEP_STATISTICAL_TREND: 0.9,
    // Trọng số cho Chế độ Nhanh (10-29 phiên)
    QUICK_MOMENTUM: 1.5,      // Theo chuỗi ngắn (2-3 phiên)
    QUICK_REVERSAL: 1.2,      // Bẻ cầu 1-1
    QUICK_PATTERN_2: 1.0,     // Theo mẫu 2 ký tự đơn giản
};


// --- CÁC HÀM PHÂN TÍCH (Giữ nguyên từ phiên bản trước) ---

function analyzeDynamicStreak(history) {
    if (history.length < 5) return { prediction: null, confidence: 0 };
    let streak = 1;
    const currentResult = history[history.length - 1].result;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === currentResult) streak++; else break;
    }
    if (streak < 3) return { prediction: null, confidence: 0 };
    const occurrences = { follow: 0, break: 0, total: 0 };
    for (let i = 0; i <= history.length - (streak + 1); i++) {
        let isMatch = true;
        for (let j = 0; j < streak; j++) {
            if (history[i + j].result !== currentResult) { isMatch = false; break; }
        }
        if (i > 0 && history[i - 1].result === currentResult) { isMatch = false; }
        if (isMatch) {
            occurrences.total++;
            const nextResult = history[i + streak].result;
            if (nextResult === currentResult) occurrences.follow++; else occurrences.break++;
        }
    }
    if (occurrences.total < 2) return { prediction: null, confidence: 0, reason: `Chuỗi ${streak} ${currentResult} mới.` };
    const breakProb = occurrences.break / occurrences.total;
    const followProb = occurrences.follow / occurrences.total;
    if (breakProb > followProb) {
        return { prediction: currentResult === 'Tài' ? 'Xỉu' : 'Tài', confidence: breakProb, reason: `Lịch sử cho thấy chuỗi ${streak} ${currentResult} đã gãy ${occurrences.break}/${occurrences.total} lần.` };
    } else {
        return { prediction: currentResult, confidence: followProb, reason: `Lịch sử cho thấy chuỗi ${streak} ${currentResult} đã đi tiếp ${occurrences.follow}/${occurrences.total} lần.` };
    }
}

function analyzePatterns(history, patternLength = 3) {
    const results = history.map(h => h.result);
    if (results.length < patternLength + 1) return { prediction: null, confidence: 0 };
    const lastPattern = results.slice(-patternLength).join('');
    const occurrences = { 'Tài': 0, 'Xỉu': 0, 'total': 0 };
    for (let i = 0; i <= results.length - (patternLength + 1); i++) {
        const currentSlice = results.slice(i, i + patternLength).join('');
        if (currentSlice === lastPattern) {
            const nextResult = results[i + patternLength];
            occurrences[nextResult]++;
            occurrences.total++;
        }
    }
    if (occurrences.total < 2) return { prediction: null, confidence: 0 };
    const taiProb = occurrences['Tài'] / occurrences.total;
    const xiuProb = occurrences['Xỉu'] / occurrences.total;
    const prediction = taiProb > xiuProb ? 'Tài' : 'Xỉu';
    const confidence = Math.max(taiProb, xiuProb);
    return { prediction, confidence, reason: `Mẫu [${lastPattern}] -> ${prediction} (${(confidence * 100).toFixed(0)}%)` };
}

function analyzeCommonBridges(history) {
    const results = history.map(h => h.result);
    if (results.length < 5) return { prediction: null, confidence: 0 };
    const last5 = results.slice(-5).join('');
    const last4 = results.slice(-4).join('');
    if (last4 === 'TXTX' || last4 === 'XTXT') {
        return { prediction: last4[0], confidence: 0.9, reason: 'Phát hiện cầu 1-1 rõ ràng.' };
    }
    if (last4 === 'TTXX' || last4 === 'XXTT') {
        return { prediction: last4[0], confidence: 0.85, reason: 'Phát hiện cầu 2-2 đang chạy.' };
    }
    return { prediction: null, confidence: 0 };
}


// --- CLASS DỰ ĐOÁN CHÍNH ---

class MasterPredictor {
    constructor() {
        this.history = [];
        this.MAX_HISTORY_SIZE = 200;
    }

    async updateData(newResult) {
        this.history.push({ totalScore: newResult.score, result: newResult.result });
        if (this.history.length > this.MAX_HISTORY_SIZE) this.history.shift();
    }

    async predict() {
        const historyLength = this.history.length;
        if (historyLength < 10) {
            return {
                prediction: "?",
                confidence: 0,
                reason: `Đang chờ đủ 10 phiên. Hiện có: ${historyLength} phiên.`
            };
        }

        // --- TỰ ĐỘNG CHỌN CHẾ ĐỘ DỰ ĐOÁN ---
        if (historyLength < 30) {
            return this.predictQuickMode(); // Chế độ nhanh cho các phiên sớm
        } else {
            return this.predictDeepMode(); // Chế độ sâu khi có đủ dữ liệu
        }
    }

    /**
     * CHẾ ĐỘ NHANH (10-29 PHIÊN): Logic đơn giản, rủi ro cao.
     */
    predictQuickMode() {
        let taiScore = 0;
        let xiuScore = 0;
        const reasons = [];
        const results = this.history.map(h => h.result);
        const last3 = results.slice(-3).join('');
        const last2 = results.slice(-2).join('');
        const lastResult = results[results.length - 1];

        // 1. Phân tích cầu 1-1 (T-X-T -> X)
        if (last3.length === 3 && last3[0] === last3[2] && last3[0] !== last3[1]) {
            const prediction = last3[1];
            reasons.push(`[Cầu 1-1] Mẫu ${last3} rất có khả năng ra ${prediction}.`);
            if (prediction === 'Tài') taiScore += WEIGHTS.QUICK_REVERSAL; else xiuScore += WEIGHTS.QUICK_REVERSAL;
        }

        // 2. Phân tích chuỗi ngắn (bệt 2, 3)
        if (last2 === 'TT' || last2 === 'XX') {
            reasons.push(`[Theo Bệt] Đang có chuỗi ${lastResult}, ưu tiên theo.`);
            if (lastResult === 'Tài') taiScore += WEIGHTS.QUICK_MOMENTUM; else xiuScore += WEIGHTS.QUICK_MOMENTUM;
        }
        
        // 3. Phân tích mẫu 2 ký tự đơn giản
        const pattern2 = analyzePatterns(this.history, 2);
        if (pattern2.confidence > 0.65) {
            reasons.push(`[Mẫu 2] ${pattern2.reason}`);
            if (pattern2.prediction === 'Tài') taiScore += WEIGHTS.QUICK_PATTERN_2; else xiuScore += WEIGHTS.QUICK_PATTERN_2;
        }

        // Ra quyết định cuối cùng cho chế độ nhanh
        return this.finalizePrediction(taiScore, xiuScore, reasons, 'Nhanh');
    }

    /**
     * CHẾ ĐỘ SÂU (30+ PHIÊN): Phân tích toàn diện, độ tin cậy cao hơn.
     */
    predictDeepMode() {
        let taiScore = 0;
        let xiuScore = 0;
        const reasons = [];
        
        const bridgeInfo = analyzeCommonBridges(this.history);
        const streakInfo = analyzeDynamicStreak(this.history);
        const pattern4 = analyzePatterns(this.history, 4);

        if (bridgeInfo.confidence > 0.8) {
            reasons.push(`[Cầu Kinh Điển] ${bridgeInfo.reason}`);
            if (bridgeInfo.prediction === 'Tài') taiScore += WEIGHTS.DEEP_COMMON_BRIDGE; else xiuScore += WEIGHTS.DEEP_COMMON_BRIDGE;
        }
        if (streakInfo.confidence > 0.6) {
             reasons.push(`[Cầu Bệt] ${streakInfo.reason}`);
             const weight = WEIGHTS.DEEP_STREAK_ANALYSIS * streakInfo.confidence;
             if (streakInfo.prediction === 'Tài') taiScore += weight; else xiuScore += weight;
        }
        if (pattern4.confidence > 0.75) {
            reasons.push(`[Mẫu 4] ${pattern4.reason}`);
            const weight = WEIGHTS.DEEP_PATTERN_4 * pattern4.confidence;
            if (pattern4.prediction === 'Tài') taiScore += weight; else xiuScore += weight;
        }

        // Ra quyết định cuối cùng cho chế độ sâu
        return this.finalizePrediction(taiScore, xiuScore, reasons, 'Sâu');
    }

    /**
     * Hàm tổng hợp và trả về kết quả cuối cùng
     */
    finalizePrediction(taiScore, xiuScore, reasons, mode) {
        let finalPrediction;
        let confidence;

        if (taiScore === xiuScore) {
            finalPrediction = this.history[this.history.length - 1].result === 'Tài' ? 'Xỉu' : 'Tài';
            confidence = 0.51;
            reasons.push('[Hòa điểm] Không có tín hiệu rõ ràng, dự đoán ngược lại.');
        } else {
            finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
            const totalScore = taiScore + xiuScore;
            const confidenceScore = Math.abs(taiScore - xiuScore) / totalScore;
            confidence = 0.5 + (confidenceScore * 0.45);
        }
        
        const reasonText = `[Chế độ ${mode}] ${reasons.join(' | ')}`;
        return {
            prediction: finalPrediction,
            confidence: Math.min(confidence, 0.95),
            reason: reasons.length > 0 ? reasonText : `[Chế độ ${mode}] Không có tín hiệu.`,
        };
    }
}

module.exports = { MasterPredictor };
