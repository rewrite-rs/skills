#include "hdrblock.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

/* Test-side wrapper: returns the handle on success, NULL otherwise, and reports
 * the status and failing line through the optional out-parameters. */
static hb_t *open_block(const char *text, int flags, int *status, int *line) {
    hb_t *h = NULL;
    int bad = 0;
    int st = hb_parse(text, flags, &h, &bad);
    if (status) {
        *status = st;
    }
    if (line) {
        *line = bad;
    }
    return st == HB_OK ? h : NULL;
}

static void test_basic_lookup(void) {
    int status = 99, line = 99;
    hb_t *h = open_block("Host: example.org\r\nContent-Length:  42 \r\nAccept:\r\n\r\nignored: body\r\n",
                       0, &status, &line);
    assert(h && status == HB_OK);
    assert(hb_count(h) == 3);
    assert(strcmp(hb_get(h, "host"), "example.org") == 0);
    assert(strcmp(hb_get(h, "CONTENT-LENGTH"), "42") == 0);
    assert(strcmp(hb_get(h, "Accept"), "") == 0);
    assert(hb_get(h, "ignored") == NULL);
    assert(strcmp(hb_name_at(h, 1), "Content-Length") == 0);
    assert(hb_name_at(h, 3) == NULL && hb_name_at(h, -1) == NULL);
    hb_free(h);
}

static void test_bare_lf_and_final_line(void) {
    hb_t *h = open_block("A: 1\nB: 2\r", 0, NULL, NULL);
    assert(h && hb_count(h) == 2);
    assert(strcmp(hb_get(h, "B"), "2") == 0);
    hb_free(h);
}

static void test_only_space_and_tab_are_trimmed(void) {
    hb_t *h = open_block("K:\t\x0b v \t\n", 0, NULL, NULL);
    assert(h && strcmp(hb_get(h, "K"), "\x0b v") == 0);
    hb_free(h);
}

static void test_get_int(void) {
    hb_t *h = open_block("a: 12x\nb:\nc: -7\nd: 99999999999999999999\ne: +42\nf: 2147483648\ng: 0x10\n",
                       0, NULL, NULL);
    assert(h);
    int n = 123;
    assert(hb_get_int(h, "a", &n) == HB_INT_NOT_NUMBER);
    assert(hb_get_int(h, "b", &n) == HB_INT_NOT_NUMBER);
    assert(hb_get_int(h, "c", &n) == HB_INT_OK && n == -7);
    assert(hb_get_int(h, "d", &n) == HB_INT_RANGE);
    assert(hb_get_int(h, "e", &n) == HB_INT_OK && n == 42);
    assert(hb_get_int(h, "f", &n) == HB_INT_RANGE && n == 42);
    assert(hb_get_int(h, "g", &n) == HB_INT_NOT_NUMBER);
    assert(hb_get_int(h, "zzz", &n) == HB_INT_MISSING);
    hb_free(h);
}

static void test_repeats(void) {
    int status, line;
    assert(open_block("X: 1\nY: 2\nx: 3\n", 0, &status, &line) == NULL);
    assert(status == HB_ERR_REPEAT && line == 3);
    hb_t *h = open_block("Via: a\nvia: b\nVIA:\nVia: c\n", HB_MERGE_REPEATS, &status, &line);
    assert(h && hb_count(h) == 1);
    assert(strcmp(hb_get(h, "via"), "a, b, c") == 0);
    assert(strcmp(hb_name_at(h, 0), "Via") == 0);
    hb_free(h);
    h = open_block("Via:\nVia: only\n", HB_MERGE_REPEATS, NULL, NULL);
    assert(h && strcmp(hb_get(h, "Via"), "only") == 0);
    hb_free(h);
}

static void test_unfold(void) {
    int status, line;
    hb_t *h = open_block("Subject: hello\r\n \t world\r\n   !\r\nTo: me\r\n", HB_UNFOLD, &status, &line);
    assert(h && strcmp(hb_get(h, "Subject"), "hello world !") == 0);
    hb_free(h);
    assert(open_block("A: 1\n b\n", 0, &status, &line) == NULL);
    assert(status == HB_ERR_SYNTAX && line == 2);
    assert(open_block(" lead: 1\n", HB_UNFOLD, &status, &line) == NULL);
    assert(status == HB_ERR_SYNTAX && line == 1);
}

static void test_malformed_lines_rejected(void) {
    int status, line;
    assert(open_block("A: 1\nno colon here\n", 0, &status, &line) == NULL);
    assert(status == HB_ERR_SYNTAX && line == 2);
    assert(open_block(": empty name\n", 0, &status, &line) == NULL && status == HB_ERR_SYNTAX && line == 1);
    assert(open_block("Bad Name: 1\n", 0, &status, &line) == NULL && status == HB_ERR_SYNTAX);
    assert(open_block("Name : 1\n", 0, &status, &line) == NULL && status == HB_ERR_SYNTAX);
    assert(open_block("X_Y: 1\n", HB_STRICT_NAMES, &status, &line) == NULL && status == HB_ERR_SYNTAX);
    hb_t *h = open_block("X_Y: 1\n", 0, NULL, NULL);
    assert(h && strcmp(hb_get(h, "x_y"), "1") == 0);
    hb_free(h);
}

static void test_length_limits(void) {
    int status, line;
    char buf[300];
    memset(buf, 'v', 63);
    buf[63] = '\0';
    char text[400];
    snprintf(text, sizeof text, "A: %s\n", buf);
    hb_t *h = open_block(text, 0, NULL, NULL);
    assert(h && strlen(hb_get(h, "A")) == 63);
    hb_free(h);
    snprintf(text, sizeof text, "A: %sv\nB: 1\n", buf);
    assert(open_block(text, 0, &status, &line) == NULL && status == HB_ERR_TOO_LONG && line == 1);
    snprintf(text, sizeof text, "B: 1\nA: 1\nA: %s\n", buf);
    assert(open_block(text, HB_MERGE_REPEATS, &status, &line) == NULL);
    assert(status == HB_ERR_TOO_LONG && line == 3);
    memset(buf, 'n', 32);
    buf[32] = '\0';
    snprintf(text, sizeof text, "%s: 1\n", buf);
    assert(open_block(text, 0, &status, &line) == NULL && status == HB_ERR_TOO_LONG && line == 1);
}

static void test_zero_length_buffer(void) {
    hb_t *h = open_block("", 0, NULL, NULL);
    assert(h && hb_count(h) == 0 && hb_get(h, "a") == NULL);
    hb_free(h);
    h = open_block("\r\nA: 1\n", 0, NULL, NULL);
    assert(h && hb_count(h) == 0);
    hb_free(h);
}

int main(void) {
    test_basic_lookup();
    test_bare_lf_and_final_line();
    test_only_space_and_tab_are_trimmed();
    test_get_int();
    test_repeats();
    test_unfold();
    test_malformed_lines_rejected();
    test_length_limits();
    test_zero_length_buffer();
    puts("all hdrblock tests passed");
    return 0;
}
