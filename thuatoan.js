/**
 * ==================================================================================
 * BỘ NÃO DỰ ĐOÁN TÀI XỈU PHIÊN BẢN "SIÊU CẤP"
 * ==================================================================================
 * Author: GPT-4 & Gemini Advanced
 * Version: 2.0.0
 * Description:
 * Thuật toán này là sự kết hợp và nâng cấp toàn diện từ 5แนวคิด thuật toán khác nhau.
 * Nó được thiết kế với cấu trúc module, khả năng tự điều chỉnh trọng số và nhận định
 * bối cảnh trận đấu để tăng cường độ chính xác.
 *
 * Các tầng phân tích chính:
 * 1. Tầng Phân Tích Cốt Lõi (Core Analysis): Các chỉ số cơ bản nhưng hiệu quả.
 * 2. Tầng Phân Tích Nâng Cao (Advanced Analysis): Các mẫu phức tạp và yếu tố ẩn.
 * 3. Tầng Nhận Định Bối Cảnh (Contextual Engine): "Cảm nhận" nhịp độ trận đấu.
 * 4. Tầng Ra Quyết Định (Decision Synthesis): Tổng hợp thông tin và đưa ra kết quả.
 *
 * Yêu cầu: Tối thiểu 20 phiên để hoạt động ổn định.
 * ==================================================================================
 */

/**
 * ----------------------------------------------------------------------------------
 * PHẦN I: BỘ CẤU HÌNH TRUNG TÂM (CENTRAL CONFIGURATION)
 * ----------------------------------------------------------------------------------
 * Thay đổi các tham số tại đây để tinh chỉnh hành vi của thuật toán mà không
 * cần sửa logic bên dưới.
 */
const CONFIG = {
    // Yêu cầu lịch sử tối thiểu để bắt đầu dự đoán
    MIN_HISTORY_REQUIRED: 20,

    // Các ngưỡng và cửa sổ phân tích
    BALANCE_WINDOW: 25,         // Số phiên gần nhất để xét tính cân bằng
    SCORE_ANALYSIS_WINDOW: 15,  // Số phiên gần nhất để xét điểm số
    VOLATILITY_WINDOW: 20,      // Số phiên gần nhất để đo sự biến động
    STREAK_BREAK_THRESHOLD: 4,  // Chuỗi được coi là "dài" và có khả năng gãy

    // Trọng số cơ bản cho các mô hình (sẽ được điều chỉnh động)
    BASE_WEIGHTS: {
        markov: 1.0,
        streak: 1.2,
        balance: 1.1,
        patterns: 1.3,
        scores: 0.9,
        volatility: 0.8,
    },
};

/**
 * ----------------------------------------------------------------------------------
 * PHẦN II: CÁC MODULE PHÂN TÍCH ĐỘC LẬP (ANALYSIS MODULES)
 * ----------------------------------------------------------------------------------
 * Mỗi hàm là một "chuyên gia" phân tích một khía cạnh cụ thể của dữ liệu.
 * Chúng trả về một object chứa { prediction, confidence, details }.
 */

/**
 * @description Phân tích chuỗi Markov: "Nếu 2 lần trước là A, B thì lần này khả năng cao là gì?"
 * @param {Array} history - Lịch sử các phiên.
 * @returns {Object} Phân tích từ mô hình Markov.
 */
function analyzeMarkovChains(history) {
    if (history.length < 3) return { prediction: null, confidence: 0 };
    const transitions = { 'TT': { T: 0, X: 0 }, 'TX': { T: 0, X: 0 }, 'XT': { T: 0, X: 0 }, 'XX': { T: 0, X: 0 } };
    for (let i = 2; i < history.length; i++) {
        const prev = history[i - 2].result + history[i - 1].result;
        const current = history[i].result;
        if (transitions[prev]) transitions[prev][current]++;
    }
    const lastTwo = history.slice(-2).map(h => h.result).join('');
    const counts = transitions[lastTwo];
    if (!counts || (counts.T === 0 && counts.X === 0)) return { prediction: null, confidence: 0 };
    const total = counts.T + counts.X;
    const prediction = counts.T > counts.X ? 'T' : 'X';
    const confidence = Math.abs(counts.T - counts.X) / total;
    return { prediction, confidence, details: `Markov(${lastTwo}) -> ${prediction}` };
}

