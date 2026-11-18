#ifndef HDRBLOCK_H
#define HDRBLOCK_H

/* Option bits for hb_parse; combine with bitwise OR. */
#define HB_UNFOLD        0x1  /* lines starting with space/tab continue the previous header */
#define HB_MERGE_REPEATS 0x2  /* a repeated name is joined onto the first one with ", " */
#define HB_STRICT_NAMES  0x4  /* names may only contain letters, digits and '-' */

/* Status values returned by hb_parse. */
#define HB_OK            0
#define HB_ERR_SYNTAX   -1
#define HB_ERR_REPEAT   -2
#define HB_ERR_TOO_LONG -3
#define HB_ERR_NOMEM    -4

/* Status values returned by hb_get_int. */
#define HB_INT_OK          0
#define HB_INT_MISSING    -1
#define HB_INT_NOT_NUMBER -2
#define HB_INT_RANGE      -3

#define HB_NAME_MAX  32   /* bytes including the NUL */
#define HB_VALUE_MAX 64   /* bytes including the NUL */

typedef struct hb hb_t;

/* Reads a header block of "Name: value" lines and stops at the first blank line;
 * whatever follows that line is ignored. Returns a status value. On HB_OK the new
 * handle is stored in *out. On any other status *out is left alone and, if
 * bad_line is non-NULL, it receives the 1-based number of the offending line. */
int hb_parse(const char *text, int flags, hb_t **out, int *bad_line);

/* Looks up name, ignoring ASCII case, and returns its value or NULL when there
 * is none. The returned pointer lives until hb_free. */
const char *hb_get(const hb_t *h, const char *name);

/* Name of the header at position idx (first-seen order), or NULL if idx is not a
 * valid position. A name keeps the spelling used where it first appeared. */
const char *hb_name_at(const hb_t *h, int idx);

/* Converts the value of name from base-10 text into *out. */
int hb_get_int(const hb_t *h, const char *name, int *out);

/* How many distinct names the block holds. */
int hb_count(const hb_t *h);

void hb_free(hb_t *h);

#endif
