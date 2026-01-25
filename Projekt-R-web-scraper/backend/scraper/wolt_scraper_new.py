import requests
import time
import math
from datetime import date
from urllib.parse import quote_plus

from db import supabase

# -------------------------
# KONFIGURACIJA (Zagreb)
# -------------------------
LAT = 45.8081021057639
LON = 15.9955787658691
CITY_ID = "5bec257863cca509a72ce47c"  # Zagreb

RESTAURANTS_URL = f"https://consumer-api.wolt.com/v1/pages/restaurants?lat={LAT}&lon={LON}"

# Stabilni endpoint (preview ~12 itema)
MENU_URL_TEMPLATE = (
    "https://consumer-api.wolt.com/"
    "consumer-api/venue-content-api/v3/web/venue-content/slug/{}"
)

# Districts endpoint (format: { city_districts: [...] })
DISTRICTS_URL = f"https://restaurant-api.wolt.com/v1/cities/{CITY_ID}/districts"

# Wolt proxy geocoding (autocomplete -> geocode)
AUTOCOMPLETE_URL = (
    "https://consumer-api.wolt.com/v2/google/places/autocomplete/json"
    "?components=country:hrv&input={}&language=hr&radius=100000&types=geocode"
)
GEOCODE_URL = "https://restaurant-api.wolt.com/v1/google/geocode/json?language=hr&place_id={}"

HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "hr-HR,hr;q=0.9",
    "user-agent": "Mozilla/5.0",
    "referer": "https://wolt.com/",
}

TODAY = date.today().isoformat()

# -------------------------
# PAUZE (smanjuju 429)
# -------------------------
SLEEP_BETWEEN_RESTAURANTS = 0.25
SLEEP_BETWEEN_GEOCODE_CALLS = 0.20

# caches
GEOCODE_CACHE = {}
DISTRICTS_CACHE = None
CATEGORY_ID_CACHE = {}


# -------------------------
# UTIL: virtualno mjesto
# -------------------------
def is_virtual_place(address: str | None) -> bool:
    return bool(address) and ("virtualno" in address.lower())


# -------------------------
# KATEGORIJE
# -------------------------
def map_section_to_category(section_name: str) -> str:
    """Ako sekcija jasno opisuje tip, koristi to."""
    s = (section_name or "").lower()

    if any(k in s for k in ["pić", "pice", "drink", "beverage", "sok", "vino", "pivo", "kava", "čaj", "caj"]):
        return "Piće"
    if "salat" in s:
        return "Salate"
    if any(k in s for k in ["prilog", "side", "pomfrit", "krumpir", "umak", "sos", "dip", "krumpirići"]):
        return "Prilozi"
    if any(k in s for k in ["desert", "dessert", "kolač", "kolac", "torta", "slatko", "palač", "palac", "sladoled",
                            "nutella", "lino", "lino lada", "voće", "voce"]):
        return "Desert"

    return "Glavno jelo"


def map_item_to_category(section_name: str, item_name: str) -> str:
    """
    Combo-aware pravilo s prioritetima:
    - ako sekcija jasno kaže Piće/Salate/Prilozi/Desert -> uzmi to
    - inače (generic sekcije) odluči po imenu itema:
      Glavno jelo > Salate > Prilozi > Piće > Desert
    """
    sec_cat = map_section_to_category(section_name)
    if sec_cat != "Glavno jelo":
        return sec_cat

    s = (item_name or "").lower()

    # GLAVNO JELO (prioritet)
    main_kw = [
        "menu", "meni", "combo", "obrok", "meal", "box", "bucket",
        "odrezak", "bečki", "becki", "pohano", "pohana", "šnicl", "snicl",
        "pilet", "file", "batak", "krilc",
        "burger", "pizza", "sendvič", "sendvic", "wrap", "tortil", "burrito",
        "kebab", "ćevap", "cevap", "pljeskavic", "steak", "ramstek",
        "tjesten", "pasta", "rižot", "rizot", "gulaš", "gulas", "lasagn", "+"
    ]

    drink_kw = [
        "coca", "cola", "fanta", "sprite", "voda", "sok", "juice",
        "pivo", "vino", "kava", "espresso", "latte", "cappuccino", "čaj", "caj",
        "tonic", "red bull", "energets", "iced"
    ]

    side_kw = ["pomfrit", "krumpir", "prilog", "side", "umak", "sos", "dip", "ketchup", "majonez"]
    salad_kw = ["salat"]
    dessert_kw = [
        "sladoled", "kolač", "kolac", "torta", "dessert", "desert", "palač", "palac",
        "brownie", "muffin", "cookie",
        "nutella", "lino lada", "lino", "voće", "voce", "čokolad", "cokolad", "namaz", "cake"
    ]

    has_main = any(k in s for k in main_kw)
    has_drink = any(k in s for k in drink_kw)
    has_side = any(k in s for k in side_kw)
    has_salad = any(k in s for k in salad_kw)
    has_dessert = any(k in s for k in dessert_kw)

    # 1) Glavno jelo ako ima signal glavnog jela (čak i ako spominje colu/krumpir)
    if has_main:
        return "Glavno jelo"

    # 2) Ako je kombo (ima "+") i sadrži piće/prilog -> glavno jelo (osim ako je očito samo piće)
    if "+" in s and (has_drink or has_side):
        if has_drink and not has_side and not has_salad and not has_dessert and not has_main:
            return "Piće"
        return "Glavno jelo"

    # 3) Salate / Desert
    if has_salad:
        return "Salate"
    if has_dessert:
        return "Desert"

    # 4) Prilozi
    if has_side and not has_drink:
        return "Prilozi"

    # 5) Piće
    if has_drink:
        return "Piće"

    return "Glavno jelo"


