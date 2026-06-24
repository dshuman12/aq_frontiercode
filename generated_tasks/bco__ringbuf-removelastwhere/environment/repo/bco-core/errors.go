package main

import "sync"

// Engine errors for C API BCOGetLastError (invalid handle, etc.).
var (
	engineErrMu sync.Mutex
	engineErr   = map[int]string{}
)

func setEngineError(engineID int, msg string) {
	engineErrMu.Lock()
	defer engineErrMu.Unlock()
	engineErr[engineID] = msg
}

// TakeEngineError returns and clears the last error for engineID, or empty if none.
func TakeEngineError(engineID int) string {
	engineErrMu.Lock()
	defer engineErrMu.Unlock()
	s := engineErr[engineID]
	delete(engineErr, engineID)
	return s
}

// PeekEngineError returns the last error without clearing (for tests / debugging).
func PeekEngineError(engineID int) string {
	engineErrMu.Lock()
	defer engineErrMu.Unlock()
	return engineErr[engineID]
}
