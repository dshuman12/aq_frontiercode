# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.6.x   | Yes       |
| 0.5.x   | Yes (security fixes only) |
| < 0.5   | No        |

## Reporting

Please do not open a public GitHub issue for security reports.

Send a report to **security@kindling-tools.example**.

A report should include the affected version, a minimal repro, and
your assessment of impact.

## What to expect

| Step                         | Target              |
| ---------------------------- | ------------------- |
| Acknowledgement              | within 2 business days |
| Triage                       | within 5 business days |
| Patch + backports            | within 14 days      |

## Threat model

- **Trust boundary:** the local filesystem and the user invoking the CLI.
- **Inputs:** log files, query strings, environment variables.
- **Outputs:** stdout / stderr, optional metrics socket.
- **Secrets:** none. kindling does not handle credentials.

## Cryptographic assumptions

kindling uses only stdlib hash functions for record fingerprinting;
none for confidentiality.
