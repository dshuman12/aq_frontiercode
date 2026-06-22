# Task description

The consistent-hash ring implementation has correctness bugs affecting key lookups and key transfer estimation. Keys sometimes map to wrong nodes, and key-transfer calculations produce incorrect estimates.

Identify and fix the issues so that:

- Key lookup consistently maps each key to the correct node, including boundary cases
- Multiple node lookups (`LookupN`) return correct distinct nodes
- Key transfer estimates are accurate based on the configured replica count
- The hashing function and ring construction remain unchanged
- Public method signatures and return types are preserved

Keep behavior in all other packages unchanged.

# Test guidelines

Run `go test ./pkg/hash/...` to verify the fix.

Add tests covering key lookups at various positions (boundaries, wrap-around), multiple node lookups, and key transfer estimates. Ensure edge cases are handled correctly.

# Lint guidelines

Run `gofmt -l pkg/hash` and `go vet ./pkg/hash/...` and ensure both report no issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
