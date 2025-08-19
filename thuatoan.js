/**
 * thuatoan.js (Phiên bản Nâng Cấp)
 * Thuật toán dự đoán Tài/Xỉu được đóng gói trong class MasterPredictor.
 * Tương thích hoàn toàn với server.js được cung cấp.
 *
 * --- CÁC CẢI TIẾN CHÍNH ---
 * 1.  **Phân tích cầu dựa trên dữ liệu (Data-Driven Streak Analysis):** Loại bỏ xác suất bẻ cầu cố định.
 * Thay vào đó, thuật toán sẽ tìm trong lịch sử xem các cầu có độ dài tương tự đã "gãy" hay "theo" bao nhiêu lần.
 * 2.  **Nhận diện mẫu cầu kinh điển:** Thêm logic để phát hiện các cầu phổ biến như 1-1, 2-2, 3-1-3...
 * 3.  **Hệ thống tính điểm có trọng số rõ ràng:** Các hằng số trọng số được định nghĩa để dễ dàng tinh chỉnh.
 * 4.  **Logic "Thị trường nghiêng":** Thay vì luôn dự đoán ngược lại khi có sự mất cân bằng, thuật toán sẽ xem xét
 * liệu đó là một xu hướng cần theo hay một sự bất thường cần điều chỉnh.
 */

// --- CÁC HẰNG SỐ ĐỂ TINH CHỈNH (TUNING CONSTANTS) ---
// Việc đặt các giá trị này ra ngoài giúp bạn dễ dàng thử nghiệm và thay đổi "tính cách" của bot.
const WEIGHTS = {
    STREAK_ANALYSIS: 1.5,   // Trọng số cho phân tích cầu bệt (dài)
    PATTERN_3: 1.2,         // Trọng số cho mẫu 3 ký tự
    PATTERN_4: 1.4,         // Trọng số cho mẫu 4 ký tự (mạnh hơn)
    COMMON_BRIDGE: 1.8,     // Trọng số rất cao cho các cầu kinh điển (1-1, 2-2)
    STATISTICAL_BALANCE: 0.7, // Trọng số cho việc dự đoán cân bằng lại
    STATISTICAL_TREND: 0.9,   // Trọng số cho việc đi theo xu hướng thị trường
};

// --- CÁC HÀM PHÂN TÍCH CỐT LÕI (HELPERS) ---

/**
 * CẢI TIẾN: Phân tích chuỗi (streak) dựa trên dữ liệu lịch sử.
 * Thay vì giả định xác suất bẻ, nó sẽ tìm trong quá khứ xem các chuỗi tương tự đã kết thúc như thế nào.
 * @param {Array<Object>} history - Lịch sử đã chuẩn hóa.
 * @returns {Object} Thông tin về chuỗi và dự đoán dựa trên lịch sử.
 */
function analyzeDynamicStreak(history) {
    if (history.length < 5) return { prediction: null, confidence: 0 };

    let streak = 1;
    const currentResult = history[history.length - 1].result;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === currentResult) {
            streak++;
        } else {
            break;
        }
    }

    if (streak < 3) return { prediction: null, confidence: 0 }; // Chỉ phân tích các chuỗi đủ dài

    const occurrences = { follow: 0, break: 0, total: 0 };
    for (let i = 0; i <= history.length - (streak + 1); i++) {
        let isMatch = true;
        // Kiểm tra xem có chuỗi tương tự trong quá khứ không
        for (let j = 0; j < streak; j++) {
            if (history[i + j].result !== currentResult) {
                isMatch = false;
                break;
            }
        }
        // Đảm bảo rằng chuỗi này bắt đầu bằng một kết quả khác (là một chuỗi hoàn chỉnh)
        if (i > 0 && history[i - 1].result === currentResult) {
            isMatch = false;
        }

        if (isMatch) {
            occurrences.total++;
            const nextResult = history[i + streak].result;
            if (nextResult === currentResult) {
                occurrences.follow++;
            } else {
                occurrences.break++;
            }
        }
    }

    if (occurrences.total < 2) { // Cần ít nhất 2 lần xuất hiện trong lịch sử để có ý nghĩa
        return { prediction: null, confidence: 0, reason: `Chuỗi ${streak} ${currentResult} mới, chưa có dữ liệu lịch sử.` };
    }

    const breakProb = occurrences.break / occurrences.total;
    const followProb = occurrences.follow / occurrences.total;
    const breakPrediction = currentResult === 'Tài' ? 'Xỉu' : 'Tài';

    if (breakProb > followProb) {
        return {
            prediction: breakPrediction,
            confidence: breakProb,
            reason: `Lịch sử cho thấy chuỗi ${streak} ${currentResult} đã gãy ${occurrences.break}/${occurrences.total} lần.`
        };
    } else {
        return {
            prediction: currentResult,
            confidence: followProb,
            reason: `Lịch sử cho thấy chuỗi ${streak} ${currentResult} đã đi tiếp ${occurrences.follow}/${occurrences.total} lần.`
        };
    }
}

