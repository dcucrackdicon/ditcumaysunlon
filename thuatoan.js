// thuatoan.js

/**
 * GHI CHÚ:
 * File này chứa toàn bộ logic AI để dự đoán.
 * - Input: Nhận vào một mảng `history` chứa lịch sử các phiên.
 * (Mỗi phần tử là một object: { session, result: 'Tài'/'Xỉu', totalScore })
 * - Output: Trả về một object { prediction: 'Tài'/'Xỉu', reason: 'Giải thích...' }
 */

// Biến cục bộ để lưu trạng thái của các mô hình, không export ra ngoài
let modelPredictions = {
    trend: {},
    short: {},
    mean: {},
    switch: {},
    bridge: {}
};

// ===================================
// === CÁC HÀM PHÂN TÍCH PHỤ TRỢ ===
// ===================================

function detectStreakAndBreak(history) {
    if (!history || history.length === 0) return { streak: 0, currentResult: null, breakProb: 0.0 };
    let streak = 1;
    const currentResult = history[history.length - 1].result;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === currentResult) {
            streak++;
        } else {
            break;
        }
    }
    const last15 = history.slice(-15).map(h => h.result);
    if (!last15.length) return { streak, currentResult, breakProb: 0.0 };
    const switches = last15.slice(1).reduce((count, curr, idx) => count + (curr !== last15[idx] ? 1 : 0), 0);
    const taiCount = last15.filter(r => r === 'Tài').length;
    const xiuCount = last15.filter(r => r === 'Xỉu').length;
    const imbalance = Math.abs(taiCount - xiuCount) / last15.length;
    let breakProb = 0.0;
    if (streak >= 6) {
        breakProb = Math.min(0.8 + (switches / 15) + imbalance * 0.3, 0.95);
    } else if (streak >= 4) {
        breakProb = Math.min(0.5 + (switches / 12) + imbalance * 0.25, 0.9);
    } else if (streak >= 2 && switches >= 5) {
        breakProb = 0.45;
    } else if (streak === 1 && switches >= 6) {
        breakProb = 0.3;
    }
    return { streak, currentResult, breakProb };
}

function evaluateModelPerformance(history, modelName, lookback = 10) {
    if (!modelPredictions[modelName] || history.length < 2) return 1.0;
    lookback = Math.min(lookback, history.length - 1);
    let correctCount = 0;
    for (let i = 0; i < lookback; i++) {
        const pred = modelPredictions[modelName][history[history.length - (i + 2)].session] || 0;
        const actual = history[history.length - (i + 1)].result;
        if ((pred === 1 && actual === 'Tài') || (pred === 2 && actual === 'Xỉu')) {
            correctCount++;
        }
    }
    const performanceScore = lookback > 0 ? 1.0 + (correctCount - lookback / 2) / (lookback / 2) : 1.0;
    return Math.max(0.0, Math.min(2.0, performanceScore));
}

function smartBridgeBreak(history) {
    if (!history || history.length < 5) return { prediction: 0, breakProb: 0.0, reason: 'Không đủ dữ liệu' };
    const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
    const last20 = history.slice(-20).map(h => h.result);
    let breakProbability = breakProb;
    let reason = '';
    if (streak >= 6) {
        breakProbability = Math.min(breakProbability + 0.3, 0.95);
        reason = `Bẻ cầu: Chuỗi ${streak} ${currentResult} quá dài`;
    } else {
        reason = `Theo cầu: Chuỗi ${streak} ${currentResult} chưa có dấu hiệu gãy`;
    }
    let prediction = breakProbability > 0.5 ? (currentResult === 'Tài' ? 2 : 1) : (currentResult === 'Tài' ? 1 : 2);
    return { prediction, breakProb: breakProbability, reason };
}

function aiHtddLogic(history) {
    const { streak, currentResult } = detectStreakAndBreak(history);

    if (streak >= 2 && streak <= 4) {
        return { prediction: currentResult, reason: `AI nhận định cầu ngắn ${streak} ${currentResult}, đi theo cầu.` };
    }

    if (history.length >= 3) {
        const last3 = history.slice(-3).map(h => h.result);
        if (last3.join(',') === 'Tài,Xỉu,Tài') {
            return { prediction: 'Xỉu', reason: 'AI phát hiện mẫu cầu 1-1 (T-X-T), dự đoán bẻ sang Xỉu.' };
        }
        if (last3.join(',') === 'Xỉu,Tài,Xỉu') {
            return { prediction: 'Tài', reason: 'AI phát hiện mẫu cầu 1-1 (X-T-X), dự đoán bẻ sang Tài.' };
        }
    }
    
    if (history.length >= 4) {
        const last4 = history.slice(-4).map(h => h.result);
        if (last4.join(',') === 'Tài,Tài,Xỉu,Xỉu') {
            return { prediction: 'Tài', reason: 'AI phát hiện mẫu cầu 2-2 (T-T-X-X), dự đoán lặp lại cặp Tài.' };
        }
        if (last4.join(',') === 'Xỉu,Xỉu,Tài,Tài') {
            return { prediction: 'Xỉu', reason: 'AI phát hiện mẫu cầu 2-2 (X-X-T-T), dự đoán lặp lại cặp Xỉu.' };
        }
    }
    
    // Sửa lỗi placeholder "aaaaaaaaaaaaaaaaaaaaaaaaaa"
    if (history.length >= 7 && history.slice(-7).every(h => h.result === 'Xỉu')) {
        return { prediction: 'Tài', reason: 'AI nhận định cầu bệt Xỉu đã quá dài (7+), dự đoán bẻ sang Tài.' };
    } 
    if (history.length >= 7 && history.slice(-7).every(h => h.result === 'Tài')) {
        return { prediction: 'Xỉu', reason: 'AI nhận định cầu bệt Tài đã quá dài (7+), dự đoán bẻ sang Xỉu.' };
    }
    
    // Mặc định: Bẻ cầu (ngược lại phiên trước)
    const lastResult = history[history.length - 1].result;
    const opposite = lastResult === 'Tài' ? 'Xỉu' : 'Tài';
    return {
        prediction: opposite,
        reason: "Các cầu không rõ ràng, AI ưu tiên dự đoán ngược lại với phiên trước."
    };
}


// ===================================
// === HÀM CHÍNH ĐỂ EXPORT ===
// ===================================

/**
 * Hàm chính để đưa ra dự đoán.
 * @param {Array<Object>} history - Lịch sử các phiên.
 * @returns {Object} - { prediction: 'Tài'|'Xỉu', reason: String }
 */
function getPrediction(history) {
    const MIN_HISTORY_FOR_PREDICTION = 5; // Yêu cầu: 5 phiên để bắt đầu dự đoán

    if (!history || history.length < MIN_HISTORY_FOR_PREDICTION) {
        return {
            prediction: "?",
            reason: "Đang chờ đủ dữ liệu để phân tích..."
        };
    }

    // Ở đây, chúng ta sẽ sử dụng logic đơn giản nhất từ `aiHtddLogic` làm trọng tâm
    // để code dễ hiểu và bảo trì hơn. Bạn có thể kết hợp các hàm khác nếu muốn.
    const predictionResult = aiHtddLogic(history);

    return {
        prediction: predictionResult.prediction,
        reason: predictionResult.reason
    };
}

// Export hàm chính để Server.js có thể gọi
module.exports = {
    getPrediction
};
