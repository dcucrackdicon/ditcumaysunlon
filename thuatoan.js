// thuatoan.js

// --- Các hàm tiện ích (Helper Functions) ---
// Đặt bên ngoài class để code sạch hơn vì chúng không cần truy cập 'this'
function calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
}

function calculateCurrentStreak(results) {
    if (results.length === 0) return { streak: 0, result: null };
    let streak = 1;
    const lastResult = results[results.length - 1];
    for (let i = results.length - 2; i >= 0; i--) {
        if (results[i] === lastResult) streak++;
        else break;
    }
    return { streak, result: lastResult };
}

function calculateStreakEndProbability(currentStreak, avgStreak, maxStreak) {
    if (currentStreak <= avgStreak) return 0.3;
    if (currentStreak >= maxStreak) return 0.9;
    const excess = currentStreak - avgStreak;
    const range = maxStreak - avgStreak;
    if (range === 0) return 0.6; // Tránh chia cho 0
    return 0.3 + (0.6 * (excess / range));
}

function detectCycles(results) {
    const maxCycleLength = Math.min(6, Math.floor(results.length / 2));
    const cycles = [];
    for (let cycleLen = 2; cycleLen <= maxCycleLength; cycleLen++) {
        if (results.length < cycleLen * 2) continue;
        const lastCycle = results.slice(-cycleLen);
        const prevCycle = results.slice(-cycleLen * 2, -cycleLen);
        if (JSON.stringify(lastCycle) === JSON.stringify(prevCycle)) {
            cycles.push({ length: cycleLen, pattern: lastCycle });
        }
    }
    return cycles;
}

function predictFromCycles(cycles) {
    if (cycles.length === 0) return null;
    const longestCycle = cycles.sort((a, b) => b.length - a.length)[0];
    return longestCycle.pattern[0]; // Trả về phần tử đầu tiên của chu kỳ
}

// --- Lớp thuật toán chính ---

class MasterPredictor {
    constructor() {
        this.history = [];
        this.config = {
            minHistoryLength: 5,
            maxHistoryLength: 50,
            patternRecognitionDepth: 7,
            dynamicWeightAdjustment: true,
            streakBreakThreshold: 0.7,
            scoreAnalysisWeight: 0.3,
            patternAnalysisWeight: 0.25,
            trendAnalysisWeight: 0.2,
            statisticalAnalysisWeight: 0.15,
            volatilityAnalysisWeight: 0.1
        };
    }

    // Method để cập nhật dữ liệu sau mỗi phiên
    async updateData(gameResult) {
        // gameResult có dạng { score: 12, result: 'Tài' }
        this.history.push(gameResult);
        if (this.history.length > this.config.maxHistoryLength) {
            this.history.shift();
        }
    }

    // Method để đưa ra dự đoán
    async predict() {
        try {
            if (this.history.length < this.config.minHistoryLength) {
                return { prediction: '?', confidence: 0, analysis: 'Chưa đủ dữ liệu' };
            }
            const analysisResult = this.analyzeGameTrends(this.history);
            return {
                prediction: analysisResult.prediction,
                confidence: analysisResult.confidence,
                analysis: analysisResult.analysis,
            };
        } catch (error) {
            console.error('Lỗi dự đoán:', error);
            return {
                prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu',
                confidence: 0.5,
                error: error.message,
            };
        }
    }

    // --- Các method phân tích ---
    
    analyzeGameTrends(history) {
        const enhancedAnalysis = {
            scorePatterns: this.detectScorePatterns(history),
            resultSequences: this.analyzeResultSequences(history),
            volatility: this.calculateMarketVolatility(history),
            statisticalTrends: this.calculateStatisticalTrends(history),
            streakAnalysis: this.performStreakAnalysis(history)
        };

        const predictions = {
            patternRecognition: this.patternRecognitionModel(enhancedAnalysis.resultSequences),
            statisticalPrediction: this.statisticalPredictionModel(enhancedAnalysis.statisticalTrends),
            volatilityAdjustment: this.volatilityAdjustmentModel(enhancedAnalysis.volatility),
            streakPrediction: this.streakPredictionModel(enhancedAnalysis.streakAnalysis),
            scoreBasedPrediction: this.scoreBasedPredictionModel(enhancedAnalysis.scorePatterns)
        };

        const dynamicWeights = this.config.dynamicWeightAdjustment ?
            this.calculateDynamicWeights() : this.config;

        return this.calculateFinalPrediction(predictions, dynamicWeights);
    }

