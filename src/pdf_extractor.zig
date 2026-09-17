const std = @import("std");

// Win32 API
extern "kernel32" fn CreateDirectoryA(lpPathName: [*:0]const u8, lpSecurityAttributes: ?*anyopaque) callconv(.winapi) c_int;
extern "kernel32" fn WideCharToMultiByte(CodePage: u32, dwFlags: u32, lpWideCharStr: [*]const u16, cchWideChar: c_int, lpMultiByteStr: ?[*]u8, cbMultiByte: c_int, lpDefaultChar: ?[*:0]const u8, lpUsedDefaultChar: ?*c_int) callconv(.winapi) c_int;

// C stdlib for file operations & process execution
extern "c" fn fopen(path: [*:0]const u8, mode: [*:0]const u8) callconv(.c) ?*anyopaque;
extern "c" fn _wfopen(path: [*:0]const u16, mode: [*:0]const u16) callconv(.c) ?*anyopaque;
extern "c" fn fseek(stream: *anyopaque, offset: c_long, origin: c_int) callconv(.c) c_int;
extern "c" fn ftell(stream: *anyopaque) callconv(.c) c_long;
extern "c" fn fread(ptr: [*]u8, size: usize, count: usize, stream: *anyopaque) callconv(.c) usize;
extern "c" fn fwrite(ptr: [*]const u8, size: usize, count: usize, stream: *anyopaque) callconv(.c) usize;
extern "c" fn fclose(stream: *anyopaque) callconv(.c) c_int;
extern "c" fn fflush(stream: *anyopaque) callconv(.c) c_int;
extern "c" fn system(command: [*:0]const u8) callconv(.c) c_int;

// STB Image Write C API
extern "c" fn stbi_write_png(filename: [*:0]const u8, w: c_int, h: c_int, comp: c_int, data: *const anyopaque, stride_in_bytes: c_int) callconv(.c) c_int;
extern "c" fn stbi_write_jpg(filename: [*:0]const u8, x: c_int, y: c_int, comp: c_int, data: *const anyopaque, quality: c_int) callconv(.c) c_int;
extern "c" var stbi_write_png_compression_level: c_int;

// PDFium Types
pub const FPDF_DOCUMENT = ?*anyopaque;
pub const FPDF_PAGE = ?*anyopaque;
pub const FPDF_BITMAP = ?*anyopaque;
pub const FPDF_TEXTPAGE = ?*anyopaque;
pub const FPDF_PAGEOBJECT = ?*anyopaque;

// Win32 Dynamic Library Loading API
const win32_dyn = struct {
    extern "kernel32" fn LoadLibraryA(lpLibFileName: [*:0]const u8) callconv(.winapi) ?*anyopaque;
    extern "kernel32" fn GetProcAddress(hModule: ?*anyopaque, lpProcName: [*:0]const u8) callconv(.winapi) ?*const anyopaque;
};

// PDFium Function Pointer Types
const PFN_FPDF_InitLibrary = *const fn () callconv(.c) void;
const PFN_FPDF_DestroyLibrary = *const fn () callconv(.c) void;
const PFN_FPDF_LoadDocument = *const fn (file_path: [*:0]const u8, password: ?[*:0]const u8) callconv(.c) FPDF_DOCUMENT;
const PFN_FPDF_LoadMemDocument = *const fn (data_buf: *const anyopaque, size: c_int, password: ?[*:0]const u8) callconv(.c) FPDF_DOCUMENT;
const PFN_FPDF_CloseDocument = *const fn (document: FPDF_DOCUMENT) callconv(.c) void;
const PFN_FPDF_GetLastError = *const fn () callconv(.c) c_ulong;
const PFN_FPDF_GetPageCount = *const fn (document: FPDF_DOCUMENT) callconv(.c) c_int;
const PFN_FPDF_LoadPage = *const fn (document: FPDF_DOCUMENT, page_index: c_int) callconv(.c) FPDF_PAGE;
const PFN_FPDF_ClosePage = *const fn (page: FPDF_PAGE) callconv(.c) void;
const PFN_FPDF_GetPageWidth = *const fn (page: FPDF_PAGE) callconv(.c) f64;
const PFN_FPDF_GetPageHeight = *const fn (page: FPDF_PAGE) callconv(.c) f64;

const PFN_FPDFBitmap_Create = *const fn (width: c_int, height: c_int, alpha: c_int) callconv(.c) FPDF_BITMAP;
const PFN_FPDFBitmap_FillRect = *const fn (bitmap: FPDF_BITMAP, left: c_int, top: c_int, width: c_int, height: c_int, color: u32) callconv(.c) void;
const PFN_FPDFBitmap_GetBuffer = *const fn (bitmap: FPDF_BITMAP) callconv(.c) ?*anyopaque;
const PFN_FPDFBitmap_GetStride = *const fn (bitmap: FPDF_BITMAP) callconv(.c) c_int;
const PFN_FPDFBitmap_GetWidth = *const fn (bitmap: FPDF_BITMAP) callconv(.c) c_int;
const PFN_FPDFBitmap_GetHeight = *const fn (bitmap: FPDF_BITMAP) callconv(.c) c_int;
const PFN_FPDFBitmap_GetFormat = *const fn (bitmap: FPDF_BITMAP) callconv(.c) c_int;
const PFN_FPDFBitmap_Destroy = *const fn (bitmap: FPDF_BITMAP) callconv(.c) void;
const PFN_FPDF_RenderPageBitmap = *const fn (bitmap: FPDF_BITMAP, page: FPDF_PAGE, start_x: c_int, start_y: c_int, size_x: c_int, size_y: c_int, rotate: c_int, flags: c_int) callconv(.c) void;

const PFN_FPDFPage_CountObjects = *const fn (page: FPDF_PAGE) callconv(.c) c_int;
const PFN_FPDFPage_GetObject = *const fn (page: FPDF_PAGE, index: c_int) callconv(.c) FPDF_PAGEOBJECT;
const PFN_FPDFPageObj_GetType = *const fn (page_object: FPDF_PAGEOBJECT) callconv(.c) c_int;
const PFN_FPDFPageObj_GetBounds = *const fn (page_object: FPDF_PAGEOBJECT, left: *f32, bottom: *f32, right: *f32, top: *f32) callconv(.c) c_int;
const PFN_FPDFImageObj_GetBitmap = *const fn (image_object: FPDF_PAGEOBJECT) callconv(.c) FPDF_BITMAP;
const PFN_FPDFImageObj_GetRenderedBitmap = *const fn (document: FPDF_DOCUMENT, page: FPDF_PAGE, image_object: FPDF_PAGEOBJECT) callconv(.c) FPDF_BITMAP;

const PFN_FPDFText_LoadPage = *const fn (page: FPDF_PAGE) callconv(.c) FPDF_TEXTPAGE;
const PFN_FPDFText_ClosePage = *const fn (text_page: FPDF_TEXTPAGE) callconv(.c) void;
const PFN_FPDFText_CountChars = *const fn (text_page: FPDF_TEXTPAGE) callconv(.c) c_int;
const PFN_FPDFText_CountRects = *const fn (text_page: FPDF_TEXTPAGE, start_char: c_int, count: c_int) callconv(.c) c_int;
const PFN_FPDFText_GetRect = *const fn (text_page: FPDF_TEXTPAGE, rect_index: c_int, left: *f64, top: *f64, right: *f64, bottom: *f64) callconv(.c) c_int;
const PFN_FPDFText_GetBoundedText = *const fn (text_page: FPDF_TEXTPAGE, left: f64, top: f64, right: f64, bottom: f64, buffer: ?[*]u16, buflen: c_int) callconv(.c) c_int;
const PFN_FPDFText_GetFontSize = *const fn (text_page: FPDF_TEXTPAGE, char_index: c_int) callconv(.c) f64;
const PFN_FPDFText_GetFontWeight = *const fn (text_page: FPDF_TEXTPAGE, char_index: c_int) callconv(.c) c_int;
const PFN_FPDFText_GetFontInfo = *const fn (text_page: FPDF_TEXTPAGE, char_index: c_int, buffer: ?[*]u8, buflen: c_ulong, flags: ?*c_int) callconv(.c) c_ulong;
const PFN_FPDFText_GetFillColor = *const fn (text_page: FPDF_TEXTPAGE, char_index: c_int, R: *c_uint, G: *c_uint, B: *c_uint, A: *c_uint) callconv(.c) c_int;
const PFN_FPDFText_GetText = *const fn (text_page: FPDF_TEXTPAGE, start_index: c_int, count: c_int, result: [*]u16) callconv(.c) c_int;
const PFN_FPDFText_GetUnicode = *const fn (text_page: FPDF_TEXTPAGE, index: c_int) callconv(.c) c_uint;
const PFN_FPDFText_GetTextObject = *const fn (text_page: FPDF_TEXTPAGE, index: c_int) callconv(.c) FPDF_PAGEOBJECT;
const PFN_FPDFText_GetCharBox = *const fn (text_page: FPDF_TEXTPAGE, char_index: c_int, left: *f64, right: *f64, bottom: *f64, top: *f64) callconv(.c) c_int;
const PFN_FPDFText_GetCharIndexFromTextIndex = *const fn (text_page: FPDF_TEXTPAGE, text_index: c_int) callconv(.c) c_int;
const PFN_FPDFText_GetCharIndexAtPos = *const fn (text_page: FPDF_TEXTPAGE, x: f64, y: f64, xTolerance: f64, yTolerance: f64) callconv(.c) c_int;

const PFN_FPDF_PageToDevice = *const fn (page: FPDF_PAGE, start_x: c_int, start_y: c_int, size_x: c_int, size_y: c_int, rotate: c_int, page_x: f64, page_y: f64, device_x: *c_int, device_y: *c_int) callconv(.c) void;
const PFN_FPDF_DeviceToPage = *const fn (page: FPDF_PAGE, start_x: c_int, start_y: c_int, size_x: c_int, size_y: c_int, rotate: c_int, device_x: c_int, device_y: c_int, page_x: *f64, page_y: *f64) callconv(.c) void;

pub const FPDF_LINK = ?*anyopaque;
pub const FPDF_ACTION = ?*anyopaque;
pub const FS_RECTF = extern struct {
    left: f32,
    top: f32,
    right: f32,
    bottom: f32,
};

const PFN_FPDFLink_Enumerate = *const fn (page: FPDF_PAGE, start_pos: *c_int, link_annot: *FPDF_LINK) callconv(.c) c_int;
const PFN_FPDFLink_GetAnnotRect = *const fn (link_annot: FPDF_LINK, rect: *FS_RECTF) callconv(.c) c_int;
const PFN_FPDFLink_GetAction = *const fn (link: FPDF_LINK) callconv(.c) FPDF_ACTION;
const PFN_FPDFAction_GetType = *const fn (action: FPDF_ACTION) callconv(.c) c_ulong;
const PFN_FPDFAction_GetURIPath = *const fn (document: FPDF_DOCUMENT, action: FPDF_ACTION, buffer: ?[*]u8, buflen: c_ulong) callconv(.c) c_ulong;
const PFN_FPDFPageObj_GetFillColor = *const fn (page_object: FPDF_PAGEOBJECT, R: *c_uint, G: *c_uint, B: *c_uint, A: *c_uint) callconv(.c) c_int;

const PFN_FPDFFormObj_CountObjects = *const fn (form_object: FPDF_PAGEOBJECT) callconv(.c) c_int;
const PFN_FPDFFormObj_GetObject = *const fn (form_object: FPDF_PAGEOBJECT, index: c_ulong) callconv(.c) FPDF_PAGEOBJECT;

const PDFACTION_URI = 3;
const FPDF_PAGEOBJ_PATH = 2;
const FPDF_PAGEOBJ_IMAGE = 3;
const FPDF_PAGEOBJ_FORM = 5;
const FPDF_ANNOT = 0x01;
const FPDF_PRINTING = 0x800;

// Dynamic function pointers
var p_FPDF_InitLibrary: ?PFN_FPDF_InitLibrary = null;
var p_FPDF_DestroyLibrary: ?PFN_FPDF_DestroyLibrary = null;
var p_FPDF_LoadDocument: ?PFN_FPDF_LoadDocument = null;
var p_FPDF_LoadMemDocument: ?PFN_FPDF_LoadMemDocument = null;
var p_FPDF_CloseDocument: ?PFN_FPDF_CloseDocument = null;
var p_FPDF_GetLastError: ?PFN_FPDF_GetLastError = null;
var p_FPDF_GetPageCount: ?PFN_FPDF_GetPageCount = null;
var p_FPDF_LoadPage: ?PFN_FPDF_LoadPage = null;
var p_FPDF_ClosePage: ?PFN_FPDF_ClosePage = null;
var p_FPDF_GetPageWidth: ?PFN_FPDF_GetPageWidth = null;
var p_FPDF_GetPageHeight: ?PFN_FPDF_GetPageHeight = null;

var p_FPDFBitmap_Create: ?PFN_FPDFBitmap_Create = null;
var p_FPDFBitmap_FillRect: ?PFN_FPDFBitmap_FillRect = null;
var p_FPDFBitmap_GetBuffer: ?PFN_FPDFBitmap_GetBuffer = null;
var p_FPDFBitmap_GetStride: ?PFN_FPDFBitmap_GetStride = null;
var p_FPDFBitmap_GetWidth: ?PFN_FPDFBitmap_GetWidth = null;
var p_FPDFBitmap_GetHeight: ?PFN_FPDFBitmap_GetHeight = null;
var p_FPDFBitmap_GetFormat: ?PFN_FPDFBitmap_GetFormat = null;
var p_FPDFBitmap_Destroy: ?PFN_FPDFBitmap_Destroy = null;
var p_FPDF_RenderPageBitmap: ?PFN_FPDF_RenderPageBitmap = null;

var p_FPDFPage_CountObjects: ?PFN_FPDFPage_CountObjects = null;
var p_FPDFPage_GetObject: ?PFN_FPDFPage_GetObject = null;
var p_FPDFPageObj_GetType: ?PFN_FPDFPageObj_GetType = null;
var p_FPDFPageObj_GetBounds: ?PFN_FPDFPageObj_GetBounds = null;
var p_FPDFImageObj_GetBitmap: ?PFN_FPDFImageObj_GetBitmap = null;
var p_FPDFImageObj_GetRenderedBitmap: ?PFN_FPDFImageObj_GetRenderedBitmap = null;

