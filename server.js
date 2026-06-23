Chuẩn luôn Hào ơi! Mình đã lấy file server.js hiện tại của bạn và chèn thêm 2 API xử lý đơn hàng (/api/orders) vào đúng vị trí (ngay phía dưới API đăng ký /api/users và trước thông báo lỗi 404).

Bạn chỉ cần copy toàn bộ đoạn mã bên dưới rồi dán đè sạch vào file server.js trên GitHub của bạn là xong nhé:

JavaScript
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const FIREBASE_URL = "https://homeser-93db3-default-rtdb.asia-southeast1.firebasedatabase.app";

function getVietnamTime() { return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }); }

function firebaseFetch(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = `${FIREBASE_URL}${endpoint}.json`;
        const payload = body ? JSON.stringify(body) : '';
        const options = { method: method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(data); } });
        });
        req.on('error', (err) => { resolve(null); });
        if (body) req.write(payload);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // XỬ LÝ LẤY DANH SÁCH USER
    if (req.url === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/users');
        res.end(JSON.stringify(data ? Object.values(data) : []));
        return;
    }

    // XỬ LÝ ĐĂNG KÝ USER MỚI (Lưu Địa chỉ & Chặn email rác)
    if (req.url === '/api/users' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const newUser = JSON.parse(body);

                // KIỂM TRA ĐUÔI @GMAIL TẠI SERVER LUÔN CHO CHẮC CHẮN
                if (!newUser.email.toLowerCase().endsWith("@gmail.com")) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, message: "Hệ thống chỉ chấp nhận email @gmail.com!" }));
                }

                const currentData = await firebaseFetch('/users');
                const users = currentData ? Object.values(currentData) : [];

                if (users.some(u => u.email === newUser.email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, message: "Email này đã được đăng ký!" }));
                }

                // Gắn thêm các dữ liệu thời gian 
                newUser.date = getVietnamTime();
                newUser.lastLogin = "Chưa đăng nhập";
                
                // Lưu lên Firebase (Bao gồm cả address từ Frontend gửi sang)
                const safeEmailKey = newUser.email.replace(/\./g, '_');
                await firebaseFetch(`/users/${safeEmailKey}`, 'PUT', newUser);

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đăng ký thành công!", user: newUser }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu đăng ký không đúng!" }));
            }
        });
        return;
    }

    // ========================================================
    // 📦 API 1: LẤY DANH SÁCH ĐƠN HÀNG (GET /api/orders)
    // ========================================================
    if (req.url === '/api/orders' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/orders');
        res.end(JSON.stringify(data ? Object.values(data) : []));
        return;
    }

    // ========================================================
    // 📥 API 2: NHẬN ĐƠN HÀNG MỚI TỪ KHÁCH (POST /api/orders)
    // ========================================================
    if (req.url === '/api/orders' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const newOrder = JSON.parse(body);

                // Tạo mã đơn hàng tự động theo thời gian chạy (Ví dụ: DH_1718293812)
                const orderId = 'DH_' + Date.now();
                
                // Bổ sung các trường thông tin quản lý cho đơn hàng
                newOrder.orderId = orderId;
                newOrder.orderDate = getVietnamTime();
                newOrder.status = "Chờ xử lý"; // Trạng thái ban đầu

                // Tiến hành ghi trực tiếp dữ liệu vào nhánh /orders/MÃ_ĐƠN_HÀNG trên Firebase
                await firebaseFetch(`/orders/${orderId}`, 'PUT', newOrder);

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đặt hàng thành công!", order: newOrder }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu đơn hàng không hợp lệ!" }));
            }
        });
        return;
    }

    // LỖI ĐƯỜNG DẪN KHÔNG TỒN TẠI
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: "Đường dẫn không tồn tại!" }));
});

server.listen(PORT);