    detectScorePatterns(history) {
        const scores = history.map(r => r.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const scoreDistribution = {
            taiRange: scores.filter(s => s > 10.5).length / scores.length,
            xiuRange: scores.filter(s => s < 10.5).length / scores.length
        };
        const last10Scores = scores.slice(-10);
        const scoreTrend = {
            increasing: last10Scores.filter((s, i) => i > 0 && s > last10Scores[i - 1]).length,
            decreasing: last10Scores.filter((s, i) => i > 0 && s < last10Scores[i - 1]).length
        };
        return { average: avgScore, distribution: scoreDistribution, trend: scoreTrend };
    }

    analyzeResultSequences(history) {
        const results = history.map(r => r.result);
        const patterns = [];
        const depth = Math.min(this.config.patternRecognitionDepth, results.length - 1);
        for (let i = 0; i <= results.length - depth; i++) {
            patterns.push(results.slice(i, i + depth).join('-'));
        }
        const patternCounts = patterns.reduce((acc, p) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {});
        const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
        const switches = results.slice(1).reduce((count, res, i) => count + (res !== results[i] ? 1 : 0), 0);
        return { mostCommonPattern, switchRate: switches / (results.length - 1) };
    }

    calculateMarketVolatility(history) {
        const scores = history.map(r => r.score);
        const stdDev = calculateStandardDeviation(scores);
        return { isHighlyVolatile: stdDev > 3.5, volatilityChange: 0 }; // Simplified
    }

    calculateStatisticalTrends(history) {
        const results = history.map(r => r.result);
        const taiCount = results.filter(r => r === 'Tài').length;
        const cycles = detectCycles(results);
        return {
            taiProbability: taiCount / results.length,
            imbalance: (taiCount - (results.length - taiCount)) / results.length,
            expectedNext: predictFromCycles(cycles)
        };
    }

    performStreakAnalysis(history) {
        const results = history.map(r => r.result);
        const { streak, result } = calculateCurrentStreak(results);
        const allStreaks = [];
        let streakCount = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === results[i - 1]) streakCount++;
            else { allStreaks.push(streakCount); streakCount = 1; }
        }
        allStreaks.push(streakCount);
        const avgStreak = allStreaks.length > 0 ? allStreaks.reduce((a, b) => a + b, 0) / allStreaks.length : 1;
        const maxStreak = allStreaks.length > 0 ? Math.max(...allStreaks) : 1;
        return {
            currentStreak: streak,
            currentResult: result,
            averageStreak: avgStreak,
            maxStreak: maxStreak,
            streakEndProbability: calculateStreakEndProbability(streak, avgStreak, maxStreak),
            isLongStreak: streak > avgStreak * 1.5
        };
    }

    // --- Các method mô hình dự đoán ---

    patternRecognitionModel(sequenceAnalysis) {
        if (!sequenceAnalysis.mostCommonPattern || sequenceAnalysis.mostCommonPattern[1] < 2) {
            return { prediction: null, confidence: 0 };
        }
        const patternParts = sequenceAnalysis.mostCommonPattern[0].split('-');
        return { prediction: patternParts[patternParts.length - 1], confidence: 0.7 };
    }

    statisticalPredictionModel(trends) {
        if (trends.expectedNext) return { prediction: trends.expectedNext, confidence: 0.7 };
        if (Math.abs(trends.imbalance) > 0.3) {
            return { prediction: trends.imbalance > 0 ? 'Xỉu' : 'Tài', confidence: 0.65 };
        }
        return { prediction: null, confidence: 0 };
    }

    volatilityAdjustmentModel(volatility) {
        return { adjustment: volatility.isHighlyVolatile ? -0.2 : 0.1 };
    }

    streakPredictionModel(streak) {
        if (streak.isLongStreak && streak.streakEndProbability > this.config.streakBreakThreshold) {
            return {
                prediction: streak.currentResult === 'Tài' ? 'Xỉu' : 'Tài',
                confidence: streak.streakEndProbability * 0.9
            };
        }
        return { prediction: streak.currentResult, confidence: (1 - streak.streakEndProbability) * 0.7 };
    }

    scoreBasedPredictionModel(score) {
        if (score.average > 11 && score.distribution.taiRange > 0.6) return { prediction: 'Tài', confidence: 0.75 };
        if (score.average < 9.5 && score.distribution.xiuRange > 0.6) return { prediction: 'Xỉu', confidence: 0.75 };
        if (score.trend.increasing >= 7) return { prediction: 'Tài', confidence: 0.65 };
        if (score.trend.decreasing >= 7) return { prediction: 'Xỉu', confidence: 0.65 };
        return { prediction: score.average > 10.5 ? 'Tài' : 'Xỉu', confidence: 0.6 };
    }

    // --- Tổng hợp & Tính toán cuối cùng ---

    calculateDynamicWeights() {
        // Tạm thời trả về trọng số tĩnh, có thể phát triển logic đánh giá hiệu suất ở đây
        return {
            patternAnalysisWeight: 0.25,
            statisticalAnalysisWeight: 0.15,
            trendAnalysisWeight: 0.2,
            scoreAnalysisWeight: 0.3,
        };
    }

    calculateFinalPrediction(predictions, weights) {
        let taiScore = 0;
        let xiuScore = 0;

        const addScore = (model, weightKey) => {
            if (model.prediction) {
                const score = model.confidence * weights[weightKey];
                if (model.prediction === 'Tài') taiScore += score;
                else xiuScore += score;
            }
        };

        addScore(predictions.patternRecognition, 'patternAnalysisWeight');
        addScore(predictions.statisticalPrediction, 'statisticalAnalysisWeight');
        addScore(predictions.streakPrediction, 'trendAnalysisWeight');
        addScore(predictions.scoreBasedPrediction, 'scoreAnalysisWeight');

        if (taiScore === 0 && xiuScore === 0) { // Nếu không có mô hình nào đưa ra dự đoán
            const fallback = this.performStreakAnalysis(this.history);
            return { prediction: fallback.currentResult, confidence: 0.55, mainReason: 'Dự đoán theo chuỗi hiện tại' };
        }

        const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
        const totalScore = taiScore + xiuScore;
        const confidenceRatio = totalScore > 0 ? Math.abs(taiScore - xiuScore) / totalScore : 0;
        let finalConfidence = (0.5 + confidenceRatio * 0.5) * 0.9 + predictions.volatilityAdjustment.adjustment;
        finalConfidence = Math.max(0.1, Math.min(0.95, finalConfidence));

        return { prediction: finalPrediction, confidence: finalConfidence };
    }
}

module.exports = { MasterPredictor };
