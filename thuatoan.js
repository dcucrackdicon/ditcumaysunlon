/**
 * thuatoan.js - Phiên bản "Hệ Thống Chuyên Gia"
 *
 * Thuật toán sử dụng phương pháp đa luồng phân tích và hệ thống điểm để đưa ra dự đoán.
 * 1. Phân tích Xu hướng (Bắt bệt).
 * 2. Phân tích Thống kê (Nhìn tổng quan).
 * 3. Phân tích Mẫu hình (Tìm quy luật lặp lại).
 *
 * Kết quả được tổng hợp, nếu chênh lệch không đủ lớn, thuật toán sẽ bỏ qua.
 */

class MasterPredictor {
    constructor() {
        this.history = [];
        this.MAX_HISTORY_SIZE = 200; // Tăng lịch sử để phân tích mẫu hình tốt hơn
        this.MIN_HISTORY_FOR_PREDICTION = 20; // Cần ít nhất 20 phiên để có dữ liệu thống kê
    }

    async updateData(newResult) {
        const formattedResult = {
            totalScore: newResult.score,
            result: newResult.result
        };
        this.history.push(formattedResult);

        if (this.history.length > this.MAX_HISTORY_SIZE) {
            this.history.shift();
        }
    }

    /**
     * Chuyên gia 1: Phân tích xu hướng ngắn hạn (Bệt)
     */
    analyzeTrend(history) {
        const lastResult = history[history.length - 1].result;
        let streak = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].result === lastResult) {
                streak++;
            } else {
                break;
            }
        }

        if (streak >= 3) {
            // Dây bệt càng dài, phiếu càng mạnh, nhưng giảm dần sau 7
            const weight = Math.max(0, 1 - (streak - 7) * 0.15); 
            return { prediction: lastResult, score: streak * 0.2 * weight, reason: `Bệt ${streak}` };
        }
        return { prediction: null, score: 0, reason: "Không có bệt rõ" };
    }

    /**
     * Chuyên gia 2: Phân tích thống kê tổng quan
     */
    analyzeStats(history, lookback = 50) {
        const recentHistory = history.slice(-lookback);
        if (recentHistory.length < lookback) {
             return { prediction: null, score: 0, reason: "Chưa đủ dữ liệu thống kê" };
        }

        const taiCount = recentHistory.filter(h => h.result === 'Tài').length;
        const taiRatio = taiCount / recentHistory.length;

        const imbalance = Math.abs(taiRatio - 0.5); // Độ mất cân bằng
        
        if (imbalance > 0.15) { // Nếu 1 bên chiếm trên 65%
            const dominantResult = taiRatio > 0.5 ? 'Tài' : 'Xỉu';
            return { prediction: dominantResult, score: imbalance * 2, reason: `${dominantResult} chiếm ${(taiRatio*100).toFixed(0)}%` };
        }
        return { prediction: null, score: 0, reason: "Cân bằng" };
    }

    /**
     * Chuyên gia 3: Phân tích mẫu hình lịch sử
     */
    analyzePatterns(history, patternLength = 3) {
        const results = history.map(h => h.result);
        if (results.length < patternLength * 2) {
             return { prediction: null, score: 0, reason: "Chưa đủ dữ liệu mẫu hình" };
        }

        const lastPattern = results.slice(-patternLength).join('-');
        const occurrences = { 'Tài': 0, 'Xỉu': 0 };
        let totalFound = 0;

        for (let i = 0; i <= results.length - (patternLength + 1); i++) {
            const currentSlice = results.slice(i, i + patternLength).join('-');
            if (currentSlice === lastPattern) {
                const nextResult = results[i + patternLength];
                occurrences[nextResult]++;
                totalFound++;
            }
        }

        if (totalFound < 3) { // Yêu cầu mẫu hình xuất hiện ít nhất 3 lần
            return { prediction: null, score: 0, reason: `Mẫu [${lastPattern}] hiếm gặp` };
        }

        const taiProb = occurrences['Tài'] / totalFound;
        const xiuProb = occurrences['Xỉu'] / totalFound;
        const confidence = Math.max(taiProb, xiuProb);

        if (confidence > 0.70) { // Yêu cầu tỉ lệ trên 70%
            const prediction = taiProb > xiuProb ? 'Tài' : 'Xỉu';
            return { prediction, score: confidence * 1.5, reason: `Mẫu [${lastPattern}] -> ${prediction} (${(confidence * 100).toFixed(0)}%)` };
        }
        return { prediction: null, score: 0, reason: `Mẫu [${lastPattern}] không rõ ràng` };
    }

    async predict() {
        if (this.history.length < this.MIN_HISTORY_FOR_PREDICTION) {
            return {
                prediction: "?",
                confidence: 0,
                reason: `Đang chờ đủ ${this.MIN_HISTORY_FOR_PREDICTION} phiên để phân tích. Hiện có: ${this.history.length}.`
            };
        }

        // Gọi 3 chuyên gia
        const trendAnalysis = this.analyzeTrend(this.history);
        const statsAnalysis = this.analyzeStats(this.history);
        const patternAnalysis = this.analyzePatterns(this.history);

        // Tổng hợp điểm
        let taiScore = 0;
        let xiuScore = 0;
        const analyses = [trendAnalysis, statsAnalysis, patternAnalysis];
        
        analyses.forEach(analysis => {
            if (analysis.prediction === 'Tài') {
                taiScore += analysis.score;
            } else if (analysis.prediction === 'Xỉu') {
                xiuScore += analysis.score;
            }
        });

        // Tạo lý do tổng hợp
        const reason = `Lý do: [Xu hướng: ${trendAnalysis.reason}] | [Thống kê: ${statsAnalysis.reason}] | [Mẫu hình: ${patternAnalysis.reason}]`;
        
        const totalScore = taiScore + xiuScore;
        if (totalScore === 0) {
            return { prediction: "?", confidence: 0, reason: "Các chuyên gia không có ý kiến, nên bỏ qua." };
        }

        const prediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
        const confidence = Math.abs(taiScore - xiuScore) / totalScore;

        // Chỉ dự đoán nếu độ tin cậy (sự đồng thuận) đủ lớn
        if (confidence < 0.25) {
            return { prediction: "?", confidence: 0, reason: `Điểm quá cân bằng (Tài ${taiScore.toFixed(2)} - Xỉu ${xiuScore.toFixed(2)}), nên bỏ qua.` };
        }

        return {
            prediction,
            confidence: Math.min(0.95, confidence * 1.2), // Chuẩn hóa confidence
            reason: `Dự đoán: ${prediction}. Điểm: (Tài ${taiScore.toFixed(2)} - Xỉu ${xiuScore.toFixed(2)}). ${reason}`
        };
    }
}

module.exports = { MasterPredictor };
