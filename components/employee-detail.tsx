'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Briefcase, MapPin, Calendar, User, FileText } from 'lucide-react';

interface EmployeeDetailProps {
  employee: any;
}

export function EmployeeDetail({ employee }: EmployeeDetailProps) {
  const getLicenseStatusColor = (validUntil?: any) => {
    if (!validUntil) return 'secondary';
    const expireDate = new Date(validUntil);
    const today = new Date();
    const daysRemaining = Math.floor((expireDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) return 'destructive';
    if (daysRemaining < 30) return 'default';
    return 'secondary';
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(date);
    }
  };

  const daysUntilExpiry = employee.validUntil 
    ? Math.floor((new Date(employee.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{employee.name || '-'}</CardTitle>
              <CardDescription>{employee.designation || 'No designation'}</CardDescription>
            </div>
            {employee.gender && (
              <Badge variant="outline">{employee.gender === 'M' ? 'Male' : 'Female'}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {employee.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{employee.phone}</p>
                </div>
              </div>
            )}
            
            {employee.idNo && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">ID Number</p>
                  <p className="font-medium">{employee.idNo}</p>
                </div>
              </div>
            )}

            {employee.county && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">County</p>
                  <p className="font-medium">{employee.county}</p>
                </div>
              </div>
            )}

            {employee.subCounty && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Sub-County</p>
                  <p className="font-medium">{employee.subCounty}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {employee.station && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Station</p>
                  <p className="font-medium text-sm">{employee.station}</p>
                </div>
              </div>
            )}

            {employee.dateEmployed && (
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Date Employed</p>
                  <p className="font-medium text-sm">{formatDate(employee.dateEmployed)}</p>
                </div>
              </div>
            )}

            {employee.educationLevel && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Education Level</p>
                  <p className="font-medium text-sm">{employee.educationLevel}</p>
                </div>
              </div>
            )}

            {employee.age && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-medium text-sm">{employee.age} years</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* License & Compliance */}
      {employee.practiseeLicence && (
        <Card>
          <CardHeader>
            <CardTitle>License & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {employee.regulatoryBody && (
                <div>
                  <p className="text-xs text-muted-foreground">Regulatory Body</p>
                  <p className="font-medium">{employee.regulatoryBody}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">License Number</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded text-sm font-mono">
                    {employee.practiseeLicence}
                  </code>
                </div>
              </div>

              {employee.validUntil && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Valid Until</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatDate(employee.validUntil)}</p>
                    <Badge variant={getLicenseStatusColor(employee.validUntil)}>
                      {daysUntilExpiry && daysUntilExpiry < 0 
                        ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                        : daysUntilExpiry && daysUntilExpiry < 30
                        ? `Expires in ${daysUntilExpiry} days`
                        : 'Valid'
                      }
                    </Badge>
                  </div>
                </div>
              )}

              {employee.qualification && (
                <div>
                  <p className="text-xs text-muted-foreground">Qualification</p>
                  <p className="font-medium text-sm">{employee.qualification}</p>
                </div>
              )}

              {employee.school && (
                <div>
                  <p className="text-xs text-muted-foreground">School/Institution</p>
                  <p className="font-medium text-sm">{employee.school}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Information */}
      {employee.dob && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{formatDate(employee.dob)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
