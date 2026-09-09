import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  MessageSquare,
  TrendingUp,
  LogOut,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Send
} from 'lucide-react';

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
    } catch (e) { console.log("Failed to fetch real students", e); }
  };

  const loadChat = async (student) => {
    setSelectedStudent(student);
    try {
      const res = await axios.get(`${API_BASE_URL}/messages/history?user1=${counselor.id}&user2=${student.id}`);
      setMessages(res.data);
    } catch (e) { console.log(e); }
  };

  const sendMessage = async () => {
    if (!replyText.trim()) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/messages/send`, {
        senderId: counselor.id,
        recipientId: selectedStudent.id,
        text: replyText
      });
      setMessages([...messages, res.data.message]);
      setInputText('');
    } catch (e) { console.log(e); }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-10">
            <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="text-emerald-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Counselor Portal</h1>
            <p className="text-gray-500 mt-2">Sign in to support your students.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" required />
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition duration-200">
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <CheckCircle className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">BreakSense</span>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="text" placeholder="Search students..." className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Recent Consultations</p>
          {students.map(s => (
            <TouchableOpacity key={s.id} onClick={() => loadChat(s)} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${selectedStudent?.id === s.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'}`}>
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                {s.first_name[0]}{s.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.first_name} {s.last_name}</p>
                <p className={`text-xs ${s.stress === 'High' ? 'text-red-500' : 'text-gray-400'}`}>{s.stress} Stress</p>
              </div>
            </TouchableOpacity>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={() => setIsLoggedIn(false)} className="flex items-center gap-3 text-gray-500 hover:text-red-600 transition-colors px-2">
            <LogOut size={20} />
            <span className="font-semibold text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {selectedStudent ? (
          <>
            <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedStudent.stress === 'High' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {selectedStudent.stress} Burnout Risk
                </span>
              </div>
              <div className="flex gap-4">
                <button className="p-2 text-gray-400 hover:text-gray-600"><Clock size={20} /></button>
                <button className="p-2 text-gray-400 hover:text-gray-600"><AlertCircle size={20} /></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === counselor.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${m.sender === counselor.id ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                    <p className="text-sm leading-relaxed">{m.text}</p>
                    <p className={`text-[10px] mt-1 opacity-70 ${m.sender === counselor.id ? 'text-right' : 'text-left'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <footer className="p-6 bg-white border-t border-gray-200">
              <div className="flex gap-4 max-w-4xl mx-auto">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  placeholder={`Reply to ${selectedStudent.first_name}...`}
                  className="flex-1 px-6 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
                <button onClick={sendMessage} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
                  <Send size={24} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-center items-center justify-center text-center">
            <div>
              <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="text-emerald-400" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Select a Student</h2>
              <p className="text-gray-500 mt-2">Choose a conversation from the sidebar to start consulting.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Minimal TouchableOpacity wrapper for web
function TouchableOpacity({ children, onClick, className }) {
  return <button onClick={onClick} className={className}>{children}</button>;
}
