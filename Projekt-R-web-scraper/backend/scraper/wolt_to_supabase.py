import requests
import time
from datetime import date
from db import supabase

# -------------------------
# KONFIGURACIJA
# -------------------------
LAT = 45.8081021057639
LON = 15.9955787658691

RESTAURANTS_URL = (
    f"https://consumer-api.wolt.com/v1/pages/restaurants"
    f"?lat={LAT}&lon={LON}"
)

MENU_URL_TEMPLATE = (
    "https://consumer-api.wolt.com/"
    "consumer-api/venue-content-api/v3/web/venue-content/slug/{}"
)

HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
    "user-agent": "Mozilla/5.0"
}

TODAY = date.today().isoformat()

# -------------------------
# API FETCH
# -------------------------
def fetch_restaurants():
    res = requests.get(RESTAURANTS_URL, headers=HEADERS)
    res.raise_for_status()
    data = res.json()

    restaurants = []

    for section in data.get("sections", []):
        for item in section.get("items", []):
            venue = item.get("venue")
            if venue:
                restaurants.append({
                    "name": venue.get("name"),
                    "slug": venue.get("slug"),
                    "city": venue.get("city")
                })

    return restaurants


def fetch_menu(slug):
    url = MENU_URL_TEMPLATE.format(slug)
    res = requests.get(url, headers=HEADERS)
    res.raise_for_status()
    return res.json()

# -------------------------
# SUPABASE HELPERS
# -------------------------
def get_or_create_restaurant(name, city):
    res = supabase.table("restaurant") \
        .select("rest_id") \
        .eq("name", name) \
        .execute()

    if res.data:
        return res.data[0]["rest_id"]

    insert = supabase.table("restaurant").insert({
        "name": name,
        "type": "restaurant",
        "location": city
    }).execute()

    return insert.data[0]["rest_id"]


def get_or_create_item(name, rest_id):
    res = supabase.table("item") \
        .select("item_id") \
        .eq("name", name) \
        .eq("rest_id", rest_id) \
        .execute()

    if res.data:
        return res.data[0]["item_id"]

    insert = supabase.table("item").insert({
        "name": name,
        "type": "food",
        "category_id": None,
        "rest_id": rest_id
    }).execute()

    return insert.data[0]["item_id"]



def insert_price(item_id, rest_id, price):
    supabase.table("price").insert({
        "date": TODAY,
        "value": price,
        "source": "scraper",
        "item_id": item_id,
        "rest_id": rest_id,
        "user_id": None
    }).execute()

# -------------------------
# MAIN
# -------------------------
def main():
    restaurants = fetch_restaurants()
    print(f"Restorana pronađeno: {len(restaurants)}")

    for r in restaurants:
        print(f"\n➡ {r['name']} ({r['city']})")

        rest_id = get_or_create_restaurant(r["name"], r["city"])

        try:
            menu = fetch_menu(r["slug"])
        except Exception:
            print("  ❌ Ne mogu dohvatiti meni")
            continue

        for section in menu.get("sections", []):
            for item in section.get("items", []):
                name = item.get("name")
                price_cents = item.get("price")

                if not name or price_cents is None:
                    continue

                price = price_cents / 100
                item_id = get_or_create_item(name, rest_id)
                insert_price(item_id, rest_id, price)

                print(f"  ✔ {name} – {price:.2f} €")

        time.sleep(0.5)


if __name__ == "__main__":
    main()
