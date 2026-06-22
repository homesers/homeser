const http = require('http');

const PORT = process.env.PORT || 3000;

// Tạo biến lưu trữ dữ liệu trực tiếp trên bộ nhớ RAM của Server (Không dùng fs ghi file để tránh lỗi Vercel)
let database = {
    users: [
        // Tạo sẵn tài khoản admin mặc định nếu chưa có
        { name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: new Date().toLocaleString('vi-VN') }
    ],
    orders: []
};

// Hàm đọc dữ liệu từ RAM
function readData() {
    return database;
}

// Hàm ghi dữ liệu vào RAM
function writeData(data) {
    database = data;
}

const server = http.createServer((req, res) => {
    // Cấu hình CORS để các máy tính khác hoặc frontend (Vercel/chạy local) có thể gửi dữ liệu tới server này
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Xử lý các yêu cầu OPTIONS (Preflight request trong CORS)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ================== ĐƯỜNG DẪN 1: LẤY DANH SÁCH USER (GET /api/users) ==================
    if (req.url === '/api/users' && req.method === 'GET') {
        const data = readData();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data.users));
        return;
    }

    // ================== ĐƯỜNG DẪN 2: THÊM USER MỚI / ĐĂNG KÝ (POST /api/users) ==================
    if (req.url === '/api/users' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const newUser = JSON.parse(body);
                const data = readData();

                // Kiểm tra xem email đã tồn tại chưa để tránh trùng lặp
                const userExists = data.users.some(u => u.email === newUser.email);
                if (userExists) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, message: "Email này đã được đăng ký!" }));
                    return;
                }

                // Thêm ngày đăng ký nếu frontend chưa gửi lên
                if (!newUser.date) {
                    newUser.date = new Date().toLocaleString('vi-VN');
                }

                // Đẩy user mới vào mảng và lưu lại trên RAM
                data.users.push(newUser);
                writeData(data);

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đăng ký thành viên thành công!", user: newUser }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu gửi lên không hợp lệ!" }));
            }
        });
        return;
    }

    // ================== ĐƯỜNG DẪN 3: LẤY DANH SÁCH ĐƠN HÀNG (GET /api/orders) ==================
    if (req.url === '/api/orders' && req.method === 'GET') {
        const data = readData();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data.orders));
        return;
    }

    // ================== ĐƯỜNG DẪN 4: THÊM ĐƠN HÀNG MỚI (POST /api/orders) ==================
    if (req.url === '/api/orders' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const newOrder = JSON.parse(body);
                const data = readData();
                data.orders.push(newOrder);
                writeData(data);

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đặt hàng thành công!" }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu đơn hàng lỗi!" }));
            }
        });
        return;
    }

    // Nếu người dùng truy cập bất kỳ đường dẫn nào khác ngoài các API trên
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: "Không tìm thấy đường dẫn!" }));
});

server.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});
