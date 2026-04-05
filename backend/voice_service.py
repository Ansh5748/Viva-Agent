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

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()


class VoiceService:
    def __init__(self):
        if not ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY environment variable not set.")
        if not GOOGLE_API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable not set.")
        
        # Masked API key for logging
        masked_key = f"{GOOGLE_API_KEY[:4]}...{GOOGLE_API_KEY[-4:]}" if len(GOOGLE_API_KEY) > 8 else "****"
        logger.info(f"Initializing VoiceService with Gemini API Key: {masked_key}")
        
        self.elevenlabs = AsyncElevenLabs(api_key=ELEVENLABS_API_KEY)
        genai.configure(api_key=GOOGLE_API_KEY)
        
        # Log available models for diagnostic purposes
        try:
            logger.info("Listing available models from google-generativeai...")
            available_models = []
            # Try to list models to see what's actually allowed for this key
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    available_models.append(m.name)
            
            if not available_models:
                logger.warning("No models found via genai.list_models(). This might indicate an API key or permission issue.")
                # Check a specific common model directly
                try:
                    m = genai.get_model('models/gemini-1.5-flash')
                    logger.info(f"Successfully retrieved model info for 'models/gemini-1.5-flash' directly: {m.display_name}")
                    available_models.append('models/gemini-1.5-flash')
                except Exception as get_e:
                    logger.error(f"Failed to get 'models/gemini-1.5-flash' directly: {str(get_e)}")
            else:
                logger.info(f"Available Models found: {available_models}")
            
            # We will use these models in this priority order. 
            # We mix 'models/' prefix and no prefix to cover all SDK behaviors.
            self.model_names = [
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro-latest',
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gemini-1.0-pro',
                'models/gemini-1.5-flash-latest',
                'models/gemini-1.5-pro-latest',
                'models/gemini-1.5-flash',
                'models/gemini-1.5-pro',
                'models/gemini-1.0-pro'
            ]
            
            # If list_models returned something, prepend it to our list to prioritize it
            for m in reversed(available_models):
                if m not in self.model_names:
                    self.model_names.insert(0, m)
                else:
                    # Move to front
                    self.model_names.remove(m)
                    self.model_names.insert(0, m)
                    
        except Exception as e:
            logger.error(f"Failed to list models during init: {str(e)}")
            self.model_names = [
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gemini-1.0-pro',
                'models/gemini-1.5-flash',
                'models/gemini-1.5-pro',
                'models/gemini-1.0-pro'
            ]

        logger.info(f"VoiceService initialized with model fallback list: {self.model_names}")
    
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
                        # Ensure we use the right format for multimodal
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
                
            parsed = json.loads(cleaned_text)
            # Ensure required keys exist
            if "score" not in parsed: parsed["score"] = 0.0
            if "feedback" not in parsed: parsed["feedback"] = "I've received your answer."
            if "evaluation" not in parsed: parsed["evaluation"] = "incorrect"
            return parsed
        except Exception as e:
            logger.error(f"Failed to parse Gemini JSON: {str(e)}. Original text: {text}")
            return {
                "score": 0.0,
                "feedback": "Technical error parsing evaluation.",
                "evaluation": "incorrect",
                "intent": "answer"
            }

    async def evaluate_answer(
        self,
        question: str,
        student_answer: str,
        answer_key: str,
        max_score: float = 10.0
    ) -> Dict[str, Any]:
        logger.info(f"EVALUATION START: Question='{question[:50]}...', Answer='{student_answer[:50]}...'")
        
        # Clean up student answer
        clean_answer = student_answer.strip() if student_answer else ""
        invalid_markers = ["", "Listening...", "Processing...", "(No speech detected)", "Introduction recorded.", "Introduction provided."]
        
        if not clean_answer or clean_answer in invalid_markers:
            logger.warning(f"EVALUATION: Student answer is invalid: '{clean_answer}'")
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
Student's response: {clean_answer}

