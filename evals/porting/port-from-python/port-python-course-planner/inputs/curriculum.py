"""Study planning over a course catalog.

A catalog is plain text with one course per line and '|' between the fields:

    CODE | level | credits | prereq1, prereq2

Levels, from first to last: intro, core, elective, capstone. The credits field
can be blank or missing; if it holds anything it must be a whole number above
zero. The prerequisite field is optional as well. Empty lines and lines that
begin with '#' do not count.
"""
from collections import namedtuple

LEVELS = ("intro", "core", "elective", "capstone")


class CatalogError(Exception):
    """Common parent of every error raised here."""


class LineError(CatalogError):
    def __init__(self, row, reason):
        super().__init__("line %d: %s" % (row, reason))
        self.row = row
        self.reason = reason


class UnknownPrereq(CatalogError):
    def __init__(self, course, prereq):
        super().__init__("%s requires %s, which is not in the catalog" % (course, prereq))
        self.course = course
        self.prereq = prereq


class PrereqCycle(CatalogError):
    def __init__(self, path):
        super().__init__("prerequisite loop: " + " > ".join(path))
        self.path = path


class Course(namedtuple("Course", "code level credits prereqs")):
    __slots__ = ()

    def __new__(cls, code, level, credits=None, prereqs=None):
        return super().__new__(cls, code, level, credits, list(prereqs or []))


def parse_catalog(text):
    """Builds {code: Course}; insertion order follows the text."""
    catalog = {}
    for idx, raw in enumerate(text.splitlines()):
        row = idx + 1
        line = raw.strip()
        if line == "" or line[0] == "#":
            continue
        fields = [f.strip() for f in line.split("|")]
        if not 2 <= len(fields) <= 4:
            raise LineError(row, "expected 2 to 4 fields")
        code, level = fields[0], fields[1]
        if not code.isalnum():
            raise LineError(row, f"bad course code {code!r}")
        if code in catalog:
            raise LineError(row, f"{code} is listed twice")
        if level not in LEVELS:
            raise LineError(row, f"unknown level {level!r}")
        credits = None
        if len(fields) > 2 and fields[2]:
            try:
                credits = int(fields[2])
            except ValueError:
                raise LineError(row, "credits must be a number")
            if credits < 1:
                raise LineError(row, "credits must be positive")
        prereqs = []
        if len(fields) == 4:
            prereqs = [p.strip() for p in fields[3].split(",") if p.strip()]
        catalog[code] = Course(code, level, credits, prereqs)
    return catalog


def _pick_key(course):
    # Sort key: earlier level wins, then the larger credit count, and a course
    # with no credit figure goes behind those that have one. sorted() is stable,
    # so full ties stay in catalog order.
    return (
        LEVELS.index(course.level),
        course.credits is None,
        -(course.credits or 0),
    )


def study_order(catalog):
    """Lists course codes so that each one follows all of its prerequisites.

    UnknownPrereq is raised when a prerequisite is not a catalog entry;
    PrereqCycle (holding the loop) when the prerequisites feed back on themselves.
    """
    for course in catalog.values():
        for p in course.prereqs:
            if p not in catalog:
                raise UnknownPrereq(course.code, p)
    waiting = {code: set(c.prereqs) for code, c in catalog.items()}
    done = []
    while waiting:
        open_now = [catalog[code] for code, need in waiting.items() if not need]
        if not open_now:
            raise PrereqCycle(_trace_loop(catalog, waiting))
        chosen = sorted(open_now, key=_pick_key)[0]
        done.append(chosen.code)
        del waiting[chosen.code]
        for need in waiting.values():
            need.discard(chosen.code)
    return done


def _trace_loop(catalog, waiting):
    # Start at the earliest blocked course and keep stepping to its first blocked
    # prerequisite; the walk ends when it revisits a course.
    node = next(iter(waiting))
    trail, where = [], {}
    while node not in where:
        where[node] = len(trail)
        trail.append(node)
        node = next(p for p in catalog[node].prereqs if p in waiting)
    return trail[where[node]:] + [node]


def credit_report(catalog):
    """Maps each level, in LEVELS order, to (number of courses, summed credits).
    A missing credit figure is treated as 0."""
    report = {level: (0, 0) for level in LEVELS}
    for course in catalog.values():
        count, total = report[course.level]
        report[course.level] = (count + 1, total + (course.credits or 0))
    return report


def dependents(catalog, code):
    """Codes of the courses naming `code` as a direct prerequisite, in catalog
    order. A code the catalog lacks yields an empty list."""
    return [c.code for c in catalog.values() if code in c.prereqs]
