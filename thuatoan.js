// thuatoan.js (LOGIC ĐẢO NGƯỢC)

// Phân tích chuỗi Markov
function analyzeMarkovChains(history) {
    const transitions = {
        'TT': { T: 0, X: 0 },
        'TX': { T: 0, X: 0 },
        'XT': { T: 0, X: 0 },
        'XX': { T: 0, X: 0 }
    };

    for (let i = 2; i < history.length; i++) {
        const prev = history[i-2] + history[i-1];
        const current = history[i];
        if (transitions[prev]) {
            transitions[prev][current]++;
        }
    }

    const lastTwo = history.slice(-2).join('');
    const counts = transitions[lastTwo];

    if (!counts || (counts.T === 0 && counts.X === 0)) {
        return { prediction: null, confidence: 0 };
    }

    const total = counts.T + counts.X;
    // **ĐẢO NGƯỢC LOGIC: Nếu T nhiều hơn thì đoán X và ngược lại**
    const prediction = counts.T > counts.X ? "X" : "T";
    const confidence = Math.round(Math.max(counts.T, counts.X) / total * 100);

    return { prediction, confidence };
}

// Phân tích xu hướng ngắn hạn
function analyzeShortTermTrend(history) {
    const last5 = history.slice(-5);
    if (last5.length < 5) return { prediction: null, confidence: 0 };

    const taiCount = last5.filter(r => r === "T").length;
    const xiuCount = 5 - taiCount;

    // **ĐẢO NGƯỢC LOGIC: Nếu có nhiều Tài, dự đoán tiếp tục là Tài**
    if (taiCount >= 4) {
        return { prediction: "T", confidence: 70 + (taiCount - 4) * 10 };
    }
    // **ĐẢO NGƯỢC LOGIC: Nếu có nhiều Xỉu, dự đoán tiếp tục là Xỉu**
    if (xiuCount >= 4) {
        return { prediction: "X", confidence: 70 + (xiuCount - 4) * 10 };
    }

    return { prediction: null, confidence: 0 };
}

// Phát hiện chu kỳ dài
function detectLongCycle(history) {
    if (history.length < 15) return { prediction: null, confidence: 0 };
    
    const last15 = history.slice(-15);
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
        
        const confidence = Math.min(95, (matches / (last15.length / p.pattern.length)) * 50);

        if (confidence > bestMatch.confidence) {
            const nextIndexInPattern = last15.length % p.pattern.length;
            const originalPrediction = p.pattern[nextIndexInPattern];
            // **ĐẢO NGƯỢC LOGIC: Lật ngược kết quả của chu kỳ**
            const prediction = originalPrediction === "T" ? "X" : "T";
            bestMatch = { prediction, confidence, pattern: p.name };
        }
    });

    return bestMatch;
}

// Phương pháp dự phòng thống kê
function statisticalFallback(history) {
    const taiCount = history.filter(r => r === "T").length;
    const xiuCount = history.length - taiCount;

    const imbalance = Math.abs(taiCount - xiuCount) / history.length;
    if (imbalance > 0.2) {
        // **ĐẢO NGƯỢC LOGIC: Nếu lệch về Tài, tiếp tục đoán Tài**
        const prediction = taiCount > xiuCount ? "T" : "X";
        return { prediction, confidence: 55 };
    }

    // **ĐẢO NGƯỢC LOGIC: Đoán ngược lại với kết quả cuối cùng**
    const lastResult = history[history.length - 1];
    const prediction = lastResult === "T" ? "X" : "T";
    return { prediction, confidence: 50 };
}

// Dự đoán nâng cao kết hợp nhiều thuật toán
function enhancedPredictNext(history) {
    if (history.length < 5) {
        const lastResult = history[history.length - 1];
        // **ĐẢO NGƯỢC LOGIC: Đoán ngược lại kết quả cuối, hoặc mặc định là X nếu chưa có lịch sử**
        const prediction = lastResult ? (lastResult === "T" ? "X" : "T") : "X";
        return { prediction, confidence: 40 };
    }

    const analyses = [];
    
    // Các hàm phân tích bên trong đã được đảo ngược, nên logic ở đây giữ nguyên
    analyses.push({ name: 'Markov', ...analyzeMarkovChains(history) });
    analyses.push({ name: 'Trend', ...analyzeShortTermTrend(history) });
    analyses.push({ name: 'Cycle', ...detectLongCycle(history) });

    analyses.sort((a, b) => b.confidence - a.confidence);

    const bestAnalysis = analyses[0];

    if (bestAnalysis && bestAnalysis.confidence > 65) {
        return {
            prediction: bestAnalysis.prediction,
            confidence: bestAnalysis.confidence,
            method: bestAnalysis.name,
        };
    }

    const fallback = statisticalFallback(history);
    return {
        prediction: fallback.prediction,
        confidence: fallback.confidence,
        method: 'Fallback'
    };
}

// Export hàm chính để server.js có thể sử dụng
module.exports = { enhancedPredictNext };
