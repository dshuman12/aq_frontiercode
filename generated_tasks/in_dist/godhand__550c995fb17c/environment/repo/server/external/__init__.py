from .db.mongo import MongoDBClient


def initialize_services() -> None:
    """Initialize external infrastructure services."""
    MongoDBClient.initialize()