/**
 * @description Phân tích chuỗi (Cầu): "Cầu đang dài hay ngắn? Nên theo hay bẻ?"
 * @param {Array} history - Lịch sử các phiên.
 * @returns {Object} Phân tích về chuỗi hiện tại.
 */
function analyzeStreak(history) {
    if (history.length < 2) return { prediction: null, confidence: 0 };
    let streak = 1;
    const currentResult = history[history.length - 1].result;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === currentResult) streak++;
        else break;
    }

    if (streak >= CONFIG.STREAK_BREAK_THRESHOLD) {
        const breakConfidence = Math.min(0.4 + (streak - CONFIG.STREAK_BREAK_THRESHOLD) * 0.15, 0.9);
        return {
            prediction: currentResult === 'T' ? 'X' : 'T',
            confidence: breakConfidence,
            type: 'break',
            details: `Bẻ cầu ${currentResult} (dài ${streak})`
        };
    } else {
        const continueConfidence = 0.15 + streak * 0.1;
        return {
            prediction: currentResult,
            confidence: continueConfidence,
            type: 'continue',
            details: `Theo cầu ${currentResult} (dài ${streak})`
        };
    }
}

/**
 * @description Phân tích cân bằng: "Tài và Xỉu có đang quá chênh lệch không?"
 * @param {Array} history - Lịch sử các phiên.
 * @returns {Object} Phân tích về sự cân bằng.
 */
function analyzeBalance(history) {
    const window = Math.min(history.length, CONFIG.BALANCE_WINDOW);
    const recentHistory = history.slice(-window);
    const taiCount = recentHistory.filter(r => r.result === 'T').length;
    const imbalance = (taiCount - window / 2) / (window / 2);

    if (Math.abs(imbalance) > 0.45) { // Chênh lệch trên 22.5%
        return {
            prediction: imbalance > 0 ? 'X' : 'T',
            confidence: Math.abs(imbalance) * 0.9,
            details: `Cân bằng (lệch ${imbalance > 0 ? 'Tài' : 'Xỉu'} ${(Math.abs(imbalance) * 50).toFixed(0)}%)`
        };
    }
    return { prediction: null, confidence: 0 };
}

/**
 * @description Phân tích mẫu lặp: "Có quy luật nào đang lặp lại không? (ví dụ: T-X-T, T-T-X,...)"
 * @param {Array} history - Lịch sử các phiên.
 * @returns {Object} Phân tích về các mẫu.
 */
function analyzePatterns(history) {
    if (history.length < 5) return { prediction: null, confidence: 0 };
    const results = history.map(h => h.result);
    const patterns = {};
    for (let i = 0; i < results.length - 4; i++) {
        const p = results.slice(i, i + 4).join('');
        const next = results[i + 4];
        if (!patterns[p]) patterns[p] = { T: 0, X: 0, count: 0 };
        patterns[p][next]++;
        patterns[p].count++;
    }
    const lastPattern = results.slice(-4).join('');
    const data = patterns[lastPattern];
    if (!data || data.count < 2) return { prediction: null, confidence: 0 };
    const total = data.T + data.X;
    const prediction = data.T > data.X ? 'T' : 'X';
    const confidence = (Math.abs(data.T - data.X) / total) * (1 - 1 / (data.count + 1));
    return { prediction, confidence, details: `Mẫu (${lastPattern})` };
}

