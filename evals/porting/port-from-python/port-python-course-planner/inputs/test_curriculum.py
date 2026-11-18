from curriculum import (
    CatalogError, LineError, PrereqCycle, UnknownPrereq, credit_report,
    dependents, parse_catalog, study_order,
)

SAMPLE = """
# fall catalog
MATH1 | intro | 4
CS1 | intro | 4
ART1 | intro
CS2 | core | 3 | CS1
CS3 | core | 3 | CS2, MATH1
SEM | elective | | CS1
CAP | capstone | 6 | CS3, SEM
"""


def raises(exc_type, fn, *args):
    try:
        fn(*args)
    except exc_type as e:
        return e
    raise AssertionError(f"{exc_type.__name__} not raised")


def test_parse_fields_and_order():
    cat = parse_catalog(SAMPLE)
    assert list(cat) == ["MATH1", "CS1", "ART1", "CS2", "CS3", "SEM", "CAP"]
    assert (cat["CS3"].level, cat["CS3"].credits) == ("core", 3)
    assert cat["CS3"].prereqs == ["CS2", "MATH1"]
    assert cat["ART1"].credits is None and cat["SEM"].credits is None
    assert cat["SEM"].prereqs == ["CS1"]


def test_empty_catalog():
    assert parse_catalog("") == {}
    assert parse_catalog("\n# nothing\n\n") == {}
    assert study_order({}) == []
    assert credit_report({}) == {lv: (0, 0) for lv in ("intro", "core", "elective", "capstone")}


def test_line_errors_carry_line_number():
    cases = {
        "A | intro\nbroken": 2,
        "A | seminar": 1,
        "A | intro\nA | core": 2,
        "A-1 | intro": 1,
        "A | intro | lots": 1,
        "A | intro | 0": 1,
        "A | intro | 3 | B | extra": 1,
    }
    for text, line in cases.items():
        assert raises(LineError, parse_catalog, text).row == line, text


def test_error_classes_have_common_parent():
    for cls in (LineError, UnknownPrereq, PrereqCycle):
        assert issubclass(cls, CatalogError)


def test_study_order_sample():
    assert study_order(parse_catalog(SAMPLE)) == ["MATH1", "CS1", "ART1", "CS2", "CS3", "SEM", "CAP"]


def test_ties_keep_catalog_order_not_alphabetical():
    cat = parse_catalog("zed | core | 2\nalpha | core | 2\nmid | core | 2")
    assert study_order(cat) == ["zed", "alpha", "mid"]
    assert study_order(parse_catalog("X | core\nY | core | 1")) == ["Y", "X"]


def test_unknown_prereq():
    err = raises(UnknownPrereq, study_order, parse_catalog("A | intro | 1 | GHOST"))
    assert (err.course, err.prereq) == ("A", "GHOST")


def test_cycle_path_starts_at_first_stuck_course():
    cat = parse_catalog("ROOT | intro | 1\nB | core | 1 | C, ROOT\nC | core | 1 | A\nA | core | 1 | B")
    assert raises(PrereqCycle, study_order, cat).path == ["B", "C", "A", "B"]


def test_cycle_tail_and_self_loop():
    cat = parse_catalog("T | core | 1 | L1\nL1 | core | 1 | L2\nL2 | core | 1 | L1")
    assert raises(PrereqCycle, study_order, cat).path == ["L1", "L2", "L1"]
    assert raises(PrereqCycle, study_order, parse_catalog("A | core | 2 | A")).path == ["A", "A"]


def test_credit_report_lists_every_level_in_order():
    report = credit_report(parse_catalog(SAMPLE))
    assert list(report) == ["intro", "core", "elective", "capstone"]
    assert list(report.values()) == [(3, 8), (2, 6), (1, 0), (1, 6)]


def test_dependents_in_catalog_order():
    cat = parse_catalog(SAMPLE)
    assert dependents(cat, "CS1") == ["CS2", "SEM"]
    assert dependents(cat, "CAP") == [] and dependents(cat, "nope") == []


if __name__ == "__main__":
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_"):
            try:
                fn()
                print("ok  ", name)
            except Exception as e:
                failed += 1
                print("FAIL", name, repr(e))
    raise SystemExit(1 if failed else 0)
