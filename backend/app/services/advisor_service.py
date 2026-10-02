"""The buyer-facing AI advisor.

The AI only ever *interprets* — it turns what the buyer wrote into advice and a
set of search filters. Everything the buyer is shown as fact (which cars exist,
their prices, whether they're vetted) comes from our own database, and
everything the AI returns is validated against our own enums and ranges before
it is used. See `sanitize_plan`.
"""

import hashlib
import json
import re
import threading
import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core import gemini
from app.core.nigeria_locations import NIGERIA_STATES_LGAS
from app.models.vehicle import Vehicle, VehicleCondition, VehicleFeature, VehicleStatus
from app.repositories import vehicle_repository
from app.schemas.advisor import (
    AdvisorFilters,
    AdvisorResponse,
    AdvisorVehicle,
    ChatTurn,
    SuggestedModel,
)

MAX_RESULTS = 12
MAX_SUGGESTIONS = 4

# --- Cache of AI plans ---------------------------------------------------
# Identical requests within the TTL reuse the AI's answer instead of paying
# for another call. Only the *plan* is cached; the matching listings are
# always looked up fresh.
_CACHE_TTL_SECONDS = 600
_CACHE_MAX_ENTRIES = 200
_plan_cache: dict[str, tuple[float, dict]] = {}
_cache_lock = threading.Lock()


def _cache_key(turns: list[ChatTurn]) -> str:
    normalized = json.dumps([[t.role, t.content.strip().lower()] for t in turns])
    return hashlib.sha256(normalized.encode()).hexdigest()


def _cache_get(key: str) -> dict | None:
    with _cache_lock:
        entry = _plan_cache.get(key)
        if entry and time.monotonic() - entry[0] < _CACHE_TTL_SECONDS:
            return entry[1]
        _plan_cache.pop(key, None)
        return None


def _cache_put(key: str, plan: dict) -> None:
    with _cache_lock:
        if len(_plan_cache) >= _CACHE_MAX_ENTRIES:
            _plan_cache.pop(next(iter(_plan_cache)))  # evict the oldest
        _plan_cache[key] = (time.monotonic(), plan)


# --- Validating what the AI returned ------------------------------------

_STATES_BY_LOWER = {name.lower(): name for name in NIGERIA_STATES_LGAS}
_NAME_JUNK = re.compile(r"[^A-Za-z0-9 .\-]")


def _clean_name(value: object, max_len: int = 40) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = _NAME_JUNK.sub("", value).strip()[:max_len].strip()
    return cleaned or None


def _number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return None
    try:
        number = float(value)
    except ValueError:
        return None
    return number if 0 <= number < 1e12 else None


def sanitize_plan(
    raw: dict,
) -> tuple[str, bool, AdvisorFilters, list[tuple[str, str, str]]] | None:
    """Turn the AI's untrusted JSON into values that are safe to use, dropping
    anything that doesn't fit. Returns (reply, show_cars, filters, suggested
    models as (make, model, reason)), or None if there's no usable reply."""
    reply = raw.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        return None
    reply = reply.strip()[:700]
    # Only an explicit true counts: a missing or odd value means "keep asking".
    show_cars = raw.get("show_cars") is True

    min_price, max_price = _number(raw.get("min_price")), _number(raw.get("max_price"))
    if min_price is not None and max_price is not None and min_price > max_price:
        min_price, max_price = max_price, min_price

    this_year = datetime.now(timezone.utc).year
    years: list[int | None] = []
    for key in ("min_year", "max_year"):
        n = _number(raw.get(key))
        years.append(int(n) if n is not None and 1980 <= n <= this_year + 1 else None)
    min_year, max_year = years
    if min_year is not None and max_year is not None and min_year > max_year:
        min_year, max_year = max_year, min_year

    condition = None
    if isinstance(raw.get("condition"), str):
        try:
            condition = VehicleCondition(raw["condition"].strip().lower())
        except ValueError:
            pass

    state = None
    if isinstance(raw.get("state"), str):
        state = _STATES_BY_LOWER.get(raw["state"].strip().lower())

    features: list[VehicleFeature] = []
    if isinstance(raw.get("features"), list):
        for item in raw["features"]:
            try:
                feature = VehicleFeature(item)
            except ValueError:
                continue
            if feature not in features:
                features.append(feature)

    suggestions: list[tuple[str, str, str]] = []
    if isinstance(raw.get("suggested_models"), list):
        for item in raw["suggested_models"][:MAX_SUGGESTIONS]:
            if not isinstance(item, dict):
                continue
            make, model = _clean_name(item.get("make")), _clean_name(item.get("model"))
            reason = item.get("reason")
            if make and model:
                reason = reason.strip()[:200] if isinstance(reason, str) else ""
                suggestions.append((make, model, reason))

    filters = AdvisorFilters(
        min_price=min_price,
        max_price=max_price,
        min_year=min_year,
        max_year=max_year,
        condition=condition,
        state=state,
        features=features,
    )
    return reply, show_cars, filters, suggestions


