import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { 
  Mic, StopCircle, Volume2, Send, CheckCircle2, XCircle, 
  Clock, Award, Brain, MessageSquare, ArrowRight, Loader2, Sun, Moon, User, Bot, UserCircle
} from 'lucide-react';

const VivaExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [examStage, setExamStage] = useState('loading'); // 'loading', 'intro', 'exam', 'completed'
  const [chatHistory, setChatHistory] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const stageRef = useRef('loading');
  const chatEndRef = useRef(null);
  const introPlayedRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');

  const isRecordingRef = useRef(false);

  useEffect(() => {
    stageRef.current = examStage;
  }, [examStage]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const fetchRef = useRef(false);

  useEffect(() => {
    const fetchExamDetails = async () => {
      if (fetchRef.current) return;
      fetchRef.current = true;
      try {
        const res = await api.post(`/viva-exams/${examId}/start`);
        setExam(res.data);
        setQuestions(res.data.questions);
        setTimeLeft(res.data.duration_minutes * 60);
        
        setExamStage('intro');
        if (!introPlayedRef.current) {
          introPlayedRef.current = true;
          playAudio("Hello. I am your AI examiner. Before we begin the questions, please briefly introduce yourself.", true);
        }
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to start exam.');
        navigate('/student/dashboard');
      }
    };
    fetchExamDetails();
  }, [examId, navigate]);

  useEffect(() => {
    if (timeLeft <= 0 && exam && examStage === 'exam') {
      handleCompleteExam();
      return;
    }
    const timer = setInterval(() => {
      if (timeLeft > 0 && examStage === 'exam') setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, exam, examStage]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const playAudio = async (text, addToChat = false) => {
    try {
      if (addToChat) {
        setChatHistory(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.text === text && lastMsg.sender === 'ai') return prev;
          return [...prev, { sender: 'ai', text, timestamp: new Date() }];
        });
      }

      // 1. Try Backend ElevenLabs TTS
      const response = await api.post('/voice/synthesize', { text });
      
      if (response.data && response.data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`);
        await audio.play();
        return;
      }
      
      // 2. Fallback to Browser Speech Synthesis if Backend fails or returns empty
      console.warn("Backend TTS failed or returned empty. Using Browser Fallback.");
      speakWithBrowser(text);

    } catch (error) {
      console.error('TTS Error, attempting Browser Fallback:', error);
      speakWithBrowser(text);
    }
  };

  const speakWithBrowser = (text) => {
    if (!('speechSynthesis' in window)) {
      console.error("Browser does not support Speech Synthesis.");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US')
    );
    
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  const detectSilence = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    source.connect(analyser);
    analyser.fftSize = 512; // Moderate size for efficiency
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    let silenceStart = Date.now();
    // Adjusted thresholds for more reliable VAD
    const SILENCE_THRESHOLD = 25; // Higher threshold to ignore low background noise
    const SILENCE_DURATION = 3000; // 3 seconds of continuous silence to auto-submit
    const MAX_RECORDING_TIME = 60000; // 60 seconds safety limit
    const recordingStart = Date.now();

    const checkAudioLevel = () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;

      analyser.getByteFrequencyData(dataArray);
      
      let maxVolume = 0;
      for(let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxVolume) maxVolume = dataArray[i];
      }

      // Debug volume levels (optional: remove in production)
      // console.log("Current volume:", maxVolume);

      if (maxVolume > SILENCE_THRESHOLD) {
        // Sound detected, reset silence start time
        silenceStart = Date.now();
      } else {
        // Silence detected, check how long
        const silentFor = Date.now() - silenceStart;
        if (silentFor > SILENCE_DURATION) {
          console.log("Silence detected for", silentFor, "ms. Auto-submitting...");
          stopRecording();
          return;
        }
      }

      // Safety timeout
      if (Date.now() - recordingStart > MAX_RECORDING_TIME) {
        console.log("Max recording time reached. Auto-submitting...");
        stopRecording();
        return;
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      // Initialize Speech Recognition for Real-time Feedback and VAD
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interimTranscript += event.results[i][0].transcript;
          }
          if (interimTranscript) {
            setTranscript(interimTranscript);
            transcriptRef.current = interimTranscript; // Keep ref in sync
            // RESET silence timer whenever we get a transcript result
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }
            silenceTimerRef.current = setTimeout(() => {
              console.log("Speech recognition silence timeout reached. Auto-submitting...");
              stopRecording();
            }, 3000); // 3 seconds of no new transcript results
          }
        };

        recognitionRef.current.onend = () => {
          // If it ends unexpectedly but we are still in recording state, restart it
          if (isRecordingRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch(e) {}
          }
        };

        recognitionRef.current.start();
      }

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleAudioSubmit(audioBlob);
      };

      mediaRecorderRef.current.start(1000); // Send chunks every 1 second
      setIsRecording(true);
      setFeedback(null);
      setTranscript('Listening...');
      transcriptRef.current = ''; // Clear ref
      
      // Start backup volume-based silence detection
      detectSilence(stream);
    } catch (err) {
      toast.error('Microphone access denied. Please enable it in your browser settings.');
    }
  };

  const handleAudioSubmit = async (audioBlob) => {
    // If we have a local transcript from SpeechRecognition, use it
    const localTranscript = transcriptRef.current;
    
    // Check current stage using ref to avoid stale closure issues
    if (stageRef.current === 'intro') {
      setIsProcessing(true);
      
      // Use the actual transcript if available, otherwise a default
      const introText = localTranscript || "Introduction recorded.";
      
      setTranscript(introText);
      setChatHistory(prev => [...prev, { sender: 'user', text: introText, timestamp: new Date() }]);
      
      // Simulate a short processing delay for the intro
      setTimeout(() => {
        setIsProcessing(false);
        toast.success("Introduction received.");
        
        // Transition to Exam
        setExamStage('exam');
        stageRef.current = 'exam';
        
        // Play first question after a short delay
        if (questions.length > 0) {
          setTimeout(() => playAudio(questions[0].question_text, true), 1000);
          // Auto-start recording for the first question after it's played
          setTimeout(() => startRecording(), 4000);
        }
      }, 1000);
    } else {
      // Handle Exam Question
      submitAnswer(audioBlob);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    // Cleanup Audio Context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // Stop all tracks in the stream to turn off mic indicator
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      setIsProcessing(true);
      setTranscript('Processing...');
    }
  };

  const submitAnswer = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'answer.webm');
    formData.append('question_id', questions[currentQuestionIndex].id);
    
    // Capture the local transcript from ref
    const localUserText = transcriptRef.current;

    if (localUserText) {
      formData.append('transcript', localUserText);
    }

    console.log("SUBMIT_ANSWER: Starting submission...");
    console.log(`SUBMIT_ANSWER: Audio size: ${audioBlob.size} bytes`);
    console.log(`SUBMIT_ANSWER: Local transcript: "${localUserText}"`);

    try {
      console.log("SUBMIT_ANSWER: Sending POST request to /submit-answer");
      const res = await api.post(`/viva-exams/${examId}/submit-answer`, formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      
      console.log("SUBMIT_ANSWER: Raw response received:", JSON.stringify(res.data, null, 2));
      const { transcript: serverText, evaluation, feedback, is_system_action, follow_up_hint, score } = res.data;
      
      console.log(`SUBMIT_ANSWER: Processed results -> Score: ${score}, Feedback: "${feedback}", Evaluation: ${evaluation}`);
      
      // Prioritize server transcript, fallback to local transcript, then to default message
      const finalUserText = serverText || localUserText || "(No speech detected)";
      
      console.log(`SUBMIT_ANSWER: Final user text for chat: "${finalUserText}"`);

      setTranscript(finalUserText);
      setChatHistory(prev => {
        // Prevent adding duplicate messages if the last message was already this transcript
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.text === finalUserText && lastMsg.sender === 'user') {
          console.log("SUBMIT_ANSWER: Duplicate message detected in chat history, skipping append.");
          return prev;
        }
        return [...prev, { sender: 'user', text: finalUserText, timestamp: new Date() }];
      });
      
      if (evaluation === 'repeat' || evaluation === 'clarify') {
        // AI detected student wants to repeat or clarify
        await playAudio(feedback, true); 
        setTimeout(() => {
          playAudio(questions[currentQuestionIndex].question_text, false);
        }, 1500);
        setFeedback(null);
        setTimeout(() => startRecording(), 3000); 
      } else if (feedback && feedback.toLowerCase().includes("couldn't hear")) {
        // Handle "couldn't hear you" - play message and restart mic
        await playAudio(feedback, true);
        setFeedback(null);
        setTimeout(() => startRecording(), 3000);
      } else {
        setFeedback(res.data);
        let speechText = feedback;
        if (follow_up_hint) speechText += ". " + follow_up_hint;
        playAudio(speechText, true);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error('Failed to submit answer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTranscript('');
      setFeedback(null);
      playAudio(questions[nextIndex].question_text, true);
    } else {
      handleCompleteExam();
    }
  };

  const handleCompleteExam = async () => {
    try {
      await api.post(`/viva-exams/${examId}/complete`);
      setExamStage('completed');
      toast.success('Exam completed successfully!');
      navigate('/student/dashboard');
    } catch (error) {
      toast.error('Failed to finalize exam.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!exam) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="font-bold text-xl text-muted-foreground">Preparing Secure Exam Environment...</p>
      </div>
    </div>
  );

  const progress = ((currentQuestionIndex + (examStage === 'completed' ? 1 : 0)) / questions.length) * 100;
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
      {/* Header - Fixed */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-md px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-lg">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient hidden sm:block">
            Viva Live
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-muted rounded-full border border-border">
            <Clock className={`w-4 h-4 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-primary'}`} />
            <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : ''}`}>{formatTime(timeLeft)}</span>
          </div>
          {examStage === 'exam' && (
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest hidden md:block">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          )}
          {examStage === 'intro' && (
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Introduction</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCompleteExam} className="text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl">
            End Session
          </Button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Chat History */}
        <aside className="hidden lg:flex w-1/3 max-w-sm flex-col border-r border-border bg-card/30">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="w-4 h-4" /> Live Transcript
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === 'ai' ? 'bg-primary/10 text-primary' : 'bg-brand-gradient text-white'
                }`}>
                  {msg.sender === 'ai' ? <Bot className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
                </div>
                <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${
                  msg.sender === 'ai' 
                    ? 'bg-muted text-foreground rounded-tl-none' 
                    : 'bg-primary/10 text-foreground rounded-tr-none border border-primary/20'
                }`}>
                  <p>{msg.text}</p>
                  <span className="text-[10px] opacity-50 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </aside>

        {/* Main Content - Right Side */}
        <main className="flex-1 flex flex-col relative overflow-y-auto">
          {/* Progress Bar */}
          <div className="h-1 w-full bg-muted shrink-0">
            <div 
              className="h-full bg-brand-gradient transition-all duration-500" 
              style={{ width: `${examStage === 'intro' ? 5 : progress}%` }}
            ></div>
          </div>

          <div className="flex-1 max-w-3xl w-full mx-auto p-6 lg:p-10 flex flex-col gap-8">
        {/* Content Area */}
        {examStage === 'intro' ? (
          <div className="bg-card border border-border rounded-[2.5rem] p-8 lg:p-12 shadow-xl shadow-primary/5 animate-fade-in relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <User className="w-32 h-32" />
            </div>
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold leading-tight">Candidate Introduction</h2>
              <p className="text-muted-foreground text-lg max-w-lg">
                Please introduce yourself. Mention your name and student ID for verification.
              </p>
              <Button 
                variant="outline" 
                onClick={() => playAudio("Hello. I am your AI examiner. Before we begin the questions, please briefly introduce yourself.", false)}
                className="rounded-xl gap-2 font-bold border-2 hover:bg-muted mt-4"
              >
                <Volume2 className="w-4 h-4" /> Replay Instructions
              </Button>
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="bg-card border border-border rounded-[2.5rem] p-8 lg:p-12 shadow-xl shadow-primary/5 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Brain className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
                {currentQuestion.subject?.toUpperCase() || 'GENERAL'} • {currentQuestion.difficulty?.toUpperCase() || 'STANDARD'}
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold leading-tight mb-8">
                {currentQuestion.question_text}
              </h2>

              <Button 
                variant="outline" 
                onClick={() => playAudio(currentQuestion.question_text, false)}
                className="rounded-xl gap-2 font-bold border-2 hover:bg-muted"
              >
                <Volume2 className="w-4 h-4" /> Replay Question
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-10 font-bold text-muted-foreground">Loading Question...</div>
        )}

        {/* Interaction Area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 py-4">
          {!feedback ? (
            <div className="flex flex-col items-center gap-6 w-full max-w-lg">
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping scale-150"></div>
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
                    isRecording 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-brand-gradient text-white hover:scale-110 shadow-primary/30'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-10 h-10 animate-spin" />
                  ) : isRecording ? (
                    <StopCircle className="w-12 h-12" />
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className={`font-bold text-lg mb-2 ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
                  {isProcessing ? 'Processing...' : isRecording ? 'Listening...' : 'Tap to Speak'}
                </p>
                {transcript && !feedback && (
                  <div className="bg-muted/50 border border-border rounded-2xl p-4 max-w-md mx-auto italic text-sm text-muted-foreground flex gap-3 items-start">
                    <MessageSquare className="w-4 h-4 mt-1 shrink-0" />
                    "{transcript}"
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6 animate-scale-in">
              <div className="bg-card border border-border rounded-3xl p-8 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    feedback.score >= 7 ? 'bg-success-gradient text-white' : 'bg-food-gradient text-white'
                  }`}>
                    <Award className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">Evaluation Result</h4>
                    <p className="text-sm text-muted-foreground font-bold">AI Scored: <span className="text-primary">{feedback.score}/10</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-2xl text-sm leading-relaxed">
                    <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-2">Feedback</p>
                    {feedback.feedback}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={handleNextQuestion}
                  className="bg-brand-gradient text-white h-14 px-12 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 btn-hover gap-2"
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Exam'}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
          </div>

          {/* Status Bar */}
          <footer className="border-t border-border bg-card/30 p-4 text-center shrink-0">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-tighter">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Secure AI Proctoring Active
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default VivaExamPage;