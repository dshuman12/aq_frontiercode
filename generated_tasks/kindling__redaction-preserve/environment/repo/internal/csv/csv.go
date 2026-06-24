// Package csv implements a tiny RFC 4180-ish CSV reader/writer.
package csv

import (
	"errors"
	"strings"
)

// Read returns the rows for the input.
func Read(text string) ([][]string, error) {
	var rows [][]string
	for _, line := range strings.Split(text, "\n") {
		if line == "" {
			continue
		}
		row, err := parseLine(line)
		if err != nil {
			return nil, err
		}
		rows = append(rows, row)
	}
	return rows, nil
}

func parseLine(line string) ([]string, error) {
	var row []string
	var field strings.Builder
	inQuotes := false
	for i := 0; i < len(line); i++ {
		ch := line[i]
		if inQuotes {
			if ch == '"' {
				if i+1 < len(line) && line[i+1] == '"' {
					field.WriteByte('"')
					i++
					continue
				}
				inQuotes = false
				continue
			}
			field.WriteByte(ch)
			continue
		}
		switch ch {
		case ',':
			row = append(row, field.String())
			field.Reset()
		case '"':
			if field.Len() != 0 {
				return nil, errors.New("csv: stray quote in unquoted field")
			}
			inQuotes = true
		default:
			field.WriteByte(ch)
		}
	}
	if inQuotes {
		return nil, errors.New("csv: unterminated quoted field")
	}
	row = append(row, field.String())
	return row, nil
}

// Write returns the CSV string for the given rows.
func Write(rows [][]string) string {
	var sb strings.Builder
	for i, row := range rows {
		for j, field := range row {
			if j > 0 {
				sb.WriteByte(',')
			}
			sb.WriteString(escape(field))
		}
		if i+1 < len(rows) {
			sb.WriteByte('\n')
		}
	}
	return sb.String()
}

func escape(field string) string {
	if !strings.ContainsAny(field, ",\"\n") {
		return field
	}
	return "\"" + strings.ReplaceAll(field, "\"", "\"\"") + "\""
}
