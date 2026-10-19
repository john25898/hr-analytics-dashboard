'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegulationBodyChart } from '@/components/better-charts';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RegulatoryBodiesPage() {
  const { data: employees, isLoading: employeesLoading } = useSWR('/api/employees?limit=1000', fetcher);
  const { data: analytics, isLoading: analyticsLoading } = useSWR('/api/analytics', fetcher);

  const isLoading = employeesLoading || analyticsLoading;

  const regulatoryBodiesData = React.useMemo(() => {
    if (!employees?.data) return [];

    const bodiesMap: Record<string, any> = {};
    
    employees.data.forEach((emp: any) => {
      const body = emp.regulatoryBody || 'Unregistered';
      if (!bodiesMap[body]) {
        bodiesMap[body] = {
          name: body,
          count: 0,
          valid: 0,
          expiring: 0,
          expired: 0,
          employees: [],
        };
      }
      bodiesMap[body].count++;
      bodiesMap[body].employees.push(emp);

      // Check license status
      if (emp.validUntil) {
        const today = new Date();
        const expireDate = new Date(emp.validUntil);
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (expireDate < today) {
          bodiesMap[body].expired++;
        } else if (expireDate <= thirtyDaysFromNow) {
          bodiesMap[body].expiring++;
        } else {
          bodiesMap[body].valid++;
        }
      }
    });

    return Object.values(bodiesMap).sort((a: any, b: any) => b.count - a.count);
  }, [employees?.data]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Navigation */}
      <BackButton />

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Regulatory Bodies</h2>
        <p className="text-muted-foreground mt-1">
          Professional council registrations and compliance tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bodies</CardTitle>
            <Building2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regulatoryBodiesData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Regulatory councils</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.data?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid Licenses</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regulatoryBodiesData.reduce((sum: number, b: any) => sum + b.valid, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current registrations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regulatoryBodiesData.reduce((sum: number, b: any) => sum + b.expired + b.expiring, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Expired or expiring</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {analytics?.regulatoryBodies && analytics.regulatoryBodies.length > 0 && (
        <RegulationBodyChart data={analytics.regulatoryBodies} />
      )}

      {/* Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Bodies Details</CardTitle>
          <CardDescription>Staff distribution by professional council</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Body Name</TableHead>
                  <TableHead className="text-center">Total Staff</TableHead>
                  <TableHead className="text-center">Valid</TableHead>
                  <TableHead className="text-center">Expiring Soon</TableHead>
                  <TableHead className="text-center">Expired</TableHead>
                  <TableHead>Compliance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regulatoryBodiesData.map((body: any, idx: number) => {
                  const compliance = body.count > 0 ? Math.round((body.valid / body.count) * 100) : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{body.name}</TableCell>
                      <TableCell className="text-center font-semibold">{body.count}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {body.valid}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {body.expiring > 0 ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {body.expiring}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {body.expired > 0 ? (
                          <Badge variant="destructive">{body.expired}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-green-600"
                              style={{ width: `${compliance}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{compliance}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
