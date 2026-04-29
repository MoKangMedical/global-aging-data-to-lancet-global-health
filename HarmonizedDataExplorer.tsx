import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const countries = [
  "Austria", "Belgium", "Brazil", "Bulgaria", "Chile", "China", "Costa Rica", "Croatia",
  "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany",
  "Greece", "Hungary", "India", "Ireland", "Israel", "Italy", "Japan", "Korea",
  "Latvia", "Lithuania", "Luxembourg", "Malaysia", "Malta", "Mexico", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "South Africa", "Spain",
  "Sweden", "Switzerland", "Thailand", "Scotland", "Northern Ireland", "England", "United States"
];

const domains = [
  "Demographics",
  "Employment",
  "Health",
  "Income and Consumption",
  "Family Structure",
  "Cognition",
  "Physical Measures"
];

const measures: Record<string, string[]> = {
  "Demographics": ["Age", "Gender", "Education", "Marital Status"],
  "Employment": ["Working for pay", "Retired", "Unemployed", "Labor force status"],
  "Health": ["Self-rated health", "Chronic conditions", "ADL limitations", "Depression"],
  "Income and Consumption": ["Total income", "Household wealth", "Out-of-pocket expenses"],
  "Family Structure": ["Number of children", "Living arrangement", "Contact with children"],
  "Cognition": ["Memory score", "Numeracy", "Orientation"],
  "Physical Measures": ["BMI", "Grip strength", "Walking speed"]
};

const subpopulations = [
  "All respondents",
  "Individual 10 year age bands",
  "Gender",
  "Education level",
  "Urban/Rural"
];

export default function HarmonizedDataExplorer() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["England", "Korea"]);
  const [selectedDomain, setSelectedDomain] = useState<string>("Employment");
  const [selectedMeasure, setSelectedMeasure] = useState<string>("Working for pay");
  const [selectedSubpopulation, setSelectedSubpopulation] = useState<string>("Individual 10 year age bands");
  const [year, setYear] = useState<number>(2016);

  // 生成模拟数据
  const generateChartData = () => {
    return selectedCountries.map(country => ({
      country,
      value: Math.floor(Math.random() * 40) + 40, // 40-80%
      error: Math.floor(Math.random() * 5) + 2 // 2-7% error margin
    }));
  };

  const chartData = generateChartData();

  const handleReset = () => {
    setSelectedCountries(["England", "Korea"]);
    setSelectedDomain("Employment");
    setSelectedMeasure("Working for pay");
    setSelectedSubpopulation("Individual 10 year age bands");
    setYear(2016);
  };

  const removeCountry = (country: string) => {
    setSelectedCountries(prev => prev.filter(c => c !== country));
  };

  const addCountry = (country: string) => {
    if (!selectedCountries.includes(country) && selectedCountries.length < 5) {
      setSelectedCountries(prev => [...prev, country]);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl text-[#A51C30]">CORE HARMONIZED DATA</CardTitle>
        <CardDescription className="text-base">
          研究就绪的变量，在所有数据集中尽可能定义相似，并附有广泛的文档
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 筛选器 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 国家选择 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">COUNTRY</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedCountries.map(country => (
                <Badge key={country} variant="secondary" className="flex items-center gap-1">
                  {country}
                  <button
                    onClick={() => removeCountry(country)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Select value="" onValueChange={addCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Add country..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {countries
                  .filter(c => !selectedCountries.includes(c))
                  .map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* 年份选择 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">YEAR</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="2000"
                max="2020"
                step="2"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12 text-center">{year}</span>
            </div>
          </div>

          {/* 领域选择 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">DOMAIN</label>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {domains.map(domain => (
                  <SelectItem key={domain} value={domain}>
                    {domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 测量指标选择 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">MEASURE</label>
            <Select value={selectedMeasure} onValueChange={setSelectedMeasure}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {measures[selectedDomain]?.map(measure => (
                  <SelectItem key={measure} value={measure}>
                    {measure}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 子人群选择 */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">SUBPOPULATION</label>
            <div className="flex gap-2">
              <Select value={selectedSubpopulation} onValueChange={setSelectedSubpopulation}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subpopulations.map(subpop => (
                    <SelectItem key={subpop} value={subpop}>
                      {subpop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleReset}>
                RESET
              </Button>
              <Button className="bg-[#4A5F8C] hover:bg-[#3A4F7C]">
                PLOT
              </Button>
            </div>
          </div>
        </div>

        {/* 图表展示 */}
        {selectedCountries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {selectedCountries.map(country => (
              <div key={country} className="border rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {country} - {selectedMeasure}
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  from {year} to {year}
                </p>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[chartData.find(d => d.country === country)]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" tick={{ fontSize: 12 }} />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, selectedMeasure]}
                    />
                    <Bar dataKey="value" fill="#5B9BD5">
                      <Cell fill="#5B9BD5" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}

        {selectedCountries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            请选择至少一个国家以查看数据
          </div>
        )}
      </CardContent>
    </Card>
  );
}
