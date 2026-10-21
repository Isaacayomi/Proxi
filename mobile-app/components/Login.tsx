import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { AuthLayout, colors, Field, s } from "../ui/design";
type LoginProps = {
  onLogin: (email: string) => void | Promise<void>;
  onPreview: (role: "student" | "lecturer") => void;
};
export default function Login({ onLogin, onPreview }: LoginProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onLogin(email.trim());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthLayout
      step="WELCOME TO PROXI"
      title={"Your presence.\nMade simple."}
      description="A simpler way to show up, connect, and keep track of every class."
    >
      <Field
        label="Email address"
        placeholder="you@example.com"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setError("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        error={!!error}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button
        mode="contained"
        icon="arrow-right"
        contentStyle={s.buttonContent}
        style={s.primaryButton}
        onPress={login}
        loading={loading}
        disabled={loading}
      >
        Continue with email
      </Button>
      <Text style={styles.note}>We’ll send a one-time code to your inbox.</Text>
      {__DEV__ && (
        <View style={styles.preview}>
          <Text style={s.eyebrow}>TAKE A LOOK AROUND</Text>
          <Text style={styles.previewDescription}>
            Explore Proxi without signing in.
          </Text>
          <Button textColor={colors.green} onPress={() => onPreview("student")}>
            Preview student dashboard
          </Button>
          <Button
            textColor={colors.green}
            onPress={() => onPreview("lecturer")}
          >
            Preview lecturer dashboard
          </Button>
        </View>
      )}
    </AuthLayout>
  );
}
const styles = StyleSheet.create({
  note: {
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
    marginTop: 14,
  },
  preview: {
    marginTop: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
  },
  previewDescription: { fontSize: 12, color: colors.muted, marginBottom: 8 },
});
