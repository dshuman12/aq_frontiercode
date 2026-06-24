package errors

import (
	"fmt"
	"strings"

	"github.com/Mustafa4ngin/Drift/pkg/token"
)

type Phase int

const (
	PhaseLexer Phase = iota
	PhaseParser
	PhaseChecker
	PhaseRuntime
)

var phaseNames = map[Phase]string{
	PhaseLexer:   "LexError",
	PhaseParser:  "ParseError",
	PhaseChecker: "TypeError",
	PhaseRuntime: "RuntimeError",
}

func (p Phase) String() string {
	if s, ok := phaseNames[p]; ok {
		return s
	}
	return "Error"
}

type DriftError struct {
	Phase   Phase
	Message string
	Span    token.Span
	Source  string
	Hints   []string
}

func New(phase Phase, msg string, span token.Span) *DriftError {
	return &DriftError{
		Phase:   phase,
		Message: msg,
		Span:    span,
	}
}

func Newf(phase Phase, span token.Span, format string, args ...interface{}) *DriftError {
	return &DriftError{
		Phase:   phase,
		Message: fmt.Sprintf(format, args...),
		Span:    span,
	}
}

func (e *DriftError) WithSource(src string) *DriftError {
	e.Source = src
	return e
}

func (e *DriftError) WithHint(hint string) *DriftError {
	e.Hints = append(e.Hints, hint)
	return e
}

func (e *DriftError) Error() string {
	var b strings.Builder
	fmt.Fprintf(&b, "%s at %s: %s", e.Phase, e.Span.Start, e.Message)
	if e.Source != "" {
		b.WriteString("\n")
		b.WriteString(e.formatSource())
	}
	for _, h := range e.Hints {
		fmt.Fprintf(&b, "\n  hint: %s", h)
	}
	return b.String()
}

func (e *DriftError) formatSource() string {
	if e.Source == "" {
		return ""
	}
	lines := strings.Split(e.Source, "\n")
	lineIdx := e.Span.Start.Line - 1
	if lineIdx < 0 || lineIdx >= len(lines) {
		return ""
	}

	var b strings.Builder
	line := lines[lineIdx]
	lineNum := fmt.Sprintf("%4d", e.Span.Start.Line)
	fmt.Fprintf(&b, "  %s | %s\n", lineNum, line)

	col := e.Span.Start.Column - 1
	if col < 0 {
		col = 0
	}
	endCol := e.Span.End.Column - 1
	if endCol <= col {
		endCol = col + 1
	}
	if e.Span.End.Line != e.Span.Start.Line {
		endCol = len(line)
	}
	if endCol > len(line) {
		endCol = len(line)
	}

	padding := strings.Repeat(" ", len(lineNum)+3+col)
	underline := strings.Repeat("^", endCol-col)
	fmt.Fprintf(&b, "%s%s", padding, underline)
	return b.String()
}

type ErrorList struct {
	Errors []*DriftError
}

func NewList() *ErrorList {
	return &ErrorList{}
}

func (el *ErrorList) Add(err *DriftError) {
	el.Errors = append(el.Errors, err)
}

func (el *ErrorList) AddNew(phase Phase, msg string, span token.Span) {
	el.Add(New(phase, msg, span))
}

func (el *ErrorList) HasErrors() bool {
	return len(el.Errors) > 0
}

func (el *ErrorList) Count() int {
	return len(el.Errors)
}

func (el *ErrorList) Error() string {
	if len(el.Errors) == 0 {
		return "no errors"
	}
	var b strings.Builder
	for i, e := range el.Errors {
		if i > 0 {
			b.WriteString("\n\n")
		}
		b.WriteString(e.Error())
	}
	return b.String()
}

func (el *ErrorList) First() *DriftError {
	if len(el.Errors) == 0 {
		return nil
	}
	return el.Errors[0]
}

func (el *ErrorList) SetSource(src string) {
	for _, e := range el.Errors {
		if e.Source == "" {
			e.Source = src
		}
	}
}

func LexError(msg string, span token.Span) *DriftError {
	return New(PhaseLexer, msg, span)
}

func ParseError(msg string, span token.Span) *DriftError {
	return New(PhaseParser, msg, span)
}

func ParseErrorf(span token.Span, format string, args ...interface{}) *DriftError {
	return Newf(PhaseParser, span, format, args...)
}

func TypeError(msg string, span token.Span) *DriftError {
	return New(PhaseChecker, msg, span)
}

func TypeErrorf(span token.Span, format string, args ...interface{}) *DriftError {
	return Newf(PhaseChecker, span, format, args...)
}

func RuntimeError(msg string, span token.Span) *DriftError {
	return New(PhaseRuntime, msg, span)
}

func RuntimeErrorf(span token.Span, format string, args ...interface{}) *DriftError {
	return Newf(PhaseRuntime, span, format, args...)
}