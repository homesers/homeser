const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const FIREBASE_URL = "https://homeser-93db3-default-rtdb.asia-southeast1.firebasedatabase.app";

function getVietnamTime() { return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }); }

function firebaseFetch(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = `${FIREBASE_URL}${endpoint}.json`;
        const payload = body ? JSON.stringify(body) : '';
        const options = { 
            method: method, 
            headers: { 
                'Content-Type': 'application/json', 
                'Content-Length': Buffer.byteLength(payload) 
            } 
        };

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

    // 1. API: LẤY DANH SÁCH USER (GET /api/users)
    if (req.url === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/users');
        res.end(JSON.stringify(data ? Object.values(data) : []));
        return;
    }

    // 2. API: ĐĂNG KÝ USER MỚI (POST /api/users)
    if (req.url === '/api/users' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const newUser = JSON.parse(body);
                if (!newUser.email || !newUser.email.toLowerCase().endsWith("@gmail.com")) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, message: "Hệ thống chỉ chấp nhận email @gmail.com!" }));
                }

                const safeEmailKey = newUser.email.toLowerCase().replace(/\./g, '_');
                const existingUser = await firebaseFetch(`/users/${safeEmailKey}`);

                if (existingUser) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, message: "Email này đã được đăng ký!" }));
                }

                newUser.date = getVietnamTime();
                newUser.lastLogin = "Chưa đăng nhập";
                
                await firebaseFetch(`/users/${safeEmailKey}`, 'PUT', newUser);

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đăng ký thành công!", user: newUser }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu đăng ký không hợp lệ!" }));
            }
        });
        return;
    }

    // 3. API: ĐĂNG NHẬP NGƯỜI DÙNG (POST /api/login)
    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const loginData = JSON.parse(body);
                const email = loginData.email ? loginData.email.toLowerCase().trim() : '';
                const password = loginData.password;

                if (!email || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, message: "Vui lòng nhập đầy đủ Email và Mật khẩu!" }));
                }

                const safeEmailKey = email.replace(/\./g, '_');
                const user = await firebaseFetch(`/users/${safeEmailKey}`);

                // Trả về câu thông báo lỗi chuẩn xác theo yêu cầu
                if (!user || user.password !== password) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, message: "Sai tài khoản Gmail hoặc Mật khẩu!" }));
                }

                user.lastLogin = getVietnamTime();
                await firebaseFetch(`/users/${safeEmailKey}`, 'PUT', user);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đăng nhập thành công!", user: user }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Lỗi xử lý hệ thống!" }));
            }
        });
        return;
    }

    // 4. API: LẤY DANH SÁCH ĐƠN HÀNG (GET /api/orders)
    if (req.url === '/api/orders' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/orders');
        res.end(JSON.stringify(data ? Object.values(data) : []));
        return;
    }

    // 5. API: NHẬN ĐƠN HÀNG MỚI (POST /api/orders)
    if (req.url === '/api/orders' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const newOrder = JSON.parse(body);
                const orderId = 'DH_' + Date.now();
                
                newOrder.orderId = orderId;
                newOrder.orderDate = getVietnamTime();
                newOrder.status = "Chờ xử lý";

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
