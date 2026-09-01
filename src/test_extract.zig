const std = @import("std");
const pdf_extractor = @import("pdf_extractor.zig");

// PDFium Types & C API for inspection
pub const FPDF_DOCUMENT = ?*anyopaque;
pub const FPDF_PAGE = ?*anyopaque;
pub const FPDF_PAGEOBJECT = ?*anyopaque;

extern "pdfium" fn FPDF_LoadDocument(file_path: [*:0]const u8, password: ?[*:0]const u8) callconv(.c) FPDF_DOCUMENT;
extern "pdfium" fn FPDF_CloseDocument(document: FPDF_DOCUMENT) callconv(.c) void;
extern "pdfium" fn FPDF_LoadPage(document: FPDF_DOCUMENT, page_index: c_int) callconv(.c) FPDF_PAGE;
extern "pdfium" fn FPDF_ClosePage(page: FPDF_PAGE) callconv(.c) void;
extern "pdfium" fn FPDFPage_CountObjects(page: FPDF_PAGE) callconv(.c) c_int;
extern "pdfium" fn FPDFPage_GetObject(page: FPDF_PAGE, index: c_int) callconv(.c) FPDF_PAGEOBJECT;
extern "pdfium" fn FPDFPageObj_GetType(page_object: FPDF_PAGEOBJECT) callconv(.c) c_int;
extern "pdfium" fn FPDFPageObj_GetBounds(page_object: FPDF_PAGEOBJECT, left: *f32, bottom: *f32, right: *f32, top: *f32) callconv(.c) c_int;
extern "pdfium" fn FPDF_GetPageWidth(page: FPDF_PAGE) callconv(.c) f64;
extern "pdfium" fn FPDF_GetPageHeight(page: FPDF_PAGE) callconv(.c) f64;

extern "pdfium" fn FPDF_PageToDevice(page: FPDF_PAGE, start_x: c_int, start_y: c_int, size_x: c_int, size_y: c_int, rotate: c_int, page_x: f64, page_y: f64, device_x: *c_int, device_y: *c_int) callconv(.c) void;
extern "pdfium" fn FPDF_DeviceToPage(page: FPDF_PAGE, start_x: c_int, start_y: c_int, size_x: c_int, size_y: c_int, rotate: c_int, device_x: c_int, device_y: c_int, page_x: *f64, page_y: *f64) callconv(.c) void;

pub fn main() !void {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    pdf_extractor.initPdfEngine();
    defer pdf_extractor.destroyPdfEngine();

    const pdf_path = "C:\\Users\\SumanBiswas\\Downloads\\PDFs\\cp-488747v2_R0_V1.pdf";
    const win32 = struct {
        extern "kernel32" fn GetTickCount64() callconv(.winapi) u64;
    };
    const t0 = win32.GetTickCount64();
    const res = try pdf_extractor.extractPdfPackage(allocator, pdf_path, 700, 1, null);
    const elapsed_ms = win32.GetTickCount64() - t0;

    std.debug.print("SUCCESS! Completed in {d} ms!\n", .{elapsed_ms});
    std.debug.print("Extracted Images: {d}\n", .{res.total_images});
    std.debug.print("Extracted Text Blocks: {d}\n", .{res.total_text_blocks});
    std.debug.print("Package dir: {s}\n", .{res.package_dir});
}
