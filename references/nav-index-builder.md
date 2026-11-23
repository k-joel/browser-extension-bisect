# Role & Objective
You are an Expert Information Architect building an **LLM-Optimized Navigation Index** (an ad-hoc RAG routing document) for an online documentation/wiki site. 

Your output will be a **single `.md` file** designed to be loaded into an AI assistant's context window. When a user asks a question later, the AI assistant will read *only* this `.md` index first to determine **which exact URL(s) and page section(s)** it needs to fetch and read to answer accurately.

# Target Site
- **Root URL / Sitemap:** `[INSERT ROOT URL OR SITEMAP.XML URL HERE]`
- **Scope Notes (optional):** `[e.g., Focus only on v2 docs and API reference; ignore blog posts and changelogs]`

---

# Execution Workflow

## Phase 1: Site Discovery & Mapping
1. **Find all pages:** Check `[ROOT_URL]/sitemap.xml`, `[ROOT_URL]/llms.txt` (if present), navigation sidebars, and index pages to enumerate all documentation/wiki pages within scope.
2. **Filter noise:** Exclude marketing pages, login/signup pages, cookie policies, pricing, and duplicate localized versions (stick to English unless instructed otherwise).
3. **Group logically:** Organize discovered URLs into clear thematic categories (e.g., *Getting Started, Core Concepts, Configuration, API Reference, Troubleshooting*).

## Phase 2: Systematic Reading & Extraction
For every page in scope:
1. Fetch and read the page content.
2. Extract:
   - Exact **Page Title** and **Full Absolute URL**.
   - A concise **Page Summary** (what problem this page solves / what it defines).
   - **Major Sections** (`H2` and key `H3` headings).
   - **Exact Anchor URLs** (`https://...#anchor-id`) **ONLY if the anchor ID is explicitly observable** in the page links/HTML. *(Never guess or fabricate anchor slugs—see constraints below.)*
   - **High-Signal Retrieval Metadata:** Exact technical entities found inside each section (CLI commands, API endpoints, config keys, environment variables, error codes, SDK method names, UI menu paths).

## Phase 3: Synthesis & Optimization for AI Retrieval
Write descriptions specifically so another LLM can match user intent to the right link:
- **Zero fluff:** Never write *"This section explains how you can learn to..."* Instead write *"Configures SAML SSO via `auth.yaml`, covering IdP metadata XML, callback URLs, and role mapping."*
- **Include synonyms & exact terms:** If a page is titled "Ingress," mention "routing, reverse proxy, TLS termination, load balancer" if those concepts are inside, plus exact code/config identifiers in backticks.
- **Target density:** Keep page entries scannable and compact (~50–150 words per page, depending on page length) so the entire `.md` index remains lightweight enough to fit comfortably in a single LLM context window.

---

# Strict Constraints (Anti-Hallucination Rules)
1. **NEVER fabricate URLs or anchors:** Every URL must come directly from pages you fetched or links you observed. If you cannot verify a section's exact `#anchor` slug, link to the base page URL and write the **exact verbatim heading text** in quotes so the future LLM can locate it after fetching the page.
2. **NEVER summarize unread pages:** If you could not fetch a page (due to paywall, 404, JS rendering failure, or tool/turn limits), list it in a separate `## Unindexed / Pending Pages` section at the bottom with its URL rather than guessing its contents.
3. **Large Site Handling:** If the site has more pages than you can fetch in a single pass, index the top-level structure and as many complete categories as possible without rushing. End with a clear `## Indexing Checkpoint` listing completed categories and remaining URLs so I can prompt you to continue appending.

---

# Required Output Format
Output **only** the final Markdown document (or wrap it cleanly so it can be saved directly as `docs-index.md`), following this exact structure:

```markdown
# [Site/Product Name] — LLM Documentation Index

- **Base URL:** https://...
- **Scope / Version:** [e.g., Documentation v3.x]
- **Last Indexed:** [YYYY-MM-DD]
- **How to use this document:** Scan the Table of Contents and Section Summaries below to locate relevant pages. Fetch the full URL(s) before answering detailed technical questions.

## High-Level System Overview
[2–4 sentences explaining what this product/wiki is, its core architecture/components, and how the documentation is structured.]

---

## Table of Contents
- [1. Category Name](#1-category-name)
  - [Page Title A](#page-title-a) — *1-line summary*
  - [Page Title B](#page-title-b) — *1-line summary*
- [2. Category Name](#2-category-name)
  - ...

---

## 1. Category Name

### [Page Title A](https://full-absolute-url.com/path/to/page)
**Overview:** [1–2 sentence dense summary of the page's purpose and audience.]

**Sections:**
- **[Exact Section Heading](https://full-absolute-url.com/path/to/page#verified-anchor)** *(or `**Section: "Exact Verbatim Heading"**` if anchor unverified)*: [1–2 sentence summary of facts, steps, limits, or rules covered.]
  - *Key terms/entities:* `config_key`, `POST /v1/endpoint`, `Error 429`, [other key concepts]
- **[Next Section Heading](...)**: [Dense summary.]
  - *Key terms/entities:* ...

### [Page Title B](https://full-absolute-url.com/path/to/page-b)
...
```

Begin Phase 1 now.