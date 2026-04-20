import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Calendar, 
  ChevronRight, 
  Download, 
  Brain, 
  Sparkles, 
  Heart, 
  Shield, 
  Zap,
  Info,
  ArrowLeft,
  ShoppingCart,
  X,
  Key,
  ExternalLink
} from 'lucide-react';
import { cn } from './lib/utils';
import { ALL_TAGS, PERSONALITIES } from './constants';
import { Character, AnalysisResult } from './types';
import { analyzeDiary } from './services/aiService';

// --- Components ---

const BrainQuadrant = ({ 
  id, 
  score, 
  active, 
  onClick 
}: { 
  id: Character; 
  score: number; 
  active?: boolean;
  onClick?: () => void;
}) => {
  const colors = {
    1: 'bg-c1',
    2: 'bg-c2',
    3: 'bg-c3',
    4: 'bg-c4',
  };

  const roundedClasses = {
    1: "rounded-tl-[100px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px]",
    2: "rounded-tl-[20px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[100px]",
    3: "rounded-tl-[20px] rounded-tr-[100px] rounded-br-[20px] rounded-bl-[20px]",
    4: "rounded-tl-[20px] rounded-tr-[20px] rounded-br-[100px] rounded-bl-[20px]",
  };

  const scale = 0.8 + (score / 100) * 0.4; // Scale between 0.8 and 1.2 based on score

  return (
    <motion.div 
      initial={false}
      animate={{ scale: active ? scale : 0.9 }}
      className={cn(
        "absolute w-[110px] h-[110px] flex items-center justify-center text-white font-extrabold text-lg transition-all duration-500 cursor-pointer shadow-lg",
        colors[id],
        roundedClasses[id],
        active ? "opacity-100 z-10" : "opacity-60 hover:opacity-80",
        id === 1 ? "top-0 left-0" : 
        id === 2 ? "bottom-0 left-0" : 
        id === 3 ? "top-0 right-0" : 
        "bottom-0 right-0"
      )}
      onClick={onClick}
    >
      {score}%
    </motion.div>
  );
};

