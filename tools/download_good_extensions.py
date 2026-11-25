#!/usr/bin/env python3
"""Download the curated "good" extensions as unpacked directories.

Puppeteer installs extensions from a directory on disk, not from a `.crx`/`.xpi`
archive: Chrome's `Extensions.loadUnpacked` and Firefox's `webExtension.install`
both take a path. This tool therefore downloads the store archive, keeps it, and
extracts it next to the archive so the E2E runners can point at a real directory.

Sources:
  * Firefox: the official AMO API (`addons.mozilla.org/api/v5`), signed XPIs.
  * Chrome: the Web Store update endpoint, an unofficial but long-standing URL.
    The response is a CRX container wrapping the same ZIP that the store ships.

Standard library only: argparse, urllib, zipfile, json, pathlib.
"""

import argparse
import io
import json
import re
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CATALOG = REPO_ROOT / "tests" / "e2e" / "curated-extensions.json"
DEFAULT_DEST = REPO_ROOT / "good_extensions"

CHROME_PROD_VERSION = "140.0"
CHROME_UPDATE_URL = "https://clients2.google.com/service/update2/crx"
AMO_API_URL = "https://addons.mozilla.org/api/v5/addons/addon/{slug}/"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)

CHROME_ID_PATTERN = re.compile(r"/([a-p]{32})(?:[/?#]|$)")
CRX_MAGIC = b"Cr24"
REQUEST_TIMEOUT_SECONDS = 120


class DownloadError(Exception):
    """A single extension could not be fetched or unpacked."""


def log(message):
    print(message, flush=True)


def fetch(url, *, accept=None):
    request = urllib.request.Request(url)
    request.add_header("User-Agent", USER_AGENT)
    if accept is not None:
        request.add_header("Accept", accept)
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        raise DownloadError(f"HTTP {error.code} for {url}") from error
    except urllib.error.URLError as error:
        raise DownloadError(f"network error for {url}: {error.reason}") from error


def strip_crx_container(payload):
    """Return the ZIP inside a CRX2/CRX3 container.

    CRX3 layout: magic "Cr24", uint32 version, uint32 header size, header, ZIP.
    CRX2 layout: magic "Cr24", uint32 version, uint32 pubkey size, uint32 sig
    size, pubkey, signature, ZIP.
    """
    if not payload.startswith(CRX_MAGIC):
        raise DownloadError("response is not a CRX archive (missing Cr24 magic)")
    if len(payload) < 12:
        raise DownloadError("CRX archive is truncated")

    version = int.from_bytes(payload[4:8], "little")
    if version == 3:
        header_size = int.from_bytes(payload[8:12], "little")
        offset = 12 + header_size
    elif version == 2:
        if len(payload) < 16:
            raise DownloadError("CRX2 archive is truncated")
        pubkey_size = int.from_bytes(payload[8:12], "little")
        sig_size = int.from_bytes(payload[12:16], "little")
        offset = 16 + pubkey_size + sig_size
    else:
        raise DownloadError(f"unsupported CRX version {version}")

    if offset >= len(payload) or not payload[offset:].startswith(b"PK"):
        raise DownloadError("CRX archive has no ZIP payload where one was expected")
    return payload[offset:]


def extract_zip(payload, target):
    """Extract `payload` into `target`, refusing entries that escape the directory."""
    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            for member in archive.infolist():
                destination = (target / member.filename).resolve()
                if not str(destination).startswith(str(target.resolve())):
                    raise DownloadError(f"archive entry escapes the target directory: {member.filename}")
            archive.extractall(target)
    except zipfile.BadZipFile as error:
        raise DownloadError(f"archive is not a valid ZIP: {error}") from error


def read_manifest(target):
    manifest_path = target / "manifest.json"
    if not manifest_path.exists():
        raise DownloadError("extracted archive has no manifest.json")
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise DownloadError(f"manifest.json is not valid JSON: {error}") from error


def read_gecko_id(manifest):
    """Firefox accepts both the modern `browser_specific_settings` and the legacy
    `applications` key for the add-on id; older signed XPIs still ship the latter."""
    for key in ("browser_specific_settings", "applications"):
        gecko_id = manifest.get(key, {}).get("gecko", {}).get("id")
        if gecko_id:
            return gecko_id
    return None