/**
 * Phân tích các mẫu hình (pattern) lặp lại.
 * @param {Array<Object>} history - Lịch sử đã chuẩn hóa.
 * @param {number} patternLength - Độ dài của mẫu hình cần tìm.
 * @returns {Object} { prediction: string, confidence: number, reason: string }
 */
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

    if (occurrences.total < 2) {
        return { prediction: null, confidence: 0, reason: `Mẫu [${lastPattern}] không đủ dữ liệu.` };
    }

    const taiProb = occurrences['Tài'] / occurrences.total;
    const xiuProb = occurrences['Xỉu'] / occurrences.total;
    const prediction = taiProb > xiuProb ? 'Tài' : 'Xỉu';
    const confidence = Math.max(taiProb, xiuProb);

    return {
        prediction,
        confidence,
        reason: `Mẫu [${lastPattern}] xuất hiện ${occurrences.total} lần, thường dẫn đến ${prediction} (${(confidence * 100).toFixed(0)}%)`
    };
}

/**
 * MỚI: Phân tích các dạng cầu kinh điển (1-1, 2-2, v.v.).
 * @param {Array<Object>} history - Lịch sử đã chuẩn hóa.
 * @returns {Object} Dự đoán nếu phát hiện cầu rõ ràng.
 */
function analyzeCommonBridges(history) {
    const results = history.map(h => h.result);
    if (results.length < 6) return { prediction: null, confidence: 0 };

    const last6 = results.slice(-6).join('');
    const last5 = results.slice(-5).join('');
    const last4 = results.slice(-4).join('');

    // Cầu 1-1 (TX TX TX)
    if (last5 === 'TX' + 'TX' + 'T' || last5 === 'XT' + 'XT' + 'X') {
        const nextResult = last5[last5.length - 1] === 'T' ? 'X' : 'T';
        return { prediction: nextResult, confidence: 0.9, reason: 'Phát hiện cầu 1-1 rất rõ ràng.' };
    }

    // Cầu 2-2 (TT XX TT)
    if (last6 === 'TTXXTT' || last6 === 'XXTTXX') {
        const nextResult = last6.slice(-2) === 'TT' ? 'X' : 'T';
        return { prediction: nextResult, confidence: 0.85, reason: 'Phát hiện cầu 2-2 đang chạy.' };
    }
    
    // Cầu 3-1 (TTT X TTT)
    if(last5 === 'TTTXT' || last5 === 'XXXTX') {
        return { prediction: last5[0], confidence: 0.8, reason: 'Phát hiện cầu 3-1.' };
    }

    return { prediction: null, confidence: 0 };
}


/**
 * Phân tích các chỉ số thống kê trong một khoảng lịch sử nhất định.
 * @param {Array<Object>} history - Lịch sử đã chuẩn hóa.
 * @returns {Object} Các chỉ số thống kê.
 */
function analyzeStatistics(history) {
    if (history.length === 0) return {};
    const results = history.map(h => h.result);
    const taiCount = results.filter(r => r === 'Tài').length;
    const xiuCount = results.length - taiCount;

    return {
        taiRatio: taiCount / results.length,
        imbalance: Math.abs(taiCount - xiuCount) / results.length,
    };
}


// --- CLASS DỰ ĐOÁN CHÍNH ---

class MasterPredictor {
    constructor() {
        this.history = [];
        this.MAX_HISTORY_SIZE = 300; // Tăng lịch sử để phân tích sâu hơn
    }

    async updateData(newResult) {
        this.history.push({
            totalScore: newResult.score,
            result: newResult.result
        });
        if (this.history.length > this.MAX_HISTORY_SIZE) {
            this.history.shift();
        }
    }

