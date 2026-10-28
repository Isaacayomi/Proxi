import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Brand } from "@/components/brand";
import { HistoryTable } from "@/components/student/history-table";
import { CheckInCard } from "@/components/student/check-in-card";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { AttendanceSession, AttendanceRecord } from "@/types/database";

describe("Brand Component", () => {
  it("renders the proxi logo brand name", () => {
    render(<Brand />);
    expect(screen.getByText("proxi")).toBeInTheDocument();
    expect(screen.getByText(".")).toBeInTheDocument();
  });
});

describe("Student HistoryTable Component", () => {
  it("renders empty state when no records exist", () => {
    render(<HistoryTable records={[]} />);
    expect(screen.getByText("No Attendance Records Yet")).toBeInTheDocument();
  });

  it("renders attendance rows with course code and distance", () => {
    const mockRecord: AttendanceRecord = {
      id: "rec-1",
      session_id: "s-1",
      student_id: "stu-1",
      matric_number: "CSC/2024/001",
      status: "present",
      distance_meters: 18.5,
      reported_accuracy_meters: 10,
      rejection_reason: null,
      submitted_at: "2026-10-27T10:00:00Z",
      session: {
        id: "s-1",
        course_id: "c-1",
        lecturer_id: "l-1",
        classroom_id: "cr-1",
        latitude: 7.51882,
        longitude: 4.52735,
        radius_meters: 60,
        max_accuracy_meters: 50,
        starts_at: "2026-10-27T09:00:00Z",
        ends_at: "2026-10-27T11:00:00Z",
        status: "active",
        session_code: "CSC401",
        created_at: "2026-10-27T09:00:00Z",
        course: {
          id: "c-1",
          code: "CSC 401",
          name: "Software Engineering Practice",
          department: "CSE",
          created_at: "",
        },
        classroom: {
          id: "cr-1",
          name: "Computer Building LT 1",
          building: "Technology",
          room_number: "101",
          latitude: 7.51882,
          longitude: 4.52735,
          default_radius_meters: 60,
          created_at: "",
        },
      },
    };

    render(<HistoryTable records={[mockRecord]} />);
    expect(screen.getByText("CSC 401")).toBeInTheDocument();
    expect(screen.getByText("Computer Building LT 1")).toBeInTheDocument();
    expect(screen.getByText("18.5m from center")).toBeInTheDocument();
    expect(screen.getByText("Present")).toBeInTheDocument();
  });
});

describe("Student CheckInCard Component", () => {
  const mockSession: AttendanceSession = {
    id: "s-1",
    course_id: "c-1",
    lecturer_id: "l-1",
    classroom_id: "cr-1",
    latitude: 7.51882,
    longitude: 4.52735,
    radius_meters: 60,
    max_accuracy_meters: 50,
    starts_at: "2026-10-27T09:00:00Z",
    ends_at: "2026-10-27T11:00:00Z",
    status: "active",
    session_code: "CSC401",
    created_at: "2026-10-27T09:00:00Z",
    course: {
      id: "c-1",
      code: "CSC 401",
      name: "Software Engineering Practice",
      department: "CSE",
      created_at: "",
    },
    classroom: {
      id: "cr-1",
      name: "Computer Building LT 1",
      building: "Technology",
      room_number: "101",
      latitude: 7.51882,
      longitude: 4.52735,
      default_radius_meters: 60,
      created_at: "",
    },
  };

  it("renders course details and verify button", () => {
    render(<CheckInCard session={mockSession} studentId="stu-1" />);
    expect(screen.getByText("CSC 401")).toBeInTheDocument();
    expect(
      screen.getByText("Software Engineering Practice"),
    ).toBeInTheDocument();
    expect(screen.getByText("Verify GPS & Check In")).toBeInTheDocument();
  });

  it("disables check-in button and shows verified status when student has already checked in", () => {
    const checkedInSession: AttendanceSession = {
      ...mockSession,
      has_checked_in: true,
      checked_in_at: "2026-10-28T09:05:00Z",
    };
    render(<CheckInCard session={checkedInSession} studentId="stu-1" />);
    const button = screen.getByRole("button", { name: /verified present/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText("Attendance Successfully Verified"),
    ).toBeInTheDocument();
  });
});

describe("Toast System", () => {
  function TestToastConsumer() {
    const toast = useToast();
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            toast.success("Attendance Confirmed! 🎉", "Checked into CSC 401")
          }
        >
          Trigger Success Toast
        </button>
      </div>
    );
  }

  it("renders toast when triggered by user action", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(
      <ToastProvider>
        <TestToastConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Trigger Success Toast"));
    expect(
      await screen.findByText("Attendance Confirmed! 🎉"),
    ).toBeInTheDocument();
    expect(screen.getByText("Checked into CSC 401")).toBeInTheDocument();
  });
});

describe("Custom Select Component", () => {
  it("renders with options, opens popover, and triggers onChange", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const handleChange = vi.fn();
    const options = [
      {
        value: "c-1",
        label: "Software Engineering Practice",
        badge: "CSC 401",
        subLabel: "CSE",
      },
      {
        value: "c-2",
        label: "Operating Systems",
        badge: "CSC 403",
        subLabel: "CSE",
      },
    ];

    render(
      <Select
        label="Select Course"
        value="c-1"
        onChange={handleChange}
        options={options}
      />,
    );

    expect(
      screen.getByText("Software Engineering Practice"),
    ).toBeInTheDocument();
    expect(screen.getByText("CSC 401")).toBeInTheDocument();

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    expect(screen.getByText("Operating Systems")).toBeInTheDocument();
    expect(screen.getByText("CSC 403")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Operating Systems"));
    expect(handleChange).toHaveBeenCalledWith("c-2");
  });
});
