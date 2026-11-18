# ⚖️ Terms of Service, Privacy & Compliance Policies

> ⚠️ **LEGAL DISCLAIMER:** This is an AI-generated template for baseline compliance. For full production enterprise release, please have this reviewed by a qualified legal professional.

**Effective Date:** November 18, 2026  
**Scope:** Smart Internal Knowledge Assistant Application  
**Organization:** Enterprise Internal Deployment  

---

## 1. Terms & Conditions of Use (T&C)

### 1.1 Permitted Use
The **Smart Internal Knowledge Assistant** ("Service") is provided solely for authorized employees, contractors, and staff of the organization. Access is restricted to internal business purposes, including retrieving company policies, onboarding guides, technical runbooks, and internal documentation.

### 1.2 User Accounts & Role-Based Access Control (RBAC)
- Access to the Service is authenticated via the enterprise authentication provider (Clerk Auth).
- You are responsible for maintaining the confidentiality of your login credentials.
- Users are granted access tiers (**ADMIN** or **MEMBER**) based on departmental authorization. Attempting to bypass access controls, spoof user identities, or extract confidential documents outside your assigned department is strictly prohibited.

### 1.3 AI Outputs & Verification Notice
- The Service uses generative artificial intelligence (including Google Gemini, Anthropic Claude, and OpenAI) grounded in company records via Retrieval-Augmented Generation (RAG).
- While the Service includes verifiable document citations (`[1]`, `[2]`), you should review the original referenced documentation for binding legal, contractual, or safety decisions.

### 1.4 Prohibited Conduct
You agree not to:
- Use the Service to process unlawful, defamatory, or harmful content.
- Attempt adversarial prompt injection, jailbreaking, or reverse-engineering of system prompts and proprietary algorithms.
- Exfiltrate company confidential records to unauthorized third parties.

---

## 2. Privacy Policy

### 2.1 Information We Process
When you use the Service, we process the following categories of information:
1. **User Identity Data:** Name, email address, role, department, and organization ID provided by Clerk Authentication.
2. **Conversations & Queries:** Text inquiries submitted in the chat, selected language preferences, and generated answers.
3. **Internal Documentation:** Text content, PDFs, Slack messages, and Notion pages ingested by administrators.
4. **Audit & Operational Logs:** Query timestamps, response latency, token usage, feedback ratings (thumbs up/down), and administrative action audit trails.

### 2.2 Automated Data Sanitization (PII & Secret Protection)
To protect confidential corporate and personal data, all ingested documents and user queries pass through an automated **Data Sanitizer Service** before processing:
- AWS access keys, private API keys, and bearer tokens are automatically masked.
- Social Security Numbers (SSN) and credit card numbers are redacted.

### 2.3 Sub-Processors & AI Providers
To deliver real-time intelligent responses, the Service utilizes trusted enterprise AI model providers:
- **Google Cloud / Google AI (Gemini 2.0 Flash & text-embedding-004)**
- **Anthropic (Claude 3.5 Sonnet)**
- **OpenAI (GPT-4o)**

**Data Privacy Guarantee:** All queries transmitted to enterprise AI model endpoints are sent via encrypted HTTPS/TLS. Under our enterprise data agreements, corporate queries and documentation are **never used to train public foundational AI models**.

### 2.4 Multi-Tenant Data Isolation
The Service enforces strict database-level multi-tenancy. All vector embeddings, document chunks, query logs, and support tickets are isolated by `organizationId`. Cross-tenant data leakage is prevented via parameterized queries and strict authorization middleware.

### 2.5 Data Retention & User Rights
- Chat history and query logs are retained according to the organization's corporate data retention policy (default: 90 days for operational audit).
- Employees may request the deletion or correction of their chat conversation threads via the in-app chat management interface or by contacting the internal Data Protection Officer (DPO).

---

## 3. Cookies & Local Storage Policy

### 3.1 What We Store
The Service uses browser `localStorage` and strictly necessary session cookies. We do **not** use third-party advertising cookies, marketing pixels, or commercial tracking tags.

| Storage Key | Type | Purpose | Expiration |
| :--- | :--- | :--- | :--- |
| `__session` | Essential Cookie | Manages secure single sign-on (SSO) session authentication via Clerk Auth. | Session duration |
| `knowledge_app_lang` | LocalStorage | Remembers your preferred interface language (`en` for English, `my` for Myanmar). | Persistent until cleared |
| `theme` | LocalStorage | Stores your light-mode interface visual preferences. | Persistent until cleared |

### 3.2 Managing Storage
You may clear your browser cookies and local storage at any time via your browser settings. Clearing `knowledge_app_lang` will reset the interface language to the system default (English).

---

## 4. Contact & Inquiries

For questions regarding these terms, data privacy practices, or compliance audits, please contact:
- **Internal Compliance & Legal:** `legal@company.internal`
- **IT Security & Operations:** `security@company.internal`