var p_FPDFText_LoadPage: ?PFN_FPDFText_LoadPage = null;
var p_FPDFText_ClosePage: ?PFN_FPDFText_ClosePage = null;
var p_FPDFText_CountChars: ?PFN_FPDFText_CountChars = null;
var p_FPDFText_CountRects: ?PFN_FPDFText_CountRects = null;
var p_FPDFText_GetRect: ?PFN_FPDFText_GetRect = null;
var p_FPDFText_GetBoundedText: ?PFN_FPDFText_GetBoundedText = null;
var p_FPDFText_GetFontSize: ?PFN_FPDFText_GetFontSize = null;
var p_FPDFText_GetFontWeight: ?PFN_FPDFText_GetFontWeight = null;
var p_FPDFText_GetFontInfo: ?PFN_FPDFText_GetFontInfo = null;
var p_FPDFText_GetFillColor: ?PFN_FPDFText_GetFillColor = null;
var p_FPDFText_GetText: ?PFN_FPDFText_GetText = null;
var p_FPDFText_GetUnicode: ?PFN_FPDFText_GetUnicode = null;
var p_FPDFText_GetTextObject: ?PFN_FPDFText_GetTextObject = null;
var p_FPDFText_GetCharBox: ?PFN_FPDFText_GetCharBox = null;
var p_FPDFText_GetCharIndexFromTextIndex: ?PFN_FPDFText_GetCharIndexFromTextIndex = null;
var p_FPDFText_GetCharIndexAtPos: ?PFN_FPDFText_GetCharIndexAtPos = null;

var p_FPDF_PageToDevice: ?PFN_FPDF_PageToDevice = null;
var p_FPDF_DeviceToPage: ?PFN_FPDF_DeviceToPage = null;

var p_FPDFLink_Enumerate: ?PFN_FPDFLink_Enumerate = null;
var p_FPDFLink_GetAnnotRect: ?PFN_FPDFLink_GetAnnotRect = null;
var p_FPDFLink_GetAction: ?PFN_FPDFLink_GetAction = null;
var p_FPDFAction_GetType: ?PFN_FPDFAction_GetType = null;
var p_FPDFAction_GetURIPath: ?PFN_FPDFAction_GetURIPath = null;
var p_FPDFPageObj_GetFillColor: ?PFN_FPDFPageObj_GetFillColor = null;

var p_FPDFFormObj_CountObjects: ?PFN_FPDFFormObj_CountObjects = null;
var p_FPDFFormObj_GetObject: ?PFN_FPDFFormObj_GetObject = null;

// Wrapper helpers
pub fn FPDF_InitLibrary() void { if (p_FPDF_InitLibrary) |f| f(); }
pub fn FPDF_DestroyLibrary() void { if (p_FPDF_DestroyLibrary) |f| f(); }
pub fn FPDF_LoadDocument(file_path: [*:0]const u8, password: ?[*:0]const u8) FPDF_DOCUMENT { return if (p_FPDF_LoadDocument) |f| f(file_path, password) else null; }
pub fn FPDF_LoadMemDocument(data_buf: *const anyopaque, size: c_int, password: ?[*:0]const u8) FPDF_DOCUMENT { return if (p_FPDF_LoadMemDocument) |f| f(data_buf, size, password) else null; }
pub fn FPDF_CloseDocument(document: FPDF_DOCUMENT) void { if (p_FPDF_CloseDocument) |f| f(document); }
pub fn FPDF_GetLastError() c_ulong { return if (p_FPDF_GetLastError) |f| f() else 0; }
pub fn FPDF_GetPageCount(document: FPDF_DOCUMENT) c_int { return if (p_FPDF_GetPageCount) |f| f(document) else 0; }
pub fn FPDF_LoadPage(document: FPDF_DOCUMENT, page_index: c_int) FPDF_PAGE { return if (p_FPDF_LoadPage) |f| f(document, page_index) else null; }
pub fn FPDF_ClosePage(page: FPDF_PAGE) void { if (p_FPDF_ClosePage) |f| f(page); }
pub fn FPDF_GetPageWidth(page: FPDF_PAGE) f64 { return if (p_FPDF_GetPageWidth) |f| f(page) else 0; }
pub fn FPDF_GetPageHeight(page: FPDF_PAGE) f64 { return if (p_FPDF_GetPageHeight) |f| f(page) else 0; }

pub fn FPDFBitmap_Create(width: c_int, height: c_int, alpha: c_int) FPDF_BITMAP { return if (p_FPDFBitmap_Create) |f| f(width, height, alpha) else null; }
pub fn FPDFBitmap_FillRect(bitmap: FPDF_BITMAP, left: c_int, top: c_int, width: c_int, height: c_int, color: u32) void { if (p_FPDFBitmap_FillRect) |f| f(bitmap, left, top, width, height, color); }
pub fn FPDFBitmap_GetBuffer(bitmap: FPDF_BITMAP) ?*anyopaque { return if (p_FPDFBitmap_GetBuffer) |f| f(bitmap) else null; }
pub fn FPDFBitmap_GetStride(bitmap: FPDF_BITMAP) c_int { return if (p_FPDFBitmap_GetStride) |f| f(bitmap) else 0; }
pub fn FPDFBitmap_GetWidth(bitmap: FPDF_BITMAP) c_int { return if (p_FPDFBitmap_GetWidth) |f| f(bitmap) else 0; }
pub fn FPDFBitmap_GetHeight(bitmap: FPDF_BITMAP) c_int { return if (p_FPDFBitmap_GetHeight) |f| f(bitmap) else 0; }
pub fn FPDFBitmap_GetFormat(bitmap: FPDF_BITMAP) c_int { return if (p_FPDFBitmap_GetFormat) |f| f(bitmap) else 0; }
pub fn FPDFBitmap_Destroy(bitmap: FPDF_BITMAP) void { if (p_FPDFBitmap_Destroy) |f| f(bitmap); }
pub fn FPDF_RenderPageBitmap(bitmap: FPDF_BITMAP, page: FPDF_PAGE, start_x: c_int, start_y: c_int, size_x: c_int, size_y: c_int, rotate: c_int, flags: c_int) void { if (p_FPDF_RenderPageBitmap) |f| f(bitmap, page, start_x, start_y, size_x, size_y, rotate, flags); }

pub fn FPDFPage_CountObjects(page: FPDF_PAGE) c_int { return if (p_FPDFPage_CountObjects) |f| f(page) else 0; }
pub fn FPDFPage_GetObject(page: FPDF_PAGE, index: c_int) FPDF_PAGEOBJECT { return if (p_FPDFPage_GetObject) |f| f(page, index) else null; }
pub fn FPDFPageObj_GetType(page_object: FPDF_PAGEOBJECT) c_int { return if (p_FPDFPageObj_GetType) |f| f(page_object) else 0; }
pub fn FPDFPageObj_GetBounds(page_object: FPDF_PAGEOBJECT, left: *f32, bottom: *f32, right: *f32, top: *f32) c_int { return if (p_FPDFPageObj_GetBounds) |f| f(page_object, left, bottom, right, top) else 0; }
pub fn FPDFImageObj_GetBitmap(image_object: FPDF_PAGEOBJECT) FPDF_BITMAP { return if (p_FPDFImageObj_GetBitmap) |f| f(image_object) else null; }
pub fn FPDFImageObj_GetRenderedBitmap(document: FPDF_DOCUMENT, page: FPDF_PAGE, image_object: FPDF_PAGEOBJECT) FPDF_BITMAP { return if (p_FPDFImageObj_GetRenderedBitmap) |f| f(document, page, image_object) else null; }

pub fn FPDFFormObj_CountObjects(form_object: FPDF_PAGEOBJECT) c_int { return if (p_FPDFFormObj_CountObjects) |f| f(form_object) else -1; }
pub fn FPDFFormObj_GetObject(form_object: FPDF_PAGEOBJECT, index: c_ulong) FPDF_PAGEOBJECT { return if (p_FPDFFormObj_GetObject) |f| f(form_object, index) else null; }

pub fn FPDFText_LoadPage(page: FPDF_PAGE) FPDF_TEXTPAGE { return if (p_FPDFText_LoadPage) |f| f(page) else null; }
pub fn FPDFText_ClosePage(text_page: FPDF_TEXTPAGE) void { if (p_FPDFText_ClosePage) |f| f(text_page); }
pub fn FPDFText_CountChars(text_page: FPDF_TEXTPAGE) c_int { return if (p_FPDFText_CountChars) |f| f(text_page) else 0; }
pub fn FPDFText_CountRects(text_page: FPDF_TEXTPAGE, start_char: c_int, count: c_int) c_int { return if (p_FPDFText_CountRects) |f| f(text_page, start_char, count) else 0; }
pub fn FPDFText_GetRect(text_page: FPDF_TEXTPAGE, rect_index: c_int, left: *f64, top: *f64, right: *f64, bottom: *f64) c_int { return if (p_FPDFText_GetRect) |f| f(text_page, rect_index, left, top, right, bottom) else 0; }
pub fn FPDFText_GetBoundedText(text_page: FPDF_TEXTPAGE, left: f64, top: f64, right: f64, bottom: f64, buffer: ?[*]u16, buflen: c_int) c_int { return if (p_FPDFText_GetBoundedText) |f| f(text_page, left, top, right, bottom, buffer, buflen) else 0; }
pub fn FPDFText_GetFontSize(text_page: FPDF_TEXTPAGE, char_index: c_int) f64 { return if (p_FPDFText_GetFontSize) |f| f(text_page, char_index) else 0; }
pub fn FPDFText_GetFontWeight(text_page: FPDF_TEXTPAGE, char_index: c_int) c_int { return if (p_FPDFText_GetFontWeight) |f| f(text_page, char_index) else 0; }
pub fn FPDFText_GetFontInfo(text_page: FPDF_TEXTPAGE, char_index: c_int, buffer: ?[*]u8, buflen: c_ulong, flags: ?*c_int) c_ulong { return if (p_FPDFText_GetFontInfo) |f| f(text_page, char_index, buffer, buflen, flags) else 0; }
pub fn FPDFText_GetFillColor(text_page: FPDF_TEXTPAGE, char_index: c_int, R: *c_uint, G: *c_uint, B: *c_uint, A: *c_uint) c_int { return if (p_FPDFText_GetFillColor) |f| f(text_page, char_index, R, G, B, A) else 0; }
pub fn FPDFText_GetText(text_page: FPDF_TEXTPAGE, start_index: c_int, count: c_int, result: [*]u16) c_int { return if (p_FPDFText_GetText) |f| f(text_page, start_index, count, result) else 0; }
pub fn FPDFText_GetUnicode(text_page: FPDF_TEXTPAGE, index: c_int) c_uint { return if (p_FPDFText_GetUnicode) |f| f(text_page, index) else 0; }
pub fn FPDFText_GetTextObject(text_page: FPDF_TEXTPAGE, index: c_int) FPDF_PAGEOBJECT { return if (p_FPDFText_GetTextObject) |f| f(text_page, index) else null; }
pub fn FPDFText_GetCharBox(text_page: FPDF_TEXTPAGE, char_index: c_int, left: *f64, right: *f64, bottom: *f64, top: *f64) c_int { return if (p_FPDFText_GetCharBox) |f| f(text_page, char_index, left, right, bottom, top) else 0; }
pub fn FPDFText_GetCharIndexFromTextIndex(text_page: FPDF_TEXTPAGE, text_index: c_int) c_int { return if (p_FPDFText_GetCharIndexFromTextIndex) |f| f(text_page, text_index) else 0; }
pub fn FPDFText_GetCharIndexAtPos(text_page: FPDF_TEXTPAGE, x: f64, y: f64, xTolerance: f64, yTolerance: f64) c_int { return if (p_FPDFText_GetCharIndexAtPos) |f| f(text_page, x, y, xTolerance, yTolerance) else -1; }

pub fn FPDF_PageToDevice(page: FPDF_PAGE, start_x: c_int, start_y: c_int, size_x: c_int, size_y: c_int, rotate: c_int, page_x: f64, page_y: f64, device_x: *c_int, device_y: *c_int) void { if (p_FPDF_PageToDevice) |f| f(page, start_x, start_y, size_x, size_y, rotate, page_x, page_y, device_x, device_y); }
pub fn FPDF_DeviceToPage(page: FPDF_PAGE, start_x: c_int, start_y: c_int, size_x: c_int, size_y: c_int, rotate: c_int, device_x: c_int, device_y: c_int, page_x: *f64, page_y: *f64) void { if (p_FPDF_DeviceToPage) |f| f(page, start_x, start_y, size_x, size_y, rotate, device_x, device_y, page_x, page_y); }

pub fn FPDFLink_Enumerate(page: FPDF_PAGE, start_pos: *c_int, link_annot: *FPDF_LINK) c_int { return if (p_FPDFLink_Enumerate) |f| f(page, start_pos, link_annot) else 0; }
pub fn FPDFLink_GetAnnotRect(link_annot: FPDF_LINK, rect: *FS_RECTF) c_int { return if (p_FPDFLink_GetAnnotRect) |f| f(link_annot, rect) else 0; }
pub fn FPDFLink_GetAction(link: FPDF_LINK) FPDF_ACTION { return if (p_FPDFLink_GetAction) |f| f(link) else null; }
pub fn FPDFAction_GetType(action: FPDF_ACTION) c_ulong { return if (p_FPDFAction_GetType) |f| f(action) else 0; }
pub fn FPDFAction_GetURIPath(document: FPDF_DOCUMENT, action: FPDF_ACTION, buffer: ?[*]u8, buflen: c_ulong) c_ulong { return if (p_FPDFAction_GetURIPath) |f| f(document, action, buffer, buflen) else 0; }
pub fn FPDFPageObj_GetFillColor(page_object: FPDF_PAGEOBJECT, R: *c_uint, G: *c_uint, B: *c_uint, A: *c_uint) c_int { return if (p_FPDFPageObj_GetFillColor) |f| f(page_object, R, G, B, A) else 0; }

const Buffer = struct {
    allocator: std.mem.Allocator,
    data: std.ArrayList(u8) = .empty,

    pub fn init(allocator: std.mem.Allocator) Buffer {
        return .{
            .allocator = allocator,
            .data = .empty,
        };
    }

    pub fn deinit(self: *Buffer) void {
        self.data.deinit(self.allocator);
    }

    pub fn print(self: *Buffer, comptime fmt: []const u8, args: anytype) !void {
        const formatted = try std.fmt.allocPrint(self.allocator, fmt, args);
        defer self.allocator.free(formatted);
        try self.data.appendSlice(self.allocator, formatted);
    }

    pub fn toSlice(self: *const Buffer) []const u8 {
        return self.data.items;
    }
};

pub fn logMsg(comptime fmt: []const u8, args: anytype) void {
    const f = fopen("C:\\Users\\SumanBiswas\\Downloads\\NoCodeMail\\nocodemail_debug.log", "a") orelse
        fopen("nocodemail_debug.log", "a") orelse return;
    defer {
        _ = fflush(f);
        _ = fclose(f);
    }
    var buf: [2048]u8 = undefined;
    const msg = std.fmt.bufPrint(&buf, fmt ++ "\n", args) catch return;
    _ = fwrite(msg.ptr, 1, msg.len, f);
}

var g_pdf_initialized = false;
var g_pdfium_dll: ?*anyopaque = null;

