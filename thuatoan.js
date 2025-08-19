/**
 * thuatoan.js (Phiên bản Bệt & Ngẫu Nhiên)
 *
 * --- LOGIC CỐT LÕI ---
 * 1. ƯU TIÊN BỆT: Nếu phát hiện chuỗi 3 phiên giống nhau, sẽ theo bệt đến cùng.
 * - Ví dụ: ...Tài, Tài, Tài -> Dự đoán tiếp là TÀI.
 *
 * 2. NGẪU NHIÊN: Nếu không có bệt, sẽ dự đoán ngẫu nhiên.
 * - Ví dụ: Random ra Tài -> Kết quả cuối cùng là TÀI.
 */

class MasterPredictor {
    constructor() {
        this.history = [];
        this.MAX_HISTORY_SIZE = 200; // Giữ lại để quản lý bộ nhớ
    }

    async updateData(newResult) {
        this.history.push({ totalScore: newResult.score, result: newResult.result });
        if (this.history.length > this.MAX_HISTORY_SIZE) {
            this.history.shift();
        }
    }

    async predict() {
        const historyLength = this.history.length;

        // Cần ít nhất 3 phiên để xác định bệt
        if (historyLength < 3) {
            return {
                prediction: "?",
                confidence: 0,
                reason: `Đang chờ đủ 3 phiên để bắt bệt. Hiện có: ${historyLength} phiên.`
            };
        }

        const last3Results = this.history.slice(-3).map(h => h.result);

        // --- BƯỚC 1: KIỂM TRA BỆT (ƯU TIÊN CAO NHẤT) ---
        const isStreak = last3Results.length === 3 && last3Results[0] === last3Results[1] && last3Results[1] === last3Results[2];

        if (isStreak) {
            const streakResult = last3Results[0];
            // Nếu có bệt, đi theo bệt.
            return {
                prediction: streakResult,
                confidence: 0.90, // Tự tin cao khi theo bệt
                reason: `[Theo Bệt] Phát hiện chuỗi ${streakResult} 3 phiên. Theo đến chết!`
            };
        }

        // --- BƯỚC 2: NẾU KHÔNG CÓ BỆT -> NGẪU NHIÊN ---
        // Chọn ngẫu nhiên một kết quả
        const finalPrediction = Math.random() < 0.5 ? 'Tài' : 'Xỉu';

        return {
            prediction: finalPrediction,
            confidence: 0.51, // Độ tin cậy thấp vì là ngẫu nhiên
            reason: `[Ngẫu Nhiên] Không có bệt. Dự đoán ngẫu nhiên ra ${finalPrediction}.`
        };
    }
}

module.exports = { MasterPredictor };
