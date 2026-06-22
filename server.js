const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Hàm lấy thời gian thực chuẩn GMT+7 (Việt Nam)
function getVietnamTime() {
    return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// Bộ nhớ RAM lưu trữ dữ liệu
let database = {
    users: [
        { name: "Admin Đình Hào", email: "admin@homeser.com", password: "admin", date: getVietnamTime(), lastLogin: "Chưa đăng nhập" }
    ],
    orders: []
};

function readData() { return database; }
function writeData(data) { database = data; }

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ================== API USERS (ĐĂNG KÝ & LẤY DANH SÁCH) ==================
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
                    return res.end(JSON.stringify({ success: false, message: "Email này đã được đăng ký!" }));
                }
                newUser.date = getVietnamTime(); // GMT+7
                newUser.lastLogin = "Chưa đăng nhập";
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

    // ================== API LOGIN (CẬP NHẬT GIỜ ĐĂNG NHẬP GMT+7) ==================
    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const credentials = JSON.parse(body);
                const data = readData();
                const userIndex = data.users.findIndex(u => u.email === credentials.email && u.password === credentials.password);
                
                if (userIndex !== -1) {
                    data.users[userIndex].lastLogin = getVietnamTime(); // Cập nhật giờ GMT+7
                    writeData(data);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true, user: data.users[userIndex] }));
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

    // ================== API ORDERS (LƯU & XEM ĐƠN HÀNG) ==================
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
                newOrder.date = getVietnamTime(); // Ngày đặt hàng GMT+7
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

    // ================== LOAD GIAO DIỆN ==================
    if (req.method === 'GET') {
        let filePath = req.url === '/' ? path.join(__dirname, 'index.html') : path.join(__dirname, req.url);
        let extname = String(path.extname(filePath)).toLowerCase();
        let mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpg', '.svg': 'image/svg+xml' };
        let contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ message: "Không tìm thấy đường dẫn!" }));
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

server.listen(PORT, () => { console.log(`Server đang chạy tại port ${PORT}`); });
Bước 2: Cập nhật lại Frontend (index.html)
Bản này mình đã làm đầy đủ Giỏ hàng (Cộng, Trừ, Xóa tất cả), tính toán giá tiền (Size M +10k, Size L +20k), ô nhập Địa chỉ, và tích hợp Bảng quản lý Đơn hàng vào Khu vực Admin cho bạn.

Mở file index.html trên GitHub, xóa code cũ và dán toàn bộ đoạn này vào, sau đó Commit:

HTML
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HomeSer - Ngôi Nhà Shop & Food Thông Minh</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        html, body { scroll-behavior: smooth; height: 100%; }
        .dark-glass { background: rgba(11, 15, 25, 0.95); backdrop-filter: blur(12px); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0b0f19; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 9999px; }
    </style>