/**
 * @description Phân tích điểm số: "Tổng điểm các ván gần đây cao hay thấp?"
 * @param {Array} history - Lịch sử các phiên.
 * @returns {Object} Phân tích dựa trên điểm số.
 */
function analyzeScores(history) {
    if (history.length < CONFIG.SCORE_ANALYSIS_WINDOW) return { prediction: null, confidence: 0 };
    const scores = history.slice(-CONFIG.SCORE_ANALYSIS_WINDOW).map(h => h.totalScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgScore > 12.8 || avgScore < 8.2) {
        return {
            prediction: avgScore > 10.5 ? 'T' : 'X',
            confidence: Math.abs(avgScore - 10.5) / 7.5,
            details: `Điểm TB cao/thấp (${avgScore.toFixed(1)})`
        };
    }
    return { prediction: null, confidence: 0 };
}

/**
 * @description Phân tích độ biến động: "Trận đấu đang ổn định hay 'loạn'?"
 * @param {Array} history - Lịch sử các phiên.
 * @returns {Number} Chỉ số biến động (0-1).
 */
function calculateVolatility(history) {
    const window = Math.min(history.length, CONFIG.VOLATILITY_WINDOW);
    const recentResults = history.slice(-window).map(h => h.result);
    let switches = 0;
    for (let i = 1; i < recentResults.length; i++) {
        if (recentResults[i] !== recentResults[i - 1]) {
            switches++;
        }
    }
    // 0 = hoàn toàn ổn định (cầu bệt), 1 = loạn (cầu 1-1)
    return switches / (window - 1);
}

/**
 * ----------------------------------------------------------------------------------
 * PHẦN III: BỘ MÁY NHẬN ĐỊNH BỐI CẢNH (CONTEXTUAL ENGINE)
 * ----------------------------------------------------------------------------------
 * "Đọc vị" trạng thái hiện tại của ván cược để điều chỉnh chiến lược.
 */
function determineGameContext(history, analyses, volatility) {
    const streakInfo = analyses.streak;

    if (streakInfo.type === 'break' && streakInfo.confidence > 0.6) {
        return 'CẦU BỆT DÀI'; // Long streak, high chance to break
    }
    if (streakInfo.streak >= 3) {
        return 'CẦU ỔN ĐỊNH'; // Stable streak, likely to continue
    }
    if (volatility > 0.75) {
        return 'LOẠN CẦU 1-1'; // Very high volatility, likely 1-1 pattern
    }
    if (volatility < 0.25) {
        return 'CẦU NGẮN BỀN'; // Low volatility, short stable patterns
    }
    return 'TRẠNG THÁI HỖN HỢP'; // Mixed signals
}


/**
 * ----------------------------------------------------------------------------------
 * PHẦN IV: BỘ NÃO TỔNG HỢP VÀ RA QUYẾT ĐỊNH (MASTER PREDICTOR)
 * ----------------------------------------------------------------------------------
 * "Bộ chỉ huy" cuối cùng, tổng hợp mọi thông tin để đưa ra dự đoán.
 */