const BrainMap = ({ scores }: { scores: Record<Character, number> }) => {
  return (
    <div className="relative w-[240px] h-[240px] mx-auto my-8">
      <BrainQuadrant id={1} score={scores[1]} active />
      <BrainQuadrant id={2} score={scores[2]} active />
      <BrainQuadrant id={3} score={scores[3]} active />
      <BrainQuadrant id={4} score={scores[4]} active />
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [step, setStep] = useState<'input' | 'loading' | 'result'>('input');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [diary, setDiary] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string | null>(localStorage.getItem('user_gemini_api_key'));
  const [tempApiKey, setTempApiKey] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const displayTags = useMemo(() => {
    return [...ALL_TAGS];
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : (prev.length < 20 ? [...prev, tag] : prev)
    );
  };

  const handleSubmit = async () => {
    if (selectedTags.length < 3) {
      alert('請至少選擇 3 個標籤');
      return;
    }
    setStep('loading');
    try {
      const analysis = await analyzeDiary(date, selectedTags, diary, userApiKey);
      setResult(analysis);
      setStep('result');
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('頻率過高') || error.message?.includes('429')) {
        setShowQuotaModal(true);
      } else {
        alert(error.message || '分析失敗，請稍後再試');
      }
      setStep('input');
    }
  };

  const handleSaveApiKey = () => {
    if (!tempApiKey.trim()) return;
    localStorage.setItem('user_gemini_api_key', tempApiKey.trim());
    setUserApiKey(tempApiKey.trim());
    setShowQuotaModal(false);
    alert('金鑰已儲存，您可以再次嘗試分析');
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('user_gemini_api_key');
    setUserApiKey(null);
    setTempApiKey('');
    alert('已清除個人金鑰，將回退使用系統預設金鑰');
  };

  const downloadData = async () => {
    if (!result || !reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`全腦人生分析報告_${date}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF 生成失敗，請稍後再試');
    }
  };

  return (
    <div className="min-h-screen bg-bg-theme text-text-main font-sans selection:bg-accent-theme/20">
      <header className="px-10 py-6 bg-white border-b border-border-theme flex justify-between items-center sticky top-0 z-40">
        <div className="text-xl font-extrabold text-accent-theme tracking-wider">WHOLE BRAIN LIFE / 全腦人生</div>
        <div className="text-sm text-text-sub flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </div>
      </header>

      <main className="max-w-[800px] mx-auto p-6">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-6"
            >
              <section className="bg-white rounded-[20px] p-8 md:p-12 shadow-sm border border-border-theme flex flex-col items-center text-center">
                <h1 className="text-3xl font-bold mb-3">Hi 你今天過得如何？</h1>
                <p className="text-text-sub text-sm mb-10 leading-relaxed max-w-md">
                  每天花一點時間沈靜下來與自己的大腦對話，有助於穩定情緒、自我覺察。
                </p>

                <div className="w-full mb-10 text-left">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-text-sub uppercase tracking-wider">情緒標籤 (已選 {selectedTags.length}/20)</span>
                    <span className="text-[10px] text-text-sub">需選 3-20 個</span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-[320px] overflow-y-auto p-2 bg-stone-50/50 rounded-2xl border border-border-theme">
                    {displayTags.map((tag) => {
                      const isActive = selectedTags.includes(tag.text);
                      return (
                        <button
                          key={tag.text}
                          onClick={() => toggleTag(tag.text)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs transition-all border",
                            isActive 
                              ? "bg-accent-theme border-accent-theme text-white shadow-sm"
                              : "bg-white text-text-main border-border-theme hover:border-text-sub/30"
                          )}
                        >
                          {tag.text}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full mb-10 text-left">
                  <div className="text-xs font-bold text-text-sub uppercase tracking-wider mb-4">今日記事</div>
                  <textarea
                    value={diary}
                    onChange={(e) => setDiary(e.target.value)}
                    placeholder="寫下你今日的觀察或感受 (限1000字)"
                    maxLength={1000}
                    className="w-full h-48 p-6 bg-stone-50/50 border border-border-theme rounded-2xl text-sm focus:ring-2 focus:ring-accent-theme/20 focus:border-accent-theme outline-none transition-all resize-none"
                  />
                  <div className="text-right text-[10px] text-text-sub mt-2">{diary.length}/1000</div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={selectedTags.length < 3}
                  className={cn(
                    "w-full max-w-sm py-4 rounded-xl font-bold text-sm transition-all shadow-md",
                    selectedTags.length >= 3 
                      ? "bg-accent-theme text-white hover:bg-accent-theme/90 hover:-translate-y-0.5" 
                      : "bg-stone-100 text-stone-400 cursor-not-allowed"
                  )}
                >
                  送出並開始 AI 分析
                </button>
              </section>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex flex-col items-center justify-center bg-bg-theme/80 backdrop-blur-sm z-50"
            >
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 border-4 border-accent-theme/10 border-t-accent-theme rounded-full"
                />
                <Brain className="absolute inset-0 m-auto w-10 h-10 text-accent-theme animate-pulse" />
              </div>
              <h2 className="mt-8 text-xl font-medium text-text-main">AI 正在深度解析你的全腦狀態...</h2>
            </motion.div>
          )}

          {step === 'result' && result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-8 pb-20"
            >
              {/* Main Report Card */}
              <section ref={reportRef} className="bg-white rounded-[32px] p-10 md:p-16 shadow-sm border border-border-theme flex flex-col items-center text-center">
                <div className="mb-12">
                  <h2 className="text-3xl font-bold mb-2">今日全腦解析報告</h2>
                  <p className="text-text-sub text-sm">{date} 的能量分佈狀態</p>
                </div>
                
                <div className="mb-12">
                  <div className="text-xs font-bold text-text-sub uppercase tracking-wider mb-8">大腦人格主導率</div>
                  <BrainMap scores={result.scores} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-12">
                  {[1, 2, 3, 4].map((id) => (
                    <div key={id} className="flex flex-col items-center p-4 rounded-2xl border border-border-theme bg-stone-50/30">
                      <div className={cn(
                        "w-2 h-2 rounded-full mb-2",
                        id === 1 ? "bg-c1" : id === 2 ? "bg-c2" : id === 3 ? "bg-c3" : "bg-c4"
                      )} />
                      <span className="text-[10px] font-bold text-text-sub uppercase tracking-widest mb-1">{PERSONALITIES[id as Character].name}</span>
                      <span className="text-xl font-black" style={{ color: `var(--c${id})` }}>{result.scores[id as Character]}%</span>
                    </div>
                  ))}
                </div>

                <div className="w-full py-10 border-y border-dashed border-border-theme mb-10">
                  <p className="text-xl md:text-2xl italic text-text-main mb-4 leading-relaxed font-serif">「 {result.quote.text} 」</p>
                  <p className="text-sm text-text-sub">— {result.quote.author}</p>
                </div>

                <div className="w-full bg-[#f0f7ff] p-8 rounded-2xl border-l-4 border-accent-theme text-left">
                  <div className="flex items-center gap-2 mb-4 text-accent-theme font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> AI 今日建議
                  </div>
                  <p className="text-text-main text-sm leading-loose">
                    {result.advice}
                  </p>
                </div>
              </section>

              {/* Action Buttons at Bottom */}
              <section className="flex flex-col md:flex-row gap-4 justify-center items-center">
                <button 
                  onClick={() => setStep('input')}
                  className="w-full md:w-auto py-4 px-10 bg-white border border-border-theme text-text-main rounded-xl text-sm font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> 再試一次
                </button>
                <button 
                  onClick={downloadData}
                  className="w-full md:w-auto py-4 px-10 bg-accent-theme text-white rounded-xl text-sm font-bold hover:bg-accent-theme/90 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" /> 下載分析報告 (PDF)
                </button>
                <a 
                  href="https://www.books.com.tw/products/0010931093"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto py-4 px-10 bg-white border border-border-theme text-text-main rounded-xl text-sm font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" /> 購買書籍
                </a>
              </section>

              {/* Education Section */}
              <section id="edu-section" className="bg-white rounded-[32px] p-10 md:p-16 shadow-sm border border-border-theme mt-12">
                <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold mb-3">認識你的四個人格</h2>
                  <p className="text-text-sub text-sm">源自《全腦人生》作者 吉兒．泰勒 博士</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {Object.values(PERSONALITIES).map((p) => (
                    <div key={p.id} className="p-8 rounded-3xl border border-border-theme bg-stone-50/30">
                      <div className="flex items-center gap-4 mb-6">
                        <div className={cn(
                          "p-3 rounded-xl text-white",
                          p.id === 1 ? "bg-c1" : p.id === 2 ? "bg-c2" : p.id === 3 ? "bg-c3" : "bg-c4"
                        )}>
                          {p.id === 1 ? <Shield className="w-5 h-5" /> : p.id === 2 ? <Zap className="w-5 h-5" /> : p.id === 3 ? <Heart className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{p.title}</h4>
                          <span className="text-xs text-text-sub uppercase tracking-widest">{p.name}</span>
                        </div>
                      </div>
                      <p className="text-sm text-text-sub leading-relaxed mb-6">{p.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {p.traits.slice(0, 6).map(t => (
                          <span key={t} className="px-3 py-1 bg-white border border-border-theme text-[10px] text-text-sub rounded-lg">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-16 p-10 bg-accent-theme rounded-[40px] text-white overflow-hidden relative">
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-4">關於作者：吉兒．泰勒 博士</h3>
                    <p className="text-white/80 text-sm leading-relaxed max-w-2xl">
                      哈佛大學腦科學家。她在 37 歲時經歷了一場嚴重的左腦中風，這段經歷讓她以科學家的視角親身體驗了大腦功能的喪失與重建。
                      她發現我們的大腦中存在四個獨立的意識模組，透過覺察並平衡這四個人格，我們可以獲得真正的內在自由。
                    </p>
                  </div>
                  <Brain className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12" />
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quota Modal */}
      <AnimatePresence>
        {showQuotaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowQuotaModal(false)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                  <Brain className="w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                
                <h3 className="text-xl font-bold mb-2">使用人數較多，請稍後再試</h3>
                <p className="text-text-sub text-sm mb-8 leading-relaxed">
                  目前的免費額度已暫時用完。您可以等一分鐘後再試，或者使用您自己的 Google Gemini API 金鑰繼續分析。
                </p>

                <div className="w-full space-y-4">
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider mb-2 block">
                      您的 Gemini API KEY
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="在此貼上您的 AI 金鑰 (AI_...)"
                        className="w-full p-4 bg-stone-50 border border-border-theme rounded-xl text-sm focus:ring-2 focus:ring-accent-theme/20 focus:border-accent-theme outline-none"
                      />
                      <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleSaveApiKey}
                      className="w-full py-4 bg-accent-theme text-white rounded-xl text-sm font-bold hover:bg-accent-theme/90 transition-all flex items-center justify-center gap-2"
                    >
                      儲存金鑰並繼續分析
                    </button>
                    
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[11px] text-accent-theme hover:underline flex items-center justify-center gap-1 font-medium"
                    >
                      如何取得免費金鑰？前往 Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>

                    <button 
                      onClick={() => setShowQuotaModal(false)}
                      className="w-full py-4 bg-stone-100 text-text-sub rounded-xl text-sm font-bold hover:bg-stone-200 transition-all"
                    >
                      關閉此彈窗
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {userApiKey && step === 'input' && (
        <div className="fixed bottom-6 right-6 z-30">
          <button 
            onClick={handleClearApiKey}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border-theme rounded-full shadow-lg text-[10px] font-bold text-text-sub hover:text-red-500 transition-all"
          >
            <Key className="w-3 h-3 text-green-500" /> 使用個人金鑰中 (點擊清除)
          </button>
        </div>
      )}
    </div>
  );
}
