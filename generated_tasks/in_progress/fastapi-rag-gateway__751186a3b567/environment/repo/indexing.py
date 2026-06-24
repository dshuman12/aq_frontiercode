# indexing.py
import os
from glob import glob
from typing import List, Optional
from functools import lru_cache 
import logging
from dotenv import load_dotenv

from langchain_community.document_loaders import TextLoader
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings  # Memory-efficient API-based embeddings
from langchain.text_splitter import CharacterTextSplitter

load_dotenv() 
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DEFAULT_CHROMA_DIR = os.path.join(BASE_DIR, os.getenv("CHROMA_STORE_DIR", "chroma_store"))

@lru_cache(maxsize=1)
def load_and_index_documents() -> Optional[Chroma]:
    """
    Loads all .txt files from the data directory, splits them, and
    creates (or loads) a persistent Chroma vector store.
    Uses OpenAI embeddings for minimal memory footprint (<50MB vs 300MB+ for sentence-transformers).
    """
    try:
        # --- 1. Use OpenAI embeddings (API-based, minimal memory) ---
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small"  # Cheaper and faster than ada-002
        )

        # --- 2. Check for existing persisted Chroma store ---
        if os.path.exists(DEFAULT_CHROMA_DIR) and os.listdir(DEFAULT_CHROMA_DIR):
            logging.info(f"Loading existing Chroma database from '{DEFAULT_CHROMA_DIR}'")
            return Chroma(persist_directory=DEFAULT_CHROMA_DIR, embedding_function=embeddings)

        # --- 3. Load and process text documents ---
        filepaths: List[str] = glob(os.path.join(DATA_DIR, "*.txt"))
        if not filepaths:
            raise FileNotFoundError(f"No .txt files found in '{DATA_DIR}' directory.")

        all_documents = []
        for fp in filepaths:
            loader = TextLoader(fp, encoding="utf-8")
            all_documents.extend(loader.load())

        # --- 4. Split into smaller chunks ---
        text_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        all_texts = text_splitter.split_documents(all_documents)

        # --- 5. Create a new Chroma store ---
        logging.info(f"Creating new Chroma database with {len(all_texts)} chunks...")
        vector_store = Chroma.from_documents(
            documents=all_texts, 
            embedding=embeddings, 
            persist_directory=DEFAULT_CHROMA_DIR
        )
        
        logging.info("Document indexing complete. Chroma store saved successfully.")
        return vector_store

    except Exception as e:
        logging.error(f"Indexing Error: {e}", exc_info=True)
        return None