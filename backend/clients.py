"""
외부 서비스 클라이언트(OpenAI, Supabase) 싱글턴.
다른 모듈에서는 이 파일에서 client/supabase를 가져다 쓴다.
"""
import os
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