def chrome_extension_id(entry):
    url = entry.get("chrome", {}).get("url", "")
    match = CHROME_ID_PATTERN.search(url)
    if match is None:
        raise DownloadError(f"curated URL does not contain a Chrome extension id: {url!r}")
    return match.group(1)


def fetch_chrome(entry, archives_dir, unpacked_dir):
    extension_id = chrome_extension_id(entry)
    query = urllib.parse.urlencode(
        {
            "response": "redirect",
            "prodversion": CHROME_PROD_VERSION,
            "acceptformat": "crx2,crx3",
            "x": f"id={extension_id}&uc",
        }
    )
    source_url = f"{CHROME_UPDATE_URL}?{query}"
    payload = fetch(source_url)
    zip_payload = strip_crx_container(payload)

    archive_path = archives_dir / f"{entry['slug']}.crx"
    archive_path.write_bytes(payload)
    extract_zip(zip_payload, unpacked_dir)

    manifest = read_manifest(unpacked_dir)
    manifest_version = manifest.get("manifest_version")
    if manifest_version != 3:
        raise DownloadError(
            f"Chrome ships manifest_version {manifest_version}; this build only loads MV3. "
            "Pick an MV3 alternative in the catalog."
        )
    return {
        "id": extension_id,
        "version": manifest.get("version", ""),
        "manifestVersion": manifest_version,
        "sourceUrl": source_url,
        "archive": archive_path,
    }


def fetch_firefox(entry, archives_dir, unpacked_dir):
    amo_slug = entry.get("firefox", {}).get("amoSlug")
    if not amo_slug:
        raise DownloadError("catalog entry has no firefox.amoSlug")

    api_url = AMO_API_URL.format(slug=urllib.parse.quote(amo_slug))
    metadata = json.loads(fetch(api_url, accept="application/json").decode("utf-8"))
    file_info = metadata.get("current_version", {}).get("file", {})
    download_url = file_info.get("url")
    if not download_url:
        raise DownloadError(f"AMO metadata for {amo_slug!r} has no downloadable file")

    payload = fetch(download_url)
    archive_path = archives_dir / f"{entry['slug']}.xpi"
    archive_path.write_bytes(payload)
    extract_zip(payload, unpacked_dir)

    manifest = read_manifest(unpacked_dir)
    manifest_version = manifest.get("manifest_version")
    if manifest_version not in (2, 3):
        raise DownloadError(f"unexpected manifest_version {manifest_version}")

    gecko_id = read_gecko_id(manifest)
    if not gecko_id:
        raise DownloadError("Firefox manifest declares no gecko add-on id")

    return {
        "id": gecko_id,
        "version": manifest.get("version", ""),
        "manifestVersion": manifest_version,
        "sourceUrl": download_url,
        "archive": archive_path,
    }


FETCHERS = {"chrome": fetch_chrome, "firefox": fetch_firefox}


def download_one(browser, entry, root):
    unpacked_dir = root / browser / entry["slug"]
    archives_dir = root / "_archives" / browser
    stage_dir = root / browser / f".{entry['slug']}.staging"

    for directory in (archives_dir, stage_dir.parent):
        directory.mkdir(parents=True, exist_ok=True)

    # Build into a staging directory so a failure never leaves half an extension
    # where a runner would happily install it.
    if stage_dir.exists():
        shutil.rmtree(stage_dir)
    stage_dir.mkdir(parents=True)

    result = FETCHERS[browser](entry, archives_dir, stage_dir)

    if unpacked_dir.exists():
        shutil.rmtree(unpacked_dir)
    shutil.move(str(stage_dir), str(unpacked_dir))

    return {
        "slug": entry["slug"],
        "name": entry.get("name", entry["slug"]),
        "id": result["id"],
        "version": result["version"],
        "manifestVersion": result["manifestVersion"],
        "dir": str(unpacked_dir.relative_to(REPO_ROOT)).replace("\\", "/"),
        "archive": str(result["archive"].relative_to(REPO_ROOT)).replace("\\", "/"),
        "sourceUrl": result["sourceUrl"],
    }


