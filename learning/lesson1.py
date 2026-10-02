vehicle = {
    "make": "Toyota",
    "model": "Corolla",
    "year": 2018,
}

vehicle["price"] = 8500000

print(
    f"{vehicle['year']} {vehicle['make']} {vehicle['model']} "
    f"is listed on AutoTrust for NGN {vehicle['price']:,}."
)

print(vehicle)


def greet_many(greeting, *names):
    for name in names:
        print(f"{greeting} {name}")


greet_many("Hello", "Kayode", "Oyin", "Ayo", "Sade", "Bola")
