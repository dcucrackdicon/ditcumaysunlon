// thuatoan.js

// Multi-dimensional Multi-layer Analysis for Tài/Xỉu Prediction
class TaiXiuPredictor {
  constructor() {
    this.history = [];
    this.trendWindow = 10;
    this.models = this.initializeModels();
  }

  // Khởi tạo các mô hình dự đoán
  initializeModels() {
    return {
      statisticalModel: new StatisticalModel(),
      timeSeriesModel: new TimeSeriesModel(),
      neuralNetwork: new NeuralNetwork(),
      bayesianModel: new BayesianModel()
    };
  }

  // Cập nhật dữ liệu mới
  updateData(newResults) {
    this.history = [...this.history, ...newResults];
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000); // Giữ lại 1000 kết quả gần nhất
    }
    
    // Cập nhật các mô hình
    this.trainModels();
  }

  // Huấn luyện các mô hình
  trainModels() {
    if (this.history.length < 50) return; // Cần ít nhất 50 dữ liệu để huấn luyện
    
    Object.values(this.models).forEach(model => {
      model.train(this.history);
    });
  }

  // Phân tích đa tầng
  multilayerAnalysis() {
    const analysisResults = {};
    
    // Tầng 1: Phân tích thống kê
    analysisResults.statistical = this.models.statisticalModel.analyze(this.history);
    
    // Tầng 2: Phân tích chuỗi thời gian
    analysisResults.timeSeries = this.models.timeSeriesModel.analyze(this.history);
    
    // Tầng 3: Mạng neural
    analysisResults.neural = this.models.neuralNetwork.analyze(this.history);
    
    // Tầng 4: Phân tích Bayesian
    analysisResults.bayesian = this.models.bayesianModel.analyze(this.history);
    
    return analysisResults;
  }

  // Phân tích xu hướng
  trendAnalysis() {
    if (this.history.length < this.trendWindow) return null;
    
    const trends = [];
    for (let i = this.trendWindow; i <= this.history.length; i++) {
      const window = this.history.slice(i - this.trendWindow, i);
      const taiCount = window.filter(x => x === 'T').length;
      const taiRatio = taiCount / this.trendWindow;
      
      const momentum = this.calculateMomentum(window);
      
      let trend;
      if (taiRatio > 0.6 && momentum > 0) trend = 'STRONG_TAI';
      else if (taiRatio > 0.55 && momentum > 0) trend = 'WEAK_TAI';
      else if (taiRatio < 0.4 && momentum < 0) trend = 'STRONG_XIU';
      else if (taiRatio < 0.45 && momentum < 0) trend = 'WEAK_XIU';
      else trend = 'NEUTRAL';
      
      trends.push(trend);
    }
    
    return this.smoothTrends(trends);
  }

  // Tính momentum
  calculateMomentum(window) {
    let changes = 0;
    for (let i = 1; i < window.length; i++) {
      if (window[i] === 'T' && window[i-1] === 'X') changes++;
      else if (window[i] === 'X' && window[i-1] === 'T') changes--;
    }
    return changes / window.length;
  }

  // Làm mượt xu hướng
  smoothTrends(trends) {
    if (trends.length < 3) return trends;
    
    const smoothed = [...trends];
    for (let i = 1; i < trends.length - 1; i++) {
      if (trends[i-1] === trends[i+1] && trends[i] !== trends[i-1]) {
        smoothed[i] = trends[i-1];
      }
    }
    return smoothed;
  }

  // Dự đoán kết quả tiếp theo
  predict() {
    if (this.history.length < 50) return { prediction: null, confidence: 0 };
    
    const analysis = this.multilayerAnalysis();
    const trends = this.trendAnalysis();
    const currentTrend = trends ? trends[trends.length - 1] : null;
    
    // Tổng hợp dự đoán từ các mô hình
    const predictions = [
      { source: 'statistical', prediction: analysis.statistical.prediction, confidence: analysis.statistical.confidence },
      { source: 'timeSeries', prediction: analysis.timeSeries.prediction, confidence: analysis.timeSeries.confidence },
      { source: 'neural', prediction: analysis.neural.prediction, confidence: analysis.neural.confidence },
      { source: 'bayesian', prediction: analysis.bayesian.prediction, confidence: analysis.bayesian.confidence }
    ];
    
    // Tính toán dự đoán tổng hợp
    const weightedPredictions = this.calculateWeightedPredictions(predictions);
    const finalPrediction = this.makeFinalDecision(weightedPredictions, currentTrend);
    
    return finalPrediction;
  }

  // Tính toán dự đoán có trọng số
  calculateWeightedPredictions(predictions) {
    let taiWeight = 0;
    let xiuWeight = 0;
    let totalConfidence = 0;
    
    predictions.forEach(p => {
      const weight = p.confidence;
      totalConfidence += weight;
      
      if (p.prediction === 'T') taiWeight += weight;
      else if (p.prediction === 'X') xiuWeight += weight;
    });
    
    const taiProb = taiWeight / totalConfidence;
    const xiuProb = xiuWeight / totalConfidence;
    
    return {
      prediction: taiProb > xiuProb ? 'T' : 'X',
      confidence: Math.max(taiProb, xiuProb),
      taiProbability: taiProb,
      xiuProbability: xiuProb
    };
  }

  // Ra quyết định cuối cùng
  makeFinalDecision(weightedPrediction, currentTrend) {
    const THRESHOLD_HIGH = 0.7;
    const THRESHOLD_MED = 0.6;
    
    if (weightedPrediction.confidence >= THRESHOLD_HIGH) {
      return weightedPrediction;
    }
    
    // Điều chỉnh theo xu hướng nếu độ tin cậy trung bình
    if (weightedPrediction.confidence >= THRESHOLD_MED && currentTrend) {
      const trendAdjusted = this.adjustForTrend(weightedPrediction, currentTrend);
      return trendAdjusted;
    }
    
    // Trường hợp độ tin cậy thấp
    return {
      ...weightedPrediction,
      confidence: weightedPrediction.confidence * 0.8, // Giảm độ tin cậy
      note: 'Low confidence prediction'
    };
  }

  // Điều chỉnh theo xu hướng
  adjustForTrend(prediction, trend) {
    const trendStrength = {
      'STRONG_TAI': 1.2,
      'WEAK_TAI': 1.1,
      'NEUTRAL': 1.0,
      'WEAK_XIU': 1.1,
      'STRONG_XIU': 1.2
    };
    
    let adjusted = {...prediction};
    
    if (trend.includes('TAI')) {
      adjusted.taiProbability *= trendStrength[trend];
      adjusted.xiuProbability /= trendStrength[trend];
    } else if (trend.includes('XIU')) {
      adjusted.xiuProbability *= trendStrength[trend];
      adjusted.taiProbability /= trendStrength[trend];
    }
    
    // Chuẩn hóa lại xác suất
    const total = adjusted.taiProbability + adjusted.xiuProbability;
    adjusted.taiProbability /= total;
    adjusted.xiuProbability /= total;
    
    adjusted.prediction = adjusted.taiProbability > adjusted.xiuProbability ? 'T' : 'X';
    adjusted.confidence = Math.max(adjusted.taiProbability, adjusted.xiuProbability);
    adjusted.note = `Trend adjusted (${trend})`;
    
    return adjusted;
  }
}