def main(argv):
    parser = argparse.ArgumentParser(
        description="Download the curated good extensions as unpacked directories.",
    )
    parser.add_argument(
        "--browser",
        choices=["chrome", "firefox", "all"],
        default="all",
        help="which store to pull from (default: all)",
    )
    parser.add_argument("--dest", default=str(DEFAULT_DEST), help="output directory")
    parser.add_argument("--catalog", default=str(DEFAULT_CATALOG), help="curated catalog JSON")
    parser.add_argument("--only", default=None, help="comma-separated slugs to download")
    parser.add_argument("--force", action="store_true", help="re-download even when present")
    options = parser.parse_args(argv)

    catalog_path = Path(options.catalog)
    if not catalog_path.exists():
        log(f"error: catalog not found at {catalog_path}")
        return 1

    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    entries = catalog.get("entries", [])
    if not entries:
        log(f"error: catalog {catalog_path} has no entries")
        return 1

    if options.only:
        wanted = {slug.strip() for slug in options.only.split(",") if slug.strip()}
        entries = [entry for entry in entries if entry["slug"] in wanted]
        missing = wanted - {entry["slug"] for entry in entries}
        if missing:
            log(f"error: --only names unknown slugs: {', '.join(sorted(missing))}")
            return 1

    browsers = ["chrome", "firefox"] if options.browser == "all" else [options.browser]
    root = Path(options.dest).resolve()
    root.mkdir(parents=True, exist_ok=True)

    summary = {"schemaVersion": 1, "catalog": str(catalog_path), "browsers": {}}
    catalog_path_out = root / "catalog.json"
    failures = []

    # Any run must merge into whatever is already on disk: downloading one browser
    # or repairing one slug must never shrink the inventory the runners read.
    if catalog_path_out.exists():
        try:
            existing_summary = json.loads(catalog_path_out.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing_summary = None
        if isinstance(existing_summary, dict) and isinstance(existing_summary.get("browsers"), dict):
            for browser_name, payload in existing_summary["browsers"].items():
                summary["browsers"].setdefault(browser_name, payload)
    summary["schemaVersion"] = 1
    summary["catalog"] = str(catalog_path)

    for browser in browsers:
        available = [entry for entry in entries if entry.get(browser)]
        log(f"\n{browser}: {len(available)} candidate(s) from the catalog")
        existing = summary["browsers"].get(browser, {}).get("extensions", [])
        requested = {entry["slug"] for entry in available}
        downloaded = [record for record in existing if record.get("slug") not in requested]

        for index, entry in enumerate(available, start=1):
            slug = entry["slug"]
            unpacked_dir = root / browser / slug
            if unpacked_dir.exists() and not options.force:
                existing_manifest = unpacked_dir / "manifest.json"
                if existing_manifest.exists():
                    manifest = json.loads(existing_manifest.read_text(encoding="utf-8"))
                    archive = root / "_archives" / browser
                    archive_name = "crx" if browser == "chrome" else "xpi"
                    downloaded.append(
                        {
                            "slug": slug,
                            "name": entry.get("name", slug),
                            "id": (
                                chrome_extension_id(entry)
                                if browser == "chrome"
                                else (read_gecko_id(manifest) or "")
                            ),
                            "version": manifest.get("version", ""),
                            "manifestVersion": manifest.get("manifest_version"),
                            "dir": str(unpacked_dir.relative_to(REPO_ROOT)).replace("\\", "/"),
                            "archive": str((archive / f"{slug}.{archive_name}").relative_to(REPO_ROOT)).replace(
                                "\\", "/"
                            ),
                            "sourceUrl": "",
                            "cached": True,
                        }
                    )
                    log(f"  [{index:2}/{len(available)}] {slug}: cached")
                    continue

            try:
                record = download_one(browser, entry, root)
                downloaded.append(record)
                log(
                    f"  [{index:2}/{len(available)}] {slug}: {record['name']} "
                    f"{record['version']} (mv{record['manifestVersion']})"
                )
            except DownloadError as error:
                failures.append((browser, slug, str(error)))
                log(f"  [{index:2}/{len(available)}] {slug}: FAILED - {error}")

        summary["browsers"][browser] = {"extensions": downloaded}

    catalog_path_out.write_text(f"{json.dumps(summary, indent=2)}\n", encoding="utf-8")

    log("\nsummary")
    for browser, payload in summary["browsers"].items():
        log(f"  {browser}: {len(payload['extensions'])} extension(s) -> {root / browser}")
    log(f"  catalog: {catalog_path_out}")

    if failures:
        log(f"\n{len(failures)} failure(s):")
        for browser, slug, message in failures:
            log(f"  {browser}/{slug}: {message}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