Identify the student's intent. Return ONLY a JSON object with this exact structure:
{{
  "intent": "answer" | "repeat" | "clarify" | "unknown"
}}
"""
            intent = "answer"
            intent_detected = False
            for m_name in self.model_names:
                try:
                    logger.info(f"INTENT: Trying model {m_name}")
                    model = genai.GenerativeModel(m_name)
                    # We'll use generate_content instead of async to see if it makes a difference in error handling
                    # but since we are in an async function, let's keep it async but add a shorter timeout if possible
                    response = await model.generate_content_async(intent_prompt, generation_config={"response_mime_type": "application/json"})
                    if response and response.text:
                        parsed = self._parse_gemini_json(response.text)
                        intent = parsed.get("intent", "answer")
                        logger.info(f"INTENT: Model {m_name} detected intent: {intent}")
                        intent_detected = True
                        break
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"INTENT: Model {m_name} failed: {error_msg}")
                    if "404" in error_msg:
                        continue # Try next model
                    # If it's something else like quota, we might want to stop
                    continue
            
            if not intent_detected:
                logger.warning("INTENT: All models failed to detect intent. Defaulting to 'answer'.")

            # 2. Handle System Actions (Repeat/Clarify)
            if intent == "repeat":
                return {
                    "score": 0.0,
                    "feedback": "No problem. Let me repeat the question for you: " + question,
                    "evaluation": "repeat",
                    "is_system_action": True
                }
            elif intent == "clarify":
                return {
                    "score": 0.0,
                    "feedback": "I understand. This question is asking about " + question + ". Try your best to explain it in your own words.",
                    "evaluation": "clarify",
                    "is_system_action": True
                }

            # 3. Evaluation
            eval_prompt = f"""You are a Senior College Professor conducting a Viva exam. 
Question: {question}
Answer Key Reference: {answer_key}
Student's Answer: {clean_answer}

Evaluate the student's answer with LENIENT and ENCOURAGING scoring. 

Rules for Evaluation:
1. LENIENT SCORING: Be generous with marks. If the student has the right idea, give them high marks (e.g., 8-10). 
2. STT ERROR TOLERANCE: Speech-to-text (STT) can sometimes mishear words (e.g., "prong" instead of "prompt"). If you see a word that sounds similar to a technical term or makes sense in context, assume the student said the correct word. DO NOT penalize for spelling or phonetic mismatches from the STT.
3. INTENT OVER PERFECTION: Focus on whether the student understands the core concept. Even if the explanation is slightly messy or incomplete, if the core intent is correct, give full or near-full marks.
4. FEEDBACK: Provide positive, constructive, and encouraging feedback (1-2 sentences). 

Scoring Scale:
- 9.0 - 10.0: Core concept is understood (even if STT has minor errors).
- 7.0 - 8.5: Mostly correct but missing some details.
- 5.0 - 6.5: Partially correct or shows some basic understanding.
- Below 5.0: Only if the answer is completely unrelated or empty.

Return ONLY a JSON object:
{{
  "score": float,
  "feedback": "string",
  "evaluation": "correct" | "partially_correct" | "incorrect",
  "follow_up_hint": "string"
}}
"""
            for m_name in self.model_names:
                try:
                    logger.info(f"EVALUATION: Trying model {m_name}")
                    model = genai.GenerativeModel(m_name)
                    response = await model.generate_content_async(eval_prompt, generation_config={"response_mime_type": "application/json"})
                    if response and response.text:
                        result = self._parse_gemini_json(response.text)
                        score = float(result.get("score", 0.0))
                        feedback = result.get("feedback", "Good effort.")
                        eval_status = result.get("evaluation", "incorrect")
                        hint = result.get("follow_up_hint", "")
                        
                        logger.info(f"EVALUATION: Model {m_name} success: Score={score}")
                        return {
                            "score": score,
                            "feedback": feedback,
                            "evaluation": eval_status,
                            "follow_up_hint": hint,
                            "is_system_action": False
                        }
                except Exception as e:
                    logger.error(f"EVALUATION: Model {m_name} failed: {str(e)}")
                    continue

            logger.error("EVALUATION: All models failed.")
            raise Exception("All Gemini models failed during evaluation.")

        except Exception as e:
            logger.error(f"EVALUATION: Final fallback triggered: {str(e)}")
            return {
                "score": 0.0,
                "feedback": "I've received your answer. Let's move to the next question as I'm having a bit of trouble processing the evaluation right now.",
                "evaluation": "incorrect",
                "is_system_action": False,
                "follow_up_hint": ""
            }


voice_service = VoiceService()
