const std = @import("std");
const Webview = @import("webview").Webview;

// Win32 Sleep
extern "kernel32" fn Sleep(dwMilliseconds: u32) callconv(.winapi) void;

// C stdlib for zero-dependency robust file I/O
extern "c" fn fopen(path: [*:0]const u8, mode: [*:0]const u8) callconv(.c) ?*anyopaque;
extern "c" fn _wfopen(path: [*:0]const u16, mode: [*:0]const u16) callconv(.c) ?*anyopaque;
extern "c" fn fseek(stream: *anyopaque, offset: c_long, whence: c_int) callconv(.c) c_int;
extern "c" fn ftell(stream: *anyopaque) callconv(.c) c_long;
extern "c" fn fread(ptr: [*]u8, size: usize, count: usize, stream: *anyopaque) callconv(.c) usize;
extern "c" fn fwrite(ptr: [*]const u8, size: usize, count: usize, stream: *anyopaque) callconv(.c) usize;
extern "c" fn fclose(stream: *anyopaque) callconv(.c) c_int;

fn openFileUtf8(path_u8: []const u8, mode_u8: []const u8) ?*anyopaque {
    var path_w: [2048]u16 = undefined;
    const w_len = win32_base.MultiByteToWideChar(65001, 0, path_u8.ptr, @intCast(path_u8.len), &path_w, @intCast(path_w.len - 1));
    if (w_len <= 0) return null;
    path_w[@intCast(w_len)] = 0;

    var mode_w: [16]u16 = undefined;
    const m_len = win32_base.MultiByteToWideChar(65001, 0, mode_u8.ptr, @intCast(mode_u8.len), &mode_w, @intCast(mode_w.len - 1));
    if (m_len <= 0) return null;
    mode_w[@intCast(m_len)] = 0;

    return _wfopen(@ptrCast(&path_w), @ptrCast(&mode_w));
}

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
    extern "kernel32" fn SetEnvironmentVariableW(lpName: [*:0]const u16, lpValue: ?[*:0]const u16) callconv(.winapi) c_int;
    extern "kernel32" fn GetEnvironmentVariableW(lpName: [*:0]const u16, lpBuffer: ?[*]u16, nSize: u32) callconv(.winapi) u32;
    extern "kernel32" fn CreateDirectoryA(lpPathName: [*:0]const u8, lpSecurityAttributes: ?*anyopaque) callconv(.winapi) c_int;
};

