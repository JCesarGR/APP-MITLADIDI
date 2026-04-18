from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.database import get_database
from app.schemas.schemas import ChoferCreate, ChoferResponse, UbicacionUpdate

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = "taximitla-secret-key-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/chofer/register", response_model=ChoferResponse)
async def register_chofer(chofer: ChoferCreate):
    """Registrar un nuevo chofer."""
    db = get_database()

    # Verificar si ya existe
    existing = await db.choferes.find_one({"telefono": chofer.telefono})
    if existing:
        raise HTTPException(status_code=400, detail="El teléfono ya está registrado")

    # Crear chofer
    chofer_dict = {
        "nombre": chofer.nombre,
        "telefono": chofer.telefono,
        "foto_url": chofer.foto_url,
        "unidad": chofer.unidad,
        "password_hash": get_password_hash(chofer.password),
        "badge": "principiante",
        "viajes_completados": 0,
        "ganancia_total": 0.0,
        "activo": False,
        "lat": None,
        "lng": None,
        "ultima_actualizacion": None,
        "created_at": datetime.utcnow()
    }

    result = await db.choferes.insert_one(chofer_dict)
    chofer_dict["id"] = str(result.inserted_id)
    del chofer_dict["password_hash"]

    return ChoferResponse(**chofer_dict)

@router.post("/chofer/login")
async def login_chofer(telefono: str, password: str):
    """Iniciar sesión como chofer."""
    db = get_database()

    chofer = await db.choferes.find_one({"telefono": telefono})
    if not chofer or not verify_password(password, chofer["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token({"sub": str(chofer["_id"]), "telefono": telefono})

    return {
        "access_token": token,
        "token_type": "bearer",
        "chofer_id": str(chofer["_id"]),
        "nombre": chofer["nombre"]
    }

@router.get("/chofer/{chofer_id}", response_model=ChoferResponse)
async def get_chofer(chofer_id: str):
    """Obtener información de un chofer."""
    db = get_database()
    chofer = await db.choferes.find_one({"_id": chofer_id})
    if not chofer:
        raise HTTPException(status_code=404, detail="Chofer no encontrado")

    chofer["id"] = str(chofer.pop("_id"))
    return ChoferResponse(**chofer)
