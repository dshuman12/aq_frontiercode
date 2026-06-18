from datetime import datetime, timezone
from server.external.db.mongo import MongoDBClient

def main():
    MongoDBClient.initialize(db_name="godhand")
    db = MongoDBClient.get_db()

    lobby_doc = {
        "lobby_name": "manual-test-lobby",
        "owner_user_id": "TEMP_USER_ID",
        "user_capacity": 4,
        "players": [],
        "world_snapshot": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = db["lobby"].insert_one(lobby_doc)
    print("Inserted lobby:", result.inserted_id)

if __name__ == "__main__":
    main()