// Các mô hình con
class StatisticalModel {
  train(data) {
    // Huấn luyện mô hình thống kê
    this.taiProb = data.filter(x => x === 'T').length / data.length;
  }

  analyze(data) {
    const last10 = data.slice(-10);
    const shortTermProb = last10.filter(x => x === 'T').length / 10;
    
    // Kết hợp xác suất dài hạn và ngắn hạn
    const combinedProb = (this.taiProb * 0.6) + (shortTermProb * 0.4);
    
    return {
      prediction: combinedProb > 0.5 ? 'T' : 'X',
      confidence: Math.abs(combinedProb - 0.5) * 2, // Chuyển thành độ tin cậy 0-1
      taiProbability: combinedProb,
      xiuProbability: 1 - combinedProb
    };
  }
}

class TimeSeriesModel {
  train(data) {
    // Huấn luyện mô hình chuỗi thời gian đơn giản
    this.patterns = this.extractPatterns(data);
  }

  extractPatterns(data) {
    const patterns = {};
    const patternLength = 3;
    
    for (let i = 0; i < data.length - patternLength; i++) {
      const pattern = data.slice(i, i + patternLength).join('');
      const next = data[i + patternLength];
      
      if (!patterns[pattern]) {
        patterns[pattern] = { T: 0, X: 0 };
      }
      patterns[pattern][next]++;
    }
    
    // Tính xác suất
    for (const pattern in patterns) {
      const total = patterns[pattern].T + patterns[pattern].X;
      patterns[pattern].T /= total;
      patterns[pattern].X /= total;
    }
    
    return patterns;
  }

