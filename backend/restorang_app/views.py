from django.http import JsonResponse
from django.shortcuts import render
from restorang import settings
from . import helpers

supabase = settings.supabase

import os

# Create your views here.


def multiply_numbers(request):
    result = ""
    context = None
    code = 0
    if request.method =='GET':
        response = supabase.table('restaurant').select('*').execute()
        code = 1
        context = {
                    "items": response.data or [],
                    "code": code,
                    "googleapi": os.getenv("GOOGLE_MAPS_API_KEY"),
                    "error": None
                }
    if request.method == 'POST':
        select_arg = request.POST.get('select-arg')
        select_type = request.POST.get('select-type')
        try:
            if select_type == "option1":
                response = supabase.table('item').select('name, price(value)').ilike('name', "%"+select_arg+"%").execute() 
                code = 2                   
            elif select_type == "option2":
                response = supabase.table('restaurant').select('*').ilike('name', "%"+select_arg+"%").execute()
                code = 3
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
                    "code": code,
                    "googleapi": os.getenv("GOOGLE_MAPS_API_KEY"),
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

    


def fetch_all_restaurants(request):
    context = None
    try:
        response = supabase.table('restaurant').select('*').execute()                    
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
    return JsonResponse(context)

def get_rest_id_by_name(request):
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
    return JsonResponse(context)

def get_restaurant_by_id(request):
    context = None
    if request.method == 'POST':
        rest_id = request.POST.get('rest_id')
        try:
            response = supabase.table('restaurant').select('*').eq('rest_id', rest_id).execute()
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
    return JsonResponse(context)

def fetch_all_restaurants_by_type(request):
    context = None
    try:
        restaurant_type = request.GET.get('type') or request.POST.get('type')
        
        if not restaurant_type:
            return JsonResponse({
                "restaurants": [],
                "error": "Restaurant type is required"
            })
        
        response = supabase.table('restaurant').select('*').ilike('type', "%"+restaurant_type+"%").execute()                    
        
        if response.data:
            context = {
                "restaurants": response.data or [],
                "error": None
            }
        else:
            context = {
                "restaurants": [],
                "error": "No restaurants found of this type"
            }
    except Exception as e:
        print("Error fetching data:", e)
        context = {
            "restaurants": [],
            "error": f"Error fetching data: {str(e)}"
        }
    
    return JsonResponse(context)

def fetch_all_restaurant_types(request):
    context = None
    try:
        response = supabase.table('restaurant').select('type', count='distinct').execute()                    
        
        if response.data:
            context = {
                "types": [item['type'] for item in response.data] or [],
                "error": None
            }
        else:
            context = {
                "types": [],
                "error": "No restaurant types found"
            }
    except Exception as e:
        print("Error fetching data:", e)
        context = {
            "types": [],
            "error": f"Error fetching data: {str(e)}"
        }
    
    return JsonResponse(context)

def fetch_all_restaurants_by_quarter(request):
    context = None
    try:
        quarter = request.GET.get('quarter') or request.POST.get('quarter')
        
        if not quarter:
            return JsonResponse({
                "restaurants": [],
                "error": "Quarter is required"
            })
        
        response = supabase.table('restaurant').select('*').ilike('quarter', "%"+quarter+"%").execute()                    
        
        if response.data:
            context = {
                "restaurants": response.data or [],
                "error": None
            }
        else:
            context = {
                "restaurants": [],
                "error": "No restaurants found in this quarter"
            }
    except Exception as e:
        print("Error fetching data:", e)
        context = {
            "restaurants": [],
            "error": f"Error fetching data: {str(e)}"
        }
    
    return JsonResponse(context)

def get_menu_by_rest_id(request):
    context = None
    try:
        restaurant_id = request.GET.get('rest_id') or request.POST.get('rest_id')
        
        if not restaurant_id:
            return JsonResponse({
                "items": [],
                "error": "Restaurant ID is required"
            })
        
        # Fetch all items for the restaurant
        items_response = supabase.table('item').select('*').eq('rest_id', restaurant_id).execute()
        
        if items_response.data:
            # For each item, fetch its prices
            items_with_prices = []
            for item in items_response.data:
                category_response = supabase.table('category').select('name').eq('category_id', item['category_id']).execute()
                prices_response = supabase.table('price').select('*').eq('item_id', item['item_id']).execute()
                
                item_data = {
                    **item,
                    "prices": prices_response.data or [],
                    "category_name": category_response.data[0]['name'] if category_response.data else None
                }
                items_with_prices.append(item_data)
            
            context = {
                "items": items_with_prices,
                "error": None
            }
        else:
            context = {
                "items": [],
                "error": "No items found for this restaurant"
            }
    except Exception as e:
        print("Error fetching data:", e)
        context = {
            "items": [],
            "error": f"Error fetching data: {str(e)}"
        }
    
    return JsonResponse(context)

def get_item_price_history(request):
    context = None
    try:
        # Get item_id from request
        item_id = request.GET.get('item_id') or request.POST.get('item_id')
        
        if not item_id:
            return JsonResponse({
                "prices": [],
                "error": "Item ID is required"
            })
        
        # Fetch all prices for the item, ordered by date descending
        prices_response = supabase.table('price').select('*').eq('item_id', item_id).order('date', desc=True).execute()
        
        if prices_response.data:
            context = {
                "prices": prices_response.data or [],
                "error": None
            }
        else:
            context = {
                "prices": [],
                "error": "No price history found for this item"
            }
    except Exception as e:
        print("Error fetching data:", e)
        context = {
            "prices": [],
            "error": f"Error fetching data: {str(e)}"
        }
    
    return JsonResponse(context)


# just for displaying html pages for testing
def item_price_history(request):
    return render(request, 'item_price_history.html')

def items_by_restaurant(request):
    return render(request, 'items_by_restaurant.html')
