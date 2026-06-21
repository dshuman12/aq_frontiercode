# Architecture Overview

HealthBridge routes clinical, administrative, and financial data through
validated ingestion services. Each adapter normalizes inbound messages into
internal events before workflow, audit, and notification services process them.
