import requests
import time

# -------------------------
# KONFIGURACIJA
# -------------------------
LAT = 45.8081021057639   # Zagreb
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


# -------------------------
# 1. DOHVAT RESTORANA
# -------------------------
def fetch_restaurants():
    res = requests.get(RESTAURANTS_URL, headers=HEADERS)
    res.raise_for_status()
    data = res.json()

    restaurants = []

    sections = data.get("sections", [])
    for section in sections:
        for item in section.get("items", []):
            venue = item.get("venue")
            if not venue:
                continue

            restaurants.append({
                "name": venue.get("name"),
                "slug": venue.get("slug"),
                "city": venue.get("city")
            })

    return restaurants


# -------------------------
# 2. DOHVAT MENIJA
# -------------------------
def fetch_menu(slug):
    url = MENU_URL_TEMPLATE.format(slug)
    res = requests.get(url, headers=HEADERS)
    res.raise_for_status()
    return res.json()


# -------------------------
# 3. GLAVNA LOGIKA
# -------------------------
def main():
    restaurants = fetch_restaurants()
    print(f"Pronađeno restorana: {len(restaurants)}\n")

    for r in restaurants:
        print(f"{r['name']} | {r['city']}")

        try:
            menu = fetch_menu(r["slug"])
        except Exception as e:
            print("  Greška pri dohvaćanju menija")
            continue

        for section in menu.get("sections", []):
            for item in section.get("items", []):
                name = item.get("name")
                price_cents = item.get("price")

                if price_cents is None:
                    continue

                price = price_cents / 100
                print(f"  - {name}: {price:.2f} €")

        print("-" * 50)

        # mali delay da ne spamamo API
        time.sleep(0.5)


if __name__ == "__main__":
    main()
