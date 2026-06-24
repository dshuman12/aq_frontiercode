// Package categorize maps file extensions to broad categories.
package categorize

import (
	"path/filepath"
	"strings"
)

// Category is a broad classification.
type Category int

const (
	CatOther Category = iota
	CatLog
	CatJSON
	CatCSV
	CatYAML
	CatToml
	CatXML
	CatBinary
	CatArchive
	CatImage
	CatDocument
)

// Name returns a stable lowercase name.
func (c Category) Name() string {
	switch c {
	case CatLog:
		return "log"
	case CatJSON:
		return "json"
	case CatCSV:
		return "csv"
	case CatYAML:
		return "yaml"
	case CatToml:
		return "toml"
	case CatXML:
		return "xml"
	case CatBinary:
		return "binary"
	case CatArchive:
		return "archive"
	case CatImage:
		return "image"
	case CatDocument:
		return "document"
	default:
		return "other"
	}
}

// ForPath returns the category for the path's extension.
func ForPath(p string) Category {
	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(p)), ".")
	switch ext {
	case "log":
		return CatLog
	case "json", "ndjson", "jsonl":
		return CatJSON
	case "csv", "tsv":
		return CatCSV
	case "yaml", "yml":
		return CatYAML
	case "toml":
		return CatToml
	case "xml":
		return CatXML
	case "bin", "exe", "so", "dll":
		return CatBinary
	case "tar", "gz", "bz2", "xz", "zip", "7z":
		return CatArchive
	case "jpg", "jpeg", "png", "gif", "svg", "webp":
		return CatImage
	case "txt", "md", "rst", "doc", "docx", "pdf":
		return CatDocument
	}
	return CatOther
}

// All returns every defined category.
func All() []Category {
	return []Category{CatLog, CatJSON, CatCSV, CatYAML, CatToml, CatXML, CatBinary, CatArchive, CatImage, CatDocument, CatOther}
}
