from restorang import settings
supabase = settings.supabase

def restIdByName(rest_name):
    rest_id = supabase.table('restaurant').select('rest_id').ilike('rest_name', rest_name).execute()                    
    return rest_id

def restTypeById(rest_id):
    rest_type = supabase.table('restaurant').select('type').eq('rest_id', rest_id).execute()                    
    return rest_type

def priceByItemIdAndRestId(item_id, rest_id):
    price = supabase.table('price').select('value').eq('item_id', item_id).eq('rest_id', rest_id).execute()                    
    return price


    
def updatePrice(price_id, new_value):
    
    response = supabase.table('price').update({'value': new_value}).eq('price_id', price_id).execute()
    return response