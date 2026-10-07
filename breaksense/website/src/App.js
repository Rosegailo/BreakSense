import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Users, MessageSquare, TrendingUp, LogOut, Search, AlertCircle, CheckCircle, Clock, Send, BarChart2, User, Lock, MoreHorizontal, Sun, Moon, ChevronDown, X
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

const API_BASE_URL = 'https://breaksense-backend.onrender.com/api';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('counselor'));
  const [counselor, setCounselor] = useState(() => JSON.parse(localStorage.getItem('counselor')));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setInputText] = useState('');
  const [studentStats, setStudentStats] = useState(null);
  const [view, setView] = useState('chat'); // 'chat' or 'stats'
  const [requestSent, setRequestSent] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [isRiskMenuOpen, setIsRiskMenuOpen] = useState(false);
  const [webToast, setWebToast] = useState(null);
  const [unreadStudentIds, setUnreadStudentIds] = useState({});
  const lastMessageIdsRef = useRef({});
  const isInitialWebLoadRef = useRef(true);

  const [viewedStudents, setViewedStudents] = useState(() => {
    try {
      const saved = sessionStorage.getItem('viewedStudents');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });
  const chatEndRef = useRef(null);

  // Request browser notification permission
  useEffect(() => {
    if (isLoggedIn && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isLoggedIn]);

  // Auto-dismiss toast notification after 5 seconds
  useEffect(() => {
    if (webToast) {
      const timer = setTimeout(() => {
        setWebToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [webToast]);

  // Audio Synthesizer Notification Chime
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  const markStudentAsViewed = (id) => {
    const updated = { ...viewedStudents, [id]: true };
    setViewedStudents(updated);
    sessionStorage.setItem('viewedStudents', JSON.stringify(updated));
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (view === 'chat') {
      scrollToBottom();
    }
  }, [messages, view]);

  // Theme configuration - matching dark slate design & high contrast light mode
  const theme = {
    bg: isDarkMode ? 'bg-[#111319]' : 'bg-[#F8F9FA]',
    sidebar: isDarkMode ? 'bg-[#1A1D27]' : 'bg-white',
    sidebarBorder: isDarkMode ? 'border-[#282C3B]' : 'border-[#E9ECEF]',
    header: isDarkMode ? 'bg-[#1A1D27]' : 'bg-white',
    headerBorder: isDarkMode ? 'border-[#282C3B]' : 'border-[#E9ECEF]',
    card: isDarkMode ? 'bg-[#1B1E2B]' : 'bg-white',
    cardLighter: isDarkMode ? 'bg-[#212534]' : 'bg-[#F1F3F5]',
    border: isDarkMode ? 'border-[#282C3B]' : 'border-[#E9ECEF]',
    text: isDarkMode ? 'text-white' : 'text-[#212529]',
    textMuted: isDarkMode ? 'text-[#8E95A5]' : 'text-[#495057]',
    textHeading: isDarkMode ? 'text-white' : 'text-[#212529]',
    input: isDarkMode ? 'bg-[#282C3B]' : 'bg-white border border-[#DEE2E6]',
    inputArea: isDarkMode ? 'bg-[#111319]' : 'bg-[#F8F9FA]',
    accentGreen: isDarkMode ? '#00FF88' : '#059669',
    accentOrange: isDarkMode ? '#FF7A00' : '#EA580C',
    accentBlue: isDarkMode ? '#2E6BFF' : '#2563EB',
    accentPurple: isDarkMode ? '#A855F7' : '#7C3AED',
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      if (res.data.success && res.data.user.role === 'counselor') {
        const user = res.data.user;
        setCounselor(user);
        setIsLoggedIn(true);
        localStorage.setItem('counselor', JSON.stringify(user));
        fetchStudents();
      } else {
        alert("Access Denied: Only counselors can access this portal.");
      }
    } catch (e) { alert("Login failed. Check credentials."); }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setCounselor(null);
    localStorage.removeItem('counselor');
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/students`);
      setStudents(res.data);
    } catch (e) { console.log("Failed to fetch students", e); }
  };

  // Auto-fetch students if already logged in on refresh
  useEffect(() => {
    if (isLoggedIn && counselor) {
      fetchStudents();
    }
  }, [isLoggedIn, counselor]);

  const loadStudentData = async (student, targetView = 'chat') => {
    setSelectedStudent(student);
    setView(targetView);
    setRequestSent(student.analyticsAccessStatus === 'pending');
    setUnreadStudentIds(prev => ({ ...prev, [student._id]: false }));
    try {
      const chatRes = await axios.get(`${API_BASE_URL}/messages/history?user1=${counselor.id}&user2=${student._id}&requesterRole=counselor`);
      setMessages(chatRes.data);
    } catch (e) { console.log("Error loading student data", e); }
  };

  // Fetch stats when moving to stats view
  useEffect(() => {
    if (selectedStudent && view === 'stats' && selectedStudent.analyticsAccessStatus === 'granted') {
      const fetchStats = async () => {
        try {
          const statsRes = await axios.get(`${API_BASE_URL}/breaks/stats?user_id=${selectedStudent._id}`);
          setStudentStats(statsRes.data);
        } catch (e) { console.log("Stats fetch error", e); }
      };
      fetchStats();
    }
  }, [selectedStudent, view]);

  const requestAccess = async () => {
    try {
      await axios.put(`${API_BASE_URL}/auth/request-access`, { userId: selectedStudent._id });
      setRequestSent(true);
      fetchStudents(); // Refresh student list to update status
    } catch (e) { console.log("Request access error", e); }
  };

  // Auto-refresh chat, student list, and check for new student messages every 4 seconds
  useEffect(() => {
    let interval;
    if (isLoggedIn && counselor) {
      interval = setInterval(async () => {
        try {
           // Always refresh students to keep access status updated
           const studentRes = await axios.get(`${API_BASE_URL}/auth/students`);
           const updatedStudents = studentRes.data || [];
           setStudents(updatedStudents);

           if (selectedStudent) {
             const updatedSelected = updatedStudents.find(s => s._id === selectedStudent._id);
             if (updatedSelected && updatedSelected.analyticsAccessStatus !== selectedStudent.analyticsAccessStatus) {
               setSelectedStudent(updatedSelected);
             }

             // If a student is selected and we are in chat view, refresh messages
             if (view === 'chat') {
               const chatRes = await axios.get(`${API_BASE_URL}/messages/history?user1=${counselor.id}&user2=${selectedStudent._id}&requesterRole=counselor`);
               setMessages(chatRes.data);
             }
           }

           // Check for new incoming messages across all students for counselor notifications
           for (const s of updatedStudents) {
             try {
               const chatRes = await axios.get(`${API_BASE_URL}/messages/history?user1=${counselor.id}&user2=${s._id}&requesterRole=counselor`);
               const history = chatRes.data || [];
               if (history.length > 0) {
                 const latestMsg = history[history.length - 1];
                 const prevMsgId = lastMessageIdsRef.current[s._id];

                 if (isInitialWebLoadRef.current) {
                   lastMessageIdsRef.current[s._id] = latestMsg._id;
                 } else if (
                   latestMsg._id !== prevMsgId &&
                   latestMsg.sender === s._id &&
                   !latestMsg.text.includes('System:')
                 ) {
                   lastMessageIdsRef.current[s._id] = latestMsg._id;
                   playNotificationSound();
                   setWebToast({ student: s, text: latestMsg.text });

                   if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                     new Notification(`New Message from ${s.first_name}`, { body: latestMsg.text });
                   }

                   if (!selectedStudent || selectedStudent._id !== s._id || view !== 'chat') {
                     setUnreadStudentIds(prev => ({ ...prev, [s._id]: true }));
                   }
                 } else {
                   lastMessageIdsRef.current[s._id] = latestMsg._id;
                 }
               }
             } catch (err) {}
           }

           if (isInitialWebLoadRef.current) {
             isInitialWebLoadRef.current = false;
           }
        } catch (e) {}
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [selectedStudent, isLoggedIn, counselor, view]);

  const sendMessage = async () => {
    if (!replyText.trim()) return;

    if (editingMessageId) {
      try {
        await axios.put(`${API_BASE_URL}/messages/update/${editingMessageId}`, { text: replyText });
        setMessages(messages.map(m => m._id === editingMessageId ? { ...m, text: replyText } : m));
        setEditingMessageId(null);
        setInputText('');
      } catch (e) { console.log("Edit error", e); }
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/messages/send`, {
        senderId: counselor.id,
        recipientId: selectedStudent._id,
        text: replyText
      });
      setMessages([...messages, res.data.message]);
      setInputText('');
    } catch (e) { console.log("Send error", e); }
  };

  const deleteMessage = async (msgId) => {
    try {
      await axios.delete(`${API_BASE_URL}/messages/delete/${msgId}?role=counselor`);
      setMessages(messages.filter(m => m._id !== msgId));
      setMenuOpenId(null);
    } catch (e) { console.log("Delete error", e); }
  };

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
    setMenuOpenId(null);
  };

  const startEdit = (msg) => {
    setInputText(msg.text);
    setEditingMessageId(msg._id);
    setMenuOpenId(null);
  };

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg} px-4 font-sans transition-colors duration-300`}>
        <div className={`max-w-md w-full ${theme.card} rounded-[2rem] p-10 border ${theme.border} shadow-2xl`}>
          <div className="text-center mb-10">
            <div className="w-32 h-32 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <img src="/logo.png" alt="BreakSense Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className={`text-3xl font-bold ${theme.text} tracking-tight`}>Counselor <span className="text-[#00FF88]">Portal</span></h1>
            <p className={`${theme.textMuted} mt-2 font-medium`}>MERN - Stack Support System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full px-6 py-4 ${theme.input} border-none rounded-2xl ${theme.text} placeholder-[#555] focus:ring-2 focus:ring-[#00FF88]`}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full px-6 py-4 ${theme.input} border-none rounded-2xl ${theme.text} placeholder-[#555] focus:ring-2 focus:ring-[#00FF88]`}
              required
            />
            <button type="submit" className="w-full bg-[#00FF88] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00E67A] transition-all duration-300 shadow-lg shadow-[#00FF8822]">
              Access Dashboard
            </button>
          </form>

          {/* Theme Toggle for Login Page */}
          <div className="mt-8 flex justify-center">
            <div className={`flex items-center ${theme.cardLighter} rounded-full p-1 border ${theme.border}`}>
              <button
                onClick={() => setIsDarkMode(false)}
                className={`p-2 rounded-full transition-all ${!isDarkMode ? 'bg-[#0066FF] text-white shadow-lg' : theme.textMuted}`}
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => setIsDarkMode(true)}
                className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-[#0066FF] text-white shadow-lg' : theme.textMuted}`}
              >
                <Moon size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultCategories = { 'Physical Movement': 0, 'Mindfulness': 0, 'Nutrition': 0, 'Rest & Recovery': 0 };
  const counts = studentStats?.categoryCounts ? { ...defaultCategories, ...studentStats.categoryCounts } : defaultCategories;
  const catData = Object.entries(counts).map(([name, value]) => ({ name, value }));

  return (
    <div className={`h-screen ${theme.bg} flex ${theme.text} font-sans overflow-hidden transition-colors duration-300`}>
      {/* Sidebar - Fixed 240px width (w-60) */}
      <aside className={`w-60 flex-shrink-0 ${theme.sidebar} border-r ${theme.sidebarBorder} flex flex-col h-full shadow-2xl`}>
        <div className={`h-20 w-full ${theme.sidebar} border-b ${theme.sidebarBorder} px-4 flex items-center justify-center gap-2 overflow-hidden`}>
          <img src="/logo_web.png" alt="BreakSense Logo" className="h-10 w-auto object-contain flex-shrink-0" />
          <span className={`text-2xl font-black ${theme.text} italic tracking-tighter whitespace-nowrap`}>Break<span className="text-[#00FF88] not-italic">Sense</span></span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <p className={`text-xs font-bold ${theme.textMuted} uppercase tracking-[0.15em] mb-3 px-1`}>STUDENT DIRECTORY</p>
            <div className="space-y-2">
              {students.map(s => (
                <button
                  key={s._id}
                  onClick={() => loadStudentData(s)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 ${selectedStudent?._id === s._id ? `${theme.cardLighter} ring-1 ring-[#00FF8844] shadow-lg` : `hover:${theme.cardLighter}`}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${theme.cardLighter} border ${theme.border} flex items-center justify-center shadow-inner flex-shrink-0 relative`}>
                    <User size={18} className={theme.textMuted} />
                    {unreadStudentIds[s._id] && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#00FF88] rounded-full ring-2 ring-[#111319] animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold truncate capitalize ${theme.text}`}>{s.first_name} {s.last_name}</p>
                      {unreadStudentIds[s._id] && (
                        <span className="text-[9px] font-black bg-[#00FF88] text-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">NEW</span>
                      )}
                    </div>
                    <p className={`text-xs ${theme.textMuted} font-semibold uppercase tracking-wider mt-0.5 opacity-90`}>Streak: {s.DayStreak || 0}D</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`h-20 ${theme.sidebar} border-t ${theme.border} px-4 flex items-center justify-between gap-2`}>
          <button onClick={handleSignOut} className={`flex items-center gap-2 ${theme.textMuted} hover:${theme.text} transition-colors py-2 font-bold uppercase tracking-wider text-xs`}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>

          {/* Theme Toggle Sidebar */}
          <div className={`flex items-center ${theme.cardLighter} rounded-full p-1 border ${theme.border}`}>
            <button
              onClick={() => setIsDarkMode(false)}
              className={`p-1.5 rounded-full transition-all ${!isDarkMode ? 'bg-[#0066FF] text-white shadow-lg' : theme.textMuted}`}
            >
              <Sun size={12} />
            </button>
            <button
              onClick={() => setIsDarkMode(true)}
              className={`p-1.5 rounded-full transition-all ${isDarkMode ? 'bg-[#0066FF] text-white shadow-lg' : theme.textMuted}`}
            >
              <Moon size={12} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col ${theme.bg}`}>
        {selectedStudent ? (
          <>
            <header className={`h-20 ${theme.header} border-b ${theme.headerBorder} px-10 flex items-center justify-between shadow-lg`}>
              <div className="flex items-center gap-8">
                 <div className={`flex ${theme.cardLighter} p-1 rounded-xl border ${theme.border}`}>
                    <button
                      onClick={() => setView('chat')}
                      className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${view === 'chat' ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF8833]' : theme.textMuted}`}
                    >
                      CONSULTATION
                    </button>
                    <button
                      onClick={() => setView('analytics_init')}
                      className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${view !== 'chat' ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF8833]' : theme.textMuted}`}
                    >
                      ANALYTICS
                    </button>
                 </div>
              </div>

              <div className="flex items-center gap-4 h-full">
                 <span className={`text-sm font-bold ${theme.textMuted} uppercase tracking-[0.15em] leading-relaxed`}>RISK LEVEL:</span>
                 <div className="relative">
                    {(() => {
                      const currentRiskLevel = selectedStudent.riskLevel || (selectedStudent.DayStreak > 3 ? 'STABLE' : 'WATCH LIST');
                      const handleUpdateRisk = async (newLevel) => {
                        setIsRiskMenuOpen(false);
                        const updated = { ...selectedStudent, riskLevel: newLevel };
                        setSelectedStudent(updated);
                        setStudents(students.map(s => s._id === selectedStudent._id ? updated : s));
                        try {
                           await axios.put(`${API_BASE_URL}/auth/update-risk-level`, {
                             userId: selectedStudent._id,
                             riskLevel: newLevel
                           });
                        } catch (err) { console.log("Failed to update risk level", err); }
                      };

                      return (
                        <>
                          <button
                            onClick={() => setIsRiskMenuOpen(!isRiskMenuOpen)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all cursor-pointer shadow-lg hover:brightness-110 ${
                              currentRiskLevel === 'HIGH RISK'
                                ? 'bg-[#FF3B3B] text-white shadow-[#FF3B3B33]'
                                : currentRiskLevel === 'STABLE'
                                ? 'bg-[#00FF88] text-black shadow-[#00FF8833]'
                                : 'bg-[#FF7A00] text-white shadow-[#FF7A0033]'
                            }`}
                          >
                            <span>{currentRiskLevel}</span>
                            <ChevronDown size={14} className={currentRiskLevel === 'STABLE' ? 'text-black' : 'text-white'} />
                          </button>

                          {isRiskMenuOpen && (
                            <div
                              onMouseLeave={() => setIsRiskMenuOpen(false)}
                              className={`absolute top-full right-0 mt-2 z-50 ${theme.card} border ${theme.border} rounded-xl shadow-2xl overflow-hidden min-w-[140px] p-1.5 space-y-1`}
                            >
                              <button
                                onClick={() => handleUpdateRisk('WATCH LIST')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  currentRiskLevel === 'WATCH LIST' ? 'bg-[#FF7A00] text-white' : `${theme.text} hover:${theme.cardLighter}`
                                }`}
                              >
                                WATCH LIST
                              </button>
                              <button
                                onClick={() => handleUpdateRisk('STABLE')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  currentRiskLevel === 'STABLE' ? 'bg-[#00FF88] text-black' : `${theme.text} hover:${theme.cardLighter}`
                                }`}
                              >
                                STABLE
                              </button>
                              <button
                                onClick={() => handleUpdateRisk('HIGH RISK')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  currentRiskLevel === 'HIGH RISK' ? 'bg-[#FF3B3B] text-white' : `${theme.text} hover:${theme.cardLighter}`
                                }`}
                              >
                                HIGH RISK
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                 </div>
              </div>
            </header>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <div className="px-10 pt-6 pb-4 flex-none">
                 <h2 className={`text-4xl font-black capitalize ${theme.text} tracking-tight`}>{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                 <div className={`h-[1.5px] ${isDarkMode ? 'bg-[#2A2E37]' : 'bg-[#DEE2E6]'} mt-4`} />
              </div>

              {view === 'chat' ? (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <div className="flex-1 overflow-y-auto px-10 space-y-4 pb-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className={`${theme.textMuted} font-black uppercase tracking-widest text-sm`}>NO MESSAGES YET</p>
                      </div>
                    ) : (
                      messages.map((m, idx) => {
                        const isSystem = m.text.includes('System:');
                        const messageDate = new Date(m.createdAt);
                        const prevMessage = messages[idx - 1];
                        const prevDate = prevMessage ? new Date(prevMessage.createdAt) : null;

                        // Show time if it's the first message or if more than 30 minutes have passed since previous
                        const showTime = !prevDate || (messageDate - prevDate) > 30 * 60 * 1000;

                        if (isSystem) {
                          return (
                            <div key={idx} className="flex justify-center my-4">
                              <div className={`${theme.cardLighter} px-4 py-1.5 rounded-full border ${theme.border} opacity-90`}>
                                <p className={`text-xs font-bold ${theme.textMuted} tracking-[0.15em] uppercase`}>
                                  {m.text.replace('System:', '').trim()}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <React.Fragment key={idx}>
                            {showTime && (
                              <div className="flex justify-center my-8">
                                <div className={`${theme.cardLighter} px-5 py-1.5 rounded-full border ${theme.border} shadow-sm`}>
                                   <p className={`text-xs font-bold ${theme.textMuted} tracking-widest uppercase`}>
                                      {messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} • {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </p>
                                </div>
                              </div>
                            )}
                            <div
                              onMouseLeave={() => setMenuOpenId(null)}
                              className={`flex ${m.sender === counselor.id ? 'justify-end' : 'justify-start'} group relative`}
                            >
                              <div className={`max-w-[70%] relative flex items-center gap-2 ${m.sender === counselor.id ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`px-6 py-4 rounded-[1.5rem] shadow-sm relative ${m.sender === counselor.id ? 'bg-[#3E4452] text-white rounded-br-none' : `${theme.card} ${theme.text} rounded-bl-none border ${theme.border}`}`}>
                                  <p className="text-[14px] leading-relaxed font-medium">{m.text}</p>
                                </div>

                                {/* Hover Dots and Menu Container */}
                                {m.sender === counselor.id && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setMenuOpenId(menuOpenId === m._id ? null : m._id)}
                                      className={`opacity-0 group-hover:opacity-100 p-1 hover:${theme.card} rounded-full transition-all ${theme.text}`}
                                    >
                                      <MoreHorizontal size={16} />
                                    </button>

                                    {/* Dropdown Menu (Positioned to the side) */}
                                    {menuOpenId === m._id && (
                                      <div className={`absolute top-0 right-full mr-2 z-50 ${theme.card} border ${theme.border} rounded-xl shadow-2xl overflow-hidden min-w-max`}>
                                        <button onClick={() => startEdit(m)} className={`w-full text-left px-4 py-2 text-xs font-bold hover:${theme.cardLighter} ${theme.text} transition-colors whitespace-nowrap`}>Edit</button>
                                        <button onClick={() => deleteMessage(m._id)} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-red-500/20 text-red-400 transition-colors border-t border-[#3A3F4B] whitespace-nowrap">Delete message</button>
                                        <button onClick={() => copyMessage(m.text)} className={`w-full text-left px-4 py-2 text-xs font-bold hover:${theme.cardLighter} ${theme.text} transition-colors border-t ${theme.border} whitespace-nowrap`}>Copy</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className={`h-28 ${theme.inputArea} border-t ${theme.border} px-10 flex items-center flex-none`}>
                    <div className="flex-1 flex gap-4">
                      <div className={`flex-1 ${theme.cardLighter} border ${theme.border} rounded-2xl px-6 flex items-center shadow-xl`}>
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setInputText(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && sendMessage()}
                          placeholder={editingMessageId ? "Editing message..." : "Write helpful advice..."}
                          className={`flex-1 bg-transparent border-none py-4 ${theme.text} placeholder-[#555] focus:ring-0 outline-none`}
                        />
                        {editingMessageId && (
                          <button onClick={() => { setEditingMessageId(null); setInputText(''); }} className="mr-4 text-xs font-black text-red-500 uppercase tracking-widest">Cancel</button>
                        )}
                      </div>
                      <button onClick={sendMessage} className="bg-[#00FF88] text-black w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-[#00E67A] transition-all shadow-xl shadow-[#00FF8822]">
                        <Send size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedStudent.analyticsAccessStatus === 'granted' && (view === 'stats' || (view !== 'chat' && viewedStudents[selectedStudent._id])) ? (
                <div className="flex-1 flex flex-col min-h-0 px-10 pb-6 pt-2 space-y-6 overflow-hidden">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-5 flex-none">
                    <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} flex flex-col justify-between h-32`}>
                      <p className={`font-mono text-base font-black ${theme.textHeading} tracking-wide uppercase`}>Session Today</p>
                      <p className="font-mono text-4xl font-black" style={{ color: theme.accentGreen }}>{studentStats?.SessionsToday || 0}</p>
                    </div>
                    <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} flex flex-col justify-between h-32`}>
                      <p className={`font-mono text-base font-black ${theme.textHeading} tracking-wide uppercase`}>Lifetime Breaks</p>
                      <p className="font-mono text-4xl font-black" style={{ color: theme.accentOrange }}>{studentStats?.totalBreaks || 0}</p>
                    </div>
                    <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} flex flex-col justify-between h-32`}>
                      <p className={`font-mono text-base font-black ${theme.textHeading} tracking-wide uppercase`}>AVG Refresh</p>
                      <p className="font-mono text-4xl font-black" style={{ color: theme.accentBlue }}>{studentStats?.avgScore?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} flex flex-col justify-between h-32`}>
                      <p className={`font-mono text-base font-black ${theme.textHeading} tracking-wide uppercase`}>Day Streak</p>
                      <p className="font-mono text-4xl font-black" style={{ color: theme.accentPurple }}>{studentStats?.DayStreak || 0}D</p>
                    </div>
                  </div>

                  {/* Bottom Cards Grid */}
                  <div className="grid grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
                    <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} flex flex-col h-full overflow-hidden`}>
                       <h3 className={`font-mono font-black ${theme.textHeading} text-lg tracking-widest uppercase mb-6 flex items-center gap-3 flex-none`}>
                          <BarChart2 size={24} className={theme.textMuted} />
                          BREAK PREFERENCES
                       </h3>
                       <div className="flex-1 w-full min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={catData} margin={{ top: 20, right: 20, left: 20, bottom: 25 }}>
                               <CartesianGrid strokeDasharray="0" vertical={false} stroke={isDarkMode ? "#282C3B" : "#E9ECEF"} />
                               <XAxis
                                 dataKey="name"
                                 interval={0}
                                 fontSize={11}
                                 axisLine={false}
                                 tickLine={false}
                                 tick={{ fill: isDarkMode ? '#8E95A5' : '#495057', fontFamily: 'monospace', fontWeight: 600 }}
                                 dy={10}
                               />
                               <YAxis axisLine={false} tickLine={false} hide />
                               <Tooltip
                                 cursor={{ fill: isDarkMode ? '#222635' : '#F1F3F5' }}
                                 contentStyle={{
                                   backgroundColor: isDarkMode ? '#1B1E2B' : '#FFF',
                                   borderRadius: '12px',
                                   border: `1px solid ${isDarkMode ? '#282C3B' : '#E9ECEF'}`,
                                   color: isDarkMode ? '#FFF' : '#212529'
                                 }}
                               />
                               <Bar dataKey="value" fill={isDarkMode ? "#25523B" : "#10B981"} radius={[4, 4, 0, 0]} barSize={45} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} flex flex-col h-full overflow-hidden`}>
                       <h3 className={`font-mono font-black ${theme.textHeading} text-lg tracking-widest uppercase mb-6 flex items-center gap-3 flex-none`}>
                          <TrendingUp size={24} className={theme.textMuted} />
                          COUNSELOR SUMMARY
                       </h3>
                       <div className="flex flex-col justify-center gap-4 my-auto">
                          <div className={`${theme.cardLighter} p-5 rounded-xl border-l-[3px] flex flex-col justify-center h-[128px]`} style={{ borderColor: theme.accentGreen }}>
                             <p className="font-mono font-black text-base uppercase tracking-wider mb-2" style={{ color: theme.accentGreen }}>MOST USED RECOVERY</p>
                             <p className={`font-mono font-bold ${theme.textHeading} text-sm tracking-wider uppercase`}>{studentStats?.topCategory || 'NONE'}</p>
                          </div>
                          <div className={`${theme.cardLighter} p-5 rounded-xl border-l-[3px] flex flex-col justify-center h-[128px]`} style={{ borderColor: theme.accentGreen }}>
                             <p className="font-mono font-black text-base uppercase tracking-wider mb-2" style={{ color: theme.accentGreen }}>ACTIONABLE ADVICE</p>
                             <p className={`text-sm leading-relaxed font-sans ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {studentStats?.actionableAdvice || `The student has a recovery score of ${studentStats?.avgScore?.toFixed(1) || '0.0'}. They seem to prefer ${studentStats?.topCategory || 'None'}. Consider suggesting active physical movement breaks to sustain attention.`}
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ) : selectedStudent.analyticsAccessStatus === 'granted' ? (
                <div className="flex-1 flex flex-col items-center justify-center py-40">
                   <h2 className="text-4xl font-black text-white tracking-tighter mb-8">Request granted</h2>
                   <button
                     onClick={() => {
                        markStudentAsViewed(selectedStudent._id);
                        setView('stats');
                     }}
                     className={`${theme.card} border ${theme.border} px-12 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:${theme.cardLighter} transition-all shadow-xl`}
                   >
                     View
                   </button>
                </div>
              ) : selectedStudent.analyticsAccessStatus === 'denied' ? (
                <div className="flex-1 flex flex-col items-center justify-center py-40">
                   <h2 className="text-4xl font-black text-[#FF3B3B] tracking-tighter mb-4">Request denied</h2>
                   <button
                     onClick={() => loadStudentData(selectedStudent)}
                     className={`text-xs font-black ${theme.textMuted} lowercase border-b border-[#333] hover:text-white transition-all`}
                   >
                     close
                   </button>
                </div>
              ) : selectedStudent.analyticsAccessStatus === 'pending' || requestSent ? (
                <div className="flex-1 flex flex-col items-center justify-center py-40 text-center">
                   <h2 className={`text-4xl font-black ${theme.text} tracking-tight mb-4 max-w-2xl px-10`}>You don't have access to this student's Analytics.</h2>
                   <h2 className={`text-3xl font-black ${theme.text} tracking-tight mb-12`}>Would you like to request access?</h2>
                   <div className={`${theme.cardLighter} border ${theme.border} px-12 py-4 rounded-full shadow-xl opacity-50`}>
                      <p className={`${theme.textMuted} text-xs font-black`}>Request sent to {selectedStudent.first_name} {selectedStudent.last_name}</p>
                   </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-40 text-center">
                   <h2 className={`text-4xl font-black ${theme.text} tracking-tight mb-4 max-w-2xl px-10`}>You don't have access to this student's Analytics.</h2>
                   <h2 className={`text-3xl font-black ${theme.text} tracking-tight mb-12`}>Would you like to request access?</h2>
                   <button
                     onClick={requestAccess}
                     className="bg-[#1A7A4D] hover:bg-[#15633E] text-[#00FF88] px-14 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-[#00FF8811]"
                   >
                     Request access
                   </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={`flex-1 flex flex-col items-center justify-center text-center p-20 ${theme.bg}`}>
            <Users className="text-[#2A2E37] mb-8" size={80} />
            <h2 className={`text-4xl font-black ${theme.text} tracking-tighter mb-4`}>Ready to Support Students?</h2>
            <p className={`${theme.textMuted} text-lg font-medium max-w-lg mx-auto leading-relaxed`}>Select a student from the directory on the left to review their study behavior, analyze their recovery habits, and provide guidance.</p>
          </div>
        )}
      </main>

      {/* Toast Notification for Counselor Web Portal */}
      {webToast && (
        <div
          onClick={() => {
            loadStudentData(webToast.student, 'chat');
            setWebToast(null);
          }}
          className="fixed top-6 right-6 z-50 bg-[#1A1D27] border border-[#00FF88] border-l-4 rounded-2xl p-4 shadow-2xl flex items-center gap-4 cursor-pointer hover:scale-105 transition-all max-w-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-[#00FF8822] flex items-center justify-center text-[#00FF88] flex-shrink-0">
            <MessageSquare size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#00FF88] uppercase tracking-wider">New Message from {webToast.student.first_name}</p>
            <p className="text-sm font-medium text-white truncate mt-0.5">{webToast.text}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setWebToast(null); }}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