const win32_shell = struct {
    extern "advapi32" fn RegOpenKeyExW(hKey: usize, lpSubKey: [*:0]const u16, ulOptions: u32, samDesired: u32, phkResult: *usize) callconv(.winapi) c_long;
    extern "advapi32" fn RegEnumKeyExW(hKey: usize, dwIndex: u32, lpName: [*]u16, lpcchName: *u32, lpReserved: ?*u32, lpClass: ?[*]u16, lpcchClass: ?*u32, lpftLastWriteTime: ?*anyopaque) callconv(.winapi) c_long;
    extern "advapi32" fn RegQueryValueExW(hKey: usize, lpValueName: ?[*:0]const u16, lpReserved: ?*u32, lpType: ?*u32, lpData: ?[*]u8, lpcbData: ?*u32) callconv(.winapi) c_long;
    extern "advapi32" fn RegCloseKey(hKey: usize) callconv(.winapi) c_long;
    extern "shell32" fn ShellExecuteW(hwnd: ?*anyopaque, lpOperation: ?[*:0]const u16, lpFile: [*:0]const u16, lpParameters: ?[*:0]const u16, lpDirectory: ?[*:0]const u16, nShowCmd: c_int) callconv(.winapi) usize;
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
const EMBED_MJML_JS = @embedFile("embedded_ui/assets/mjml.js");
const EMBED_INDEX_CSS = @embedFile("embedded_ui/assets/index.css");
const EMBED_FAVICON = @embedFile("embedded_ui/favicon.svg");

var g_last_pkg_buf: [2048]u8 = [_]u8{0} ** 2048;
var g_last_pkg_len: usize = 0;

pub fn setLastPackageDir(dir: []const u8) void {
    if (dir.len == 0 or dir.len >= g_last_pkg_buf.len) return;
    @memcpy(g_last_pkg_buf[0..dir.len], dir);
    g_last_pkg_len = dir.len;
}

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
    } else if (std.mem.endsWith(u8, url_path, "mjml.js")) {
        content = EMBED_MJML_JS;
        content_type = "application/javascript; charset=utf-8";
    } else if (std.mem.endsWith(u8, url_path, "app.js") or std.mem.endsWith(u8, url_path, ".js")) {
        content = EMBED_APP_JS;
        content_type = "application/javascript; charset=utf-8";
    } else if (std.mem.endsWith(u8, url_path, "index.css") or std.mem.endsWith(u8, url_path, ".css")) {
        content = EMBED_INDEX_CSS;
        content_type = "text/css; charset=utf-8";
    } else if (std.mem.endsWith(u8, url_path, "favicon.svg") or std.mem.endsWith(u8, url_path, ".svg")) {
        content = EMBED_FAVICON;
        content_type = "image/svg+xml";
    } else if (std.mem.startsWith(u8, url_path, "/pkg/") or
               std.mem.startsWith(u8, url_path, "/C:") or std.mem.startsWith(u8, url_path, "/c:") or
               std.mem.startsWith(u8, url_path, "/D:") or std.mem.startsWith(u8, url_path, "/d:") or
               std.mem.startsWith(u8, url_path, "/C%3A") or std.mem.startsWith(u8, url_path, "/c%3A") or
               std.mem.startsWith(u8, url_path, "/C%3a") or std.mem.startsWith(u8, url_path, "/c%3a") or
               std.mem.startsWith(u8, url_path, "C:") or std.mem.startsWith(u8, url_path, "c:") or
               std.mem.startsWith(u8, url_path, "D:") or std.mem.startsWith(u8, url_path, "d:") or
               std.mem.startsWith(u8, url_path, "C%3A") or std.mem.startsWith(u8, url_path, "c%3A") or
               std.mem.startsWith(u8, url_path, "/asset_") or std.mem.startsWith(u8, url_path, "/assets/") or
               std.mem.endsWith(u8, url_path, ".png") or std.mem.endsWith(u8, url_path, ".jpg") or
               std.mem.endsWith(u8, url_path, ".jpeg") or std.mem.endsWith(u8, url_path, ".webp") or
               std.mem.endsWith(u8, url_path, ".gif")) {
        // Direct package asset serving by path: /pkg/<encoded_base_dir>/<rel_path> or /pkg/<encoded_full_path> or direct drive path or asset filename
        var raw_sub = url_path;
        if (std.mem.startsWith(u8, raw_sub, "/pkg/")) {
            raw_sub = raw_sub[5..];
        } else if (std.mem.startsWith(u8, raw_sub, "/")) {
            raw_sub = raw_sub[1..];
        }

        var file_path_buf: [4096]u8 = undefined;
        var fpi: usize = 0;
        var bi: usize = 0;
        while (bi < raw_sub.len and fpi < file_path_buf.len - 1) {
            if (raw_sub[bi] == '%' and bi + 2 < raw_sub.len) {
                const hex = raw_sub[bi + 1 .. bi + 3];
                const byte = std.fmt.parseInt(u8, hex, 16) catch {
                    file_path_buf[fpi] = raw_sub[bi];
                    fpi += 1;
                    bi += 1;
                    continue;
                };
                file_path_buf[fpi] = byte;
                fpi += 1;
                bi += 3;
            } else {
                file_path_buf[fpi] = raw_sub[bi];
                fpi += 1;
                bi += 1;
            }
        }
        file_path_buf[fpi] = 0;

        for (file_path_buf[0..fpi]) |*b| {
            if (b.* == '/') b.* = '\\';
        }

        const disk_target = file_path_buf[0..fpi];

        var fh_opt = openFileUtf8(disk_target, "rb") orelse fopen(file_path_buf[0..fpi :0].ptr, "rb");

        // If not found directly and we have an active package directory, search inside package assets
        if (fh_opt == null and g_last_pkg_len > 0) {
            const pkg_dir = g_last_pkg_buf[0..g_last_pkg_len];
            // Extract filename part
            const fname = if (std.mem.lastIndexOfScalar(u8, disk_target, '\\')) |idx| disk_target[idx + 1 ..] else disk_target;
            // 1. Try {pkg_dir}\assets\{fname}
            const cand1 = std.fmt.allocPrintSentinel(std.heap.page_allocator, "{s}\\assets\\{s}", .{ pkg_dir, fname }, 0) catch null;
            if (cand1) |c1| {
                defer std.heap.page_allocator.free(c1);
                fh_opt = openFileUtf8(c1, "rb") orelse fopen(c1.ptr, "rb");
            }
            // 2. Try {pkg_dir}\{fname}
            if (fh_opt == null) {
                const cand2 = std.fmt.allocPrintSentinel(std.heap.page_allocator, "{s}\\{s}", .{ pkg_dir, fname }, 0) catch null;
                if (cand2) |c2| {
                    defer std.heap.page_allocator.free(c2);
                    fh_opt = openFileUtf8(c2, "rb") orelse fopen(c2.ptr, "rb");
                }
            }
        }

        if (fh_opt) |fh| {
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
                if (std.mem.lastIndexOfScalar(u8, selected, '\\')) |sidx| {
                    setLastPackageDir(selected[0..sidx]);
                } else if (std.mem.lastIndexOfScalar(u8, selected, '/')) |sidx| {
                    setLastPackageDir(selected[0..sidx]);
                }
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

        setLastPackageDir(res.package_dir);

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

    pub fn handleReadFile(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        var path: []const u8 = "";
        if (std.json.parseFromSlice([]struct { path: []const u8 }, alloc, req, .{})) |parsed_arr| {
            if (parsed_arr.value.len > 0) path = parsed_arr.value[0].path;
        } else |_| {
            if (std.json.parseFromSlice(struct { path: []const u8 }, alloc, req, .{})) |parsed_obj| {
                path = parsed_obj.value.path;
            } else |_| {
                self.w.respond(seq, .err, "{\"error\":\"Invalid arguments\"}") catch {};
                return;
            }
        }

        if (path.len == 0) {
            self.w.respond(seq, .err, "{\"error\":\"Empty path\"}") catch {};
            return;
        }

        const path_z = alloc.dupeZ(u8, path) catch return;
        const content = readFileAlloc(alloc, path_z) orelse {
            self.w.respond(seq, .ok, "{\"success\":false,\"error\":\"File not found\"}") catch {};
            return;
        };

        const res_json = std.fmt.allocPrintSentinel(alloc, "{{\"success\":true,\"content\":{f}}}", .{std.json.fmt(content, .{})}, 0) catch return;
        self.w.respond(seq, .ok, res_json) catch {};
    }

    pub fn handleCopyAsset(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        const CopyParam = struct {
            source_path: []const u8,
            target_dir: []const u8,
        };

        var src_path: []const u8 = "";
        var tgt_dir: []const u8 = "";

        if (std.json.parseFromSlice([]CopyParam, alloc, req, .{})) |parsed_arr| {
            if (parsed_arr.value.len > 0) {
                src_path = parsed_arr.value[0].source_path;
                tgt_dir = parsed_arr.value[0].target_dir;
            }
        } else |_| {
            if (std.json.parseFromSlice(CopyParam, alloc, req, .{})) |parsed_obj| {
                src_path = parsed_obj.value.source_path;
                tgt_dir = parsed_obj.value.target_dir;
            } else |_| {
                self.w.respond(seq, .err, "{\"error\":\"Invalid arguments\"}") catch {};
                return;
            }
        }

        if (src_path.len == 0 or tgt_dir.len == 0) {
            self.w.respond(seq, .err, "{\"error\":\"Missing source_path or target_dir\"}") catch {};
            return;
        }

        // Read source file bytes
        const src_z = alloc.dupeZ(u8, src_path) catch return;
        const file_bytes = readFileAlloc(alloc, src_z) orelse {
            self.w.respond(seq, .ok, "{\"success\":false,\"error\":\"Failed to read source image\"}") catch {};
            return;
        };

        // Extract base filename from source path
        var base_name: []const u8 = src_path;
        if (std.mem.lastIndexOfAny(u8, src_path, "/\\")) |idx| {
            base_name = src_path[idx + 1 ..];
        }
        if (base_name.len == 0) base_name = "image.png";

        // Separate stem and extension
        var stem: []const u8 = base_name;
        var ext: []const u8 = "";
        if (std.mem.lastIndexOfScalar(u8, base_name, '.')) |dot_idx| {
            stem = base_name[0..dot_idx];
            ext = base_name[dot_idx..];
        }

        // Ensure target directory exists (Win32 CreateDirectoryA)
        const tgt_dir_z = alloc.dupeZ(u8, tgt_dir) catch return;
        _ = win32_base.CreateDirectoryA(tgt_dir_z.ptr, null);

        // Find non-conflicting unique filename in target_dir to keep existing intact
        var candidate_name = alloc.dupe(u8, base_name) catch return;
        var candidate_full = std.fmt.allocPrint(alloc, "{s}\\{s}", .{ tgt_dir, candidate_name }) catch return;
        var counter: u32 = 1;

        while (true) {
            const cand_z = alloc.dupeZ(u8, candidate_full) catch return;
            const existing = fopen(cand_z.ptr, "rb");
            if (existing) |eh| {
                _ = fclose(eh);
                // Exists, generate next name: name_1.png, name_2.png
                candidate_name = std.fmt.allocPrint(alloc, "{s}_{d}{s}", .{ stem, counter, ext }) catch return;
                candidate_full = std.fmt.allocPrint(alloc, "{s}\\{s}", .{ tgt_dir, candidate_name }) catch return;
                counter += 1;
            } else {
                // Available filename found
                break;
            }
        }

        // Write to target location
        const final_cand_z = alloc.dupeZ(u8, candidate_full) catch return;
        const out_file = fopen(final_cand_z.ptr, "wb");
        if (out_file) |of| {
            _ = fwrite(file_bytes.ptr, 1, file_bytes.len, of);
            _ = fclose(of);

            const rel_path = std.fmt.allocPrint(alloc, "assets/{s}", .{candidate_name}) catch candidate_name;

            const res_json = std.fmt.allocPrintSentinel(
                alloc,
                "{{\"success\":true,\"new_relative_path\":{f},\"new_filename\":{f},\"new_full_path\":{f}}}",
                .{ std.json.fmt(rel_path, .{}), std.json.fmt(candidate_name, .{}), std.json.fmt(candidate_full, .{}) },
                0
            ) catch return;
            self.w.respond(seq, .ok, res_json) catch {};
        } else {
            self.w.respond(seq, .ok, "{\"success\":false,\"error\":\"Failed to write copied image to assets directory\"}") catch {};
        }
    }

    pub fn handleGetInstalledBrowsers(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        _ = req;
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        const BrowserItem = struct {
            id: []const u8,
            name: []const u8,
            path: []const u8,
        };
        var browser_list = std.ArrayList(BrowserItem).empty;
        defer browser_list.deinit(alloc);

        const roots = [_]usize{ 0x80000002, 0x80000001 }; // HKLM, HKCU
        const subkey_w = std.unicode.utf8ToUtf16LeStringLiteral("SOFTWARE\\Clients\\StartMenuInternet");

        for (roots) |root_hkey| {
            var h_client: usize = 0;
            if (win32_shell.RegOpenKeyExW(root_hkey, subkey_w, 0, 0x20019, &h_client) == 0) {
                defer _ = win32_shell.RegCloseKey(h_client);

                var idx: u32 = 0;
                while (true) : (idx += 1) {
                    var key_name_w: [256]u16 = undefined;
                    var key_name_len: u32 = key_name_w.len;
                    if (win32_shell.RegEnumKeyExW(h_client, idx, &key_name_w, &key_name_len, null, null, null, null) != 0) break;
                    key_name_w[key_name_len] = 0;

                    var key_name_u8: [512]u8 = undefined;
                    const u8_klen = std.unicode.utf16LeToUtf8(&key_name_u8, key_name_w[0..key_name_len]) catch continue;
                    const b_id = alloc.dupe(u8, key_name_u8[0..u8_klen]) catch continue;

                    // Open browser key
                    var h_bkey: usize = 0;
                    if (win32_shell.RegOpenKeyExW(h_client, @ptrCast(&key_name_w), 0, 0x20019, &h_bkey) == 0) {
                        defer _ = win32_shell.RegCloseKey(h_bkey);

                        // Read display name (Default)
                        var val_data: [512]u8 = undefined;
                        var val_size: u32 = val_data.len;
                        var val_type: u32 = 0;
                        var b_name: []const u8 = b_id;

                        if (win32_shell.RegQueryValueExW(h_bkey, null, null, &val_type, &val_data, &val_size) == 0 and val_size > 0) {
                            const w_slice = @as([*]const u16, @ptrCast(@alignCast(&val_data)))[0 .. (val_size / 2)];
                            const clean_w = std.mem.sliceTo(w_slice, 0);
                            var name_u8: [512]u8 = undefined;
                            if (std.unicode.utf16LeToUtf8(&name_u8, clean_w)) |n_len| {
                                if (n_len > 0) b_name = alloc.dupe(u8, name_u8[0..n_len]) catch b_id;
                            } else |_| {}
                        }

                        // Read command path: shell\open\command
                        const cmd_subkey_w = std.unicode.utf8ToUtf16LeStringLiteral("shell\\open\\command");
                        var h_cmdkey: usize = 0;
                        var b_path: []const u8 = "";

                        if (win32_shell.RegOpenKeyExW(h_bkey, cmd_subkey_w, 0, 0x20019, &h_cmdkey) == 0) {
                            defer _ = win32_shell.RegCloseKey(h_cmdkey);
                            var cmd_data: [1024]u8 = undefined;
                            var cmd_size: u32 = cmd_data.len;
                            if (win32_shell.RegQueryValueExW(h_cmdkey, null, null, null, &cmd_data, &cmd_size) == 0 and cmd_size > 0) {
                                const w_cmd = @as([*]const u16, @ptrCast(@alignCast(&cmd_data)))[0 .. (cmd_size / 2)];
                                const clean_cmd = std.mem.sliceTo(w_cmd, 0);
                                var cmd_u8: [1024]u8 = undefined;
                                if (std.unicode.utf16LeToUtf8(&cmd_u8, clean_cmd)) |c_len| {
                                    var raw_cmd = cmd_u8[0..c_len];
                                    if (std.mem.startsWith(u8, raw_cmd, "\"")) {
                                        if (std.mem.indexOf(u8, raw_cmd[1..], "\"")) |q_end| {
                                            raw_cmd = raw_cmd[1 .. 1 + q_end];
                                        }
                                    }
                                    b_path = alloc.dupe(u8, raw_cmd) catch "";
                                } else |_| {}
                            }
                        }

                        // Avoid duplicates if both HKLM and HKCU have it
                        var exists = false;
                        for (browser_list.items) |existing| {
                            if (std.mem.eql(u8, existing.name, b_name) or std.mem.eql(u8, existing.path, b_path)) {
                                exists = true;
                                break;
                            }
                        }

                        // Skip obsolete IE if other modern browsers exist
                        if (!exists and b_path.len > 0 and !std.mem.eql(u8, b_id, "IEXPLORE.EXE")) {
                            browser_list.append(alloc, .{
                                .id = b_id,
                                .name = b_name,
                                .path = b_path,
                            }) catch {};
                        }
                    }
                }
            }
        }

        // Check if OneView is installed on the user's system
        {
            var oneview_path: ?[]const u8 = null;

            // 1. Try reading command from registry HKCU\Software\Classes\OneView.Assoc\shell\open\command
            const ov_reg_key_w = std.unicode.utf8ToUtf16LeStringLiteral("Software\\Classes\\OneView.Assoc\\shell\\open\\command");
            var h_ov_key: usize = 0;
            if (win32_shell.RegOpenKeyExW(0x80000001, ov_reg_key_w, 0, 0x20019, &h_ov_key) == 0) {
                defer _ = win32_shell.RegCloseKey(h_ov_key);
                var cmd_data: [1024]u8 = undefined;
                var cmd_size: u32 = cmd_data.len;
                if (win32_shell.RegQueryValueExW(h_ov_key, null, null, null, &cmd_data, &cmd_size) == 0 and cmd_size > 0) {
                    const w_cmd = @as([*]const u16, @ptrCast(@alignCast(&cmd_data)))[0 .. (cmd_size / 2)];
                    const clean_cmd = std.mem.sliceTo(w_cmd, 0);
                    var cmd_u8: [1024]u8 = undefined;
                    if (std.unicode.utf16LeToUtf8(&cmd_u8, clean_cmd)) |c_len| {
                        var raw_cmd = cmd_u8[0..c_len];
                        if (std.mem.startsWith(u8, raw_cmd, "\"")) {
                            if (std.mem.indexOf(u8, raw_cmd[1..], "\"")) |q_end| {
                                raw_cmd = raw_cmd[1 .. 1 + q_end];
                            }
                        } else if (std.mem.indexOf(u8, raw_cmd, ".exe")) |exe_idx| {
                            raw_cmd = raw_cmd[0 .. exe_idx + 4];
                        }
                        if (openFileUtf8(raw_cmd, "rb")) |f| {
                            _ = fclose(f);
                            oneview_path = alloc.dupe(u8, raw_cmd) catch null;
                        }
                    } else |_| {}
                }
            }

            // 2. Fallback: Check %LOCALAPPDATA%\OneView\oneview.exe
            if (oneview_path == null) {
                var localapp_w: [1024]u16 = undefined;
                const env_name_w = std.unicode.utf8ToUtf16LeStringLiteral("LOCALAPPDATA");
                const len = win32_base.GetEnvironmentVariableW(env_name_w, &localapp_w, localapp_w.len);
                if (len > 0 and len < localapp_w.len) {
                    var localapp_u8: [1024]u8 = undefined;
                    if (std.unicode.utf16LeToUtf8(&localapp_u8, localapp_w[0..len])) |la_len| {
                        const candidate = std.fmt.allocPrint(alloc, "{s}\\OneView\\oneview.exe", .{localapp_u8[0..la_len]}) catch null;
                        if (candidate) |cand| {
                            if (openFileUtf8(cand, "rb")) |f| {
                                _ = fclose(f);
                                oneview_path = cand;
                            }
                        }
                    } else |_| {}
                }
            }

            // 3. Fallback: Check %APPDATA%\OneView\oneview.exe or %APPDATA%\oneview.exe
            if (oneview_path == null) {
                var appdata_w: [1024]u16 = undefined;
                const env_app_w = std.unicode.utf8ToUtf16LeStringLiteral("APPDATA");
                const len = win32_base.GetEnvironmentVariableW(env_app_w, &appdata_w, appdata_w.len);
                if (len > 0 and len < appdata_w.len) {
                    var appdata_u8: [1024]u8 = undefined;
                    if (std.unicode.utf16LeToUtf8(&appdata_u8, appdata_w[0..len])) |ad_len| {
                        const candidate1 = std.fmt.allocPrint(alloc, "{s}\\OneView\\oneview.exe", .{appdata_u8[0..ad_len]}) catch null;
                        if (candidate1) |cand1| {
                            if (openFileUtf8(cand1, "rb")) |f| {
                                _ = fclose(f);
                                oneview_path = cand1;
                            }
                        }
                        if (oneview_path == null) {
                            const candidate2 = std.fmt.allocPrint(alloc, "{s}\\oneview.exe", .{appdata_u8[0..ad_len]}) catch null;
                            if (candidate2) |cand2| {
                                if (openFileUtf8(cand2, "rb")) |f| {
                                _ = fclose(f);
                                oneview_path = cand2;
                            }
                        }
                    }
                    } else |_| {}
                }
            }

            // If found and not already in list, add to browser list
            if (oneview_path) |path| {
                var exists = false;
                for (browser_list.items) |b| {
                    if (std.ascii.indexOfIgnoreCase(b.name, "oneview") != null or std.ascii.indexOfIgnoreCase(b.path, "oneview.exe") != null) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    browser_list.append(alloc, .{
                        .id = "oneview",
                        .name = "OneView",
                        .path = path,
                    }) catch {};
                }
            }
        }

        const ResStruct = struct {
            success: bool,
            browsers: []const BrowserItem,
        };
        const resp_obj = ResStruct{
            .success = true,
            .browsers = browser_list.items,
        };
        const res_json = std.fmt.allocPrintSentinel(alloc, "{f}", .{std.json.fmt(resp_obj, .{})}, 0) catch return;
        self.w.respond(seq, .ok, res_json) catch {};
    }

    pub fn handleOpenInBrowser(self: *App, seq: [:0]const u8, req: [:0]const u8) void {
        var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer arena.deinit();
        const alloc = arena.allocator();

        const OpenParam = struct {
            url: ?[]const u8 = null,
            path: ?[]const u8 = null,
            browser_path: ?[]const u8 = null,
        };

        var target_url: []const u8 = "";
        var browser_exe: []const u8 = "";

        if (std.json.parseFromSlice([]OpenParam, alloc, req, .{})) |parsed_arr| {
            if (parsed_arr.value.len > 0) {
                target_url = parsed_arr.value[0].url orelse (parsed_arr.value[0].path orelse "");
                browser_exe = parsed_arr.value[0].browser_path orelse "";
            }
        } else |_| {
            if (std.json.parseFromSlice(OpenParam, alloc, req, .{})) |parsed_obj| {
                target_url = parsed_obj.value.url orelse (parsed_obj.value.path orelse "");
                browser_exe = parsed_obj.value.browser_path orelse "";
            } else |_| {
                self.w.respond(seq, .err, "{\"error\":\"Invalid arguments\"}") catch {};
                return;
            }
        }

        if (target_url.len == 0) {
            self.w.respond(seq, .err, "{\"error\":\"Empty target URL/path\"}") catch {};
            return;
        }

        var target_w: [2048]u16 = undefined;
        const t_len = win32_base.MultiByteToWideChar(65001, 0, target_url.ptr, @intCast(target_url.len), &target_w, @intCast(target_w.len - 1));
        if (t_len <= 0) {
            self.w.respond(seq, .ok, "{\"success\":false,\"error\":\"Unicode conversion failed\"}") catch {};
            return;
        }
        target_w[@intCast(t_len)] = 0;

        const open_op_w = std.unicode.utf8ToUtf16LeStringLiteral("open");

        if (browser_exe.len > 0) {
            // Enclose the target path in quotes if it's passed as a command-line argument to avoid splitting on spaces
            const quoted_url = if (std.mem.startsWith(u8, target_url, "\""))
                alloc.dupe(u8, target_url) catch target_url
            else
                std.fmt.allocPrint(alloc, "\"{s}\"", .{target_url}) catch target_url;

            var quoted_target_w: [2048]u16 = undefined;
            const qt_len = win32_base.MultiByteToWideChar(65001, 0, quoted_url.ptr, @intCast(quoted_url.len), &quoted_target_w, @intCast(quoted_target_w.len - 1));
            if (qt_len > 0) {
                quoted_target_w[@intCast(qt_len)] = 0;

                var browser_w: [2048]u16 = undefined;
                const b_len = win32_base.MultiByteToWideChar(65001, 0, browser_exe.ptr, @intCast(browser_exe.len), &browser_w, @intCast(browser_w.len - 1));
                if (b_len > 0) {
                    browser_w[@intCast(b_len)] = 0;
                    const ret = win32_shell.ShellExecuteW(null, open_op_w, @ptrCast(&browser_w), @ptrCast(&quoted_target_w), null, 1);
                    if (ret > 32) {
                        self.w.respond(seq, .ok, "{\"success\":true}") catch {};
                        return;
                    }
                }
            }
        }

        // Fallback to default browser handler
        const ret_def = win32_shell.ShellExecuteW(null, open_op_w, @ptrCast(&target_w), null, null, 1);
        if (ret_def > 32) {
            self.w.respond(seq, .ok, "{\"success\":true}") catch {};
        } else {
            self.w.respond(seq, .ok, "{\"success\":false,\"error\":\"Failed to open browser\"}") catch {};
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

    // Configure persistent WebView2 profile folder in %LOCALAPPDATA%\NoCodeMail\wv2_profile for instant cached startups
    var local_app_buf: [2048]u16 = undefined;
    const name_local_app = std.unicode.utf8ToUtf16LeStringLiteral("LOCALAPPDATA");
    const val_len = win32_base.GetEnvironmentVariableW(name_local_app, &local_app_buf, local_app_buf.len);
    if (val_len > 0 and val_len < 1900) {
        const sub_path = std.unicode.utf8ToUtf16LeStringLiteral("\\NoCodeMail\\wv2_profile");
        @memcpy(local_app_buf[val_len..val_len + sub_path.len], sub_path);
        local_app_buf[val_len + sub_path.len] = 0;

        const var_name = std.unicode.utf8ToUtf16LeStringLiteral("WEBVIEW2_USER_DATA_FOLDER");
        _ = win32_base.SetEnvironmentVariableW(var_name, @ptrCast(&local_app_buf));
    }

    // Start embedded high-speed WinSock server for self-contained UI serving
    const server_t = try std.Thread.spawn(.{}, serverThread, .{});
    server_t.detach();

    // Give server 1ms to bind socket
    Sleep(1);

    // Create native WebView2 window with instant launch
    const w = try Webview.create(true, null);
    defer _ = w.destroy() catch {};

    try w.setTitle("NoCodeMail - Email Design Studio");
    try w.setSize(1440, 900, .none);

    // Apply custom application icon on native Win32 window (titlebar & taskbar preview)
    const win32_icon = struct {
        extern "user32" fn LoadImageW(hInst: ?*anyopaque, name: usize, type_: u32, cx: c_int, cy: c_int, fuLoad: u32) callconv(.winapi) ?*anyopaque;
        extern "user32" fn SendMessageW(hWnd: *anyopaque, Msg: u32, wParam: usize, lParam: isize) callconv(.winapi) isize;
        extern "user32" fn GetSystemMetrics(nIndex: c_int) callconv(.winapi) c_int;
        extern "kernel32" fn GetModuleHandleW(lpModuleName: ?[*:0]const u16) callconv(.winapi) ?*anyopaque;
    };
    const hwnd_ptr = w.getWindow();
    if (hwnd_ptr) |h| {
        const h_inst = win32_icon.GetModuleHandleW(null);
        const sm_cx_icon = win32_icon.GetSystemMetrics(11); // SM_CXICON (DPI-scaled big icon)
        const sm_cy_icon = win32_icon.GetSystemMetrics(12); // SM_CYICON
        const sm_cx_smicon = win32_icon.GetSystemMetrics(49); // SM_CXSMICON (DPI-scaled small icon)
        const sm_cy_smicon = win32_icon.GetSystemMetrics(50); // SM_CYSMICON

        const h_icon_big = win32_icon.LoadImageW(h_inst, 1, 1, sm_cx_icon, sm_cy_icon, 0x0000);
        const h_icon_small = win32_icon.LoadImageW(h_inst, 1, 1, sm_cx_smicon, sm_cy_smicon, 0x0000);
        if (h_icon_big) |ico| {
            _ = win32_icon.SendMessageW(h, 0x0080, 1, @intCast(@intFromPtr(ico))); // WM_SETICON, ICON_BIG
        }
        if (h_icon_small) |ico| {
            _ = win32_icon.SendMessageW(h, 0x0080, 0, @intCast(@intFromPtr(ico))); // WM_SETICON, ICON_SMALL
        }
    }

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
    try w.bind(App, "readFile", App.handleReadFile, &app);
    try w.bind(App, "copyAsset", App.handleCopyAsset, &app);
    try w.bind(App, "getInstalledBrowsers", App.handleGetInstalledBrowsers, &app);
    try w.bind(App, "openInBrowser", App.handleOpenInBrowser, &app);

    // Navigate to embedded local HTTP server port 28941
    try w.navigate("http://localhost:28941/");

    try w.run();
}


