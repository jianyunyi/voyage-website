package repository

import "testing"

func TestParsePositiveIDRejectsInvalidValues(t *testing.T) {
	for _, raw := range []string{"", "0", "-1", "abc"} {
		if _, err := ParsePositiveID(raw); err == nil {
			t.Fatalf("ParsePositiveID(%q) returned nil error", raw)
		}
	}

	got, err := ParsePositiveID("42")
	if err != nil || got != 42 {
		t.Fatalf("ParsePositiveID(42) = %d, %v", got, err)
	}
}
