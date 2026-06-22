const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'database.json');

// Khởi tạo file database nếu chưa có
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], orders: [] }, null, 2), 'utf8');
}

// Hàm đọc dữ liệu từ file JSON
function readData() {
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return { users: [], orders: [] };
    }
}

// Hàm ghi dữ liệu vào file JSON
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
    // Cấu hình CORS để các máy tính khác trong mạng có thể gửi dữ liệu tới server này
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API Lấy dữ liệu (GET)
    if (req.url === '/api/data' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(readData()));
        return;
    }

    // API Đăng ký tài khoản (POST)
    if (req.url === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const newUser = JSON.parse(body);
            let data = readData();
            
            // Đảm bảo luôn có tài khoản admin mặc định
            if (!data.users.find(u => u.email === "admin@homeser.com")) {
                data.users.push({ name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: "Mặc định" });
            }

            if (data.users.find(u => u.email === newUser.email)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Email này đã tồn tại!' }));
            } else {
                data.users.push(newUser);
                writeData(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Đăng ký thành công!' }));
            }
        });
        return;
    }

    // API Đặt đơn hàng kèm địa chỉ (POST)
    if (req.url === '/api/checkout' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const newOrder = JSON.parse(body);
            let data = readData();
            data.orders.push(newOrder);
            writeData(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Đặt hàng thành công!' }));
        });
        return;
    }

    // API Xóa sạch dữ liệu (Xóa tất cả đơn hoặc tất cả user)
    if (req.url === '/api/clear' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const target = JSON.parse(body).target;
            let data = readData();
            if (target === 'orders') data.orders = [];
            if (target === 'users') {
                data.users = [{ name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: new Date().toLocaleString('vi-VN') }];
            }
            writeData(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Đã xóa dữ liệu trên hệ thống!' }));
        });
        return;
    }

    // Đường dẫn lỗi không tồn tại
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Không tìm thấy đường dẫn!' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(` SERVER HOMESER ĐANG CHẠY THỰC TẾ!`);
    console.log(` Cổng hoạt động: http://localhost:${PORT}`);
    console.log(` Dữ liệu lưu giữ tại file: database.json`);
    console.log(`=================================================`);
});