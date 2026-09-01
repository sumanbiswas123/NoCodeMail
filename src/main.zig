const std = @import("std");
const Webview = @import("webview").Webview;

// Win32 Sleep
extern "kernel32" fn Sleep(dwMilliseconds: u32) callconv(.winapi) void;

// C stdlib for zero-dependency robust file I/O
extern "c" fn fopen(path: [*:0]const u8, mode: [*:0]const u8) callconv(.c) ?*anyopaque;
extern "c" fn fseek(stream: *anyopaque, offset: c_long, whence: c_int) callconv(.c) c_int;
extern "c" fn ftell(stream: *anyopaque) callconv(.c) c_long;
extern "c" fn fread(ptr: [*]u8, size: usize, count: usize, stream: *anyopaque) callconv(.c) usize;
extern "c" fn fwrite(ptr: [*]const u8, size: usize, count: usize, stream: *anyopaque) callconv(.c) usize;
extern "c" fn fclose(stream: *anyopaque) callconv(.c) c_int;

// WinSock API for embedded lightning-fast HTTP static file server
const WSADATA = extern struct {
    wVersion: u16,
    wHighVersion: u16,
    szDescription: [257]u8,
    szSystemStatus: [129]u8,
    iMaxSockets: u16,
    iMaxUdpDg: u16,
    lpVendorInfo: ?*anyopaque,
};
const SOCKADDR_IN = extern struct {
    sin_family: u16,
    sin_port: u16,
    sin_addr: u32,
    sin_zero: [8]u8,
};
const INVALID_SOCKET: usize = ~@as(usize, 0);
const SOCKET_ERROR: c_int = -1;
const AF_INET: u16 = 2;
const SOCK_STREAM: c_int = 1;
const SOL_SOCKET: c_int = 0xFFFF;
const SO_REUSEADDR: c_int = 4;
const IPPROTO_TCP: c_int = 6;

extern "ws2_32" fn WSAStartup(wVersionRequired: u16, lpWSAData: *WSADATA) callconv(.winapi) c_int;
extern "ws2_32" fn WSACleanup() callconv(.winapi) c_int;
extern "ws2_32" fn socket(af: c_int, stype: c_int, protocol: c_int) callconv(.winapi) usize;
extern "ws2_32" fn bind(s: usize, name: *const SOCKADDR_IN, namelen: c_int) callconv(.winapi) c_int;
extern "ws2_32" fn listen(s: usize, backlog: c_int) callconv(.winapi) c_int;
extern "ws2_32" fn accept(s: usize, addr: ?*SOCKADDR_IN, addrlen: ?*c_int) callconv(.winapi) usize;
extern "ws2_32" fn recv(s: usize, buf: [*]u8, len: c_int, flags: c_int) callconv(.winapi) c_int;
extern "ws2_32" fn send(s: usize, buf: [*]const u8, len: c_int, flags: c_int) callconv(.winapi) c_int;
extern "ws2_32" fn closesocket(s: usize) callconv(.winapi) c_int;
extern "ws2_32" fn setsockopt(s: usize, level: c_int, optname: c_int, optval: *const c_int, optlen: c_int) callconv(.winapi) c_int;
extern "ws2_32" fn htons(hostshort: u16) callconv(.winapi) u16;
extern "ws2_32" fn htonl(hostlong: u32) callconv(.winapi) u32;

const SERVER_PORT: u16 = 28941;

fn mimeType(path: []const u8) []const u8 {
    if (std.mem.endsWith(u8, path, ".html")) return "text/html; charset=utf-8";
    if (std.mem.endsWith(u8, path, ".js")) return "application/javascript; charset=utf-8";
    if (std.mem.endsWith(u8, path, ".css")) return "text/css; charset=utf-8";
    if (std.mem.endsWith(u8, path, ".svg")) return "image/svg+xml";
    if (std.mem.endsWith(u8, path, ".png")) return "image/png";
    if (std.mem.endsWith(u8, path, ".jpg") or std.mem.endsWith(u8, path, ".jpeg")) return "image/jpeg";
    if (std.mem.endsWith(u8, path, ".json")) return "application/json";
    if (std.mem.endsWith(u8, path, ".woff2")) return "font/woff2";
    if (std.mem.endsWith(u8, path, ".woff")) return "font/woff";
    if (std.mem.endsWith(u8, path, ".ttf")) return "font/ttf";
    return "application/octet-stream";
}

// Embedded UI Assets (Wails-style compile-time binary embedding)
// Embedded DLLs for 100% standalone single portable executable
const EMBED_PDFIUM_DLL = @embedFile("embedded_bins/pdfium.dll");
const EMBED_WEBVIEW2_DLL = @embedFile("embedded_bins/WebView2Loader.dll");

const win32_base = struct {
    extern "kernel32" fn GetModuleFileNameW(hModule: ?*anyopaque, lpFilename: [*]u16, nSize: u32) callconv(.winapi) u32;
    extern "kernel32" fn SetDllDirectoryW(lpPathName: [*:0]const u16) callconv(.winapi) c_int;
    extern "kernel32" fn MultiByteToWideChar(CodePage: u32, dwFlags: u32, lpMultiByteStr: [*]const u8, cbMultiByte: c_int, lpWideCharStr: ?[*]u16, cchWideChar: c_int) callconv(.winapi) c_int;
    extern "kernel32" fn LoadLibraryW(lpLibFileName: [*:0]const u16) callconv(.winapi) ?*anyopaque;
};

