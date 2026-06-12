# LinkedIn Beta Connector — Customer-Facing Risk Disclosure

> **Hard gate.** No Unipile connection UI ships until this copy is reviewed, approved, and committed.
> This file is the canonical source of the disclosure. The connect modal renders it; the per-user
> opt-in record stores the `version` below. If the risk model materially changes, bump the version —
> users who accepted an older version must re-accept before any further connector activity.

- **version:** `2026-06-12.1`
- **shown:** before connecting the LinkedIn beta connector (Unipile)
- **stored:** per-user acceptance timestamp + accepted version (`linkedin_connector_optins`)
- **re-shown:** whenever `version` changes

---

## Disclosure copy (verbatim — render exactly)

> This LinkedIn beta connector uses a third-party provider that is not LinkedIn's official API for
> certain monitoring and engagement workflows. LinkedIn may restrict accounts that use unsupported
> automation, scraping, or session-based third-party access. Clout requires human approval for every
> outbound action and does not silently automate comments, reactions, or posting.

---

## Why this exists (internal note — not shown to users)

This is part of the **product boundary**, not just legal language. The connector is risk-bearing:
LinkedIn's official API does not reliably support broad keyword monitoring or commenting on others'
content, so those workflows run through Unipile, which acts via a connected LinkedIn session.

The immediate account-restriction risk lands on the **connected customer account**, but Clout still
carries product, vendor, reputational, and platform-enforcement risk for enabling the workflow. The
disclosure must read as **explicit but not alarmist**.

Product posture this disclosure protects:
- Official LinkedIn API wherever possible; Unipile only where necessary.
- Human approval for every outbound engagement action — no silent automation.
- No automatic unsupported fallback; monitoring is read-only.
- Fast admin kill switch; strong audit trail.

See `docs/PRODUCT_PRINCIPLES.md` and the approved plan for the full posture.
