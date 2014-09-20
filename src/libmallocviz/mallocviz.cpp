#define _GNU_SOURCE
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <dlfcn.h>
#include <fcntl.h>
#include <unistd.h>

#include <fstream>

typedef void* (*malloc_t)(size_t);
typedef void* (*realloc_t)(void*, size_t);
typedef void (*free_t)(void*);


/**
 * Don't know how else to get static initialization done except with a class :)
 *
 * Can't use normal stuff here like printf and such because we can't use
 * the memory allocator :)
 */
struct OutputFile
{
    OutputFile()
    {
        m_fhandle = open("malloc.log", O_WRONLY | O_CREAT | O_TRUNC);
    }

    ~OutputFile()
    {
        close(m_fhandle);
    }

    void write_1(const char *header, size_t num)
    {
        if (!m_fhandle) return;

        sprintf(m_numbuffer, "%s %zu\n", header, num);
        write(m_fhandle, m_numbuffer, strlen(m_numbuffer));
    }

    void write_2(const char *header, size_t num1, size_t num2)
    {
        if (!m_fhandle) return;

        sprintf(m_numbuffer, "%s %zu %zu\n", header, num1, num2);
        write(m_fhandle, m_numbuffer, strlen(m_numbuffer));
    }

private:
    int m_fhandle;
    char m_numbuffer[40];
};

static OutputFile g_output;

extern "C" {

void* malloc(size_t size)
{
    static malloc_t real_malloc = NULL;
    if (!real_malloc) real_malloc = (malloc_t)dlsym(RTLD_NEXT, "malloc");

    void *ret = real_malloc(size);

    g_output.write_2("alloc", (size_t)ret, size);

    return ret;
}

void* realloc (void* ptr, size_t size) {
    static realloc_t real_realloc = NULL;
    if (!real_realloc) real_realloc = (realloc_t)dlsym(RTLD_NEXT, "realloc");
    if (!real_realloc) printf("Couldn't load realloc\n");

    void *ret = real_realloc(ptr, size);

    g_output.write_1("free", (size_t)ptr);
    g_output.write_2("alloc", (size_t)ret, size);

    return ret;
}

void free(void *ptr)
{
    static free_t real_free = NULL;
    if (!real_free) real_free = (free_t)dlsym(RTLD_NEXT, "free");
    if (!real_free) printf("Couldn't load free\n");

    g_output.write_1("free", (size_t)ptr);
    real_free(ptr);
}

}
