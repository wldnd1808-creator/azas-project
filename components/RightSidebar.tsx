'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, MessageSquare, Bot, X, Send, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import NoticeEditModal from './NoticeEditModal';
import CommunicationEditModal from './CommunicationEditModal';

interface Notice {
  title: string;
  date: string;
  important: boolean;
  content: string;
  author?: string;
}

interface Communication {
  user: string;
  message: string;
  time: string;
  content: string;
  replies?: Array<{ user: string; message: string; time: string }>;
}

export default function RightSidebar() {
  const { isAdmin, user } = useAuth();
  const { t, language } = useLanguage();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  // 초기 메시지는 서버와 클라이언트에서 동일하게 설정 (Hydration 오류 방지)
  const [messages, setMessages] = useState<Array<{ role: 'bot' | 'user'; text: string }>>(() => {
    // 서버 사이드에서는 항상 기본값 반환
    if (typeof window === 'undefined') {
      return [{ role: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }];
    }
    // 클라이언트에서도 초기에는 기본값, useEffect에서 localStorage 로드
    return [{ role: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }];
  });
  
  // 컴포넌트 마운트 후 localStorage에서 메시지 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedMessages = localStorage.getItem('chatbot_messages');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load messages from localStorage:', e);
    }
    
    // 저장된 메시지가 없으면 번역된 인사말로 설정
    setMessages([{ role: 'bot', text: t('chatbot.greeting') }]);
  }, []); // 빈 배열로 마운트 시 한 번만 실행
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [isNoticeEditModalOpen, setIsNoticeEditModalOpen] = useState(false);
  const [isCommunicationEditModalOpen, setIsCommunicationEditModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [editingNoticeIndex, setEditingNoticeIndex] = useState<number | null>(null);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);
  const [editingCommunicationIndex, setEditingCommunicationIndex] = useState<number | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // 댓글 수정 상태: [글 인덱스, 댓글 인덱스] 또는 null
  const [editingReplyAt, setEditingReplyAt] = useState<[number, number] | null>(null);
  const [editingReplyMessage, setEditingReplyMessage] = useState('');

  const [notices, setNotices] = useState<Notice[]>([
    {
      title: '시스템 점검 안내',
      date: '2025.01.27',
      important: true,
      content: `안녕하세요. 제조 공정 시스템 관리팀입니다.

다음과 같이 시스템 점검을 실시하오니 참고 부탁드립니다.

■ 점검 일시: 2025년 1월 30일 (목) 02:00 ~ 06:00 (4시간)
■ 점검 내용: 서버 업그레이드 및 보안 패치 적용
■ 영향 범위: 점검 시간 동안 시스템 접속 불가

점검 시간 동안에는 대시보드 및 모든 기능을 사용하실 수 없습니다.
점검 완료 후 정상적으로 서비스가 재개됩니다.

문의사항이 있으시면 시스템 관리팀으로 연락 부탁드립니다.
감사합니다.`,
      author: '시스템 관리팀',
    },
    {
      title: '신규 기능 업데이트',
      date: '2025.01.25',
      important: false,
      content: `제조 공정 대시보드에 새로운 기능이 추가되었습니다.

■ 추가된 기능
1. 실시간 알림 시스템
   - 공정 이상 발생 시 즉시 알림 제공
   - 모바일 푸시 알림 지원

2. 데이터 분석 대시보드
   - 생산량 추이 분석
   - 품질 지표 시각화
   - 커스텀 리포트 생성

3. 소통창구 개선
   - 파일 첨부 기능
   - 이모지 지원
   - 읽음 확인 기능

자세한 사용 방법은 도움말 메뉴를 참고해 주세요.`,
      author: '개발팀',
    },
    {
      title: '공정 안전 수칙 변경',
      date: '2025.01.20',
      important: false,
      content: `공정 안전 수칙이 변경되었습니다.

■ 주요 변경 사항
1. 개인보호구 착용 의무화
   - 안전모, 안전화, 보호안경 필수 착용
   - 미착용 시 작업 불가

2. 작업 전 점검 체크리스트
   - 매 작업 시작 전 점검표 작성
   - 이상 발견 시 즉시 보고

3. 비상 대응 절차
   - 비상 상황 발생 시 즉시 대피
   - 비상 연락망 확인 필수

모든 작업자는 변경된 안전 수칙을 숙지하고 준수해 주시기 바랍니다.
안전 수칙 위반 시 작업 중지 및 교육 이수 조치가 취해질 수 있습니다.`,
      author: '안전 관리팀',
    },
  ]);

  useEffect(() => {
    const handler = (e: CustomEvent<Communication>) => {
      const { user, message, time, content } = e.detail;
      setCommunications((prev) => [
        { user, message, time, content: content || message },
        ...prev,
      ]);
    };
    window.addEventListener('add-community-log', handler as EventListener);
    return () => window.removeEventListener('add-community-log', handler as EventListener);
  }, []);

  // 초기 소통창구 데이터
  useEffect(() => {
    const initialCommunications: Communication[] = [
      {
        user: '김철수',
        message: '라인 A 온도 이상 확인',
        time: '10:30',
        content: `라인 A의 온도가 정상 범위를 벗어났습니다.

■ 확인 사항
- 현재 온도: 85°C (정상 범위: 70-75°C)
- 발생 시간: 오전 10:25
- 영향 범위: 라인 A 전체

■ 조치 사항
1. 자동 냉각 시스템 가동
2. 작업자 안전 확인 완료
3. 품질 검사 강화

추가 조치가 필요하면 알려주세요.`,
        replies: [
          { user: '이영희', message: '품질 검사 결과 이상 없음 확인했습니다.', time: '10:35' },
          { user: '박민수', message: '냉각 시스템 점검 완료. 정상 작동 중입니다.', time: '10:40' },
        ],
      },
      {
        user: '이영희',
        message: '품질 검사 완료 보고',
        time: '10:25',
        content: `오늘 오전 품질 검사 결과를 보고드립니다.

■ 검사 결과
- 검사 제품 수: 500개
- 양품: 495개 (99%)
- 불량품: 5개 (1%)
- 불량 유형: 표면 스크래치 3개, 치수 불일치 2개

■ 조치 사항
- 불량품은 재작업 처리 완료
- 원인 분석 진행 중

상세 리포트는 첨부 파일을 참고해 주세요.`,
        replies: [
          { user: '김철수', message: '확인했습니다. 원인 분석 결과 공유 부탁드립니다.', time: '10:28' },
        ],
      },
      {
        user: '박민수',
        message: '설비 점검 요청',
        time: '10:15',
        content: `라인 C 설비 점검이 필요합니다.

■ 요청 사항
- 점검 대상: 라인 C 압착기
- 점검 사유: 이상 소음 발생
- 예상 소요 시간: 2시간

■ 점검 일정 제안
- 오늘 오후 2시 ~ 4시
- 또는 내일 오전 9시 ~ 11시

가능한 시간대 알려주시면 점검 일정 조율하겠습니다.`,
        replies: [
          { user: '이영희', message: '오늘 오후 2시 가능합니다. 점검 부탁드립니다.', time: '10:20' },
          { user: '박민수', message: '확인했습니다. 오후 2시에 점검 진행하겠습니다.', time: '10:22' },
        ],
      },
    ];
    setCommunications(initialCommunications);
  }, []);

  const botReply = useMemo(() => {
    return (text: string) => {
      const t = text.trim();
      if (!t) return '메시지를 입력해 주세요.';
      if (t.includes('설비')) return '설비 관련 이슈를 확인했습니다. 해당 설비/라인명을 알려주시면 더 정확히 안내드릴게요.';
      if (t.includes('경고') || t.includes('알람')) return '경고/알람 기준을 확인하고 싶으신가요? 발생 시간과 라인을 알려주세요.';
      if (t.includes('생산') || t.includes('생산량')) return '생산량은 대시보드의 “생산량” 카드에서 확인할 수 있어요. 기간(오늘/주간/월간)을 말씀해주시면 요약해드릴게요.';
      return `확인했습니다: ${t}`;
    };
  }, []);

  // 메시지가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('chatbot_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save messages to localStorage:', e);
    }
  }, [messages]);

  // 로그아웃 시 (user가 null이 되면) localStorage에서 메시지 제거
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!user) {
      // 로그아웃 시 메시지 초기화
      localStorage.removeItem('chatbot_messages');
      setMessages([{ role: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }]);
    }
  }, [user]);

  useEffect(() => {
    if (!isChatbotOpen) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [isChatbotOpen, messages.length]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    
    // 사용자 메시지 추가
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');
    setIsLoading(true);

    try {
      // 대화 히스토리 준비 (최근 10개만, bot 메시지 제외)
      // 첫 번째 메시지가 bot인 경우 제외하고, user-bot 쌍만 유지
      const recentHistory = messages
        .filter(msg => msg.role === 'user' || msg.role === 'bot')
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          text: msg.text,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: recentHistory,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages((prev) => [...prev, { role: 'bot', text: data.message }]);
      } else {
        setMessages((prev) => [...prev, { 
          role: 'bot', 
          text: data.error || t('chatbot.error')
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { 
        role: 'bot', 
        text: t('chatbot.error')
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-slate-200 flex flex-col z-20">
      {/* 공지사항 */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t('notice.title')}</h2>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingNotice(null);
                setEditingNoticeIndex(null);
                setSelectedNotice(null);
                setSelectedCommunication(null);
                setIsChatbotOpen(false);
                setIsNoticeEditModalOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-blue-600"
              title={t('notice.add')}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {notices.map((notice, index) => (
            <div
              key={index}
              className="p-3 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCommunication(null);
                    setIsChatbotOpen(false);
                    setIsNoticeEditModalOpen(false);
                    setSelectedNotice(notice);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {notice.important && (
                      <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded">
                        {t('notice.important')}
                      </span>
                    )}
                    <span className="text-sm font-medium text-slate-900">{notice.title}</span>
                  </div>
                  <span className="text-xs text-slate-500">{notice.date}</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNotice(notice);
                        setEditingNoticeIndex(index);
                        setIsNoticeEditModalOpen(true);
                      }}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                      title={t('notice.edit')}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(language === 'ko' ? '이 공지사항을 삭제하시겠습니까?' : 'Are you sure you want to delete this notice?')) {
                          setNotices(notices.filter((_, idx) => idx !== index));
                        }
                      }}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      title={t('notice.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 커뮤니티 */}
      <div className="p-4 border-b border-slate-200 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t('community.title')}</h2>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => {
                setEditingCommunication(null);
                setEditingCommunicationIndex(null);
                setSelectedNotice(null);
                setSelectedCommunication(null);
                setIsChatbotOpen(false);
                setIsNoticeEditModalOpen(false);
                setIsCommunicationEditModalOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-emerald-600"
              title="글 작성"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {communications.map((chat, index) => (
            <div
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNotice(null);
                setIsChatbotOpen(false);
                setIsNoticeEditModalOpen(false);
                setSelectedCommunication(chat);
              }}
              className="p-3 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-slate-900 flex-1">{chat.message}</p>
                <span className="text-xs text-slate-500 ml-2">{chat.time}</span>
              </div>
              <span className="text-xs text-slate-500">{chat.user}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 챗봇 */}
      <div className="p-4 border-t border-slate-200">
        <button
          type="button"
          className="w-full inline-flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          onClick={() => {
            setSelectedNotice(null);
            setSelectedCommunication(null);
            setIsNoticeEditModalOpen(false);
            setIsChatbotOpen(true);
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            {t('chatbot.open')}
          </span>
          <span className="text-xs text-slate-500">{t('chatbot.popup')}</span>
        </button>
      </div>

      {/* 공지사항 상세 팝업 */}
      {selectedNotice && (
        <div 
          className="absolute inset-0 z-50 bg-white"
          onClick={(e) => {
            // 배경 클릭 시 닫기 방지 (내부 클릭만 처리)
            e.stopPropagation();
          }}
        >
          <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-slate-900">{t('notice.title')}</span>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className="rounded-lg p-2 hover:bg-slate-100 text-blue-600"
              onClick={() => {
                const index = notices.indexOf(selectedNotice);
                setEditingNotice(selectedNotice);
                setEditingNoticeIndex(index);
                setSelectedNotice(null);
                setIsChatbotOpen(false);
                setIsNoticeEditModalOpen(true);
              }}
                    aria-label={t('notice.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 hover:bg-slate-100 text-red-600"
                    onClick={() => {
                      const index = notices.indexOf(selectedNotice);
                      if (confirm(language === 'ko' ? '이 공지사항을 삭제하시겠습니까?' : 'Are you sure you want to delete this notice?')) {
                        setNotices(notices.filter((_, idx) => idx !== index));
                        setSelectedNotice(null);
                      }
                    }}
                    aria-label={t('notice.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-slate-100"
                onClick={() => setSelectedNotice(null)}
                aria-label="닫기"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>
          <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {selectedNotice.important && (
                  <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded">
                    {t('notice.important')}
                  </span>
                )}
                <h3 className="text-xl font-bold text-slate-900">{selectedNotice.title}</h3>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>{selectedNotice.date}</span>
                {selectedNotice.author && <span>{t('notice.author')}: {selectedNotice.author}</span>}
              </div>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-line text-slate-700 leading-relaxed">
                {selectedNotice.content}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 커뮤니티 상세 팝업 */}
      {selectedCommunication && (
        <div 
          className="absolute inset-0 z-50 bg-white"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold text-slate-900">{t('community.title')}</span>
            </div>
            <div className="flex items-center gap-2">
              {user && (selectedCommunication.user === user.name || selectedCommunication.user === user.employeeNumber) && (
                <>
                  <button
                    type="button"
                    className="rounded-lg p-2 hover:bg-slate-100 text-emerald-600"
                    onClick={() => {
                      const index = communications.indexOf(selectedCommunication);
                      setEditingCommunication(selectedCommunication);
                      setEditingCommunicationIndex(index);
                      setSelectedCommunication(null);
                      setIsChatbotOpen(false);
                      setIsNoticeEditModalOpen(false);
                      setIsCommunicationEditModalOpen(true);
                    }}
                    aria-label="수정"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 hover:bg-slate-100 text-red-600"
                    onClick={() => {
                      const index = communications.indexOf(selectedCommunication);
                      if (confirm('이 글을 삭제하시겠습니까?')) {
                        setCommunications(communications.filter((_, idx) => idx !== index));
                        setSelectedCommunication(null);
                      }
                    }}
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-slate-100"
                onClick={() => setSelectedCommunication(null)}
                aria-label="닫기"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>
          <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedCommunication.user}</h3>
                  <span className="text-sm text-slate-500">{selectedCommunication.time}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-900 mb-2">{selectedCommunication.message}</p>
                <div className="whitespace-pre-line text-slate-700 text-sm leading-relaxed">
                  {selectedCommunication.content}
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-md font-semibold text-slate-900 mb-4">
                {t('community.replies')} ({selectedCommunication.replies?.length || 0})
              </h4>
              
              {selectedCommunication.replies && selectedCommunication.replies.length > 0 && (
                <div className="space-y-4 mb-6">
                  {selectedCommunication.replies.map((reply, replyIndex) => {
                    const commIndex = communications.indexOf(selectedCommunication);
                    const isMyReply = user && (reply.user === user.name || reply.user === user.employeeNumber);
                    const isEditingThis = editingReplyAt && editingReplyAt[0] === commIndex && editingReplyAt[1] === replyIndex;

                    return (
                      <div key={replyIndex} className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-900">{reply.user}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">{reply.time}</span>
                            {isMyReply && !isEditingThis && (
                              <>
                                <button
                                  type="button"
                                  className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"
                                  onClick={() => {
                                    setEditingReplyAt([commIndex, replyIndex]);
                                    setEditingReplyMessage(reply.message);
                                  }}
                                  aria-label={t('community.editReply')}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1.5 rounded hover:bg-red-50 text-red-600"
                                  onClick={() => {
                                    if (confirm(t('community.confirmDeleteReply'))) {
                                      const newReplies = (selectedCommunication.replies || []).filter((_, i) => i !== replyIndex);
                                      const updated = { ...selectedCommunication, replies: newReplies };
                                      setCommunications(communications.map((c, idx) => idx === commIndex ? updated : c));
                                      setSelectedCommunication(updated);
                                      setEditingReplyAt(null);
                                      setEditingReplyMessage('');
                                    }
                                  }}
                                  aria-label={t('community.deleteReply')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEditingThis ? (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={editingReplyMessage}
                              onChange={(e) => setEditingReplyMessage(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-emerald-500 mb-2"
                              placeholder={t('community.replyPlaceholder')}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingReplyMessage.trim()) {
                                    alert(t('community.replyRequired'));
                                    return;
                                  }
                                  const newReplies = [...(selectedCommunication.replies || [])];
                                  newReplies[replyIndex] = { ...reply, message: editingReplyMessage.trim() };
                                  const updated = { ...selectedCommunication, replies: newReplies };
                                  setCommunications(communications.map((c, idx) => idx === commIndex ? updated : c));
                                  setSelectedCommunication(updated);
                                  setEditingReplyAt(null);
                                  setEditingReplyMessage('');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                              >
                                {t('community.save')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReplyAt(null);
                                  setEditingReplyMessage('');
                                }}
                                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium"
                              >
                                {t('community.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-700">{reply.message}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {user && (
                <div className="border-t border-slate-200 pt-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const replyInput = e.currentTarget.querySelector('input[type="text"]') as HTMLInputElement;
                      const replyText = replyInput?.value.trim();
                      
                      if (!replyText) {
                        alert(language === 'ko' ? '댓글을 입력해주세요.' : 'Please enter a reply.');
                        return;
                      }

                      const now = new Date();
                      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                      
                      const newReply = {
                        user: user.name || user.employeeNumber,
                        message: replyText,
                        time: timeString,
                      };

                      const communicationIndex = communications.indexOf(selectedCommunication);
                      const updatedCommunication = {
                        ...selectedCommunication,
                        replies: [...(selectedCommunication.replies || []), newReply],
                      };

                      setCommunications(communications.map((c, idx) => 
                        idx === communicationIndex ? updatedCommunication : c
                      ));
                      setSelectedCommunication(updatedCommunication);
                      
                      replyInput.value = '';
                    }}
                    className="flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      placeholder={t('community.replyPlaceholder')}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0"
                      style={{ writingMode: 'horizontal-tb' }}
                    >
                      {t('community.submit')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 챗봇 팝업(오른쪽 사이드바 내부) */}
      <div
        className={`absolute inset-0 z-50 bg-white transition-transform duration-200 ${
          isChatbotOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!isChatbotOpen}
      >
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-slate-900">{language === 'ko' ? '챗봇' : 'Chatbot'}</span>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-slate-100"
            onClick={() => setIsChatbotOpen(false)}
            aria-label={t('chatbot.close')}
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <div ref={scrollRef} className="h-[calc(100vh-4rem-4rem)] overflow-y-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm border ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-900 border-slate-200'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm border bg-white text-slate-900 border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-16 px-4 border-t border-slate-200 flex items-center gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) sendChat();
            }}
            type="text"
            placeholder={t('chatbot.placeholder')}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            onClick={sendChat}
            disabled={isLoading}
            aria-label={t('chatbot.send')}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* 공지사항 작성/수정 모달 */}
      {isNoticeEditModalOpen && (
        <NoticeEditModal
          notice={editingNotice}
          onClose={() => {
            setIsNoticeEditModalOpen(false);
            setEditingNotice(null);
            setEditingNoticeIndex(null);
            setSelectedNotice(null);
            setSelectedCommunication(null);
            setIsChatbotOpen(false);
          }}
          onSave={(notice) => {
            if (editingNoticeIndex !== null) {
              // 수정
              setNotices(notices.map((n, idx) => 
                editingNoticeIndex === idx ? notice : n
              ));
            } else {
              // 추가
              setNotices([notice, ...notices]);
            }
            setIsNoticeEditModalOpen(false);
            setEditingNotice(null);
            setEditingNoticeIndex(null);
            setSelectedNotice(null);
            setSelectedCommunication(null);
            setIsChatbotOpen(false);
          }}
        />
      )}

      {/* 커뮤니티 작성/수정 모달 */}
      {isCommunicationEditModalOpen && user && (
        <CommunicationEditModal
          communication={editingCommunication}
          currentUser={user.name || user.employeeNumber}
          onClose={() => {
            setIsCommunicationEditModalOpen(false);
            setEditingCommunication(null);
            setEditingCommunicationIndex(null);
            setSelectedNotice(null);
            setSelectedCommunication(null);
            setIsChatbotOpen(false);
            setIsNoticeEditModalOpen(false);
          }}
          onSave={(communication) => {
            if (editingCommunicationIndex !== null) {
              // 수정
              setCommunications(communications.map((c, idx) => 
                editingCommunicationIndex === idx ? communication : c
              ));
            } else {
              // 추가
              setCommunications([communication, ...communications]);
            }
            setIsCommunicationEditModalOpen(false);
            setEditingCommunication(null);
            setEditingCommunicationIndex(null);
            setSelectedNotice(null);
            setSelectedCommunication(null);
            setIsChatbotOpen(false);
            setIsNoticeEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
