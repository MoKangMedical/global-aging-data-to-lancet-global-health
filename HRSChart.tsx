import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 模拟44个国家的数据
const countries = [
  "Austria", "Belgium", "Brazil", "Bulgaria", "Chile", "China", "Costa Rica", "Croatia",
  "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany",
  "Greece", "Hungary", "India", "Ireland", "Israel", "Italy", "Japan", "Korea",
  "Latvia", "Lithuania", "Luxembourg", "Malaysia", "Malta", "Mexico", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "South Africa", "Spain",
  "Sweden", "Switzerland", "Thailand", "Scotland", "Northern Ireland", "England", "United States"
];

// 生成模拟数据
const generateMockData = () => {
  const years = [
    "1992-93", "1994-95", "1996-97", "1998-99", "2000-01", "2002-03",
    "2004-05", "2006-07", "2008-09", "2010-11", "2012-13", "2014-15",
    "2016-17", "2018-19", "2020-21"
  ];

  return years.map((year, yearIndex) => {
    const dataPoint: any = { year };
    let total = 0;

    // 根据年份逐渐增加国家数量
    const activeCountries = Math.min(Math.floor((yearIndex + 1) * 3), countries.length);

    countries.slice(0, activeCountries).forEach((country) => {
      // 生成合理的调查样本数
      const baseValue = Math.floor(Math.random() * 5000) + 1000;
      const value = yearIndex > 10 ? baseValue * 1.5 : baseValue;
      dataPoint[country] = Math.floor(value);
      total += dataPoint[country];
    });

    dataPoint.total = total;
    return dataPoint;
  });
};

// 国家颜色映射
const countryColors: Record<string, string> = {
  "Austria": "#4472C4",
  "Belgium": "#ED7D31",
  "Brazil": "#A5A5A5",
  "Bulgaria": "#FFC000",
  "Chile": "#5B9BD5",
  "China": "#70AD47",
  "Costa Rica": "#264478",
  "Croatia": "#9E480E",
  "Cyprus": "#636363",
  "Czech Republic": "#997300",
  "Denmark": "#255E91",
  "Estonia": "#43682B",
  "Finland": "#FF6B6B",
  "France": "#C5E0B4",
  "Germany": "#FFE699",
  "Greece": "#BDD7EE",
  "Hungary": "#F4B084",
  "India": "#8FAADC",
  "Ireland": "#B4C7E7",
  "Israel": "#D6DCE4",
  "Italy": "#FBE5D6",
  "Japan": "#EDEDED",
  "Korea": "#DEEBF7",
  "Latvia": "#FCE4D6",
  "Lithuania": "#E2EFDA",
  "Luxembourg": "#FFF2CC",
  "Malaysia": "#D9E1F2",
  "Malta": "#FCE4D6",
  "Mexico": "#F8CBAD",
  "Netherlands": "#C9C9C9",
  "Poland": "#A9D08E",
  "Portugal": "#FFD966",
  "Romania": "#9DC3E6",
  "Slovakia": "#F4B183",
  "Slovenia": "#C5E0B4",
  "South Africa": "#BDD7EE",
  "Spain": "#F8CBAD",
  "Sweden": "#FFE699",
  "Switzerland": "#C9C9C9",
  "Thailand": "#E2EFDA",
  "Scotland": "#D6DCE4",
  "Northern Ireland": "#EDEDED",
  "England": "#BDD7EE",
  "United States": "#F4B084"
};

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    // 只显示有值的国家
    const activeCountries = payload.filter(p => p.value > 0);
    const total = activeCountries.reduce((sum, p) => sum + p.value, 0);

    return (
      <div className="bg-white p-4 border border-gray-300 rounded shadow-lg max-h-96 overflow-y-auto">
        <p className="font-bold text-gray-900 mb-2">{label}</p>
        {activeCountries.slice(0, 5).map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
        {activeCountries.length > 5 && (
          <p className="text-sm text-gray-600 mt-1">
            ...and {activeCountries.length - 5} more countries
          </p>
        )}
        <p className="font-semibold text-gray-900 mt-2 pt-2 border-t">
          Total: {total.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function HRSChart() {
  const [data] = useState(generateMockData());

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl text-[#A51C30]">HEALTH & RETIREMENT STUDIES</CardTitle>
        <CardDescription className="text-base">
          人口代表性、纵向、多学科的老年人调查，采用国际协调的调查工具
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="circle"
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              content={() => (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
                  {countries.slice(0, 12).map((country) => (
                    <div key={country} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: countryColors[country] }}
                      />
                      <span>{country}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">...and 32 more</span>
                  </div>
                </div>
              )}
            />
            {countries.map((country) => (
              <Bar
                key={country}
                dataKey={country}
                stackId="a"
                fill={countryColors[country]}
                stroke="none"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
