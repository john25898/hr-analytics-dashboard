'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

interface ChartData {
  name: string;
  value: number;
}

export function EducationLevelChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Education Level Distribution</CardTitle>
        <CardDescription>Workforce qualifications breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LicenseStatusChart({ data }: { data: ChartData[] }) {
  // Custom label renderer to avoid overlapping
  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(0);
    return `${percent}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>License Status Distribution</CardTitle>
        <CardDescription>Professional certificates and compliance status</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} employees`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-6 space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function GenderDistributionChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gender Distribution</CardTitle>
        <CardDescription>Workforce gender composition</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {data.map((item, idx) => (
            <div key={idx} className="rounded-lg bg-muted p-3 text-center">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-sm text-muted-foreground">{item.name}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DesignationChart({ data }: { data: ChartData[] }) {
  const topDesignations = data.slice(0, 8);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Designations</CardTitle>
        <CardDescription>Positions with most staff</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={topDesignations}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RegulationBodyChart({ data }: { data: ChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regulatory Bodies</CardTitle>
        <CardDescription>Professional council registrations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="h-2 w-full rounded-full bg-muted"
                  style={{
                    background: `linear-gradient(to right, ${COLORS[idx % COLORS.length]} ${(item.value / Math.max(...data.map(d => d.value))) * 100}%, #e5e7eb 0%)`,
                  }}
                />
              </div>
              <div className="ml-4 text-right">
                <div className="font-semibold">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.name}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TenureChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Years of Tenure</CardTitle>
        <CardDescription>Staff experience distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
