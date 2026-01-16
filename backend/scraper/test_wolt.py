from wolt_client import fetch_menu

data = fetch_menu(
    slug="pizzeria-karijola",
    lat=45.815399,
    lng=15.966568
)

print(data)
