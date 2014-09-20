#include <memory>

#include <stdlib.h>

class StupidClass {
    int nothing[32];
};

int main(void) {
    void *mem1 = malloc(100);
    void *mem2;

    {
        std::unique_ptr<StupidClass> stupid(new StupidClass());
        mem2 = malloc(30);
    }

    free(mem1);
    free(mem2);

    return 0;
}
