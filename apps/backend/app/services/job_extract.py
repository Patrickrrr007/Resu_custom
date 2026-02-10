"""Extract job description from a job posting URL."""

import logging
import re
from typing import Any

import httpx
from app.llm import complete
from app.prompts.templates import (
    EXTRACT_JOB_FROM_HTML_PROMPT,
    EXTRACT_JOB_FROM_PAGE_PROMPT,
)

logger = logging.getLogger(__name__)

# Max page size to fetch (bytes)
FETCH_MAX_BYTES = 1_000_000
FETCH_TIMEOUT_SEC = 25
# If raw text exceeds this, use LLM to extract job section only
EXTRACT_WITH_LLM_THRESHOLD = 12_000
# Minimum chars after HTML strip to accept; below this we try LLM on raw HTML
MIN_TEXT_LENGTH = 50


def _strip_html(html: str) -> str:
    """Remove script/style blocks and strip tags; normalize whitespace."""
    if not html or not html.strip():
        return ""
    # Remove script and style elements and their content
    text = re.sub(
        r"<script[^>]*>[\s\S]*?</script>",
        " ",
        html,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"<style[^>]*>[\s\S]*?</style>",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    # Strip all tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Decode common entities
    text = text.replace("&nbsp;", " ")
    text = text.replace("&amp;", "&")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&quot;", '"')
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def fetch_page_text(url: str) -> str:
    """Fetch URL and return plain text extracted from HTML.

    Args:
        url: Job posting URL (must be http or https).

    Returns:
        Extracted text from the page body.

    Raises:
        ValueError: If URL is invalid, fetch fails, or content is empty.
    """
    url = url.strip()
    if not url:
        raise ValueError("URL is required")
    if not url.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; ResumeMatcher/1.0; +https://github.com/resume-matcher)"
        ),
        "Accept": "text/html,application/xhtml+xml",
    }

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=FETCH_TIMEOUT_SEC,
        ) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            raw = response.text
            if len(raw.encode("utf-8")) > FETCH_MAX_BYTES:
                raw = raw.encode("utf-8")[:FETCH_MAX_BYTES].decode("utf-8", errors="ignore")
    except httpx.TimeoutException as e:
        logger.warning("Timeout fetching job URL: %s", url)
        raise ValueError("Request to the job URL timed out. Please try again or paste the job description.") from e
    except httpx.HTTPStatusError as e:
        logger.warning("HTTP error fetching job URL %s: %s", url, e.response.status_code)
        raise ValueError(
            f"Could not load the page (HTTP {e.response.status_code}). Please paste the job description instead."
        ) from e
    except httpx.RequestError as e:
        logger.warning("Request error fetching job URL %s: %s", url, e)
        raise ValueError(
            "Could not reach the job URL. Please check the link or paste the job description."
        ) from e

    text = _strip_html(raw)
    if text and len(text) >= MIN_TEXT_LENGTH:
        return text
    # Page may be JS-rendered (SPA) or have job data in meta/JSON-LD; try LLM on raw HTML
    if len(raw.strip()) >= 200:
        try:
            html_snippet = raw.strip()[:50_000]
            extracted = await extract_job_from_html(html_snippet)
            if extracted and len(extracted) >= 50:
                return extracted
        except Exception as e:
            logger.warning("LLM extraction from raw HTML failed: %s", e)
    raise ValueError(
        "This page didn't return enough text (it may be loaded by JavaScript). "
        "Try pasting the job description in the box below instead."
    )


async def extract_job_from_html(html: str) -> str:
    """Use LLM to extract job description from raw HTML (meta, JSON-LD, etc.)."""
    prompt = EXTRACT_JOB_FROM_HTML_PROMPT + "\n\n---\n\n" + html
    result = await complete(
        prompt=prompt,
        system_prompt="You extract job descriptions from HTML. Output only the extracted text.",
        max_tokens=4096,
        temperature=0.2,
    )
    out = (result or "").strip()
    if not out or "no job description found" in out.lower():
        return ""
    return out


async def extract_job_description_from_page(page_text: str) -> str:
    """Use LLM to extract only job description and requirements from page text.

    Args:
        page_text: Raw text extracted from a web page.

    Returns:
        Extracted job description text.
    """
    # Truncate to avoid token limits; LLM can still extract from a long prefix
    max_chars = 30_000
    if len(page_text) > max_chars:
        page_text = page_text[:max_chars] + "\n\n[Content truncated...]"

    prompt = EXTRACT_JOB_FROM_PAGE_PROMPT + "\n\n---\n\n" + page_text
    result = await complete(
        prompt=prompt,
        system_prompt="You extract job descriptions and requirements from web page content. Output only the extracted text.",
        max_tokens=8192,
        temperature=0.2,
    )
    out = (result or "").strip()
    if not out:
        return page_text[:8000]
    return out


async def extract_job_from_url(url: str) -> str:
    """Fetch a job URL and return extracted job description text.

    Fetches the page, strips HTML to text, and if the text is long or noisy,
    uses the LLM to extract only the job description and requirements.

    Args:
        url: Job posting URL.

    Returns:
        Job description text suitable for resume tailoring.
    """
    page_text = await fetch_page_text(url)
    if len(page_text) > EXTRACT_WITH_LLM_THRESHOLD:
        try:
            return await extract_job_description_from_page(page_text)
        except Exception as e:
            logger.warning("LLM extraction from page failed, using raw text: %s", e)
            return page_text[:15_000]
    return page_text[:15_000]
