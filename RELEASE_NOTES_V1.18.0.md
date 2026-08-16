# Luke CS v1.18.0 — Luke Shop Commerce Connector v2

Luke CS v1.18.0 rebases the Commerce Connector v2 integration onto the real
v1.17.4 customer-service baseline. It preserves the v1.17.4 support workspace,
staff/admin identity management, chat menu, promotion carousel, SSE delivery,
prompt-runtime and AI reliability work while adding a read-only Shop commerce
bridge.

## Added

- Platform-scoped Shop Commerce configuration in Platform Control Center.
- Encrypted long-lived Shop service credential storage.
- Short-lived Shop service-token exchange.
- Read-only AI tools: customer.get, orders.list, order.get, order.status,
  payment.status and delivery.status.
- Signed customer context carried from Luke Shop Customer Web into Chat Pro.
- Exact parent-window/origin validation for the iframe context bridge.
- DNS-pinned HTTPS requests for Shop connector traffic.
- Redacted connector audit records.
- Verified Shop facts inserted into the prompt with a strict non-instruction
  boundary.
- Deterministic verified-commerce fallback when the AI provider is unavailable.
- Migration 048 for connector configuration and audit tables.

## Safety boundaries

The connector does not expose order cancellation, refunds, payment mutation,
delivery mutation, precise-location mutation, account editing, direct Shop
database access, or raw service credentials to the browser or model.
