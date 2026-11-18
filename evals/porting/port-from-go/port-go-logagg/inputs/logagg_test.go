package logagg

import (
	"errors"
	"strings"
	"testing"
)

func TestParsers(t *testing.T) {
	tests := []struct {
		name    string
		parser  Parser
		line    string
		want    Entry
		wantErr error
	}{
		{"space full", SpaceParser{}, "WARN api 120 slow query", Entry{"api", LevelWarn, 120, "slow query"}, nil},
		{"space lowercase level", SpaceParser{}, "error db 7", Entry{"db", LevelError, 7, ""}, nil},
		{"space blank", SpaceParser{}, "   ", Entry{}, ErrEmptyLine},
		{"space bad level", SpaceParser{}, "FATAL api 1", Entry{}, ErrBadLevel},
		{"space bad latency", SpaceParser{}, "INFO api fast", Entry{}, ErrBadLatency},
		{"space negative latency", SpaceParser{}, "INFO api -5", Entry{}, ErrBadLatency},
		{"space too few fields", SpaceParser{}, "INFO api", Entry{}, ErrMalformed},
		{"kv full", KVParser{}, "svc=api level=warn ms=120 msg=slow", Entry{"api", LevelWarn, 120, "slow"}, nil},
		{"kv defaults to info and zero ms", KVParser{}, "svc=api", Entry{Service: "api"}, nil},
		{"kv missing svc", KVParser{}, "level=warn ms=3", Entry{}, ErrMalformed},
		{"kv ignores unknown and bare tokens", KVParser{}, "junk svc=db x=1 ms=9", Entry{"db", LevelInfo, 9, ""}, nil},
		{"kv bad level", KVParser{}, "svc=a level=loud", Entry{}, ErrBadLevel},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := tc.parser.Parse(tc.line)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("err = %v, want %v", err, tc.wantErr)
			}
			if got != tc.want {
				t.Fatalf("entry = %+v, want %+v", got, tc.want)
			}
		})
	}
}

var sample = []string{
	"INFO  api 100 ok",
	"WARN  api 250 slow",
	"",
	"ERROR db 40 timeout",
	"INFO  db 41 fine",
	"   ",
	"INFO  auth 10 login",
	"INFO  cache 5 hit",
	"ERROR web 250 boom",
}

func TestAggregateRender(t *testing.T) {
	tests := []struct {
		name string
		cfg  Config
		want string
	}{
		{"zero config uses defaults", Config{}, "total=7 skipped=0 avg=99ms\n" +
			"levels: INFO=4 WARN=1 ERROR=2\n" +
			"api count=2 avg=175ms err=0%\n" +
			"db count=2 avg=40ms err=50%\n" +
			"auth count=1 avg=10ms err=0%\n" +
			"slowest: api 250ms\n"},
		{"top five", Config{TopN: 5}, "total=7 skipped=0 avg=99ms\n" +
			"levels: INFO=4 WARN=1 ERROR=2\n" +
			"api count=2 avg=175ms err=0%\n" +
			"db count=2 avg=40ms err=50%\n" +
			"auth count=1 avg=10ms err=0%\n" +
			"cache count=1 avg=5ms err=0%\n" +
			"web count=1 avg=250ms err=100%\n" +
			"slowest: api 250ms\n"},
	}
	for _, tc := range tests {
		for _, workers := range []int{0, 1, 8} {
			cfg := tc.cfg
			cfg.Workers = workers
			t.Run(tc.name, func(t *testing.T) {
				rep, err := Aggregate(sample, SpaceParser{}, cfg)
				if err != nil {
					t.Fatal(err)
				}
				if got := Render(rep); got != tc.want {
					t.Fatalf("workers=%d render:\n%s\nwant:\n%s", workers, got, tc.want)
				}
			})
		}
	}
}

func TestAggregateErrors(t *testing.T) {
	lines := []string{"INFO api 10 ok", "WARN db x", "FATAL api 1", "INFO api 5"}
	t.Run("strict reports first bad line", func(t *testing.T) {
		rep, err := Aggregate(lines, SpaceParser{}, Config{Workers: 4})
		var pe *ParseError
		if !errors.As(err, &pe) {
			t.Fatalf("want *ParseError, got %v", err)
		}
		if pe.Line != 2 || pe.Text != "WARN db x" {
			t.Fatalf("got line %d text %q", pe.Line, pe.Text)
		}
		if !errors.Is(err, ErrBadLatency) || errors.Is(err, ErrBadLevel) {
			t.Fatalf("wrong sentinel: %v", err)
		}
		if rep.Total != 0 || rep.Slowest != nil {
			t.Fatalf("want zero report, got %+v", rep)
		}
	})
	t.Run("skip bad counts them", func(t *testing.T) {
		rep, err := Aggregate(lines, SpaceParser{}, Config{SkipBad: true})
		if err != nil || rep.Total != 2 || rep.Skipped != 2 {
			t.Fatalf("total=%d skipped=%d err=%v", rep.Total, rep.Skipped, err)
		}
	})
	t.Run("blank lines are neither errors nor skips", func(t *testing.T) {
		rep, err := Aggregate([]string{"", "  "}, SpaceParser{}, Config{})
		if err != nil || rep.Total != 0 || rep.Skipped != 0 {
			t.Fatalf("total=%d skipped=%d err=%v", rep.Total, rep.Skipped, err)
		}
	})
	t.Run("kv parser through the same interface", func(t *testing.T) {
		rep, err := Aggregate([]string{"svc=a ms=5", "svc=a level=error ms=6"}, KVParser{}, Config{})
		if err != nil || rep.Total != 2 || rep.Overall.Errors != 1 {
			t.Fatalf("total=%d errors=%d err=%v", rep.Total, rep.Overall.Errors, err)
		}
	})
}

func TestEmptyInput(t *testing.T) {
	rep, err := Aggregate(nil, SpaceParser{}, Config{})
	if err != nil || rep.Slowest != nil || len(rep.Top) != 0 {
		t.Fatalf("rep=%+v err=%v", rep, err)
	}
	if got, want := Render(rep), "total=0 skipped=0 avg=0ms\nlevels:\n"; got != want {
		t.Fatalf("render %q, want %q", got, want)
	}
}

func TestServiceLookupAndStats(t *testing.T) {
	rep, _ := Aggregate(sample, SpaceParser{}, Config{})
	if s := rep.Service("cache"); s == nil || s.Count != 1 || s.AvgMs() != 5 {
		t.Fatalf("cache lookup: %+v", s)
	}
	if rep.Service("nope") != nil {
		t.Fatal("missing service must be nil")
	}
	if got := (Stats{Count: 3, Errors: 1, TotalMs: 10}); got.ErrorPct() != 33 || got.AvgMs() != 3 {
		t.Fatalf("truncation: pct=%d avg=%d", got.ErrorPct(), got.AvgMs())
	}
	if z := (Stats{}); z.ErrorPct() != 0 || z.AvgMs() != 0 {
		t.Fatal("zero Stats must report zeros")
	}
	if !strings.Contains(Render(rep), "slowest: api 250ms") {
		t.Fatal("ties keep the first slowest entry")
	}
}
