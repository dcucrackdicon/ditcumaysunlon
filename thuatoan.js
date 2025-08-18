// thuatoan.js - Phiên bản Siêu Cấp v2.1 (Ổn Định)

const CONFIG = {
    MIN_HISTORY_REQUIRED: 20,
    BALANCE_WINDOW: 25,
    SCORE_ANALYSIS_WINDOW: 15,
    VOLATILITY_WINDOW: 20,
    STREAK_BREAK_THRESHOLD: 4,
    BASE_WEIGHTS: {
        markov: 1.0, streak: 1.2, balance: 1.1,
        patterns: 1.3, scores: 0.9, volatility: 0.8,
    },
};

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
            confidence: breakConfidence, type: 'break',
            details: `Bẻ cầu ${currentResult} (dài ${streak})`
        };
    } else {
        const continueConfidence = 0.15 + streak * 0.1;
        return {
            prediction: currentResult,
            confidence: continueConfidence, type: 'continue',
            details: `Theo cầu ${currentResult} (dài ${streak})`
        };
    }
}

function analyzeBalance(history) {
    const window = Math.min(history.length, CONFIG.BALANCE_WINDOW);
    const recentHistory = history.slice(-window);
    const taiCount = recentHistory.filter(r => r.result === 'T').length;
    const imbalance = (taiCount - window / 2) / (window / 2);

    if (Math.abs(imbalance) > 0.45) {
        return {
            prediction: imbalance > 0 ? 'X' : 'T',
            confidence: Math.abs(imbalance) * 0.9,
            details: `Cân bằng (lệch ${imbalance > 0 ? 'Tài' : 'Xỉu'} ${(Math.abs(imbalance) * 50).toFixed(0)}%)`
        };
    }
    return { prediction: null, confidence: 0 };
}

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

function calculateVolatility(history) {
    const window = Math.min(history.length, CONFIG.VOLATILITY_WINDOW);
    const recentResults = history.slice(-window).map(h => h.result);
    let switches = 0;
    for (let i = 1; i < recentResults.length; i++) {
        if (recentResults[i] !== recentResults[i - 1]) switches++;
    }
    return switches / (window - 1);
}

function determineGameContext(history, analyses, volatility) {
    const streakInfo = analyses.streak;

    if (streakInfo.type === 'break' && streakInfo.confidence > 0.6) return 'CẦU BỆT DÀI';
    if (streakInfo.streak >= 3) return 'CẦU ỔN ĐỊNH';
    if (volatility > 0.75) return 'LOẠN CẦU 1-1';
    if (volatility < 0.25) return 'CẦU NGẮN BỀN';
    return 'TRẠNG THÁI HỖN HỢP';
}

function masterPredictor(history) {
    if (!history || history.length < CONFIG.MIN_HISTORY_REQUIRED) {
        return {
            prediction: "...", confidence: 0, context: "KHỞI ĐỘNG",
            method: "Cần thêm dữ liệu",
            contributingFactors: `Cần ${CONFIG.MIN_HISTORY_REQUIRED}p, hiện có ${history.length}p.`
        };
    }

    const analyses = {
        markov: analyzeMarkovChains(history), streak: analyzeStreak(history),
        balance: analyzeBalance(history), patterns: analyzePatterns(history),
        scores: analyzeScores(history),
    };
    const volatility = calculateVolatility(history);
    const context = determineGameContext(history, analyses, volatility);
    const dynamicWeights = { ...CONFIG.BASE_WEIGHTS };

    switch (context) {
        case 'CẦU BỆT DÀI':
            dynamicWeights.streak *= 2.5; dynamicWeights.balance *= 1.5;
            dynamicWeights.markov *= 0.3; dynamicWeights.patterns *= 0.3;
            break;
        case 'CẦU ỔN ĐỊNH':
            dynamicWeights.streak *= 2.0; dynamicWeights.markov *= 1.2;
            dynamicWeights.balance *= 0.5;
            break;
        case 'LOẠN CẦU 1-1':
            dynamicWeights.volatility *= 2.0; dynamicWeights.markov *= 1.5;
            dynamicWeights.streak *= 0.1; dynamicWeights.balance *= 1.2;
            break;
        case 'TRẠNG THÁI HỖN HỢP':
            if (volatility > 0.6) Object.keys(dynamicWeights).forEach(k => dynamicWeights[k] *= 0.8);
            break;
    }

    let taiScore = 0, xiuScore = 0;
    const contributingFactors = [];

    for (const modelName in analyses) {
        const result = analyses[modelName];
        if (result.prediction && result.confidence > 0.1) {
            const score = result.confidence * dynamicWeights[modelName];
            if (result.prediction === 'T') taiScore += score; else xiuScore += score;
            if (result.confidence > 0.5) contributingFactors.push(`${result.details}: ${(result.confidence * 100).toFixed(0)}%`);
        }
    }

    if (taiScore === 0 && xiuScore === 0) {
        const lastRes = history[history.length - 1].result;
        return {
            prediction: lastRes === 'T' ? 'Tài' : 'Xỉu', confidence: 35, context,
            method: 'Dự phòng', contributingFactors: 'Không có tín hiệu, theo kết quả cuối.'
        };
    }

    const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
    const totalScore = taiScore + xiuScore;
    let finalConfidence = (Math.abs(taiScore - xiuScore) / totalScore) * 100;
    finalConfidence *= (1 - (volatility * 0.2));
    finalConfidence = Math.min(Math.round(finalConfidence), 96);
    
    let primaryMethod = "Tổng hợp đa mô hình";
    if (dynamicWeights.streak * analyses.streak.confidence > totalScore * 0.4) {
        primaryMethod = analyses.streak.details;
    }

    return {
        prediction: finalPrediction, confidence: finalConfidence, context,
        method: primaryMethod,
        contributingFactors: contributingFactors.join(' | ') || 'Đồng thuận từ các mô hình yếu.'
    };
}

module.exports = { masterPredictor };
