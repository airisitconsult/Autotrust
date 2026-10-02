# import json
# from dataclasses import asdict, dataclass
# from enum import Enum
# from pathlib import Path


# class VehicleCondition(Enum):
#     EXCELLENT = "Excellent"
#     GOOD = "Good"
#     FAIR = "Fair"
#     POOR = "Poor"


# @dataclass
# class Vehicle:
#     make: str
#     model: str
#     year: int
#     mileage_km: int
#     asking_price: float

#     def display_name(self) -> str:
#         return f"{self.year} {self.make} {self.model}"

#     def age(self, current_year: int = 2026) -> int:
#         return current_year - self.year

#     @staticmethod
#     def from_dict(data: dict) -> "Vehicle":
#         return Vehicle(
#             make=data["make"],
#             model=data["model"],
#             year=int(data["year"]),
#             mileage_km=int(data["mileage_km"]),
#             asking_price=float(data["asking_price"]),
#         )


# @dataclass
# class InspectionReport:
#     vehicle: Vehicle
#     engine_score: int
#     body_score: int
#     interior_score: int
#     tire_score: int
#     notes: str

#     def average_score(self) -> float:
#         total = self.engine_score + self.body_score + self.interior_score + self.tire_score
#         return total / 4

#     def condition(self) -> VehicleCondition:
#         score = self.average_score()

#         if score >= 85:
#             return VehicleCondition.EXCELLENT
#         if score >= 70:
#             return VehicleCondition.GOOD
#         if score >= 50:
#             return VehicleCondition.FAIR
#         return VehicleCondition.POOR

#     def is_certified(self) -> bool:
#         return self.average_score() >= 70

#     def estimated_market_price(self) -> float:
#         base_price = self.vehicle.asking_price
#         age_penalty = self.vehicle.age() * 0.025
#         mileage_penalty = self.vehicle.mileage_km / 1_000_000
#         condition_bonus = self.average_score() / 100

#         multiplier = condition_bonus - age_penalty - mileage_penalty
#         multiplier = max(multiplier, 0.45)

#         return base_price * multiplier

#     def summary(self) -> str:
#         certified_text = "CERTIFIED" if self.is_certified() else "NOT CERTIFIED"

#         return (
#             "\nAutoTrust Inspection Report\n"
#             f"Vehicle: {self.vehicle.display_name()}\n"
#             f"Mileage: {self.vehicle.mileage_km:,} km\n"
#             f"Asking Price: NGN {self.vehicle.asking_price:,.2f}\n"
#             f"Average Score: {self.average_score():.1f}/100\n"
#             f"Condition: {self.condition().value}\n"
#             f"Status: {certified_text}\n"
#             f"Estimated Market Price: NGN {self.estimated_market_price():,.2f}\n"
#             f"Inspector Notes: {self.notes}\n"
#         )

#     def to_dict(self) -> dict:
#         data = asdict(self)
#         data["condition"] = self.condition().value
#         data["average_score"] = self.average_score()
#         data["is_certified"] = self.is_certified()
#         data["estimated_market_price"] = self.estimated_market_price()
#         return data

#     @staticmethod
#     def from_dict(data: dict) -> "InspectionReport":
#         return InspectionReport(
#             vehicle=Vehicle.from_dict(data["vehicle"]),
#             engine_score=int(data["engine_score"]),
#             body_score=int(data["body_score"]),
#             interior_score=int(data["interior_score"]),
#             tire_score=int(data["tire_score"]),
#             notes=data["notes"],
#         )


# class FileDatabase:
#     def __init__(self, file_path: str):
#         self.file_path = Path(file_path)

#     def load_reports(self) -> list[InspectionReport]:
#         if not self.file_path.exists():
#             return []

#         with self.file_path.open("r", encoding="utf-8") as file:
#             data = json.load(file)

#         return [InspectionReport.from_dict(item) for item in data]

#     def save_reports(self, reports: list[InspectionReport]):
#         data = [report.to_dict() for report in reports]

#         with self.file_path.open("w", encoding="utf-8") as file:
#             json.dump(data, file, indent=2)


# class AutoTrustConsoleApp:
#     def __init__(self):
#         db_path = Path(__file__).with_name("autotrust_db.json")
#         self.database = FileDatabase(str(db_path))
#         self.reports = self.database.load_reports()

#     def run(self):
#         while True:
#             self.show_menu()
#             choice = input("Choose an option: ").strip()

#             if choice == "1":
#                 self.create_report()
#             elif choice == "2":
#                 self.list_reports()
#             elif choice == "3":
#                 print("Goodbye.")
#                 break
#             else:
#                 print("Invalid option. Try again.")

#     def show_menu(self):
#         print("\n=== AutoTrust Python OOP Console ===")
#         print("1. Create inspection report")
#         print("2. View reports")
#         print("3. Exit")

#     def create_report(self):
#         print("\nEnter vehicle details")
#         make = input("Make: ").strip()
#         model = input("Model: ").strip()
#         year = self.read_int("Year: ")
#         mileage_km = self.read_int("Mileage in km: ")
#         asking_price = self.read_float("Asking price in NGN: ")

#         print("\nEnter inspection scores from 0 to 100")
#         engine_score = self.read_score("Engine score: ")
#         body_score = self.read_score("Body score: ")
#         interior_score = self.read_score("Interior score: ")
#         tire_score = self.read_score("Tire score: ")
#         notes = input("Inspector notes: ").strip()

#         vehicle = Vehicle(make, model, year, mileage_km, asking_price)
#         report = InspectionReport(
#             vehicle,
#             engine_score,
#             body_score,
#             interior_score,
#             tire_score,
#             notes,
#         )

#         self.reports.append(report)
#         self.database.save_reports(self.reports)
#         print(report.summary())
#         print("Report saved to autotrust_db.json.")

#     def list_reports(self):
#         if not self.reports:
#             print("\nNo reports yet.")
#             return

#         for index, report in enumerate(self.reports, start=1):
#             print(f"\nReport #{index}")
#             print(report.summary())

#     def read_int(self, prompt: str) -> int:
#         while True:
#             try:
#                 return int(input(prompt))
#             except ValueError:
#                 print("Enter a whole number.")

#     def read_float(self, prompt: str) -> float:
#         while True:
#             try:
#                 return float(input(prompt))
#             except ValueError:
#                 print("Enter a valid amount.")

#     def read_score(self, prompt: str) -> int:
#         while True:
#             score = self.read_int(prompt)
#             if 0 <= score <= 100:
#                 return score
#             print("Score must be between 0 and 100.")


# if __name__ == "__main__":
#     app = AutoTrustConsoleApp()
#     app.run()


class animal():
    def __init__(self, name, type):
        self.name = name
        self.type = type


dog = animal("Dog", "Mammal")

print(f"{dog.name} is a {dog.type}.")