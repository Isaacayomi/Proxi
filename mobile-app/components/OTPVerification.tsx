import React, { useEffect, useState } from "react";
import { Button, Text } from "react-native-paper";
import { AuthLayout, Field, s, colors } from "../ui/design";
export default function OTPVerification({
  email,
  onVerify,
  onResend,
  onBack,
}: {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}) {
  const [otp, setOTP] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [remaining, setRemaining] = useState(60);
  const [deadline, setDeadline] = useState(() => Date.now() + 60000);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [deadline]);
  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onVerify(otp);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to verify this code. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const resend = async () => {
    setError("");
    setResending(true);
    try {
      await onResend();
      setOTP("");
      setRemaining(60);
      setDeadline(Date.now() + 60000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resend. Try again.");
    } finally {
      setResending(false);
    }
  };
  return (
    <AuthLayout
      step="ONE MORE STEP"
      title={"Check your\ninbox."}
      description={`Enter the six-digit code sent to ${email}. The code expires after ten minutes.`}
    >
      <Field
        label="Verification code"
        value={otp}
        onChangeText={(v) => {
          setOTP(v.replace(/\D/g, ""));
          setError("");
        }}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        error={!!error}
        disabled={loading || resending}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Button
        mode="contained"
        style={s.primaryButton}
        contentStyle={s.buttonContent}
        loading={loading}
        disabled={loading || resending}
        onPress={verify}
      >
        Verify & continue
      </Button>
      <Button
        onPress={resend}
        textColor={colors.green}
        loading={resending}
        disabled={remaining > 0 || loading || resending}
      >
        {remaining > 0 ? `Resend code in ${remaining}s` : "Resend code"}
      </Button>
      <Button
        onPress={onBack}
        disabled={loading || resending}
        textColor={colors.muted}
      >
        Use a different email
      </Button>
    </AuthLayout>
  );
}
