import pandas as pd
from faker import Faker
import random

fake = Faker()
random.seed(11)
Faker.seed(11)

# ---------- CUSTOMERS ----------
def generate_customers(n=200):
    customers = []
    for i in range(1, n + 1):
        customers.append({
            "customer_id": f"FC{100+i}",
            "name": fake.name(),
            "email": fake.email(),
            "signup_date": fake.date_between(start_date="-2y", end_date="-1M"),
            "city": fake.city()
        })
    df = pd.DataFrame(customers)
    df.loc[df.sample(6, random_state=1).index, "email"] = None
    return df

# ---------- RESTAURANTS ----------
def generate_restaurants(n=40):
    cuisines = ["Indian", "Chinese", "Italian", "Mexican", "Continental", "Fast Food"]
    restaurants = []
    for i in range(1, n + 1):
        restaurants.append({
            "restaurant_id": f"R{300+i}",
            "restaurant_name": fake.company(),
            "cuisine": random.choice(cuisines),
            "city": fake.city(),
            "rating": round(random.uniform(2.5, 5.0), 1)
        })
    return pd.DataFrame(restaurants)

# ---------- ORDERS ----------
def generate_orders(customers_df, restaurants_df, n=1000):
    statuses = ["Completed", "Cancelled", "Refunded", "Pending"]
    orders = []
    for i in range(1, n + 1):
        customer_id = random.choice(customers_df["customer_id"].tolist())
        restaurant_id = random.choice(restaurants_df["restaurant_id"].tolist())
        order_amount = round(random.uniform(150, 2500), 2)
        order_date = fake.date_between(start_date="-1y", end_date="today")

        orders.append({
            "order_id": f"FO{6000+i}",
            "customer_id": customer_id,
            "restaurant_id": restaurant_id,
            "order_date": order_date,
            "order_amount": order_amount,
            "status": random.choice(statuses)
        })

    df = pd.DataFrame(orders)

    # Data quality issues
    df.loc[df.sample(12, random_state=2).index, "customer_id"] = None
    df.loc[df.sample(6, random_state=3).index, "order_amount"] *= -1
    duplicates = df.sample(10, random_state=4)
    df = pd.concat([df, duplicates], ignore_index=True)
    df.loc[df.sample(7, random_state=5).index, "order_date"] = None

    return df

# ---------- DELIVERIES ----------
def generate_deliveries(orders_df):
    deliveries = []
    for i, row in orders_df.iterrows():
        prep_time = random.randint(10, 40)
        travel_time = random.randint(5, 45)
        deliveries.append({
            "delivery_id": f"D{9000+i}",
            "order_id": row["order_id"],
            "delivery_partner": fake.name(),
            "prep_time_minutes": prep_time,
            "travel_time_minutes": travel_time,
            "total_delivery_time_minutes": prep_time + travel_time,
            "delivery_status": random.choice(["Delivered", "Delayed", "Failed", None])
        })
    return pd.DataFrame(deliveries)

if __name__ == "__main__":
    customers_df = generate_customers()
    restaurants_df = generate_restaurants()
    orders_df = generate_orders(customers_df, restaurants_df)
    deliveries_df = generate_deliveries(orders_df)

    customers_df.to_csv("foodgo_customers.csv", index=False)
    restaurants_df.to_csv("foodgo_restaurants.csv", index=False)
    orders_df.to_csv("foodgo_orders.csv", index=False)
    deliveries_df.to_csv("foodgo_deliveries.csv", index=False)

    print("FoodGo synthetic data generated successfully.")
    print(f"Customers: {len(customers_df)}, Restaurants: {len(restaurants_df)}, Orders: {len(orders_df)}, Deliveries: {len(deliveries_df)}")