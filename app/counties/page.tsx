'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CountiesPage() {
  const [selectedCounty, setSelectedCounty] = React.useState('Embu');
  const { data: analytics, isLoading: analyticsLoading } = useSWR('/api/analytics', fetcher);
  const { data: countyData, isLoading: countyLoading } = useSWR(
    selectedCounty ? `/api/employees?county=${selectedCounty}` : null,
    fetcher
  );

  const isLoading = analyticsLoading || countyLoading;
  const counties = analytics?.countyDistribution || [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Navigation */}
      <BackButton />

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">County Management</h2>
        <p className="text-muted-foreground mt-1">View workforce distribution across counties</p>
      </div>

      {/* County Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : counties.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">No county data available</p>
        ) : (
          counties.map((county: any) => (
            <Card key={county.name} className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{county.name}</CardTitle>
                <MapPin className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{county.value}</div>
                <p className="text-xs text-muted-foreground mt-1">Employees</p>
                <button
                  onClick={() => setSelectedCounty(county.name)}
                  className={`mt-3 w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                    selectedCounty === county.name
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  View Details
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* County Details */}
      {selectedCounty && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <div>
                <CardTitle>{selectedCounty}</CardTitle>
                <CardDescription>
                  {countyData?.data?.length || 0} employees in {selectedCounty} county
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : countyData?.data?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No employees found in this county</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Designation</TableHead>
                      <TableHead className="font-semibold">Sub County</TableHead>
                      <TableHead className="font-semibold">Station</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countyData?.data?.map((emp: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{emp.name || '-'}</TableCell>
                        <TableCell className="text-sm">{emp.designation || '-'}</TableCell>
                        <TableCell className="text-sm">{emp.subCounty || '-'}</TableCell>
                        <TableCell className="text-sm">{emp.station || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.phone || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
