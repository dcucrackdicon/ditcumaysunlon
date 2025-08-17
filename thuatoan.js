// thuatoan.js
const predictionModel = {
  models: {},
  performanceStats: {},
  config: {
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
  }
};

function analyzeGameTrends(history) {
  if (!history || history.length < this.config.minHistoryLength) {
    return { prediction: null, confidence: 0, analysis: 'Insufficient data' };
  }

  // Phân tích nâng cao
  const enhancedAnalysis = {
    scorePatterns: detectScorePatterns(history),
    resultSequences: analyzeResultSequences(history),
    volatility: calculateMarketVolatility(history),
    statisticalTrends: calculateStatisticalTrends(history),
    streakAnalysis: performStreakAnalysis(history)
  };

  // Tính điểm dự đoán từ các mô hình
  const predictions = {
    patternRecognition: patternRecognitionModel(enhancedAnalysis.resultSequences),
    statisticalPrediction: statisticalPredictionModel(enhancedAnalysis.statisticalTrends),
    volatilityAdjustment: volatilityAdjustmentModel(enhancedAnalysis.volatility),
    streakPrediction: streakPredictionModel(enhancedAnalysis.streakAnalysis),
    scoreBasedPrediction: scoreBasedPredictionModel(enhancedAnalysis.scorePatterns)
  };

  // Tính toán trọng số động
  const dynamicWeights = this.config.dynamicWeightAdjustment 
    ? calculateDynamicWeights(predictions, history) 
    : this.config;

  // Tổng hợp kết quả
  const finalPrediction = calculateFinalPrediction(predictions, dynamicWeights);

  return {
    prediction: finalPrediction.prediction,
    confidence: finalPrediction.confidence,
    analysis: {
      mainReason: finalPrediction.mainReason,
      detailedAnalysis: enhancedAnalysis,
      modelContributions: predictions
    },
    modelWeights: dynamicWeights
  };
}

// Các hàm phân tích nâng cao
function detectScorePatterns(history) {
  const scores = history.map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Phân tích phân phối điểm
  const scoreDistribution = {
    taiRange: scores.filter(s => s > 10.5).length / scores.length,
    xiuRange: scores.filter(s => s < 10.5).length / scores.length,
    nearThreshold: scores.filter(s => s >= 9.5 && s <= 11.5).length / scores.length
  };

  // Phát hiện xu hướng điểm
  const last10Scores = scores.slice(-10);
  const scoreTrend = {
    increasing: last10Scores.filter((s, i) => i > 0 && s > last10Scores[i-1]).length,
    decreasing: last10Scores.filter((s, i) => i > 0 && s < last10Scores[i-1]).length,
    stable: last10Scores.filter((s, i) => i > 0 && Math.abs(s - last10Scores[i-1]) < 1).length
  };

  return {
    average: avgScore,
    standardDeviation: calculateStandardDeviation(scores),
    distribution: scoreDistribution,
    trend: scoreTrend,
    recentScores: last10Scores
  };
}

function analyzeResultSequences(history) {
  const results = history.map(r => r.result);
  const patterns = [];
  const depth = Math.min(this.config.patternRecognitionDepth, results.length - 1);

  // Phát hiện các mẫu lặp
  for (let i = 0; i <= results.length - depth; i++) {
    const pattern = results.slice(i, i + depth).join('-');
    patterns.push(pattern);
  }

  // Đếm tần suất mẫu
  const patternCounts = patterns.reduce((acc, pattern) => {
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {});

  // Tìm mẫu phổ biến nhất
  const mostCommonPattern = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])[0];

  // Phân tích chuỗi kết quả
  const switches = results.slice(1).reduce((count, res, i) => 
    count + (res !== results[i] ? 1 : 0), 0);

  return {
    patterns: patternCounts,
    mostCommonPattern: mostCommonPattern,
    switchRate: switches / (results.length - 1),
    currentStreak: calculateCurrentStreak(results),
    taiXiuRatio: results.filter(r => r === 'Tài').length / results.length
  };
}

function calculateMarketVolatility(history) {
  const scores = history.map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = calculateStandardDeviation(scores);
  
  // Phân tích biến động gần đây
  const recentScores = scores.slice(-10);
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const recentStdDev = calculateStandardDeviation(recentScores);
  
  return {
    overallVolatility: stdDev / avgScore,
    recentVolatility: recentStdDev / recentAvg,
    volatilityChange: (recentStdDev - stdDev) / stdDev,
    isHighlyVolatile: recentStdDev > 3.5
  };
}

