JavaScript
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;

// Link Firebase Realtime Database của Hào:
const FIREBASE_URL = "https://homeser-93db3-default-rtdb.asia-southeast1.firebasedatabase.app";

function getVietnamTime() {
    return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// Hàm kết nối Firebase qua HTTPS
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
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
            });
        });

        req.on('error', (err) => { reject(err); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ================== API USERS ==================
    if (req.url === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/users');
        const userList = data ? Object.values(data) : [];
        res.end(JSON.stringify(userList));
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
                res.end(JSON.stringify({ success: false, message: "Dữ liệu lỗi!" }));
            }
        });
        return;
    }

    // ================== API LOGIN (CHỨA ACC ADMIN MẶC ĐỊNH) ==================
    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const credentials = JSON.parse(body);
                const safeEmailKey = credentials.email.replace(/\./g, '_');
                
                // Kiểm tra acc Admin mặc định nếu Firebase chưa có dữ liệu
                if (credentials.email === "admin@homeser.com" && credentials.password === "admin") {
                    const adminUser = { name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: getVietnamTime(), lastLogin: getVietnamTime() };
                    await firebaseFetch(`/users/${safeEmailKey}`, 'PUT', adminUser);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: true, user: adminUser }));
                }

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
                res.end(JSON.stringify({ success: false, message: "Lỗi xử lý!" }));
            }
        });
        return;
    }

    // ================== API ORDERS ==================
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
                res.end(JSON.stringify({ success: false, message: "Lỗi đơn hàng!" }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: "Không tìm thấy!" }));
});

server.listen(PORT);
