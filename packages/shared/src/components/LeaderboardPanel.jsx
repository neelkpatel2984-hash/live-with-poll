import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { chartPalette } from '../utils/helpers';

export default function LeaderboardPanel({ rows, title = 'Leaderboard' }) {
  const data = (rows || []).slice(0, 20).map((r, i) => ({
    name: r.displayName || 'Player',
    points: r.points ?? 0,
    rank: i + 1,
  }));

  if (!data.length) {
    return (
      <p className="text-sm text-neutral-400">
        No scores yet — answers will appear here during the quiz.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-neutral-100">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{title}</p>
      <div className="h-72 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#d4d4d4', fontSize: 10 }}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={56}
            />
            <YAxis tick={{ fill: '#a3a3a3', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid rgba(248,113,113,0.35)',
                background: 'rgba(10,10,10,0.95)',
                color: '#fafafa',
              }}
            />
            <Bar dataKey="points" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={chartPalette(i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ol className="max-h-40 space-y-1 overflow-y-auto text-sm">
        {rows.slice(0, 15).map((r, i) => (
          <li
            key={r.participantId}
            className="flex justify-between rounded-lg border border-white/10 bg-white/5 px-2 py-1"
          >
            <span>
              #{i + 1} {r.displayName || 'Player'}
            </span>
            <span className="font-semibold text-red-300">{r.points} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
