import os
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    client_id = Column(Integer, primary_key=True)
    client_name = Column(String, unique=True, nullable=False)
    bigquery_dataset = Column(String, nullable=False)

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)
    firebase_uid = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.client_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
class PipelineHistory(Base):
    __tablename__ = "pipeline_history"
    history_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    client_id = Column(Integer, ForeignKey("clients.client_id"))
    requirement = Column(String, nullable=False)
    kpi_name = Column(String)
    sql_query = Column(String)
    row_count = Column(Integer)
    status = Column(String, nullable=False)
    error_message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()