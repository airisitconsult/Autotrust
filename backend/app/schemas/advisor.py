from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.models.vehicle import VehicleCondition, VehicleFeature
from app.schemas.vehicle import VehicleRead

MAX_USER_CHARS = 500
MAX_TURNS = 12
MAX_USER_TURNS = 6


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    # Assistant turns are text the client says the assistant sent earlier. The
    # server can't trust that (a client could forge it), so it's treated as
    # data in the prompt exactly like the buyer's own words.
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=700)]


class AdvisorRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": "I need a reliable family car for Lagos traffic, "
                            "cheap to maintain, around 8000 dollars.",
                        }
                    ]
                }
            ]
        }
    )

    # The conversation so far, oldest first, ending with the buyer's new
    # message. The server keeps no chat state: the client sends the recent
    # history each turn. Capped so a request can't push a huge prompt through
    # (and bill) the AI.
    messages: list[ChatTurn] = Field(min_length=1, max_length=MAX_TURNS)

    @model_validator(mode="after")
    def check_shape(self) -> "AdvisorRequest":
        if self.messages[-1].role != "user":
            raise ValueError("the last message must be from the user")
        user_turns = [m for m in self.messages if m.role == "user"]
        if len(user_turns) > MAX_USER_TURNS:
            raise ValueError(f"at most {MAX_USER_TURNS} user messages per request")
        if any(len(m.content) > MAX_USER_CHARS for m in user_turns):
            raise ValueError(f"user messages are limited to {MAX_USER_CHARS} characters")
        return self


class AdvisorFilters(BaseModel):
    """What the AI understood the buyer to want — already validated against
    our own enums and ranges, so it's safe to run as a database query."""

    min_price: float | None = None
    max_price: float | None = None
    min_year: int | None = None
    max_year: int | None = None
    condition: VehicleCondition | None = None
    state: str | None = None
    features: list[VehicleFeature] = []


class SuggestedModel(BaseModel):
    make: str
    model: str
    reason: str
    # Computed from our database, never claimed by the AI.
    listings: int


class AdvisorVehicle(BaseModel):
    vehicle: VehicleRead
    # True when this listing is one of the models the advisor suggested.
    recommended: bool


class AdvisorResponse(BaseModel):
    # False when the AI couldn't be reached or returned something unusable —
    # the page then points the buyer at the normal search instead.
    ai_available: bool
    # What the assistant says next (may end with a follow-up question).
    reply: str | None = None
    filters: AdvisorFilters = AdvisorFilters()
    suggested_models: list[SuggestedModel] = []
    # Whether listings were searched this turn. False while the assistant is
    # still asking questions, so "no cars shown" isn't mistaken for "no matches".
    searched: bool = False
    # Real listings from our database, found with `filters`.
    vehicles: list[AdvisorVehicle] = []
    # True when nothing matched all the filters and the search was widened.
    relaxed: bool = False
