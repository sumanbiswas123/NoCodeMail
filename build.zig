const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const webview_dep = b.dependency("webview", .{
        .target = target,
        .optimize = optimize,
    });

    const exe = b.addExecutable(.{
        .name = "nocodemail",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    exe.subsystem = .Windows;
    exe.root_module.addImport("webview", webview_dep.module("webview"));

    exe.root_module.addIncludePath(b.path("third_party/webview2"));
    exe.root_module.addIncludePath(b.path("third_party/pdfium/include"));
    exe.root_module.addIncludePath(b.path("third_party"));
    exe.root_module.addIncludePath(b.path("src"));

    exe.root_module.addCSourceFile(.{
        .file = b.path("src/c_stb_image_write.c"),
        .flags = &.{},
    });

    exe.root_module.linkSystemLibrary("ole32", .{});
    exe.root_module.linkSystemLibrary("oleaut32", .{});
    exe.root_module.linkSystemLibrary("user32", .{});
    exe.root_module.linkSystemLibrary("gdi32", .{});
    exe.root_module.linkSystemLibrary("shell32", .{});
    exe.root_module.linkSystemLibrary("shlwapi", .{});
    exe.root_module.linkSystemLibrary("comdlg32", .{});
    exe.root_module.linkSystemLibrary("ws2_32", .{});

    exe.root_module.addWin32ResourceFile(.{ .file = b.path("src/resources.rc") });
    b.installArtifact(exe);

    const run = b.addRunArtifact(exe);
    const run_step = b.step("run", "Run NoCodeMail");
    run_step.dependOn(&run.step);

    const test_exe = b.addExecutable(.{
        .name = "test_extract",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/test_extract.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    test_exe.root_module.addIncludePath(b.path("third_party/pdfium/include"));
    test_exe.root_module.addIncludePath(b.path("third_party"));
    test_exe.root_module.addIncludePath(b.path("src"));
    test_exe.root_module.addCSourceFile(.{
        .file = b.path("src/c_stb_image_write.c"),
        .flags = &.{},
    });
    test_exe.root_module.linkSystemLibrary("ole32", .{});
    test_exe.root_module.linkSystemLibrary("user32", .{});
    test_exe.root_module.linkSystemLibrary("gdi32", .{});
    test_exe.root_module.linkSystemLibrary("shell32", .{});
    test_exe.root_module.linkSystemLibrary("shlwapi", .{});
    test_exe.root_module.linkSystemLibrary("ws2_32", .{});
    test_exe.root_module.link_libc = true;

    const run_test = b.addRunArtifact(test_exe);
    const test_step = b.step("test-extract", "Run test extraction on PDF");
    test_step.dependOn(&run_test.step);
}
