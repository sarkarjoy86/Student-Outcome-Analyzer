import os
import sys
import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx

# Ensure Windows SSL certificate validation uses system root certificates
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

from core.config import settings

logger = logging.getLogger("ml-service.hf_client")

HEADERS = {
    "Authorization": f"Bearer {settings.HF_TOKEN}",
    "Content-Type": "application/json"
}


# Cache permanently unavailable endpoints (e.g. 400 unsupported or invalid DNS)
_UNAVAILABLE_ENDPOINTS = set()


async def call_hf_api_with_retry(
    urls_to_try: List[str],
    payload: dict,
    max_retries: int = 3,
    timeout: float = 35.0
) -> Any:
    """
    Executes a POST request to Hugging Face Inference endpoints with automatic
    cold-start backoff (HTTP 503), rate-limit backoff (HTTP 429), and router fallback.
    """
    last_error: Optional[Exception] = None

    active_urls = [u for u in urls_to_try if u not in _UNAVAILABLE_ENDPOINTS]
    if not active_urls:
        active_urls = urls_to_try

    for url in active_urls:
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(url, headers=HEADERS, json=payload)

                    if response.status_code == 200:
                        return response.json()

                    # Handle Cold Start (model is downloading into serverless RAM on HF)
                    if response.status_code == 503:
                        try:
                            data = response.json()
                            wait_time = float(data.get("estimated_time", 10.0))
                        except Exception:
                            wait_time = 10.0
                        sleep_s = min(max(wait_time, 2.0), 15.0)
                        logger.info(
                            f"[*] Model loading on {url} (HTTP 503). Waiting {sleep_s:.1f}s "
                            f"(Attempt {attempt + 1}/{max_retries})..."
                        )
                        await asyncio.sleep(sleep_s)
                        continue

                    # Handle Rate Limiting
                    if response.status_code == 429:
                        logger.warning(f"[!] Rate limit hit on {url} (HTTP 429). Backing off 2s...")
                        await asyncio.sleep(2.0)
                        continue

                    # Handle Model Not Supported by current router provider -> blacklist and switch immediately
                    if response.status_code in (400, 404):
                        _UNAVAILABLE_ENDPOINTS.add(url)
                        logger.info(f"[!] Endpoint {url} returned HTTP {response.status_code}. Switching to next fallback URL.")
                        break

                    logger.warning(f"[!] HF API Error {response.status_code} on {url}: {response.text[:200]}")
                    break

            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_error = exc
                err_str = str(exc).lower()
                if "getaddrinfo" in err_str or "named" in err_str or isinstance(exc, httpx.ConnectError):
                    _UNAVAILABLE_ENDPOINTS.add(url)
                    logger.info(f"[!] DNS/Connect failure on {url}. Switching to next fallback URL.")
                    break

                logger.warning(f"[!] Network error/timeout on {url}: {exc}. (Attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(1.5)

    raise RuntimeError(
        f"Failed to obtain response from Hugging Face Inference endpoints after retries. Last error: {last_error}"
    )


def call_hf_api_sync(urls_to_try: List[str], payload: dict, max_retries: int = 3, timeout: float = 35.0) -> Any:
    """Synchronous helper using httpx.Client with cold-start retries."""
    import time
    last_error = None

    active_urls = [u for u in urls_to_try if u not in _UNAVAILABLE_ENDPOINTS]
    if not active_urls:
        active_urls = urls_to_try

    for url in active_urls:
        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=timeout) as client:
                    response = client.post(url, headers=HEADERS, json=payload)

                    if response.status_code == 200:
                        return response.json()

                    if response.status_code == 503:
                        try:
                            data = response.json()
                            wait_time = float(data.get("estimated_time", 10.0))
                        except Exception:
                            wait_time = 10.0
                        sleep_s = min(max(wait_time, 2.0), 15.0)
                        logger.info(f"[*] Model loading on {url} (HTTP 503). Waiting {sleep_s:.1f}s...")
                        time.sleep(sleep_s)
                        continue

                    if response.status_code == 429:
                        logger.warning(f"[!] Rate limit on {url} (HTTP 429). Backing off 2s...")
                        time.sleep(2.0)
                        continue

                    if response.status_code in (400, 404):
                        _UNAVAILABLE_ENDPOINTS.add(url)
                        logger.info(f"[!] Endpoint {url} returned HTTP {response.status_code}. Switching URL.")
                        break

                    logger.warning(f"[!] Error {response.status_code} on {url}: {response.text[:200]}")
                    break
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_error = exc
                err_str = str(exc).lower()
                if "getaddrinfo" in err_str or "named" in err_str or isinstance(exc, httpx.ConnectError):
                    _UNAVAILABLE_ENDPOINTS.add(url)
                    logger.info(f"[!] DNS/Connect failure on {url}. Switching URL.")
                    break

                logger.warning(f"[!] Network error on {url}: {exc}")
                time.sleep(1.5)

    raise RuntimeError(f"Failed sync response from HF Inference endpoints. Last error: {last_error}")


