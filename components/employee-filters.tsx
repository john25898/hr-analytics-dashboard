'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface FilterOptions {
  counties: string[];
  designations: string[];
  genders: string[];
  statuses: string[];
}

interface EmployeeFiltersProps {
  options: FilterOptions;
  onFilterChange: (filters: {
    county?: string;
    designation?: string;
    gender?: string;
    status?: string;
    search?: string;
  }) => void;
  isLoading?: boolean;
}

export function EmployeeFilters({ options, onFilterChange, isLoading }: EmployeeFiltersProps) {
  const [filters, setFilters] = React.useState({
    county: 'all',
    designation: 'all',
    gender: 'all',
    status: 'all',
    search: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      county: 'all',
      designation: 'all',
      gender: 'all',
      status: 'all',
      search: '',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-card p-4 border border-border">
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name, phone, or ID..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            disabled={isLoading}
            className="h-9"
          />
        </div>

        <Select value={filters.county} onValueChange={(value) => handleFilterChange('county', value)} disabled={isLoading}>
          <SelectTrigger className="h-9 md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counties</SelectItem>
            {options.counties.map((county) => (
              <SelectItem key={county} value={county}>
                {county}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.designation}
          onValueChange={(value) => handleFilterChange('designation', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="h-9 md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Designations</SelectItem>
            {options.designations.map((designation) => (
              <SelectItem key={designation} value={designation}>
                {designation}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.gender} onValueChange={(value) => handleFilterChange('gender', value)} disabled={isLoading}>
          <SelectTrigger className="h-9 md:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            {options.genders.map((gender) => (
              <SelectItem key={gender} value={gender}>
                {gender}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)} disabled={isLoading}>
          <SelectTrigger className="h-9 md:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {options.statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleReset} variant="outline" size="sm" disabled={isLoading} className="h-9 px-3">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