def get_category_id_by_name(cat_name: str):
    """Tolerantno: exact pa ILIKE."""
    if cat_name in CATEGORY_ID_CACHE:
        return CATEGORY_ID_CACHE[cat_name]

    res = supabase.table("category").select("category_id").eq("name", cat_name).execute()
    if res.data:
        cid = res.data[0]["category_id"]
        CATEGORY_ID_CACHE[cat_name] = cid
        return cid

    res2 = supabase.table("category").select("category_id").ilike("name", cat_name).execute()
    cid = res2.data[0]["category_id"] if res2.data else None
    CATEGORY_ID_CACHE[cat_name] = cid
    return cid


# -------------------------
# KVARTOVI (districts)
# -------------------------
def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def fetch_districts():
    global DISTRICTS_CACHE
    if DISTRICTS_CACHE is not None:
        return DISTRICTS_CACHE

    res = requests.get(DISTRICTS_URL, headers=HEADERS, timeout=30)
    res.raise_for_status()
    data = res.json()

    districts = []
    arr = data.get("city_districts") if isinstance(data, dict) else None
    if isinstance(arr, list):
        for d in arr:
            if not isinstance(d, dict):
                continue
            name = d.get("name")
            loc = d.get("location")
            if isinstance(name, str) and isinstance(loc, list) and len(loc) == 2:
                lon, lat = loc[0], loc[1]
                if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                    districts.append({"name": name, "lat": float(lat), "lon": float(lon)})

    DISTRICTS_CACHE = districts
    print(f"Učitano districts: {len(districts)}")
    return districts


def nearest_district(lat: float, lon: float, districts: list) -> str | None:
    if not districts:
        return None
    best_name = None
    best_dist = 1e18
    for d in districts:
        dist = haversine_km(lat, lon, d["lat"], d["lon"])
        if dist < best_dist:
            best_dist = dist
            best_name = d["name"]
    return best_name


# -------------------------
# GEOCODE (adresa -> lat/lon)
# -------------------------
def geocode_address(address: str) -> tuple[float, float] | None:
    if not address:
        return None

    key = address.strip().lower()
    if key in GEOCODE_CACHE:
        return GEOCODE_CACHE[key]

    q = quote_plus(address)
    r = requests.get(AUTOCOMPLETE_URL.format(q), headers=HEADERS, timeout=30)
    if r.status_code != 200:
        GEOCODE_CACHE[key] = None
        return None

    j = r.json()
    preds = j.get("predictions", [])
    if not preds:
        GEOCODE_CACHE[key] = None
        return None

    place_id = preds[0].get("place_id")
    if not place_id:
        GEOCODE_CACHE[key] = None
        return None

    time.sleep(SLEEP_BETWEEN_GEOCODE_CALLS)

    g = requests.get(GEOCODE_URL.format(place_id), headers=HEADERS, timeout=30)
    if g.status_code != 200:
        GEOCODE_CACHE[key] = None
        return None

    gj = g.json()
    results = gj.get("results", [])
    if not results:
        GEOCODE_CACHE[key] = None
        return None

    loc = results[0].get("geometry", {}).get("location", {})
    lat = loc.get("lat")
    lon = loc.get("lng") or loc.get("lon")

    if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
        GEOCODE_CACHE[key] = (float(lat), float(lon))
        return GEOCODE_CACHE[key]

    GEOCODE_CACHE[key] = None
    return None


