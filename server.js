const http = require('http');

const PORT = process.env.PORT || 3000;

// Đường link Firebase của Hào đã được điền chính xác ở đây:
const FIREBASE_URL = "https://homeser-93db3-default-rtdb.asia-southeast1.firebasedatabase.app";

// Hàm lấy thời gian thực chuẩn GMT+7 (Việt Nam)
function getVietnamTime() {
    return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// Hàm hỗ trợ gọi dữ liệu từ Firebase bằng fetch
async function firebaseFetch(endpoint, method = 'GET', body = null) {
    const url = `${FIREBASE_URL}${endpoint}.json`;
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    return res.json();
}

const server = http.createServer(async (req, res) => {
    // Cấu hình CORS để Frontend nhận dữ liệu không bị chặn
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ================== API USERS (DANH SÁCH TÀI KHOẢN) ==================
    if (req.url === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/users');
        const userList = data ? Object.values(data) : [
            { name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: getVietnamTime(), lastLogin: "Chưa đăng nhập" }
        ];
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
                res.end(JSON.stringify({ success: false, message: "Lỗi dữ liệu!" }));
            }
        });
        return;
    }

    // ================== API ORDERS (ĐƠN HÀNG KÈM ĐỊA CHỈ) ==================
    if (req.url === '/api/orders' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        const data = await firebaseFetch('/orders');
        const orderList = data ? Object.values(data) : [];
        res.end(JSON.stringify(orderList));
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

    // Nếu không khớp API nào, trả về thông báo lỗi đường dẫn API
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: "API endpoint không tồn tại!" }));
});

server.listen(PORT, () => { console.log(`Server chạy tại port ${PORT}`); });
Bước 2: Tạo thêm một file cấu hình tên là vercel.json
Để Vercel hiểu rằng: "Khi vào trang chủ thì hiện thị file index.html, còn khi gọi link /api/... thì mới kích hoạt file server.js", bạn hãy tạo thêm 1 file mới trong thư mục dự án trên GitHub nhé:

Tại thư mục chính của dự án trên GitHub, bấm nút Add file -> chọn Create new file.

Đặt tên file là: vercel.json

Copy toàn bộ nội dung cấu hình siêu ngắn này dán vào:

JSON
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "server.js" },
    { "source": "/(.*)", "destination": "index.html" }
  ]
}
