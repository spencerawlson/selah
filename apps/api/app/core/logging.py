"""Minimal structured-ish logging setup.

Deliberately small: one configured logger the whole app imports. Swap the
formatter for JSON when you ship to a log aggregator.
"""

from __future__ import annotations

import logging
import sys

_FORMAT = "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s"


def configure_logging(debug: bool = False) -> logging.Logger:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_FORMAT, datefmt="%H:%M:%S"))

    root = logging.getLogger("selah")
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.DEBUG if debug else logging.INFO)
    root.propagate = False
    return root


logger = logging.getLogger("selah")
