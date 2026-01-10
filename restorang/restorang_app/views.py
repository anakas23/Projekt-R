from django.shortcuts import render
from django.http import HttpResponse
from supabase import create_client, Client
import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "") # ne zelin javno stavljat url i key
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") # mozete kopirat iz project settings > url iz "data api" i secret key iz "api keys"

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def multiply_numbers(request):
    result = ""
    context = None
    if request.method == 'POST':
        select_arg = request.POST.get('select-arg')
        select_type = request.POST.get('select-type')
        try:
            if select_type == "option1":
                response = supabase.table('item').select('name, price(value)').ilike('name', "%"+select_arg+"%").execute()                    
            elif select_type == "option2":
                response = supabase.table('restaurant').select('*').ilike('name', "%"+select_arg+"%").execute()
            else: 
                response = supabase.table("price").insert({
                    "price_id": request.POST.get('insert-id'),
                    "date": request.POST.get('insert-date'),
                    "value": request.POST.get('insert-value'),
                    "source": request.POST.get('insert-source'),
                    "item_id": request.POST.get('item-id'),
                    "rest_id": request.POST.get('rest-id'),
                }).execute()
            if response.data:
                for item in response.data:
                    pricestring = str(item["price"])
                    pricechar = ""
                    for ch in pricestring:
                        if ch=='.' or ch.isdigit():
                            pricechar+=ch
                    item["price"] = pricechar
                context = {
                    "items": response.data or [],
                    "error": None
                }
            if not response.data:
                context["error"] = "No matches found for your search."
        except Exception as e:
            print("Error fetching data:", e)


        except Exception as e:
            result+="zamisli ne bit preekstra"
            print("Error fetching data:", e)
    return render(request,'home.html', context)

    


