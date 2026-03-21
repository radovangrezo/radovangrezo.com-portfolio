import json
import time
import re
import requests
from bs4 import BeautifulSoup

URLS = [
    "https://radovangrezo.com/",
    "https://radovangrezo.com/?page_id=2",
    "https://radovangrezo.com/?portfolio=contact-me",
    "https://radovangrezo.com/?portfolio=resume",
    "https://radovangrezo.com/?portfolio=dedoles-sk-hamster-time",
    "https://radovangrezo.com/?portfolio=raiffeisen-bank-you-work-hard-for-your-money-we-work-hard-for-you",
    "https://radovangrezo.com/?portfolio=mana-food-evolution",
    "https://radovangrezo.com/?portfolio=skoda-lets-reconnect",
    "https://radovangrezo.com/?portfolio=tchibo-like-men-liked-shopping",
    "https://radovangrezo.com/?portfolio=t-mobile-cz-laughter",
    "https://radovangrezo.com/?portfolio=league-against-cancer-shadow",
    "https://radovangrezo.com/?portfolio=apple",
    "https://radovangrezo.com/?portfolio=help-a-child-with-unicef",
    "https://radovangrezo.com/?portfolio=zuno-longterm-creative-concept",
    "https://radovangrezo.com/?portfolio=orion-chocolate-masterpiece",
    "https://radovangrezo.com/?portfolio=telekom-deaf-facebook",
    "https://radovangrezo.com/?portfolio=older-work",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    )
}

YOUTUBE_RE = re.compile(r"(https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)[\w\-]+)", re.I)
VIMEO_RE = re.compile(r"(https?://(?:www\.)?vimeo\.com/\d+)", re.I)


def extract_videos(soup, html_text):
    videos = []

    # iframes
    for iframe in soup.find_all("iframe"):
        src = iframe.get("src", "")
        if src and ("youtube" in src or "vimeo" in src or "youtu.be" in src):
            videos.append(src)

    # inline in raw HTML
    for match in YOUTUBE_RE.findall(html_text):
        if match not in videos:
            videos.append(match)
    for match in VIMEO_RE.findall(html_text):
        if match not in videos:
            videos.append(match)

    return videos


def scrape_page(url, session):
    try:
        resp = session.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  ERROR fetching {url}: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Title
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Meta description
    meta_desc = ""
    meta = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    if meta:
        meta_desc = meta.get("content", "").strip()

    # Body text — strip scripts/styles first
    body = soup.find("body") or soup
    for tag in body(["script", "style", "noscript"]):
        tag.decompose()
    text = " ".join(body.get_text(separator=" ").split())

    # Images
    images = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
        if src and src not in images:
            images.append(src)

    # Links
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        link_text = a.get_text(strip=True)
        if href and href not in ("#", "javascript:void(0)", ""):
            links.append({"href": href, "text": link_text})

    # Videos
    videos = extract_videos(soup, resp.text)

    return {
        "url": url,
        "title": title,
        "meta_description": meta_desc,
        "text": text,
        "images": images,
        "links": links,
        "videos": videos,
    }


def main():
    results = []
    session = requests.Session()

    for i, url in enumerate(URLS):
        print(f"[{i+1}/{len(URLS)}] Scraping: {url}")
        data = scrape_page(url, session)
        if data:
            results.append(data)
            print(f"  OK — {len(data['text'])} chars, {len(data['images'])} images, {len(data['links'])} links, {len(data['videos'])} videos")
        if i < len(URLS) - 1:
            time.sleep(1.5)

    # JSON output
    json_path = "radovangrezo_content.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nSaved JSON: {json_path}")

    # Plain text output
    txt_path = "radovangrezo_content.txt"
    divider = "\n" + "=" * 80 + "\n"
    with open(txt_path, "w", encoding="utf-8") as f:
        for page in results:
            f.write(divider)
            f.write(f"TITLE: {page['title']}\n")
            f.write(f"URL:   {page['url']}\n")
            if page["meta_description"]:
                f.write(f"META:  {page['meta_description']}\n")
            f.write("\n")
            f.write(page["text"])
            f.write("\n")
    print(f"Saved TXT:  {txt_path}")


if __name__ == "__main__":
    main()