# -------------------------
# WOLT: restorani + meni
# -------------------------
def fetch_restaurants():
    res = requests.get(RESTAURANTS_URL, headers=HEADERS, timeout=30)
    res.raise_for_status()
    data = res.json()

    restaurants = []
    for section in data.get("sections", []):
        for item in section.get("items", []):
            venue = item.get("venue")
            if not venue:
                continue

            name = venue.get("name")
            slug = venue.get("slug")
            city = venue.get("city") or "Zagreb"
            address = venue.get("address") or venue.get("street_address")

            if not name or not slug:
                continue
            if is_virtual_place(address):
                continue

            restaurants.append({
                "name": name,
                "slug": slug,
                "city": city,
                "address": address
            })

    return restaurants


def fetch_menu(slug):
    url = MENU_URL_TEMPLATE.format(slug)
    res = requests.get(url, headers=HEADERS, timeout=30)
    res.raise_for_status()
    return res.json()


# -------------------------
# SUPABASE upis
# -------------------------
def upsert_restaurant(name, slug, city, address, quarter: str | None):
    location_value = address or city
    payload = {
        "name": name,
        "type": "restaurant",
        "slug": slug,
        "location": location_value,
    }
    if quarter:
        payload["quarter"] = quarter

    supabase.table("restaurant").upsert(payload, on_conflict="slug").execute()
    row = supabase.table("restaurant").select("rest_id").eq("slug", slug).single().execute()
    return row.data["rest_id"]


def get_or_create_item(name, rest_id, category_id, item_type):
    """
    Prepisuje kategoriju ako je krivo postavljena.
    """
    res = (
        supabase.table("item")
        .select("item_id, category_id, type")
        .eq("name", name)
        .eq("rest_id", rest_id)
        .execute()
    )
    if res.data:
        item_id = res.data[0]["item_id"]
        existing_cat = res.data[0].get("category_id")
        existing_type = res.data[0].get("type")

        updates = {}
        if category_id is not None and existing_cat != category_id:
            updates["category_id"] = category_id
        if item_type and existing_type != item_type:
            updates["type"] = item_type

        if updates:
            supabase.table("item").update(updates).eq("item_id", item_id).execute()

        return item_id

    ins = supabase.table("item").insert({
        "name": name,
        "type": item_type,
        "category_id": category_id,
        "rest_id": rest_id
    }).execute()
    return ins.data[0]["item_id"]


def upsert_prices_bulk(price_rows):
    if not price_rows:
        return
    supabase.table("price").upsert(
        price_rows,
        on_conflict="rest_id,item_id,date,source",
        ignore_duplicates=True
    ).execute()


# -------------------------
# MAIN
# -------------------------
def main():
    districts = fetch_districts()
    restaurants = fetch_restaurants()
    print(f"Restorana (bez virtualnih): {len(restaurants)}")

    for i, r in enumerate(restaurants, start=1):
        name = r["name"]
        slug = r["slug"]
        city = r["city"]
        address = r.get("address")
        location_value = address or city

        quarter = None
        if address:
            coords = geocode_address(f"{address}, Zagreb")
            if coords:
                quarter = nearest_district(coords[0], coords[1], districts)

        print(f"\n[{i}/{len(restaurants)}] ➡ {name} | slug={slug}")
        print(f"    📍 location: {location_value}")
        print(f"    🧭 quarter: {quarter or '(nije odreden)'}")

        rest_id = upsert_restaurant(name, slug, city, address, quarter)

        try:
            menu = fetch_menu(slug)
        except Exception:
            print("    ❌ Ne mogu dohvatiti meni (venue-content)")
            time.sleep(SLEEP_BETWEEN_RESTAURANTS)
            continue

        price_rows = []
        items_count = 0

        for section in menu.get("sections", []):
            section_name = section.get("name", "")

            for it in section.get("items", []):
                item_name = it.get("name")
                price_cents = it.get("price")
                if not item_name or price_cents is None:
                    continue

                cat_name = map_item_to_category(section_name, item_name)
                category_id = get_category_id_by_name(cat_name)
                item_type = "drink" if cat_name == "Piće" else "food"

                item_id = get_or_create_item(item_name, rest_id, category_id, item_type)

                price_rows.append({
                    "date": TODAY,
                    "value": price_cents / 100.0,
                    "source": "scraper",
                    "item_id": item_id,
                    "rest_id": rest_id,
                    "user_id": None
                })
                items_count += 1

        upsert_prices_bulk(price_rows)
        print(f"    ✔ stavki: {items_count} | upisano cijena: {len(price_rows)}")

        time.sleep(SLEEP_BETWEEN_RESTAURANTS)


if __name__ == "__main__":
    main()
