import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Users, MessageSquare, TrendingUp, LogOut, Search, AlertCircle, CheckCircle, Clock, Send, BarChart2, User, Lock, MoreHorizontal, Sun, Moon
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
  const [viewedStudents, setViewedStudents] = useState(() => {
    try {
      const saved = sessionStorage.getItem('viewedStudents');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });
  const chatEndRef = useRef(null);

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

  // Theme configuration
  const theme = {
    bg: isDarkMode ? 'bg-[#121418]' : 'bg-[#F8F9FA]',
    sidebar: isDarkMode ? 'bg-[#1A1D23]' : 'bg-white',
    sidebarBorder: isDarkMode ? 'border-[#2A2E37]' : 'border-[#E9ECEF]',
    header: isDarkMode ? 'bg-[#1A1D23]' : 'bg-white',
    headerBorder: isDarkMode ? 'border-[#2A2E37]' : 'border-[#E9ECEF]',
    card: isDarkMode ? 'bg-[#1A1D23]' : 'bg-white',
    cardLighter: isDarkMode ? 'bg-[#20242D]' : 'bg-[#F1F3F5]',
    border: isDarkMode ? 'border-[#2A2E37]' : 'border-[#E9ECEF]',
    text: isDarkMode ? 'text-white' : 'text-[#212529]',
    textMuted: isDarkMode ? 'text-[#666]' : 'text-[#868E96]',
    textHeading: isDarkMode ? 'text-white' : 'text-[#212529]',
    input: isDarkMode ? 'bg-[#2A2E37]' : 'bg-white border border-[#DEE2E6]',
    inputArea: isDarkMode ? 'bg-[#121418]' : 'bg-[#F8F9FA]',
    accentGreen: '#00FF88',
    accentOrange: '#FF7A00',
    accentBlue: '#0066FF',
    accentPurple: '#A855F7',
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
    try {
      const chatRes = await axios.get(`${API_BASE_URL}/messages/history?user1=${counselor.id}&user2=${student._id}`);
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

  // Auto-refresh chat and student list every 5 seconds
  useEffect(() => {
    let interval;
    if (isLoggedIn) {
      interval = setInterval(async () => {
        try {
           // Always refresh students to keep access status updated
           const studentRes = await axios.get(`${API_BASE_URL}/auth/students`);
           const updatedStudents = studentRes.data;
           setStudents(updatedStudents);

           if (selectedStudent) {
             const updatedSelected = updatedStudents.find(s => s._id === selectedStudent._id);
             if (updatedSelected && updatedSelected.analyticsAccessStatus !== selectedStudent.analyticsAccessStatus) {
               setSelectedStudent(updatedSelected);
             }

             // If a student is selected and we are in chat view, refresh messages
             if (view === 'chat') {
               const chatRes = await axios.get(`${API_BASE_URL}/messages/history?user1=${counselor.id}&user2=${selectedStudent._id}`);
               setMessages(chatRes.data);
             }
           }
        } catch (e) {}
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedStudent, isLoggedIn, view]);

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
      await axios.delete(`${API_BASE_URL}/messages/delete/${msgId}`);
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

  const catData = studentStats ? Object.entries(studentStats.categoryCounts).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className={`h-screen ${theme.bg} flex ${theme.text} font-sans overflow-hidden transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={`w-96 ${theme.sidebar} border-r ${theme.sidebarBorder} flex flex-col h-full shadow-2xl`}>
        <div className={`h-24 ${theme.sidebar} border-b ${theme.sidebarBorder} px-10 flex items-center gap-4`}>
          <img src="/logo.png" alt="BreakSense Logo" className="w-12 h-12 object-contain" />
          <span className={`text-3xl font-black ${theme.text} italic tracking-tighter`}>Break<span className="text-[#00FF88] not-italic">Sense</span></span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-[0.2em] mb-6 px-2`}>STUDENT DIRECTORY</p>
            <div className="space-y-3">
              {students.map(s => (
                <button
                  key={s._id}
                  onClick={() => loadStudentData(s)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 ${selectedStudent?._id === s._id ? `${theme.cardLighter} ring-1 ring-[#00FF8844] shadow-lg` : `hover:${theme.cardLighter}`}`}
                >
                  <div className={`w-14 h-14 rounded-2xl ${theme.cardLighter} border ${theme.border} flex items-center justify-center shadow-inner`}>
                    <User size={24} className={theme.textMuted} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black truncate ${theme.text}`}>{s.first_name} {s.last_name}</p>
                    <p className={`text-[9px] ${theme.textMuted} font-black uppercase tracking-widest mt-0.5 opacity-80`}>Streak: {s.DayStreak || 0}D</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`h-28 ${theme.sidebar} border-t ${theme.border} px-10 flex items-center justify-between gap-4`}>
          <button onClick={handleSignOut} className={`flex items-center gap-4 ${theme.textMuted} hover:${theme.text} transition-colors py-2 font-black uppercase tracking-widest text-[11px]`}>
            <LogOut size={18} />
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
            <header className={`h-24 ${theme.header} border-b ${theme.headerBorder} px-10 flex items-center justify-between shadow-lg`}>
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
                 <span className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-[0.2em] leading-none`}>RISK LEVEL:</span>
                 <div className="bg-[#FF7A00] px-4 py-2 rounded-xl shadow-lg shadow-[#FF7A0022] flex items-center justify-center">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                       {selectedStudent.DayStreak > 3 ? 'STABLE' : 'WATCH LIST'}
                    </span>
                 </div>
              </div>
            </header>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <div className="px-10 py-8 flex-none">
                 <h2 className={`text-2xl font-black ${theme.text} tracking-tight`}>{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                 <div className={`h-[1.5px] ${isDarkMode ? 'bg-[#2A2E37]' : 'bg-[#DEE2E6]'} mt-6`} />
              </div>

              {view === 'chat' ? (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <div className="flex-1 overflow-y-auto px-10 space-y-4 pb-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className={`${theme.textMuted} font-black uppercase tracking-widest text-xs`}>NO MESSAGES YET</p>
                      </div>
                    ) : (
                      messages.map((m, idx) => {
                        const messageDate = new Date(m.createdAt);
                        const prevMessage = messages[idx - 1];
                        const prevDate = prevMessage ? new Date(prevMessage.createdAt) : null;

                        // Show time if it's the first message or if more than 30 minutes have passed since previous
                        const showTime = !prevDate || (messageDate - prevDate) > 30 * 60 * 1000;

                        return (
                          <React.Fragment key={idx}>
                            {showTime && (
                              <div className="flex justify-center my-8">
                                <div className={`${theme.cardLighter} px-5 py-1.5 rounded-full border ${theme.border} shadow-sm`}>
                                   <p className={`text-[10px] font-black ${theme.textMuted} tracking-widest uppercase`}>
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
                          className={`flex-1 bg-transparent border-none py-4 ${theme.text} placeholder-[#444] focus:ring-0 outline-none`}
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
                <div className="flex-1 overflow-y-auto p-10 space-y-10">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-6">
                    <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} relative overflow-hidden group`}>
                      <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest mb-10`}>Session Today</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-3 rounded-full bg-[#00FF88]" />
                      </div>
                      <p className="absolute bottom-6 right-8 text-4xl font-black text-[#00FF88]">{studentStats?.SessionsToday || 0}</p>
                    </div>
                    <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} relative overflow-hidden`}>
                      <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest mb-10`}>Lifetime Breaks</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-3 rounded-full bg-[#FF7A00]" />
                      </div>
                      <p className="absolute bottom-6 right-8 text-4xl font-black text-[#FF7A00]">{studentStats?.totalBreaks || 0}</p>
                    </div>
                    <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} relative overflow-hidden`}>
                      <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest mb-10`}>AVG Refresh</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-3 rounded-full bg-[#0066FF]" />
                      </div>
                      <p className="absolute bottom-6 right-8 text-4xl font-black text-[#0066FF]">{studentStats?.avgScore?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} relative overflow-hidden`}>
                      <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest mb-10`}>Day Streak</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-3 rounded-full bg-[#A855F7]" />
                      </div>
                      <p className="absolute bottom-6 right-8 text-4xl font-black text-[#A855F7]">{studentStats?.DayStreak || 0}D</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className={`${theme.card} p-10 rounded-[2rem] border ${theme.border} h-[32rem]`}>
                       <h3 className={`text-[11px] font-black ${theme.text} uppercase tracking-[0.3em] mb-12 flex items-center gap-4`}>
                          <BarChart2 size={20} className={theme.textMuted} />
                          BREAK PREFERENCES
                       </h3>
                       <ResponsiveContainer width="100%" height="70%">
                          <BarChart data={catData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#2A2E37" : "#E9ECEF"} />
                            <XAxis dataKey="name" fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#444' : '#888'}} dy={20} />
                            <YAxis axisLine={false} tickLine={false} hide />
                            <Tooltip cursor={{fill: isDarkMode ? '#20242D' : '#F1F3F5'}} contentStyle={{backgroundColor: isDarkMode ? '#1A1D23' : '#FFF', borderRadius: '15px', border: `1px solid ${isDarkMode ? '#2A2E37' : '#E9ECEF'}`, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'}} />
                            <Bar dataKey="value" fill="#1A7A4D" radius={[6, 6, 0, 0]} barSize={50} />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>

                    <div className={`${theme.card} p-10 rounded-[2rem] border ${theme.border} h-[32rem]`}>
                       <h3 className={`text-[11px] font-black ${theme.text} uppercase tracking-[0.3em] mb-12 flex items-center gap-4`}>
                          <TrendingUp size={20} className={theme.textMuted} />
                          COUNSELOR SUMMARY
                       </h3>
                       <div className="space-y-6">
                          <div className={`p-8 ${theme.cardLighter} rounded-3xl border-l-[3px] border-[#00FF88]`}>
                             <p className={`text-[9px] font-black ${theme.textMuted} uppercase tracking-widest mb-3`}>Most Used Recovery</p>
                             <p className={`text-sm font-black ${theme.text} uppercase tracking-tight`}>{studentStats?.topCategory || 'NONE'}</p>
                          </div>
                          <div className={`p-8 ${theme.cardLighter} rounded-3xl border-l-[3px] border-[#00FF88]`}>
                             <p className={`text-[9px] font-black ${theme.textMuted} uppercase tracking-widest mb-3`}>Actionable Advice</p>
                             <p className={`text-[11px] ${theme.textMuted} leading-relaxed font-medium`}>
                                The student has a recovery score of {studentStats?.avgScore?.toFixed(1) || '0.0'}. They seem to prefer {studentStats?.topCategory || 'None'}.
                                Consider suggesting more physical movement if fatigue levels rise.
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
    </div>
  );
}
