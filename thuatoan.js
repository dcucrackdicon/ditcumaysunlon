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
  // SỬA: Thay thế 'this.config' bằng 'predictionModel.config'
  if (!history || history.length < predictionModel.config.minHistoryLength) {
    return { prediction: null, confidence: 0, analysis: 'Insufficient data' };
  }

  const enhancedAnalysis = {
    scorePatterns: detectScorePatterns(history),
    resultSequences: analyzeResultSequences(history),
    volatility: calculateMarketVolatility(history),
    statisticalTrends: calculateStatisticalTrends(history),
    streakAnalysis: performStreakAnalysis(history)
  };

  const predictions = {
    patternRecognition: patternRecognitionModel(enhancedAnalysis.resultSequences),
    statisticalPrediction: statisticalPredictionModel(enhancedAnalysis.statisticalTrends),
    volatilityAdjustment: volatilityAdjustmentModel(enhancedAnalysis.volatility),
    streakPrediction: streakPredictionModel(enhancedAnalysis.streakAnalysis),
    scoreBasedPrediction: scoreBasedPredictionModel(enhancedAnalysis.scorePatterns)
  };

  // SỬA: Thay thế 'this.config' bằng 'predictionModel.config'
  const dynamicWeights = predictionModel.config.dynamicWeightAdjustment 
    ? calculateDynamicWeights(predictions, history) 
    : predictionModel.config;

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

// Sửa 'this.config' trong tất cả các hàm bên dưới

function detectScorePatterns(history) {
  const scores = history.map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  const scoreDistribution = {
    taiRange: scores.filter(s => s > 10.5).length / scores.length,
    xiuRange: scores.filter(s => s < 10.5).length / scores.length,
    nearThreshold: scores.filter(s => s >= 9.5 && s <= 11.5).length / scores.length
  };

  const last10Scores = scores.slice(0, 10);
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
  const results = history.map(r => r.result === 'Tài' ? 'T' : 'X');
  const patterns = [];
  const depth = Math.min(predictionModel.config.patternRecognitionDepth, results.length - 1);

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
    taiXiuRatio: results.filter(r => r === 'T').length / results.length
  };
}

function calculateMarketVolatility(history) {
  const scores = history.map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = calculateStandardDeviation(scores);
  
  const recentScores = scores.slice(0, 10);
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const recentStdDev = calculateStandardDeviation(recentScores);
  
  return {
    overallVolatility: stdDev / avgScore,
    recentVolatility: recentStdDev / recentAvg,
    volatilityChange: (recentStdDev - stdDev) / (stdDev || 1),
    isHighlyVolatile: recentStdDev > 3.5
  };
}