  analyze(data) {
    const patternLength = 3;
    if (data.length < patternLength) return { prediction: null, confidence: 0 };
    
    const lastPattern = data.slice(-patternLength).join('');
    const patternData = this.patterns[lastPattern];
    
    if (!patternData) {
      return {
        prediction: null,
        confidence: 0,
        note: 'Pattern not found'
      };
    }
    
    return {
      prediction: patternData.T > patternData.X ? 'T' : 'X',
      confidence: Math.max(patternData.T, patternData.X),
      taiProbability: patternData.T,
      xiuProbability: patternData.X
    };
  }
}

class NeuralNetwork {
  constructor() {
    this.weights = {
      pattern: 0.4,
      streak: 0.3,
      frequency: 0.3
    };
  }

  train(data) {
    // Trong triển khai thực tế sẽ dùng thư viện TensorFlow.js
    // Ở đây chỉ mô phỏng đơn giản
    this.calculateOptimalWeights(data);
  }

  calculateOptimalWeights(data) {
    // Đơn giản hóa - trong thực tế sẽ dùng backpropagation
    const taiCount = data.filter(x => x === 'T').length;
    const xiuCount = data.length - taiCount;
    
    // Điều chỉnh trọng số dựa trên phân phối
    const ratio = taiCount / data.length;
    this.weights.pattern = 0.3 + (Math.abs(ratio - 0.5) * 0.4);
    this.weights.streak = 0.25;
    this.weights.frequency = 0.45 - (Math.abs(ratio - 0.5) * 0.2);
  }

  analyze(data) {
    if (data.length < 5) return { prediction: null, confidence: 0 };
    
    // Tính điểm pattern
    const patternScore = this.analyzePatterns(data);
    
    // Tính điểm streak
    const streakScore = this.analyzeStreaks(data);
    
    // Tính điểm frequency
    const frequencyScore = this.analyzeFrequency(data);
    
    // Kết hợp các điểm số
    const totalScore = 
      (patternScore * this.weights.pattern) +
      (streakScore * this.weights.streak) +
      (frequencyScore * this.weights.frequency);
    
    const taiProb = 0.5 + (totalScore * 0.5);
    const confidence = Math.abs(totalScore);
    
    return {
      prediction: taiProb > 0.5 ? 'T' : 'X',
      confidence: confidence,
      taiProbability: taiProb,
      xiuProbability: 1 - taiProb
    };
  }

  analyzePatterns(data) {
    // Phân tích các mẫu lặp lại
    const window = 5;
    if (data.length < window) return 0;
    
    const currentPattern = data.slice(-window);
    let matches = 0;
    
    for (let i = 0; i < data.length - window; i++) {
      const pattern = data.slice(i, i + window);
      if (this.comparePatterns(pattern, currentPattern)) {
        const next = data[i + window];
        matches += next === 'T' ? 1 : -1;
      }
    }
    
    return matches / (data.length - window);
  }

  comparePatterns(p1, p2) {
    // So sánh 2 mẫu đơn giản
    let similarity = 0;
    for (let i = 0; i < p1.length; i++) {
      if (p1[i] === p2[i]) similarity++;
    }
    return similarity >= p1.length * 0.8;
  }

