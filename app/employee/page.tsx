import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';

export default function EmployeePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <RightSidebar />
      
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">사원 대시보드</h2>
            <p className="text-slate-600 mt-1">사원 전용 페이지입니다</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="내 작업 현황">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">12</div>
                <div className="text-sm text-slate-600">진행 중인 작업</div>
                <div className="text-xs text-blue-700">완료 예정: 오늘</div>
              </div>
            </Card>

            <Card title="출근 시간">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">08:30</div>
                <div className="text-sm text-slate-600">오늘 출근 시간</div>
                <div className="text-xs text-green-700">정상 출근</div>
              </div>
            </Card>

            <Card title="월간 근무 시간">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">160</div>
                <div className="text-sm text-slate-600">시간</div>
                <div className="text-xs text-slate-500">이번 달</div>
              </div>
            </Card>
          </div>

          <div className="mt-6">
            <Card title="내 할 일">
              <div className="space-y-3">
                {[
                  { task: '라인 A 품질 검사', time: '10:00', status: '진행 중' },
                  { task: '라인 B 점검', time: '14:00', status: '예정' },
                  { task: '일일 보고서 작성', time: '17:00', status: '예정' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white rounded border border-slate-200">
                    <span className="text-xs text-slate-500">{item.time}</span>
                    <span className="flex-1 text-sm text-slate-900">{item.task}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.status === '진행 중' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