pub fn initPdfEngine() void {
    if (!g_pdf_initialized) {
        logMsg("Dynamically loading pdfium.dll via LoadLibraryA...", .{});
        g_pdfium_dll = win32_dyn.LoadLibraryA("pdfium.dll");
        if (g_pdfium_dll == null) {
            logMsg("Failed to LoadLibraryA pdfium.dll", .{});
            return;
        }

        const h = g_pdfium_dll;
        p_FPDF_InitLibrary = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_InitLibrary"));
        p_FPDF_DestroyLibrary = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_DestroyLibrary"));
        p_FPDF_LoadDocument = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_LoadDocument"));
        p_FPDF_LoadMemDocument = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_LoadMemDocument"));
        p_FPDF_CloseDocument = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_CloseDocument"));
        p_FPDF_GetLastError = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_GetLastError"));
        p_FPDF_GetPageCount = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_GetPageCount"));
        p_FPDF_LoadPage = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_LoadPage"));
        p_FPDF_ClosePage = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_ClosePage"));
        p_FPDF_GetPageWidth = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_GetPageWidth"));
        p_FPDF_GetPageHeight = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_GetPageHeight"));

        p_FPDFBitmap_Create = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFBitmap_Create"));
        p_FPDFBitmap_FillRect = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFBitmap_FillRect"));
        p_FPDFBitmap_GetBuffer = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFBitmap_GetBuffer"));
        p_FPDFBitmap_GetStride = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFBitmap_GetStride"));
        p_FPDFBitmap_GetWidth = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFBitmap_GetWidth"));
        p_FPDFBitmap_GetHeight = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFBitmap_GetHeight"));
        p_FPDFBitmap_GetFormat = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFBitmap_GetFormat"));
        p_FPDFBitmap_Destroy = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFBitmap_Destroy"));
        p_FPDF_RenderPageBitmap = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_RenderPageBitmap"));

        p_FPDFPage_CountObjects = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFPage_CountObjects"));
        p_FPDFPage_GetObject = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFPage_GetObject"));
        p_FPDFPageObj_GetType = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFPageObj_GetType"));
        p_FPDFPageObj_GetBounds = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFPageObj_GetBounds"));
        p_FPDFImageObj_GetBitmap = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFImageObj_GetBitmap"));
        p_FPDFImageObj_GetRenderedBitmap = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFImageObj_GetRenderedBitmap"));

        p_FPDFText_LoadPage = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_LoadPage"));
        p_FPDFText_ClosePage = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_ClosePage"));
        p_FPDFText_CountChars = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_CountChars"));
        p_FPDFText_CountRects = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_CountRects"));
        p_FPDFText_GetRect = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetRect"));
        p_FPDFText_GetBoundedText = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetBoundedText"));
        p_FPDFText_GetFontSize = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetFontSize"));
        p_FPDFText_GetFontWeight = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetFontWeight"));
        p_FPDFText_GetFontInfo = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetFontInfo"));
        p_FPDFText_GetFillColor = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetFillColor"));
        p_FPDFText_GetText = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetText"));
        p_FPDFText_GetUnicode = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetUnicode"));
        p_FPDFText_GetTextObject = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetTextObject"));
        p_FPDFText_GetCharBox = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetCharBox"));
        p_FPDFText_GetCharIndexFromTextIndex = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetCharIndexFromTextIndex"));
        p_FPDFText_GetCharIndexAtPos = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFText_GetCharIndexAtPos"));

        p_FPDF_PageToDevice = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_PageToDevice"));
        p_FPDF_DeviceToPage = @ptrCast(win32_dyn.GetProcAddress(h, "FPDF_DeviceToPage"));

        p_FPDFLink_Enumerate = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFLink_Enumerate"));
        p_FPDFLink_GetAnnotRect = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFLink_GetAnnotRect"));
        p_FPDFLink_GetAction = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFLink_GetAction"));
        p_FPDFAction_GetType = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFAction_GetType"));
        p_FPDFAction_GetURIPath = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFAction_GetURIPath"));
        p_FPDFPageObj_GetFillColor = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFPageObj_GetFillColor"));

        p_FPDFFormObj_CountObjects = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFFormObj_CountObjects"));
        p_FPDFFormObj_GetObject = @ptrCast(win32_dyn.GetProcAddress(h, "FPDFFormObj_GetObject"));

        logMsg("Calling FPDF_InitLibrary()...", .{});
        FPDF_InitLibrary();
        stbi_write_png_compression_level = 0;
        g_pdf_initialized = true;
        logMsg("FPDF_InitLibrary() dynamic initialization successful!", .{});
    }
}

pub fn destroyPdfEngine() void {
    if (g_pdf_initialized) {
        FPDF_DestroyLibrary();
        g_pdf_initialized = false;
        logMsg("FPDF_DestroyLibrary() done from Zig.", .{});
    }
}

pub fn getPdfInfo(allocator: std.mem.Allocator, pdf_path: []const u8) !i32 {
    initPdfEngine();
    const normalized_path = try allocator.dupe(u8, pdf_path);
    defer allocator.free(normalized_path);
    for (normalized_path) |*b| {
        if (b.* == '/') b.* = '\\';
    }
    const pdf_path_z = try allocator.dupeZ(u8, normalized_path);
    defer allocator.free(pdf_path_z);

    const doc = FPDF_LoadDocument(pdf_path_z.ptr, null);
    if (doc == null) return error.FailedToOpenPdf;
    defer FPDF_CloseDocument(doc);
    return FPDF_GetPageCount(doc);
}

pub const PdfMarkedRegion = struct {
    id: []const u8 = "",
    page: i32 = 1,
    left: f64,
    top: f64,
    right: f64,
    bottom: f64,
};

pub const ExtractedPackage = struct {
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
    design_json_content: []const u8,
};

pub fn extractPdfPackage(
    allocator: std.mem.Allocator,
    pdf_path: []const u8,
    target_email_width_arg: i32,
    target_page_arg: ?i32,
    override_out_dir: ?[]const u8,
    marked_regions: ?[]const PdfMarkedRegion,
) !ExtractedPackage {
    return extractPdfPackageNative(allocator, pdf_path, target_email_width_arg, target_page_arg, override_out_dir, marked_regions);
}

fn isInsideAnyMarkedRegion(span_l: f64, span_t: f64, span_r: f64, span_b: f64, marked_list: []const PdfMarkedRegion, current_page: i32) bool {
    if (marked_list.len == 0) return false;
    for (marked_list) |mark| {
        if (mark.page != current_page) continue;
        const inter_l = @max(span_l, mark.left);
        const inter_t = @max(span_t, mark.top);
        const inter_r = @min(span_r, mark.right);
        const inter_b = @min(span_b, mark.bottom);
        if (inter_r > inter_l and inter_b > inter_t) {
            const span_w = span_r - span_l;
            const span_h = span_b - span_t;
            if (span_w <= 0.1 or span_h <= 0.1) continue;

            const span_area = span_w * span_h;
            const inter_area = (inter_r - inter_l) * (inter_b - inter_t);
            const overlap_ratio = inter_area / span_area;

            if (overlap_ratio >= 0.45) {
                return true;
            }
        }
    }
    return false;
}

