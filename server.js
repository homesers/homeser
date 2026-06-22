const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Bộ nhớ RAM lưu trữ dữ liệu tạm thời trên Vercel
let database = {
    users: [
        { name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: new Date().toLocaleString('vi-VN') }
    ],
    orders: []
};

function readData() { return database; }
function writeData(data) { database = data; }

const server = http.createServer((req, res) => {
    // Cấu hình CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ================== XỬ LÝ ĐƯỜNG DẪN API BACKEND ==================
    if (req.url === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(readData().users));
        return;
    }

    if (req.url === '/api/users' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const newUser = JSON.parse(body);
                const data = readData();
                if (data.users.some(u => u.email === newUser.email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, message: "Email này đã được đăng ký!" }));
                    return;
                }
                newUser.date = newUser.date || new Date().toLocaleString('vi-VN');
                data.users.push(newUser);
                writeData(data);
                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: "Đăng ký thành công!", user: newUser }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu không hợp lệ!" }));
            }
        });
        return;
    }

    if (req.url === '/api/orders' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(readData().orders));
        return;
    }

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
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: "Dữ liệu lỗi!" }));
            }
        });
        return;
    }

    // ================== XỬ LÝ TỰ ĐỘNG LOAD FILE FRONTEND (HTML, CSS, JS, ẢNH) ==================
    if (req.method === 'GET') {
        // Nếu vào link gốc "/", mặc định đọc file index.html
        let filePath = req.url === '/' ? path.join(__dirname, 'index.html') : path.join(__dirname, req.url);
        
        // Lấy đuôi file để định dạng kiểu dữ liệu (MIME Type) truyền về trình duyệt không bị lỗi font/giao diện
        let extname = String(path.extname(filePath)).toLowerCase();
        let mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };

        let contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    // Nếu không tìm thấy file, trả về lỗi 404 chuẩn API
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ message: "Không tìm thấy đường dẫn hoặc file yêu cầu!" }));
                } else {
                    // Lỗi hệ thống server
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end(`Lỗi hệ thống: ${error.code}`);
                }
            } else {
                // Trả về file tĩnh kèm Content-Type chuẩn xác để hiển thị giao diện mượt mà
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
        return;
    }

    // Fallback mặc định
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: "Không tìm thấy đường dẫn!" }));
});

server.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});
