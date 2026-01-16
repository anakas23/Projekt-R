from django.db import models

class Price(models.Model):
    price_id = models.IntegerField(primary_key=True)
    date = models.DateField()
    value = models.DecimalField(max_digits=10, decimal_places=2)
    source = models.CharField(max_length=255)
    item_id = models.ForeignKey(
        "Item",
        on_delete=models.CASCADE,
        db_column="item_id"
    )
    
    rest_id = models.ForeignKey(
        "Restaurant",
        on_delete=models.CASCADE,
        db_column="rest_id"
    )
    
    user_id = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        db_column="user_id"
    )

    class Meta:
        managed = False 
        db_table = "price"
    
    def __str__(self):
        return f"{self.item_id.name} - {self.value}"
        
class Item(models.Model):
    item_id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    category_id = models.ForeignKey(
        "Category",
        on_delete=models.CASCADE,
        db_column="category_id"
    )
    class Meta:
        managed = False
        db_table = "item"
    def __str__(self):
        return self.name

class Restaurant(models.Model):
    rest_id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    class Meta:
        managed = False
        db_table = "restaurant"
    def __str__(self):
        return self.name
        

class User(models.Model):
    
    user_id = models.IntegerField(primary_key=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.CharField(max_length=255)
    password = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    class Meta:
        managed = False
        db_table = "users"
    def __str__(self):
        return self.first_name + " " + self.last_name
        
class Category(models.Model):
    category_id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=255)
    class Meta:
        managed = False
        db_table = "category"
    def __str__(self):
        return self.name
        
class PriceReport(models.Model):
    report_id = models.IntegerField(primary_key=True)
    status = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    report_date = models.DateField()
    item_id = models.ForeignKey(
        "Item",
        on_delete=models.CASCADE,
        db_column="item_id"
    )
    
    rest_id = models.ForeignKey(
        "Restaurant",
        on_delete=models.CASCADE,
        db_column="rest_id"
    )
    
    user_id = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        db_column="user_id"
    )

    class Meta:
        managed = False 
        db_table = "pricereport"
    def __str__(self):
        return self.item_id.name + " - " + str(self.price)

    