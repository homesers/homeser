const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;

// Link Firebase Realtime Database chính xác của Hào:
const FIREBASE_URL = "https://homeser-93db3-default-rtdb.asia-southeast1.firebasedatabase.app";

// Hàm lấy thời gian thực chuẩn GMT+7 (Việt Nam)
function getVietnamTime() {
    return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// Hàm hỗ trợ gọi dữ liệu từ Firebase bằng thư viện https lõi (Cực kỳ ổn định trên Vercel)
function firebaseFetch(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = `${FIREBASE_URL}${endpoint}.json`;
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (err) => { reject(err); });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    // Cấu hình CORS để Frontend kết nối mượt mà không bị chặn chặn trình duyệt
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ================== API USERS (DANH SÁCH TÀI KHOẢN) ==================
    if (req.url === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        try {
            const data = await firebaseFetch('/users');
            const userList = data ? Object.values(data) : [
                { name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: getVietnamTime(), lastLogin: "Chưa đăng nhập" }
            ];
            res.end(JSON.stringify(userList));
        } catch (error) {
            res.end(JSON.stringify([{ name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: getVietnamTime(), lastLogin: "Lỗi kết nối DB" }]));
        }
        return;
    }

    if (req.url === '/api/users' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const newUser = JSON.parse(body);
                const currentData = await firebaseFetch('/users');
                const users = currentData ? Object.values(currentData) : [];

                if (users.some(u => u.email === newUser.email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, message: "Email này đã được đăng ký!" }));
                }

                newUser.date = getVietnamTime();
                newUser.lastLogin = "Chưa đăng nhập";
                
                const safeEmailKey = newUser.email.replace(/\./g, '_');
                await firebaseFetch(`/users/${safeEmailKey}`, 'PUT', newUser);

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đăng ký thành công!", user: newUser }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu không hợp lệ!" }));
            }
        });
        return;
    }

    // ================== API LOGIN (ĐĂNG NHẬP & CẬP NHẬT GMT+7) ==================
    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const credentials = JSON.parse(body);
                const safeEmailKey = credentials.email.replace(/\./g, '_');
                
                // Lấy thông tin user từ Firebase bằng Safe Key
                const user = await firebaseFetch(`/users/${safeEmailKey}`);

                // Trường hợp nếu là tài khoản Admin mặc định chưa có trên Firebase, tự động tạo luôn
                if (credentials.email === "admin@homeser.com" && credentials.password === "admin" && !user) {
                    const adminUser = { name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: getVietnamTime(), lastLogin: getVietnamTime() };
                    await firebaseFetch(`/users/${safeEmailKey}`, 'PUT', adminUser);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: true, user: adminUser }));
                }

                if (user && user.password === credentials.password) {
                    user.lastLogin = getVietnamTime();
                    await firebaseFetch(`/users/${safeEmailKey}`, 'PUT', user);

                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true, user: user }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, message: "Sai email hoặc mật khẩu!" }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Lỗi xử lý dữ liệu đăng nhập!" }));
            }
        });
        return;
    }

    // ================== API ORDERS (ĐƠN HÀNG KÈM ĐỊA CHỈ) ==================
    if (req.url === '/api/orders' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        try {
            const data = await firebaseFetch('/orders');
            const orderList = data ? Object.values(data) : [];
            res.end(JSON.stringify(orderList));
        } catch (error) {
            res.end(JSON.stringify([]));
        }
        return;
    }

    if (req.url === '/api/orders' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const newOrder = JSON.parse(body);
                newOrder.date = getVietnamTime();
                
                const orderId = 'order_' + Date.now();
                await firebaseFetch(`/orders/${orderId}`, 'PUT', newOrder);

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đặt hàng thành công!" }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu đơn hàng lỗi!" }));
            }
        });
        return;
    }

    // Endpoint không tồn tại
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: "API endpoint không tồn tại!" }));
});

server.listen(PORT, () => { console.log(`Server chạy tại port ${PORT}`); });