fn extractEmbeddedDll(target_path: []const u8, bytes: []const u8) void {
    // Check if file already exists with same size
    if (fopen(std.heap.page_allocator.dupeZ(u8, target_path) catch return, "rb")) |fh| {
        defer _ = fclose(fh);
        _ = fseek(fh, 0, 2);
        const sz = ftell(fh);
        if (sz == @as(c_long, @intCast(bytes.len))) return; // Already present and up to date
    }

    if (fopen(std.heap.page_allocator.dupeZ(u8, target_path) catch return, "wb")) |fh| {
        _ = fwrite(bytes.ptr, 1, bytes.len, fh);
        _ = fclose(fh);
    }
}

pub fn ensureEmbeddedDependencies() void {
    var mod_path_w: [2048]u16 = undefined;
    const len = win32_base.GetModuleFileNameW(null, &mod_path_w, mod_path_w.len);
    if (len == 0) return;

    var exe_dir_w: [2048]u16 = undefined;
    var last_slash: usize = 0;
    var i: usize = 0;
    while (i < len) : (i += 1) {
        exe_dir_w[i] = mod_path_w[i];
        if (mod_path_w[i] == '\\' or mod_path_w[i] == '/') {
            last_slash = i;
        }
    }
    exe_dir_w[last_slash] = 0;

    // Register exe dir with SetDllDirectoryW so Windows searches it first for dependencies
    _ = win32_base.SetDllDirectoryW(@ptrCast(&exe_dir_w));

    // Convert exe dir to utf8
    var exe_dir_u8: [2048]u8 = undefined;
    const u8_len = std.unicode.utf16LeToUtf8(&exe_dir_u8, exe_dir_w[0..last_slash]) catch 0;
    if (u8_len == 0) return;

    const base_dir = exe_dir_u8[0..u8_len];
    const p_pdfium = std.fmt.allocPrint(std.heap.page_allocator, "{s}\\pdfium.dll", .{base_dir}) catch return;
    const p_wv2 = std.fmt.allocPrint(std.heap.page_allocator, "{s}\\WebView2Loader.dll", .{base_dir}) catch return;

    extractEmbeddedDll(p_pdfium, EMBED_PDFIUM_DLL);
    extractEmbeddedDll(p_wv2, EMBED_WEBVIEW2_DLL);

    // Pre-load pdfium.dll and WebView2Loader.dll
    var p_pdf_w: [2048]u16 = undefined;
    const w_l1 = win32_base.MultiByteToWideChar(65001, 0, p_pdfium.ptr, @intCast(p_pdfium.len), &p_pdf_w, @intCast(p_pdf_w.len - 1));
    if (w_l1 > 0) {
        p_pdf_w[@intCast(w_l1)] = 0;
        _ = win32_base.LoadLibraryW(@ptrCast(&p_pdf_w));
    }

    var p_wv_w: [2048]u16 = undefined;
    const w_l2 = win32_base.MultiByteToWideChar(65001, 0, p_wv2.ptr, @intCast(p_wv2.len), &p_wv_w, @intCast(p_wv_w.len - 1));
    if (w_l2 > 0) {
        p_wv_w[@intCast(w_l2)] = 0;
        _ = win32_base.LoadLibraryW(@ptrCast(&p_wv_w));
    }
}

// Embedded UI Frontend Assets
const EMBED_INDEX_HTML = @embedFile("embedded_ui/index.html");
const EMBED_APP_JS = @embedFile("embedded_ui/assets/app.js");
const EMBED_INDEX_CSS = @embedFile("embedded_ui/assets/index.css");
const EMBED_FAVICON = @embedFile("embedded_ui/favicon.svg");

