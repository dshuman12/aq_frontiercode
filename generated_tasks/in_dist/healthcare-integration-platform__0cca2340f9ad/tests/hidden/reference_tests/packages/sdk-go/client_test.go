package healthbridge

import "testing"

func TestClientStoresBaseURL(t *testing.T) {
	client := Client{BaseURL: "https://api.healthbridge.local"}
	if client.BaseURL == "" {
		t.Fatal("expected base URL to be stored")
	}
}
