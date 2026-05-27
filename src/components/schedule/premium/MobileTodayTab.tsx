import { Fragment, type ReactNode } from "react";
import dayjs from "dayjs";

type MobileTodayTabProps = {
  tasks: any[];
  renderTask: (task: any) => ReactNode;
};

export function MobileTodayTab({ tasks, renderTask }: MobileTodayTabProps) {
  const todayTasks = tasks.filter(t => dayjs(t.date).isSame(dayjs(), "day"));
  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const todayPending = todayTasks.filter(t => !t.completed).length;
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3">
          <div className="text-[10px] text-blue-300">Bugün Plan</div>
          <div className="mt-0.5 text-2xl font-black text-blue-300">{todayTasks.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <div className="text-[10px] text-emerald-300">Tamamlanan</div>
          <div className="mt-0.5 text-2xl font-black text-emerald-300">{todayCompleted}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="text-[10px] text-amber-300">Bekleyen</div>
          <div className="mt-0.5 text-2xl font-black text-amber-300">{todayPending}</div>
        </div>
      </div>
      {todayTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
          <div className="text-2xl">📅</div>
          <div className="mt-2 text-sm">Bugüne planlanmış iş yok</div>
        </div>
      ) : (
        <div className="space-y-2">
          {todayTasks.map(task => <Fragment key={task.id}>{renderTask(task)}</Fragment>)}
        </div>
      )}
    </div>
  );
}
