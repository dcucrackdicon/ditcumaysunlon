// thuatoan.js

// Phân tích chuỗi Markov
function analyzeMarkovChains(history) {
    const transitions = {
        'TT': { T: 0, X: 0 },
        'TX': { T: 0, X: 0 },
        'XT': { T: 0, X: 0 },
        'XX': { T: 0, X: 0 }
    };

    // Bắt đầu từ index 2 vì cần 2 phần tử trước đó
    for (let i = 2; i < history.length; i++) {
        const prev = history[i-2] + history[i-1];
        const current = history[i];
        if (transitions[prev]) {
            transitions[prev][current]++;
        }
    }

    const lastTwo = history.slice(-2).join('');
    const counts = transitions[lastTwo];

    // Nếu chưa từng gặp chuỗi 2 ký tự này, không thể dự đoán
    if (!counts || (counts.T === 0 && counts.X === 0)) {
        return { prediction: null, confidence: 0 };
    }

    const total = counts.T + counts.X;
    const prediction = counts.T > counts.X ? "T" : "X";
    const confidence = Math.round(Math.max(counts.T, counts.X) / total * 100);

    return { prediction, confidence };
}

// Phân tích xu hướng ngắn hạn
function analyzeShortTermTrend(history) {
    const last5 = history.slice(-5);
    if (last5.length < 5) return { prediction: null, confidence: 0 };

    const taiCount = last5.filter(r => r === "T").length;
    const xiuCount = 5 - taiCount;

    // Nếu có 4 hoặc 5 Tài, dự đoán đảo ngược thành Xỉu
    if (taiCount >= 4) {
        return { prediction: "X", confidence: 70 + (taiCount - 4) * 10 }; // Độ tin cậy tăng nếu là 5
    }
    // Nếu có 4 hoặc 5 Xỉu, dự đoán đảo ngược thành Tài
    if (xiuCount >= 4) {
        return { prediction: "T", confidence: 70 + (xiuCount - 4) * 10 };
    }

    // Nếu không có xu hướng rõ ràng, không đưa ra dự đoán từ hàm này
    return { prediction: null, confidence: 0 };
}

// Phát hiện chu kỳ dài
function detectLongCycle(history) {
    if (history.length < 15) return { prediction: null, confidence: 0 };
    
    const last15 = history.slice(-15);
    // Các mẫu phổ biến cần tìm
    const patterns = [
        { pattern: ["T", "X"], name: "TX" },
        { pattern: ["T", "T", "X"], name: "TTX" },
        { pattern: ["T", "X", "X"], name: "TXX" },
        { pattern: ["T", "T", "X", "X"], name: "TTXX" },
        { pattern: ["T", "X", "T", "X"], name: "TXTX" },
    ];

    let bestMatch = { prediction: null, confidence: 0, pattern: null };

    patterns.forEach(p => {
        let matches = 0;
        for (let i = 0; i <= last15.length - p.pattern.length; i++) {
            const segment = last15.slice(i, i + p.pattern.length);
            if (JSON.stringify(segment) === JSON.stringify(p.pattern)) {
                matches++;
            }
        }
        
        // Tính độ tin cậy dựa trên số lần lặp lại
        const confidence = Math.min(95, (matches / (last15.length / p.pattern.length)) * 50);

        if (confidence > bestMatch.confidence) {
            // Xác định phần tử tiếp theo trong chu kỳ
            const nextIndexInPattern = last15.length % p.pattern.length;
            const prediction = p.pattern[nextIndexInPattern];
            bestMatch = { prediction, confidence, pattern: p.name };
        }
    });

    return bestMatch;
}

// Phương pháp dự phòng thống kê
function statisticalFallback(history) {
    const taiCount = history.filter(r => r === "T").length;
    const xiuCount = history.length - taiCount;

    // Nếu có sự chênh lệch lớn, dự đoán sẽ cân bằng lại
    const imbalance = Math.abs(taiCount - xiuCount) / history.length;
    if (imbalance > 0.2) { // chênh lệch trên 20%
        const prediction = taiCount > xiuCount ? "X" : "T";
        return { prediction, confidence: 55 };
    }

    // Nếu không, dự đoán theo kết quả cuối cùng (xu hướng)
    return { prediction: history[history.length - 1], confidence: 50 };
}

// Dự đoán nâng cao kết hợp nhiều thuật toán
function enhancedPredictNext(history) {
    if (history.length < 5) {
        return { prediction: history[history.length - 1] || "T", confidence: 40 };
    }

    const analyses = [];
    
    // Luôn chạy tất cả các phân tích và thu thập kết quả
    analyses.push({ name: 'Markov', ...analyzeMarkovChains(history) });
    analyses.push({ name: 'Trend', ...analyzeShortTermTrend(history) });
    analyses.push({ name: 'Cycle', ...detectLongCycle(history) });

    // Sắp xếp các phân tích theo độ tin cậy giảm dần
    analyses.sort((a, b) => b.confidence - a.confidence);

    const bestAnalysis = analyses[0];

    // Nếu phân tích tốt nhất có độ tin cậy đủ cao, hãy sử dụng nó
    if (bestAnalysis && bestAnalysis.confidence > 65) {
        return {
            prediction: bestAnalysis.prediction,
            confidence: bestAnalysis.confidence,
            method: bestAnalysis.name, // Thêm phương pháp được sử dụng
        };
    }

    // Nếu không, sử dụng phương pháp dự phòng
    const fallback = statisticalFallback(history);
    return {
        prediction: fallback.prediction,
        confidence: fallback.confidence,
        method: 'Fallback'
    };
}

// Export hàm chính để server.js có thể sử dụng
module.exports = { enhancedPredictNext };
