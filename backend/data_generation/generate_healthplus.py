import pandas as pd
from faker import Faker
import random

fake = Faker()
random.seed(41)
Faker.seed(41)

# ---------- PATIENTS ----------
def generate_patients(n=200):
    patients = []
    for i in range(1, n + 1):
        patients.append({
            "patient_id": f"HP{100+i}",
            "name": fake.name(),
            "email": fake.email(),
            "registration_date": fake.date_between(start_date="-2y", end_date="-1M"),
            "city": fake.city(),
            "age": random.randint(1, 90)
        })
    df = pd.DataFrame(patients)
    df.loc[df.sample(5, random_state=1).index, "email"] = None
    return df

# ---------- DOCTORS ----------
def generate_doctors(n=25):
    specialties = ["General Medicine", "Cardiology", "Dermatology", "Orthopedics", "Pediatrics", "ENT"]
    doctors = []
    for i in range(1, n + 1):
        doctors.append({
            "doctor_id": f"DR{400+i}",
            "name": "Dr. " + fake.name(),
            "specialty": random.choice(specialties),
            "years_experience": random.randint(1, 30)
        })
    return pd.DataFrame(doctors)

# ---------- APPOINTMENTS ----------
def generate_appointments(patients_df, doctors_df, n=1000):
    statuses = ["Completed", "Cancelled", "No-show", "Pending"]
    appointments = []
    for i in range(1, n + 1):
        patient_id = random.choice(patients_df["patient_id"].tolist())
        doctor_id = random.choice(doctors_df["doctor_id"].tolist())
        appointment_date = fake.date_between(start_date="-1y", end_date="today")

        appointments.append({
            "appointment_id": f"APT{6000+i}",
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "appointment_date": appointment_date,
            "status": random.choice(statuses)
        })

    df = pd.DataFrame(appointments)

    # Data quality issues
    df.loc[df.sample(10, random_state=2).index, "patient_id"] = None
    duplicates = df.sample(8, random_state=4)
    df = pd.concat([df, duplicates], ignore_index=True)
    df.loc[df.sample(6, random_state=5).index, "appointment_date"] = None

    return df

# ---------- BILLING ----------
def generate_billing(appointments_df):
    billing = []
    for i, row in appointments_df.iterrows():
        amount = round(random.uniform(300, 8000), 2)
        billing.append({
            "billing_id": f"BILL{9000+i}",
            "appointment_id": row["appointment_id"],
            "amount": amount,
            "payment_status": random.choice(["Paid", "Unpaid", "Pending", None])
        })
    df = pd.DataFrame(billing)
    # Data quality issue: a few negative billing amounts
    df.loc[df.sample(5, random_state=3).index, "amount"] *= -1
    return df

if __name__ == "__main__":
    patients_df = generate_patients()
    doctors_df = generate_doctors()
    appointments_df = generate_appointments(patients_df, doctors_df)
    billing_df = generate_billing(appointments_df)

    patients_df.to_csv("healthplus_patients.csv", index=False)
    doctors_df.to_csv("healthplus_doctors.csv", index=False)
    appointments_df.to_csv("healthplus_appointments.csv", index=False)
    billing_df.to_csv("healthplus_billing.csv", index=False)

    print("HealthPlus synthetic data generated successfully.")
    print(f"Patients: {len(patients_df)}, Doctors: {len(doctors_df)}, Appointments: {len(appointments_df)}, Billing: {len(billing_df)}")