function calculateStatisticalTrends(history) {
  const results = history.map(r => r.result);
  const taiCount = results.filter(r => r === 'Tài').length;
  const xiuCount = results.length - taiCount;
  
  // Phân tích xu hướng theo chu kỳ
  const cycles = detectCycles(results);
  
  return {
    taiProbability: taiCount / results.length,
    xiuProbability: xiuCount / results.length,
    imbalance: (taiCount - xiuCount) / results.length,
    cycles: cycles,
    expectedNext: cycles.length > 0 ? predictFromCycles(cycles) : null
  };
}

function performStreakAnalysis(history) {
  const results = history.map(r => r.result);
  let currentStreak = 1;
  const currentResult = results[results.length - 1];
  
  for (let i = results.length - 2; i >= 0; i--) {
    if (results[i] === currentResult) currentStreak++;
    else break;
  }
  
  // Phân tích các chuỗi trong lịch sử
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
  
  const avgStreak = allStreaks.reduce((a, b) => a + b, 0) / allStreaks.length;
  const maxStreak = Math.max(...allStreaks);
  
  return {
    currentStreak: currentStreak,
    currentResult: currentResult,
    averageStreak: avgStreak,
    maxStreak: maxStreak,
    streakEndProbability: calculateStreakEndProbability(currentStreak, avgStreak, maxStreak),
    isLongStreak: currentStreak > avgStreak * 1.5
  };
}

// Các mô hình dự đoán
function patternRecognitionModel(sequenceAnalysis) {
  if (!sequenceAnalysis.mostCommonPattern) {
    return { prediction: null, confidence: 0, reason: 'No significant patterns detected' };
  }
  
  const patternParts = sequenceAnalysis.mostCommonPattern[0].split('-');
  const lastResult = sequenceAnalysis.currentStreak.currentResult;
  const expectedNext = patternParts[patternParts.length - 1];
  
  // Dự đoán dựa trên mẫu phổ biến nhất
  if (sequenceAnalysis.mostCommonPattern[1] >= 2) {
    const confidence = Math.min(0.8, sequenceAnalysis.mostCommonPattern[1] * 0.2);
    return {
      prediction: expectedNext,
      confidence: confidence,
      reason: `Detected repeating pattern (${sequenceAnalysis.mostCommonPattern[0]} occurred ${sequenceAnalysis.mostCommonPattern[1]} times)`
    };
  }
  
  // Dự đoán dựa trên tỷ lệ chuyển đổi
  if (sequenceAnalysis.switchRate > 0.7) {
    return {
      prediction: lastResult === 'Tài' ? 'Xỉu' : 'Tài',
      confidence: 0.65,
      reason: `High switch rate detected (${(sequenceAnalysis.switchRate * 100).toFixed(1)}%)`
    };
  }
  
  return {
    prediction: null,
    confidence: 0,
    reason: 'No clear pattern-based prediction'
  };
}

function statisticalPredictionModel(statisticalTrends) {
  // Dự đoán dựa trên phân phối xác suất
  const { taiProbability, xiuProbability, imbalance, expectedNext } = statisticalTrends;
  
  if (expectedNext) {
    return {
      prediction: expectedNext,
      confidence: 0.7,
      reason: 'Detected cyclical pattern in results'
    };
  }
  
  if (Math.abs(imbalance) > 0.3) {
    const predicted = imbalance > 0 ? 'Xỉu' : 'Tài';
    return {
      prediction: predicted,
      confidence: Math.min(0.8, Math.abs(imbalance) * 1.5),
      reason: `Significant imbalance detected (${(imbalance * 100).toFixed(1)}% ${imbalance > 0 ? 'Tài' : 'Xỉu'} bias)`
    };
  }
  
  return {
    prediction: taiProbability > xiuProbability ? 'Tài' : 'Xỉu',
    confidence: Math.abs(taiProbability - xiuProbability) * 0.8,
    reason: `Basic probability (Tài: ${(taiProbability * 100).toFixed(1)}%, Xỉu: ${(xiuProbability * 100).toFixed(1)}%)`
  };
}

function volatilityAdjustmentModel(volatilityAnalysis) {
  // Điều chỉnh dựa trên biến động thị trường
  if (volatilityAnalysis.isHighlyVolatile) {
    return {
      prediction: null,
      confidence: 0,
      adjustment: -0.2,
      reason: 'High volatility market - reducing confidence in all predictions'
    };
  }
  
  if (volatilityAnalysis.volatilityChange > 0.5) {
    return {
      prediction: null,
      confidence: 0,
      adjustment: -0.15,
      reason: 'Increasing volatility - proceeding with caution'
    };
  }
  
  return {
    prediction: null,
    confidence: 0,
    adjustment: 0.1,
    reason: 'Stable market conditions - increasing confidence'
  };
}