fn handleConnection(sock: usize) void {
    defer _ = closesocket(sock);

    var buf: [4096]u8 = undefined;
    const n = recv(sock, &buf, @intCast(buf.len), 0);
    if (n <= 0) return;
    const req = buf[0..@intCast(n)];

    if (!std.mem.startsWith(u8, req, "GET ")) {
        const not_allowed = "HTTP/1.0 405 Method Not Allowed\r\n\r\n";
        _ = send(sock, not_allowed.ptr, not_allowed.len, 0);
        return;
    }

    const sp = std.mem.indexOfScalar(u8, req, ' ') orelse return;
    const after = req[sp + 1 ..];
    const sp2 = std.mem.indexOfScalar(u8, after, ' ') orelse return;
    var url_path = after[0..sp2];
    if (std.mem.indexOfScalar(u8, url_path, '?')) |q| {
        url_path = url_path[0..q];
    }

    var content: []const u8 = "";
    var content_type: []const u8 = "text/html; charset=utf-8";

    if (std.mem.eql(u8, url_path, "/") or std.mem.eql(u8, url_path, "/index.html") or std.mem.eql(u8, url_path, "")) {
        content = EMBED_INDEX_HTML;
        content_type = "text/html; charset=utf-8";
    } else if (std.mem.endsWith(u8, url_path, "app.js") or std.mem.endsWith(u8, url_path, ".js")) {
        content = EMBED_APP_JS;
        content_type = "application/javascript; charset=utf-8";
    } else if (std.mem.endsWith(u8, url_path, "index.css") or std.mem.endsWith(u8, url_path, ".css")) {
        content = EMBED_INDEX_CSS;
        content_type = "text/css; charset=utf-8";
    } else if (std.mem.endsWith(u8, url_path, "favicon.svg") or std.mem.endsWith(u8, url_path, ".svg")) {
        content = EMBED_FAVICON;
        content_type = "image/svg+xml";
    } else if (std.mem.startsWith(u8, url_path, "/pkg/")) {
        // Direct package asset serving by path: /pkg/<encoded_base_dir>/<rel_path> or /pkg/<encoded_full_path>
        const decoded_sub = url_path[5..];
        var file_path_buf: [4096]u8 = undefined;
        var fpi: usize = 0;
        var bi: usize = 0;
        while (bi < decoded_sub.len and fpi < file_path_buf.len - 1) {
            if (decoded_sub[bi] == '%' and bi + 2 < decoded_sub.len) {
                const hex = decoded_sub[bi + 1 .. bi + 3];
                const byte = std.fmt.parseInt(u8, hex, 16) catch {
                    file_path_buf[fpi] = decoded_sub[bi];
                    fpi += 1;
                    bi += 1;
                    continue;
                };
                file_path_buf[fpi] = byte;
                fpi += 1;
                bi += 3;
            } else {
                file_path_buf[fpi] = decoded_sub[bi];
                fpi += 1;
                bi += 1;
            }
        }
        file_path_buf[fpi] = 0;

        for (file_path_buf[0..fpi]) |*b| {
            if (b.* == '/') b.* = '\\';
        }

        const disk_target: [:0]const u8 = file_path_buf[0..fpi :0];

        if (fopen(disk_target.ptr, "rb")) |fh| {
            defer _ = fclose(fh);
            _ = fseek(fh, 0, 2);
            const file_size: usize = @intCast(ftell(fh));
            _ = fseek(fh, 0, 0);
            const disk_buf = std.heap.page_allocator.alloc(u8, file_size) catch return;
            defer std.heap.page_allocator.free(disk_buf);
            _ = fread(disk_buf.ptr, 1, file_size, fh);

            var header_buf: [512]u8 = undefined;
            const header = std.fmt.bufPrint(&header_buf, "HTTP/1.1 200 OK\r\nContent-Type: {s}\r\nContent-Length: {d}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-cache, no-store, must-revalidate, max-age=0\r\nPragma: no-cache\r\nExpires: 0\r\nConnection: close\r\n\r\n", .{ mimeType(disk_target), file_size }) catch return;
            _ = send(sock, header.ptr, @intCast(header.len), 0);
            _ = send(sock, disk_buf.ptr, @intCast(disk_buf.len), 0);
            return;
        }

        const not_found = "HTTP/1.0 404 Not Found\r\n\r\n";
        _ = send(sock, not_found.ptr, not_found.len, 0);
        return;
    }
 else {
        // Fallback to disk if extra asset exists
        const p1 = std.fmt.allocPrintSentinel(std.heap.page_allocator, "ui{s}", .{url_path}, 0) catch return;
        defer std.heap.page_allocator.free(p1);
        if (fopen(p1, "rb")) |fh| {
            defer _ = fclose(fh);
            _ = fseek(fh, 0, 2);
            const file_size: usize = @intCast(ftell(fh));
            _ = fseek(fh, 0, 0);
            const disk_buf = std.heap.page_allocator.alloc(u8, file_size) catch return;
            defer std.heap.page_allocator.free(disk_buf);
            _ = fread(disk_buf.ptr, 1, file_size, fh);

            var header_buf: [512]u8 = undefined;
            const header = std.fmt.bufPrint(&header_buf, "HTTP/1.1 200 OK\r\nContent-Type: {s}\r\nContent-Length: {d}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-cache, no-store, must-revalidate, max-age=0\r\nPragma: no-cache\r\nExpires: 0\r\nConnection: close\r\n\r\n", .{ mimeType(url_path), file_size }) catch return;
            _ = send(sock, header.ptr, @intCast(header.len), 0);
            _ = send(sock, disk_buf.ptr, @intCast(disk_buf.len), 0);
            return;
        }

        const not_found = "HTTP/1.0 404 Not Found\r\n\r\n";
        _ = send(sock, not_found.ptr, not_found.len, 0);
        return;
    }

    var header_buf: [512]u8 = undefined;
    const header = std.fmt.bufPrint(&header_buf, "HTTP/1.1 200 OK\r\nContent-Type: {s}\r\nContent-Length: {d}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-cache, no-store, must-revalidate, max-age=0\r\nPragma: no-cache\r\nExpires: 0\r\nConnection: close\r\n\r\n", .{ content_type, content.len }) catch return;
    _ = send(sock, header.ptr, @intCast(header.len), 0);
    _ = send(sock, content.ptr, @intCast(content.len), 0);
}

