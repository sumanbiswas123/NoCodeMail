#include <stdlib.h>
#include <string.h>
int main(int argc, char** argv) {
    char cmd[8192] = "zig dlltool";
    for (int i = 1; i < argc; i++) {
        strcat(cmd, " ");
        strcat(cmd, argv[i]);
    }
    return system(cmd);
}
