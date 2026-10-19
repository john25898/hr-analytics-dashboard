"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/back-button";
import { Heart, UserPlus, Trash2, Accessibility, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDisabilities,
  addDisability,
  removeDisability,
  type DisabilityRecord,
} from "@/lib/employee-store";

const defaultTestWorkers: DisabilityRecord[] = [
  {
    id: "1",
    name: "James Kiprop",
    gender: "M",
    disability: "Physical Impairment (Mobility)",
    county: "Meru",
    subCounty: "Igembe South",
    facility: "Akachiu Health Centre",
    designation: "HTS Counselor",
    phone: "0712345678",
    supportNeeded: "Wheelchair accessible workspace",
  },
  {
    id: "2",
    name: "Grace Wanjiku",
    gender: "F",
    disability: "Visual Impairment",
    county: "Embu",
    subCounty: "Mbeere North",
    facility: "Mbeere Sub County Hospital",
    designation: "Health Records Information Officer",
    phone: "0723456789",
    supportNeeded: "Screen reader software, large print materials",
  },
  {
    id: "3",
    name: "Peter Mwangi",
    gender: "M",
    disability: "Hearing Impairment",
    county: "Nyandarua",
    subCounty: "Olkalou",
    facility: "JM County Referral Hospital",
    designation: "Clinical Officer",
    phone: "0734567890",
    supportNeeded: "Sign language interpreter during meetings",
  },
  {
    id: "4",
    name: "Sarah Chebet",
    gender: "F",
    disability: "Speech Impairment",
    county: "Tharaka Nithi",
    subCounty: "Mwimbi",
    facility: "Magutuni Sub County Hospital",
    designation: "Mentor Mother",
    phone: "0745678901",
    supportNeeded: "Written communication tools",
  },
  {
    id: "5",
    name: "David Omondi",
    gender: "M",
    disability: "Physical Impairment (Upper Limb)",
    county: "Meru",
    subCounty: "Buuri East",
    facility: "Kiirua Health Centre",
    designation: "Peer Educator",
    phone: "0756789012",
    supportNeeded: "Ergonomic workstation setup",
  },
  {
    id: "6",
    name: "Faith Nyambura",
    gender: "F",
    disability: "Albinism",
    county: "Embu",
    subCounty: "Manyatta",
    facility: "Embu Provincial General Hospital",
    designation: "Nurse",
    phone: "0767890123",
    supportNeeded: "Sun protection, screen filters",
  },
];

const disabilityTypes = [
  "Physical Impairment (Mobility)",
  "Physical Impairment (Upper Limb)",
  "Physical Impairment (Lower Limb)",
  "Visual Impairment",
  "Hearing Impairment",
  "Speech Impairment",
  "Albinism",
  "Mental Health Condition",
  "Learning Disability",
  "Chronic Illness",
  "Other",
];