async def compute_sentence_similarity(source_sentence: str, sentences: List[str]) -> List[float]:
    """
    Computes semantic similarity scores between `source_sentence` and a list of target `sentences`
    using Hugging Face Serverless Inference. Returns a list of float scores matching input order.
    """
    if not sentences:
        return []

    clean_source = (source_sentence or "").strip()
    if not clean_source:
        return [0.0] * len(sentences)

    # Process in batches of up to 50 sentences to keep payloads lightweight
    batch_size = 50
    all_scores: List[float] = []

    urls = [
        settings.SBERT_PRIMARY_URL,
        settings.SBERT_FALLBACK_URL,
        settings.SBERT_BACKUP_URL
    ]

    for i in range(0, len(sentences), batch_size):
        batch = sentences[i:i + batch_size]
        payload = {
            "inputs": {
                "source_sentence": clean_source,
                "sentences": batch
            }
        }
        res = await call_hf_api_with_retry(urls, payload)

        if isinstance(res, list):
            all_scores.extend([float(x) for x in res])
        else:
            raise ValueError(f"Unexpected similarity response format from HF API: {res}")

    return all_scores


def compute_sentence_similarity_sync(source_sentence: str, sentences: List[str]) -> List[float]:
    """Synchronous version of sentence similarity for non-async services."""
    if not sentences:
        return []

    clean_source = (source_sentence or "").strip()
    if not clean_source:
        return [0.0] * len(sentences)

    batch_size = 50
    all_scores: List[float] = []

    urls = [
        settings.SBERT_PRIMARY_URL,
        settings.SBERT_FALLBACK_URL,
        settings.SBERT_BACKUP_URL
    ]

    for i in range(0, len(sentences), batch_size):
        batch = sentences[i:i + batch_size]
        payload = {
            "inputs": {
                "source_sentence": clean_source,
                "sentences": batch
            }
        }
        res = call_hf_api_sync(urls, payload)
        if isinstance(res, list):
            all_scores.extend([float(x) for x in res])
        else:
            raise ValueError(f"Unexpected similarity response format from HF API: {res}")

    return all_scores


async def classify_zero_shot(
    text: str,
    candidate_labels: List[str],
    hypothesis_template: str = "This university exam question requires students to {}."
) -> Dict[str, Any]:
    """
    Performs Zero-Shot Classification on `text` using Hugging Face Serverless Inference.
    Returns dict format: {"labels": [...], "scores": [...]} sorted descending by score.
    """
    clean_text = (text or "").strip()
    if not clean_text:
        return {
            "labels": candidate_labels,
            "scores": [1.0 / len(candidate_labels)] * len(candidate_labels)
        }

    urls = [
        settings.ZERO_SHOT_PRIMARY_URL,
        settings.ZERO_SHOT_FALLBACK_URL
    ]

    payload = {
        "inputs": clean_text,
        "parameters": {
            "candidate_labels": candidate_labels,
            "hypothesis_template": hypothesis_template,
            "multi_label": False
        }
    }

    res = await call_hf_api_with_retry(urls, payload)

    if isinstance(res, dict) and "labels" in res and "scores" in res:
        return {
            "labels": res["labels"],
            "scores": [float(s) for s in res["scores"]]
        }
    elif isinstance(res, list) and len(res) > 0 and isinstance(res[0], dict) and "label" in res[0]:
        labels = [item["label"] for item in res]
        scores = [float(item["score"]) for item in res]
        return {
            "labels": labels,
            "scores": scores
        }
    else:
        raise ValueError(f"Unexpected zero-shot response format from HF API: {res}")


def classify_zero_shot_sync(
    text: str,
    candidate_labels: List[str],
    hypothesis_template: str = "This university exam question requires students to {}."
) -> Dict[str, Any]:
    """Synchronous version of zero-shot classification."""
    clean_text = (text or "").strip()
    if not clean_text:
        return {
            "labels": candidate_labels,
            "scores": [1.0 / len(candidate_labels)] * len(candidate_labels)
        }

    urls = [
        settings.ZERO_SHOT_PRIMARY_URL,
        settings.ZERO_SHOT_FALLBACK_URL
    ]

    payload = {
        "inputs": clean_text,
        "parameters": {
            "candidate_labels": candidate_labels,
            "hypothesis_template": hypothesis_template,
            "multi_label": False
        }
    }

    res = call_hf_api_sync(urls, payload)

    if isinstance(res, dict) and "labels" in res and "scores" in res:
        return {
            "labels": res["labels"],
            "scores": [float(s) for s in res["scores"]]
        }
    elif isinstance(res, list) and len(res) > 0 and isinstance(res[0], dict) and "label" in res[0]:
        labels = [item["label"] for item in res]
        scores = [float(item["score"]) for item in res]
        return {
            "labels": labels,
            "scores": scores
        }
    else:
        raise ValueError(f"Unexpected zero-shot response format from HF API: {res}")
