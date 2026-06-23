const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const FIREBASE_URL = "https://homeser-93db3-default-rtdb.asia-southeast1.firebasedatabase.app";

function getVietnamTime() {
    return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// Hàm fetch Firebase sử dụng thư viện https chuẩn hóa dữ liệu đầu ra/đầu vào
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
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
            });
        });

        req.on('error', (err) => { resolve(null); }); // Tránh sập serverless khi lỗi mạng
        if (body) req.write(payload);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ================== API LOGIN (XỬ LÝ ACC ADMIN) ==================
    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const credentials = JSON.parse(body);
                
                // 🔑 KIỂM TRA ACC ADMIN: Cho phép đăng nhập thẳng vào khu vực quản lý
                if (credentials.email === "admin@homeser.com" && credentials.password === "admin") {
                    const adminUser = { 
                        name: "Admin Đình Hào", 
                        email: "admin@homeser.com", 
                        role: "admin", 
                        lastLogin: getVietnamTime() 
                    };
                    
                    // Đồng bộ lưu vết lịch sử Admin lên Firebase luôn
                    const safeKey = "admin@homeser_com".replace(/\./g, '_');
                    await firebaseFetch(`/users/${safeKey}`, 'PUT', adminUser);

                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: true, user: adminUser }));
                }

                // Xử lý tài khoản người dùng bình thường
                const safeEmailKey = credentials.email.replace(/\./g, '_');
                const user = await firebaseFetch(`/users/${safeEmailKey}`);
                
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
                res.end(JSON.stringify({ success: false, message: "Lỗi hệ thống xử lý dữ liệu!" }));
            }
        });
        return;
    }

    // ================== API USERS (DANH SÁCH USER CHO ADMIN XEM) ==================
    if (req.url === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/users');
        res.end(JSON.stringify(data ? Object.values(data) : []));
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
                res.end(JSON.stringify({ success: false, message: "Dữ liệu đăng ký không đúng!" }));
            }
        });
        return;
    }

    // ================== API ORDERS (DANH SÁCH ĐƠN HÀNG CHO ADMIN) ==================
    if (req.url === '/api/orders' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/orders');
        res.end(JSON.stringify(data ? Object.values(data) : []));
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
                res.end(JSON.stringify({ success: false, message: "Đơn hàng bị lỗi!" }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: "Đường dẫn không tồn tại!" }));
});

server.listen(PORT);