function streakPredictionModel(streakAnalysis) {
  // Dự đoán dựa trên chuỗi hiện tại
  const { currentStreak, currentResult, streakEndProbability, isLongStreak } = streakAnalysis;
  
  if (isLongStreak && streakEndProbability > this.config.streakBreakThreshold) {
    return {
      prediction: currentResult === 'Tài' ? 'Xỉu' : 'Tài',
      confidence: streakEndProbability * 0.9,
      reason: `Long streak detected (${currentStreak} ${currentResult}), high break probability (${(streakEndProbability * 100).toFixed(1)}%)`
    };
  }
  
  return {
    prediction: currentResult,
    confidence: (1 - streakEndProbability) * 0.7,
    reason: `Continuing current streak (${currentStreak} ${currentResult}), low break probability (${(streakEndProbability * 100).toFixed(1)}%)`
  };
}

function scoreBasedPredictionModel(scoreAnalysis) {
  // Dự đoán dựa trên phân tích điểm
  const { average, distribution, trend } = scoreAnalysis;
  
  if (average > 11 && distribution.taiRange > 0.6) {
    return {
      prediction: 'Tài',
      confidence: 0.75,
      reason: `High average score (${average.toFixed(1)}) with strong Tài tendency (${(distribution.taiRange * 100).toFixed(1)}%)`
    };
  }
  
  if (average < 9.5 && distribution.xiuRange > 0.6) {
    return {
      prediction: 'Xỉu',
      confidence: 0.75,
      reason: `Low average score (${average.toFixed(1)}) with strong Xỉu tendency (${(distribution.xiuRange * 100).toFixed(1)}%)`
    };
  }
  
  if (trend.increasing >= 7) {
    return {
      prediction: 'Tài',
      confidence: 0.65,
      reason: 'Strong upward score trend'
    };
  }
  
  if (trend.decreasing >= 7) {
    return {
      prediction: 'Xỉu',
      confidence: 0.65,
      reason: 'Strong downward score trend'
    };
  }
  
  return {
    prediction: average > 10.5 ? 'Tài' : 'Xỉu',
    confidence: 0.6,
    reason: `Basic score-based prediction (average: ${average.toFixed(1)})`
  };
}

// Các hàm hỗ trợ
function calculateDynamicWeights(predictions, history) {
  // Tính toán trọng số động dựa trên hiệu suất lịch sử
  const performanceRatios = {
    pattern: evaluateModelPerformance('pattern', history),
    statistical: evaluateModelPerformance('statistical', history),
    streak: evaluateModelPerformance('streak', history),
    score: evaluateModelPerformance('score', history)
  };
  
  // Tính trọng số mới
  const totalPerformance = Object.values(performanceRatios).reduce((a, b) => a + b, 0);
  
  return {
    patternAnalysisWeight: (performanceRatios.pattern / totalPerformance) * 0.4,
    statisticalAnalysisWeight: (performanceRatios.statistical / totalPerformance) * 0.3,
    trendAnalysisWeight: (performanceRatios.streak / totalPerformance) * 0.2,
    scoreAnalysisWeight: (performanceRatios.score / totalPerformance) * 0.1,
    volatilityAnalysisWeight: 0.1 // Giữ cố định vì không phải mô hình dự đoán
  };
}