</head>
<body class="custom-scrollbar relative bg-[#0b0f19] text-[#f1f5f9]">

    <header class="dark-glass text-white shadow-xl p-4 sticky top-0 z-50 border-b border-slate-800/80">
        <div class="container mx-auto flex justify-between items-center">
            <div class="flex items-center space-x-3 cursor-pointer" onclick="switchModule('home')">
                <div class="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg flex items-center justify-center">
                    <i class="fa-solid fa-house-laptop text-xl"></i>
                </div>
                <h1 class="text-3xl font-black tracking-tight"><span class="text-blue-500">Home</span><span class="text-white">Ser</span></h1>
            </div>
            
            <nav class="hidden md:flex bg-slate-800/60 p-1 rounded-full border border-slate-700/50">
                <button onclick="switchModule('home')" id="btn-nav-home" class="nav-btn px-5 py-2 rounded-full text-sm font-bold text-white bg-blue-600 transition"><i class="fa-solid fa-house"></i> Home</button>
                <button onclick="switchModule('shop')" id="btn-nav-shop" class="nav-btn px-5 py-2 rounded-full text-sm font-bold text-slate-400 hover:text-white transition"><i class="fa-solid fa-bag-shopping"></i> Shop</button>
                <button onclick="switchModule('food')" id="btn-nav-food" class="nav-btn px-5 py-2 rounded-full text-sm font-bold text-slate-400 hover:text-white transition"><i class="fa-solid fa-utensils"></i> Food</button>
                <button onclick="switchModule('contact')" id="btn-nav-contact" class="nav-btn px-5 py-2 rounded-full text-sm font-bold text-slate-400 hover:text-white transition"><i class="fa-solid fa-address-book"></i> Liên hệ</button>
            </nav>

            <div class="flex items-center space-x-4">
                <button onclick="toggleCart()" class="relative p-2.5 bg-slate-800 rounded-full hover:bg-slate-700 transition">
                    <i class="fa-solid fa-cart-shopping text-lg"></i>
                    <span id="cart-count" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">0</span>
                </button>
                <div id="auth-section" class="flex items-center space-x-2"></div>
            </div>
        </div>
    </header>

    <main class="container mx-auto px-4 py-8 min-h-[calc(100vh-180px)]">
        
        <section id="module-home" class="module-section block text-center py-12">
            <h2 class="text-5xl font-black tracking-tight leading-none mb-6">Trải Nghiệm <span class="text-blue-500">Mua Sắm & Ẩm Thực</span> Tại Gia</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-6">
                <div onclick="switchModule('shop')" class="group bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl text-left hover:border-orange-500/40 cursor-pointer shadow-lg transition-all">
                    <h3 class="text-2xl font-bold mb-2 text-orange-400"><i class="fa-solid fa-mobile-screen-button"></i> HomeSer Shop</h3>
                    <p class="text-slate-400 text-sm">Trung tâm mua sắm đồ công nghệ đỉnh cao.</p>
                </div>
                <div onclick="switchModule('food')" class="group bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl text-left hover:border-green-500/40 cursor-pointer shadow-lg transition-all">
                    <h3 class="text-2xl font-bold mb-2 text-green-400"><i class="fa-solid fa-burger"></i> HomeSer Food</h3>
                    <p class="text-slate-400 text-sm">Thiên đường ăn uống, đa dạng các món ăn vặt & thức uống.</p>
                </div>
            </div>
        </section>

        <section id="module-shop" class="module-section hidden">
            <h2 class="text-3xl font-black text-orange-400 mb-6 border-b border-slate-800 pb-4"><i class="fa-solid fa-vr-cardboard"></i> Cửa Hàng Công Nghệ</h2>
            <div id="shop-container" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>
        </section>

        <section id="module-food" class="module-section hidden">
            <h2 class="text-3xl font-black text-green-400 mb-6 border-b border-slate-800 pb-4"><i class="fa-solid fa-bowl-food"></i> Thực Đơn Món Ăn & Thức Uống</h2>
            <div id="food-container" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>
        </section>

        <section id="module-admin" class="module-section hidden space-y-10 py-6">
            <h2 class="text-3xl font-black text-white"><i class="fa-solid fa-gauge-high text-blue-500"></i> Quản Trị Hệ Thống</h2>
            
            <div class="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden mb-8">
                <div class="p-4 bg-slate-900 border-b border-slate-700 font-bold text-blue-400"><i class="fa-solid fa-users"></i> Danh Sách Khách Hàng</div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-slate-300">
                        <thead class="bg-slate-900/50 text-sm uppercase font-bold text-slate-400">
                            <tr><th class="p-4">STT</th><th class="p-4">Họ và Tên</th><th class="p-4">Email</th><th class="p-4">Mật khẩu</th><th class="p-4 text-green-400">Ngày Đăng Ký (GMT+7)</th><th class="p-4 text-orange-400">Lần Đăng Nhập Cuối</th></tr>
                        </thead>
                        <tbody id="admin-user-list" class="divide-y divide-slate-700/50 text-sm"></tbody>
                    </table>
                </div>
            </div>

            <div class="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden">
                <div class="p-4 bg-slate-900 border-b border-slate-700 font-bold text-green-400"><i class="fa-solid fa-boxes-packing"></i> Danh Sách Đơn Hàng Mới</div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-slate-300">
                        <thead class="bg-slate-900/50 text-sm uppercase font-bold text-slate-400">
                            <tr><th class="p-4">Ngày Đặt</th><th class="p-4">Khách Hàng</th><th class="p-4">Địa Chỉ Nhận Hàng</th><th class="p-4">Chi Tiết Món Hàng</th><th class="p-4">Tổng Tiền</th></tr>
                        </thead>
                        <tbody id="admin-order-list" class="divide-y divide-slate-700/50 text-sm"></tbody>
                    </table>
                </div>
            </div>
        </section>
        
        <section id="module-contact" class="module-section hidden max-w-xl mx-auto text-center py-8">
            <h2 class="text-3xl font-black mb-6">Thông tin Liên hệ</h2>
            <div class="bg-slate-800/40 p-8 rounded-3xl border border-slate-700/50"><p class="text-lg font-bold">Nguyễn Đình Hào - 0768 152 277</p></div>
        </section>
    </main>

    <div id="cart-sidebar" class="fixed top-0 right-0 h-full w-[400px] bg-slate-900 border-l border-slate-700 shadow-2xl z-[100] transform translate-x-full transition-transform flex flex-col">
        <div class="p-5 border-b border-slate-700 flex justify-between items-center">
            <h3 class="text-xl font-bold"><i class="fa-solid fa-cart-shopping text-blue-500"></i> Giỏ Hàng Của Bạn</h3>
            <button onclick="toggleCart()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-2xl"></i></button>
        </div>
        <div id="cart-items" class="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            </div>
        <div class="p-5 border-t border-slate-700 bg-slate-800/50 space-y-4">
            <div class="flex justify-between font-bold text-lg"><span>Tổng cộng:</span><span id="cart-total" class="text-green-400">0 đ</span></div>
            <div>
                <label class="block text-sm font-bold text-slate-400 mb-1">Địa chỉ giao hàng (*)</label>
                <input type="text" id="order-address" placeholder="Nhập địa chỉ nhà, số điện thoại..." class="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:border-blue-500 outline-none">
            </div>
            <div class="flex space-x-2">
                <button onclick="clearCart()" class="w-1/3 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white font-bold py-3 rounded-xl transition">Xóa Giỏ</button>
                <button onclick="checkoutCart()" class="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg">Xác Nhận Đặt Hàng</button>
            </div>
        </div>
    </div>

    <div id="auth-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden z-[110] flex items-center justify-center">
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-[400px] relative shadow-2xl">
            <button onclick="closeAuthModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-2xl"></i></button>
            <div class="flex justify-center space-x-4 mb-6 border-b border-slate-700 pb-2">
                <button onclick="toggleAuthTab('login')" id="tab-login" class="text-xl font-bold text-blue-500 pb-2 border-b-2 border-blue-500">Đăng Nhập</button>
                <button onclick="toggleAuthTab('register')" id="tab-register" class="text-xl font-bold text-slate-500 hover:text-white pb-2">Đăng Ký</button>
            </div>
            <form id="form-login" class="space-y-4" onsubmit="handleLogin(event)">
                <input type="email" id="login-email" placeholder="Email" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                <div class="relative">
                    <input type="password" id="login-pass" placeholder="Mật khẩu" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                    <i class="fa-solid fa-eye absolute right-4 top-3.5 text-slate-400 cursor-pointer hover:text-white" onclick="togglePasswordVisibility('login-pass', this)"></i>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">Đăng Nhập</button>
            </form>
            <form id="form-register" class="space-y-4 hidden" onsubmit="handleRegister(event)">
                <input type="text" id="reg-name" placeholder="Họ và Tên" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                <input type="email" id="reg-email" placeholder="Email" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                <div class="relative">
                    <input type="password" id="reg-pass" placeholder="Mật khẩu" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                    <i class="fa-solid fa-eye absolute right-4 top-3.5 text-slate-400 cursor-pointer hover:text-white" onclick="togglePasswordVisibility('reg-pass', this)"></i>
                </div>
                <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition">Tạo Tài Khoản Mới</button>
            </form>
        </div>
    </div>

    <script>
        const SERVER_URL = "https://homeser-m3h8.vercel.app";
        let cart = JSON.parse(localStorage.getItem('homeser_cart')) || [];

        // DỮ LIỆU
        const shopDatabase = [
            { name: "Kính Apple Vision Pro", price: 85000000, desc: "Kính thực tế hỗn hợp", icon: "fa-vr-cardboard" },
            { name: "Meta Quest 3", price: 12500000, desc: "Kính thực tế ảo thế hệ mới", icon: "fa-glasses" },
            { name: "Samsung Galaxy Z Fold", price: 35000000, desc: "Điện thoại gập cao cấp", icon: "fa-mobile-screen" },
            { name: "Google Pixel Fold", price: 38000000, desc: "Điện thoại gập Google AI", icon: "fa-mobile" },
            { name: "Samsung Galaxy Ring", price: 9900000, desc: "Nhẫn thông minh", icon: "fa-ring" },
            { name: "Oura Ring Gen 4", price: 11500000, desc: "Nhẫn theo dõi giấc ngủ", icon: "fa-ring" },
            { name: "Shokz OpenFit", price: 4500000, desc: "Tai nghe mở thể thao", icon: "fa-headphones" },
            { name: "Bose Ultra Open", price: 7900000, desc: "Tai nghe mở âm thanh vòm", icon: "fa-ear-listen" },
            { name: "Roborock S8 MaxV", price: 24000000, desc: "Robot hút bụi AI", icon: "fa-robot" },
            { name: "Ecovacs Deebot X5", price: 22500000, desc: "Robot dọn dẹp cao cấp", icon: "fa-broom" },
            { name: "Màn hình kép OLED", price: 15000000, desc: "Màn hình di động laptop", icon: "fa-display" },
            { name: "DJI Mic 2", price: 8500000, desc: "Micro không dây lọc ồn", icon: "fa-microphone" },
            { name: "Rode Wireless PRO", price: 10500000, desc: "Micro chuyên nghiệp", icon: "fa-microphone-lines" }
        ];

        const foodDatabase = [
            { name: "Bánh mì nem khoai", basePrice: 25000 }, { name: "Cà phê trứng Giảng", basePrice: 35000 },
            { name: "Kem bơ Đà Lạt", basePrice: 30000 }, { name: "Sữa chua trân châu", basePrice: 25000 },
            { name: "Bánh đồng xu phô mai", basePrice: 35000 }, { name: "Bánh mì muối ớt", basePrice: 20000 },
            { name: "Bánh tráng phơi sương", basePrice: 40000 }, { name: "Trà mãng cầu xiêm", basePrice: 25000 },
            { name: "Milo dầm trân châu", basePrice: 30000 }, { name: "Chè khoai dẻo", basePrice: 30000 },
            { name: "Bún quậy Phú Quốc", basePrice: 50000 }, { name: "Nem nướng Nha Trang", basePrice: 45000 }
        ]; // Rút gọn mảng food mẫu để tối ưu hiển thị

        function formatMoney(num) { return num.toLocaleString('vi-VN') + " đ"; }

        // RENDER GIAO DIỆN SẢN PHẨM
        function renderProducts() {
            // Render Shop
            document.getElementById("shop-container").innerHTML = shopDatabase.map((item, i) => `
                <div class="bg-slate-800/60 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between">
                    <div>
                        <div class="text-orange-400 text-3xl mb-3"><i class="fa-solid ${item.icon}"></i></div>
                        <h4 class="font-bold mb-1">${item.name}</h4><p class="text-xs text-slate-400 mb-3">${item.desc}</p>
                    </div>
                    <div>
                        <p class="text-orange-400 font-bold mb-3">${formatMoney(item.price)}</p>
                        <button onclick="addToCart('${item.name}', ${item.price}, '')" class="w-full py-2 bg-slate-700 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition">Thêm vào giỏ</button>
                    </div>
                </div>
            `).join('');

            // Render Food
            document.getElementById("food-container").innerHTML = foodDatabase.map((item, i) => `
                <div class="bg-slate-800/60 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between">
                    <div><div class="text-green-400 text-3xl mb-3"><i class="fa-solid fa-utensils"></i></div><h4 class="font-bold mb-3">${item.name}</h4></div>
                    <div>
                        <select id="size-${i}" class="w-full bg-slate-900 text-sm text-slate-300 border border-slate-700 rounded-lg p-2 mb-3">
                            <option value="S">Size S (${formatMoney(item.basePrice)})</option>
                            <option value="M">Size M (${formatMoney(item.basePrice + 10000)})</option>
                            <option value="L">Size L (${formatMoney(item.basePrice + 20000)})</option>
                        </select>
                        <button onclick="addFoodToCart('${item.name}', ${item.basePrice}, 'size-${i}')" class="w-full py-2 bg-slate-700 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition">Thêm vào giỏ</button>
                    </div>
                </div>
            `).join('');
        }

        // === GIỎ HÀNG LOGIC ===
        function addFoodToCart(name, basePrice, selectId) {
            const size = document.getElementById(selectId).value;
            let price = basePrice;
            if(size === 'M') price += 10000;
            if(size === 'L') price += 20000;
            addToCart(name, price, size);
        }

        function addToCart(name, price, size) {
            let itemName = size ? `${name} (Size ${size})` : name;
            let existingItem = cart.find(i => i.name === itemName);
            if(existingItem) existingItem.qty += 1;
            else cart.push({ name: itemName, price: price, qty: 1 });
            saveAndRenderCart();
            alert(`Đã thêm ${itemName} vào giỏ!`);
        }

        function updateCartQty(index, change) {
            cart[index].qty += change;
            if(cart[index].qty <= 0) cart.splice(index, 1);
            saveAndRenderCart();
        }

        function clearCart() {
            if(confirm("Xóa toàn bộ giỏ hàng?")) { cart = []; saveAndRenderCart(); }
        }

        function saveAndRenderCart() {
            localStorage.setItem('homeser_cart', JSON.stringify(cart));
            document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
            
            const cartItemsContainer = document.getElementById('cart-items');
            if(cart.length === 0) {
                cartItemsContainer.innerHTML = `<p class="text-slate-500 text-center mt-10">Giỏ hàng trống.</p>`;
                document.getElementById('cart-total').innerText = '0 đ';
                return;
            }

            let total = 0;
            cartItemsContainer.innerHTML = cart.map((item, i) => {
                total += item.price * item.qty;
                return `
                <div class="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div class="flex-1 pr-3">
                        <p class="font-bold text-sm">${item.name}</p>
                        <p class="text-blue-400 text-xs">${formatMoney(item.price)}</p>
                    </div>
                    <div class="flex items-center space-x-3 bg-slate-900 rounded-lg px-2 py-1">
                        <button onclick="updateCartQty(${i}, -1)" class="text-slate-400 hover:text-red-400"><i class="fa-solid fa-minus"></i></button>
                        <span class="font-bold text-sm">${item.qty}</span>
                        <button onclick="updateCartQty(${i}, 1)" class="text-slate-400 hover:text-green-400"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            `}).join('');
            document.getElementById('cart-total').innerText = formatMoney(total);
        }

        function toggleCart() {
            document.getElementById('cart-sidebar').classList.toggle('translate-x-full');
            saveAndRenderCart();
        }

        function checkoutCart() {
            if(cart.length === 0) return alert("Giỏ hàng đang trống!");
            const address = document.getElementById("order-address").value.trim();
            if(!address) return alert("Vui lòng nhập Địa chỉ giao hàng!");
            const currentUser = JSON.parse(localStorage.getItem("homeser_current_user"));
            if(!currentUser) return alert("Vui lòng đăng nhập trước khi đặt hàng!");

            const newOrder = {
                customer: currentUser.name,
                email: currentUser.email,
                address: address,
                items: cart,
                total: cart.reduce((sum, item) => sum + item.price * item.qty, 0)
            };

            fetch(`${SERVER_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    alert("Đặt hàng thành công! Admin đã nhận được thông tin.");
                    cart = [];
                    document.getElementById("order-address").value = "";
                    saveAndRenderCart();
                    toggleCart();
                } else alert("Lỗi đặt hàng!");
            }).catch(() => alert("Không kết nối được server!"));
        }

        // === AUTH & TÀI KHOẢN ===
        function checkLoginStatus() {
            const authSection = document.getElementById("auth-section");
            const currentUser = JSON.parse(localStorage.getItem("homeser_current_user"));

            if (currentUser) {
                let adminBtn = currentUser.email === 'admin@homeser.com' ? `<button onclick="switchModule('admin')" class="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/30 hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-gavel"></i> Khu vực Admin</button>` : ``;
                authSection.innerHTML = `
                    ${adminBtn}
                    <div class="flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                        <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div><span class="text-sm font-bold text-white">${currentUser.name}</span>
                    </div>
                    <button onclick="logout()" class="p-2.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-500 rounded-xl transition"><i class="fa-solid fa-right-from-bracket"></i></button>
                `;
            } else {
                authSection.innerHTML = `<button onclick="openAuthModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-2"><i class="fa-solid fa-user"></i> <span>Đăng nhập</span></button>`;
            }
        }

        function logout() {
            if(confirm("Bạn có chắc chắn muốn đăng xuất?")) {
                localStorage.removeItem("homeser_current_user");
                switchModule('home'); checkLoginStatus();
            }
        }

        function openAuthModal() { document.getElementById("auth-modal").classList.remove('hidden'); }
        function closeAuthModal() { document.getElementById("auth-modal").classList.add('hidden'); }
        
        function toggleAuthTab(tab) {
            document.getElementById("form-login").classList.toggle('hidden', tab !== 'login');
            document.getElementById("form-register").classList.toggle('hidden', tab !== 'register');
            document.getElementById("tab-login").className = tab === 'login' ? "text-xl font-bold text-blue-500 pb-2 border-b-2 border-blue-500" : "text-xl font-bold text-slate-500 hover:text-white pb-2";
            document.getElementById("tab-register").className = tab === 'register' ? "text-xl font-bold text-blue-500 pb-2 border-b-2 border-blue-500" : "text-xl font-bold text-slate-500 hover:text-white pb-2";
        }

        function togglePasswordVisibility(id, icon) {
            const input = document.getElementById(id);
            if (input.type === "password") { input.type = "text"; icon.classList.replace("fa-eye", "fa-eye-slash"); icon.classList.add("text-blue-400"); }
            else { input.type = "password"; icon.classList.replace("fa-eye-slash", "fa-eye"); icon.classList.remove("text-blue-400"); }
        }

        // ĐĂNG NHẬP GỌI LÊN SERVER ĐỂ CẬP NHẬT GIỜ GMT+7
        function handleLogin(e) {
            e.preventDefault();
            const payload = { email: document.getElementById("login-email").value, password: document.getElementById("login-pass").value };
            
            fetch(`${SERVER_URL}/api/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem("homeser_current_user", JSON.stringify(data.user));
                    closeAuthModal(); checkLoginStatus(); alert("Đăng nhập thành công!");
                } else alert(data.message);
            }).catch(err => alert("Lỗi kết nối Server!"));
        }

        function handleRegister(e) {
            e.preventDefault();
            const newUser = {
                name: document.getElementById("reg-name").value,
                email: document.getElementById("reg-email").value,
                password: document.getElementById("reg-pass").value
            };
            fetch(`${SERVER_URL}/api/users`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser)
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    alert("Đăng ký thành công! Hãy đăng nhập.");
                    toggleAuthTab('login');
                    document.getElementById("login-email").value = newUser.email;
                    document.getElementById("login-pass").value = newUser.password;
                } else alert(data.message);
            });
        }

        // === ADMIN PANEL ===
        function switchModule(moduleName) {
            document.querySelectorAll('.module-section').forEach(sec => sec.classList.add('hidden'));
            document.getElementById(`module-${moduleName}`).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.replace('bg-blue-600', 'text-slate-400'); btn.classList.replace('text-white', 'text-slate-400'); });
            const activeBtn = document.getElementById(`btn-nav-${moduleName}`);
            if (activeBtn) { activeBtn.classList.replace('text-slate-400', 'text-white'); activeBtn.classList.add('bg-blue-600'); }
            if (moduleName === 'admin') renderAdminPanel();
        }

        function renderAdminPanel() {
            // Lấy danh sách Khách hàng (Đã có Ngày đăng ký GMT+7 & Lần đăng nhập cuối)
            fetch(`${SERVER_URL}/api/users`).then(res => res.json()).then(users => {
                document.getElementById("admin-user-list").innerHTML = users.map((u, i) => `
                    <tr class="hover:bg-slate-700/30 transition border-b border-slate-700/50">
                        <td class="p-4 text-slate-400">${i + 1}</td>
                        <td class="p-4 font-bold text-white">${u.name}</td>
                        <td class="p-4 text-blue-300">${u.email}</td>
                        <td class="p-4 text-slate-400">${u.password}</td>
                        <td class="p-4 text-green-400">${u.date}</td>
                        <td class="p-4 text-orange-400">${u.lastLogin || 'Chưa xác định'}</td>
                    </tr>
                `).join('');
            });

            // Lấy danh sách Đơn hàng
            fetch(`${SERVER_URL}/api/orders`).then(res => res.json()).then(orders => {
                if(orders.length === 0) {
                    document.getElementById("admin-order-list").innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">Chưa có đơn hàng nào</td></tr>`;
                    return;
                }
                document.getElementById("admin-order-list").innerHTML = orders.reverse().map(o => `
                    <tr class="hover:bg-slate-700/30 transition border-b border-slate-700/50">
                        <td class="p-4 text-slate-400">${o.date}</td>
                        <td class="p-4 font-bold text-blue-300">${o.customer} <br><span class="text-xs text-slate-500">${o.email}</span></td>
                        <td class="p-4 text-white">${o.address}</td>
                        <td class="p-4 text-slate-400 text-xs">${o.items.map(i => `- ${i.name} (x${i.qty})`).join('<br>')}</td>
                        <td class="p-4 font-bold text-green-400">${formatMoney(o.total)}</td>
                    </tr>
                `).join('');
            });
        }

        // Khởi chạy
        window.onload = () => { renderProducts(); checkLoginStatus(); saveAndRenderCart(); };
    </script>
</body>
</html>