    async predict() {
        if (this.history.length < 30) { // Chờ nhiều dữ liệu hơn để quyết định chính xác hơn
            return {
                prediction: "?",
                confidence: 0,
                reason: `Đang chờ đủ 30 phiên để phân tích. Hiện có: ${this.history.length} phiên.`
            };
        }

        let taiScore = 0;
        let xiuScore = 0;
        const reasons = [];

        // Lấy các khoảng lịch sử khác nhau cho các mục đích phân tích khác nhau
        const fullHistory = this.history;
        const last50 = this.history.slice(-50); // Dùng cho thống kê và mẫu ngắn
        
        // --- CHẠY CÁC MODULE PHÂN TÍCH ---
        const bridgeInfo = analyzeCommonBridges(fullHistory);
        const streakInfo = analyzeDynamicStreak(fullHistory);
        const pattern4 = analyzePatterns(last50, 4);
        const pattern3 = analyzePatterns(last50, 3);
        const stats = analyzeStatistics(last50);

        // BƯỚC 1: ƯU TIÊN CÁC CẦU KINH ĐIỂN (ĐỘ TIN CẬY CAO NHẤT)
        if (bridgeInfo.confidence > 0.8) {
            reasons.push(`[Cầu Kinh Điển] ${bridgeInfo.reason}`);
            if (bridgeInfo.prediction === 'Tài') taiScore += WEIGHTS.COMMON_BRIDGE; else xiuScore += WEIGHTS.COMMON_BRIDGE;
        }

        // BƯỚC 2: PHÂN TÍCH CẦU BỆT (STREAK)
        if (streakInfo.confidence > 0.6) { // Chỉ xem xét nếu có đủ dữ liệu lịch sử
             reasons.push(`[Cầu Bệt] ${streakInfo.reason}`);
             const weight = WEIGHTS.STREAK_ANALYSIS * streakInfo.confidence;
             if (streakInfo.prediction === 'Tài') taiScore += weight; else xiuScore += weight;
        }
        
        // BƯỚC 3: PHÂN TÍCH MẪU HÌNH (PATTERN)
        if (pattern4.confidence > 0.75) {
            reasons.push(`[Mẫu 4] ${pattern4.reason}`);
            const weight = WEIGHTS.PATTERN_4 * pattern4.confidence;
            if (pattern4.prediction === 'Tài') taiScore += weight; else xiuScore += weight;
        } else if (pattern3.confidence > 0.7) { // Chỉ dùng mẫu 3 nếu mẫu 4 không rõ ràng
             reasons.push(`[Mẫu 3] ${pattern3.reason}`);
             const weight = WEIGHTS.PATTERN_3 * pattern3.confidence;
             if (pattern3.prediction === 'Tài') taiScore += weight; else xiuScore += weight;
        }

        // BƯỚC 4: PHÂN TÍCH THỐNG KÊ (XU HƯỚNG VÀ CÂN BẰNG)
        if (stats.imbalance > 0.3) { // 30% chênh lệch, tức là tỉ lệ khoảng 65/35
            const dominant = stats.taiRatio > 0.5 ? 'Tài' : 'Xỉu';
            const lastResult = this.history[this.history.length-1].result;
            
            // Nếu kết quả gần nhất đang theo phe đa số -> có thể là xu hướng -> theo
            if(dominant === lastResult) {
                reasons.push(`[Xu Hướng] ${dominant} đang chiếm ưu thế (${(stats.taiRatio * 100).toFixed(0)}%) và đang trên đà, ưu tiên theo.`);
                const weight = WEIGHTS.STATISTICAL_TREND * stats.imbalance;
                if(dominant === 'Tài') taiScore += weight; else xiuScore += weight;
            } 
            // Ngược lại, có thể là dấu hiệu đảo chiều -> bẻ
            else {
                reasons.push(`[Cân Bằng] ${dominant} đang chiếm ưu thế (${(stats.taiRatio * 100).toFixed(0)}%), có khả năng thị trường sẽ điều chỉnh.`);
                const weight = WEIGHTS.STATISTICAL_BALANCE * stats.imbalance;
                if(dominant === 'Tài') xiuScore += weight; else taiScore += weight;
            }
        }


        // --- RA QUYẾT ĐỊNH CUỐI CÙNG ---
        let finalPrediction;
        let confidence;

        if (taiScore === 0 && xiuScore === 0) {
            // Chiến lược dự phòng: Đánh ngẫu nhiên hoặc ngược lại với kết quả cuối
            finalPrediction = this.history[this.history.length - 1].result === 'Tài' ? 'Xỉu' : 'Tài';
            confidence = 0.40;
            reasons.push('[Dự phòng] Không có tín hiệu rõ ràng, dự đoán ngược lại phiên trước.');
        } else {
            finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
            const totalScore = taiScore + xiuScore;
            // Công thức tính confidence mới: dựa trên sự chênh lệch điểm, nhưng được chuẩn hóa
            // để điểm càng cao thì confidence càng lớn.
            const confidenceScore = Math.abs(taiScore - xiuScore) / totalScore;
            confidence = 0.5 + (confidenceScore * 0.45); // Ánh xạ ra khoảng [0.5, 0.95]
        }

        return {
            prediction: finalPrediction,
            confidence: Math.min(confidence, 0.95), // Giới hạn confidence tối đa
            reason: reasons.length > 0 ? reasons.join(' | ') : "Không có tín hiệu cụ thể."
        };
    }
}

// Export class để server.js có thể require()
module.exports = { MasterPredictor };
