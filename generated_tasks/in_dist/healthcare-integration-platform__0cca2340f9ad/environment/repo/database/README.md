# Database

PostgreSQL stores normalized integration events, audit events, consent records,
and operational state. PHI columns are isolated behind service-owned access
paths and every write is paired with an audit event.
