"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { X, ChevronDown, Filter } from "lucide-react";

interface FilterOptions {
  counties?: string[];
  designations?: string[];
  genders?: string[];
  statuses?: string[];
  educationLevels?: string[];
  regulatoryBodies?: string[];
}

interface FilterState {
  search?: string;
  county?: string;
  designation?: string;
  gender?: string;
  status?: string;
  education?: string;
  regulatoryBody?: string;
  [key: string]: string | undefined;
}

interface UnifiedFiltersProps {
  options: FilterOptions;
  onFilterChange: (filters: FilterState) => void;
  isLoading?: boolean;
}

export function UnifiedFilters({
  options,
  onFilterChange,
  isLoading,
}: UnifiedFiltersProps) {
  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    county: "all",
    designation: "all",
    gender: "all",
    status: "all",
    education: "all",
    regulatoryBody: "all",
  });

  const [expanded, setExpanded] = React.useState(true);
  const [activeCount, setActiveCount] = React.useState(0);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Count active filters (non-'all' and non-empty)
    const count = Object.values(newFilters).filter(
      (v) => v && v !== "all" && v.trim() !== "",
    ).length;
    setActiveCount(count);

    if (key === "search") {
      // Debounce search so the input never loses focus mid-typing
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        onFilterChange(newFilters);
      }, 350);
    } else {
      onFilterChange(newFilters);
    }
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      search: "",
      county: "all",
      designation: "all",
      gender: "all",
      status: "all",
      education: "all",
      regulatoryBody: "all",
    };
    setFilters(resetFilters);
    setActiveCount(0);
    onFilterChange(resetFilters);
  };

  return (
    <div className="space-y-3">
      {/* Filter Header */}
      <div className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-sm">Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeCount} active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs"
              disabled={isLoading}
            >
              Clear all
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${!expanded ? "-rotate-90" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Filter Content */}
      {expanded && (
        <div className="space-y-3 rounded-lg bg-card border border-border p-4">
          {/* Search */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Search
            </label>
            <Input
              placeholder="Name, phone, ID, or email..."
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-3 md:grid-cols-2">
            {/* County */}
            {options.counties && options.counties.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  County
                </label>
                <Select
                  value={filters.county || "all"}
                  onValueChange={(value) => handleFilterChange("county", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Counties ({options.counties.length})
                    </SelectItem>
                    {options.counties.map((county) => (
                      <SelectItem key={county} value={county}>
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Gender */}
            {options.genders && options.genders.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Gender
                </label>
                <Select
                  value={filters.gender || "all"}
                  onValueChange={(value) => handleFilterChange("gender", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-8 text-sm">
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
              </div>
            )}

            {/* Designation */}
            {options.designations && options.designations.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Designation
                </label>
                <Select
                  value={filters.designation || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("designation", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Designations ({options.designations.length})
                    </SelectItem>
                    {options.designations.map((designation) => (
                      <SelectItem key={designation} value={designation}>
                        {designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
            {options.statuses && options.statuses.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  License Status
                </label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-8 text-sm">
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
              </div>
            )}

            {/* Education Level */}
            {options.educationLevels && options.educationLevels.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Education
                </label>
                <Select
                  value={filters.education || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("education", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {options.educationLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Regulatory Body */}
            {options.regulatoryBodies &&
              options.regulatoryBodies.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Regulatory Body
                  </label>
                  <Select
                    value={filters.regulatoryBody || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("regulatoryBody", value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Bodies</SelectItem>
                      {options.regulatoryBodies.map((body) => (
                        <SelectItem key={body} value={body}>
                          {body}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
