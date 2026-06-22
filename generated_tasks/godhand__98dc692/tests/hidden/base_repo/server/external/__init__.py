from .db.mongo import MongoDBClient
from .services.email_service import EmailService

def initialize_services():
    """Initialize all services."""
    MongoDBClient.initialize()
    EmailService.initialize()
