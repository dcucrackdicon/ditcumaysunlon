class MasterPredictor {
    constructor() {
        this.history = [];
        this.config = {
            minHistoryLength: 5,
            maxHistoryLength: 100, // Tăng giới hạn để phân tích tốt hơn
            patternRecognitionDepth: 7,
            dynamicWeightAdjustment: false, // Tắt tạm thời để ổn định hơn
            streakBreakThreshold: 0.7,
            scoreAnalysisWeight: 0.3,
            patternAnalysisWeight: 0.25,
            trendAnalysisWeight: 0.2,
            statisticalAnalysisWeight: 0.15,
            volatilityAnalysisWeight: 0.1
        };
        // Bind 'this' cho các hàm sẽ được gọi từ bên ngoài nếu cần, nhưng ở đây chúng ta gọi nội bộ
    }

    //=========== PHƯƠNG THỨC CÔNG KHAI ===========

    /**
     * Cập nhật lịch sử với kết quả phiên mới nhất
     * @param {{score: number, result: string}} newResult - Kết quả mới (ví dụ: { score: 12, result: 'Tài' })
     */
    updateData(newResult) {
        this.history.push(newResult);
        // Giới hạn độ dài của lịch sử để tối ưu hiệu suất
        if (this.history.length > this.config.maxHistoryLength) {
            this.history.shift();
        }
    }

    /**
     * Thực hiện dự đoán cho phiên tiếp theo dựa trên lịch sử hiện tại
     * @returns {object} - Đối tượng chứa dự đoán và phân tích
     */
    predict() {
        try {
            const analysisResult = this.analyzeGameTrends(this.history);

            if (!analysisResult.prediction) {
                 return {
                    success: true,
                    prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu', // Dự đoán ngẫu nhiên nếu không đủ dữ liệu
                    confidence: 0.5,
                    analysis: { mainReason: 'Insufficient data for a confident prediction, using fallback.' },
                    timestamp: new Date().toISOString()
                };
            }

            return {
                success: true,
                prediction: analysisResult.prediction,
                confidence: analysisResult.confidence,
                analysis: analysisResult.analysis,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Prediction error:', error);
            return {
                success: false,
                error: error.message,
                prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu',
                confidence: 0.5,
                timestamp: new Date().toISOString()
            };
        }
    }


    //=========== CÁC PHƯƠNG THỨC PHÂN TÍCH (Nội bộ) ===========
    
    analyzeGameTrends(history) {
        if (!history || history.length < this.config.minHistoryLength) {
            return { prediction: null, confidence: 0, analysis: 'Insufficient data' };
        }

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

        const weights = this.config; // Tạm thời dùng trọng số tĩnh

        const finalPrediction = this.calculateFinalPrediction(predictions, weights);

        return {
            prediction: finalPrediction.prediction,
            confidence: finalPrediction.confidence,
            analysis: {
                mainReason: finalPrediction.mainReason,
                detailedAnalysis: enhancedAnalysis,
                modelContributions: predictions
            },
            modelWeights: weights
        };
    }

    detectScorePatterns(history) {
        const scores = history.map(r => r.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        const scoreDistribution = {
            taiRange: scores.filter(s => s > 10.5).length / scores.length,
            xiuRange: scores.filter(s => s < 10.5).length / scores.length,
        };

        const last10Scores = scores.slice(-10);
        const scoreTrend = {
            increasing: last10Scores.slice(1).filter((s, i) => s > last10Scores[i]).length,
            decreasing: last10Scores.slice(1).filter((s, i) => s < last10Scores[i]).length,
        };

        return {
            average: avgScore,
            distribution: scoreDistribution,
            trend: scoreTrend,
        };
    }

    analyzeResultSequences(history) {
        const results = history.map(r => r.result);
        const patterns = [];
        const depth = Math.min(this.config.patternRecognitionDepth, results.length - 1);

        for (let i = 0; i <= results.length - depth; i++) {
            const pattern = results.slice(i, i + depth).join('-');
            patterns.push(pattern);
        }

        const patternCounts = patterns.reduce((acc, pattern) => {
            acc[pattern] = (acc[pattern] || 0) + 1;
            return acc;
        }, {});
        
        const mostCommonPattern = Object.keys(patternCounts).length > 0 ? Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0] : null;

        const switches = results.slice(1).reduce((count, res, i) => count + (res !== results[i] ? 1 : 0), 0);

        return {
            patterns: patternCounts,
            mostCommonPattern: mostCommonPattern,
            switchRate: results.length > 1 ? switches / (results.length - 1) : 0,
            taiXiuRatio: results.filter(r => r === 'Tài').length / results.length
        };
    }
    
    calculateMarketVolatility(history) {
        const scores = history.map(r => r.score);
        const stdDev = this.calculateStandardDeviation(scores);
        const recentScores = scores.slice(-10);
        const recentStdDev = this.calculateStandardDeviation(recentScores);
        
        return {
            isHighlyVolatile: recentStdDev > 3.5
        };
    }

    calculateStatisticalTrends(history) {
        const results = history.map(r => r.result);
        const taiCount = results.filter(r => r === 'Tài').length;
        const xiuCount = results.length - taiCount;
      
        return {
            taiProbability: taiCount / results.length,
            xiuProbability: xiuCount / results.length,
            imbalance: (taiCount - xiuCount) / results.length,
        };
    }

    performStreakAnalysis(history) {
        const results = history.map(r => r.result);
        if (results.length === 0) return { currentStreak: 0 };

        let currentStreak = 1;
        const currentResult = results[results.length - 1];
        
        for (let i = results.length - 2; i >= 0; i--) {
            if (results[i] === currentResult) currentStreak++;
            else break;
        }
        
        const allStreaks = [];
        let streakCount = 1;
        for (let i = 1; i < results.length; i++) {
            if (results[i] === results[i-1]) {
                streakCount++;
            } else {
                allStreaks.push(streakCount);
                streakCount = 1;
            }
        }
        allStreaks.push(streakCount);
        
        const avgStreak = allStreaks.length > 0 ? allStreaks.reduce((a, b) => a + b, 0) / allStreaks.length : 1;
        const maxStreak = allStreaks.length > 0 ? Math.max(...allStreaks) : 1;
        
        const streakEndProbability = this.calculateStreakEndProbability(currentStreak, avgStreak, maxStreak);

        return {
            currentStreak: currentStreak,
            currentResult: currentResult,
            streakEndProbability: streakEndProbability,
            isLongStreak: currentStreak > avgStreak * 1.5
        };
    }

    //=========== CÁC MÔ HÌNH DỰ ĐOÁN ===========

    patternRecognitionModel(sequenceAnalysis) {
        if (!sequenceAnalysis.mostCommonPattern) {
            return { prediction: null, confidence: 0 };
        }
        
        const patternParts = sequenceAnalysis.mostCommonPattern[0].split('-');
        const expectedNext = patternParts[patternParts.length-1];

        if (sequenceAnalysis.mostCommonPattern[1] >= 2) {
            return {
                prediction: expectedNext,
                confidence: Math.min(0.8, sequenceAnalysis.mostCommonPattern[1] * 0.2)
            };
        }
        return { prediction: null, confidence: 0 };
    }

    statisticalPredictionModel(statisticalTrends) {
        const { taiProbability, xiuProbability, imbalance } = statisticalTrends;
        if (Math.abs(imbalance) > 0.3) {
            return {
                prediction: imbalance > 0 ? 'Xỉu' : 'Tài',
                confidence: Math.min(0.8, Math.abs(imbalance) * 1.5)
            };
        }
        return {
            prediction: taiProbability > xiuProbability ? 'Tài' : 'Xỉu',
            confidence: Math.abs(taiProbability - xiuProbability) * 0.8
        };
    }

    volatilityAdjustmentModel(volatilityAnalysis) {
        if (volatilityAnalysis.isHighlyVolatile) {
            return { adjustment: -0.2 };
        }
        return { adjustment: 0.1 };
    }

    streakPredictionModel(streakAnalysis) {
        const { currentStreak, currentResult, streakEndProbability, isLongStreak } = streakAnalysis;
        if (isLongStreak && streakEndProbability > this.config.streakBreakThreshold) {
            return {
                prediction: currentResult === 'Tài' ? 'Xỉu' : 'Tài',
                confidence: streakEndProbability * 0.9
            };
        }
        return {
            prediction: currentResult,
            confidence: (1 - streakEndProbability) * 0.7
        };
    }

    scoreBasedPredictionModel(scoreAnalysis) {
        const { average, distribution } = scoreAnalysis;
        if (average > 11 && distribution.taiRange > 0.6) {
            return { prediction: 'Tài', confidence: 0.75 };
        }
        if (average < 9.5 && distribution.xiuRange > 0.6) {
            return { prediction: 'Xỉu', confidence: 0.75 };
        }
        return {
            prediction: average > 10.5 ? 'Tài' : 'Xỉu',
            confidence: 0.6
        };
    }

    //=========== HÀM TỔNG HỢP & HỖ TRỢ ===========
    
    calculateFinalPrediction(predictions, weights) {
        let taiScore = 0;
        let xiuScore = 0;
        let totalConfidence = 0;
        const reasons = [];

        const models = [
            { pred: predictions.patternRecognition, weight: weights.patternAnalysisWeight },
            { pred: predictions.statisticalPrediction, weight: weights.statisticalAnalysisWeight },
            { pred: predictions.streakPrediction, weight: weights.trendAnalysisWeight },
            { pred: predictions.scoreBasedPrediction, weight: weights.scoreAnalysisWeight }
        ];

        models.forEach(model => {
            if (model.pred.prediction) {
                const confidence = model.pred.confidence * model.weight;
                if (model.pred.prediction === 'Tài') {
                    taiScore += confidence;
                } else {
                    xiuScore += confidence;
                }
                totalConfidence += confidence;
            }
        });

        if (taiScore + xiuScore === 0) { // Không có model nào đưa ra dự đoán
            return { prediction: null, confidence: 0 };
        }

        const volatilityAdjustment = predictions.volatilityAdjustment.adjustment;
        totalConfidence = Math.max(0.1, Math.min(0.95, totalConfidence + volatilityAdjustment));
        
        const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
        const confidenceRatio = Math.abs(taiScore - xiuScore) / (taiScore + xiuScore);
        const finalConfidence = totalConfidence * (0.5 + confidenceRatio * 0.5);
        
        return {
            prediction: finalPrediction,
            confidence: finalConfidence,
            mainReason: 'Combined model prediction'
        };
    }

    calculateStandardDeviation(values) {
        if (values.length < 2) return 0;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }
    
    calculateStreakEndProbability(currentStreak, avgStreak, maxStreak) {
        if (currentStreak <= avgStreak) return 0.3;
        if (currentStreak >= maxStreak) return 0.9;
        const range = maxStreak - avgStreak;
        if (range <= 0) return 0.5;
        const excess = currentStreak - avgStreak;
        return 0.3 + (0.6 * (excess / range));
    }
}

// Xuất class để server.js có thể sử dụng
module.exports = { MasterPredictor };
