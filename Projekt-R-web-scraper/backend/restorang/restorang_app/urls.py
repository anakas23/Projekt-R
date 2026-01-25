from django.urls import path

from . import views

urlpatterns = [
    path("", views.multiply_numbers, name="index"),
    path("promjena_cijene/", views.promjena_cijene, name="promjena_cijene"),
    path("restidbyname/", views.restIdByName, name="restidbyname"),

]