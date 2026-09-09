from __future__ import annotations

import threading
import time
from dataclasses import dataclass

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


@dataclass(frozen=True)
class HttpPolicy:
    user_agent: str
    timeout_seconds: float = 20
    retries: int = 3
    delay_seconds: float = 0.25


class RateGate:
    def __init__(self, delay_seconds: float) -> None:
        self.delay_seconds = max(0.0, delay_seconds)
        self._next_request = 0.0
        self._lock = threading.Lock()

    def wait(self) -> None:
        with self._lock:
            delay = max(0.0, self._next_request - time.monotonic())
            if delay:
                time.sleep(delay)
            self._next_request = time.monotonic() + self.delay_seconds


def build_session(policy: HttpPolicy) -> requests.Session:
    retry = Retry(
        total=policy.retries,
        connect=policy.retries,
        read=policy.retries,
        status=policy.retries,
        backoff_factor=0.7,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "HEAD"),
        respect_retry_after_header=True,
    )
    session = requests.Session()
    session.headers.update({
        "User-Agent": policy.user_agent,
        "Accept-Encoding": "gzip, deflate",
    })
    session.mount("https://", HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10))
    return session

