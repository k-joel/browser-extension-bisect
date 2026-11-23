# Chrome Extensions — LLM Documentation Index

- **Base URL:** https://developer.chrome.com/docs/extensions/
- **Scope / Version:** Manifest V3 documentation (English), Chrome 153 era, November 2026. Deprecated Manifest V2 docs are linked in Section 10 but not indexed.
- **Last Indexed:** 2026-11-23
- **How to use this document:** Scan the Table of Contents and page summaries to locate candidate pages, then fetch the full URL(s) before answering detailed technical questions. Append `.md.txt` (before any `#fragment`) to a docs URL to fetch a clean markdown version of the page. Section anchors are linked only when the exact fragment was observed in the source; headings in quotes or marked *anchor unverified* are verbatim and must be located after fetching. API entries list every method, event, type, and property name observed on the module page; fetch the module page for signatures and member-level anchors.

## High-Level System Overview

Chrome extensions are web applications (HTML/CSS/JavaScript) packaged with a mandatory `manifest.json` that declares metadata, permissions, a background service worker, content scripts, and UI surfaces. Manifest V3 replaces persistent background pages with an event-driven extension service worker; content scripts run in isolated worlds and communicate with the rest of the extension through message passing. Extensions reach the browser through the `chrome.*` APIs (also exposed as `browser.*` from Chrome 148), gated by manifest permissions and host permissions. This documentation tree is organized as Get started tutorials, Develop concepts and UI guides, task-focused How-to guides, security/privacy and MV2→MV3 migration guidance, and reference material for the manifest, permissions, and every API module.

---

## Table of Contents

- [1. Getting Started & Tutorials](#1-getting-started--tutorials)
-   [Chrome Extensions](#chrome-extensions) — *Landing hub for Chrome extension development.*
-   [Get started](#get-started) — *Onboarding hub for extension development: defines what extensions are and how they are built, introduces the cor…*
-   [Hello World extension](#hello-world-extension) — *First-extension tutorial.*
-   [Run scripts on every page](#run-scripts-on-every-page) — *Builds the reading-time extension: a static content script registered with "content\_scripts" that injects a read…*
-   [Inject scripts into the active tab](#inject-scripts-into-the-active-tab) — *Builds focus-mode: a service worker toggles a badge and injects/removes a CSS file on the active tab using the S…*
-   [Manage tabs](#manage-tabs) — *Builds tabs-manager: an action popup that queries matching tabs, focuses a tab/window on click, and groups tabs…*
-   [Handle events with service workers](#handle-events-with-service-workers) — *Builds quick-api-reference: an ES-module service worker that powers an omnibox keyword for jumping to API refere…*
-   [Debug extensions](#debug-extensions) — *Hands-on debugging tutorial using the Broken Color sample.*
- [2. Core Concepts](#2-core-concepts)
-   [Develop](#develop) — *Capability map for extension development.*
-   [The "activeTab" permission](#the-activetab-permission) — *Defines "activeTab": temporary host access to the active tab after an explicit user invocation, with no install-…*
-   [Transition to browser namespace](#transition-to-browser-namespace) — *From Chrome 148 every extension API is available as browser.\* as well as chrome.\*; both point at the same objects.*
-   [Content filtering](#content-filtering) — *Survey of content and network filtering approaches.*
-   [Content scripts](#content-scripts) — *Complete guide to scripts that run in the context of web pages.*
-   [Cross-origin isolation](#cross-origin-isolation) — *Shows how an extension opts into cross-origin isolation to use powerful APIs such as SharedArrayBuffer.*
-   [Declare permissions](#declare-permissions) — *Explains the four permission declarations: "permissions" (known API strings), "optional\_permissions" (runtime gr…*
-   [Extension update lifecycle](#extension-update-lifecycle) — *Describes how Chrome updates installed extensions: automatic checks at startup and every few hours, the idle req…*
-   [Match patterns](#match-patterns) — *Syntax reference for URL match patterns &lt;scheme&gt;://&lt;host&gt;:&lt;port&gt;/&lt;path&gt; used by content scripts, host permission…*
-   [Message passing](#message-passing) — *Complete messaging guide: one-time requests (runtime.sendMessage, tabs.sendMessage), long-lived ports (runtime.c…*
-   [Native messaging](#native-messaging) — *Exchanges messages between an extension and a native OS application through a registered native messaging host p…*
-   [Cross-origin network requests](#cross-origin-network-requests) — *Explains origin rules for extension network access: extension pages/service worker can cross origins with host p…*
-   [Permission warning guidelines](#permission-warning-guidelines) — *Explains which permissions trigger install-time warnings, which combinations suppress warnings, best practices f…*
-   [Real-time updates in Extensions](#real-time-updates-in-extensions) — *Compares server-to-extension real-time transport options: Web Push (standards-based, wakes the service worker),…*
-   [About extension service workers](#about-extension-service-workers) — *Section hub for the extension service worker, the extension's central event handler.*
-   [Extension service worker basics](#extension-service-worker-basics) — *Registration and module-loading rules for extension service workers: declare one file under background.service\_w…*
-   [Events in service workers](#events-in-service-workers) — *Which events an extension service worker can receive, and how to register them.*
-   [The extension service worker lifecycle](#the-extension-service-worker-lifecycle) — *Lifecycle reference for extension service workers: install/update event order, startup, the 30-second idle / 5-m…*
-   [Storage and cookies](#storage-and-cookies) — *Explains how web storage and cookies behave in extensions: persistence across browsing-data clears, quotas/evict…*
- [3. UI Components & Surfaces](#3-ui-components--surfaces)
-   [User interface components](#user-interface-components) — *Catalog of extension UI surfaces with links to implementation guides and samples: actions and icons, badges, com…*
-   [Make your extension accessible](#make-your-extension-accessible) — *Baseline accessibility guidance for extension UI: high-contrast text, captions, alt text, native HTML controls,…*
-   [Add a popup](#add-a-popup) — *Implements an action popup: registers action.default\_popup in the manifest, builds it as a normal HTML page with…*
-   [Configure extension icons](#configure-extension-icons) — *Declares extension icons in the manifest.*
-   [Build a context menu](#build-a-context-menu) — *Implements right-click context-menu items: add the "contextMenus" permission, create items from the service work…*
-   [Internationalize the interface](#internationalize-the-interface) — *Localizes extension UI with browser.i18n: create \_locales/&lt;locale&gt;/messages.json, reference strings as \_\_MSG\_key…*
-   [Notify users](#notify-users) — *Shows system-tray notifications from an extension: declare "notifications", then call notifications.create() wit…*
-   [Trigger actions from the omnibox](#trigger-actions-from-the-omnibox) — *Registers an omnibox keyword and handles user input.*
-   [Give users options](#give-users-options) — *Builds an extension options page: HTML/JS backed by storage.sync, declared either as a full page (options\_page)…*
-   [Override Chrome pages](#override-chrome-pages) — *Replaces one built-in Chrome page (Bookmark Manager, History, or New Tab) with a bundled HTML page via chrome\_ur…*
-   [Respond to commands](#respond-to-commands) — *Defines keyboard shortcuts in the "commands" manifest key and handles them in the service worker with commands.o…*
-   [What are themes?](#what-are-themes) — *Themes are special extensions that change the browser's appearance.*
-   [Create a side panel](#create-a-side-panel) — *Short entry point to the Side Panel API: extensions can display their own UI in Chrome's side panel, keep it ope…*
- [4. How-to Guides](#4-how-to-guides)
-   [How to](#how-to) — *Landing index for the task-focused How-to tree — short recipes for specific extension development jobs.*
-   [Extend DevTools](#extend-devtools) — *How to add a DevTools page so an extension can create DevTools panels and sidebar panes, inspect the inspected w…*
-   [Distribute your extension](#distribute-your-extension) — *Reference page for the only two officially supported extension distribution mechanisms — Chrome Web Store publis…*
-   [Self-host for Linux](#self-host-for-linux) — *Linux is the only platform where Chrome users can install extensions hosted outside the Chrome Web Store.*
-   [Use alternate installation methods](#use-alternate-installation-methods) — *Documents the two external install flows used when another installer or an administrator must provision an exten…*
-   [Push messaging with browser.gcm](#push-messaging-with-browsergcm) — *Walkthrough for pushing server messages to an extension with the legacy browser.gcm API, which is built on Fireb…*
-   [Use Google Analytics 4](#use-google-analytics-4) — *Tutorial for measuring extension usage with GA4 now that Manifest V3 forbids remotely hosted code: instead of gt…*
-   [Use OAuth 2.0 to authenticate users with Google](#use-oauth-20-to-authenticate-users-with-google) — *End-to-end OAuth 2.0 tutorial: extensions cannot use HTTPS redirects or cookies, so authorization goes through t…*
-   [Use Web Push in extensions](#use-web-push-in-extensions) — *Shows how to receive server push in an extension with the standard Push API: a push wakes a suspended service wo…*
-   [Use eval() in sandboxed iframes](#use-eval-in-sandboxed-iframes) — *Explains how to keep eval()-dependent libraries (templating engines using new Function(), for example) working u…*
-   [Build end-to-end tests](#build-end-to-end-tests) — *Overview of end-to-end testing for extensions — building and loading the package into a real browser, then drivi…*
-   [Test Chrome Extensions with Puppeteer](#test-chrome-extensions-with-puppeteer) — *Step-by-step Puppeteer plus Jest tutorial that launches Chrome with an unpacked extension loaded and asserts on…*
-   [Test service worker termination with Puppeteer](#test-service-worker-termination-with-puppeteer) — *Teaches how to make an extension resilient to service-worker termination by reproducing the termination inside a…*
-   [Write unit tests](#write-unit-tests) — *Short guide to unit-testing extension code in isolation, outside the browser, with Jest.*
-   [Support accessibility](#support-accessibility) — *Practical accessibility checklist for extension UI: keyboard-operable controls, screen-reader semantics for cust…*
-   [Use favicons](#use-favicons) — *Explains the Manifest V3 favicon API: icons are served from the extension's own \_favicon/ URL instead of reading…*
-   [Localize your extension](#localize-your-extension) — *Format reference for \_locales/&lt;locale&gt;/messages.json, the file that supplies every translated string.*
-   [Use the Notifications API](#use-the-notifications-api) — *Guide to rich notifications in the system tray via browser.notifications: the four templates, how priority and a…*
-   [Handle files on Chrome OS](#handle-files-on-chrome-os) — *Shows how a ChromeOS extension registers as a file handler so users can open supported file types from the Files…*
-   [Add geolocation to retrieve the user's location](#add-geolocation-to-retrieve-the-users-location) — *Explains how an MV3 extension gets user location with the ordinary navigator.geolocation API, and why extensions…*
-   [Register your extension for an origin trial](#register-your-extension-for-an-origin-trial) — *How to enroll an extension in a Chrome origin trial — a time-limited program granting early access to experiment…*
-   [Record audio and capture the screen](#record-audio-and-capture-the-screen) — *Compares ways to record audio and video from a tab, window, or screen with getDisplayMedia() or browser.tabCaptu…*
-   [Use WebHID in extensions](#use-webhid-in-extensions) — *Extension-specific notes for the WebHID API (human interface devices over the HID protocol), which needs no mani…*
-   [Use WebSockets in service workers](#use-websockets-in-service-workers) — *Tutorial for holding a WebSocket connection open from an MV3 extension service worker.*
-   [Use WebUSB in extensions](#use-webusb-in-extensions) — *Extension-specific notes for the WebUSB API, which exposes non-standard USB devices to the extension.*
-   [Googlebook OS](#googlebook-os) — *Compatibility guide for running the same WebExtensions platform on Googlebook OS — an Android-based stack paired…*
- [5. Security, Privacy & MV3 Migration](#5-security-privacy--mv3-migration)
-   [Stay secure](#stay-secure) — *Security checklist for extension authors: browser privileges make any extension a high-value attack target, so a…*
-   [Protect user privacy](#protect-user-privacy) — *Argues permissions must be minimal and explainable — users refuse extensions that over-ask — and that any extens…*
-   [Migrate to Manifest V3](#migrate-to-manifest-v3) — *Top-level migration guide for converting a Manifest V2 extension to Manifest V3, which is generally supported fr…*
-   [Update API calls](#update-api-calls) — *First of three code-migration pages: the MV3 changes unrelated to service workers or blocking web requests.*
-   [Replace blocking web request listeners](#replace-blocking-web-request-listeners) — *Second of three code-migration pages.*
-   [Migration checklist](#migration-checklist) — *Task checklist that splits the Manifest V2 → V3 migration into ordered workstreams, with every item linking stra…*
-   [Improving security in Manifest V3](#improving-security-in-manifest-v3) — *Third and last of the non-service-worker code-migration pages.*
-   [Known issues](#known-issues) — *Migration FAQ and status page.*
-   [Convert a V2 manifest to a V3 manifest](#convert-a-v2-manifest-to-a-v3-manifest) — *Manifest-only migration reference: the manifest.json edits that can be made independently of code changes, shown…*
-   [Manifest V2 deprecation timeline](#manifest-v2-deprecation-timeline) — *Chronological record of the Manifest V2 phase-out: every Chrome Web Store and browser milestone from January 202…*
-   [Publish your Manifest V3 extension](#publish-your-manifest-v3-extension) — *Release playbook for shipping a converted extension: beta-test it on the Chrome Web Store, roll the update out b…*
-   [Remotely hosted code](#remotely-hosted-code) — *Troubleshooting guide for Chrome Web Store "Blue Argon" rejections.*
-   [Migrate to a service worker](#migrate-to-a-service-worker) — *Converts an MV2 background or event page into an extension service worker that runs off the main thread and exec…*
-   [Manifest V3](#manifest-v3) — *Explains what Manifest V3 is and why it exists: the latest version of the extensions platform, aimed at improvin…*
- [6. Manifest Reference](#6-manifest-reference)
-   [Reference](#reference) — *Top-level reference hub that fans out into the three reference trees — API modules, manifest keys, and permissio…*
-   [Manifest](#manifest) — *Structure reference for manifest.json, the file every extension must place in its root directory to declare stru…*
-   [`author`](#author) — *Optional key that is no longer supported: as of February 2024 Chrome and the Chrome Web Store silently ignore it…*
-   [`background`](#background) — *Optional key declaring a JavaScript file as the extension service worker — the background script that acts as th…*
-   [`chrome_settings_overrides`](#chromesettingsoverrides) — *Optional key letting an extension override selected Chrome settings — the homepage, the default search provider,…*
-   [`content_scripts`](#contentscripts) — *Statically declares JavaScript and/or CSS to inject every time a page opens that matches a URL pattern.*
-   [`content_security_policy`](#contentsecuritypolicy) — *Optional key holding a web-platform CSP that restricts the scripts, styles, and other resources an extension may…*
-   [`cross_origin_embedder_policy`](#crossoriginembedderpolicy) — *Optional key (introduced in Chrome 93) that sets the Cross-Origin-Embedder-Policy (COEP) response header for eve…*
-   [`cross_origin_opener_policy`](#crossoriginopenerpolicy) — *Optional key (introduced in Chrome 93) that sets the Cross-Origin-Opener-Policy (COOP) response header for reque…*
-   [`default_locale`](#defaultlocale) — *Names the \_locales subdirectory that holds an extension's default language.*
-   [`description`](#description) — *Plain-text string describing the extension, shown on both chrome://extensions and the Chrome Web Store.*
-   [`event_rules`](#eventrules) — *Declarative rule list that intercepts, blocks, or modifies web requests in flight (through the MV2 declarativeWe…*
-   [`externally_connectable`](#externallyconnectable) — *Optional key declaring which other extensions and which web pages may connect to this extension via runtime.conn…*
-   [`file_handlers`](#filehandlers) — *Optional ChromeOS key specifying file types the extension can open from the Files app.*
-   [`homepage_url`](#homepageurl) — *Optional manifest key holding a string with a valid homepage URL, typically the developer's personal or company…*
-   [`icons`](#icons) — *Declares one or more icons representing the extension or theme.*
-   [`incognito`](#incognito) — *Optional key controlling how the extension behaves when the user allows it in incognito mode.*
-   [`input_components`](#inputcomponents) — *Optional ChromeOS key that enables the input.ime (Input Method Editor) API, letting the extension handle keystro…*
-   [`key`](#key) — *Optional key that pins the extension's (or theme's) unique ID while it is loaded unpacked during development.*
-   [`manifest_version`](#manifestversion) — *Required integer declaring which version of the manifest file format the package requires.*
-   [`minimum_chrome_version`](#minimumchromeversion) — *Optional string restricting which Chrome versions may install the extension.*
-   [`name`](#name) — *Required short plain-text string identifying the extension, maximum 75 characters.*
-   [`oauth2`](#oauth2) — *Optional key enabling an OAuth 2.0 security ID for the extension, used with the identity API to obtain Google au…*
-   [`requirements`](#requirements) — *Optional key listing technologies the extension requires, so hosting sites such as the Chrome Web Store can disc…*
-   [`sandbox`](#sandbox) — *Optional key defining extension pages served in a sandboxed unique origin.*
-   [Shared modules: `export` / `import`](#shared-modules-export--import) — *Documents the two manifest fields that implement Shared Modules — permissionless, downloadable resource bundles…*
-   [`short_name`](#shortname) — *Optional key holding a shortened version of the extension's name, used where there is not enough space for the f…*
-   [`storage`](#storage) — *Declares the JSON Schema for the managed storage area which, unlike local and sync, must declare its structure a…*
-   [`trial_tokens`](#trialtokens) — *Optional array of origin-trial tokens that enables Origin Trial and Deprecation Trial features inside extension…*
-   [`web_accessible_resources`](#webaccessibleresources) — *Declares which packaged files web pages or other extensions may access.*
-   [`version`](#version) — *Required string of one to four dot-separated integers identifying the extension's version; a published version n…*
-   [`mime_types_handler`](#mimetypeshandler) — *Optional key that registers the extension as a handler for supported MIME types: when the user opens such a docu…*
- [7. Permissions Reference](#7-permissions-reference)
-   [Permissions](#permissions) — *Exhaustive alphabetical reference of every "permission" string usable in manifest.json, each mapped to the API o…*
- [8. API Reference](#8-api-reference)
  - [8.1 Core Runtime & Messaging](#81-core-runtime--messaging)
-     [API reference](#api-reference) — *Hub for every Chrome Extensions API namespace.*
-     [chrome.accessibilityFeatures](#chromeaccessibilityfeatures) — *Manages Chrome's accessibility features as types.ChromeSetting objects with get()/set()/clear().*
-     [chrome.alarms](#chromealarms) — *Schedules code to run periodically or at a specified time in the future; requires the "alarms" permission.*
-     [chrome.commands](#chromecommands) — *Adds keyboard shortcuts that trigger extension actions.*
-     [chrome.events](#chromeevents) — *Common types shared by every API that dispatches events: the Event object (listener registration plus declarativ…*
-     [chrome.extension](#chromeextension) — *Utility namespace usable from any extension page: enumerate extension views/windows, query incognito and file://…*
-     [chrome.extensionTypes](#chromeextensiontypes) — *Type declarations only — no methods, events, permissions, or manifest keys.*
-     [chrome.i18n](#chromei18n) — *Internationalization infrastructure: \_locales/&lt;localeCode&gt;/messages.json files, \_\_MSG\_name\_\_ substitution in the…*
-     [chrome.idle](#chromeidle) — *Detects when the machine's idle state changes between active, idle, and locked.*
-     [chrome.permissions](#chromepermissions) — *Requests declared optional permissions at runtime instead of install time so users understand each warning and g…*
-     [chrome.power](#chromepower) — *Overrides the system's power management features so the machine and/or screen stay awake.*
-     [chrome.runtime](#chromeruntime) — *Core namespace for messaging (one-shot, long-lived ports, cross-extension, native), manifest/platform metadata,…*
-     [chrome.types](#chrometypes) — *Type declarations for Chrome browser settings, chiefly the generic ChromeSetting interface that settings APIs (p…*
  - [8.2 Tabs, Windows & Browser UI](#82-tabs-windows--browser-ui)
-     [chrome.action](#chromeaction) — *Controls the extension's toolbar icon — image, tooltip, badge, and popup — globally or per tab.*
-     [chrome.bookmarks](#chromebookmarks) — *Creates, organizes, searches, and deletes bookmarks and folders in the bookmark tree; requires the "bookmarks" p…*
-     [chrome.contextMenus](#chromecontextmenus) — *Adds items to Chrome's right-click context menu, scoped by context type (page, selection, link, image, action, t…*
-     [chrome.downloads](#chromedownloads) — *Programmatically initiates, monitors, manipulates, and searches downloads; requires the "downloads" permission,…*
-     [chrome.history](#chromehistory) — *Reads and edits the browser's record of visited pages — add, delete, and query URLs and visits; requires the "hi…*
-     [chrome.omnibox](#chromeomnibox) — *Registers a keyword with Chrome's address bar (the omnibox); while the user types it, every keystroke is sent to…*
-     [chrome.readingList](#chromereadinglist) — *Reads and modifies the items in Chrome's Reading List (the side-panel read-later queue); requires the "readingLi…*
-     [chrome.search](#chromesearch) — *Runs a query against the user's default search provider; requires the "search" permission.*
-     [chrome.sessions](#chromesessions) — *Queries and restores tabs and windows from the current browsing session and from other synced devices; requires…*
-     [chrome.sidePanel](#chromesidepanel) — *Hosts an extension page in Chrome's side panel alongside web content, persistent across tab navigation when conf…*
-     [chrome.tabGroups](#chrometabgroups) — *Modifies and rearranges existing tab groups (title, color, collapsed state, position/window); requires the "tabG…*
-     [chrome.tabs](#chrometabs) — *Creates, queries, modifies, rearranges, groups, zooms, and screenshots browser tabs, and messages their content…*
-     [chrome.topSites](#chrometopsites) — *Returns the most-visited sites displayed on the New Tab Page, excluding user-customized shortcuts; requires the…*
-     [chrome.windows](#chromewindows) — *Creates, queries, modifies, focuses, and closes browser windows.*
  - [8.3 Web Content & Network](#83-web-content--network)
-     [chrome.contentSettings](#chromecontentsettings) — *Reads and rewrites Chrome's per-site content settings — cookies, JavaScript, images, plugins, popups, camera/mic…*
-     [chrome.cookies](#chromecookies) — *Queries, sets, and deletes HTTP cookies and notifies when they change.*
-     [chrome.debugger](#chromedebugger) — *Alternate transport for the Chrome DevTools Protocol (CDP): attach to tabs, out-of-process iframes, and workers,…*
-     [chrome.declarativeContent](#chromedeclarativecontent) — *Enables, greys out, or re-icons the toolbar action declaratively when the page URL matches a UrlFilter, a CSS se…*
-     [chrome.declarativeNetRequest](#chromedeclarativenetrequest) — *Blocks, allows, upgrades, redirects, or header-rewrites network requests through declarative rules instead of in…*
-     [chrome.desktopCapture](#chromedesktopcapture) — *Shows Chrome's desktop-media picker for the screen, a window, a tab, or audio and returns an opaque streamId for…*
-     [chrome.dom](#chromedom) — *Tiny namespace for "special DOM APIs for Extensions" — exactly one method, openOrClosedShadowRoot(), which retur…*
-     [chrome.offscreen](#chromeoffscreen) — *Creates one hidden document so the extension can use DOM APIs the service worker lacks — clipboard, getUserMedia…*
-     [chrome.pageCapture](#chromepagecapture) — *Saves a tab as a single MHTML file (the page plus its CSS, images, and other resources, per RFC 2557) via one pr…*
-     [chrome.scripting](#chromescripting) — *Injects JavaScript and CSS into pages and frames at runtime and registers dynamic content scripts; requires "scr…*
-     [chrome.tabCapture](#chrometabcapture) — *Grants a MediaStream (or a single-use stream ID) of the active tab's video and audio.*
-     [chrome.userScripts](#chromeuserscripts) — *Runs user-supplied (not packaged) code in a dedicated User Scripts world — the sanctioned path for arbitrary scr…*
-     [chrome.webAuthenticationProxy](#chromewebauthenticationproxy) — *Lets remote-desktop software running on a \*remote host\* intercept WebAuthn requests — navigator.credentials.crea…*
-     [chrome.webNavigation](#chromewebnavigation) — *Notifies on the status of in-flight navigation requests — per-frame, in event order — without touching the netwo…*
-     [chrome.webRequest](#chromewebrequest) — *Observes, analyzes, and — with blocking handlers — intercepts, cancels, redirects, and header-rewrites requests…*
  - [8.4 Data, Identity & Notifications](#84-data-identity--notifications)
-     [chrome.browsingData](#chromebrowsingdata) — *Deletes a user's local profile data — cache, cookies, downloads list, history, form data, IndexedDB, local stora…*
-     [chrome.gcm](#chromegcm) — *Sends and receives messages through Firebase Cloud Messaging (FCM): register up to 100 sender IDs, push data pay…*
-     [chrome.identity](#chromeidentity) — *Gets OAuth2 access tokens for the extension using the oauth2 manifest section (client\_id + scopes), and runs non…*
-     [chrome.instanceID](#chromeinstanceid) — *Wraps the Instance ID service: read a stable app-instance identifier and its creation time, mint scoped tokens f…*
-     [chrome.management](#chromemanagement) — *Enumerates and controls installed apps, extensions, and themes — enable/disable, uninstall, launch apps, set lau…*
-     [chrome.notifications](#chromenotifications) — *Creates rich system-tray notifications from four templates (basic, image, list, progress) with title, message, i…*
-     [chrome.storage](#chromestorage) — *Stores, retrieves, and tracks changes to extension data across four areas — local, managed, session, sync — each…*
  - [8.5 DevTools](#85-devtools)
-     [chrome.devtools.inspectedWindow](#chromedevtoolsinspectedwindow) — *Interacts with the page being inspected in DevTools: read its tab ID, evaluate JavaScript inside the page's own…*
-     [chrome.devtools.network](#chromedevtoolsnetwork) — *Reads the Network panel's traffic as HTTP Archive (HAR) data — the full HAR log via getHAR(), one HAR entry per…*
-     [chrome.devtools.panels](#chromedevtoolspanels) — *Adds UI to the DevTools window — full tab panels, sidebar panes in Elements/Sources, status-bar buttons — and re…*
-     [chrome.devtools.performance](#chromedevtoolsperformance) — *Notifies when the DevTools Performance panel starts and stops recording, so an extension can automate profiling.*
-     [chrome.devtools.recorder](#chromedevtoolsrecorder) — *Customizes the DevTools Recorder panel — add an export format to its Export menu and a custom replay button — by…*
  - [8.6 Platform, ChromeOS & Enterprise](#86-platform-chromeos--enterprise)
-     [chrome.audio](#chromeaudio) — *Reads and controls the system's audio devices — list devices, choose active input/output, set per-device volume…*
-     [chrome.certificateProvider](#chromecertificateprovider) — *Exposes client certificates to the platform so ChromeOS can use them for TLS client authentication: publish the…*
-     [chrome.dns](#chromedns) — *Resolves hostnames and IP-address literals to addresses from an extension with a single method, dns.resolve().*
-     [chrome.documentScan](#chromedocumentscan) — *Discovers and reads images from attached document scanners.*
-     [chrome.enterprise.deviceAttributes](#chromeenterprisedeviceattributes) — *Reads managed-device attributes — administrator-annotated asset ID and location, policy-set hostname, serial num…*
-     [chrome.enterprise.hardwarePlatform](#chromeenterprisehardwareplatform) — *Returns the manufacturer and model of the hardware platform the browser runs on — one method, getHardwarePlatfor…*
-     [chrome.enterprise.login](#chromeenterpriselogin) — *Exits the current ChromeOS Managed Guest session — a single method, exitCurrentManagedGuestSession().*
-     [chrome.enterprise.networkingAttributes](#chromeenterprisenetworkingattributes) — *Reads the local IPv4/IPv6 addresses and MAC address of the device's default network via getNetworkDetails().*
-     [chrome.enterprise.platformKeys](#chromeenterpriseplatformkeys) — *Generates hardware-backed keys on the platform's TPM tokens and installs the matching certificates so ChromeOS c…*
-     [chrome.fileBrowserHandler](#chromefilebrowserhandler) — *Extends the ChromeOS file browser (Alt+Shift+M or an attached SD card/USB drive) with buttons that act on select…*
-     [chrome.fileSystemProvider](#chromefilesystemprovider) — *Lets an extension provide a virtual file system that appears in the ChromeOS Files app — mount/unmount volumes,…*
-     [chrome.fontSettings](#chromefontsettings) — *Reads and overrides Chrome's font settings — per CSS generic family (standard, serif, sansserif, fixed, cursive,…*
-     [chrome.input.ime](#chromeinputime) — *Implements a custom input method editor on ChromeOS — handle keystrokes, set the composition string and cursor/s…*
-     [chrome.location](#chromelocation) — *Retired API.*
-     [chrome.loginState](#chromeloginstate) — *Reads and monitors the ChromeOS login state — which profile the extension sits in and which screen the device is…*
-     [chrome.mimeHandler](#chromemimehandler) — *Registers a third-party extension page as the viewer for a MIME type (as of Chrome 151 only application/pdf for…*
-     [chrome.platformKeys](#chromeplatformkeys) — *Uses platform-managed client certificates in a custom authentication protocol — filter/select certificates, obta…*
-     [chrome.printerProvider](#chromeprinterprovider) — *Event-only API that lets an extension supply printers to Chrome's print manager: answer requests for the printer…*
-     [chrome.printing](#chromeprinting) — *Sends print jobs to printers installed on a Chromebook — list printers, read status/capabilities in CDD form, su…*
-     [chrome.printingMetrics](#chromeprintingmetrics) — *Reports printing usage — the finished print jobs with their settings, printer, page count, and final status.*
-     [chrome.privacy](#chromeprivacy) — *Reads and overrides Chrome's privacy-affecting settings — network prediction, WebRTC IP handling, Google service…*
-     [chrome.processes](#chromeprocesses) — *Inspects and controls the browser's processes like the Task Manager — map a tab to its renderer, read per-proces…*
-     [chrome.proxy](#chromeproxy) — *Manages Chrome's proxy configuration through the single settings types.ChromeSetting, whose value is a ProxyConfig.*
-     [chrome.publicSuffix](#chromepublicsuffix) — *Queries the browser's Public Suffix List — the registrable domain of a hostname, its known public suffix, or whe…*
-     [chrome.system.cpu](#chromesystemcpu) — *Queries CPU metadata — architecture, model, logical-processor count, feature codes, per-processor cumulative tim…*
-     [chrome.system.display](#chromesystemdisplay) — *Queries and configures displays — bounds, work area, DPI, rotation, zoom, modes, mirroring, unified desktop, ove…*
-     [chrome.system.memory](#chromesystemmemory) — *Reports physical memory via a single method, getInfo(), which resolves total and available capacity in bytes.*
-     [chrome.system.storage](#chromesystemstorage) — *Queries storage devices — total/available capacity and media type — and notifies when removable media is attache…*
-     [chrome.systemLog](#chromesystemlog) — *Writes a message into Chrome's system log from an extension — one method, add({ message }).*
-     [chrome.tts](#chrometts) — *Plays synthesized text-to-speech through the OS engine (SAPI 5 on Windows, macOS, ChromeOS) or an installed spee…*
-     [chrome.ttsEngine](#chromettsengine) — *Implements a text-to-speech engine in an extension: intercept tts.speak()/tts.stop(), synthesize speech with any…*
-     [chrome.vpnProvider](#chromevpnprovider) — *Implements a third-party VPN client on ChromeOS: create/destroy persistent VPN configurations, take ownership of…*
-     [chrome.wallpaper](#chromewallpaper) — *Changes the ChromeOS wallpaper — sets a jpeg/png image from a URL, an ArrayBuffer, or a relative path under a ch…*
- [9. Samples, AI & Release Notes](#9-samples-ai--release-notes)
-   [Samples](#samples) — *Gallery hub pointing at the GoogleChrome/chrome-extensions-samples repository — runnable demos to learn how exte…*
-   [Extensions and AI](#extensions-and-ai) — *Hub for both directions of AI work in extensions — building extensions with AI coding tools, and shipping AI-pow…*
-   [Build extensions with AI coding tools](#build-extensions-with-ai-coding-tools) — *Setup guide for giving AI coding agents (Antigravity, Gemini CLI, Claude Code, Codex) extension-specific context…*
-   [What's new](#whats-new) — *Reverse-chronological release-notes feed for Chrome extensions — per-Chrome-version API launches, documentation…*
- [10. External & Legacy References](#10-external--legacy-references)

---

## 1. Getting Started & Tutorials

### [Chrome Extensions](https://developer.chrome.com/docs/extensions/)

**Overview:** Landing hub for Chrome extension development. Routes readers to the four documentation areas (Get started, Develop, How-to, Reference), the AI/What's New feeds, runnable API samples, Web Store publishing, and support channels.

**Sections:**
- **"Extend the web"**: Entry point to the Develop guide, with feature cards linking side panel, themes, override pages, tabs, bookmarks, downloads, content scripts, `webNavigation`, and `cookies`.
- **"Extensions on YouTube"**: Ecosystem video list covering permission safety, cross-browser extensions, DevTools for agents, and source/API-key protection.
- **"Extensions in action"**: Links runnable Action, UserScript, Scripting, and SidePanel samples in the `GoogleChrome/chrome-extensions-samples` repository.
- **"Documentation"**: The four top-level trees: `/get-started` (first extension), `/develop` (concepts and UI), `/how-to` (task recipes), `/reference` (APIs, manifest, permissions).
- **"Support and feedback"**: Get help, file a bug, request a feature, and find an existing bug report.
  - *Key terms/entities:* `/get-started`, `/develop`, `/how-to`, `/reference`, `/samples`, `/ai`, `/whats-new`, `chrome-extensions-samples`, Chrome Web Store

### [Get started](https://developer.chrome.com/docs/extensions/get-started)

**Overview:** Onboarding hub for extension development: defines what extensions are and how they are built, introduces the core extension terminology, summarizes Chrome Web Store prerequisites, and indexes six hands-on tutorials.

**Sections:**
- **"Overview"**: Extensions customize the browser UI, observe browser events, and modify the web; they are built with HTML, CSS, and JavaScript plus the Chrome Extension APIs.
- **"Extension terminology"**: Defines `manifest.json` (only required file, at the extension root), service workers (background event handlers with no DOM access; pair with an offscreen document), content scripts, toolbar `action`, `sidePanel`, and `declarativeNetRequest`.
- **"Publish to the Chrome Web Store"**: Design for a single purpose, comply with the developer program policies, and bundle all logic in the package (no remotely hosted JavaScript).
- **[Tutorials](https://developer.chrome.com/docs/extensions/get-started#tutorials)**: Index of the six tutorials: first extension, run scripts on every page, inject into the active tab, tab manager popup, service-worker events, and debugging.
  - *Key terms/entities:* `manifest.json`, service worker, content script, `action`, `sidePanel`, `declarativeNetRequest`, single purpose, remotely hosted code

### [Hello World extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)

**Overview:** First-extension tutorial. Builds a Manifest V3 popup extension (`manifest.json` + `hello.html` + optional `popup.js`), loads it unpacked, pins it, reloads after edits, and debugs popup console/errors.

**Sections:**
- **"Hello World"**: Minimal `manifest.json` with `"manifest_version": 3`, `"action": { "default_popup", "default_icon" }`; the popup HTML is a normal bundled page.
- **"Load an unpacked extension"**: `chrome://extensions` → enable **Developer mode** → **Load unpacked**; a generic icon is used when no icons are declared.
- **"Pin the extension"** / **"Reload the extension"**: Pin from the puzzle menu; the reload table shows manifest, service worker, and content scripts require reload (content scripts also require reloading the host page), while popup and options pages do not.
- **"Find console logs and errors"**: Right-click the popup → **Inspect** → Console; syntax errors surface in the Extensions page **Errors** button.
- **"Structure an extension project"** / **"Use TypeScript"**: Only `manifest.json` at the root is required; `chrome-types` provides Chrome API autocomplete.
  - *Key terms/entities:* `manifest_version: 3`, `action.default_popup`, `action.default_icon`, `chrome://extensions`, Load unpacked, Developer mode, `chrome-types`, **Errors** button

### [Run scripts on every page](https://developer.chrome.com/docs/extensions/get-started/tutorial/scripts-on-every-tab)

**Overview:** Builds the `reading-time` extension: a static content script registered with `"content_scripts"` that injects a reading-time badge into matching Chrome docs pages, then observes SPA navigation with `MutationObserver`.

**Sections:**
- **"Build the extension"**: Five steps — minimal manifest metadata; 16/32/48/128 px PNG icons (SVG unsupported); `"content_scripts"` with `"matches"` match patterns; a content script that reads `<article>`, counts words (~200 wpm), and inserts a badge; a `MutationObserver` for soft navigations.
- **"Test that it works"**: Load unpacked, then open matching docs or Web Store pages; content scripts run in an [isolated world](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#isolated_world) and can mutate the DOM without colliding with page scripts.
- **"Potential enhancements"** / **"Keep building"**: Add match patterns for other docs sites, calculate reading time for other sites, and continue with the Focus Mode and Tabs Manager tutorials.
  - *Key terms/entities:* `content_scripts`, `matches`, match patterns, `<scheme>://<host><path>`, `content.js`, `MutationObserver`, isolated world, permission warning, `icons`, 200 wpm

### [Inject scripts into the active tab](https://developer.chrome.com/docs/extensions/get-started/tutorial/scripts-activetab)

**Overview:** Builds `focus-mode`: a service worker toggles a badge and injects/removes a CSS file on the active tab using the Scripting API, gated by `"activeTab"` for privacy. Optionally adds a `_execute_action` keyboard shortcut.

**Sections:**
- **"Build the extension"**: Manifest data/icons; register `background.service_worker`; `runtime.onInstalled` sets badge "OFF"; declare `action`; add `"permissions": ["activeTab", "scripting"]`; `action.onClicked` checks the URL, flips badge state, and calls `scripting.insertCSS()`/`removeCSS()`; optional `commands._execute_action` shortcut (Ctrl+B / Command+B).
- **"Use the activeTab permission to protect user privacy"**: `activeTab` grants temporary access after a user invocation (action click, keyboard shortcut, context menu, omnibox, popup) and does not trigger a permission warning; `scripting` also does not warn.
- **"Test that it works"** / **"Potential enhancements"**: Load unpacked, click the action on matching docs/Web Store pages, and verify the layout changes; extend the CSS or shortcut.
  - *Key terms/entities:* `activeTab`, `scripting`, `insertCSS()`, `removeCSS()`, `action.onClicked`, `action.setBadgeText()`, `action.getBadgeText()`, [badge](https://developer.chrome.com/docs/extensions/reference/api/action#badge), [`_execute_action`](https://developer.chrome.com/docs/extensions/get-started/tutorial/scripts-activetab#step-6), `commands.suggested_key`

### [Manage tabs](https://developer.chrome.com/docs/extensions/get-started/tutorial/popup-tabs-manager)

**Overview:** Builds `tabs-manager`: an action popup that queries matching tabs, focuses a tab/window on click, and groups tabs into a named tab group. Demonstrates narrow host permissions instead of the broad `"tabs"` permission.

**Sections:**
- **"Build the extension"**: Declare `action.default_popup`; popup pages cannot run inline JavaScript (use `type="module"` for top-level await); request `host_permissions` for `https://developer.chrome.com/*` to read `title`/`url` on only those tabs; `tabs.query()` filters by URL; `tabs.update({ active: true })` + `windows.update({ focused: true })` focus a tab; add `"tabGroups"` and call `tabs.group()` then `tabGroups.update({ title: "DOCS" })`.
- **"Test that it works"**: Load unpacked, open several docs pages in different windows, click the action, then **Group Tabs**.
- **"Potential enhancements"**: Customize popup CSS, group color/title, support another site, or add ungrouping.
  - *Key terms/entities:* `action.default_popup`, `host_permissions`, `"tabs"`, `"tabGroups"`, `tabs.query()`, `tabs.update()`, `windows.update()`, [`tabs.group()`](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-group), `tabGroups.update()`, optional permissions

### [Handle events with service workers](https://developer.chrome.com/docs/extensions/get-started/tutorial/service-worker-events)

**Overview:** Builds `quick-api-reference`: an ES-module service worker that powers an omnibox keyword for jumping to API reference pages, persists suggestions in `storage.local`, fetches a daily tip on an `alarms` schedule, and serves the tip to a content script via messaging.

**Sections:**
- **"Build the extension"**: Seven steps — register `background.service_worker` (no `navigator.serviceWorker.register()`); set `"type": "module"` and import modules; debug termination ("service worker (inactive)") and registration errors; persist state with `browser.storage.local` because globals are lost on termination; register all event listeners at the top level; use `omnibox.onInputChanged`/`onInputEntered` with `SuggestResult`; use `alarms` instead of `setTimeout`/`setInterval`; message a content script with `runtime.sendMessage`/`onMessage` and `return true` for async replies.
- **"Test that it works"**: Type `api`, press Tab/Space, choose a suggestion; click the injected Tip button (Popover API, Chrome 114+).
  - *Key terms/entities:* `background.service_worker`, `"type": "module"`, `storage.local`, `runtime.onInstalled`, `omnibox.onInputChanged`, `omnibox.onInputEntered`, `alarms.create`, `runtime.sendMessage`, `runtime.onMessage`, `minimum_chrome_version`, `"permissions": ["storage", "alarms"]`, `content_scripts`

### [Debug extensions](https://developer.chrome.com/docs/extensions/get-started/tutorial/debug)

**Overview:** Hands-on debugging tutorial using the `Broken Color` sample. Breaks and fixes one component at a time to show where each type of error surfaces: manifest load dialog, Extensions page **Errors**, service-worker DevTools, popup DevTools, and the host page console for content scripts.

**Sections:**
- **"Break the extension"**: Start from the Broken Color sample; undo each introduced bug before moving on.
  - **"Debug the manifest"**: Invalid keys can block loading (`Required value version is missing or invalid`); invalid permissions still load and appear under **Errors** (`Permission 'activetab' is unknown...`); a JSON schema helps prevent both.
  - **"Debug the service worker"**: Inspect views opens the worker DevTools (inspection keeps it alive); registration failures (`Status code: 15`) hide the real error until registration succeeds; use the Application panel's Service Workers pane to start/stop and inspect status.
  - **"Debug the popup"**: Popup errors appear under **Errors** and in the popup's own DevTools; fix `tabs is not defined` with [`tabs.query()`](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-query).
  - **"Debug content scripts"**: Content-script errors appear only in the host page console, not the Extensions page; select the extension context in the DevTools context dropdown.
- **"Monitor network requests"**: Refresh from inside the Network panel to capture popup requests that complete before DevTools opens.
- **"Declare permissions"**: Check the permissions article and API reference; external `fetch()` calls require a host permission.
  - *Key terms/entities:* `chrome://extensions` **Errors**, **Inspect views**, Service Workers pane, `browser.runtime.onInstalled`, `tabs.query()`, `scripting.executeScript()`, content-script console, host permission, Chrome manifest JSON schema

---

## 2. Core Concepts

### [Develop](https://developer.chrome.com/docs/extensions/develop)

**Overview:** Capability map for extension development. Groups what extensions can do into UI surfaces, browser control, and web control, then points to the core concepts that explain how the pieces combine.

**Sections:**
- **[Design the user interface](https://developer.chrome.com/docs/extensions/develop#design-the-user-interface)**: Side panel, toolbar action, context menus, settings/override pages, DevTools extensions, and notifications.
- **[Control the browser](https://developer.chrome.com/docs/extensions/develop#control-the-browser)**: History/browsing data/top sites, tabs/tab groups/windows, keyboard commands, identity/OAuth, extension management, omnibox suggestions, privacy/proxy, downloads, bookmarks, and the reading list.
- **[Control the web](https://developer.chrome.com/docs/extensions/develop#control-the-web)**: Content scripts, the `activeTab` permission, declarativeNetRequest/webRequest/webNavigation, tab/screen capture, and content settings.
- **[Core concepts](https://developer.chrome.com/docs/extensions/develop#core-concepts)**: Service workers, permissions, content filtering, messaging, native messaging, avoiding remotely hosted code, storage, offscreen documents, cross-origin isolation, and the update lifecycle.
  - *Key terms/entities:* `sidePanel`, `action`, `contextMenus`, `tabs`, `tabGroups`, `windows`, `commands`, `identity`, `management`, `omnibox`, `privacy`, `proxy`, `downloads`, `bookmarks`, `readingList`, `contentSettings`, `declarativeNetRequest`, `webRequest`, `webNavigation`, `activeTab`, `offscreen`

### [The "activeTab" permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)

**Overview:** Defines `"activeTab"`: temporary host access to the active tab after an explicit user invocation, with no install-time warning. Access is revoked on navigation to another origin or when the tab closes, and never applies to restricted pages such as `chrome://`.

**Sections:**
- **"Example"**: Page Redder sample declares `["activeTab", "scripting"]`; `action.onClicked` checks `tab.url` (missing means a restricted page) and calls `scripting.executeScript()`.
- **"Motivation"**: Replaces broad, persistent `<all_urls>` access with gesture-scoped access; limits blast radius if the extension is compromised.
- **"What \"activeTab\" allows"**: With `"scripting"`, inject CSS/JS; read the tab's URL, title, and favicon via a `tabs.Tab` object (temporary host permission); intercept main-frame network requests with `webRequest`.
- **"Invoking activeTab"**: Action click, context menu item, `commands` keyboard shortcut, or accepting an omnibox suggestion.
  - *Key terms/entities:* `activeTab`, `scripting`, `scripting.insertCSS()`, `scripting.executeScript()`, `tabs.Tab`, `<all_urls>`, host permission, `chrome://` restricted pages, user gesture

### [Transition to browser namespace](https://developer.chrome.com/docs/extensions/develop/concepts/browser-namespace)

**Overview:** From Chrome 148 every extension API is available as `browser.*` as well as `chrome.*`; both point at the same objects. Explains when to adopt `browser` unconditionally, when to use a runtime alias, and how native promise-returning `runtime.onMessage` listeners change messaging.

**Sections:**
- **"Decide whether to adopt the browser namespace"**: New extensions targeting Chrome 148+ can set `minimum_chrome_version: "148"` and use `browser` unconditionally; existing extensions should check user Chrome versions and otherwise use a startup guard (`globalThis.browser ||= chrome`). Note that raising the minimum version freezes updates for older Chrome users; use a staged rollout.
- **"A note for polyfill users"**: `webextension-polyfill` becomes a no-op on Chrome 148+; remove it after users move to 148. The earlier Chrome 136 rollout was reverted because `browser` appeared while promise-returning `onMessage` did not.
- **"Other features"**: Chrome 148 lets `runtime.onMessage` listeners return a Promise (or use `async`) instead of `return true` + `sendResponse`; the old pattern still works. DevTools-page extensions get this from Chrome 152.
  - *Key terms/entities:* `browser` namespace, `chrome` namespace, `chrome.tabs === browser.tabs`, `minimum_chrome_version`, runtime guard, `webextension-polyfill`, `runtime.onMessage`, promise-returning listener, `devtools_page`, WECG

### [Content filtering](https://developer.chrome.com/docs/extensions/develop/concepts/content-filtering)

**Overview:** Survey of content and network filtering approaches. Compares declarativeNetRequest static/dynamic rules, webRequest-assisted rule discovery, user-defined rules, DOM element hiding with content scripts, policy-only blocking webRequest, and navigation-request interception.

**Sections:**
- **"Filter network requests"**: `declarativeNetRequest` rules can block, upgrade http→https / ws→wss, redirect, and modify headers. Static rules ship in rulesets (100 rulesets max, 50 enabled; shared global pool 300k + 30k guaranteed per extension); dynamic rules allow 30k "safe" rules and 5k unsafe/redirect rules.
- **"Adapt rules based on observed requests"**: Use `webRequest` to identify unwanted requests, add dynamic DNR rules via [`updateDynamicRules`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#method-updateDynamicRules), optionally promote them to static rules in the next release.
- **"Allow users to define their own filtering rules"**: Convert user rules to dynamic DNR rules (persist across sessions/upgrades, up to 30k).
- **"Filter elements on web pages"**: Content scripts remove/hide DOM elements; hide-selector data counts as configuration, not remotely hosted code.
- **"Filter network requests in policy installed extensions"** / **"Intercept navigation requests"**: Policy-installed extensions may use blocking `webRequest`; DNR can redirect navigation requests through a web-accessible extension page that extracts the real destination.
  - *Key terms/entities:* `declarativeNetRequest`, static rulesets, dynamic rules, `updateDynamicRules`, `webRequest`, blocking webRequest, `web_accessible_resources`, content scripts, EasyList, 300,000 / 30,000 / 5,000 rule limits

### [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)

**Overview:** Complete guide to scripts that run in the context of web pages. Covers API access, isolated worlds, static/dynamic/programmatic injection, URL matching and globs, run timing, frames, page communication, extension-file access, CSP, and security.

**Sections:**
- **"Understand content script capabilities"**: Direct access to `dom`, `i18n`, `storage`, `runtime.connect()`, `getManifest()`, `getURL()`, `id`, `onConnect`, `onMessage`, and `sendMessage()`; other APIs are reached by messaging. Extension files need `web_accessible_resources`.
- **"Work in isolated worlds"**: Content scripts share the DOM but not JavaScript variables with the page or other extensions.
- **"Inject scripts"**: Static `"content_scripts"` manifest entries; dynamic registration with `scripting.registerContentScripts()` / `getRegisteredContentScripts()` / `updateContentScripts()` / `unregisterContentScripts()` (Chrome 96+); programmatic injection with `scripting.executeScript()` using `files`, a self-contained `func`, or `args` — requires host permission or `activeTab`.
- **"Exclude matches and globs"** / **"Run time"** / **"Specify frames"** / **"Inject in to related frames"**: `exclude_matches`, `include_globs`, `exclude_globs`; `run_at` = `document_idle` (default), `document_start`, `document_end`; `all_frames`/`allFrames`; `match_origin_as_fallback` for `about:`/`data:`/`blob:`/`filesystem:` frames (requires path `*`).
- **"Communication with the embedding page"**: Use `window.postMessage()` through the shared DOM, validating `event.source` and message shape.
- **"Access extension files"** / **"Content Security Policy"** / **"Stay secure"**: `runtime.getURL()` and `__MSG_@@extension_id__`; isolated-world CSP blocks `eval()` and external scripts; filter XSS input and avoid string-evaluated `setTimeout`.
  - *Key terms/entities:* `content_scripts`, `matches`, `exclude_matches`, `include_globs`, `exclude_globs`, `run_at`, `all_frames`, `match_origin_as_fallback`, `world`, `ISOLATED`, `MAIN`, `scripting.registerContentScripts()`, `scripting.executeScript()`, `activeTab`, `web_accessible_resources`, isolated world, `__MSG_@@extension_id__`, CSP

### [Cross-origin isolation](https://developer.chrome.com/docs/extensions/develop/concepts/cross-origin-isolation)

**Overview:** Shows how an extension opts into cross-origin isolation to use powerful APIs such as `SharedArrayBuffer`. Sets `cross_origin_embedder_policy` to `require-corp` and `cross_origin_opener_policy` to `same-origin`; notes that not every extension context is isolated.

**Sections:**
- **"Cross-origin isolation"** *(no H2 headings observed)*: Manifest snippet with `"cross_origin_embedder_policy": { "value": "require-corp" }` and `"cross_origin_opener_policy": { "value": "same-origin" }`; COOP/COEP side effects apply. Service/shared workers and web-accessible subframes on regular pages are not fully cross-origin isolated yet.
  - *Key terms/entities:* `SharedArrayBuffer`, `cross_origin_embedder_policy`, `cross_origin_opener_policy`, `require-corp`, `same-origin`, COOP, COEP, cross-origin isolation

### [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)

**Overview:** Explains the four permission declarations: `"permissions"` (known API strings), `"optional_permissions"` (runtime grant), `"host_permissions"` (URL match patterns), and `"optional_host_permissions"`; plus `"content_scripts.matches"`. Covers which APIs need host permissions, install-time warnings, and enabling file/incognito access.

**Sections:**
- **"Manifest"**: Example declaring `activeTab`, `contextMenus`, `storage`; optional `topSites`; host and optional host patterns.
- **"Host permissions"**: Required for cross-origin `fetch()`, sensitive tab fields (`url`, `title`, `favIconUrl`), programmatic content-script injection, `webRequest`, `cookies`, and `declarativeNetRequest`; not required for `tabs` with the `"tabs"` permission, `debugger`, or manifest-declared content scripts.
- **"Permissions with warnings"**: Install-time warnings list; prefer optional permissions or narrower APIs; changing host match patterns also triggers warnings.
- **"Allow access"**: Users enable `file://` and incognito access on the extension details page; detect with `extension.isAllowedIncognitoAccess()` / `extension.isAllowedFileSchemeAccess()`.
  - *Key terms/entities:* `"permissions"`, `"optional_permissions"`, `"host_permissions"`, `"optional_host_permissions"`, `"content_scripts.matches"`, `"tabs"`, warnings, `file://`, incognito, `chrome://extensions`

### [Extension update lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle)

**Overview:** Describes how Chrome updates installed extensions: automatic checks at startup and every few hours, the idle requirement for installation, manual updates, runtime update APIs, enterprise policy controls, and `minimum_chrome_version` behavior.

**Sections:**
- **"The standard update cycle"**: Updates install only when the extension is idle — no running service worker and no open extension pages (popups, side panel, options); active content scripts do not block idleness. Constantly active extensions may defer updates until browser restart. Disabled extensions still update.
- **"Monitor extension update distribution"**: Chrome Web Store developer dashboard → **Analytics → Users → Daily users by item** to see version adoption.
- **"Update extensions manually"**: `chrome://extensions` → Developer mode → **Update**.
- **"Check for updates from an Extension"**: `runtime.requestUpdateCheck()` (throttled) and `runtime.onUpdateAvailable` (update downloaded, needs idle/reload); `runtime.reload()`.
- **"Controlling updates via enterprise policy"**: `ExtensionInstallForcelist`, version pinning in Admin console, and `ExtensionSettings.override_update_url`.
- **"Set a minimum Chrome version"**: New installs on older Chrome are blocked; raising it silently stops updates for existing older users.
  - *Key terms/entities:* idle, `runtime.requestUpdateCheck()`, `runtime.onUpdateAvailable`, `runtime.reload()`, Chrome Web Store analytics, `ExtensionInstallForcelist`, `ExtensionSettings`, `override_update_url`, `minimum_chrome_version`

### [Match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)

**Overview:** Syntax reference for URL match patterns `<scheme>://<host>:<port>/<path>` used by content scripts, host permissions, web-accessible resources, and `externally_connectable`. Covers allowed schemes, host wildcards, port/path rules, special cases, and worked examples.

**Sections:**
- **"Special cases"**: `"<all_urls>"` (any permitted scheme; longer Web Store review), `"file:///"` (three slashes; user must grant file access), `http://localhost/*` / `http://127.0.0.1/*`, and no TLD-wide patterns (list each TLD).
- **"Example patterns"**: `https://*/*`, `https://*/foo*`, `https://*.google.com/foo*bar`, `file:///foo*`, `http://127.0.0.1/*`, `http://localhost/*`, `*://mail.google.com/*`.
  - *Key terms/entities:* `<scheme>://<host>:<port>/<path>`, `http`, `https`, `file`, `*` wildcard, `*.example.com`, `<all_urls>`, `file:///`, `externally_connectable.matches`, host permissions, Web Store review time

### [Message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)

**Overview:** Complete messaging guide: one-time requests (`runtime.sendMessage`, `tabs.sendMessage`), long-lived ports (`runtime.connect`, `tabs.connect`), cross-extension and web-page messaging, Chrome's JSON serialization, size limits, port lifetime, and security rules.

**Sections:**
- **"One-time requests"**: Send JSON-serializable messages; responses may be synchronous `sendResponse`, async via returning literal `true`, or (Chrome 148+) by returning a Promise / `async` listener. Error handling from Chrome 146 propagates listener throws/rejections to the sender's Promise; only the first responding listener wins.
- **"Long-lived connections"**: `runtime.connect()` / `tabs.connect()` create named `runtime.Port` channels; handle with `runtime.onConnect`, `port.postMessage()`, and `port.onDisconnect` (may fire multiple times because a port can have multiple receivers).
- **"Serialization"** / **"Message size limits"** / **"Port lifetime"**: JSON serialization (`undefined` → `null`), maximum message size 64 MiB, ports disconnect on unload/navigation or remote `disconnect()`.
- **"Cross-extension messaging"** / **"Send messages from web pages"**: `onMessageExternal` / `onConnectExternal` + extension ID; allow web pages via `"externally_connectable".matches`; extensions cannot initiate messages to web pages.
- **"Native messaging"** / **"Security considerations"**: Native hosts are a separate topic; treat content scripts as untrusted, validate/sanitize input, avoid `eval()`/`innerHTML`, prefer `JSON.parse()` and `innerText`.
  - *Key terms/entities:* `runtime.sendMessage()`, `tabs.sendMessage()`, `runtime.connect()`, `tabs.connect()`, `runtime.Port`, `port.postMessage()`, `onDisconnect`, `onMessageExternal`, `onConnectExternal`, `externally_connectable`, JSON serialization, 64 MiB, `nativeMessaging`, `eval()`, `innerHTML`, XSS

### [Native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)

**Overview:** Exchanges messages between an extension and a native OS application through a registered native messaging host process using stdin/stdout. Covers the host manifest, per-platform install locations, wire protocol, `runtime.connectNative` / `sendNativeMessage`, debugging, and common errors.

**Sections:**
- **"Native messaging host"**: Host manifest JSON fields: `name` (lowercase alphanumeric/underscore/dot; no leading/trailing/double dots), `description`, `path` (absolute on Linux/macOS; relative allowed on Windows), `type: "stdio"`, `allowed_origins` (no wildcards).
- **"Native messaging host location"**: Windows registry `HKCU/HKLM\SOFTWARE\Google\Chrome\NativeMessagingHosts\<name>`; macOS `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/` or `/Library/...`; Linux `~/.config/google-chrome/NativeMessagingHosts/` or `/etc/opt/chrome/native-messaging-hosts/` (Chrome for Testing and Chromium have separate paths).
- **"Native messaging protocol"**: JSON UTF-8 with a 32-bit native-byte-order length prefix; max 1 MB host→Chrome, 64 MiB Chrome→host; first arg is caller origin; Windows passes `--parent-window=<handle>`; ports persist until destroyed.
- **"Connecting to a native application"**: Requires `"nativeMessaging"` permission; only extension pages/service worker (not content scripts); `runtime.connectNative()` returns a `runtime.Port`, or `runtime.sendNativeMessage()` for one-shot requests. Validate `sender.origin`/`sender.url` when forwarding from content scripts.
- **"Debug native messaging"**: `--enable-logging=stderr --log-level=1`; search `launch_context` and `native_messag`; common errors include host not found, forbidden origin, invalid name, and protocol/length mistakes (Windows `O_BINARY`).
  - *Key terms/entities:* `nativeMessaging`, native messaging host, `allowed_origins`, `runtime.connectNative()`, `runtime.sendNativeMessage()`, `runtime.Port`, `stdin`/`stdout`, 1 MB / 64 MiB limits, `--parent-window`, `launch_context.cc`, `O_BINARY`

### [Cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)

**Overview:** Explains origin rules for extension network access: extension pages/service worker can cross origins with host permissions, content scripts remain subject to the page's same-origin policy, and cross-origin requests require `host_permissions` per scheme/host.

**Sections:**
- **"Extension origin"**: `fetch()` within the extension origin needs no extra permission; requests to other origins are cross-origin and require host permissions. Content-script requests are always treated as cross-origin.
- **"Request cross-origin permissions"**: Add fully qualified hosts or match patterns under `"host_permissions"`; paths are ignored; `http` and `https` must be granted separately.
- **"Fetch() vs. XMLHttpRequest()"**: Prefer `fetch()`; `XMLHttpRequest` is supported outside the service worker but is legacy.
- **"Security considerations"**: Avoid `innerHTML`/XSS (use `JSON.parse`, `textContent`); never let a content script request an arbitrary URL — accept only narrow parameters and build the URL in the service worker; prefer HTTPS; if you customize `content_security_policy`, add `connect-src`/`default-src` hosts.
  - *Key terms/entities:* extension origin, same-origin policy, cross-origin request, `host_permissions`, match patterns, `fetch()`, `XMLHttpRequest`, `innerHTML`, `textContent`, `content_security_policy`, `connect-src`, `default-src`, HTTPS

### [Permission warning guidelines](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings)

**Overview:** Explains which permissions trigger install-time warnings, which combinations suppress warnings, best practices for minimizing them, and how to test the disable-until-accepted behavior when permissions change across updates.

**Sections:**
- **"Best practices"**: Request only permissions needed for the extension's single purpose; prefer optional permissions requested at runtime; use `"activeTab"`, which never shows a warning and grants temporary host access.
- **"View warnings"**: Use the Extension Update Testing Tool (Node/Chromium, `npm start`, localhost:8080) or manually pack the extension (`chrome://extensions` → Developer mode → **Pack Extension**, producing `.crx` + `.pem`) and install the `.crx`.
- **"Update permissions"**: Adding a warning-triggering permission can disable the extension until the user accepts; test by bumping the version, repacking with the same `.pem`, and installing over the old copy.
  - *Key terms/entities:* permission warnings, `<all_urls>`, `"tabs"`, `"activeTab"`, optional permissions, Extension Update Testing Tool, `chrome://extensions`, Pack Extension, `.crx`, `.pem`, update testing

### [Real-time updates in Extensions](https://developer.chrome.com/docs/extensions/develop/concepts/real-time)

**Overview:** Compares server-to-extension real-time transport options: Web Push (standards-based, wakes the service worker), legacy `browser.gcm` (FCM HTTP legacy API, no Topics), and WebSockets (bidirectional, active-connection heuristics). Includes scenario guidance and WebSocket limitations.

**Sections:**
- **"Common scenarios"**: Use Web Push for silent state sync and server-driven notifications, `browser.gcm` for broad messages including pre-Chrome-121 users, and WebSockets for frequent two-way messaging.
- **"Push notifications with the Push API"**: Any Push provider; delivery wakes a suspended service worker; usage matches the open web.
- **"Push notifications with browser.gcm"**: Direct FCM legacy connection; not deprecated in extensions but lacks Topics; prefer Web Push when possible.
- **"Real time messages with WebSockets"**: Works in content scripts, popups, side panels, and service workers, but cannot wake the extension for server-initiated pushes; an active WebSocket in the last 30 seconds prevents suspension, so send heartbeats to keep it alive.
  - *Key terms/entities:* Web Push, Push API, `browser.gcm`, Firebase Cloud Messaging (FCM), Topics, WebSockets, heartbeat, service-worker suspension, 30-second idle timer, `notifications` API

### [About extension service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)

**Overview:** Section hub for the extension service worker, the extension's central event handler. Contrasts it with web service workers: it is event-driven, can be unloaded, has no DOM access (use an offscreen document), responds to extension events, and is registered/updated through the manifest.

**Sections:**
- **"Extension service workers"** *(section intro; no H2 headings observed)*: Loaded on demand and dormant when idle; can [shut down](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle#idle-shutdown); handles standard service-worker events plus extension events (navigation, notification clicks, tab closes); conceptually replaces MV2 background scripts/pages.
  - **Child pages:** [Basics](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics) (registration, imports, environment), [Events](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events) (extension vs. web events), [Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) (install, startup, idle shutdown, persistence).
  - *Key terms/entities:* extension service worker, background script, event handler, `offscreen` document, `ServiceWorkerGlobalScope`, `background.service_worker`

### [Extension service worker basics](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)

**Overview:** Registration and module-loading rules for extension service workers: declare one file under `background.service_worker`, use `"type": "module"` with static `import` (dynamic `import()` and import assertions unsupported) or `importScripts()`, and ship updates through the Web Store.

**Sections:**
- **"Register service workers"**: Manifest `"background": { "service_worker": "service-worker.js" }`; do not call `navigator.serviceWorker.register()`.
- **"Import scripts"**: Add `"type": "module"` and use static `import`; `importScripts()` also works; dynamic `import()` is not supported.
- **"Update"**: Publish a new extension version (Web Store); MV3 forbids remotely hosted code, so the worker must be bundled.
  - *Key terms/entities:* `background.service_worker`, `"type": "module"`, `import`, `importScripts()`, dynamic `import()`, `manifest.json`, remotely hosted code

### [Events in service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events)

**Overview:** Which events an extension service worker can receive, and how to register them. Covers top-level registration, common extension events, event filters, and the service-worker-native `fetch`/`message` events and why they do not interoperate with extension messaging.

**Sections:**
- **"Declare extension events"**: Register listeners synchronously in the global scope (top level, not inside callbacks) so Chrome can dispatch events immediately after waking the worker.
- **"Common events"**: `browser.action`, `management`, `notifications`, `permissions`, `runtime`, `storage.onChanged`, and `webNavigation`; permission/version caveats apply.
- **"Filters"**: Use API event filters (e.g. `webNavigation.onCompleted` with `urlMatches`) instead of receiving every `tabs.onUpdated` event.
- **"Web service worker events"**: `ServiceWorkerGlobal.fetch` covers extension-package reads and extension/popup `fetch()`/`XMLHttpRequest` (not content-script requests; host permissions needed for cross-origin); `ServiceWorkerGlobal.message` is separate from `browser.runtime.onMessage` — prefer extension messaging.
  - *Key terms/entities:* top-level listener, `browser.action`, `management`, `notifications`, `permissions`, `runtime`, `storage.onChanged`, `webNavigation`, `events` filters, `urlMatches`, `ServiceWorkerGlobal.fetch`, `ServiceWorkerGlobal.message`, `runtime.onMessage`

### [The extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)

**Overview:** Lifecycle reference for extension service workers: install/update event order, startup, the 30-second idle / 5-minute request / 30-second fetch termination rules, why globals must be replaced with storage, and per-Chrome-version lifetime changes.

**Sections:**
- **"Installation"**: Order is `install` → `runtime.onInstalled` → `activate`; use `onInstalled` for one-time initialization (and check `details.reason`). Unlike web workers, `activate` fires immediately after install.
- **"Extension startup"**: `runtime.onStartup` fires when the profile starts; no service-worker events are invoked.
- **"Idle and shutdown"**: Terminated after 30s inactivity, when one request exceeds 5 minutes, or when a `fetch()` takes over 30s; events/API calls reset timers; an incoming event revives a dormant worker.
- **"Persist data rather than using global variables"**: Globals are lost on termination; use `browser.storage` (local/session/managed/sync), IndexedDB, or CacheStorage (Web Storage is unavailable).
- **"Choose a minimum Chrome version"**: Lifetime changes by version: Chrome 105 native messaging port keeps alive; 109 offscreen messages reset timers; 110 API calls reset timers; 114 long-lived messages keep alive; 116 WebSockets and prompt-based APIs extend limits; 118 debugger sessions keep alive; 120 alarms minimum 30s.
  - *Key terms/entities:* `install`, `runtime.onInstalled`, `activate`, `runtime.onStartup`, 30 seconds, 5 minutes, `fetch()` 30 seconds, `browser.storage`, IndexedDB, CacheStorage, `minimum_chrome_version`, `alarms`, `runtime.connectNative()`

### [Storage and cookies](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)

**Overview:** Explains how web storage and cookies behave in extensions: persistence across browsing-data clears, quotas/eviction and `"unlimitedStorage"`, service-worker limitations, storage partitioning exemptions, and cookie `Secure`/`SameSite`/partitioning rules.

**Sections:**
- **"Storage"**:
  - **"Persistence"**: Extension storage is not cleared with browsing data; normal quotas and eviction apply unless you request `"unlimitedStorage"` (exempts extension and web storage) or call `navigator.storage.persist()`. Storage is shared across the extension origin (worker, pages, offscreen), while content-script web storage belongs to the host page.
  - **"Access in service workers"**: IndexedDB and Cache Storage work; Local/Session Storage do not — use an offscreen document.
  - **"Partitioning"**: Chrome 115+ storage partitioning does not apply to embedded `chrome-extension://` pages, and an extension iframe with host permission for the embedded site grants top-level partition access.
- **"Cookies"**:
  - **"Secure cookies"**: `chrome-extension://` cannot set `Secure`, so it also cannot use `SameSite=None` or `Partitioned`.
  - **"Partitioning and SameSite behavior"**: Extension-origin cookies use `SameSite=Lax`; third-party cookies are not blocked in extension top-level pages; extension requests with host permission are treated as same-site for network requests (not `document.cookie`). `browser.cookies` can target a partition key.
  - *Key terms/entities:* `unlimitedStorage`, `navigator.storage.estimate()`, `navigator.storage.persist()`, IndexedDB, Cache Storage, Local Storage, Session Storage, offscreen document, storage partitioning, `SameSite=Lax`, `SameSite=None`, `Partitioned`, `Secure`, `browser.cookies`, partition key

---

## 3. UI Components & Surfaces

### [User interface components](https://developer.chrome.com/docs/extensions/develop/ui)

**Overview:** Catalog of extension UI surfaces with links to implementation guides and samples: actions and icons, badges, commands, context menus, omnibox, override pages, popups, side panels, tooltips, DevTools panels, notifications, themes, accessibility, and internationalization.

**Sections:**
- **"Actions"** / **"Action icons"** / **"Badges"** / **"Tooltips"**: Toolbar action behavior, icon/badge (`action.setBadgeText()`, `setBadgeBackgroundColor()`), and `"default_title"` tooltip.
- **"Commands"** / **"Context menu"** / **"Omnibox"**: Keyboard shortcuts via `commands`, context-menu items via `contextMenus`, and address-bar keyword suggestions via `omnibox`.
- **"Override pages"** / **"Popups"** / **"Side panels"**: Replace history/new-tab/bookmarks pages; `action.default_popup` and `action.openPopup()`; `sidePanel` attached per tab or window.
- **"DevTools"** / **"Notifications"** / **"Themes"**: Custom DevTools panels/recorder; extension or web Notifications API; theme packages with no JavaScript/HTML.
- **"Other ways of interacting with users"**: Accessibility (`develop/ui/a11y`) and internationalization (`develop/ui/i18n`).
  - *Key terms/entities:* `action`, `action.onClicked`, `action.setBadgeText()`, `action.openPopup()`, `commands`, `contextMenus`, `omnibox`, `chrome_url_overrides`, `action.default_popup`, `sidePanel`, `devtools.panels`, `notifications`, themes, accessibility, i18n

### [Make your extension accessible](https://developer.chrome.com/docs/extensions/develop/ui/a11y)

**Overview:** Baseline accessibility guidance for extension UI: high-contrast text, captions, `alt` text, native HTML controls, ARIA roles/states, and keyboard focus with `tabindex`. Links to the fuller accessibility how-to.

**Sections:**
- **"Accessibility basics"** *(no H2 headings observed)*: Prefer standard HTML controls (`button`, checkbox, radio, text, select, link); add ARIA attributes (`role`, `aria-activedescendant`) for custom controls; only anchors, buttons, and form controls are focusable by default — add `tabindex` to make other elements keyboard-focusable.
  - *Key terms/entities:* high contrast, captions, `alt`, native HTML controls, ARIA, `role="toolbar"`, `tabindex`, `aria-activedescendant`, [Support accessibility how-to](https://developer.chrome.com/docs/extensions/how-to/ui/a11y)

### [Add a popup](https://developer.chrome.com/docs/extensions/develop/ui/add-popup)

**Overview:** Implements an action popup: registers `action.default_popup` in the manifest, builds it as a normal HTML page with an external script, and can swap it at runtime with `action.setPopup()`. Popups close when focus leaves them.

**Sections:**
- **"Popup implementation"** *(no H2 headings observed)*: Manifest `"action": { "default_popup": "popup.html" }`; popup HTML may not inline JavaScript (`<script src="popup.js">`); open programmatically with `action.openPopup()`; choose a popup dynamically based on state (for example sign-in status) with `action.setPopup()`.
  - *Key terms/entities:* `action.default_popup`, `action.openPopup()`, `action.setPopup()`, `popup.html`, external script, Drink Water sample, focus-loss close behavior

### [Configure extension icons](https://developer.chrome.com/docs/extensions/develop/ui/configure-icons)

**Overview:** Declares extension icons in the manifest. Use square PNGs (BMP/GIF/ICO/JPEG also accepted; SVG is not supported for manifest icons); provide 16/32/48/128 px variants for favicons, Windows, the management page, install, and the Web Store.

**Sections:**
- **"Icon configuration"** *(no H2 headings observed)*: Manifest `"icons": { "16": ..., "32": ..., "48": ..., "128": ... }`; icons should be square to avoid distortion; Chrome generates a generic letter icon when none is supplied; follow Web Store icon best practices.
  - *Key terms/entities:* `icons`, 16x16, 32x32, 48x48, 128x128, PNG, SVG unsupported, square icons, generic icon fallback, Chrome Web Store image guidelines

### [Build a context menu](https://developer.chrome.com/docs/extensions/develop/ui/context-menu)

**Overview:** Implements right-click context-menu items: add the `"contextMenus"` permission, create items from the service worker with `contextMenus.create()`, optionally add 16x16 icons, and group multiple items under an automatic parent menu.

**Sections:**
- **"Context menu implementation"** *(no H2 headings observed)*: Declare `"permissions": ["contextMenus"]`; optionally `"icons"`; create items with `contextMenus.create({ id, title, type: "normal", contexts: ["selection"] })`; initialize in `runtime.onInstalled`; later update via `contextMenus.update()`/`remove()` (see API reference); handle clicks with `contextMenus.onClicked`.
  - *Key terms/entities:* `"contextMenus"`, `contextMenus.create()`, `contextMenus.onClicked`, `contextMenus.update()`, `contextMenus.remove()`, `runtime.onInstalled`, `contexts: ["selection"]`, `type: "normal"`, 16x16 icon, Global Google Search sample

### [Internationalize the interface](https://developer.chrome.com/docs/extensions/develop/ui/i18n)

**Overview:** Localizes extension UI with `browser.i18n`: create `_locales/<locale>/messages.json`, reference strings as `__MSG_key__` in the manifest and extension pages, and set `"default_locale"` in the manifest.

**Sections:**
- **"Localization setup"** *(no H2 headings observed)*: `_locales/en/messages.json`, `_locales/es/messages.json`; each entry has a key with `"message"` and optional `"description"`; use `__MSG_tooltip__` in place of literal text (e.g. `action.default_title`); declare `"default_locale": "en"`; see the localization message-formats page for substitution and plural rules.
  - *Key terms/entities:* `browser.i18n`, `_locales/`, `messages.json`, `__MSG_key__`, `default_locale`, `i18n.getMessage()`, [localization message formats](https://developer.chrome.com/docs/extensions/how-to/ui/localization-message-formats)

### [Notify users](https://developer.chrome.com/docs/extensions/develop/ui/notify-users)

**Overview:** Shows system-tray notifications from an extension: declare `"notifications"`, then call `notifications.create()` with a template (`basic`), icon, title, message, optional buttons, and priority. Example triggers notifications from an `alarms` listener.

**Sections:**
- **"Create notifications"** *(no H2 headings observed)*: Manifest `"permissions": ["notifications"]`; `browser.notifications.create({ type: "basic", iconUrl, title, message, buttons, priority })`; handle interaction with `notifications.onClicked`/`onButtonClicked`/`onClosed` (see API reference); the Drink Water sample clears the action badge and creates the notification from `alarms.onAlarm`.
  - *Key terms/entities:* `"notifications"`, `notifications.create()`, `type: "basic"`, `iconUrl`, `buttons`, `priority`, `notifications.onClicked`, `notifications.onButtonClicked`, `alarms.onAlarm`, Drink Water sample

### [Trigger actions from the omnibox](https://developer.chrome.com/docs/extensions/develop/ui/omnibox-triggers)

**Overview:** Registers an omnibox keyword and handles user input. The sample uses keyword `nt` to activate the extension, then `omnibox.onInputEntered` opens a Google search in a new tab with the encoded query.

**Sections:**
- **"Omnibox keyword"** *(no H2 headings observed)*: Declare `"omnibox": { "keyword": "nt" }` in the manifest; supply a 16x16 icon shown in the address bar; handle `omnibox.onInputEntered` and open results with `tabs.create()`; use `omnibox.setDefaultSuggestion()` and `onInputChanged` for live suggestions (see API reference).
  - *Key terms/entities:* `omnibox`, `"keyword"`, 16x16 icon, `omnibox.onInputEntered`, `encodeURIComponent()`, `tabs.create()`, `omnibox.setDefaultSuggestion()`, `omnibox.onInputChanged`, Omnibox New Tab Search sample

### [Give users options](https://developer.chrome.com/docs/extensions/develop/ui/options-page)

**Overview:** Builds an extension options page: HTML/JS backed by `storage.sync`, declared either as a full page (`options_page`) or embedded in `chrome://extensions` (`options_ui` with `open_in_tab: false`), plus the behavioral differences of embedded options.

**Sections:**
- **"Locating the options page"** / **"Write the options page"**: Users open it from the extension's context menu or `chrome://extensions` → Details; pages can deep-link with [`runtime.openOptionsPage()`](https://developer.chrome.com/docs/extensions/reference/api/runtime#method-openOptionsPage); the sample uses `storage.sync` with the `"storage"` permission and a `DOMContentLoaded` restore.
- **"Declare options page behavior"**: Full page via `"options_page": "options.html"`; embedded via `"options_ui": { "page", "open_in_tab": false }`.
- **"Consider the differences"**: Embedded pages cannot use the Tabs API — use `runtime.connect()`/`sendMessage()`; `MessageSender.tab` is unset and `sender.url` is the options URL; set fixed minimum dimensions for content that depends on viewport size.
  - *Key terms/entities:* `options_page`, `options_ui`, `open_in_tab`, `runtime.openOptionsPage()`, `storage.sync`, `"storage"`, `MessageSender.tab`, `MessageSender.url`, `runtime.connect()`, `runtime.sendMessage()`, embedded options

### [Override Chrome pages](https://developer.chrome.com/docs/extensions/develop/ui/override-chrome-pages)

**Overview:** Replaces one built-in Chrome page (Bookmark Manager, History, or New Tab) with a bundled HTML page via `chrome_url_overrides`. Covers incognito restrictions, the manifest declaration, and performance/UX best practices.

**Sections:**
- **"Incognito window behavior"**: New Tab cannot be overridden in incognito; other override pages work when `incognito` is `"split"`; see user-privacy § incognito data handling.
- **"Manifest"**: `"chrome_url_overrides": { "bookmarks" | "history" | "newtab": "myPage.html" }`; each extension may override only one page.
- **"Best practices"**: Keep the page fast/small, avoid synchronous database access, prefer `fetch()` over `XMLHttpRequest()`, set a `<title>`, expect address-bar focus on new tabs, and make the page visibly custom.
  - *Key terms/entities:* `chrome_url_overrides`, `bookmarks`, `history`, `newtab`, `chrome://bookmarks`, `chrome://history`, `chrome://newtab`, `incognito: "split"`, override samples, `<title>`, `fetch()`

### [Respond to commands](https://developer.chrome.com/docs/extensions/develop/ui/respond-to-commands)

**Overview:** Defines keyboard shortcuts in the `"commands"` manifest key and handles them in the service worker with `commands.onCommand`. Shows per-platform `suggested_key` (`default` vs `mac`) and dispatching an action such as opening a tab.

**Sections:**
- **"Commands implementation"** *(no H2 headings observed)*: Manifest `"commands": { "<name>": { "suggested_key": { "default": "Ctrl+Shift+Z", "mac": "Command+Shift+Z" }, "description": "..." } }`; listen with `commands.onCommand`, compare the command name, and perform the action (e.g. `tabs.create()`); the Tab Flipper sample demonstrates a command.
  - *Key terms/entities:* `commands`, `suggested_key`, `default`, `mac`, `commands.onCommand`, `tabs.create()`, Tab Flipper sample, [load unpacked](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

### [What are themes?](https://developer.chrome.com/docs/extensions/develop/ui/themes)

**Overview:** Themes are special extensions that change the browser's appearance. They are packaged like extensions but contain no JavaScript or HTML; the manifest `"theme"` object defines images, RGB colors, HSL tints, and display properties.

**Sections:**
- **"Manifest"**: Example `"theme": { "images", "colors", "tints", "properties" }`.
  - **"colors"**: RGB triples; supported keys follow `kOverwritableColorTable` (e.g. `frame`, `toolbar`, `ntp_text`, `ntp_link`, `ntp_section`, `button_background`).
  - **"images"**: Paths relative to the extension root; override `kPersistingImages` keys (e.g. `theme_frame`, `theme_toolbar`, `theme_ntp_background`, `theme_ntp_attribution`); PNG only.
  - **"properties"**: Background alignment/repeat and alternate logo via `kDisplayProperties`.
  - **"tints"**: HSL floats (0–1) or `-1.0` for no change, applied to buttons/frame/background tab via `kTintTable`.
  - *Key terms/entities:* `"theme"`, `theme.images`, `theme.colors`, `theme.tints`, `theme.properties`, `theme_frame`, `theme_ntp_background`, `kOverwritableColorTable`, `kPersistingImages`, `kDisplayProperties`, `kTintTable`, HSL, Chrome Web Store theme category

### [Create a side panel](https://developer.chrome.com/docs/extensions/develop/ui/create-a-side-panel)

**Overview:** Short entry point to the Side Panel API: extensions can display their own UI in Chrome's side panel, keep it open across tab navigation when configured, and restrict it to specific sites. The Dictionary example opens definitions from a word context menu.

**Sections:**
- **"Side panel overview"** *(no H2 headings observed; page is a short pointer)*: The practical implementation, options, and samples live on the [Side Panel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel); this page only introduces the surface and the Dictionary sample.
  - *Key terms/entities:* `sidePanel`, side panel, Dictionary sample, per-tab vs. global panel, site restrictions, `sidePanel.setOptions()`, `sidePanel.open()`

---

## 4. How-to Guides

### [How to](https://developer.chrome.com/docs/extensions/how-to)

**Overview:** Landing index for the task-focused How-to tree — short recipes for specific extension development jobs. It separates beginners (Getting Started tutorials) and concept readers (Develop guide) from task pages, then groups every how-to article into six categories.

**Sections:**
- **"How to..."** *(anchor unverified)*: Routing note pointing beginners to `/get-started` tutorials and anyone needing conceptual background to the Develop guide before using the recipes.
- **"Categories"** *(anchor unverified)*: Six groups — Design the user interface (accessibility, favicons, localization, notifications, DevTools); Use the web platform (ChromeOS file handling, geolocation, screen capture, WebSockets, WebHID, WebUSB, real-time updates, origin trials); Integrate external APIs (Google Analytics 4, OAuth 2.0); Protect privacy and stay secure (`eval()` in sandboxed iframes); Distribute for enterprise and Linux users (self-hosting, alternate install methods); Test and debug (Puppeteer, end-to-end tests, unit tests).
  - *Key terms/entities:* `/how-to/ui/a11y`, `/how-to/web-platform/webhid`, `/how-to/web-platform/webusb`, `/how-to/web-platform/origin-trials`, `/how-to/integrate/oauth`, `/how-to/security/sandboxing-eval`, `/how-to/distribute/host-extensions`, `/how-to/test/puppeteer`, sandboxed iframe

### [Extend DevTools](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools)

**Overview:** How to add a DevTools page so an extension can create DevTools panels and sidebar panes, inspect the inspected window, and read network, Recorder, and Performance data. Also documents the `devtools_page` manifest field, the Chrome 152 `browser` namespace change, and component-to-component messaging.

**Sections:**
- **"The DevTools page"** *(anchor unverified)*: One instance per open DevTools window, alive while that window is open; it can use `devtools.panels`, `devtools.inspectedWindow`, `devtools.network`, `devtools.recorder`, and `devtools.performance`, plus direct extension API access.
- **"Create a DevTools extension"** *(anchor unverified)*: Declare `"devtools_page": "devtools.html"` (relative URL recommended); the APIs are unavailable to content scripts and other extension pages.
- **"The browser namespace and DevTools extensions"** *(anchor unverified)*: Chrome 152+ enables `browser` for these extensions; earlier versions disabled it extension-wide because `browser.devtools.*` was callback-only and `webextension-polyfill` no-ops when `browser` exists — also suppressing Chrome 148 `runtime.onMessage` Promise responses.
- **"DevTools UI elements: panels and sidebar panes"** *(anchor unverified)*: `panels.create()`; `elements.createSidebarPane()` with `setPage()`, `setObject()` (JSON only), or `setExpression()` (evaluated in the inspected page).
- **"Communicate between extension components"** *(anchor unverified)*: `scripting.executeScript()` targeting `inspectedWindow.tabId`; `inspectedWindow.eval()` with `useContentScriptContext: true` and `$0`; `panel.onShown` exposes the panel `window` for `postMessage()`; count `runtime.onConnect` ports to detect open/close.
  - *Key terms/entities:* `devtools_page`, `devtools.panels`, `devtools.inspectedWindow.tabId`, `devtools.network`, `devtools.recorder`, `devtools.performance`, `browser` namespace, `webextension-polyfill`, `createSidebarPane()`, `useContentScriptContext`

### [Distribute your extension](https://developer.chrome.com/docs/extensions/how-to/distribute)

**Overview:** Reference page for the only two officially supported extension distribution mechanisms — Chrome Web Store publishing and self-hosting — and for the constraint that unpacked loading is a development-only path. Explains who can install what, and that Chrome polls extension hosts for new versions and auto-updates without user intervention.

**Sections:**
- **"Distribution options"** *(no H2 headings observed)*: For personal use, load the extension unpacked (trusted code only). Otherwise: **Chrome Web Store** (register to publish worldwide; only extensions hosted on and signed by the store can be directly installed by users) or **Self-hosting** outside the store, available only in managed environments where admins control Chrome through enterprise policies. Windows/macOS self-hosted installs require policies; Linux users can manually install packed extensions not distributed or signed by the store.
  - *Key terms/entities:* load unpacked, Chrome Web Store, self-hosting, enterprise policies, signed extensions, packed extension, Linux, Windows, macOS, automatic updates, `chromeenterprise.google/policies`

### [Self-host for Linux](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux)

**Overview:** Linux is the only platform where Chrome users can install extensions hosted outside the Chrome Web Store. This guide covers packaging an extension directory into a `.crx`, serving it with headers Chrome recognizes as installable, and publishing an auto-update manifest XML. The "Self-host an extension" nav link (`/how-to/distribute/host-extensions`) redirects to this page.

**Sections:**
- **"Package"** *(anchor unverified)*: Download a store-signed `main.crx` from the Developer Dashboard, or pack locally at `chrome://extensions` → **Developer mode** → **PACK EXTENSION**, which emits a `.crx` plus a `.pem` private key you must keep to ship updates. CLI equivalent: `chrome.exe --pack-extension` with `--pack-extension-key`.
- **"Host"** *(anchor unverified)*: Installable if the content type is `application/x-chrome-extension`, or the file ends in `.crx` and is served without `X-Content-Type-Options: nosniff` as `text/plain`, `application/octet-stream`, `application/unknown`, `unknown/unknown`, `*/*`, or empty.
- **[Update](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux#update)**: `update_url` in `manifest.json` returns a `gupdate` XML manifest with `appid`, `codebase`, `version`, and optional `prodversionmin`; polled every few hours, never with cookies, and updates must use the same private key. `?x=id%3D…%26v%3D…` lets one endpoint serve many extensions.
  - *Key terms/entities:* `.crx`, `.pem`, `chrome://extensions`, `--pack-extension`, `--pack-extension-key`, `X-Content-Type-Options: nosniff`, `application/x-chrome-extension`, `update_url`, `gupdate`, `appid`, `codebase`, `prodversionmin`

### [Use alternate installation methods](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions)

**Overview:** Documents the two external install flows used when another installer or an administrator must provision an extension: a preferences JSON file (macOS and Linux) and the Windows registry. Covers required `update_url` values, per-platform paths, locale filtering, updates, uninstall, and the common mistakes that break each flow.

**Sections:**
- **"Before you begin"** *(anchor unverified)*: Both flows key off the extension ID plus an `update_url`; Windows and macOS require `https://clients2.google.com/service/update2/crx` and show a confirmation dialog — local CRX external installs were blocked in Chrome 33 (Windows) and Chrome 44 (macOS). Linux also accepts `external_crx` + `external_version` and installs silently.
- **"Use a preferences file"** *(anchor unverified)*: `<extension-id>.json` in `~/Library/Application Support/Google/Chrome/External Extensions/` (macOS, `/Library/...` for all users) or `/opt/google/chrome/extensions/` and `/usr/share/google-chrome/extensions/` (Linux); fields `external_update_url`, `external_crx`, `external_version`, `supported_locales`.
- **"Use the Windows registry"** *(anchor unverified)*: `HKEY_LOCAL_MACHINE\Software\Google\Chrome\Extensions\<id>`, or `\Software\Wow6432Node\...` on 64-bit, with an `update_url` string value.
- **"Updating and uninstalling"** / **"FAQ"** *(anchor unverified)*: Entries are rescanned at every browser start; delete the JSON file or registry key to uninstall; a user-initiated UI uninstall blocklists the extension; frequent errors are JSON syntax, wrong ID/path, and unescaped UNC paths.
  - *Key terms/entities:* `external_update_url`, `external_crx`, `external_version`, `supported_locales`, `clients2.google.com/service/update2/crx`, `HKEY_LOCAL_MACHINE\Software\Google\Chrome\Extensions`, `Wow6432Node`, `chrome://extensions`, blocklist

### [Push messaging with browser.gcm](https://developer.chrome.com/docs/extensions/how-to/integrate/chrome.gcm)

**Overview:** Walkthrough for pushing server messages to an extension with the legacy `browser.gcm` API, which is built on Firebase Cloud Messaging and therefore needs a Firebase project and numeric Sender ID. Warns that the web-standard Push API is preferred over this decade-old extension-specific API.

**Sections:**
- **"Prerequisites"** *(anchor unverified)*: Create a Firebase account, pick or create a console project, open the Cloud Messaging settings page, copy the numeric Sender ID, and enable the Firebase Cloud Messaging API in Google Cloud if it is not already on.
- **"Configure browser.gcm"** *(anchor unverified)*: Add `"gcm"` to the manifest `permissions` array, then register for push messages with `browser.gcm.register` and the Sender ID.
- **"Listen for messages"** *(anchor unverified)*: Add handler code to process incoming messages after registration.
- **"On Channels and Topics"** *(anchor unverified)*: Legacy Firebase messaging has no channels — every message reaches every client, so filter client-side or create one project/Sender ID per channel (an extension may register up to 100 Sender IDs); usage past the free tier is billed.
  - *Key terms/entities:* `browser.gcm`, `browser.gcm.register`, `"gcm"` permission, Firebase Cloud Messaging, Sender ID, `manifest.json`, Push API, channels/topics, 100 Sender IDs

### [Use Google Analytics 4](https://developer.chrome.com/docs/extensions/how-to/integrate/google-analytics-4)

**Overview:** Tutorial for measuring extension usage with GA4 now that Manifest V3 forbids remotely hosted code: instead of `gtag.js`, events go straight to Google Analytics with the Measurement Protocol, including from the service worker. Covers credentials, stable client/session IDs, page views, error logging, and debugging.

**Sections:**
- **"Requirements"** *(anchor unverified)*: Extension authoring experience plus a Google Analytics account; the Website URL field can be any placeholder because an extension has no URL of its own.
- **"Use the Google Analytics Measurement Protocol"** *(anchor unverified)*: Create a **Web data stream** (Measurement ID like `G-XXXXXXXXXX`) and a Measurement Protocol API secret — the GA4 account needs Editor or Administrator role. Some data, such as geolocation, is not collected.
- **"Generate a `client_id`"** *(anchor unverified)*: Persist a `<number>.<number>` ID in `browser.storage.local` (requires the `"storage"` permission) so it stays stable while the extension is installed.
- **"Send an analytics event"** / **"Use recommended parameters `session_id` and `engagement_time_msec`"** *(anchor unverified)*: `fetch` POST to `https://www.google-analytics.com/mp/collect?measurement_id=…&api_secret=…` with an `events` array; Realtime reports additionally need `session_id` (30-minute inactivity expiry tracked in `browser.storage.session`) and `engagement_time_msec` (fallback `100`).
- **"Track page views in popup, side panel, and extension pages"** / **"Track analytics events in service workers"** / **"Debugging"** *(anchor unverified)*: `page_view` needs `page_title` and `page_location`; log `unhandledrejection` as `extension_error` because `error` is a reserved name; validate events against `https://www.google-analytics.com/debug/mp/collect`.
  - *Key terms/entities:* `measurement_id`, `api_secret`, `G-XXXXXXXXXX`, `client_id`, `session_id`, `engagement_time_msec`, `page_view`, `browser.storage.local`, `browser.storage.session`, `unhandledrejection`, `/mp/collect`, `/debug/mp/collect`

### [Use OAuth 2.0 to authenticate users with Google](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)

**Overview:** End-to-end OAuth 2.0 tutorial: extensions cannot use HTTPS redirects or cookies, so authorization goes through the Chrome Identity API rather than a web OAuth redirect flow. Builds "FriendBlock", which lists Google Contacts photos from the People API using a bearer token.

**Sections:**
- **"Keep a consistent extension ID"** *(anchor unverified)*: Upload a `.zip` to the Chrome Developer Dashboard without publishing → **Package** → **View public key**, strip the newlines, and paste the value into the manifest `"key"` field so unpacked and published builds share one ID; confirm against `chrome://extensions`.
- **"Create an OAuth client ID"** *(anchor unverified)*: Google API console → **Create Client** → application type **Chrome Extension**, with the extension ID as the Item ID.
- **"Register OAuth in the manifest"** *(anchor unverified)*: `"oauth2": { "client_id": "…apps.googleusercontent.com", "scopes": […] }`, initially `https://www.googleapis.com/auth/userinfo.email`.
- **"Initiate first OAuth flow"** *(anchor unverified)*: Declare the `"identity"` permission, then call `browser.identity.getAuthToken({interactive: true}, callback)` from a popup/extension page to obtain a token.
- **"Enable the Google People API"** / **"Create the first API request"** / **"Block faces"** *(anchor unverified)*: Enable the People API, add the `contacts.readonly` scope, create an API key, then `fetch` `https://people.googleapis.com/v1/contactGroups/all?maxMembers=20&key=API_KEY` with `Authorization: Bearer <token>`, read `memberResourceNames`, and request `personFields=photos`.
  - *Key terms/entities:* `oauth2.client_id`, `oauth2.scopes`, `"identity"` permission, `browser.identity.getAuthToken()`, `"key"`, `contacts.readonly`, `people.googleapis.com/v1/contactGroups/all`, `memberResourceNames`, `personFields=photos`

### [Use Web Push in extensions](https://developer.chrome.com/docs/extensions/how-to/integrate/web-push)

**Overview:** Shows how to receive server push in an extension with the standard Push API: a push wakes a suspended service worker and is processed exactly as on the open web, but extensions declare the `notifications` permission instead of showing a runtime permission prompt.

**Sections:**
- **"Push API in extensions"** *(no H2 headings observed)*: Add `"notifications"` to `permissions` — without it every `registration.pushManager` call fails as if the user denied, the permission raises an install warning, and existing installs stay disabled until the user approves. A push **provider** (any SDK that runs in a service worker, or a self-hosted `web-push` backend) sends through the push **service**, which is Firebase Cloud Messaging for Chrome. Subscribe with `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` after converting the VAPID key via `urlB64ToUint8Array()`, then handle `self.addEventListener('push', …)`. Chrome 121+ also accepts `userVisibleOnly: false` for silent pushes; before that a visible notification was mandatory.
  - *Key terms/entities:* `notifications` permission, `registration.pushManager`, `pushManager.subscribe()`, `userVisibleOnly`, `applicationServerKey`, VAPID, `PushSubscription`, `urlB64ToUint8Array()`, `web-push`, Firebase Cloud Messaging, Chrome 121, permission warning

### [Use eval() in sandboxed iframes](https://developer.chrome.com/docs/extensions/how-to/security/sandboxing-eval)

**Overview:** Explains how to keep `eval()`-dependent libraries (templating engines using `new Function()`, for example) working under the extension CSP without exposing the high-permission extension environment. Sandboxed pages run in a unique origin with no `browser.*` API access and talk to the extension only through `postMessage()`.

**Sections:**
- **"Why sandbox?"** *(anchor unverified)*: `eval` is dangerous in an extension because executed code inherits every powerful `browser.*` API; a sandboxed page is moved to a unique origin and denied those APIs. An `iframe` plus a message round-trip is enough to run the library and return a result.
- **"Create and use a sandbox"** *(anchor unverified)*: List each file under `"sandbox": { "pages": ["sandbox.html"] }` (easy to forget), load it in an `iframe`, then `contentWindow.postMessage()` a `{command, templateName, context}` object; the sandbox replies with `event.source.postMessage({result}, event.origin)`. Only serializable data crosses the boundary — functions cannot. Inserting the returned HTML with `innerHTML` is safe because it was rendered inside the sandbox.
  - *Key terms/entities:* `sandbox.pages`, `sandbox.html`, `new Function()`, `Handlebars.compile`, `postMessage()`, `contentWindow`, `event.source`, `event.origin`, unique origin, `innerHTML`, CSP, `addEventListener`

### [Build end-to-end tests](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)

**Overview:** Overview of end-to-end testing for extensions — building and loading the package into a real browser, then driving user flows with an automation library. Lists the supported tools and the extension-specific problems they must solve: headless loading, fixed IDs, popup access, and service-worker inspection.

**Sections:**
- **"Using browser testing libraries"** *(anchor unverified)*: Puppeteer and Playwright have dedicated extension guides; Selenium loads extensions via the `ChromeOptions` object; WebDriverIO documents Web Extension Testing.
- **"Running tests in headless Chrome"** *(anchor unverified)*: Start Chrome with `--headless=new`; the old headless mode cannot load extensions, and some tools add the flag automatically.
- **"Setting an extension ID"** *(anchor unverified)*: Pin the ID with the manifest `key` field so tests can allow-list `chrome-extension://<id>` origins and open extension pages.
- **"Testing extension pages"** / **"Testing an extension popup"** *(anchor unverified)*: Navigate directly to `chrome-extension://<id>/index.html`; open popups with `action.openPopup()` where supported, otherwise load the popup URL in a tab and add a `popup.html?tab=5` override using `browser.tabs.get()`.
- **"Inspecting extension state"** / **"Testing service worker termination"** *(anchor unverified)*: Prefer user-visible assertions; when internal data is needed, evaluate in the worker (Puppeteer `workerTarget.worker()` → `worker.evaluate()`) or in an extension page (Selenium `executeAsyncScript`). Selenium's ChromeDriver attaches a debugger, so service workers never terminate there.
  - *Key terms/entities:* Puppeteer, Playwright, Selenium `ChromeOptions`, WebDriverIO, `--headless=new`, manifest `key`, `chrome-extension://<id>/index.html`, `action.openPopup()`, `workerTarget.worker()`, `executeAsyncScript`, ChromeDriver

### [Test Chrome Extensions with Puppeteer](https://developer.chrome.com/docs/extensions/how-to/test/puppeteer)

**Overview:** Step-by-step Puppeteer plus Jest tutorial that launches Chrome with an unpacked extension loaded and asserts on what its popup renders. Uses the `history` API sample as the system under test and shows how a test can drive the extension service worker directly.

**Sections:**
- **"Before you start"** *(anchor unverified)*: Clone `GoogleChrome/chrome-extensions-samples` and target `api-samples/history/showHistory`; install Node.js, the runtime Puppeteer is built on.
- **"Writing your test"** *(anchor unverified)*: Nine steps — create `package.json`, run `npm install puppeteer jest`, scaffold `index.test.js` on Jest's `beforeEach`/`afterEach`, and launch with `puppeteer.launch({ headless: false, pipe: true, enableExtensions: [EXTENSION_PATH] })`. Then `browser.waitForTarget()` for the `service_worker` target ending in `service-worker.js`, get `workerTarget.worker()`, call `worker.evaluate('browser.action.openPopup();')`, await the `popup.html` page target, `popupTarget.asPage()`, and assert `expect(children.length).toBe(1)`. Add `"start": "jest ."` and run `npm start`; use `headless: 'new'` outside development.
- **"Next Steps"** *(anchor unverified)*: Build a suite for your own extension and consult the Puppeteer API reference.
  - *Key terms/entities:* `puppeteer.launch()`, `enableExtensions`, `pipe: true`, `headless: 'new'`, `browser.waitForTarget()`, `service_worker`, `workerTarget.worker()`, `worker.evaluate()`, `browser.action.openPopup()`, `popupTarget.asPage()`, `jest .`

### [Test service worker termination with Puppeteer](https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer)

**Overview:** Teaches how to make an extension resilient to service-worker termination by reproducing the termination inside a test: a Puppeteer helper closes the extension's worker mid-test, exposing state held in globals, then the worker is refactored to persist data in `browser.storage.local`.

**Sections:**
- **"Before you start"** / **"Step 1: Start your Node.js project"** *(anchor unverified)*: Clone `chrome-extensions-samples`, use `functional-samples/tutorial.terminate-sw/test-extension`, install Node.js, and scaffold a Jest suite whose `puppeteer.launch({ headless: false, pipe: true, enableExtensions: [EXTENSION_PATH] })` loads the extension. Requires Puppeteer v22.1.0+ for `WebWorker.close()`.
- **"Step 3: Write a basic test"** / **"Step 4: Terminate the service worker"** / **"Step 5: Run your test"** *(anchor unverified)*: Open `chrome-extension://${EXTENSION_ID}/page.html`, click the button, and await `#response-0`; then `stopServiceWorker(browser, extensionId)` — `browser.waitForTarget()` for the `service_worker` target, `target.worker()`, `await worker.close()`. Clicking again and awaiting `#response-1` fails because the worker answered from a module-scope `data` variable set in `browser.runtime.onInstalled`.
- **"Step 6: Fix the service worker"** / **"Step 7: Run your test again"** / **"Next steps"** *(anchor unverified)*: Persist with `browser.storage.local.set({version})` in `onInstalled`, read it asynchronously in `onMessage`, and `return true` so `sendResponse` stays alive; rerun `npm start`. Consider random termination points and lint rules banning globals.
  - *Key terms/entities:* `worker.close()`, `stopServiceWorker()`, `browser.waitForTarget()`, `service_worker`, `browser.runtime.onInstalled`, `browser.runtime.onMessage`, `browser.storage.local`, `return true`, `#response-0`, `#response-1`, Puppeteer v22.1.0

### [Write unit tests](https://developer.chrome.com/docs/extensions/how-to/test/unit-testing)

**Overview:** Short guide to unit-testing extension code in isolation, outside the browser, with Jest. Recommends dependency injection to keep the `chrome`/`browser` namespace out of low-level code, and mocks when a test must touch extension APIs anyway.

**Sections:**
- **"Example: Using mocks with Jest"** *(anchor unverified)*: Declare `jest.config.js` with `setupFiles: ['<rootDir>/mock-extension-apis.js']`, define stubs such as `global.chrome = { tabs: { query: async () => { throw new Error("Unimplemented.") } } }`, then override per test with `jest.spyOn(browser.tabs, "query").mockResolvedValue([...])` and assert via `expect(await getActiveTabId()).toBe(3)`.
- **"Next steps"** *(anchor unverified)*: Complement unit tests with end-to-end coverage; the Puppeteer testing tutorial is the recommended follow-up.
  - *Key terms/entities:* `jest.config.js`, `setupFiles`, `mock-extension-apis.js`, `global.chrome`, `jest.spyOn()`, `mockResolvedValue()`, `expect().toBe()`, dependency injection, Jest

### [Support accessibility](https://developer.chrome.com/docs/extensions/how-to/ui/a11y)

**Overview:** Practical accessibility checklist for extension UI: keyboard-operable controls, screen-reader semantics for custom widgets, and readable content. Aimed at developers building popups, side panels, and options pages, arguing that accessibility benefits low-dexterity and power users too.

**Sections:**
- **"Integrate accessible UI controls"** *(anchor unverified)*: Prefer standard HTML controls, which are keyboard accessible and understood by screen readers; for custom widgets add WAI-ARIA roles, states, and properties (a `role="toolbar"` with `aria-activedescendant="button1"`) and manage focus with `tabIndex = 0` (joins the tab order) or `-1` (programmatic focus via `element.focus()` only).
- **"Support keyboard access"** *(anchor unverified)*: Every surface, popups included, must work without a mouse; do not let heavy CSS suppress the focus outline, handle `keydown` (keycodes 13/37/39) while updating `aria-activedescendant`, and document shortcuts on the options page.
- **"Provide accessible content"** *(anchor unverified)*: Pass the 200% zoom/text test, avoid baking text into images (use web fonts), verify color contrast and color-blind rendering, caption audio and video, and write purpose-based `alt` text — `alt=""` for decorative images.
- **"Learn more"** *(anchor unverified)*: A11ycasts video series and the Chromium accessibility technical documentation.
  - *Key terms/entities:* WAI-ARIA, `role="toolbar"`, `aria-activedescendant`, `tabindex="0"`, `tabIndex = -1`, `element.focus()`, 200% test, `alt` text, contrast checker, A11ycasts

### [Use favicons](https://developer.chrome.com/docs/extensions/how-to/ui/favicons)

**Overview:** Explains the Manifest V3 favicon API: icons are served from the extension's own `_favicon/` URL instead of reading `tabs` metadata, so a site's icon can be rendered in a popup, side panel, or injected content script. Includes the permission warning and web-accessible-resource requirements.

**Sections:**
- **"Accessing a website's favicon"** *(anchor unverified)*: Build `chrome-extension://EXTENSION_ID/_favicon/?pageUrl=EXAMPLE_URL&size=FAV_SIZE`, where `FAV_SIZE` is most commonly 16×16 pixels.
- **"Step 1: update the manifest"** *(anchor unverified)*: Add `"favicon"` to `permissions`; it triggers an install warning unless paired with a permission that supersedes it, such as `"tabs"`. To use the icon from a content script, list `"_favicon/*"` in `web_accessible_resources` with `matches` and `extension_ids`.
- **"Step 2: construct the URL"** *(anchor unverified)*: `new URL(browser.runtime.getURL("/_favicon/"))`, then `url.searchParams.set("pageUrl", u)` and `set("size", "32")`, and assign the result to `img.src`.
- **"Extension examples"** *(anchor unverified)*: Favicon popup and favicon content-script samples in `chrome-extensions-samples`.
  - *Key terms/entities:* `_favicon/`, `pageUrl`, `size`, `"favicon"` permission, `"tabs"` permission, `web_accessible_resources`, `runtime.getURL()`, `URLSearchParams`, permission warning

### [Localize your extension](https://developer.chrome.com/docs/extensions/how-to/ui/localization-message-formats)

**Overview:** Format reference for `_locales/<locale>/messages.json`, the file that supplies every translated string. Defines each field, how message names map to `__MSG_name__` and `i18n.getMessage()`, and how placeholders and substitution strings are written.

**Sections:**
- **"Field summary"** *(anchor unverified)*: Each top-level key is a message name whose object requires only `message`; `description` and `placeholders` (with `content` and `example`) are optional.
- **[Example](https://developer.chrome.com/docs/extensions/how-to/ui/localization-message-formats#example)**: Three messages — `prompt_for_name`, `hello` (`"Hello, $USER$"` with `placeholders.user.content = "$1"`, `example: "Cira"`), and `bye` (two placeholders, one literal `Example.com`).
- **"Field details"** *(anchor unverified)*: `name` is a case-insensitive key limited to `A-Z a-z 0-9 _ @`, and names starting with `@@` are reserved for predefined messages. `message` embeds `$PLACEHOLDER_NAME$` case-insensitively, escapes a literal dollar as `$$`, and may also use `$1`–`$n` substitution strings. `description` gives translators context; `placeholders.content` holds a literal or `$1` (an undefined substitution yields an empty string) and `example` shows translator-facing output.
  - *Key terms/entities:* `messages.json`, `__MSG_name__`, `i18n.getMessage()`, `message`, `description`, `placeholders`, `content`, `example`, `$1`, `$$`, `@@` predefined messages

### [Use the Notifications API](https://developer.chrome.com/docs/extensions/how-to/ui/notifications)

**Overview:** Guide to rich notifications in the system tray via `browser.notifications`: the four templates, how priority and action buttons behave per platform, the `create()` call shape, and how to react to user clicks. Notes that macOS renders notifications through its native system instead of Chrome's.

**Sections:**
- **"How they look"** *(anchor unverified)*: Four templates — `basic`, `image`, `list`, `progress` — all carrying `title`, `message`, a small icon, and an optional `contextMessage` shown in a lighter font as a third text field.
- **"How they behave"** *(anchor unverified)*: ChromeOS keeps notifications in the tray with a new-item count until dismissed. `priority` ranges -2 to 2 (default 0): values below 0 appear only in the ChromeOS notification center and error elsewhere, higher values linger longer, and priority does not reorder macOS notifications. Every type supports up to two action items.
- **"How to develop them"** *(anchor unverified)*: `await browser.notifications.create(id, options)`, where `NotificationOptions` requires a `TemplateType` plus `title`, `message`, `iconUrl`; `image` adds `imageUrl` (not shown on macOS), `list` adds `items` (only the first shows on macOS), and `progress` adds `progress`.
- **[Create progress notification](https://developer.chrome.com/docs/extensions/how-to/ui/notifications#progress)**: `type: "progress"` with `progress` from 0 to 100; macOS shows a percentage in the title.
- **"Listen for and respond to events"** *(anchor unverified)*: Register `notifications.onButtonClicked.addListener()` in the service worker so notifications still respond when the extension is not running.
  - *Key terms/entities:* `browser.notifications`, `notifications.create()`, `NotificationOptions`, `TemplateType`, `iconUrl`, `contextMessage`, `priority`, `imageUrl`, `items`, `progress`, `notifications.onButtonClicked`

### [Handle files on Chrome OS](https://developer.chrome.com/docs/extensions/how-to/web-platform/file-handling-chromeos)

**Overview:** Shows how a ChromeOS extension registers as a file handler so users can open supported file types from the Files app's **Open** and **Open with** menus, then receives the file through the web platform Launch Handler API. Availability is limited to ChromeOS 120 and later.

**Sections:**
- **"Availability in extensions"** *(anchor unverified)*: ChromeOS 120 or later only.
- **"Permissions"** *(anchor unverified)*: No permissions are required for file handling.
- **"Manifest"** *(anchor unverified)*: Add the `"file_handlers"` array; each member maps file types to one extension HTML page that handles them.
- **"Supporting contexts"** *(anchor unverified)*: Usable from extension service workers, popups, side panels, or content scripts.
- **"Configure a file handler"** *(anchor unverified)*: Handlers are injected into the ChromeOS Files window's Open and Open with menus and appear only when the selected file matches the declared type (for example `.txt`).
- **"Process a file"** *(anchor unverified)*: The handler is a bundled HTML page opened in a new tab; processing code must sit in a separate packaged JavaScript file included via `<script>` and reads a `FileSystemFileHandle` using the `LaunchQueue` interface.
- **"Example"** *(anchor unverified)*: `if ('launchQueue' in window) { launchQueue.setConsumer(async launchParams => { const fileHandle = launchParams.files[0]; }); }`
  - *Key terms/entities:* `"file_handlers"`, ChromeOS 120, `launchQueue.setConsumer()`, `LaunchQueue`, `launchParams.files`, `FileSystemFileHandle`, Launch Handler API, ChromeOS Files window

### [Add geolocation to retrieve the user's location](https://developer.chrome.com/docs/extensions/how-to/web-platform/geolocation)

**Overview:** Explains how an MV3 extension gets user location with the ordinary `navigator.geolocation` API, and why extensions differ from websites: no permission prompt model, and no `navigator` inside the service worker. Gives workarounds per extension context.

**Sections:**
- **"Use geolocation in MV3 extensions"** *(anchor unverified)*: `navigator.geolocation` is a DOM API, so it exists only in contexts with a `document`.
  - **"Use geolocation in service workers"**: Add the `"offscreen"` permission, bundle `offscreen.html` plus `offscreen.js`, and call `browser.offscreen.createDocument({ url, reasons: [Reason.GEOLOCATION || Reason.DOM_SCRAPING], justification })` — only one offscreen document may be open, and `justification` feeds Chrome Web Store review. Message it with `{type: 'get-geolocation', target: 'offscreen'}`, reply via `sendResponse` while returning `true`, and deep-clone the position because its properties are prototype-based.
  - **"Use geolocation in a popup or side panel"**: Direct DOM access; declare `"geolocation"` in `permissions` or every call throws immediately, as if the user had denied it.
  - **"Using geolocation in a content script"**: Full DOM access, but the normal user permission flow still applies — the manifest permission alone grants nothing.
  - *Key terms/entities:* `navigator.geolocation`, `"offscreen"` permission, `browser.offscreen.createDocument()`, `Reason.GEOLOCATION`, `Reason.DOM_SCRAPING`, `justification`, `"geolocation"` permission, `getCurrentPosition()`, `sendResponse`, `offscreen.html`

### [Register your extension for an origin trial](https://developer.chrome.com/docs/extensions/how-to/web-platform/origin-trials)

**Overview:** How to enroll an extension in a Chrome origin trial — a time-limited program granting early access to experimental extension APIs and platform behavior. Covers finding a trial, pinning the extension ID, registering the `chrome-extension://` origin, and applying the issued token.

**Sections:**
- **"Find an active origin trial"** *(anchor unverified)*: Browse the Chrome Origin Trials list; feedback-seeking trials are usually announced through blog posts and social media. Design so the extension still works when the trial goes inactive.
- **"Determine your extension ID"** *(anchor unverified)*: Follow the keep-a-consistent-extension-ID steps (manifest `key`); otherwise an unpacked extension's ID derives from its load path and changes when uploaded to the Chrome Web Store, invalidating the registration.
- **"Register your extension"** *(anchor unverified)*: On the trial page click **Register**, note the supported Chrome versions and end date, and enter `chrome-extension://abcdefghijklmnopqrstuvwxyz` in the **Web Origin** field to receive a token.
- **"Use the trial token"** *(anchor unverified)*: Add `"trial_tokens": ["TOKEN"]` to the manifest (plus any API permission the trial itself requires) and confirm in DevTools **Application → Frames → Top** on a `chrome-extension://` page — this is not shown when inspecting a service worker. Content scripts keep the page's origin, so register with third-party matching and inject `<meta http-equiv="origin-trial" content="TOKEN">` into `document.head`.
  - *Key terms/entities:* `"trial_tokens"`, `chrome-extension://` origin, manifest `key`, "keep a consistent extension ID", third-party matching, `<meta http-equiv="origin-trial">`, DevTools Application panel, `document.head`

### [Record audio and capture the screen](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture)

**Overview:** Compares ways to record audio and video from a tab, window, or screen with `getDisplayMedia()` or `browser.tabCapture`, and states where each works in MV3 — service worker, offscreen document, extension page, or popup — including which paths still prompt the user.

**Sections:**
- **[Screen recording](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture#screen-recording)**: `await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })` opens Chrome's tab/window/screen picker. Called from a content script, recording stops on navigation; for background and cross-navigation capture use an offscreen document with the `DISPLAY_MEDIA` reason.
- **"Tab capture based on user gesture"** *(anchor unverified)*: Skips the picker when the user just clicked the action button.
  - **"Record audio and video in the background"** *(anchor unverified)*: Chrome 116+ — call `browser.tabCapture.getMediaStreamId({ targetTabId: tab.id })` in the service worker, create an offscreen document with `reasons: ['USER_MEDIA']`, then `getUserMedia` with `mandatory: { chromeMediaSource: "tab", chromeMediaSourceId }` and route audio through an `AudioContext`.
  - **"Record audio and video in a new tab"** *(anchor unverified)*: Pre-116 workaround — `browser.windows.create({ url: browser.runtime.getURL("recorder.html") })` and request the stream with `targetTabId` inside that extension page.
  - **"Record audio in a popup"** *(anchor unverified)*: `browser.tabCapture.capture({ audio: true }, cb)` only — video moves focus and closes the popup, and recording ends when the popup closes.
- **"Other considerations"** *(anchor unverified)*: Record the resulting stream with the `MediaRecorder` API.
  - *Key terms/entities:* `getDisplayMedia()`, `browser.tabCapture`, `getMediaStreamId()`, `targetTabId`, `chromeMediaSource: "tab"`, `chromeMediaSourceId`, `browser.offscreen.createDocument()`, `DISPLAY_MEDIA`, `USER_MEDIA`, `AudioContext`, `MediaRecorder`

### [Use WebHID in extensions](https://developer.chrome.com/docs/extensions/how-to/web-platform/webhid)

**Overview:** Extension-specific notes for the WebHID API (human interface devices over the HID protocol), which needs no manifest permissions but does trigger Chrome's user permission flow. Documents the one context where the API is restricted and how to work around it.

**Sections:**
- **"Availability in extensions"** *(anchor unverified)*: Chrome 117 or later.
- **"Permissions"** / **"Manifest"** *(anchor unverified)*: No manifest permissions and no manifest keys are required; access is granted through the browser's runtime user permission flow instead.
- **"Supporting contexts"** *(anchor unverified)*: Usable almost everywhere; while an offscreen/service-worker HID session exists, the extension service worker is kept alive.
- **"Chrome extension differences"** *(anchor unverified)*: `WebHID.requestDevice()` cannot be called in an extension service worker — call it from an extension page (typically inside a click handler with `filters: [{ vendorId: 0x1234, productId: 0x5678 }]`), `browser.runtime.sendMessage("newDevice")`, then in the worker use `navigator.hid.getDevices()` and `device.open()`.
  - *Key terms/entities:* `navigator.hid`, `WebHID.requestDevice()`, `HIDDevice`, `filters`, `vendorId`, `productId`, `navigator.hid.getDevices()`, `device.open()`, `browser.runtime.sendMessage()`, Chrome 117

### [Use WebSockets in service workers](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets)

**Overview:** Tutorial for holding a WebSocket connection open from an MV3 extension service worker. Since the worker is killed after 30 seconds without events — closing the socket — the sample adds a keepalive ping, a pattern enabled by Chrome 116.

**Sections:**
- **"Background"** *(anchor unverified)*: Before Chrome 116 a service worker went inactive even with an active WebSocket if no other extension event fired for 30 seconds, terminating the worker and dropping the connection. From 116, messages exchanged inside the 30-second activity window keep the worker alive, whether server- or extension-initiated.
- **"Example: WebSocket keepalive"** *(anchor unverified)*: Set `"minimum_chrome_version": "116"`, open `new WebSocket('wss://example.com/ws')`, and on `onopen` start `keepAlive()`, which uses `setInterval` (20 s) to `webSocket.send('keepalive')` and calls `clearInterval()` once `webSocket` is null; `onclose` resets the variable and `disconnect()` calls `webSocket.close()`.
  - *Key terms/entities:* `minimum_chrome_version: "116"`, `new WebSocket()`, `wss://example.com/ws`, `onopen`, `onmessage`, `onclose`, `webSocket.send()`, `setInterval()`, `clearInterval()`, 30-second idle window, `keepAlive()`

### [Use WebUSB in extensions](https://developer.chrome.com/docs/extensions/how-to/web-platform/webusb)

**Overview:** Extension-specific notes for the WebUSB API, which exposes non-standard USB devices to the extension. Like WebHID it needs no manifest declarations, relies on Chrome's runtime permission flow, and forbids device selection from inside the service worker.

**Sections:**
- **"Availability in extensions"** *(anchor unverified)*: Chrome 118 or later.
- **"Permissions"** / **"Manifest"** *(anchor unverified)*: No manifest file permissions and no manifest keys are required; WebUSB triggers the browser's user permission flow instead.
- **"Supporting contexts"** *(anchor unverified)*: Usable in almost any context, and an open device session keeps the extension service worker alive.
- **"Chrome extension differences"** *(anchor unverified)*: `WebUSB.requestDevice()` returns a `USBDevice` but cannot be called from an extension service worker — call it in an extension page under a user gesture with `filters: [{ vendorId: 0x1234, productId: 0x5678 }]`, then `browser.runtime.sendMessage("newDevice")`; the worker re-acquires devices with `navigator.usb.getDevices()` and calls `device.open()`.
  - *Key terms/entities:* `navigator.usb`, `WebUSB.requestDevice()`, `USBDevice`, `filters`, `vendorId`, `productId`, `navigator.usb.getDevices()`, `device.open()`, `browser.runtime.sendMessage()`, Chrome 118

### [Googlebook OS](https://developer.chrome.com/docs/extensions/how-to/googlebook)

**Overview:** Compatibility guide for running the same WebExtensions platform on Googlebook OS — an Android-based stack paired with ChromeOS desktop foundations. Lists the six behaviors that differ from Windows, macOS, and ChromeOS and how to detect or work around each.

**Sections:**
- **[Platform detection](https://developer.chrome.com/docs/extensions/how-to/googlebook#identity)**: `runtime.getPlatformInfo().os` reports `'android'` and `navigator.userAgentData.platform` reports `'Android'` while `navigator.userAgent` still contains `CrOS`; only `os === 'android' && navigator.userAgentData.mobile === false` identifies a Googlebook. Prefer feature detection.
- **[Native messaging](https://developer.chrome.com/docs/extensions/how-to/googlebook#native-messaging)**: Not available yet (tracked in issue 555299632); the `nativeMessaging` permission still installs but connections fail, and the feature will target installed Android apps rather than desktop executables.
- **[Keyboard shortcuts](https://developer.chrome.com/docs/extensions/how-to/googlebook#commands)**: `commands` reads the `linux` entry of `suggested_key`; `chromeos` entries and `Search`-key combinations do not apply.
- **[`SharedArrayBuffer`](https://developer.chrome.com/docs/extensions/how-to/googlebook#sharedarraybuffer)**: Requires opting into cross-origin isolation in the manifest; enabled in popups, options pages, and offscreen documents, but not in service workers (issue 40150182) — move threaded WebAssembly into an offscreen document.
- **[ChromeOS-only APIs](https://developer.chrome.com/docs/extensions/how-to/googlebook#chromeos-only-apis)** / **[`browser.system.storage`](https://developer.chrome.com/docs/extensions/how-to/googlebook#system-storage)**: `documentScan`, `fileSystemProvider`, `vpnProvider`, `printing`, and `system.storage` install but their namespaces are `undefined` at runtime; check the namespace exists before calling `getInfo()` or `ejectDevice()`.
  - *Key terms/entities:* `runtime.getPlatformInfo().os`, `navigator.userAgentData.platform`, `navigator.userAgentData.mobile`, `CrOS`, `nativeMessaging`, `suggested_key`, `SharedArrayBuffer`, cross-origin isolation, `documentScan`, `fileSystemProvider`, `vpnProvider`, `system.storage`

---

## 5. Security, Privacy & MV3 Migration

### [Stay secure](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)

**Overview:** Security checklist for extension authors: browser privileges make any extension a high-value attack target, so a compromise exposes every user of it. Covers account hygiene, minimum permissions and manifest surface, CSP, content-script trust boundaries, and input validation.

**Sections:**
- **"Protect developer accounts"** *(anchor unverified)*: Code ships through Google accounts, so account takeover pushes malicious code to all users — enable two-factor authentication (preferably a security key) and give publisher members minimal roles.
- **"Never use HTTP"** *(anchor unverified)*: Assume HTTP connections are eavesdropped or modified; prefer HTTPS, which defeats most man-in-the-middle attacks.
- **"Request minimal permissions"** *(anchor unverified)*: `fetch()` and `XMLHttpRequest()` reach only the extension origin and declared hosts; the sample limits `host_permissions` to `"https://developer.chrome.com/*"` and `"https://*.google.com/*"` so an attacker inherits only the match pattern's scope.
- **"Limit manifest fields"** *(anchor unverified)*: Restrict `"externally_connectable"` to trusted `ids`/`matches` with `accepts_tls_channel_id: false`; keep `"web_accessible_resources"` minimal because web-exposed files are detectable attack surface.
- **"Include an explicit content security policy"** *(anchor unverified)*: Use `"content_security_policy": { "extension_pages": "default-src 'self'" }`; add `'wasm-unsafe-eval'` for WebAssembly and `sandboxed_pages` for sandboxed pages. Avoid `document.write()`/`innerHTML`; build DOM nodes and set `innerText`.
- **"Use content scripts carefully"** *(anchor unverified)*: Content scripts share the page's renderer (Spectre, DOM tampering); keep privileged work in the service worker, never send secrets to content scripts, and forbid arbitrary URLs passed to `fetch()` or `tabs.create()`.
- **"Register and sanitize inputs"** *(anchor unverified)*: Register `runtime.onMessageExternal` only when expecting external callers and check `sender.id`; validate `MessageSender` and each `request` on `runtime.onMessage`.
  - *Key terms/entities:* `host_permissions`, `"externally_connectable"`, `accepts_tls_channel_id`, `"web_accessible_resources"`, `content_security_policy.extension_pages`, `'wasm-unsafe-eval'`, `sandboxed_pages`, `document.write()`, `innerHTML`, `innerText`, `runtime.onMessageExternal`, `runtime.onMessage`, `MessageSender`, Spectre

### [Protect user privacy](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)

**Overview:** Argues permissions must be minimal and explainable — users refuse extensions that over-ask — and that any extension collecting user data must follow the Protecting User Privacy policies. Shows trading `<all_urls>` for `activeTab`, deferring features to optional permissions, securing stored data, and honoring incognito.

**Sections:**
- **"Reduce required permissions"** *(anchor unverified)*: List only APIs actually used; never "future proof" access, since extra grants widen attack surface and add install warnings that depress install rates. H3 `activeTab`: temporary access to the current tab after a user invocation, cut off on navigation or close, replaces many `<all_urls>` uses, and shows no install warning.
- **"Opt for optional permissions"** *(anchor unverified)*: Move non-core APIs to `optional_permissions` / `optional_host_permissions`, then request them inside a user gesture with `permissions.request({ permissions, origins }, cb)`; the `granted` flag drives the UI. Shipping new permissions as optional in an update avoids disabling the extension.
- **"Limit and secure user information"** *(anchor unverified)*: Collect the minimum data, keep it on an HTTPS server with a registered domain, and avoid sensitive client-side data because extension storage is not encrypted.
- **"Saving data and incognito mode"** *(anchor unverified)*: Extensions do not run in incognito by default; check `tabs.Tab.incognito` (or `windows.Window`) and skip saving incognito browsing data, though preference settings may be stored from any window.
  - *Key terms/entities:* `permissions`, `activeTab`, `<all_urls>`, `optional_permissions`, `optional_host_permissions`, `permissions.request()`, `browser.action.onClicked`, `tabs.Tab`, `windows.Window`, `storage.local`, HTTPS, incognito

### [Migrate to Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate)

**Overview:** Top-level migration guide for converting a Manifest V2 extension to Manifest V3, which is generally supported from Chrome 88. Frames the work as six categories — manifest, service worker, API calls, blocking web requests, security, publishing — with a checklist for tracking each one.

**Sections:**
- **"Keep the current set of features"** *(anchor unverified)*: Do not add functionality while migrating; a feature that needs new permissions can trigger a permission warning that disables the extension until the user accepts. Replacement APIs may have landed after Chrome 88, so declare `minimum_chrome_version` and check per-member support in the API reference.
- **"New extension platform features"** *(anchor unverified)*: Features added since MV3's release are usable in both manifest versions and are optional during migration, but prefer them over the features they replace, which will eventually be deprecated and removed.
  - *Key terms/entities:* `manifest.json`, service worker, `minimum_chrome_version`, permission warning, `declarativeNetRequest`, remotely hosted code, Extension Manifest Converter, Chrome 88, `/develop/migrate/checklist`, `/develop/migrate/manifest`, `/develop/migrate/to-service-workers`, `/develop/migrate/api-calls`, `/develop/migrate/blocking-web-requests`, `/develop/migrate/improve-security`, `/develop/migrate/publish-mv3`

### [Update API calls](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls)

**Overview:** First of three code-migration pages: the MV3 changes unrelated to service workers or blocking web requests. Maps every moved or removed Manifest V2 API to its V3 replacement — script/CSS injection, actions, promises, background-context calls — ending in a deprecation table.

**Sections:**
- **[Replace tabs.executeScript() with scripting.executeScript()](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls#replace-executescript)**: Adds the `"scripting"` permission plus host permissions or `"activeTab"`; `ScriptInjection` replaces `InjectDetails`, `files` takes an array instead of one `file`, and `tabId` moves into `target`.
- **[Replace tabs.insertCSS() and tabs.removeCSS() with scripting.insertCSS() and scripting.removeCSS()](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls#replace-insertcss-removecss)**: Same permissions; pass a `CSSInjection` with `target.tabId` rather than a positional `tabId` and callback.
- **[Replace Browser Actions and Page Actions with Actions](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls#replace-browser-page-actions)**: `"browser_action"`/`"page_action"` collapse into `"action"`, and `browserAction`/`pageAction` into `action`; `hide()`/`show()` are gone — use `enable()`/`disable()` per tab or declarativeContent.
- **[Replace callbacks with promises](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls#replace-callbacks)**: Many methods now return promises; a callback suppresses the return value, event listeners still require callbacks, and the reference labels promise support.
- **[Replace functions that expect a Manifest V2 background context](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls#replace-mv2-function)**: `runtime.getBackgroundPage()`, `extension.getBackgroundPage()`, and `extension.getExtensionTabs()` become message passing via `runtime.sendMessage()`/`runtime.onMessage`.
- **[Replace unsupported APIs](https://developer.chrome.com/docs/extensions/develop/migrate/api-calls#replace-unsupported-apis)**: Table mapping `extension.onConnect`/`onMessage`/`sendMessage` → `runtime.*`, `tabs.getAllInWindow()`/`getSelected()` → `tabs.query()`, `Tab.selected` → `Tab.highlighted`, and `runtime.onSuspend` → `beforeunload`.
  - *Key terms/entities:* `scripting.executeScript()`, `ScriptInjection`, `InjectDetails`, `CSSInjection`, `"activeTab"`, `"action"`, `action.onClicked`, `declarativeContent`, `runtime.getBackgroundPage()`, `runtime.onMessage`, `tabs.query()`, `Tab.highlighted`, `runtime.onSuspend`, `beforeunload`

### [Replace blocking web request listeners](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests)

**Overview:** Second of three code-migration pages. Explains why MV3 replaces runtime `webRequest` interception with declarative rules — nine potentially blocking events with unlimited handlers degraded extension and page performance and demanded invasive permissions — then walks three concrete conversions.

**Sections:**
- **"Introduction"** *(anchor unverified)*: MV2 blocking `webRequest` slowed both extensions and pages, accepted unlimited event handlers, stacked across extensions, and required invasive permissions; MV3 substitutes declarative rules for callbacks, though policy-installed extensions may still use `webRequestBlocking`.
- **[Update permissions](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests#update-permissions)**: Remove `"webRequest"` if requests no longer need observing, and move match patterns out of `"permissions"` into `"host_permissions"`.
- **[Create declarative net request rules](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests#create-dnr-rules)**: Add a `"declarative_net_request"` manifest object whose `"rule_resource"` entries point at JSON rule files; each rule object pairs an `action` with the `condition` that triggers it.
- **[Common use cases](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests#common-use-cases)**: `"block"` with `urlFilter` and `resourceTypes: ["main_frame"]` replaces `onBeforeRequest`'s `{ cancel: true }`; `"redirect"` adds `action.redirect.url` and additionally needs `"declarativeNetRequestWithHostAccess"` plus host permissions; `"modifyHeaders"` removes cookies through `requestHeaders` `{ "header": "cookie", "operation": "remove" }`.
  - *Key terms/entities:* `webRequest`, `webRequestBlocking`, `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`, `"declarative_net_request"`, `"rule_resource"`, `urlFilter`, `resourceTypes`, `main_frame`, `modifyHeaders`, `onBeforeRequest`, `onBeforeSendHeaders`, `host_permissions`

### [Migration checklist](https://developer.chrome.com/docs/extensions/develop/migrate/checklist)

**Overview:** Task checklist that splits the Manifest V2 → V3 migration into ordered workstreams, with every item linking straight to the instruction or anchor that completes it. Use it to track remaining work instead of reading the migration guides linearly — note the intro says "five categories" while six are listed.

**Sections:**
- **"Update the manifest"** *(anchor unverified)*: Change the manifest version number, update host permissions, and update web accessible resources.
- **"Migrate to a service worker"** *(anchor unverified)*: Read the background-script vs. service-worker differences first, then update the `"background"` field, move DOM/window calls to an offscreen document, convert `localStorage` to `browser.storage.local`, register listeners synchronously, swap `XMLHttpRequest()` for global `fetch()`, persist state, convert timers to alarms, and keep the worker alive only in exceptional cases.
- **"Update API calls"** *(anchor unverified)*: `tabs.executeScript()` → `scripting.executeScript()`, `tabs.insertCSS()`/`removeCSS()` → `scripting.*`, browser/page actions → `action`, plus MV2 background-context functions, callbacks → promises, and unsupported APIs.
- **"Replace blocking web request listeners"** *(anchor unverified)*: Two required items — update permissions and create declarative net request rules — followed by the block-URL, redirect, and cookie use cases.
- **"Improve extension security"** *(anchor unverified)*: Remove execution of arbitrary strings and remotely hosted code, update the content security policy, and remove unsupported CSP values.
- **"Publish your Manifest V3 extension"** *(anchor unverified)*: Publish a beta version, roll out gradually, plan for review times, and apply additional tips.
  - *Key terms/entities:* `"background"`, `browser.storage.local`, `localStorage`, `offscreen` document, `alarms`, `fetch()`, `scripting.executeScript()`, `declarative_net_request`, `content_security_policy`, `remotely hosted code`, beta version, gradual rollout

### [Improving security in Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)

**Overview:** Third and last of the non-service-worker code-migration pages. Explains the MV3 rules that eliminate arbitrary and remotely hosted code execution — no `eval()`, `new Function()`, string-based `executeScript()`, or remote files — plus the CSP changes that enforce them and the bundling workarounds.

**Sections:**
- **[Remove execution of arbitrary strings](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security#remove-execution-of-strings)**: `executeScript()`, `eval()`, and `new Function()` can no longer run external logic; bundle JS/Wasm/CSS, build URLs with `runtime.getURL()`, and use a sandboxed iframe for `eval`. Exceptions remain for `scripting.insertCSS()` with remote stylesheets, `devtools.inspectedWindow.eval()`, and `debugger.sendCommand()`.
- **[Remove remotely hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security#remove-remote-code)**: All logic must ship inside the package — no server-hosted JS, CDN libraries, or libraries that fetch code at runtime. Alternatives: cached remote configuration, a remote web service, sandboxed iframes, bundled minified libraries, `scripting.executeScript({ files })`, or `func` + `args` injection.
- **[Update the content security policy](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security#update-csp)**: `"content_security_policy"` is now a dictionary with `"extension_pages"` (HTML pages and service workers served from `chrome-extension://`) and `"sandbox"`.
- **[Remove unsupported content security policies](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security#remove-unsupported-csv)**: `script-src`, `object-src`, and `worker-src` accept only `self`, `none`, `wasm-unsafe-eval`, and — unpacked extensions only — localhost sources; `sandbox` values are unrestricted.
  - *Key terms/entities:* `eval()`, `new Function()`, `executeScript()`, `runtime.getURL()`, `scripting.insertCSS()`, `devtools.inspectedWindow.eval()`, `debugger.sendCommand()`, `"content_security_policy"`, `extension_pages`, `sandbox`, `script-src`, `object-src`, `worker-src`, `wasm-unsafe-eval`, `background.type: "module"`

### [Known issues](https://developer.chrome.com/docs/extensions/develop/migrate/known-issues)

**Overview:** Migration FAQ and status page. Lists the platform gaps that blocked Manifest V2 → V3 migration and have since been resolved, then answers the recurring questions about persistent service workers, DOM access, remote code, and `webRequestBlocking`. States that the MV2 phase-out is complete.

**Sections:**
- **"Resolved platform gaps"** *(anchor unverified)*: Chrome 120 added File handling on ChromeOS (replacing `chrome.fileBrowserHandler`) and the `userScripts` API; Chrome 116/118 added strong service-worker keepalives for `permissions.request()`, `desktopCapture.chooseDesktopMedia()`, `identity.launchWebAuthFlow()`, `management.uninstall()`, and `chrome.debugger`; DNR enabled rulesets rose from 10 to 50 (total 50 → 100); offscreen added `GEOLOCATION`; `tabCapture.getMediaStreamId()` now runs from a worker; WebSocket connections extend worker lifetime.
- **"Manifest V3 frequently asked questions"** *(anchor unverified)*: No persistent service workers — the ephemeral event-driven model is the point — but all extension events and API calls extend the lifetime, and native messaging survives past 5 minutes. Background DOM work moves to offscreen documents. Remote code stays banned, yet `eval()` in DevTools extensions, `userScripts`, sandboxed iframes, and runtime-interpreted remote configuration are allowed. `webRequestBlocking` maps to `declarativeNetRequest`, with dynamic blocking reserved for enterprise/education.
  - *Key terms/entities:* `userScripts`, `chrome.fileBrowserHandler`, `declarativeNetRequest`, `chrome.debugger`, `desktopCapture.chooseDesktopMedia()`, `identity.launchWebAuthFlow()`, `management.uninstall()`, `GEOLOCATION`, `tabCapture.getMediaStreamId()`, `webRequestBlocking`, `inspectedWindow.eval()`, Chrome 116 / 118 / 120

### [Convert a V2 manifest to a V3 manifest](https://developer.chrome.com/docs/extensions/develop/migrate/manifest)

**Overview:** Manifest-only migration reference: the `manifest.json` edits that can be made independently of code changes, shown as before/after JSON for each key. Explains where host permissions and web accessible resources moved in Manifest V3 and why the resource format changed.

**Sections:**
- **[Change the manifest version number](https://developer.chrome.com/docs/extensions/develop/migrate/manifest#change-version)**: Flip `"manifest_version"` from `2` to `3`.
- **[Update host permissions](https://developer.chrome.com/docs/extensions/develop/migrate/manifest#update-host-permissions)**: Host patterns now use dedicated top-level fields — `"host_permissions"` and `"optional_host_permissions"` — instead of sitting inside `"permissions"`/`"optional_permissions"`; content-script URL matching stays under `"content_scripts.matches"`.
- **[Update web accessible resources](https://developer.chrome.com/docs/extensions/develop/migrate/manifest#update-wa-resources)**: `"web_accessible_resources"` changes from a flat file list, which exposed every listed file to all sites, to an array of objects pairing `"resources"` with `"matches"`, limiting fingerprinting and unintentional access. The sample exposes `images/*` to `*://*/*` but `style/extension.css` only to `https://example.com/*`.
  - *Key terms/entities:* `"manifest_version"`, `"permissions"`, `"optional_permissions"`, `"host_permissions"`, `"optional_host_permissions"`, `"content_scripts.matches"`, `"web_accessible_resources"`, `"resources"`, `"matches"`, `"*://*/*"`, match patterns, fingerprinting

### [Manifest V2 deprecation timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline)

**Overview:** Chronological record of the Manifest V2 phase-out: every Chrome Web Store and browser milestone from January 2022 through the August 2026 removal, naming the Chrome versions that still run MV2 and how long the enterprise exemption survived.

**Sections:**
- **"Manifest V2 deprecation timeline"** *(no H2 headings observed)*: The Chrome Web Store stopped accepting new MV2 extensions in Jan 2022 (public/unlisted) and June 2022 (private). June 3 2024: warning banner on `chrome://extensions` plus Featured-badge loss on Beta/Dev/Canary. Oct 9 2024: disabling started on stable with a temporary re-enable path. Mar 31 2025: disabled by default on all channels, re-enabling still allowed. Jul 24 2025: Chrome 138 disables MV2 permanently, and the `ExtensionManifestV2Availability` policy is removed in Chrome 139. Aug 31 2026: remaining MV2 items removed from the Store; installs on Chrome 138 or earlier keep running without updates or reinstalls.
  - *Key terms/entities:* `ExtensionManifestV2Availability`, Chrome 138, Chrome 139, `chrome://extensions`, Store visibility "Private" / "Public" / "Unlisted", Featured badge, Chromium release schedule, ChromeOS LTS

### [Publish your Manifest V3 extension](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3)

**Overview:** Release playbook for shipping a converted extension: beta-test it on the Chrome Web Store, roll the update out by percentage, and budget for review times. Aimed at developers whose MV3 changes are large enough to warrant a staged rollout rather than an immediate publish.

**Sections:**
- **[Publish a beta testing version](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3#publish-beta)**: Beta builds still go through store review and must be labelled or they risk rejection for "repetitive content": append "BETA" to `name` and put "THIS EXTENSION IS FOR BETA TESTING" in `description`. Distribute through Trusted Testers emails (Account tab → Management), a Google group, or an **Unlisted** direct link, with Visibility set to **Private**.
- **[Gradually roll-out your release](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3#gradual-rollout)**: Only for extensions with more than 10,000 active users. Upload, then set **Percentage rollout** on the **Distribution** tab; it affects existing users only (new users always get the new version) and can be raised later on the **Package** tab without another review.
- **[Plan for review times](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3#review)**: Most reviews finish within three days. Stage a submission by unchecking "Publish automatically" or choosing **Defer publish**; an approval lapses after 30 days and reverts to a draft needing re-review. No email after a week → check **Status → Published**; two weeks pending → contact developer support; roll back a bad release with Web Store rollback.
- **[Additional tips](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3#tips)**: Add a support-site link under the listing's Support tab to collect user feedback.
  - *Key terms/entities:* `name`, `description`, Trusted Testers, Google group, Visibility **Private** / **Unlisted**, Percentage rollout, 10,000 active users, "Publish automatically", **Defer publish**, 30 days, Status tab, Web Store rollback

### [Remotely hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)

**Overview:** Troubleshooting guide for Chrome Web Store "Blue Argon" rejections. Defines remotely hosted code (executed JS/WASM loaded from outside the extension package — not data, JSON, or CSS), explains why MV3 forbids it, and gives concrete ways to locate and remove it, including library and build-tool strategies.

**Sections:**
- **"Why is RHC no longer allowed?"** *(anchor unverified)*: MV3 requires every piece of executed code to be bundled inside the extension; dynamically injecting script tags from arbitrary web URLs is gone.
- **"I was told my extension has RHC. What's going on?"** *(anchor unverified)*: A Blue Argon rejection means reviewers believe the extension adds a remote script tag or fetches a resource to execute it directly.
- **"How to spot RHC"** *(anchor unverified)*: Search the compiled build for `http://` or `https://`; if nothing surfaces, One Stop Support will outline the specific violations.
- **"What to do if a library is requesting the code"** *(anchor unverified)*: There is no first-party exception — Firebase Auth users hit this — so reconfigure the library, patch it, or ask its author for a fix.
- **"What if you can't wait for a library update"** *(anchor unverified)*: Audit and delete the offending code, enable tree shaking (on by default in Rollup and Vite, opt-in for webpack), inline remote imports with a Rollup `load` plugin, or record edits with `patch-package`.
- **"What to do if the code isn't being used"** *(anchor unverified)*: Unused or dead code still violates the policy and must be removed by tree shaking or patching.
- **"Is there *any* workaround?"** *(anchor unverified)*: Only `userScripts` (user-supplied code, requires developer mode), `browser.debugger` over the Chrome DevTools Protocol (shows a debugger warning bar), and sandboxed iframes, where the CSP ban on `eval()` is lifted.
- **"What to do if you disagree with a verdict"** *(anchor unverified)*: Appeal the review decision through One Stop Support.
  - *Key terms/entities:* Blue Argon, remotely hosted code (RHC), `userScripts`, `browser.debugger`, Chrome DevTools Protocol, sandboxed iframe, `eval()`, tree shaking, Rollup, Vite, webpack, `patch-package`, `browser.scripting.executeScript()`, One Stop Support

### [Migrate to a service worker](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)

**Overview:** Converts an MV2 background or event page into an extension service worker that runs off the main thread and executes only when needed. Walks every code change the switch forces, from the manifest field through DOM access, storage, listener timing, and keepalive workarounds.

**Sections:**
- **[Differences between background scripts and extension service workers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#differences-with-sws)**: Workers run off the main thread, intercept `fetch` events on the extension origin, and reach other contexts through the Clients interface — but lack the DOM/`window`, must register listeners synchronously, cannot use `XMLHttpRequest()`, and lose globals and timers on termination.
- **[Update the "background" field in the manifest](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#update-bg-field)**: `"background.scripts"` (array) becomes `"background.service_worker"` (single string); delete `"background.persistent"`; add `"type": "module"` only for ES `import`.
- **[Move DOM and window calls to an offscreen document](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#move-dom-and-window)**: `offscreen.createDocument({ url, reasons, justification })`; from Chrome 157 a worker holding `"clipboardWrite"` writes with `navigator.clipboard.writeText()` without one, but still cannot read the clipboard.
- **[Convert localStorage to another type](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#convert-localstorage)**: `window.localStorage` is unavailable in workers — use `browser.storage.local`, or convert inside an offscreen document driven by `runtime.onMessage`.
- **[Register listeners synchronously](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#register-listeners)**: A listener added inside a `storage.local.get` callback is missed, because the worker restarts per event; register at the script's top level.
- **[Replace XMLHttpRequest() with global fetch()](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#replace-xmlhttprequest)**: `XMLHttpRequest()` cannot run in any service worker, and `fetch()` can no longer retrieve executable code.
- **[Persist states](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#persist-states)**: Replace globals with `storage.local` get/set, as in the `savedName` example.
- **[Convert timers to alarms](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#convert-timers)**: `setTimeout()`/`setInterval()` are cancelled when the worker terminates; use `alarms.create()` with `delayInMinutes` plus a top-level `alarms.onAlarm`.
- **[Keep the service worker alive](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#keep-sw-alive)**: Only for exceptional cases — a `waitUntil()` helper pinging `runtime.getPlatformInfo` every 25 s, or the enterprise/education `last-heartbeat` write every 20 s; general keepalive is not permitted.
  - *Key terms/entities:* `background.service_worker`, `"type": "module"`, `"background.persistent"`, `offscreen.createDocument()`, `reasons`, `justification`, `"clipboardWrite"`, `navigator.clipboard.writeText()`, `browser.storage.local`, `runtime.onMessage`, `XMLHttpRequest()`, `fetch()`, `alarms.create()`, `alarms.onAlarm`, `waitUntil()`, `runtime.getPlatformInfo`, `last-heartbeat`

### [Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)

**Overview:** Explains what Manifest V3 is and why it exists: the latest version of the extensions platform, aimed at improving extension privacy, security, and performance. Summarizes the four headline changes and routes readers to the migration guide, known issues, checklist, and publishing guide.

**Sections:**
- **"Our Goals"** *(anchor unverified)*: MV3 is the first step in a platform vision for better privacy, security, and performance, and for giving users more understanding and control over what extensions can do; completing the changes will take several years.
- **"What changes?"** *(anchor unverified)*: Long-lived background pages become service workers that run only when needed; remotely hosted code is banned so only packaged, Chrome Web Store–reviewed JavaScript executes; blocking `webRequest` is deprecated for `declarativeNetRequest`, which avoids proxying all traffic; plus new APIs, capabilities, and promise-based methods.
- **"Where to go from here?"** *(anchor unverified)*: Cards linking to Migrate, Known issues (platform gaps closed), Checklist (list of changes), and the Publishing guide (advice on publishing an updated extension).
  - *Key terms/entities:* service workers, background page, remotely hosted code, `webRequest`, `declarativeNetRequest`, promise-based methods, Chrome Web Store review, `/develop/migrate`, `/develop/migrate/known-issues`, `/develop/migrate/checklist`, `/develop/migrate/publish-mv3`

---

## 6. Manifest Reference

### [Reference](https://developer.chrome.com/docs/extensions/reference)

**Overview:** Top-level reference hub that fans out into the three reference trees — API modules, manifest keys, and permissions — each rendered as a "See all …" link plus a card grid. Points Manifest V2 readers to the archived `mv2/reference` tree instead.

**Sections:**
- **[API reference](https://developer.chrome.com/docs/extensions/reference/api)**: "See all APIs" index of every `chrome.*` module; the featured cards are `action`, `alarms`, `commands`, `declarativeNetRequest`, `offscreen`, `runtime`, `scripting`, `sidePanel`, `storage`, `tabs`, `userScripts`, `webNavigation`, `webRequest`, `windows`, and `permissions`.
- **[Manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest)**: "See all keys" index; the featured cards are `action`, `background`, `commands`, `content_scripts`, `declarative_net_request`, `description`, `externally_connectable`, `host_permissions`, `manifest_version`, `minimum_chrome_version`, `name`, `permissions`, `side_panel`, `version`, `web_accessible_resources` — several of them resolve to API or concept pages rather than manifest pages.
- **[Permissions reference](https://developer.chrome.com/docs/extensions/reference/permissions-list)**: Index of permission strings, each anchor-linked on the list page: `#activeTab`, `#background`, `#cookies`, `#declarativeNetRequest`, `#declarativeNetRequestWithHostAccess`, `#favicon`, `#geolocation`, `#notifications`, `#readingList`, `#scripting`, `#storage`, `#tabs`, `#webAuthenticationProxy`, `#webNavigation`, `#webRequest`.
  - *Key terms/entities:* `/reference/api`, `/reference/manifest`, `/reference/permissions-list`, `chrome.*`, manifest keys, permission strings, `/docs/extensions/mv2/reference`

### [Manifest](https://developer.chrome.com/docs/extensions/reference/manifest)

**Overview:** Structure reference for `manifest.json`, the file every extension must place in its root directory to declare structure and behavior. Gives five starter manifests, then enumerates every supported key grouped by requirement level (platform-required, Chrome Web Store-required, optional, optional ChromeOS).

**Sections:**
- **"Examples"** *(anchor unverified)*: H3s **"Minimal manifest"** (`manifest_version`, `name`, `version` only, plus `description`/`icons`), **"Register a content script"** (`content_scripts[].js` + `matches`), **"Inject a content script"** (`background.service_worker`, `action.default_icon`, `"permissions": ["scripting", "activeTab"]`), **"Popup with permissions"** (`action.default_popup`, `host_permissions`, `"permissions": ["storage"]`), **"Side panel"** (`side_panel.default_path`, `"permissions": ["sidePanel"]`).
- **"Keys required by the Extensions platform"** *(anchor unverified)*: `manifest_version` (integer; only supported value is `3`), `name` (max 75 characters), `version`.
- **"Keys required by Chrome Web Store"** *(anchor unverified)*: `description` (max 132 characters), `icons`.
- **"Optional keys"** *(anchor unverified)*: `action`, `background`, `chrome_settings_overrides`, `chrome_url_overrides`, `commands`, `content_scripts`, `content_security_policy`, `cross_origin_embedder_policy`, `cross_origin_opener_policy`, `declarative_net_request`, `default_locale`, `devtools_page`, `export`, `externally_connectable`, `homepage_url`, `host_permissions`, `import`, `incognito` (`"spanning"`, `"split"`, `"not_allowed"`), `key`, `mime_types_handler`, `minimum_chrome_version`, `oauth2`, `omnibox`, `optional_host_permissions`, `optional_permissions`, `options_page`, `options_ui`, `permissions`, `requirements`, `sandbox`, `short_name` (max 12 characters), `side_panel`, `storage`, `tts_engine`, `update_url`, `version_name`, `web_accessible_resources`; `export`/`import` are documented together under [shared-modules](https://developer.chrome.com/docs/extensions/reference/manifest/shared-modules).
- **"Optional ChromeOS keys"** *(anchor unverified)*: `file_browser_handlers`, `file_handlers`, `file_system_provider_capabilities`, `input_components`.
- **Keys documented on API/concept pages instead of a manifest page**: `action` → [api/action](https://developer.chrome.com/docs/extensions/reference/api/action); `background` → [service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers); `commands` → [api/commands](https://developer.chrome.com/docs/extensions/reference/api/commands); `content_scripts` → [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts); `declarative_net_request` → [api/declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest); `devtools_page` → [Extend DevTools](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools); `host_permissions`/`optional_host_permissions` → [declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions); `optional_permissions` → [api/permissions#step-2](https://developer.chrome.com/docs/extensions/reference/api/permissions#step-2-declare-optional-permissions-in-the-manifest); `permissions` → [permissions reference](https://developer.chrome.com/docs/extensions/reference/permissions-list); `side_panel` → [api/sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel); `update_url` → [self-hosting](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux); `version_name` has no page of its own (inline only).
  - *Key terms/entities:* `manifest.json`, `manifest_version: 3`, `name`, `version`, `description`, `icons`, `default_locale`, `minimum_chrome_version`, `oauth2.client_id`, `oauth2.scopes`, `options_page`, `options_ui`, `key`, `web_accessible_resources`, `file_handlers`, `input_components`, `i18n`, `omnibox`, `ttsEngine`, `fileBrowserHandler`, `fileSystemProvider`, `mimeHandler`

### [`author`](https://developer.chrome.com/docs/extensions/reference/manifest/author)

**Overview:** Optional key that is **no longer supported**: as of February 2024 Chrome and the Chrome Web Store silently ignore it if present. Historically it took an object with an `email` string identifying the author, which had to match the account used to publish the CRX.

**Values / notes:**
- Shape is `"author": { "email": "user@example.com" }`; object with a single `email` property, no other fields, no default and no minimum Chrome version.
- Safe to leave out of new manifests — including it has no effect on the Web Store listing, install dialog, or `chrome://extensions`.
  - *Key terms/entities:* `author`, `author.email`, February 2024 removal, "silently ignored", CRX publishing account

### [`background`](https://developer.chrome.com/docs/extensions/reference/manifest/background)

**Overview:** Optional key declaring a JavaScript file as the extension service worker — the background script that acts as the extension's main event handler. Replaces the Manifest V2 `background.scripts` + `persistent` form.

**Values / notes:**
- `"service_worker": "service-worker.js"` takes a single file path (not an array); there is no `persistent` flag in MV3.
- `"type": "module"` is optional and makes the worker an ES module so it can use static `import`.
- Page is a stub; it defers to the [service worker introduction](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers) for registration, lifecycle, and import rules (see [manifest/background](https://developer.chrome.com/docs/extensions/reference/manifest/background) and the [service worker basics](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)).
  - *Key terms/entities:* `background.service_worker`, `background.type`, `"module"`, `service-worker.js`, extension service worker, event handler

### [`chrome_settings_overrides`](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)

**Overview:** Optional key letting an extension override selected Chrome settings — the homepage, the default search provider, and startup pages. Works on Windows and Mac in all current Chrome versions; every domain used must be verified in Google Search Console by the account publishing the extension (a verified domain covers its subdomains and pages).

**Values / notes:**
- Overridable properties: [`homepage`](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override#homepage) (string URL), [`search_provider`](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override#search_provider) (object), [`startup_pages`](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override#startup_pages) (array of exactly one URL).
- `search_provider` fields: `search_url` (required) and `is_default` (required boolean), plus `name`, `keyword`, `favicon_url`, `encoding` (all required when `prepopulated_id` is absent), optional `alternate_urls`, `image_url`, `suggest_url`, `instant_url`, and matching `*_post_params`, and `prepopulated_id` (Chrome built-in engine ID).
- Every value can be localized with `chrome.i18n` (`__MSG_name__`); for external extensions, a registry `install_parameter` value replaces `__PARAM__` substrings (must appear after the first `/`, never in the hostname).
- Single-purpose policy: pairing a settings override with extra capabilities or permissions triggers a user confirmation dialog (Chrome 107+); overriding one setting alone does not.
  - *Key terms/entities:* `chrome_settings_overrides`, `homepage`, `search_provider`, `search_url`, `is_default`, `prepopulated_id`, `keyword`, `favicon_url`, `encoding`, `alternate_urls`, `*_post_params`, `startup_pages`, `install_parameter`, `__PARAM__`, `__MSG_*__`, Chrome 107

### [`content_scripts`](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)

**Overview:** Statically declares JavaScript and/or CSS to inject every time a page opens that matches a URL pattern. Programmatic injection is a separate path (Scripting API); this page documents the declarative manifest form only.

**Values / notes:**
- Array of objects. Required: `"matches"` **and** either `"js"` or `"css"`; all paths are relative to the extension root (leading `/` trimmed). CSS injects first, then JS, each in array order, before DOM construction/rendering.
- URL filtering: `"exclude_matches"`, `"include_globs"`, `"exclude_globs"` (Greasemonkey-style `@include`/`@exclude`). Injection needs a `matches` + `include_globs` hit and no `exclude_*` hit; globs support `*` (any string) and `?` (single char). `"matches"` triggers an install-time permission warning.
- Frames: `"all_frames"` (default `false`, each frame checked independently), `"match_about_blank"` (default `false`), `"match_origin_as_fallback"` (default `false`, covers `about:`, `data:`, `blob:`, `filesystem:` frames).
- Timing and world: [`"run_at"`](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts#world-timings) = `document_start` | `document_end` | `document_idle` (default); `"world"` = `ISOLATED` (default, private environment) | `MAIN` (shares the page's JavaScript world, so the page can read and interfere).
  - *Key terms/entities:* `content_scripts`, `matches`, `js`, `css`, `exclude_matches`, `include_globs`, `exclude_globs`, `all_frames`, `match_about_blank`, `match_origin_as_fallback`, `run_at`, `world`, `ISOLATED`, `MAIN`, `document_start`, `document_end`, `document_idle`

### [`content_security_policy`](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)

**Overview:** Optional key holding a web-platform CSP that restricts the scripts, styles, and other resources an extension may use. In MV3 it is an object with two independent policies: `"extension_pages"` (popup, service worker, extension-opened tabs/iframes) and `"sandbox"` (pages listed under `"sandbox"`).

**Values / notes:**
- Object form: `"content_security_policy": { "extension_pages": "...", "sandbox": "..." }`; both members optional, each a policy string.
- Defaults: `extension_pages` = `script-src 'self'; object-src 'self';`; `sandbox` = `sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self';`. With the default, only packaged scripts/objects load, WebAssembly is disabled, and inline script and string evaluation fail.
- Chrome enforces the minimum `extension_pages` policy `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';` — it cannot be relaxed (no `'unsafe-eval'`, no extra script sources) or install fails with `'content_security_policy.extension_pages': Insecure CSP value "'unsafe-eval'" in directive 'script-src'`.
- The `"sandbox"` policy is freely customizable because sandboxed pages get no extension APIs and no direct access to non-sandboxed pages.
  - *Key terms/entities:* `content_security_policy`, `extension_pages`, `sandbox`, `script-src`, `object-src`, `child-src`, `'wasm-unsafe-eval'`, `'unsafe-eval'`, `'unsafe-inline'`, `sandbox allow-scripts`

### [`cross_origin_embedder_policy`](https://developer.chrome.com/docs/extensions/reference/manifest/cross-origin-embedder-policy)

**Overview:** Optional key (introduced in **Chrome 93**) that sets the `Cross-Origin-Embedder-Policy` (COEP) response header for every request to the extension's origin — the service worker, popup, options page, and tabs open on an extension resource. Paired with `cross_origin_opener_policy`, it lets an extension opt into cross-origin isolation (e.g. for `SharedArrayBuffer`).

**Values / notes:**
- Object with exactly one property: `"value"` (string), used verbatim as the COEP header value.
- Snippet: `"cross_origin_embedder_policy": { "value": "require-corp" }` — `require-corp` is the value shown for opting into cross-origin isolation.
- Header-level effects apply to all extension-origin responses, so subresources must satisfy COEP (`Cross-Origin-Resource-Policy`/CORS) or they are blocked.
  - *Key terms/entities:* `cross_origin_embedder_policy`, `value`, `require-corp`, `Cross-Origin-Embedder-Policy`, COEP, `cross_origin_opener_policy`, cross-origin isolation, `SharedArrayBuffer`, Chrome 93

### [`cross_origin_opener_policy`](https://developer.chrome.com/docs/extensions/reference/manifest/cross-origin-opener-policy)

**Overview:** Optional key (introduced in **Chrome 93**) that sets the `Cross-Origin-Opener-Policy` (COOP) response header for requests to the extension's origin — service worker, popup, options page, and tabs open on extension resources. With `cross_origin_embedder_policy` it enables cross-origin isolation.

**Values / notes:**
- Object with a single `"value"` string property, served as the COOP header.
- Snippet: `"cross_origin_opener_policy": { "value": "same-origin" }` — `same-origin` keeps a top-level extension page out of a browsing-context group shared with cross-origin documents.
- No default value is documented; omitting the key means no COOP header is set for extension-origin responses, so paired COEP alone does not produce cross-origin isolation.
  - *Key terms/entities:* `cross_origin_opener_policy`, `value`, `same-origin`, `Cross-Origin-Opener-Policy`, COOP, `cross_origin_embedder_policy`, cross-origin isolation, browsing context group, Chrome 93

### [`default_locale`](https://developer.chrome.com/docs/extensions/reference/manifest/default-locale)

**Overview:** Names the `_locales` subdirectory that holds an extension's default language. Conditionally **required**: mandatory when the package contains a `_locales` directory (a localized extension), and it **must be absent** when there is no `_locales` directory.

**Values / notes:**
- String locale code matching a folder name under `_locales`, e.g. `"default_locale": "en"`, `"pt_BR"`.
- No default; a localized package that omits the key fails to load, and adding it to a non-localized package is equally invalid.
- Supplies the fallback strings for `__MSG_key__` placeholders and `i18n.getMessage()`; see the [i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n).
  - *Key terms/entities:* `default_locale`, `_locales`, `"en"`, `"pt_BR"`, localized extension, `__MSG_key__`, `i18n.getMessage()`, `messages.json`

### [`description`](https://developer.chrome.com/docs/extensions/reference/manifest/description)

**Overview:** Plain-text string describing the extension, shown on both `chrome://extensions` and the Chrome Web Store. Listed as required by the Chrome Web Store (not by the platform), where it is the store summary.

**Values / notes:**
- `"description": "A description of my extension"` — no HTML or other formatting, maximum **132 characters**.
- Supports locale-specific values via `__MSG_key__` (see the [i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n)).
- No minimum Chrome version and no default; omitting it blocks a store listing but not an unpacked load.
  - *Key terms/entities:* `description`, 132 characters, plain text, `chrome://extensions`, Chrome Web Store, `__MSG_key__`, i18n

### [`event_rules`](https://developer.chrome.com/docs/extensions/reference/manifest/event-rules)

**Overview:** Declarative rule list that intercepts, blocks, or modifies web requests in flight (through the MV2 `declarativeWebRequest` API) or reacts to page content without needing permission to read it (`declarativeContent`). Legacy page: `event_rules` is **not** listed among supported keys on the manifest index, and `declarativeWebRequest` is Manifest V2 only.

**Values / notes:**
- Array of rule objects with `"event"` (e.g. `"declarativeContent.onPageChanged"`), `"actions"` (array of typed actions), and `"conditions"` (array of typed matchers).
- Manifest form mirrors the runtime call `chrome.declarativeContent.onPageChanged.addRules()`: `"actions": [{ "type": "declarativeContent.ShowPageAction" }]`, `"conditions": [{ "type": "declarativeContent.PageStateMatcher", "css": ["video"] }]`.
- Page states no required/optional status, no default and no minimum Chrome version; for new work prefer `declarativeNetRequest` rules or runtime `declarativeContent` registration.
  - *Key terms/entities:* `event_rules`, `event`, `actions`, `conditions`, `declarativeContent`, `declarativeContent.onPageChanged`, `declarativeContent.ShowPageAction`, `declarativeContent.PageStateMatcher`, `css`, `declarativeWebRequest`, MV2

### [`externally_connectable`](https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable)

**Overview:** Optional key declaring which other extensions and which web pages may connect to this extension via `runtime.connect()` and `runtime.sendMessage()` (the senders that surface in `runtime.onConnectExternal` / `runtime.onMessageExternal`).

**Values / notes:**
- Object with three **optional** properties: `"ids"` (extension IDs allowed to connect; wildcard `"*"` allows all; empty or omitted = no extensions), `"matches"` (match patterns for web pages; empty or omitted = no web pages), `"accepts_tls_channel_id"` (boolean).
- If the key is absent, **all extensions** can connect and **no web pages** can — so adding the key without `"ids": ["*"]` silently removes access for extensions that previously connected.
- `"accepts_tls_channel_id": true` exposes `MessageSender.tlsChannelId`, but only when the page also sets `includeTlsChannelId: true` in `connectInfo`/`sendMessage` options; `false` means `tlsChannelId` is never set.
- Does not affect content scripts.
  - *Key terms/entities:* `externally_connectable`, `ids`, `matches`, `accepts_tls_channel_id`, `"*"`, `runtime.connect()`, `runtime.sendMessage()`, `runtime.MessageSender.tlsChannelId`, `includeTlsChannelId`, match patterns

### [`file_handlers`](https://developer.chrome.com/docs/extensions/reference/manifest/file-handlers)

**Overview:** Optional ChromeOS key specifying file types the extension can open from the Files app. The handler is a bundled HTML page that reads the file through the web platform Launch Handler API (`launchQueue.setConsumer()`); availability is Chrome 120 (beta at time of writing).

**Values / notes:**
- Array of handler objects: `"action"` (required, extension HTML file), `"name"` (required, user-facing label), `"accept"` (required dictionary of MIME type → array of file extensions), `"launch_type"` (optional, default `"single-client"`).
- Snippet: `"file_handlers": [{ "action": "/open_text.html", "name": "Plain text", "accept": { "text/plain": [".txt"] }, "launch_type": "single-client" }]`.
- `"accept"` keys must be known MIME types (custom extensions need a known MIME key the OS maps); `"launch_type"` also accepts `"multiple-clients"`.
- Processing code must sit in a separate file loaded with `<script>`; see [Handle files on Chrome OS](https://developer.chrome.com/docs/extensions/how-to/web-platform/file-handling-chromeos).
  - *Key terms/entities:* `file_handlers`, `action`, `name`, `accept`, `launch_type`, `single-client`, `multiple-clients`, MIME type, ChromeOS, Chrome 120, Launch Handler API, `launchQueue.setConsumer()`

### [`homepage_url`](https://developer.chrome.com/docs/extensions/reference/manifest/homepage-url)

**Overview:** Optional manifest key holding a string with a valid homepage URL, typically the developer's personal or company site. It becomes the "Homepage URL" link on `chrome://extensions`; when undefined, that link defaults to the extension's Chrome Web Store listing.

**Values / notes:**
- Single absolute URL string, e.g. `"homepage_url": "https://example.com"`; no object form and no localization documented.
- No default value — the fallback is the Web Store page shown on the extensions management page.
- Especially useful when [self-hosting the extension](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux) outside the Chrome Web Store; the manifest index adds that it helps readers reach your download page.
  - *Key terms/entities:* `homepage_url`, `https://example.com`, `chrome://extensions`, Chrome Web Store page fallback, self-hosting, `/how-to/distribute/host-on-linux`

### [`icons`](https://developer.chrome.com/docs/extensions/reference/manifest/icons)

**Overview:** Declares one or more icons representing the extension or theme. Listed as required by the Chrome Web Store rather than the platform; a 128x128 icon is used at install time and by the Web Store, 48x48 on `chrome://extensions`, and 16x16 as the favicon for extension pages.

**Values / notes:**
- Object mapping pixel size to a relative path: `"icons": { "16": "icon16.png", "32": "icon32.png", "48": "icon48.png", "128": "icon128.png" }`.
- PNG is recommended (best transparency support); any Blink-supported raster format works — BMP, GIF, ICO, JPEG. **WebP and SVG are not supported.**
- Any additional sizes are allowed; Chrome picks the best available size.
  - *Key terms/entities:* `icons`, 16x16, 32x32, 48x48, 128x128, PNG, BMP, GIF, ICO, JPEG, WebP unsupported, SVG unsupported, `chrome://extensions`, [Web Store icon guidelines](https://developer.chrome.com/docs/webstore/images#icons)

### [`incognito`](https://developer.chrome.com/docs/extensions/reference/manifest/incognito)

**Overview:** Optional key controlling how the extension behaves when the user allows it in incognito mode. Accepts `"spanning"` (the default), `"split"`, or `"not_allowed"`; the last prevents the extension from being enabled in incognito at all (Chrome 47+).

**Values / notes:**
- `"spanning"` — one shared process; incognito events and messages reach it with an *incognito* flag. Such an extension cannot load pages from its own package into the main frame of an incognito tab.
- `"split"` — incognito pages (and any background page) run in a separate incognito process with a memory-only cookie store; each process only sees its own context, and the two processes cannot communicate.
- Rule of thumb: use `"split"` when the extension must open tabs in an incognito browser, `"spanning"` when it must stay logged into a remote server.
- `chrome.storage.sync` and `chrome.storage.local` are **always** shared between regular and incognito processes — the recommended place to persist settings.
  - *Key terms/entities:* `incognito`, `"spanning"`, `"split"`, `"not_allowed"`, incognito flag, memory-only cookie store, `chrome.storage.sync`, `chrome.storage.local`, Chrome 47

### [`input_components`](https://developer.chrome.com/docs/extensions/reference/manifest/input-components)

**Overview:** Optional ChromeOS key that enables the [`input.ime`](https://developer.chrome.com/docs/extensions/reference/api/input/ime) (Input Method Editor) API, letting the extension handle keystrokes, set the composition, and open assistive windows. The `"input"` permission must also be declared in `"permissions"`.

**Values / notes:**
- Array of component objects. Required: `"name"` (string).
- Optional: `"id"` (string), `"language"` (string or array, e.g. `"en"` or `["en", "pt"]`), `"layouts"` (string or array of input methods, e.g. `["us::eng"]`; an `xkb:` prefix marks a keyboard-layout extension, and ChromeOS supports only one layout per input method), `"input_view"` (extension resource), `"options_page"` (extension resource; defaults to the extension's options page).
- Snippet: `"input_components": [{ "name": "ToUpperIME", "id": "ToUpperIME", "language": "en", "layouts": ["us::eng"] }]`.
  - *Key terms/entities:* `input_components`, `name`, `id`, `language`, `layouts`, `input_view`, `options_page`, `"input"` permission, `chrome.input.ime`, ChromeOS, `xkb:`, IME

### [`key`](https://developer.chrome.com/docs/extensions/reference/manifest/key)

**Overview:** Optional key that pins the extension's (or theme's) unique ID while it is loaded unpacked during development. Stable IDs let a server accept only your extension origin, let other extensions/websites message you, and let a website reach your `web_accessible_resources`.

**Values / notes:**
- String: the base64 public key body, copied from the Chrome Developer Dashboard between `---BEGIN PUBLIC KEY---`/`---END PUBLIC KEY---` with newlines removed: `"key": "ThisKeyIsGoingToBeVeryLong...+MUhFGoqEh32oYnm4qkS4JpjWva5Ktn4YpAWxd4pSCVs8I4MZms20..."`.
- **"Keep a consistent extension ID"** *(anchor unverified)*: upload a `.zip` to the Developer Dashboard → **Add new item** → **Browse files** → **Package** tab → **View public key**; paste into `manifest.json`.
- **"Compare IDs"** *(anchor unverified)*: enable **Developer mode** on `chrome://extensions`, load the unpacked directory, and confirm the ID matches the Dashboard **Item ID**.
- No default; omitting it means the unpacked ID is derived from the load path (and changes once uploaded).
  - *Key terms/entities:* `key`, `manifest_version: 3`, extension ID, Chrome Developer Dashboard, **View public key**, `chrome://extensions`, Developer mode, Item ID, `web_accessible_resources`, messaging

### [`manifest_version`](https://developer.chrome.com/docs/extensions/reference/manifest/manifest-version)

**Overview:** **Required** integer declaring which version of the manifest file format the package requires. The only supported value is `3`; the Chrome Web Store no longer accepts manifest V2 extensions, and future versions (V4+) are unscheduled.

**Values / notes:**
- `"manifest_version": 3` selects the Manifest V3 format and feature set.
- Integer, not a string; omitting the key (or using `2`) blocks loading with a "required value manifest_version is missing or invalid"-style error.
- No default and no minimum Chrome version stated — MV3 features themselves are gated per-API (see `minimum_chrome_version`).
  - *Key terms/entities:* `manifest_version`, `3`, Manifest V3, Manifest V2 support timeline, `/develop/migrate/what-is-mv3`, `/develop/migrate/mv2-deprecation-timeline`, required key

### [`minimum_chrome_version`](https://developer.chrome.com/docs/extensions/reference/manifest/minimum-chrome-version)

**Overview:** Optional string restricting which Chrome versions may install the extension. The value must be a substring of a real Chrome version string — a full version (`"126.0.6478.0"`) for a specific update, or just the leading number (`"126"`) for a major version.

**Values / notes:**
- Snippet: `"minimum_chrome_version": "126"`; no default (absent = no restriction).
- **"New Installs"** *(anchor unverified)*: older Chrome shows "Not compatible" instead of the install button on the Chrome Web Store, so installation is blocked.
- **"Existing Installs"** *(anchor unverified)*: installed users below the minimum silently stop receiving updates — warn them out of band.
- Enterprise users in [ephemeral mode](https://support.google.com/chrome/a/answer/3538894) count as new users on each sign-in, so a too-high value means the extension is never installed.
  - *Key terms/entities:* `minimum_chrome_version`, `"126"`, "Not compatible", Chrome Web Store install button, silent update stop, ephemeral mode, enterprise, substring rule

### [`name`](https://developer.chrome.com/docs/extensions/reference/manifest/name)

**Overview:** **Required** short plain-text string identifying the extension, maximum **75 characters**. Shown in the install dialog, on `chrome://extensions`, and on the Chrome Web Store listing.

**Values / notes:**
- `"name": "My extension name"` — plain text only, no HTML or formatting.
- Accepts a locale-specific value through `__MSG_key__` (see the [i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n)).
- No default and no minimum Chrome version; pair with [`short_name`](https://developer.chrome.com/docs/extensions/reference/manifest/short-name) when the title must be shortened for tight UI.
  - *Key terms/entities:* `name`, 75 characters, plain text, `__MSG_key__`, install dialog, `chrome://extensions`, Chrome Web Store, `short_name`

### [`oauth2`](https://developer.chrome.com/docs/extensions/reference/manifest/oauth2)

**Overview:** Optional key enabling an OAuth 2.0 security ID for the extension, used with the `identity` API to obtain Google auth tokens. Pairs with `key` so the extension keeps a stable ID matching the registered OAuth client.

**Values / notes:**
- Object with two **required** sub-properties: `"client_id"` (string, e.g. `"YOUR_EXTENSION_OAUTH_CLIENT_ID.apps.googleusercontent.com"`) and `"scopes"` (array, e.g. `["https://www.googleapis.com/auth/contacts.readonly"]`).
- Snippet also shows `"key": "EXTENSION_PUBLIC_KEY"` beside it — the OAuth client is bound to the extension ID, which unpacked loads only preserve via `key`.
- No default and no minimum Chrome version on this page; the [OAuth 2.0 tutorial](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth) covers client creation and `identity.getAuthToken()`.
  - *Key terms/entities:* `oauth2`, `oauth2.client_id`, `oauth2.scopes`, `.apps.googleusercontent.com`, `key`, consistent extension ID, `identity`, `identity.getAuthToken()`, OAuth 2.0

### [`requirements`](https://developer.chrome.com/docs/extensions/reference/manifest/requirements)

**Overview:** Optional key listing technologies the extension requires, so hosting sites such as the Chrome Web Store can discourage installs on machines that cannot run them. Only the `"3D"` requirement remains usable; further checks may be added later.

**Values / notes:**
- Object form: `"requirements": { "3D": { "features": ["webgl"] } }`; `"3D"` denotes GPU hardware acceleration and accepts `"webgl"` or `"css3d"` in the `features` array.
- `"webgl"` refers to the WebGL API; list every 3D feature the extension depends on.
- The `"plugins"` (NPAPI) requirement is **deprecated and unusable** in a manifest since NPAPI support ended in Chrome 45.
  - *Key terms/entities:* `requirements`, `3D`, `features`, `webgl`, `css3d`, `plugins`, NPAPI, GPU hardware acceleration, Chrome 45, Chrome Web Store compatibility

### [`sandbox`](https://developer.chrome.com/docs/extensions/reference/manifest/sandbox)

**Overview:** Optional key defining extension pages served in a sandboxed **unique origin**. Such pages lose extension API access and direct access to non-sandboxed pages (they talk via `postMessage()`), but escape the extension CSP and may use inline script and `eval()`.

**Values / notes:**
- `"sandbox": { "pages": ["page1.html", "directory/page2.html"] }` — list only pages loaded in windows/frames; their stylesheets and scripts inherit the embedding frame's sandbox and need not be listed.
- Own CSP comes from `"content_security_policy": { "sandbox": "..." }`; default is `sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self';`.
- A custom sandbox CSP may tighten the default but **must** include the `sandbox` directive and **must not** contain the `allow-same-origin` token.
- Practical use: keep `new Function()`/`Handlebars`-style libraries alive — see [Use eval() in sandboxed iframes](https://developer.chrome.com/docs/extensions/how-to/security/sandboxing-eval).
  - *Key terms/entities:* `sandbox`, `sandbox.pages`, `content_security_policy.sandbox`, unique origin, `allow-same-origin`, `allow-scripts`, `postMessage()`, `eval()`, inline script, `unsafe-eval`

### [Shared modules: `export` / `import`](https://developer.chrome.com/docs/extensions/reference/manifest/shared-modules)

**Overview:** Documents the two manifest fields that implement Shared Modules — permissionless, downloadable resource bundles shared between extensions. Note the caution at the top: **the Chrome Web Store does not allow submitting shared modules**.

**Values / notes:**
- [`"export"`](https://developer.chrome.com/docs/extensions/reference/manifest/shared-modules#export): marks the extension as a Shared Module; optional `"allowlist"` array of extension IDs permitted to import it (no allowlist = all extensions). Shared Modules may declare **no permissions**.
- [`"import"`](https://developer.chrome.com/docs/extensions/reference/manifest/shared-modules#import): array of `{ "id": "…" }` objects, each with optional `"minimum_version"` (e.g. `"0.5"`).
- Resources are served from the reserved path `_modules/<SHARED_MODULE_ID>/` at the extension root (`chrome-extension://<own-id>/_modules/<module-id>/foo.js`); overlaid resources inherit every privilege of the importing extension.
- Store installs happen automatically with the dependent extension and uninstall with the last dependent; side-loaded/unpacked Shared Modules must be installed manually and need `key` to hold stable IDs.
  - *Key terms/entities:* `export`, `import`, `allowlist`, `id`, `minimum_version`, `_modules/SHARED_MODULE_ID`, `chrome-extension://`, `key`, permissionless, no permissions

### [`short_name`](https://developer.chrome.com/docs/extensions/reference/manifest/short-name)

**Overview:** Optional key holding a shortened version of the extension's name, used where there is not enough space for the full name. If it is missing, a truncated version of `"name"` displays instead.

**Values / notes:**
- `"short_name": "Short Name"` — a plain string; a maximum of **12 characters** is recommended (the manifest index states it as a hard maximum).
- No default; the fallback is an automatically truncated `"name"`.
- No minimum Chrome version and no permission interactions; localizable like `name`.
  - *Key terms/entities:* `short_name`, 12 characters, `name`, truncated name fallback, extension management page

### [`storage`](https://developer.chrome.com/docs/extensions/reference/manifest/storage)

**Overview:** Declares the JSON Schema for the `managed` storage area which, unlike `local` and `sync`, must declare its structure as JSON Schema and is strictly validated by Chrome. The schema names the enterprise policies a system administrator can configure for a policy-installed extension.

**Values / notes:**
- Object with one property: `"storage": { "managed_schema": "schema.json" }` — a file inside the extension.
- Policies are read through `storage.managed`, `storage.onChanged` fires when a policy changes, and the loaded set can be inspected at `chrome://policy`. Chrome does **not** enforce the values — the extension must.
- Schema constraints: top-level `type` must be `object`; the top-level object may not have `additionalProperties` (its `properties` are the policy names); every subschema needs a `$ref` or exactly one `type`. Supported simple types include `boolean`, `integer`, `string`, `number`, `array`, `object`.
- An invalid schema prevents the extension from loading; a policy value violating the schema is simply not published by `storage.managed`.
  - *Key terms/entities:* `storage`, `managed_schema`, `schema.json`, `storage.managed`, `storage.onChanged`, `chrome://policy`, JSON Schema, `$ref`, `additionalProperties`, enterprise policies

### [`trial_tokens`](https://developer.chrome.com/docs/extensions/reference/manifest/trial_tokens)

**Overview:** Optional array of origin-trial tokens that enables Origin Trial and Deprecation Trial features inside extension contexts. Browse and register for running trials on the [active trials](https://developer.chrome.com/docs/extensions/reference/manifest/active-trials) page.

**Values / notes:**
- `"trial_tokens": ["<base64 token>", "<second token>"]` — one array entry per trial, so several trials can run at once.
- Tokens are issued per origin; register the extension's `chrome-extension://<id>` origin, which requires a stable ID via the `key` manifest field.
- Any API permission the trialed feature needs must still be declared; see the [origin trial how-to](https://developer.chrome.com/docs/extensions/how-to/web-platform/origin-trials) for registering and verifying tokens in DevTools.
  - *Key terms/entities:* `trial_tokens`, origin trial, deprecation trial, base64 token, `chrome-extension://` origin, `key`, `minimum_chrome_version`, active trials, `/docs/web-platform/origin-trials#extensions`

### [`web_accessible_resources`](https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources)

**Overview:** Declares which packaged files web pages or other extensions may access. By default **no** resource is web accessible, because exposure lets malicious sites fingerprint installed extensions or exploit XSS in them; only extension-origin pages/scripts can otherwise read them.

**Values / notes:**
- Array of objects, each mapping `"resources"` to `"matches"` and/or `"extension_ids"`; every element needs `"resources"` plus at least one of `"matches"`/`"extension_ids"`.
- `"resources"`: relative paths from the extension root, `*` wildcards allowed (`"/images/*"`, `"*.png"`).
- `"matches"`: match patterns for sites; only the origin is used (subdomains included), and a path other than `/*` raises "Invalid match pattern". `"extension_ids"`: IDs of extensions allowed in.
- `"use_dynamic_url": true` limits access to a per-session dynamic ID, regenerated on browser restart or extension reload.
- Served at `chrome-extension://[PACKAGE ID]/[PATH]` (build with `runtime.getURL()`) with CORS headers, so `fetch()` works; navigations to non-listed resources, `webRequest` redirects into them, and incognito navigation (unless `"incognito": "split"`) are blocked. Content scripts themselves need no listing.
  - *Key terms/entities:* `web_accessible_resources`, `resources`, `matches`, `extension_ids`, `use_dynamic_url`, `chrome-extension://[PACKAGE ID]/[PATH]`, `runtime.getURL()`, CORS, `fetch()`, `webRequest`, `incognito: "split"`, fingerprinting

### [`version`](https://developer.chrome.com/docs/extensions/reference/manifest/version)

**Overview:** **Required** string of one to four dot-separated integers identifying the extension's version; a published version newer than the installed one triggers an automatic update. This page also documents `version_name`, the display-only variant.

**Values / notes:**
- Each integer must be 0–65535, must not start with `0` unless it is exactly zero (`032` is invalid), and the whole string must not be all zeros (`0` and `0.0.0.0` are invalid, `0.1.0.0` is valid).
- Valid examples: `"version": "1"`, `"1.0"`, `"2.10.2"`, `"3.1.2.4567"`. Comparison is left-to-right, a missing integer counts as zero, so `1.1.9.9999` > `1.1` and `1.2` > `1.1.9.9999`.
- **"Version name"** *(anchor unverified)*: `"version_name"` (e.g. `"1.0 beta"`, `"build rc2"`) is used only for display and falls back to `version` when absent.
  - *Key terms/entities:* `version`, `version_name`, 65535, dot-separated integers, leading zero rule, automatic update, "1.0 beta", "build rc2", extension management page

### [`mime_types_handler`](https://developer.chrome.com/docs/extensions/reference/manifest/mime-types-handler)

**Overview:** Optional key that registers the extension as a handler for supported MIME types: when the user opens such a document, Chrome loads the extension's handler page instead of its built-in viewer. Details and examples live in the [`chrome.mimeHandler`](https://developer.chrome.com/docs/extensions/reference/api/mimeHandler) API reference.

**Values / notes:**
- Dictionary mapping MIME type → `{ "handler_url", "can_embed" }`, e.g. `"mime_types_handler": { "application/pdf": { "handler_url": "viewer.html", "can_embed": true } }`.
- `"handler_url"` (required): HTML file inside the extension that renders the document.
- `"can_embed"` (optional, default `false`): whether to handle documents embedded in `<embed>`, `<object>`, or `<iframe>`; `false` means only top-level navigations reach the handler.
- As of **Chrome 151**, `application/pdf` is the only MIME type available to public handlers; declaring an unsupported type raises an installation warning.
  - *Key terms/entities:* `mime_types_handler`, `handler_url`, `can_embed`, `application/pdf`, `chrome.mimeHandler`, Chrome 151, `<embed>`, `<object>`, `<iframe>`, installation warning

---

## 7. Permissions Reference

### [Permissions](https://developer.chrome.com/docs/extensions/reference/permissions-list)

**Overview:** Exhaustive alphabetical reference of every `"permission"` string usable in `manifest.json`, each mapped to the API or capability it unlocks and, where applicable, the verbatim install-time warning Chrome displays. The intro notes that some permissions trigger warnings users must allow to keep using the extension, and routes to [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) for how declarations work and [Permission warning guidelines](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings) for minimizing warnings.

**Sections:**
- **"Permissions"** *(no H2 headings observed — one intro paragraph plus a single alphabetical definition list)*: Every entry names one permission string and the API/capability it grants.
  - **Silent API permissions (no warning):** `"alarms"`, `"audio"`, `"background"` (Chrome starts early and shuts down late), `"browsingData"`, `"certificateProvider"`, `"contextMenus"`, `"cookies"`, `"declarativeContent"`, `"dns"`, `"documentScan"`, `"enterprise.deviceAttributes"` / `"enterprise.hardwarePlatform"` / `"enterprise.networkingAttributes"` / `"enterprise.platformKeys"`, `"fileBrowserHandler"`, `"fileSystemProvider"`, `"fontSettings"`, `"gcm"` (also `chrome.instanceID`), `"identity"`, `"idle"`, `"loginState"`, `"offscreen"`, `"platformKeys"`, `"power"`, `"printerProvider"`, `"printing"`, `"printingMetrics"`, `"processes"`, `"publicSuffix"`, `"runtime"` (only `runtime.connectNative()` / `runtime.sendNativeMessage()`), `"scripting"`, `"search"`, `"sidePanel"`, `"storage"`, `"system.cpu"` / `"system.display"` / `"system.memory"`, `"tts"`, `"vpnProvider"`, `"webRequest"`.
  - **Warning-triggering (warning text in short form):** `"bookmarks"` *Read and change your bookmarks*; `"history"` *Read and change your browsing history on all signed-in devices*; `"tabs"` / `"webNavigation"` *Read your browsing history*; `"topSites"` *Read a list of your most frequently visited websites*; `"management"` *Manage your apps, extensions, and themes*; `"notifications"` *Display notifications*; `"privacy"` *Change your privacy-related settings*; `"contentSettings"` *Change your settings that control websites' access to…*; `"downloads"` *Manage your downloads*; `"readingList"` *Read and change entries in the reading list*; `"tabGroups"` *View and manage your tab groups*; `"system.storage"` *Identify and eject storage devices*; `"ttsEngine"` *Read all text spoken using synthesized speech*; `"desktopCapture"` *Capture content of your screen*; `"declarativeNetRequest"` *Block content on any page*; `"accessibilityFeatures.read"` / `"accessibilityFeatures.modify"` *Read/Change your accessibility settings*; `"debugger"` *Access the page debugger backend* + *Read and change all your data on all websites*; `"pageCapture"`, `"proxy"`, `"tabCapture"`, `"webAuthenticationProxy"` all *Read and change all your data on all websites*.
  - **Special / scoped permissions:** `"activeTab"` (temporary access via a user gesture, no warning); `"unlimitedStorage"` (unlimited quota for `chrome.storage.local`, IndexedDB, Cache Storage, Origin Private File System); `"nativeMessaging"` (*Communicate with cooperating native applications*); `"webRequestBlocking"` (blocking `chrome.webRequest`); `"declarativeNetRequestWithHostAccess"` (DNR, but host permissions required for all actions); `"declarativeNetRequestFeedback"` (DevTools console errors/warnings; unpacked-only, ignored for Web Store installs; *Read your browsing history*); `"downloads.open"` (`downloads.open()`) and `"downloads.ui"` (`downloads.setUiOptions()`); `"identity.email"` (*Know your email address*); `"favicon"` (*Read the icons of the websites you visit*); `"clipboardRead"` / `"clipboardWrite"` (*Read/Modify data you copy and paste*); `"geolocation"` (no user prompt, *Detect your physical location*); `"userScripts"` (user must also explicitly enable it); `"sessions"` (warning varies when paired with `"history"` or `"tabs"`).
  - *Key terms/entities:* `"activeTab"`, `"unlimitedStorage"`, `"declarativeNetRequestWithHostAccess"`, `"declarativeNetRequestFeedback"`, `"webRequestBlocking"`, `"nativeMessaging"`, `"favicon"`, `"identity.email"`, `"downloads.open"`, `"downloads.ui"`, `"clipboardRead"`, `"geolocation"`, `"tabs"`, `manifest.json`, install-time warning

---

## 8. API Reference

### 8.1 Core Runtime & Messaging

### [API reference](https://developer.chrome.com/docs/extensions/reference/api)

**Overview:** Hub for every Chrome Extensions API namespace. An API is a namespace of methods, events, and types, usually paired with `manifest.json` fields and permissions; from Chrome 148 each one is also reachable as `browser.*`, pointing at the same objects as `chrome.*`. Manifest V3 is supported generally in Chrome 88+.

**Sections:** "Common Extensions API features" · "Chrome Extension APIs" (index of ~90 namespaces: `accessibilityFeatures` … `windows`, incl. ChromeOS-only, Dev-channel, and "Requires policy" modules).
- **"Common Extensions API features"** *(anchor unverified)*: APIs are async unless stated otherwise and return promises; manifest permissions gate most namespaces; set `minimum_chrome_version` for newer APIs; MV3 generally supported in Chrome 88+.
  - *Key terms/entities:* `chrome.*`, `browser.*` (Chrome 148), `manifest.json`, permissions, promises, `minimum_chrome_version`, `#type-Debuggee`

### [chrome.accessibilityFeatures](https://developer.chrome.com/docs/extensions/reference/api/accessibilityFeatures)

**Overview:** Manages Chrome's accessibility features as `types.ChromeSetting` objects with `get()`/`set()`/`clear()`. Reading state requires the `accessibilityFeatures.read` permission; changing it requires `accessibilityFeatures.modify`, which does **not** imply `.read`.

**Sections:** Description · Permissions (`accessibilityFeatures.modify`, `accessibilityFeatures.read`) · Properties (`animationPolicy`, `autoclick`, `caretHighlight`, `cursorColor`, `cursorHighlight`, `dictation`, `dockedMagnifier`, `focusHighlight`, `highContrast`, `largeCursor`, `screenMagnifier`, `selectToSpeak`, `spokenFeedback`, `stickyKeys`, `switchAccess`, `virtualKeyboard`).
- **"Properties"** *(anchor unverified)*: every property is a `types.ChromeSetting<T>`; `get()` needs `.read`, `set()`/`clear()` need `.modify`; `animationPolicy` takes `"allowed" | "once" | "none"`, all others `boolean`; ALL are ChromeOS only.
  - *Key terms/entities:* `types.ChromeSetting`, `accessibilityFeatures.read`, `accessibilityFeatures.modify`, ChromeOS only, Chrome 51/85/87/90+

### [chrome.alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)

**Overview:** Schedules code to run periodically or at a specified time in the future; requires the `"alarms"` permission. Alarms keep running while the device sleeps but never wake it, and they replace `setTimeout`/`setInterval` in MV3 service workers (which get terminated).

**Sections:** Description · Permissions · Concepts and usage (Device sleep, Persistence, Other browsers and earlier versions of Chrome) · Examples (Set an alarm, Respond to an alarm) · Types (`Alarm`: `name`, `periodInMinutes`, `persistAcrossSessions`, `scheduledTime`; `AlarmCreateInfo`: `name`, `delayInMinutes`, `periodInMinutes`, `persistAcrossSessions`, `when`) · Methods (`clear`, `clearAll`, `create`, `get`, `getAll`) · Events (`onAlarm`).
- **"Concepts and usage"** *(anchor unverified)*: after device sleep, missed alarms fire at most once and repeating alarms reschedule from wake time; `persistAcrossSessions` (Chrome 150+) is `true` by default in Chrome but unpredictable on older Chrome/other browsers, so recreate alarms at service-worker startup via `alarms.get()`.
- **"Methods"** *(anchor unverified)*: alarms fire at most once per second — `delayInMinutes`/`periodInMinutes` under 1s warn and are not honored; initial time is `when` XOR `delayInMinutes`; same-name alarms are replaced. Promise support: `create` Chrome 111+, all others Chrome 91+.
  - *Key terms/entities:* `"alarms"`, `periodInMinutes`, `delayInMinutes`, `when`, `persistAcrossSessions`, `scheduledTime`, `#type-Alarm`, `#type-AlarmCreateInfo`, `#property-Alarm-persistAcrossSessions`

### [chrome.commands](https://developer.chrome.com/docs/extensions/reference/api/commands)

**Overview:** Adds keyboard shortcuts that trigger extension actions. Commands are declared as properties of the manifest `"commands"` object (a manifest key, not a permission) and handled in the service worker through `commands.onCommand`.

**Sections:** Description · Manifest · Concepts and usage (Supported Keys, Key combination requirements, Handle command events, Action commands, Scope) · Examples (Basic command, Action command, Verify commands registered) · Types (`Command`: `description`, `name`, `shortcut`) · Methods (`getAll`) · Events (`onCommand`).
- **[Key combination requirements](https://developer.chrome.com/docs/extensions/reference/api/commands#key-combinations)**: shortcuts must include `Ctrl` or `Alt`; `Ctrl+Alt` is forbidden (AltGr conflict); media keys take no modifiers; `Shift` optional; `Search` is ChromeOS-only; macOS auto-maps `Ctrl`→`Command`, use `MacCtrl` for real Control (invalid on other platforms). Max four suggested shortcuts; users add more at `chrome://extensions/shortcuts`.
- **[Action commands](https://developer.chrome.com/docs/extensions/reference/api/commands#action_commands)**: `_execute_action` (MV3) and `_execute_browser_action`/`_execute_page_action` (MV2) never fire `onCommand`. `"global": true` commands work while Chrome is unfocused, restricted to `Ctrl+Shift+[0..9]`, unsupported on ChromeOS.
- **"Methods"** *(anchor unverified)*: only `getAll()` (Chrome 96+); before Chrome 110 it omitted `_execute_action` — call it at install to detect unassigned shortcuts.
  - *Key terms/entities:* `"commands"`, `suggested_key`, `default`/`chromeos`/`linux`/`mac`/`windows`, `description`, `global`, `_execute_action`, `#type-Command`

### [chrome.events](https://developer.chrome.com/docs/extensions/reference/api/events)

**Overview:** Common types shared by every API that dispatches events: the `Event` object (listener registration plus declarative rule methods) and the `Rule`/`UrlFilter` shapes those rules and event filters use. No permission or manifest key required.

**Sections:** Description · Concepts and usage (Declarative Event Handlers: Rules, Event objects, Add rules, Remove rules, Retrieve rules, Performance; Filtered events) · Types (`Event`: `addListener`, `addRules`, `getRules`, `hasListener`, `hasListeners`, `removeListener`, `removeRules`; `Rule`: `actions`, `conditions`, `id`, `priority`, `tags`; `UrlFilter`: `cidrBlocks`, `hostContains`, `hostEquals`, `hostPrefix`, `hostSuffix`, `originAndPathMatches`, `pathContains`, `pathEquals`, `pathPrefix`, `pathSuffix`, `ports`, `queryContains`, `queryEquals`, `queryPrefix`, `querySuffix`, `schemes`, `urlContains`, `urlEquals`, `urlMatches`, `urlPrefix`, `urlSuffix`).
- **"Filtered events"** *(anchor unverified)*: pass a filter object as `addListener()`'s second argument so a service worker is not woken for irrelevant events; URL filters match like `events.UrlFilter` but cannot match scheme or port.
- **"Declarative Event Handlers"** *(anchor unverified)*: rules persist across sessions — clear and re-register them in `runtime.onInstalled`; add/remove in bulk; prefer `hostSuffix`/`pathContains` over `urlMatches` (RE2) for speed; failing validation sets `runtime.lastError`.
  - *Key terms/entities:* `#type-Rule`, `#type-UrlFilter`, `#method-Event-addRules`, `#method-Event-removeRules`, `#method-Event-getRules`, `cidrBlocks` (Chrome 123+), `priority` (default 100), `runtime.lastError`, `runtime.onInstalled`

### [chrome.extension](https://developer.chrome.com/docs/extensions/reference/api/extension)

**Overview:** Utility namespace usable from any extension page: enumerate extension views/windows, query incognito and `file://` access, and set update-URL data. No permission or manifest key required; the message-passing helpers it once held now live in `chrome.runtime`.

**Sections:** Description · Types (`ViewType`: `"tab"`, `"popup"`) · Properties (`inIncognitoContext`) · Methods (`getBackgroundPage`, `getViews`, `isAllowedFileSchemeAccess`, `isAllowedIncognitoAccess`, `setUpdateUrlData`).
- **"Methods"** *(anchor unverified)*: `getBackgroundPage()` and `getViews()` are **Foreground only** (unavailable to a service worker) and return `Window`/`Window[]`; `getViews({tabId, type, windowId})` filters results (`tabId` Chrome 54+). `isAllowedFileSchemeAccess()`/`isAllowedIncognitoAccess()` resolve a `Promise<boolean>` (Chrome 99+) mirroring the `chrome://extensions` "Allow access to File URLs" and "Allowed in Incognito" toggles; `setUpdateUrlData()` writes the update-URL `ap` parameter (ignored for Web Store-hosted extensions).
- **"Properties"** *(anchor unverified)*: `inIncognitoContext` is `true` for content scripts in incognito tabs and for extension pages in an incognito process (`incognito: "split"` only).
  - *Key terms/entities:* `#type-ViewType`, `ViewType`, `inIncognitoContext`, `getViews`, `tabId`, `windowId`, `getBackgroundPage`, `isAllowedFileSchemeAccess()`, `isAllowedIncognitoAccess()`, `setUpdateUrlData()`

### [chrome.extensionTypes](https://developer.chrome.com/docs/extensions/reference/api/extensionTypes)

**Overview:** Type declarations only — no methods, events, permissions, or manifest keys. Supplies the shared enums and option objects consumed by script/CSS injection and image-capture APIs (`scripting`, `tabs.insertCSS`, `tabCapture`).

**Sections:** Description · Types (`ColorArray`, `CSSOrigin`, `DeleteInjectionDetails`, `DocumentLifecycle`, `ExecutionWorld`, `FrameType`, `ImageDataType`, `ImageDetails`, `ImageFormat`, `InjectDetails`, `RunAt`).
- **"Types"** *(anchor unverified)*: `InjectDetails` (`allFrames`, `code`, `cssOrigin`, `file`, `frameId`, `matchAboutBlank`, `runAt`) and `DeleteInjectionDetails` (`allFrames`, `code`, `cssOrigin`, `file`, `frameId`, `matchAboutBlank`) each require `code` XOR `file`; `code` carries an XSS warning. `ImageDetails` (`format` default `"jpeg"`, `quality`), `ColorArray` `[number, number, number, number]` (Chrome 139+), `ImageDataType` = `ImageData` (Chrome 139+).
- **Enums** *(anchor unverified)*: `CSSOrigin` `"author"|"user"`; `ExecutionWorld` `"ISOLATED"|"MAIN"|"USER_SCRIPT"` (Chrome 111+); `DocumentLifecycle` `"prerender"|"active"|"cached"|"pending_deletion"` (Chrome 106+); `FrameType` `"outermost_frame"|"fenced_frame"|"sub_frame"` (Chrome 106+); `ImageFormat` `"jpeg"|"png"`; `RunAt` `"document_start"|"document_end"|"document_idle"` (default `document_idle`).
  - *Key terms/entities:* `#type-CSSOrigin`, `#type-RunAt`, `#type-ImageFormat`, `InjectDetails`, `ExecutionWorld`, `DeleteInjectionDetails`, `allFrames`, `matchAboutBlank`, `frameId`, `runAt`

### [chrome.i18n](https://developer.chrome.com/docs/extensions/reference/api/i18n)

**Overview:** Internationalization infrastructure: `_locales/<localeCode>/messages.json` files, `__MSG_name__` substitution in the manifest and CSS, and `getMessage()` lookups. No permission required; if a `/_locales` directory exists, the manifest must declare `"default_locale"`.

**Sections:** Description · Manifest · Concepts and usage (Support multiple languages, Predefined messages, Locales, Search for messages, Set your browser's locale: Windows, macOS, Linux, ChromeOS) · Examples (`getMessage`, `getAcceptLanguages`, `detectLanguage`) · Types (`LanguageCode`) · Methods (`detectLanguage`, `getAcceptLanguages`, `getMessage`, `getUILanguage`).
- **[getMessage](https://developer.chrome.com/docs/extensions/reference/api/i18n#method-getMessage)**: takes up to 9 substitution strings; returns `''` when the message is missing and `undefined` on a malformed call; `options.escapeLt` (Chrome 79+) escapes `<` to `&lt;`. Predefined messages: `@@extension_id` (not usable in the manifest), `@@ui_locale`, `@@bidi_dir`, `@@bidi_reversed_dir`, `@@bidi_start_edge`, `@@bidi_end_edge`.
- **"Search for messages"** *(anchor unverified)*: lookup falls back preferred locale → same language without region (`en_GB` → `en`) → `default_locale`; unsupported locale codes are ignored by Chrome.
- **"Methods"** *(anchor unverified)*: `detectLanguage()` (Chrome 47+) uses CLD and reports `und` for unrecognized text; `getAcceptLanguages()` returns `LanguageCode[]` and differs from `getUILanguage()`, which returns the UI locale such as `en-US` or `fr-FR`.
  - *Key terms/entities:* `#type-LanguageCode`, `#method-getUILanguage`, `default_locale`, `__MSG_messagename__`, `messages.json`, `substitutions`, `escapeLt`, `#locales`

### [chrome.idle](https://developer.chrome.com/docs/extensions/reference/api/idle)

**Overview:** Detects when the machine's idle state changes between active, idle, and locked. Requires the `"idle"` permission in the manifest's `permissions` array.

**Sections:** Description · Permissions (`idle`) · Types (`IdleState`: `"active"`, `"idle"`, `"locked"`) · Methods (`getAutoLockDelay`, `queryState`, `setDetectionInterval`) · Events (`onStateChanged`).
- **"Methods"** *(anchor unverified)*: `queryState(detectionIntervalInSeconds)` resolves `IdleState`, reporting `"locked"` ahead of `"idle"`; `setDetectionInterval()` sets only the threshold used by `onStateChanged` (default 60 seconds); `getAutoLockDelay()` (Chrome 73+, **ChromeOS only**, promise since Chrome 116) returns seconds until automatic screen lock, zero if it never locks.
- **"Events"** *(anchor unverified)*: `onStateChanged` delivers `newState` = `"locked"` (screen locked or screensaver), `"idle"` (unlocked, no input for the interval), or `"active"` (input arrives on an idle system).
  - *Key terms/entities:* `"idle"`, `IdleState`, `#type-IdleState`, `queryState()`, `setDetectionInterval()`, `getAutoLockDelay()`, `onStateChanged`, 60-second default

### [chrome.permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)

**Overview:** Requests declared optional permissions at runtime instead of install time so users understand each warning and grant only what a feature needs. Optional grants are declared with `optional_permissions` / `optional_host_permissions`; requests must run inside a user gesture.

**Sections:** Description · Concepts and usage (Implement optional permissions: Steps 1–5) · Types (`Permissions`: `origins`, `permissions`) · Methods (`addHostAccessRequest`, `contains`, `getAll`, `remove`, `removeHostAccessRequest`, `request`) · Events (`onAdded`, `onRemoved`).
- **"Concepts and usage"** *(anchor unverified)*: optional grants stop an upgrade from disabling the extension; `request()` prompts only for warning messages the user has not accepted, ignores pattern paths, and accepts subsets of a broad `"*://*/*"` grant. Eight permissions can never be optional: `"debugger"`, `"declarativeNetRequest"`, `"devtools"`, `"geolocation"`, `"mdns"`, `"proxy"`, `"tts"`, `"ttsEngine"`. Re-requesting after `remove()` usually adds back without a prompt.
- **"Methods"** *(anchor unverified)*: `contains`, `getAll`, `request`, `remove` return promises (Chrome 96+; rejections on failure). `addHostAccessRequest`/`removeHostAccessRequest` (Chrome 133+) take a `tabId` or top-level `documentId` plus optional `pattern`, reset on cross-origin navigation, and on acceptance grant persistent access to the site's top origin.
  - *Key terms/entities:* `Permissions.origins`, `Permissions.permissions`, `optional_permissions`, `optional_host_permissions`, `#type-Permissions`, `#property-Permissions-origins`, `documentId`, `onAdded`, `onRemoved`

### [chrome.power](https://developer.chrome.com/docs/extensions/reference/api/power)

**Overview:** Overrides the system's power management features so the machine and/or screen stay awake. Requires the `"power"` permission.

**Sections:** Description · Permissions (`power`) · Concepts and usage · Types (`Level`: `"system"`, `"display"`) · Methods (`releaseKeepAwake`, `reportActivity`, `requestKeepAwake`).
- **"Concepts and usage"** *(anchor unverified)*: `"system"` prevents sleep in response to inactivity but still allows the screen to dim or turn off; `"display"` keeps screen and system active. With several extensions holding levels, `"display"` wins until that request is released or unloaded, then `"system"` resumes; a new request from the same extension replaces the old one.
- **"Methods"** *(anchor unverified)*: `requestKeepAwake(level)` and `releaseKeepAwake()` return nothing (no promise); `reportActivity()` (Chrome 113+, **ChromeOS only**) wakes a dimmed/off screen or exits the screensaver and returns `Promise<void>`.
  - *Key terms/entities:* `"power"`, `Level`, `#type-Level`, `requestKeepAwake()`, `releaseKeepAwake()`, `reportActivity()`, screensaver, keep awake

### [chrome.runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime)

**Overview:** Core namespace for messaging (one-shot, long-lived ports, cross-extension, native), manifest/platform metadata, lifecycle events, and URL helpers. Most members need no permission; only `connectNative()`, `sendNativeMessage()`, and `onConnectNative` require `"nativeMessaging"`.

**Sections:** Description · Concepts and usage (Message passing, Accessing extension and platform metadata, Managing extension lifecycle and options, Helper utilities, Kiosk mode utilities, Unpacked extension behavior) · Use cases · Examples · Types (`ContextFilter`, `ContextType`, `ExtensionContext`, `ExtensionLoadDetails`, `MessageSender`, `OnInstalledReason`, `OnLoadedReason`, `OnRestartRequiredReason`, `PlatformArch`, `PlatformInfo`, `PlatformNaclArch`, `PlatformOs`, `Port`, `RequestUpdateCheckStatus`) · Properties (`id`, `lastError`) · Methods (`connect`, `connectNative`, `getBackgroundPage`, `getContexts`, `getManifest`, `getPackageDirectoryEntry`, `getPlatformInfo`, `getURL`, `getVersion`, `openOptionsPage`, `reload`, `requestUpdateCheck`, `restart`, `restartAfterDelay`, `sendMessage`, `sendNativeMessage`, `setUninstallURL`) · Events (`onBrowserUpdateAvailable`, `onConnect`, `onConnectExternal`, `onConnectNative`, `onEnabled`, `onExtensionLoaded`, `onInstalled`, `onMessage`, `onMessageExternal`, `onRestartRequired`, `onStartup`, `onSuspend`, `onSuspendCanceled`, `onUpdateAvailable`, `onUserScriptConnect`, `onUserScriptMessage`).
- **"Concepts and usage"** *(anchor unverified)*: reloading an unpacked extension counts as an update, so `onInstalled` fires with reason `"update"`. `lastError` is readable only inside the failing call's callback, and promise-returning APIs never set it. `sendMessage()` never reaches content scripts (use `tabs.sendMessage`); promises exist from Chrome 99 in extension contexts and Chrome 118 from web pages. `setUninstallURL` caps at 1023 characters.
- **Version / platform gates** *(anchor unverified)*: `getContexts` + `ExtensionContext` Chrome 116+; `getVersion` Chrome 143+; `getBackgroundPage` **deprecated in Chrome 133** (MV3 has no background pages); `onEnabled` Chrome 155+, `onExtensionLoaded`/`ExtensionLoadDetails` Chrome 157+, `onUserScriptConnect`/`onUserScriptMessage` Chrome 115+; `onConnectNative` and kiosk `restart()`/`restartAfterDelay()` are ChromeOS only. `onMessage` may return `boolean | Promise<any> | undefined`.
  - *Key terms/entities:* `Port`, `postMessage()`, `disconnect()`, `onDisconnect`, `MessageSender`, `ContextFilter`, `#type-MessageSender`, `#method-connectNative`, `#event-onConnectNative`, `#property-lastError`, `#type-OnInstalledReason`

### [chrome.types](https://developer.chrome.com/docs/extensions/reference/api/types)

**Overview:** Type declarations for Chrome browser settings, chiefly the generic `ChromeSetting` interface that settings APIs (`proxy`, `privacy`, `fontSettings`, `accessibilityFeatures`) reuse for `get()` / `set()` / `clear()` plus an `onChange` event.

**Sections:** Description · Chrome settings (Scope and lifecycle, Precedence) · Types (`ChromeSetting`, `ChromeSettingScope`, `LevelOfControl`).
- **"Chrome settings"** *(anchor unverified)*: scopes are `regular` (inherited by incognito unless overridden), `incognito_persistent` (stored on disk, survives restarts), and `incognito_session_only` (not persisted, cleared when the last incognito window closes, settable only while one is open). Precedence runs OS settings → command line → extensions → policies; between extensions the most recently installed wins; `LevelOfControl` tells whether the value is really effective.
- **"Types"** *(anchor unverified)*: `ChromeSetting` exposes `get` (`{incognito}`), `set` (`{scope, value}`), `clear` (`{scope}`, default `regular`) — all promise-returning from Chrome 96+ — and `onChange`, whose `details` carry `value`, `levelOfControl`, and `incognitoSpecific` (only when the extension runs in incognito). Enums: `ChromeSettingScope` (`"regular"`, `"regular_only"`, `"incognito_persistent"`, `"incognito_session_only"`), `LevelOfControl` (`"not_controllable"`, `"controlled_by_other_extensions"`, `"controllable_by_this_extension"`, `"controlled_by_this_extension"`).
  - *Key terms/entities:* `#type-ChromeSetting`, `#type-ChromeSettingScope`, `#type-LevelOfControl`, `regular_only`, `incognito_session_only`, `not_controllable`, `controllable_by_this_extension`, enterprise policies

### 8.2 Tabs, Windows & Browser UI

### [chrome.action](https://developer.chrome.com/docs/extensions/reference/api/action)

**Overview:** Controls the extension's toolbar icon — image, tooltip, badge, and popup — globally or per tab. Declared with the manifest `"action"` key (MV3; Chrome 88+; `browser.action` alias since Chrome 148). Setters accept an optional `tabId`; `onClicked` never fires when a popup is set.

**Sections:** Description · Availability (Chrome 88+) · Manifest (`"action"`) · Concepts and usage (Parts of the UI, Icon, Tooltip (title), Badge, Popup) · Use cases (Per-tab state, Enabled state) · Examples (Show a popup, Inject a content script on click, Emulate actions with declarativeContent) · Types (`OpenPopupOptions`: `windowId`; `TabDetails`: `tabId`; `UserSettings`: `isOnToolbar`; `UserSettingsChange`: `isOnToolbar`) · Methods (`disable`, `enable`, `getBadgeBackgroundColor`, `getBadgeText`, `getBadgeTextColor`, `getPopup`, `getTitle`, `getUserSettings`, `isEnabled`, `openPopup`, `setBadgeBackgroundColor`, `setBadgeText`, `setBadgeTextColor`, `setIcon`, `setPopup`, `setTitle`) · Events (`onClicked`, `onUserSettingsChanged`).
- **"Concepts and usage"** *(anchor unverified)*: icons must be 16 DIP; SVG unsupported (unpacked extensions need PNG); popup is 25x25–800x600 px; badge fits ~four characters; tab-specific settings override global and reset when the tab closes; `default_state: "disabled"` requires `enable()`.
  - *Key terms/entities:* `default_icon`, `default_title`, `default_popup`, `default_state`, `setIcon()`, `OffscreenCanvas`, `#type-TabDetails`, `declarativeContent.ShowAction`, `openPopup()` (Chrome 127+; policy-only 118–126)

### [chrome.bookmarks](https://developer.chrome.com/docs/extensions/reference/api/bookmarks)

**Overview:** Creates, organizes, searches, and deletes bookmarks and folders in the bookmark tree; requires the `"bookmarks"` permission. Nodes are `BookmarkTreeNode` objects, and most methods return promises from Chrome 90+. Pairs with override pages for a custom Bookmark Manager.

**Sections:** Description · Permissions (`bookmarks`) · Concepts and usage (Objects and properties, Examples) · Types (`BookmarkTreeNode`: `children`, `dateAdded`, `dateGroupModified`, `dateLastUsed`, `folderType`, `id`, `index`, `parentId`, `syncing`, `title`, `unmodifiable`, `url`; `BookmarkTreeNodeUnmodifiable`: `"managed"`; `CreateDetails`: `index`, `parentId`, `title`, `url`; `FolderType`: `"bookmarks-bar"`, `"other"`, `"mobile"`, `"managed"`) · Properties (`MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE`, `MAX_WRITE_OPERATIONS_PER_HOUR`, `ROOT_NODE_ID`) · Methods (`create`, `get`, `getChildren`, `getRecent`, `getSubTree`, `getTree`, `move`, `remove`, `removeTree`, `search`, `update`) · Events (`onChanged`, `onChildrenReordered`, `onCreated`, `onImportBegan`, `onImportEnded`, `onMoved`, `onRemoved`).
- **"Concepts and usage"** *(anchor unverified)*: cannot add/remove entries in the root folder or rename, move, or remove "Bookmarks Bar" and "Other Bookmarks"; `update()` changes only `title` and `url`; `onRemoved` fires once for a recursively deleted folder; `onImportBegan`/`onImportEnded` bracket imports.
  - *Key terms/entities:* `parentId`, `ROOT_NODE_ID` (`"0"`, Chrome 145+), `FolderType` (Chrome 134+), `dateLastUsed` (Chrome 114+), `syncing`, `unmodifiable`, write limits deprecated (1,000,000, unenforced)

### [chrome.contextMenus](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)

**Overview:** Adds items to Chrome's right-click context menu, scoped by context type (page, selection, link, image, action, tab, ...) and URL patterns; requires the `"contextMenus"` permission. Items can be created for any document, including `file://` and `chrome://` URLs, filtered with `documentUrlPatterns`.

**Sections:** Description · Permissions (`contextMenus`) · Concepts and usage · Examples · Types (`ContextType`: `"all"`, `"page"`, `"frame"`, `"selection"`, `"link"`, `"editable"`, `"image"`, `"video"`, `"audio"`, `"launcher"`, `"action"`, `"tab"`; `CreateProperties`: `checked`, `contexts`, `documentUrlPatterns`, `enabled`, `id`, `parentId`, `targetUrlPatterns`, `title`, `type`, `visible`, `onclick`; `ItemType`: `"normal"`, `"checkbox"`, `"radio"`, `"separator"`; `OnClickData`: `checked`, `editable`, `frameId`, `frameUrl`, `linkUrl`, `mediaType`, `menuItemId`, `pageUrl`, `parentMenuItemId`, `selectionText`, `srcUrl`, `wasChecked`) · Properties (`ACTION_MENU_TOP_LEVEL_LIMIT`) · Methods (`create`, `remove`, `removeAll`, `update`) · Events (`onClicked`).
- **"Concepts and usage"** *(anchor unverified)*: multiple visible items from one extension collapse into a single parent menu; `ACTION_MENU_TOP_LEVEL_LIMIT` = 6 for the action context; `title` is required unless `type` is `separator` and supports `%s`; `onclick` is unavailable in service workers (use `onClicked`).
  - *Key terms/entities:* `ContextType` (Chrome 44+), `CreateProperties` (Chrome 123+), `title`, `%s`, `documentUrlPatterns`, `targetUrlPatterns`, `runtime.lastError`, promises (Chrome 123+)

### [chrome.downloads](https://developer.chrome.com/docs/extensions/reference/api/downloads)

**Overview:** Programmatically initiates, monitors, manipulates, and searches downloads; requires the `"downloads"` permission, with extra `"downloads.open"` / `"downloads.ui"` (or deprecated `"downloads.shelf"`) for the matching methods. Promise-based since Chrome 96.

**Sections:** Description · Permissions (`downloads`) · Examples · Types (`BooleanDelta`: `current`, `previous`; `DangerType`; `DoubleDelta`: `current`, `previous`; `DownloadDelta`: `canResume`, `danger`, `endTime`, `error`, `exists`, `fileSize`, `filename`, `finalUrl`, `id`, `mime`, `paused`, `startTime`, `state`, `totalBytes`, `url`; `DownloadItem`: `byExtensionId`, `byExtensionName`, `bytesReceived`, `canResume`, `danger`, `endTime`, `error`, `estimatedEndTime`, `exists`, `fileSize`, `filename`, `finalUrl`, `id`, `incognito`, `mime`, `paused`, `referrer`, `startTime`, `state`, `totalBytes`, `url`; `DownloadOptions`: `body`, `conflictAction`, `filename`, `headers`, `method`, `saveAs`, `url`; `DownloadQuery`: `bytesReceived`, `danger`, `endTime`, `endedAfter`, `endedBefore`, `error`, `exists`, `fileSize`, `filename`, `filenameRegex`, `finalUrl`, `finalUrlRegex`, `id`, `limit`, `mime`, `orderBy`, `paused`, `query`, `startTime`, `startedAfter`, `startedBefore`, `state`, `totalBytes`, `totalBytesGreater`, `totalBytesLess`, `url`, `urlRegex`; `FilenameConflictAction`: `"uniquify"`, `"overwrite"`, `"prompt"`; `FilenameSuggestion`: `conflictAction`, `filename`; `GetFileIconOptions`: `size`; `HeaderNameValuePair`: `name`, `value`; `HttpMethod`: `"GET"`, `"POST"`; `InterruptReason`; `State`: `"in_progress"`, `"interrupted"`, `"complete"`; `StringDelta`: `current`, `previous`; `UiOptions`: `enabled`) · Methods (`acceptDanger`, `cancel`, `download`, `erase`, `getFileIcon`, `open`, `pause`, `removeFile`, `resume`, `search`, `setShelfEnabled` (deprecated Chrome 117), `setUiOptions`, `show`, `showDefaultFolder`) · Events (`onChanged`, `onCreated`, `onDeterminingFilename`, `onErased`).
- **"Methods"** *(anchor unverified)*: `acceptDanger()` works only from a visible context; `open()` requires a user gesture and `"downloads.open"`; `search()` defaults to `limit` 1000 and re-checks file existence at most every 10 seconds; `download()` error strings are not stable — never parse them.
  - *Key terms/entities:* `onDeterminingFilename` (one listener per extension, must call `suggest()` once, return `true` if async), `setUiOptions()` Chrome 105+, `getFileIcon()` size 16/32, `startedAfter` paging, `runtime.lastError`

### [chrome.history](https://developer.chrome.com/docs/extensions/reference/api/history)

**Overview:** Reads and edits the browser's record of visited pages — add, delete, and query URLs and visits; requires the `"history"` permission. Queries return `HistoryItem` (page-level) and `VisitItem` (visit-level) objects; all methods return promises from Chrome 96+.

**Sections:** Description · Permissions (`history`) · Concepts and usage (Transition types) · Examples · Types (`HistoryItem`: `id`, `lastVisitTime`, `title`, `typedCount`, `url`, `visitCount`; `TransitionType`: `"link"`, `"typed"`, `"auto_bookmark"`, `"auto_subframe"`, `"manual_subframe"`, `"generated"`, `"auto_toplevel"`, `"form_submit"`, `"reload"`, `"keyword"`, `"keyword_generated"`; `UrlDetails`: `url`; `VisitItem`: `id`, `isLocal`, `referringVisitId`, `transition`, `visitId`, `visitTime`) · Methods (`addUrl`, `deleteAll`, `deleteRange`, `deleteUrl`, `getVisits`, `search`) · Events (`onVisited`, `onVisitRemoved`).
- **"Concepts and usage"** *(anchor unverified)*: transition types describe how the user reached the URL; `search()` defaults to `maxResults` 100 and `startTime` 24 hours ago; `deleteRange()` purges a page only when all its visits fall inside the range; `addUrl()` records transition `"link"`; `onVisited` fires before the page loads.
  - *Key terms/entities:* `lastVisitTime`, `typedCount`, `visitCount`, `transition`, `isLocal` (Chrome 115+), `UrlDetails` (Chrome 88+), `deleteAll()`

### [chrome.omnibox](https://developer.chrome.com/docs/extensions/reference/api/omnibox)

**Overview:** Registers a keyword with Chrome's address bar (the omnibox); while the user types it, every keystroke is sent to the extension, which answers with rich suggestions and handles the accepted input. No permission — declare `"omnibox": { "keyword": ... }` plus a 16x16 icon in the manifest.

**Sections:** Description · Manifest (`"omnibox"`) · Examples · Types (`DefaultSuggestResult`: `description`; `DescriptionStyleType`: `"url"`, `"match"`, `"dim"`; `OnInputEnteredDisposition`: `"currentTab"`, `"newForegroundTab"`, `"newBackgroundTab"`; `SuggestResult`: `content`, `deletable`, `description`) · Methods (`setDefaultSuggestion`) · Events (`onDeleteSuggestion`, `onInputCancelled`, `onInputChanged`, `onInputEntered`, `onInputStarted`).
- **"Manifest"** *(anchor unverified)*: `"omnibox.keyword"` is required; Chrome derives a grayscale 16x16 icon from the full-color one; descriptions accept only `url`, `match`, and `dim` XML-style tags (nestable) and must escape the five predefined entities.
  - *Key terms/entities:* `omnibox.keyword`, `SuggestResult.content`, `description`, `onInputChanged(text, suggest)`, `setDefaultSuggestion()` (promise Chrome 100+), `onInputStarted` (once per session, before `onInputChanged`), `onDeleteSuggestion` (Chrome 63+)

### [chrome.readingList](https://developer.chrome.com/docs/extensions/reference/api/readingList)

**Overview:** Reads and modifies the items in Chrome's Reading List (the side-panel read-later queue); requires the `"readingList"` permission. Chrome 120+, MV3 only (`browser.readingList` alias since Chrome 148). All four methods return promises.

**Sections:** Description · Permissions (`readingList`) · Availability (Chrome 120+) · Concepts and usage (Item ordering, Item uniqueness) · Use cases (Add an item, Display items, Mark an item as read, Remove an item) · Extension samples · Types (`AddEntryOptions`: `hasBeenRead`, `title`, `url`; `QueryInfo`: `hasBeenRead`, `title`, `url`; `ReadingListEntry`: `creationTime`, `hasBeenRead`, `lastUpdateTime`, `title`, `url`; `RemoveOptions`: `url`; `UpdateEntryOptions`: `hasBeenRead`, `title`, `url`) · Methods (`addEntry`, `query`, `removeEntry`, `updateEntry`) · Events (`onEntryAdded`, `onEntryRemoved`, `onEntryUpdated`).
- **"Concepts and usage"** *(anchor unverified)*: items have no guaranteed order and are keyed by URL — the hash and query string count; [`query()`](https://developer.chrome.com/docs/extensions/reference/api/readingList#method-query) matches only the `QueryInfo` properties supplied; [`addEntry()`](https://developer.chrome.com/docs/extensions/reference/api/readingList#method-addEntry) is a no-op when the entry already exists.
  - *Key terms/entities:* `#method-addEntry`, `#method-query`, `#method-removeEntry`, `#method-updateEntry`, `#type-ReadingListEntry`, `hasBeenRead`, `creationTime`, `lastUpdateTime`

### [chrome.search](https://developer.chrome.com/docs/extensions/reference/api/search)

**Overview:** Runs a query against the user's default search provider; requires the `"search"` permission. Smallest API in this group — one method (`query`) plus `QueryInfo`/`Disposition` types. Chrome 87+ (promise since Chrome 96).

**Sections:** Description · Permissions (`search`) · Availability (Chrome 87+) · Types (`Disposition`: `"CURRENT_TAB"`, `"NEW_TAB"`, `"NEW_WINDOW"`; `QueryInfo`: `disposition`, `tabId`, `text`) · Methods (`query`). No events.
- **"Types"** *(anchor unverified)*: `disposition` defaults to `CURRENT_TAB`; `tabId` selects the target tab but cannot be combined with `disposition`; `text` is required.
  - *Key terms/entities:* `search.query()`, `QueryInfo.text`, `QueryInfo.tabId`, `Disposition`, `runtime.lastError`, default search provider

### [chrome.sessions](https://developer.chrome.com/docs/extensions/reference/api/sessions)

**Overview:** Queries and restores tabs and windows from the current browsing session and from other synced devices; requires the `"sessions"` permission. Methods return promises from Chrome 96+.

**Sections:** Description · Permissions (`sessions`) · Types (`Device`: `deviceName`, `sessions`; `Filter`: `maxResults`; `Session`: `lastModified`, `tab`, `window`) · Properties (`MAX_SESSION_RESULTS`) · Methods (`getDevices`, `getRecentlyClosed`, `restore`) · Events (`onChanged`).
- **"Properties"** *(anchor unverified)*: `MAX_SESSION_RESULTS` is 25 and is the default when `Filter.maxResults` is omitted; `Session` carries either a `tabs.Tab` or a `windows.Window` (never both), and `lastModified` is in seconds since the epoch; `restore()` with no argument reopens the most recently closed session; `onChanged` ignores synced sessions.
  - *Key terms/entities:* `MAX_SESSION_RESULTS`, `restore(sessionId)`, `Tab.sessionId`, `Window.sessionId`, `getDevices()`, `getRecentlyClosed()`, `lastModified`

### [chrome.sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

**Overview:** Hosts an extension page in Chrome's side panel alongside web content, persistent across tab navigation when configured and restrictable to specific sites; requires the `"sidePanel"` permission and the `"side_panel"` manifest key. Chrome 114+, MV3 only.

**Sections:** Description · Permissions (`sidePanel`) · Availability (Chrome 114+) · Concepts and usage (Use cases: Display the same side panel on every site, Enable a side panel on a specific site, Open the side panel by clicking the toolbar icon, Programmatically open the side panel on user interaction, Switch to a different panel; Side panel user experience: Open the side panel, Pin the side panel) · Examples · Types (`CloseOptions`: `tabId`, `windowId`; `GetPanelOptions`: `tabId`; `OpenOptions`: `tabId`, `windowId`; `PanelBehavior`: `openPanelOnActionClick`; `PanelClosedInfo`: `path`, `tabId`, `windowId`; `PanelLayout`: `side`; `PanelOpenedInfo`: `path`, `tabId`, `windowId`; `PanelOptions`: `enabled`, `path`, `tabId`; `Side`: `"left"`, `"right"`; `SidePanel`: `default_path`) · Methods (`close`, `getLayout`, `getOptions`, `getPanelBehavior`, `open`, `setOptions`, `setPanelBehavior`) · Events (`onClosed`, `onOpened`).
- **"Concepts and usage"** *(anchor unverified)*: [`open()`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#method-open) (Chrome 116+) works only in response to a user action and needs `windowId` (global panel) or `tabId`; `setPanelBehavior({openPanelOnActionClick: true})` opens it from the action icon; navigating to a site where the panel is disabled closes it and hides the extension from the panel menu.
  - *Key terms/entities:* `side_panel.default_path`, `setOptions({tabId, path, enabled})`, `getOptions()`, `PanelOptions.tabId` (a tab-specific and the default path at the same path are separate instances), `close()` (Chrome 141+), `getLayout()`/`Side` (Chrome 140+), `onOpened`/`onClosed`

### [chrome.tabGroups](https://developer.chrome.com/docs/extensions/reference/api/tabGroups)

**Overview:** Modifies and rearranges existing tab groups (title, color, collapsed state, position/window); requires the `"tabGroups"` permission. Chrome 89+, MV3 only. Grouping and ungrouping tabs, and querying group membership, stay in `chrome.tabs` (`tabs.group`, `tabs.ungroup`).

**Sections:** Description · Permissions (`tabGroups`) · Availability (Chrome 89+) · Types (`Color`: `"grey"`, `"blue"`, `"red"`, `"yellow"`, `"green"`, `"pink"`, `"purple"`, `"cyan"`, `"orange"`; `TabGroup`: `collapsed`, `color`, `id`, `shared`, `title`, `windowId`) · Properties (`TAB_GROUP_ID_NONE`) · Methods (`get`, `move`, `query`, `update`) · Events (`onCreated`, `onMoved`, `onRemoved`, `onUpdated`).
- **"Types"** *(anchor unverified)*: `TAB_GROUP_ID_NONE` is `-1` and marks "no group"; group IDs are unique only within a browser session; `move()` accepts `index` `-1` for the end and can only target/leave `"normal"` windows; `onMoved` skips cross-window moves (reported as remove + create).
  - *Key terms/entities:* `tabs.group()`, `TabGroup.id`, `TabGroup.windowId`, `Color`, `shared` (Chrome 137+), `query({windowId, title, color, collapsed, shared})`, `windows.WINDOW_ID_CURRENT`

### [chrome.tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)

**Overview:** Creates, queries, modifies, rearranges, groups, zooms, and screenshots browser tabs, and messages their content scripts. Most methods need no permission; `"tabs"` (or host permissions) unlocks the sensitive `Tab` fields `url`, `pendingUrl`, `title`, `favIconUrl`. Usable from the service worker and extension pages, never from content scripts.

**Sections:** Description · Permissions (`"tabs"`, host permissions, `"activeTab"`) · Use cases (Open an extension page in a new tab, Get the current tab, Mute the specified tab, Move the current tab to the first position when clicked, Pass a message to a selected tab's content script) · Extension examples · Types (`MutedInfo`: `extensionId`, `muted`, `reason`; `MutedInfoReason`: `"user"`, `"capture"`, `"extension"`; `Tab`: `active`, `audible`, `autoDiscardable`, `discarded`, `favIconUrl`, `frozen`, `groupId`, `height`, `highlighted`, `id`, `incognito`, `index`, `lastAccessed`, `mutedInfo`, `openerTabId`, `pendingUrl`, `pinned`, `selected` (deprecated), `sessionId`, `splitViewId`, `status`, `title`, `url`, `width`, `windowId`; `TabStatus`: `"unloaded"`, `"loading"`, `"complete"`; `WindowType`: `"normal"`, `"popup"`, `"panel"`, `"app"`, `"devtools"`; `ZoomSettings`: `defaultZoomFactor`, `mode`, `scope`; `ZoomSettingsMode`: `"automatic"`, `"manual"`, `"disabled"`; `ZoomSettingsScope`: `"per-origin"`, `"per-tab"`) · Properties (`MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`, `SPLIT_VIEW_ID_NONE`, `TAB_ID_NONE`, `TAB_INDEX_NONE`) · Methods (`captureVisibleTab`, `connect`, `create`, `createSplit`, `detectLanguage`, `discard`, `duplicate`, `get`, `getCurrent`, `getZoom`, `getZoomSettings`, `goBack`, `goForward`, `group`, `highlight`, `move`, `query`, `reload`, `remove`, `sendMessage`, `setZoom`, `setZoomSettings`, `ungroup`, `unsplit`, `update`) · Events (`onActivated`, `onAttached`, `onCreated`, `onDetached`, `onHighlighted`, `onMoved`, `onRemoved`, `onReplaced`, `onUpdated`, `onZoomChange`).
- **"Permissions"** *(anchor unverified)*: `"tabs"` is not namespace access — it only exposes `url`, `pendingUrl`, `title`, `favIconUrl`; `query()` silently ignores `url`/`title` filters without it; [`captureVisibleTab()`](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab) needs `<all_urls>`, host permission, or `activeTab` (the only way to capture `chrome:` pages, other extensions, and `data:` URLs); file URLs need file access.
  - *Key terms/entities:* `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` (2), `TAB_ID_NONE` (-1), `SPLIT_VIEW_ID_NONE` (-1), `createSplit()`/`unsplit()` (Chrome 155+), `splitViewId` (Chrome 140+), `tabs.group()`, `Tab.groupId`, `"Tabs cannot be edited right now (user may be dragging a tab)."` retry pattern

### [chrome.topSites](https://developer.chrome.com/docs/extensions/reference/api/topSites)

**Overview:** Returns the most-visited sites displayed on the New Tab Page, excluding user-customized shortcuts; requires the `"topSites"` permission. One method (`get`), one type (`MostVisitedURL`), no events; promise-based since Chrome 96.

**Sections:** Description · Permissions (`topSites`) · Examples · Types (`MostVisitedURL`: `title`, `url`) · Methods (`get`). No events.
- **"Description"** *(anchor unverified)*: the list mirrors the default NTP shortcuts, so user-pinned or edited shortcuts never appear; `get()` resolves an array of `MostVisitedURL` (`title`, `url`).
  - *Key terms/entities:* `topSites.get()`, `MostVisitedURL`, `title`, `url`, New Tab Page, `"topSites"` permission

### [chrome.windows](https://developer.chrome.com/docs/extensions/reference/api/windows)

**Overview:** Creates, queries, modifies, focuses, and closes browser windows. Needs no permission of its own, but the `tabs` array on `windows.Window` exposes `url`, `pendingUrl`, `title`, and `favIconUrl` only with `"tabs"` or host permissions. Promise-based since Chrome 88.

**Sections:** Description · Permissions (`"tabs"` for sensitive `Tab` fields) · Concepts and usage (The current window) · Examples · Types (`CreateType`: `"normal"`, `"popup"`, `"panel"`; `QueryOptions`: `populate`, `windowTypes`; `Window`: `alwaysOnTop`, `focused`, `height`, `id`, `incognito`, `left`, `sessionId`, `state`, `tabs`, `top`, `type`, `width`; `WindowState`: `"normal"`, `"minimized"`, `"maximized"`, `"fullscreen"`; `WindowType`: `"normal"`, `"popup"`, `"panel"`, `"app"`, `"devtools"`) · Properties (`WINDOW_ID_CURRENT`, `WINDOW_ID_NONE`) · Methods (`create`, `get`, `getAll`, `getCurrent`, `getLastFocused`, `remove`, `update`) · Events (`onBoundsChanged`, `onCreated`, `onFocusChanged`, `onRemoved`).
- **"Concepts and usage"** *(anchor unverified)*: the "current window" contains the calling code, not the topmost one — in a service worker it falls back to the last active window; `WINDOW_ID_CURRENT` is `-2`, `WINDOW_ID_NONE` is `-1`; `QueryOptions.windowTypes` defaults to `['normal', 'popup']`; `create()` states `minimized`/`maximized`/`fullscreen` cannot combine with `left`/`top`/`width`/`height`.
  - *Key terms/entities:* `createData`, `populate`, `windowTypes`, `setSelfAsOpener` (Chrome 64+), `WINDOW_ID_NONE`, `onFocusChanged` (Linux may emit `WINDOW_ID_NONE` first), `onBoundsChanged` (Chrome 86+), `"panel"` deprecated, `sessions` API for closed windows

### 8.3 Web Content & Network

### [chrome.contentSettings](https://developer.chrome.com/docs/extensions/reference/api/contentSettings)

**Overview:** Reads and rewrites Chrome's per-site content settings — cookies, JavaScript, images, plugins, popups, camera/microphone, clipboard, geolocation, notifications, automatic downloads, and Private State Tokens — exposed as `ContentSetting<T>` objects; requires the `"contentSettings"` permission; promise-based since Chrome 96.

**Sections:** Description · Permissions (`contentSettings`) · Concepts and usage (Content setting patterns, Pattern precedence, Primary and secondary patterns, Resource identifiers) · Examples · Types (`AutoVerifyContentSetting`, `CameraContentSetting`, `ClipboardContentSetting`, `ContentSetting`, `CookiesContentSetting`, `FullscreenContentSetting`, `ImagesContentSetting`, `JavascriptContentSetting`, `LocationContentSetting`, `MicrophoneContentSetting`, `MouselockContentSetting`, `MultipleAutomaticDownloadsContentSetting`, `NotificationsContentSetting`, `PluginsContentSetting`, `PopupsContentSetting`, `PpapiBrokerContentSetting`, `ResourceIdentifier` (`description`, `id`), `Scope`, `SoundContentSetting`) · Properties (`automaticDownloads`, `autoVerify`, `camera`, `clipboard`, `cookies`, `fullscreen`, `images`, `javascript`, `location`, `microphone`, `mouselock`, `notifications`, `plugins`, `popups`, `unsandboxedPlugins`) · Methods (`ContentSetting.clear`, `ContentSetting.get`, `ContentSetting.getResourceIdentifiers`, `ContentSetting.set`). No events.
- **"Concepts and usage"** *(anchor unverified)*: content-setting patterns are not match patterns — the path must be `/*` for `http`/`https`/`ftp`, must be spelled out with no wildcards for `file`, and may pin a port; the more specific pattern wins, compared hostname → scheme → port; a secondary URL is unsupported for `images`; resource identifiers exist only for `plugins`.
- **"Properties"** *(anchor unverified)*: `fullscreen`, `mouselock`, `plugins`, and `unsandboxedPlugins` are inert (fixed value; `set()`/`clear()` ignored); `camera`/`microphone` reject `allow` when both patterns are `<all_urls>`; `autoVerify` only accepts primary pattern `<all_urls>`.
  - *Key terms/entities:* `ContentSetting<T>`, `primaryPattern`, `secondaryPattern`, `primaryUrl`, `secondaryUrl`, `resourceIdentifier`, `scope: "incognito_session_only"`, `cookies: "session_only"`, `<all_urls>`, `https://*.youtube.com/*`, Private State Tokens, `SoundContentSetting` (Chrome 141+)

### [chrome.cookies](https://developer.chrome.com/docs/extensions/reference/api/cookies)

**Overview:** Queries, sets, and deletes HTTP cookies and notifies when they change. Requires `"cookies"` **plus** host permissions for every host touched — `getAll()` only returns cookies for domains the extension has host permissions to — and `set()`/`remove()` fail if `CookieDetails.url` is not covered. Promise-based since Chrome 88.

**Sections:** Description · Permissions (`cookies` + host permissions) · Partitioning · Examples · Types (`Cookie`: `domain`, `expirationDate`, `hostOnly`, `httpOnly`, `name`, `partitionKey`, `path`, `sameSite`, `secure`, `session`, `storeId`, `value`; `CookieDetails`: `name`, `partitionKey`, `storeId`, `url`; `CookiePartitionKey`: `hasCrossSiteAncestor`, `topLevelSite`; `CookieStore`: `id`, `tabIds`; `FrameDetails`: `documentId`, `frameId`, `tabId`; `OnChangedCause`: `"evicted"`, `"expired"`, `"explicit"`, `"expired_overwrite"`, `"overwrite"`; `SameSiteStatus`: `"no_restriction"`, `"lax"`, `"strict"`, `"unspecified"`) · Methods (`get`, `getAll`, `getAllCookieStores`, `getPartitionKey`, `remove`, `set`) · Events (`onChanged`).
- **"Partitioning"** *(anchor unverified)*: every method defaults to unpartitioned cookies; pass `partitionKey` (`topLevelSite`, plus `hasCrossSiteAncestor` Chrome 130+) to read or write `Partitioned` cookies, and call `getPartitionKey()` (Chrome 132+) with a `FrameDetails` `documentId` or `tabId`+`frameId` to learn a frame's key.
- **"Events"** *(anchor unverified)*: updating a cookie fires `onChanged` **twice** — a removal with `cause: "overwrite"` then a write with `cause: "explicit"`; each incognito window is a separate `CookieStore`.
  - *Key terms/entities:* `"cookies"`, `host_permissions`, `CookieDetails.url`, `storeId`, `getAllCookieStores()`, `cookie.partitionKey.topLevelSite`, `SameSite=None`/`no_restriction`, `expirationDate` (UNIX seconds), longest-path-wins ordering, Chrome 88 / 119 / 130 / 132

### [chrome.debugger](https://developer.chrome.com/docs/extensions/reference/api/debugger)

**Overview:** Alternate transport for the Chrome DevTools Protocol (CDP): attach to tabs, out-of-process iframes, and workers, then send CDP commands and receive instrumentation events. Requires the `"debugger"` permission; opening DevTools on an attached tab detaches the session and fires `onDetach`. No host permissions are required.

**Sections:** Description · Permissions (`debugger`, "Enterprise policy restrictions") · Concepts and usage (Targets, Restricted domains, Work with frames, [Attach to related targets](https://developer.chrome.com/docs/extensions/reference/api/debugger#attach_to_related_targets)) · Examples · Types (`Debuggee`: `extensionId`, `tabId`, `targetId`; `DebuggerSession`: `extensionId`, `sessionId`, `tabId`, `targetId`; `DetachReason`: `"target_closed"`, `"canceled_by_user"`; `TargetInfo`: `attached`, `extensionId`, `faviconUrl`, `id`, `tabId`, `title`, `type`, `url`; `TargetInfoType`: `"page"`, `"background_page"`, `"worker"`, `"other"`) · Methods (`attach`, `detach`, `getTargets`, `sendCommand`) · Events (`onDetach`, `onEvent`).
- **[Attach to related targets](https://developer.chrome.com/docs/extensions/reference/api/debugger#attach_to_related_targets)**: Chrome 125+ flat sessions add child targets through a `sessionId` on `sendCommand`/`onEvent` instead of another `attach()`; enable with `Target.setAutoAttach` + `flatten: true` and note auto-attach is **not** recursive (call it again per frame).
- **"Permissions"** *(anchor unverified)*: enterprise `ExtensionSettings` `runtime_blocked_hosts` (overridden by `runtime_allowed_hosts`) makes `attach()` reject with `"This page cannot be scripted due to an ExtensionsSettings policy."` and silently detaches on navigation to a blocked host.
- **"Concepts and usage"** *(anchor unverified)*: only a whitelisted subset of CDP domains is exposed (Accessibility → WebAuthn; no browser-level domains), and frames map many-to-one onto targets, so track same-process frames via `Runtime.executionContextCreated`.
  - *Key terms/entities:* `"debugger"`, `Debuggee`, `tabId`, `targetId`, `sessionId`, `sendCommand()`, `getTargets()`, `TargetInfoType`, `onDetach`, `onEvent`, `Target.setAutoAttach`, `--silent-debugger-extension-api`, CDP

### [chrome.declarativeContent](https://developer.chrome.com/docs/extensions/reference/api/declarativeContent)

**Overview:** Enables, greys out, or re-icons the toolbar action declaratively when the page URL matches a `UrlFilter`, a CSS selector matches, or the page is bookmarked — with **no host permissions and no content script**. Requires `"declarativeContent"`; rules persist across sessions, so re-register them on install.

**Sections:** Description · Permissions (`declarativeContent`, plus `bookmarks` for `isBookmarked`) · Concepts and usage (Rules, Page URL matching, CSS Matching, Bookmarked state matching) · Types (`ImageDataType` = `ImageData`; `PageStateMatcher`: `css`, `isBookmarked`, `pageUrl`; `RequestContentScript`: `allFrames`, `css`, `js`, `matchAboutBlank`; `SetIcon`: `imageData`, `path`; `ShowAction`; `ShowPageAction` (deprecated, Chrome 97)) · Events (`onPageChanged` — Declarative Event API: conditions `PageStateMatcher`; actions `RequestContentScript`, `SetIcon`, `ShowPageAction`, `ShowAction`). No methods.
- **"Concepts and usage"** *(anchor unverified)*: a rule pairs `conditions` (any one satisfied runs **all** `actions`) with actions built via constructors; `RequestContentScript` is still experimental and unsupported on stable Chrome; always `removeRules()` then `addRules()` in bulk — each call recreates expensive internal structures.
- **"CSS Matching"** *(anchor unverified)*: selectors must be compound — no combinators (`div p`, `p>span`, `p + ol`) — and only *displayed* elements count: `display:none` (on the element or an ancestor) blocks a match, whereas `visibility:hidden` and off-screen elements still match.
- **"Bookmarked state matching"** *(anchor unverified)*: `PageStateMatcher.isBookmarked` needs the `"bookmarks"` permission; `pageUrl` criteria are case-sensitive and `ShowAction` greys the action out where conditions fail.
  - *Key terms/entities:* `"declarativeContent"`, `"bookmarks"`, `PageStateMatcher`, `onPageChanged.addRules()`, `removeRules()`, `getRules()`, `ShowAction`, `SetIcon`, `UrlFilter` (`hostSuffix`, `pathPrefix`, `urlContains`), `activeTab`, `runtime.onInstalled`

### [chrome.declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)

**Overview:** Blocks, allows, upgrades, redirects, or header-rewrites network requests through declarative rules instead of intercepting them — the MV3 replacement for blocking `webRequest`. Chrome 84+; static rulesets are declared in the `"declarative_net_request"` manifest key, dynamic/session rules via JS.

**Sections:** Description · Permissions (`declarativeNetRequest`, `declarativeNetRequestWithHostAccess`, `declarativeNetRequestFeedback`) · Availability (Chrome 84+) · Manifest · Rules and rulesets (Dynamic and session-scoped rulesets, Static rulesets) · Expedited review · Enable and disable static rules and rulesets · Build rules · URL matching (URL filter syntax, Regular expressions, Write good URL conditions) · Rule evaluation (Before the request, Before request headers are sent, Once a response is received) · Safe rules · Rule limits (Static rules, Session rules, Dynamic rules, Rules that use regular expressions) · Interactions with service workers · Web accessible resources · Header modification · Examples (Code examples, Rule examples) · Types (`DomainType`, `ExtensionActionOptions`, `GetDisabledRuleIdsOptions`, `GetRulesFilter`, `HeaderInfo`, `HeaderOperation`, `IsRegexSupportedResult`, `MatchedRule`, `MatchedRuleInfo`, `MatchedRuleInfoDebug`, `MatchedRulesFilter`, `ModifyHeaderInfo`, `QueryKeyValue`, `QueryTransform`, `Redirect`, `RegexOptions`, `RequestDetails`, `RequestMethod`, `ResourceType`, `Rule`, `RuleAction`, `RuleActionType`, `RuleCondition`, `RuleConditionKeys`, `Ruleset`, `RulesMatchedDetails`, `TabActionCountUpdate`, `TestMatchOutcomeResult`, `TestMatchRequestDetails`, `UnsupportedRegexReason`, `UpdateRuleOptions`, `UpdateRulesetOptions`, `UpdateStaticRulesOptions`, `URLTransform`) · Properties (`DYNAMIC_RULESET_ID`, `GETMATCHEDRULES_QUOTA_INTERVAL`, `GUARANTEED_MINIMUM_STATIC_RULES`, `MAX_GETMATCHEDRULES_CALLS_PER_INTERVAL`, `MAX_NUMBER_OF_DYNAMIC_RULES`, `MAX_NUMBER_OF_ENABLED_STATIC_RULESETS`, `MAX_NUMBER_OF_REGEX_RULES`, `MAX_NUMBER_OF_SESSION_RULES`, `MAX_NUMBER_OF_STATIC_RULESETS`, `MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES`, `MAX_NUMBER_OF_UNSAFE_SESSION_RULES`, `SESSION_RULESET_ID`) · Methods (`getAvailableStaticRuleCount`, `getDisabledRuleIds`, `getDynamicRules`, `getEnabledRulesets`, `getMatchedRules`, `getSessionRules`, `isRegexSupported`, `setExtensionActionOptions`, `testMatchOutcome`, `updateDynamicRules`, `updateEnabledRulesets`, `updateSessionRules`, `updateStaticRules`) · Events (`onRuleMatchedDebug`).
- **"Permissions"** *(anchor unverified)*: `declarativeNetRequest` warns at install but implicitly allows `allow`/`allowAllRequests`/`block`; `declarativeNetRequestWithHostAccess` has no warning but needs host permission per host; `declarativeNetRequestFeedback` (unpacked only) unlocks `getMatchedRules()` + `onRuleMatchedDebug`.
- **"Rule limits"** *(anchor unverified)*: 100 static rulesets declared, 50 enabled (`MAX_NUMBER_OF_ENABLED_STATIC_RULESETS`), 30,000 guaranteed plus a shared global pool measured by `getAvailableStaticRuleCount()`, ≤5,000 disabled static rules; 5,000 session rules; 30,000 safe / 5,000 unsafe dynamic rules; 1,000 regex rules per type, each <2 KB compiled. Before Chrome 120: 50 static rulesets/10 enabled and 5,000 combined dynamic+session.
- **"Rule evaluation"** *(anchor unverified)*: at most one candidate per request per extension — priority first, then action order `allow`/`allowAllRequests` > `block` > `upgradeScheme` > `redirect`; across extensions `block` > `redirect`/`upgradeScheme` > `allow`, ties going to the newest extension. Same-priority ordering is **not standardized**, so set explicit priorities.
- **"Interactions with service workers"** *(anchor unverified)*: rules apply only to requests reaching the network stack (HTTP cache included) — never to `CacheStorage` hits or responses synthesized by a service worker `fetch`.
  - *Key terms/entities:* `"declarativeNetRequest"`, `"declarativeNetRequestWithHostAccess"`, `"declarative_net_request"`, `rule_resources`, `Ruleset`, `urlFilter`, `regexFilter`, `rule.priority`, `safe rules`, `modifyHeaders`, `updateDynamicRules()`, `updateSessionRules()`, `updateStaticRules()`, `updateEnabledRulesets()`, `testMatchOutcome()`, `"web_accessible_resources"` redirect target

### [chrome.desktopCapture](https://developer.chrome.com/docs/extensions/reference/api/desktopCapture)

**Overview:** Shows Chrome's desktop-media picker for the screen, a window, a tab, or audio and returns an opaque `streamId` for `navigator.mediaDevices.getUserMedia()` with `chromeMediaSource: "desktop"`. Requires `"desktopCapture"`; two methods, no events.

**Sections:** Description · Permissions (`desktopCapture`) · Types (`DesktopCaptureSourceType`: `"screen"`, `"window"`, `"tab"`, `"audio"`; `SelfCapturePreferenceEnum`: `"include"`, `"exclude"`; `SystemAudioPreferenceEnum`: `"include"`, `"exclude"`; `WindowAudioPreferenceEnum`: `"system"`, `"window"`, `"exclude"`) · Methods (`cancelChooseDesktopMedia`, `chooseDesktopMedia`). No events.
- **"Methods"** *(anchor unverified)*: `chooseDesktopMedia(sources, targetTab?, callback)` returns a request id for `cancelChooseDesktopMedia()`; `sources` order sets the picker's tab order, and adding `"audio"` is what makes `options.canRequestAudioTrack` (Chrome 57+) true.
- **"chooseDesktopMedia()"** *(anchor unverified)*: the `streamId` is single-use and expires a few seconds after issue; a cancelled prompt calls back with an empty `streamId`. With `targetTab`, only frames of that tab whose origin matches `tab.url` can consume the stream, and the tab must be a secure origin (HTTPS); without it, only the calling extension can.
  - *Key terms/entities:* `"desktopCapture"`, `chooseDesktopMedia()`, `cancelChooseDesktopMedia()`, `DesktopCaptureSourceType`, `streamId`, `chromeMediaSource: "desktop"`, `canRequestAudioTrack`, `targetTab`, `getUserMedia()`, Chrome 57 / 105 / 107 / 140

### [chrome.dom](https://developer.chrome.com/docs/extensions/reference/api/dom)

**Overview:** Tiny namespace for "special DOM APIs for Extensions" — exactly one method, `openOrClosedShadowRoot()`, which returns the open **or closed** `ShadowRoot` hosted by an element (the standard `element.shadowRoot` only exposes open roots). Chrome 88+; no manifest permission required.

**Sections:** Description · Availability (Chrome 88+) · Methods (`openOrClosedShadowRoot`). No types, properties, or events.
- **"Methods"** *(anchor unverified)*: the single synchronous call `openOrClosedShadowRoot(element: HTMLElement)` returns a `ShadowRoot` object, or `null` when the element does not host a shadow root; there is no promise wrapper and no companion setter, so it is the only route into a closed shadow root for automation, scraping, or styling.
  - *Key terms/entities:* `chrome.dom`, `openOrClosedShadowRoot()`, `HTMLElement`, `ShadowRoot`, closed shadow root, `element.shadowRoot`, Chrome 88+

### [chrome.offscreen](https://developer.chrome.com/docs/extensions/reference/api/offscreen)

**Overview:** Creates one hidden document so the extension can use DOM APIs the service worker lacks — clipboard, `getUserMedia`, `DOMParser`, `localStorage`, geolocation, workers. Requires `"offscreen"`; Chrome 109+, **MV3-only**; `runtime` is the only extension API available inside the document.

**Sections:** Description · Permissions (`offscreen`) · Availability (Chrome 109+, MV3+) · Concepts and usage (Reasons) · Examples (Maintain the lifecycle of an offscreen document, Before Chrome 116: check if an offscreen document is open) · Types (`CreateParameters`: `justification`, `reasons`, `url`; `Reason`: `"TESTING"`, `"AUDIO_PLAYBACK"`, `"IFRAME_SCRIPTING"`, `"DOM_SCRAPING"`, `"BLOBS"`, `"DOM_PARSER"`, `"USER_MEDIA"`, `"DISPLAY_MEDIA"`, `"WEB_RTC"`, `"CLIPBOARD"`, `"LOCAL_STORAGE"`, `"WORKERS"`, `"BATTERY_STATUS"`, `"MATCH_MEDIA"`, `"GEOLOCATION"`) · Methods (`closeDocument`, `createDocument`, `hasDocument`).
- **"Concepts and usage"** *(anchor unverified)*: `createDocument()` needs a bundled static HTML `url`, `reasons`, and a reviewer-facing `justification`; the document can't be focused, its `opener` is `null`, and only **one** may be open at a time (a split-mode incognito profile gets its own). `AUDIO_PLAYBACK` self-closes after 30 s of silence; every other reason has no lifetime cap.
- **"Methods"** *(anchor unverified)*: `hasDocument()` only arrives in Chrome 150 — before that (and since `runtime.getContexts()` is Chrome 116+) detect an existing document with `clients.matchAll()`, then `browser.runtime.sendMessage({ target: 'offscreen' })`; Chrome 157+ service workers holding `"clipboardWrite"` can write via `navigator.clipboard` directly.
  - *Key terms/entities:* `"offscreen"`, `offscreen.createDocument()`, `offscreen.closeDocument()`, `offscreen.hasDocument()`, `CreateParameters`, `Reason.CLIPBOARD`, `Reason.DOM_SCRAPING`, `Reason.AUDIO_PLAYBACK`, `runtime.getContexts({contextTypes: ['OFFSCREEN_DOCUMENT']})`, `clients.matchAll()`, `getUserMedia()`, `getDisplayMedia()`

### [chrome.pageCapture](https://developer.chrome.com/docs/extensions/reference/api/pageCapture)

**Overview:** Saves a tab as a single MHTML file (the page plus its CSS, images, and other resources, per RFC 2557) via one promise-based method, `saveAsMHTML({ tabId })`. Requires `"pageCapture"`; promise support arrived in Chrome 116.

**Sections:** Description · Permissions (`pageCapture`) · Methods (`saveAsMHTML`). No types, properties, or events.
- **"Methods"** *(anchor unverified)*: `saveAsMHTML({ tabId })` resolves a `Blob` (or `undefined`) only from Chrome 116+; earlier builds are callback-based. A security restriction applies to the output: the resulting MHTML can only be loaded from the file system and only in the main frame.
  - *Key terms/entities:* `"pageCapture"`, `pageCapture.saveAsMHTML()`, `tabId`, `Blob`, MHTML, RFC 2557, Chrome 116+, file-system-only main-frame loading

### [chrome.scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)

**Overview:** Injects JavaScript and CSS into pages and frames at runtime and registers dynamic content scripts; requires `"scripting"` plus host permission for the target pages or `"activeTab"` (temporary host access); Chrome 88+, **MV3-only**.

**Sections:** Description · Permissions (`scripting` + host permissions or `activeTab`) · Availability (Chrome 88+, MV3+) · Manifest · Concepts and usage (Injection targets, Injected code: Files / Runtime functions / Runtime strings, Handle the results, Promises) · Examples (Unregister all dynamic content scripts) · Types (`ContentScriptFilter`: `ids`; `CSSInjection`: `css`, `files`, `origin`, `target`; `ExecutionWorld`: `"ISOLATED"`, `"MAIN"`; `InjectionResult`: `documentId`, `frameId`, `result`; `InjectionTarget`: `allFrames`, `documentIds`, `frameIds`, `tabId`; `RegisteredContentScript`: `allFrames`, `css`, `excludeMatches`, `id`, `js`, `matchOriginAsFallback`, `matches`, `persistAcrossSessions`, `runAt`, `world`; `ScriptInjection`: `args`, `files`, `injectImmediately`, `target`, `world`, `func`; `StyleOrigin`: `"AUTHOR"`, `"USER"`) · Methods (`executeScript`, `getRegisteredContentScripts`, `insertCSS`, `registerContentScripts`, `removeCSS`, `unregisterContentScripts`, `updateContentScripts`). No events.
- **"Concepts and usage"** *(anchor unverified)*: `executeScript()` takes exactly one of `files` or `func` — a runtime **string** is only legal for `insertCSS({css})`; `target.tabId` is the sole required field, and `frameIds` and `allFrames` are mutually exclusive (`documentIds` likewise conflicts with `frameIds`).
- **"Handle the results"** *(anchor unverified)*: one `InjectionResult` per frame — the main frame is always index 0, all other frames are in non-deterministic order; a returned promise is awaited and settled; `insertCSS()` returns no results and removing CSS requires `css`, `files`, and `origin` to match the insertion exactly.
- **"Examples"** *(anchor unverified)*: `unregisterContentScripts()` (and `updateContentScripts`) never undo injections already made in live pages; registered `id`s may not start with `_`.
  - *Key terms/entities:* `"scripting"`, `"host_permissions"`, `"activeTab"`, `executeScript()`, `insertCSS()`, `removeCSS()`, `registerContentScripts()`, `getRegisteredContentScripts()`, `updateContentScripts()`, `unregisterContentScripts()`, `ExecutionWorld.ISOLATED`/`MAIN`, `ScriptInjection.func`/`args`, `injectImmediately`, `persistAcrossSessions`, `matchOriginAsFallback` (Chrome 119+), `document_idle`

### [chrome.tabCapture](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)

**Overview:** Grants a `MediaStream` (or a single-use stream ID) of the active tab's video and audio. Requires `"tabCapture"` and, like `activeTab`, only works after the user *invokes* the extension (action click); `capture()` is **foreground only**, while `getMediaStreamId()` can feed an offscreen document.

**Sections:** Description · Permissions (`tabCapture`) · Concepts and usage (Preserve system audio, Stream IDs, Usage restrictions, Learn more) · Types (`CaptureInfo`: `fullscreen`, `status`, `tabId`; `CaptureOptions`: `audio`, `audioConstraints`, `video`, `videoConstraints`; `GetMediaStreamOptions`: `consumerTabId`, `targetTabId`; `MediaStreamConstraint`: `mandatory`, `optional`; `TabCaptureState`: `"pending"`, `"active"`, `"stopped"`, `"error"`) · Methods (`capture`, `getCapturedTabs`, `getMediaStreamId`) · Events (`onStatusChanged`).
- **"Concepts and usage"** *(anchor unverified)*: capturing a tab **silences** its audio for the user (like `suppressLocalAudioPlayback`), so re-route it with `AudioContext.createMediaStreamSource(stream).connect(destination)`; `capture()` survives in-tab navigation but dies with the tab or stream, and a `getMediaStreamId()` ID is single-use and expires after a few seconds.
- **"Usage restrictions"** *(anchor unverified)*: the stream ID may be consumed by `getUserMedia({ mandatory: { chromeMediaSource: "tab", chromeMediaSourceId } })` only in frames of `consumerTabId` sharing that tab's origin; without it, Chrome 116+ allows any same-origin frame in the caller's render process (pre-116: caller's origin **and** process **and** frame). `targetTabId` needs `activeTab` granted.
  - *Key terms/entities:* `"tabCapture"`, `tabCapture.capture()`, `getMediaStreamId()`, `getCapturedTabs()`, `onStatusChanged`, `CaptureInfo.status`, `consumerTabId`, `targetTabId`, `chromeMediaSource: "tab"`, `chromeMediaSourceId`, `AudioContext`, `MediaStream`, foreground only, Chrome 71 / 116

### [chrome.userScripts](https://developer.chrome.com/docs/extensions/reference/api/userScripts)

**Overview:** Runs **user-supplied** (not packaged) code in a dedicated User Scripts world — the sanctioned path for arbitrary script the extension cannot bundle. Requires `"userScripts"` **and** `"host_permissions"` for the target sites **and** a user-flipped settings toggle; Chrome 120+, MV3-only.

**Sections:** Description · Permissions (`userScripts`, `"host_permissions"`) · Availability (Chrome 120+, MV3+) · Concepts and usage (Enable usage of the userScripts API: Chrome versions prior to 138 — Developer mode toggle, Chrome versions 138 and newer — Allow User Scripts toggle; Check for API availability; Work in isolated worlds; Messaging; Extension updates) · Example (Register a script) · Types (`ExecutionWorld`: `"MAIN"`, `"USER_SCRIPT"`; `InjectionResult`: `documentId`, `error`, `frameId`, `result`; `InjectionTarget`: `allFrames`, `documentIds`, `frameIds`, `tabId`; `RegisteredUserScript`: `allFrames`, `excludeGlobs`, `excludeMatches`, `id`, `includeGlobs`, `js`, `matches`, `runAt`, `world`, `worldId`; `ScriptSource`: `code`, `file`; `UserScriptFilter`: `ids`; `UserScriptInjection`: `injectImmediately`, `js`, `target`, `world`, `worldId`; `WorldProperties`: `csp`, `messaging`, `worldId`) · Methods (`configureWorld`, `execute`, `getScripts`, `getWorldConfigurations`, `register`, `resetWorldConfiguration`, `unregister`, `update`). No events.
- **"Enable usage of the userScripts API"** *(anchor unverified)*: the permission alone is not enough — pre-Chrome 138 users must enable **Developer mode**, Chrome 138+ users must enable the per-extension **Allow User Scripts** toggle (`chrome://extensions/?id=…`); disabled means `browser.userScripts` is `undefined` (138+) or throws (earlier), and the state only refreshes when an extension context reloads.
- **"Check for API availability"** *(anchor unverified)*: feature-detect by calling `browser.userScripts.getScripts()` inside `try`/`catch` — this works on every Chrome version, unlike version sniffing.
- **"Messaging"** *(anchor unverified)*: `runtime.sendMessage()`/`runtime.connect()` from a user script arrive on `runtime.onUserScriptMessage`/`runtime.onUserScriptConnect`, not `onMessage`/`onConnect`, and only after `configureWorld({ messaging: true })` (also where `csp` is set); scripts are wiped on extension update, so re-`register()` under `runtime.onInstalled` reason `"update"`.
  - *Key terms/entities:* `"userScripts"`, `"host_permissions"`, `userScripts.register()`, `execute()`, `configureWorld()`, `getWorldConfigurations()`, `resetWorldConfiguration()`, `ExecutionWorld.USER_SCRIPT`/`MAIN`, `worldId`, `ScriptSource.code`/`file`, `runtime.onUserScriptMessage`, `runtime.onUserScriptConnect`, `minimum_chrome_version: "120"`, Chrome 133 / 135 / 138

### [chrome.webAuthenticationProxy](https://developer.chrome.com/docs/extensions/reference/api/webAuthenticationProxy)

**Overview:** Lets remote-desktop software running on a *remote host* intercept WebAuthn requests — `navigator.credentials.create()`, `credentials.get()`, and `isUserVerifyingPlatformAuthenticatorAvailable()` — and service them on the local client. Requires `"webAuthenticationProxy"`; Chrome 115+, MV3-only; no events are optional to answer.

**Sections:** Description · Permissions (`webAuthenticationProxy`) · Availability (Chrome 115+, MV3+) · Types (`CreateRequest`: `requestDetailsJson`, `requestId`; `CreateResponseDetails`: `error`, `requestId`, `responseJson`; `DOMExceptionDetails`: `message`, `name`; `GetRequest`: `requestDetailsJson`, `requestId`; `GetResponseDetails`: `error`, `requestId`, `responseJson`; `IsUvpaaRequest`: `requestId`; `IsUvpaaResponseDetails`: `isUvpaa`, `requestId`) · Methods (`attach`, `completeCreateRequest`, `completeGetRequest`, `completeIsUvpaaRequest`, `detach`) · Events (`onCreateRequest`, `onGetRequest`, `onIsUvpaaRequest`, `onRemoteSessionStateChange`, `onRequestCanceled`).
- **"Methods"** *(anchor unverified)*: `attach()` claims the proxy role and suspends normal WebAuthn handling — it rejects if another extension is already attached, and the extension auto-detaches when unloaded; `detach()` is how a finished remote session restores local WebAuthn processing.
- **"Events"** *(anchor unverified)*: each `onCreateRequest`/`onGetRequest`/`onIsUvpaaRequest` **must** be answered via the matching `complete*Request()` with the event's `requestId`; `onRequestCanceled` (aborted or timed out) ends the request so it can never be completed.
- **"onRemoteSessionStateChange"** *(anchor unverified)*: a native host triggers it by writing an empty file named after the extension ID inside `WebAuthenticationProxyRemoteSessionStateChange` in the default user data directory, so the listener must be registered synchronously at load time (the worker may be suspended).
  - *Key terms/entities:* `"webAuthenticationProxy"`, `attach()`, `detach()`, `completeCreateRequest()`, `completeGetRequest()`, `completeIsUvpaaRequest()`, `requestId`, `requestDetailsJson`, `responseJson`, `PublicKeyCredential.parseCreationOptionsFromJSON()`, `PublicKeyCredential.toJSON()`, remote desktop, Chrome 115+

### [chrome.webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)

**Overview:** Notifies on the status of in-flight navigation requests — per-frame, in event order — without touching the network stack. Requires `"webNavigation"`; observer-only — it reports UI navigation state, not network state, and cannot block or modify requests.

**Sections:** Description · Permissions (`webNavigation`) · Concepts and usage (Event order, Relation to webRequest events, Tab IDs, Timestamps, Frame IDs, Transition types and qualifiers) · Examples · Types (`TransitionQualifier`: `"client_redirect"`, `"server_redirect"`, `"forward_back"`, `"from_address_bar"`; `TransitionType`: `"link"`, `"typed"`, `"auto_bookmark"`, `"auto_subframe"`, `"manual_subframe"`, `"generated"`, `"start_page"`, `"form_submit"`, `"reload"`, `"keyword"`, `"keyword_generated"`) · Methods (`getAllFrames`, `getFrame`) · Events (`onBeforeNavigate`, `onCommitted`, `onCompleted`, `onCreatedNavigationTarget`, `onDOMContentLoaded`, `onErrorOccurred`, `onHistoryStateUpdated`, `onReferenceFragmentUpdated`, `onTabReplaced`).
- **"Event order"** *(anchor unverified)*: a successful navigation fires `onBeforeNavigate` → `onCommitted` → [`onDOMContentLoaded`] → `onCompleted`; an error fires `onErrorOccurred` and then **nothing** for that navigation. BFCache restores skip `onDOMContentLoaded`, `history.pushState()` fires `onHistoryStateUpdated`, fragment changes fire `onReferenceFragmentUpdated`, and pre-render/Instant swaps fire `onTabReplaced`.
- **"Frame IDs"** *(anchor unverified)*: main frame is `0`, children are positive; `frameId` is stable across navigations (Chrome 49+) while `documentId` (Chrome 106+) changes per document. Multi-process navigations can produce two pending sequences with the same `frameId`, distinguishable only by `processId`, plus repeated `onBeforeNavigate`/`onErrorOccurred` while a redirect switches processes.
- **"Timestamps"** *(anchor unverified)*: `timeStamp` is only *internally* consistent — clock skew between browser and extension processes makes comparisons against `Date.now()` unreliable; `onCommitted` also carries `transitionType` and `transitionQualifiers`.
  - *Key terms/entities:* `"webNavigation"`, `getAllFrames()`, `getFrame()`, `frameId`, `parentFrameId`, `documentId`, `processId`, `documentLifecycle`, `frameType`, `TransitionType`, `TransitionQualifier`, `events.UrlFilter` listener filter, `onHistoryStateUpdated`, `onTabReplaced`, Chrome 49 / 93 / 106

### [chrome.webRequest](https://developer.chrome.com/docs/extensions/reference/api/webRequest)

**Overview:** Observes, analyzes, and — with blocking handlers — intercepts, cancels, redirects, and header-rewrites requests in flight. Requires `"webRequest"` **and** host permissions for both the requested URL and its initiator; in MV3 `"webRequestBlocking"` is reserved for policy-installed extensions.

**Sections:** Description · Permissions (`webRequest`, `webRequestBlocking`, `webRequestAuthProvider`) · Concepts and usage (Life cycle of requests, Request IDs, Registering event listeners, Handling authentication, Implementation details: web_accessible_resources / Conflict resolution / Caching / Timestamps / Error handling) · Examples · Types (`BlockingResponse`, `FormDataItem`, `HttpHeaders`, `IgnoredActionType`, `OnAuthRequiredOptions`, `OnBeforeRedirectOptions`, `OnBeforeRequestOptions`, `OnBeforeSendHeadersOptions`, `OnCompletedOptions`, `OnErrorOccurredOptions`, `OnHeadersReceivedOptions`, `OnResponseStartedOptions`, `OnSendHeadersOptions`, `RequestFilter`, `ResourceType`, `SecurityInfo`, `UploadData`) · Properties (`MAX_HANDLER_BEHAVIOR_CHANGED_CALLS_PER_10_MINUTES`) · Methods (`handlerBehaviorChanged`) · Events (`onActionIgnored`, `onAuthRequired`, `onBeforeRedirect`, `onBeforeRequest`, `onBeforeSendHeaders`, `onCompleted`, `onErrorOccurred`, `onHeadersReceived`, `onResponseStarted`, `onSendHeaders`).
- **"Life cycle of requests"** *(anchor unverified)*: `onBeforeRequest` → `onBeforeSendHeaders` → `onSendHeaders` → `onHeadersReceived` (repeatable for redirects/auth) → `onAuthRequired` → `onBeforeRedirect` → `onResponseStarted` → `onCompleted`/`onErrorOccurred`; every request ends in `onCompleted` or `onErrorOccurred` **except** a redirect to a `data:` URL, where `onBeforeRedirect` is final. Only `onBeforeRequest`, `onBeforeSendHeaders`, `onHeadersReceived`, and `onAuthRequired` may be synchronous.
- **"Registering event listeners"** *(anchor unverified)*: `addListener(callback, filter, extraInfoSpec)` — `'blocking'` makes the callback synchronous and lets it return a `BlockingResponse` (cancel/redirect/headers/credentials), `'asyncBlocking'` is legal only for `onAuthRequired`; `'extraHeaders'` is required to see or touch `Cookie`, `Set-Cookie`, `Origin`, `Referer`, `Accept-Language`, `Accept-Encoding`, `X-Frame-Options`, and CORS preflights, and carries a performance cost.
- **"Implementation details"** *(anchor unverified)*: any one extension's cancel wins and everyone else gets `onErrorOccurred`; only one extension may redirect or modify headers — the most recently installed wins and the losers are silently ignored (observable via `onActionIgnored`); in-memory-cache hits are invisible, so call `handlerBehaviorChanged()` after logic changes (≤20 per 10 minutes).
  - *Key terms/entities:* `"webRequest"`, `"webRequestBlocking"`, `"webRequestAuthProvider"`, `BlockingResponse` (`cancel`, `redirectUrl`, `requestHeaders`, `responseHeaders`, `authCredentials`), `RequestFilter` (`urls`, `types`, `tabId`, `windowId`), `HttpHeaders`, `ResourceType`, `SecurityInfo` (Chrome 144+), `onAuthRequired`, `handlerBehaviorChanged()`, `extraHeaders`, `ws://`/`wss://`/`urn:`, `web_accessible_resources`

### 8.4 Data, Identity & Notifications

### [chrome.browsingData](https://developer.chrome.com/docs/extensions/reference/api/browsingData)

**Overview:** Deletes a user's local profile data — cache, cookies, downloads list, history, form data, IndexedDB, local storage, service workers, WebSQL — by time window or by origin list; requires the `"browsingData"` permission. Removal is heavy background work that can take tens of seconds, so await the promise or callback.

**Sections:** Description · Permissions (`browsingData`) · Concepts and usage (Specific origins, Origin types) · Examples · Types ([`DataTypeSet`](https://developer.chrome.com/docs/extensions/reference/api/browsingData#type-DataTypeSet), [`RemovalOptions`](https://developer.chrome.com/docs/extensions/reference/api/browsingData#type-RemovalOptions)) · Methods (`remove`, `removeAppcache`, `removeCache`, `removeCacheStorage`, `removeCookies`, `removeDownloads`, `removeFileSystems`, `removeFormData`, `removeHistory`, `removeIndexedDB`, `removeLocalStorage`, `removePasswords`, `removePluginData`, `removeServiceWorkers`, `removeWebSQL`, `settings`). No events.
- **"Concepts and usage"** *(anchor unverified)*: `since` is a Unix-epoch millisecond cutoff and defaults to `0` (everything); `origins`/`excludeOrigins` (Chrome 74+) work only for cookies, cache, and storage, and deleting a cookie for an origin clears the whole registrable domain; `originTypes` defaults to `unprotectedWeb` only; `remove()` rebuilds the Sync cookie, `removeCookies()` pauses Sync.
- **"Methods"** *(anchor unverified)*: every method resolves `Promise<void>` (Chrome 96+) except `settings()`, which resolves an object describing the "Clear browsing data" UI selections; `appcache` (Chrome 152), `passwords` (Chrome 144), `pluginData` (Chrome 88), `serverBoundCertificates` (Chrome 76), and `webSQL` (Chrome 152) are deprecated and ignored.
  - *Key terms/entities:* `"browsingData"`, `RemovalOptions.since`, `origins`, `excludeOrigins`, `originTypes`, `unprotectedWeb`, `protectedWeb`, `extension`, `DataTypeSet`, `cacheStorage` (Chrome 72+), `serviceWorkers`, `settings()`, `getTime()`

### [chrome.gcm](https://developer.chrome.com/docs/extensions/reference/api/gcm)

**Overview:** Sends and receives messages through Firebase Cloud Messaging (FCM): register up to 100 sender IDs, push `data` payloads to a server `destinationId`, and handle inbound messages and send errors; requires the `"gcm"` permission. Messages are capped at 4,096 bytes of key/value data.

**Sections:** Description · Permissions (`gcm`) · Properties ([`MAX_MESSAGE_SIZE`](https://developer.chrome.com/docs/extensions/reference/api/gcm#property-MAX_MESSAGE_SIZE) = 4096) · Methods (`register`, `send`, `unregister`) · Events (`onMessage`, `onMessagesDeleted`, `onSendError`). No types.
- **"Methods"** *(anchor unverified)*: `register(senderIds)` takes 1–100 sender IDs and returns the same registration ID for an identical list; re-registration is idempotent. `send()` requires `destinationId`, a unique `messageId`, and `data` (keys prefixed `goog.`/`google` or `collapse_key` disallowed); `timeToLive` defaults to 86,400 s, max 2,419,200 s, `0` means send-or-fail. Promises Chrome 116+.
- **"Events"** *(anchor unverified)*: `onMessage` delivers `collapseKey`, `data`, and `from`; `onMessagesDeleted` fires when an FCM server drops messages; `onSendError` reports `details`, `errorMessage`, and optional `messageId`.
  - *Key terms/entities:* `"gcm"`, `MAX_MESSAGE_SIZE`, `register()`, `send()`, `unregister()`, `onMessage`, `onMessagesDeleted`, `onSendError`, `senderIds`, `destinationId`, `messageId`, `timeToLive`, `collapseKey`, FCM

### [chrome.identity](https://developer.chrome.com/docs/extensions/reference/api/identity)

**Overview:** Gets OAuth2 access tokens for the extension using the `oauth2` manifest section (`client_id` + `scopes`), and runs non-Google auth flows in a web view. Requires the `"identity"` permission; `getProfileUserInfo()` additionally needs `identity.email`, otherwise it returns an empty result.

**Sections:** Description · Permissions (`identity`, `identity.email`) · Types (`AccountInfo`, `AccountStatus`, `GetAuthTokenResult`, `InvalidTokenDetails`, `ProfileDetails`, `ProfileUserInfo`, `TokenDetails`, `WebAuthFlowDetails`) · Methods (`clearAllCachedAuthTokens`, `getAccounts`, `getAuthToken`, `getProfileUserInfo`, `getRedirectURL`, `launchWebAuthFlow`, `removeCachedAuthToken`) · Events (`onSignInChanged`).
- **"Methods"** *(anchor unverified)*: `getAuthToken()` caches tokens in memory and refreshes expiration, so non-interactive calls are safe; `interactive: false` fails whenever a prompt is needed, and `scopes` overrides the manifest list. `getRedirectURL()` yields `https://<app-id>.chromiumapp.org/*`, the only redirect `launchWebAuthFlow()` accepts. `getProfileUserInfo()` works offline for the primary account only; `getAccounts()` is **dev channel only**.
- **"Events"** *(anchor unverified)*: `onSignInChanged` reports `account` plus `signedIn` when an account's sign-in state changes. Promise support: `getAuthToken` Chrome 105+; `clearAllCachedAuthTokens`/`getProfileUserInfo`/`launchWebAuthFlow`/`removeCachedAuthToken` Chrome 106+.
  - *Key terms/entities:* `"identity"`, `identity.email`, `oauth2.client_id`, `oauth2.scopes`, `getAuthToken()`, `launchWebAuthFlow()`, `getRedirectURL()`, `chromiumapp.org`, `TokenDetails.interactive`, `grantedScopes`, `AccountStatus` (`SYNC`, `ANY`)

### [chrome.instanceID](https://developer.chrome.com/docs/extensions/reference/api/instanceID)

**Overview:** Wraps the Instance ID service: read a stable app-instance identifier and its creation time, mint scoped tokens for an authorized entity, and revoke them. Chrome 44+; requires the `"gcm"` permission (there is no `instanceID` permission).

**Sections:** Description · Permissions (`gcm`) · Availability (Chrome 44+) · Methods (`deleteID`, `deleteToken`, `getCreationTime`, `getID`, `getToken`) · Events (`onTokenRefresh`). No types or properties.
- **"Methods"** *(anchor unverified)*: all return promises (Chrome 96+). `getID()` returns the same identifier until the identity is revoked or expires; `deleteID()` resets it and revokes every associated token. `getToken({authorizedEntity, scope})` needs both fields (Chrome 46+; `scope: "GCM"` for GCM sending) and its `options` bag is deprecated since Chrome 89 and ignored; `deleteToken()` uses the same pair. `getCreationTime()` returns a `number`.
- **"Events"** *(anchor unverified)*: `onTokenRefresh` fires with no arguments when all granted tokens must be refreshed — re-call `getToken()` then.
  - *Key terms/entities:* `"gcm"`, `getID()`, `deleteID()`, `getToken()`, `deleteToken()`, `getCreationTime()`, `onTokenRefresh`, `authorizedEntity`, `scope`, `GCM`, Instance ID service, Chrome 44 / 46 / 89 / 96

### [chrome.management](https://developer.chrome.com/docs/extensions/reference/api/management)

**Overview:** Enumerates and controls installed apps, extensions, and themes — enable/disable, uninstall, launch apps, set launch types, and read permission warnings. Requires the `"management"` permission, but [`getSelf()`](https://developer.chrome.com/docs/extensions/reference/api/management#method-getSelf), [`uninstallSelf()`](https://developer.chrome.com/docs/extensions/reference/api/management#method-uninstallSelf), and [`getPermissionWarningsByManifest()`](https://developer.chrome.com/docs/extensions/reference/api/management#method-getPermissionWarningsByManifest) work without it.

**Sections:** Description · Permissions (`management`) · Types (`ExtensionDisabledReason`, `ExtensionInfo`, `ExtensionInstallType`, `ExtensionType`, `IconInfo`, `LaunchType`, `UninstallOptions`) · Methods (`createAppShortcut`, `generateAppForLink`, `get`, `getAll`, `getPermissionWarningsById`, `getPermissionWarningsByManifest`, `getSelf`, `installReplacementWebApp`, `launchApp`, `setEnabled`, `setLaunchType`, `uninstall`, `uninstallSelf`) · Events (`onDisabled`, `onEnabled`, `onInstalled`, `onUninstalled`). No properties.
- **"Methods"** *(anchor unverified)*: `setEnabled()` must run in a user gesture and may show native confirmation UI; app-only calls (`launchApp`, `setLaunchType`, `createAppShortcut`, `generateAppForLink`, `installReplacementWebApp`, Chrome 77+) require an app id, and `setLaunchType()` must be checked against `ExtensionInfo.availableLaunchTypes`. `uninstall()`/`uninstallSelf()` fail in managed environments where uninstall is forbidden; promises Chrome 88+.
- **"Types"** *(anchor unverified)*: `ExtensionInfo` carries `id`, `name`, `enabled`, `mayDisable`, `mayEnable` (Chrome 62+), `installType`, `type`, `permissions`, `hostPermissions`, `icons`, `version`, `versionName`; `ExtensionInstallType` = `admin|development|normal|sideload|other`; `LaunchType` = `OPEN_AS_REGULAR_TAB|OPEN_AS_PINNED_TAB|OPEN_AS_WINDOW|OPEN_FULL_SCREEN`; `UninstallOptions.showConfirmDialog` is ignored when uninstalling another extension.
  - *Key terms/entities:* `"management"`, `ExtensionInfo`, `getAll()`, `getSelf()`, `uninstallSelf()`, `getPermissionWarningsById()`, `getPermissionWarningsByManifest()`, `setEnabled()`, `runtime.lastError`, `?grayscale=true`, Chrome 44 / 62 / 77 / 88

### [chrome.notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications)

**Overview:** Creates rich system-tray notifications from four templates (`basic`, `image`, `list`, `progress`) with title, message, icon, up to two action buttons, priority, progress, and silent/interaction flags. Requires the `"notifications"` permission, which also raises an install warning.

**Sections:** Description · Permissions (`notifications`) · Types (`NotificationBitmap`, `NotificationButton`, `NotificationItem`, `NotificationOptions`, `PermissionLevel`, `TemplateType`) · Methods (`clear`, `create`, `getAll`, `getPermissionLevel`, `update`) · Events (`onButtonClicked`, `onClicked`, `onClosed`, `onPermissionLevelChanged`, `onShowSettings`). No properties.
- **"Types"** *(anchor unverified)*: `create()` requires `type`, `title`, `message`, and `iconUrl` (data, blob, or extension-relative URL). `priority` spans -2 to 2 (default 0), and -2/-1 error on Windows/Linux/macOS where no notification center exists; `progress` is 0–100. Deprecated: `iconUrl` on buttons, `appIconMaskUrl`, `imageUrl` (Chrome 59), `isClickable` (Chrome 67); macOS shows only the first `items` entry.
- **"Methods"** *(anchor unverified)*: `create(notificationId?, options)` auto-generates an id when omitted and replaces an existing notification with the same id; ids are capped at 500 characters. `clear()` and `update()` resolve `boolean` for whether a match existed; `getAll()` returns a map of ids. All promise-based from Chrome 116+.
- **"Events"** *(anchor unverified)*: `onClicked(notificationId)`, `onButtonClicked(notificationId, buttonIndex)`, `onClosed(notificationId, byUser)`, and `onPermissionLevelChanged(level)` — the last only fires from ChromeOS UI since Chrome 47; `onShowSettings` is deprecated (Chrome 65).
  - *Key terms/entities:* `"notifications"`, `notifications.create()`, `NotificationOptions`, `TemplateType` (`basic`, `image`, `list`, `progress`), `iconUrl`, `contextMessage`, `priority`, `requireInteraction` (Chrome 50+), `silent` (Chrome 70+), `progress`, `PermissionLevel` (`granted`, `denied`), `onButtonClicked`, 500-character id limit

### [chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

**Overview:** Stores, retrieves, and tracks changes to extension data across four areas — `local`, `managed`, `session`, `sync` — each a `StorageArea`; requires the `"storage"` permission. Values are JSON-serializable, survive cache/history clears, are reachable from every extension context including the service worker, and replace Web Storage, which service workers cannot use.

**Sections:** Description · Permissions (`storage`) · Examples (Local, Sync, Session) · Concepts and usage (Can extensions use web storage APIs?, Storage and throttling limits) · Storage areas (Local, Managed, Session, Sync) · Methods and events · Use cases (Respond to storage updates, Asynchronous preload from storage) · DevTools · Types (`AccessLevel`, `StorageChange`) · Properties ([`local`](https://developer.chrome.com/docs/extensions/reference/api/storage#property-local), [`managed`](https://developer.chrome.com/docs/extensions/reference/api/storage#property-managed), [`session`](https://developer.chrome.com/docs/extensions/reference/api/storage#property-session), [`sync`](https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync)) · Methods (`get`, `getBytesInUse`, `getKeys`, `remove`, `set`, `setAccessLevel`, `clear`) · Events (`onChanged`).
- **"Storage areas"** *(anchor unverified)*: `local` = 10 MB (5 MB in Chrome 113 and earlier), raised by `unlimitedStorage`, cleared on uninstall; `session` (MV3+, Chrome 102+) = 10 MB in memory (1 MB in Chrome 111 and earlier), wiped on disable/reload/update/restart, hidden from content scripts by default; `sync` = ~100 KB total, 8 KB per item, `MAX_ITEMS` 512, 1,800 writes/hour, 120/minute; `managed` is read-only and policy-driven.
- **"Methods and events"** *(anchor unverified)*: all seven methods plus `onChanged` belong to `StorageArea`; quota overruns reject the promise or set `runtime.lastError`. `setAccessLevel({accessLevel})` switches the `TRUSTED_CONTEXTS` / `TRUSTED_AND_UNTRUSTED_CONTEXTS` gate (Chrome 102+), the only way to expose `session` storage to content scripts.
  - *Key terms/entities:* `"storage"`, `unlimitedStorage`, `storage.local`, `storage.sync`, `storage.session`, `storage.managed`, `QUOTA_BYTES` (10485760 / 102400), `QUOTA_BYTES_PER_ITEM` (8192), `MAX_ITEMS` (512), `MAX_WRITE_OPERATIONS_PER_HOUR` (1800), `MAX_WRITE_OPERATIONS_PER_MINUTE` (120), `AccessLevel`, `StorageChange` (`oldValue`, `newValue`), `onChanged`

### 8.5 DevTools

### [chrome.devtools.inspectedWindow](https://developer.chrome.com/docs/extensions/reference/api/devtools/inspectedWindow)

**Overview:** Interacts with the page being inspected in DevTools: read its tab ID, evaluate JavaScript inside the page's own JS context, reload it with cache/user-agent/early-script overrides, and enumerate or edit its resources. Requires the `"devtools_page"` manifest key, so it is available only on a DevTools page — and `browser.tabs.*` is **not** exposed there, so pass `tabId` to the service worker.

**Sections:** Description · Manifest (`"devtools_page"`) · Execute code in the inspected window · Examples · Types ([`Resource`](https://developer.chrome.com/docs/extensions/reference/api/devtools/inspectedWindow#type-Resource): `url`, `getContent`, `setContent`) · Properties ([`tabId`](https://developer.chrome.com/docs/extensions/reference/api/devtools/inspectedWindow#property-tabId)) · Methods (`eval`, `getResources`, `reload`) · Events (`onResourceAdded`, `onResourceContentCommitted`).
- **"Execute code in the inspected window"** *(anchor unverified)*: `eval()` runs **without** an isolated world, so page JS state, `inspect()`, and `$0` are reachable, and the result must be JSON-compliant; prefer `scripting.executeScript` when JS state is not needed. Options: `frameURL`, `useContentScriptContext` (fails with `E_NOTFOUND` if no content script is injected), and `scriptExecutionContext` (Chrome 107+), which overrides `useContentScriptContext`.
- **"Methods"** *(anchor unverified)*: `reload({ignoreCache, injectedScript, userAgent})` injects `injectedScript` before any frame script but only for that reload; `getResources()` returns `Resource[]` whose `getContent()`/`setContent(content, commit)` handle text resources. Promises land in Chrome 151+, and `browser.*` reaches DevTools pages only from Chrome 152.
- **"Events"** *(anchor unverified)*: `onResourceAdded(resource)` and `onResourceContentCommitted(resource, content)` cover resource discovery and saved edits; the description also names an `onResourceContent` event that has no entry on the page.
  - *Key terms/entities:* `"devtools_page"`, `devtools.inspectedWindow.tabId`, `eval()`, `getResources()`, `reload()`, `Resource`, `getContent()`, `setContent()`, `frameURL`, `useContentScriptContext`, `scriptExecutionContext`, `E_NOTFOUND`, `isException`, `$0`, `inspect()`, `scripting.executeScript`

### [chrome.devtools.network](https://developer.chrome.com/docs/extensions/reference/api/devtools/network)

**Overview:** Reads the Network panel's traffic as HTTP Archive (HAR) data — the full HAR log via `getHAR()`, one HAR entry per finished request via `onRequestFinished`. Requires the `"devtools_page"` manifest key, so it only runs on a DevTools page.

**Sections:** Description · Manifest (`"devtools_page"`) · Examples · Types (`Request`: `getContent`) · Methods (`getHAR`) · Events (`onNavigated`, `onRequestFinished`). No properties.
- **"Description"** *(anchor unverified)*: HAR omits response bodies for efficiency — call each request's `getContent()` to fetch one. If DevTools opened after the page loaded, `getHAR()` may be missing early requests, so reload before trusting the log; otherwise the returned list matches the Network panel.
- **"Events"** *(anchor unverified)*: `onRequestFinished(request)` fires once all request data is available and is the usual trigger for `getContent()`; `onNavigated(url)` fires when the inspected window navigates to a new page. Promise support arrives in Chrome 151+, `browser.*` on DevTools pages in Chrome 152.
  - *Key terms/entities:* `"devtools_page"`, `devtools.network.getHAR()`, `onRequestFinished`, `onNavigated`, `Request.getContent()`, HAR log, HAR entry, HAR v1.2 Specification, `response.bodySize`, Network panel

### [chrome.devtools.panels](https://developer.chrome.com/docs/extensions/reference/api/devtools/panels)

**Overview:** Adds UI to the DevTools window — full tab panels, sidebar panes in Elements/Sources, status-bar buttons — and reads the active DevTools theme. Requires the `"devtools_page"` manifest key; each panel or sidebar is its own HTML page with access to all `chrome.devtools` and extension APIs.

**Sections:** Description · Manifest (`"devtools_page"`) · Example · Types (`Button`, `ElementsPanel`, `ExtensionPanel`, `ExtensionSidebarPane`, `SourcesPanel`, `Theme`) · Properties (`elements`, `sources`, `themeName`) · Methods (`create`, `openResource`, `setOpenResourceHandler`, `setThemeChangeHandler`). No top-level events — they live on the panel/sidebar objects (see below).
- **"Description"** *(anchor unverified)*: `setOpenResourceHandler(callback?)` installs a resource-link handler, but **at most one** handler is invoked — users pick the default or an extension in DevTools Settings — and repeated calls keep only the last; call with no argument or `null` to unset. `setThemeChangeHandler()` (Chrome 99+) does the same for theme changes.
- **"Types"** *(anchor unverified)*: `ExtensionPanel` exposes `onShown` (receives the panel `window`), `onHidden`, `onSearch`, `createStatusBarButton()` (two 32x24 icons in one 64x24 image), and `show()` (Chrome 140+); `ExtensionSidebarPane` has `setPage()`, `setObject()`, `setExpression()`, `setHeight()`, `onShown`/`onHidden`; `ElementsPanel`/`SourcesPanel` add `onSelectionChanged` and `createSidebarPane()`; `Button` has `onClicked` and `update()`; `Theme` = `default|dark`.
- **"Methods"** *(anchor unverified)*: `create(title, iconPath, pagePath)` returns `ExtensionPanel`; `openResource(url, lineNumber, columnNumber?)` (column Chrome 114+) opens a URL in a DevTools panel; promises/resolved callbacks for `create`, `openResource`, and the sidebar `set*` methods land in Chrome 152, `themeName` exists since Chrome 59.
  - *Key terms/entities:* `"devtools_page"`, `devtools.panels.create()`, `elements.createSidebarPane()`, `sources`, `themeName`, `Theme`, `setOpenResourceHandler()`, `setThemeChangeHandler()`, `ExtensionPanel.show()`, `ExtensionSidebarPane.setExpression()`, `setObject()`, `setPage()`, `setHeight()`, `Button.update()`

### [chrome.devtools.performance](https://developer.chrome.com/docs/extensions/reference/api/devtools/performance)

**Overview:** Notifies when the DevTools Performance panel starts and stops recording, so an extension can automate profiling. Chrome 129+, reachable only from a DevTools page (`"devtools_page"`, the mechanism this page leaves to the DevTools APIs summary); the namespace has only these two events.

**Sections:** Description · Availability (Chrome 129+) · Concepts and usage · Examples · Events ([`onProfilingStarted`](https://developer.chrome.com/docs/extensions/reference/api/devtools/performance#event-onProfilingStarted), [`onProfilingStopped`](https://developer.chrome.com/docs/extensions/reference/api/devtools/performance#event-onProfilingStopped)). No types, properties, or methods — the page's Manifest section is absent, unlike the other `devtools` pages.
- **"Concepts and usage"** *(anchor unverified)*: `onProfilingStarted` fires when the Performance panel begins recording and `onProfilingStopped` when it stops; neither callback receives any parameters. The text also notes recording-status notifications were usable from Chrome 128, one version before the documented Availability of Chrome 129.
- **"Examples"** *(anchor unverified)*: register plain no-argument listeners — `browser.devtools.performance.onProfilingStarted.addListener(() => {})` and `onProfilingStopped` — with no options object or filters supported.
  - *Key terms/entities:* `devtools.performance`, `onProfilingStarted`, `onProfilingStopped`, Performance panel, recording status, `addListener`, Chrome 128 / 129 / 152 (`browser.*`)

### [chrome.devtools.recorder](https://developer.chrome.com/docs/extensions/reference/api/devtools/recorder)

**Overview:** Customizes the DevTools Recorder panel — add an export format to its **Export** menu and a custom replay button — by registering an extension plugin. A preview feature, Chrome 105+ (export from 105, replay from 112), available only on a DevTools page.

**Sections:** Description · Availability (Chrome 105+) · Concepts and usage (Customizing the export feature, Customizing the replay button) · Examples (Export plugin, Replay plugin) · Types (`RecorderExtensionPlugin`: `replay`, `stringify`, `stringifyStep`; `RecorderView`: `onHidden`, `onShown`, `show`) · Methods (`createView`, `registerRecorderExtensionPlugin`). No properties or top-level events.
- **"Concepts and usage"** *(anchor unverified)*: `registerRecorderExtensionPlugin(plugin, name, mediaType)` puts `name` in the **Export** menu, and `mediaType` declares the output type (e.g. `application/javascript`); the plugin must implement `stringify` (whole user flow) and `stringifyStep` (single step), both matching Puppeteer's recording schema. Implementing `replay` (Chrome 112+) adds the replay button and receives the current recording.
- **"Methods"** *(anchor unverified)*: `createView(title, pagePath)` (Chrome 112+) returns an embedded `RecorderView` — a `RecorderView`'s `show()` activates it, `onShown`/`onHidden` signal visibility, and `pagePath` is an extension-relative HTML page. `registerRecorderExtensionPlugin()` returns `void`; `browser.*` support arrives in Chrome 152.
  - *Key terms/entities:* `devtools.recorder`, `registerRecorderExtensionPlugin()`, `createView()`, `RecorderExtensionPlugin` (`stringify`, `stringifyStep`, `replay`), `RecorderView` (`show`, `onShown`, `onHidden`), `mediaType`, `pagePath`, Recorder panel Export menu, Puppeteer replay schema, Chrome 105 / 112 / 152

### 8.6 Platform, ChromeOS & Enterprise

### [chrome.audio](https://developer.chrome.com/docs/extensions/reference/api/audio)

**Overview:** Reads and controls the system's audio devices — list devices, choose active input/output, set per-device volume or gain, and mute whole stream types. ChromeOS only, and currently usable only in kiosk mode; Chrome 59+ (`browser.audio` since Chrome 148).

**Sections:** Description · Permissions (`audio`) · Availability (Chrome 59+) · Types (`AudioDeviceInfo`: `deviceName`, `deviceType`, `displayName`, `id`, `isActive`, `level`, `stableDeviceId`, `streamType`; `DeviceFilter`: `isActive`, `streamTypes`; `DeviceIdLists`: `input`, `output`; `DeviceProperties`: `level`; `DeviceType`: `"HEADPHONE"`, `"MIC"`, `"USB"`, `"BLUETOOTH"`, `"HDMI"`, `"INTERNAL_SPEAKER"`, `"INTERNAL_MIC"`, `"FRONT_MIC"`, `"REAR_MIC"`, `"KEYBOARD_MIC"`, `"HOTWORD"`, `"LINEOUT"`, `"POST_MIX_LOOPBACK"`, `"POST_DSP_LOOPBACK"`, `"ALSA_LOOPBACK"`, `"OTHER"`; `LevelChangedEvent`: `deviceId`, `level`; `MuteChangedEvent`: `isMuted`, `streamType`; `StreamType`: `"INPUT"`, `"OUTPUT"`) · Methods (`getDevices`, `getMute`, `setActiveDevices`, `setMute`, `setProperties`) · Events (`onDeviceListChanged`, `onLevelChanged`, `onMuteChanged`). No properties.
- **"Description"** *(anchor unverified)*: kiosk-mode ChromeOS only; mute is system-wide and applies to every device of that stream type; `setActiveDevices()` errors on a non-existent device ID; an omitted `input`/`output` list leaves that category unaffected.
  - *Key terms/entities:* `audio.getDevices()`, `"audio"`, `DeviceFilter`, `DeviceIdLists`, `stableDeviceId`, `level` (volume for output, gain for input), promises Chrome 116+, ChromeOS only

### [chrome.certificateProvider](https://developer.chrome.com/docs/extensions/reference/api/certificateProvider)

**Overview:** Exposes client certificates to the platform so ChromeOS can use them for TLS client authentication: publish the certificate list, answer certificate-update requests, and sign handshake data with the extension-held private key. ChromeOS only; Chrome 46+ (`browser.certificateProvider` since Chrome 148).

**Sections:** Description · Permissions (`certificateProvider`) · Availability (Chrome 46+) · Concepts and usage · Types (`Algorithm`: `"RSASSA_PKCS1_v1_5_MD5_SHA1"`, `"RSASSA_PKCS1_v1_5_SHA1"`, `"RSASSA_PKCS1_v1_5_SHA256"`, `"RSASSA_PKCS1_v1_5_SHA384"`, `"RSASSA_PKCS1_v1_5_SHA512"`, `"RSASSA_PSS_SHA256"`, `"RSASSA_PSS_SHA384"`, `"RSASSA_PSS_SHA512"`; `CertificateInfo`: `certificate`, `supportedHashes`; `CertificatesUpdateRequest`: `certificatesRequestId`; `ClientCertificateInfo`: `certificateChain`, `supportedAlgorithms`; `Error`: `"GENERAL_ERROR"`; `Hash` (deprecated): `"MD5_SHA1"`, `"SHA1"`, `"SHA256"`, `"SHA384"`, `"SHA512"`; `PinRequestErrorType`: `"INVALID_PIN"`, `"INVALID_PUK"`, `"MAX_ATTEMPTS_EXCEEDED"`, `"UNKNOWN_ERROR"`; `PinRequestType`: `"PIN"`, `"PUK"`; `PinResponseDetails`: `userInput`; `ReportSignatureDetails`: `error`, `signRequestId`, `signature`; `RequestPinDetails`: `attemptsLeft`, `errorType`, `requestType`, `signRequestId`; `SetCertificatesDetails`: `certificatesRequestId`, `clientCertificates`, `error`; `SignatureRequest`: `algorithm`, `certificate`, `input`, `signRequestId`; `SignRequest`: `certificate`, `digest`, `hash`, `signRequestId`; `StopPinRequestDetails`: `errorType`, `signRequestId`) · Methods (`reportSignature`, `requestPin`, `setCertificates`, `stopPinRequest`) · Events (`onCertificatesUpdateRequested`, `onSignatureRequested`). No properties.
- **"Concepts and usage"** *(anchor unverified)*: register both events; call `setCertificates()` after init and on every certificate change, and answer `onCertificatesUpdateRequested` with the received `certificatesRequestId`; `onSignatureRequested` carries unhashed `input` plus `algorithm` — prepend DigestInfo/padding yourself, then reply via `reportSignature()` (omit `signature` or send `error: "GENERAL_ERROR"` to abort). `requestPin()` allows only one flow at a time and the extension must call `stopPinRequest()` itself; enterprise policy `AutoSelectCertificateForUrls` skips the user's certificate picker.
  - *Key terms/entities:* `certificateProvider.setCertificates()`, `certificateProvider.reportSignature()`, `certificateProvider.requestPin()`, `clientCertificates`, `signRequestId`, `certificateChain`, `supportedAlgorithms`, `onCertificatesUpdateRequested`, `onSignatureRequested`, `AutoSelectCertificateForUrls`

### [chrome.dns](https://developer.chrome.com/docs/extensions/reference/api/dns)

**Overview:** Resolves hostnames and IP-address literals to addresses from an extension with a single method, `dns.resolve()`. Requires the `"dns"` permission; **Dev channel only** — there are no foreseeable plans to move it to Chrome stable.

**Sections:** Description · Permissions (`dns`) · Availability (Dev channel) · Usage · Types (`ResolveCallbackResolveInfo`: `address`, `resultCode`) · Methods (`resolve`). No properties, no events.
- **"Usage"** *(anchor unverified)*: `await chrome.dns.resolve('example.com')` returns `{ address, resultCode }` where `resultCode` 0 means success and `address` is only present then; pass a bare hostname — a scheme or trailing slash (`https://example.com/`) is invalid.
  - *Key terms/entities:* `dns.resolve()`, `hostname`, `ResolveCallbackResolveInfo`, `address`, `resultCode`, `"dns"` permission, Dev channel only, Chrome Dev

### [chrome.documentScan](https://developer.chrome.com/docs/extensions/reference/api/documentScan)

**Overview:** Discovers and reads images from attached document scanners. Two modes: the simple `scan()` that works with any scanner and returns image data URLs, and the newer multi-step flow (Chrome 124+, member-level Chrome 125+) (`getScannerList` → `openScanner` → `setOptions` → `startScan` → `readScanData` → `closeScanner`/`cancelScan`) with full per-device option control. Requires the `"documentScan"` permission; ChromeOS only; Chrome 44+ (`browser.documentScan` since Chrome 148).

**Sections:** Description · Permissions (`documentScan`) · Availability (Chrome 44+) · Concepts and usage (Simple scanning, Complex scanning: Discovery, Scanner configuration, Scanning; Response objects; Scanner options; Construct a user interface; Set scanner options) · Examples (Retrieve a page as a blob, Scan one letter-size page, Show the configuration) · Types (`CancelScanResponse`: `job`, `result`; `CloseScannerResponse`: `result`, `scannerHandle`; `Configurability`: `"NOT_CONFIGURABLE"`, `"SOFTWARE_CONFIGURABLE"`, `"HARDWARE_CONFIGURABLE"`; `ConnectionType`: `"UNSPECIFIED"`, `"USB"`, `"NETWORK"`; `ConstraintType`: `"INT_RANGE"`, `"FIXED_RANGE"`, `"INT_LIST"`, `"FIXED_LIST"`, `"STRING_LIST"`; `DeviceFilter`: `local`, `secure`; `GetOptionGroupsResponse`: `groups`, `result`, `scannerHandle`; `GetScannerListResponse`: `result`, `scanners`; `OpenScannerResponse`: `options`, `result`, `scannerHandle`, `scannerId`; `OperationResult`: `"UNKNOWN"`, `"SUCCESS"`, `"UNSUPPORTED"`, `"CANCELLED"`, `"DEVICE_BUSY"`, `"INVALID"`, `"WRONG_TYPE"`, `"EOF"`, `"ADF_JAMMED"`, `"ADF_EMPTY"`, `"COVER_OPEN"`, `"IO_ERROR"`, `"ACCESS_DENIED"`, `"NO_MEMORY"`, `"UNREACHABLE"`, `"MISSING"`, `"INTERNAL_ERROR"`; `OptionConstraint`: `list`, `max`, `min`, `quant`, `type`; `OptionGroup`: `members`, `title`; `OptionSetting`: `name`, `type`, `value`; `OptionType`: `"UNKNOWN"`, `"BOOL"`, `"INT"`, `"FIXED"`, `"STRING"`, `"BUTTON"`, `"GROUP"`; `OptionUnit`: `"UNITLESS"`, `"PIXEL"`, `"BIT"`, `"MM"`, `"DPI"`, `"PERCENT"`, `"MICROSECOND"`; `ReadScanDataResponse`: `data`, `estimatedCompletion`, `job`, `result`; `ScannerInfo`: `connectionType`, `deviceUuid`, `imageFormats`, `manufacturer`, `model`, `name`, `protocolType`, `scannerId`, `secure`; `ScannerOption`: `configurability`, `constraint`, `description`, `isActive`, `isAdvanced`, `isAutoSettable`, `isDetectable`, `isEmulated`, `name`, `title`, `type`, `unit`, `value`; `ScanOptions`: `maxImages`, `mimeTypes`; `ScanResults`: `dataUrls`, `mimeType`; `SetOptionResult`: `name`, `result`; `SetOptionsResponse`: `options`, `results`, `scannerHandle`; `StartScanOptions`: `format`, `maxReadSize`; `StartScanResponse`: `job`, `result`, `scannerHandle`) · Methods (`cancelScan`, `closeScanner`, `getOptionGroups`, `getScannerList`, `openScanner`, `readScanData`, `scan`, `setOptions`, `startScan`). No properties, no events.
- **"Concepts and usage"** *(anchor unverified)*: `scan()` suits any-scanner use and only bounds `maxImages` / `mimeTypes`, returning `dataUrls` for an `<img>`; complex scanning needs Chrome 124+ and three phases (discovery via `getScannerList`, configuration via `openScanner`/`setOptions`, scanning via `startScan`/`readScanData`). Calling `openScanner()`, `getScannerList()`, or `startScan()` again cancels the earlier call's operation; response properties are only populated when `result` is `SUCCESS`; scanner options are device-specific key-value maps of `ScannerOption`.
- **"Examples"** / **[Scan one letter-size page](https://developer.chrome.com/docs/extensions/reference/api/documentScan#scan_one_letter-size_page)**: `pageAsBlob()` loops `readScanData()` while `result == OperationResult.SUCCESS` (delay ~100 ms on empty data) until `EOF`; the letter-size example sets `tl-x`/`br-x`/`tl-y`/`br-y` in mm (215.9 x 279.4) as `OptionType.FIXED` and picks an ADF `source`.
  - *Key terms/entities:* `documentScan.scan()`, `documentScan.getScannerList()`, `documentScan.openScanner()`, `documentScan.setOptions()`, `documentScan.startScan()`, `documentScan.readScanData()`, `documentScan.closeScanner()`, `documentScan.cancelScan()`, `documentScan.getOptionGroups()`, `OperationResult.SUCCESS`, `OperationResult.EOF`, `ScannerOption`, `OptionSetting`, `scannerHandle`, `scannerId`, ChromeOS only

### [chrome.enterprise.deviceAttributes](https://developer.chrome.com/docs/extensions/reference/api/enterprise/deviceAttributes)

**Overview:** Reads managed-device attributes — administrator-annotated asset ID and location, policy-set hostname, serial number, and the cloud directory device ID. Only for extensions force-installed by enterprise policy (**Requires policy**), ChromeOS only; Chrome 46+ (`browser.enterprise.deviceAttributes` since Chrome 148).

**Sections:** Description · Permissions (`enterprise.deviceAttributes`) · Availability (Chrome 46+; Requires policy) · Methods (`getDeviceAnnotatedLocation`, `getDeviceAssetId`, `getDeviceHostname`, `getDeviceSerialNumber`, `getDirectoryDeviceId`). No types, no properties, no events.
- **"Methods"** *(anchor unverified)*: every method resolves `Promise<string>` (promise form Chrome 96+) and returns an empty string instead of failing when the user is unaffiliated or the administrator/policy set no value; `getDeviceHostname()` (Chrome 82+) reflects `DeviceHostnameTemplate`; serial number is for device administration such as device-wide CSR generation, not tracking.
  - *Key terms/entities:* `enterprise.deviceAttributes.getDeviceAssetId()`, `getDeviceAnnotatedLocation()`, `getDeviceHostname()`, `getDeviceSerialNumber()`, `getDirectoryDeviceId()`, `"enterprise.deviceAttributes"`, `DeviceHostnameTemplate`, Requires policy, ChromeOS only

### [chrome.enterprise.hardwarePlatform](https://developer.chrome.com/docs/extensions/reference/api/enterprise/hardwarePlatform)

**Overview:** Returns the manufacturer and model of the hardware platform the browser runs on — one method, `getHardwarePlatformInfo()`. Available only to extensions installed by enterprise policy **and** only when the `EnterpriseHardwarePlatformAPIEnabled` policy is set; Chrome 71+; cross-platform, not ChromeOS-only.

**Sections:** Description · Permissions (`enterprise.hardwarePlatform`) · Availability (Chrome 71+; Requires policy) · Types (`HardwarePlatformInfo`: `manufacturer`, `model`) · Methods (`getHardwarePlatformInfo`). No properties, no events.
- **"Methods"** *(anchor unverified)*: resolves `Promise<HardwarePlatformInfo>` (promise form Chrome 96+) with `{ manufacturer, model }`, gated on both force-install policy and `EnterpriseHardwarePlatformAPIEnabled`.
  - *Key terms/entities:* `enterprise.hardwarePlatform.getHardwarePlatformInfo()`, `HardwarePlatformInfo.manufacturer`, `HardwarePlatformInfo.model`, `"enterprise.hardwarePlatform"`, `EnterpriseHardwarePlatformAPIEnabled`, Requires policy

### [chrome.enterprise.login](https://developer.chrome.com/docs/extensions/reference/api/enterprise/login)

**Overview:** Exits the current ChromeOS Managed Guest session — a single method, `exitCurrentManagedGuestSession()`. Only for policy-installed extensions running inside a Managed Guest session; **ChromeOS only**, Chrome 139+, **Requires policy**.

**Sections:** Description · Permissions (`enterprise.login`) · Availability (Chrome 139+; Requires policy) · Methods (`exitCurrentManagedGuestSession`). No types, no properties, no events.
- **"Description"** *(anchor unverified)*: the whole surface is logging the Managed Guest session out; resolves `Promise<void>`; unavailable to user-installed extensions or outside Managed Guest sessions.
  - *Key terms/entities:* `enterprise.login.exitCurrentManagedGuestSession()`, `"enterprise.login"`, Managed Guest session, Requires policy, ChromeOS only, Chrome 139+

### [chrome.enterprise.networkingAttributes](https://developer.chrome.com/docs/extensions/reference/api/enterprise/networkingAttributes)

**Overview:** Reads the local IPv4/IPv6 addresses and MAC address of the device's default network via `getNetworkDetails()`. ChromeOS only and available only to extensions force-installed by enterprise policy; Chrome 85+, **Requires policy**.

**Sections:** Description · Permissions (`enterprise.networkingAttributes`) · Availability (Chrome 85+; Requires policy) · Types (`NetworkDetails`: `ipv4`, `ipv6`, `macAddress`) · Methods (`getNetworkDetails`). No properties, no events.
- **"Methods"** *(anchor unverified)*: resolves `Promise<NetworkDetails>` (promise form Chrome 96+); `ipv4`/`ipv6` are optional (unset when not configured) while `macAddress` is always present; sets `runtime.lastError` when the user is unaffiliated or the device is offline.
  - *Key terms/entities:* `enterprise.networkingAttributes.getNetworkDetails()`, `NetworkDetails.ipv4`, `NetworkDetails.ipv6`, `NetworkDetails.macAddress`, `runtime.lastError`, `"enterprise.networkingAttributes"`, Requires policy, ChromeOS only

### [chrome.enterprise.platformKeys](https://developer.chrome.com/docs/extensions/reference/api/enterprise/platformKeys)

**Overview:** Generates hardware-backed keys on the platform's TPM tokens and installs the matching certificates so ChromeOS can use them for TLS authentication or network access. ChromeOS only, available only to policy-installed extensions (**Requires policy**), no fixed Chrome minimum listed; `browser.enterprise.platformKeys` since Chrome 148.

**Sections:** Description · Permissions (`enterprise.platformKeys`) · Availability (ChromeOS only; Requires policy) · Concepts and usage · Types (`Algorithm`: `"RSA"`, `"ECDSA"`; `ChallengeKeyOptions`: `challenge`, `registerKey`, `scope`; `RegisterKeyOptions`: `algorithm`; `Scope`: `"USER"`, `"MACHINE"`; `Token`: `id`, `softwareBackedSubtleCrypto`, `subtleCrypto`) · Methods (`challengeKey`, `challengeMachineKey` (deprecated), `challengeUserKey` (deprecated), `getCertificates`, `getTokens`, `importCertificate`, `removeCertificate`). No properties, no events.
- **"Concepts and usage"** *(anchor unverified)*: enrol a client certificate with `getTokens()` → pick the token whose `id` is `"user"` → `token.subtleCrypto.generateKey()` → `exportKey("spki", …)` → `sign()` the CSR data → `importCertificate(userToken.id, certificate)`. Static token IDs are `"user"` and `"system"`; keys are non-extractable, cannot cross tokens, and cannot be used with `window.crypto.subtle`.
- **"Methods"** *(anchor unverified)*: `challengeKey()` (Chrome 110+) is the remote-attestation entry replacing `challengeMachineKey()`/`challengeUserKey()` (Chrome 50+, **deprecated since Chrome 110**) and takes `scope` plus optional `registerKey`; all promises arrive in Chrome 131+. `softwareBackedSubtleCrypto` (Chrome 97+) is limited to non-extractable RSASSA-PKCS1-V1_5 keys with `modulusLength` ≤ 2048 and allows one signature per key unless the `KeyPermissions` policy allowlists the extension; the hardware `subtleCrypto` also supports ECDSA P-256.
  - *Key terms/entities:* `enterprise.platformKeys.getTokens()`, `enterprise.platformKeys.importCertificate()`, `enterprise.platformKeys.removeCertificate()`, `enterprise.platformKeys.getCertificates()`, `enterprise.platformKeys.challengeKey()`, `challengeMachineKey()`, `challengeUserKey()`, `Token.subtleCrypto`, `Token.softwareBackedSubtleCrypto`, `ChallengeKeyOptions`, `Scope`, `"user"`, `"system"`, `KeyPermissions`, Verified Access Web API

### [chrome.fileBrowserHandler](https://developer.chrome.com/docs/extensions/reference/api/fileBrowserHandler)

**Overview:** Extends the ChromeOS file browser (Alt+Shift+M or an attached SD card/USB drive) with buttons that act on selected files — e.g. "Save to Gallery" or upload-to-website. Register handlers in the manifest `"file_browser_handlers"` array and react to clicks via the single `onExecute` event. Requires the `"fileBrowserHandler"` permission; **ChromeOS only** and **Foreground only**; no Chrome minimum listed.

**Sections:** Description · Concepts and usage (Implement a file browser handler) · Permissions (`fileBrowserHandler`) · Availability · Types (`FileHandlerExecuteEventDetails`: `entries`, `tab_id`) · Events (`onExecute`). No properties, no methods.
- **"Implement a file browser handler"** *(anchor unverified)*: handlers declare `id`, `default_title` (i18n-able), and `file_filters` such as `"filesystem:*.png"` (`filesystem:*.*` for all), plus a 16x16 icon; `browser.fileBrowserHandler.onExecute.addListener(async (id, details) => …)` receives the manifest `id` and a details object whose `entries` are `FileSystemFileEntry` items wrapping the File System API (no promise API — wrap `entry.file()`).
  - *Key terms/entities:* `"file_browser_handlers"`, `"fileBrowserHandler"`, `file_filters`, `default_title`, `onExecute`, `FileHandlerExecuteEventDetails.entries`, `tab_id`, `FileSystemFileEntry`, `filesystem:*.jpg`, Foreground only, ChromeOS only

### [chrome.fileSystemProvider](https://developer.chrome.com/docs/extensions/reference/api/fileSystemProvider)

**Overview:** Lets an extension provide a virtual file system that appears in the ChromeOS Files app — mount/unmount volumes, answer metadata, read, write, directory, watcher, and action requests, and notify about changes. Used for cloud services and archives. Requires the `"fileSystemProvider"` permission plus a required `"file_system_provider_capabilities"` manifest section; **ChromeOS only**; no Chrome minimum listed.

**Sections:** Description · Permissions (`fileSystemProvider`) · Availability · Overview · Mounting file systems · Configuring file systems · Life cycle · Types (`AbortRequestedOptions`: `fileSystemId`, `operationRequestId`, `requestId`; `Action`: `id`, `title`; `AddWatcherRequestedOptions`: `entryPath`, `fileSystemId`, `recursive`, `requestId`; `Change`: `changeType`, `cloudFileInfo`, `entryPath`; `ChangeType`: `"CHANGED"`, `"DELETED"`; `CloseFileRequestedOptions`: `fileSystemId`, `openRequestId`, `requestId`; `CloudFileInfo`: `versionTag`; `CloudIdentifier`: `id`, `providerName`; `CommonActionId`: `"SAVE_FOR_OFFLINE"`, `"OFFLINE_NOT_NECESSARY"`, `"SHARE"`; `ConfigureRequestedOptions`: `fileSystemId`, `requestId`; `CopyEntryRequestedOptions`: `fileSystemId`, `requestId`, `sourcePath`, `targetPath`; `CreateDirectoryRequestedOptions`: `directoryPath`, `fileSystemId`, `recursive`, `requestId`; `CreateFileRequestedOptions`: `filePath`, `fileSystemId`, `requestId`; `DeleteEntryRequestedOptions`: `entryPath`, `fileSystemId`, `recursive`, `requestId`; `EntryMetadata`: `cloudFileInfo`, `cloudIdentifier`, `isDirectory`, `mimeType`, `modificationTime`, `name`, `size`, `thumbnail`; `ExecuteActionRequestedOptions`: `actionId`, `entryPaths`, `fileSystemId`, `requestId`; `FileSystemInfo`: `displayName`, `fileSystemId`, `openedFiles`, `openedFilesLimit`, `supportsNotifyTag`, `watchers`, `writable`; `GetActionsRequestedOptions`: `entryPaths`, `fileSystemId`, `requestId`; `GetMetadataRequestedOptions`: `cloudFileInfo`, `cloudIdentifier`, `entryPath`, `fileSystemId`, `isDirectory`, `mimeType`, `modificationTime`, `name`, `requestId`, `size`, `thumbnail`; `MountOptions`: `displayName`, `fileSystemId`, `openedFilesLimit`, `persistent`, `supportsNotifyTag`, `writable`; `MoveEntryRequestedOptions`: `fileSystemId`, `requestId`, `sourcePath`, `targetPath`; `NotifyOptions`: `changeType`, `changes`, `fileSystemId`, `observedPath`, `recursive`, `tag`; `OpenedFile`: `filePath`, `mode`, `openRequestId`; `OpenFileMode`: `"READ"`, `"WRITE"`; `OpenFileRequestedOptions`: `filePath`, `fileSystemId`, `mode`, `requestId`; `ProviderError`: `"OK"`, `"FAILED"`, `"IN_USE"`, `"EXISTS"`, `"NOT_FOUND"`, `"ACCESS_DENIED"`, `"TOO_MANY_OPENED"`, `"NO_MEMORY"`, `"NO_SPACE"`, `"NOT_A_DIRECTORY"`, `"INVALID_OPERATION"`, `"SECURITY"`, `"ABORT"`, `"NOT_A_FILE"`, `"NOT_EMPTY"`, `"INVALID_URL"`, `"IO"`; `ReadDirectoryRequestedOptions`: `directoryPath`, `fileSystemId`, `isDirectory`, `mimeType`, `modificationTime`, `name`, `requestId`, `size`, `thumbnail`; `ReadFileRequestedOptions`: `fileSystemId`, `length`, `offset`, `openRequestId`, `requestId`; `RemoveWatcherRequestedOptions`: `entryPath`, `fileSystemId`, `recursive`, `requestId`; `TruncateRequestedOptions`: `filePath`, `fileSystemId`, `length`, `requestId`; `UnmountOptions`: `fileSystemId`; `UnmountRequestedOptions`: `fileSystemId`, `requestId`; `Watcher`: `entryPath`, `lastTag`, `recursive`; `WriteFileRequestedOptions`: `data`, `fileSystemId`, `offset`, `openRequestId`, `requestId`) · Methods (`get`, `getAll`, `mount`, `notify`, `unmount`) · Events (`onAbortRequested`, `onAddWatcherRequested`, `onCloseFileRequested`, `onConfigureRequested`, `onCopyEntryRequested`, `onCreateDirectoryRequested`, `onCreateFileRequested`, `onDeleteEntryRequested`, `onExecuteActionRequested`, `onGetActionsRequested`, `onGetMetadataRequested`, `onMountRequested`, `onMoveEntryRequested`, `onOpenFileRequested`, `onReadDirectoryRequested`, `onReadFileRequested`, `onRemoveWatcherRequested`, `onTruncateRequested`, `onUnmountRequested`, `onWriteFileRequested`). No properties.
- **"Mounting file systems"** / **"Life cycle"** *(anchor unverified)*: `file_system_provider_capabilities` takes `configurable`, `multiple_mounts`, `watchable` (all optional, default false) and a required `source` of `"file"` / `"device"` / `"network"`; source `"file"` is for packaged apps only (`onLaunched` is unavailable to extensions), while `"device"`/`"network"` mount from `onMountRequested`. Mounts persist across reboot until the extension unloads or calls `unmount()`.
- **"Events"** *(anchor unverified)*: every handler gets `(options, successCallback, errorCallback)` and must report `ProviderError` codes (`"OK"` for success); `onReadFileRequested`/`onReadDirectoryRequested` stream results in chunks with a `hasMore` flag; `onUnmountRequested` must be answered with `unmount()`; `notify()` requires the `file_system_provider.notify` manifest option and a unique `tag` when `supportsNotifyTag` is set. Promises (Chrome 96+) on all five methods.
  - *Key terms/entities:* `fileSystemProvider.mount()`, `fileSystemProvider.unmount()`, `fileSystemProvider.notify()`, `fileSystemProvider.getAll()`, `fileSystemProvider.get()`, `onMountRequested`, `onUnmountRequested`, `onGetMetadataRequested`, `onReadFileRequested`, `onWriteFileRequested`, `onConfigureRequested`, `onGetActionsRequested`, `ProviderError`, `MountOptions.persistent`, `OpenFileMode`, `EntryMetadata`, ChromeOS only

### [chrome.fontSettings](https://developer.chrome.com/docs/extensions/reference/api/fontSettings)

**Overview:** Reads and overrides Chrome's font settings — per CSS generic family (`standard`, `serif`, `sansserif`, `fixed`, `cursive`, `fantasy`, `math`) and per language script, plus default, fixed-width default, and minimum font sizes. Requires the `"fontSettings"` permission; all methods promise-based since Chrome 96 (`browser.fontSettings` since Chrome 148).

**Sections:** Description · Permissions (`fontSettings`) · Concepts and usage · Examples · Types (`FontName`: `displayName`, `fontId`; `GenericFamily`: `"standard"`, `"sansserif"`, `"serif"`, `"fixed"`, `"cursive"`, `"fantasy"`, `"math"`; `LevelOfControl`: `"not_controllable"`, `"controlled_by_other_extensions"`, `"controllable_by_this_extension"`, `"controlled_by_this_extension"`; `ScriptCode`: ISO 15924 script codes — 140+ values such as `"Arab"`, `"Cyrl"`, `"Jpan"`, `"Hans"`, `"Hant"`, `"Latn"`, plus `"Zyyy"` for the global/default script) · Methods (`clearDefaultFixedFontSize`, `clearDefaultFontSize`, `clearFont`, `clearMinimumFontSize`, `getDefaultFixedFontSize`, `getDefaultFontSize`, `getFont`, `getFontList`, `getMinimumFontSize`, `setDefaultFixedFontSize`, `setDefaultFontSize`, `setFont`, `setMinimumFontSize`) · Events (`onDefaultFixedFontSizeChanged`, `onDefaultFontSizeChanged`, `onFontChanged`, `onMinimumFontSizeChanged`). No properties.
- **"Concepts and usage"** *(anchor unverified)*: font choice keys off both the CSS generic family and the language script — sans-serif Simplified Chinese differs from serif Japanese; an unspecified generic family falls back to `"standard"` and an unspecified language to the global script `"Zyyy"`. Settings are technically per-language, not strictly per-script (Russian selects `"Cyrl"`, which then also covers Latin glyphs the font contains). Each setter mirrors a `clear*` and a `get*`; `getFont()`/`setFont()` take `{ genericFamily, script?, fontId? }` where an empty `fontId` falls back to the global script, and the three size setters take `{ pixelSize }`. Every event details object carries `levelOfControl`, plus `fontId`/`genericFamily`/`script` for `onFontChanged` or `pixelSize` for the size events.
  - *Key terms/entities:* `fontSettings.getFont()`, `fontSettings.setFont()`, `fontSettings.clearFont()`, `fontSettings.getFontList()`, `fontSettings.setDefaultFontSize()`, `fontSettings.setMinimumFontSize()`, `fontSettings.onFontChanged`, `GenericFamily`, `ScriptCode`, `LevelOfControl`, `"fontSettings"`, sample `api-samples/fontSettings`

### [chrome.input.ime](https://developer.chrome.com/docs/extensions/reference/api/input/ime)

**Overview:** Implements a custom input method editor on ChromeOS — handle keystrokes, set the composition string and cursor/selection, drive the candidate window, add language-menu items, and expose an assistive window for ChromeVox. Requires the `"input"` permission; **ChromeOS only**; no Chrome minimum listed (`browser.input.ime` since Chrome 148).

**Sections:** Description · Permissions (`input`) · Availability (ChromeOS only) · Examples · Types (`AssistiveWindowButton`: `"undo"`, `"addToDictionary"`; `AssistiveWindowProperties`: `announceString`, `type`, `visible`; `AssistiveWindowType`: `"undo"`; `AutoCapitalizeType`: `"characters"`, `"words"`, `"sentences"`; `InputContext`: `autoCapitalize`, `autoComplete`, `autoCorrect`, `contextID`, `shouldDoLearning`, `spellCheck`, `type`; `InputContextType`: `"text"`, `"search"`, `"tel"`, `"url"`, `"email"`, `"number"`, `"password"`, `"null"`; `KeyboardEvent`: `altKey`, `altgrKey`, `capsLock`, `code`, `ctrlKey`, `extensionId`, `key`, `keyCode`, `requestId`, `shiftKey`, `type`; `KeyboardEventType`: `"keyup"`, `"keydown"`; `MenuItem`: `checked`, `enabled`, `id`, `label`, `style`, `visible`; `MenuItemStyle`: `"check"`, `"radio"`, `"separator"`; `MenuParameters`: `engineID`, `items`; `MouseButton`: `"left"`, `"middle"`, `"right"`; `ScreenType`: `"normal"`, `"login"`, `"lock"`, `"secondary-login"`; `UnderlineStyle`: `"underline"`, `"doubleUnderline"`, `"noUnderline"`; `WindowPosition`: `"cursor"`, `"composition"`) · Methods (`clearComposition`, `commitText`, `deleteSurroundingText`, `hideInputView`, `keyEventHandled`, `sendKeyEvents`, `setAssistiveWindowButtonHighlighted`, `setAssistiveWindowProperties`, `setCandidates`, `setCandidateWindowProperties`, `setComposition`, `setCursorPosition`, `setMenuItems`, `updateMenuItems`) · Events (`onActivate`, `onAssistiveWindowButtonClicked`, `onBlur`, `onCandidateClicked`, `onDeactivated`, `onFocus`, `onInputContextUpdate`, `onKeyEvent`, `onMenuItemActivated`, `onReset`, `onSurroundingTextChanged`). No properties.
- **"Examples"** *(anchor unverified)*: a minimal upper-casing IME stores `context.contextID` from `onFocus`, then in `onKeyEvent(engineID, keyData)` commits `keyData.key.toUpperCase()` via `commitText({ contextID, text })` and returns `true`; returning `false` lets the key through.
- **"Events"** *(anchor unverified)*: `onKeyEvent` may return `boolean | undefined` — if handled asynchronously, return `undefined` and later call `keyEventHandled(requestId, response)`; mutation methods (`commitText`, `setComposition`, `setCandidates`, `setCandidateWindowProperties`, `setCursorPosition`, `clearComposition`) fail when this extension does not own the active IME and resolve a `boolean`; promises arrived in Chrome 111 (Chrome 85/86 for the assistive-window methods), while `hideInputView()` and `keyEventHandled()` stay callback-free and return `void`; `onSurroundingTextChanged` limits surrounding text to 100 characters each way; `ScreenType` distinguishes `"login"`, `"lock"`, and `"secondary-login"` screens.
  - *Key terms/entities:* `input.ime.onKeyEvent`, `input.ime.onFocus`, `input.ime.commitText()`, `input.ime.setComposition()`, `input.ime.setCandidates()`, `input.ime.setCandidateWindowProperties()`, `input.ime.keyEventHandled()`, `input.ime.sendKeyEvents()`, `input.ime.setAssistiveWindowProperties()`, `contextID`, `engineID`, `"input"` permission, ChromeOS only

### [chrome.location](https://developer.chrome.com/docs/extensions/reference/api/location)

**Overview:** Retired API. `chrome.location` is no longer supported and the reference page is a stub carrying only a removal notice that redirects readers to open-web geolocation; it documents no permissions, types, methods, or events.

**Sections:** Description (single deprecation notice — no Permissions, Types, Methods, or Events sections observed).
- **"Description"** *(anchor unverified)*: read `chrome.location` as removed; use the open-web `navigator.geolocation` path instead — in MV3 the DOM API is unavailable in the service worker, so call it from an offscreen document, popup, or side panel and declare the `"geolocation"` permission for extension pages.
  - *Key terms/entities:* `chrome.location`, deprecated/unsupported, `navigator.geolocation`, Geolocation API, `"geolocation"` permission, `/docs/extensions/how-to/web-platform/geolocation`

### [chrome.loginState](https://developer.chrome.com/docs/extensions/reference/api/loginState)

**Overview:** Reads and monitors the ChromeOS login state — which profile the extension sits in and which screen the device is showing. Two getters plus one change event. Requires the `"loginState"` permission; **ChromeOS only**; Chrome 78+ (`browser.loginState` since Chrome 148).

**Sections:** Description · Permissions (`loginState`) · Availability (Chrome 78+) · Types (`ProfileType`: `"SIGNIN_PROFILE"`, `"USER_PROFILE"`, `"LOCK_PROFILE"`; `SessionState`: `"UNKNOWN"`, `"IN_OOBE_SCREEN"`, `"IN_LOGIN_SCREEN"`, `"IN_SESSION"`, `"IN_LOCK_SCREEN"`, `"IN_RMA_SCREEN"`) · Methods (`getProfileType`, `getSessionState`) · Events (`onSessionStateChanged`). No properties.
- **"Types"** *(anchor unverified)*: `ProfileType` separates the signin profile, the normal user profile, and the lock-screen profile; `SessionState` covers OOBE, login screen, active session, lock screen, and RMA repair mode. Both getters resolve promises since Chrome 96; `onSessionStateChanged` hands the listener the new `sessionState` only.
  - *Key terms/entities:* `loginState.getProfileType()`, `loginState.getSessionState()`, `loginState.onSessionStateChanged`, `ProfileType`, `SessionState`, `IN_SESSION`, `IN_OOBE_SCREEN`, `IN_RMA_SCREEN`, ChromeOS only

### [chrome.mimeHandler](https://developer.chrome.com/docs/extensions/reference/api/mimeHandler)

**Overview:** Registers a third-party extension page as the viewer for a MIME type (as of Chrome 151 only `application/pdf` for public handlers) instead of intercepting network requests — the original URL stays in the address bar, POST responses and single-use URLs work, embeds render, and `file://` works without file access permission. Configured by the manifest `"mime_types_handler"` key; Chrome 151+.

**Sections:** Description · Availability (Chrome 151+) · Manifest (`"mime_types_handler"`) · Concepts and usage (Register a handler, Retrieve stream information, Fall back to the native handler, Handle API availability) · Examples (Handle a stream, Let users toggle handling) · Types (`MimeHandlerOptions`: `canEmbed`, `enabled`; `StreamInfo`: `embedded`, `mimeType`, `originalUrl`, `responseHeaders`, `streamUrl`, `tabId`) · Methods (`abortAndFallbackToNativeHandler`, `getMimeHandlerOptions`, `getStreamInfo`, `setMimeHandlerOptions`). No permission section observed; no properties, no events.
- **"Register a handler"** *(anchor unverified)*: each `"mime_types_handler"` entry maps a MIME type to `{ handler_url, can_embed }`; `can_embed: true` also captures `<embed>`/`<object>`/`<iframe>` documents (otherwise top-level navigations only). Handlers only ever receive whole-frame documents, never inline subresources (`<img>`, `<audio>`, `<video>`); the most recently installed extension wins a contested MIME type and is restored on uninstall; an unsupported MIME type raises an install warning.
- **"Retrieve stream information"** *(anchor unverified)*: `getStreamInfo()` works only on a handler page Chrome loaded for a document — calling it from a service worker or options page fails — and the returned `streamUrl` is fetchable **exactly once** from the extension origin, so read it fully; use `originalUrl` for display, not for refetching.
- **"Fall back to the native handler"** *(anchor unverified)*: `abortAndFallbackToNativeHandler()` hands the document back to Chrome's built-in viewer and tears the handler frame down (no code runs after); Chrome serves its buffered copy when the response already arrived, otherwise it reloads — which can fail for POST or single-use URLs.
- **"Handle API availability"** *(anchor unverified)*: before Chrome 151 the manifest key still installs but `browser.mimeHandler` is `undefined` and no routing happens — feature-detect at startup when migrating off request interception. `setMimeHandlerOptions()` stores per-MIME `enabled`/`canEmbed` (a `null` member forgets the override); in split incognito mode values set from incognito last only for that session and otherwise follow the regular profile.
  - *Key terms/entities:* `"mime_types_handler"`, `handler_url`, `can_embed`, `mimeHandler.getStreamInfo()`, `mimeHandler.abortAndFallbackToNativeHandler()`, `mimeHandler.getMimeHandlerOptions()`, `mimeHandler.setMimeHandlerOptions()`, `StreamInfo.streamUrl`, `StreamInfo.originalUrl`, `StreamInfo.embedded`, `MimeHandlerOptions.enabled`, `MimeHandlerOptions.canEmbed`, `application/pdf`, Chrome 151+

### [chrome.platformKeys](https://developer.chrome.com/docs/extensions/reference/api/platformKeys)

**Overview:** Uses platform-managed client certificates in a custom authentication protocol — filter/select certificates, obtain their key pairs for `platformKeys.subtleCrypto` signing, and verify TLS server certificate chains (e.g. for third-party VPNs). Requires the `platformKeys` permission; **ChromeOS only**; Chrome 45+ (`browser.platformKeys` since Chrome 148).

**Sections:** Description · Permissions (`platformKeys`) · Availability (Chrome 45+; ChromeOS only) · Types (`ClientCertificateRequest`: `certificateAuthorities`, `certificateTypes`; `ClientCertificateType`: `"rsaSign"`, `"ecdsaSign"`; `Match`: `certificate`, `keyAlgorithm`; `SelectDetails`: `clientCerts`, `interactive`, `request`; `VerificationDetails`: `hostname`, `serverCertificateChain`; `VerificationResult`: `debug_errors`, `trusted`) · Methods (`getKeyPair`, `getKeyPairBySpki`, `selectClientCertificates`, `subtleCrypto`, `verifyTLSServerCertificate`). No properties, no events.
- **"Methods"** *(anchor unverified)*: `getKeyPair()` and `getKeyPairBySpki()` (Chrome 85+) are callback-only, return `void`, hand back public/private key objects (private key may be `null`), and support only RSASSA-PKCS1-v1_5 and ECDSA — hash `"none"` applies PKCS#1 v1.5 padding without hashing. `selectClientCertificates()` and `verifyTLSServerCertificate()` resolve promises from Chrome 121 (Chrome 45–120 used callbacks); `subtleCrypto()` returns `object | undefined`.
  - *Key terms/entities:* `platformKeys.selectClientCertificates()`, `platformKeys.getKeyPair()`, `platformKeys.getKeyPairBySpki()`, `platformKeys.subtleCrypto()`, `platformKeys.verifyTLSServerCertificate()`, `SelectDetails.interactive`, `certificateTypes`, `#type-ClientCertificateType`, `#method-selectClientCertificates`, `#method-subtleCrypto`, `debug_errors`, ChromeOS only

### [chrome.printerProvider](https://developer.chrome.com/docs/extensions/reference/api/printerProvider)

**Overview:** Event-only API that lets an extension supply printers to Chrome's print manager: answer requests for the printer list, per-printer capabilities, USB-device info, and submitted print jobs. Requires the `printerProvider` permission; Chrome 44+ (`browser.printerProvider` since Chrome 148).

**Sections:** Description · Permissions (`printerProvider`) · Availability (Chrome 44+) · Types (`PrinterInfo`: `description`, `id`, `name`; `PrintError`: `"OK"`, `"FAILED"`, `"INVALID_TICKET"`, `"INVALID_DATA"`; `PrintJob`: `contentType`, `document`, `printerId`, `ticket`, `title`) · Events (`onGetCapabilityRequested`, `onGetPrintersRequested`, `onGetUsbPrinterInfoRequested`, `onPrintRequested`). No properties, no methods.
- **"Events"** *(anchor unverified)*: every listener receives a `resultCallback` it must invoke — `onGetPrintersRequested` returns `PrinterInfo[]`, `onGetCapabilityRequested` returns CDD capabilities, `onPrintRequested` accepts only `"application/pdf"` / `"image/pwg-raster"` documents and returns a `PrintError`. `onGetUsbPrinterInfoRequested` (Chrome 45+) fires at most once per device; supported devices must also be listed in `onGetPrintersRequested`.
  - *Key terms/entities:* `printerProvider.onGetPrintersRequested`, `printerProvider.onGetCapabilityRequested`, `printerProvider.onPrintRequested`, `printerProvider.onGetUsbPrinterInfoRequested`, `PrinterInfo`, `PrintJob.ticket` (CJT format), `PrintError`, CDD, `#event-onPrintRequested`, `#event-onGetPrintersRequested`

### [chrome.printing](https://developer.chrome.com/docs/extensions/reference/api/printing)

**Overview:** Sends print jobs to printers installed on a Chromebook — list printers, read status/capabilities in CDD form, submit jobs with a Cloud Job Ticket, track job status, and cancel. Requires the `printing` permission; **ChromeOS only**; Chrome 81+ (`browser.printing` since Chrome 148).

**Sections:** Description · Permissions (`printing`) · Availability (Chrome 81+; ChromeOS only) · Examples (`cancelJob()`, `getPrinters()`/`getPrinterInfo()`, `submitJob()`, Roll printing) · Types (`GetPrinterInfoResponse`: `capabilities`, `status`; `JobStatus`: `"PENDING"`, `"IN_PROGRESS"`, `"FAILED"`, `"CANCELED"`, `"PRINTED"`; `Printer`: `description`, `id`, `isDefault`, `name`, `recentlyUsedRank`, `source`, `uri`; `PrinterSource`: `"USER"`, `"POLICY"`; `PrinterStatus`: `"DOOR_OPEN"`, `"TRAY_MISSING"`, `"OUT_OF_INK"`, `"OUT_OF_PAPER"`, `"OUTPUT_FULL"`, `"PAPER_JAM"`, `"GENERIC_ISSUE"`, `"STOPPED"`, `"UNREACHABLE"`, `"EXPIRED_CERTIFICATE"`, `"AVAILABLE"`; `SubmitJobRequest`: `job`; `SubmitJobResponse`: `jobId`, `status`; `SubmitJobStatus`: `"OK"`, `"USER_REJECTED"`) · Properties (`MAX_GET_PRINTER_INFO_CALLS_PER_MINUTE`, `MAX_SUBMIT_JOB_CALLS_PER_MINUTE`) · Methods (`cancelJob`, `getJobStatus`, `getPrinterInfo`, `getPrinters`, `submitJob`) · Events (`onJobStatusChanged`).
- **"Properties" / "Methods"** *(anchor unverified)*: rate limits are 20 `getPrinterInfo()` and 40 `submitJob()` calls per minute. `cancelJob`/`getPrinterInfo`/`getPrinters` return promises from Chrome 100, `submitJob` from Chrome 120; `getJobStatus` is Chrome 135+ and rejects for an unknown `jobId`. `submitJob()` shows a user confirmation dialog unless the extension is in the `PrintingAPIExtensionsAllowlist` policy; tickets accept `"application/pdf"` and `"image/png"` (Chrome 124+ allows any `vendor_ticket_item`). `onJobStatusChanged` fires only for this extension's jobs.
  - *Key terms/entities:* `printing.submitJob()`, `printing.getPrinters()`, `printing.getPrinterInfo()`, `printing.cancelJob()`, `printing.getJobStatus()`, `printing.onJobStatusChanged`, `MAX_SUBMIT_JOB_CALLS_PER_MINUTE`, `SubmitJobRequest.job`, `PrinterStatus`, `JobStatus`, `#method-submitJob`, `#method-getPrinterInfo`, `#type-GetPrinterInfoResponse`, `PrintingAPIExtensionsAllowlist`, ChromeOS only

### [chrome.printingMetrics](https://developer.chrome.com/docs/extensions/reference/api/printingMetrics)

**Overview:** Reports printing usage — the finished print jobs with their settings, printer, page count, and final status. Requires the `printingMetrics` permission and enterprise policy (**Requires policy**); **ChromeOS only**; Chrome 79+ (`browser.printingMetrics` since Chrome 148).

**Sections:** Description · Permissions (`printingMetrics`) · Availability (Chrome 79+; ChromeOS only; Requires policy) · Types (`ColorMode`: `"BLACK_AND_WHITE"`, `"COLOR"`; `DuplexMode`: `"ONE_SIDED"`, `"TWO_SIDED_LONG_EDGE"`, `"TWO_SIDED_SHORT_EDGE"`; `MediaSize`: `height`, `vendorId`, `width`; `Printer`: `name`, `source`, `uri`; `PrinterSource`: `"USER"`, `"POLICY"`; `PrintJobInfo`: `completionTime`, `creationTime`, `id`, `numberOfPages`, `printer`, `printer_status`, `settings`, `source`, `sourceId`, `status`, `title`; `PrintJobSource`: `"PRINT_PREVIEW"`, `"ANDROID_APP"`, `"EXTENSION"`, `"ISOLATED_WEB_APP"`; `PrintJobStatus`: `"FAILED"`, `"CANCELED"`, `"PRINTED"`; `PrintSettings`: `color`, `copies`, `duplex`, `mediaSize`) · Methods (`getPrintJobs`) · Events (`onPrintJobFinished`). No properties.
- **"Methods" / "Events"** *(anchor unverified)*: `getPrintJobs()` returns `Promise<PrintJobInfo[]>` (promise Chrome 96+) for finished jobs only; `onPrintJobFinished` fires for every terminal status (`FAILED`, `CANCELED`, `PRINTED`). `PrintJobInfo.printer_status` is Chrome 85+ and reuses `printing.PrinterStatus`; `sourceId` is null for `PRINT_PREVIEW` and `ANDROID_APP`; times are ms past the Unix epoch.
  - *Key terms/entities:* `printingMetrics.getPrintJobs()`, `printingMetrics.onPrintJobFinished`, `PrintJobInfo`, `PrintSettings`, `PrintJobSource.EXTENSION`, `PrintJobStatus.PRINTED`, `MediaSize.vendorId`, `#type-PrintJobInfo`, `#method-getPrintJobs`, Requires policy, ChromeOS only

### [chrome.privacy](https://developer.chrome.com/docs/extensions/reference/api/privacy)

**Overview:** Reads and overrides Chrome's privacy-affecting settings — network prediction, WebRTC IP handling, Google service usage, and what Chrome exposes to websites. Every member is a `types.ChromeSetting`, so values are read/written with `get()`/`set()`/`clear()` plus `onChange`. Requires the `privacy` permission.

**Sections:** Description · Permissions (`privacy`) · Concepts and usage · Examples · Types (`AutofillBlockedType`: `"contact_info"`, `"payments"`, `"identity_docs"`, `"travel"`, `"all"`; `IPHandlingPolicy`: `"default"`, `"default_public_and_private_interfaces"`, `"default_public_interface_only"`, `"disable_non_proxied_udp"`) · Properties (`network`, `services`, `websites`). No methods, no events.
- **"Concepts and usage"** *(anchor unverified)*: `get()` returns the value plus `levelOfControl` — `"not_controllable"` (locked by enterprise policy) or `"controlled_by_other_extensions"` means `set()` succeeds but the value is immediately overridden, so check `controllable_by_this_extension` first and warn the user; `onChange` details carry `value`, `levelOfControl`, `incognitoSpecific`.
- **"Properties"** *(anchor unverified)*: `network` = `networkPredictionEnabled`, `webRTCIPHandlingPolicy` (Chrome 48+). `services` = `alternateErrorPagesEnabled`, `autofillAddressEnabled` (70+), `autofillCreditCardEnabled` (70+), `autofillEnabled` (**deprecated Chrome 70**), `passwordSavingEnabled`, `safeBrowsingEnabled`, `safeBrowsingExtendedReportingEnabled`, `searchSuggestEnabled`, `spellingServiceEnabled`, `translationServiceEnabled`. `websites` = `adMeasurementEnabled` (111+), `doNotTrackEnabled` (65+), `fledgeEnabled` (111+), `hyperlinkAuditingEnabled`, `protectedContentEnabled` (**Windows and ChromeOS only**), `referrersEnabled`, `thirdPartyCookiesAllowed` (cannot be enabled in incognito), `topicsEnabled` (111+); Privacy Sandbox flags may only be set to `false` and throw on `true`.
  - *Key terms/entities:* `privacy.services.autofillCreditCardEnabled`, `privacy.websites.thirdPartyCookiesAllowed`, `privacy.network.webRTCIPHandlingPolicy`, `types.ChromeSetting`, `levelOfControl`, `controllable_by_this_extension`, `incognitoSpecific`, `#type-ChromeSetting`, `#type-IPHandlingPolicy`, `"privacy"`

### [chrome.processes](https://developer.chrome.com/docs/extensions/reference/api/processes)

**Overview:** Inspects and controls the browser's processes like the Task Manager — map a tab to its renderer, read per-process CPU/memory/cache/network data, and terminate a renderer. Requires the `processes` permission; **Dev channel only** (no Chrome minimum listed; no `browser.*` note on the page).

**Sections:** Description · Permissions (`processes`) · Availability (Dev channel) · Types (`Cache`: `liveSize`, `size`; `Process`: `cpu`, `cssCache`, `id`, `imageCache`, `jsMemoryAllocated`, `jsMemoryUsed`, `naclDebugPort`, `network`, `osProcessId`, `privateMemory`, `profile`, `scriptCache`, `sqliteMemory`, `tasks`, `type`; `ProcessType`: `"browser"`, `"renderer"`, `"extension"`, `"notification"`, `"plugin"`, `"worker"`, `"nacl"`, `"service_worker"`, `"utility"`, `"gpu"`, `"other"`; `TaskInfo`: `tabId`, `title`) · Methods (`getProcessIdForTab`, `getProcessInfo`, `terminate`) · Events (`onCreated`, `onExited`, `onUnresponsive`, `onUpdated`, `onUpdatedWithMemory`). No properties.
- **"Methods" / "Events"** *(anchor unverified)*: `getProcessInfo(processIds, includeMemory)` accepts one ID or an array (empty = all) and warns that memory collection costs extra CPU; `privateMemory` only appears with `includeMemory` or in `onUpdatedWithMemory`. CPU is a percentage of one core (may exceed 100), and `cpu`/cache fields only arrive via `onUpdated`/`onUpdatedWithMemory`. `terminate()` is about:crash without changing the tab URL; `ProcessType` `"worker"` and `"service_worker"` are obsolete and never returned.
  - *Key terms/entities:* `processes.getProcessInfo()`, `processes.getProcessIdForTab()`, `processes.terminate()`, `processes.onUpdated`, `processes.onUpdatedWithMemory`, `Process.cpu`, `Process.privateMemory`, `ProcessType`, `#type-Process`, `#type-ProcessType`, Dev channel only

### [chrome.proxy](https://developer.chrome.com/docs/extensions/reference/api/proxy)

**Overview:** Manages Chrome's proxy configuration through the single `settings` `types.ChromeSetting`, whose value is a `ProxyConfig`. Requires the `proxy` permission, which can never be optional (`permissions.request()` cannot grant it).

**Sections:** Description · Permissions (`proxy`) · Concepts and usage (Proxy modes, Proxy rules, Proxy server objects, Bypass list) · Examples · Types (`Mode`: `"direct"`, `"auto_detect"`, `"pac_script"`, `"fixed_servers"`, `"system"`; `PacScript`: `data`, `mandatory`, `url`; `ProxyConfig`: `mode`, `pacScript`, `rules`; `ProxyRules`: `bypassList`, `fallbackProxy`, `proxyForFtp`, `proxyForHttp`, `proxyForHttps`, `singleProxy`; `ProxyServer`: `host`, `port`, `scheme`; `Scheme`: `"http"`, `"https"`, `"quic"`, `"socks4"`, `"socks5"`) · Properties (`settings`) · Events (`onProxyError`). No methods.
- **"Proxy modes"** / **"Proxy rules"** *(anchors unverified)*: `mode` is `direct`, `auto_detect` (`http://wpad/wpad.dat`), `pac_script`, `fixed_servers`, or `system`; `rules` takes `singleProxy` XOR a subset of `proxyForHttp`/`proxyForHttps`/`proxyForFtp` plus `fallbackProxy`. Bypass entries are `[SCHEME://]HOST_PATTERN[:PORT]`, IP literals, `IP_LITERAL/PREFIX_LENGTH` CIDR, or `<local>`; default ports are http 80, https 443, socks4/socks5 1080.
- **"Events"** *(anchor unverified)*: `onProxyError` reports `details`, `error`, and `fatal` — non-fatal errors fall back to a direct connection; a `get()` callback value adds `rules.proxyForHttp.port` that `set()` did not supply.
  - *Key terms/entities:* `proxy.settings`, `ProxyConfig.mode`, `ProxyRules.bypassList`, `ProxyServer.host`, `PacScript.data`, `proxy.onProxyError`, `types.ChromeSetting`, `#type-ProxyConfig`, `#type-ProxyRules`, `#type-PacScript`, `#type-ProxyServer`, `http://wpad/wpad.dat`, `"proxy"`

### [chrome.publicSuffix](https://developer.chrome.com/docs/extensions/reference/api/publicSuffix)

**Overview:** Queries the browser's Public Suffix List — the registrable domain of a hostname, its known public suffix, or whether a hostname *is* a public suffix. Requires the `publicSuffix` permission; **Chrome 153+**; all three methods are synchronous (no promises, no `browser.*` note).

**Sections:** Description · Permissions (`publicSuffix`) · Availability (Chrome 153+) · Types (`DomainEncoding`: `"punycode"`, `"display"`; `DomainOptions`: `allowIPAddress`, `allowPlainSuffix`, `allowUnknownSuffix`, `encoding`) · Methods (`getDomain`, `getKnownSuffix`, `isKnownSuffix`). No properties, no events.
- **"Methods"** *(anchor unverified)*: `getDomain(hostname, options?)` returns `string | undefined` and accepts `DomainOptions`, whose flags all default to `false`; `encoding` defaults to `"punycode"` — pass `"display"` for user-facing Unicode, except for confusable domains where punycode still wins. `allowIPAddress` returns IPs without a PSL lookup; `allowUnknownSuffix` treats unknown TLDs (e.g. `printer.internal-network`) as suffixes. `getKnownSuffix()` returns `string | undefined`; `isKnownSuffix()` returns `boolean`.
  - *Key terms/entities:* `publicSuffix.getDomain()`, `publicSuffix.getKnownSuffix()`, `publicSuffix.isKnownSuffix()`, `DomainOptions.allowPlainSuffix`, `DomainEncoding.display`, `punycode`, `#type-DomainOptions`, `#method-getDomain`, Public Suffix List, Chrome 153+

### [chrome.system.cpu](https://developer.chrome.com/docs/extensions/reference/api/system/cpu)

**Overview:** Queries CPU metadata — architecture, model, logical-processor count, feature codes, per-processor cumulative time, and (ChromeOS only) thermal-zone temperatures — with the single method `getInfo()`. Requires the `system.cpu` permission; no Availability section beyond promise support in Chrome 91+ (`browser.system.cpu` since Chrome 148).

**Sections:** Description · Permissions (`system.cpu`) · Types (`CpuInfo`: `archName`, `features`, `modelName`, `numOfProcessors`, `processors`, `temperatures`; `CpuTime`: `idle`, `kernel`, `total`, `user`; `ProcessorInfo`: `usage`) · Methods (`getInfo`). No properties, no events.
- **"Types"** *(anchor unverified)*: `features` carries codes `"mmx"`, `"sse"`, `"sse2"`, `"sse3"`, `"ssse3"`, `"sse4_1"`, `"sse4_2"`, `"avx"`; `CpuTime.total` equals `user + kernel + idle` and is cumulative, so callers diff two samples for utilization. `temperatures` (Chrome 60+) is **ChromeOS only** and reports degrees Celsius per thermal zone.
  - *Key terms/entities:* `system.cpu.getInfo()`, `CpuInfo.temperatures`, `CpuInfo.numOfProcessors`, `CpuTime.total`, `ProcessorInfo.usage`, `"system.cpu"`, `#type-CpuInfo`, `#type-CpuTime`, ChromeOS only

### [chrome.system.display](https://developer.chrome.com/docs/extensions/reference/api/system/display)

**Overview:** Queries and configures displays — bounds, work area, DPI, rotation, zoom, modes, mirroring, unified desktop, overscan, and touch calibration — and notifies on configuration changes. Requires the `system.display` permission; every mutating/calibration method and `edid` are marked "**only available to ChromeOS Kiosk apps**".

**Sections:** Description · Permissions (`system.display`) · Types (`ActiveState`: `"active"`, `"inactive"`; `Bounds`: `height`, `left`, `top`, `width`; `DisplayLayout`: `id`, `offset`, `parentId`, `position`; `DisplayMode`: `deviceScaleFactor`, `height`, `heightInNativePixels`, `isInterlaced`, `isNative`, `isSelected`, `refreshRate`, `uiScale` (deprecated), `width`, `widthInNativePixels`; `DisplayProperties`: `boundsOriginX`, `boundsOriginY`, `displayMode`, `displayZoomFactor`, `isPrimary`, `isUnified`, `mirroringSourceId` (deprecated), `overscan`, `rotation`; `DisplayUnitInfo`: `activeState`, `availableDisplayZoomFactors`, `bounds`, `displayZoomFactor`, `dpiX`, `dpiY`, `edid`, `hasTouchSupport`, `id`, `isEnabled`, `isPrimary`, `isUnified`, `mirroringDestinationIds`, `mirroringSourceId`, `modes`, `name`, `overscan`, `rotation`, `workArea`; `Edid`: `manufacturerId`, `productId`, `yearOfManufacture`; `GetInfoFlags`: `singleUnified`; `Insets`: `bottom`, `left`, `right`, `top`; `LayoutPosition`: `"top"`, `"right"`, `"bottom"`, `"left"`; `MirrorMode`: `"off"`, `"normal"`, `"mixed"`; `MirrorModeInfo`: `mirroringDestinationIds`, `mirroringSourceId`, `mode`; `Point`: `x`, `y`; `TouchCalibrationPair`: `displayPoint`, `touchPoint`; `TouchCalibrationPairQuad`: `pair1`, `pair2`, `pair3`, `pair4`) · Methods (`clearTouchCalibration`, `completeCustomTouchCalibration`, `enableUnifiedDesktop`, `getDisplayLayout`, `getInfo`, `overscanCalibrationAdjust`, `overscanCalibrationComplete`, `overscanCalibrationReset`, `overscanCalibrationStart`, `setDisplayLayout`, `setDisplayProperties`, `setMirrorMode`, `showNativeTouchCalibration`, `startCustomTouchCalibration`) · Events (`onDisplayChanged`). No properties.
- **"Methods"** *(anchor unverified)*: only `getInfo(flags?)` and `setDisplayProperties(id, info)` avoid the kiosk-app note; `getInfo` resolves `DisplayUnitInfo[]` (promise Chrome 91+) and `GetInfoFlags.singleUnified` collapses unified-desktop output. `modes`, `overscan`, `rotation`, `isUnified`, and the mirroring fields are ChromeOS-only. `setDisplayProperties` sets `runtime.lastError` on failure; `setMirrorMode()` resets state on each call and makes `setDisplayProperties()` fail for mirroring destinations; `boundsOriginX`/`boundsOriginY` are ignored on the primary display.
  - *Key terms/entities:* `system.display.getInfo()`, `system.display.setDisplayProperties()`, `system.display.setMirrorMode()`, `system.display.enableUnifiedDesktop()`, `system.display.onDisplayChanged`, `DisplayUnitInfo.workArea`, `DisplayProperties.rotation`, `MirrorModeInfo`, `#type-DisplayUnitInfo`, `#method-getInfo`, `#property-DisplayProperties-boundsOriginY`, `runtime.lastError`, ChromeOS Kiosk apps

### [chrome.system.memory](https://developer.chrome.com/docs/extensions/reference/api/system/memory)

**Overview:** Reports physical memory via a single method, `getInfo()`, which resolves total and available capacity in bytes. Requires the `system.memory` permission; no Availability section beyond promise support in Chrome 91+ (`browser.system.memory` since Chrome 148).

**Sections:** Description (one line) · Permissions (`system.memory`) · Types (`MemoryInfo`: `availableCapacity`, `capacity`) · Methods (`getInfo`). No properties, no events.
- **"Methods"** *(anchor unverified)*: `system.memory.getInfo()` returns `Promise<MemoryInfo>`; `capacity` is total physical RAM and `availableCapacity` the free portion, both in bytes; no per-process or usage-ratio fields are exposed.
  - *Key terms/entities:* `system.memory.getInfo()`, `MemoryInfo.capacity`, `MemoryInfo.availableCapacity`, `"system.memory"`, `#type-MemoryInfo`, `#method-getInfo`

### [chrome.system.storage](https://developer.chrome.com/docs/extensions/reference/api/system/storage)

**Overview:** Queries storage devices — total/available capacity and media type — and notifies when removable media is attached or detached; `ejectDevice()` unmounts a removable unit. Requires the `system.storage` permission; no ChromeOS-only banner observed on this page (unlike `printing`/`platformKeys`); `getAvailableCapacity()` is **Dev channel**.

**Sections:** Description · Permissions (`system.storage`) · Types (`EjectDeviceResultCode`: `"success"`, `"in_use"`, `"no_such_device"`, `"failure"`; `StorageAvailableCapacityInfo`: `availableCapacity`, `id`; `StorageUnitInfo`: `capacity`, `id`, `name`, `type`; `StorageUnitType`: `"fixed"`, `"removable"`, `"unknown"`) · Methods (`ejectDevice`, `getAvailableCapacity`, `getInfo`) · Events (`onAttached`, `onDetached`). No properties.
- **"Methods" / "Events"** *(anchor unverified)*: `getInfo()` resolves `StorageUnitInfo[]` and `ejectDevice()` an `EjectDeviceResultCode` (both promise form Chrome 91+); `getAvailableCapacity(id)` is Dev channel only and echoes the caller's `id`. `StorageUnitInfo.id` is transient — stable within one app run, not across runs or applications. `onAttached` passes a `StorageUnitInfo`, `onDetached` only the `id`.
  - *Key terms/entities:* `system.storage.getInfo()`, `system.storage.ejectDevice()`, `system.storage.getAvailableCapacity()`, `system.storage.onAttached`, `system.storage.onDetached`, `StorageUnitType.removable`, `EjectDeviceResultCode.in_use`, `"system.storage"`, `#type-StorageUnitInfo`, `#type-EjectDeviceResultCode`, Dev channel

### [chrome.systemLog](https://developer.chrome.com/docs/extensions/reference/api/systemLog)

**Overview:** Writes a message into Chrome's system log from an extension — one method, `add({ message })`. Requires the `systemLog` permission and enterprise policy (**Requires policy**); **ChromeOS only**; Chrome 125+ (`browser.systemLog` since Chrome 148).

**Sections:** Description · Permissions (`systemLog`) · Availability (Chrome 125+; ChromeOS only; Requires policy) · Types (`MessageOptions`: `message`) · Methods (`add`). No properties, no events.
- **"Methods"** *(anchor unverified)*: `systemLog.add(options)` accepts a `MessageOptions` whose only field is `message` and resolves `Promise<void>` once the record is written; there is no read, filter, or clear API — reading the log is a system/diagnostics task.
  - *Key terms/entities:* `systemLog.add()`, `MessageOptions.message`, `"systemLog"`, `#type-MessageOptions`, `#method-add`, Requires policy, ChromeOS only, Chrome 125+

### [chrome.tts](https://developer.chrome.com/docs/extensions/reference/api/tts)

**Overview:** Plays synthesized text-to-speech through the OS engine (SAPI 5 on Windows, macOS, ChromeOS) or an installed speech-engine extension — speak, enqueue, pause/resume, stop, enumerate voices, and receive per-utterance events. Requires the `tts` permission; no Availability section (promise forms Chrome 101+; `browser.tts` since Chrome 148).

**Sections:** Description · Permissions (`tts`) · Concepts and usage (Generate speech, Listen to events, SSML markup, Choose a voice) · Types (`EventType`: `"start"`, `"end"`, `"word"`, `"sentence"`, `"marker"`, `"interrupted"`, `"cancelled"`, `"error"`, `"pause"`, `"resume"`; `TtsEvent`: `charIndex`, `errorMessage`, `length`, `type`; `TtsOptions`: `desiredEventTypes`, `enqueue`, `extensionId`, `gender` (deprecated), `lang`, `pitch`, `rate`, `requiredEventTypes`, `voiceName`, `volume`, `onEvent`; `TtsVoice`: `eventTypes`, `extensionId`, `gender` (deprecated), `lang`, `remote`, `voiceName`; `VoiceGender`: `"male"`, `"female"` — deprecated) · Methods (`getVoices`, `isSpeaking`, `pause`, `resume`, `speak`, `stop`) · Events (`onVoicesChanged`).
- **"Generate speech"** *(anchor unverified)*: `speak(utterance, options?, callback?)` caps text at 32,768 characters; each call interrupts current speech unless `enqueue: true`; `rate` must be 0.1–10.0, `pitch` 0–2, `volume` 0–1; `'end'`, `'interrupted'`, `'cancelled'`, and `'error'` are final events. SSML must be a complete document with an XML header and top-level `<speak>`; `isSpeaking()` is true on macOS whenever the system engine speaks.
  - *Key terms/entities:* `tts.speak()`, `tts.stop()`, `tts.pause()`, `tts.resume()`, `tts.getVoices()`, `tts.isSpeaking()`, `tts.onVoicesChanged` (Chrome 124+), `TtsOptions.enqueue`, `requiredEventTypes`, `TtsEvent.charIndex`, `runtime.lastError`, `#method-speak`, `#type-TtsOptions`, `#type-TtsEvent`, SSML

### [chrome.ttsEngine](https://developer.chrome.com/docs/extensions/reference/api/ttsEngine)

**Overview:** Implements a text-to-speech engine in an extension: intercept `tts.speak()`/`tts.stop()`, synthesize speech with any web technology, stream audio back to Chrome, and manage installed languages. Requires the `ttsEngine` permission plus the manifest `"tts_engine"` key declaring `voices` (`voice_name` required, `lang` and `event_types` recommended).

**Sections:** Description · Permissions (`ttsEngine`) · Concepts and usage (Handle speech events) · Types (`AudioBuffer`: `audioBuffer`, `charIndex`, `isLastBuffer`; `AudioStreamOptions`: `bufferSize`, `sampleRate`; `LanguageInstallStatus`: `"notInstalled"`, `"installing"`, `"installed"`, `"failed"`; `LanguageStatus`: `error`, `installStatus`, `lang`; `LanguageUninstallOptions`: `uninstallImmediately`; `SpeakOptions`: `gender` (deprecated), `lang`, `pitch`, `rate`, `voiceName`, `volume`; `TtsClient`: `id`, `source`; `TtsClientSource`: `"chromefeature"`, `"extension"`; `VoiceGender`: `"male"`, `"female"` — deprecated) · Methods (`updateLanguage`, `updateVoices`) · Events (`onInstallLanguageRequest`, `onLanguageStatusRequest`, `onPause`, `onResume`, `onSpeak`, `onSpeakWithAudioStream`, `onStop`, `onUninstallLanguageRequest`). No properties.
- **"Handle speech events"** *(anchor unverified)*: an engine must register **both** `onSpeak` and `onStop` or it intercepts nothing, and routing is decided solely by manifest voice parameters plus those listeners — no dynamic accept/reject. Supporting `'end'` is essential (otherwise Chrome cannot queue utterances); `'interrupted'` and `'cancelled'` come from Chrome, not the engine. `onSpeakWithAudioStream` (Chrome 92+) lets Chrome play audio and dispatch events; `updateVoices` (Chrome 66+) replaces manifest voices, `updateLanguage` (Chrome 132+) reports language installs.
  - *Key terms/entities:* `ttsEngine.onSpeak`, `ttsEngine.onStop`, `ttsEngine.onSpeakWithAudioStream`, `ttsEngine.onPause`, `ttsEngine.onResume`, `ttsEngine.onInstallLanguageRequest`, `ttsEngine.onLanguageStatusRequest`, `ttsEngine.onUninstallLanguageRequest`, `ttsEngine.updateVoices()`, `ttsEngine.updateLanguage()`, `"tts_engine"`, `voice_name`, `event_types`, `SpeakOptions`, `AudioStreamOptions`, `#type-SpeakOptions`, `#event-onSpeak`

### [chrome.vpnProvider](https://developer.chrome.com/docs/extensions/reference/api/vpnProvider)

**Overview:** Implements a third-party VPN client on ChromeOS: create/destroy persistent VPN configurations, take ownership of a VPN session, set tunnel parameters, and pump IP packets in both directions. Requires the `vpnProvider` permission; **ChromeOS only**; Chrome 43+ (`browser.vpnProvider` since Chrome 148).

**Sections:** Description · Permissions (`vpnProvider`) · Availability (Chrome 43+; ChromeOS only) · Concepts and usage · Types (`Parameters`: `address`, `broadcastAddress`, `dnsServers`, `domainSearch`, `exclusionList`, `inclusionList`, `mtu`, `reconnect`; `PlatformMessage`: `"connected"`, `"disconnected"`, `"error"`, `"linkDown"`, `"linkUp"`, `"linkChanged"`, `"suspend"`, `"resume"`; `UIEvent`: `"showAddDialog"`, `"showConfigureDialog"`; `VpnConnectionState`: `"connected"`, `"failure"`) · Methods (`createConfig`, `destroyConfig`, `notifyConnectionStateChanged`, `sendPacket`, `setParameters`) · Events (`onConfigCreated`, `onConfigRemoved`, `onPacketReceived`, `onPlatformMessage`, `onUIEvent`). No properties.
- **"Concepts and usage"** *(anchor unverified)*: session ownership is defined by the window between the `"connected"` and `"disconnected"` `onPlatformMessage` values — `setParameters()`, `sendPacket()`, and `notifyConnectionStateChanged()` succeed only while the extension owns the session. `setParameters()` must be called immediately after `"connected"`. `inclusionList` defaults to no traffic; `"0.0.0.0/0"` routes everything, and longest-prefix match wins across `exclusionList` + `inclusionList`. IPv4 only; default MTU 1500.
  - *Key terms/entities:* `vpnProvider.createConfig()`, `vpnProvider.setParameters()`, `vpnProvider.notifyConnectionStateChanged()`, `vpnProvider.sendPacket()`, `vpnProvider.destroyConfig()`, `vpnProvider.onPlatformMessage`, `vpnProvider.onPacketReceived`, `vpnProvider.onConfigRemoved`, `vpnProvider.onUIEvent`, `Parameters.reconnect` (Chrome 51+), `inclusionList`, `#method-createConfig`, `#event-onPlatformMessage`, `#type-Parameters`, ChromeOS only

### [chrome.wallpaper](https://developer.chrome.com/docs/extensions/reference/api/wallpaper)

**Overview:** Changes the ChromeOS wallpaper — sets a jpeg/png image from a URL, an `ArrayBuffer`, or a relative path under a chosen layout, optionally generating a 128x60 thumbnail. Requires the `wallpaper` permission; **ChromeOS only**; Chrome 43+ (`browser.wallpaper` since Chrome 148).

**Sections:** Description · Permissions (`wallpaper`) · Availability (Chrome 43+; ChromeOS only) · Examples · Types (`WallpaperLayout`: `"STRETCH"`, `"CENTER"`, `"CENTER_CROPPED"`) · Methods (`setWallpaper`). No properties, no events.
- **"Methods"** *(anchor unverified)*: `setWallpaper(details)` is the whole surface — `details` takes `filename` (required), `layout` (`WallpaperLayout`), `url` (may be relative), `data`, and `thumbnail`; supply `url` **or** `data`. It resolves `Promise<ArrayBuffer | undefined>` (promise Chrome 96+). Thumbnail layout/ratio are not supported yet, and `WallpaperLayout` only arrived in Chrome 44.
  - *Key terms/entities:* `wallpaper.setWallpaper()`, `WallpaperLayout.CENTER_CROPPED`, `details.data`, `details.url`, `details.filename`, `details.thumbnail`, `"wallpaper"`, `#type-WallpaperLayout`, `#method-setWallpaper`, ChromeOS only

---

## 9. Samples, AI & Release Notes

### [Samples](https://developer.chrome.com/docs/extensions/samples)

**Overview:** Gallery hub pointing at the `GoogleChrome/chrome-extensions-samples` repository — runnable demos to learn how extensions work or to use as starting points. The page itself is a hero image plus a short description, followed by a machine-generated index of every API member and every permission the samples demonstrate.

**Sections:**
- **"Samples"** *(H3; no H2 headings observed — anchor unverified)*: States the samples live in the GitHub repo and are grouped by the API namespace they exercise (action, alarms, bookmarks, browsingData, commands, contextMenus, cookies, debugger, declarativeNetRequest, devtools, fontSettings, history, i18n, identity, idle, management, notifications, offscreen, omnibox, permissions, power, printing, privacy, readingList, runtime, scripting, sidePanel, storage, tabCapture, tabGroups, tabs, topSites, userScripts, webNavigation, webRequest, windows).
  - **API/method index:** member-level names such as `action.setBadgeText`, `action.openPopup`, `alarms.create`, `declarativeNetRequest.updateDynamicRules`, `devtools.panels.create`, `offscreen.createDocument`, `scripting.registerContentScripts`, `sidePanel.setPanelBehavior`, `tabCapture.getMediaStreamId`, `tabs.group`, `userScripts.register`, `webRequest.onAuthRequired`, `runtime.getContexts`, `permissions.addHostAccessRequest`.
  - **Permission tags:** `activeTab`, `clipboardWrite`, `declarativeNetRequestWithHostAccess`, `declarativeNetRequestFeedback`, `nativeMessaging`, `offscreen`, `scripting`, `sidePanel`, `userScripts`, `webRequestAuthProvider`.
  - *Key terms/entities:* `chrome-extensions-samples`, API samples, `action`, `scripting`, `tabs`, `declarativeNetRequest`, `offscreen`, `sidePanel`, `userScripts`, `webRequestAuthProvider`, permission tags

### [Extensions and AI](https://developer.chrome.com/docs/extensions/ai)

**Overview:** Hub for both directions of AI work in extensions — building extensions with AI coding tools, and shipping AI-powered extensions. It routes to the [build-with-AI workflow](https://developer.chrome.com/docs/extensions/ai/build-with-ai), the built-in Prompt/Writer/Rewriter/Translator/Summarizer APIs, Gemini samples, WebMCP for agents, and the Early Preview Program.

**Sections:**
- **"Build extensions with AI coding tools"** *(H3)*: Points to the build-with-AI guide; installs the skill with `npx skills add GoogleChrome/modern-web-guidance --skill chrome-extensions`.
- **"Enhance browsing with AI-powered extensions"** *(H3)*: Three angles — control web content (create/comprehend page content), make the browser more helpful (bookmarks, new tab, history re-discovery), customize the browser (side panel, action, context menus).
- **"Integrate AI with extensions"**: Contrasts client-side AI (purpose-built models, lower latency, offline, data stays local) with Cloud AI (Gemini ecosystem, scale, regularly updated hardware/software).
- **"Agentic AI and extensions"**: WebMCP, a proposed standard that exposes structured tools to AI agents, plus agent security guidance.
- **"Built-in AI APIs"**: Card grid for `Prompt API`, `Writer API` (conform to a writing task), `Rewriter API` (lengthen/shorten/tone), `Translator API`, `Language Detector API`, `Summarizer API` (types, lengths, formats), `Proofreader API`.
- **"AI-powered extensions in action"**: Three `chrome-extensions-samples` demos: Gemini Cloud API chat, Prompt API chat with Gemini Nano, and Summarizer API tab summarization.
- **"Origin trials and Early Preview Program"**: Origin-trial signup, the I/O 2025 API announcements, LoRA-fine-tuned Gemini Nano summaries, and `join-epp` for in-progress APIs.
- **"Best practices"**: Download larger client-side models after install and manage their lifecycle independently (models are not remotely hosted code); never ship API keys in the package — ask users for a key, proxy calls through your server, or fetch the key server-side; disclose cloud/shared user input in the privacy policy.
  - *Key terms/entities:* `npx skills add GoogleChrome/modern-web-guidance --skill chrome-extensions`, `Prompt API`, `Writer API`, `Rewriter API`, `Translator API`, `Summarizer API`, `Proofreader API`, `WebMCP`, Gemini Nano, LoRA, Early Preview Program, origin trial, remotely hosted code

### [Build extensions with AI coding tools](https://developer.chrome.com/docs/extensions/ai/build-with-ai)

**Overview:** Setup guide for giving AI coding agents (Antigravity, Gemini CLI, Claude Code, Codex) extension-specific context: the `chrome-extensions` skill from Modern Web Guidance, plus Chrome DevTools for agents as the debugging loop. Covers CLI/IDE/MCP installation, a `CHROMEWEBSTORE.md` metadata convention, and prompts for store submission.

**Sections:**
- **"Setup"**: Two installs — the skills pack and the DevTools MCP server.
  - **"Modern Web Guidance"**: Recommended CLI: `npx modern-web-guidance@latest install --choose` (interactive wizard; pick your agent and both `chrome-extensions` and `modern-web-guidance`, kept up to date automatically). Antigravity: pick the **Modern Web Guidance** plugin at install or add it via **Customizations > Build With Google Plugins**.
  - **"Chrome DevTools for coding agents"**: Add as plugin, extension, or MCP server. MCP config uses `npx chrome-devtools-mcp@latest` with `--categoryExtensions` (enables extension tools) and `--autoConnect` (attaches to your default profile, needed for built-in AI APIs and Google Sign-in); enable `chrome://inspect/#remote-debugging` → **Allow remote debugging for this browser instance**, then restart the IDE. Claude Code: `claude mcp add chrome-devtools --scope project -- npx chrome-devtools-mcp@latest --categoryExtensions --autoConnect`.
  - **"CHROMEWEBSTORE.md agent instructions"**: The skill writes and maintains `CHROMEWEBSTORE.md`, holding a justification per requested permission; add a system-instruction snippet (e.g. `~/.claude/CLAUDE.md`) so it updates on every change.
- **"Build and test your extension with coding agents"**: The skill supplies API knowledge newer than the model's training data, team best practices, and submission readiness; the DevTools MCP server can install/uninstall and reload extensions, list them, trigger actions, and inspect the popup, side panel, and service worker. Example prompt: build a "Quick notes" extension and test it in the browser.
- **"Prompt examples to streamline distribution with CHROMEWEBSTORE.md"**: Prompts for first-time publishing, adding permission justifications after widening `manifest.json` (store enforces single purpose), and repairing a store rejection through the compliance metadata.
- **"Conclusion"**: Ship faster and remain submission-ready by combining skills with DevTools for agents.
  - *Key terms/entities:* `npx modern-web-guidance@latest install --choose`, `npx chrome-devtools-mcp@latest`, `--categoryExtensions`, `--autoConnect`, `chrome://inspect/#remote-debugging`, `claude mcp add chrome-devtools`, `CHROMEWEBSTORE.md`, Modern Web Guidance, Chrome DevTools MCP, Antigravity, `sidePanel`, `storage`

### [What's new](https://developer.chrome.com/docs/extensions/whats-new)

**Overview:** Reverse-chronological release-notes feed for Chrome extensions — per-Chrome-version API launches, documentation additions, Chrome Web Store product/policy changes, and videos — running from the current milestone back to Manifest V3 general availability in Chrome 88. Entries are dated posts (`Posted on <date>`) headed by milestone names; it is the changelog of record, not a stable section index, so search by Chrome version or API name.

**Sections:**
- **"Chrome 153: New browser.publicSuffix API"** (Aug 25, 2026): `browser.publicSuffix` queries the public suffix of a URL.
- **"Chrome 153: Default pinning for extensions"** (Aug 3, 2026): experiment pinning an extension's action icon to the top-level toolbar by default, live for some Canary users.
- **"Chrome 150: Tab strip context menus"**: `chrome.contextMenus` supports the `"tab"` context so items appear in the tab-strip right-click menu and receive every selected tab.
- **"Chrome 150: Alarm name length limit"**: `chrome.alarms.create()` enforces a 1024-byte limit on alarm names; longer names throw a `TypeError`.
- **"Chrome 149: Synchronous UserScript validation"** / **"Chrome 149: DevTools API promise support"**: `userScripts.execute()` validates script syntax synchronously and returns diagnostics; `devtools.inspectedWindow.eval()`, `inspectedWindow.getResources()`, and `network.getHAR()` return promises.
- **"Chrome 148: The browser namespace"**: every extension API is also exposed as `browser.*`.
- **"Blog post: …" / "Video: …" entries**: interleaved store and policy announcements (publisher roles in the Developer Dashboard, a new appeals process, external-organization publishing, structured-clone messaging opt-in from Chrome 148) plus YouTube explainers.
- **Older milestones still worth searching**: side panel (Chrome 114), offscreen documents (109), `userScripts.execute()` (135), `storage.session` and `optional_host_permissions` (102), `declarativeNetRequest` static-ruleset limit increases, `match_origin_as_fallback` (99), MV3 general availability (88).
  - *Key terms/entities:* `browser.publicSuffix`, `contextMenus` `"tab"` context, `chrome.alarms.create()`, `TypeError`, 1024-byte limit, `userScripts.execute()`, `devtools.inspectedWindow.eval()`, `network.getHAR()`, `browser` namespace, `storage.session`, `optional_host_permissions`, Chrome 153 / 150 / 149 / 148, Chrome Web Store Developer Dashboard

---

## 10. External & Legacy References

These pages are outside the indexed MV3 documentation tree (or deliberately out of scope). They are **not summarized** here; fetch them directly when needed.

- [Manifest V2 documentation](https://developer.chrome.com/docs/extensions/mv2) — deprecated MV2 guides, manifest keys, and API reference. Use only for maintaining legacy extensions or understanding migration source behavior.
- [Chrome Web Store documentation](https://developer.chrome.com/docs/webstore) — publishing, listing, review, and distribution docs (separate product tree).
- [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies) — policy requirements for Store distribution.
- [Chrome Web Store best practices](https://developer.chrome.com/docs/webstore/best_practices) — quality guidelines and listing recommendations.
- [Chrome extension samples repository](https://github.com/GoogleChrome/chrome-extensions-samples) — runnable API, functional, and tutorial samples linked throughout the docs.
- [Chrome for Developers docs home](https://developer.chrome.com/docs) — entry point to DevTools, Web Store, and other Chrome documentation.
- [MDN WebExtensions API reference](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions) — cross-browser API reference and compatibility notes for the shared WebExtensions surface.

---

## Unindexed / Pending Pages

Excluded by the confirmed scope (MV3 docs only):

- Deprecated `/docs/extensions/mv2/**` pages — listed as the legacy hub in Section 10 only.
- `/docs/extensions/support/**` — help, bug-reporting, and feedback pages with no extension-development content.
- Chrome Web Store pages under `/docs/webstore/**` — separate documentation tree.
- Localized (non-English) versions of the docs.
- Individual API member subpages (for example `reference/api/storage/StorageArea`) — the parent module entry lists the members and the module page hosts their anchors.
- Individual files in the GitHub samples repository and video/blog/marketing pages.

Fetch failures:

- `https://developer.chrome.com/docs/extensions/develop/ui/implement-action` — "Implement an action" consistently timed out in both `.md.txt` and canonical HTML form. Use [`reference/api/action#concepts_and_usage`](https://developer.chrome.com/docs/extensions/reference/api/action#concepts_and_usage) and the Focus Mode tutorial instead.

## Indexing Checkpoint

- **Status:** Complete. All in-scope MV3 pages indexed (204 entries); one page remains pending.
- **Coverage:** Section 1 (8); Section 2 (19); Section 3 (13 of 14); Section 4 (26); Section 5 (14); Section 6 (32); Section 7 (1); Section 8 (87: 8.1 = 13, 8.2 = 14, 8.3 = 15, 8.4 = 7, 8.5 = 5, 8.6 = 33); Section 9 (4).
- **Pending:** `develop/ui/implement-action` — timed out in both `.md.txt` and canonical HTML form; route to `reference/api/action#concepts_and_usage` and the Focus Mode tutorial instead.
- **Aliases / redirects:** `/how-to/distribute/host-extensions` redirects to `/how-to/distribute/host-on-linux` and is indexed once. `develop/migrate.md.txt`, `develop/ui/themes.md.txt`, and several API `.md.txt` endpoints returned no content, so their canonical HTML pages were indexed.
- **Known issues:** `.md.txt` was unavailable for `get-started/tutorial/debug`, `develop`, `develop/concepts/browser-namespace`, `develop/concepts/declare-permissions`, `develop/concepts/real-time`, `develop/ui/themes`, `develop/migrate`, `reference/api/readingList`, `reference/api/debugger`, `reference/api/fileBrowserHandler`, `reference/api/fileSystemProvider`, `reference/api/system/storage`, and `reference/api/ttsEngine`; canonical HTML pages were fetched instead. `chrome.location` is a retired stub and is noted as such.
- **Anchors:** only anchors observed in fetched sources are linked; all other headings are quoted verbatim with *(anchor unverified)*.
- **Size:** 204 pages, ~40.9k words (~394 KB). Larger than the Firefox index because the 86 API entries enumerate every module member.