function calculateStatisticalTrends(history) {
    const results = history.map(r => r.result === 'Tài' ? 'T' : 'X');
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
    const results = history.map(r => r.result === 'Tài' ? 'T' : 'X');
    if (results.length === 0) return { currentStreak: 0, currentResult: null, averageStreak: 0, maxStreak: 0, streakEndProbability: 0.5, isLongStreak: false };

  let currentStreak = 1;
  const currentResult = results[0];
  
  for (let i = 1; i < results.length; i++) {
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

function patternRecognitionModel(sequenceAnalysis) {
  if (!sequenceAnalysis.mostCommonPattern) {
    return { prediction: null, confidence: 0, reason: 'No significant patterns detected' };
  }
  
  const patternParts = sequenceAnalysis.mostCommonPattern[0].split('-');
  const lastResultInHistory = sequenceAnalysis.currentStreak.currentResult;
  const expectedNext = patternParts[patternParts.length - 1];
  
  if (sequenceAnalysis.mostCommonPattern[1] >= 2) {
    const confidence = Math.min(0.8, sequenceAnalysis.mostCommonPattern[1] * 0.2);
    return {
      prediction: expectedNext,
      confidence: confidence,
      reason: `Pattern lặp (${sequenceAnalysis.mostCommonPattern[0]} x${sequenceAnalysis.mostCommonPattern[1]})`
    };
  }
  
  if (sequenceAnalysis.switchRate > 0.7) {
    return {
      prediction: lastResultInHistory === 'T' ? 'X' : 'T',
      confidence: 0.65,
      reason: `Tỷ lệ bẻ cầu cao (${(sequenceAnalysis.switchRate * 100).toFixed(1)}%)`
    };
  }
  
  return {
    prediction: null,
    confidence: 0,
    reason: 'Không có pattern rõ ràng'
  };
}

function statisticalPredictionModel(statisticalTrends) {
  const { taiProbability, xiuProbability, imbalance, expectedNext } = statisticalTrends;
  
  if (expectedNext) {
    return {
      prediction: expectedNext,
      confidence: 0.7,
      reason: 'Phát hiện chu kỳ lặp'
    };
  }
  
  if (Math.abs(imbalance) > 0.3) {
    const predicted = imbalance > 0 ? 'X' : 'T';
    return {
      prediction: predicted,
      confidence: Math.min(0.8, Math.abs(imbalance) * 1.5),
      reason: `Mất cân bằng (${(imbalance * 100).toFixed(1)}% thiên về ${imbalance > 0 ? 'Tài' : 'Xỉu'})`
    };
  }
  
  return {
    prediction: taiProbability > xiuProbability ? 'T' : 'X',
    confidence: Math.abs(taiProbability - xiuProbability) * 0.8,
    reason: `Xác suất (Tài: ${(taiProbability * 100).toFixed(1)}%, Xỉu: ${(xiuProbability * 100).toFixed(1)}%)`
  };
}

function volatilityAdjustmentModel(volatilityAnalysis) {
  if (volatilityAnalysis.isHighlyVolatile) {
    return {
      prediction: null,
      confidence: 0,
      adjustment: -0.2,
      reason: 'Thị trường biến động cao'
    };
  }
  
  if (volatilityAnalysis.volatilityChange > 0.5) {
    return {
      prediction: null,
      confidence: 0,
      adjustment: -0.15,
      reason: 'Biến động đang tăng'
    };
  }
  
  return {
    prediction: null,
    confidence: 0,
    adjustment: 0.1,
    reason: 'Thị trường ổn định'
  };
}

function streakPredictionModel(streakAnalysis) {
  const { currentStreak, currentResult, streakEndProbability, isLongStreak } = streakAnalysis;
  
  if (isLongStreak && streakEndProbability > predictionModel.config.streakBreakThreshold) {
    return {
      prediction: currentResult === 'T' ? 'X' : 'T',
      confidence: streakEndProbability * 0.9,
      reason: `Cầu dài (${currentStreak} ${currentResult}), xác suất gãy cao (${(streakEndProbability * 100).toFixed(1)}%)`
    };
  }
  
  return {
    prediction: currentResult,
    confidence: (1 - streakEndProbability) * 0.7,
    reason: `Theo cầu (${currentStreak} ${currentResult}), xác suất gãy thấp (${(streakEndProbability * 100).toFixed(1)}%)`
  };
}

function scoreBasedPredictionModel(scoreAnalysis) {
  const { average, distribution, trend } = scoreAnalysis;
  
  if (average > 11 && distribution.taiRange > 0.6) {
    return {
      prediction: 'T',
      confidence: 0.75,
      reason: `Điểm trung bình cao (${average.toFixed(1)}) & thiên Tài (${(distribution.taiRange * 100).toFixed(1)}%)`
    };
  }
  
  if (average < 9.5 && distribution.xiuRange > 0.6) {
    return {
      prediction: 'X',
      confidence: 0.75,
      reason: `Điểm trung bình thấp (${average.toFixed(1)}) & thiên Xỉu (${(distribution.xiuRange * 100).toFixed(1)}%)`
    };
  }
  
  if (trend.increasing >= 7) {
    return {
      prediction: 'T',
      confidence: 0.65,
      reason: 'Xu hướng điểm tăng mạnh'
    };
  }
  
  if (trend.decreasing >= 7) {
    return {
      prediction: 'X',
      confidence: 0.65,
      reason: 'Xu hướng điểm giảm mạnh'
    };
  }
  
  return {
    prediction: average > 10.5 ? 'T' : 'X',
    confidence: 0.6,
    reason: `Dựa vào điểm trung bình (${average.toFixed(1)})`
  };
}

function calculateDynamicWeights(predictions, history) {
  const performanceRatios = {
    pattern: evaluateModelPerformance('pattern', history),
    statistical: evaluateModelPerformance('statistical', history),
    streak: evaluateModelPerformance('streak', history),
    score: evaluateModelPerformance('score', history)
  };
  
  const totalPerformance = Object.values(performanceRatios).reduce((a, b) => a + b, 0) || 1;
  
  return {
    patternAnalysisWeight: (performanceRatios.pattern / totalPerformance) * 0.4,
    statisticalAnalysisWeight: (performanceRatios.statistical / totalPerformance) * 0.3,
    trendAnalysisWeight: (performanceRatios.streak / totalPerformance) * 0.2,
    scoreAnalysisWeight: (performanceRatios.score / totalPerformance) * 0.1,
    volatilityAnalysisWeight: 0.1
  };
}

function calculateFinalPrediction(predictions, weights) {
  let taiScore = 0;
  let xiuScore = 0;
  const contributingReasons = [];
  
  const models = [
      { p: predictions.patternRecognition, w: weights.patternAnalysisWeight },
      { p: predictions.statisticalPrediction, w: weights.statisticalAnalysisWeight },
      { p: predictions.streakPrediction, w: weights.trendAnalysisWeight },
      { p: predictions.scoreBasedPrediction, w: weights.scoreAnalysisWeight }
  ];

  for (const model of models) {
      if (model.p && model.p.prediction) {
          const score = model.w * model.p.confidence;
          if (model.p.prediction === 'T') {
              taiScore += score;
          } else {
              xiuScore += score;
          }
          contributingReasons.push({ reason: model.p.reason, score });
      }
  }
  
  const volatilityAdjustment = predictions.volatilityAdjustment.adjustment;
  const totalWeightedConfidence = (taiScore + xiuScore) * (1 + volatilityAdjustment);
  
  if (totalWeightedConfidence <= 0) {
      return { prediction: 'T', confidence: 0.5, mainReason: 'Không đủ tín hiệu mạnh' };
  }

  const finalPrediction = taiScore > xiuScore ? 'T' : 'X';
  const confidenceRatio = Math.abs(taiScore - xiuScore) / (taiScore + xiuScore);
  const finalConfidence = Math.max(0.1, Math.min(0.95, totalWeightedConfidence * (0.5 + confidenceRatio * 0.5)));

  const mainReason = contributingReasons.sort((a,b) => b.score - a.score)[0]?.reason || 'Tổng hợp nhiều mô hình';
  
  return {
    prediction: finalPrediction,
    confidence: finalConfidence,
    mainReason: mainReason,
  };
}

function calculateStandardDeviation(values) {
    if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

function calculateCurrentStreak(results) {
  if (results.length === 0) return 0;
  let streak = 1;
  const lastResult = results[0];
  
  for (let i = 1; i < results.length; i++) {
    if (results[i] === lastResult) streak++;
    else break;
  }
  
  return streak;
}

function calculateStreakEndProbability(currentStreak, avgStreak, maxStreak) {
  if (currentStreak <= avgStreak) return 0.3;
  if (currentStreak >= maxStreak) return 0.9;
  
  const excess = currentStreak - avgStreak;
  const range = (maxStreak - avgStreak) || 1;
  return 0.3 + (0.6 * (excess / range));
}

function detectCycles(results) {
  const maxCycleLength = Math.min(6, Math.floor(results.length / 2));
  const cycles = [];
  
  for (let cycleLen = 2; cycleLen <= maxCycleLength; cycleLen++) {
    if (results.length < cycleLen * 2) continue;
    
    const lastCycle = results.slice(0, cycleLen);
    const prevCycle = results.slice(cycleLen, cycleLen * 2);
    
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
  const longestCycle = cycles.sort((a, b) => b.length - a.length)[0];
  return longestCycle.pattern[0];
}

function evaluateModelPerformance(modelName, history) {
  return 1.0; 
}

function predictTaiXiu(history) {
  try {
    const limitedHistory = history.slice(0, predictionModel.config.maxHistoryLength);
    
    // SỬA: Phải gọi hàm analyzeGameTrends đã được định nghĩa ở trên
    const analysisResult = analyzeGameTrends(limitedHistory);
    
    if (!analysisResult.prediction) {
      return {
          success: false,
          error: analysisResult.analysis,
          fallbackPrediction: Math.random() < 0.5 ? 'T' : 'X',
          confidence: 0.5,
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
      fallbackPrediction: Math.random() < 0.5 ? 'T' : 'X',
      confidence: 0.5,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  predictTaiXiu
};
