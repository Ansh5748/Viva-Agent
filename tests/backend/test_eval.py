import sys
import asyncio
from pathlib import Path

async def test_eval():
    sys.path.append(r"c:\Users\Divyansh Gupta\OneDrive\Desktop\Viva_Agent\APP\backend")
    from voice_service import VoiceService
    vs = VoiceService()
    
    question = "What is prompt engineering?"
    student_answer = "compensation basically for desired output including elements like background and animation"
    answer_key = "Guiding AI models with specific instructions/prompts to get desired results."
    
    print(f"Testing evaluation for: '{student_answer}'")
    result = await vs.evaluate_answer(question, student_answer, answer_key)
    print(f"Result: {result}")
    
    if result['score'] > 1.0:
        print("Scoring fix VERIFIED (Score > 1.0)")
    else:
        print("Scoring fix FAILED (Score <= 1.0)")

if __name__ == "__main__":
    asyncio.run(test_eval())
