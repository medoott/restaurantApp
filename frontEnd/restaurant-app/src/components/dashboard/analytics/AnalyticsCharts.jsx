import { motion } from "framer-motion";
import { useDarkMode } from "../../../hooks/useDarkMode.js";
import {
  LineChart as RechartsLine,
  Line,
  BarChart as RechartsBar,
  Bar,
  PieChart as RechartsPie,
  Pie,
  AreaChart as RechartsArea,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  primary: "#B07B4F",
  secondary: "#3B2515",
  accent1: "#D4A574",
  accent2: "#8B6B4A",
  accent3: "#C9B496",
  warm1: "#EDE1CF",
  warm2: "#F3E5D3",
  emerald: "#34D399",
  rose: "#F43F5E",
  amber: "#F59E0B",
  blue: "#60A5FA",
  purple: "#A78BFA",
  teal: "#2DD4BF",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.accent1,
  COLORS.accent2,
  COLORS.accent3,
  COLORS.emerald,
  COLORS.blue,
  COLORS.purple,
  COLORS.teal,
  COLORS.amber,
  COLORS.rose,
];

const darkModeColors = {
  grid: "#374151",
  text: "#9CA3AF",
  tooltipBg: "#1F2937",
  tooltipBorder: "#374151",
};

function ChartCard({ title, subtitle, children, className = "" }) {
  const isDark = useDarkMode();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5 ${className}`}
    >
      {title && (
        <div className="mb-4">
          <h3 className={`font-serif text-lg ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {title}
          </h3>
          {subtitle && (
            <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label, formatter }) {
  const isDark = useDarkMode();
  if (!active || !payload?.length) return null;
  return (
    <div
      className={`rounded-xl px-4 py-3 shadow-lg text-sm ${
        isDark ? "bg-gray-800 ring-1 ring-gray-700 text-gray-200" : "bg-white ring-1 ring-[#EDE1CF] text-[#3B2515]"
      }`}
    >
      <p className={`font-medium mb-1 ${isDark ? "text-gray-300" : "text-[#A9805F]"}`}>{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}: </span>
          <span className="font-semibold">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LineChartCard({
  data,
  lines,
  title,
  subtitle,
  xKey = "label",
  height = 300,
  grid = true,
  formatter,
  className = "",
  syncId,
}) {
  const isDark = useDarkMode();
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLine data={data} syncId={syncId}>
          {grid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? darkModeColors.grid : "#EDE1CF"}
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: isDark ? darkModeColors.text : "#9C8268" }}
            axisLine={{ stroke: isDark ? darkModeColors.grid : "#EDE1CF" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: isDark ? darkModeColors.text : "#9C8268" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip formatter={formatter} />} />
          {lines.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 12, color: isDark ? "#D1D5DB" : "#3B2515" }}
            />
          )}
          {lines.map((line, idx) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={line.strokeWidth || 2}
              dot={line.dot !== false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              animationBegin={idx * 100}
            />
          ))}
        </RechartsLine>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BarChartCard({
  data,
  bars,
  title,
  subtitle,
  xKey = "label",
  height = 300,
  grid = true,
  stacked = false,
  formatter,
  className = "",
  syncId,
}) {
  const isDark = useDarkMode();
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBar data={data} syncId={syncId} barSize={bars.length > 1 ? 20 : 32}>
          {grid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? darkModeColors.grid : "#EDE1CF"}
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: isDark ? darkModeColors.text : "#9C8268" }}
            axisLine={{ stroke: isDark ? darkModeColors.grid : "#EDE1CF" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: isDark ? darkModeColors.text : "#9C8268" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip formatter={formatter} />} />
          {bars.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 12, color: isDark ? "#D1D5DB" : "#3B2515" }}
            />
          )}
          {bars.map((bar, idx) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || CHART_COLORS[idx % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
              stackId={stacked ? "stack" : undefined}
              animationBegin={idx * 100}
            />
          ))}
        </RechartsBar>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PieChartCard({
  data,
  title,
  subtitle,
  dataKey = "value",
  nameKey = "name",
  height = 320,
  donut = false,
  formatter,
  className = "",
}) {
  const isDark = useDarkMode();
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPie>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={donut ? 60 : 0}
            outerRadius={110}
            paddingAngle={2}
            animationBegin={200}
          >
            {data.map((_, idx) => (
              <Cell
                key={idx}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                stroke={isDark ? "#1F2937" : "#fff"}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={formatter} />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: isDark ? "#D1D5DB" : "#3B2515" }}
          />
        </RechartsPie>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AreaChartCard({
  data,
  areas,
  title,
  subtitle,
  xKey = "label",
  height = 300,
  grid = true,
  formatter,
  className = "",
  syncId,
}) {
  const isDark = useDarkMode();
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsArea data={data} syncId={syncId}>
          {grid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? darkModeColors.grid : "#EDE1CF"}
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: isDark ? darkModeColors.text : "#9C8268" }}
            axisLine={{ stroke: isDark ? darkModeColors.grid : "#EDE1CF" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: isDark ? darkModeColors.text : "#9C8268" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip formatter={formatter} />} />
          {areas.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 12, color: isDark ? "#D1D5DB" : "#3B2515" }}
            />
          )}
          {areas.map((area, idx) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name || area.dataKey}
              stroke={area.color || CHART_COLORS[idx % CHART_COLORS.length]}
              fill={area.color || CHART_COLORS[idx % CHART_COLORS.length]}
              fillOpacity={area.fillOpacity || 0.15}
              strokeWidth={area.strokeWidth || 2}
              animationBegin={idx * 100}
            />
          ))}
        </RechartsArea>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function StatCard({ label, value, trend, icon: Icon, color = COLORS.primary, subtitle }) {
  const isDark = useDarkMode();
  const trendUp = trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white ring-[#EDE1CF]"} ring-1 shadow-sm p-5 flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? "text-gray-400" : "text-[#A9805F]"}`}>
            {label}
          </p>
          <p className={`font-serif text-2xl mt-1 ${isDark ? "text-gray-100" : "text-[#3B2515]"}`}>
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon size={18} color={color} />
          </div>
        )}
      </div>
      {(trend !== undefined || subtitle) && (
        <div className="flex items-center gap-2 mt-3">
          {trend !== undefined && (
            <span
              className={`text-xs font-medium ${trendUp ? "text-emerald-600" : "text-rose-500"}`}
            >
              {trendUp ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <span className={`text-xs ${isDark ? "text-gray-400" : "text-[#9C8268]"}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export { CHART_COLORS, COLORS, ChartCard };