export default function DisabilitiesPage() {
  const [records, setRecords] = React.useState<DisabilityRecord[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [newRecord, setNewRecord] = React.useState({
    name: "",
    gender: "",
    disability: "",
    county: "",
    subCounty: "",
    facility: "",
    designation: "",
    phone: "",
    supportNeeded: "",
    idNo: "",
    dob: "",
    dateEmployed: "",
    contractEnd: "",
    educationLevel: "",
    qualification: "",
    othersCert: "",
    regulatoryBody: "",
    licenceNo: "",
    validUntil: "",
  });

  // Initialize test data if none exists
  React.useEffect(() => {
    const existing = getDisabilities();
    if (existing.length === 0) {
      defaultTestWorkers.forEach((w) => addDisability(w));
      setRecords(getDisabilities());
    } else {
      setRecords(existing);
    }
  }, []);

  const handleAdd = () => {
    if (!newRecord.name || !newRecord.disability) return;

    const record: DisabilityRecord = {
      id: Date.now().toString(),
      ...newRecord,
    };
    addDisability(record);
    setRecords(getDisabilities());
    setNewRecord({
      name: "",
      gender: "",
      disability: "",
      county: "",
      subCounty: "",
      facility: "",
      designation: "",
      phone: "",
      supportNeeded: "",
      idNo: "",
      dob: "",
      dateEmployed: "",
      contractEnd: "",
      educationLevel: "",
      qualification: "",
      othersCert: "",
      regulatoryBody: "",
      licenceNo: "",
      validUntil: "",
    });
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    removeDisability(id);
    setRecords(getDisabilities());
  };

  // Summary stats
  const genderCounts = records.reduce(
    (acc, r) => {
      const g =
        r.gender === "M" ? "Male" : r.gender === "F" ? "Female" : "Other";
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const disabilityCounts = records.reduce(
    (acc, r) => {
      acc[r.disability] = (acc[r.disability] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topDisability = Object.entries(disabilityCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <BackButton />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Disabilities Registry
          </h2>
          <p className="text-muted-foreground mt-1">
            Employees with disabilities — accommodations and support tracking
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          {showForm ? (
            <Plus className="h-4 w-4 rotate-45" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {showForm ? "Close" : "Add Worker"}
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border-2 border-pink-200 dark:border-pink-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-600" />
              Register New Worker with Disability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Full Name *
                </label>
                <Input
                  placeholder="Enter name"
                  value={newRecord.name}
                  onChange={(e) =>
                    setNewRecord((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Gender</label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                  value={newRecord.gender}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      gender: e.target.value,
                    }))
                  }
                >
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Disability Type *
                </label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                  value={newRecord.disability}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      disability: e.target.value,
                    }))
                  }
                >
                  <option value="">Select disability</option>
                  {disabilityTypes.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">County</label>
                <Input
                  placeholder="e.g. Embu"
                  value={newRecord.county}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      county: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Sub County
                </label>
                <Input
                  placeholder="e.g. Mbeere North"
                  value={newRecord.subCounty}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      subCounty: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Facility
                </label>
                <Input
                  placeholder="Health facility"
                  value={newRecord.facility}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      facility: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Designation
                </label>
                <Input
                  placeholder="Job title"
                  value={newRecord.designation}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      designation: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input
                  placeholder="Phone number"
                  value={newRecord.phone}
                  onChange={(e) =>
                    setNewRecord((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  ID Number
                </label>
                <Input
                  placeholder="National ID"
                  value={newRecord.idNo}
                  onChange={(e) =>
                    setNewRecord((prev) => ({ ...prev, idNo: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={newRecord.dob}
                  onChange={(e) =>
                    setNewRecord((prev) => ({ ...prev, dob: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Date Employed
                </label>
                <Input
                  type="date"
                  value={newRecord.dateEmployed}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      dateEmployed: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Contract End
                </label>
                <Input
                  type="date"
                  value={newRecord.contractEnd}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      contractEnd: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Education Level
                </label>
                <Input
                  placeholder="e.g. Diploma, Degree"
                  value={newRecord.educationLevel}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      educationLevel: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Qualification
                </label>
                <Input
                  placeholder="e.g. Diploma in Health Records"
                  value={newRecord.qualification}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      qualification: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Other Certifications
                </label>
                <Input
                  placeholder="Additional certifications"
                  value={newRecord.othersCert}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      othersCert: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Regulatory Body
                </label>
                <Input
                  placeholder="Regulatory body"
                  value={newRecord.regulatoryBody}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      regulatoryBody: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Practice Licence No
                </label>
                <Input
                  placeholder="Licence number"
                  value={newRecord.licenceNo}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      licenceNo: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Licence Valid Until
                </label>
                <Input
                  type="date"
                  value={newRecord.validUntil}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      validUntil: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium mb-1 block">
                  Support Needed
                </label>
                <Input
                  placeholder="Accommodations required"
                  value={newRecord.supportNeeded}
                  onChange={(e) =>
                    setNewRecord((prev) => ({
                      ...prev,
                      supportNeeded: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleAdd}
                disabled={!newRecord.name || !newRecord.disability}
              >
                <Heart className="h-4 w-4 mr-1" />
                Register Worker
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-600" />
              Total Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-600">
              {records.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Workers with disabilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Accessibility className="h-4 w-4 text-blue-600" />
              Top Disability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {topDisability?.[0] || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {topDisability?.[1] || 0} workers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-green-600" />
              Male
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {genderCounts["Male"] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Male workers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-purple-600" />
              Female
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {genderCounts["Female"] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Female workers</p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registered Workers</CardTitle>
              <CardDescription>
                {records.length} workers with disabilities on record
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 py-12">
              <Heart className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                No workers registered
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add Worker" to register
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Gender</TableHead>
                    <TableHead className="font-semibold">Disability</TableHead>
                    <TableHead className="font-semibold">County</TableHead>
                    <TableHead className="font-semibold">Facility</TableHead>
                    <TableHead className="font-semibold">Designation</TableHead>
                    <TableHead className="font-semibold">ID No</TableHead>
                    <TableHead className="font-semibold">DOB</TableHead>
                    <TableHead className="font-semibold">
                      Date Employed
                    </TableHead>
                    <TableHead className="font-semibold">
                      Education Level
                    </TableHead>
                    <TableHead className="font-semibold">
                      Qualification
                    </TableHead>
                    <TableHead className="font-semibold">
                      Regulatory Body
                    </TableHead>
                    <TableHead className="font-semibold">Licence No</TableHead>
                    <TableHead className="font-semibold">
                      Support Needed
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {record.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.gender === "M" ? "secondary" : "outline"
                          }
                        >
                          {record.gender === "M" ? "Male" : "Female"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200">
                          {record.disability}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.county || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.facility || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.designation || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.idNo || "-"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {record.dob || "-"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {record.dateEmployed || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.educationLevel || "-"}
                      </TableCell>
                      <TableCell
                        className="text-sm max-w-[160px] truncate"
                        title={record.qualification}
                      >
                        {record.qualification || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.regulatoryBody || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.licenceNo || "-"}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground max-w-[200px] truncate"
                        title={record.supportNeeded}
                      >
                        {record.supportNeeded || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(record.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
