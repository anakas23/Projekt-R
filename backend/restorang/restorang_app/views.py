from django.shortcuts import render
from restorang import settings
from . import helpers

supabase = settings.supabase

import os

# Create your views here.


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

    

def promjena_cijene(request):
    if request.method == 'POST':
        try:
            supabase.table("pricereport").insert({
                "report_id": request.POST.get('report_id'),
                "status": request.POST.get('status'),
                "price": request.POST.get('price'),
                "report_date": request.POST.get('report_date'),
                "item_id": request.POST.get('item_id'),
                "rest_id": request.POST.get('rest_id'),
                "user_id": request.POST.get('user_id')
            }).execute()
        except Exception as e:
            print("Error inserting data:", e)
    return render(request,'pom.html')


def restIdByName(request):
    context = None
    if request.method == 'POST':
        select_name = request.POST.get('select-name')
        try:
            response = supabase.table('restaurant').select('rest_id').ilike('name', "%"+select_name+"%").execute()                    
            if response.data:
                print(response.data)
                context = {
                    "items": response.data or [],
                    "error": None
                }
            if not response.data:
                context["error"] = "No matches found for your search."
        except Exception as e:
            print("Error fetching data:", e)
    return render(request,'restid.html', context)