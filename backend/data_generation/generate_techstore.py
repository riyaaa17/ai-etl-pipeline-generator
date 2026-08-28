import pandas as pd
from faker import Faker
import random

fake = Faker()
random.seed(31)
Faker.seed(31)

# ---------- CUSTOMERS ----------
def generate_customers(n=200):
    customers = []
    for i in range(1, n + 1):
        customers.append({
            "customer_id": f"TSC{100+i}",
            "name": fake.name(),
            "email": fake.email(),
            "signup_date": fake.date_between(start_date="-2y", end_date="-1M"),
            "city": fake.city()
        })
    df = pd.DataFrame(customers)
    df.loc[df.sample(5, random_state=1).index, "email"] = None
    return df

# ---------- PRODUCTS ----------
def generate_products(n=50):
    categories = ["Laptops", "Mobiles", "Accessories", "Audio", "Wearables"]
    products = []
    for i in range(1, n + 1):
        products.append({
            "product_id": f"TSP{1000+i}",
            "product_name": fake.word().capitalize() + " " + random.choice(["X1", "Air", "Ultra", "Neo", "Pro"]),
            "category": random.choice(categories),
            "price": round(random.uniform(500, 90000), 2)
        })
    return pd.DataFrame(products)

# ---------- SALES ----------
def generate_sales(customers_df, products_df, n=1000):
    statuses = ["Completed", "Cancelled", "Refunded", "Pending"]
    sales = []
    for i in range(1, n + 1):
        customer_id = random.choice(customers_df["customer_id"].tolist())
        product_id = random.choice(products_df["product_id"].tolist())
        price = products_df.loc[products_df["product_id"] == product_id, "price"].values[0]
        quantity = random.randint(1, 3)
        sale_amount = round(price * quantity, 2)
        sale_date = fake.date_between(start_date="-1y", end_date="today")

        sales.append({
            "sale_id": f"TSS{5000+i}",
            "customer_id": customer_id,
            "product_id": product_id,
            "sale_date": sale_date,
            "quantity": quantity,
            "sale_amount": sale_amount,
            "status": random.choice(statuses)
        })

    df = pd.DataFrame(sales)

    # Data quality issues
    df.loc[df.sample(10, random_state=2).index, "customer_id"] = None
    df.loc[df.sample(5, random_state=3).index, "sale_amount"] *= -1
    duplicates = df.sample(8, random_state=4)
    df = pd.concat([df, duplicates], ignore_index=True)
    df.loc[df.sample(6, random_state=5).index, "sale_date"] = None

    return df

# ---------- INVENTORY ----------
def generate_inventory(products_df):
    inventory = []
    for i, row in products_df.iterrows():
        stock = random.randint(-5, 500)  # negative stock = intentional data issue
        inventory.append({
            "inventory_id": f"TSI{2000+i}",
            "product_id": row["product_id"],
            "warehouse_city": fake.city(),
            "stock_quantity": stock,
            "last_restock_date": fake.date_between(start_date="-6M", end_date="today")
        })
    return pd.DataFrame(inventory)

if __name__ == "__main__":
    customers_df = generate_customers()
    products_df = generate_products()
    sales_df = generate_sales(customers_df, products_df)
    inventory_df = generate_inventory(products_df)

    customers_df.to_csv("techstore_customers.csv", index=False)
    products_df.to_csv("techstore_products.csv", index=False)
    sales_df.to_csv("techstore_sales.csv", index=False)
    inventory_df.to_csv("techstore_inventory.csv", index=False)

    print("TechStore synthetic data generated successfully.")
    print(f"Customers: {len(customers_df)}, Products: {len(products_df)}, Sales: {len(sales_df)}, Inventory: {len(inventory_df)}")