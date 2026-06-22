"""
MongoDB client initialization and access helpers.
Uses `mongomock` when `FASTAPI_ENV=testing` (or `TESTING=True` via config).
"""

from pymongo import MongoClient
from urllib.parse import quote_plus
from pymongo.errors import ConnectionFailure, ConfigurationError
from server.config import get_app_config
import os
import mongomock
from werkzeug.security import generate_password_hash

# logging
from server.utils.logging import get_pymongo_logger
pymongo_logger = get_pymongo_logger()

# load env
from dotenv import load_dotenv
load_dotenv()

class MongoDBClient:
    _is_mock = False
    _client = None
    _db_name = None
    
    @classmethod
    def initialize(cls, db_name: str = None):
        """
        Initialize the MongoDB client.
        Args:
            db_name: Database name to use
        """
        # Check if running in test mode
        if(get_app_config().TESTING):
            cls._is_mock = True
            cls._client = mongomock.MongoClient()
            cls._db_name = "testdb"
            pymongo_logger.info("Initialized mongomock MongoDB client for testing")
            cls._seed_mock_users()
            return

        # Get Mongo Connection String
        user = os.getenv("MONGO_USER", "")
        pwd  = os.getenv("MONGO_PASSWORD", "")
        host = os.getenv("MONGO_HOST", "")
        params = os.getenv("MONGO_PARAMS", "")
        if not user or not pwd or not host or not params:
            pymongo_logger.error("One or more MongoDB environment variables are not set")
            raise ValueError("One or more MongoDB environment variables are not set")
        uri = f"mongodb+srv://{quote_plus(user)}:{quote_plus(pwd)}@{host}/?{params}"

        # Init MongoClient
        try:
            cls._client = MongoClient(uri)
            if db_name is not None:
                cls._db_name = db_name
            else:
                cls._db_name = os.getenv("MONGO_DB", "testdb")
            # Test the connection
            cls._client.admin.command('ping')
            pymongo_logger.info("MongoDB connection established successfully")
        except (ConnectionFailure, ConfigurationError) as e:
            pymongo_logger.error(f"MongoDB connection failed: {e}")
            raise
    
    @classmethod
    def get_client(cls):
        """
        Get the MongoDB client instance.
        
        Returns:
            MongoClient instance
            
        Raises:
            Exception: If client is not initialized
        """
        if cls._client is None:
            raise Exception("MongoDB client not initialized. Call initialize() first.")
        return cls._client
    
    @classmethod
    def get_db(cls):
        """
        Get the database instance.
        
        Returns:
            Database instance
            
        Raises:
            Exception: If client is not initialized
        """
        if cls._client is None or cls._db_name is None:
            raise Exception("MongoDB client not initialized. Call initialize() first.")
        return cls._client[cls._db_name]
    
    @classmethod
    def get_db_name(cls):
        """Get the database name."""
        if cls._db_name is None:
            raise Exception("MongoDB client not initialized. Call initialize() first.")
        return cls._db_name
    
    @classmethod
    def close(cls):
        """Close the MongoDB connection."""
        if cls._client:
            cls._client.close()
            cls._client = None

    @classmethod
    def reset_mock(cls):
        """Drop all mock data (only valid in mock mode)."""
        if not cls._is_mock:
            raise RuntimeError("reset_mock() can only be used in mock mode")
        cls._client = mongomock.MongoClient()
        cls._db_name = "testdb"

    @classmethod
    def _seed_mock_users(cls) -> None:
        """
        Seed default users when running in mock mode.
        """
        try:
            from server.external.db.models.user import User
            User.ensure_indexes()
            defaults = [
                {
                    "first_name": "Sean",
                    "last_name": "Son",
                    "email": "astroson2005@gmail.com",
                    "password": "asd",
                }
            ]

            for user in defaults:
                if User.get_by_email(user["email"]):
                    continue

                User.create(
                    username=f"{user['first_name']}{user['last_name']}",
                    email=user["email"],
                    password=generate_password_hash(user["password"]),
                    first_name=user["first_name"],
                    last_name=user["last_name"],
                )
            pymongo_logger.info("Seeded default mock users for testing environment")
        except Exception as exc:
            pymongo_logger.error(f"Failed to seed mock users: {exc}")
