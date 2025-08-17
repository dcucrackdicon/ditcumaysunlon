/**
 * thuatoan.js - Phiên bản "Thuật Toán Trạng Thái" (Luôn Dự Đoán)
 *
 * Thuật toán hoạt động dựa trên các trạng thái:
 * 1. ANALYZING: Tìm kiếm cầu. Nếu không thấy, sẽ đoán ngẫu nhiên.
 * 2. TRACKING: Bám theo cầu đã tìm thấy.
 * 3. Khi cầu gãy, ngay lập tức chuyển sang đoán ngẫu nhiên.
 */

class MasterPredictor {
    constructor() {
        this.history = [];
        this.MAX_HISTORY_SIZE = 200;
        this.MIN_HISTORY_FOR_PREDICTION = 5;

        this.currentState = 'ANALYZING';
        this.trackedPattern = {
            type: null,
            value: null
        };
    }

    async updateData(newResult) {
        this.history.push({
            totalScore: newResult.score,
            result: newResult.result
        });
        if (this.history.length > this.MAX_HISTORY_SIZE) {
            this.history.shift();
        }
    }

    async predict() {
        if (this.history.length < this.MIN_HISTORY_FOR_PREDICTION) {
            return {
                prediction: "?",
                confidence: 0,
                reason: `Đang chờ đủ ${this.MIN_HISTORY_FOR_PREDICTION} phiên. Hiện có: ${this.history.length}.`
            };
        }

        const lastResult = this.history[this.history.length - 1].result;
        const r = this.history.map(h => h.result);
        const r1 = lastResult,
              r2 = r[r.length - 2],
              r3 = r[r.length - 3];

        // --- BƯỚC 1: KIỂM TRA NẾU CẦU ĐANG THEO BỊ GÃY ---
        if (this.currentState === 'TRACKING') {
            let patternBroken = false;
            if (this.trackedPattern.type === 'STREAK' && r1 !== this.trackedPattern.value) {
                patternBroken = true;
            }
            if (this.trackedPattern.type === 'ALTERNATING' && r1 === r2) {
                patternBroken = true;
            }

            if (patternBroken) {
                this.currentState = 'ANALYZING';
                this.trackedPattern = { type: null, value: null };
                
                // THAY ĐỔI: Khi cầu gãy, đoán ngẫu nhiên ngay lập tức
                const prediction = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
                return {
                    prediction,
                    confidence: 0.50,
                    reason: `Cầu cũ đã gãy. Dự đoán ngẫu nhiên trong khi tìm cầu mới.`
                };
            }
        }

        // --- BƯỚC 2: XỬ LÝ DỰ ĐOÁN DỰA TRÊN TRẠNG THÁI HIỆN TẠI ---

        // A. Nếu đang trong trạng thái BÁM CẦU
        if (this.currentState === 'TRACKING') {
            if (this.trackedPattern.type === 'STREAK') {
                return {
                    prediction: this.trackedPattern.value,
                    confidence: 0.90,
                    reason: `Đang bám theo cầu bệt ${this.trackedPattern.value}.`
                };
            }
            if (this.trackedPattern.type === 'ALTERNATING') {
                const prediction = r1 === 'Tài' ? 'Xỉu' : 'Tài';
                return {
                    prediction,
                    confidence: 0.88,
                    reason: `Đang bám theo cầu 1-1 (${r2}-${r1}...).`
                };
            }
        }

        // B. Nếu đang trong trạng thái TÌM KIẾM
        if (this.currentState === 'ANALYZING') {
            // Ưu tiên 1: Tìm cầu bệt mới (3+ phiên)
            if (r1 === r2 && r2 === r3) {
                this.currentState = 'TRACKING';
                this.trackedPattern = { type: 'STREAK', value: r1 };
                return {
                    prediction: r1,
                    confidence: 0.90,
                    reason: `Phát hiện cầu bệt ${r1} mới. Bắt đầu bám theo.`
                };
            }

            // Ưu tiên 2: Tìm cầu 1-1 mới (3+ phiên)
            if (r1 !== r2 && r2 !== r3 && r1 === r3) {
                this.currentState = 'TRACKING';
                this.trackedPattern = { type: 'ALTERNATING', value: null };
                const prediction = r1 === 'Tài' ? 'Xỉu' : 'Tài';
                return {
                    prediction,
                    confidence: 0.88,
                    reason: `Phát hiện cầu 1-1 mới (${r3}-${r2}-${r1}). Bắt đầu bám theo.`
                };
            }

            // THAY ĐỔI: Nếu không tìm thấy cầu mới, dự đoán ngẫu nhiên
            const prediction = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
            return {
                prediction,
                confidence: 0.50,
                reason: "Chưa có cầu rõ ràng, dự đoán ngẫu nhiên."
            };
        }
        
        // Trường hợp dự phòng
        const prediction = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
        return { prediction, confidence: 0.50, reason: "Lỗi logic, reset về dự đoán ngẫu nhiên." };
    }
}

module.exports = { MasterPredictor };
