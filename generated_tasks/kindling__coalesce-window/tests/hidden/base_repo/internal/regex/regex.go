// Package regex provides a tiny regex engine.
package regex

import (
	"fmt"
	"strings"
)

// InstrKind tags an NFA instruction.
type InstrKind int

const (
	IChar InstrKind = iota
	IAny
	ICharClass
	IStart
	IEnd
	IJmp
	ISplit
	IMatch
)

// Instr is one compiled instruction.
type Instr struct {
	Kind    InstrKind
	Char    byte
	Ranges  []byteRange
	Negated bool
	JmpA    int
	JmpB    int
}

type byteRange struct {
	Lo, Hi byte
}

// Pattern is a compiled program.
type Pattern struct {
	Instrs []Instr
}

// Compile turns a regex source string into a Pattern.
func Compile(src string) (*Pattern, error) {
	p := &compiler{src: src}
	if err := p.compileAlt(); err != nil {
		return nil, err
	}
	p.emit(Instr{Kind: IMatch})
	if p.pos != len(p.src) {
		return nil, fmt.Errorf("regex: trailing input at %d", p.pos)
	}
	return &Pattern{Instrs: p.instrs}, nil
}

type compiler struct {
	src    string
	pos    int
	instrs []Instr
}

func (c *compiler) emit(i Instr) {
	c.instrs = append(c.instrs, i)
}

func (c *compiler) compileAlt() error {
	if err := c.compileConcat(); err != nil {
		return err
	}
	for c.pos < len(c.src) && c.src[c.pos] == '|' {
		c.pos++
		if err := c.compileConcat(); err != nil {
			return err
		}
	}
	return nil
}

func (c *compiler) compileConcat() error {
	for c.pos < len(c.src) && c.src[c.pos] != '|' && c.src[c.pos] != ')' {
		if err := c.compileAtomQuant(); err != nil {
			return err
		}
	}
	return nil
}

func (c *compiler) compileAtomQuant() error {
	atomStart := len(c.instrs)
	if err := c.compileAtom(); err != nil {
		return err
	}
	if c.pos >= len(c.src) {
		return nil
	}
	switch c.src[c.pos] {
	case '*':
		c.pos++
		body := len(c.instrs) - atomStart
		split := Instr{Kind: ISplit, JmpA: 1, JmpB: body + 2}
		c.instrs = append(c.instrs[:atomStart], append([]Instr{split}, c.instrs[atomStart:]...)...)
		c.emit(Instr{Kind: IJmp, JmpA: -(body + 1)})
	case '+':
		c.pos++
		body := len(c.instrs) - atomStart
		c.emit(Instr{Kind: ISplit, JmpA: -body, JmpB: 1})
	case '?':
		c.pos++
		body := len(c.instrs) - atomStart
		split := Instr{Kind: ISplit, JmpA: 1, JmpB: body + 1}
		c.instrs = append(c.instrs[:atomStart], append([]Instr{split}, c.instrs[atomStart:]...)...)
	}
	return nil
}

func (c *compiler) compileAtom() error {
	if c.pos >= len(c.src) {
		return fmt.Errorf("regex: empty atom")
	}
	ch := c.src[c.pos]
	c.pos++
	switch ch {
	case '.':
		c.emit(Instr{Kind: IAny})
	case '^':
		c.emit(Instr{Kind: IStart})
	case '$':
		c.emit(Instr{Kind: IEnd})
	case '\\':
		if c.pos >= len(c.src) {
			return fmt.Errorf("regex: trailing \\")
		}
		esc := c.src[c.pos]
		c.pos++
		mapped := byte(esc)
		switch esc {
		case 'n':
			mapped = '\n'
		case 't':
			mapped = '\t'
		case 'r':
			mapped = '\r'
		}
		c.emit(Instr{Kind: IChar, Char: mapped})
	case '[':
		return c.compileClass()
	case '(':
		if err := c.compileAlt(); err != nil {
			return err
		}
		if c.pos >= len(c.src) || c.src[c.pos] != ')' {
			return fmt.Errorf("regex: unmatched (")
		}
		c.pos++
	default:
		c.emit(Instr{Kind: IChar, Char: ch})
	}
	return nil
}

func (c *compiler) compileClass() error {
	negated := false
	if c.pos < len(c.src) && c.src[c.pos] == '^' {
		c.pos++
		negated = true
	}
	var ranges []byteRange
	for c.pos < len(c.src) && c.src[c.pos] != ']' {
		lo := c.src[c.pos]
		c.pos++
		hi := lo
		if c.pos+1 < len(c.src) && c.src[c.pos] == '-' && c.src[c.pos+1] != ']' {
			hi = c.src[c.pos+1]
			c.pos += 2
		}
		ranges = append(ranges, byteRange{Lo: lo, Hi: hi})
	}
	if c.pos >= len(c.src) {
		return fmt.Errorf("regex: unterminated [")
	}
	c.pos++
	c.emit(Instr{Kind: ICharClass, Ranges: ranges, Negated: negated})
	return nil
}

// Match reports whether p matches anywhere in text.
func (p *Pattern) Match(text string) bool {
	for start := 0; start <= len(text); start++ {
		if p.runFrom(text, start) >= 0 {
			return true
		}
	}
	return false
}

func (p *Pattern) runFrom(text string, start int) int {
	type frame struct{ pc, idx int }
	stack := []frame{{0, start}}
	for len(stack) > 0 {
		top := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		pc, idx := top.pc, top.idx
	loop:
		for pc < len(p.Instrs) {
			ins := p.Instrs[pc]
			switch ins.Kind {
			case IMatch:
				return idx
			case IChar:
				if idx >= len(text) || text[idx] != ins.Char {
					break loop
				}
				idx++
				pc++
			case IAny:
				if idx >= len(text) || text[idx] == '\n' {
					break loop
				}
				idx++
				pc++
			case ICharClass:
				if idx >= len(text) {
					break loop
				}
				ch := text[idx]
				inClass := false
				for _, r := range ins.Ranges {
					if ch >= r.Lo && ch <= r.Hi {
						inClass = true
						break
					}
				}
				if inClass == ins.Negated {
					break loop
				}
				idx++
				pc++
			case IStart:
				if idx != 0 {
					break loop
				}
				pc++
			case IEnd:
				if idx != len(text) {
					break loop
				}
				pc++
			case IJmp:
				pc += ins.JmpA
			case ISplit:
				stack = append(stack, frame{pc + ins.JmpB, idx})
				pc += ins.JmpA
			default:
				return -1
			}
		}
	}
	return -1
}

// String returns a brief description of p (for tests).
func (p *Pattern) String() string {
	var sb strings.Builder
	for i, ins := range p.Instrs {
		fmt.Fprintf(&sb, "[%d %d]", i, ins.Kind)
	}
	return sb.String()
}
