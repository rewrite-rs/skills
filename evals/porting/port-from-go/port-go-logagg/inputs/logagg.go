// Package logagg parses service log lines and aggregates per-service statistics.
package logagg

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// Sentinel errors returned by parsers. Callers match them with errors.Is.
var (
	ErrEmptyLine  = errors.New("logagg: empty line")
	ErrBadLevel   = errors.New("logagg: unknown level")
	ErrBadLatency = errors.New("logagg: bad latency")
	ErrMalformed  = errors.New("logagg: malformed line")
)

// ParseError records which input line failed and why. Callers extract it
// with errors.As and still match the underlying sentinel with errors.Is.
type ParseError struct {
	Line int
	Text string
	Err  error
}

func (e *ParseError) Error() string {
	return fmt.Sprintf("line %d: %v: %q", e.Line, e.Err, e.Text)
}

func (e *ParseError) Unwrap() error { return e.Err }

// Level is a log severity. The zero value is LevelInfo, and parsers rely on that.
type Level int

const (
	LevelInfo Level = iota
	LevelWarn
	LevelError
)

func (l Level) String() string {
	switch l {
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERROR"
	}
	return "INFO"
}

// ParseLevel accepts INFO, WARN and ERROR in any letter case.
func ParseLevel(s string) (Level, error) {
	switch strings.ToUpper(s) {
	case "INFO":
		return LevelInfo, nil
	case "WARN":
		return LevelWarn, nil
	case "ERROR":
		return LevelError, nil
	}
	return LevelInfo, fmt.Errorf("%w: %q", ErrBadLevel, s)
}

// Entry is one parsed log line.
type Entry struct {
	Service   string
	Level     Level
	LatencyMs int
	Text      string
}

// Parser turns one raw line into an Entry.
type Parser interface {
	Parse(line string) (Entry, error)
}

// SpaceParser reads "LEVEL service latency_ms [free text...]".
type SpaceParser struct{}

func (SpaceParser) Parse(line string) (Entry, error) {
	f := strings.Fields(line)
	if len(f) == 0 {
		return Entry{}, ErrEmptyLine
	}
	if len(f) < 3 {
		return Entry{}, fmt.Errorf("%w: want LEVEL service ms [text]", ErrMalformed)
	}
	lvl, err := ParseLevel(f[0])
	if err != nil {
		return Entry{}, err
	}
	ms, err := strconv.Atoi(f[2])
	if err != nil || ms < 0 {
		return Entry{}, fmt.Errorf("%w: %q", ErrBadLatency, f[2])
	}
	return Entry{Service: f[1], Level: lvl, LatencyMs: ms, Text: strings.Join(f[3:], " ")}, nil
}

// KVParser reads key=value tokens: svc (required), level, ms, msg.
// Missing level means info and missing ms means zero. Unknown keys and
// tokens without "=" are ignored; a repeated key keeps the last value.
type KVParser struct{}

func (KVParser) Parse(line string) (Entry, error) {
	f := strings.Fields(line)
	if len(f) == 0 {
		return Entry{}, ErrEmptyLine
	}
	var e Entry
	for _, tok := range f {
		k, v, ok := strings.Cut(tok, "=")
		if !ok {
			continue
		}
		switch k {
		case "svc":
			e.Service = v
		case "level":
			l, err := ParseLevel(v)
			if err != nil {
				return Entry{}, err
			}
			e.Level = l
		case "ms":
			n, err := strconv.Atoi(v)
			if err != nil || n < 0 {
				return Entry{}, fmt.Errorf("%w: %q", ErrBadLatency, v)
			}
			e.LatencyMs = n
		case "msg":
			e.Text = v
		}
	}
	if e.Service == "" {
		return Entry{}, fmt.Errorf("%w: missing svc", ErrMalformed)
	}
	return e, nil
}