function masterPredictor(history) {
    if (!history || history.length < CONFIG.MIN_HISTORY_REQUIRED) {
        return {
            prediction: "...",
            confidence: 0,
            context: "KHỞI ĐỘNG",
            primaryMethod: "Cần thêm dữ liệu",
            contributingFactors: `Cần ${CONFIG.MIN_HISTORY_REQUIRED} phiên, hiện có ${history.length}.`
        };
    }

    // === Tầng 1: Thu thập thông tin ===
    const analyses = {
        markov: analyzeMarkovChains(history),
        streak: analyzeStreak(history),
        balance: analyzeBalance(history),
        patterns: analyzePatterns(history),
        scores: analyzeScores(history),
    };
    const volatility = calculateVolatility(history);

    // === Tầng 2: Nhận định bối cảnh ===
    const context = determineGameContext(history, analyses, volatility);
    const dynamicWeights = { ...CONFIG.BASE_WEIGHTS };

    // === Tầng 3: Điều chỉnh trọng số động theo bối cảnh ===
    switch (context) {
        case 'CẦU BỆT DÀI':
            dynamicWeights.streak *= 2.5; // Tăng mạnh cho việc bẻ cầu
            dynamicWeights.balance *= 1.5;
            dynamicWeights.markov *= 0.3; // Các yếu tố khác kém tin cậy hơn
            dynamicWeights.patterns *= 0.3;
            break;
        case 'CẦU ỔN ĐỊNH':
            dynamicWeights.streak *= 2.0; // Tăng mạnh cho việc theo cầu
            dynamicWeights.markov *= 1.2;
            dynamicWeights.balance *= 0.5; // Giảm yếu tố cân bằng
            break;
        case 'LOẠN CẦU 1-1':
            dynamicWeights.volatility *= 2.0;
            dynamicWeights.markov *= 1.5; // Markov (TX, XT) rất mạnh trong trường hợp này
            dynamicWeights.streak *= 0.1; // Chuỗi gần như vô dụng
            dynamicWeights.balance *= 1.2;
            break;
        case 'TRẠNG THÁI HỖN HỢP':
            // Giữ trọng số cơ bản, nhưng giảm nhẹ nếu biến động cao
            if (volatility > 0.6) {
                Object.keys(dynamicWeights).forEach(k => dynamicWeights[k] *= 0.8);
            }
            break;
    }

    // === Tầng 4: Tổng hợp điểm và ra quyết định ===
    let taiScore = 0;
    let xiuScore = 0;
    const contributingFactors = [];

    for (const modelName in analyses) {
        const result = analyses[modelName];
        if (result.prediction && result.confidence > 0.1) {
            const score = result.confidence * dynamicWeights[modelName];
            if (result.prediction === 'T') taiScore += score;
            else xiuScore += score;
            
            if (result.confidence > 0.5) { // Chỉ ghi nhận các yếu tố có ảnh hưởng đáng kể
                 contributingFactors.push(`${result.details}: ${(result.confidence * 100).toFixed(0)}%`);
            }
        }
    }
    
    // Xử lý trường hợp không có tín hiệu mạnh
    if (taiScore === 0 && xiuScore === 0) {
        const lastRes = history[history.length - 1].result;
        return {
            prediction: lastRes === 'T' ? 'Tài' : 'Xỉu',
            confidence: 35,
            context: context,
            primaryMethod: 'Dự phòng',
            contributingFactors: 'Không có tín hiệu rõ ràng, theo kết quả cuối cùng.'
        };
    }
    
    const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
    const totalScore = taiScore + xiuScore;
    let finalConfidence = (Math.abs(taiScore - xiuScore) / totalScore) * 100;

    // Hiệu chỉnh độ tin cậy cuối cùng dựa trên sự biến động
    finalConfidence *= (1 - (volatility * 0.2)); // Giảm tối đa 20% độ tin cậy nếu thị trường loạn
    finalConfidence = Math.min(Math.round(finalConfidence), 96); // Giới hạn max 96%
    
    // Xác định phương pháp chính đã đóng góp nhiều nhất
    let primaryMethod = "Tổng hợp đa mô hình";
    if (dynamicWeights.streak * analyses.streak.confidence > totalScore * 0.4) {
        primaryMethod = analyses.streak.details;
    }

    return {
        prediction: finalPrediction,
        confidence: finalConfidence,
        context: context,
        primaryMethod: primaryMethod,
        contributingFactors: contributingFactors.join(' | ') || 'Đồng thuận từ các mô hình yếu.'
    };
}


/**
 * ==================================================================================
 * PHẦN V: EXPORT MODULE
 * ==================================================================================
 * Xuất hàm chính `masterPredictor` để file `server.js` có thể gọi và sử dụng.
 */
module.exports = {
    masterPredictor
};
