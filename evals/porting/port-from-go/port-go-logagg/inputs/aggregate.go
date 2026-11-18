package logagg

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
)

// Stats are running counters. The zero value is a valid empty tally.
type Stats struct {
	Count   int
	Errors  int
	TotalMs int
}

func (s *Stats) add(e Entry) {
	s.Count++
	s.TotalMs += e.LatencyMs
	if e.Level == LevelError {
		s.Errors++
	}
}

// AvgMs is the integer-truncated mean latency; an empty tally averages 0.
func (s Stats) AvgMs() int {
	if s.Count == 0 {
		return 0
	}
	return s.TotalMs / s.Count
}

// ErrorPct is the integer-truncated share of error entries; empty is 0.
func (s Stats) ErrorPct() int {
	if s.Count == 0 {
		return 0
	}
	return s.Errors * 100 / s.Count
}

// ServiceStats embeds Stats, so AvgMs and ErrorPct are promoted.
type ServiceStats struct {
	Stats
	Name string
}

// Config tunes Aggregate. Every zero value means a default:
// Workers 0 is 2, TopN 0 is 3, SkipBad false is strict.
type Config struct {
	Workers int
	TopN    int
	SkipBad bool
}

func (c Config) normalized() Config {
	if c.Workers <= 0 {
		c.Workers = 2
	}
	if c.TopN <= 0 {
		c.TopN = 3
	}
	return c
}

// Report is the aggregate over every accepted line.
type Report struct {
	Total   int
	Skipped int
	Overall Stats
	Slowest *Entry // nil when no line was accepted
	ByLevel map[Level]int
	Top     []ServiceStats
	by      map[string]*ServiceStats
}

// Service looks up any service, not only those in Top; nil when absent.
func (r Report) Service(name string) *ServiceStats {
	return r.by[name]
}

type result struct {
	entry Entry
	err   error
}

// Aggregate parses lines on cfg.Workers goroutines, then folds the results
// in input order. Blank lines are ignored silently. The first bad line in
// input order fails the run as a *ParseError unless cfg.SkipBad is set.
func Aggregate(lines []string, p Parser, cfg Config) (Report, error) {
	cfg = cfg.normalized()
	results := make([]result, len(lines))
	jobs := make(chan int)
	var wg sync.WaitGroup
	for w := 0; w < cfg.Workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				e, err := p.Parse(lines[i])
				results[i] = result{entry: e, err: err}
			}
		}()
	}
	for i := range lines {
		jobs <- i
	}
	close(jobs)
	wg.Wait()

	rep := Report{ByLevel: map[Level]int{}, by: map[string]*ServiceStats{}}
	for i, r := range results {
		if r.err != nil {
			if errors.Is(r.err, ErrEmptyLine) {
				continue
			}
			if cfg.SkipBad {
				rep.Skipped++
				continue
			}
			return Report{}, &ParseError{Line: i + 1, Text: lines[i], Err: r.err}
		}
		e := r.entry
		rep.Total++
		rep.Overall.add(e)
		rep.ByLevel[e.Level]++
		s, ok := rep.by[e.Service]
		if !ok {
			s = &ServiceStats{Name: e.Service}
			rep.by[e.Service] = s
		}
		s.add(e)
		if rep.Slowest == nil || e.LatencyMs > rep.Slowest.LatencyMs {
			c := e
			rep.Slowest = &c
		}
	}

	top := make([]ServiceStats, 0, len(rep.by))
	for _, s := range rep.by {
		top = append(top, *s)
	}
	sort.Slice(top, func(a, b int) bool {
		if top[a].Count != top[b].Count {
			return top[a].Count > top[b].Count
		}
		return top[a].Name < top[b].Name
	})
	if len(top) > cfg.TopN {
		top = top[:cfg.TopN]
	}
	rep.Top = top
	return rep, nil
}

// Render prints a deterministic text summary.
func Render(r Report) string {
	var b strings.Builder
	fmt.Fprintf(&b, "total=%d skipped=%d avg=%dms\n", r.Total, r.Skipped, r.Overall.AvgMs())
	levels := make([]int, 0, len(r.ByLevel))
	for l := range r.ByLevel {
		levels = append(levels, int(l))
	}
	sort.Ints(levels)
	b.WriteString("levels:")
	for _, l := range levels {
		fmt.Fprintf(&b, " %s=%d", Level(l), r.ByLevel[Level(l)])
	}
	b.WriteString("\n")
	for _, s := range r.Top {
		fmt.Fprintf(&b, "%s count=%d avg=%dms err=%d%%\n", s.Name, s.Count, s.AvgMs(), s.ErrorPct())
	}
	if r.Slowest != nil {
		fmt.Fprintf(&b, "slowest: %s %dms\n", r.Slowest.Service, r.Slowest.LatencyMs)
	}
	return b.String()
}
