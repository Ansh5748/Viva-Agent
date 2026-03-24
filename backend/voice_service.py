import os
import base64
from typing import Optional, Dict, Any
import logging
import google.generativeai as genai
from elevenlabs.client import AsyncElevenLabs
from dotenv import load_dotenv
import io
import json
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
logger = logging.getLogger(__name__)

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")



class VoiceService:
    def __init__(self):
        if not ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY environment variable not set.")
        if not GOOGLE_API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable not set.")
        
        self.elevenlabs = AsyncElevenLabs(api_key=ELEVENLABS_API_KEY)
        genai.configure(api_key=GOOGLE_API_KEY)
        
        # Log available models for diagnostic purposes
        try:
            logger.info("Listing available models from google-generativeai...")
            available_models = []
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    available_models.append(m.name)
            logger.info(f"Available Models: {available_models}")
        except Exception as e:
            logger.error(f"Failed to list models during init: {str(e)}")

        # We'll try these models in order
        self.model_names = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-1.0-pro'
        ]
        logger.info("VoiceService initialized with multi-model fallback support.")
    
    async def transcribe_audio(self, audio_bytes: bytes, language: str = "en") -> str:
        try:
            audio_size = len(audio_bytes)
            logger.info(f"TRANSCRIPTION: Received {audio_size} bytes.")
            
            if audio_size < 1000:
                logger.warning("TRANSCRIPTION: Audio too small, returning empty.")
                return ""

            # 1. Try ElevenLabs Scribe
            try:
                audio_file = io.BytesIO(audio_bytes)
                audio_file.name = "audio.mp3"
                result = await self.elevenlabs.speech_to_text.convert(
                    file=audio_file,
                    model_id="scribe_v1"
                )
                logger.info(f"TRANSCRIPTION: ElevenLabs success: '{result.text}'")
                return result.text
            except Exception as e:
                logger.warning(f"TRANSCRIPTION: ElevenLabs failed: {str(e)}")
                
                # 2. Fallback to Gemini
                prompt = "Please transcribe this audio clip exactly. If silent, return empty string."
                audio_content = {"mime_type": "audio/webm", "data": audio_bytes}
                
                for m_name in self.model_names:
                    try:
                        logger.info(f"TRANSCRIPTION: Trying Gemini model: {m_name}")
                        model = genai.GenerativeModel(m_name)
                        response = await model.generate_content_async([prompt, audio_content])
                        if response and response.text:
                            text = response.text.strip()
                            logger.info(f"TRANSCRIPTION: Gemini success ({m_name}): '{text}'")
                            return text
                    except Exception as gemini_e:
                        logger.error(f"TRANSCRIPTION: Gemini {m_name} failed: {str(gemini_e)}")
                        continue
                
                return ""

        except Exception as e:
            logger.error(f"TRANSCRIPTION: Critical error: {str(e)}")
            return "" 
    
    async def synthesize_speech(self, text: str, voice: str = "nova") -> bytes:
        # Most common standard voices available on almost all tiers
        voice_priorities = [
            "21m00Tcm4TlvDq8ikWAM", # Rachel (Standard)
            "AZnzlk1XhxPjt8vD08Py", # Domi (Standard)
            "EXAVITQu4vr4xnSDxMaL", # Bella (Standard)
        ]

        for voice_id in voice_priorities:
            try:
                logger.info(f"Attempting TTS with voice ID: {voice_id}")
                audio_stream = self.elevenlabs.text_to_speech.convert(
                    voice_id=voice_id,
                    text=text,
                    model_id="eleven_multilingual_v2"
                )
                
                audio_bytes = b""
                async for chunk in audio_stream:
                    audio_bytes += chunk
                return audio_bytes

            except Exception as e:
                error_msg = str(e).lower()
                logger.warning(f"ElevenLabs attempt failed for voice {voice_id}: {error_msg}")
                
                # If it's a quota or activity block, don't keep trying other voices immediately
                if "detected_unusual_activity" in error_msg or "quota_exceeded" in error_msg:
                    logger.error("ElevenLabs account restricted or quota hit.")
                    break
                
                # Otherwise, continue to next voice in list
                continue
        
        # If all attempts fail, return empty bytes instead of raising to prevent 500 error
        logger.error("All ElevenLabs TTS attempts failed. Returning empty audio.")
        return b""

    async def synthesize_speech_base64(self, text: str, voice: str = "nova") -> str:
        try:
            audio_bytes = await self.synthesize_speech(text, voice)
            if not audio_bytes:
                return "" # Return empty string if synthesis failed
            return base64.b64encode(audio_bytes).decode('utf-8')
        except Exception as e:
            logger.error(f"TTS Base64 conversion failed: {str(e)}")
            return ""

    def _parse_gemini_json(self, text: str) -> Dict[str, Any]:
        """Helper to clean and parse JSON from Gemini response."""
        try:
            cleaned_text = text.strip()
            # Remove markdown code blocks if present
            if "```json" in cleaned_text:
                cleaned_text = cleaned_text.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned_text:
                cleaned_text = cleaned_text.split("```")[1].split("```")[0].strip()
            
            # Find the first { and last } to handle cases with extra text
            start = cleaned_text.find('{')
            end = cleaned_text.rfind('}')
            if start != -1 and end != -1:
                cleaned_text = cleaned_text[start:end+1]
                
            return json.loads(cleaned_text)
        except Exception as e:
            logger.error(f"Failed to parse Gemini JSON: {str(e)}. Original text: {text}")
            # Return a minimal valid structure to prevent crashes
            return {
                "score": 0.0,
                "feedback": "Technical error parsing evaluation.",
                "evaluation": "incorrect",
                "intent": "unknown"
            }

    async def evaluate_answer(
        self,
        question: str,
        student_answer: str,
        answer_key: str,
        max_score: float = 10.0
    ) -> Dict[str, Any]:
        logger.info(f"EVALUATION START: Question='{question[:50]}...', Answer='{student_answer[:50]}...'")
        
        # Handle empty or invalid student answer early
        if not student_answer or student_answer.strip() in ["", "Listening...", "Processing...", "(No speech detected)"]:
            logger.warning("EVALUATION: Student answer is empty or invalid.")
            return {
                "score": 0.0,
                "feedback": "I couldn't hear your answer clearly. Could you please repeat it?",
                "evaluation": "incorrect",
                "is_system_action": False
            }

        try:
            # 1. Intent Detection
            intent_prompt = f"""Analyze the student's response in a viva exam context.
Question asked: {question}
Student's response: {student_answer}

Identify the intent of the student. Is it:
1. "answer": Providing an answer to the question.
2. "repeat": Asking to repeat the question.
3. "clarify": Asking for clarification or help understanding the question.
4. "unknown": None of the above.

Respond in this exact JSON format:
{{
    "intent": "answer" | "repeat" | "clarify" | "unknown"
}}"""
            
            intent = "answer" # Default intent
            for m_name in self.model_names:
                try:
                    logger.info(f"INTENT: Trying model {m_name}")
                    model = genai.GenerativeModel(m_name)
                    response = await model.generate_content_async(
                        intent_prompt,
                        generation_config={"response_mime_type": "application/json"}
                    )
                    
                    if response and response.text:
                        intent_data = self._parse_gemini_json(response.text)
                        intent = intent_data.get("intent", "answer")
                        logger.info(f"INTENT: Success ({m_name}): {intent}")
                        break
                except Exception as intent_e:
                    logger.error(f"INTENT: Model {m_name} failed: {str(intent_e)}")
                    continue

            if intent in ["repeat", "clarify"]:
                return {
                    "score": 0.0,
                    "feedback": "Repeating the question..." if intent == "repeat" else "Let me clarify the question for you.",
                    "evaluation": intent,
                    "is_system_action": True
                }

            # 2. Answer Evaluation
            prompt = f"""You are a professional, senior college professor conducting a rigorous yet fair viva exam.
Your goal is to evaluate the student's technical understanding and provide academic feedback.

Question Asked: {question}
Reference Answer (Key Points): {answer_key}
Student's Response: {student_answer}

Evaluation Rubric:
1. Accuracy: How technically correct is the student's explanation?
2. Depth: Does the student demonstrate a deep understanding?
3. Conciseness: Is the student's answer direct and clear?

Grading Scale (0-10):
- 9-10: Excellent. Comprehensive, accurate, and well-articulated.
- 7-8: Good. Accurate but might miss minor nuances or depth.
- 5-6: Fair. Basic understanding but significant omissions or lack of clarity.
- 0-4: Poor/Incorrect. Fundamental misconceptions or no relevant content.

Your feedback must be academic, direct, and helpful.

Respond in this exact JSON format:
{{
    "score": <number 0.0 to 10.0>,
    "feedback": "<formal academic feedback as a professor>",
    "evaluation": "correct" | "partially_correct" | "incorrect",
    "follow_up_hint": "<optional: a short academic hint if they missed a specific point>"
}}"""
            
            for m_name in self.model_names:
                try:
                    logger.info(f"EVALUATION: Trying model {m_name}")
                    model = genai.GenerativeModel(m_name)
                    response = await model.generate_content_async(
                        prompt,
                        generation_config={"response_mime_type": "application/json"}
                    )
                    
                    if response and response.text:
                        result = self._parse_gemini_json(response.text)
                        logger.info(f"EVALUATION: Success ({m_name}): score={result.get('score')}")
                        
                        return {
                            "score": float(result.get("score", 0)),
                            "feedback": result.get("feedback", ""),
                            "evaluation": result.get("evaluation", "incorrect"),
                            "follow_up_hint": result.get("follow_up_hint", ""),
                            "is_system_action": False
                        }
                except Exception as eval_e:
                    logger.error(f"EVALUATION: Model {m_name} failed: {str(eval_e)}")
                    continue

            # Final Fallback if everything fails
            logger.error("EVALUATION: All models failed.")
            return {
                "score": 0.0,
                "feedback": "I've received your answer. Let's move to the next question as I'm having a bit of trouble processing the evaluation right now.",
                "evaluation": "partially_correct",
                "follow_up_hint": "",
                "is_system_action": False
            }

        except Exception as e:
            logger.error(f"EVALUATION: Critical error: {str(e)}")
            return {
                "score": 0.0,
                "feedback": "I'm sorry, I'm having some technical difficulties processing your answer.",
                "evaluation": "incorrect",
                "is_system_action": False
            }


voice_service = VoiceService()
