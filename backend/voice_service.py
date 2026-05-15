import os
import base64
from typing import Optional, Dict, Any, List
import logging
import google.generativeai as genai
from elevenlabs.client import AsyncElevenLabs
import edge_tts
from gtts import gTTS
from dotenv import load_dotenv
import io
import json
import asyncio
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
        
        self.elevenlabs = AsyncElevenLabs(api_key=ELEVENLABS_API_KEY)
        genai.configure(api_key=GOOGLE_API_KEY)
        
        self.model_names = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-3-flash-preview',
            'models/gemini-2.5-flash',
            'models/gemini-2.0-flash',
            'models/gemini-1.5-flash'
        ]
        logger.info(f"VoiceService initialized with models: {self.model_names}")
    
    async def _get_available_models(self):
        """Helper to list available models for debugging."""
        try:
            models = genai.list_models()
            available = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
            logger.info(f"Available Gemini models: {available}")
            return available
        except Exception as e:
            logger.error(f"Failed to list Gemini models: {str(e)}")
            return []
    
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
        """
        Synthesizes speech using ElevenLabs (Primary) with Edge-TTS and gTTS fallbacks.
        """
        if not text:
            return b""

        # Standard voices that are 100% compatible with ElevenLabs FREE tier API
        # Priority: EXAVITQu4vr4xnSDxMaL (Bella) is confirmed working
        voice_ids = [
            "EXAVITQu4vr4xnSDxMaL", # Bella (Standard - Friendly Female) - CONFIRMED WORKING
            "iP95p4H64I86u9K3X4yP", # Aditi (Indian Female - Very Natural)
            "MF3mAn0U9u06S3W2m7jU", # Elli (Standard - Calm, Humanistic Female)
            "AZnzlk1XhxPjt8vD08Py", # Domi (Standard - Professional Female)
            "21m00Tcm4TlvDq8ikWAM", # Rachel (Standard - Clear Female)
        ]

        # Use requested voice if provided
        if voice and voice != "nova" and voice not in voice_ids:
            voice_ids.insert(0, voice)

        for voice_id in voice_ids:
            try:
                logger.info(f"TTS: Attempting ElevenLabs ({voice_id})...")
                audio_stream = self.elevenlabs.text_to_speech.convert(
                    voice_id=voice_id,
                    text=text,
                    model_id="eleven_multilingual_v2"
                )
                
                audio_bytes = b""
                async for chunk in audio_stream:
                    audio_bytes += chunk
                
                if audio_bytes and len(audio_bytes) > 500:
                    logger.info(f"TTS Success: ElevenLabs ({voice_id})")
                    return audio_bytes
            except Exception as e:
                logger.warning(f"ElevenLabs failed for {voice_id}: {str(e)}")
                if "quota_exceeded" in str(e).lower(): break

        # 2. Fallback: Edge-TTS (Free Neural - High Quality)
        indian_voices = ["en-IN-NeerjaNeural", "en-IN-PrabhatNeural"]
        for ev in indian_voices:
            try:
                logger.info(f"TTS Fallback: Attempting Edge-TTS ({ev})...")
                communicate = edge_tts.Communicate(text, ev)
                buffer = io.BytesIO()
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        buffer.write(chunk["data"])
                
                if buffer.tell() > 500:
                    logger.info(f"TTS Success: Edge-TTS ({ev})")
                    return buffer.getvalue()
            except Exception as e:
                logger.warning(f"Edge-TTS failed for {ev}: {str(e)}")

        # 3. Final Fallback: gTTS (Reliable)
        try:
            logger.info("TTS Final Fallback: Attempting gTTS...")
            tts = gTTS(text=text, lang='en', tld='co.in')
            buffer = io.BytesIO()
            tts.write_to_fp(buffer)
            if buffer.tell() > 500:
                logger.info("TTS Success: gTTS")
                return buffer.getvalue()
        except Exception as e:
            logger.error(f"TTS Error: All engines failed: {str(e)}")

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

    async def generate_and_save_question_voice(self, text: str, question_id: str, upload_dir: Path) -> Optional[str]:
        try:
            audio_bytes = await self.synthesize_speech(text)
            if not audio_bytes:
                return None
            
            question_dir = upload_dir / "questions"
            question_dir.mkdir(exist_ok=True, parents=True)
            
            file_name = f"{question_id}.mp3"
            file_path = question_dir / file_name
            
            with open(file_path, "wb") as f:
                f.write(audio_bytes)
            
            return f"questions/{file_name}"
        except Exception as e:
            logger.error(f"Error saving question voice: {str(e)}")
            return None

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
        # Expanded list of invalid/noisy markers to reduce unnecessary LLM calls and latency
        invalid_markers = [
            "", "Listening...", "Processing...", "(No speech detected)", 
            "Introduction recorded.", "Introduction provided.", 
            "(logo whooshing)", "(Music)", "(Laughter)", "(Silence)", "[Music]", "[Laughter]"
        ]
        
        if not clean_answer or clean_answer in invalid_markers or len(clean_answer) < 3:
            logger.warning(f"EVALUATION: Student answer is invalid or too short: '{clean_answer}'")
            return {
                "score": 0.0,
                "feedback": "I couldn't hear your answer clearly. Please ensure you are speaking into the microphone.",
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
            eval_prompt = f"""You are a Senior University Professor conducting a formal Viva examination. 
Question: {question}
Answer Key Reference: {answer_key}
Student's Answer: {clean_answer}

Evaluate the student's response based on technical accuracy and conceptual understanding.

Rules for Evaluation:
1. PROFESSIONALISM: Provide formal, academic feedback. Avoid conversational filler or follow-up questions like "tell us more" or "what are your thoughts". Focus purely on the quality of the answer provided.
2. LENIENT SCORING: While maintaining academic standards, be encouraging with marks. If the student demonstrates a solid grasp of the core concept, assign high marks (8.0-10.0).
3. STT ERROR TOLERANCE: Speech-to-text (STT) may produce phonetic errors (e.g., "prong" instead of "prompt"). If a word sounds similar to a technical term or fits the context, assume the student used the correct terminology.
4. FEEDBACK: Provide 1-2 sentences of professional assessment. Acknowledge what was correct and briefly mention any significant omissions if applicable.

Scoring Scale:
- 9.0 - 10.0: Excellent understanding with technical accuracy.
- 7.0 - 8.5: Good understanding, though some minor technical details may be missing.
- 5.0 - 6.5: Basic conceptual understanding but lacks technical depth.
- Below 5.0: Significant misunderstandings or the answer is largely irrelevant.

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
