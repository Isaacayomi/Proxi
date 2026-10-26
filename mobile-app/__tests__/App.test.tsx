import React from "react";
import { describe, it, expect, jest } from "@jest/globals";
import { act, create } from "react-test-renderer";
import { Button } from "react-native-paper";
import App from "../App";
import * as SecureStore from "expo-secure-store";

jest.mock(
  "react-native-safe-area-context",
  () =>
    jest.requireActual<
      typeof import("react-native-safe-area-context/jest/mock")
    >("react-native-safe-area-context/jest/mock").default,
);

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => undefined),
    getAllAsync: jest.fn(async () => []),
    runAsync: jest.fn(async () => ({ changes: 0 })),
  })),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(),
}));
jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  Paths: { cache: "/tmp" },
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  multiRemove: jest.fn(async () => undefined),
}));

describe("Expo Go UI preview", () => {
  it.each(["student", "lecturer"])(
    "opens the %s dashboard without making an auth request",
    async (role) => {
      const fetchMock = jest.spyOn(global, "fetch");
      let tree!: ReturnType<typeof create>;
      await act(async () => {
        tree = create(<App />);
      });
      const preview = tree.root
        .findAllByType(Button)
        .find(
          (button) => button.props.children === `Preview ${role} dashboard`,
        );
      expect(preview).toBeDefined();
      await act(async () => {
        preview!.props.onPress();
      });
      const output = JSON.stringify(tree.toJSON());
      expect(output).toContain("preview");
      const attendanceTab = tree.root.findAllByProps({
        accessibilityRole: "tab",
        accessibilityLabel: "Attendance",
      })[0];
      await act(async () => {
        attendanceTab!.props.onPress();
      });
      const attendanceOutput = JSON.stringify(tree.toJSON());
      expect(attendanceOutput).toContain("Scan QR");
      expect(attendanceOutput).toContain("QR");
      for (const label of ["History", "Profile"]) {
        const navItem = tree.root.findAllByProps({
          accessibilityRole: "tab",
          accessibilityLabel: label,
        })[0];
        await act(async () => {
          navItem.props.onPress();
        });
        expect(JSON.stringify(tree.toJSON())).toContain(
          label === "History" ? "Attendance history" : "Your profile",
        );
      }
      const signOut = tree.root
        .findAllByType(Button)
        .find((button) => button.props.children === "Sign out");
      await act(async () => {
        await signOut!.props.onPress();
      });
      expect(JSON.stringify(tree.toJSON())).toContain("Continue with email");
      expect(fetchMock).not.toHaveBeenCalled();
      await act(async () => {
        tree.unmount();
      });
      fetchMock.mockRestore();
    },
  );
});

describe("Authenticated frontend", () => {
  const button = (tree: ReturnType<typeof create>, label: string) =>
    tree.root
      .findAllByType(Button)
      .find((node) => node.props.children === label)!;
  const field = async (
    tree: ReturnType<typeof create>,
    label: string,
    value: string,
  ) => {
    await act(async () => {
      tree.root.findAllByProps({ label })[0].props.onChangeText(value);
    });
  };
  it("completes login, saves and edits a server profile, then revokes logout", async () => {
    let user = {
      id: "user-1",
      email: "student@student.oauife.edu.ng",
      userType: "student",
      firstName: "",
      lastName: "",
      matricNumber: "",
    };
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (input, options) => {
        const url = String(input);
        let data: unknown;
        if (url.endsWith("/api/auth/initiate"))
          data = { id: "challenge-1", resendAfter: 60 };
        else if (url.endsWith("/api/auth/complete"))
          data = {
            token: "test-token",
            expiresAt: Date.now() + 86400000,
            user,
          };
        else if (url.endsWith("/api/me/profile") && options?.method === "PUT") {
          expect(
            (options.headers as Record<string, string>).Authorization,
          ).toBe("Bearer test-token");
          user = { ...user, ...JSON.parse(String(options.body)) };
          data = user;
        } else if (url.endsWith("/api/me/logout")) data = undefined;
        else throw new Error("Unexpected request");
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data }),
        } as Response;
      });
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<App />);
    });
    await field(tree, "Email address", user.email);
    await act(async () => {
      await button(tree, "Continue with email").props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain(user.email);
    await field(tree, "Verification code", "123456");
    await act(async () => {
      await button(tree, "Verify & continue").props.onPress();
    });
    await field(tree, "First name", "Ada");
    await field(tree, "Last name", "Student");
    await field(tree, "Matric number", "EEE/2024/001");
    await act(async () => {
      await button(tree, "Let’s get started").props.onPress();
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
    const nav = tree.root.findAllByProps({
      accessibilityRole: "tab",
      accessibilityLabel: "Profile",
    })[0];
    await act(async () => {
      nav.props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Ada Student");
    await act(async () => {
      button(tree, "Edit profile").props.onPress();
    });
    await field(tree, "First name", "Ada Updated");
    await act(async () => {
      await button(tree, "Save profile").props.onPress();
    });
    const profileNav = tree.root.findAllByProps({
      accessibilityRole: "tab",
      accessibilityLabel: "Profile",
    })[0];
    await act(async () => {
      profileNav.props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Ada Updated Student");
    await act(async () => {
      await button(tree, "Sign out").props.onPress();
    });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Continue with email");
    await act(async () => tree.unmount());
    fetchMock.mockRestore();
  });
  it("restores a cached profile offline and rejects an expired server session", async () => {
    const user = {
      id: "user-1",
      email: "owner@example.com",
      userType: "lecturer",
      firstName: "Owner",
      lastName: "Lecturer",
      matricNumber: "",
    };
    const saved = JSON.stringify({
      token: "cached-token",
      expiresAt: Date.now() + 86400000,
      user,
    });
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(saved);
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("Offline"));
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<App />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Offline: showing");
    await act(async () => tree.unmount());
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(saved);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "Session expired" }),
    } as Response);
    await act(async () => {
      tree = create(<App />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Continue with email");
    await act(async () => tree.unmount());
    fetchMock.mockRestore();
  });
});
