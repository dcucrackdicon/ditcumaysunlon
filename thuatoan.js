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
    scorePatterns: detectScorePatterns.call(this, history),
    resultSequences: analyzeResultSequences.call(this, history),
    volatility: calculateMarketVolatility.call(this, history),
    statisticalTrends: calculateStatisticalTrends.call(this, history),
    streakAnalysis: performStreakAnalysis.call(this, history)
  };

  // Tính điểm dự đoán từ các mô hình
  const predictions = {
    patternRecognition: patternRecognitionModel.call(this, enhancedAnalysis.resultSequences),
    statisticalPrediction: statisticalPredictionModel.call(this, enhancedAnalysis.statisticalTrends),
    volatilityAdjustment: volatilityAdjustmentModel.call(this, enhancedAnalysis.volatility),
    streakPrediction: streakPredictionModel.call(this, enhancedAnalysis.streakAnalysis),
    scoreBasedPrediction: scoreBasedPredictionModel.call(this, enhancedAnalysis.scorePatterns)
  };

  // Tính toán trọng số động
  const dynamicWeights = this.config.dynamicWeightAdjustment 
    ? calculateDynamicWeights.call(this, predictions, history) 
    : this.config;

  // Tổng hợp kết quả
  const finalPrediction = calculateFinalPrediction.call(this, predictions, dynamicWeights);

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
  
  const scoreDistribution = {
    taiRange: scores.filter(s => s > 10.5).length / scores.length,
    xiuRange: scores.filter(s => s < 10.5).length / scores.length,
    nearThreshold: scores.filter(s => s >= 9.5 && s <= 11.5).length / scores.length
  };

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

  for (let i = 0; i <= results.length - depth; i++) {
    const pattern = results.slice(i, i + depth).join('-');
    patterns.push(pattern);
  }

  const patternCounts = patterns.reduce((acc, pattern) => {
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {});

  const mostCommonPattern = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const switches = results.slice(1).reduce((count, res, i) => 
    count + (res !== results[i] ? 1 : 0), 0);

  return {
    patterns: patternCounts,
    mostCommonPattern: mostCommonPattern,
    switchRate: switches / (results.length - 1),
    currentStreak: calculateCurrentStreak(results),
    // LỖI Ở ĐÂY: Đã sửa từ 'Tài' thành 'T'
    taiXiuRatio: results.filter(r => r === 'T').length / results.length
  };
}

