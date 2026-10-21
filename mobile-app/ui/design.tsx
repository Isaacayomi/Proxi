import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Icon, Text, TextInput } from "react-native-paper";

export const colors = {
  background: "#F5F6F5",
  surface: "#FFFFFF",
  ink: "#15211D",
  muted: "#78817C",
  green: "#008B68",
  darkGreen: "#00634D",
  mint: "#E3F4ED",
  line: "#E9ECE9",
  error: "#BA3E46",
};
export const fieldProps = {
  mode: "outlined" as const,
  outlineColor: colors.line,
  activeOutlineColor: colors.green,
  outlineStyle: { borderRadius: 16 },
  style: { backgroundColor: colors.surface, marginBottom: 14 },
};
export function Brand() {
  return (
    <View style={s.brand}>
      <View style={s.brandMark}>
        <Icon source="radar" size={24} color="white" />
      </View>
      <Text style={s.brandName}>
        proxi<Text style={{ color: colors.green }}>.</Text>
      </Text>
    </View>
  );
}
export function AuthLayout({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={s.fill}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.authContent}
      >
        <Brand />
        <View style={s.authHero}>
          <View style={s.radarOuter}>
            <View style={s.radarMiddle}>
              <View style={s.radarCore}>
                <Icon source="access-point" size={38} color="white" />
              </View>
            </View>
          </View>
          <View style={s.tag}>
            <View style={s.dot} />
            <Text style={s.tagText}>A little closer. All connected.</Text>
          </View>
        </View>
        <Text style={s.eyebrow}>{step}</Text>
        <Text accessibilityRole="header" style={s.authTitle}>
          {title}
        </Text>
        <Text style={s.description}>{description}</Text>
        <View style={s.authForm}>{children}</View>
        <Text style={s.footer}>PROXIMITY BASED ATTENDANCE SYSTEM</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function EmptyState({
  icon = "calendar-blank-outline",
  title,
  description,
}: { icon?: string; title: string; description: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon source={icon} size={26} color={colors.green} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyDescription}>{description}</Text>
    </View>
  );
}
export function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...fieldProps} {...props} />;
}
export const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: {
    height: 37,
    width: 37,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -1.5,
    color: colors.ink,
  },
  authContent: {
    padding: 25,
    flexGrow: 1,
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
  },
  authHero: { alignItems: "center", marginVertical: 24 },
  radarOuter: {
    height: 170,
    width: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: "#DCEBE3",
    alignItems: "center",
    justifyContent: "center",
  },
  radarMiddle: {
    height: 134,
    width: 134,
    borderRadius: 67,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  radarCore: {
    height: 98,
    width: 98,
    borderRadius: 49,
    backgroundColor: colors.green,
    borderBottomWidth: 7,
    borderBottomColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: -6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  tagText: { fontSize: 11, color: colors.muted },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.green,
    marginBottom: 11,
  },
  authTitle: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "600",
    letterSpacing: -1.6,
    color: colors.ink,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  authForm: { marginTop: 26 },
  footer: {
    textAlign: "center",
    fontSize: 8,
    letterSpacing: 1.7,
    color: colors.muted,
    marginTop: 30,
    marginBottom: 10,
  },
  primaryButton: { borderRadius: 30, backgroundColor: colors.green },
  buttonContent: { minHeight: 52 },
  error: { color: colors.error, fontSize: 12, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 19,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, color: colors.ink, fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 14,
    gap: 10,
  },
  empty: { alignItems: "center", paddingVertical: 26, paddingHorizontal: 16 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  emptyDescription: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 260,
  },
});
