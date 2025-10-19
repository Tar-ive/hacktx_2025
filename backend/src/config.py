"""Configuration management for the banking backend."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration."""
    
    # Nessie API
    NESSIE_API_KEY = os.getenv("NESSIE_API_KEY", "")
    NESSIE_CUSTOMER_ID = os.getenv("NESSIE_CUSTOMER_ID", "")
    NESSIE_API_BASE = os.getenv("NESSIE_API_BASE", "http://api.nessieisreal.com")
    
    # Gemini API
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # ElevenLabs API
    ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
    
    # Agent IDs (created via ElevenLabs API)
    AGENT_ID_NEBULA = os.getenv("AGENT_ID_NEBULA", "")
    AGENT_ID_ATLAS = os.getenv("AGENT_ID_ATLAS", "")
    AGENT_ID_SENTINEL = os.getenv("AGENT_ID_SENTINEL", "")
    AGENT_ID_NOVA = os.getenv("AGENT_ID_NOVA", "")
    
    @classmethod
    def has_elevenlabs_agents(cls) -> bool:
        """Check if all ElevenLabs agents are configured."""
        return all([
            cls.AGENT_ID_NEBULA,
            cls.AGENT_ID_ATLAS,
            cls.AGENT_ID_SENTINEL,
            cls.AGENT_ID_NOVA
        ])
    
    # Cache configuration
    CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
    CACHE_FILE_PATH = os.getenv("CACHE_FILE_PATH", "data/cache/customer_data.json")
    
    # Server configuration
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    
    # Version
    VERSION = "1.0.0"
    
    @classmethod
    def validate(cls):
        """Validate required configuration."""
        required = [
            ("NESSIE_API_KEY", cls.NESSIE_API_KEY),
            ("NESSIE_CUSTOMER_ID", cls.NESSIE_CUSTOMER_ID),
        ]
        
        missing = [name for name, value in required if not value]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        # Ensure cache directory exists
        cache_dir = Path(cls.CACHE_FILE_PATH).parent
        cache_dir.mkdir(parents=True, exist_ok=True)

config = Config()
