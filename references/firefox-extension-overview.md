# Firefox WebExtensions — LLM Documentation Index

- **Base URL:** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/
- **Scope / Version:** MDN WebExtensions documentation (English); Firefox and cross-browser extension development (Chrome/Edge compatibility notes); Manifest V2 and V3.
- **Last Indexed:** 2026-11-23
- **How to use this document:** Scan the Table of Contents and page summaries to locate candidate pages, then fetch the full URL(s) before answering detailed technical questions. Section headings are linked only when the anchor was observed on MDN; headings in quotes (or marked *anchor unverified*) were not anchor-verified, so locate them by the exact heading text after fetching. API entries list members by name; fetch the module page for member-level URLs.

## High-Level System Overview

Firefox extensions are built with the cross-browser WebExtensions API, which is largely compatible with the Chromium extension API. An extension is a directory whose `manifest.json` declares metadata, permissions, background scripts, content scripts, and UI surfaces. The documentation is organized as tutorials and concepts, UI component guides, how-to recipes, a per-module JavaScript API reference, and a reference for every `manifest.json` key. Firefox packaging, debugging, and publishing guidance lives on Extension Workshop (linked in section 8, not indexed here).

---

## Table of Contents

- [1. Getting Started & Tutorials](#1-getting-started--tutorials)
  - [Browser extensions](#browser-extensions) — *Top-level hub for Firefox extension development*
  - [What are extensions?](#what-are-extensions) — *Introduces browser extensions as HTML/CSS/JavaScript programs with access to privileged WebExtensions APIs,…*
  - [Your first extension](#your-first-extension) — *End-to-end MV3 walkthrough that builds `borderify`, a content-script extension adding a red border to…*
  - [Your second extension](#your-second-extension) — *Builds the MV3 `beastify` example: a toolbar `action` with an HTML popup, a content script injected through…*
  - [Anatomy of an extension](#anatomy-of-an-extension) — *Maps every file type in an extension package: the mandatory `manifest.json` and the optional background…*
  - [Example extensions](#example-extensions) — *Explains how to run the `mdn/webextensions-examples` repository and provides an indexed table of every…*
  - [What next?](#what-next) — *Pre-publishing checklist for extension developers: development-environment constraints, third-party library…*
- [2. Core Concepts](#2-core-concepts)
  - [JavaScript APIs](#javascript-apis) — *Entry point to the WebExtensions JavaScript API reference*
  - [Content scripts](#content-scripts) — *Complete guide to scripts injected into web pages: loading methods, permissions and restricted domains, the…*
  - [Background scripts](#background-scripts) — *Guide to extension background pages/scripts: persistent vs non-persistent (event pages), their environment,…*
  - [activeTab permission](#activetab-permission) — *Defines `activeTab`: temporary access to the tab the user is working in, granted by an explicit user action,…*
  - [Match patterns](#match-patterns) — *Syntax reference for URL match patterns used by `content_scripts`, host permissions, and `webRequest`…*
  - [Work with files](#work-with-files) — *Survey of the five extension file mechanisms: downloading files, opening files with a picker or…*
  - [Internationalization](#internationalization) — *Practical guide to localizing an extension with `_locales`/`messages.json`, `__MSG_*__` substitution in…*
  - [Content Security Policy](#content-security-policy) — *Explains the default extension CSP, its consequences (local-only code, no `eval`/inline JS, WebAssembly…*
  - [Native messaging](#native-messaging) — *How an extension exchanges JSON messages with a native OS application: host/app manifest setup…*
  - [Native manifests](#native-manifests) — *Reference for the three JSON manifests installed outside the extension: native messaging hosts, managed…*
  - [User actions](#user-actions) — *Defines "user actions" (user gestures) and the APIs that may only run inside a user-action handler under the…*
  - [Differences between API implementations](#differences-between-api-implementations) — *Summarizes cross-browser extension API differences in four areas — namespace, async handling, API coverage,…*
  - [Chrome incompatibilities](#chrome-incompatibilities) — *Catalog of Firefox vs Chrome/Safari extension differences: partially supported APIs, unsupported Chrome APIs,…*
- [3. User Interface Components](#3-user-interface-components)
  - [User interface](#user-interface) — *Index of extension UI surfaces with examples: toolbar button (browser action), address-bar button (page…*
  - [Toolbar button](#toolbar-button) — *The toolbar button (browser action/action): how to declare it in MV2 (`browser_action`) vs MV3 (`action`),…*
  - [Address bar button](#address-bar-button) — *The address bar button (page action): how it differs from the toolbar/browser action, how to declare and…*
  - [Popups](#popups) — *Popups attached to toolbar or address bar buttons: declaration via `default_popup`, lifecycle, keyboard…*
  - [Context menu items](#context-menu-items) — *Adding extension items to browser context menus, including page, tab, and bookmark contexts: item types,…*
  - [Sidebars](#sidebars) — *Extension sidebars: per-window HTML panes declared with `sidebar_action`, their lifecycle and privileged API…*
  - [Options page](#options-page) — *Creating an extension preferences page: manifest `options_ui`, opening it with `runtime.openOptionsPage()`,…*
  - [Extension pages](#extension-pages) — *Bundled HTML pages (forms, help, dialogs) that are not tied to a manifest UI slot but receive the same…*
  - [Notifications (UI)](#notifications-ui) — *OS-level notifications from an extension: the `notifications` permission, `notifications.create()` options,…*
  - [Address bar suggestions](#address-bar-suggestions) — *Customizing address bar suggestions with the `omnibox` API: manifest keyword, default suggestion, input…*
  - [devtools panels](#devtools-panels) — *Adding a custom panel to Firefox Developer Tools: the `devtools_page` manifest hook,…*
  - [Browser styles](#browser-styles) — *Styling extension UI (popups, sidebars, options pages) to match Firefox: the `browser_style` manifest…*
- [4. How-to Guides](#4-how-to-guides)
  - [Intercept HTTP requests](#intercept-http-requests) — *Contrasts `webRequest` (event-listener inspection/modification of requests) with `declarativeNetRequest`…*
  - [Modify a web page](#modify-a-web-page) — *Two ways to run content scripts — declaratively via `content_scripts` URL patterns or programmatically with…*
  - [Safely insert external content into a page](#safely-insert-external-content-into-a-page) — *Prevents XSS/privilege escalation when injecting remote text or HTML: safe DOM construction, jQuery escaping,…*
  - [Share objects with page scripts](#share-objects-with-page-scripts) — *Firefox-only (49+) techniques to break the content-script/page-script isolation safely: Xray vision,…*
  - [Add a button to the toolbar](#add-a-button-to-the-toolbar) — *MV2 tutorial for toolbar buttons (browser actions): manifest declaration, click handling with…*
  - [Implement a settings page](#implement-a-settings-page) — *Step-by-step settings/options page: HTML form, `options_ui` registration, storage-backed load/save with…*
  - [Work with the Tabs API](#work-with-the-tabs-api) — *Comprehensive Tabs API how-to: permissions, querying tabs, create/duplicate/move/update/reload/remove, zoom…*
  - [Work with the Bookmarks API](#work-with-the-bookmarks-api) — *Using the `bookmarks` API: permissions, item and folder-tree operations, bookmark events/import…*
  - [Work with the Cookies API](#work-with-the-cookies-api) — *Using the `cookies` API: permission and host-permission matrix, cookie stores (default, private, container…*
  - [Work with contextual identities](#work-with-contextual-identities) — *Firefox container tabs: managing contextual identities with `contextualIdentities`, the `cookieStoreId`…*
  - [Interact with the clipboard](#interact-with-the-clipboard) — *Clipboard access via `navigator.clipboard` plus `clipboardRead`/`clipboardWrite` permissions, with…*
  - [Extend the developer tools](#extend-the-developer-tools) — *Building devtools extensions: the `devtools_page` hook and implicit `devtools` permission, devtools page…*
  - [Build a cross-browser extension](#build-a-cross-browser-extension) — *Practical portability guide: namespace/promise differences, polyfill usage, API coverage fallbacks,…*
- [5. JavaScript APIs](#5-javascript-apis)
  - [tabs](#tabs) — *Tab lifecycle and manipulation: query/open/update/move/reload/remove tabs, inject scripts/CSS (MV2 methods;…*
  - [windows](#windows) — *Inspect and manipulate browser windows: get current/last-focused/all windows, create/update/remove windows,…*
  - [sessions](#sessions) — *Lists and restores tabs/windows closed during the current browser session (including navigation history), and…*
  - [tabGroups](#tabgroups) — *Reads and rearranges Firefox tab groups: get/move/query/update groups and observe creation/move/removal/update*
  - [action](#action) — *MV3+ toolbar button API, replacing MV2 `browserAction` and (in Chrome/Safari) `pageAction`*
  - [browserAction](#browseraction) — *MV2 toolbar button API for the `browser_action` manifest key*
  - [pageAction](#pageaction) — *Address-bar button API for the `page_action` manifest key*
  - [sidebarAction](#sidebaraction) — *Gets/sets extension sidebar properties declared via `sidebar_action`: open/close/toggle, panel URL, title,…*
  - [menus](#menus) — *Adds items to browser context menus (page, tab, bookmark, toolbar-button contexts) and supports submenus,…*
  - [notifications](#notifications) — *Creates and manages OS-level notifications with optional buttons*
  - [omnibox](#omnibox) — *Customizes address bar suggestions after the user types the manifest-defined `omnibox` keyword: default…*
  - [commands](#commands) — *Reads and updates keyboard shortcuts declared with the `commands` manifest key and listens for their execution*
  - [devtools](#devtools) — *Entry namespace for devtools extensions: `devtools.inspectedWindow`, `devtools.network`, and `devtools.panels`*
  - [find](#find) — *Finds text in a web page, highlights matches, and clears highlights*
  - [clipboard](#clipboard) — *WebExtension clipboard API for copying images to the system clipboard (the standard Clipboard API handles…*
  - [scripting](#scripting) — *Injects JavaScript/CSS into sites and registers persistent content scripts at runtime*
  - [contentScripts](#contentscripts) — *MV2 Firefox API for registering content scripts at runtime (analogue of install-time `content_scripts`)*
  - [userScripts](#userscripts) — *MV3 user-script manager API: register/update/execute third-party scripts in isolated USER_SCRIPT or MAIN…*
  - [userScripts (Legacy)](#userscripts-legacy) — *MV2 Firefox legacy user-script API*
  - [dom](#dom) — *Firefox-only extension DOM helper: retrieve an element's open or closed shadow root.*
  - [storage](#storage) — *Asynchronous extension-scoped key/value storage for JSON-ifiable values, split into `local`, `managed`,…*
  - [browsingData](#browsingdata) — *Clears accumulated browsing data (cache, cookies, downloads, history, local/session storage, form data,…*
  - [cookies](#cookies) — *Gets/sets/removes cookies and watches changes, with access bounded by host permissions*
  - [history](#history) — *Searches, adds, and removes browser history and visits, with visit-level details and events*
  - [bookmarks](#bookmarks) — *Reads and manipulates the bookmark tree: create/update/move/remove bookmarks and folders, traverse/search the…*
  - [downloads](#downloads) — *Interacts with the download manager: start, search, pause/resume/cancel downloads, open/show files or…*
  - [topSites](#topsites) — *Returns the frequently visited pages shown on the browser's New Tab page*
  - [webRequest](#webrequest) — *Event-driven HTTP/WebSocket interception: observe every request stage, cancel/redirect, modify…*
  - [declarativeNetRequest](#declarativenetrequest) — *Browser-evaluated declarative network rules (block, redirect, modify headers, upgrade, allow) organized into…*
  - [proxy](#proxy) — *Firefox proxy API: set proxy configuration and dynamically decide per request with `proxy.onRequest`,…*
  - [dns](#dns) — *Resolves domain names to DNS records*
  - [webNavigation](#webnavigation) — *Navigation-stage events at the browser-UI level (complementing HTTP-level `webRequest`):…*
  - [publicSuffix](#publicsuffix) — *Queries the browser's built-in Public Suffix List: check whether a host is a public suffix, extract its…*
  - [runtime](#runtime) — *Extension identity/environment plus the core messaging system: one-off messages, long-lived ports,…*
  - [extension](#extension) — *Legacy extension utilities: background page/view access, packaged-resource URLs, incognito and file-scheme…*
  - [extensionTypes](#extensiontypes) — *Shared type definitions used across extension APIs: image encoding details, injection options, injection…*
  - [events](#events) — *Shared event infrastructure types: add/remove listeners, declarative event rules, and URL filters used by…*
  - [i18n](#i18n) — *Localization runtime: fetch strings from `_locales`/`messages.json`, detect text language, and query…*
  - [permissions](#permissions) — *Runtime permission requests and revocation: declare optional API/host permissions and optional…*
  - [management](#management) — *Inspects and controls installed add-ons: list/get extensions, install themes, enable/disable, uninstall, read…*
  - [identity](#identity) — *OAuth2 authorization for extensions: obtain a redirect URL, register the extension as an OAuth client, launch…*
  - [idle](#idle) — *Detects system idle/locked/active state and notifies on changes*
  - [alarms](#alarms) — *Schedules code to run later or periodically, surviving event-page suspension (unlike…*
  - [browserSettings](#browsersettings) — *Modifies global browser settings, each exposed as a `BrowserSetting` object with get/set/clear and change…*
  - [privacy](#privacy) — *Access and modify privacy-related browser settings grouped into network, services, and websites, each…*
  - [theme](#theme) — *Reads and dynamically updates the browser theme (distinct from static themes declared with the `theme`…*
  - [search](#search) — *Lists installed search engines and runs searches*
  - [contextualIdentities](#contextualidentities) — *Manages Firefox container tabs (contextual identities): each has a name, color, icon, and isolated…*
  - [captivePortal](#captiveportal) — *Detects captive-portal state for the user's connection*
  - [pkcs11](#pkcs11) — *Enumerates and installs PKCS #11 security modules as browser key/certificate sources*
  - [types](#types) — *Defines the shared `BrowserSetting` type used by `browserSettings` and `privacy`.*
- [6. Manifest Keys](#6-manifest-keys)
  - [manifest.json](#manifestjson) — *Reference hub for the only mandatory extension file*
  - [manifest_version](#manifest_version) — *Mandatory numeric key declaring the manifest format version used by the extension (`"manifest_version": 3`)*
  - [name](#name) — *Mandatory string naming the extension in browser UI and add-on stores*
  - [version](#version) — *Mandatory version string for the extension: 1–4 dot-separated numbers (`1.2.3.4`), no leading zeros*
  - [version_name](#version_name) — *Optional display-only version string (e.g*
  - [description](#description) — *Optional short description shown in browser UI; Chromium limits it to 132 characters (other browsers may…*
  - [author](#author) — *Optional author name for display, MV2+, localizable*
  - [developer](#developer) — *Optional object with developer `name` and `url` for browser UI, MV2+*
  - [homepage_url](#homepage_url) — *Optional URL for the extension's home page, MV2+, localizable*
  - [short_name](#short_name) — *Optional short display name, MV2+, used where `name` is too long; recommended ≤12 characters, with `name`…*
  - [icons](#icons) — *Optional size-to-path map for extension icons (add-ons manager and other UI), MV2+*
  - [default_locale](#default_locale) — *Conditional string: required when `_locales` exists, forbidden otherwise*
  - [browser_specific_settings](#browser_specific_settings) — *Host-specific configuration*
  - [incognito](#incognito) — *Optional string controlling private-window behavior (MV2+): `"spanning"` (default; sees private and normal…*
  - [background](#background) — *Declares the extension's background context, MV2+*
  - [content_scripts](#content_scripts) — *Declarative content-script registration, MV2+*
  - [user_scripts](#user_scripts) — *MV2-only object declaring the legacy user-script API script (`api_script`) that exports custom methods to…*
  - [sandbox](#sandbox) — *Designates extension pages as sandboxed (opaque origin): no WebExtension APIs, no same-origin access to the…*
  - [action (manifest key)](#action-manifest-key) — *MV3+ toolbar button declaration, replacing `browser_action`*
  - [browser_action](#browser_action) — *MV2 toolbar button declaration, replaced by `action` in MV3*
  - [page_action](#page_action) — *MV2+ address-bar button declaration*
  - [sidebar_action](#sidebar_action) — *MV2+ sidebar declaration*
  - [options_page](#options_page) — *Optional string (MV2+) pointing to an options page opened in a new tab*
  - [options_ui](#options_ui) — *MV2+ options page declaration*
  - [devtools_page](#devtools_page) — *Optional string (MV2+) pointing to a bundled HTML devtools page, enabling the `devtools` APIs*
  - [commands (manifest key)](#commands-manifest-key) — *MV2+ keyboard shortcut definitions: each named command has optional `suggested_key` (per-platform…*
  - [omnibox (manifest key)](#omnibox-manifest-key) — *Optional object (MV2+) defining an address-bar keyword*
  - [theme (manifest key)](#theme-manifest-key) — *Defines a static Firefox theme (MV2+): `images` (`theme_frame`, `additional_backgrounds`;…*
  - [dark_theme](#dark_theme) — *Optional static theme used when Firefox runs the dark color scheme; same `images`/`colors`/`properties`…*
  - [theme_experiment](#theme_experiment) — *Firefox-only experimental theme extension: maps internal CSS variables/selectors to new `theme` properties…*
  - [permissions (manifest key)](#permissions-manifest-key) — *MV2+ array of install-time permissions: host permissions (MV2; MV3 uses `host_permissions`), API permission…*
  - [host_permissions](#host_permissions) — *MV3+ array of install-time host match patterns for APIs that read/modify host data (`cookies`, `webRequest`,…*
  - [optional_permissions](#optional_permissions) — *MV2+ array of permissions requestable at runtime via `permissions.request()`*
  - [optional_host_permissions](#optional_host_permissions) — *MV3+ array of host match patterns that can be requested at runtime with the `permissions` API*
  - [content_security_policy](#content_security_policy) — *Overrides the default extension CSP*
  - [web_accessible_resources](#web_accessible_resources) — *Exposes packaged resources (images/HTML/CSS/JS) to web pages and other extensions*
  - [externally_connectable](#externally_connectable) — *Controls which extensions (`ids`) and web pages (`matches`) may message this extension via…*
  - [declarative_net_request](#declarative_net_request) — *Declares static DNR rulesets (MV2+): `rule_resources` entries with `id` (non-empty; leading `_` reserved),…*
  - [protocol_handlers](#protocol_handlers) — *Firefox-only MV2+ array registering web-based protocol handlers*
  - [chrome_settings_overrides](#chrome_settings_overrides) — *MV2+ object overriding the browser homepage (`homepage`, localizable*
  - [chrome_url_overrides](#chrome_url_overrides) — *MV2+ object replacing built-in pages: `newtab`, `bookmarks`, `history`*
  - [dictionaries](#dictionaries) — *MV2+ object mapping a locale code to a bundled Hunspell `.dic` dictionary (the matching `.aff` sits…*
  - [storage (manifest key)](#storage-manifest-key) — *MV2+ object declaring `managed_schema`, a path to a JSON schema for enterprise-managed storage read through…*
- [7. Compatibility & Cross-browser Development](#7-compatibility--cross-browser-development)
  - [Browser support for JavaScript APIs](#browser-support-for-javascript-apis) — *Master compatibility page with one section per WebExtensions API module, each containing browser-support…*
- [8. External References — Extension Workshop](#8-external-references--extension-workshop)

---

## 1. Getting Started & Tutorials

### [Browser extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
**Overview:** Top-level hub for Firefox extension development. Explains that Firefox extensions use the WebExtensions API, are largely compatible with Chromium extensions, and routes readers to tutorials, concepts, UI guides, how-tos, and the API/manifest references.

**Sections:**
- **[Key resources](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#key_resources)**: Entry points to the guides, the JavaScript API and manifest-key references, and the Extension Workshop for Firefox workflow.
  - *Key terms/entities:* [Guides](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#guides), [References](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#references), [Firefox workflow](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#firefox_workflow_2), `extensionworkshop.com`
- **[Get started](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#get_started)**: Onboarding path: what extensions can do, first and second extension tutorials, anatomy, example extensions, and further resources.
  - *Key terms/entities:* `Your_first_WebExtension`, `Your_second_WebExtension`, `Anatomy_of_a_WebExtension`, `Examples`, `What_next`
- **[Concepts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#concepts)**: Indexes the conceptual guides: API overview, content scripts, background scripts, `activeTab`, match patterns, files, internationalization, CSP, native messaging/manifests, user actions, implementation differences, Chrome incompatibilities.
- **[User interface](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#user_interface)**: Index of toolbar/address-bar buttons, popups, context menus, sidebars, options pages, extension pages, notifications, omnibox, and devtools panels.
- **[How to](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#how_to)**: Task-focused tutorials for HTTP interception, page modification, toolbar buttons, settings pages, Tabs/Bookmarks/Cookies APIs, clipboard, devtools, and cross-browser builds.
- **[Firefox workflow](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#firefox_workflow)**: Points to Extension Workshop for temporary installation, debugging, permissions, `web-ext`, porting Chrome extensions, Android differences, and publishing.
- **[Reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#reference)**: Two reference trees: [JavaScript APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#javascript_apis) (methods, properties, types, events, per-browser compatibility) and [Manifest keys](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions#manifest_keys) (all keys, properties, settings).
  - *Key terms/entities:* `browser` namespace, `chrome` namespace, Promises vs callbacks, `manifest.json`

### [What are extensions?](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_are_WebExtensions)
**Overview:** Introduces browser extensions as HTML/CSS/JavaScript programs with access to privileged WebExtensions APIs, broadly portable across Chrome, Safari, Edge, and Opera. Frames extension use cases and points to the first-extension tutorial.

**Sections:**
- **["What's next?"](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_are_WebExtensions#whats_next)**: Onboarding links to the first extension tutorial, the anatomy guide, and runnable examples.
  - *Key terms/entities:* WebExtensions APIs, cross-browser compatibility, theme add-ons, content manipulation, developer-tools extensions, `extensionworkshop.com`

### [Your first extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension)
**Overview:** End-to-end MV3 walkthrough that builds `borderify`, a content-script extension adding a red border to `mozilla.org` pages; covers manifest authoring, icons, temporary installation, debugging reloads, and signing.

**Sections:**
- **[Writing the extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#writing_the_extension)**: Creates the project directory and files.
  - **[manifest.json](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#manifest.json)**: Mandatory `manifest_version` (3), `name`, `version`; `description`; `icons`; Firefox-required `browser_specific_settings.gecko.id` and `data_collection_permissions` (required for AMO); `content_scripts` with `matches: ["*://*.mozilla.org/*"]` and `js`.
  - **[icons/border-48.png](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#iconsborder-48.png)**: 48x48 PNG, optional 96px for high-DPI, SVG auto-scaled.
  - **[borderify.js](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#borderify.js)**: Content script runs with direct DOM access.
- **[Trying it out](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#trying_it_out)**: [Installing](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing) via `about:debugging` → **This Firefox** → **Load Temporary Add-on** (or `web-ext`); [Testing](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#testing) includes private-window opt-in and the AMO content-script block.
- **[Packaging and publishing](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#packaging_and_publishing)**: Package and submit to Mozilla for signing; links to Extension Workshop.
- **[What's next?](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#whats_next)**: Links to second extension, anatomy, examples, `What_next`.
  - *Key terms/entities:* `manifest_version`, `browser_specific_settings`, `data_collection_permissions`, `content_scripts`, `matches`, `about:debugging`, `about:addons`, `web-ext`

### [Your second extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension)
**Overview:** Builds the MV3 `beastify` example: a toolbar `action` with an HTML popup, a content script injected through `browser.scripting`, popup↔content-script messaging, and `web_accessible_resources` images. Also covers temporary loading and `web-ext run`.

**Sections:**
- **[Writing the extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#writing_the_extension)**:
  - **[manifest.json](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#manifest.json)**: Adds `homepage_url`, `permissions: ["activeTab", "scripting"]`, `action` (`default_icon`, `theme_icons` light/dark/size, `default_title`, `default_popup`), and `web_accessible_resources` (`resources`, `matches`); all paths relative to the manifest.
  - **[The icon](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#the_icon)**: 48x48 required size choice, optional 96 for high-DPI.
  - **[The toolbar button](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#the_toolbar_button)**: `action` key is optional; without a popup, clicks dispatch `action.onClicked`; `theme_icons` selects light/dark variants.
  - **[The popup](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#the_popup)**: `choose_beast.html/css/js`; queries the active tab, calls `browser.scripting.executeScript()` with `files`, injects/removes CSS with `browser.scripting.insertCSS()` / `removeCSS()`, resolves packaged URLs with `browser.runtime.getURL()`, messages via `browser.tabs.sendMessage()`; handles failures on privileged pages and AMO.
  - **[The content script](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#the_content_script)**: `window.hasRun` re-injection guard; listens with `browser.runtime.onMessage` for `beastify` / `reset` commands.
  - **[The beasts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#the_beasts)**: Packaged JPEG assets served through `web_accessible_resources`.
- **[Testing it out](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#testing_it_out)**: Load `manifest.json` via `about:debugging`; pin the action to the toolbar.
- **[Developing from the command line](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#developing_from_the_command_line)**: `web-ext run`.
- **[What next?](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_second_WebExtension#what_next)**: Anatomy, examples, `What_next`.
  - *Key terms/entities:* `action`, `action.onClicked`, `browser.scripting.executeScript`, `browser.scripting.insertCSS`, `browser.scripting.removeCSS`, `browser.tabs.sendMessage`, `browser.runtime.onMessage`, `browser.runtime.getURL`, `activeTab`, `web_accessible_resources`, `about:debugging`, `web-ext run`

### [Anatomy of an extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension)
**Overview:** Maps every file type in an extension package: the mandatory `manifest.json` and the optional background scripts, icons, sidebars/popups/options, extension pages, content scripts, and web-accessible resources. Explains persistent vs non-persistent backgrounds and content-script isolation.

**Sections:**
- **[manifest.json](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#manifest.json)**: The only mandatory file; holds metadata, permissions, and pointers to background scripts, icons, UI documents, content scripts, and web-accessible resources.
- **[Background scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#background_scripts)**: Persistent scripts load at startup and stay loaded (MV2 only); non-persistent scripts load on events and unload when idle (MV3 only, MV2 opt-in); full API access subject to permissions.
- **[Sidebars, popups, and options pages](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#sidebars_popups_and_options_pages)**: HTML documents referenced by manifest properties; may include CSS/JS and receive privileged API access unlike normal pages.
- **"Extension pages"** *(anchor unverified)*: Bundled HTML with no manifest entry; loaded with `windows.create()` or `tabs.create()`; same privileged API access as background scripts.
- **[Content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#content_scripts)**: Injected scripts share the page DOM but not page JS; use a limited API subset, message the background, and can `window.postMessage()` to page scripts; CSS injection uses the same mechanism.
- **[Web accessible resources](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#web_accessible_resources)**: Images, HTML, CSS, or JS exposed to page/content scripts through an extension URI scheme, e.g. `<img src>` references.
  - *Key terms/entities:* persistent background, non-persistent background (event page), `manifest.json`, `browser.runtime`, `window.postMessage()`, `windows.create()`, `tabs.create()`, `web_accessible_resources`

### [Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Examples)
**Overview:** Explains how to run the `mdn/webextensions-examples` repository and provides an indexed table of every example extension with the APIs each demonstrates (e.g. `beastify`, `annotate-page`, `apply-css`, DNR demos, native messaging, `userScripts-mv3`). Examples target Firefox Nightly, may work on earlier versions per `strict_min_version`, and do not work in private browsing by default.

**Sections:**
- **"Example table"** *(single-page table, no H2 headings observed)*: Per-example description plus exact API members, useful as runnable reference implementations.
  - *Key terms/entities:* `mdn/webextensions-examples`, `web-ext run`, Load Temporary Add-on, `strict_min_version`, AMO (do not submit examples), `github.com/mdn/webextensions-examples`

### [What next?](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_next)
**Overview:** Pre-publishing checklist for extension developers: development-environment constraints, third-party library rules, AMO signing, the review process, and featured-extension guidelines. Ends with learning paths into the API, UI, how-to, and manifest references.

**Sections:**
- **[Your development environment](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_next#your_development_environment)**: No special tooling required; minified/obfuscated builds must ship source to AMO review, and minifiers/build tools must be open source or unlimited-free and runnable by reviewers on Windows/macOS/Linux.
- **[Third-party libraries](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_next#third-party_libraries)**: Allowed and considered in review; download from official sources, link source for minified libraries, and do not modify them.
- **[The Firefox Add-on Distribution Agreement](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_next#the_firefox_add-on_distribution_agreement)**: Extensions must be signed for release/beta Firefox; signing is performed on AMO under the distribution agreement.
- **[The review process](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_next#the_review_process)**: Automated review, possible manual review, signing withheld until automated review passes, signing may be revoked; AMO policy guidelines.
- **[AMO featured browser extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_next#amo_featured_browser_extensions)**: Guidelines for extensions selected for featuring on AMO and Mozilla properties.
- **[Continue your learning experience](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_next#continue_your_learning_experience)**: Deep links into the API, UI, how-to, compatibility, and manifest references, plus Extension Workshop categories.
  - *Key terms/entities:* AMO, signing, source-code submission, Firefox Add-on Distribution Agreement, review policy, featured extensions, `strict_min_version`

---

## 2. Core Concepts

### [JavaScript APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API)
**Overview:** Entry point to the WebExtensions JavaScript API reference. Explains where extension APIs are available (background scripts, action/page-action popups, sidebars, options pages, new-tab overrides; limited subset in content scripts), the `browser` namespace with Promises, `chrome` compatibility, permissions, and the complete API listing.

**Sections:**
- **[Browser namespace differences](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API#browser_namespace_differences)**: Firefox and Safari use `browser` + Promises; Chromium historically used `chrome` + callbacks, with `browser` support from Chrome 148 and full support (including DevTools pages) from Chrome 152; Firefox also supports `chrome`/callbacks, and `webextension-polyfill` normalizes Chrome.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API#examples)**: Run API snippets in the Toolbox console: `about:debugging` → **This Firefox** → **Inspect** an extension → **Console**.
- **[JavaScript API listing](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API#javascript_api_listing)**: One-line description and link for every API module.
  - *Key terms/entities:* `browser` namespace, `chrome` namespace, Promises, `browser.tabs.query`, `browser.cookies.set`, `permissions`, content scripts, `webextension-polyfill`, `about:debugging`

### [Content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)
**Overview:** Complete guide to scripts injected into web pages: loading methods, permissions and restricted domains, the isolated/Xray DOM environment, the limited WebExtension API subset, XHR/fetch behavior, background messaging, page-script messaging, and `eval()` rules.

**Sections:**
- **"Loading content scripts"** *(anchor unverified)*: Declare `content_scripts` in the manifest; register at runtime with `scripting.registerContentScripts()` (or MV2 `contentScripts`); inject into a tab with `scripting.executeScript()` (or MV2 `tabs.executeScript()`); one global scope per frame per extension.
  - **"Persistence"**: `executeScript()` scripts are one-shot; manifest/registered scripts persist across restarts and updates unless registered as non-persistent.
- **"Permissions, restrictions, and limitations"**:
  - **[Permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#permissions)**: Registered scripts need host permissions; programmatic injection needs `activeTab` or host permissions plus the `scripting` permission.
  - **"Restricted domains"**: Blocks AMO and Mozilla account/support domains (plus Chrome's web store equivalent); enterprise policies can restrict further via `restricted_domains` / `runtime_blocked_hosts`.
  - **"Limitations"**: No injection into `about:blank`, `about:srcdoc`, `data:`, or `blob:` without `match_origin_as_fallback` / `matchOriginAsFallback`; no privileged UI pages (`about:debugging`, `about:addons`, reader view, view-source, PDF viewer) or extension pages.
- **"Content script environment"**:
  - **"DOM access"**: Clean DOM view (Firefox Xray vision, Chrome isolated world): no page JS variables or redefined-property changes; bundle libraries as content scripts; `cloneInto()` / `exportFunction()` bridge page objects.
  - **[WebExtension APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#webextension_apis)**: All `storage`; `extension.getURL` / `inIncognitoContext`; `runtime.connect`/`getDocumentId`/`getFrameId`/`getManifest`/`getVersion`/`getURL`/`onConnect`/`onMessage`/`sendMessage`; `i18n.getMessage`/`getAcceptLanguages`/`getUILanguage`/`detectLanguage`; `menus.getTargetElement`.
  - **"XHR and Fetch"**: Standard `fetch()`/`XMLHttpRequest`; MV2 Firefox requests use absolute URLs and extension context; MV3/Chrome requests use page context and CORS; host permissions apply only in extension pages, not content scripts under MV3; `content.XMLHttpRequest`/`content.fetch()` exist only in MV2 Firefox.
  - **"Secure contexts"**: APIs requiring secure contexts (e.g. `crypto.subtle`, geolocation) follow the injected page's context.
- **[Communicating with background scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#communicating_with_background_scripts)**: One-off messages via `runtime.sendMessage()` / `tabs.sendMessage()` + `runtime.onMessage`; long-lived `runtime.connect()` / `tabs.connect()` + `runtime.onConnect`, exchanging via `runtime.Port.postMessage()` / `port.onMessage`; use one-off for single responses, ports for sessions/progress.
  - **"Communicating with the web page"**: `window.postMessage()` + `addEventListener("message")`; must validate `event.source`/payload and never `eval()` untrusted messages.
  - **"Using eval() in content scripts"**: `eval()` unavailable in MV3; Chrome `eval`/`window.eval` both run in the content script, Firefox `window.eval()` runs in the page; same for `setTimeout`, `setInterval`, `Function()`.
  - *Key terms/entities:* `content_scripts`, `scripting.registerContentScripts`, `scripting.executeScript`, `activeTab`, host permissions, `match_origin_as_fallback`, `runtime.Port`, `window.postMessage`, Xray vision, isolated world, `moz-extension:`, `cloneInto`, `exportFunction`

### [Background scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Background_scripts)
**Overview:** Guide to extension background pages/scripts: persistent vs non-persistent (event pages), their environment, manifest wiring, event-listener rules, event filters, unload/suspend behavior, and converting persistent MV2 scripts to the MV3 non-persistent model.

**Sections:**
- **"Background script environment"**: **DOM APIs** — `window` plus standard DOM, but Firefox blocks `alert()`, `confirm()`, `prompt()`. **WebExtension APIs** — full API surface subject to permissions. **Cross-origin access** — XHR to hosts with host permissions. **Web content** — no direct page access; inject content scripts and message them. **Content security policy** — blocks dangerous operations such as `eval()`.
- **"Implementing background scripts"**:
  - **"Specify the background scripts"**: Manifest `background` key; MV2 needs `"persistent": false` for an event page, MV3 is always non-persistent; `"type": "module"` for ES modules; `"page"` alternative for HTML background pages (cannot combine `scripts` and `page`); cross-browser Chrome service workers need both `scripts` and `service_worker` keys.
  - **"Initialize the extension"**: `runtime.onInstalled` is the place for one-time state and stateful APIs such as `menus.create`.
  - **"Add listeners"**: Register listeners synchronously in the top-level scope; listeners added in `window.onload` are not persisted; `removeListener` stops the browser waking the script for that event.
  - **"Filter events"**: Use event filters such as `webNavigation.onCompleted` with `{ url: [{ urlMatches }] }`; `tabs.onUpdated` filters work on Firefox desktop.
  - **"React to listeners"**: Use the event's `tabId`/`frameId` instead of the current tab when calling `scripting.executeScript`.
  - **"Unload background scripts"**: Persist state with `storage.local`/`storage.session`; ports close on idle; `runtime.Port.onDisconnect`; `runtime.onSuspend` / `onSuspendCanceled`; scripts unload after seconds of inactivity.
- **[Convert to non-persistent](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Background_scripts#convert_to_non-persistent)**: Set `persistent: false`; move listeners to top level; replace globals with `storage.session`/`storage.local`; replace `setTimeout`/`setInterval` with the `alarms` API; replace `runtime.getBackgroundPage` access with `runtime.sendMessage()`/`runtime.connect()`.
  - *Key terms/entities:* `background`, `persistent`, `type: "module"`, `service_worker`, `runtime.onInstalled`, `runtime.onSuspend`, `runtime.onSuspendCanceled`, `runtime.onStartup`, `storage.session`, `alarms`, `runtime.getBackgroundPage`, `browser.runtime.Port.onDisconnect`

### [activeTab permission](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/activeTab_permission)
**Overview:** Defines `activeTab`: temporary access to the tab the user is working in, granted by an explicit user action, avoiding broad host permissions and install-time warnings. Covers how it is requested, granted, scoped, revoked, and how browsers differ.

**Sections:**
- **"Request the activeTab permission"** *(anchor unverified)*: Add `"permissions": ["activeTab"]`; it is an API permission, not a host permission; can also go in `optional_permissions` and be requested with `permissions.request()` (silently granted); `scripting` is still required to inject.
- **"How activeTab is granted"**: User actions: toolbar/page-action click, context-menu selection (`menus.onClicked`), keyboard shortcut (`commands.onCommand`), omnibox suggestion (Firefox 142+), or a tab-strip menu item (grants the clicked tab, not necessarily the active one).
- **"What activeTab grants"**: Inject JS/CSS via `scripting` (or MV2 `tabs.executeScript`/`tabs.insertCSS`); read privileged `tabs.Tab` fields `url`, `title`, `favIconUrl`; `tabs.captureVisibleTab()` (Firefox 126+); `declarativeNetRequest.getMatchedRules()`.
- **"Scope of the access"**: Top-level page plus same-origin frames; cross-origin frames need host permissions; the same restricted domains/schemes as content scripts apply (reader view, view-source, PDF viewer, browser UI).
- **"When the access ends"**: Tied to the document/user interaction; new-document navigation ends access, same-document navigation does not; finish work or capture data during the grant.
- **"Example"**: MV3 manifest with `activeTab` + `scripting`, `action.onClicked` → `scripting.executeScript({ target: { tabId }, func })`; the click also makes `tab.url`/`tab.title` readable.
- **"Browser compatibility"**: Firefox, Safari, and Chromium support it with different grants and revocation. Firefox exposes only the active tab; Chrome/Safari derive host permissions from the tab URL (extra same-origin/cookie access). Chrome keeps access across same-origin navigations; Safari ties it to the document URL; Firefox revokes on any new document but restores it from bfcache. Firefox lacks `webRequest`/`declarativeNetRequest` access via `activeTab`.
- **"See also"**: `permissions`, `optional_permissions`, User actions, Content scripts, Extension Workshop permissions guidance, Chrome `activeTab` docs.
  - *Key terms/entities:* `activeTab`, `permissions`, `optional_permissions`, `permissions.request()`, `scripting`, `tabs.executeScript`, `tabs.captureVisibleTab`, `declarativeNetRequest.getMatchedRules`, `menus.ContextType`, bfcache

### [Match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)
**Overview:** Syntax reference for URL match patterns used by `content_scripts`, host permissions, and `webRequest` listeners: `<scheme>://<host><path>`, wildcard rules, `<all_urls>`, valid/invalid examples, and browser scheme differences.

**Sections:**
- **"Match pattern structure"** *(anchor unverified)*: Three parts — scheme, host, path. Scheme `*` means http/https (plus ws/wss in some browsers); explicit values include `http`, `https`, `ws`, `wss`, `ftp`, `data`, `file`, `(chrome-)extension`. Host may be `*`, `*.domain` (wildcard only at the start; optional port), or an exact host; Firefox does not support ports; host is optional only for `file`.
  - **"path"**: Must start with `/`; `*` may appear anywhere and multiple times; matches path plus query string including `?`; URL fragments are ignored and a pattern containing `#` never matches.
- **[<all_urls>](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns#all_urls)**: Matches `http`, `https`, `ws`, `wss`, `ftp`, `data`, and `file` URLs.
- **"Examples"**: Table of patterns such as `*://*/*`, `*://*.mozilla.org/*`, `https://*/path`, `https://mozilla.org/*`, `https://mozilla.org/a/b/c/`, `https://mozilla.org/*/b/*/`, and `file:///blah/*` with matching/non-matching URLs.
- **"Invalid or unmatched patterns"**: Unsupported scheme, missing path, fragment (`#section1`), misplaced host wildcard, `http*://`, `*://*` (empty path), and `file://*` (Chrome auto-corrects in `host_permissions`).
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns#browser_compatibility)**: Scheme support varies by browser.
  - *Key terms/entities:* `<all_urls>`, `*://*.mozilla.org/*`, scheme, host, path, query string, `host_permissions`, `content_scripts`, `webRequest`

### [Work with files](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files)
**Overview:** Survey of the five extension file mechanisms: downloading files, opening files with a picker or drag-and-drop, storing blobs in IndexedDB with `idb-file-storage`, and handing files to a native app through native messaging.

**Sections:**
- **[Download files using the downloads API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#download_files_using_the_downloads_api)**: `downloads.download({ url })`, `saveAs` for user-chosen location, `URL.createObjectURL()` for in-memory blobs; also cancel/pause/resume/erase/remove/search/open/show; requires the `downloads` API permission.
- **[Open files in an extension using a file picker](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#open_files_in_an_extension_using_a_file_picker)**: `<input type="file">` plus the DOM File API; `webkitdirectory="true"` selects whole folders.
- **[Open files in an extension using drag and drop](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#open_files_in_an_extension_using_drag_and_drop)**: `dragenter`/`dragover`/`drop` listeners; read files from `DataTransfer.files`.
- **[Store files data locally using the IndexedDB file storage library](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#store_files_data_locally_using_the_indexeddb_file_storage_library)**: `idb-file-storage` wraps IndexedDB with `getFileStorage()` and `IDBFileStorage.list()/put()/get()/remove()`; [Creating the store and saving the images](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#creating_the_store_and_saving_the_images), [Retrieving stored images for display](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#retrieving_stored_images_for_display) (blob URLs via `URL.createObjectURL()`), [Delete collected images](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#delete_collected_images) (`URL.revokeObjectURL()`).
- **[Process files in a local app](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#process_files_in_a_local_app)**: Native messaging; [Connection-based messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#connection-based_messaging) via `runtime.connectNative()` + `runtime.Port.postMessage()`/`onMessage`; [Connectionless messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files#connectionless_messaging) via `runtime.sendNativeMessage()`; requires `nativeMessaging` permission and `allowed_extensions` in the native manifest.
  - *Key terms/entities:* `downloads.download`, `saveAs`, `URL.createObjectURL`, `DataTransfer.files`, `idb-file-storage`, `getFileStorage`, `IDBFileStorage`, `runtime.connectNative`, `runtime.sendNativeMessage`, `nativeMessaging`, `allowed_extensions`

### [Internationalization](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization)
**Overview:** Practical guide to localizing an extension with `_locales`/`messages.json`, `__MSG_*__` substitution in manifests and CSS, the `i18n` API, placeholder substitution, locale fallback order, predefined messages, and testing.

**Sections:**
- **[Anatomy of an internationalized extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#anatomy_of_an_internationalized_extension)**: `_locales/<language>/messages.json` plus manifest metadata, JS locale retrieval, and locale-dependent CSS.
- **[Providing localized strings in _locales](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#providing_localized_strings_in__locales)**: Language subtags; folder names use underscores (`en_US`, not `en-US`); each `messages.json` entry has `message`, `description`, optional `placeholders` with `content: "$1"` and `example`.
- **[Internationalizing manifest.json](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#internationalizing_manifest.json)**: Use `__MSG_extensionName__` syntax for localized name/description and set `default_locale`; [Retrieving localized strings in manifests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#retrieving_localized_strings_in_manifests), [Specifying a default locale](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#specifying_a_default_locale).
- **[Locale-dependent CSS](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#locale-dependent_css)**: `__MSG_extensionName__` and predefined messages usable inside CSS URLs/properties.
- **[Retrieving message strings from JavaScript](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#retrieving_message_strings_from_javascript)**: `i18n.getMessage()`, `getAcceptLanguages()`, `getUILanguage()`, `detectLanguage()`; placeholders `$URL$` map to `$1`/`$2`; [Direct placeholder usage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#direct_placeholder_usage) vs named placeholders (best practice); [Hardcoded substitution](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#hardcoded_substitution).
- **[Localized string selection](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#localized_string_selection)**: Precedence: exact browser locale → language-script → language → `default_locale`; missing message returns an empty string.
- **[Predefined messages](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#predefined_messages)**: `@@extension_id` (not `runtime.id`), `@@ui_locale`, `@@bidi_dir`, `@@bidi_reversed_dir`, `@@bidi_start_edge`, `@@bidi_end_edge`.
- **[Testing your extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#testing_your_extension)**: Extension Workshop localization testing; Chrome locale instructions.
  - *Key terms/entities:* `_locales`, `messages.json`, `__MSG_extensionName__`, `default_locale`, `i18n.getMessage`, `getAcceptLanguages`, `getUILanguage`, `detectLanguage`, `$1`, `$URL$`, `placeholders`, `@@ui_locale`, `@@bidi_dir`

### [Content Security Policy](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy)
**Overview:** Explains the default extension CSP, its consequences (local-only code, no `eval`/inline JS, WebAssembly restrictions, HTTPS upgrades in MV3), how to override it via `content_security_policy`, and content-script CSP rules.

**Sections:**
- **[Default content security policy](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#default_content_security_policy)**: MV2 default `script-src 'self'; object-src 'self';`; MV3 default `script-src 'self'; upgrade-insecure-requests;`.
  - **[Location of script and object resources](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#location_of_script_and_object_resources)**: `<script>`, ES modules, and workers must be packaged locally; remote scripts blocked (AMO rejects extensions that allow them); localhost exception for development (unpacked MV3 from Chrome 110, temporary add-ons from Firefox 147) via `content_security_policy.extension_pages`.
  - **[eval() and friends](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#eval_and_friends)**: `eval()`, string-based `setTimeout()`, and `new Function()` are blocked; isolate such libraries in a `sandbox` page.
  - **[Inline JavaScript](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#inline_javascript)**: No inline `<script>` or inline event handlers; use `DOMContentLoaded`/`load` listeners.
  - **[WebAssembly](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#webassembly)**: Requires `'wasm-unsafe-eval'` in `script-src` (Firefox 102+, Chrome 103+); Firefox MV2 has a legacy exception; Chrome ≤101 cannot use Wasm.
  - **[Upgrade insecure network requests in Manifest V3](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#upgrade_insecure_network_requests_in_manifest_v3)**: `upgrade-insecure-requests` rewrites `http:` to `https:`; can be overridden, but Add-on Policies require secure transmission of user data; prefer `https://`/`*://` in `host_permissions`.
- **[CSP for content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#csp_for_content_scripts)**: MV2 content scripts have no CSP; MV3 content scripts share the extension CSP with no separate policy; Firefox applies extension CSP to JS features and page CSP to most DOM APIs; Chrome applies extension CSP to many DOM APIs.
  - *Key terms/entities:* `content_security_policy`, `script-src`, `object-src`, `upgrade-insecure-requests`, `'wasm-unsafe-eval'`, `eval()`, `new Function()`, `sandbox`, `extension_pages`, `localhost`

### [Native messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)
**Overview:** How an extension exchanges JSON messages with a native OS application: host/app manifest setup (`allowed_extensions`, `path`, `type: "stdio"`), the `nativeMessaging` permission, connection-based vs connectionless messaging, stdio framing limits, shutdown behavior, and troubleshooting.

**Sections:**
- **"Setup"** *(anchor unverified)*: **Extension manifest** — `nativeMessaging` (or optional) permission and an explicit `browser_specific_settings.gecko.id`; **App manifest** — `name`, `description`, `path`, `"type": "stdio"`, `allowed_extensions` (Chrome uses `allowed_origins` with `chrome-extension://` URLs); app manifests are installed/updated outside the browser.
  - **"Windows setup"**: Use a `.bat` launcher if needed; registry keys `HKEY_CURRENT_USER\Software\Mozilla\NativeMessagingHosts\<name>` or the `HKEY_LOCAL_MACHINE` equivalent, default value pointing at the app manifest; `check_config_win.py` troubleshooting.
- **"Exchanging messages"**: Not usable from content scripts; background scripts relay messages.
  - **"Connection-based messaging"**: `runtime.connectNative(name)` returns a `runtime.Port`; app starts with the manifest path and add-on ID (Firefox 55+); send with `port.postMessage()`, receive with `port.onMessage`; runs until `Port.disconnect()` or page close.
  - **"Connectionless messaging"**: `runtime.sendNativeMessage(name, message, callback)` starts a new app instance per message; first app message is the response.
  - **"App side"**: JSON, UTF-8, prefixed with an unsigned 32-bit native-byte-order length; app→extension max 1 MB, extension→app max 4 GB; Node/Python examples with stdio handling.
- **"Closing the native app"**: Connection-based apps stop on disconnect/page close; connectionless apps exit after responding; `SIGTERM` then `SIGKILL` on macOS/Linux; Windows Job object kill, with `CREATE_BREAKAWAY_FROM_JOB` for surviving subprocesses.
- **"Troubleshooting"**: Check the browser console; stderr is redirected. Common errors: `No such native application`, `Invalid application`, `'python' is not recognized`, `File at path ... does not exist, or is not executable`, missing `allowed_extensions`, `connectNative is not a function`.
- **[Chrome incompatibilities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging#chrome_incompatibilities)**: Differs in app arguments, manifest location, and `allowed_origins` vs `allowed_extensions`.
  - *Key terms/entities:* `nativeMessaging`, `allowed_extensions`, `allowed_origins`, `runtime.connectNative`, `runtime.sendNativeMessage`, `runtime.Port`, `"type": "stdio"`, `HKEY_CURRENT_USER\Software\Mozilla\NativeMessagingHosts`

### [Native manifests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests)
**Overview:** Reference for the three JSON manifests installed outside the extension: native messaging hosts, managed storage, and PKCS #11 modules. Covers each schema (`type: "stdio"`, `"storage"`, `"pkcs11"`, `allowed_extensions`) and exact per-OS file/registry locations.

**Sections:**
- **[Native messaging manifests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#native_messaging_manifests)**: Filename matches the `name` passed to `runtime.connectNative()`/`sendNativeMessage()`; properties `name` (regex `^\w+(\.\w+)*$`), `description`, `path` (absolute on macOS/Linux), `type: "stdio"`, `allowed_extensions` (add-on IDs).
- **[Managed storage manifests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#managed_storage_manifests)**: Filename is the extension ID; `name`, `description`, `type: "storage"`, and arbitrary `data` exposed read-only through `storage.managed` (`browser.storage.managed.get("color")`).
- **[PKCS #11 manifests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#pkcs_11_manifests)**: Filename matches the module name; `name`, `description` (friendly name in browser UI), `path`, `type: "pkcs11"`, `allowed_extensions`; load with `pkcs11.installModule("<name>")`.
- **[Manifest location](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#manifest_location)**: [Windows](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#windows) registry `HKLM|HKCU\SOFTWARE\Mozilla\{NativeMessagingHosts|ManagedStorage|PKCS11Modules}\<name>` (default value = manifest path; Wow6432Node checked first from Firefox 64); [macOS](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#macos) `/Library/Application Support/Mozilla/...` or `~/Library/Application Support/Mozilla/...`; [Linux](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#linux) `/usr/lib/mozilla/...`, `/usr/lib64/mozilla/...`, or `~/.mozilla/...` with type-specific subdirectories.
  - *Key terms/entities:* `allowed_extensions`, `"type": "stdio"`, `"type": "storage"`, `"type": "pkcs11"`, `storage.managed`, `pkcs11.installModule()`, `NativeMessagingHosts`, `ManagedStorage`, `PKCS11Modules`, `browser_specific_settings`

### [User actions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/User_actions)
**Overview:** Defines "user actions" (user gestures) and the APIs that may only run inside a user-action handler under the "no surprises" principle. Lists qualifying interactions and the enabled APIs, including `activeTab`, plus the async/handler caveats.

**Sections:**
- **"Qualifying user actions"** *(anchor unverified)*: Clicking a toolbar/page action, selecting an extension context-menu item, activating an extension keyboard shortcut (Firefox 63+), clicking a button in an extension page, and selecting an omnibox suggestion (Firefox 142+).
- **"Enabled APIs"**: `pageAction.openPopup`, `sidebarAction.open`/`close`/`toggle`, `downloads.open`, `management.setEnabled`, `permissions.request`.
- **"activeTab"**: The same interactions grant the `activeTab` permission for the visible tab.
- **"Caveats"**: Clicks in normal web pages relayed through content scripts do not count; awaiting a Promise inside the handler loses user-action status, so call the gated API before any async hop.
  - *Key terms/entities:* `pageAction.openPopup`, `sidebarAction.open`, `sidebarAction.close`, `sidebarAction.toggle`, `downloads.open`, `management.setEnabled`, `permissions.request`, `activeTab`, user gesture

### [Differences between API implementations](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Differences_between_API_implementations)
**Overview:** Summarizes cross-browser extension API differences in four areas — namespace, async handling, API coverage, and manifest keys — and points to detailed compatibility references. Notes Firefox as the most standards-compliant starting point.

**Sections:**
- **"Namespace"** *(anchor unverified)*: `browser` is used by Firefox and Safari (and Chrome/Edge/Opera from Chrome 148); `chrome` remains the legacy Chromium namespace; example `browser.alarms.create({ delayInMinutes })`.
- **"Asynchronous event handling"**: Promises are the standard approach; Firefox/Safari always returned promises, Chromium added them with MV3 and completed coverage in Chrome 152; callbacks remain supported everywhere.
- **"API coverage"**: Three categories — entire functions missing, feature-level variation (e.g. Firefox lacks `notifications.onButtonClicked` but alone supports `notifications.onShown`), and proprietary APIs (`contextualIdentities` containers in Firefox).
- **"Manifest keys"**: Differences split into metadata keys (`developer` in Firefox/Opera alongside `author`) and feature keys (e.g. Firefox-only `protocol_handlers`).
- **"More information"**: Links to [Chrome incompatibilities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities), Browser support for JavaScript APIs, and manifest browser compatibility.
  - *Key terms/entities:* `browser` namespace, `chrome` namespace, Promises, callbacks, `notifications.onButtonClicked`, `notifications.onShown`, `contextualIdentities`, `developer`, `protocol_handlers`

### [Chrome incompatibilities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities)
**Overview:** Catalog of Firefox vs Chrome/Safari extension differences: partially supported APIs, unsupported Chrome APIs, content-script environment/lifecycle quirks, manifest key support, native messaging, message data cloning, and historical namespace/promise differences.

**Sections:**
- **[JavaScript APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#javascript_apis)**: [Partially supported APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#partially_supported_apis) — **Notifications** (`iconUrl` required in Chrome; Firefox clears on click; rapid `create()` calls may not display), **Proxy** (incompatible designs: Firefox `proxy.settings`/`proxy.onRequest`/`ProxyInfo` vs Chrome `ProxyConfig`/`ProxyRules`/`PacScript`), **Sidebar** (`sidebar_action`/`sidebarAction` vs `side_panel`/`sidePanel`), **Tabs** (relative URL base differs; `tabs.remove()` awaits `beforeunload` only in Firefox), **WebRequest** (redirects restricted to http/https; no `activeTab` interception; system requests skipped; async blocking only `onAuthRequired` in Chrome; redirecting to extension pages needs `web_accessible_resources`), **Windows** (`onFocusChanged` fires repeatedly in Firefox). [Unsupported APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#unsupported_apis) — Chrome `debugger` and `declarativeContent`. [Miscellaneous](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#miscellaneous_incompatibilities) — CSS URLs resolve relative to the CSS file in Firefox vs the page in Chrome; no background `alert`/`confirm`/`prompt` in Firefox; `web_accessible_resources` use random UUIDs vs fixed extension IDs; Chrome's `key` manifest property unsupported (use `browser_specific_settings.gecko.id`); content-script fetch URL rules, Xray/`globalThis` environment, per-world event handlers, `eval` context, navigation lifecycle, and zoom persistence all differ.
- **"manifest.json keys"** *(anchor unverified)*: Browser-support table with asterisked caveats, generated from `mdn/browser-compat-data` JSON.
- **"Native messaging"**: Chrome passes extension-origin args (plus window handle on Windows), uses `allowed_origins` instead of `allowed_extensions`, stores the app manifest elsewhere, and manages app process lifetime differently (Job objects/`CREATE_BREAKAWAY_FROM_JOB`).
- **"Data cloning algorithm"**: Firefox uses structured clone; Chrome uses JSON serialization; `URL`/`PerformanceEntry` and `toJSON` objects behave differently; `JSON.stringify()` + `JSON.parse()` is the portable workaround.
- **[Historical differences](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#historical_differences)**: Pre-Chrome 148 `chrome`-only namespace and callbacks; Chrome 148 `browser` support; Chrome 152 for `devtools_page` extensions; `webextension-polyfill` for older Chrome.
  - *Key terms/entities:* `notifications.create`, `iconUrl`, `proxy.ProxyInfo`, `sidebarAction`, `sidePanel`, `tabs.executeScript`, `tabs.remove`, `webRequest.onAuthRequired`, `web_accessible_resources`, `browser_specific_settings.gecko.id`, `eval`, Xray vision, `allowed_origins`, structured clone, `webextension-polyfill`

---

## 3. User Interface Components

### [User interface](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface)
**Overview:** Index of extension UI surfaces with examples: toolbar button (browser action), address-bar button (page action), popups, context menu items, sidebars, options page, extension pages, notifications, omnibox suggestions, and devtools panels. Also links accessibility guidance, toolbar-button and settings-page how-tos, browser styles, and devtools extension guides.

**Sections:**
- **UI option table** *(no H2 headings observed)*: Each row links a component page and describes when to use it; includes popup variants for toolbar and address-bar buttons.
  - *Key terms/entities:* `user_interface/Toolbar_button`, `Page_actions`, `Popups`, `Context_menu_items`, `Sidebars`, `Options_pages`, `Extension_pages`, `Notifications`, `Omnibox`, `devtools_panels`, `Browser_styles`

### [Toolbar button](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Toolbar_button)
**Overview:** The toolbar button (browser action/action): how to declare it in MV2 (`browser_action`) vs MV3 (`action`), how popup vs non-popup clicks behave, icon/theme handling, and the corresponding runtime APIs.

**Sections:**
- **"Specifying the browser action"** *(anchor unverified)*: Manifest keys `browser_action` (MV2) and `action` (MV3) share identical syntax; `default_icon` accepts size-keyed paths, `default_title` sets the tooltip; no properties are mandatory. Without a `default_popup`, clicks dispatch `action.onClicked`; with a popup, the popup opens and no click event fires. Only one browser action per extension. Properties are mutable via `browserAction` (MV2) or `action` (MV3) APIs.
- **"Icons"**: Falls back to the extension icon, then the default puzzle-piece icon; `default_title` falls back to the extension name; `theme_icons` or a `prefers-color-scheme` media query in an SVG adapts to light/dark themes; Acorn Design System iconography for design guidance.
- **"Examples"**: `bookmark-it` (button without popup) and `beastify` (button with popup).
  - *Key terms/entities:* `browser_action`, `action`, `default_icon`, `default_title`, `default_popup`, `theme_icons`, `action.onClicked`, `browserAction`, `prefers-color-scheme`

### [Address bar button](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Page_actions)
**Overview:** The address bar button (page action): how it differs from the toolbar/browser action, how to declare and control it with `page_action`, popup vs click behavior, icon/theme handling, and examples.

**Sections:**
- **[Page actions and browser actions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Page_actions#page_actions_and_browser_actions)**: Page actions live in the address bar and are hidden by default, toggled per tab with `pageAction.show()`/`hide()` (defaults overridable via `show_matches`/`hide_matches`); browser actions live in the toolbar and are always shown. Use page actions for the current page, browser actions for browser-wide behavior.
- **"Specifying the page action"** *(anchor unverified)*: `page_action` manifest key with `default_icon`/`default_title`; without a popup, clicks dispatch `pageAction.onClicked`; with a popup, the popup opens and no click event fires; one page action per extension; properties mutable via the `pageAction` API.
- **"Icons"**: PNG or SVG; `prefers-color-scheme` adapts SVG icons; an implicit dark-theme CSS filter applies until Firefox 152 (pref `extensions.webextensions.pageActionIconDarkModeFilter.enabled`); Acorn iconography guidance.
- **"Examples"**: `chill-out` (page action without popup) and `themed-icons` (theme-responsive SVG page-action icon).
  - *Key terms/entities:* `page_action`, `default_icon`, `default_title`, `show_matches`, `hide_matches`, `pageAction.show`, `pageAction.hide`, `pageAction.onClicked`, `prefers-color-scheme`

### [Popups](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Popups)
**Overview:** Popups attached to toolbar or address bar buttons: declaration via `default_popup`, lifecycle, keyboard shortcuts, CSP, debugging, resizing behavior, and design guidance.

**Sections:**
- **"Specifying a popup"** *(anchor unverified)*: An HTML document listed in `default_popup` under `browser_action`/`page_action` (MV3 `action`); may load local CSS/JS and use all permitted WebExtension APIs; reloaded on every open; closes on outside click or `window.close()`; cannot be opened programmatically outside a user action. Keyboard shortcuts: `_execute_browser_action`/`_execute_page_action` (MV2), `_execute_action`/`_execute_page_action` (MV3, where supported) via `commands` special shortcuts. Extension CSP applies (no `eval`).
- **"Debugging popups"**: Use the Add-on Debugger and enable "Disable popup auto-hide" to keep popups open while inspecting.
- **"Popup resizing"**: Auto-sizes to content, recalculated before display and up to 10x/second after DOM mutations; Firefox caps at 800x600 px (680 before Firefox 60), sizes strict mode by `<body>` and quirks mode by `<html>`; set CSS width on `<body>`, not `:root`; toolbar-overflow popups get a fixed width; Firefox Android 57 shows popups as a new tab.
- **"Popup design"**: Acorn Design System for Firefox-consistent styling.
- **"Examples"**: `beastify` browser action with popup.
  - *Key terms/entities:* `default_popup`, `browser_action`, `page_action`, `action`, `_execute_action`, `_execute_page_action`, `window.close()`, `commands#special_shortcuts`, Add-on Debugger, Content Security Policy

### [Context menu items](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Context_menu_items)
**Overview:** Adding extension items to browser context menus, including page, tab, and bookmark contexts: item types, permissions, create/remove/override APIs, click handling, and examples.

**Sections:**
- **"Specifying context menu items"** *(anchor unverified)*: Managed programmatically via the `menus` (contextMenus) API; request the `contextMenus` permission; create items in the background script with `menus.create({ id, title, contexts })`; items appear in all tabs until `menus.remove()`; supports plain items, checkboxes, radio groups, and separators. Supported contexts are enumerated in `menus.ContextType` (including bookmark/tab UI); `menus.overrideContext` can replace the default context menu in extension sidebars/popups with tab or bookmark menus (optionally hiding default items). Handle clicks with `menus.onClicked`, using `info.menuItemId`, `info.selectionText`, and the `tab` argument.
- **"Icons"**: Acorn Design System iconography guidance.
- **"Examples"**: `menu-demo` (several items) and `context-menu-copy-link-with-types` (copy link as plain text and rich HTML).
  - *Key terms/entities:* `contextMenus` permission, `menus.create`, `menus.remove`, `menus.ContextType`, `menus.overrideContext`, `menus.onClicked`, `info.menuItemId`, `info.selectionText`

### [Sidebars](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Sidebars)
**Overview:** Extension sidebars: per-window HTML panes declared with `sidebar_action`, their lifecycle and privileged API access, per-window panel switching, and design/example guidance.

**Sections:**
- **"Specifying sidebars"** *(anchor unverified)*: `sidebar_action` manifest key with `default_title`, `default_panel` (HTML), and `default_icon`; listed alongside browser sidebars and opened via the sidebar UI; title/icon/panel mutable with the `sidebarAction` API (`sidebarAction.setPanel()` per tab).
- **"Lifecycle and environment"** *(implied by intro, no heading)*: The document loads in every open window (one instance per window) when the sidebar opens, and unloads when the window or sidebar closes; it has the same privileged APIs as background/popup scripts, can reach the background page via `runtime.getBackgroundPage()` (except incognito windows), identify its window with `windows.getCurrent({ populate: true })`, and message content scripts/native apps with `tabs.sendMessage()`/`runtime.sendNativeMessage()`; sidebars open automatically on install.
- **"Sidebar design"**: Acorn Design System for Firefox-consistent styling.
- **"Example"**: `annotate-page` demonstrates a note-taking sidebar with per-window content.
  - *Key terms/entities:* `sidebar_action`, `default_panel`, `default_title`, `default_icon`, `sidebarAction.setPanel`, `windows.getCurrent`, `runtime.getBackgroundPage`, `annotate-page`

### [Options page](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Options_pages)
**Overview:** Creating an extension preferences page: manifest `options_ui`, opening it with `runtime.openOptionsPage()`, storage-backed settings, CSP, theme-aware styling, and design guidance.

**Sections:**
- **"Specifying the options page"** *(anchor unverified)*: An HTML file (with local CSS/JS) registered via `"options_ui": { "page": "options.html" }`; users open it from the browser's add-ons manager, or the extension calls `runtime.openOptionsPage()`; scripts have all permitted WebExtension APIs and typically persist settings with the `storage` API; `<meta name="color-scheme" content="dark light">` enables automatic light/dark theming; extension CSP applies (no `eval`).
- **"Options content design"**: Acorn Design System for Firefox-consistent styling.
- **"Examples"**: `favourite-colour` demonstrates an options page storing a preferred color.
  - *Key terms/entities:* `options_ui`, `options_page`, `page`, `runtime.openOptionsPage()`, `storage`, `color-scheme`, Content Security Policy

### [Extension pages](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Extension_pages)
**Overview:** Bundled HTML pages (forms, help, dialogs) that are not tied to a manifest UI slot but receive the same privileged APIs as background scripts; how to open them in tabs/detached panels and keep them out of history.

**Sections:**
- **"Specifying extension pages"** *(anchor unverified)*: Include HTML files plus associated CSS/JS anywhere in the extension package (root or subfolders), with no manifest entry required.
- **"Displaying extension pages"**: Open with `windows.create()` (e.g. `{ type: "detached_panel", url, width, height }`) or `tabs.create()`; close with `windows.remove(browser.windows.WINDOW_ID_CURRENT)` or `window.close()`. Each page has its own tab, global scope, and event queue; the background page is effectively a hidden extension page.
- **"Extension pages and history"**: Opened pages enter history by default; remove entries with `history.deleteUrl()` driven by `history.onVisited`; requires the `history` permission.
- **"Web page design"**: Acorn Design System for Firefox-consistent styling.
- **"Examples"**: `window-manipulator` demonstrates window creation options.
  - *Key terms/entities:* `windows.create()`, `detached_panel`, `tabs.create()`, `windows.remove()`, `WINDOW_ID_CURRENT`, `history.deleteUrl()`, `history.onVisited`, `history` permission

### [Notifications (UI)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Notifications)
**Overview:** OS-level notifications from an extension: the `notifications` permission, `notifications.create()` options, click/close events, icon guidance, and examples.

**Sections:**
- **"Specifying notifications"** *(anchor unverified)*: Request the `notifications` permission; create with `notifications.create({ type: "basic", iconUrl, title, message })`; handle clicks via `notifications.onClicked` (and notification close events); define an `id` when actions must be distinguished; typical content is localized with `i18n.getMessage()`.
- **"Icons"**: Acorn Design System iconography guidance.
- **"Examples"**: `notify-link-clicks-i18n` shows a localized notification when a link is clicked.
  - *Key terms/entities:* `notifications` permission, `notifications.create`, `type: "basic"`, `iconUrl`, `notifications.onClicked`, notification `id`, `i18n.getMessage`

### [Address bar suggestions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Omnibox)
**Overview:** Customizing address bar suggestions with the `omnibox` API: manifest keyword, default suggestion, input lifecycle events, suggestion payloads, and disposition-aware navigation.

**Sections:**
- **"Specifying the omnibox customization"** *(anchor unverified)*: Declare `"omnibox": { "keyword": "cs" }` in the manifest; `omnibox.setDefaultSuggestion()` sets the first drop-down row and usage hint; `omnibox.onInputStarted` fires after the keyword and space, `omnibox.onInputChanged(text, addSuggestions)` supplies dynamic suggestions, and `omnibox.onInputEntered(text, disposition)` handles selection with `disposition` values `currentTab`, `newForegroundTab`, `newBackgroundTab` via `tabs.update()`/`tabs.create({ active: false })`.
- **"Examples"**: `firefox-code-search` customizes address bar search over the Firefox codebase.
  - *Key terms/entities:* `omnibox`, `keyword`, `omnibox.setDefaultSuggestion`, `omnibox.onInputStarted`, `omnibox.onInputChanged`, `omnibox.onInputEntered`, `addSuggestions`, `disposition`, `tabs.update`, `tabs.create`

### [devtools panels](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/devtools_panels)
**Overview:** Adding a custom panel to Firefox Developer Tools: the `devtools_page` manifest hook, `devtools.panels.create()`, panel lifecycle events, inspected-window access, and design guidance.

**Sections:**
- **"Specifying a developer tools panel"** *(anchor unverified)*: Available since Firefox 54. Declare `"devtools_page": "devtools-page.html"`; from that page's script call `browser.devtools.panels.create(title, icon, contentHtml)`, which resolves to a panel object with `onShown`/`onHidden` events. Run code in the inspected page with `devtools.inspectedWindow.eval()` or inject via a content script/message from the background script.
- **"Developer panel design"**: Acorn Design System for Firefox-consistent styling.
- **"Icons"**: Acorn iconography guidance.
- **"Examples"**: `devtools-panels` demonstrates a custom developer tools panel.
  - *Key terms/entities:* `devtools_page`, `devtools.panels.create`, `onShown`, `onHidden`, `devtools.inspectedWindow.eval()`, `devtools-panels`

### [Browser styles](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Browser_styles)
**Overview:** Styling extension UI (popups, sidebars, options pages) to match Firefox: the `browser_style` manifest property, required `browser-style` classes, MV3 deprecation/migration, and legacy panel components.

**Sections:**
- **"browser_style"** *(no heading; intro)*: Set `"browser_style": true` in `action`/`browser_action`/`page_action`/`sidebar_action`/`options_ui` to load Firefox extension stylesheets; Chrome/Opera MV2 use `chrome_style` (both needed for cross-browser). `browser_style: true` disables text selection outside inputs; Firefox stylesheets live at `chrome://browser/content/extension.css` (plus `extension-mac.css` on macOS); some controls need `class="browser-style"` (`button`, `select`, `textarea`, parent of `input`).
- **[Manifest V3 migration](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Browser_styles#manifest_v3_migration)**: `browser_style` is deprecated in MV3; Firefox 115 changes `options_ui`/`sidebar_action` defaults to `false`, and Firefox 118 stops supporting `true` in MV3. Migration: set it to `false`, compare rendering, remove the key if unchanged, or replicate needed `box-sizing`, `border-box`, and `display: flex` rules (or vendor `extension.css`).
- **[Firefox panel components (legacy)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Browser_styles#firefox_panel_components_legacy)**: Firefox-only `panel-section*` classes and styles for headers, footers, tabs, forms, and menus; documented in the legacy Firefox Style Guide.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Browser_styles#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Browser_styles#browser_compatibility)**: Full header/list/footer markup + CSS sample; per-manifest-key compatibility tables.
  - *Key terms/entities:* `browser_style`, `chrome_style`, `browser-style` class, `extension.css`, `extension-mac.css`, `panel-section`, `panel-section-footer`, `panel-section-tabs`, `box-sizing`

---

## 4. How-to Guides

### [Intercept HTTP requests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests)
**Overview:** Contrasts `webRequest` (event-listener inspection/modification of requests) with `declarativeNetRequest` (browser-evaluated rules), with working examples for logging, redirecting, and rewriting headers, plus required permissions and filters.

**Sections:**
- **Intro** *(no heading)*: Use `webRequest` when logic depends on request content or dynamic state; use `declarativeNetRequest` for fixed rule sets (content blockers) because it is faster, privacy-preserving, needs no background page, and can block/upgrade without host permissions.
- **[Using the webRequest API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests#using_the_webrequest_api)**: Manifest needs `webRequest` permission plus host permissions.
  - **[Logging request URLs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests#logging_request_urls)**: `webRequest.onBeforeRequest.addListener(logURL, { urls: ["<all_urls>"] })` logs `requestDetails.url`.
  - **[Redirecting requests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests#redirecting_requests)**: Add `webRequestBlocking`; return `{ redirectUrl }` from `onBeforeRequest`; filter with `{ urls, types: ["image"] }` and pass `["blocking"]`; narrow host permissions.
  - **[Modifying request headers](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests#modifying_request_headers)**: `onBeforeSendHeaders` with `["blocking", "requestHeaders"]`; mutate the `requestHeaders` array and return it (example rewrites `User-Agent`).
- **[Using the declarativeNetRequest API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests#using_the_declarativenetrequest_api)**: Manifest needs `declarativeNetRequest` plus `host_permissions` for redirects/modifications and `declarative_net_request.rule_resources` (`id`, `enabled`, `path`); no background script.
  - **[Redirecting requests](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests#redirecting_requests_2)**: `rules.json` entries with `id`, `priority`, `action.type: "redirect"`, `condition.urlFilter`, `condition.resourceTypes`; a higher-priority `"allow"` rule prevents redirect loops.
  - **[Modifying request headers](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests#modifying_request_headers_2)**: `action.type: "modifyHeaders"` with `requestHeaders: [{ header, operation: "set", value }]`; condition matches `main_frame`; host permission is required and can be revoked in `about:addons`.
- **[Learn more](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests#learn_more)**: `webRequest` examples `http-response`, `root-cert-stats`, `stored-credentials`, `user-agent-rewriter`; DNR examples `dnr-block-only`, `dnr-dynamic-with-options`, `dnr-redirect-url`.
  - *Key terms/entities:* `webRequest.onBeforeRequest`, `webRequestBlocking`, `redirectUrl`, `"blocking"`, `onBeforeSendHeaders`, `requestHeaders`, `declarativeNetRequest`, `declarative_net_request`, `rule_resources`, `urlFilter`, `resourceTypes`, `modifyHeaders`, `priority`

### [Modify a web page](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Modify_a_web_page)
**Overview:** Two ways to run content scripts — declaratively via `content_scripts` URL patterns or programmatically with `tabs.executeScript()` — plus background↔content-script messaging. Uses MV2 examples (`activeTab`, `contextMenus`, `tabs.executeScript`).

**Sections:**
- **[Modifying pages that match a URL pattern](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Modify_a_web_page#modifying_pages_that_match_a_url_pattern)**: `content_scripts` with `matches` and `js` (array, injected in order, shared scope) or `css`; the `page-eater.js` example replaces page content.
- **[Modifying pages programmatically](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Modify_a_web_page#modifying_pages_programmatically)**: Manifest with `activeTab` + `contextMenus` and a background script; `contextMenus.create({ id, title })`, `contextMenus.onClicked`, then `tabs.executeScript({ file })` (omitting `tabId` targets the active tab).
- **[Messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Modify_a_web_page#messaging)**: One-off messages: content script → background `runtime.sendMessage()`, background → content script `tabs.sendMessage()`, both receive with `runtime.onMessage`. Chain injection with the `executeScript` promise (`onExecuted`) before sending, then `tabs.query({ active: true, currentWindow: true })`; CSS injection uses `tabs.insertCSS()`; debug via Browser Console (Ctrl+Shift+J) or the Add-on Debugger.
- **[Learn more](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Modify_a_web_page#learn_more)**: Content scripts guide, `content_scripts`/`permissions` keys, messaging/injection APIs, and examples (`borderify`, `emoji-substitution`, `notify-link-clicks-i18n`, `page-to-extension-messaging`, `beastify`, `context-menu-copy-link-with-types`).
  - *Key terms/entities:* `content_scripts`, `matches`, `css`, `activeTab`, `contextMenus`, `tabs.executeScript`, `tabs.insertCSS`, `tabs.sendMessage`, `runtime.sendMessage`, `runtime.onMessage`, `tabs.query`

### [Safely insert external content into a page](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page)
**Overview:** Prevents XSS/privilege escalation when injecting remote text or HTML: safe DOM construction, jQuery escaping, HTML sanitization with DOMPurify, and safe templating rules.

**Sections:**
- **[Working with arbitrary strings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#working_with_arbitrary_strings)**:
  - **[DOM APIs for node creation and safe text insertion](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#dom_apis_for_node_creation_and_safe_text_insertion)**: Use `document.createElement`, validated `Element.setAttribute`, and `textContent` (auto-escapes); avoid concatenating remote values into `innerHTML`.
  - **[jQuery](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#jquery)**: `attr()` and `text()` treat input as data, not HTML; `addClass()`/`text()` are safe.
- **[Working with HTML content](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#working_with_html_content)**:
  - **[HTML sanitization](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#html_sanitization)**: Sanitize with a reviewed library, e.g. DOMPurify (`purify.min.js` loaded as a content script before the injection script); then assign `DOMPurify.sanitize(externalHTML)` output via `innerHTML`/jQuery `.html()`.
  - **[Template engines](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#template_engines)**: Use escaping constructs (`{{variable}}` in Mustache/Handlebars) and avoid raw-HTML forms (`{{{variable}}}`); with `Handlebars.SafeString`, run dynamic values through `Handlebars.escapeExpression()`.
- **[Additional reading](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#additional_reading)**: OWASP XSS prevention guidance.
  - *Key terms/entities:* `textContent`, `innerHTML`, `setAttribute`, `DOMPurify.sanitize`, `purify.min.js`, `{{variable}}`, `{{{variable}}}`, `Handlebars.SafeString`, `escapeExpression`

### [Share objects with page scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts)
**Overview:** Firefox-only (49+) techniques to break the content-script/page-script isolation safely: Xray vision, `wrappedJSObject`, `exportFunction`, `cloneInto`, `structuredClone`, page-context constructors, and Promise cloning. Explicitly warns that page scripts are hostile.

**Sections:**
- **[Xray vision in Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#xray_vision_in_firefox)**: A privileged scope sees the native version of page objects: expando properties are invisible and redefinitions are ignored.
- **[Accessing page script objects from content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#accessing_page_script_objects_from_content_scripts)**: `window.wrappedJSObject.foo` exposes page-defined properties; unwrapping is transitive and untrustworthy, so rewrap values with `XPCNativeWrapper(...)`.
- **[Sharing content script objects with page scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#sharing_content_script_objects_with_page_scripts)**:
  - **[exportFunction](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#exportfunction)**: Export a function into page scope: `exportFunction(notify, window, { defineAs: "notify" })`, then page scripts can call `window.notify()`.
  - **[cloneInto](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#cloneinto)**: Structured-clone an object into the page; pass `{ cloneFunctions: true }` to include methods (`window.wrappedJSObject.messenger = cloneInto(messenger, window, { cloneFunctions: true })`).
  - **[structuredClone](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#structuredclone)**: `window.structuredClone(value)` clones into page scope (Firefox 149+; use `cloneInto` for 148 and earlier); plain `structuredClone(value)` clones into content-script scope.
  - **[Constructors from the page context](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#constructors_from_the_page_context)**: `new window.Object()`, `new window.Event()` create page-owned xrayed objects that need no extra cloning; unwrap for property assignment.
  - **[Promise cloning](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#promise_cloning)**: Promises are not structured-cloneable; use `new window.Promise(...)` and `cloneInto()` on non-primitive resolution values.
  - *Key terms/entities:* Xray vision, `wrappedJSObject`, `XPCNativeWrapper`, `exportFunction`, `cloneInto`, `cloneFunctions`, `structuredClone`, `window.Promise`

### [Add a button to the toolbar](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Add_a_button_to_the_toolbar)
**Overview:** MV2 tutorial for toolbar buttons (browser actions): manifest declaration, click handling with `browserAction.onClicked`, opening a popup instead, pinning the button, and the page-action alternative.

**Sections:**
- **[A simple button](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Add_a_button_to_the_toolbar#a_simple_button)**: Manifest with `browser_action.default_icon` (16/32px) and a background script; `browser.browserAction.onClicked.addListener(openPage)` → `browser.tabs.create({ url })`; pin the extension from the puzzle-piece menu.
- **[Adding a popup](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Add_a_button_to_the_toolbar#adding_a_popup)**: Add `default_popup: "popup/choose_page.html"`; popup HTML/CSS/JS handles clicks and calls `tabs.create()`; popup scripts have the same API access as background scripts.
- **[Page actions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Add_a_button_to_the_toolbar#page_actions)**: Page actions behave like browser actions but are page-specific and appear in the URL bar instead of the toolbar.
- **[Learn more](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Add_a_button_to_the_toolbar#learn_more)**: `browser_action`/`browserAction` and `page_action`/`pageAction` references; examples `beastify`, `bookmark-it`, `favourite-colour`, `open-my-page-button`, `chill-out`.
  - *Key terms/entities:* `browser_action`, `default_icon`, `default_popup`, `browserAction.onClicked`, `tabs.create`, `page_action`, `pageAction`

### [Implement a settings page](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Implement_a_settings_page)
**Overview:** Step-by-step settings/options page: HTML form, `options_ui` registration, storage-backed load/save with `storage.sync`, and reading the setting from a content script. MV2 example; notes the Add-on ID requirement for sync storage.

**Sections:**
- **[A simple extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Implement_a_settings_page#a_simple_extension)**: Baseline `content_scripts` extension (`borderify.js`) that draws a blue border.
- **[Adding settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Implement_a_settings_page#adding_settings)**: Add `options_ui.page`, `permissions: ["storage"]`, and `browser_specific_settings.gecko.id` (required by Firefox `storage.sync`). `options.html` holds the form; `options.js` restores on `DOMContentLoaded` with `storage.sync.get("color")` (default `"blue"`) and saves on submit with `storage.sync.set({ color })`; inline JavaScript is forbidden by CSP. Update the content script to read the value with `storage.sync.get("color")`; test via `about:addons` → Preferences.
- **[Learn more](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Implement_a_settings_page#learn_more)**: `options_ui`, `storage` API, `runtime.openOptionsPage()`, `favourite-colour` example.
  - *Key terms/entities:* `options_ui`, `permissions: ["storage"]`, `storage.sync.get`, `storage.sync.set`, `browser_specific_settings.gecko.id`, `runtime.openOptionsPage()`, `DOMContentLoaded`, `about:addons`

### [Work with the Tabs API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API)
**Overview:** Comprehensive Tabs API how-to: permissions, querying tabs, create/duplicate/move/update/reload/remove, zoom control, CSS injection, tab split views, capture/language detection, and the `tabs-tabs-tabs`/`apply-css` example walkthroughs.

**Sections:**
- **[Permissions and the Tabs API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API#permissions_and_the_tabs_api)**: Most methods need no permission; the `tabs` permission is required for `Tab.url`/`title`/`favIconUrl` and (in Firefox) query-by-URL; host permission is required for `tabs.executeScript()`/`tabs.insertCSS()`. `activeTab` is the lower-warning alternative limited to the active tab after a user action.
- **[Discovering more about tabs and their properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API#discovering_more_about_tabs_and_their_properties)**: `tabs.query(queryInfo)` accepts ~17 criteria and returns `tabs.Tab[]`; `tabs.getCurrent()` and `tabs.get(id)` fetch single tabs; example builds a popup tab switcher with `{ currentWindow: true }`.
- **[Creating, duplicating, moving, updating, reloading, and removing tabs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API#creating_duplicating_moving_updating_reloading_and_removing_tabs)**: `tabs.create()`, `duplicate()`, `remove()`, `move()`, `update()`, `reload()`; duplicate/remove/move require tab IDs, update/reload default to the active tab; pinned tabs must stay first (`firstUnpinnedTab`, `{ index }`).
- **[Manipulating a tab's zoom level](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API#manipulating_a_tabs_zoom_level)**: `tabs.getZoom()`/`setZoom()`/`getZoomSettings()` (`setZoomSettings` unavailable in Firefox at time of writing); range 0.3–5; defaults 100%, automatic, per-origin scope.
- **[Manipulating a tab's CSS](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API#manipulating_a_tabs_css)**: `tabs.insertCSS()`/`removeCSS()` with `tabs` + host permission or `activeTab`; `apply-css` example toggles CSS through page-action clicks and reinitializes with `tabs.onUpdated`, filtered to http/https.
- **[Working with tab split views](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API#working_with_tab_split_views)**: Split views move as a unit (`tabs.onMoved`, `tabs.move`); closing one closes the split; detect membership with `Tab.splitViewId` and changes via `tabs.onUpdated`; creation/removal APIs are pending WECG issue #967.
- **[Some other interesting abilities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API#some_other_interesting_abilities)**: `tabs.captureVisibleTab()`, `tabs.detectLanguage()`.
- **[Learn more](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_the_Tabs_API#learn_more)**: Tabs API reference and example extensions.
  - *Key terms/entities:* `permissions: ["tabs"]`, `tabs.query`, `tabs.Tab`, `tabs.create`, `tabs.duplicate`, `tabs.move`, `tabs.update`, `tabs.reload`, `tabs.remove`, `tabs.getZoom`, `tabs.insertCSS`, `tabs.onUpdated`, `splitViewId`, `captureVisibleTab`, `detectLanguage`

### [Work with the Bookmarks API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Bookmarks_API)
**Overview:** Using the `bookmarks` API: permissions, item and folder-tree operations, bookmark events/import notifications, and the `bookmark-it` walkthrough (toggle bookmark for the active tab, icon state, event-driven refresh).

**Sections:**
- **[Permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Bookmarks_API#permissions)**: Request `"bookmarks"` in `permissions`.
- **[Features](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Bookmarks_API#features)**: Item CRUD + `search()` + `getRecent()`; folder tree via `getTree()`, `getChildren()`, `getSubTree()`, `create()`, `removeTree()`, `move()`; events `onCreated`, `onChanged`, `onMoved`, `onChildrenReordered`, `onRemoved`; import notifications `onImportBegan`/`onImportEnded`.
- **[Example walkthrough](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Bookmarks_API#example_walkthrough)**: `bookmark-it` requests `bookmarks` + `tabs`; queries the active tab (`{ active: true, currentWindow: true }`), checks `bookmarks.search({ url })`, updates `browserAction` icon/title per tab, toggles with `bookmarks.remove(id)` / `bookmarks.create({ title, url })`, and refreshes on `bookmarks.onCreated`/`onRemoved`, `tabs.onUpdated`/`onActivated`, `windows.onFocusChanged`. URL protocol check uses an `<a>` element (`http:`, `https:`, `file:`).
- **[Learn more](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Bookmarks_API#learn_more)**: Bookmarks API reference.
  - *Key terms/entities:* `bookmarks` permission, `bookmarks.create`, `bookmarks.search`, `bookmarks.remove`, `bookmarks.getTree`, `bookmarks.removeTree`, `bookmarks.onCreated`, `bookmarks.onImportBegan`, `tabs.query`, `browserAction.setIcon`

### [Work with the Cookies API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Cookies_API)
**Overview:** Using the `cookies` API: permission and host-permission matrix, cookie stores (default, private, container tabs), the `cookie-bg-picker` walkthrough, and related `privacy.websites.cookieConfig` control.

**Sections:**
- **[Permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Cookies_API#permissions)**: Requires `"cookies"` plus host permissions (or `<all_urls>`); permission form changes secure/non-secure read/write/delete scope (`http://*.example.com/`, `https://www.example.com/`, `*://*.example.com/`, `<all_urls>`).
- **[Cookie stores](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Cookies_API#cookie_stores)**: Firefox has the default store, private-browsing stores (visible only when `extension.isAllowedIncognitoAccess()`; Safari lacks access), and per-contextual-identity container stores; enumerate with `cookies.getAllCookieStores()`.
- **[Example walkthrough](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Cookies_API#example_walkthrough)**: `cookie-bg-picker` requests `tabs`, `cookies`, `<all_urls>`; popup stores per-site choices with `cookies.set({ url: tabs[0].url, name: "bgpicker", value: JSON.stringify(...) })`, reset uses `cookies.remove()`, and `cookies.onChanged` logs `changeInfo`; the background script re-applies settings on tab activation/URL change using `cookies.get({ url, name })` and `tabs.sendMessage()`.
- **[Other features](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Cookies_API#other_features)**: `cookies.getAll()` filters and returns `cookies.Cookie[]`; cookie behavior is configurable via `privacy.websites.cookieConfig`.
- **[Learn more](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Cookies_API#learn_more)**: Cookies API reference and `list-cookies` example.
  - *Key terms/entities:* `cookies` permission, `cookies.set`, `cookies.get`, `cookies.remove`, `cookies.onChanged`, `cookies.getAll`, `cookies.Cookie`, `getAllCookieStores`, `isAllowedIncognitoAccess`, `privacy.websites.cookieConfig`

### [Work with contextual identities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities)
**Overview:** Firefox container tabs: managing contextual identities with `contextualIdentities`, the `cookieStoreId` property used across tab/download/proxy/webRequest APIs, color/icon support changes, permissions, and the `contextual-identities` example.

**Sections:**
- **[APIs for working with contextual identities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities#apis_for_working_with_contextual_identities)**:
  - **[Managing contextual identities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities#managing_contextual_identities)**: `contextualIdentities` add/query/update/delete; each identity gets a unique `cookieStoreId`.
  - **[Supported colors and icons](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities#supported_colors_and_icons)**: Use `contextualIdentities.getSupportedColors()`/`getSupportedIcons()` (Firefox 153+) instead of hardcoding; Firefox 153 renamed two colors and added one.
  - **[Using cookieStoreId](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities#using_cookiestoreid)**: Supported by `browsingData.removeCookies()`/`removeLocalStorage()` (`RemovalOptions`), `contentScripts.register`, `downloads`, `proxy.onRequest`, `tabs.create`/`Tab`/`query`, legacy `userScripts.register`, `webRequest` events, and `windows.create`.
- **[Permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities#permissions)**: Requires `contextualIdentities`; also `cookies` when an operation can modify cookies (e.g. `tabs.create` with a container, but not `tabs.query` by `cookieStoreId`).
- **[Example walkthrough](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities#example_walkthrough)**: `contextual-identities` requests `contextualIdentities` + `cookies`, shows a popup listing identities via `contextualIdentities.query({})`, and implements "Create" with `tabs.create({ url: "about:blank", cookieStoreId })` and "Close All" with `tabs.query({ cookieStoreId })` + `tabs.remove(ids)`. It detects the feature being off (`browser.contextualIdentities === undefined`, pref `privacy.userContext.enabled`).
- **[Learn more](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities#learn_more)**: API reference and the Multi-Account Containers extension source.
  - *Key terms/entities:* `contextualIdentities`, `cookieStoreId`, `getSupportedColors`, `getSupportedIcons`, `tabs.create`, `tabs.query`, `cookies` permission, `privacy.userContext.enabled`

### [Interact with the clipboard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard)
**Overview:** Clipboard access via `navigator.clipboard` plus `clipboardRead`/`clipboardWrite` permissions, with secure-context and transient-activation rules, deprecated `execCommand()` fallbacks, and browser-specific differences.

**Sections:**
- **[Writing to the clipboard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#writing_to_the_clipboard)**: `navigator.clipboard.writeText()`/`write()` require a secure context and transient activation unless the `"clipboardWrite"` permission is granted; Firefox/Chrome allow it in extension contexts and content scripts, Safari only in extension contexts. **[Using execCommand()](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#using_execcommand)** covers deprecated `document.execCommand("copy"/"cut")`, which needs a user event or `"clipboardWrite"` and fails on hidden/`display:none` fields.
- **[Reading from the clipboard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#reading_from_the_clipboard)**: `navigator.clipboard.readText()`/`read()` normally require transient activation plus a paste prompt; `"clipboardRead"` removes both requirements (Firefox/Chrome; unsupported in Safari). **[Using execCommand()](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#using_execcommand_2)** documents deprecated `execCommand("paste")` and its `"clipboardRead"` requirement.
- **[Browser-specific considerations](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#browser-specific_considerations)**: Chrome 157 allows service-worker writes with `clipboardWrite` (no reads); page scripts can query the `clipboard-write` permission (Chrome only); Firefox 147 extensions gained read methods via the paste prompt (web pages since Firefox 127); Safari limitations above.
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#browser_compatibility)** and **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#see_also)**: Clipboard API, Permissions API, `contenteditable`.
  - *Key terms/entities:* `navigator.clipboard.readText`, `writeText`, `read`, `write`, `"clipboardRead"`, `"clipboardWrite"`, `document.execCommand`, transient activation, secure context, `navigator.permissions.query({ name: "clipboard-write" })`

### [Extend the developer tools](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools)
**Overview:** Building devtools extensions: the `devtools_page` hook and implicit `devtools` permission, devtools page capabilities, panel creation, inspected-window evaluation, content-script messaging patterns, and Firefox API gaps.

**Sections:**
- **[The devtools page](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools#the_devtools_page)**: `"devtools_page": "devtools/devtools-page.html"` loads a hidden page per devtools window; the key implicitly grants `"devtools"` (install-time warning) and can be made optional via `optional_permissions`. The page gets DOM APIs, the content-script WebExtension API subset, and `devtools.inspectedWindow`/`devtools.network`/`devtools.panels`; other APIs and the background page must communicate via `runtime` messaging.
- **[Creating panels](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools#creating_panels)**: `devtools.panels.create(title, icon, contentHtml)` resolves to a `devtools.panels.ExtensionPanel` with `onShown`/`onHidden`.
- **[Interacting with the target window](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools#interacting_with_the_target_window)**:
  - **[Running code in the target window](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools#running_code_in_the_target_window)**: `devtools.inspectedWindow.eval()` runs in the page context with no clean-DOM/Xray protection and no content-script variables; prefer a content script when possible.
  - **[Working with content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools#working_with_content_scripts)**: The devtools page lacks `tabs.executeScript()`, so send `devtools.inspectedWindow.tabId` to the background and inject there; use `runtime.connect()`/`runtime.onConnect` ports to route messages between devtools documents and content scripts.
- **[Limitations of the devtools APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools#limitations_of_the_devtools_apis)**: As of Firefox 54/55, missing `inspectedWindow.getResources`/`onResourceAdded`/`onResourceContentCommitted` and all `eval()` options; missing `panels.elements`/`sources`/`setOpenResourceHandler`/`openResource`/`createStatusBarButton`/`Button`/`ElementsPanel`/`SourcesPanel`; `$0` and `inspect()` work from Firefox 55.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools#examples)**: `devtools-panels`.
  - *Key terms/entities:* `devtools_page`, `devtools` permission, `devtools.panels.create`, `devtools.inspectedWindow.eval`, `devtools.inspectedWindow.tabId`, `runtime.connect`, `runtime.Port`, `ExtensionPanel`

### [Build a cross-browser extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension)
**Overview:** Practical portability guide: namespace/promise differences, polyfill usage, API coverage fallbacks, content-script environments, background page vs service worker, per-browser manifest files, packaging, store publishing, and version-numbering constraints.

**Sections:**
- **[Cross-platform extension coding hurdles](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#cross-platform_extension_coding_hurdles)**:
  - **[API namespace](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#api_namespace)**: Prefer `browser.*` (standard; Firefox/Safari, Chrome 148/Opera 121/Edge 136, four versions later for `devtools_page`); Firefox also aliases `chrome.*` for porting.
  - **[API asynchronous event handling](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#api_asynchronous_event_handling)**: Promises are standard in MV3 (Chrome 121 all async APIs unless documented; 152 for `devtools_page`); callbacks remain; `runtime.onMessage` handlers can return a Promise in Firefox/Safari but not yet Chrome; use `webextension-polyfill` for Chrome ≤147 (no-op from 152) and load it before other scripts (manifest background, HTML pages, `executeScript`).
  - **[API function coverage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#api_function_coverage)**: Missing functions, feature-level variation (`notifications.onButtonClicked` vs `onShown`), proprietary APIs (`contextualIdentities`); prefer runtime feature checks (`typeof fn === "function"`) over hard failure.
  - **[Content script execution contexts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#content_script_execution_contexts)**: Firefox Xray vision vs Chrome isolated worlds; Firefox `cloneInto`/`exportFunction`; CSP for content scripts differs.
  - **[Background page and extension service worker](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#background_page_and_extension_service_worker)**: Chrome MV3 uses service workers, Firefox keeps background pages, Safari supports both; declare `scripts` + `service_worker` for cross-browser (`script-on-click` example).
  - **[Manifest keys](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#manifest_keys)**: Differences split into metadata keys (`developer`), feature keys (`browser_specific_settings` unsupported in Chrome at time of writing), and optionality (only `manifest_version`, `version`, `name` mandatory); maintain per-browser manifests.
  - **[Extension packaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#extension_packaging)**: Firefox/Chrome/Edge/Opera use zip with `manifest.json` at root; Safari packages like an app.
  - **[Extension publishing](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#extension_publishing)**: Store comparison — Chrome (fee, upload utility, automatic review <1h, 2FA), Edge (no fee/utility/review SLA, 2FA), Firefox (no fee, `web-ext`, automatic seconds + post-publication manual review, 2FA), Opera (no fee, manual, no 2FA), Safari (fee, review, 2FA).
- **[Other considerations](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#other_considerations)**: Firefox/Chrome/Edge stores require unique version numbers per upload, so reusing an earlier version is impossible.
  - *Key terms/entities:* `browser.*`, `chrome.*`, Promises, `webextension-polyfill`, `notifications.onButtonClicked`, `contextualIdentities`, Xray vision, service worker, `background.scripts`, `background.service_worker`, `browser_specific_settings`, `web-ext`, `manifest_version`

---

## 5. JavaScript APIs

API entries summarize each module page: purpose, permissions, and the member names listed there. Fetch the module page for member-level signatures, parameters, and return types.

**Tabs, windows, sessions & tab groups**

### [tabs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs)
**Overview:** Tab lifecycle and manipulation: query/open/update/move/reload/remove tabs, inject scripts/CSS (MV2 methods; MV3 uses `scripting`), capture visible tabs, message content scripts, and observe tab events. `tabs` (or matching host) permission gates `Tab.url`/`title`/`favIconUrl` and URL queries; host permission or `activeTab` gates injection. Tab IDs are session-scoped; use `sessions.setTabValue()` for cross-restart association.

**Sections:**
- **[Types](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs#types)**: `tabs.MutedInfoReason`, `tabs.MutedInfo`, `tabs.PageSettings`, `tabs.Tab`, `tabs.TabStatus`, `tabs.WindowType`, `tabs.ZoomSettingsMode`, `tabs.ZoomSettingsScope`, `tabs.ZoomSettings`.
- **[Properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs#properties)**: `tabs.TAB_ID_NONE`, `tabs.SPLIT_VIEW_ID_NONE`.
- **[Functions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs#functions)**: `captureTab`, `captureVisibleTab`, `connect`, `create`, `detectLanguage`, `discard`, `duplicate`, `executeScript` (MV2), `get`, `getAllInWindow`, `getCurrent`, `getSelected` (deprecated), `getZoom`, `getZoomSettings`, `goForward`, `goBack`, `group`, `hide`, `highlight`, `insertCSS` (MV2), `move`, `moveInSuccession`, `print`, `printPreview`, `query`, `reload`, `remove`, `removeCSS` (MV2), `saveAsPDF`, `sendMessage`, `sendRequest` (deprecated), `setZoom`, `setZoomSettings`, `show`, `toggleReaderMode`, `ungroup`, `update`, `warmup`.
- **[Events](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs#events)**: `onActivated`, `onActiveChanged` (deprecated), `onAttached`, `onCreated`, `onDetached`, `onHighlightChanged` (deprecated), `onHighlighted`, `onMoved`, `onRemoved`, `onReplaced`, `onSelectionChanged` (deprecated), `onUpdated`, `onZoomChange`.
- **[Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs#example_extensions)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs#browser_compatibility)**: 24 examples (`tabs-tabs-tabs`, `apply-css`, `bookmark-it`, `session-state`, ...); compatibility derived from Chromium's `tabs.json`.
  - *Key terms/entities:* `tabs.query`, `tabs.Tab`, `tabs.create`, `tabs.update`, `tabs.remove`, `tabs.executeScript`, `tabs.captureVisibleTab`, `tabs.sendMessage`, `tabs.onUpdated`, `activeTab`, `sessions.setTabValue`

### [windows](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/windows)
**Overview:** Inspect and manipulate browser windows: get current/last-focused/all windows, create/update/remove windows, and observe bounds, creation, focus, and close events. No special permission is required; some created window types may be Firefox-only.

**Sections:**
- **"Types"**: `windows.WindowType`, `windows.WindowState`, `windows.Window`, `windows.CreateType`.
- **"Constants"**: `windows.WINDOW_ID_NONE`, `windows.WINDOW_ID_CURRENT`.
- **"Methods"**: `get()`, `getCurrent()`, `getLastFocused()`, `getAll()`, `create()`, `update()`, `remove()`.
- **"Events"**: `onBoundsChanged`, `onCreated`, `onRemoved`, `onFocusChanged` (fires multiple times per focus change in Firefox).
- **"Example extensions"** and **"Browser compatibility"**: `annotate-page`, `bookmark-it`, `private-browsing-theme`, `store-collected-images`, `theme-integrated-sidebar`, `window-manipulator`; compatibility derived from Chromium's `windows.json`.
  - *Key terms/entities:* `windows.create`, `windows.getCurrent`, `windows.getAll`, `windows.update`, `windows.remove`, `windows.Window`, `WINDOW_ID_CURRENT`, `onFocusChanged`

### [sessions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sessions)
**Overview:** Lists and restores tabs/windows closed during the current browser session (including navigation history), and stores extension state tied to tabs/windows so it survives close/restore. Requires the `"sessions"` permission.

**Sections:**
- **"Types"**: `sessions.Filter` (limits results), `sessions.Session` (closed tab/window).
- **"Properties"**: `sessions.MAX_SESSION_RESULTS`.
- **"Functions"**: `forgetClosedTab()`, `forgetClosedWindow()`, `getRecentlyClosed()`, `restore()`; per-tab state `setTabValue()`/`getTabValue()`/`removeTabValue()`; per-window state `setWindowValue()`/`getWindowValue()`/`removeWindowValue()`.
- **"Events"**: `onChanged` when a tab or window closes.
- **"Example extensions"** and **"Browser compatibility"**: `session-state`; based on Chromium's `chrome.sessions`.
  - *Key terms/entities:* `sessions` permission, `sessions.getRecentlyClosed`, `sessions.restore`, `sessions.setTabValue`, `sessions.getWindowValue`, `sessions.MAX_SESSION_RESULTS`, `sessions.onChanged`

### [tabGroups](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups)
**Overview:** Reads and rearranges Firefox tab groups: get/move/query/update groups and observe creation/move/removal/update. Group creation/removal uses `tabs.group()`/`tabs.ungroup()`, tab movement uses `tabs.move()`, and group membership uses `tabs.query()`. Requires the `tabGroups` permission (not shown in prompts); groups survive session restore but stored `groupId` may change.

**Sections:**
- **[Permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups#permissions)**: `"tabGroups"` permission in the manifest.
- **"Types"**: `tabGroups.Color`, `tabGroups.TabGroup`.
- **"Properties"**: `tabGroups.TAB_GROUP_ID_NONE`.
- **"Functions"**: `get()`, `move()`, `query()`, `update()`.
- **"Events"**: `onCreated`, `onMoved`, `onRemoved`, `onUpdated`.
- **"Browser compatibility"** and **"See also"**: `tabs.group()`, `tabs.ungroup()`, `tabs.query()`, `tabs.Tab`.
  - *Key terms/entities:* `tabGroups` permission, `tabGroups.TabGroup`, `TAB_GROUP_ID_NONE`, `tabGroups.query`, `tabs.group`, `tabs.ungroup`, `tabs.move`

### [action](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action)
**Overview:** MV3+ toolbar button API, replacing MV2 `browserAction` and (in Chrome/Safari) `pageAction`. Gets/sets icon, title, popup, badge text/colors, enablement per tab, and listens for clicks; if a popup is set, clicks open it instead of firing `onClicked`.

**Sections:**
- **"Types"**: `action.ColorArray` (RGBA 0–255), `action.ImageDataType` (`ImageData`).
- **"Functions"**: `setTitle`, `getTitle`, `setIcon`, `setPopup`, `getPopup`, `openPopup`, `setBadgeText`, `getBadgeText`, `setBadgeBackgroundColor`, `getBadgeBackgroundColor`, `setBadgeTextColor`, `getBadgeTextColor`, `getUserSettings`, `enable`, `disable`, `isEnabled`; properties can be set globally or per tab.
- **"Events"**: `onClicked` (not fired when a popup exists), `onUserSettingsChanged`.
- **"Example extensions"** and **"Browser compatibility"**: `script-on-click`, `themed-icons`; based on Chromium's `chrome.action`.
  - *Key terms/entities:* `action`, `action.setIcon`, `action.setPopup`, `action.setBadgeText`, `action.enable`, `action.onClicked`, `menus.ContextType`, Manifest V3

### [browserAction](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction)
**Overview:** MV2 toolbar button API for the `browser_action` manifest key. Mirrors the MV3 `action` API: title/icon/popup/badge/enablement getters and setters (globally or per tab) plus click and user-settings events; MV3 extensions use `action` instead.

**Sections:**
- **"Types"**: `browserAction.ColorArray`, `browserAction.ImageDataType`.
- **"Functions"**: `setTitle`, `getTitle`, `setIcon`, `setPopup`, `getPopup`, `openPopup`, `setBadgeText`, `getBadgeText`, `setBadgeBackgroundColor`, `getBadgeBackgroundColor`, `setBadgeTextColor`, `getBadgeTextColor`, `getUserSettings`, `enable`, `disable`, `isEnabled`.
- **"Events"**: `onClicked` (suppressed when a popup is set), `onUserSettingsChanged`.
- **"Example extensions"** and **"Browser compatibility"**: `bookmark-it`, `favourite-colour`, `find-across-tabs`, `forget-it`, `google-userinfo`, `native-messaging`, `open-my-page-button`, `permissions`, `runtime-examples`, `store-collected-images`, `tabs-tabs-tabs`; based on Chromium's `chrome.browserAction`.
  - *Key terms/entities:* `browser_action`, `browserAction.setIcon`, `browserAction.setBadgeText`, `browserAction.openPopup`, `browserAction.onClicked`, Manifest V2

### [pageAction](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/pageAction)
**Overview:** Address-bar button API for the `page_action` manifest key. Shows/hides the button per tab, gets/sets title, icon, and popup, and fires `onClicked` when no popup is set. Intended for actions relevant to the current page; it does not expose page content.

**Sections:**
- **"Types"**: `pageAction.ImageDataType`.
- **"Functions"**: `show()`, `hide()`, `isShown()`, `setTitle()`, `getTitle()`, `setIcon()`, `setPopup()`, `getPopup()`, `openPopup()`.
- **"Events"**: `onClicked`.
- **"Example extensions"** and **"Browser compatibility"**: `apply-css`, `chill-out`, `history-deleter`, `menu-remove-element`, `themed-icons`; based on Chromium's `chrome.pageAction`.
  - *Key terms/entities:* `page_action`, `pageAction.show`, `pageAction.hide`, `pageAction.setIcon`, `pageAction.setPopup`, `pageAction.onClicked`, `menus.ContextType`

### [sidebarAction](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction)
**Overview:** Gets/sets extension sidebar properties declared via `sidebar_action`: open/close/toggle, panel URL, title, and icon. Chrome's `sidePanel` API is incompatible; Firefox does not implement badge properties or focus/blur events.

**Sections:**
- **"Types"**: `sidebarAction.ImageDataType`.
- **"Functions"**: `close()`, `getPanel()`, `getTitle()`, `isOpen()`, `open()`, `setIcon()`, `setPanel()`, `setTitle()`, `toggle()`.
- **"Examples"** *(anchor unverified)* and **"Browser compatibility"**: `annotate-page`; based on Opera's `sidebarAction`; Chrome uses `sidePanel` instead; Firefox omits `setBadgeText`, `getBadgeText`, `setBadgeBackgroundColor`, `getBadgeBackgroundColor`, `onFocus`, `onBlur`.
  - *Key terms/entities:* `sidebar_action`, `sidebarAction.open`, `sidebarAction.close`, `sidebarAction.toggle`, `sidebarAction.setPanel`, `sidebarAction.isOpen`, `sidePanel`

### [menus](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus)
**Overview:** Adds items to browser context menus (page, tab, bookmark, toolbar-button contexts) and supports submenus, checkboxes, radio groups, separators, and custom icons. Requires the `menus` permission; `contextMenus` is a compatible alias (access as `browser.contextMenus`). Only `getTargetElement()` works from content scripts; create items inside `runtime.onInstalled` for event pages/Chrome.

**Sections:**
- **[Creating menu items](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus#creating_menu_items)**: `menus.create({ id, type, title, contexts, checked, icons })`; types `"normal"`, `"checkbox"`, `"radio"`, `"separator"`; click data delivered to `menus.onClicked` as `menus.OnClickData`; multiple items collapse into an extension-named submenu.
- **[Icons](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus#icons)**: Inherits the extension `icons` (16px/32px chosen automatically); submenu items accept per-item `icons`.
- **[Types](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus#types)**: `menus.ContextType`, `menus.ItemType`, `menus.OnClickData`.
- **[Properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus#properties)**: `menus.ACTION_MENU_TOP_LEVEL_LIMIT`.
- **[Functions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus#functions)**: `create()`, `getTargetElement()`, `overrideContext()`, `refresh()`, `remove()`, `removeAll()`, `update()`.
- **[Events](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus#events)**: `onClicked`, `onHidden`, `onShown`.
- **[Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus#example_extensions)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus#browser_compatibility)**: `menu-accesskey-visible`, `menu-demo`, `menu-labelled-open`, `menu-remove-element`, `menu-search`, `session-state`; based on Chromium's `chrome.contextMenus`.
  - *Key terms/entities:* `menus` permission, `contextMenus` alias, `menus.create`, `menus.ContextType`, `menus.ItemType`, `menus.OnClickData`, `menus.onClicked`, `menus.overrideContext`, `menus.refresh`

### [notifications](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications)
**Overview:** Creates and manages OS-level notifications with optional buttons. Requires the `notifications` permission; appearance and persistence vary by OS (Windows keeps notifications in the Action Center until browser exit).

**Sections:**
- **"Types"**: `notifications.NotificationOptions`, `notifications.TemplateType` (e.g. basic vs image-capable).
- **"Functions"**: `clear()`, `create()`, `getAll()`, `update()`.
- **"Events"**: `onClicked`, `onButtonClicked`, `onClosed`, `onShown` (Firefox-only; Chrome lacks it).
- **"Example extensions"** and **"Browser compatibility"**: `export-helpers`, `forget-it`, `google-userinfo`, `notify-link-clicks-i18n`, `runtime-examples`; based on Chromium's `chrome.notifications`.
  - *Key terms/entities:* `notifications` permission, `notifications.create`, `NotificationOptions`, `TemplateType`, `notifications.onClicked`, `notifications.onButtonClicked`, `notifications.onClosed`, `notifications.onShown`

### [omnibox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/omnibox)
**Overview:** Customizes address bar suggestions after the user types the manifest-defined `omnibox` keyword: default suggestion, live suggestions, acceptance/deletion/cancel events, and disposition-aware navigation.

**Sections:**
- **"Types"**: `omnibox.OnInputEnteredDisposition` (`currentTab`, `newForegroundTab`, `newBackgroundTab`), `omnibox.SuggestResult`.
- **"Functions"**: `setDefaultSuggestion()` (first drop-down row).
- **"Events"**: `onInputStarted`, `onInputChanged` (supply suggestions), `onInputEntered` (accept), `onDeleteSuggestion`, `onInputCancelled`.
- **"Example extensions"** and **"Browser compatibility"**: `firefox-code-search`; based on Chromium's `chrome.omnibox`; requires the `omnibox` manifest key.
  - *Key terms/entities:* `omnibox.keyword`, `omnibox.setDefaultSuggestion`, `omnibox.SuggestResult`, `OnInputEnteredDisposition`, `onInputChanged`, `onInputEntered`, `onInputCancelled`

### [commands](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/commands)
**Overview:** Reads and updates keyboard shortcuts declared with the `commands` manifest key and listens for their execution. No explicit permission is required.

**Sections:**
- **"Types"**: `commands.Command` (name, description, shortcut).
- **"Functions"**: `getAll()`, `openShortcutSettings()`, `reset()`, `update()`.
- **"Events"**: `onCommand` (shortcut executed), `onChanged` (shortcut changed).
- **"Example extensions"** and **"Browser compatibility"**: `commands`; based on Chromium's `chrome.commands`.
  - *Key terms/entities:* `commands` manifest key, `commands.Command`, `commands.getAll`, `commands.update`, `commands.reset`, `commands.onCommand`, `commands.openShortcutSettings`

### [devtools](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools)
**Overview:** Entry namespace for devtools extensions: `devtools.inspectedWindow`, `devtools.network`, and `devtools.panels`. Requires the `devtools_page` manifest key (implicit `devtools` permission and install warning; optional permission is Firefox-only); the namespace is available only to devtools pages and panels/sidebars they create.

**Sections:**
- **"Properties"**: `devtools.inspectedWindow` (tab ID, eval, reload, resources), `devtools.network` (request data for the inspected window), `devtools.panels` (create UI panels).
- **"Browser compatibility"**: Based on Chromium's `chrome.devtools`; Firefox omits several panel/resource features (see Extending the developer tools).
  - *Key terms/entities:* `devtools_page`, `devtools` permission, `devtools.inspectedWindow`, `devtools.network`, `devtools.panels`, `optional_permissions`

### [find](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/find)
**Overview:** Finds text in a web page, highlights matches, and clears highlights. Requires the `find` permission; Firefox-only API.

**Sections:**
- **"Functions"**: `find.find()`, `find.highlightResults()`, `find.removeHighlighting()`.
- **"Example extensions"** and **"Browser compatibility"**: `find-across-tabs`.
  - *Key terms/entities:* `find` permission, `find.find`, `find.highlightResults`, `find.removeHighlighting`

### [clipboard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/clipboard)
**Overview:** WebExtension clipboard API for copying images to the system clipboard (the standard Clipboard API handles text but not images). Requires the `clipboardWrite` permission; reading is unsupported here.

**Sections:**
- **"Functions"**: `clipboard.setImageData()`.
- **"Browser compatibility"**: Based on Chromium's `chrome.clipboard` (Chrome-app-only there); Firefox extension support; may be deprecated as standard clipboard APIs gain image support.
  - *Key terms/entities:* `clipboardWrite`, `clipboard.setImageData`, `navigator.clipboard`

**Content injection & page interaction**

### [scripting](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting)
**Overview:** Injects JavaScript/CSS into sites and registers persistent content scripts at runtime. Requires the `scripting` permission plus host permission or `activeTab` for the target. Chrome restricts it to MV3; Firefox and Safari support MV2 and MV3.

**Sections:**
- **[Types](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting#types)**: `scripting.ContentScriptFilter`, `scripting.ExecutionWorld`, `scripting.InjectionTarget`, `scripting.RegisteredContentScript`.
- **[Functions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting#functions)**: `executeScript()`, `getRegisteredContentScripts()`, `insertCSS()`, `registerContentScripts()`, `removeCSS()`, `updateContentScripts()`, `unregisterContentScripts()`.
- **[Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting#example_extensions)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting#browser_compatibility)**: `beastify`, `menu-demo`, `script-on-click`; based on Chromium's `chrome.scripting`.
  - *Key terms/entities:* `scripting` permission, `scripting.executeScript`, `scripting.insertCSS`, `scripting.registerContentScripts`, `scripting.ExecutionWorld`, `activeTab`

### [contentScripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/contentScripts)
**Overview:** MV2 Firefox API for registering content scripts at runtime (analogue of install-time `content_scripts`). MV3 uses `scripting.registerContentScripts()`. Requires host permissions but no API permission; registrations auto-unregister when the registering page is destroyed.

**Sections:**
- **"Types"**: `contentScripts.RegisteredContentScript` with `unregister()`.
- **"Functions"**: `contentScripts.register({ js, css, matches, ... })` resolves to `RegisteredContentScript`.
- **"Example extensions"** and **"Browser compatibility"**: `content-script-register`.
  - *Key terms/entities:* `contentScripts.register`, `RegisteredContentScript.unregister`, `content_scripts` manifest key, host permissions, Manifest V2

### [userScripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts)
**Overview:** MV3 user-script manager API: register/update/execute third-party scripts in isolated USER_SCRIPT or MAIN worlds, configure world CSP/messaging, and receive dedicated messages. Requires `userScripts` + host permissions; Firefox makes it optional-only, Chrome install-time plus a user toggle.

**Sections:**
- **"Permissions"**: Firefox — declare in `optional_permissions`, check `permissions.contains()`/namespace availability, request with `permissions.request()`; Chrome — `permissions` plus user enablement in `chrome://extensions/`; both need `host_permissions`.
- **"Execution worlds"**: `USER_SCRIPT` (isolated, no extension APIs, shared/isolated via `worldId`, CSP via `configureWorld()`) vs `MAIN` (page-visible; no `worldId`).
- **"Messaging"**: `runtime.sendMessage()`/`runtime.connect()`; receive via `runtime.onUserScriptMessage`/`onUserScriptConnect`; enable with `userScripts.configureWorld({ messaging: true })`.
- **"Extension updates"**: Scripts are cleared on update; re-register from `runtime.onInstalled` with reason `"update"`.
- **"Types"**: `ExecutionWorld`, `RegisteredUserScript`, `ScriptSource`, `UserScriptFilter`, `WorldProperties`.
- **"Methods"**: `configureWorld()`, `execute()`, `getScripts()`, `getWorldConfigurations()`, `register()`, `resetWorldConfiguration()`, `unregister()`, `update()`.
- **"Example extensions"** and **"Browser compatibility"**: `userScripts-mv3`; see also `browser.scripting`.
  - *Key terms/entities:* `userScripts` permission, `optional_permissions`, `userScripts.configureWorld`, `userScripts.register`, `userScripts.execute`, `worldId`, `runtime.onUserScriptMessage`, `runtime.onUserScriptConnect`, `USER_SCRIPT`, `MAIN`

### [userScripts (Legacy)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts_legacy)
**Overview:** MV2 Firefox legacy user-script API. Registers third-party scripts in an isolated sandbox with `window`/`document` access but no extension APIs; an API script declared with the `user_scripts` manifest key supplies packaged APIs. Unregisters when the registering extension page unloads.

**Sections:**
- **"Types"**: `userScripts.RegisteredUserScript`, `userScripts.UserScriptOptions`.
- **"Methods"**: `userScripts.register()`.
- **"Events"**: `userScripts.onBeforeScript` (API script can export extra APIs before each user script runs).
- **"Browser compatibility"** and **"See also"**: Requires `user_scripts` manifest key (even `{}`); see Working with userScripts (Legacy) and `browser.contentScripts`; example `user-script-register`.
  - *Key terms/entities:* `user_scripts` manifest key, `userScripts.register`, `RegisteredUserScript`, `UserScriptOptions`, `onBeforeScript`, Manifest V2

### [dom](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dom)
**Overview:** Firefox-only extension DOM helper: retrieve an element's open or closed shadow root.

**Sections:**
- **"Functions"**: `dom.openOrClosedShadowRoot(element)` returns the open/closed shadow root or `null`.
- **"Browser compatibility"**: Firefox-only (Chrome exposes `chrome.dom` without this method).
  - *Key terms/entities:* `dom.openOrClosedShadowRoot`, shadow root

**Data & storage**

### [storage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
**Overview:** Asynchronous extension-scoped key/value storage for JSON-ifiable values, split into `local`, `managed`, `session`, and `sync` areas, with change notifications. Requires the `storage` permission; do not use `localStorage` for extension data, and do not store secrets (not encrypted).

**Sections:**
- **[Types](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage#types)**: `storage.StorageArea`, `storage.StorageChange`.
- **[Properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage#properties)**: `storage.local` (machine-local), `storage.managed` (admin-set, read-only), `storage.session` (in-memory, not persisted), `storage.sync` (synced across signed-in browsers).
- **[Events](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage#events)**: `storage.onChanged` across all areas.
- **[Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage#example_extensions)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage#browser_compatibility)**: `annotate-page`, `favourite-colour`, `forget-it`, `navigation-stats`, `proxy-blocker`, `quicknote`, `stored-credentials`, `userScripts-mv3`; based on Chromium's `chrome.storage`.
  - *Key terms/entities:* `storage` permission, `storage.local`, `storage.sync`, `storage.session`, `storage.managed`, `storage.StorageArea.get/set/remove/clear`, `storage.onChanged`

### [browsingData](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browsingData)
**Overview:** Clears accumulated browsing data (cache, cookies, downloads, history, local/session storage, form data, passwords, plugin data) with time-range/context filters, and reads the browser's Clear History settings. Requires the `browsingData` permission.

**Sections:**
- **"Types"**: `browsingData.DataTypeSet`, `browsingData.RemovalOptions` (how far back; add-on vs normal data — add-on scope not yet supported in Firefox).
- **"Methods"**: `remove()`, `removeCache()`, `removeCookies()`, `removeDownloads()`, `removeFormData()`, `removeHistory()`, `removeLocalStorage()`, `removePasswords()`, `removePluginData()`, `settings()`.
- **"Example extensions"** and **"Browser compatibility"**: `forget-it`; based on Chromium's `chrome.browsingData`.
  - *Key terms/entities:* `browsingData` permission, `browsingData.remove`, `DataTypeSet`, `RemovalOptions`, `removeHistory`, `removeCookies`, `removeLocalStorage`

### [cookies](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/cookies)
**Overview:** Gets/sets/removes cookies and watches changes, with access bounded by host permissions. Covers Firefox dynamic partitioning (`partitionKey.topLevelSite`) and first-party isolation (`firstPartyDomain`), plus cookie stores. Requires `cookies` plus host permissions.

**Sections:**
- **"Permissions"**: `cookies` API permission + host permissions; `http://*.example.com/`, `http://www.example.com/`, and `*://*.example.com/` grant different read/write scopes (secure vs non-secure, subdomains, paths).
- **"Tracking protection"**: Dynamic partitioning (default since Firefox 103) and first-party isolation (takes precedence; enabled by `privacy` API `firstPartyIsolate`).
- **"Storage partitioning"**: Cookies in partitioned storage need `partitionKey.topLevelSite` for `get`/`set`/`remove`; `getAll()` with a `partitionKey` and no `topLevelSite` returns both; `onChanged` reports `cookie.partitionKey`, which should be passed back.
- **"First-party isolation"**: `firstPartyDomain` must be supplied when isolation is on (string for get/set/remove; `null` allowed for `getAll`).
- **"Types"**: `cookies.Cookie`, `cookies.CookieStore`, `cookies.OnChangedCause`, `cookies.SameSiteStatus`.
- **"Methods"**: `get()`, `getAll()`, `set()`, `remove()`, `getAllCookieStores()`.
- **"Event handlers"**: `onChanged`.
- **"Example extensions"** and **"Browser compatibility"**: `cookie-bg-picker`, `list-cookies`; based on Chromium's `chrome.cookies`.
  - *Key terms/entities:* `cookies` permission, `cookies.Cookie`, `cookies.set`, `cookies.getAll`, `cookies.getAllCookieStores`, `partitionKey.topLevelSite`, `firstPartyDomain`, `onChanged`

### [history](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/history)
**Overview:** Searches, adds, and removes browser history and visits, with visit-level details and events. Downloads are represented as history items, so events like `onVisited` also fire for downloads. Requires the `history` permission.

**Sections:**
- **"Types"**: `history.TransitionType`, `history.HistoryItem`, `history.VisitItem`.
- **"Functions"**: `search()`, `getVisits()`, `addUrl()`, `deleteUrl()`, `deleteRange()`, `deleteAll()`.
- **"Events"**: `onTitleChanged`, `onVisited`, `onVisitRemoved`.
- **"Example extensions"** and **"Browser compatibility"**: `history-deleter`; based on Chromium's `chrome.history`.
  - *Key terms/entities:* `history` permission, `history.search`, `history.HistoryItem`, `history.VisitItem`, `history.addUrl`, `history.deleteUrl`, `history.deleteRange`, `history.onVisited`

### [bookmarks](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks)
**Overview:** Reads and manipulates the bookmark tree: create/update/move/remove bookmarks and folders, traverse/search the tree, and observe changes and imports. Requires the `bookmarks` permission; the root node cannot be modified.

**Sections:**
- **"Types"**: `bookmarks.BookmarkTreeNode`, `bookmarks.BookmarkTreeNodeType` (bookmark/folder/separator), `bookmarks.BookmarkTreeNodeUnmodifiable`, `bookmarks.CreateDetails`.
- **"Functions"**: `create()`, `get()`, `getChildren()`, `getRecent()`, `getSubTree()`, `getTree()`, `move()`, `remove()`, `removeTree()`, `search()`, `update()`.
- **"Events"**: `onCreated`, `onRemoved`, `onChanged`, `onMoved`, `onChildrenReordered`, `onImportBegan`, `onImportEnded`.
- **"Example extensions"** and **"Browser compatibility"**: `bookmark-it`; based on Chromium's `chrome.bookmarks`.
  - *Key terms/entities:* `bookmarks` permission, `BookmarkTreeNode`, `bookmarks.create`, `bookmarks.getTree`, `bookmarks.search`, `bookmarks.removeTree`, `bookmarks.onCreated`, `bookmarks.onImportBegan`

### [downloads](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/downloads)
**Overview:** Interacts with the download manager: start, search, pause/resume/cancel downloads, open/show files or folders, erase history, delete files, accept dangerous downloads, and observe download lifecycle events. Requires the `downloads` permission.

**Sections:**
- **"Types"**: `FilenameConflictAction`, `InterruptReason`, `DangerType`, `State`, `DownloadItem`, `StringDelta`, `DoubleDelta`, `BooleanDelta`, `DownloadTime`, `DownloadQuery`.
- **"Functions"**: `download()`, `search()`, `pause()`, `resume()`, `cancel()`, `getFileIcon()`, `open()`, `show()`, `showDefaultFolder()`, `erase()`, `removeFile()`, `acceptDanger()`, `setShelfEnabled()`.
- **"Events"**: `onCreated`, `onErased`, `onChanged`.
- **"Example extensions"** and **"Browser compatibility"**: `latest-download`; based on Chromium's `chrome.downloads`.
  - *Key terms/entities:* `downloads` permission, `downloads.download`, `downloads.search`, `downloads.DownloadItem`, `downloads.open`, `downloads.erase`, `downloads.onCreated`

### [topSites](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/topSites)
**Overview:** Returns the frequently visited pages shown on the browser's New Tab page. Requires the `topSites` permission; result count and contents are browser- and user-specific.

**Sections:**
- **"Types"**: `topSites.MostVisitedURL` (title + URL).
- **"Methods"**: `topSites.get()`.
- **"Example extensions"** and **"Browser compatibility"**: `top-sites`; based on Chromium's `chrome.topSites`.
  - *Key terms/entities:* `topSites` permission, `topSites.get`, `MostVisitedURL`

**Network & navigation**

### [webRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest)
**Overview:** Event-driven HTTP/WebSocket interception: observe every request stage, cancel/redirect, modify request/response headers, supply auth credentials, inspect TLS, and stream-edit response bodies. Requires `webRequest` + host permissions; `webRequestBlocking` for blocking/modification.

**Sections:**
- **"Modifying requests"**: With `extraInfoSpec: ["blocking"]`, listeners return a `BlockingResponse`; cancel in `onBeforeRequest`/`onBeforeSendHeaders`/`onAuthRequired`; redirect in `onBeforeRequest`/`onHeadersReceived`; modify request headers in `onBeforeSendHeaders`; response headers in `onHeadersReceived`; credentials in `onAuthRequired`.
- **"Requests at browser startup" / "Speculative requests"**: Blocking listeners registered at startup can catch early requests; speculative connections have inaccurate tab/frame IDs and `ResourceType: "speculative"`.
- **"Accessing security information"**: `getSecurityInfo()` in `onHeadersReceived` (requires blocking) returns TLS details; read-only.
- **"Modifying responses"**: `filterResponseData()` returns a `webRequest.StreamFilter` to inspect/modify bodies; needs `webRequestBlocking` + host permissions.
- **[Types](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#types)**: `BlockingResponse`, `CertificateInfo`, `HttpHeaders`, `RequestFilter`, `ResourceType`, `SecurityInfo`, `StreamFilter`, `UploadData`.
- **[Properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#properties)**: `MAX_HANDLER_BEHAVIOR_CHANGED_CALLS_PER_10_MINUTES`.
- **[Methods](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#methods)**: `handlerBehaviorChanged()`, `filterResponseData()`, `getSecurityInfo()`.
- **[Events](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#events)**: `onBeforeRequest`, `onBeforeSendHeaders`, `onSendHeaders`, `onHeadersReceived`, `onAuthRequired`, `onResponseStarted`, `onBeforeRedirect`, `onCompleted`, `onErrorOccurred`.
- **[Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#example_extensions)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#browser_compatibility)**: `http-response`, `root-cert-stats`, `stored-credentials`, `user-agent-rewriter`; based on Chromium's `chrome.webRequest`; see Chrome incompatibilities.
  - *Key terms/entities:* `webRequestBlocking`, `RequestFilter`, `BlockingResponse`, `ResourceType`, `details.requestId`, `getSecurityInfo`, `filterResponseData`, `StreamFilter`

### [declarativeNetRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest)
**Overview:** Browser-evaluated declarative network rules (block, redirect, modify headers, upgrade, allow) organized into static, dynamic, and session rulesets. No background page and no per-request extension access; `declarativeNetRequest` can block/upgrade without host permissions, while redirects/header edits need them. `declarativeNetRequestFeedback` unlocks testing APIs.

**Sections:**
- **"Permissions"**: `declarativeNetRequest` or `declarativeNetRequestWithHostAccess`; host permissions for redirects/header modification (and for the initiator except `main_frame`/`sub_frame`); `declarativeNetRequestFeedback` for `getMatchedRules`/`onRuleMatchedDebug`.
- **"Rules"**: Each rule has `id`, `priority`, `condition`, `action`; actions `block`, `redirect`, `modifyHeaders`, `allow`, `allowAllRequests`, `upgradeScheme`; `urlFilter` syntax (`abc`, `abc*d`, `||a.example.com`, `|https*`).
- **"Rulesets"**: Static (`declarative_net_request.rule_resources`, `updateEnabledRulesets`), dynamic (`updateDynamicRules`, persists), session (`updateSessionRules`, cleared per session).
- **"Limits" / "Matching precedence"**: Constants cap static/dynamic/session/regex rules; priority first, then action order (`allow` > `allowAllRequests` > `block` > `upgradeScheme` > `redirect` > `modifyHeaders`); Firefox adds ruleset order session > dynamic > static.
- **"Testing"**: `testMatchOutcome`, `getMatchedRules`, `onRuleMatchedDebug`; Chrome requires unpacked, Firefox requires `extensions.dnr.feedback=true`.
- **"Comparison with webRequest"**: In-browser evaluation, no background page, better privacy/perf, Chrome auto-collapses blocked images/iframes, DNR evaluated before webRequest.
- **"Types"**: `HeaderInfo`, `MatchedRule`, `ModifyHeaderInfo`, `Redirect`, `ResourceType`, `Rule`, `RuleAction`, `RuleCondition`, `URLTransform`.
- **"Properties"**: `DYNAMIC_RULESET_ID`, `SESSION_RULESET_ID`, `GETMATCHEDRULES_QUOTA_INTERVAL`, `GUARANTEED_MINIMUM_STATIC_RULES`, `MAX_GETMATCHEDRULES_CALLS_PER_INTERVAL`, `MAX_NUMBER_OF_DISABLED_STATIC_RULES`, `MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES`, `MAX_NUMBER_OF_DYNAMIC_RULES`, `MAX_NUMBER_OF_ENABLED_STATIC_RULESETS`, `MAX_NUMBER_OF_REGEX_RULES`, `MAX_NUMBER_OF_SESSION_RULES`, `MAX_NUMBER_OF_STATIC_RULESETS`.
- **"Functions"**: `getAvailableStaticRuleCount`, `getDisabledRuleIds`, `getDynamicRules`, `getEnabledRulesets`, `getMatchedRules`, `getSessionRules`, `isRegexSupported`, `setExtensionActionOptions`, `testMatchOutcome`, `updateDynamicRules`, `updateEnabledRulesets`, `updateSessionRules`, `updateStaticRules`.
- **"Events"** and **"Example extensions"**: `onRuleMatchedDebug`; `dnr-block-only`, `dnr-dynamic-with-options`, `dnr-redirect-url`.
  - *Key terms/entities:* `declarative_net_request.rule_resources`, `RuleCondition.urlFilter`, `RuleAction`, `ModifyHeaderInfo`, `updateDynamicRules`, `updateSessionRules`, `testMatchOutcome`, `declarativeNetRequestFeedback`

### [proxy](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy)
**Overview:** Firefox proxy API: set proxy configuration and dynamically decide per request with `proxy.onRequest`, returning a `ProxyInfo`. Requires the `proxy` permission (with `strict_min_version` ≥ 91.1.0) plus host permissions for intercepted URLs; Chrome's `proxy` API is incompatible.

**Sections:**
- **"Types"**: `proxy.ProxyInfo`, `proxy.RequestDetails`.
- **"Properties"**: `proxy.settings` (get/set global proxy settings; alternative: `browserSettings.proxyConfig`).
- **"Events"**: `onRequest` (choose proxying per request), `onError` (PAC script or `onRequest` failure).
- **"Example extensions"** and **"Browser compatibility"**: `proxy-blocker`; Chrome's API uses `ProxyConfig`/`ProxyRules`/`PacScript` instead.
  - *Key terms/entities:* `proxy` permission, `proxy.onRequest`, `proxy.ProxyInfo`, `proxy.RequestDetails`, `proxy.settings`, `strict_min_version`, `browserSettings.proxyConfig`

### [dns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dns)
**Overview:** Resolves domain names to DNS records. Requires the `dns` permission; fails with `NS_ERROR_UNKNOWN_PROXY_HOST` when DNS-over-SOCKS proxying is enabled.

**Sections:**
- **"Functions"**: `dns.resolve(hostname, flags)`.
- **"Browser compatibility"**: Firefox-only.
  - *Key terms/entities:* `dns` permission, `dns.resolve`, `NS_ERROR_UNKNOWN_PROXY_HOST`

### [webNavigation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation)
**Overview:** Navigation-stage events at the browser-UI level (complementing HTTP-level `webRequest`): before/committed/DOMContentLoaded/completed, errors, new-tab targets, fragment/history updates, and tab replacement. Requires the `webNavigation` permission; listeners accept URL-pattern filters.

**Sections:**
- **"Types"**: `webNavigation.TransitionType`, `webNavigation.TransitionQualifier` (passed to `onCommitted`).
- **"Functions"**: `getFrame(details)`, `getAllFrames(tabId)`.
- **"Events"**: `onBeforeNavigate`, `onCommitted`, `onDOMContentLoaded`, `onCompleted`, `onErrorOccurred`, `onCreatedNavigationTarget`, `onReferenceFragmentUpdated`, `onTabReplaced`, `onHistoryStateUpdated`.
- **"Example extensions"** and **"Browser compatibility"**: `navigation-stats`; based on Chromium's `chrome.webNavigation`.
  - *Key terms/entities:* `webNavigation` permission, `TransitionType`, `TransitionQualifier`, `onBeforeNavigate`, `onCommitted`, `onHistoryStateUpdated`, `getAllFrames`

### [publicSuffix](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/publicSuffix)
**Overview:** Queries the browser's built-in Public Suffix List: check whether a host is a public suffix, extract its suffix, or compute the registrable domain (eTLD+1). Requires the `publicSuffix` permission; Firefox-only.

**Sections:**
- **"Types"**: `publicSuffix.DomainEncoding`.
- **"Functions"**: `isKnownSuffix()`, `getKnownSuffix()`, `getDomain()` (eTLD+1).
- **"Browser compatibility"**: Firefox-only.
  - *Key terms/entities:* `publicSuffix` permission, `publicSuffix.getDomain`, `publicSuffix.isKnownSuffix`, `publicSuffix.getKnownSuffix`, eTLD+1

**Runtime, permissions & extension management**

### [runtime](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime)
**Overview:** Extension identity/environment plus the core messaging system: one-off messages, long-lived ports, external-extension and native messaging, install/update/suspend lifecycle events, platform/browser info, options-page opening, URL resolution, and reload/update checks. No permission required.

**Sections:**
- **"Types"**: `runtime.Port`, `runtime.MessageSender`, `runtime.PlatformOs`, `runtime.PlatformArch`, `runtime.PlatformInfo`, `runtime.PlatformNaclArch`, `runtime.RequestUpdateCheckStatus`, `runtime.OnInstalledReason`, `runtime.OnPerformanceWarningCategory`, `runtime.OnPerformanceWarningSeverity`, `runtime.OnRestartRequiredReason`.
- **"Properties"**: `runtime.lastError`, `runtime.id`.
- **"Functions"**: `getBackgroundPage()`, `getDocumentId()`, `openOptionsPage()`, `getContexts()`, `getFrameId()`, `getManifest()`, `getURL()`, `getVersion()`, `setUninstallURL()`, `reload()`, `requestUpdateCheck()`, `connect()`, `connectNative()`, `sendMessage()`, `sendNativeMessage()`, `getPlatformInfo()`, `getBrowserInfo()`, `getPackageDirectoryEntry()`.
- **"Events"**: `onStartup`, `onInstalled`, `onSuspend`, `onSuspendCanceled`, `onUpdateAvailable`, `onBrowserUpdateAvailable`, `onConnect`, `onConnectExternal`, `onUserScriptConnect`, `onMessage`, `onMessageExternal`, `onUserScriptMessage`, `onPerformanceWarning`, `onRestartRequired`.
- **"Example extensions"** and **"Browser compatibility"**: 18 examples (`beastify`, `native-messaging`, `permissions`, `userScripts-mv3`, ...); based on Chromium's `chrome.runtime`.
  - *Key terms/entities:* `runtime.sendMessage`, `runtime.onMessage`, `runtime.connect`, `runtime.onConnect`, `runtime.Port`, `runtime.getURL`, `runtime.getManifest`, `runtime.onInstalled`, `runtime.lastError`, `runtime.connectNative`, `runtime.sendNativeMessage`

### [extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extension)
**Overview:** Legacy extension utilities: background page/view access, packaged-resource URLs, incognito and file-scheme access checks, update URL data, and deprecated messaging APIs now superseded by `runtime`.

**Sections:**
- **"Types"**: `extension.ViewType`.
- **"Properties"**: `extension.lastError`, `extension.inIncognitoContext`.
- **"Functions"**: `getBackgroundPage()`, `getExtensionTabs()`, `getURL()`, `getViews()`, `isAllowedIncognitoAccess()`, `isAllowedFileSchemeAccess()`, `sendRequest()` (deprecated), `setUpdateUrlData()`.
- **"Events"**: `onRequest`, `onRequestExternal` (deprecated).
- **"Example extensions"** and **"Browser compatibility"**: `cookie-bg-picker`, `find-across-tabs`, `imagify`, `notify-link-clicks-i18n`, `proxy-blocker`, `user-agent-rewriter`; based on Chromium's `chrome.extension`.
  - *Key terms/entities:* `extension.getURL`, `extension.getBackgroundPage`, `extension.getViews`, `inIncognitoContext`, `isAllowedIncognitoAccess`, `isAllowedFileSchemeAccess`, `extension.lastError`

### [extensionTypes](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extensionTypes)
**Overview:** Shared type definitions used across extension APIs: image encoding details, injection options, injection timing, and CSS origin classification.

**Sections:**
- **"Types"**: `extensionTypes.ImageDetails`, `ImageFormat`, `InjectDetails`, `RunAt` (`document_start`/`document_end`/`document_idle`), `CSSOrigin` (`author`/`user`).
- **"Browser compatibility"**: Based on Chromium's `chrome.extensionTypes`.
  - *Key terms/entities:* `extensionTypes.ImageDetails`, `InjectDetails`, `RunAt`, `CSSOrigin`

### [events](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/events)
**Overview:** Shared event infrastructure types: add/remove listeners, declarative event rules, and URL filters used by event APIs.

**Sections:**
- **"Types"**: `events.Rule`, `events.Event` (add/remove listeners), `events.UrlFilter` (OR semantics across criteria).
- **"Browser compatibility"**: Based on Chromium's `chrome.events`.
  - *Key terms/entities:* `events.Event.addListener`, `removeListener`, `events.UrlFilter`, `events.Rule`

### [i18n](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n)
**Overview:** Localization runtime: fetch strings from `_locales`/`messages.json`, detect text language, and query browser/OS UI and accepted languages. No permission required.

**Sections:**
- **"Types"**: `i18n.LanguageCode`.
- **"Functions"**: `getMessage()`, `detectLanguage()`, `getAcceptLanguages()`, `getUILanguage()`, `getPreferredSystemLanguages()`, `getSystemUILanguage()`.
- **"Example extensions"** and **"Browser compatibility"**: `menu-accesskey-visible`, `menu-demo`, `notify-link-clicks-i18n`; based on Chromium's `chrome.i18n`.
- **"See also"**: Internationalization guide; Locale-Specific Message reference for `messages.json`.
  - *Key terms/entities:* `i18n.getMessage`, `i18n.detectLanguage`, `getAcceptLanguages`, `getUILanguage`, `getPreferredSystemLanguages`, `getSystemUILanguage`, `messages.json`

### [permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions)
**Overview:** Runtime permission requests and revocation: declare optional API/host permissions and optional data-collection permissions, request them from a user-action handler, inspect/remove grants, and observe changes. Requires no single permission itself.

**Sections:**
- **"Types"**: `permissions.Permissions` (permissions + origins).
- **"Methods"**: `contains()`, `getAll()`, `remove()`, `request()` (only inside a user-action handler; granted silently for some permissions like `activeTab`).
- **"Event handlers"**: `onAdded`, `onRemoved` (users can manage optional permissions from the Add-ons Manager).
- **"Example extensions"** and **"Browser compatibility"**: `dnr-dynamic-with-options`, `dnr-redirect-url`, `permissions`, `userScripts-mv3`; based on Chromium's `chrome.permissions`.
- **"See also"**: `permissions` and `optional_permissions` manifest keys; `browser_specific_settings.gecko.data_collection_permissions.optional`.
  - *Key terms/entities:* `optional_permissions`, `permissions.request`, `permissions.contains`, `permissions.remove`, `permissions.Permissions`, `permissions.onAdded`, `permissions.onRemoved`, `data_collection_permissions`

### [management](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/management)
**Overview:** Inspects and controls installed add-ons: list/get extensions, install themes, enable/disable, uninstall, read permission warnings, and observe install/enable events. Most operations require the `management` permission; self-only operations do not.

**Sections:**
- **"Types"**: `management.ExtensionInfo`.
- **"Functions"**: `getAll()`, `get()`, `getSelf()`, `install()` (theme URL at addons.mozilla.org), `uninstall()`, `uninstallSelf()`, `getPermissionWarningsById()`, `getPermissionWarningsByManifest()`, `setEnabled()`.
- **"Events"**: `onInstalled`, `onUninstalled`, `onEnabled`, `onDisabled`.
- **"Example extensions"** and **"Browser compatibility"**: `theme-switcher`, `themed-icons`; based on Chromium's `chrome.management`.
  - *Key terms/entities:* `management` permission, `management.getAll`, `management.setEnabled`, `management.install`, `management.getSelf`, `management.ExtensionInfo`

### [identity](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity)
**Overview:** OAuth2 authorization for extensions: obtain a redirect URL, register the extension as an OAuth client, launch the web auth flow, and receive an authorization code or access token. Requires the `identity` permission.

**Sections:**
- **"Setup"**: `identity.getRedirectURL()` derives the redirect URL from the add-on ID (set `browser_specific_settings.gecko.id` for a stable URL); Firefox 75+ requires that URL, and Firefox 86+ also permits `http://127.0.0.1/mozoauth2/...` loopback; register the redirect URL with the provider to get a client ID (and sometimes secret).
- **"Functions"**: `getRedirectURL()`, `launchWebAuthFlow()`.
- **"Example extensions"** and **"Browser compatibility"**: `google-userinfo`; based on Chromium's `chrome.identity`.
  - *Key terms/entities:* `identity` permission, `identity.getRedirectURL`, `identity.launchWebAuthFlow`, OAuth2, `browser_specific_settings.gecko.id`

### [idle](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/idle)
**Overview:** Detects system idle/locked/active state and notifies on changes. Requires the `idle` permission.

**Sections:**
- **"Types"**: `idle.IdleState` (`"locked"`, `"idle"`, `"active"`).
- **"Functions"**: `queryState(detectionIntervalInSeconds)`, `setDetectionInterval(seconds)`.
- **"Events"**: `onStateChanged`.
- **"Browser compatibility"**: Based on Chromium's `chrome.idle`.
  - *Key terms/entities:* `idle` permission, `idle.queryState`, `idle.setDetectionInterval`, `idle.onStateChanged`

### [alarms](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/alarms)
**Overview:** Schedules code to run later or periodically, surviving event-page suspension (unlike `setTimeout`/`setInterval`). Alarms are extension-global but do not persist across browser sessions and are unavailable in content scripts. Requires the `alarms` permission.

**Sections:**
- **"Types"**: `alarms.Alarm`.
- **"Methods"**: `clear()`, `clearAll()`, `create()`, `get()`, `getAll()`.
- **"Events"**: `onAlarm`.
- **"Example extensions"** and **"Browser compatibility"**: `chill-out`, `dynamic-theme`; based on Chromium's `chrome.alarms`.
  - *Key terms/entities:* `alarms` permission, `alarms.create`, `alarms.Alarm`, `alarms.onAlarm`, `delayInMinutes`, `periodInMinutes`

**Browser settings, themes & internals**

### [browserSettings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserSettings)
**Overview:** Modifies global browser settings, each exposed as a `BrowserSetting` object with get/set/clear and change events; extensions can conflict over these globals. Requires the `browserSettings` permission.

**Sections:**
- **"Properties"**: `allowPopupsForUserEvents`, `cacheEnabled`, `closeTabsByDoubleClick`, `colorManagement`, `contextMenuShowEvent`, `ftpProtocolEnabled`, `homepageOverride`, `imageAnimationBehavior`, `newTabPageOverride`, `newTabPosition`, `openBookmarksInNewTabs`, `openSearchResultsInNewTabs`, `openUrlbarResultsInNewTabs`, `overrideContentColorScheme`, `overrideDocumentColors`, `tlsVersionRestrictionConfig`, `useDocumentFonts`, `verticalTabs`, `webNotificationsDisabled`, `zoomFullPage`, `zoomSiteSpecific` (ignored when `privacy.websites.resistFingerprinting` is true).
- **"Browser compatibility"**: Firefox-specific set; uses `BrowserSetting.get/set/clear`.
  - *Key terms/entities:* `browserSettings` permission, `BrowserSetting`, `zoomSiteSpecific`, `overrideContentColorScheme`, `verticalTabs`

### [privacy](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/privacy)
**Overview:** Access and modify privacy-related browser settings grouped into network, services, and websites, each exposing `BrowserSetting` objects. Requires the `privacy` permission.

**Sections:**
- **"Properties"**: `privacy.network` (e.g. `webRTCIPHandlingPolicy`, `peerConnectionEnabled`), `privacy.services` (e.g. `passwordSavingEnabled`), `privacy.websites` (e.g. `cookieConfig`, `firstPartyIsolate`, `resistFingerprinting`, `trackingProtectionMode`).
- **"Browser compatibility"**: Based on Chromium's `chrome.privacy`; individual settings vary by browser.
  - *Key terms/entities:* `privacy` permission, `BrowserSetting`, `privacy.network`, `privacy.services`, `privacy.websites`, `cookieConfig`, `firstPartyIsolate`, `resistFingerprinting`

### [theme](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/theme)
**Overview:** Reads and dynamically updates the browser theme (distinct from static themes declared with the `theme` manifest key): fetch current theme, apply a `theme.Theme`, reset updates, and observe theme changes.

**Sections:**
- **"Types"**: `theme.Theme`.
- **"Functions"**: `getCurrent()`, `update()`, `reset()`.
- **"Events"**: `onUpdated`.
- **"Example extensions"** and **"Browser compatibility"**: `dynamic-theme`, `private-browsing-theme`, `theme-integrated-sidebar`; static themes use the separate `theme` manifest key.
  - *Key terms/entities:* `theme.Theme`, `theme.getCurrent`, `theme.update`, `theme.reset`, `theme.onUpdated`, `theme` manifest key

### [search](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/search)
**Overview:** Lists installed search engines and runs searches. Requires the `search` permission. `search.query()` works cross-browser against the default engine; `search.search()` (Firefox-only) targets any installed engine.

**Sections:**
- **"Functions"**: `get()` (all engines), `query()` (default engine), `search()` (specified engine, Firefox-only).
- **"Example extensions"** and **"Browser compatibility"**: `menu-search`.
  - *Key terms/entities:* `search` permission, `search.get`, `search.query`, `search.search`

### [contextualIdentities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/contextualIdentities)
**Overview:** Manages Firefox container tabs (contextual identities): each has a name, color, icon, and isolated `cookieStoreId`. Requires `contextualIdentities` + `cookies` permissions; Firefox-only and still experimental (`privacy.userContext.enabled`, auto-enabled when an extension uses it from Firefox 57).

**Sections:**
- **"Types"**: `contextualIdentities.ContextualIdentity`.
- **"Functions"**: `create()`, `get()`, `getSupportedColors()`, `getSupportedIcons()`, `move()`, `query()`, `update()`, `remove()`.
- **"Events"**: `onCreated`, `onRemoved`, `onUpdated`.
- **"Example extensions"** and **"Browser compatibility"**: `contextual-identities`.
  - *Key terms/entities:* `contextualIdentities` permission, `cookieStoreId`, `getSupportedColors`, `getSupportedIcons`, `privacy.userContext.enabled`

### [captivePortal](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/captivePortal)
**Overview:** Detects captive-portal state for the user's connection. Requires the `captivePortal` permission; Firefox-only.

**Sections:**
- **"Properties"**: `captivePortal.canonicalURL` (read-only detection-page URL).
- **"Functions"**: `getLastChecked()`, `getState()` (`unknown`, `not_captive`, `unlocked_portal`, `locked_portal`).
- **"Events"**: `onConnectivityAvailable`, `onStateChanged`.
- **"Browser compatibility"**: Firefox-only.
  - *Key terms/entities:* `captivePortal` permission, `captivePortal.getState`, `captivePortal.canonicalURL`, `onConnectivityAvailable`

### [pkcs11](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/pkcs11)
**Overview:** Enumerates and installs PKCS #11 security modules as browser key/certificate sources. Requires the `pkcs11` permission; Firefox 58+, plus an installed module and a native manifest provisioned outside the extension.

**Sections:**
- **"Using the Firefox Preferences Dialog to Install PKCS #11 Modules"**: Settings → Privacy & Security → Certificates → Manage security devices → Load; select the module.
- **"Provisioning PKCS #11 modules"**: Requires installed modules and matching native manifests; cannot be bundled with the extension.
- **"Functions"**: `getModuleSlots()`, `installModule()`, `isModuleInstalled()`, `uninstallModule()`.
- **"Browser compatibility"**: Firefox 58+; see Native manifests for manifest format/location.
  - *Key terms/entities:* `pkcs11` permission, `pkcs11.installModule`, `pkcs11.getModuleSlots`, native manifest `type: "pkcs11"`

### [types](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/types)
**Overview:** Defines the shared `BrowserSetting` type used by `browserSettings` and `privacy`.

**Sections:**
- **"Types"**: `types.BrowserSetting` with `get()`, `set()`, `clear()`, and `onChange`.
- **"Browser compatibility"**: Based on Chromium's `chrome.types`.
  - *Key terms/entities:* `types.BrowserSetting`, `BrowserSetting.get`, `BrowserSetting.set`, `BrowserSetting.onChange`

---

## 6. Manifest Keys

Manifest-key entries summarize each `manifest.json` key page: type/values, Manifest V2 vs V3 availability, Firefox-specific caveats, and notable sub-properties.

### [manifest.json](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
**Overview:** Reference hub for the only mandatory extension file. Explains JSON-with-comments syntax, lists every manifest key with MV2/MV3/Firefox availability notes, records the mandatory-key rules, shows runtime access via `runtime.getManifest()`, and provides a consolidated example manifest.

**Sections:**
- **[List of manifest.json keys](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json#list_of_manifest.json_keys)**: All 42 keys with version/support annotations (e.g. `action` MV3+, `browser_action` MV2-only, `host_permissions` MV3+, Firefox-only `protocol_handlers`, unsupported-in-Firefox `externally_connectable`/`storage`).
- **[Notes about manifest.json keys](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json#notes_about_manifest.json_keys)**: Only `manifest_version`, `version`, and `name` are mandatory; `default_locale` must exist iff `_locales` exists; `browser_specific_settings` is unsupported in Chrome.
- **[Accessing manifest.json keys at runtime](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json#accessing_manifest.json_keys_at_runtime)**: `browser.runtime.getManifest().version` and similar reads.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json#example)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json#browser_compatibility)**, **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json#see_also)**: Syntax sample (not copy-paste-ready); per-key compatibility tables; `permissions` API.
  - *Key terms/entities:* `manifest.json`, `manifest_version`, `version`, `name`, `default_locale`, `browser_specific_settings`, `runtime.getManifest()`, `permissions`

### [manifest_version](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/manifest_version)
**Overview:** Mandatory numeric key declaring the manifest format version used by the extension (`"manifest_version": 3`). Controls MV2 vs MV3 semantics across every other key.

**Sections:**
- **"Example"** *(anchor unverified)*: `"manifest_version": 3`; must be present in every extension.
- **"Browser compatibility"**: Firefox supports MV2 and MV3; Chrome uses MV3 for new extensions.
  - *Key terms/entities:* `manifest_version`, Mandatory, `2`, `3`

### [name](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/name)
**Overview:** Mandatory string naming the extension in browser UI and add-on stores. Keep it short: AMO and Edge accept up to 45 characters, Chrome Web Store 75; self-hosted extensions are unrestricted. Localizable with `__MSG_...__`.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/name#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/name#browser_compatibility)**: `"name": "My Extension"`.
  - *Key terms/entities:* `name`, Mandatory, `__MSG_name__`, character limits

### [version](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version)
**Overview:** Mandatory version string for the extension: 1–4 dot-separated numbers (`1.2.3.4`), no leading zeros. AMO allows up to 9 digits per part; Chrome Web Store requires each part 0–65535 and forbids all-zero versions. Versions compare left-to-right with missing parts as 0; read with `runtime.getManifest().version` or `runtime.getVersion()`.

**Sections:**
- **[Version format](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version#version_format)**: Format limits, AMO regex and Firefox 108 warning, Chrome store limits, `version_name` for display strings.
  - **[Comparing versions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version#comparing_versions)**: Left-to-right numeric comparison; `1.10` > `1.9`.
- **[Legacy version formats](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version#legacy_version_formats)**, **[Access the version number in code](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version#access_the_version_number_in_code)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version#browser_compatibility)**, **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version#see_also)**: `runtime.getVersion()`, `version_name`.
  - *Key terms/entities:* `version`, `version_name`, `runtime.getManifest`, `runtime.getVersion`

### [version_name](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version_name)
**Overview:** Optional display-only version string (e.g. `"0.1 beta"`), MV2+. Update logic uses `version`; the UI shows `version_name` when present, otherwise `version`.

**Sections:**
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version_name#browser_compatibility)** and **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version_name#see_also)**: `version` key.
  - *Key terms/entities:* `version_name`, `version`, display version

### [description](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/description)
**Overview:** Optional short description shown in browser UI; Chromium limits it to 132 characters (other browsers may differ). Localizable.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/description#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/description#browser_compatibility)**: `"description": "..."`.
  - *Key terms/entities:* `description`, 132-character Chromium limit, `__MSG_description__`

### [author](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/author)
**Overview:** Optional author name for display, MV2+, localizable. In Firefox, a `developer` object with `name` overrides it (the preferred approach); Chrome and the Chrome Web Store ignored it as of May 2025.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/author#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/author#browser_compatibility)**: `"author": "Walt Whitman"`.
  - *Key terms/entities:* `author`, `developer.name`, localization

### [developer](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/developer)
**Overview:** Optional object with developer `name` and `url` for browser UI, MV2+. Its properties override `author` and `homepage_url`; only one developer can be listed; localizable.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/developer#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/developer#browser_compatibility)**: `{ "name": "...", "url": "..." }`.
  - *Key terms/entities:* `developer.name`, `developer.url`, `author`, `homepage_url`

### [homepage_url](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/homepage_url)
**Overview:** Optional URL for the extension's home page, MV2+, localizable. Firefox prefers `developer.url` when both exist; Opera uses `homepage_url`; Chrome/Safari lack `developer`.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/homepage_url#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/homepage_url#browser_compatibility)**: `"homepage_url": "https://..."`.
  - *Key terms/entities:* `homepage_url`, `developer.url`

### [short_name](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/short_name)
**Overview:** Optional short display name, MV2+, used where `name` is too long; recommended ≤12 characters, with `name` (possibly truncated) as fallback. Localizable.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/short_name#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/short_name#browser_compatibility)**: `"short_name": "..."`.
  - *Key terms/entities:* `short_name`, `name`, 12-character recommendation

### [icons](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons)
**Overview:** Optional size-to-path map for extension icons (add-ons manager and other UI), MV2+. Supply at least 32×32; add double-size variants for high-DPI. Firefox picks the best size and supports SVG (requires `viewBox`, an entry per size, `xmlns`, plain-SVG output, and optional `prefers-color-scheme` theming; Chromium ignores that media query).

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons#example)**, **[SVG](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons#svg)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons#browser_compatibility)**: `{ "32": "icon.png", "64": "icon@2x.png" }`; themed-icons example.
  - *Key terms/entities:* `icons`, `32`, `64`, SVG `viewBox`, `prefers-color-scheme`, `about:addons`

### [default_locale](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/default_locale)
**Overview:** Conditional string: required when `_locales` exists, forbidden otherwise. Names the default locale subdirectory used by the i18n system.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/default_locale#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/default_locale#browser_compatibility)**: `"default_locale": "en"`; see Internationalization.
  - *Key terms/entities:* `default_locale`, `_locales`, `messages.json`

### [browser_specific_settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)
**Overview:** Host-specific configuration. Firefox: `gecko` (`id`, `data_collection_permissions`, `strict_min_version`, `strict_max_version`, `update_url`) and `gecko_android`; Safari: `safari` version range. MV3 signing requires a `gecko.id` (email-style ≤80 chars or GUID); new AMO submissions from 2025-11-03 must declare `data_collection_permissions` (`required` must include `none` or data types; optional list). Chrome ignores the key.

**Sections:**
- **[Description](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#description)**:
  - **[Firefox (Gecko) properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#firefox_gecko_properties)**: `data_collection_permissions.required` / `.optional`, `id`, `strict_min_version` (minimum updatable version 115 ESR / 128), `strict_max_version`, `update_url` (HTTPS update manifest), plus `gecko_android.strict_min/max_version` (`{}` enables Android).
  - **[Extension ID format](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#extension_id_format)**: `name@example.org`-style string or GUID.
  - **[Safari properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#safari_properties)**: `strict_min_version`, `strict_max_version`.
  - **[Chrome properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#chrome_properties)**: ignored by Chrome.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#examples)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#browser_compatibility)**: full `gecko`/`gecko_android`/`safari` sample.
  - *Key terms/entities:* `gecko.id`, `data_collection_permissions`, `strict_min_version`, `strict_max_version`, `update_url`, `gecko_android`, `browser_specific_settings.safari`

### [incognito](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/incognito)
**Overview:** Optional string controlling private-window behavior (MV2+): `"spanning"` (default; sees private and normal with `incognito` flags), `"split"` (separate extension instances; unsupported in Firefox, which installs as `not_allowed`), or `"not_allowed"`. User consent still governs access (`extension.isAllowedIncognitoAccess`); avoid linking private and normal sessions (`credentials: "omit"`, `cache: "no-cache"` in background fetches).

**Sections:**
- **[Privacy considerations](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/incognito#privacy_considerations)**, **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/incognito#examples)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/incognito#browser_compatibility)**: values and sample manifests.
  - *Key terms/entities:* `incognito`, `spanning`, `split`, `not_allowed`, `extension.isAllowedIncognitoAccess`, `Window.incognito`, `Tab.incognito`

### [background](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)
**Overview:** Declares the extension's background context, MV2+. Use one of `scripts` (array, shared `window`, load order), `page` (HTML), or `service_worker`; `persistent` defaults true in MV2 and false in MV3 (true is an error in MV3); `type` selects `"classic"` or `"module"` ES modules; `preferred_environment` chooses `document` vs `service_worker` on capable browsers. Chrome supports only `service_worker` in MV3, Firefox supports `scripts`/`page` but not service workers, Safari supports both. For cross-browser MV3, specify both `scripts` and `service_worker`.

**Sections:**
- **[Browser support](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background#browser_support)**: Per-browser handling, including Firefox 121+ starting the background page even when `service_worker` is present.
  - **[Cross-browser Manifest V3 background scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background#cross-browser_manifest_v3_background_scripts)**: `"scripts": ["background.js"], "service_worker": "background.js"`; Chrome runs the worker, Firefox/Safari run the event page; `script-on-click` example.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background#examples)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background#browser_compatibility)**: scripts vs custom background page samples.
  - *Key terms/entities:* `background.scripts`, `background.page`, `background.service_worker`, `persistent`, `type: "module"`, `preferred_environment`, event page

### [content_scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts)
**Overview:** Declarative content-script registration, MV2+. Array of objects, each requiring `matches` and optionally `js`/`css`, plus targeting controls: `all_frames`, `match_about_blank`, `match_origin_as_fallback`, `run_at` (`document_start`/`document_end`/`document_idle`), `world` (`ISOLATED`/`MAIN`), `css_origin`, `include_globs`, `exclude_globs`, `include/exclude_matches`.

**Sections:**
- **[Load order](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts#load_order)**: Run-at stages first, then array order; CSS before JS within an object; array order preserved for each stage.
- **[Matching URL patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts#matching_url_patterns)**: URL must match `matches`, match `include_globs`, and not match `exclude_matches`/`exclude_globs`; **[globs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts#globs)** support `*` (any characters) and `?` (one character).
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts#example)**, **[Specifications](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts#specifications)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts#browser_compatibility)**: borderify injection; W3C Web Extensions spec.
  - *Key terms/entities:* `matches`, `js`, `css`, `run_at`, `all_frames`, `match_about_blank`, `match_origin_as_fallback`, `world`, `css_origin`, `exclude_matches`, `exclude_globs`

### [user_scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/user_scripts)
**Overview:** MV2-only object declaring the legacy user-script API script (`api_script`) that exports custom methods to sandboxed user scripts. Required for the legacy `userScripts` API even as `{}`; MV3 uses the `userScripts` API without this key.

**Sections:**
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/user_scripts#browser_compatibility)** and **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/user_scripts#see_also)**: API script runs in content processes with content-script APIs and exports via `userScripts.onBeforeScript`; `scriptMetadata` via `script.metadata`; legacy `userScripts` and `contentScripts`.
  - *Key terms/entities:* `user_scripts`, `api_script`, `userScripts.onBeforeScript`, `scriptMetadata`, Manifest V2

### [sandbox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sandbox)
**Overview:** Designates extension pages as sandboxed (opaque origin): no WebExtension APIs, no same-origin access to the extension, communication via `postMessage()`, and a separately configurable CSP that may allow `eval()`. MV2+; requires `pages`; CSP is MV2 `sandbox.content_security_policy` or MV3 `content_security_policy.sandbox`, must include `sandbox` and must not include `allow-same-origin`.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sandbox#syntax)**: `pages` (required array), `content_security_policy` (MV2 only).
- **[Content security policy for sandboxed pages](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sandbox#content_security_policy_for_sandboxed_pages)**: Default `sandbox allow-scripts; script-src 'self';`; add `'unsafe-eval'` only in the sandbox policy.
- **[Best practices](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sandbox#best_practices)**: Validate `postMessage` sender/shape, compare `event.source`, use `"*"` target for opaque sandboxes, don't run untrusted code, prefer `'wasm-unsafe-eval'` over sandboxing for Wasm.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sandbox#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sandbox#browser_compatibility)**: Sandbox calculator using `iframe`, `postMessage`, and `eval`.
  - *Key terms/entities:* `sandbox.pages`, `content_security_policy.sandbox`, `allow-same-origin`, `Window.postMessage`, opaque origin

### [action (manifest key)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/action)
**Overview:** MV3+ toolbar button declaration, replacing `browser_action`. Optional properties: `default_icon` (string or size map), `default_title`, `default_popup` (HTML; localizable), `theme_icons` (`dark`/`light`/`size`), `default_area` (Firefox: `navbar`, `menupanel`, `tabstrip`, `personaltoolbar`; default `menupanel`), and `browser_style` (do not enable; removed in Firefox 118).

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/action#syntax)**: All properties optional; click behavior depends on `default_popup`.
- **[Choosing icon sizes](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/action#choosing_icon_sizes)**: Use SVG or supply 16/32/64 PNGs; Firefox scales to 16×devicePixelRatio in the toolbar and 32×devicePixelRatio in the menu panel, picking the smallest larger icon or the largest available.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/action#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/action#browser_compatibility)**: icon-only and icon+title+popup samples; runtime API is `action`.
  - *Key terms/entities:* `action.default_icon`, `action.default_popup`, `action.default_title`, `action.theme_icons`, `action.default_area`, `browser_style`, `action.onClicked`

### [browser_action](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action)
**Overview:** MV2 toolbar button declaration, replaced by `action` in MV3. Same optional fields: `default_icon` (string or size map), `default_title`, `default_popup`, `theme_icons`, `default_area` (Firefox), `browser_style` (avoid true). Runtime API is `browserAction`.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action#syntax)**: All optional; popup suppresses click events.
- **[Choosing icon sizes](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action#choosing_icon_sizes)**: SVG or 16/32/64 PNGs; Firefox scaling rules.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action#example)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action#browser_compatibility)**, **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action#see_also)**: icon-only and popup samples; `page_action`, `sidebar_action`, Browser styles.
  - *Key terms/entities:* `browser_action.default_icon`, `browser_action.default_popup`, `browser_action.theme_icons`, `browserAction.onClicked`, `browser_style`

### [page_action](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/page_action)
**Overview:** MV2+ address-bar button declaration. Hidden by default unless `show_matches`/`hide_matches`; supports `default_icon` (19/38 recommended, string/SVG with `prefers-color-scheme`), `default_title`, `default_popup`, `browser_style` (avoid true), and deprecated `pinned` (removed Firefox 89). Runtime API is `pageAction`.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/page_action#syntax)**: Match-pattern-based show/hide defaults; `hide_matches` must not include `<all_urls>`.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/page_action#example)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/page_action#browser_compatibility)**, **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/page_action#see_also)**: icon-only and popup samples; `browser_action`, `sidebar_action`, Browser styles.
  - *Key terms/entities:* `page_action.show_matches`, `page_action.hide_matches`, `page_action.default_icon`, `page_action.default_popup`, `pageAction.onClicked`

### [sidebar_action](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action)
**Overview:** MV2+ sidebar declaration. `default_panel` is mandatory; optional `default_icon` (string/size map), `default_title`, `open_at_install` (default true), and `browser_style` (avoid true). Runtime API is `sidebarAction`.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action#syntax)**: Panel HTML gets full WebExtension APIs; title falls back to extension name; sidebar opens on install by default.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action#example)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action#browser_compatibility)**, **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action#see_also)**: `annotate-page`; `browser_action`, `page_action`, Browser styles.
  - *Key terms/entities:* `sidebar_action.default_panel`, `default_icon`, `default_title`, `open_at_install`, `sidebarAction`

### [options_page](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_page)
**Overview:** Optional string (MV2+) pointing to an options page opened in a new tab. Firefox opens it from the extension icon; `runtime.openOptionsPage()` also opens it. If `options_ui` is present, `options_page` is ignored.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_page#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_page#browser_compatibility)**: `"options_page": "options/options.html"`; compare `options_ui.open_in_tab`.
  - *Key terms/entities:* `options_page`, `options_ui`, `open_in_tab`, `runtime.openOptionsPage`

### [options_ui](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_ui)
**Overview:** MV2+ options page declaration. `page` is mandatory; `open_in_tab` defaults `false` (embedded in Add-ons Manager), `true` opens a tab; `browser_style` is deprecated. Scripts get full permitted APIs; share state via `runtime.getBackgroundPage()`, `extension.getViews()`, or messaging; persist with `storage.sync`/`storage.local` and `storage.onChanged`.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_ui#syntax)**: `page`, `open_in_tab`, `browser_style`.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_ui#example)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_ui#browser_compatibility)**, **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/options_ui#see_also)**: `options_page`, Browser styles, Options pages guide.
  - *Key terms/entities:* `options_ui.page`, `open_in_tab`, `storage.sync`, `storage.local`, `storage.onChanged`, `runtime.openOptionsPage`

### [devtools_page](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/devtools_page)
**Overview:** Optional string (MV2+) pointing to a bundled HTML devtools page, enabling the `devtools` APIs. Triggers an install-time devtools warning; list the `devtools` permission in `optional_permissions` to make it optional.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/devtools_page#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/devtools_page#browser_compatibility)**: `"devtools_page": "devtools/my-page.html"`; see Extending the developer tools.
  - *Key terms/entities:* `devtools_page`, `devtools` permission, `optional_permissions`

### [commands (manifest key)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands)
**Overview:** MV2+ keyboard shortcut definitions: each named command has optional `suggested_key` (per-platform `default`/`mac`/`linux`/`windows`/`chromeos`/`android`/`ios`) and `description`. Special shortcuts: `_execute_browser_action` (MV2), `_execute_action` (MV3), `_execute_page_action` (MV2; MV3 Firefox-only), `_execute_sidebar_action` (Firefox-only). Supports key combos and media keys; reserved browser shortcuts cannot be overridden. Runtime API: `commands`.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#syntax)**: Command map; empty object allows user-assigned shortcuts.
- **[Special shortcuts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#special_shortcuts)**: Four built-in actions and their manifest-version/browser support; shortcuts carry over on MV2→MV3 (Chrome 111, Firefox 127).
- **[Shortcut values](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#shortcut_values)**: Modifier + optional second modifier + key; `Ctrl` means Command on macOS (`MacCtrl` for literal Ctrl); letters/numbers/F1–F12/navigation keys; Firefox 135+ user-assigned F13–F19 via `commands.update`.
  - **[Media keys](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#media_keys)**: `MediaNextTrack`, `MediaPlayPause`, `MediaPrevTrack`, `MediaStop`.
- **[Updating shortcuts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#updating_shortcuts)**: Firefox `commands.update()`/`openShortcutSettings()`; Chrome `chrome://extensions/shortcuts`; Safari 26 settings.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#browser_compatibility)**: single and platform-specific samples.
  - *Key terms/entities:* `commands.suggested_key`, `_execute_action`, `_execute_browser_action`, `_execute_page_action`, `_execute_sidebar_action`, `commands.onCommand`, `commands.update`

### [omnibox (manifest key)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/omnibox)
**Overview:** Optional object (MV2+) defining an address-bar keyword. Typing `keyword` + space routes subsequent input to the `omnibox` API; if multiple extensions register the same keyword, the last installed wins.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/omnibox#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/omnibox#browser_compatibility)**: `"omnibox": { "keyword": "mdn" }`.
  - *Key terms/entities:* `omnibox.keyword`, `omnibox.onInputChanged`, `omnibox.onInputEntered`

### [theme (manifest key)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme)
**Overview:** Defines a static Firefox theme (MV2+): `images` (`theme_frame`, `additional_backgrounds`; PNG/JPEG/APNG/SVG/GIF, CSS gradients from Firefox 153), mandatory `colors` (frame, toolbar, tab, popup, sidebar, NTP, field and text roles), and `properties` (`additional_backgrounds_alignment`/`_tiling`/`_size`, `backgrounds_area`, `color_scheme`, `content_color_scheme`). Paired with `dark_theme` for dark mode. Themes must be signed.

**Sections:**
- **[Image formats](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#image_formats)**, **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#syntax)**: JPEG, PNG, APNG, SVG (animated supported), GIF (not animated); `images` optional since Firefox 60, `colors` mandatory, `properties` optional.
  - **[images](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#images)**, **[CSS gradient syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#css_gradient_syntax)**, **[colors](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#colors)**, **[properties](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#properties)**, **[Aliases](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#aliases)**: Color roles such as `frame`, `tab_selected`, `toolbar`, `toolbar_field*`, `popup*`, `sidebar*`, `ntp_*`; `bookmark_text` aliases `toolbar_text`.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#examples)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#browser_compatibility)**: Basic, multi-background, tiled, full-color, and gradient examples.
  - **[Chrome compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#chrome_compatibility)**: Chrome requires RGB arrays and uses `bookmark_text`; `theme_frame` anchors top-left and tiles.
  - *Key terms/entities:* `theme.images.theme_frame`, `additional_backgrounds`, `theme.colors.frame`, `toolbar_field`, `backgrounds_area`, `color_scheme`, `dark_theme`

### [dark_theme](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/dark_theme)
**Overview:** Optional static theme used when Firefox runs the dark color scheme; same `images`/`colors`/`properties` schema as `theme`. When present, `theme` supplies the light-scheme variant. MV2+.

**Sections:**
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/dark_theme#browser_compatibility)**: See the `theme` key for full syntax.
  - *Key terms/entities:* `dark_theme`, `theme`, `color_scheme`

### [theme_experiment](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme_experiment)
**Overview:** Firefox-only experimental theme extension: maps internal CSS variables/selectors to new `theme` properties via an optional stylesheet plus `colors`/`images`/`properties`. Requires Firefox Developer Edition/Nightly and `extensions.experiments.enabled` (legacy pref `extensions.legacy.enabled` before Firefox 73); subject to change.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme_experiment#syntax)**: `stylesheet`, `images`, `colors`, `properties` mappings.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme_experiment#examples)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme_experiment#browser_compatibility)**: `#reload-button { fill: var(--reload-button-color); }` mapped to `colors.reload_button`, then used in `theme.colors` or `browser.theme.update()`.
  - *Key terms/entities:* `theme_experiment.stylesheet`, `theme_experiment.colors`, `theme.colors.reload_button`, `extensions.experiments.enabled`

### [permissions (manifest key)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions)
**Overview:** MV2+ array of install-time permissions: host permissions (MV2; MV3 uses `host_permissions`), API permission keywords (e.g. `tabs`, `storage`, `webRequest`, `scripting`, `contextMenus`, `downloads`), and `activeTab`. Prompts users at install; request only what is needed.

**Sections:**
- **[Host permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions#host_permissions)**: Match patterns granting cross-origin fetch/XHR, tab URL/title/favicon, programmatic content-script/CSS injection, `webRequest` events, cookie access (with `cookies`), tracking-protection bypass, and WebAuthn credentials.
- **[API permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions#api_permissions)**: Full keyword list including `activeTab`, `alarms`, `bookmarks`, `browserSettings`, `browsingData`, `captivePortal`, `clipboardRead`/`clipboardWrite`, `contextMenus`, `contextualIdentities`, `cookies`, `declarativeNetRequest*`, `devtools`, `dns`, `downloads`, `find`, `history`, `identity`, `idle`, `management`, `menus`, `nativeMessaging`, `notifications`, `pkcs11`, `privacy`, `proxy`, `scripting`, `search`, `sessions`, `storage`, `tabGroups`, `tabHide`, `tabs`, `theme`, `topSites`, `unlimitedStorage`, `userScripts`, `webNavigation`, `webRequest*`; special cases `tabs`, `webRequestBlocking`, `downloads.open`, `tabHide`.
- **[activeTab permission](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions#activetab_permission)**, **[Clipboard access](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions#clipboard_access)**, **[Unlimited storage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions#unlimited_storage)**: `activeTab` user-action grants; `clipboardRead`/`clipboardWrite`; `unlimitedStorage` lifts `storage.local` quota and enables persistent IndexedDB.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions#examples)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions#browser_compatibility)**: MV2 host + API examples.
  - *Key terms/entities:* `permissions`, `host_permissions`, `activeTab`, `webRequestBlocking`, `unlimitedStorage`, `clipboardRead`, `clipboardWrite`

### [host_permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions)
**Overview:** MV3+ array of install-time host match patterns for APIs that read/modify host data (`cookies`, `webRequest`, `tabs`, script injection). Users can grant/revoke host access ad hoc; check with `permissions.contains()` and request with `permissions.request()`. Install prompts differ by browser (Firefox 127+ shows host permissions; Safari does not).

**Sections:**
- **[Requested permissions and user prompts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions#requested_permissions_and_user_prompts)**, **[Format](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions#format)**: Match-pattern privileges (fetch/XHR, tab metadata, injection, webRequest events, cookies, tracking-protection bypass, WebAuthn); MV3 content-script fetch restrictions.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions#example)**, **[Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions#example_extensions)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions#browser_compatibility)**: `"*://developer.mozilla.org/*"`; `dnr-redirect-url`.
  - *Key terms/entities:* `host_permissions`, `permissions.contains`, `permissions.request`, match patterns, `dnr-redirect-url`

### [optional_permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_permissions)
**Overview:** MV2+ array of permissions requestable at runtime via `permissions.request()`. Supports host and API permissions; MV3 should use `optional_host_permissions` for hosts (Firefox 128+). Some permissions are granted silently (`activeTab`, `cookies`, `idle`, `publicSuffix`, `tabGroups`, `webRequest`, `webRequestBlocking`, `webRequestFilterResponse*`); `userScripts` is optional-only in Firefox. Users manage grants in the Add-ons Manager; observe with `permissions.getAll`/`onAdded`/`onRemoved`.

**Sections:**
- **[Host permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_permissions#host_permissions)**, **[API permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_permissions#api_permissions)**: Full optional API list.
  - **[Optional-only permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_permissions#optional-only_permissions)**: `userScripts` must be requested individually.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_permissions#examples)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_permissions#browser_compatibility)**: Host/API request examples.
  - *Key terms/entities:* `optional_permissions`, `permissions.request`, `permissions.getAll`, `permissions.onAdded`, `permissions.onRemoved`, `optional_host_permissions`, `userScripts`

### [optional_host_permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions)
**Overview:** MV3+ array of host match patterns that can be requested at runtime with the `permissions` API. Users can grant/revoke these in the Add-ons Manager; inspect with `permissions.getAll()` and observe `onAdded`/`onRemoved`.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions#browser_compatibility)**: `"*://developer.mozilla.org/*"`; see `host_permissions` for host syntax.
  - *Key terms/entities:* `optional_host_permissions`, `permissions.request`, `permissions.getAll`, `permissions.onAdded`, `permissions.onRemoved`

### [content_security_policy](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy)
**Overview:** Overrides the default extension CSP. MV2 uses a policy string; MV3 uses an object with `extension_pages` and `sandbox` policies. MV3 script sources are limited to `'none'`, `'self'`, `'wasm-unsafe-eval'` (localhost allowed for unpacked/temporary development); MV2 additionally permits secure remote HTTPS sources, hashes, and `'unsafe-eval'` under strict rules. `object-src` is required by Chrome and optional from Firefox 106.

**Sections:**
- **[object-src directive](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy#object-src_directive)**: Chrome requires it; Firefox optional since 106; Safari none.
- **[Manifest V2 syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy#manifest_v2_syntax)** / **[Manifest V3 syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy#manifest_v3_syntax)**: MV3 `extension_pages` and `sandbox` properties.
- **[Examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy#examples)**: [Valid examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy#valid_examples) (self-only, remote MV2, localhost MV3, `'wasm-unsafe-eval'`) and [Invalid examples](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy#invalid_examples) (missing self/object-src, non-HTTPS, public-suffix wildcards, `'unsafe-inline'`).
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy#browser_compatibility)**: Per-browser CSP support.
  - *Key terms/entities:* `content_security_policy.extension_pages`, `content_security_policy.sandbox`, `script-src`, `object-src`, `'wasm-unsafe-eval'`, `'unsafe-eval'`

### [web_accessible_resources](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources)
**Overview:** Exposes packaged resources (images/HTML/CSS/JS) to web pages and other extensions. MV2: array of paths; MV3: array of objects with `resources`, `matches`, `extension_ids`, and optional `use_dynamic_url`. Resources load via `moz-extension://`/`chrome-extension://`/`safari-web-extension://`; resolve with `runtime.getURL()`. Exposed pages must treat input as untrusted; web-accessible resources bypass CORS/CSP, so avoid exposing scripts when possible.

**Sections:**
- **[Description](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#description)**, **[Manifest V2 syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#manifest_v2_syntax)**, **[Manifest V3 syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#manifest_v3_syntax)**: MV3 object fields `resources`, `matches` (Chrome requires `/*` path), `extension_ids`, `use_dynamic_url`.
- **[Using web_accessible_resources](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#using_web_accessible_resources)**: Browser URL schemes, random Firefox UUIDs, `runtime.getURL()`, `__MSG_@@extension_id__` in CSS.
- **[Wildcards](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#wildcards)** and **[Security](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#security)**: `images/*.png`; untrusted input, CORS/CSP bypass, avoid moz-extension URLs and exposed scripts.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#example)**, **[Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#example_extensions)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources#browser_compatibility)**: MV2/MV3 examples; `beastify`, `dnr-redirect-url`.
  - *Key terms/entities:* `web_accessible_resources.resources`, `matches`, `extension_ids`, `use_dynamic_url`, `runtime.getURL`, `moz-extension://`

### [externally_connectable](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable)
**Overview:** Controls which extensions (`ids`) and web pages (`matches`) may message this extension via `runtime.connect()`/`runtime.sendMessage()`. Omitted means all extensions can connect but no web pages; web-page messaging is unsupported in Firefox (bug 1319168), while Chrome/Safari expose `runtime` to matching pages. If you add `matches`, also add `ids` to retain extension messaging.

**Sections:**
- **[ids attribute](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable#ids_attribute)** / **[matches attribute](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable#matches_attribute)**: `"*"` for all extensions; web-page URL patterns.
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable#browser_compatibility)**: Chrome/Safari page messaging; Firefox restrictions.
  - *Key terms/entities:* `externally_connectable.ids`, `externally_connectable.matches`, `runtime.connect`, `runtime.sendMessage`, `runtime.onMessageExternal`

### [declarative_net_request](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/declarative_net_request)
**Overview:** Declares static DNR rulesets (MV2+): `rule_resources` entries with `id` (non-empty; leading `_` reserved), `enabled` default state, and `path` to rules JSON. Limits follow the `declarativeNetRequest` static ruleset caps; runtime toggling uses `updateEnabledRulesets`. Since Firefox 128, unrecognized rule properties are ignored instead of invalidating the rule.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/declarative_net_request#syntax)**: Ruleset object fields.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/declarative_net_request#example)**, **[Example extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/declarative_net_request#example_extensions)**, **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/declarative_net_request#browser_compatibility)**: Enabled/disabled rulesets; `dnr-block-only`, `dnr-redirect-url`.
  - *Key terms/entities:* `declarative_net_request.rule_resources`, `id`, `enabled`, `path`, `updateEnabledRulesets`

### [protocol_handlers](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/protocol_handlers)
**Overview:** Firefox-only MV2+ array registering web-based protocol handlers. Each entry requires `protocol` (allow-listed scheme or `web+`/`ext+` custom name), `name` (user-facing), and `uriTemplate` containing `%s`. Handlers can point to web URLs or extension pages; they are inactive in private browsing unless the extension is allowed there.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/protocol_handlers#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/protocol_handlers#browser_compatibility)**: `magnet`, `ext+foo`, and extension-page handlers.
  - *Key terms/entities:* `protocol_handlers.protocol`, `name`, `uriTemplate`, `%s`, `ext+`, `extension.isAllowedIncognitoAccess`

### [chrome_settings_overrides](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_settings_overrides)
**Overview:** MV2+ object overriding the browser homepage (`homepage`, localizable; last installed wins) and adding a search provider (`search_provider`): `name`, `search_url` (HTTPS, `{searchTerms}`), `keyword`, `is_default` (opt-in prompt on first install in Firefox), `alternate_urls`, `encoding`, `favicon_url` (MV2 absolute URL; MV3 packaged path), image/instant/suggest URLs, GET/POST params, `prepopulated_id`.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_settings_overrides#syntax)**: Full search-provider property list.
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_settings_overrides#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_settings_overrides#browser_compatibility)**: Discogs search provider sample.
  - *Key terms/entities:* `chrome_settings_overrides.homepage`, `search_provider`, `search_url`, `{searchTerms}`, `is_default`, `favicon_url`

### [chrome_url_overrides](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_url_overrides)
**Overview:** MV2+ object replacing built-in pages: `newtab`, `bookmarks`, `history`. Each value is a bundled HTML path (no remote URLs); the page can load CSS/JS and use privileged `browser.*` APIs. Add a `<title>` to avoid a `moz-extension://` tab title. Last installed/enabled extension wins; homepage overrides belong in `chrome_settings_overrides`.

**Sections:**
- **[Syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_url_overrides#syntax)** and **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_url_overrides#example)**: `newtab`/`bookmarks`/`history`; `"newtab": "my-new-tab.html"`.
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_url_overrides#browser_compatibility)**: Per-browser support.
  - *Key terms/entities:* `chrome_url_overrides.newtab`, `bookmarks`, `history`, `chrome_settings_overrides.homepage`

### [dictionaries](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/dictionaries)
**Overview:** MV2+ object mapping a locale code to a bundled Hunspell `.dic` dictionary (the matching `.aff` sits alongside); requires an extension ID via `browser_specific_settings`. Firefox spellcheck integration.

**Sections:**
- **[Example](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/dictionaries#example)** and **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/dictionaries#browser_compatibility)**: `"dictionaries": { "en-US": "dictionaries/en-US.dic" }`.
  - *Key terms/entities:* `dictionaries`, `.dic`, `.aff`, `browser_specific_settings.gecko.id`

### [storage (manifest key)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/storage)
**Overview:** MV2+ object declaring `managed_schema`, a path to a JSON schema for enterprise-managed storage read through `storage.managed`. Chrome enforces the schema; Firefox does not define a managed-storage schema (see `storage.managed`). This is unrelated to the `storage` API's `"storage"` permission.

**Sections:**
- **[Browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/storage#browser_compatibility)**: Derived from Chrome's manifest-for-storage-areas docs.
  - *Key terms/entities:* `storage.managed_schema`, `storage.managed`, enterprise policies

---

## 7. Compatibility & Cross-browser Development

### [Browser support for JavaScript APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs)
**Overview:** Master compatibility page with one section per WebExtensions API module, each containing browser-support tables for that module's methods, events, and types. Tables are generated from `mdn/browser-compat-data` and rendered client-side, so use this page to confirm Firefox/Chrome/Safari/Edge support before relying on an API or member.

**Sections:**
- **Per-API compatibility sections** *(H2 per module; headings are self-linked anchors, e.g. `#action`, `#alarms`, `#bookmarks`, `#browserAction`, `#browserSettings`, `#browsingData`, `#captivePortal`, `#clipboard`, `#commands`, `#contentScripts`, `#contextualIdentities`, `#cookies`, `#declarativeNetRequest`, `#devtools`, `#dns`, `#dom`, `#downloads`, `#events`, `#extension`, `#extensionTypes`, `#find`, `#history`, `#i18n`, `#identity`, `#idle`, `#management`, `#menus`, `#notifications`, `#omnibox`, `#pageAction`, `#permissions`, `#pkcs11`, `#privacy`, `#proxy`, `#publicSuffix`, `#runtime`, `#scripting`, `#search`, `#sessions`, `#sidebarAction`, `#storage`, `#tabGroups`, `#tabs`, `#theme`, `#topSites`, `#types`, `#userScripts`, `#userScripts_legacy`, `#webNavigation`, `#webRequest`, `#windows`)*: Compatibility grids per member; asterisks denote caveats.
- **[See also](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs#see_also)**: Links to manifest-key compatibility on the `manifest.json` page.
  - *Key terms/entities:* `mdn/browser-compat-data`, BCD tables, manifest compatibility, per-API anchors

---

## 8. External References — Extension Workshop

These pages are outside MDN and are **not indexed** here; they are the canonical Firefox workflow, tooling, and publishing documentation.

- [Firefox workflow overview](https://extensionworkshop.com/documentation/develop/firefox-workflow-overview/) — develop → test → publish workflow.
- [Temporary installation in Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) — load/reload temporary add-ons (also via `about:debugging`).
- [Debugging](https://extensionworkshop.com/documentation/develop/debugging/) — Browser Toolbox, Add-on Debugger, popup debugging, console output.
- [Getting started with web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) — `web-ext run`, linting, packaging.
- [Request the right permissions](https://extensionworkshop.com/documentation/develop/request-the-right-permissions/) — permission design and runtime prompts.
- [Porting a Google Chrome extension](https://extensionworkshop.com/documentation/develop/porting-a-google-chrome-extension/) — Chrome→Firefox changes.
- [Differences between desktop and Android extensions](https://extensionworkshop.com/documentation/develop/differences-between-desktop-and-android-extensions/).
- [Publishing and distribution overview](https://extensionworkshop.com/documentation/publish/) — AMO listing, signing, distribution.
- [Signing and distribution overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).
- [Package your extension](https://extensionworkshop.com/documentation/publish/package-your-extension/).
- [Promoting your extension](https://extensionworkshop.com/documentation/publish/promoting-your-extension/).
- [Extension lifecycle best practices](https://extensionworkshop.com/documentation/manage/).
- [User experience best practices](https://extensionworkshop.com/documentation/develop/user-experience-best-practices/).
- [Build an accessible extension](https://extensionworkshop.com/documentation/develop/build-an-accessible-extension/).
- [Manifest V3 migration guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/).
- [Build a secure extension](https://extensionworkshop.com/documentation/develop/build-a-secure-extension/).
- [Browser extension development tools](https://extensionworkshop.com/documentation/develop/browser-extension-development-tools/).
- [Source code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/).
- [Firefox Add-on Distribution Agreement](https://extensionworkshop.com/documentation/publish/firefox-add-on-distribution-agreement/).
- [Add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/).
- [Recommended extensions](https://extensionworkshop.com/documentation/publish/recommended-extensions/).
- [Themes](https://extensionworkshop.com/documentation/themes/).
- [Testing localizations](https://extensionworkshop.com/documentation/develop/test-localizations/).
- [Chrome Manifest V3 migration guide](https://developer.chrome.com/docs/extensions/develop/migrate) — external, Chrome side.

---

## Unindexed / Pending Pages

The following in-scope MDN page was discovered but not fetched/indexed in this pass:

- `https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Use_the_web_authn_api` — WebAuthn guide linked from `permissions#host_permissions`.

Two additional how-to titles are visible in the docs sidebar — "Work with documentId" and "Use Web Authn API in web extensions" — but their exact URLs were not observed in fetched content, so they are not listed as URLs here. Resolve them via the live MDN sidebar before fetching.

Excluded by the confirmed scope decision:

- Individual API member/event/type subpages (~500+) under `/API/<module>/<member>`; fetch the module page for their exact URLs and signatures.
- Localized (non-`en-US`) documentation, blog posts, and marketing pages.
- Extension Workshop pages (linked in section 8 only).

## Indexing Checkpoint

- **Completed categories (140 pages):** 1 Getting Started (7 pages), 2 Core Concepts (13), 3 User Interface (12), 4 How-to Guides (13), 5 JavaScript APIs (51 modules), 6 Manifest Keys (43), 7 Compatibility (1).
- **Section 8:** external Extension Workshop links only; not summarized.
- **Anchors:** section anchors are included only where the heading was observed as a self-link or cross-link on MDN; all other section headings are quoted (or marked *anchor unverified*).
- **Not indexed:** 1 verified pending WebAuthn page plus 2 sidebar-only how-to titles whose URLs were not observed; API member subpages by design.
- **Next pass (optional):** fetch the pending WebAuthn page, resolve the two sidebar-only how-to titles, and insert them into section 4/7; expand selected API modules to member-level entries (tabs, storage, runtime, scripting, webRequest, declarativeNetRequest, menus) if deeper routing is needed.