  analyzeStreaks(data) {
    // Phân tích các chuỗi liên tiếp
    if (data.length < 2) return 0;
    
    let currentStreak = 1;
    let lastResult = data[data.length - 1];
    let streakDirection = 0; // 1 for T, -1 for X
    
    for (let i = data.length - 2; i >= 0; i--) {
      if (data[i] === lastResult) {
        currentStreak++;
      } else {
        streakDirection = lastResult === 'T' ? 1 : -1;
        break;
      }
    }
    
    // Chuỗi dài thường có xu hướng đảo chiều
    return -streakDirection * (currentStreak / 10);
  }

  analyzeFrequency(data) {
    // Phân tích tần suất xuất hiện
    const window = 20;
    if (data.length < window) return 0;
    
    const recent = data.slice(-window);
    const taiCount = recent.filter(x => x === 'T').length;
    const ratio = taiCount / window;
    
    // Xu hướng trở về trung bình
    return 0.5 - ratio;
  }
}

class BayesianModel {
  train(data) {
    // Tính xác suất tiên nghiệm
    this.priorTai = data.filter(x => x === 'T').length / data.length;
    this.priorXiu = 1 - this.priorTai;
    
    // Tính xác suất có điều kiện
    this.calculateConditionalProbabilities(data);
  }

  calculateConditionalProbabilities(data) {
    this.conditionalProbs = {
      afterTT: { T: 0, X: 0 },
      afterTX: { T: 0, X: 0 },
      afterXT: { T: 0, X: 0 },
      afterXX: { T: 0, X: 0 }
    };
    
    for (let i = 0; i < data.length - 2; i++) {
      const pair = data[i] + data[i+1];
      const next = data[i+2];
      
      if (pair === 'TT') this.conditionalProbs.afterTT[next]++;
      else if (pair === 'TX') this.conditionalProbs.afterTX[next]++;
      else if (pair === 'XT') this.conditionalProbs.afterXT[next]++;
      else if (pair === 'XX') this.conditionalProbs.afterXX[next]++;
    }
    
    // Chuẩn hóa thành xác suất
    for (const key in this.conditionalProbs) {
      const total = this.conditionalProbs[key].T + this.conditionalProbs[key].X;
      if (total > 0) {
        this.conditionalProbs[key].T /= total;
        this.conditionalProbs[key].X /= total;
      } else {
        this.conditionalProbs[key].T = this.priorTai;
        this.conditionalProbs[key].X = this.priorXiu;
      }
    }
  }

  analyze(data) {
    if (data.length < 2) return { prediction: null, confidence: 0 };
    
    const lastTwo = data.slice(-2).join('');
    let conditionalProb;
    
    switch(lastTwo) {
      case 'TT': conditionalProb = this.conditionalProbs.afterTT; break;
      case 'TX': conditionalProb = this.conditionalProbs.afterTX; break;
      case 'XT': conditionalProb = this.conditionalProbs.afterXT; break;
      case 'XX': conditionalProb = this.conditionalProbs.afterXX; break;
      default: conditionalProb = { T: this.priorTai, X: this.priorXiu };
    }
    
    return {
      prediction: conditionalProb.T > conditionalProb.X ? 'T' : 'X',
      confidence: Math.max(conditionalProb.T, conditionalProb.X),
      taiProbability: conditionalProb.T,
      xiuProbability: conditionalProb.X
    };
  }
}

// Hàm tiện ích
function simulateGameResults(count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.random() > 0.5 ? 'T' : 'X');
  }
  return results;
}

// Ví dụ sử dụng
const predictor = new TaiXiuPredictor();

// Cập nhật dữ liệu giả lập (trong thực tế sẽ là dữ liệu thật)
const simulatedData = simulateGameResults(200);
predictor.updateData(simulatedData);

// Dự đoán kết quả tiếp theo
const prediction = predictor.predict();
console.log('Prediction:', prediction);

// Cập nhật kết quả mới và dự đoán lại
predictor.updateData(['T', 'X', 'T']);
const newPrediction = predictor.predict();
console.log('New Prediction:', newPrediction);

// Xuất khẩu để server.js có thể sử dụng
module.exports = { TaiXiuPredictor };
