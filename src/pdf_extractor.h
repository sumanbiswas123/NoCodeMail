#pragma once
#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    int success;
    int total_pages;
    int total_text_blocks;
    int total_images;
    int total_links;
    int total_tables;
    int total_styles;
    char package_dir[512];
    char json_path[512];
    char preview_image_path[512];
    char preview_image_filename[128];
    char error_msg[512];
} PDFExtractionResult;

void pdf_engine_init(void);
void pdf_engine_destroy(void);

void pdf_extract_package(
    const char* pdf_path,
    const char* output_dir,
    int target_email_width,
    PDFExtractionResult* res_out
);

#ifdef __cplusplus
}
#endif
