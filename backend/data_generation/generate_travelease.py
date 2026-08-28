import pandas as pd
from faker import Faker
import random

fake = Faker()
random.seed(21)
Faker.seed(21)

# ---------- CUSTOMERS ----------
def generate_customers(n=200):
    customers = []
    for i in range(1, n + 1):
        customers.append({
            "customer_id": f"TC{100+i}",
            "name": fake.name(),
            "email": fake.email(),
            "signup_date": fake.date_between(start_date="-2y", end_date="-1M"),
            "city": fake.city()
        })
    df = pd.DataFrame(customers)
    df.loc[df.sample(5, random_state=1).index, "email"] = None
    return df

# ---------- FLIGHTS ----------
def generate_flights(n=60):
    airlines = ["IndiGo", "Air India", "Vistara", "SpiceJet", "AirAsia"]
    cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Goa"]
    flights = []
    for i in range(1, n + 1):
        origin = random.choice(cities)
        destination = random.choice([c for c in cities if c != origin])
        flights.append({
            "flight_id": f"FL{500+i}",
            "airline": random.choice(airlines),
            "origin": origin,
            "destination": destination,
            "base_price": round(random.uniform(2500, 12000), 2)
        })
    return pd.DataFrame(flights)

# ---------- BOOKINGS ----------
def generate_bookings(customers_df, flights_df, n=1000):
    statuses = ["Completed", "Cancelled", "Refunded", "Pending"]
    bookings = []
    for i in range(1, n + 1):
        customer_id = random.choice(customers_df["customer_id"].tolist())
        flight_id = random.choice(flights_df["flight_id"].tolist())
        base_price = flights_df.loc[flights_df["flight_id"] == flight_id, "base_price"].values[0]
        passengers = random.randint(1, 4)
        booking_amount = round(base_price * passengers, 2)
        booking_date = fake.date_between(start_date="-1y", end_date="today")

        bookings.append({
            "booking_id": f"TB{7000+i}",
            "customer_id": customer_id,
            "flight_id": flight_id,
            "booking_date": booking_date,
            "passengers": passengers,
            "booking_amount": booking_amount,
            "status": random.choice(statuses)
        })

    df = pd.DataFrame(bookings)

    # Data quality issues
    df.loc[df.sample(10, random_state=2).index, "customer_id"] = None
    df.loc[df.sample(5, random_state=3).index, "booking_amount"] *= -1
    duplicates = df.sample(9, random_state=4)
    df = pd.concat([df, duplicates], ignore_index=True)
    df.loc[df.sample(6, random_state=5).index, "booking_date"] = None

    return df

# ---------- PAYMENTS ----------
def generate_payments(bookings_df):
    payments = []
    for i, row in bookings_df.iterrows():
        payments.append({
            "payment_id": f"TPMT{8000+i}",
            "booking_id": row["booking_id"],
            "payment_method": random.choice(["Credit Card", "UPI", "Net Banking", "Wallet"]),
            "payment_status": random.choice(["Success", "Failed", "Pending", None]),
            "payment_date": row["booking_date"]
        })
    return pd.DataFrame(payments)

if __name__ == "__main__":
    customers_df = generate_customers()
    flights_df = generate_flights()
    bookings_df = generate_bookings(customers_df, flights_df)
    payments_df = generate_payments(bookings_df)

    customers_df.to_csv("travelease_customers.csv", index=False)
    flights_df.to_csv("travelease_flights.csv", index=False)
    bookings_df.to_csv("travelease_bookings.csv", index=False)
    payments_df.to_csv("travelease_payments.csv", index=False)

    print("TravelEase synthetic data generated successfully.")
    print(f"Customers: {len(customers_df)}, Flights: {len(flights_df)}, Bookings: {len(bookings_df)}, Payments: {len(payments_df)}")