function calculateMarketVolatility(history) {
  const scores = history.map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = calculateStandardDeviation(scores);
  
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
  // LỖI Ở ĐÂY: Đã sửa từ 'Tài' || 'T' thành chỉ 'T' cho nhất quán
  const taiCount = results.filter(r => r === 'T').length;
  const xiuCount = results.length - taiCount;
  
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
  
  if (sequenceAnalysis.mostCommonPattern[1] >= 2) {
    const confidence = Math.min(0.8, sequenceAnalysis.mostCommonPattern[1] * 0.2);
    return {
      prediction: expectedNext,
      confidence: confidence,
      reason: `Detected repeating pattern (${sequenceAnalysis.mostCommonPattern[0]} occurred ${sequenceAnalysis.mostCommonPattern[1]} times)`
    };
  }
  
  if (sequenceAnalysis.switchRate > 0.7) {
    return {
      prediction: lastResult === 'T' ? 'X' : 'T',
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
  const { taiProbability, xiuProbability, imbalance, expectedNext } = statisticalTrends;
  
  if (expectedNext) {
    return {
      prediction: expectedNext,
      confidence: 0.7,
      reason: 'Detected cyclical pattern in results'
    };
  }
  
  if (Math.abs(imbalance) > 0.3) {
    const predicted = imbalance > 0 ? 'X' : 'T';
    return {
      prediction: predicted,
      confidence: Math.min(0.8, Math.abs(imbalance) * 1.5),
      reason: `Significant imbalance detected (${(imbalance * 100).toFixed(1)}% ${imbalance > 0 ? 'Tài' : 'Xỉu'} bias)`
    };
  }
  
  return {
    prediction: taiProbability > xiuProbability ? 'T' : 'X',
    confidence: Math.abs(taiProbability - xiuProbability) * 0.8,
    reason: `Basic probability (Tài: ${(taiProbability * 100).toFixed(1)}%, Xỉu: ${(xiuProbability * 100).toFixed(1)}%)`
  };
}

function volatilityAdjustmentModel(volatilityAnalysis) {
  if (volatilityAnalysis.isHighlyVolatile) {
    return {
      prediction: null,
      confidence: 0,
      adjustment: -0.2,
      reason: 'High volatility market - reducing confidence'
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
  const { currentStreak, currentResult, streakEndProbability, isLongStreak } = streakAnalysis;
  
  if (isLongStreak && streakEndProbability > this.config.streakBreakThreshold) {
    return {
      prediction: currentResult === 'T' ? 'X' : 'T',
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
  const { average, distribution, trend } = scoreAnalysis;
  
  if (average > 11 && distribution.taiRange > 0.6) {
    return {
      prediction: 'T',
      confidence: 0.75,
      reason: `High average score (${average.toFixed(1)}) with strong Tài tendency (${(distribution.taiRange * 100).toFixed(1)}%)`
    };
  }
  
  if (average < 9.5 && distribution.xiuRange > 0.6) {
    return {
      prediction: 'X',
      confidence: 0.75,
      reason: `Low average score (${average.toFixed(1)}) with strong Xỉu tendency (${(distribution.xiuRange * 100).toFixed(1)}%)`
    };
  }
  
  if (trend.increasing >= 7) {
    return {
      prediction: 'T',
      confidence: 0.65,
      reason: 'Strong upward score trend'
    };
  }
  
  if (trend.decreasing >= 7) {
    return {
      prediction: 'X',
      confidence: 0.65,
      reason: 'Strong downward score trend'
    };
  }
  
  return {
    prediction: average > 10.5 ? 'T' : 'X',
    confidence: 0.6,
    reason: `Basic score-based prediction (average: ${average.toFixed(1)})`
  };
}

// Các hàm hỗ trợ
function calculateDynamicWeights(predictions, history) {
  // Logic này có thể được mở rộng để đánh giá hiệu suất thực tế
  return {
    patternAnalysisWeight: 0.25,
    statisticalAnalysisWeight: 0.2,
    trendAnalysisWeight: 0.3,
    scoreAnalysisWeight: 0.15,
    volatilityAnalysisWeight: 0.1
  };
}

function calculateFinalPrediction(predictions, weights) {
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

  models.forEach(({ pred, weight }) => {
    if (pred.prediction) {
      if (pred.prediction === 'T') {
        taiScore += weight * pred.confidence;
      } else {
        xiuScore += weight * pred.confidence;
      }
      totalConfidence += weight * pred.confidence;
      reasons.push(pred.reason);
    }
  });

  if (taiScore === 0 && xiuScore === 0) {
      return { prediction: null, confidence: 0, mainReason: 'No conclusive data from any model.' };
  }

  const volatilityAdjustment = predictions.volatilityAdjustment.adjustment;
  totalConfidence = Math.max(0.1, Math.min(0.95, totalConfidence + volatilityAdjustment));
  
  const finalPrediction = taiScore > xiuScore ? 'T' : 'X';
  const confidenceRatio = Math.abs(taiScore - xiuScore) / (taiScore + xiuScore);
  const finalConfidence = totalConfidence * (0.5 + confidenceRatio * 0.5);
  
  return {
    prediction: finalPrediction,
    confidence: finalConfidence,
    mainReason: reasons.length > 0 ? reasons.join('; ') : 'Combined model prediction',
  };
}

// Hàm tiện ích
function calculateStandardDeviation(values) {
    if (values.length < 2) return 0;
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
  if (range === 0) return 0.6;
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
      cycles.push({
        length: cycleLen,
        pattern: lastCycle
      });
    }
  }
  return cycles;
}

function predictFromCycles(cycles) {
  if (cycles.length === 0) return null;
  const longestCycle = cycles.sort((a, b) => b.length - a.length)[0];
  return longestCycle.pattern[0]; 
}

// API chính
function predictTaiXiu(history) {
  try {
    const limitedHistory = history.slice(-this.config.maxHistoryLength);
    const analysisResult = this.analyzeGameTrends(limitedHistory);
    
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
      fallbackPrediction: Math.random() < 0.5 ? 'T' : 'X',
      confidence: 0.5,
      timestamp: new Date().toISOString()
    };
  }
}

// Sửa lỗi context 'this' khi export module
module.exports = {
  predictTaiXiu: predictTaiXiu.bind(predictionModel),
  config: predictionModel.config,
  analyzeGameTrends: analyzeGameTrends.bind(predictionModel)
};
