import json
import re
from playwright.sync_api import sync_playwright

WOLT_URL = "https://wolt.com/hr/hrv/zagreb/restaurant/mcdonalds-juriieva"

def count_menu_like_items(obj) -> int:
    def get_price_cents(d):
        for k in ["price", "price_cents", "base_price", "basePrice", "basePriceCents"]:
            v = d.get(k)
            if isinstance(v, int):
                return v
        pv = d.get("price")
        if isinstance(pv, dict):
            for kk in ["amount", "value", "cents"]:
                vv = pv.get(kk)
                if isinstance(vv, int):
                    return vv
        return None

    cnt = 0
    stack = [obj]
    while stack:
        x = stack.pop()
        if isinstance(x, dict):
            name = x.get("name")
            price = get_price_cents(x)
            if isinstance(name, str) and name and isinstance(price, int):
                cnt += 1
            stack.extend(x.values())
        elif isinstance(x, list):
            stack.extend(x)
    return cnt

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print("Opening:", WOLT_URL)
        page.goto(WOLT_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(2500)

        input("Ako treba klikni cookies/adresu/captcha u browseru, pa ENTER ovdje...")

        # uzmi __NEXT_DATA__ iz HTML-a
        next_data_text = page.evaluate("""
            () => document.querySelector('#__NEXT_DATA__')?.textContent || null
        """)

        if not next_data_text:
            # fallback: spremi cijeli HTML da možemo ručno naći JSON
            html = page.content()
            with open("page.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("❌ Nema __NEXT_DATA__. Spremio sam page.html – pošalji mi ga.")
            browser.close()
            return

        data = json.loads(next_data_text)

        with open("next_data.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print("✅ Saved: next_data.json")
        print("menu_like_count =", count_menu_like_items(data))

        browser.close()

if __name__ == "__main__":
    main()
