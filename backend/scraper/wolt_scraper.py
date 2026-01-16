import requests
import json

url = "https://consumer-api.wolt.com/consumer-api/venue-content-api/v3/web/venue-content/slug/umami-branimir-mingle-mall"

headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7,bs;q=0.6",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "referer": "https://wolt.com/hr/en/cro/gradovi/zagreb/umami-branimir-mingle-mall",
    # Ostali headeri po potrebi, ali ovaj minimum bi trebao funkcionirati
}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    # Za demonstraciju, ispisat ćemo imena jela i cijene
    items = data.get("sections", [])
    for section in items:
        if "items" in section:
            for item in section["items"]:
                name = item.get("name")
                price_cents = item.get("price")  # cijena u centima (npr. 1030 = 10.30 kn)
                price = price_cents / 100 if price_cents else None
                print(f"{name}: {price} HRK")
else:
    print(f"Greška prilikom dohvaćanja: {response.status_code}")
