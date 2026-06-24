// Package diff implements Hunt-McIlroy diff over string slices.
package diff

// Edit is one diff operation.
type Edit struct {
	Op   EditOp
	Text string
}

// EditOp tags an edit's kind.
type EditOp int

const (
	OpKeep EditOp = iota
	OpRemove
	OpAdd
)

// Tag returns the single-character tag for op.
func (op EditOp) Tag() string {
	switch op {
	case OpKeep:
		return " "
	case OpRemove:
		return "-"
	case OpAdd:
		return "+"
	}
	return "?"
}

// LCS returns the longest common subsequence as (i, j) index pairs.
func LCS(a, b []string) [][2]int {
	n, m := len(a), len(b)
	dp := make([][]int, n+1)
	for i := range dp {
		dp[i] = make([]int, m+1)
	}
	for i := 0; i < n; i++ {
		for j := 0; j < m; j++ {
			if a[i] == b[j] {
				dp[i+1][j+1] = dp[i][j] + 1
			} else if dp[i+1][j] >= dp[i][j+1] {
				dp[i+1][j+1] = dp[i+1][j]
			} else {
				dp[i+1][j+1] = dp[i][j+1]
			}
		}
	}
	var out [][2]int
	for i, j := n, m; i > 0 && j > 0; {
		if a[i-1] == b[j-1] {
			out = append([][2]int{{i - 1, j - 1}}, out...)
			i--
			j--
		} else if dp[i-1][j] >= dp[i][j-1] {
			i--
		} else {
			j--
		}
	}
	return out
}

// Script returns the edit script transforming a into b.
func Script(a, b []string) []Edit {
	pairs := LCS(a, b)
	var out []Edit
	ai, bi := 0, 0
	for _, p := range pairs {
		la, lb := p[0], p[1]
		for ai < la {
			out = append(out, Edit{Op: OpRemove, Text: a[ai]})
			ai++
		}
		for bi < lb {
			out = append(out, Edit{Op: OpAdd, Text: b[bi]})
			bi++
		}
		out = append(out, Edit{Op: OpKeep, Text: a[la]})
		ai = la + 1
		bi = lb + 1
	}
	for ai < len(a) {
		out = append(out, Edit{Op: OpRemove, Text: a[ai]})
		ai++
	}
	for bi < len(b) {
		out = append(out, Edit{Op: OpAdd, Text: b[bi]})
		bi++
	}
	return out
}

// Render returns a string with prefixed lines.
func Render(edits []Edit) string {
	var out string
	for _, e := range edits {
		out += e.Op.Tag() + e.Text + "\n"
	}
	return out
}
