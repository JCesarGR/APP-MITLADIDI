from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "taximitla"

class Database:
    client: Optional[AsyncIOMotorClient] = None

db = Database()

async def connect_to_mongo():
    """Conectar a MongoDB."""
    db.client = AsyncIOMotorClient(MONGODB_URL)
    # Crear índices
    await db.client[DATABASE_NAME]["choferes"].create_index("telefono", unique=True)
    await db.client[DATABASE_NAME]["viajes"].create_index("created_at")
    await db.client[DATABASE_NAME]["viajes"].create_index("chofer_id")
    await db.client[DATABASE_NAME]["viajes"].create_index("estado")
    print(f"Conectado a MongoDB: {DATABASE_NAME}")

async def close_mongo_connection():
    """Cerrar conexión MongoDB."""
    if db.client:
        db.client.close()
        print("Conexión MongoDB cerrada")

def get_database():
    """Obtener base de datos."""
    return db.client[DATABASE_NAME]
