import json
import unittest
from pydantic import ValidationError
from models import UserInput, Itinerary, ItineraryItem
from message_bus import MessageBus
from orchestrator import Orchestrator
from test_workflow import fixture

LOCK = {"id":"tea","title":"Reserved tea","time":"17:00","end_time":"18:00","cost":32,"description":"Keep this reservation","category":"activity"}

class LockedPlansTests(unittest.IsolatedAsyncioTestCase):
    async def test_backend_reserves_cost_and_restores_lock_exactly(self):
        bus=MessageBus();agents=fixture(bus,activity_cost=20)
        result=json.loads(await Orchestrator(agents,bus).run(UserInput(city="Tokyo",budget=100,locked_stops=[LOCK])))
        lock=next(i for i in result["items"] if i["locked_id"]=="tea")
        self.assertEqual(lock,{"venue":None,"locked_id":"tea","time":"17:00","end_time":"18:00","cost":32.0,"title":"Reserved tea","description":"Keep this reservation","category":"activity"})
        self.assertEqual(result["total_cost"],92)
        for name in ("transport","dining","activities"):
            self.assertIn("remaining $68.00",agents[name].calls[0])
        self.assertEqual(bus.log[-1].metadata["locked_count"],1)

    async def test_no_model_calls_when_locked_stops_use_the_budget(self):
        bus=MessageBus()
        result=json.loads(await Orchestrator({},bus).run(UserInput(city="Tokyo",budget=32,locked_stops=[LOCK])))
        self.assertEqual(result["total_cost"],32)
        self.assertEqual(len(result["items"]),1)

    async def test_same_price_invention_does_not_pass_assembly(self):
        bus=MessageBus()
        result=json.loads(await Orchestrator(fixture(bus,assembly={"items":[{"time":"09:00","title":"Invented tour","cost":80,"category":"activity"}]}),bus).run(UserInput(city="Tokyo",budget=100)))
        self.assertNotIn("Invented tour",[i["title"] for i in result["items"]])
        self.assertEqual(len(result["items"]),3)

    async def test_sixth_activity_is_not_dropped_and_bad_meal_time_is_repaired(self):
        results={"transport":{"suggestions":[]},"dining":{"meals":[{"meal":"lunch","time":"29:99","restaurant":"Cafe","cost":5}]},"activities":{"activities":[{"name":f"Activity {i}","cost":1} for i in range(6)]}}
        result=Orchestrator({},MessageBus())._build_itinerary("Tokyo",{},results)
        self.assertEqual(len(result.items),7)
        self.assertEqual(result.total_cost,11)
        self.assertEqual(next(i for i in result.items if i.category=="dining").time,"13:00")

    async def test_locked_window_moves_new_start_and_point_lock_is_respected(self):
        workflow=Orchestrator({},MessageBus())
        source=Itinerary(city="Tokyo",items=[ItineraryItem(time="17:30",title="Museum",cost=5,category="activity")],total_cost=5)
        result=workflow._preserve_locks(source,UserInput(city="Tokyo",budget=100,locked_stops=[LOCK]))
        self.assertEqual(next(i for i in result.items if not i.locked_id).time,"18:00")
        point={**LOCK,"end_time":""}
        source.items[0].time="17:00"
        result=workflow._preserve_locks(source,UserInput(city="Tokyo",budget=100,locked_stops=[point]))
        self.assertEqual(next(i for i in result.items if not i.locked_id).time,"17:01")

class LockValidationTests(unittest.TestCase):
    def test_invalid_locks_fail_before_generation(self):
        for locks,budget in [([LOCK],20),([LOCK,LOCK],100),([{**LOCK,"time":"25:00"}],100),([{**LOCK,"end_time":"16:00"}],100),([LOCK,{**LOCK,"id":"second","time":"17:30","end_time":"19:00"}],100)]:
            with self.subTest(locks=locks),self.assertRaises(ValidationError):
                UserInput(city="Tokyo",budget=budget,locked_stops=locks)
