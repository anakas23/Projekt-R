#test wolt client
import requests
from wolt_queries import MENU_QUERY

WOLT_URL = "https://restaurant-api.wolt.com/v1/graphql"

def fetch_menu(slug, lat, lng):
    payload = {
        "query": MENU_QUERY,
        "variables": {
            "slug": slug,
            "lat": lat,
            "lng": lng
        }
    }

    r = requests.post(WOLT_URL, json=payload)
    r.raise_for_status()
    return r.json()
