import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const html = htm.bind(React.createElement);

const firebaseConfig = {
  apiKey: "AIzaSyCf_kSrJm5Xp_lcMbhbeLPOK_F01L3WEYk",
  authDomain: "mindmap-mcu.firebaseapp.com",
  projectId: "mindmap-mcu",
  storageBucket: "mindmap-mcu.firebasestorage.app",
  messagingSenderId: "322447911415",
  appId: "1:322447911415:web:b185d78b09ba453ae566f2",
  measurementId: "G-L6RW3PL80B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const GEMINI_KEY = "AIzaSyCkPqi6Ojab4RvyXYUQK5BtPKz8M4DWjt8";

// --- Login Component ---
function Login({ onSignIn }) {
  return html`
    <main class="full-screen-center">
      <div class="login-container glass-panel">
        <span class="material-icons brand-logo">psychology</span>
        <h1 class="brand-title">MindMap MCU</h1>
        <p class="brand-tagline">Your AI Well-being Companion</p>
        <button class="btn btn-primary" onClick=${onSignIn}>
          <span class="material-icons">login</span> Sign in with Google
        </button>
      </div>
    </main>
  `;
}

// --- Onboarding Component ---
function Onboarding({ user, onComplete, initialTimetable }) {
  const [classes, setClasses] = useState(initialTimetable || []);
  const [day, setDay] = useState('Monday');
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddClass = () => {
    if (!subject || !startTime || !endTime) return;
    setClasses([...classes, { day, subject, startTime, endTime }]);
    setSubject('');
    setStartTime('');
    setEndTime('');
  };

  const handleRemoveClass = (index) => {
    const newClasses = [...classes];
    newClasses.splice(index, 1);
    setClasses(newClasses);
  };

  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, "users", user.uid), {
      timetable: classes,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setSaving(false);
    onComplete();
  };

  return html`
    <main class="onboarding-container glass-panel">
      <h2>Your Weekly Timetable</h2>
      <p class="text-muted">Let's set up your schedule so MindMap can better support you.</p>
      
      <div class="form-group">
        <label>Day of the Week</label>
        <select class="form-control" value=${day} onChange=${e => setDay(e.target.value)}>
          <option>Monday</option>
          <option>Tuesday</option>
          <option>Wednesday</option>
          <option>Thursday</option>
          <option>Friday</option>
          <option>Saturday</option>
          <option>Sunday</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Subject Name</label>
        <input class="form-control" type="text" placeholder="e.g. Data Structures" value=${subject} onChange=${e => setSubject(e.target.value)} />
      </div>
      
      <div style=${{display: 'flex', gap: '16px', marginBottom: '16px'}}>
        <div class="form-group" style=${{flex: 1}}>
          <label>Start Time</label>
          <input class="form-control" type="time" value=${startTime} onChange=${e => setStartTime(e.target.value)} />
        </div>
        <div class="form-group" style=${{flex: 1}}>
          <label>End Time</label>
          <input class="form-control" type="time" value=${endTime} onChange=${e => setEndTime(e.target.value)} />
        </div>
      </div>
      
      <button class="btn btn-secondary" onClick=${handleAddClass} style=${{width: '100%', marginBottom: '24px'}}>
        <span class="material-icons">add</span> Add Class
      </button>

      <div class="classes-list">
        ${classes.map((cls, idx) => html`
          <div class="class-card" key=${idx}>
            <div>
              <strong>${cls.subject}</strong>
              <div class="text-muted">${cls.day} • ${cls.startTime} - ${cls.endTime}</div>
            </div>
            <button class="btn-icon" onClick=${() => handleRemoveClass(idx)} style=${{background: 'transparent', color: 'var(--mcu-red)', border: 'none'}}>
              <span class="material-icons">delete</span>
            </button>
          </div>
        `)}
        ${classes.length === 0 && html`<p class="text-muted" style=${{textAlign: 'center', margin: '24px 0'}}>No classes added yet.</p>`}
      </div>

      <button class="btn btn-primary" onClick=${handleSave} disabled=${saving} style=${{width: '100%', marginTop: '24px'}}>
        <span class="material-icons">save</span> ${saving ? 'Saving...' : 'Save My Schedule'}
      </button>
    </main>
  `;
}

