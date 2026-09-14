import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, MessageSquare, TrendingUp, LogOut, Search, AlertCircle, CheckCircle, Clock, Send, BarChart2, User, Lock
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

const API_BASE_URL = 'https://breaksense-backend.onrender.com/api';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [counselor, setCounselor] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setInputText] = useState('');
  const [studentStats, setStudentStats] = useState(null);
  const [view, setView] = useState('chat'); // 'chat' or 'stats'
  const [requestSent, setRequestSent] = useState(false);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      if (res.data.success && res.data.user.role === 'counselor') {
        setCounselor(res.data.user);
        setIsLoggedIn(true);
        fetchStudents();
      } else {
        alert("Access Denied: Only counselors can access this portal.");
      }
    } catch (e) { alert("Login failed. Check credentials."); }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/students`);
      setStudents(res.data);
    } catch (e) { console.log("Failed to fetch students", e); }
  };

  const loadStudentData = async (student) => {
    setSelectedStudent(student);
    setView('chat');
    setRequestSent(student.analyticsAccessStatus === 'pending');
    try {
      const chatRes = await axios.get(`${API_BASE_URL}/messages/history?user1=${counselor.id}&user2=${student._id}`);
      setMessages(chatRes.data);

      if (student.analyticsAccessStatus === 'granted') {
        const statsRes = await axios.get(`${API_BASE_URL}/breaks/stats?user_id=${student._id}`);
        setStudentStats(statsRes.data);
      } else {
        setStudentStats(null);
      }
    } catch (e) { console.log("Error loading student data", e); }
  };

  const requestAccess = async () => {
    try {
      await axios.put(`${API_BASE_URL}/auth/request-access`, { userId: selectedStudent._id });
      setRequestSent(true);
      fetchStudents(); // Refresh student list to update status
    } catch (e) { console.log("Request access error", e); }
  };

  // Auto-refresh chat every 5 seconds if a student is selected
  useEffect(() => {
    let interval;
    if (isLoggedIn && selectedStudent && view === 'chat') {
      interval = setInterval(async () => {
        try {
           const chatRes = await axios.get(`${API_BASE_URL}/messages/history?user1=${counselor.id}&user2=${selectedStudent._id}`);
           setMessages(chatRes.data);
        } catch (e) {}
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedStudent, isLoggedIn, view]);

  const sendMessage = async () => {
    if (!replyText.trim()) return;
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121418] px-4 font-sans">
        <div className="max-w-md w-full bg-[#1A1D23] rounded-[2rem] p-10 border border-[#2A2E37] shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <img src="/logo.png" alt="BreakSense Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Counselor <span className="text-[#00FF88]">Portal</span></h1>
            <p className="text-[#666] mt-2 font-medium">MERN - Stack Support System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-6 py-4 bg-[#2A2E37] border-none rounded-2xl text-white placeholder-[#555] focus:ring-2 focus:ring-[#00FF88]"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-[#2A2E37] border-none rounded-2xl text-white placeholder-[#555] focus:ring-2 focus:ring-[#00FF88]"
              required
            />
            <button type="submit" className="w-full bg-[#00FF88] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00E67A] transition-all duration-300 shadow-lg shadow-[#00FF8822]">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const catData = studentStats ? Object.entries(studentStats.categoryCounts).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="h-screen bg-[#121418] flex text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-[#1A1D23] border-r border-[#2A2E37] flex flex-col h-full">
        <div className="p-8 border-b border-[#2A2E37] flex items-center gap-3">
          <img src="/logo.png" alt="BreakSense Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-black text-white italic">Break<span className="text-[#00FF88] not-italic">Sense</span></span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <p className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em] mb-4">STUDENT DIRECTORY</p>
            <div className="space-y-2">
              {students.map(s => (
                <button
                  key={s._id}
                  onClick={() => loadStudentData(s)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedStudent?._id === s._id ? 'bg-[#2A2E37] ring-1 ring-[#00FF8844]' : 'hover:bg-[#20242D]'}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#20242D] border border-[#2A2E37] flex items-center justify-center">
                    <User size={20} className="text-[#555]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-white">{s.first_name} {s.last_name}</p>
                    <p className="text-[10px] text-[#666] font-black uppercase tracking-tighter mt-0.5">Streak: {s.DayStreak || 0}d</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#2A2E37]">
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-4 text-[#888] hover:text-white transition-colors py-2 font-black uppercase tracking-widest text-[11px]">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#121418]">
        {selectedStudent ? (
          <>
            <header className="h-24 bg-[#1A1D23] border-b border-[#2A2E37] px-10 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-8">
                 <div className="flex bg-[#20242D] p-1 rounded-xl border border-[#2A2E37]">
                    <button
                      onClick={() => setView('chat')}
                      className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${view === 'chat' ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF8833]' : 'text-[#888]'}`}
                    >
                      CONSULTATION
                    </button>
                    <button
                      onClick={() => setView('stats')}
                      className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300 ${view === 'stats' ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF8833]' : 'text-[#888]'}`}
                    >
                      ANALYTICS
                    </button>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <span className="text-[10px] font-black text-[#555] uppercase tracking-[0.2em]">RISK LEVEL:</span>
                 <div className="bg-[#FF7A00] px-4 py-2 rounded-xl shadow-lg shadow-[#FF7A0022]">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                       {selectedStudent.DayStreak > 3 ? 'STABLE' : 'WATCH LIST'}
                    </span>
                 </div>
              </div>
            </header>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <div className="px-10 py-8 flex-none">
                 <h2 className="text-2xl font-black text-white tracking-tight">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                 <div className="h-[1px] bg-[#2A2E37] mt-6" />
              </div>

              {view === 'chat' ? (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <div className="flex-1 overflow-y-auto px-10 space-y-8 pb-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-[#444] font-black uppercase tracking-widest text-xs">NO MESSAGES YET</p>
                      </div>
                    ) : (
                      messages.map((m, idx) => (
                        <div key={idx} className={`flex ${m.sender === counselor.id ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[70%]">
                            <div className={`px-6 py-4 rounded-[1.5rem] shadow-sm ${m.sender === counselor.id ? 'bg-[#3E4452] text-white rounded-br-none' : 'bg-[#2A2E37] text-[#CCC] rounded-bl-none border border-[#3A3F4B]'}`}>
                              <p className="text-[14px] leading-relaxed font-medium">{m.text}</p>
                            </div>
                            <p className={`text-[9px] mt-2 font-black text-[#555] tracking-widest ${m.sender === counselor.id ? 'text-right' : 'text-left'}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-8 bg-[#121418] border-t border-[#2A2E37] flex-none">
                    <div className="max-w-5xl mx-auto flex gap-4">
                      <div className="flex-1 bg-[#20242D] border border-[#2A2E37] rounded-2xl px-6 flex items-center shadow-xl">
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setInputText(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && sendMessage()}
                          placeholder="Write helpful advice..."
                          className="flex-1 bg-transparent border-none py-4 text-white placeholder-[#444] focus:ring-0 outline-none"
                        />
                      </div>
                      <button onClick={sendMessage} className="bg-[#00FF88] text-black w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-[#00E67A] transition-all shadow-xl shadow-[#00FF8822]">
                        <Send size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedStudent.analyticsAccessStatus === 'granted' ? (
                <div className="flex-1 overflow-y-auto p-10 space-y-10">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-6">
                    <div className="bg-[#1A1D23] p-8 rounded-2xl border border-[#2A2E37] relative overflow-hidden group">
                      <p className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-10">Session Today</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-3 rounded-full bg-[#00FF88]" />
                      </div>
                      <p className="absolute bottom-6 right-8 text-4xl font-black text-[#00FF88] opacity-20">{studentStats?.SessionsToday || 0}</p>
                    </div>
                    <div className="bg-[#1A1D23] p-8 rounded-2xl border border-[#2A2E37] relative overflow-hidden">
                      <p className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-10">Lifetime Breaks</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-3 rounded-full bg-[#FF7A00]" />
                      </div>
                      <p className="absolute bottom-6 right-8 text-4xl font-black text-[#FF7A00] opacity-20">{studentStats?.totalBreaks || 0}</p>
                    </div>
                    <div className="bg-[#1A1D23] p-8 rounded-2xl border border-[#2A2E37] relative overflow-hidden">
                      <p className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-10">AVG Refresh</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-3 rounded-full bg-[#0066FF]" />
                      </div>
                      <p className="absolute bottom-6 right-8 text-4xl font-black text-[#0066FF] opacity-20">{studentStats?.avgScore?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className="bg-[#1A1D23] p-8 rounded-2xl border border-[#2A2E37] relative overflow-hidden">
                      <p className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-10">Day Streak</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-3 rounded-full bg-[#A855F7]" />
                      </div>
                      <p className="absolute bottom-6 right-8 text-4xl font-black text-[#A855F7] opacity-20">{studentStats?.DayStreak || 0}D</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="bg-[#1A1D23] p-10 rounded-[2rem] border border-[#2A2E37] h-[32rem]">
                       <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-12 flex items-center gap-4">
                          <BarChart2 size={20} className="text-[#888]" />
                          BREAK PREFERENCES
                       </h3>
                       <ResponsiveContainer width="100%" height="70%">
                          <BarChart data={catData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2E37" />
                            <XAxis dataKey="name" fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#444'}} dy={20} />
                            <YAxis axisLine={false} tickLine={false} hide />
                            <Tooltip cursor={{fill: '#20242D'}} contentStyle={{backgroundColor: '#1A1D23', borderRadius: '15px', border: '1px solid #2A2E37', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'}} />
                            <Bar dataKey="value" fill="#1A7A4D" radius={[6, 6, 0, 0]} barSize={50} />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>

                    <div className="bg-[#1A1D23] p-10 rounded-[2rem] border border-[#2A2E37] h-[32rem]">
                       <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-12 flex items-center gap-4">
                          <TrendingUp size={20} className="text-[#888]" />
                          COUNSELOR SUMMARY
                       </h3>
                       <div className="space-y-6">
                          <div className="p-8 bg-[#20242D] rounded-3xl border-l-[3px] border-[#00FF88]">
                             <p className="text-[9px] font-black text-[#555] uppercase tracking-widest mb-3">Most Used Recovery</p>
                             <p className="text-sm font-black text-white uppercase tracking-tight">{studentStats?.topCategory || 'NONE'}</p>
                          </div>
                          <div className="p-8 bg-[#20242D] rounded-3xl border-l-[3px] border-[#00FF88]">
                             <p className="text-[9px] font-black text-[#555] uppercase tracking-widest mb-3">Actionable Advice</p>
                             <p className="text-[11px] text-[#888] leading-relaxed font-medium">
                                The student has a recovery score of {studentStats?.avgScore?.toFixed(1) || '0.0'}. They seem to prefer {studentStats?.topCategory || 'None'}.
                                Consider suggesting more physical movement if fatigue levels rise.
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ) : selectedStudent.analyticsAccessStatus === 'denied' ? (
                <div className="flex-1 flex flex-col items-center justify-center py-40">
                   <h2 className="text-4xl font-black text-[#CC3333] tracking-tighter">Request denied</h2>
                   <button
                     onClick={() => loadStudentData(selectedStudent)}
                     className="mt-4 text-[#666] text-[10px] font-black uppercase tracking-widest border-b border-[#333] pb-1"
                   >
                     close
                   </button>
                </div>
              ) : selectedStudent.analyticsAccessStatus === 'pending' || requestSent ? (
                <div className="flex-1 flex flex-col items-center justify-center py-40">
                   <h2 className="text-2xl font-black text-white tracking-tight mb-8">You don't have access to this student's Analytics.</h2>
                   <h2 className="text-2xl font-black text-white tracking-tight mb-12">Would you like to request access?</h2>
                   <div className="bg-[#20242D] border border-[#2A2E37] px-10 py-4 rounded-2xl shadow-xl">
                      <p className="text-[#555] text-xs font-black uppercase tracking-widest">Request sent to {selectedStudent.first_name} {selectedStudent.last_name}</p>
                   </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-40">
                   <h2 className="text-2xl font-black text-white tracking-tight mb-8 text-center">You don't have access to this<br/>student's Analytics.</h2>
                   <h2 className="text-2xl font-black text-white tracking-tight mb-12">Would you like to request access?</h2>
                   <button
                     onClick={requestAccess}
                     className="bg-[#1A7A4D] hover:bg-[#15633E] text-[#00FF88] px-12 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-[#00FF8811]"
                   >
                     Request access
                   </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-[#121418]">
            <Users className="text-[#2A2E37] mb-8" size={80} />
            <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Ready to Support Students?</h2>
            <p className="text-[#555] text-lg font-medium max-w-lg mx-auto leading-relaxed">Select a student from the directory on the left to review their study behavior, analyze their recovery habits, and provide guidance.</p>
          </div>
        )}
      </main>
    </div>
  );
}
