from django.urls import path

from . import views

urlpatterns = [
    path("", views.multiply_numbers, name="index"),
    # path("promjena_cijene/", views.promjena_cijene, name="promjena_cijene"),
    path("restidbyname/", views.get_rest_id_by_name, name="restidbyname"),
    path('fetch-items-prices/', views.get_menu_by_rest_id, name='fetch_items_prices'),
    path('item-price-history/', views.get_item_price_history, name='item_price_history'),
    path('items-by-restaurant/', views.items_by_restaurant, name='items_by_restaurant'),  #for testing
    path('price-history/', views.item_price_history, name='price_history_page'),          #for testing
]