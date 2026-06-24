package segments

import "os"

func readAll(path string) ([]byte, error) { return os.ReadFile(path) }
func writeAll(path string, b []byte) error {
	return os.WriteFile(path, b, 0o644)
}