function calculateFinalPrediction(predictions, weights) {
  // Tổng hợp tất cả dự đoán với trọng số
  let taiScore = 0;
  let xiuScore = 0;
  let totalConfidence = 0;
  const reasons = [];
  
  // Thêm các dự đoán từ mô hình
  if (predictions.patternRecognition.prediction) {
    const weight = weights.patternAnalysisWeight;
    if (predictions.patternRecognition.prediction === 'Tài') {
      taiScore += weight * predictions.patternRecognition.confidence;
    } else {
      xiuScore += weight * predictions.patternRecognition.confidence;
    }
    totalConfidence += weight * predictions.patternRecognition.confidence;
    reasons.push(predictions.patternRecognition.reason);
  }
  
  if (predictions.statisticalPrediction.prediction) {
    const weight = weights.statisticalAnalysisWeight;
    if (predictions.statisticalPrediction.prediction === 'Tài') {
      taiScore += weight * predictions.statisticalPrediction.confidence;
    } else {
      xiuScore += weight * predictions.statisticalPrediction.confidence;
    }
    totalConfidence += weight * predictions.statisticalPrediction.confidence;
    reasons.push(predictions.statisticalPrediction.reason);
  }
  
  if (predictions.streakPrediction.prediction) {
    const weight = weights.trendAnalysisWeight;
    if (predictions.streakPrediction.prediction === 'Tài') {
      taiScore += weight * predictions.streakPrediction.confidence;
    } else {
      xiuScore += weight * predictions.streakPrediction.confidence;
    }
    totalConfidence += weight * predictions.streakPrediction.confidence;
    reasons.push(predictions.streakPrediction.reason);
  }
  
  if (predictions.scoreBasedPrediction.prediction) {
    const weight = weights.scoreAnalysisWeight;
    if (predictions.scoreBasedPrediction.prediction === 'Tài') {
      taiScore += weight * predictions.scoreBasedPrediction.confidence;
    } else {
      xiuScore += weight * predictions.scoreBasedPrediction.confidence;
    }
    totalConfidence += weight * predictions.scoreBasedPrediction.confidence;
    reasons.push(predictions.scoreBasedPrediction.reason);
  }
  
  // Áp dụng điều chỉnh biến động
  const volatilityAdjustment = predictions.volatilityAdjustment.adjustment;
  totalConfidence = Math.max(0.1, Math.min(0.95, totalConfidence + volatilityAdjustment));
  
  // Xác định dự đoán cuối cùng
  const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
  const confidenceRatio = Math.abs(taiScore - xiuScore) / (taiScore + xiuScore);
  const finalConfidence = totalConfidence * (0.5 + confidenceRatio * 0.5);
  
  return {
    prediction: finalPrediction,
    confidence: finalConfidence,
    mainReason: reasons.length > 0 ? reasons.join('; ') : 'Combined model prediction',
    detailedReasons: reasons
  };
}

// Hàm tiện ích
function calculateStandardDeviation(values) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

function calculateCurrentStreak(results) {
  if (results.length === 0) return 0;
  let streak = 1;
  const lastResult = results[results.length - 1];
  
  for (let i = results.length - 2; i >= 0; i--) {
    if (results[i] === lastResult) streak++;
    else break;
  }
  
  return streak;
}

function calculateStreakEndProbability(currentStreak, avgStreak, maxStreak) {
  // Tính toán xác suất kết thúc chuỗi dựa trên thống kê
  if (currentStreak <= avgStreak) return 0.3;
  if (currentStreak >= maxStreak) return 0.9;
  
  const excess = currentStreak - avgStreak;
  const range = maxStreak - avgStreak;
  return 0.3 + (0.6 * (excess / range));
}

function detectCycles(results) {
  // Phát hiện các chu kỳ trong kết quả
  const maxCycleLength = Math.min(6, Math.floor(results.length / 2));
  const cycles = [];
  
  for (let cycleLen = 2; cycleLen <= maxCycleLength; cycleLen++) {
    if (results.length < cycleLen * 2) continue;
    
    const lastCycle = results.slice(-cycleLen);
    const prevCycle = results.slice(-cycleLen * 2, -cycleLen);
    
    if (JSON.stringify(lastCycle) === JSON.stringify(prevCycle)) {
      cycles.push({
        length: cycleLen,
        pattern: lastCycle,
        occurrences: 2
      });
    }
  }
  
  return cycles;
}

function predictFromCycles(cycles) {
  // Dự đoán từ chu kỳ được phát hiện
  const longestCycle = cycles.sort((a, b) => b.length - a.length)[0];
  return longestCycle.pattern[0]; // Trả về phần tử đầu tiên của chu kỳ
}

function evaluateModelPerformance(modelName, history) {
  // Đánh giá hiệu suất mô hình dựa trên lịch sử
  // (Triển khai logic đánh giá hiệu suất thực tế)
  return 1.0; // Tạm thời trả về 1.0 cho tất cả mô hình
}

// API chính
function predictTaiXiu(history) {
  try {
    // Giới hạn lịch sử để tối ưu hiệu suất
    const limitedHistory = history.slice(-this.config.maxHistoryLength);
    
    // Phân tích và dự đoán
    const analysisResult = this.analyzeGameTrends(limitedHistory);
    
    // Lưu trữ kết quả để theo dõi hiệu suất
    this.storePredictionResult(analysisResult);
    
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
      fallbackPrediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu',
      confidence: 0.5,
      timestamp: new Date().toISOString()
    };
  }
}

// Xuất module
module.exports = {
  predictTaiXiu,
  config: predictionModel.config,
  analyzeGameTrends
};
