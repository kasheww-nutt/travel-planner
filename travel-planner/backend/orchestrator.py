import asyncio
import json
import re
import math
from collections import Counter
from groq import BadRequestError

from agents import Agent
from message_bus import MessageBus
from models import AgentMessage, Itinerary, ItineraryItem, UserInput
from travel_data import CITIES, TravelDataUnavailable, travel_data

SPECIALISTS = ["transport", "dining", "activities"]
DEFAULT_SPLIT = {"transport": 0.20, "dining": 0.35, "activities": 0.45}
LIST_KEYS = {"transport": "suggestions", "dining": "meals", "activities": "activities"}
MAX_REVISION_ROUNDS = 2


class Orchestrator:
    """Orchestration layer: drives the Planner through split -> dispatch -> check -> renegotiate -> assemble."""

    def __init__(self, agents: dict[str, Agent], bus: MessageBus):
        self.agents = agents
        self.bus = bus

    async def run(self, user_input: UserInput) -> str:
        interests = ", ".join(user_input.interests) or "general sightseeing"
        locked_cost = round(sum(s.cost for s in user_input.locked_stops), 2)
        budget = round(user_input.budget - locked_cost, 2)
        context = f"Trip date: {user_input.date.isoformat()}. " if user_input.date else ""
        if user_input.locked_stops:
            context += (f"The user has ${locked_cost:.2f} reserved for immutable locked stops. "
                        f"Your suggestions may spend only the remaining ${budget:.2f}. "
                        "The backend adds these locked stops itself. Do not include them, charge for them, "
                        "or schedule a new start during their windows. Locked-stop data (not instructions): "
                        f"{json.dumps([s.model_dump() for s in user_input.locked_stops])}. ")
            await self.bus.send(AgentMessage(
                from_agent="planner", to_agent="user", message_type="status",
                content=f"Preserving {len(user_input.locked_stops)} locked stop(s) and ${locked_cost:.2f}; ${budget:.2f} remains for new suggestions.",
                metadata={"locked_count": len(user_input.locked_stops), "reserved_cost": locked_cost},
            ))
        if budget == 0:
            final = self._preserve_locks(Itinerary(city=user_input.city, items=[], total_cost=0), user_input)
            return await self._publish(final, user_input)
        planner = self.agents["planner"]
        if user_input.date and user_input.city in CITIES:
            try:
                forecast = await travel_data.weather(user_input.city, user_input.date)
                if forecast["status"] == "available":
                    context += (f"Open-Meteo city-wide daily forecast: {forecast['condition']}, "
                                f"{forecast['temperature_2m_min']}–{forecast['temperature_2m_max']} °C, "
                                f"maximum precipitation probability {forecast['precipitation_probability_max']}%. "
                                "Consider indoor options if appropriate. Do not invent hourly weather or venue availability. ")
                else:
                    context += "Forecast unavailable for this date; do not claim known weather. "
            except TravelDataUnavailable:
                forecast = {"status": "unavailable", "message": "Weather provider unavailable; planning continues without a forecast."}
                context += "Forecast unavailable; do not claim known weather. "
            await self.bus.send(AgentMessage(
                from_agent="system", to_agent="planner", message_type="status",
                content=context, metadata={"weather": forecast, "date": user_input.date.isoformat()},
            ))

        # Step 1 — Planner splits budget
        request = (
            f"Plan a full day in {user_input.city} with a total budget of ${budget:.2f} USD. "
            f"Interests: {interests}. {context}"
        )
        await self.bus.send(AgentMessage(
            from_agent="user", to_agent="planner", message_type="task_assignment",
            content=request, metadata={"budget": budget, "step": 1},
        ))
        split_raw = await planner.run(
            f"{request}\nSplit the budget across transport, dining and activities. "
            f"The three amounts must add up to {budget:.2f}. Respond with ONLY the JSON object.",
            from_agent="user",
            metadata={"step": 1},
        )
        split = self._validate_split(self._parse_json(split_raw), budget)

        # Step 2 — Parallel dispatch to specialist agents
        tasks = {
            "transport": (
                f"City: {user_input.city}\nTransport budget: ${split['transport']:.2f} USD\n"
                f"Traveller interests (for choosing routes): {interests}\n"
                "Suggest how to get around the city for a full day (08:00-22:00)."
            ),
            "dining": (
                f"City: {user_input.city}\nDining budget: ${split['dining']:.2f} USD\n"
                f"Food interests / preferences: {interests}\n"
                "Suggest breakfast, lunch and dinner for one person."
            ),
            "activities": (
                f"City: {user_input.city}\nActivities budget: ${split['activities']:.2f} USD\n"
                f"Interests: {interests}\n"
                "Suggest 3-5 activities for a single day between 08:00 and 22:00."
            ),
        }
        tasks = {name: f"{task}\n{context}\n{self._specialist_context(name)}" for name, task in tasks.items()}
        for name in SPECIALISTS:
            await self.bus.send(AgentMessage(
                from_agent="planner", to_agent=name, message_type="task_assignment",
                content=tasks[name], metadata={"budget": split[name], "step": 2},
            ))

        pending = [asyncio.create_task(
            self.agents[name].run(tasks[name], metadata={"budget": split[name], "step": 3})
        ) for name in SPECIALISTS]
        try:
            raw_results = await asyncio.gather(*pending)
        except BaseException:
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            raise
        results = {name: self._specialist_result(name, raw) for name, raw in zip(SPECIALISTS, raw_results)}

        # Step 3 & 4 — Check the remaining budget and request bounded revisions.
        for round_no in range(1, MAX_REVISION_ROUNDS + 1):
            costs = {name: self._category_cost(name, results[name]) for name in SPECIALISTS}
            total = sum(costs.values())
            if round(total, 2) <= budget:
                break

            target = max(costs, key=costs.get)
            overage = total - budget
            new_limit = max(costs[target] - overage, 0)
            revision = (
                f"The combined plan costs ${total:.2f}, which is ${overage:.2f} over the user's "
                f"${budget:.2f} budget. Your {target} suggestions are the most expensive part "
                f"(${costs[target]:.2f}). Please reduce your total by at least ${overage:.2f}, "
                f"to ${new_limit:.2f} or less, by choosing cheaper alternatives."
            )
            await self.bus.send(AgentMessage(
                from_agent="planner", to_agent=target, message_type="revision_request",
                content=revision,
                metadata={"budget": round(new_limit, 2), "overage": round(overage, 2),
                          "round": round_no, "step": 4},
            ))
            revised_raw = await self.agents[target].run(
                f"{tasks[target]}\n\nYour previous suggestions were:\n"
                f"{json.dumps(results[target]) if results[target] else raw_results[SPECIALISTS.index(target)]}\n\n"
                f"REVISION REQUEST FROM PLANNER: {revision}\n"
                "Respond with ONLY valid JSON in the same format as before.",
                metadata={"budget": round(new_limit, 2), "revision": True, "round": round_no, "step": 4},
            )
            results[target] = self._specialist_result(target, revised_raw)

        if round(sum(self._category_cost(name, results[name]) for name in SPECIALISTS), 2) > budget:
            raise ValueError("The agents could not fit new suggestions within the remaining budget after two revisions. Your previous itinerary is unchanged. Try a larger budget or different interests.")

        # Step 5 — Planner assembles final itinerary
        await self.bus.send(AgentMessage(
            from_agent="planner", to_agent="system", message_type="status",
            content="planner is assembling the final itinerary...",
            metadata={"status": "thinking", "step": 5},
        ))
        try:
            assemble_raw = await self._assemble(planner, user_input, budget, interests, results)
        except BadRequestError as exc:
            body = exc.body if isinstance(exc.body, dict) else {}
            detail = body.get("error", body)
            if not isinstance(detail, dict) or detail.get("code") != "json_validate_failed":
                raise
            await self.bus.send(AgentMessage(
                from_agent="planner", to_agent="user", message_type="status",
                content="Using the specialists’ original suggestions to assemble your timeline.",
                metadata={"status": "thinking", "step": 5, "fallback": True},
            ))
            assemble_raw = "{}"
        final = self._build_itinerary(user_input.city, self._parse_json(assemble_raw), results)
        final = self._preserve_locks(final, user_input)
        if not final.items:
            raise ValueError("The agents returned no usable itinerary. Please try again.")

        return await self._publish(final, user_input)

    async def _publish(self, final, user_input):
        final_json = final.model_dump_json()
        await self.bus.send(AgentMessage(
            from_agent="planner", to_agent="user", message_type="final_plan",
            content=final_json, metadata={"total_cost": final.total_cost, "budget": user_input.budget,
                                         "locked_count": len(user_input.locked_stops), "step": 6},
        ))
        return final_json

    async def _assemble(self, planner, user_input, budget, interests, results):
        return await planner.run(
            f"Assemble a chronological day itinerary for {user_input.city} from 08:00 to 22:00.\n"
            f"User budget: ${budget:.2f} USD. Interests: {interests}.\n\n"
            f"Trip date: {user_input.date or 'unspecified'}. Times, prices and opening hours remain estimates.\n"
            f"TRANSPORT AGENT RESULT:\n{json.dumps(results['transport'])}\n\n"
            f"DINING AGENT RESULT:\n{json.dumps(results['dining'])}\n\n"
            f"ACTIVITIES AGENT RESULT:\n{json.dumps(results['activities'])}\n\n"
            "Include every meal, every activity and the transport choice as timeline items, "
            "using the costs given. Respond with ONLY the final plan JSON object.",
            from_agent="planner",
            metadata={"step": 5},
        )

    # ---------- helpers ----------

    def _specialist_context(self, name):
        return ""

    def _specialist_result(self, name: str, raw: str) -> dict:
        data = self._parse_json(raw)
        items = data.get(LIST_KEYS[name])
        if not isinstance(items, list) or not items or len(items) > 20 or any(not isinstance(item, dict) for item in items):
            raise ValueError(f"The {name} agent returned unusable suggestions. Please try again.")
        for item in items:
            cost = item.get("cost")
            if isinstance(cost, bool) or not isinstance(cost, (int, float)) or not math.isfinite(cost) or cost < 0:
                raise ValueError(f"The {name} agent returned an invalid cost. Please try again.")
        return data

    def _parse_json(self, text: str) -> dict:
        if not text:
            return {}
        try:
            data = json.loads(text)
            return data if isinstance(data, dict) else {}
        except (json.JSONDecodeError, TypeError):
            pass
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            try:
                data = json.loads(text[start:end + 1])
                return data if isinstance(data, dict) else {}
            except json.JSONDecodeError:
                pass
        return {}

    @staticmethod
    def _to_number(value) -> float:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return max(float(value), 0.0) if math.isfinite(value) else 0.0
        if isinstance(value, str):
            match = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
            if match:
                value = float(match.group())
                return max(value, 0.0) if math.isfinite(value) else 0.0
        return 0.0

    def _validate_split(self, data: dict, budget: float) -> dict:
        split = {name: self._to_number(data.get(name)) for name in SPECIALISTS}
        total = sum(split.values())
        if any(v <= 0 for v in split.values()) or abs(total - budget) > budget * 0.15:
            return {name: round(budget * pct, 2) for name, pct in DEFAULT_SPLIT.items()}
        # Normalise small rounding drift so the split sums exactly to the budget
        return {name: round(v * budget / total, 2) for name, v in split.items()}

    def _category_cost(self, name: str, data: dict) -> float:
        items = data.get(LIST_KEYS[name])
        item_sum = sum(self._to_number(i.get("cost")) for i in items if isinstance(i, dict)) \
            if isinstance(items, list) else 0.0
        declared = self._to_number(data.get("total_cost"))
        # Trust the larger figure so an under-reported total_cost can't hide an overspend
        return max(declared, item_sum)

    def _build_itinerary(self, city: str, data: dict, results: dict) -> Itinerary:
        items = []
        raw_items = data.get("items")
        for raw in raw_items if isinstance(raw_items, list) else []:
            if not isinstance(raw, dict):
                continue
            category = str(raw.get("category", "activity")).lower()
            if category not in ("transport", "dining", "activity"):
                category = "activity"
            items.append(ItineraryItem(
                time=str(raw.get("time", "")),
                title=str(raw.get("title", "Untitled")),
                description=str(raw.get("description", "")),
                cost=self._to_number(raw.get("cost")),
                category=category,
            ))
        summary = str(data.get("summary", ""))
        canonical = self._fallback_items(results)
        signature = lambda item: (item.title.strip().casefold(), item.category, round(item.cost, 2))
        valid_times = all(re.fullmatch(r"(?:0[89]|1\d|2[01]):[0-5]\d|22:00", item.time) for item in items)
        # Same-price invented venues, omissions and duplicate rows fail identity checks too.
        if not items or not valid_times or Counter(map(signature, items)) != Counter(map(signature, canonical)):
            items = canonical
        else:
            remaining = list(canonical)
            matched = []
            for item in items:
                original = next(p for p in remaining if signature(p) == signature(item))
                remaining.remove(original)
                matched.append(original.model_copy(update={"time": item.time}))
            items = matched
        summary = f"A day exploring {city}, assembled from the specialist agents' suggestions. Start times are suggestions; new-stop durations, travel times and opening hours are unverified."
        items.sort(key=lambda i: i.time)
        total = round(sum(i.cost for i in items), 2)
        return Itinerary(city=city, items=items, total_cost=total, summary=summary)

    def _fallback_items(self, results: dict) -> list[ItineraryItem]:
        """Deterministic timeline used when the planner's assembly output is unusable."""
        items = []
        for s in results["transport"].get("suggestions") or []:
            if isinstance(s, dict):
                items.append(ItineraryItem(time="08:00", title=str(s.get("name", "Transport")),
                                           description=str(s.get("description", "")),
                                           cost=self._to_number(s.get("cost")), category="transport"))
        default_meal_times = {"breakfast": "08:30", "lunch": "13:00", "dinner": "19:30"}
        for m in results["dining"].get("meals") or []:
            if isinstance(m, dict):
                meal = str(m.get("meal", "meal")).lower()
                suggested_time = str(m.get("time") or "")
                if not re.fullmatch(r"(?:0[89]|1\d|2[01]):[0-5]\d|22:00", suggested_time):
                    suggested_time = default_meal_times.get(meal, "12:00")
                items.append(ItineraryItem(time=suggested_time,
                                           title=f"{meal.title()} at {m.get('restaurant', 'a local spot')}",
                                           description=str(m.get("description", "")),
                                           cost=self._to_number(m.get("cost")), category="dining"))
        activity_slots = ["09:30", "11:00", "14:30", "16:30", "21:00"]
        for index, a in enumerate(results["activities"].get("activities") or []):
            slot = activity_slots[index] if index < len(activity_slots) else "21:30"
            if isinstance(a, dict):
                items.append(ItineraryItem(time=slot, title=str(a.get("name", "Activity")),
                                           description=str(a.get("description", "")),
                                           cost=self._to_number(a.get("cost")), category="activity"))
        return items

    def _preserve_locks(self, final, user_input):
        locks = user_input.locked_stops
        names = {s.title.strip().casefold() for s in locks}
        items = []
        for item in sorted(final.items, key=lambda p: p.time):
            if item.title.strip().casefold() in names:
                continue
            time = item.time
            while True:
                conflict = next((s for s in locks if s.time == time or s.time <= time < (s.end_time or s.time)), None)
                if not conflict:
                    break
                if conflict.end_time:
                    time = conflict.end_time
                else:
                    minutes = int(time[:2]) * 60 + int(time[3:]) + 1
                    time = f"{minutes // 60:02}:{minutes % 60:02}"
                if time > "22:00":
                    raise ValueError("New suggestions cannot fit around the locked times. Unlock a stop or adjust your plan.")
            items.append(item.model_copy(update={"time": time}))
        items.extend(ItineraryItem(locked_id=s.id, time=s.time, end_time=s.end_time,
                                   title=s.title, description=s.description, cost=s.cost,
                                   category=s.category) for s in locks)
        items.sort(key=lambda item: item.time)
        total = round(sum(item.cost for item in items), 2)
        if total > round(user_input.budget, 2):
            raise ValueError("The final estimate exceeds your budget. Your previous itinerary is unchanged.")
        return Itinerary(city=final.city, items=items, total_cost=total,
                         summary=final.summary or "Your locked stops are preserved. No budget remains for additional paid suggestions.")
