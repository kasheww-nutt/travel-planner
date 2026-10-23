from datetime import date as TripDate, datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class LockedStop(BaseModel):
    venue_id: str | None = Field(default=None, pattern=r"^(node|way|relation)/[1-9]\d*$")
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    title: str = Field(min_length=1, max_length=200)
    time: str = Field(pattern=r"^(?:0[89]|1\d|2[01]):[0-5]\d$|^22:00$")
    end_time: str = Field(default="", pattern=r"^$|^(?:0[89]|1\d|2[01]):[0-5]\d$|^22:00$")
    cost: float = Field(ge=0, le=1000000, allow_inf_nan=False)
    description: str = Field(default="", max_length=2000)
    category: Literal["transport", "dining", "activity"]

    @model_validator(mode="after")
    def valid_window(self):
        if not self.title.strip():
            raise ValueError("A locked stop needs a name")
        if self.end_time and self.end_time <= self.time:
            raise ValueError("Locked stop end must be after its start")
        return self


class UserInput(BaseModel):
    locked_stops: list[LockedStop] = Field(default_factory=list, max_length=20)
    date: TripDate | None = None
    city: str = Field(min_length=1, max_length=100)
    interests: list[str] = Field(default_factory=list, max_length=20)
    budget: float = Field(gt=0, le=1000000, allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_locks(self):
        if len({s.id for s in self.locked_stops}) != len(self.locked_stops):
            raise ValueError("Locked stop IDs must be unique")
        if round(sum(s.cost for s in self.locked_stops), 2) > round(self.budget, 2):
            raise ValueError("Locked stops exceed your budget. Increase the budget or unlock a stop.")
        stops = sorted(self.locked_stops, key=lambda s: s.time)
        for previous, current in zip(stops, stops[1:]):
            if current.time == previous.time or current.time < (previous.end_time or previous.time):
                raise ValueError("Locked stops overlap. Adjust their times or unlock a stop.")
        return self

    @field_validator("city")
    @classmethod
    def clean_city(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Enter a city name")
        return value

    @field_validator("interests")
    @classmethod
    def clean_interests(cls, values):
        if any(len(value) > 100 for value in values):
            raise ValueError("Each interest must be at most 100 characters")
        return [value.strip() for value in values if value.strip()]


class AgentMessage(BaseModel):
    """The single message schema used for ALL inter-agent communication."""

    from_agent: str  # user | planner | transport | dining | activities | system
    to_agent: str
    message_type: str  # task_assignment | response | revision_request | revised_response | final_plan | status | error
    content: str
    metadata: dict = Field(default_factory=dict)
    timestamp: str = ""

    def model_post_init(self, __context) -> None:
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()


class GeoPoint(BaseModel):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)


class VenueEvidence(BaseModel):
    id: str = Field(pattern=r"^(node|way|relation)/[1-9]\d*$")
    name: str = Field(min_length=1, max_length=200)
    kind: str
    address: str
    coordinates: GeoPoint
    source_url: str = Field(pattern=r"^https://www\.openstreetmap\.org/(node|way|relation)/[1-9]\d*$")
    opening_hours: str | None = None
    fetched_at: str


class ItineraryItem(BaseModel):
    venue: VenueEvidence | None = None
    locked_id: str | None = None
    end_time: str = ""
    time: str
    title: str
    description: str = ""
    cost: float = 0
    category: str  # transport | dining | activity


class Itinerary(BaseModel):
    city: str
    items: list[ItineraryItem]
    total_cost: float
    summary: str = ""


class WalkingRequest(BaseModel):
    city: Literal["Tokyo", "Kyoto", "Osaka"]
    points: list[GeoPoint] = Field(min_length=2, max_length=2)

    @model_validator(mode="after")
    def local_points(self):
        from travel_data import CITIES
        _, _, bbox = CITIES[self.city]
        if any(not (bbox[0] <= p.lng <= bbox[2] and bbox[1] <= p.lat <= bbox[3]) for p in self.points):
            raise ValueError("Choose two map locations in the selected city search area.")
        if self.points[0] == self.points[1]:
            raise ValueError("Choose two different locations.")
        return self
