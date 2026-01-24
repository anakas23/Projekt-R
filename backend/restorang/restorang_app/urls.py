from django.urls import path

from . import views

urlpatterns = [
    path("", views.multiply_numbers, name="index"),
    path('restaurants/', views.fetch_all_restaurants, name='restaurants_list'),
    path('restidbyname/', views.get_rest_id_by_name, name="restidbyname"),
    path('restbyud/', views.get_restaurant_by_id, name="restbyid"),
    path('restbytype/', views.fetch_all_restaurants_by_type, name="restbytype"),
    path('resttypes/', views.fetch_all_restaurant_types, name="resttypes"),
    path('restbyquater/', views.fetch_all_restaurants_by_quarter, name="restbyquarter"),
    path('fetch-items-prices/', views.get_menu_by_rest_id, name='fetch_items_prices'),
    path('item-price-history/', views.get_item_price_history, name='item_price_history'),
    
    path('items-by-restaurant/', views.items_by_restaurant, name='items_by_restaurant'),  #for testing
    path('price-history/', views.item_price_history, name='price_history_page'),          #for testing
]