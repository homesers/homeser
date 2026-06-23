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

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: "Đường dẫn không tồn tại!" }));
});

server.listen(PORT);
