#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shobjidl.h>
#include <shlobj.h>
#include <wchar.h>

extern "C" int pickFolderNative(wchar_t* outPath, int maxLen) {
    if (!outPath || maxLen <= 0) return 0;
    outPath[0] = 0;

    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
    bool needUninit = SUCCEEDED(hr);

    IFileOpenDialog *pFileOpen = NULL;
    hr = CoCreateInstance(CLSID_FileOpenDialog, NULL, CLSCTX_ALL, IID_IFileOpenDialog, reinterpret_cast<void**>(&pFileOpen));
    if (SUCCEEDED(hr) && pFileOpen) {
        FILEOPENDIALOGOPTIONS dwOptions = 0;
        if (SUCCEEDED(pFileOpen->GetOptions(&dwOptions))) {
            pFileOpen->SetOptions(dwOptions | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM);
        }
        pFileOpen->SetTitle(L"Select NoCodeMail Project Folder");

        hr = pFileOpen->Show(NULL);
        if (SUCCEEDED(hr)) {
            IShellItem *pItem = NULL;
            hr = pFileOpen->GetResult(&pItem);
            if (SUCCEEDED(hr) && pItem) {
                PWSTR pszFilePath = NULL;
                hr = pItem->GetDisplayName(SIGDN_FILESYSPATH, &pszFilePath);
                if (SUCCEEDED(hr) && pszFilePath) {
                    wcsncpy(outPath, pszFilePath, maxLen - 1);
                    outPath[maxLen - 1] = 0;
                    CoTaskMemFree(pszFilePath);
                    pItem->Release();
                    pFileOpen->Release();
                    if (needUninit) CoUninitialize();
                    return 1;
                }
                pItem->Release();
            }
        }
        pFileOpen->Release();
    } else {
        // Fallback to SHBrowseForFolderW
        BROWSEINFOW bi = { 0 };
        bi.ulFlags = BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE | BIF_USENEWUI;
        bi.lpszTitle = L"Select NoCodeMail Project Folder";
        PIDLIST_ABSOLUTE pidl = SHBrowseForFolderW(&bi);
        if (pidl) {
            BOOL res = SHGetPathFromIDListW(pidl, outPath);
            CoTaskMemFree(pidl);
            if (needUninit) CoUninitialize();
            return res ? 1 : 0;
        }
    }

    if (needUninit) CoUninitialize();
    return 0;
}
