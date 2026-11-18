#include "hdrblock.h"

#include <errno.h>
#include <limits.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char name[HB_NAME_MAX];
    char value[HB_VALUE_MAX];
} field_t;

struct hb {
    field_t *slots;
    int count;
    int cap;
};

static int is_ows(char c) {
    return c == ' ' || c == '\t';
}

static char lower(char c) {
    return (c >= 'A' && c <= 'Z') ? (char)(c + 32) : c;
}

static int names_equal(const char *a, const char *b) {
    while (*a && *b) {
        if (lower(*a) != lower(*b)) {
            return 0;
        }
        a++;
        b++;
    }
    return *a == *b;
}

static int locate(const hb_t *h, const char *name) {
    for (int i = 0; i < h->count; i++) {
        if (names_equal(h->slots[i].name, name)) {
            return i;
        }
    }
    return -1;
}

static int name_ok(const char *s, size_t len, int strict) {
    for (size_t i = 0; i < len; i++) {
        char c = s[i];
        if (is_ows(c)) {
            return 0;
        }
        if (strict) {
            int alnum = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
            if (!alnum && c != '-') {
                return 0;
            }
        }
    }
    return 1;
}

/* Adds text[0..len) onto the end of a field's value, putting sep between old and
 * new text only when both are non-empty. Gives HB_OK, or HB_ERR_TOO_LONG if the
 * result would not fit. */
static int append_value(field_t *e, const char *sep, const char *text, size_t len) {
    if (len == 0) {
        return HB_OK;
    }
    size_t have = strlen(e->value);
    size_t sep_len = have > 0 ? strlen(sep) : 0;
    if (have + sep_len + len >= HB_VALUE_MAX) {
        return HB_ERR_TOO_LONG;
    }
    memcpy(e->value + have, sep, sep_len);
    memcpy(e->value + have + sep_len, text, len);
    e->value[have + sep_len + len] = '\0';
    return HB_OK;
}

static field_t *grow_one(hb_t *h) {
    if (h->count == h->cap) {
        int ncap = h->cap ? h->cap * 2 : 4;
        field_t *n = realloc(h->slots, (size_t)ncap * sizeof(field_t));
        if (!n) {
            return NULL;
        }
        h->slots = n;
        h->cap = ncap;
    }
    field_t *e = &h->slots[h->count++];
    e->name[0] = '\0';
    e->value[0] = '\0';
    return e;
}

static int reject(hb_t *h, int status, int line, int *bad_line) {
    if (bad_line) {
        *bad_line = line;
    }
    hb_free(h);
    return status;
}

int hb_parse(const char *text, int flags, hb_t **out, int *bad_line) {
    hb_t *h = calloc(1, sizeof *h);
    if (!h) {
        if (bad_line) {
            *bad_line = 0;
        }
        return HB_ERR_NOMEM;
    }
    int last = -1; /* slot that a folded continuation line appends to */
    int line_no = 0;
    const char *p = text;
    while (*p) {
        const char *nl = strchr(p, '\n');
        size_t len = nl ? (size_t)(nl - p) : strlen(p);
        const char *next = nl ? nl + 1 : p + len;
        line_no++;
        if (len > 0 && p[len - 1] == '\r') {
            len--;
        }
        if (len == 0) {
            break;
        }
        if (is_ows(p[0])) {
            if (!(flags & HB_UNFOLD) || last < 0) {
                return reject(h, HB_ERR_SYNTAX, line_no, bad_line);
            }
            size_t s = 0;
            while (s < len && is_ows(p[s])) {
                s++;
            }
            size_t e = len;
            while (e > s && is_ows(p[e - 1])) {
                e--;
            }
            if (append_value(&h->slots[last], " ", p + s, e - s) != HB_OK) {
                return reject(h, HB_ERR_TOO_LONG, line_no, bad_line);
            }
            p = next;
            continue;
        }
        const char *colon = memchr(p, ':', len);
        if (!colon || colon == p) {
            return reject(h, HB_ERR_SYNTAX, line_no, bad_line);
        }
        size_t name_len = (size_t)(colon - p);
        if (!name_ok(p, name_len, flags & HB_STRICT_NAMES)) {
            return reject(h, HB_ERR_SYNTAX, line_no, bad_line);
        }
        if (name_len >= HB_NAME_MAX) {
            return reject(h, HB_ERR_TOO_LONG, line_no, bad_line);
        }
        const char *v = colon + 1;
        const char *vend = p + len;
        while (v < vend && is_ows(*v)) {
            v++;
        }
        while (vend > v && is_ows(vend[-1])) {
            vend--;
        }
        char name[HB_NAME_MAX];
        memcpy(name, p, name_len);
        name[name_len] = '\0';
        int idx = locate(h, name);
        if (idx >= 0) {
            if (!(flags & HB_MERGE_REPEATS)) {
                return reject(h, HB_ERR_REPEAT, line_no, bad_line);
            }
            if (append_value(&h->slots[idx], ", ", v, (size_t)(vend - v)) != HB_OK) {
                return reject(h, HB_ERR_TOO_LONG, line_no, bad_line);
            }
        } else {
            field_t *e = grow_one(h);
            if (!e) {
                return reject(h, HB_ERR_NOMEM, line_no, bad_line);
            }
            idx = h->count - 1;
            memcpy(e->name, name, name_len + 1);
            if (append_value(e, "", v, (size_t)(vend - v)) != HB_OK) {
                return reject(h, HB_ERR_TOO_LONG, line_no, bad_line);
            }
        }
        last = idx;
        p = next;
    }
    *out = h;
    return HB_OK;
}

const char *hb_get(const hb_t *h, const char *name) {
    int i = locate(h, name);
    return i < 0 ? NULL : h->slots[i].value;
}

const char *hb_name_at(const hb_t *h, int idx) {
    if (idx < 0 || idx >= h->count) {
        return NULL;
    }
    return h->slots[idx].name;
}

int hb_get_int(const hb_t *h, const char *name, int *out) {
    const char *s = hb_get(h, name);
    if (!s) {
        return HB_INT_MISSING;
    }
    char *end = NULL;
    errno = 0;
    long n = strtol(s, &end, 10);
    if (end == s || *end != '\0') {
        return HB_INT_NOT_NUMBER;
    }
    if (errno == ERANGE || n > INT_MAX || n < INT_MIN) {
        return HB_INT_RANGE;
    }
    *out = (int)n;
    return HB_INT_OK;
}

int hb_count(const hb_t *h) {
    return h->count;
}

void hb_free(hb_t *h) {
    if (h) {
        free(h->slots);
        free(h);
    }
}