# --- Finding real listings -----------------------------------------------


def _is_suggested(vehicle: Vehicle, suggestions: list[tuple[str, str, str]]) -> bool:
    make, model = vehicle.make.lower(), vehicle.model.lower()
    for s_make, s_model, _ in suggestions:
        s_model = s_model.lower()
        if make == s_make.lower() and (s_model in model or model in s_model):
            return True
    return False


def _search(db: Session, filters: AdvisorFilters, relaxed: bool) -> list[Vehicle]:
    return vehicle_repository.list_vehicles(
        db,
        status=VehicleStatus.LISTED,
        min_price=filters.min_price,
        max_price=filters.max_price,
        min_year=filters.min_year,
        max_year=filters.max_year,
        # Widening drops the "soft" preferences and keeps budget and year.
        condition=None if relaxed else filters.condition,
        state=None if relaxed else filters.state,
        features=None if relaxed else ([f.value for f in filters.features] or None),
        limit=50,
    )


def recommend(db: Session, turns: list[ChatTurn]) -> AdvisorResponse:
    inventory_pairs = vehicle_repository.list_listed_make_models(db)
    inventory = [f"{make} {model}" for make, model in inventory_pairs]

    key = _cache_key(turns)
    raw = _cache_get(key)
    if raw is None:
        # `<` and `>` are stripped so nobody can forge the tags that delimit
        # the conversation in the prompt (this covers the client-supplied
        # "assistant" turns too).
        safe_turns = [
            {"role": t.role, "content": t.content.replace("<", " ").replace(">", " ")}
            for t in turns
        ]
        raw = gemini.generate_advisor_plan(safe_turns, inventory)
        if raw is not None:
            _cache_put(key, raw)

    plan = sanitize_plan(raw) if raw is not None else None
    if plan is None:
        return AdvisorResponse(ai_available=False)
    reply, show_cars, filters, suggestions = plan

    vehicles: list[Vehicle] = []
    relaxed = False
    if show_cars:
        vehicles = _search(db, filters, relaxed=False)
        if not vehicles and (filters.condition or filters.state or filters.features):
            vehicles = _search(db, filters, relaxed=True)
            relaxed = bool(vehicles)

    # Suggested models first, then the rest, each group newest-first.
    ranked = sorted(vehicles, key=lambda v: not _is_suggested(v, suggestions))[:MAX_RESULTS]

    return AdvisorResponse(
        ai_available=True,
        reply=reply,
        searched=show_cars,
        filters=filters,
        suggested_models=[
            SuggestedModel(
                make=make,
                model=model,
                reason=reason,
                listings=vehicle_repository.count_listed_matching_model(db, make, model),
            )
            for make, model, reason in suggestions
        ],
        vehicles=[
            AdvisorVehicle(vehicle=v, recommended=_is_suggested(v, suggestions)) for v in ranked
        ],
        relaxed=relaxed,
    )
