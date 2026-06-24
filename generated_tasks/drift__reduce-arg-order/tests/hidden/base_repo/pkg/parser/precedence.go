package parser

import "github.com/Mustafa4ngin/Drift/pkg/token"

type Precedence int

const (
	PrecNone       Precedence = iota
	PrecAssign                        // =
	PrecTernary                       // ? :
	PrecNullCoalesce                  // ??
	PrecPipe                          // |>
	PrecOr                            // ||
	PrecAnd                           // &&
	PrecEquality                      // == !=
	PrecComparison                    // < > <= >=
	PrecRange                         // ..
	PrecTerm                          // + -
	PrecFactor                        // * / %
	PrecUnary                         // ! -
	PrecCall                          // () [] .
)

func tokenPrecedence(t token.Type) Precedence {
	switch t {
	case token.Question:
		return PrecTernary
	case token.QuestionQuestion:
		return PrecNullCoalesce
	case token.Pipe:
		return PrecPipe
	case token.Or:
		return PrecOr
	case token.And:
		return PrecAnd
	case token.Eq, token.NotEq:
		return PrecEquality
	case token.Lt, token.Gt, token.LtEq, token.GtEq:
		return PrecComparison
	case token.DotDot:
		return PrecRange
	case token.Plus, token.Minus:
		return PrecTerm
	case token.Star, token.Slash, token.Percent:
		return PrecFactor
	case token.LParen, token.LBracket, token.Dot:
		return PrecCall
	default:
		return PrecNone
	}
}