// --- Home Component ---
function Home({ user, onEditTimetable }) {
  const [timetable, setTimetable] = useState([]);
  const [mood, setMood] = useState('😐 Okay');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Load timetable
    getDoc(doc(db, "users", user.uid)).then(docSnap => {
      if (docSnap.exists()) {
        setTimetable(docSnap.data().timetable || []);
      }
    });

    // Load messages
    const q = query(collection(db, "users", user.uid, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => doc.data());
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [user]);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel previous
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      // Slight adjustments for a warmer tone if supported
      utterance.pitch = 1.1; 
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in your browser. Please try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };

    recognition.onspeechend = () => {
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Save user message
    await addDoc(collection(db, "users", user.uid, "messages"), {
      role: 'user',
      content: text,
      timestamp: serverTimestamp()
    });

    // Prepare prompt
    const timetableStr = timetable.map(c => `${c.day}: ${c.subject} (${c.startTime}-${c.endTime})`).join(', ');
    const systemPrompt = `You are MindMap, a caring AI well-being companion built for Ming Chuan University students in Taoyuan, Taiwan. The student's weekly timetable is: [${timetableStr}]. Their current mood is: [${mood}]. Help them manage stress, plan breaks, suggest wellness activities, and check on their mental health. Be warm, practical, and concise (3-5 sentences max).`;

    // History to Gemini (limit to last 6 messages to save tokens)
    const history = messages.slice(-6).map(m => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const contents = [
      ...history,
      { role: 'user', parts: [{ text: "System Context: " + systemPrompt + "\n\nUser Message: " + text }] }
    ];

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });
      const data = await response.json();
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that.";

      await addDoc(collection(db, "users", user.uid, "messages"), {
        role: 'bot',
        content: botReply,
        timestamp: serverTimestamp()
      });

      speak(botReply);

    } catch (err) {
      console.error(err);
      await addDoc(collection(db, "users", user.uid, "messages"), {
        role: 'bot',
        content: "I'm having trouble connecting to my brain right now. Take a deep breath and try again in a moment.",
        timestamp: serverTimestamp()
      });
    } finally {
      setIsTyping(false);
    }
  };

  return html`
    <div class="home-layout">
      <header class="app-header">
        <div style=${{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span class="material-icons" style=${{color: 'var(--mcu-red)'}}>psychology</span>
          <h2 style=${{margin: 0, fontSize: '1.25rem'}}>MindMap MCU</h2>
        </div>
        <a href="#" onClick=${(e) => { e.preventDefault(); onEditTimetable(); }} style=${{color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none'}}>View/Edit Timetable</a>
      </header>
      
      <div class="mood-bar glass-panel">
        <button class=${`mood-btn ${mood === '😊 Good' ? 'active' : ''}`} onClick=${() => setMood('😊 Good')}>😊 Good</button>
        <button class=${`mood-btn ${mood === '😐 Okay' ? 'active' : ''}`} onClick=${() => setMood('😐 Okay')}>😐 Okay</button>
        <button class=${`mood-btn ${mood === '😰 Stressed' ? 'active' : ''}`} onClick=${() => setMood('😰 Stressed')}>😰 Stressed</button>
      </div>

      <div class="chat-container">
        ${messages.length === 0 && html`<p class="text-muted" style=${{textAlign: 'center', marginTop: 'auto', marginBottom: 'auto'}}>Send a message to start chatting with MindMap.</p>`}
        
        ${messages.map((msg, i) => html`
          <div key=${i} class=${`message ${msg.role}`}>
            ${msg.content}
          </div>
        `)}
        
        ${isTyping && html`
          <div class="message bot" style=${{opacity: 0.7}}>
            MindMap is typing...
          </div>
        `}
        <div ref=${chatEndRef}></div>
      </div>

      <div class="chat-input-area">
        <input 
          type="text" 
          class="chat-input" 
          placeholder="How are you feeling?" 
          value=${inputValue} 
          onChange=${e => setInputValue(e.target.value)}
          onKeyPress=${e => e.key === 'Enter' && handleSend()}
          disabled=${isTyping}
        />
        <button class=${`btn btn-icon btn-secondary ${isListening ? 'mic-pulsing' : ''}`} onClick=${handleMic} title="Use voice">
          <span class="material-icons">mic</span>
        </button>
        <button class="btn btn-icon btn-primary" onClick=${handleSend} disabled=${isTyping || !inputValue.trim()} title="Send message">
          <span class="material-icons">send</span>
        </button>
      </div>
    </div>
  `;
}

// --- Main App Component ---
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // 'login', 'onboarding', 'home'
  const [timetable, setTimetable] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        setUser(currUser);
        const docSnap = await getDoc(doc(db, "users", currUser.uid));
        if (docSnap.exists() && docSnap.data().timetable && docSnap.data().timetable.length > 0) {
          setTimetable(docSnap.data().timetable);
          setView('home');
        } else {
          setView('onboarding');
        }
      } else {
        setUser(null);
        setView('login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => {
      console.error(err);
      alert("Sign in failed. Please try again.");
    });
  };

  if (loading) {
    return html`
      <div class="full-screen-center">
        <span class="material-icons" style=${{fontSize: '64px', color: 'var(--mcu-red)', animation: 'pulse 1.5s infinite'}}>psychology</span>
      </div>
    `;
  }

  if (view === 'login') {
    return html`<${Login} onSignIn=${handleSignIn} />`;
  }
  
  if (view === 'onboarding') {
    return html`
      <${Onboarding} 
        user=${user} 
        initialTimetable=${timetable} 
        onComplete=${() => {
          getDoc(doc(db, "users", user.uid)).then(d => {
            setTimetable(d.data().timetable);
            setView('home');
          });
        }} 
      />
    `;
  }
  
  if (view === 'home') {
    return html`<${Home} user=${user} onEditTimetable=${() => setView('onboarding')} />`;
  }
}

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