fn serverThread() void {
    var wsdata: WSADATA = undefined;
    _ = WSAStartup(0x0202, &wsdata);
    defer _ = WSACleanup();

    const srv = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (srv == INVALID_SOCKET) return;
    defer _ = closesocket(srv);

    const yes: c_int = 1;
    _ = setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &yes, @sizeOf(c_int));

    var addr = SOCKADDR_IN{
        .sin_family = AF_INET,
        .sin_port = htons(SERVER_PORT),
        .sin_addr = htonl(0x7F000001),
        .sin_zero = [_]u8{0} ** 8,
    };

    if (bind(srv, &addr, @sizeOf(SOCKADDR_IN)) == SOCKET_ERROR) return;
    if (listen(srv, 128) == SOCKET_ERROR) return;

    while (true) {
        const client = accept(srv, null, null);
        if (client == INVALID_SOCKET) continue;
        const t = std.Thread.spawn(.{}, handleConnection, .{client}) catch {
            _ = closesocket(client);
            continue;
        };
        t.detach();
    }
}

const pdf_extractor = @import("pdf_extractor.zig");




// Win32 Open File Dialog (Unicode UTF-16)
const OPENFILENAMEW = extern struct {
    lStructSize: u32 = @sizeOf(@This()),
    hwndOwner: ?*anyopaque = null,
    hInstance: ?*anyopaque = null,
    lpstrFilter: ?[*:0]const u16 = null,
    lpstrCustomFilter: ?[*]u16 = null,
    nMaxCustFilter: u32 = 0,
    nFilterIndex: u32 = 1,
    lpstrFile: [*]u16,
    nMaxFile: u32,
    lpstrFileTitle: ?[*]u16 = null,
    nMaxFileTitle: u32 = 0,
    lpstrInitialDir: ?[*:0]const u16 = null,
    lpstrTitle: ?[*:0]const u16 = null,
    Flags: u32 = 0x00080000 | 0x00001000 | 0x00000800 | 0x00000004,
    nFileOffset: u16 = 0,
    nFileExtension: u16 = 0,
    lpstrDefExt: ?[*:0]const u16 = null,
    lCustData: usize = 0,
    lpfnHook: ?*anyopaque = null,
    lpTemplateName: ?[*:0]const u16 = null,
    pvReserved: ?*anyopaque = null,
    dwReserved: u32 = 0,
    FlagsEx: u32 = 0,
};

extern "comdlg32" fn GetOpenFileNameW(lpofn: *OPENFILENAMEW) callconv(.winapi) i32;

fn readFileAlloc(allocator: std.mem.Allocator, path: [:0]const u8) ?[]const u8 {
    const f = fopen(path.ptr, "rb") orelse return null;
    defer _ = fclose(f);
    _ = fseek(f, 0, 2); // SEEK_END
    const size = ftell(f);
    if (size <= 0) return "";
    _ = fseek(f, 0, 0); // SEEK_SET
    const buf = allocator.alloc(u8, @intCast(size)) catch return null;
    const read = fread(buf.ptr, 1, @intCast(size), f);
    return buf[0..read];
}

fn writeFile(path: [:0]const u8, content: []const u8) bool {
    const f = fopen(path.ptr, "wb") orelse return false;
    defer _ = fclose(f);
    const written = fwrite(content.ptr, 1, content.len, f);
    return written == content.len;
}

