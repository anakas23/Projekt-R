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
    if request.method == 'POST':
        select_arg = request.POST.get('select-arg')
        select_type = request.POST.get('select-type')
        try:
            if select_type == "option1":
                response = supabase.table('item').select('*').ilike('name', "%"+select_arg+"%").execute()
            else:
                response = supabase.table('restaurant').select('*').ilike('name', "%"+select_arg+"%").execute()
            if response.data:
                    for row in response.data:
                        strow = str(row)
                        result += strow

        except Exception as e:
            result+="zamisli ne bit preekstra"
            print("Error fetching data:", e)
    return render(request,'home.html', {'result': result})

    
