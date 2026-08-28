import pandas as pd
from faker import Faker
import random
from datetime import datetime, timedelta

fake = Faker()
random.seed(42)
Faker.seed(42)

# ---------- CUSTOMERS ----------
def generate_customers(n=200):
    customers = []
    for i in range(1, n + 1):
        customers.append({
            "customer_id": f"C{100+i}",
            "name": fake.name(),
            "email": fake.email(),
            "signup_date": fake.date_between(start_date="-2y", end_date="-1M"),
            "city": fake.city()
        })
    df = pd.DataFrame(customers)
    # Intentional data quality issue: a few missing emails
    df.loc[df.sample(5, random_state=1).index, "email"] = None
    return df

# ---------- PRODUCTS ----------
def generate_products(n=50):
    categories = ["Electronics", "Clothing", "Home", "Beauty", "Sports"]
    products = []
    for i in range(1, n + 1):
        products.append({
            "product_id": f"P{1000+i}",
            "product_name": fake.word().capitalize() + " " + random.choice(["Pro", "Max", "Basic", "Plus"]),
            "category": random.choice(categories),
            "price": round(random.uniform(200, 15000), 2)
        })
    return pd.DataFrame(products)

# ---------- ORDERS ----------
def generate_orders(customers_df, products_df, n=1000):
    statuses = ["Completed", "Cancelled", "Refunded", "Pending"]
    orders = []
    for i in range(1, n + 1):
        customer_id = random.choice(customers_df["customer_id"].tolist())
        product_id = random.choice(products_df["product_id"].tolist())
        price = products_df.loc[products_df["product_id"] == product_id, "price"].values[0]
        quantity = random.randint(1, 5)
        order_amount = round(price * quantity, 2)
        order_date = fake.date_between(start_date="-1y", end_date="today")

        orders.append({
            "order_id": f"O{5000+i}",
            "customer_id": customer_id,
            "product_id": product_id,
            "order_date": order_date,
            "quantity": quantity,
            "order_amount": order_amount,
            "status": random.choice(statuses)
        })

    df = pd.DataFrame(orders)

    # Intentional data quality issues:
    # 1. Some NULL customer_ids
    df.loc[df.sample(10, random_state=2).index, "customer_id"] = None
    # 2. Some negative amounts (data entry errors)
    df.loc[df.sample(5, random_state=3).index, "order_amount"] *= -1
    # 3. Duplicate order rows
    duplicates = df.sample(8, random_state=4)
    df = pd.concat([df, duplicates], ignore_index=True)
    # 4. A few invalid/missing dates
    df.loc[df.sample(6, random_state=5).index, "order_date"] = None

    return df

# ---------- PAYMENTS ----------
def generate_payments(orders_df):
    payments = []
    for i, row in orders_df.iterrows():
        payments.append({
            "payment_id": f"PMT{7000+i}",
            "order_id": row["order_id"],
            "payment_method": random.choice(["Credit Card", "UPI", "Net Banking", "Wallet"]),
            "payment_status": random.choice(["Success", "Failed", "Pending", None]),
            "payment_date": row["order_date"]
        })
    return pd.DataFrame(payments)

if __name__ == "__main__":
    customers_df = generate_customers()
    products_df = generate_products()
    orders_df = generate_orders(customers_df, products_df)
    payments_df = generate_payments(orders_df)

    customers_df.to_csv("retailmart_customers.csv", index=False)
    products_df.to_csv("retailmart_products.csv", index=False)
    orders_df.to_csv("retailmart_orders.csv", index=False)
    payments_df.to_csv("retailmart_payments.csv", index=False)

    print("RetailMart synthetic data generated successfully.")
    print(f"Customers: {len(customers_df)}, Products: {len(products_df)}, Orders: {len(orders_df)}, Payments: {len(payments_df)}")