pub fn extractPdfPackageNative(
    allocator: std.mem.Allocator,
    pdf_path: []const u8,
    target_email_width_arg: i32,
    target_page_arg: ?i32,
    override_out_dir: ?[]const u8,
    marked_regions_arg: ?[]const PdfMarkedRegion,
) !ExtractedPackage {
    logMsg("=== Starting extractPdfPackage for: {s} ===", .{pdf_path});
    const target_email_width: i32 = if (target_email_width_arg <= 0) 700 else target_email_width_arg;
    const content_width: i32 = target_email_width - 40;
    const active_marked_regions = marked_regions_arg orelse &[_]PdfMarkedRegion{};

    // Resolve path & filenames
    var normalized_path = try allocator.dupe(u8, pdf_path);
    defer allocator.free(normalized_path);
    for (normalized_path) |*b| {
        if (b.* == '/') b.* = '\\';
    }
    const pdf_path_z = try allocator.dupeZ(u8, normalized_path);
    defer allocator.free(pdf_path_z);

    const last_slash = std.mem.lastIndexOfScalar(u8, normalized_path, '\\');
    const filename = if (last_slash) |idx| normalized_path[idx + 1 ..] else normalized_path;
    const last_dot = std.mem.lastIndexOfScalar(u8, filename, '.');
    const base_name = if (last_dot) |idx| filename[0..idx] else filename;
    const parent_dir = if (override_out_dir) |od| od else (if (last_slash) |idx| normalized_path[0..idx] else ".");

    const package_dir = try std.fmt.allocPrint(allocator, "{s}\\{s}_ai_package", .{ parent_dir, base_name });
    const assets_dir = try std.fmt.allocPrint(allocator, "{s}\\assets", .{package_dir});

    // Create directories with UTF-16 Win32 API for full Unicode support
    const win32_dir = struct {
        extern "kernel32" fn CreateDirectoryW(lpPathName: [*:0]const u16, lpSecurityAttributes: ?*anyopaque) callconv(.winapi) c_int;
        extern "kernel32" fn MultiByteToWideChar(CodePage: u32, dwFlags: u32, lpMultiByteStr: [*]const u8, cbMultiByte: c_int, lpWideCharStr: ?[*]u16, cchWideChar: c_int) callconv(.winapi) c_int;
    };

    {
        var w_pkg_buf: [1024]u16 = undefined;
        const w_pkg_len = win32_dir.MultiByteToWideChar(65001, 0, package_dir.ptr, @intCast(package_dir.len), &w_pkg_buf, @intCast(w_pkg_buf.len - 1));
        if (w_pkg_len > 0) {
            w_pkg_buf[@intCast(w_pkg_len)] = 0;
            _ = win32_dir.CreateDirectoryW(@ptrCast(&w_pkg_buf), null);
        }

        var w_ast_buf: [1024]u16 = undefined;
        const w_ast_len = win32_dir.MultiByteToWideChar(65001, 0, assets_dir.ptr, @intCast(assets_dir.len), &w_ast_buf, @intCast(w_ast_buf.len - 1));
        if (w_ast_len > 0) {
            w_ast_buf[@intCast(w_ast_len)] = 0;
            _ = win32_dir.CreateDirectoryW(@ptrCast(&w_ast_buf), null);
        }
    }

    logMsg("Folders created.", .{});

    // Read PDF file into memory using _wfopen for 100% reliable Unicode handling
    var w_pdf_buf: [2048]u16 = undefined;
    const w_pdf_len = win32_dir.MultiByteToWideChar(65001, 0, normalized_path.ptr, @intCast(normalized_path.len), &w_pdf_buf, @intCast(w_pdf_buf.len - 1));
    if (w_pdf_len <= 0) {
        logMsg("Failed to convert PDF path to UTF-16", .{});
        return error.FailedToOpenPdf;
    }
    w_pdf_buf[@intCast(w_pdf_len)] = 0;

    const mode_rb: [3:0]u16 = .{ 'r', 'b', 0 };
    const fp = _wfopen(@ptrCast(&w_pdf_buf), &mode_rb);
    if (fp == null) {
        logMsg("Failed to open PDF file on disk via _wfopen", .{});
        return error.FailedToOpenPdf;
    }
    defer _ = fclose(fp.?);

    _ = fseek(fp.?, 0, 2); // SEEK_END
    const file_size: c_long = ftell(fp.?);
    _ = fseek(fp.?, 0, 0); // SEEK_SET

    if (file_size <= 0) {
        logMsg("PDF file is empty", .{});
        return error.FailedToOpenPdf;
    }

    const pdf_bytes = try allocator.alloc(u8, @intCast(file_size));
    defer allocator.free(pdf_bytes);

    const bytes_read = fread(pdf_bytes.ptr, 1, @intCast(file_size), fp.?);
    if (bytes_read != @as(usize, @intCast(file_size))) {
        logMsg("Failed to read complete PDF into memory buffer", .{});
        return error.FailedToOpenPdf;
    }

    logMsg("Calling FPDF_LoadMemDocument ({d} bytes)...", .{pdf_bytes.len});
    const doc = FPDF_LoadMemDocument(pdf_bytes.ptr, @intCast(pdf_bytes.len), null);
    if (doc == null) {
        const err_code = FPDF_GetLastError();
        logMsg("FPDF_LoadMemDocument failed with error {d}", .{err_code});
        return error.FailedToOpenPdf;
    }
    defer FPDF_CloseDocument(doc);
    logMsg("FPDF_LoadMemDocument succeeded!", .{});

    const page_count = FPDF_GetPageCount(doc);
    logMsg("Document has {d} pages.", .{page_count});

    const single_page_num: ?i32 = if (target_page_arg) |p_num| if (p_num >= 1 and p_num <= page_count) p_num else null else null;

    var total_images_extracted: i32 = 0;
    var total_text_blocks_count: i32 = 0;
    var total_links_count: i32 = 0;
    var preview_image_path_out: []const u8 = "";
    var preview_image_filename_out: []const u8 = "";

    var json_buf = Buffer.init(allocator);

    const out_page_count: i32 = if (single_page_num != null) 1 else page_count;

    try json_buf.print(
        \\{{
        \\  "document_name": {f},
        \\  "total_pages": {d},
        \\  "target_email_specs": {{
        \\    "container_width": "{d}px",
        \\    "padding_left_right": "20px",
        \\    "content_width": "{d}px",
        \\    "framework": "MJML"
        \\  }},
        \\  "pages": [
        \\
    , .{ std.json.fmt(filename, .{}), out_page_count, target_email_width, content_width });

    var first_page_in_json = true;
    var p: c_int = 0;
    while (p < page_count) : (p += 1) {
        if (single_page_num) |target_p| {
            if (p + 1 != target_p) continue;
        }

        const page = FPDF_LoadPage(doc, p);
        if (page == null) continue;
        defer FPDF_ClosePage(page);

        var pt_width = FPDF_GetPageWidth(page);
        var pt_height = FPDF_GetPageHeight(page);
        if (pt_width <= 0) pt_width = 600.0;
        if (pt_height <= 0) pt_height = 800.0;

        const norm_scale: f64 = @as(f64, @floatFromInt(target_email_width)) / pt_width;
        const norm_canvas_w: f64 = @as(f64, @floatFromInt(target_email_width));
        const norm_canvas_h: f64 = pt_height * norm_scale;

        const render_w: c_int = @intCast(@as(i64, @intFromFloat(@as(f64, @floatFromInt(target_email_width)) * 1.5)));
        const render_h_f = (pt_height / pt_width) * @as(f64, @floatFromInt(render_w));
        const render_h: c_int = if (render_h_f > 0) @intCast(@as(i64, @intFromFloat(render_h_f))) else render_w;

        const preview_filename = try std.fmt.allocPrint(allocator, "page_{d}_preview.png", .{p + 1});
        const preview_path = try std.fmt.allocPrint(allocator, "{s}\\{s}", .{ package_dir, preview_filename });

        if (preview_image_path_out.len == 0) {
            preview_image_path_out = preview_path;
            preview_image_filename_out = preview_filename;
        }

        // Render full page preview bitmap
        const preview_bitmap = FPDFBitmap_Create(render_w, render_h, 0);
        if (preview_bitmap == null) continue;
        defer FPDFBitmap_Destroy(preview_bitmap.?);

        const win32 = struct {
            extern "kernel32" fn GetTickCount64() callconv(.winapi) u64;
        };
        const t_render_start = win32.GetTickCount64();
        FPDFBitmap_FillRect(preview_bitmap.?, 0, 0, render_w, render_h, 0xFFFFFFFF);
        FPDF_RenderPageBitmap(preview_bitmap.?, page, 0, 0, render_w, render_h, 0, FPDF_ANNOT);
        const t_render_done = win32.GetTickCount64();
        std.debug.print("  [Perf] FPDF_RenderPageBitmap ({d}x{d}): {d} ms\n", .{ render_w, render_h, t_render_done - t_render_start });

        const raw_buf = FPDFBitmap_GetBuffer(preview_bitmap.?);
        const stride = FPDFBitmap_GetStride(preview_bitmap.?);
        if (raw_buf == null or stride <= 0) continue;

        const src_bytes: [*]const u8 = @ptrCast(raw_buf.?);

        // Save page preview as PNG with fast compression level 1
        {
            const total_pixels: usize = @intCast(render_w * render_h);
            var rgb_data = try allocator.alloc(u8, total_pixels * 3);
            defer allocator.free(rgb_data);

            var y: usize = 0;
            while (y < @as(usize, @intCast(render_h))) : (y += 1) {
                const s_row = y * @as(usize, @intCast(stride));
                const d_row = y * @as(usize, @intCast(render_w)) * 3;
                var x: usize = 0;
                while (x < @as(usize, @intCast(render_w))) : (x += 1) {
                    const s_idx = s_row + x * 4;
                    const d_idx = d_row + x * 3;
                    rgb_data[d_idx + 0] = src_bytes[s_idx + 2]; // R
                    rgb_data[d_idx + 1] = src_bytes[s_idx + 1]; // G
                    rgb_data[d_idx + 2] = src_bytes[s_idx + 0]; // B
                }
            }
            const prev_z = try allocator.dupeZ(u8, preview_path);
            defer allocator.free(prev_z);
            const t_png_start = win32.GetTickCount64();
            _ = stbi_write_png(prev_z.ptr, render_w, render_h, 3, rgb_data.ptr, render_w * 3);
            const t_png_done = win32.GetTickCount64();
            std.debug.print("  [Perf] Save preview PNG ({d}x{d}): {d} ms\n", .{ render_w, render_h, t_png_done - t_png_start });
            logMsg("Saved high-res preview image (PNG) to {s}", .{preview_path});
        }

        if (!first_page_in_json) {
            try json_buf.print(",\n", .{});
        }
        first_page_in_json = false;
        // Start page JSON
        try json_buf.print(
            \\    {{
            \\      "page_number": {d},
            \\      "canvas_width_pt": {d:.1},
            \\      "canvas_height_pt": {d:.1},
            \\      "page_preview_image": {f},
            \\      "preview_pixel_width": {d},
            \\      "preview_pixel_height": {d},
            \\      "elements": [
            \\
        , .{ p + 1, norm_canvas_w, norm_canvas_h, std.json.fmt(preview_filename, .{}), render_w, render_h });

        // Intermediate element representation for natural top-to-bottom sorting
        const ElementType = enum {
            image,
            text_block,
        };

        const ElementItem = struct {
            elem_type: ElementType,
            top: f64,
            left: f64,
            width: f64,
            height: f64,
            // Image fields
            asset_rel_path: ?[]const u8 = null,
            img_width_px: i32 = 0,
            img_height_px: i32 = 0,
            // Text fields
            raw_text: ?[]const u8 = null,
            font_size: f64 = 11.0,
            is_bold: bool = false,
            is_cta: bool = false,
            dominant_color: []const u8 = "#151515",
            parent_container_color: ?[]const u8 = null,
            hyperlink: ?[]const u8 = null,
        };

        var page_elements = std.ArrayList(ElementItem).empty;
        defer page_elements.deinit(allocator);

        const scale_x = @as(f64, @floatFromInt(render_w)) / pt_width;
        const scale_y = @as(f64, @floatFromInt(render_h)) / pt_height;

        // 0. Extract user-marked regions as high-quality transparent PNG image assets
        for (active_marked_regions) |mark| {
            if (mark.page != p + 1) continue;

            const mark_l = @max(0.0, @min(pt_width, mark.left));
            const mark_t = @max(0.0, @min(pt_height, mark.top));
            const mark_r = @max(mark_l + 1.0, @min(pt_width, mark.right));
            const mark_b = @max(mark_t + 1.0, @min(pt_height, mark.bottom));
            const mark_w_pt = mark_r - mark_l;
            const mark_h_pt = mark_b - mark_t;

            const m_dev_x = @as(c_int, @intFromFloat(mark_l * scale_x));
            const m_dev_y = @as(c_int, @intFromFloat(mark_t * scale_y));
            const m_dev_w = @max(2, @as(c_int, @intFromFloat(mark_w_pt * scale_x)));
            const m_dev_h = @max(2, @as(c_int, @intFromFloat(mark_h_pt * scale_y)));

            total_images_extracted += 1;
            const asset_fn = try std.fmt.allocPrint(allocator, "asset_p{d}_mark_{d}.png", .{ p + 1, total_images_extracted });
            defer allocator.free(asset_fn);
            const asset_disk_path = try std.fmt.allocPrint(allocator, "{s}\\{s}", .{ assets_dir, asset_fn });
            defer allocator.free(asset_disk_path);
            const asset_rel_path = try std.fmt.allocPrint(allocator, "assets/{s}", .{asset_fn});

            // Create 32-bit transparent bitmap for the marked region
            const mark_bitmap = FPDFBitmap_Create(m_dev_w, m_dev_h, 1);
            if (mark_bitmap) |bmp| {
                defer FPDFBitmap_Destroy(bmp);
                FPDFBitmap_FillRect(bmp, 0, 0, m_dev_w, m_dev_h, 0x00000000); // 100% transparent clear
                FPDF_RenderPageBitmap(bmp, page, -m_dev_x, -m_dev_y, render_w, render_h, 0, FPDF_ANNOT);

                const mark_buf = FPDFBitmap_GetBuffer(bmp);
                const mark_stride = FPDFBitmap_GetStride(bmp);
                if (mark_buf != null and mark_stride > 0) {
                    const m_src_bytes: [*]const u8 = @ptrCast(mark_buf.?);
                    const m_total_pixels: usize = @intCast(m_dev_w * m_dev_h);
                    var rgba_data = try allocator.alloc(u8, m_total_pixels * 4);
                    defer allocator.free(rgba_data);

                    var iy: usize = 0;
                    while (iy < @as(usize, @intCast(m_dev_h))) : (iy += 1) {
                        const s_row = iy * @as(usize, @intCast(mark_stride));
                        const d_row = iy * @as(usize, @intCast(m_dev_w)) * 4;
                        var ix: usize = 0;
                        while (ix < @as(usize, @intCast(m_dev_w))) : (ix += 1) {
                            const sidx = s_row + ix * 4;
                            const didx = d_row + ix * 4;
                            rgba_data[didx + 0] = m_src_bytes[sidx + 2]; // R
                            rgba_data[didx + 1] = m_src_bytes[sidx + 1]; // G
                            rgba_data[didx + 2] = m_src_bytes[sidx + 0]; // B
                            rgba_data[didx + 3] = m_src_bytes[sidx + 3]; // A
                        }
                    }

                    const adisk_z = try allocator.dupeZ(u8, asset_disk_path);
                    defer allocator.free(adisk_z);
                    _ = stbi_write_png(adisk_z.ptr, m_dev_w, m_dev_h, 4, rgba_data.ptr, m_dev_w * 4);
                    logMsg("Saved marked transparent region asset {s} ({d}x{d})", .{ asset_fn, m_dev_w, m_dev_h });

                    const target_content_w: f64 = @floatFromInt(content_width);
                    const scale_to_content = target_content_w / pt_width;
                    const email_w_px: i32 = @intCast(@as(i64, @intFromFloat(mark_w_pt * scale_to_content)));
                    const email_h_px: i32 = @intCast(@as(i64, @intFromFloat(mark_h_pt * scale_to_content)));

                    try page_elements.append(allocator, ElementItem{
                        .elem_type = .image,
                        .top = mark_t * norm_scale,
                        .left = mark_l * norm_scale,
                        .width = mark_w_pt * norm_scale,
                        .height = mark_h_pt * norm_scale,
                        .asset_rel_path = asset_rel_path,
                        .img_width_px = email_w_px,
                        .img_height_px = email_h_px,
                    });
                }
            }
        }

        // 1. Extract Images by Slicing Directly from the High-Res Rendered Page Buffer (100% True Color Fidelity)
        const t_img_start = win32.GetTickCount64();

        const ImageCollector = struct {
            fn collect(obj_handle: FPDF_PAGEOBJECT, list: *std.ArrayList(FPDF_PAGEOBJECT), alloc: std.mem.Allocator) void {
                if (obj_handle == null) return;
                const obj_type = FPDFPageObj_GetType(obj_handle);
                if (obj_type == FPDF_PAGEOBJ_IMAGE) {
                    list.append(alloc, obj_handle) catch {};
                } else if (obj_type == FPDF_PAGEOBJ_FORM) {
                    const child_count = FPDFFormObj_CountObjects(obj_handle);
                    if (child_count > 0) {
                        var ci: c_ulong = 0;
                        while (ci < @as(c_ulong, @intCast(child_count))) : (ci += 1) {
                            const child = FPDFFormObj_GetObject(obj_handle, ci);
                            collect(child, list, alloc);
                        }
                    }
                }
            }
        };

        var all_image_objects = std.ArrayList(FPDF_PAGEOBJECT).empty;
        defer all_image_objects.deinit(allocator);

        const obj_count = FPDFPage_CountObjects(page);
        var obj_i: c_int = 0;
        while (obj_i < obj_count) : (obj_i += 1) {
            const root_obj = FPDFPage_GetObject(page, obj_i);
            ImageCollector.collect(root_obj, &all_image_objects, allocator);
        }

        for (all_image_objects.items) |obj| {
            var l: f32 = 0;
            var b: f32 = 0;
            var r: f32 = 0;
            var t: f32 = 0;
            if (FPDFPageObj_GetBounds(obj, &l, &b, &r, &t) != 0) {
                var dev_x0: c_int = 0;
                var dev_y0: c_int = 0;
                var dev_x1: c_int = 0;
                var dev_y1: c_int = 0;
                FPDF_PageToDevice(page, 0, 0, render_w, render_h, 0, l, t, &dev_x0, &dev_y0);
                FPDF_PageToDevice(page, 0, 0, render_w, render_h, 0, r, b, &dev_x1, &dev_y1);

                const min_x = @min(dev_x0, dev_x1);
                const max_x = @max(dev_x0, dev_x1);
                const min_y = @min(dev_y0, dev_y1);
                const max_y = @max(dev_y0, dev_y1);

                const crop_x = @max(0, @min(render_w - 1, min_x));
                const crop_y = @max(0, @min(render_h - 1, min_y));
                const crop_w = @max(1, @min(render_w - crop_x, max_x - min_x));
                const crop_h = @max(1, @min(render_h - crop_y, max_y - min_y));

                if (crop_w <= 3 or crop_h <= 3) continue;
                if (crop_w >= @as(c_int, @intCast(@as(i64, @intFromFloat(@as(f64, @floatFromInt(render_w)) * 0.98)))) and
                    crop_h >= @as(c_int, @intCast(@as(i64, @intFromFloat(@as(f64, @floatFromInt(render_h)) * 0.98))))) continue;

                const w_val = @as(f64, @floatFromInt(crop_w)) / scale_x;
                const h_val = @as(f64, @floatFromInt(crop_h)) / scale_y;
                const top_pt = @as(f64, @floatFromInt(crop_y)) / scale_y;
                const left_pt = @as(f64, @floatFromInt(crop_x)) / scale_x;

                // STRICT DEDUPLICATION: If this raw image is inside any user-marked region on this page, skip it completely!
                if (isInsideAnyMarkedRegion(left_pt, top_pt, left_pt + w_val, top_pt + h_val, active_marked_regions, p + 1)) {
                    logMsg("Skipping raw image object at ({d:.1}, {d:.1}) - superseded by marked region", .{ left_pt, top_pt });
                    continue;
                }

                total_images_extracted += 1;
                const asset_fn = try std.fmt.allocPrint(allocator, "asset_p{d}_{d}.png", .{ p + 1, total_images_extracted });
                defer allocator.free(asset_fn);
                const asset_disk_path = try std.fmt.allocPrint(allocator, "{s}\\{s}", .{ assets_dir, asset_fn });
                defer allocator.free(asset_disk_path);
                const asset_rel_path = try std.fmt.allocPrint(allocator, "assets/{s}", .{asset_fn});

                const crop_total_pixels: usize = @intCast(crop_w * crop_h);
                var img_rgb = try allocator.alloc(u8, crop_total_pixels * 3);
                defer allocator.free(img_rgb);

                var iy: usize = 0;
                while (iy < @as(usize, @intCast(crop_h))) : (iy += 1) {
                    const py = @as(usize, @intCast(crop_y)) + iy;
                    const s_row = py * @as(usize, @intCast(stride)) + @as(usize, @intCast(crop_x)) * 4;
                    const d_row = iy * @as(usize, @intCast(crop_w)) * 3;
                    var ix: usize = 0;
                    while (ix < @as(usize, @intCast(crop_w))) : (ix += 1) {
                        const sidx = s_row + ix * 4;
                        const didx = d_row + ix * 3;
                        img_rgb[didx + 0] = src_bytes[sidx + 2]; // R
                        img_rgb[didx + 1] = src_bytes[sidx + 1]; // G
                        img_rgb[didx + 2] = src_bytes[sidx + 0]; // B
                    }
                }

                const adisk_z = try allocator.dupeZ(u8, asset_disk_path);
                defer allocator.free(adisk_z);
                _ = stbi_write_png(adisk_z.ptr, crop_w, crop_h, 3, img_rgb.ptr, crop_w * 3);
                logMsg("Extracted image {s} ({d}x{d}) at ({d},{d})", .{ asset_fn, crop_w, crop_h, crop_x, crop_y });

                // Calculate email layout scaled target dimensions for 660px container
                const target_content_w: f64 = @floatFromInt(content_width);
                const scale_to_content = target_content_w / pt_width;
                const email_w_px: i32 = @intCast(@as(i64, @intFromFloat(w_val * scale_to_content)));
                const email_h_px: i32 = @intCast(@as(i64, @intFromFloat(h_val * scale_to_content)));

                try page_elements.append(allocator, ElementItem{
                    .elem_type = .image,
                    .top = top_pt * norm_scale,
                    .left = left_pt * norm_scale,
                    .width = w_val * norm_scale,
                    .height = h_val * norm_scale,
                    .asset_rel_path = asset_rel_path,
                    .img_width_px = email_w_px,
                    .img_height_px = email_h_px,
                });
            }
        }
        const t_img_done = win32.GetTickCount64();
        std.debug.print("  [Perf] Extract {d} Image Assets: {d} ms\n", .{ total_images_extracted, t_img_done - t_img_start });

        // 1. Extract PDF Annotations & Hyperlinks
        const PdfLink = struct {
            left: f64,
            top: f64,
            right: f64,
            bottom: f64,
            uri: []const u8,
        };

        var page_links = std.ArrayList(PdfLink).empty;
        defer {
            for (page_links.items) |lk| allocator.free(lk.uri);
            page_links.deinit(allocator);
        }

        var link_pos: c_int = 0;
        var link_annot: FPDF_LINK = null;
        while (FPDFLink_Enumerate(page, &link_pos, &link_annot) != 0) {
            if (link_annot) |annot| {
                var rect: FS_RECTF = undefined;
                if (FPDFLink_GetAnnotRect(annot, &rect) != 0) {
                    const act = FPDFLink_GetAction(annot);
                    if (act != null and FPDFAction_GetType(act) == PDFACTION_URI) {
                        const uri_len = FPDFAction_GetURIPath(doc, act, null, 0);
                        if (uri_len > 0) {
                            const uri_buf = try allocator.alloc(u8, @intCast(uri_len + 1));
                            defer allocator.free(uri_buf);
                            const actual_uri_len = FPDFAction_GetURIPath(doc, act, uri_buf.ptr, uri_len);
                            if (actual_uri_len > 0) {
                                const uri_str = std.mem.trim(u8, uri_buf[0..@intCast(actual_uri_len)], " \r\n\t\x00");
                                if (uri_str.len > 0) {
                                    const lk_x0 = @as(f64, @min(rect.left, rect.right));
                                    const lk_x1 = @as(f64, @max(rect.left, rect.right));
                                    const lk_y0 = @as(f64, @min(pt_height - rect.top, pt_height - rect.bottom));
                                    const lk_y1 = @as(f64, @max(pt_height - rect.top, pt_height - rect.bottom));

                                    try page_links.append(allocator, .{
                                        .left = lk_x0 * norm_scale,
                                        .top = lk_y0 * norm_scale,
                                        .right = lk_x1 * norm_scale,
                                        .bottom = lk_y1 * norm_scale,
                                        .uri = try allocator.dupe(u8, uri_str),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        total_links_count += @intCast(page_links.items.len);

        // Attach hyperlinks to extracted image elements
        for (page_elements.items) |*elem| {
            if (elem.elem_type == .image) {
                for (page_links.items) |lk| {
                    if (!(elem.left > lk.right or elem.left + elem.width < lk.left or elem.top > lk.bottom or elem.top + elem.height < lk.top)) {
                        elem.hyperlink = lk.uri;
                        break;
                    }
                }
            }
        }

        // 2. Extract Vector Background Cards (Matching PyMuPDF get_drawings, including nested Form XObjects)
        const VectorCard = struct {
            left: f64,
            top: f64,
            right: f64,
            bottom: f64,
            fill_hex: []const u8,
        };

        var bg_cards = std.ArrayList(VectorCard).empty;
        defer {
            for (bg_cards.items) |c| allocator.free(c.fill_hex);
            bg_cards.deinit(allocator);
        }

        const PathCollector = struct {
            fn collect(obj_handle: FPDF_PAGEOBJECT, list: *std.ArrayList(FPDF_PAGEOBJECT), alloc: std.mem.Allocator) void {
                if (obj_handle == null) return;
                const obj_type = FPDFPageObj_GetType(obj_handle);
                if (obj_type == FPDF_PAGEOBJ_PATH) {
                    list.append(alloc, obj_handle) catch {};
                } else if (obj_type == FPDF_PAGEOBJ_FORM) {
                    list.append(alloc, obj_handle) catch {};
                    const child_count = FPDFFormObj_CountObjects(obj_handle);
                    if (child_count > 0) {
                        var ci: c_ulong = 0;
                        while (ci < @as(c_ulong, @intCast(child_count))) : (ci += 1) {
                            const child = FPDFFormObj_GetObject(obj_handle, ci);
                            if (child != null) {
                                collect(child, list, alloc);
                            }
                        }
                    }
                } else if (obj_type != 1) {
                    list.append(alloc, obj_handle) catch {};
                }
            }
        };

        var all_path_objects = std.ArrayList(FPDF_PAGEOBJECT).empty;
        defer all_path_objects.deinit(allocator);

        var pobj_i: c_int = 0;
        while (pobj_i < obj_count) : (pobj_i += 1) {
            const root_obj = FPDFPage_GetObject(page, pobj_i);
            PathCollector.collect(root_obj, &all_path_objects, allocator);
        }

        for (all_path_objects.items) |path_obj| {
            if (path_obj != null and FPDFPageObj_GetType(path_obj) == FPDF_PAGEOBJ_PATH) {
                var l: f32 = 0;
                var b: f32 = 0;
                var r: f32 = 0;
                var t: f32 = 0;
                if (FPDFPageObj_GetBounds(path_obj, &l, &b, &r, &t) != 0) {
                    var dev_x0: c_int = 0;
                    var dev_y0: c_int = 0;
                    var dev_x1: c_int = 0;
                    var dev_y1: c_int = 0;
                    FPDF_PageToDevice(page, 0, 0, render_w, render_h, 0, l, t, &dev_x0, &dev_y0);
                    FPDF_PageToDevice(page, 0, 0, render_w, render_h, 0, r, b, &dev_x1, &dev_y1);

                    const min_x = @min(dev_x0, dev_x1);
                    const max_x = @max(dev_x0, dev_x1);
                    const min_y = @min(dev_y0, dev_y1);
                    const max_y = @max(dev_y0, dev_y1);

                    const card_w_px = max_x - min_x;
                    const card_h_px = max_y - min_y;

                    if (card_w_px >= 12 and card_h_px >= 10) {
                        if (card_w_px >= @as(c_int, @intCast(@as(i64, @intFromFloat(@as(f64, @floatFromInt(render_w)) * 0.95)))) and
                            card_h_px >= @as(c_int, @intCast(@as(i64, @intFromFloat(@as(f64, @floatFromInt(render_h)) * 0.95))))) continue;

                        const card_left_pt = (@as(f64, @floatFromInt(min_x)) / scale_x) * norm_scale;
                        const card_top_pt = (@as(f64, @floatFromInt(min_y)) / scale_y) * norm_scale;
                        const card_right_pt = (@as(f64, @floatFromInt(max_x)) / scale_x) * norm_scale;
                        const card_bottom_pt = (@as(f64, @floatFromInt(max_y)) / scale_y) * norm_scale;

                        var r_val: c_uint = 255;
                        var g_val: c_uint = 255;
                        var b_val: c_uint = 255;
                        var a_val: c_uint = 255;
                        if (FPDFPageObj_GetFillColor(path_obj, &r_val, &g_val, &b_val, &a_val) != 0 and a_val > 0) {
                            const fill_hex = try std.fmt.allocPrint(allocator, "#{x:0>2}{x:0>2}{x:0>2}", .{ r_val, g_val, b_val });
                            try bg_cards.append(allocator, .{
                                .left = card_left_pt,
                                .top = card_top_pt,
                                .right = card_right_pt,
                                .bottom = card_bottom_pt,
                                .fill_hex = fill_hex,
                            });
                        }
                    }
                }
            }
        }

        // 3. Extract & Cluster Text Spans into Natural Multi-Line Paragraph Blocks
        const t_text_start = win32.GetTickCount64();
        const TextSpanRaw = struct {
            top: f64,
            left: f64,
            width: f64,
            height: f64,
            text: []const u8,
            font_size: f64,
            color: []const u8,
            bold: bool,
            italic: bool,
            superscript: bool,
            hyperlink: ?[]const u8,
        };

        var raw_spans = std.ArrayList(TextSpanRaw).empty;
        defer {
            for (raw_spans.items) |s| {
                allocator.free(s.text);
                allocator.free(s.color);
            }
            raw_spans.deinit(allocator);
        }

        const text_page = FPDFText_LoadPage(page);
        if (text_page) |tp| {
            defer FPDFText_ClosePage(tp);
            const total_chars = FPDFText_CountChars(tp);
            if (total_chars > 0) {
                const rect_count = FPDFText_CountRects(tp, 0, total_chars);
                var r_idx: c_int = 0;
                while (r_idx < rect_count) : (r_idx += 1) {
                    var rx0: f64 = 0;
                    var ry0: f64 = 0;
                    var rx1: f64 = 0;
                    var ry1: f64 = 0;
                    if (FPDFText_GetRect(tp, r_idx, &rx0, &ry0, &rx1, &ry1) != 0) {
                        const buf_len = FPDFText_GetBoundedText(tp, rx0, ry0, rx1, ry1, null, 0);
                        if (buf_len > 0) {
                            const wbuf = try allocator.alloc(u16, @intCast(buf_len + 1));
                            defer allocator.free(wbuf);
                            const actual_read = FPDFText_GetBoundedText(tp, rx0, ry0, rx1, ry1, wbuf.ptr, buf_len);
                            wbuf[@intCast(actual_read)] = 0;

                            var utf8_list = std.ArrayList(u8).empty;
                            defer utf8_list.deinit(allocator);

                            for (wbuf[0..@intCast(actual_read)]) |u_code| {
                                if (u_code == 0) break;
                                var char_bytes: [4]u8 = undefined;
                                const char_len = std.unicode.utf8Encode(@intCast(u_code), &char_bytes) catch 0;
                                if (char_len > 0) {
                                    try utf8_list.appendSlice(allocator, char_bytes[0..char_len]);
                                }
                            }

                            const trimmed = std.mem.trim(u8, utf8_list.items, " \r\n\t\x00");
                            if (trimmed.len > 0) {
                                const center_x = (rx0 + rx1) * 0.5;
                                const center_y = (ry0 + ry1) * 0.5;
                                var font_size: f64 = 10.5;
                                var is_bold: bool = false;
                                var is_italic: bool = false;
                                var r_val: c_uint = 21;
                                var g_val: c_uint = 21;
                                var b_val: c_uint = 21;

                                const char_i = FPDFText_GetCharIndexAtPos(tp, center_x, center_y, 8.0, 8.0);
                                if (char_i >= 0 and char_i < total_chars) {
                                    const fs_cand = FPDFText_GetFontSize(tp, char_i);
                                    if (fs_cand > 0) font_size = fs_cand;
                                    
                                    var font_flags: c_int = 0;
                                    var font_name_buf: [256]u8 = undefined;
                                    const font_name_len = FPDFText_GetFontInfo(tp, char_i, &font_name_buf, font_name_buf.len, &font_flags);
                                    if (font_name_len > 0) {
                                        const font_slice = font_name_buf[0..@min(font_name_len, font_name_buf.len)];
                                        if (std.ascii.indexOfIgnoreCase(font_slice, "bold") != null or
                                            std.ascii.indexOfIgnoreCase(font_slice, "black") != null or
                                            std.ascii.indexOfIgnoreCase(font_slice, "heavy") != null or
                                            std.ascii.indexOfIgnoreCase(font_slice, "semibold") != null or
                                            std.ascii.indexOfIgnoreCase(font_slice, "demi") != null or
                                            std.ascii.indexOfIgnoreCase(font_slice, "w6") != null or
                                            std.ascii.indexOfIgnoreCase(font_slice, "w7") != null) {
                                            is_bold = true;
                                        }
                                        if (std.ascii.indexOfIgnoreCase(font_slice, "italic") != null or
                                            std.ascii.indexOfIgnoreCase(font_slice, "oblique") != null) {
                                            is_italic = true;
                                        }
                                        if ((font_flags & 0x40000) != 0 or (font_flags & 16) != 0) {
                                            is_bold = true;
                                        }
                                        if ((font_flags & 0x40) != 0) {
                                            is_italic = true;
                                        }
                                    }

                                    const fw = FPDFText_GetFontWeight(tp, char_i);
                                    if (fw >= 600) is_bold = true;

                                    var a_val: c_uint = 21;
                                    _ = FPDFText_GetFillColor(tp, char_i, &r_val, &g_val, &b_val, &a_val);
                                }

                                const y_a = pt_height - ry0;
                                const y_b = pt_height - ry1;
                                const top_y = @min(y_a, y_b);
                                const bottom_y = @max(y_a, y_b);
                                const width = rx1 - rx0;
                                const height = bottom_y - top_y;

                                // STRICT TEXT SUPPRESSION: Exclude text if inside any user-marked image region on this page
                                if (isInsideAnyMarkedRegion(rx0, top_y, rx1, bottom_y, active_marked_regions, p + 1)) {
                                    continue;
                                }

                                // Normalize coordinates to email space
                                const norm_top_y = top_y * norm_scale;
                                const norm_left = rx0 * norm_scale;
                                const norm_width = width * norm_scale;
                                const norm_height = height * norm_scale;

                                // If font_size is unscaled (e.g. 1.0pt from InDesign transform matrix), calculate real point size from rendered bounding box height
                                var norm_font_size = font_size * norm_scale;
                                if (norm_font_size <= 2.5 and norm_height >= 4.0) {
                                    norm_font_size = norm_height * 0.92;
                                }
                                norm_font_size = @round(norm_font_size * 10.0) / 10.0;

                                const is_super = trimmed.len <= 4 and (
                                    std.mem.eql(u8, trimmed, "1") or std.mem.eql(u8, trimmed, "2") or
                                    std.mem.eql(u8, trimmed, "3") or std.mem.eql(u8, trimmed, "4") or
                                    std.mem.eql(u8, trimmed, "®") or std.mem.eql(u8, trimmed, "™") or
                                    std.mem.eql(u8, trimmed, "*") or std.mem.eql(u8, trimmed, "1-4") or
                                    std.mem.eql(u8, trimmed, "2,3")
                                );

                                const hex_color = try std.fmt.allocPrint(allocator, "#{x:0>2}{x:0>2}{x:0>2}", .{ r_val, g_val, b_val });

                                var span_link: ?[]const u8 = null;
                                for (page_links.items) |lk| {
                                    if (!(norm_left > lk.right or norm_left + norm_width < lk.left or norm_top_y > lk.bottom or norm_top_y + norm_height < lk.top)) {
                                        span_link = lk.uri;
                                        break;
                                    }
                                }

                                try raw_spans.append(allocator, .{
                                    .top = norm_top_y,
                                    .left = norm_left,
                                    .width = norm_width,
                                    .height = norm_height,
                                    .text = try allocator.dupe(u8, trimmed),
                                    .font_size = norm_font_size,
                                    .color = hex_color,
                                    .bold = is_bold,
                                    .italic = is_italic,
                                    .superscript = is_super,
                                    .hyperlink = span_link,
                                });
                            }
                        }
                    }
                }
            }
        }
        const t_text_done = win32.GetTickCount64();
        std.debug.print("  [Perf] Extract {d} Text Spans: {d} ms\n", .{ raw_spans.items.len, t_text_done - t_text_start });

        // Sort raw spans top-to-bottom, left-to-right
        const SpanSort = struct {
            pub fn lessThan(_: @TypeOf(.{}), a: TextSpanRaw, b: TextSpanRaw) bool {
                if (@abs(a.top - b.top) > 5.0) return a.top < b.top;
                return a.left < b.left;
            }
        };
        std.mem.sort(TextSpanRaw, raw_spans.items, .{}, SpanSort.lessThan);

        // Group raw spans into cohesive paragraphs
        const SpanInfo = struct {
            text: []const u8,
            font_size: f64,
            color: []const u8,
            bold: bool,
            italic: bool,
            superscript: bool,
            hyperlink: ?[]const u8,
            left: f64,
        };

        const LineInfo = struct {
            bbox: [4]f64,
            spans: std.ArrayList(SpanInfo),
        };

        const BlockInfo = struct {
            bbox: [4]f64,
            top: f64,
            left: f64,
            raw_text: []const u8,
            lines: std.ArrayList(LineInfo),
            parent_container_color: ?[]const u8,
            container_type: ?[]const u8 = null,
            is_cta_button: bool,
            dominant_color: []const u8,
        };

        var clustered_blocks = std.ArrayList(BlockInfo).empty;
        defer {
            for (clustered_blocks.items) |*b| {
                allocator.free(b.raw_text);
                for (b.lines.items) |*l| l.spans.deinit(allocator);
                b.lines.deinit(allocator);
            }
            clustered_blocks.deinit(allocator);
        }

        var span_idx: usize = 0;
        while (span_idx < raw_spans.items.len) {
            const start_span = raw_spans.items[span_idx];
            var block_l = start_span.left;
            const block_t = start_span.top;
            var block_r = start_span.left + start_span.width;
            var block_b = start_span.top + start_span.height;
            const dom_col = start_span.color;

            var b_lines = std.ArrayList(LineInfo).empty;

            var cur_line_spans = std.ArrayList(SpanInfo).empty;
            var cur_line_l = start_span.left;
            var cur_line_t = start_span.top;
            var cur_line_r = start_span.left + start_span.width;
            var cur_line_b = start_span.top + start_span.height;

            try cur_line_spans.append(allocator, .{
                .text = start_span.text,
                .font_size = start_span.font_size,
                .color = start_span.color,
                .bold = start_span.bold,
                .italic = start_span.italic,
                .superscript = start_span.superscript,
                .hyperlink = start_span.hyperlink,
                .left = start_span.left,
            });

            var next_idx = span_idx + 1;
            while (next_idx < raw_spans.items.len) {
                const cand = raw_spans.items[next_idx];
                const v_gap = cand.top - cur_line_b;
                const is_same_line = @abs(cand.top - cur_line_t) <= 6.5 or @abs(cand.top + cand.height - cur_line_b) <= 5.0;
                const is_next_line_para = v_gap >= -4.0 and v_gap <= (start_span.font_size * 2.2) and @abs(cand.left - block_l) <= 30.0 and (@abs(cand.font_size - start_span.font_size) <= 4.0 or cand.superscript or cand.text.len <= 2);

                if (is_same_line) {
                    try cur_line_spans.append(allocator, .{
                        .text = cand.text,
                        .font_size = cand.font_size,
                        .color = cand.color,
                        .bold = cand.bold,
                        .italic = cand.italic,
                        .superscript = cand.superscript,
                        .hyperlink = cand.hyperlink,
                        .left = cand.left,
                    });
                    cur_line_l = @min(cur_line_l, cand.left);
                    cur_line_r = @max(cur_line_r, cand.left + cand.width);
                    cur_line_b = @max(cur_line_b, cand.top + cand.height);
                    block_l = @min(block_l, cur_line_l);
                    block_r = @max(block_r, cur_line_r);
                    block_b = @max(block_b, cur_line_b);
                    next_idx += 1;
                } else if (is_next_line_para) {
                    // Sort spans on current line left to right before finalizing line
                    const LineSpanSort = struct {
                        pub fn lessThan(_: @TypeOf(.{}), sa: SpanInfo, sb: SpanInfo) bool {
                            return sa.left < sb.left;
                        }
                    };
                    std.mem.sort(SpanInfo, cur_line_spans.items, .{}, LineSpanSort.lessThan);

                    try b_lines.append(allocator, .{
                        .bbox = [4]f64{ cur_line_l, cur_line_t, cur_line_r, cur_line_b },
                        .spans = cur_line_spans,
                    });
                    cur_line_spans = std.ArrayList(SpanInfo).empty;
                    cur_line_l = cand.left;
                    cur_line_t = cand.top;
                    cur_line_r = cand.left + cand.width;
                    cur_line_b = cand.top + cand.height;
                    block_l = @min(block_l, cur_line_l);
                    block_r = @max(block_r, cur_line_r);
                    block_b = @max(block_b, cur_line_b);

                    try cur_line_spans.append(allocator, .{
                        .text = cand.text,
                        .font_size = cand.font_size,
                        .color = cand.color,
                        .bold = cand.bold,
                        .italic = cand.italic,
                        .superscript = cand.superscript,
                        .hyperlink = cand.hyperlink,
                        .left = cand.left,
                    });
                    next_idx += 1;
                } else {
                    break;
                }
            }

            // Finalize last line with left-to-right sorted spans
            const LineSpanSort = struct {
                pub fn lessThan(_: @TypeOf(.{}), sa: SpanInfo, sb: SpanInfo) bool {
                    return sa.left < sb.left;
                }
            };
            std.mem.sort(SpanInfo, cur_line_spans.items, .{}, LineSpanSort.lessThan);

            try b_lines.append(allocator, .{
                .bbox = [4]f64{ cur_line_l, cur_line_t, cur_line_r, cur_line_b },
                .spans = cur_line_spans,
            });

            // Assemble natural raw_text from sorted spans
            var raw_text_buf = std.ArrayList(u8).empty;
            defer raw_text_buf.deinit(allocator);

            for (b_lines.items, 0..) |line, li| {
                if (li > 0) try raw_text_buf.append(allocator, ' ');
                for (line.spans.items, 0..) |sp, si| {
                    if (si > 0) try raw_text_buf.append(allocator, ' ');
                    try raw_text_buf.appendSlice(allocator, sp.text);
                }
            }

            // Container card containment check (tightest enclosing container with area >= 200pt^2)
            var cont_col: ?[]const u8 = null;
            var cont_type: ?[]const u8 = null;
            var best_carea: f64 = 1e12;
            for (bg_cards.items) |card| {
                const cw = card.right - card.left;
                const ch = card.bottom - card.top;
                const carea = cw * ch;
                if (carea >= 200.0 and carea < best_carea) {
                    if (card.left - 6.0 <= block_l and card.right + 6.0 >= block_r and card.top - 6.0 <= block_t and card.bottom + 6.0 >= block_b) {
                        best_carea = carea;
                        cont_col = card.fill_hex;
                        if (cw >= (norm_canvas_w * 0.85)) {
                            cont_type = "full_width_section";
                        } else {
                            cont_type = "inner_card";
                        }
                    }
                }
            }

            const raw_str = try allocator.dupe(u8, raw_text_buf.items);
            const is_cta = (std.mem.indexOf(u8, raw_str, "http") != null or
                std.mem.indexOf(u8, raw_str, "Click") != null or
                std.mem.indexOf(u8, raw_str, "Clique") != null or
                std.mem.indexOf(u8, raw_str, "Acesse") != null or
                std.mem.indexOf(u8, raw_str, "Saiba mais") != null or
                std.mem.indexOf(u8, raw_str, "Learn more") != null) and raw_str.len <= 45;

            try clustered_blocks.append(allocator, .{
                .bbox = [4]f64{ block_l, block_t, block_r, block_b },
                .top = block_t,
                .left = block_l,
                .raw_text = raw_str,
                .lines = b_lines,
                .parent_container_color = cont_col,
                .container_type = cont_type,
                .is_cta_button = is_cta,
                .dominant_color = dom_col,
            });

            span_idx = next_idx;
        }

        // 4. Combine all visual elements (Images + Clustered Text Blocks) and sort chronologically (Top-to-Bottom, Left-to-Right)
        const UnifiedElemType = enum {
            image,
            text_block,
        };

        const UnifiedElement = struct {
            elem_type: UnifiedElemType,
            top: f64,
            left: f64,
            width: f64,
            height: f64,
            // Image fields
            asset_rel_path: ?[]const u8 = null,
            img_width_px: i32 = 0,
            img_height_px: i32 = 0,
            hyperlink: ?[]const u8 = null,
            parent_container_color: ?[]const u8 = null,
            // Text Block fields
            block_info: ?BlockInfo = null,
        };

        var all_elements = std.ArrayList(UnifiedElement).empty;
        defer all_elements.deinit(allocator);

        for (page_elements.items) |elem| {
            if (elem.elem_type == .image) {
                var img_cont_col: ?[]const u8 = null;
                const is_custom_mark = if (elem.asset_rel_path) |p_path| std.mem.indexOf(u8, p_path, "_mark_") != null else false;
                const is_large_section_img = elem.width >= 450.0 or (elem.width * elem.height) >= 40000.0;

                // Only search for parent container color if it's a small child asset (e.g. logo, icon) inside a larger container card
                if (!is_custom_mark and !is_large_section_img) {
                    var best_img_carea: f64 = 1e12;
                    for (bg_cards.items) |card| {
                        const cw = card.right - card.left;
                        const ch = card.bottom - card.top;
                        const carea = cw * ch;
                        const elem_area = elem.width * elem.height;
                        if (carea >= elem_area * 1.5 and carea < best_img_carea) {
                            if (card.left - 6.0 <= elem.left and card.right + 6.0 >= (elem.left + elem.width) and card.top - 6.0 <= elem.top and card.bottom + 6.0 >= (elem.top + elem.height)) {
                                best_img_carea = carea;
                                img_cont_col = card.fill_hex;
                            }
                        }
                    }
                }

                try all_elements.append(allocator, .{
                    .elem_type = .image,
                    .top = elem.top,
                    .left = elem.left,
                    .width = elem.width,
                    .height = elem.height,
                    .asset_rel_path = elem.asset_rel_path,
                    .img_width_px = elem.img_width_px,
                    .img_height_px = elem.img_height_px,
                    .hyperlink = elem.hyperlink,
                    .parent_container_color = img_cont_col,
                });
            }
        }

        for (clustered_blocks.items) |b| {
            try all_elements.append(allocator, .{
                .elem_type = .text_block,
                .top = b.top,
                .left = b.left,
                .width = b.bbox[2] - b.bbox[0],
                .height = b.bbox[3] - b.bbox[1],
                .block_info = b,
            });
        }

        const ElemSort = struct {
            pub fn lessThan(_: @TypeOf(.{}), a: UnifiedElement, b: UnifiedElement) bool {
                if (@abs(a.top - b.top) > 2.0) return a.top < b.top;
                return a.left < b.left;
            }
        };
        std.mem.sort(UnifiedElement, all_elements.items, .{}, ElemSort.lessThan);

        // 5. Output Unified Sorted JSON Elements
        var first_elem = true;

        for (all_elements.items) |elem| {
            if (!first_elem) try json_buf.print(",\n", .{});
            first_elem = false;

            if (elem.elem_type == .image) {
                try json_buf.print(
                    \\        {{
                    \\          "type": "image",
                    \\          "bbox": [{d:.1}, {d:.1}, {d:.1}, {d:.1}],
                    \\          "top": {d:.1},
                    \\          "left": {d:.1},
                    \\          "asset_path": {f},
                    \\          "width_px": {d},
                    \\          "height_px": {d},
                    \\          "hyperlink": {s},
                    \\          "parent_container_color": {s}
                    \\        }}
                , .{
                    elem.left,
                    elem.top,
                    elem.left + elem.width,
                    elem.top + elem.height,
                    elem.top,
                    elem.left,
                    std.json.fmt(elem.asset_rel_path.?, .{}),
                    elem.img_width_px,
                    elem.img_height_px,
                    if (elem.hyperlink) |h| try std.fmt.allocPrint(allocator, "\"{s}\"", .{h}) else "null",
                    if (elem.parent_container_color) |c| try std.fmt.allocPrint(allocator, "\"{s}\"", .{c}) else "null",
                });
            } else if (elem.block_info) |b| {
                total_text_blocks_count += 1;

                try json_buf.print(
                    \\        {{
                    \\          "type": "text_block",
                    \\          "bbox": [{d:.1}, {d:.1}, {d:.1}, {d:.1}],
                    \\          "top": {d:.1},
                    \\          "left": {d:.1},
                    \\          "raw_text": {f},
                    \\          "lines": [
                , .{ b.bbox[0], b.bbox[1], b.bbox[2], b.bbox[3], b.top, b.left, std.json.fmt(b.raw_text, .{}) });

                var first_line = true;
                for (b.lines.items) |l| {
                    if (!first_line) try json_buf.print(",\n", .{});
                    first_line = false;
                    try json_buf.print(
                        \\            {{
                        \\              "bbox": [{d:.1}, {d:.1}, {d:.1}, {d:.1}],
                        \\              "spans": [
                    , .{ l.bbox[0], l.bbox[1], l.bbox[2], l.bbox[3] });

                    var first_sp = true;
                    for (l.spans.items) |sp| {
                        if (!first_sp) try json_buf.print(",\n", .{});
                        first_sp = false;

                        if (sp.hyperlink) |hlink| {
                            try json_buf.print(
                                \\                {{
                                \\                  "text": {f},
                                \\                  "font_size_pt": {d:.1},
                                \\                  "color": {f},
                                \\                  "bold": {s},
                                \\                  "italic": {s},
                                \\                  "superscript": {s},
                                \\                  "hyperlink": {f}
                                \\                }}
                            , .{ std.json.fmt(sp.text, .{}), sp.font_size, std.json.fmt(sp.color, .{}), if (sp.bold) "true" else "false", if (sp.italic) "true" else "false", if (sp.superscript) "true" else "false", std.json.fmt(hlink, .{}) });
                        } else {
                            try json_buf.print(
                                \\                {{
                                \\                  "text": {f},
                                \\                  "font_size_pt": {d:.1},
                                \\                  "color": {f},
                                \\                  "bold": {s},
                                \\                  "italic": {s},
                                \\                  "superscript": {s},
                                \\                  "hyperlink": null
                                \\                }}
                            , .{ std.json.fmt(sp.text, .{}), sp.font_size, std.json.fmt(sp.color, .{}), if (sp.bold) "true" else "false", if (sp.italic) "true" else "false", if (sp.superscript) "true" else "false" });
                        }
                    }
                    try json_buf.print("\n              ]\n            }}", .{});
                }

                try json_buf.print(
                    \\
                    \\          ],
                    \\          "parent_container_color": {s},
                    \\          "container_type": {s},
                    \\          "is_cta_button": {s},
                    \\          "dominant_color": {f}
                    \\        }}
                , .{
                    if (b.parent_container_color) |c| try std.fmt.allocPrint(allocator, "\"{s}\"", .{c}) else "null",
                    if (b.container_type) |t| try std.fmt.allocPrint(allocator, "\"{s}\"", .{t}) else "null",
                    if (b.is_cta_button) "true" else "false",
                    std.json.fmt(b.dominant_color, .{}),
                });
            }
        }

        try json_buf.print("\n      ],\n", .{});

        // 6. Emit background_cards Top-Level Array (Exact Match to Python PyMuPDF)
        try json_buf.print("      \"background_cards\": [", .{});
        var first_card = true;
        for (bg_cards.items) |card| {
            if (!first_card) try json_buf.print(",", .{});
            first_card = false;
            const cw = card.right - card.left;
            const is_full = cw >= (norm_canvas_w * 0.85);
            try json_buf.print(
                "\n        {{\"bbox\": [{d:.1}, {d:.1}, {d:.1}, {d:.1}], \"fill_color\": {f}, \"container_type\": \"{s}\", \"stroke_color\": null}}",
                .{ card.left, card.top, card.right, card.bottom, std.json.fmt(card.fill_hex, .{}), if (is_full) "full_width_section" else "inner_card" },
            );
        }
        try json_buf.print("\n      ]\n    }}\n", .{});
    }

    try json_buf.print("  ]\n}}\n", .{});

    const json_filename = try std.fmt.allocPrint(allocator, "{s}_design.json.txt", .{base_name});
    defer allocator.free(json_filename);
    const json_path = try std.fmt.allocPrint(allocator, "{s}\\{s}", .{ package_dir, json_filename });

    var w_json_buf: [2048]u16 = undefined;
    const w_json_len = win32_dir.MultiByteToWideChar(65001, 0, json_path.ptr, @intCast(json_path.len), &w_json_buf, @intCast(w_json_buf.len - 1));
    if (w_json_len > 0) {
        w_json_buf[@intCast(w_json_len)] = 0;
        const mode_wb: [3:0]u16 = .{ 'w', 'b', 0 };
        const jf = _wfopen(@ptrCast(&w_json_buf), &mode_wb);
        if (jf) |f| {
            _ = fwrite(json_buf.data.items.ptr, 1, json_buf.data.items.len, f);
            _ = fclose(f);
            logMsg("Saved JSON design structure (.txt) to {s}", .{json_path});
        }
    }

    // Also write standard .json copy for complete local tooling compatibility
    const json_std_filename = try std.fmt.allocPrint(allocator, "{s}_design.json", .{base_name});
    defer allocator.free(json_std_filename);
    const json_std_path = try std.fmt.allocPrint(allocator, "{s}\\{s}", .{ package_dir, json_std_filename });
    const w_json_std_len = win32_dir.MultiByteToWideChar(65001, 0, json_std_path.ptr, @intCast(json_std_path.len), &w_json_buf, @intCast(w_json_buf.len - 1));
    if (w_json_std_len > 0) {
        w_json_buf[@intCast(w_json_std_len)] = 0;
        const mode_wb: [3:0]u16 = .{ 'w', 'b', 0 };
        const jf = _wfopen(@ptrCast(&w_json_buf), &mode_wb);
        if (jf) |f| {
            _ = fwrite(json_buf.data.items.ptr, 1, json_buf.data.items.len, f);
            _ = fclose(f);
        }
    }

    logMsg("Pure Zig PDF extraction completed successfully! Images: {d}, Text Blocks: {d}", .{ total_images_extracted, total_text_blocks_count });

    return ExtractedPackage{
        .package_dir = package_dir,
        .json_path = json_path,
        .preview_image_path = preview_image_path_out,
        .preview_image_filename = preview_image_filename_out,
        .total_pages = page_count,
        .total_text_blocks = total_text_blocks_count,
        .total_images = total_images_extracted,
        .total_links = total_links_count,
        .total_tables = 0,
        .total_styles = 0,
        .design_json_content = json_buf.data.items,
    };
}

pub fn getPdfPageComponents(allocator: std.mem.Allocator, pdf_path: []const u8, target_page_arg: ?i32) ![]const u8 {
    initPdfEngine();
    logMsg("=== getPdfPageComponents for: {s} ===", .{pdf_path});

    var normalized_path = try allocator.dupe(u8, pdf_path);
    defer allocator.free(normalized_path);
    for (normalized_path) |*b| {
        if (b.* == '/') b.* = '\\';
    }

    const win32_dir = struct {
        extern "kernel32" fn CreateDirectoryW(lpPathName: [*:0]const u16, lpSecurityAttributes: ?*anyopaque) callconv(.winapi) c_int;
        extern "kernel32" fn MultiByteToWideChar(CodePage: u32, dwFlags: u32, lpMultiByteStr: [*]const u8, cbMultiByte: c_int, lpWideCharStr: ?[*]u16, cchWideChar: c_int) callconv(.winapi) c_int;
    };

    var w_pdf_buf: [2048]u16 = undefined;
    const w_pdf_len = win32_dir.MultiByteToWideChar(65001, 0, normalized_path.ptr, @intCast(normalized_path.len), &w_pdf_buf, @intCast(w_pdf_buf.len - 1));
    if (w_pdf_len <= 0) return error.FailedToOpenPdf;
    w_pdf_buf[@intCast(w_pdf_len)] = 0;

    const mode_rb: [3:0]u16 = .{ 'r', 'b', 0 };
    const fp = _wfopen(@ptrCast(&w_pdf_buf), &mode_rb);
    if (fp == null) return error.FailedToOpenPdf;
    defer _ = fclose(fp.?);

    _ = fseek(fp.?, 0, 2);
    const file_size: c_long = ftell(fp.?);
    _ = fseek(fp.?, 0, 0);

    if (file_size <= 0) return error.FailedToOpenPdf;

    const pdf_bytes = try allocator.alloc(u8, @intCast(file_size));
    defer allocator.free(pdf_bytes);

    const bytes_read = fread(pdf_bytes.ptr, 1, @intCast(file_size), fp.?);
    if (bytes_read != @as(usize, @intCast(file_size))) return error.FailedToOpenPdf;

    const doc = FPDF_LoadMemDocument(pdf_bytes.ptr, @intCast(pdf_bytes.len), null);
    if (doc == null) return error.FailedToOpenPdf;
    defer FPDF_CloseDocument(doc);

    const page_count = FPDF_GetPageCount(doc);
    const page_idx: c_int = if (target_page_arg) |p| if (p >= 1 and p <= page_count) p - 1 else 0 else 0;

    const page = FPDF_LoadPage(doc, page_idx);
    if (page == null) return error.FailedToOpenPdf;
    defer FPDF_ClosePage(page);

    var pt_width = FPDF_GetPageWidth(page);
    var pt_height = FPDF_GetPageHeight(page);
    if (pt_width <= 0) pt_width = 600.0;
    if (pt_height <= 0) pt_height = 800.0;

    const last_slash = std.mem.lastIndexOfScalar(u8, normalized_path, '\\');
    const filename = if (last_slash) |idx| normalized_path[idx + 1 ..] else normalized_path;
    const last_dot = std.mem.lastIndexOfScalar(u8, filename, '.');
    const base_name = if (last_dot) |idx| filename[0..idx] else filename;
    const parent_dir = if (last_slash) |idx| normalized_path[0..idx] else ".";

    const package_dir = try std.fmt.allocPrint(allocator, "{s}\\{s}_ai_package", .{ parent_dir, base_name });
    defer allocator.free(package_dir);

    // Create package dir if not exists
    var w_pkg_buf: [1024]u16 = undefined;
    const w_pkg_len = win32_dir.MultiByteToWideChar(65001, 0, package_dir.ptr, @intCast(package_dir.len), &w_pkg_buf, @intCast(w_pkg_buf.len - 1));
    if (w_pkg_len > 0) {
        w_pkg_buf[@intCast(w_pkg_len)] = 0;
        _ = win32_dir.CreateDirectoryW(@ptrCast(&w_pkg_buf), null);
    }

    const preview_filename = try std.fmt.allocPrint(allocator, "page_{d}_preview.png", .{page_idx + 1});
    defer allocator.free(preview_filename);
    const preview_path = try std.fmt.allocPrint(allocator, "{s}\\{s}", .{ package_dir, preview_filename });
    defer allocator.free(preview_path);

    const render_w: c_int = 1400;
    const render_h_f = (pt_height / pt_width) * @as(f64, @floatFromInt(render_w));
    const render_h: c_int = if (render_h_f > 0) @intCast(@as(i64, @intFromFloat(render_h_f))) else render_w;

    // Render preview bitmap to disk for the marking canvas
    const preview_bitmap = FPDFBitmap_Create(render_w, render_h, 0);
    if (preview_bitmap) |bmp| {
        defer FPDFBitmap_Destroy(bmp);
        FPDFBitmap_FillRect(bmp, 0, 0, render_w, render_h, 0xFFFFFFFF);
        FPDF_RenderPageBitmap(bmp, page, 0, 0, render_w, render_h, 0, FPDF_ANNOT);

        const raw_buf = FPDFBitmap_GetBuffer(bmp);
        const stride = FPDFBitmap_GetStride(bmp);
        if (raw_buf != null and stride > 0) {
            const src_bytes: [*]const u8 = @ptrCast(raw_buf.?);
            const total_pixels: usize = @intCast(render_w * render_h);
            var rgb_data = try allocator.alloc(u8, total_pixels * 3);
            defer allocator.free(rgb_data);

            var y: usize = 0;
            while (y < @as(usize, @intCast(render_h))) : (y += 1) {
                const s_row = y * @as(usize, @intCast(stride));
                const d_row = y * @as(usize, @intCast(render_w)) * 3;
                var x: usize = 0;
                while (x < @as(usize, @intCast(render_w))) : (x += 1) {
                    const s_idx = s_row + x * 4;
                    const d_idx = d_row + x * 3;
                    rgb_data[d_idx + 0] = src_bytes[s_idx + 2];
                    rgb_data[d_idx + 1] = src_bytes[s_idx + 1];
                    rgb_data[d_idx + 2] = src_bytes[s_idx + 0];
                }
            }
            const prev_z = try allocator.dupeZ(u8, preview_path);
            defer allocator.free(prev_z);
            _ = stbi_write_png(prev_z.ptr, render_w, render_h, 3, rgb_data.ptr, render_w * 3);
        }
    }

    var json_buf = Buffer.init(allocator);

    try json_buf.print(
        \\{{
        \\  "success": true,
        \\  "page": {d},
        \\  "total_pages": {d},
        \\  "canvas_width_pt": {d:.1},
        \\  "canvas_height_pt": {d:.1},
        \\  "preview_image_path": {f},
        \\  "components": [
        \\
    , .{ page_idx + 1, page_count, pt_width, pt_height, std.json.fmt(preview_path, .{}) });

    var comp_count: usize = 0;

    // 1. Text components
    const text_page = FPDFText_LoadPage(page);
    if (text_page) |tp| {
        defer FPDFText_ClosePage(tp);
        const total_chars = FPDFText_CountChars(tp);
        if (total_chars > 0) {
            const rect_count = FPDFText_CountRects(tp, 0, total_chars);
            var r_idx: c_int = 0;
            while (r_idx < rect_count) : (r_idx += 1) {
                var rx0: f64 = 0;
                var ry0: f64 = 0;
                var rx1: f64 = 0;
                var ry1: f64 = 0;
                if (FPDFText_GetRect(tp, r_idx, &rx0, &ry0, &rx1, &ry1) != 0) {
                    const buf_len = FPDFText_GetBoundedText(tp, rx0, ry0, rx1, ry1, null, 0);
                    if (buf_len > 0) {
                        const wbuf = try allocator.alloc(u16, @intCast(buf_len + 1));
                        defer allocator.free(wbuf);
                        const actual_read = FPDFText_GetBoundedText(tp, rx0, ry0, rx1, ry1, wbuf.ptr, buf_len);
                        wbuf[@intCast(actual_read)] = 0;

                        var utf8_list = std.ArrayList(u8).empty;
                        defer utf8_list.deinit(allocator);

                        for (wbuf[0..@intCast(actual_read)]) |u_code| {
                            if (u_code == 0) break;
                            var char_bytes: [4]u8 = undefined;
                            const char_len = std.unicode.utf8Encode(@intCast(u_code), &char_bytes) catch 0;
                            if (char_len > 0) {
                                try utf8_list.appendSlice(allocator, char_bytes[0..char_len]);
                            }
                        }

                        const trimmed = std.mem.trim(u8, utf8_list.items, " \r\n\t\x00");
                        if (trimmed.len > 0) {
                            const center_x = (rx0 + rx1) * 0.5;
                            const center_y = (ry0 + ry1) * 0.5;
                            var font_size: f64 = 10.5;
                            var is_bold: bool = false;
                            var r_val: c_uint = 21;
                            var g_val: c_uint = 21;
                            var b_val: c_uint = 21;

                            const char_i = FPDFText_GetCharIndexAtPos(tp, center_x, center_y, 8.0, 8.0);
                            if (char_i >= 0 and char_i < total_chars) {
                                const fs_cand = FPDFText_GetFontSize(tp, char_i);
                                if (fs_cand > 0) font_size = fs_cand;
                                const fw = FPDFText_GetFontWeight(tp, char_i);
                                if (fw >= 700) is_bold = true;
                                var a_val: c_uint = 21;
                                _ = FPDFText_GetFillColor(tp, char_i, &r_val, &g_val, &b_val, &a_val);
                            }

                            const hex_color = try std.fmt.allocPrint(allocator, "#{x:0>2}{x:0>2}{x:0>2}", .{ r_val, g_val, b_val });
                            defer allocator.free(hex_color);

                            const y_a = pt_height - ry0;
                            const y_b = pt_height - ry1;
                            const top_y = @min(y_a, y_b);
                            const bottom_y = @max(y_a, y_b);

                            if (comp_count > 0) try json_buf.print(",\n", .{});
                            comp_count += 1;

                            try json_buf.print(
                                \\    {{
                                \\      "id": "text_{d}",
                                \\      "type": "text",
                                \\      "bbox": [{d:.1}, {d:.1}, {d:.1}, {d:.1}],
                                \\      "text_content": {f},
                                \\      "font_size": {d:.1},
                                \\      "bold": {s},
                                \\      "color": {f}
                                \\    }}
                            , .{
                                comp_count,
                                rx0,
                                top_y,
                                rx1,
                                bottom_y,
                                std.json.fmt(trimmed, .{}),
                                font_size,
                                if (is_bold) "true" else "false",
                                std.json.fmt(hex_color, .{}),
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. Image and Vector Path components (Recursive Form XObject & Shape Collector)
    const ComponentObjCollector = struct {
        fn collect(obj_handle: FPDF_PAGEOBJECT, img_list: *std.ArrayList(FPDF_PAGEOBJECT), path_list: *std.ArrayList(FPDF_PAGEOBJECT), alloc: std.mem.Allocator) void {
            if (obj_handle == null) return;
            const obj_type = FPDFPageObj_GetType(obj_handle);
            if (obj_type == FPDF_PAGEOBJ_IMAGE) {
                img_list.append(alloc, obj_handle) catch {};
            } else if (obj_type == FPDF_PAGEOBJ_PATH) {
                path_list.append(alloc, obj_handle) catch {};
            } else if (obj_type == FPDF_PAGEOBJ_FORM) {
                // Form object (e.g. grouped vector logo like WhatsApp icon or GSK logo)
                path_list.append(alloc, obj_handle) catch {};
                const child_count = FPDFFormObj_CountObjects(obj_handle);
                if (child_count > 0) {
                    var ci: c_ulong = 0;
                    while (ci < @as(c_ulong, @intCast(child_count))) : (ci += 1) {
                        const child = FPDFFormObj_GetObject(obj_handle, ci);
                        if (child != null) {
                            collect(child, img_list, path_list, alloc);
                        }
                    }
                }
            } else if (obj_type != 1) { // Any other visual graphics (Shading, etc.)
                path_list.append(alloc, obj_handle) catch {};
            }
        }
    };

    var all_img_objs = std.ArrayList(FPDF_PAGEOBJECT).empty;
    defer all_img_objs.deinit(allocator);
    var all_path_objs = std.ArrayList(FPDF_PAGEOBJECT).empty;
    defer all_path_objs.deinit(allocator);

    const obj_count = FPDFPage_CountObjects(page);
    var obj_i: c_int = 0;
    while (obj_i < obj_count) : (obj_i += 1) {
        const root_obj = FPDFPage_GetObject(page, obj_i);
        ComponentObjCollector.collect(root_obj, &all_img_objs, &all_path_objs, allocator);
    }

    // Images
    for (all_img_objs.items) |obj| {
        var l: f32 = 0;
        var b: f32 = 0;
        var r: f32 = 0;
        var t: f32 = 0;
        if (FPDFPageObj_GetBounds(obj, &l, &b, &r, &t) != 0) {
            const y_a = pt_height - @as(f64, @floatCast(b));
            const y_b = pt_height - @as(f64, @floatCast(t));
            const top_y = @min(y_a, y_b);
            const bottom_y = @max(y_a, y_b);
            const left_x = @as(f64, @floatCast(l));
            const right_x = @as(f64, @floatCast(r));
            const w = right_x - left_x;
            const h = bottom_y - top_y;

            if (w < 0.2 or h < 0.2) continue;
            if (w >= pt_width * 0.98 and h >= pt_height * 0.98) continue;

            if (comp_count > 0) try json_buf.print(",\n", .{});
            comp_count += 1;

            try json_buf.print(
                \\    {{
                \\      "id": "img_{d}",
                \\      "type": "image",
                \\      "bbox": [{d:.2}, {d:.2}, {d:.2}, {d:.2}],
                \\      "image_width": {d},
                \\      "image_height": {d}
                \\    }}
            , .{
                comp_count,
                left_x,
                top_y,
                right_x,
                bottom_y,
                @as(i32, @intFromFloat(@max(1, w))),
                @as(i32, @intFromFloat(@max(1, h))),
            });
        }
    }

    // Vector Paths & Shapes (including GSK logo, icons, badges)
    for (all_path_objs.items) |obj| {
        var l: f32 = 0;
        var b: f32 = 0;
        var r: f32 = 0;
        var t: f32 = 0;
        if (FPDFPageObj_GetBounds(obj, &l, &b, &r, &t) != 0) {
            const y_a = pt_height - @as(f64, @floatCast(b));
            const y_b = pt_height - @as(f64, @floatCast(t));
            const top_y = @min(y_a, y_b);
            const bottom_y = @max(y_a, y_b);
            const left_x = @as(f64, @floatCast(l));
            const right_x = @as(f64, @floatCast(r));
            const w = right_x - left_x;
            const h = bottom_y - top_y;

            if (w < 0.2 or h < 0.2) continue;
            if (w >= pt_width * 0.98 and h >= pt_height * 0.98) continue;

            var r_val: c_uint = 255;
            var g_val: c_uint = 255;
            var b_val: c_uint = 255;
            var a_val: c_uint = 255;
            var fill_hex_opt: ?[]const u8 = null;
            if (FPDFPageObj_GetFillColor(obj, &r_val, &g_val, &b_val, &a_val) != 0 and a_val > 0) {
                fill_hex_opt = try std.fmt.allocPrint(allocator, "#{x:0>2}{x:0>2}{x:0>2}", .{ r_val, g_val, b_val });
            }
            defer if (fill_hex_opt) |fh| allocator.free(fh);

            if (comp_count > 0) try json_buf.print(",\n", .{});
            comp_count += 1;

            try json_buf.print(
                \\    {{
                \\      "id": "path_{d}",
                \\      "type": "path",
                \\      "bbox": [{d:.2}, {d:.2}, {d:.2}, {d:.2}],
                \\      "fill_color": {s}
                \\    }}
            , .{
                comp_count,
                left_x,
                top_y,
                right_x,
                bottom_y,
                if (fill_hex_opt) |fh| try std.fmt.allocPrint(allocator, "\"{s}\"", .{fh}) else "null",
            });
        }
    }

    try json_buf.print("\n  ]\n}}\n", .{});
    return json_buf.data.items;
}

pub fn renderRegionPreview(
    allocator: std.mem.Allocator,
    pdf_path: []const u8,
    target_page_arg: ?i32,
    bounds: [4]f64,
    transparent: bool,
    target_w_arg: ?i32,
) ![]const u8 {
    initPdfEngine();

    var normalized_path = try allocator.dupe(u8, pdf_path);
    defer allocator.free(normalized_path);
    for (normalized_path) |*b| {
        if (b.* == '/') b.* = '\\';
    }

    const win32_dir = struct {
        extern "kernel32" fn CreateDirectoryW(lpPathName: [*:0]const u16, lpSecurityAttributes: ?*anyopaque) callconv(.winapi) c_int;
        extern "kernel32" fn MultiByteToWideChar(CodePage: u32, dwFlags: u32, lpMultiByteStr: [*]const u8, cbMultiByte: c_int, lpWideCharStr: ?[*]u16, cchWideChar: c_int) callconv(.winapi) c_int;
    };

    var w_pdf_buf: [2048]u16 = undefined;
    const w_pdf_len = win32_dir.MultiByteToWideChar(65001, 0, normalized_path.ptr, @intCast(normalized_path.len), &w_pdf_buf, @intCast(w_pdf_buf.len - 1));
    if (w_pdf_len <= 0) return error.FailedToOpenPdf;
    w_pdf_buf[@intCast(w_pdf_len)] = 0;

    const mode_rb: [3:0]u16 = .{ 'r', 'b', 0 };
    const fp = _wfopen(@ptrCast(&w_pdf_buf), &mode_rb);
    if (fp == null) return error.FailedToOpenPdf;
    defer _ = fclose(fp.?);

    _ = fseek(fp.?, 0, 2);
    const file_size: c_long = ftell(fp.?);
    _ = fseek(fp.?, 0, 0);
    if (file_size <= 0) return error.FailedToOpenPdf;

    const pdf_bytes = try allocator.alloc(u8, @intCast(file_size));
    defer allocator.free(pdf_bytes);
    const bytes_read = fread(pdf_bytes.ptr, 1, @intCast(file_size), fp.?);
    if (bytes_read != @as(usize, @intCast(file_size))) return error.FailedToOpenPdf;

    const doc = FPDF_LoadMemDocument(pdf_bytes.ptr, @intCast(pdf_bytes.len), null);
    if (doc == null) return error.FailedToOpenPdf;
    defer FPDF_CloseDocument(doc);

    const page_count = FPDF_GetPageCount(doc);
    const page_idx: c_int = if (target_page_arg) |p| if (p >= 1 and p <= page_count) p - 1 else 0 else 0;

    const page = FPDF_LoadPage(doc, page_idx);
    if (page == null) return error.FailedToOpenPdf;
    defer FPDF_ClosePage(page);

    var pt_width = FPDF_GetPageWidth(page);
    var pt_height = FPDF_GetPageHeight(page);
    if (pt_width <= 0) pt_width = 600.0;
    if (pt_height <= 0) pt_height = 800.0;

    const req_width: i32 = if (target_w_arg) |tw| if (tw > 0) tw else 700 else 700;
    const render_w: c_int = @intCast(@as(i64, @intFromFloat(@as(f64, @floatFromInt(req_width)) * 2.0)));
    const render_h_f = (pt_height / pt_width) * @as(f64, @floatFromInt(render_w));
    const render_h: c_int = if (render_h_f > 0) @intCast(@as(i64, @intFromFloat(render_h_f))) else render_w;

    const scale_x = @as(f64, @floatFromInt(render_w)) / pt_width;
    const scale_y = @as(f64, @floatFromInt(render_h)) / pt_height;

    const mark_l = @max(0.0, @min(pt_width, bounds[0]));
    const mark_t = @max(0.0, @min(pt_height, bounds[1]));
    const mark_r = @max(mark_l + 1.0, @min(pt_width, bounds[2]));
    const mark_b = @max(mark_t + 1.0, @min(pt_height, bounds[3]));
    const mark_w_pt = mark_r - mark_l;
    const mark_h_pt = mark_b - mark_t;

    const crop_x = @as(c_int, @intFromFloat(mark_l * scale_x));
    const crop_y = @as(c_int, @intFromFloat(mark_t * scale_y));
    const crop_w = @max(2, @as(c_int, @intFromFloat(mark_w_pt * scale_x)));
    const crop_h = @max(2, @as(c_int, @intFromFloat(mark_h_pt * scale_y)));

    const last_slash = std.mem.lastIndexOfScalar(u8, normalized_path, '\\');
    const filename = if (last_slash) |idx| normalized_path[idx + 1 ..] else normalized_path;
    const last_dot = std.mem.lastIndexOfScalar(u8, filename, '.');
    const base_name = if (last_dot) |idx| filename[0..idx] else filename;
    const parent_dir = if (last_slash) |idx| normalized_path[0..idx] else ".";

    const package_dir = try std.fmt.allocPrint(allocator, "{s}\\{s}_ai_package", .{ parent_dir, base_name });
    defer allocator.free(package_dir);
    const previews_dir = try std.fmt.allocPrint(allocator, "{s}\\previews", .{package_dir});
    defer allocator.free(previews_dir);

    // Create directories
    {
        var w_buf: [1024]u16 = undefined;
        const w_len1 = win32_dir.MultiByteToWideChar(65001, 0, package_dir.ptr, @intCast(package_dir.len), &w_buf, @intCast(w_buf.len - 1));
        if (w_len1 > 0) {
            w_buf[@intCast(w_len1)] = 0;
            _ = win32_dir.CreateDirectoryW(@ptrCast(&w_buf), null);
        }
        const w_len2 = win32_dir.MultiByteToWideChar(65001, 0, previews_dir.ptr, @intCast(previews_dir.len), &w_buf, @intCast(w_buf.len - 1));
        if (w_len2 > 0) {
            w_buf[@intCast(w_len2)] = 0;
            _ = win32_dir.CreateDirectoryW(@ptrCast(&w_buf), null);
        }
    }

    const preview_fn = try std.fmt.allocPrint(allocator, "preview_{d}_{d}_{d}_{d}_{s}.png", .{
        @as(i32, @intFromFloat(mark_l)),
        @as(i32, @intFromFloat(mark_t)),
        @as(i32, @intFromFloat(mark_r)),
        @as(i32, @intFromFloat(mark_b)),
        if (transparent) "trans" else "solid",
    });
    defer allocator.free(preview_fn);
    const preview_path = try std.fmt.allocPrint(allocator, "{s}\\{s}", .{ previews_dir, preview_fn });
    defer allocator.free(preview_path);

    const bmp = FPDFBitmap_Create(crop_w, crop_h, if (transparent) 1 else 0);
    if (bmp == null) return error.FailedToOpenPdf;
    defer FPDFBitmap_Destroy(bmp.?);

    FPDFBitmap_FillRect(bmp.?, 0, 0, crop_w, crop_h, if (transparent) 0x00000000 else 0xFFFFFFFF);
    FPDF_RenderPageBitmap(bmp.?, page, -crop_x, -crop_y, render_w, render_h, 0, FPDF_ANNOT);

    const raw_buf = FPDFBitmap_GetBuffer(bmp.?);
    const stride = FPDFBitmap_GetStride(bmp.?);
    if (raw_buf == null or stride <= 0) return error.FailedToOpenPdf;

    const src_bytes: [*]const u8 = @ptrCast(raw_buf.?);
    const total_pixels: usize = @intCast(crop_w * crop_h);

    if (transparent) {
        var rgba_data = try allocator.alloc(u8, total_pixels * 4);
        defer allocator.free(rgba_data);

        var iy: usize = 0;
        while (iy < @as(usize, @intCast(crop_h))) : (iy += 1) {
            const s_row = iy * @as(usize, @intCast(stride));
            const d_row = iy * @as(usize, @intCast(crop_w)) * 4;
            var ix: usize = 0;
            while (ix < @as(usize, @intCast(crop_w))) : (ix += 1) {
                const sidx = s_row + ix * 4;
                const didx = d_row + ix * 4;
                rgba_data[didx + 0] = src_bytes[sidx + 2];
                rgba_data[didx + 1] = src_bytes[sidx + 1];
                rgba_data[didx + 2] = src_bytes[sidx + 0];
                rgba_data[didx + 3] = src_bytes[sidx + 3];
            }
        }
        const prev_z = try allocator.dupeZ(u8, preview_path);
        defer allocator.free(prev_z);
        _ = stbi_write_png(prev_z.ptr, crop_w, crop_h, 4, rgba_data.ptr, crop_w * 4);
    } else {
        var rgb_data = try allocator.alloc(u8, total_pixels * 3);
        defer allocator.free(rgb_data);

        var iy: usize = 0;
        while (iy < @as(usize, @intCast(crop_h))) : (iy += 1) {
            const s_row = iy * @as(usize, @intCast(stride));
            const d_row = iy * @as(usize, @intCast(crop_w)) * 3;
            var ix: usize = 0;
            while (ix < @as(usize, @intCast(crop_w))) : (ix += 1) {
                const sidx = s_row + ix * 4;
                const didx = d_row + ix * 3;
                rgb_data[didx + 0] = src_bytes[sidx + 2];
                rgb_data[didx + 1] = src_bytes[sidx + 1];
                rgb_data[didx + 2] = src_bytes[sidx + 0];
            }
        }
        const prev_z = try allocator.dupeZ(u8, preview_path);
        defer allocator.free(prev_z);
        _ = stbi_write_png(prev_z.ptr, crop_w, crop_h, 3, rgb_data.ptr, crop_w * 3);
    }

    const res_json = try std.fmt.allocPrint(allocator, "{{\"success\":true,\"preview_path\":{f},\"width\":{d},\"height\":{d}}}", .{
        std.json.fmt(preview_path, .{}),
        crop_w,
        crop_h,
    });
    return res_json;
}