pub const App = struct {
    w: *Webview,

    pub fn handleChoosePdf(self: *App, seq: [:0]const u8, _: [:0]const u8) void {
        var file_buf_w: [2048]u16 = [_]u16{0} ** 2048;
        const filter_w = std.unicode.utf8ToUtf16LeStringLiteral("PDF Files (*.pdf)\x00*.pdf\x00All Files (*.*)\x00*.*\x00\x00");
        const title_w = std.unicode.utf8ToUtf16LeStringLiteral("Select PDF Email Design");

        var ofn = OPENFILENAMEW{
            .lpstrFilter = filter_w,
            .lpstrFile = &file_buf_w,
            .nMaxFile = file_buf_w.len,
            .lpstrTitle = title_w,
        };

        if (GetOpenFileNameW(&ofn) != 0) {
            const w_len = std.mem.indexOfScalar(u16, &file_buf_w, 0) orelse file_buf_w.len;
            var utf8_buf: [4096]u8 = undefined;
            const u8_len = std.unicode.utf16LeToUtf8(&utf8_buf, file_buf_w[0..w_len]) catch 0;
            if (u8_len > 0) {
                const selected = utf8_buf[0..u8_len];
                const res_json = std.fmt.allocPrintSentinel(std.heap.page_allocator, "{{\"success\":true,\"path\":{f}}}", .{std.json.fmt(selected, .{})}, 0) catch return;
                defer std.heap.page_allocator.free(res_json);
                self.w.respond(seq, .ok, res_json) catch {};
                return;
            }
        }
        self.w.respond(seq, .ok, "{\"success\":false,\"canceled\":true}") catch {};
    }

    pub fn handleChooseImage(self: *App, seq: [:0]const u8, _: [:0]const u8) void {
        var file_buf_w: [2048]u16 = [_]u16{0} ** 2048;
        const filter_w = std.unicode.utf8ToUtf16LeStringLiteral("Image Files (*.png;*.jpg;*.jpeg;*.svg;*.gif;*.webp)\x00*.png;*.jpg;*.jpeg;*.svg;*.gif;*.webp\x00All Files (*.*)\x00*.*\x00\x00");
        const title_w = std.unicode.utf8ToUtf16LeStringLiteral("Select Image to Replace");

        var ofn = OPENFILENAMEW{
            .lpstrFilter = filter_w,
            .lpstrFile = &file_buf_w,
            .nMaxFile = file_buf_w.len,
            .lpstrTitle = title_w,
        };

        if (GetOpenFileNameW(&ofn) != 0) {
            const w_len = std.mem.indexOfScalar(u16, &file_buf_w, 0) orelse file_buf_w.len;
            var utf8_buf: [4096]u8 = undefined;
            const u8_len = std.unicode.utf16LeToUtf8(&utf8_buf, file_buf_w[0..w_len]) catch 0;
            if (u8_len > 0) {
                const selected = utf8_buf[0..u8_len];
                const res_json = std.fmt.allocPrintSentinel(std.heap.page_allocator, "{{\"success\":true,\"path\":{f}}}", .{std.json.fmt(selected, .{})}, 0) catch return;
                defer std.heap.page_allocator.free(res_json);
                self.w.respond(seq, .ok, res_json) catch {};
                return;
            }
        }
        self.w.respond(seq, .ok, "{\"success\":false,\"canceled\":true}") catch {};
    }

    pub fn handleChooseHtml(self: *App, seq: [:0]const u8, _: [:0]const u8) void {
        var file_buf_w: [2048]u16 = [_]u16{0} ** 2048;
        const filter_w = std.unicode.utf8ToUtf16LeStringLiteral("HTML Files (*.html;*.htm)\x00*.html;*.htm\x00All Files (*.*)\x00*.*\x00\x00");
        const title_w = std.unicode.utf8ToUtf16LeStringLiteral("Select HTML Email Template");

        var ofn = OPENFILENAMEW{
            .lpstrFilter = filter_w,
            .lpstrFile = &file_buf_w,
            .nMaxFile = file_buf_w.len,
            .lpstrTitle = title_w,
        };

        if (GetOpenFileNameW(&ofn) != 0) {
            const w_len = std.mem.indexOfScalar(u16, &file_buf_w, 0) orelse file_buf_w.len;
            var utf8_buf: [4096]u8 = undefined;
            const u8_len = std.unicode.utf16LeToUtf8(&utf8_buf, file_buf_w[0..w_len]) catch 0;
            if (u8_len > 0) {
                const selected = utf8_buf[0..u8_len];
                const sel_z = std.heap.page_allocator.dupeZ(u8, selected) catch return;
                defer std.heap.page_allocator.free(sel_z);

                const content = readFileAlloc(std.heap.page_allocator, sel_z) orelse "";
                defer if (content.len > 0) std.heap.page_allocator.free(content);

                const res_json = std.fmt.allocPrintSentinel(std.heap.page_allocator, "{{\"success\":true,\"path\":{f},\"content\":{f}}}", .{ std.json.fmt(selected, .{}), std.json.fmt(content, .{}) }, 0) catch return;
                defer std.heap.page_allocator.free(res_json);
                self.w.respond(seq, .ok, res_json) catch {};
                return;
            }
        }
        self.w.respond(seq, .ok, "{\"success\":false,\"canceled\":true}") catch {};
    }

    pub fn handleGetPdfInfo(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        var pdf_path: []const u8 = "";

        if (std.json.parseFromSlice([]struct { path: []const u8 }, alloc, req, .{})) |parsed_arr| {
            if (parsed_arr.value.len > 0) {
                pdf_path = alloc.dupe(u8, parsed_arr.value[0].path) catch "";
            }
        } else |_| {
            if (std.json.parseFromSlice(struct { path: []const u8 }, alloc, req, .{})) |parsed_obj| {
                pdf_path = alloc.dupe(u8, parsed_obj.value.path) catch "";
            } else |_| {
                self.w.respond(seq, .err, "{\"error\":\"Invalid arguments\"}") catch {};
                return;
            }
        }

        if (pdf_path.len == 0) {
            self.w.respond(seq, .err, "{\"error\":\"Empty PDF path\"}") catch {};
            return;
        }

        const count = pdf_extractor.getPdfInfo(alloc, pdf_path) catch {
            self.w.respond(seq, .ok, "{\"success\":false,\"error\":\"Failed to get PDF info\"}") catch {};
            return;
        };

        const res_json = std.fmt.allocPrintSentinel(
            alloc,
            "{{\"success\":true,\"total_pages\":{d}}}",
            .{count},
            0
        ) catch return;

        self.w.respond(seq, .ok, res_json) catch {};
    }

    pub fn handleGetPdfComponents(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        var pdf_path: []const u8 = "";
        var target_page: ?i32 = null;

        const ParamStruct = struct { path: []const u8, target_page: ?i32 = null, page: ?i32 = null };

        if (std.json.parseFromSlice([]ParamStruct, alloc, req, .{})) |parsed_arr| {
            if (parsed_arr.value.len > 0) {
                pdf_path = alloc.dupe(u8, parsed_arr.value[0].path) catch "";
                target_page = parsed_arr.value[0].target_page orelse parsed_arr.value[0].page;
            }
        } else |_| {
            if (std.json.parseFromSlice(ParamStruct, alloc, req, .{})) |parsed_obj| {
                pdf_path = alloc.dupe(u8, parsed_obj.value.path) catch "";
                target_page = parsed_obj.value.target_page orelse parsed_obj.value.page;
            } else |_| {
                self.w.respond(seq, .err, "{\"error\":\"Invalid arguments\"}") catch {};
                return;
            }
        }

        if (pdf_path.len == 0) {
            self.w.respond(seq, .err, "{\"error\":\"Empty PDF path\"}") catch {};
            return;
        }

        const res_json = pdf_extractor.getPdfPageComponents(alloc, pdf_path, target_page) catch |err| {
            pdf_extractor.logMsg("getPdfPageComponents error: {s}", .{@errorName(err)});
            const res_err = std.fmt.allocPrintSentinel(alloc, "{{\"success\":false,\"error\":\"Failed to get PDF components: {s}\"}}", .{@errorName(err)}, 0) catch return;
            self.w.respond(seq, .ok, res_err) catch {};
            return;
        };

        const res_z = std.fmt.allocPrintSentinel(alloc, "{s}", .{res_json}, 0) catch return;
        self.w.respond(seq, .ok, res_z) catch {};
    }

    pub fn handleRenderRegionPreview(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        const PreviewParam = struct {
            path: []const u8,
            target_page: ?i32 = null,
            page: ?i32 = null,
            bounds: [4]f64,
            transparent: ?bool = true,
            email_width: ?i32 = null,
        };

        var pdf_path: []const u8 = "";
        var target_page: ?i32 = null;
        var bounds: [4]f64 = [4]f64{ 0, 0, 100, 100 };
        var transparent: bool = true;
        var req_w: ?i32 = null;

        if (std.json.parseFromSlice([]PreviewParam, alloc, req, .{})) |parsed_arr| {
            if (parsed_arr.value.len > 0) {
                pdf_path = alloc.dupe(u8, parsed_arr.value[0].path) catch "";
                target_page = parsed_arr.value[0].target_page orelse parsed_arr.value[0].page;
                bounds = parsed_arr.value[0].bounds;
                transparent = parsed_arr.value[0].transparent orelse true;
                req_w = parsed_arr.value[0].email_width;
            }
        } else |_| {
            if (std.json.parseFromSlice(PreviewParam, alloc, req, .{})) |parsed_obj| {
                pdf_path = alloc.dupe(u8, parsed_obj.value.path) catch "";
                target_page = parsed_obj.value.target_page orelse parsed_obj.value.page;
                bounds = parsed_obj.value.bounds;
                transparent = parsed_obj.value.transparent orelse true;
                req_w = parsed_obj.value.email_width;
            } else |_| {
                self.w.respond(seq, .err, "{\"error\":\"Invalid arguments\"}") catch {};
                return;
            }
        }

        if (pdf_path.len == 0) {
            self.w.respond(seq, .err, "{\"error\":\"Empty PDF path\"}") catch {};
            return;
        }

        const res_json = pdf_extractor.renderRegionPreview(alloc, pdf_path, target_page, bounds, transparent, req_w) catch |err| {
            pdf_extractor.logMsg("renderRegionPreview error: {s}", .{@errorName(err)});
            const res_err = std.fmt.allocPrintSentinel(alloc, "{{\"success\":false,\"error\":\"Failed to render preview: {s}\"}}", .{@errorName(err)}, 0) catch return;
            self.w.respond(seq, .ok, res_err) catch {};
            return;
        };

        const res_z = std.fmt.allocPrintSentinel(alloc, "{s}", .{res_json}, 0) catch return;
        self.w.respond(seq, .ok, res_z) catch {};
    }

    pub fn handleExtractPdf(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        var pdf_path: []const u8 = "";
        var email_w: i32 = 700;
        var target_page: ?i32 = null;

        const RegionInput = struct {
            id: ?[]const u8 = null,
            page: ?i32 = null,
            left: f64,
            top: f64,
            right: f64,
            bottom: f64,
        };

        const ExtractParams = struct {
            path: []const u8,
            email_width: ?i32 = null,
            target_page: ?i32 = null,
            marked_regions: ?[]RegionInput = null,
        };

        var parsed_marks = std.ArrayList(pdf_extractor.PdfMarkedRegion).empty;
        defer parsed_marks.deinit(alloc);

        if (std.json.parseFromSlice([]ExtractParams, alloc, req, .{})) |parsed_arr| {
            if (parsed_arr.value.len > 0) {
                const item = parsed_arr.value[0];
                pdf_path = alloc.dupe(u8, item.path) catch "";
                email_w = item.email_width orelse 700;
                target_page = item.target_page;
                if (item.marked_regions) |m_list| {
                    for (m_list) |mr| {
                        parsed_marks.append(alloc, .{
                            .id = if (mr.id) |mid| alloc.dupe(u8, mid) catch "" else "",
                            .page = mr.page orelse 1,
                            .left = mr.left,
                            .top = mr.top,
                            .right = mr.right,
                            .bottom = mr.bottom,
                        }) catch {};
                    }
                }
            }
        } else |_| {
            if (std.json.parseFromSlice(ExtractParams, alloc, req, .{})) |parsed_obj| {
                const item = parsed_obj.value;
                pdf_path = alloc.dupe(u8, item.path) catch "";
                email_w = item.email_width orelse 700;
                target_page = item.target_page;
                if (item.marked_regions) |m_list| {
                    for (m_list) |mr| {
                        parsed_marks.append(alloc, .{
                            .id = if (mr.id) |mid| alloc.dupe(u8, mid) catch "" else "",
                            .page = mr.page orelse 1,
                            .left = mr.left,
                            .top = mr.top,
                            .right = mr.right,
                            .bottom = mr.bottom,
                        }) catch {};
                    }
                }
            } else |_| {
                self.w.respond(seq, .err, "{\"error\":\"Invalid arguments\"}") catch {};
                return;
            }
        }

        if (pdf_path.len == 0) {
            self.w.respond(seq, .err, "{\"error\":\"Empty PDF path\"}") catch {};
            return;
        }

        const res = pdf_extractor.extractPdfPackage(alloc, pdf_path, email_w, target_page, null, parsed_marks.items) catch |err| {
            pdf_extractor.logMsg("PDF extraction error: {s}", .{@errorName(err)});
            const res_err = std.fmt.allocPrintSentinel(alloc, "{{\"success\":false,\"error\":\"Failed to extract PDF: {s}\"}}", .{@errorName(err)}, 0) catch return;
            self.w.respond(seq, .ok, res_err) catch {};
            return;
        };

        const ResponseStruct = struct {
            success: bool,
            package_dir: []const u8,
            json_path: []const u8,
            preview_image_path: []const u8,
            preview_image_filename: []const u8,
            total_pages: i32,
            total_text_blocks: i32,
            total_images: i32,
            total_links: i32,
            total_tables: i32,
            total_styles: i32,
            design_json: []const u8,
        };

        const resp_obj = ResponseStruct{
            .success = true,
            .package_dir = res.package_dir,
            .json_path = res.json_path,
            .preview_image_path = res.preview_image_path,
            .preview_image_filename = res.preview_image_filename,
            .total_pages = res.total_pages,
            .total_text_blocks = res.total_text_blocks,
            .total_images = res.total_images,
            .total_links = res.total_links,
            .total_tables = res.total_tables,
            .total_styles = res.total_styles,
            .design_json = res.design_json_content,
        };

        const res_json = std.fmt.allocPrintSentinel(alloc, "{f}", .{std.json.fmt(resp_obj, .{})}, 0) catch return;
        self.w.respond(seq, .ok, res_json) catch {};
    }

    pub fn handleSaveFile(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        var path: []const u8 = "";
        var content: []const u8 = "";

        if (std.json.parseFromSlice([]struct { path: []const u8, content: []const u8 }, alloc, req, .{})) |parsed_arr| {
            if (parsed_arr.value.len > 0) {
                path = alloc.dupe(u8, parsed_arr.value[0].path) catch "";
                content = alloc.dupe(u8, parsed_arr.value[0].content) catch "";
            }
        } else |_| {
            if (std.json.parseFromSlice(struct { path: []const u8, content: []const u8 }, alloc, req, .{})) |parsed_obj| {
                path = alloc.dupe(u8, parsed_obj.value.path) catch "";
                content = alloc.dupe(u8, parsed_obj.value.content) catch "";
            } else |_| {
                self.w.respond(seq, .err, "{\"error\":\"Invalid arguments\"}") catch {};
                return;
            }
        }

        if (path.len == 0) {
            self.w.respond(seq, .err, "{\"error\":\"Empty file path\"}") catch {};
            return;
        }

        const path_z = alloc.dupeZ(u8, path) catch return;

        const f = fopen(path_z.ptr, "wb");
        if (f) |file_h| {
            _ = fwrite(content.ptr, 1, content.len, file_h);
            _ = fclose(file_h);
            self.w.respond(seq, .ok, "{\"success\":true}") catch {};
        } else {
            self.w.respond(seq, .ok, "{\"success\":false,\"error\":\"Failed to save content\"}") catch {};
        }
    }
};

