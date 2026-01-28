from django.contrib import admin
from .models import Price, Item, Restaurant, User, Category, PriceReport


admin.site.register(Price)
admin.site.register(Item)
admin.site.register(User)
admin.site.register(Restaurant)
admin.site.register(Category)
admin.site.register(PriceReport)
