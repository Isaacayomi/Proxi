import React, { useState } from "react";
import { Button, Text } from "react-native-paper";
import { AuthLayout, Field, s } from "../ui/design";
type Details = { firstName: string; lastName: string; matricNumber?: string };
export default function UserDetails({
  onSubmit,
  userType,
  initialDetails,
  onCancel,
  onLogout,
}: {
  onSubmit: (details: Details) => void | Promise<void>;
  userType: "student" | "lecturer" | null;
  initialDetails?: Details;
  onCancel?: () => void;
  onLogout?: () => Promise<void>;
}) {
  const [firstName, setFirst] = useState(initialDetails?.firstName ?? "");
  const [lastName, setLast] = useState(initialDetails?.lastName ?? "");
  const [matricNumber, setMatric] = useState(
    initialDetails?.matricNumber ?? "",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name");
      return;
    }
    if (
      userType === "student" &&
      !/^[A-Z]{3}\/\d{4}\/\d{3}$/.test(matricNumber)
    ) {
      setError("Use the matric number format ABC/2024/001");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(userType === "student" ? { matricNumber } : {}),
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save your profile. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthLayout
      step="MAKE IT YOURS"
      title={"Let’s get to\nknow you."}
      description="A few details to put a name to your attendance."
    >
      <Field
        maxLength={80}
        label="First name"
        value={firstName}
        onChangeText={setFirst}
        autoComplete="given-name"
      />
      <Field
        maxLength={80}
        label="Last name"
        value={lastName}
        onChangeText={setLast}
        autoComplete="family-name"
      />
      {userType === "student" && (
        <Field
          label="Matric number"
          placeholder="ABC/2024/001"
          value={matricNumber}
          onChangeText={(v) => setMatric(v.toUpperCase())}
          autoCapitalize="characters"
        />
      )}
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button
        mode="contained"
        style={s.primaryButton}
        contentStyle={s.buttonContent}
        loading={loading}
        disabled={loading}
        onPress={submit}
      >
        {onCancel ? "Save profile" : "Let’s get started"}
      </Button>
      {onCancel && (
        <Button disabled={loading} onPress={onCancel}>
          Cancel
        </Button>
      )}
      {onLogout && (
        <Button disabled={loading} onPress={onLogout}>
          Sign out
        </Button>
      )}
    </AuthLayout>
  );
}