pub fn main() !void {
    ensureEmbeddedDependencies();

    pdf_extractor.initPdfEngine();
    defer pdf_extractor.destroyPdfEngine();

    const win32 = struct {
        extern "kernel32" fn GetCommandLineW() callconv(.winapi) [*:0]const u16;
        extern "shell32" fn CommandLineToArgvW(lpCmdLine: [*:0]const u16, pNumArgs: *c_int) callconv(.winapi) ?[*]?[*:0]const u16;
        extern "kernel32" fn LocalFree(hMem: ?*anyopaque) callconv(.winapi) ?*anyopaque;
        extern "kernel32" fn WideCharToMultiByte(CodePage: u32, dwFlags: u32, lpWideCharStr: [*]const u16, cchWideChar: c_int, lpMultiByteStr: ?[*]u8, cbMultiByte: c_int, lpDefaultChar: ?[*:0]const u8, lpUsedDefaultChar: ?*c_int) callconv(.winapi) c_int;
    };
    var num_args: c_int = 0;
    const argv_w = win32.CommandLineToArgvW(win32.GetCommandLineW(), &num_args);
    if (argv_w) |args_w| {
        defer _ = win32.LocalFree(@ptrCast(args_w));
        var pdf_to_extract: ?[]const u8 = null;
        var target_p: ?i32 = null;
        var override_out: ?[]const u8 = null;

        var arg_i: usize = 1;
        while (arg_i < @as(usize, @intCast(num_args))) : (arg_i += 1) {
            if (args_w[arg_i]) |w_arg| {
                const w_len = std.mem.sliceTo(w_arg, 0).len;
                var utf8_buf: [1024]u8 = undefined;
                const utf8_len = win32.WideCharToMultiByte(65001, 0, w_arg, @intCast(w_len), &utf8_buf, @intCast(utf8_buf.len), null, null);
                if (utf8_len > 0) {
                    const arg_str = utf8_buf[0..@intCast(utf8_len)];
                    if (std.mem.eql(u8, arg_str, "--extract") or std.mem.eql(u8, arg_str, "-e")) {
                        if (arg_i + 1 < @as(usize, @intCast(num_args))) {
                            arg_i += 1;
                            if (args_w[arg_i]) |w_pdf| {
                                const w_pdf_len = std.mem.sliceTo(w_pdf, 0).len;
                                var pdf_buf: [1024]u8 = undefined;
                                const pdf_len = win32.WideCharToMultiByte(65001, 0, w_pdf, @intCast(w_pdf_len), &pdf_buf, @intCast(pdf_buf.len), null, null);
                                if (pdf_len > 0) {
                                    pdf_to_extract = try std.heap.page_allocator.dupe(u8, pdf_buf[0..@intCast(pdf_len)]);
                                }
                            }
                        }
                    } else if (std.mem.eql(u8, arg_str, "--page") or std.mem.eql(u8, arg_str, "-p")) {
                        if (arg_i + 1 < @as(usize, @intCast(num_args))) {
                            arg_i += 1;
                            if (args_w[arg_i]) |w_p| {
                                const w_p_len = std.mem.sliceTo(w_p, 0).len;
                                var p_buf: [32]u8 = undefined;
                                const p_len = win32.WideCharToMultiByte(65001, 0, w_p, @intCast(w_p_len), &p_buf, @intCast(p_buf.len), null, null);
                                if (p_len > 0) {
                                    target_p = std.fmt.parseInt(i32, p_buf[0..@intCast(p_len)], 10) catch null;
                                }
                            }
                        }
                    } else if (std.mem.eql(u8, arg_str, "--out") or std.mem.eql(u8, arg_str, "-o")) {
                        if (arg_i + 1 < @as(usize, @intCast(num_args))) {
                            arg_i += 1;
                            if (args_w[arg_i]) |w_out| {
                                const w_out_len = std.mem.sliceTo(w_out, 0).len;
                                var out_buf: [1024]u8 = undefined;
                                const out_len = win32.WideCharToMultiByte(65001, 0, w_out, @intCast(w_out_len), &out_buf, @intCast(out_buf.len), null, null);
                                if (out_len > 0) {
                                    override_out = try std.heap.page_allocator.dupe(u8, out_buf[0..@intCast(out_len)]);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (pdf_to_extract) |clean_pdf| {
            _ = try pdf_extractor.extractPdfPackage(std.heap.page_allocator, clean_pdf, 700, target_p, override_out, null);
            return;
        }
    }

    // Start embedded high-speed WinSock server for self-contained UI serving
    const server_t = try std.Thread.spawn(.{}, serverThread, .{});
    server_t.detach();

    // Give server 10ms to bind socket
    Sleep(10);

    // Create native WebView2 window with 1ms instant launch (debug = true enables right click inspection & DevTools)
    const w = try Webview.create(true, null);
    defer _ = w.destroy() catch {};

    try w.setTitle("NoCodeMail - Email Design Studio");
    try w.setSize(1440, 900, .none);

    var app = App{ .w = w };

    // Bind native IPC handlers using App struct
    try w.bind(App, "choosePdf", App.handleChoosePdf, &app);
    try w.bind(App, "chooseImage", App.handleChooseImage, &app);
    try w.bind(App, "getPdfInfo", App.handleGetPdfInfo, &app);
    try w.bind(App, "getPdfComponents", App.handleGetPdfComponents, &app);
    try w.bind(App, "renderRegionPreview", App.handleRenderRegionPreview, &app);
    try w.bind(App, "chooseHtml", App.handleChooseHtml, &app);
    try w.bind(App, "extractPdf", App.handleExtractPdf, &app);
    try w.bind(App, "saveFile", App.handleSaveFile, &app);

    // Navigate to embedded local HTTP server port 28941
    try w.navigate("http://localhost:28941/");

    try w.run();
}

